import { HttpException, Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AuthenticatedUser, IssueType } from "@motiq/types";
import { AiService } from "../ai/ai.service";
import { detectEmergencyIntent } from "../ai/emergency-intent.util";
import { LLM_CHAT, LlmChatPort, LlmMessage } from "../ai/llm/llm-chat.port";
import { AgentToolContext, AgentToolError, AgentToolsService, UiAction } from "./agent-tools";
import { buildAgentSystemPrompt } from "./agent-prompt";
import { PendingActionsStore } from "./pending-actions.store";
import { SafetySituation, getSafetyGuidance } from "./safety-guidance";

const MAX_TOOL_ITERATIONS = 6;
const MAX_HISTORY_MESSAGES = 20;
const MAX_PENDING_PER_TURN = 2;
const MAX_TOOL_RESULT_CHARS = 6000;
const DEFAULT_MAX_MESSAGES_PER_CONVERSATION = 40;

const LENGTH_LIMIT_REPLY =
  "This conversation has reached its length limit. Please start a new chat, or use 'Contact support' to reach a person.";
// What to tell a stranded driver when no model is available: the same reviewed steps the agent's
// get_safety_guidance tool returns, picked by the keyword classifier.
const FALLBACK_SITUATION: Record<IssueType, SafetySituation> = {
  [IssueType.FLAT_TYRE]: "FLAT_TYRE",
  [IssueType.BATTERY_JUMP]: "BATTERY_DEAD",
  [IssueType.FUEL]: "OUT_OF_FUEL",
  [IssueType.TOW]: "OTHER",
  [IssueType.REPAIR]: "OTHER",
  [IssueType.OTHER]: "OTHER",
};
const FALLBACK_BUTTON_LABEL: Record<IssueType, string> = {
  [IssueType.FLAT_TYRE]: "Get a flat tyre fix",
  [IssueType.BATTERY_JUMP]: "Get a battery jump-start",
  [IssueType.FUEL]: "Get fuel delivered",
  [IssueType.TOW]: "Get a tow",
  [IssueType.REPAIR]: "Get a repair",
  [IssueType.OTHER]: "Get roadside help",
};
const FALLBACK_CONFIDENCE = 0.5;
const GAVE_UP_REPLY = "I couldn't finish working that out. Could you try asking in a simpler way?";

export interface PendingActionView {
  id: string;
  tool: string;
  summary: string;
}

export interface AgentReply {
  conversationId: string;
  reply: string;
  pendingActions: PendingActionView[];
  uiActions: UiAction[];
  emergencyDetected: boolean;
  /** AGENT: a model answered with tools. FAQ: the deterministic fallback answered (no model
   * configured, or the model call failed). */
  mode: "AGENT" | "FAQ";
}

/**
 * The Ask MOTIQ agent: a tool-calling loop over the customer's own data. Design rules, each
 * enforced in code rather than left to the prompt:
 *  - identity comes from the session, never from the model or client (architecture rule 9);
 *  - the emergency pre-filter runs before any model call and never depends on one (ADR 0007);
 *  - reads run freely, but writes are only ever proposed — they execute solely through
 *    `confirmAction`, after the user's own tap, bound to that user (PendingActionsStore);
 *  - any model failure degrades to the deterministic FAQ answer, never to an error screen.
 */
