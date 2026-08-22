import { ExecutionContext, createParamDecorator } from "@nestjs/common";
import type { AuthenticatedUser } from "@motiq/types";

/** Requires JwtAuthGuard to have run first. See jwt.strategy.ts's validate(). */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    return ctx.switchToHttp().getRequest<{ user: AuthenticatedUser }>().user;
  },
);
