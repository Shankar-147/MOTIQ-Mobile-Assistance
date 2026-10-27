import { ConfigService } from "@nestjs/config";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { AuthenticatedUser, IssueType, MaintenanceServiceType, UserRole } from "@motiq/types";
import { AgentService } from "./agent.service";
import { AgentToolsService } from "./agent-tools";
import { PendingActionsStore } from "./pending-actions.store";
import { LlmChatResult } from "../ai/llm/llm-chat.port";

const USER: AuthenticatedUser = { userId: "user-1", role: UserRole.CUSTOMER, profileId: "cust-1" };
const OTHER: AuthenticatedUser = { userId: "user-2", role: UserRole.CUSTOMER, profileId: "cust-2" };

const text = (content: string): LlmChatResult => ({ content, toolCalls: [], inputTokens: 1, outputTokens: 1 });
const call = (name: string, args: Record<string, unknown>, id = "call-1"): LlmChatResult => ({
  content: null,
  toolCalls: [{ id, type: "function", function: { name, arguments: JSON.stringify(args) } }],
  inputTokens: 1,
  outputTokens: 1,
});

function setup(options: { configured?: boolean; script?: (LlmChatResult | Error)[] } = {}) {
  const script = [...(options.script ?? [])];
  const llm = {
    isConfigured: jest.fn(() => options.configured ?? true),
    chat: jest.fn(async () => {
      const next = script.shift();
      if (!next) throw new Error("LLM script exhausted");
      if (next instanceof Error) throw next;
      return next;
    }),
  };
  const stored: { role: string; content: string }[] = [];
  const ai = {
    startConversation: jest.fn(async () => ({ id: "conv-1" })),
    getOwnedConversation: jest.fn(async () => ({ id: "conv-1", messages: [] })),
    appendMessage: jest.fn(async (_id: string, role: string, content: string) => void stored.push({ role, content })),
    flagConversation: jest.fn(async () => undefined),
    fileEmergencyAlert: jest.fn(async () => "Alert sent. Call 112."),
    faqReply: jest.fn(() => "FAQ answer"),
    keywordTriage: jest.fn(async (text: string) =>
      /tyre|tire|puncture/i.test(text) ? { issueType: "FLAT_TYRE", confidence: 0.8 } : { issueType: "OTHER", confidence: 0 },
    ),
  };
  const vehicleService = {
    listByCustomer: jest.fn(async (profileId: string) =>
      profileId === "cust-1" ? [{ id: "veh-1", make: "Datsun", model: "Go Plus", plateNumber: "TN01BA7221", year: 2016, vehicleType: "CAR" }] : [],
    ),
    getMaintenanceDueStatus: jest.fn(async () => [
      { serviceType: MaintenanceServiceType.OIL_CHANGE, status: "OVERDUE", lastServicedAt: null, lastOdometerKm: null, kmSinceService: null, monthsSinceService: null },
    ]),
    listMaintenanceRecords: jest.fn(async () => []),
    addMaintenanceRecord: jest.fn(async () => ({ id: "rec-1" })),
    getReminderSettings: jest.fn(async () => ({ preferences: [], leadTimeDays: 7 })),
    updateReminderSettings: jest.fn(async () => ({})),
  };
  const requestService = { listByCustomer: jest.fn(async () => ({ data: [], pagination: {} })), findById: jest.fn() };
  const tools = new AgentToolsService(vehicleService as never, requestService as never);
  const store = new PendingActionsStore();
  const config = { get: jest.fn((_key: string, fallback: unknown) => fallback) } as unknown as ConfigService;
  const service = new AgentService(ai as never, llm as never, tools, store, config);
  return { service, llm, ai, vehicleService, requestService, store, stored };
}