@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(
    private readonly ai: AiService,
    @Inject(LLM_CHAT) private readonly llm: LlmChatPort,
    private readonly tools: AgentToolsService,
    private readonly pending: PendingActionsStore,
    private readonly config: ConfigService,
  ) {}

  async handleMessage(user: AuthenticatedUser, input: { conversationId?: string; message: string }): Promise<AgentReply> {
    const conversationId = input.conversationId ?? (await this.ai.startConversation(user.userId)).id;
    const conversation = await this.ai.getOwnedConversation(conversationId, user.userId);
    await this.ai.appendMessage(conversationId, "USER", input.message);

    // Ch90's binding rule — before anything else, and never via the model.
    if (detectEmergencyIntent(input.message)) {
      await this.ai.flagConversation(conversationId, { emergencyDetected: true });
      const reply = await this.ai.fileEmergencyAlert(user.userId);
      await this.ai.appendMessage(conversationId, "ASSISTANT", reply);
      return { conversationId, reply, pendingActions: [], uiActions: [], emergencyDetected: true, mode: "FAQ" };
    }

    const maxMessages = Number(this.config.get("AI_ASSISTANT_MAX_MESSAGES_PER_CONVERSATION", DEFAULT_MAX_MESSAGES_PER_CONVERSATION));
    if (conversation.messages.length >= maxMessages) {
      await this.ai.flagConversation(conversationId, { escalated: true });
      await this.ai.appendMessage(conversationId, "ASSISTANT", LENGTH_LIMIT_REPLY);
      return { conversationId, reply: LENGTH_LIMIT_REPLY, pendingActions: [], uiActions: [], emergencyDetected: false, mode: "FAQ" };
    }

    if (!this.llm.isConfigured()) {
      return this.faq(conversationId, input.message);
    }

    const history: LlmMessage[] = [...conversation.messages, { role: "USER" as const, content: input.message }]
      .slice(-MAX_HISTORY_MESSAGES)
      .map((entry) => ({
        role: entry.role === "USER" ? ("user" as const) : ("assistant" as const),
        content: entry.content,
      }));

    try {
      const outcome = await this.runLoop(
        { userId: user.userId, customerProfileId: user.profileId },
        conversationId,
        history,
      );
      await this.ai.appendMessage(conversationId, "ASSISTANT", outcome.reply);
      return { conversationId, ...outcome, emergencyDetected: false, mode: "AGENT" };
    } catch (error) {
      this.logger.error(`Agent model call failed, answering from the FAQ fallback: ${(error as Error).message}`);
      return this.faq(conversationId, input.message);
    }
  }

  /** Runs a proposed write after the user's own confirmation. */
  async confirmAction(user: AuthenticatedUser, actionId: string): Promise<{ ok: boolean; message: string }> {
    const action = this.pending.take(actionId, user.userId);
    const tool = this.tools.get(action.tool);
    if (!tool || tool.tier !== "YELLOW") {
      return { ok: false, message: "That action is no longer available." };
    }
    let message: string;
    let ok = true;
    try {
      await tool.run({ userId: user.userId, customerProfileId: user.profileId }, action.args);
      message = tool.confirmedMessage?.(action.args) ?? "Done.";
    } catch (error) {
      ok = false;
      message = this.userSafeError(error, "Sorry, I couldn't save that. Please try again.");
      this.logger.warn(`Confirmed action ${action.tool} failed: ${(error as Error).message}`);
    }
    await this.ai.appendMessage(action.conversationId, "ASSISTANT", ok ? `[Customer confirmed] ${message}` : `[Action failed] ${message}`);
    return { ok, message };
  }

  async cancelAction(user: AuthenticatedUser, actionId: string): Promise<{ ok: boolean; message: string }> {
    const action = this.pending.take(actionId, user.userId);
    await this.ai.appendMessage(action.conversationId, "ASSISTANT", "[Customer cancelled the proposed change]");
    return { ok: true, message: "Okay, I won't do that." };
  }

  private async runLoop(ctx: AgentToolContext, conversationId: string, history: LlmMessage[]) {
    const messages: LlmMessage[] = [
      { role: "system", content: buildAgentSystemPrompt(new Date().toISOString().slice(0, 10)) },
      ...history,
    ];
    const pendingActions: PendingActionView[] = [];
    const uiActions: UiAction[] = [];

    for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration += 1) {
      const result = await this.llm.chat({ purpose: "agent", messages, tools: this.tools.schemas() });

      if (result.toolCalls.length === 0) {
        const reply = (result.content ?? "").trim();
        return { reply: reply || GAVE_UP_REPLY, pendingActions, uiActions };
      }

      messages.push({ role: "assistant", content: result.content, tool_calls: result.toolCalls });
      for (const call of result.toolCalls) {
        const content = await this.executeToolCall(ctx, conversationId, call.function.name, call.function.arguments, pendingActions, uiActions);
        messages.push({ role: "tool", tool_call_id: call.id, content });
      }
    }
    return { reply: GAVE_UP_REPLY, pendingActions, uiActions };
  }

  private async executeToolCall(
    ctx: AgentToolContext,
    conversationId: string,
    name: string,
    rawArguments: string,
    pendingActions: PendingActionView[],
    uiActions: UiAction[],
  ): Promise<string> {
    const tool = this.tools.get(name);
    if (!tool) {
      return JSON.stringify({ error: `Unknown tool: ${name}` });
    }
    let args: Record<string, unknown> = {};
    try {
      const parsed = JSON.parse(rawArguments || "{}") as unknown;
      args = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
    } catch {
      return JSON.stringify({ error: "Tool arguments were not valid JSON." });
    }

    try {
      if (tool.tier === "YELLOW") {
        if (pendingActions.length >= MAX_PENDING_PER_TURN) {
          return JSON.stringify({ error: "Too many changes proposed at once. Finish these first." });
        }
        const prepared = await tool.prepare!(ctx, args);
        const action = this.pending.create({
          userId: ctx.userId,
          conversationId,
          tool: tool.name,
          args: prepared.args,
          summary: prepared.summary,
        });
        pendingActions.push({ id: action.id, tool: tool.name, summary: prepared.summary });
        return JSON.stringify({
          status: "awaiting_user_confirmation",
          summary: prepared.summary,
          note: "Shown to the customer as a Confirm card. Nothing is saved until they tap Confirm.",
        });
      }

      const data = await tool.run(ctx, args);
      const uiAction = (data as { uiAction?: UiAction } | null)?.uiAction;
      if (uiAction && !uiActions.some((existing) => existing.issueType === uiAction.issueType)) {
        uiActions.push(uiAction);
      }
      return JSON.stringify(data ?? null).slice(0, MAX_TOOL_RESULT_CHARS);
    } catch (error) {
      return JSON.stringify({ error: this.userSafeError(error, "That lookup failed. Try again or say you couldn't get it.") });
    }
  }

  /** Only messages written for users (tool input errors, 4xx from services) reach the model or
   * the user; anything else is logged and replaced with a generic line. */
  private userSafeError(error: unknown, fallback: string): string {
    if (error instanceof AgentToolError) {
      return error.message;
    }
    if (error instanceof HttpException && error.getStatus() < 500) {
      return error.message;
    }
    this.logger.error(`Agent tool failed: ${(error as Error)?.message}`);
    return fallback;
  }

  /** The no-model answer. A recognisable roadside problem still gets the reviewed safety steps and
   * the request button (no model involved); anything else gets the fixed FAQ reply. */
  private async faq(conversationId: string, message: string): Promise<AgentReply> {
    const triage = await this.ai.keywordTriage(message);
    if (triage.issueType !== IssueType.OTHER && triage.confidence >= FALLBACK_CONFIDENCE) {
      const steps = getSafetyGuidance(FALLBACK_SITUATION[triage.issueType]).steps.slice(0, 5);
      const reply =
        "Here's what to do while you wait:\n\n" +
        steps.map((step, index) => `${index + 1}. ${step}`).join("\n") +
        "\n\nTap the button below to get a provider.";
      await this.ai.appendMessage(conversationId, "ASSISTANT", reply);
      const uiActions: UiAction[] = [
        { type: "OPEN_REQUEST", issueType: triage.issueType, label: FALLBACK_BUTTON_LABEL[triage.issueType] },
      ];
      return { conversationId, reply, pendingActions: [], uiActions, emergencyDetected: false, mode: "FAQ" };
    }
    const reply = this.ai.faqReply(message);
    await this.ai.appendMessage(conversationId, "ASSISTANT", reply);
    return { conversationId, reply, pendingActions: [], uiActions: [], emergencyDetected: false, mode: "FAQ" };
  }
}
