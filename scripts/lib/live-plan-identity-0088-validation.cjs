/**
 * COMMERCIAL-OD-2-0088-MIGRATION-SAFETY-FIX-1
 * Fail-closed conversion checks for user_subscriptions.planId → commercial_plans.id.
 * Mapping is integer → code → UUID. Does not hardcode UUIDs.
 * Must stay aligned with LEGACY_PLAN_BRIDGE (30001/30002/30003).
 */

const KNOWN_INTEGER_TO_CODE = Object.freeze({
  30001: "basic",
  30002: "professional",
  30003: "enterprise",
});

const FAILURE = Object.freeze({
  UNKNOWN_INTEGER: "unknown_integer",
  MISSING_LIVE_PLAN: "missing_live_plan",
  AMBIGUOUS_LIVE_PLAN: "ambiguous_live_plan",
  NULL_TARGET: "null_target",
  ORPHAN_UUID: "orphan_uuid",
  COUNT_MISMATCH: "count_mismatch",
  SOURCE_ROW_LOST: "source_row_lost",
  TARGET_ROW_DUPLICATED: "target_row_duplicated",
  NONDETERMINISTIC_MAPPING: "nondeterministic_mapping",
  BINDING_MISMATCH: "binding_mismatch",
});

function knownIntegerIds() {
  return Object.keys(KNOWN_INTEGER_TO_CODE).map(Number);
}

function codeForInteger(planId) {
  const n = typeof planId === "number" ? planId : Number(planId);
  if (!Number.isInteger(n)) return null;
  return KNOWN_INTEGER_TO_CODE[n] ?? null;
}

function indexLivePlansByCode(livePlans) {
  const byCode = new Map();
  for (const plan of livePlans) {
    const code = String(plan.code ?? "");
    const list = byCode.get(code) ?? [];
    list.push(plan);
    byCode.set(code, list);
  }
  return byCode;
}

function resolveExpectedUuid(planId, byCode) {
  const code = codeForInteger(planId);
  if (code == null) {
    return { ok: false, failure: FAILURE.UNKNOWN_INTEGER, uuid: null, code: null };
  }
  const matches = byCode.get(code) ?? [];
  if (matches.length === 0) {
    return { ok: false, failure: FAILURE.MISSING_LIVE_PLAN, uuid: null, code };
  }
  if (matches.length > 1) {
    return { ok: false, failure: FAILURE.AMBIGUOUS_LIVE_PLAN, uuid: null, code };
  }
  const uuid = matches[0].id;
  if (uuid == null || String(uuid).trim() === "") {
    return { ok: false, failure: FAILURE.NULL_TARGET, uuid: null, code };
  }
  return { ok: true, failure: null, uuid: String(uuid), code };
}

/**
 * Project integer planId → expected Live Plan UUID without writing.
 * @param {{ id: number, planId: number|string }[]} subscriptions
 * @param {{ id: string, code: string }[]} livePlans
 */
function projectConversion(subscriptions, livePlans) {
  const byCode = indexLivePlansByCode(livePlans);
  return subscriptions.map((row) => {
    const resolved = resolveExpectedUuid(row.planId, byCode);
    return {
      id: row.id,
      sourcePlanId: row.planId,
      expectedUuid: resolved.uuid,
      code: resolved.code,
      failure: resolved.failure,
    };
  });
}

/**
 * Fail-closed validation of a projected or populated conversion.
 * @param {{
 *   subscriptions: { id: number, planId: number|string, planIdUuid?: string|null }[],
 *   livePlans: { id: string, code: string }[],
 *   bindings?: { subscriptionId: number, planId: string }[],
 *   populated?: boolean,
 * }} input
 */
