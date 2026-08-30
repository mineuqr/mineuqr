/**
 * REALTIME-PLATFORM-FOUNDATION-1
 * HTTP SSE endpoint — platform only.
 */

import { Router, type Request, type Response } from "express";
import { randomUUID } from "node:crypto";
import {
  getRealtimeSseGateway,
  getRealtimeSharedBusStatus,
  isRealtimePlatformEnabled,
} from "../composition";

export const realtimeHttpRouter = Router();

realtimeHttpRouter.get("/sse", async (req: Request, res: Response) => {
  if (!isRealtimePlatformEnabled()) {
    res.status(503).json({ error: "Realtime platform disabled" });
    return;
  }

  const token =
    (typeof req.query.ticket === "string" && req.query.ticket) ||
    (typeof req.headers["x-realtime-ticket"] === "string"
      ? req.headers["x-realtime-ticket"]
      : "");

  if (!token) {
    res.status(401).json({ error: "Missing realtime ticket" });
    return;
  }

  const channelsRaw =
    typeof req.query.channels === "string" ? req.query.channels : "";
  const channels = channelsRaw
    ? channelsRaw.split(",").map((c) => c.trim()).filter(Boolean)
    : undefined;

  const lastEventIdHeader = req.headers["last-event-id"];
  const lastEventId =
    typeof lastEventIdHeader === "string"
      ? lastEventIdHeader
      : typeof req.query.lastEventId === "string"
        ? req.query.lastEventId
        : undefined;

  const gateway = getRealtimeSseGateway();
  const opened = await gateway.open({
    connectionId: randomUUID(),
    token,
    channels,
    lastEventId,
    res,
  });

  if (!opened.ok) {
    res.status(opened.status).json({ error: opened.message });
  }
});

realtimeHttpRouter.get("/health", (_req, res) => {
  res.json({
    program: "REALTIME-PLATFORM-FOUNDATION-1",
    enabled: isRealtimePlatformEnabled(),
    connections: getRealtimeSseGateway().connectionCount,
    sharedBus: getRealtimeSharedBusStatus(),
  });
});
