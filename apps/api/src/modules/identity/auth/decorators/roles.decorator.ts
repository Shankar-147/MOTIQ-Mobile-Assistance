import { SetMetadata } from "@nestjs/common";
import type { UserRole } from "@motiq/types";

export const ROLES_KEY = "roles";

/** Pair with @UseGuards(JwtAuthGuard, RolesGuard) — see roles.guard.ts. */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