function validate0088Conversion(input) {
  const subscriptions = input.subscriptions ?? [];
  const livePlans = input.livePlans ?? [];
  const bindings = input.bindings ?? [];
  const populated = Boolean(input.populated);
  const failures = [];
  const liveIds = new Set(livePlans.map((p) => String(p.id)));
  const projected = projectConversion(subscriptions, livePlans);

  const sourceIds = subscriptions.map((r) => r.id);
  if (new Set(sourceIds).size !== sourceIds.length) {
    failures.push({ code: FAILURE.TARGET_ROW_DUPLICATED });
  }

  for (const row of projected) {
    if (row.failure) {
      failures.push({
        code: row.failure,
        subscriptionId: row.id,
        sourcePlanId: row.sourcePlanId,
        codeKey: row.code,
      });
    }
  }

  const converted = populated
    ? subscriptions.filter((r) => r.planIdUuid != null && String(r.planIdUuid).trim() !== "")
    : projected.filter((r) => r.expectedUuid != null);

  if (converted.length !== subscriptions.length) {
    failures.push({
      code: FAILURE.COUNT_MISMATCH,
      sourceCount: subscriptions.length,
      convertedCount: converted.length,
    });
  }

  if (populated) {
    for (const row of subscriptions) {
      if (row.planIdUuid == null || String(row.planIdUuid).trim() === "") {
        failures.push({ code: FAILURE.NULL_TARGET, subscriptionId: row.id });
        continue;
      }
      if (!liveIds.has(String(row.planIdUuid))) {
        failures.push({
          code: FAILURE.ORPHAN_UUID,
          subscriptionId: row.id,
          planIdUuid: String(row.planIdUuid),
        });
      }
    }

    const bySourceInteger = new Map();
    for (const row of subscriptions) {
      const key = String(row.planId);
      const set = bySourceInteger.get(key) ?? new Set();
      if (row.planIdUuid != null) set.add(String(row.planIdUuid));
      bySourceInteger.set(key, set);
    }
    for (const [sourcePlanId, uuids] of bySourceInteger) {
      if (uuids.size > 1) {
        failures.push({ code: FAILURE.NONDETERMINISTIC_MAPPING, sourcePlanId });
      }
    }
  }

  const projectedIds = new Set(projected.map((r) => r.id));
  for (const id of sourceIds) {
    if (!projectedIds.has(id)) {
      failures.push({ code: FAILURE.SOURCE_ROW_LOST, subscriptionId: id });
    }
  }

  for (const binding of bindings) {
    const row = projected.find((r) => r.id === binding.subscriptionId);
    if (!row) continue;
    if (row.expectedUuid && String(binding.planId) !== row.expectedUuid) {
      failures.push({
        code: FAILURE.BINDING_MISMATCH,
        subscriptionId: binding.subscriptionId,
      });
    }
  }

  const uniqueCodes = [];
  const seen = new Set();
  for (const f of failures) {
    if (seen.has(f.code)) continue;
    seen.add(f.code);
    uniqueCodes.push(f.code);
  }

  return {
    ok: failures.length === 0,
    failures,
    failureCodes: uniqueCodes,
    sourceCount: subscriptions.length,
    convertedCount: converted.length,
    projected,
  };
}

function splitMigrationStatements(sql) {
  return String(sql)
    .split("--> statement-breakpoint")
    .map((s) => s.replace(/^\s*--[^\n]*\n/gm, "").trim())
    .filter(Boolean);
}

function classify0088Statement(stmt) {
  if (/DROP COLUMN\s+`?planId`?/i.test(stmt)) return "destructive_drop_integer";
  if (/CHANGE\s+`?planIdUuid`?/i.test(stmt)) return "destructive_promote";
  if (
    /`_0088_live_plan_identity_gate`/i.test(stmt) &&
    /INSERT/i.test(stmt) &&
    /SELECT 1/i.test(stmt) &&
    /WHERE/i.test(stmt)
  ) {
    return "validation_gate";
  }
  if (/CREATE TEMPORARY TABLE\s+`_0088_live_plan_identity_gate`/i.test(stmt)) {
    return "validation_gate_setup";
  }
  if (/ADD COLUMN\s+`?planIdUuid`?/i.test(stmt)) return "add_uuid_column";
  if (/UPDATE\s+`user_subscriptions`/i.test(stmt)) return "populate";
  return "other";
}

/**
 * Simulate 0088 phases. Destructive statements run only after validation passes.
 */
function simulate0088Execution(sql, validation) {
  const statements = splitMigrationStatements(sql).map((text) => ({
    text,
    kind: classify0088Statement(text),
  }));
  const executed = [];
  for (const stmt of statements) {
    if (stmt.kind === "validation_gate" && !validation.ok) {
      return {
        aborted: true,
        executed,
        blocked: statements
          .slice(executed.length)
          .filter((s) => s.kind.startsWith("destructive")),
      };
    }
    executed.push(stmt);
  }
  return { aborted: false, executed, blocked: [] };
}

module.exports = {
  FAILURE,
  KNOWN_INTEGER_TO_CODE,
  classify0088Statement,
  codeForInteger,
  knownIntegerIds,
  projectConversion,
  simulate0088Execution,
  splitMigrationStatements,
  validate0088Conversion,
};