describe("AgentService", () => {
  it("answers an emergency without ever calling the model", async () => {
    const { service, llm, ai } = setup({ script: [text("should never be used")] });
    const reply = await service.handleMessage(USER, { message: "there was an accident, my friend is bleeding" });
    expect(reply.emergencyDetected).toBe(true);
    expect(ai.fileEmergencyAlert).toHaveBeenCalledWith("user-1");
    expect(llm.chat).not.toHaveBeenCalled();
  });

  it("falls back to the FAQ when no model is configured", async () => {
    const { service, llm } = setup({ configured: false });
    const reply = await service.handleMessage(USER, { message: "how do payments work?" });
    expect(reply).toMatchObject({ reply: "FAQ answer", mode: "FAQ" });
    expect(llm.chat).not.toHaveBeenCalled();
  });

  it("still gives safety steps and a request button for a roadside problem when no model is configured", async () => {
    const { service, llm } = setup({ configured: false });
    const reply = await service.handleMessage(USER, { message: "my tyre is flat" });
    expect(reply.mode).toBe("FAQ");
    expect(reply.reply).toContain("Here's what to do while you wait");
    expect(reply.reply).toContain("hazard lights");
    expect(reply.uiActions).toEqual([{ type: "OPEN_REQUEST", issueType: IssueType.FLAT_TYRE, label: "Get a flat tyre fix" }]);
    expect(llm.chat).not.toHaveBeenCalled();
  });

  it("does the same when the model call fails", async () => {
    const { service } = setup({ script: [new Error("OpenRouter 429")] });
    const reply = await service.handleMessage(USER, { message: "my tyre is flat" });
    expect(reply.uiActions).toHaveLength(1);
    expect(reply.reply).toContain("hazard lights");
  });

  it("falls back to the FAQ when the model call fails", async () => {
    const { service } = setup({ script: [new Error("OpenRouter 429")] });
    const reply = await service.handleMessage(USER, { message: "how is my car?" });
    expect(reply).toMatchObject({ reply: "FAQ answer", mode: "FAQ" });
  });

  it("runs read tools with the session's profile and ignores identity the model supplies", async () => {
    const { service, vehicleService } = setup({
      script: [
        call("get_maintenance_status", { vehicle_id: "veh-1", customerProfileId: "someone-else", customer_profile_id: "someone-else" }),
        text("Your oil change is overdue."),
      ],
    });
    const reply = await service.handleMessage(USER, { message: "is my car due for anything?" });
    expect(reply).toMatchObject({ reply: "Your oil change is overdue.", mode: "AGENT" });
    expect(vehicleService.getMaintenanceDueStatus).toHaveBeenCalledWith("veh-1", "cust-1");
  });

  it("feeds tool results back to the model", async () => {
    const { service, llm } = setup({ script: [call("list_my_vehicles", {}), text("You have a Datsun Go Plus.")] });
    await service.handleMessage(USER, { message: "what cars do I have?" });
    const secondCallMessages = (llm.chat.mock.calls[1] as unknown as [{ messages: { role: string; content: string }[] }])[0].messages;
    const toolMessage = secondCallMessages.find((m) => m.role === "tool");
    expect(toolMessage?.content).toContain("Datsun");
  });

  it("only proposes a write — nothing is saved until the user confirms", async () => {
    const { service, vehicleService } = setup({
      script: [
        call("add_maintenance_record", { vehicle_id: "veh-1", service_type: "OIL_CHANGE", odometer_km: 24500, confirmed: true }),
        text("Please review and tap Confirm."),
      ],
    });
    const reply = await service.handleMessage(USER, { message: "I changed the oil at 24500 km" });
    expect(reply.pendingActions).toHaveLength(1);
    expect(reply.pendingActions[0].summary).toContain("oil change");
    expect(vehicleService.addMaintenanceRecord).not.toHaveBeenCalled();

    const result = await service.confirmAction(USER, reply.pendingActions[0].id);
    expect(result.ok).toBe(true);
    expect(vehicleService.addMaintenanceRecord).toHaveBeenCalledWith(
      "veh-1",
      "cust-1",
      expect.objectContaining({ serviceType: "OIL_CHANGE", odometerKm: 24500 }),
    );
  });

  it("lets a confirmation run only once and only for the user it was shown to", async () => {
    const { service, vehicleService } = setup({
      script: [call("set_reminder_lead_time", { days: 14 }), text("Tap Confirm.")],
    });
    const reply = await service.handleMessage(USER, { message: "remind me 14 days before" });
    const id = reply.pendingActions[0].id;

    await expect(service.confirmAction(OTHER, id)).rejects.toThrow(ForbiddenException);
    await service.confirmAction(USER, id);
    await expect(service.confirmAction(USER, id)).rejects.toThrow(NotFoundException);
    expect(vehicleService.updateReminderSettings).toHaveBeenCalledTimes(1);
    expect(vehicleService.updateReminderSettings).toHaveBeenCalledWith("cust-1", expect.objectContaining({ leadTimeDays: 14 }));
  });

  it("does not create a confirmation card for a vehicle that isn't the user's", async () => {
    const { service, vehicleService, llm } = setup({
      script: [
        call("add_maintenance_record", { vehicle_id: "veh-of-someone-else", service_type: "OIL_CHANGE", odometer_km: 1000 }),
        text("I couldn't find that vehicle."),
      ],
    });
    const reply = await service.handleMessage(USER, { message: "log an oil change" });
    expect(reply.pendingActions).toHaveLength(0);
    expect(vehicleService.addMaintenanceRecord).not.toHaveBeenCalled();
    const toolMessage = (llm.chat.mock.calls[1] as unknown as [{ messages: { role: string; content: string }[] }])[0].messages.find((m) => m.role === "tool");
    expect(toolMessage?.content).toContain("isn't in your account");
  });

  it("rejects invalid tool input instead of acting on it", async () => {
    const { service, vehicleService } = setup({
      script: [call("add_maintenance_record", { vehicle_id: "veh-1", service_type: "ENGINE_SWAP", odometer_km: -5 }), text("Sorry.")],
    });
    const reply = await service.handleMessage(USER, { message: "log something odd" });
    expect(reply.pendingActions).toHaveLength(0);
    expect(vehicleService.addMaintenanceRecord).not.toHaveBeenCalled();
  });

  it("returns a button for the request flow from suggest_help_request", async () => {
    const { service } = setup({
      script: [call("suggest_help_request", { issue_type: "FLAT_TYRE" }), text("Tap the button to get a provider.")],
    });
    const reply = await service.handleMessage(USER, { message: "my tyre is flat" });
    expect(reply.uiActions).toEqual([{ type: "OPEN_REQUEST", issueType: IssueType.FLAT_TYRE, label: "Get a flat tyre fix" }]);
  });

  it("reports an unknown tool back to the model rather than crashing", async () => {
    const { service } = setup({ script: [call("delete_everything", {}), text("I can't do that.")] });
    const reply = await service.handleMessage(USER, { message: "do something dangerous" });
    expect(reply).toMatchObject({ reply: "I can't do that.", mode: "AGENT" });
  });

  it("stops after the tool-call budget", async () => {
    const { service, llm } = setup({ script: Array.from({ length: 10 }, (_, i) => call("list_my_vehicles", {}, `c${i}`)) });
    const reply = await service.handleMessage(USER, { message: "loop forever" });
    expect(llm.chat).toHaveBeenCalledTimes(6);
    expect(reply.reply).toContain("couldn't finish");
  });
});
