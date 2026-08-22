import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { AuthenticatedUser, UserRole } from "@motiq/types";
import { ROLES_KEY } from "../decorators/roles.decorator";

/**
 * Ch51 — controller-layer RBAC. Must run after JwtAuthGuard (relies on
 * req.user already being set) — always pair them: @UseGuards(JwtAuthGuard,
 * RolesGuard). Data-access-layer scoping (e.g. ServiceArea, ownership) is a
 * separate concern handled per-service, not by this guard — see CLAUDE.md
 * rule 8.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const user = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>().user;
    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException(
        `This action requires one of the following roles: ${requiredRoles.join(", ")}`,
      );
    }
    return true;
  }
}
