import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "crypto";

export interface PendingAction {
  id: string;
  userId: string;
  conversationId: string;
  tool: string;
  args: Record<string, unknown>;
  summary: string;
  expiresAt: number;
}

const TTL_MS = 10 * 60_000;
const MAX_ENTRIES = 500;

/**
 * Where a proposed write waits for the user's own tap on "Confirm". The agent never executes a
 * write itself and never gets to say "confirmed": a write only runs through
 * `AgentService.confirmAction`, which takes it out of this store — bound to the user who was
 * shown it, single-use, and expiring after ten minutes. (A model-supplied `confirmed` flag, as a
 * simpler design might use, would let a prompt-injected model approve its own action.)
 *
 * In-memory is deliberate for this single-instance deployment: a restart drops pending proposals,
 * which just means the user asks again. It must move to Redis or the database before MOTIQ runs
 * more than one API instance.
 */
@Injectable()
export class PendingActionsStore {
  private readonly actions = new Map<string, PendingAction>();

  create(input: Omit<PendingAction, "id" | "expiresAt">, now: number = Date.now()): PendingAction {
    this.prune(now);
    if (this.actions.size >= MAX_ENTRIES) {
      // Oldest first — Map iterates in insertion order.
      const oldest = this.actions.keys().next().value as string | undefined;
      if (oldest) {
        this.actions.delete(oldest);
      }
    }
    const action: PendingAction = { ...input, id: randomUUID(), expiresAt: now + TTL_MS };
    this.actions.set(action.id, action);
    return action;
  }

  /** Removes and returns the action (single-use). Throws for an unknown, expired or someone else's id. */
  take(id: string, userId: string, now: number = Date.now()): PendingAction {
    const action = this.actions.get(id);
    if (!action || action.expiresAt <= now) {
      this.actions.delete(id);
      throw new NotFoundException("That action has expired or was already handled. Please ask again.");
    }
    if (action.userId !== userId) {
      throw new ForbiddenException("That action belongs to another account.");
    }
    this.actions.delete(id);
    return action;
  }

  private prune(now: number): void {
    for (const [id, action] of this.actions) {
      if (action.expiresAt <= now) {
        this.actions.delete(id);
      }
    }
  }
}
