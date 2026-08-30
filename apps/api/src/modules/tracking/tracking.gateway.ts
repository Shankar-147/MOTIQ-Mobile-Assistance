import { Logger, UsePipes, ValidationPipe } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { OnEvent } from "@nestjs/event-emitter";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import type { Server, Socket } from "socket.io";
import { AuthenticatedUser, PresenceStatus, UserRole } from "@motiq/types";
import { DomainEvents, MatchingFailedEvent, ProviderAssignedEvent } from "../../common/events/domain-events";
import { RequestService } from "../request/request.service";
import { ProviderService } from "../provider/provider.service";
import { TrackingService } from "./tracking.service";
import { authenticateSocket } from "./ws-auth.util";
import { LocationUpdateDto } from "./dto/location-update.dto";
import { SubscribeRequestDto } from "./dto/subscribe-request.dto";

/** Ch76 — how long a disconnected provider stays "still possibly online"
 * before actually being marked OFFLINE; a real reconnect within this window
 * (handleConnection) cancels the pending transition. See presence-grace.util.ts. */
const PRESENCE_OFFLINE_GRACE_MS = 30_000;

const socketValidationPipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

/**
 * Ch75's WebSocket gateway. Room-per-request (`service-request:{id}`) fan-out
 * (Ch77): a provider's accepted location update broadcasts only to whoever
 * subscribed to that specific request (the customer, or Admin/Support) — not
 * a global broadcast. Thin by design (CLAUDE.md's "thin controllers" rule
 * applies here too) — persistence/throttling/ETA logic lives in TrackingService.
 */
@WebSocketGateway({
  namespace: "/tracking",
  cors: { origin: (process.env.CORS_ORIGINS ?? "http://localhost:3000").split(",") },
})
export class TrackingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(TrackingGateway.name);
  private readonly pendingOffline = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly trackingService: TrackingService,
    private readonly providerService: ProviderService,
    private readonly requestService: RequestService,
  ) {}

  handleConnection(client: Socket) {
    try {
      const user = authenticateSocket(client, this.jwtService);
      client.data.user = user;

      if (user.role === UserRole.PROVIDER) {
        const pending = this.pendingOffline.get(user.profileId);
        if (pending) {
          clearTimeout(pending);
          this.pendingOffline.delete(user.profileId);
          this.logger.log(
            `Provider ${user.profileId} reconnected within the grace period — cancelled pending offline transition.`,
          );
        }
      }
    } catch (error) {
      this.logger.warn(`Rejected WebSocket connection: ${(error as Error).message}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const user = client.data.user as AuthenticatedUser | undefined;
    if (!user || user.role !== UserRole.PROVIDER) {
      return;
    }

    const timer = setTimeout(() => {
      this.pendingOffline.delete(user.profileId);
      this.providerService
        .setPresence(user.profileId, PresenceStatus.OFFLINE)
        .catch((error: Error) =>
          this.logger.error(`Failed to mark provider ${user.profileId} offline`, error.stack),
        );
    }, PRESENCE_OFFLINE_GRACE_MS);
    this.pendingOffline.set(user.profileId, timer);
  }

  @UsePipes(socketValidationPipe)
  @SubscribeMessage("location:update")
  async handleLocationUpdate(@ConnectedSocket() client: Socket, @MessageBody() dto: LocationUpdateDto) {
    const user = client.data.user as AuthenticatedUser;
    if (user.role !== UserRole.PROVIDER) {
      return { accepted: false, reason: "only providers send location updates" };
    }

    const result = await this.trackingService.handleLocationUpdate(user.profileId, dto.latitude, dto.longitude);
    if (!result) {
      return { accepted: false, reason: "throttled" };
    }
    if (result.serviceRequestId) {
      this.server.to(`service-request:${result.serviceRequestId}`).emit("location:update", {
        providerProfileId: user.profileId,
        latitude: dto.latitude,
        longitude: dto.longitude,
        eta: result.eta,
      });
    }
    return { accepted: true };
  }

  // Ch71's mobile Customer app Matching screen — MatchingService emits these
  // as plain in-process domain events (ADR 0009, no import from MatchingModule
  // needed since EventEmitterModule.forRoot() is global); this gateway is the
  // one place they cross over into a real Socket.IO push, onto the same
  // room-per-request fan-out `location:update` already uses.
  @OnEvent(DomainEvents.ProviderAssigned)
  handleProviderAssigned(event: ProviderAssignedEvent) {
    this.server.to(`service-request:${event.serviceRequestId}`).emit("request:matched", {
      assignmentId: event.assignmentId,
    });
  }

  @OnEvent(DomainEvents.MatchingFailed)
  handleMatchingFailed(event: MatchingFailedEvent) {
    this.server.to(`service-request:${event.serviceRequestId}`).emit("request:matching-failed", {});
  }

  @SubscribeMessage("presence:heartbeat")
  async handleHeartbeat(@ConnectedSocket() client: Socket) {
    const user = client.data.user as AuthenticatedUser;
    if (user.role !== UserRole.PROVIDER) {
      return { acknowledged: false };
    }
    await this.providerService.setPresence(user.profileId, PresenceStatus.ONLINE);
    return { acknowledged: true };
  }

  @UsePipes(socketValidationPipe)
  @SubscribeMessage("subscribe:request")
  async handleSubscribeRequest(@ConnectedSocket() client: Socket, @MessageBody() dto: SubscribeRequestDto) {
    const user = client.data.user as AuthenticatedUser;
    const request = await this.requestService.findById(dto.serviceRequestId);

    // Same ownership discipline as RequestController.findOne() (Ch51) — a
    // customer only ever subscribes to their own request's room.
    if (user.role === UserRole.CUSTOMER && request.customerProfileId !== user.profileId) {
      return { subscribed: false, reason: "forbidden" };
    }

    await client.join(`service-request:${dto.serviceRequestId}`);
    return { subscribed: true };
  }
}
