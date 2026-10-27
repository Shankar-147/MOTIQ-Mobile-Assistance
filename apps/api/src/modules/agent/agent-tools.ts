import { Injectable } from "@nestjs/common";
import { IssueType, MaintenanceServiceType } from "@motiq/types";
import { VehicleService } from "../vehicle/vehicle.service";
import { RequestService } from "../request/request.service";
import { SAFETY_SITUATIONS, SafetySituation, getSafetyGuidance } from "./safety-guidance";

/** Who the agent is acting for — always taken from the authenticated session (architecture rule 9),
 * never from anything the model or the client says. */
export interface AgentToolContext {
  userId: string;
  customerProfileId: string;
}

/** A problem with a tool call's input, safe to show the model (and so, paraphrased, the user). */
export class AgentToolError extends Error {}

export interface UiAction {
  type: "OPEN_REQUEST";
  issueType: IssueType;
  label: string;
}

/**
 * GREEN tools only read (or hand the app a button to press) and run freely. YELLOW tools change
 * data: the model can only *propose* them — `prepare` validates the input and describes the
 * action for the confirmation card, and `run` happens solely after the user taps Confirm (see
 * PendingActionsStore). There are no RED tools: payments, cancellations, identity or account
 * changes are simply not offered to the model, and the system prompt tells it to say so.
 */
export interface AgentTool {
  name: string;
  tier: "GREEN" | "YELLOW";
  description: string;
  parameters: Record<string, unknown>;
  run(ctx: AgentToolContext, args: Record<string, unknown>): Promise<unknown>;
  prepare?(ctx: AgentToolContext, args: Record<string, unknown>): Promise<{ summary: string; args: Record<string, unknown> }>;
  confirmedMessage?(args: Record<string, unknown>): string;
}

const SERVICE_TYPES = Object.values(MaintenanceServiceType);
const ISSUE_TYPES = Object.values(IssueType);
const LEAD_TIMES = [3, 7, 14];

const ISSUE_LABEL: Record<IssueType, string> = {
  [IssueType.TOW]: "a tow",
  [IssueType.REPAIR]: "a repair",
  [IssueType.FUEL]: "fuel",
  [IssueType.FLAT_TYRE]: "a flat tyre fix",
  [IssueType.BATTERY_JUMP]: "a battery jump-start",
  [IssueType.OTHER]: "roadside help",
};

function readString(args: Record<string, unknown>, key: string, max = 200): string {
  const value = args[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new AgentToolError(`"${key}" is required.`);
  }
  return value.trim().slice(0, max);
}

function readOptionalString(args: Record<string, unknown>, key: string, max: number): string | undefined {
  const value = args[key];
  return typeof value === "string" && value.trim() !== "" ? value.trim().slice(0, max) : undefined;
}

function readInt(args: Record<string, unknown>, key: string, min: number, max: number): number {
  const raw = args[key];
  const value = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new AgentToolError(`"${key}" must be a whole number between ${min} and ${max}.`);
  }
  return value;
}

function readEnum<T extends string>(args: Record<string, unknown>, key: string, allowed: readonly T[]): T {
  const raw = args[key];
  const value = typeof raw === "string" ? (raw.trim().toUpperCase() as T) : undefined;
  if (!value || !allowed.includes(value)) {
    throw new AgentToolError(`"${key}" must be one of: ${allowed.join(", ")}.`);
  }
  return value;
}

function words(value: string): string {
  return value.replace(/_/g, " ").toLowerCase();
}

/** The tool catalogue for the customer-facing Ask MOTIQ agent. */
@Injectable()
export class AgentToolsService {
  private readonly tools: AgentTool[];

  constructor(
    private readonly vehicleService: VehicleService,
    private readonly requestService: RequestService,
  ) {
    this.tools = this.buildTools();
  }

  all(): AgentTool[] {
    return this.tools;
  }

  get(name: string): AgentTool | undefined {
    return this.tools.find((tool) => tool.name === name);
  }

  schemas() {
    return this.tools.map((tool) => ({
      type: "function" as const,
      function: { name: tool.name, description: tool.description, parameters: tool.parameters },
    }));
  }

  private async vehicleLabel(ctx: AgentToolContext, vehicleId: string): Promise<string> {
    const vehicles = await this.vehicleService.listByCustomer(ctx.customerProfileId);
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    if (!vehicle) {
      throw new AgentToolError("That vehicle isn't in your account. Use list_my_vehicles to see your vehicles.");
    }
    return `${vehicle.make} ${vehicle.model} (${vehicle.plateNumber})`;
  }

