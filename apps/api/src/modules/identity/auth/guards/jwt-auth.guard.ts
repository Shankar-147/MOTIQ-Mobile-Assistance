import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

/** Ch33/Ch51 — controller-layer authentication. Applied per-route, not
 * globally (see ADR 0011): most read endpoints in this bootstrap phase stay
 * open, so an explicit @UseGuards() is more honest than a global guard with
 * scattered @Public() exceptions. */
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {}
