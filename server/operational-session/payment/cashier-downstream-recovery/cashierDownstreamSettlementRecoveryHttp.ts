/**
 * CASHIER-DOWNSTREAM-SETTLEMENT-RECOVERY-2
 * Production HTTP sweep for Vercel Cron. Database-derived obligations.
 * Does not write Collection Fact. Does not block Cashier Confirm.
 */

import { timingSafeEqual } from "node:crypto";
import type { Express, Request, Response } from "express";
import { opsLog } from "../../../_core/opsLog";
import { OPS_EVENT } from "../../../_core/opsTaxonomy";
import { CASHIER_DOWNSTREAM_RECOVERY_PROGRAM_ID } from "./cashierDownstreamSettlementRecovery";
import { sweepIncompleteCashierDownstreamSettlements } from "./cashierDownstreamSettlementRecoveryWorker";

export const CASHIER_DOWNSTREAM_RECOVERY_SWEEP_PATH =
  "/api/internal/cashier-downstream-recovery/sweep" as const;

function cronSecret(): string | null {
  const secret =
    process.env.CRON_SECRET ??
    process.env.CASHIER_DOWNSTREAM_RECOVERY_CRON_SECRET ??
    "";
  return secret.length > 0 ? secret : null;
}

function authorizeCron(req: Request): boolean {
  const secret = cronSecret();
  if (!secret) return false;
  const header = typeof req.headers.authorization === "string"
    ? req.headers.authorization
    : "";
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  if (expected.length !== given.length) return false;
  return timingSafeEqual(expected, given);
}

export async function handleCashierDownstreamRecoverySweep(
  req: Request,
  res: Response
): Promise<void> {
  if (!authorizeCron(req)) {
    res.status(401).json({ ok: false, error: "unauthorized" });
    return;
  }
  const started = Date.now();
  const executionModel = process.env.VERCEL ? "vercel_cron" : "http_sweep";
  opsLog({
    type: OPS_EVENT.cashier_downstream_settlement_recovery_sweep,
    category: "ORDER",
    severity: "info",
    ts: new Date().toISOString(),
    action: "sweepIncompleteCashierDownstreamSettlements",
    metadata: {
      program: CASHIER_DOWNSTREAM_RECOVERY_PROGRAM_ID,
      executionModel,
      state: "started",
    },
  });
  try {
    const obligationCount = await sweepIncompleteCashierDownstreamSettlements();
    opsLog({
      type: OPS_EVENT.cashier_downstream_settlement_recovery_sweep,
      category: "ORDER",
      severity: "info",
      ts: new Date().toISOString(),
      action: "sweepIncompleteCashierDownstreamSettlements",
      metadata: {
        program: CASHIER_DOWNSTREAM_RECOVERY_PROGRAM_ID,
        executionModel,
        state: "completed",
        obligationCount,
        durationMs: Date.now() - started,
      },
    });
    res.status(200).json({
      ok: true,
      obligationCount,
      executionModel,
      durationMs: Date.now() - started,
    });
  } catch (err) {
    opsLog({
      type: OPS_EVENT.cashier_downstream_settlement_recovery_failed,
      category: "ORDER",
      severity: "error",
      ts: new Date().toISOString(),
      action: "sweepIncompleteCashierDownstreamSettlements",
      metadata: {
        program: CASHIER_DOWNSTREAM_RECOVERY_PROGRAM_ID,
        executionModel,
        error: err instanceof Error ? err.message : String(err),
      },
    });
    res.status(500).json({ ok: false, error: "sweep_failed" });
  }
}

export function registerCashierDownstreamSettlementRecoveryHttp(
  app: Express
): void {
  app.get(CASHIER_DOWNSTREAM_RECOVERY_SWEEP_PATH, (req, res) => {
    void handleCashierDownstreamRecoverySweep(req, res);
  });
  app.post(CASHIER_DOWNSTREAM_RECOVERY_SWEEP_PATH, (req, res) => {
    void handleCashierDownstreamRecoverySweep(req, res);
  });
}
