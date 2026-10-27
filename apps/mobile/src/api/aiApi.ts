import { IssueType } from "@motiq/types";
import { apiClient } from "./client";

/** A free-text or photo triage. `source` says whether a model or the keyword fallback made it. */
export interface TriageResult {
  issueType: IssueType;
  confidence: number;
  urgency?: "LOW" | "MEDIUM" | "HIGH";
  summary?: string;
  advice?: string;
  source: "AI" | "KEYWORD";
}

export interface AgentPendingAction {
  id: string;
  tool: string;
  summary: string;
}

export interface AgentUiAction {
  type: "OPEN_REQUEST";
  issueType: IssueType;
  label: string;
}

export interface AgentReply {
  conversationId: string;
  reply: string;
  pendingActions: AgentPendingAction[];
  uiActions: AgentUiAction[];
  emergencyDetected: boolean;
  mode: "AGENT" | "FAQ";
}

// Model calls can take a while on a slow connection.
const AI_TIMEOUT_MS = 60_000;

export const aiApi = {
  classifyIssue: (description: string) =>
    apiClient.post<TriageResult>("/ai/classify-issue", { description }, { timeout: AI_TIMEOUT_MS }),

  diagnosePhoto: (dto: { imageBase64: string; mimeType: string; note?: string }) =>
    apiClient.post<TriageResult>("/ai/diagnose-photo", dto, { timeout: AI_TIMEOUT_MS }),

  sendAgentMessage: (dto: { conversationId?: string; message: string }) =>
    apiClient.post<AgentReply>("/ai/agent/messages", dto, { timeout: AI_TIMEOUT_MS }),

  confirmAgentAction: (actionId: string) =>
    apiClient.post<{ ok: boolean; message: string }>(`/ai/agent/actions/${actionId}/confirm`),

  cancelAgentAction: (actionId: string) =>
    apiClient.post<{ ok: boolean; message: string }>(`/ai/agent/actions/${actionId}/cancel`),
};
