import { INestApplicationContext, Logger } from "@nestjs/common";
import { IoAdapter } from "@nestjs/platform-socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";
import type { Server, ServerOptions } from "socket.io";

const logger = new Logger("RedisIoAdapter");

/**
 * Ch75: horizontal WebSocket scaling via a Redis adapter — closes the exact
 * V0 gap Ch75 names ("the original diagram showed WebSocket support with no
 * scaling story"). Degrades to the default single-instance Socket.IO
 * adapter if REDIS_URL isn't set or the connection fails, rather than
 * crashing the app — same "honest about what's not wired" posture as
 * RazorpayGatewayAdapter and NotificationService. NOT verified against a
 * real Redis instance in this environment — see docs/decisions/0015-*.md.
 */
export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor?: ReturnType<typeof createAdapter>;

  constructor(app: INestApplicationContext) {
    super(app);
  }

  async connectToRedis(): Promise<void> {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      logger.warn("REDIS_URL not set — WebSocket gateway will run single-instance only (Ch75).");
      return;
    }

    try {
      const pubClient = new Redis(redisUrl, { lazyConnect: true, connectTimeout: 2000 });
      const subClient = pubClient.duplicate();
      // ioredis emits 'error' on the client itself, separately from
      // rejecting connect() — with no listener attached, Node logs an
      // "Unhandled error event" (and can be fatal in stricter configs) even
      // though the try/catch below already handles the connection failure.
      pubClient.on("error", () => undefined);
      subClient.on("error", () => undefined);
      await pubClient.connect();
      await subClient.connect();
      this.adapterConstructor = createAdapter(pubClient, subClient);
      logger.log("Connected to Redis — WebSocket gateway can scale horizontally.");
    } catch (error) {
      logger.warn(
        `Could not connect to Redis at ${redisUrl} — falling back to the single-instance WebSocket adapter. (${(error as Error).message})`,
      );
    }
  }

  createIOServer(port: number, options?: ServerOptions): Server {
    const server: Server = super.createIOServer(port, options);
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }
}