  private buildTools(): AgentTool[] {
    const vehicleIdParam = { type: "string", description: "The vehicle's id, from list_my_vehicles." };

    return [
      {
        name: "list_my_vehicles",
        tier: "GREEN",
        description: "List the customer's saved vehicles (id, make, model, year, plate). Call this first to find a vehicle_id.",
        parameters: { type: "object", properties: {} },
        run: async (ctx) => {
          const vehicles = await this.vehicleService.listByCustomer(ctx.customerProfileId);
          return vehicles.map((v) => ({
            vehicle_id: v.id,
            type: v.vehicleType,
            make: v.make,
            model: v.model,
            year: v.year,
            plate: v.plateNumber,
          }));
        },
      },
      {
        name: "get_maintenance_status",
        tier: "GREEN",
        description:
          "Get a vehicle's preventive-maintenance status per service type (OK, DUE_SOON, OVERDUE or NOT_TRACKED) with the last service date and odometer.",
        parameters: { type: "object", properties: { vehicle_id: vehicleIdParam }, required: ["vehicle_id"] },
        run: async (ctx, args) => {
          const rows = await this.vehicleService.getMaintenanceDueStatus(readString(args, "vehicle_id", 60), ctx.customerProfileId);
          return rows.map((row) => ({
            service: row.serviceType,
            status: row.status,
            last_serviced: row.lastServicedAt,
            last_odometer_km: row.lastOdometerKm,
            km_since_service: row.kmSinceService,
            months_since_service: row.monthsSinceService,
          }));
        },
      },
      {
        name: "get_service_history",
        tier: "GREEN",
        description: "Get a vehicle's most recent logged service records (type, date, odometer, cost).",
        parameters: { type: "object", properties: { vehicle_id: vehicleIdParam }, required: ["vehicle_id"] },
        run: async (ctx, args) => {
          const records = await this.vehicleService.listMaintenanceRecords(readString(args, "vehicle_id", 60), ctx.customerProfileId);
          return records.slice(0, 10).map((r) => ({
            service: r.serviceType,
            date: r.servicedAt,
            odometer_km: r.odometerKm,
            cost: r.cost,
            notes: r.notes,
          }));
        },
      },
      {
        name: "list_my_requests",
        tier: "GREEN",
        description: "List the customer's five most recent roadside-assistance requests with their status.",
        parameters: { type: "object", properties: {} },
        run: async (ctx) => {
          const page = await this.requestService.listByCustomer(ctx.customerProfileId, { limit: 5 });
          return page.data.map((r) => ({
            request_id: r.id,
            issue: r.issueType,
            status: r.status,
            vehicle: `${r.vehicleSnapshotMake} ${r.vehicleSnapshotModel}`,
            created_at: r.createdAt,
          }));
        },
      },
      {
        name: "get_request_status",
        tier: "GREEN",
        description: "Get the current status of one of the customer's requests.",
        parameters: {
          type: "object",
          properties: { request_id: { type: "string", description: "The request id, from list_my_requests." } },
          required: ["request_id"],
        },
        run: async (ctx, args) => {
          const request = await this.requestService.findById(readString(args, "request_id", 60));
          // Another customer's request is reported exactly like a missing one.
          if (request.customerProfileId !== ctx.customerProfileId) {
            throw new AgentToolError("No request with that id was found in your account.");
          }
          return {
            request_id: request.id,
            issue: request.issueType,
            status: request.status,
            description: request.description,
            created_at: request.createdAt,
          };
        },
      },
      {
        name: "get_reminder_settings",
        tier: "GREEN",
        description: "Get which maintenance reminders are on and how many days before a service is due they are sent.",
        parameters: { type: "object", properties: {} },
        run: async (ctx) => {
          const settings = await this.vehicleService.getReminderSettings(ctx.customerProfileId);
          return {
            lead_time_days: settings.leadTimeDays,
            enabled: settings.preferences.filter((p) => p.enabled).map((p) => p.serviceType),
            disabled: settings.preferences.filter((p) => !p.enabled).map((p) => p.serviceType),
          };
        },
      },
      {
        name: "get_safety_guidance",
        tier: "GREEN",
        description:
          "Get fixed, reviewed safety steps for a driver waiting for help. Relay these steps; never add your own repair instructions.",
        parameters: {
          type: "object",
          properties: { situation: { type: "string", enum: [...SAFETY_SITUATIONS] } },
          required: ["situation"],
        },
        run: async (_ctx, args) => getSafetyGuidance(readEnum<SafetySituation>(args, "situation", SAFETY_SITUATIONS)),
      },
      {
        name: "suggest_help_request",
        tier: "GREEN",
        description:
          "Show the customer a button that opens the request flow with the issue pre-selected. Use it when they need a tow, repair, fuel, tyre or battery help. It does not create anything by itself.",
        parameters: {
          type: "object",
          properties: { issue_type: { type: "string", enum: ISSUE_TYPES } },
          required: ["issue_type"],
        },
        run: async (_ctx, args) => {
          const issueType = readEnum<IssueType>(args, "issue_type", ISSUE_TYPES);
          const uiAction: UiAction = { type: "OPEN_REQUEST", issueType, label: `Get ${ISSUE_LABEL[issueType]}` };
          return { uiAction, note: "A button has been shown to the customer; tell them to tap it." };
        },
      },
      {
        name: "add_maintenance_record",
        tier: "YELLOW",
        description:
          "PROPOSE logging a completed service on a vehicle. The customer must tap Confirm in the app before anything is saved — call this once you have the vehicle, service type and odometer reading.",
        parameters: {
          type: "object",
          properties: {
            vehicle_id: vehicleIdParam,
            service_type: { type: "string", enum: SERVICE_TYPES },
            odometer_km: { type: "integer", description: "Odometer reading in km when it was serviced." },
            cost_rupees: { type: "string", description: "Optional cost in rupees, e.g. 1500." },
            notes: { type: "string", description: "Optional short note." },
          },
          required: ["vehicle_id", "service_type", "odometer_km"],
        },
        prepare: async (ctx, args) => {
          const vehicleId = readString(args, "vehicle_id", 60);
          const serviceType = readEnum<MaintenanceServiceType>(args, "service_type", SERVICE_TYPES);
          const odometerKm = readInt(args, "odometer_km", 1, 2_000_000);
          const cost = readOptionalString(args, "cost_rupees", 12);
          const notes = readOptionalString(args, "notes", 500);
          if (cost !== undefined && !/^\d+(\.\d{1,2})?$/.test(cost)) {
            throw new AgentToolError('"cost_rupees" must be a plain number like 1500.');
          }
          const label = await this.vehicleLabel(ctx, vehicleId);
          return {
            summary: `Log a ${words(serviceType)} at ${odometerKm.toLocaleString("en-IN")} km${cost ? ` (₹${cost})` : ""} for your ${label}.`,
            args: { vehicleId, serviceType, odometerKm, cost, notes },
          };
        },
        run: async (ctx, args) =>
          this.vehicleService.addMaintenanceRecord(args.vehicleId as string, ctx.customerProfileId, {
            serviceType: args.serviceType as MaintenanceServiceType,
            odometerKm: args.odometerKm as number,
            cost: args.cost as string | undefined,
            notes: args.notes as string | undefined,
          }),
        confirmedMessage: (args) => `Done — I've logged the ${words(args.serviceType as string)} service. Your reminders are updated.`,
      },
      {
        name: "set_reminder_lead_time",
        tier: "YELLOW",
        description:
          "PROPOSE changing how many days before a service is due the customer gets reminded (3, 7 or 14). The customer must tap Confirm in the app before it changes.",
        parameters: {
          type: "object",
          properties: { days: { type: "integer", enum: LEAD_TIMES } },
          required: ["days"],
        },
        prepare: async (_ctx, args) => {
          const days = readInt(args, "days", 1, 60);
          if (!LEAD_TIMES.includes(days)) {
            throw new AgentToolError("Reminder lead time must be 3, 7 or 14 days.");
          }
          return { summary: `Send maintenance reminders ${days} days before a service is due.`, args: { days } };
        },
        run: async (ctx, args) => {
          const current = await this.vehicleService.getReminderSettings(ctx.customerProfileId);
          return this.vehicleService.updateReminderSettings(ctx.customerProfileId, {
            preferences: current.preferences,
            leadTimeDays: args.days as number,
          });
        },
        confirmedMessage: (args) => `Done — you'll now be reminded ${args.days} days before a service is due.`,
      },
    ];
  }
}
