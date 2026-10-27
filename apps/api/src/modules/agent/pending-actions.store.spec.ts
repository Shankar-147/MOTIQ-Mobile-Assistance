import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { PendingActionsStore } from "./pending-actions.store";

const base = { userId: "user-1", conversationId: "conv-1", tool: "add_maintenance_record", args: { a: 1 }, summary: "Log it" };

describe("PendingActionsStore", () => {
  it("hands an action back once, to the user it was created for", () => {
    const store = new PendingActionsStore();
    const created = store.create(base, 1_000);
    expect(store.take(created.id, "user-1", 2_000)).toMatchObject({ tool: "add_maintenance_record", args: { a: 1 } });
    expect(() => store.take(created.id, "user-1", 2_001)).toThrow(NotFoundException);
  });

  it("refuses another user and does not consume the action", () => {
    const store = new PendingActionsStore();
    const created = store.create(base, 1_000);
    expect(() => store.take(created.id, "user-2", 2_000)).toThrow(ForbiddenException);
    expect(store.take(created.id, "user-1", 2_001).id).toBe(created.id);
  });

  it("expires after ten minutes", () => {
    const store = new PendingActionsStore();
    const created = store.create(base, 1_000);
    expect(() => store.take(created.id, "user-1", 1_000 + 10 * 60_000)).toThrow(NotFoundException);
  });

  it("rejects an unknown id", () => {
    expect(() => new PendingActionsStore().take("nope", "user-1")).toThrow(NotFoundException);
  });
});
