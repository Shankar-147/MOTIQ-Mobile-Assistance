import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import type { Request, Response } from "express";
import type { ApiErrorEnvelope } from "@motiq/types";

/**
 * Maps every thrown error to the RFC-7807-style envelope from docs/api-conventions.md.
 * `type` is a stable per-category identifier — never just the HTTP status restated —
 * so client code can branch on it without string-matching `detail`.
 */
@Catch()
export class RfcHttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const rawResponse = isHttpException ? exception.getResponse() : undefined;
    const detail =
      typeof rawResponse === "string"
        ? rawResponse
        : (rawResponse as { message?: string | string[] } | undefined)?.message
          ? [(rawResponse as { message: string | string[] }).message].flat().join("; ")
          : "An unexpected error occurred.";

    const envelope: ApiErrorEnvelope = {
      type: `https://motiq.dev/errors/${slugify(HttpStatus[status] ?? "internal-server-error")}`,
      title: HttpStatus[status] ?? "Internal Server Error",
      status,
      detail,
      instance: request.originalUrl,
    };

    response.status(status).json(envelope);
  }
}

function slugify(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
