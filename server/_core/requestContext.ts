import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "crypto";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      correlationId?: string;
    }
  }
}

const CORRELATION_HEADER = "x-correlation-id";
const CORRELATION_HEADER_OUT = "X-Correlation-Id";

function isSafeCorrelationId(value: string): boolean {
  // Keep it compact and log-safe. Allows common trace formats without whitespace.
  if (value.length < 8 || value.length > 128) return false;
  return /^[a-zA-Z0-9._-]+$/.test(value);
}

function readIncomingCorrelationId(req: Request): string | undefined {
  const raw = req.headers[CORRELATION_HEADER];
  if (typeof raw === "string" && raw.length > 0 && isSafeCorrelationId(raw)) return raw;
  if (Array.isArray(raw) && typeof raw[0] === "string" && isSafeCorrelationId(raw[0]))
    return raw[0];
  return undefined;
}

export function ensureCorrelationId(req: Request): string {
  const existing = req.correlationId;
  if (typeof existing === "string" && existing.length > 0) return existing;

  const incoming = readIncomingCorrelationId(req);
  const next = incoming ?? randomUUID();
  req.correlationId = next;
  return next;
}

export function getCorrelationId(req: Request): string | undefined {
  return typeof req.correlationId === "string" ? req.correlationId : undefined;
}

/**
 * Express middleware: assigns one correlationId per request, reusing incoming
 * `x-correlation-id` when safe. Also echoes it back on `X-Correlation-Id`.
 */
export function correlationMiddleware(req: Request, res: Response, next: NextFunction): void {
  const correlationId = ensureCorrelationId(req);
  res.setHeader(CORRELATION_HEADER_OUT, correlationId);
  next();
}

