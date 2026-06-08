/**
 * EXEC-4 / AR-6 — commercial authority backfill planning logic (pure, no I/O).
 */

export const LAUNCH_REQUIRED_HOST = "gateway01.eu-central-1.prod.aws.tidbcloud.com";
export const LAUNCH_REQUIRED_DB = "mineuqr";
export const PROTECTED_OWNER_IDS = [1];

/** Catalog tier rank for AR-6 §5.2 override (higher = wins). */
export const PLAN_TIER_RANK = {
  30003: 4, // ENTERPRISE
  30002: 3, // PROFESSIONAL
  30001: 2, // BASIC
};

const PLAN_LABEL = {
  30001: "BASIC",
  30002: "PROFESSIONAL",
  30003: "ENTERPRISE",
};

export function planLabel(planId) {
  return PLAN_LABEL[planId] ?? `UNKNOWN(${planId})`;
}

export function parseInstant(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function subscriptionEntitledNow(sub, now = new Date()) {
  if (sub.status !== "trial" && sub.status !== "active") return false;
  const end =
    sub.status === "trial"
      ? parseInstant(sub.trialEndsAt)
      : parseInstant(sub.currentPeriodEnd);
  if (!end) return true;
  return end.getTime() >= now.getTime();
}

export function subscriptionCanonicalRank(sub, now = new Date()) {
  if (sub.status === "trial" || sub.status === "active") {
    return subscriptionEntitledNow(sub, now) ? 0 : 1;
  }
  return 2;
}

export function subscriptionPeriodEndInstant(sub) {
  if (sub.status === "trial") return parseInstant(sub.trialEndsAt);
  return parseInstant(sub.currentPeriodEnd);
}

export function compareSubscriptionsCanonical(a, b, now = new Date()) {
  const rankDiff = subscriptionCanonicalRank(a, now) - subscriptionCanonicalRank(b, now);
  if (rankDiff !== 0) return rankDiff;

  const endA = subscriptionPeriodEndInstant(a);
  const endB = subscriptionPeriodEndInstant(b);
  if (endA && endB) {
    const endDiff = endB.getTime() - endA.getTime();
    if (endDiff !== 0) return endDiff;
  } else if (endA && !endB) return -1;
  else if (!endA && endB) return 1;

  return b.id - a.id;
}

export function pickCanonicalSubscription(rows, now = new Date()) {
  if (rows.length === 0) return undefined;
  return [...rows].sort((a, b) => compareSubscriptionsCanonical(a, b, now))[0];
}

/** AR-6 §5.2 tier override among entitled scoped rows. */
export function pickBackfillWinner(scopedRows, now = new Date()) {
  const entitled = scopedRows.filter((r) => subscriptionEntitledNow(r, now));
  if (entitled.length === 0) {
    return pickCanonicalSubscription(scopedRows, now);
  }
  return [...entitled].sort((a, b) => {
    const tierDiff = (PLAN_TIER_RANK[b.planId] ?? 0) - (PLAN_TIER_RANK[a.planId] ?? 0);
    if (tierDiff !== 0) return tierDiff;

    const endA = subscriptionPeriodEndInstant(a);
    const endB = subscriptionPeriodEndInstant(b);
    if (endA && endB) {
      const endDiff = endB.getTime() - endA.getTime();
      if (endDiff !== 0) return endDiff;
    } else if (endA && !endB) return -1;
    else if (!endA && endB) return 1;

    const createdDiff =
      parseInstant(b.createdAt)?.getTime() - parseInstant(a.createdAt)?.getTime();
    if (createdDiff && createdDiff !== 0) return createdDiff;

    return b.id - a.id;
  })[0];
}

export function classifyOwnerCohort(ownerId, accountRows, scopedRows) {
  if (accountRows.length > 0 && scopedRows.length > 0) return "H-B";
  if (accountRows.length > 0) return "H-ACCOUNT-ONLY";
  if (scopedRows.length === 0) return "H-NONE";
  if (scopedRows.length === 1) return "H-A";
  return "H-C";
}

/**
 * Build per-owner backfill plan (dry-run).
 * @param {object} params
 * @param {Array} params.subscriptions - all subscription rows
 * @param {Array} params.users - { id, role }
 * @param {Date} [params.now]
 */
export function buildBackfillPlan({ subscriptions, users, now = new Date() }) {
  const userById = new Map(users.map((u) => [u.id, u]));
  const byOwner = new Map();

  for (const sub of subscriptions) {
    if (!byOwner.has(sub.userId)) byOwner.set(sub.userId, []);
    byOwner.get(sub.userId).push(sub);
  }

  const owners = [...byOwner.keys()].sort((a, b) => a - b);
  const plans = [];

  for (const ownerId of owners) {
    const rows = byOwner.get(ownerId) ?? [];
    const accountRows = rows.filter((r) => r.restaurantId === 0);
    const scopedRows = rows.filter((r) => r.restaurantId > 0);
    const cohort = classifyOwnerCohort(ownerId, accountRows, scopedRows);
    const user = userById.get(ownerId);
    const entitledAccount = pickCanonicalSubscription(accountRows, now);

    let action = "SKIP";
    let mechanism = null;
    let winner = null;
    let losers = [];
    let before = { accountRows, scopedRows };
    let after = null;
    let skipReason = null;

    if (entitledAccount && subscriptionEntitledNow(entitledAccount, now)) {
      action = "SKIP";
      mechanism = "ALREADY_CANONICAL";
      skipReason = `Account row ${entitledAccount.id} already entitled`;
      after = {
        accountRows,
        scopedRows,
        canonicalAccountId: entitledAccount.id,
      };
    } else if (cohort === "H-A") {
      winner = scopedRows[0];
      losers = [];
      mechanism = "R3-A";
      action = "UPDATE_IN_PLACE";
      after = {
        accountRows: [{ ...winner, restaurantId: 0 }],
        scopedRows: [],
        canonicalAccountId: winner.id,
      };
    } else if (cohort === "H-C") {
      winner = pickBackfillWinner(scopedRows, now);
      losers = scopedRows.filter((r) => r.id !== winner?.id);
      mechanism = "R3-B";
      action = "INSERT_ACCOUNT_EXPIRE_SCOPED";
      after = {
        accountRows: [{ ...winner, id: "NEW", restaurantId: 0 }],
        scopedRows: scopedRows.map((r) => ({ ...r, status: "expired" })),
        canonicalAccountId: "NEW",
        winnerSourceId: winner?.id,
        expireIds: scopedRows.map((r) => r.id),
      };
    } else if (cohort === "H-B") {
      action = "REVIEW";
      mechanism = "MANUAL";
      skipReason = "Mixed account+scoped — not expected on launch DB";
    } else if (cohort === "H-NONE") {
      action = "SKIP";
      skipReason = "No subscription rows";
    } else if (cohort === "H-ACCOUNT-ONLY") {
      action = "SKIP";
      skipReason = "Account rows only — no scoped backfill needed";
    }

    plans.push({
      ownerId,
      role: user?.role ?? "unknown",
      cohort,
      protected: PROTECTED_OWNER_IDS.includes(ownerId),
      action,
      mechanism,
      skipReason,
      winner: winner
        ? {
            id: winner.id,
            planId: winner.planId,
            plan: planLabel(winner.planId),
            status: winner.status,
            restaurantId: winner.restaurantId,
          }
        : null,
      losers: losers.map((r) => ({
        id: r.id,
        planId: r.planId,
        plan: planLabel(r.planId),
        restaurantId: r.restaurantId,
      })),
      before: {
        accountCount: accountRows.length,
        scopedCount: scopedRows.length,
        rows: rows.map((r) => ({
          id: r.id,
          restaurantId: r.restaurantId,
          planId: r.planId,
          plan: planLabel(r.planId),
          status: r.status,
        })),
      },
      after: after
        ? {
            accountCount: after.accountRows.length,
            scopedCount: after.scopedRows.length,
            canonicalAccountId: after.canonicalAccountId,
            expectedPlan: after.accountRows[0]
              ? planLabel(after.accountRows[0].planId)
              : null,
            expectedStatus: after.accountRows[0]?.status ?? null,
            expireIds: after.expireIds ?? [],
          }
        : null,
    });
  }

  return {
    generatedAt: now.toISOString(),
    ownerCount: plans.length,
    summary: {
      toUpdate: plans.filter((p) => p.action === "UPDATE_IN_PLACE").length,
      toInsertExpire: plans.filter((p) => p.action === "INSERT_ACCOUNT_EXPIRE_SCOPED")
        .length,
      skip: plans.filter((p) => p.action === "SKIP").length,
      review: plans.filter((p) => p.action === "REVIEW").length,
    },
    plans,
  };
}

export function validateExecutionTarget(target) {
  if (target.host !== LAUNCH_REQUIRED_HOST || target.database !== LAUNCH_REQUIRED_DB) {
    return {
      ok: false,
      reason: "TARGET_MISMATCH",
      required: { host: LAUNCH_REQUIRED_HOST, database: LAUNCH_REQUIRED_DB },
      actual: target,
    };
  }
  return { ok: true };
}
