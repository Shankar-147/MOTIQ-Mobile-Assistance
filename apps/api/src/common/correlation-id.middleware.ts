import { randomUUID } from "crypto";
import { NextFunction, Request, Response } from "express";

export const CORRELATION_ID_HEADER = "x-correlation-id";

export interface RequestWithCorrelationId extends Request {
  correlationId: string;
}

/**
 * Ch111's correlation-ID propagation across the request→match→track→pay
 * flow — the plumbing OpenTelemetry-style distributed tracing needs, built
 * without a tracing backend this environment doesn't have (no collector, no
 * cloud provider chosen yet — Ch101). Reuses an inbound ID from an upstream
 * caller (e.g. a future gateway/load balancer) when present, so a trace
 * doesn't restart at every hop; generates one otherwise. Echoed back on the
 * response so a client can correlate its own logs with the server's.
 */
export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const inboundId = req.headers[CORRELATION_ID_HEADER];
  const correlationId = typeof inboundId === "string" && inboundId.length > 0 ? inboundId : randomUUID();
  (req as RequestWithCorrelationId).correlationId = correlationId;
  res.setHeader(CORRELATION_ID_HEADER, correlationId);
  next();
}
