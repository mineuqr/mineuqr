/**
 * CASHIER-DOWNSTREAM-SETTLEMENT-RECOVERY-2 — Production cron HTTP.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";

const mocks = vi.hoisted(() => ({
  sweepIncompleteCashierDownstreamSettlements: vi.fn(),
  opsLog: vi.fn(),
}));

vi.mock("../../../../_core/opsLog", () => ({
  opsLog: (...a: unknown[]) => mocks.opsLog(...a),
}));

vi.mock("../cashierDownstreamSettlementRecoveryWorker", () => ({
  sweepIncompleteCashierDownstreamSettlements: (...a: unknown[]) =>
    mocks.sweepIncompleteCashierDownstreamSettlements(...a),
}));

import { handleCashierDownstreamRecoverySweep } from "../cashierDownstreamSettlementRecoveryHttp";

function req(authorization?: string): Request {
  return { headers: { authorization } } as Request;
}

function res() {
  const out = {
    statusCode: 200,
    body: null as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
  };
  return out as typeof out & Response;
}

describe("cashier downstream recovery Production HTTP sweep", () => {
  const previousCron = process.env.CRON_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-cron-secret";
    mocks.sweepIncompleteCashierDownstreamSettlements.mockResolvedValue(2);
  });

  afterEach(() => {
    if (previousCron == null) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previousCron;
  });

  it("rejects missing authorization", async () => {
    const response = res();
    await handleCashierDownstreamRecoverySweep(req(), response);
    expect(response.statusCode).toBe(401);
    expect(mocks.sweepIncompleteCashierDownstreamSettlements).not.toHaveBeenCalled();
  });

  it("sweeps incomplete obligations when authorized", async () => {
    const response = res();
    await handleCashierDownstreamRecoverySweep(
      req("Bearer test-cron-secret"),
      response
    );
    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject({ ok: true, obligationCount: 2 });
    expect(mocks.sweepIncompleteCashierDownstreamSettlements).toHaveBeenCalledTimes(
      1
    );
    expect(mocks.opsLog).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "cashier_downstream_settlement_recovery_sweep",
        metadata: expect.objectContaining({
          state: "completed",
          obligationCount: 2,
        }),
      })
    );
  });
});
