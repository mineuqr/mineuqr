/**
 * TYPESCRIPT-ERROR-FORENSICS-AND-REMEDIATION-1
 * Compare current fingerprint to certified baseline and classify all diagnostics.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const certified = JSON.parse(
  readFileSync(
    join(
      dir,
      "../ENGINEERING-PROGRAM-GOVERNANCE-HARDENING-1/DIAGNOSTIC-FINGERPRINT.json"
    ),
    "utf8"
  )
);
const current = JSON.parse(
  readFileSync(join(dir, "DIAGNOSTIC-FINGERPRINT.json"), "utf8")
);

function classify(d) {
  const { file, code, message } = d;
  const downlevel =
    code === "TS2802" &&
    /downlevelIteration|--target/i.test(message);

  if (downlevel) {
    return {
      category: "H",
      categoryName: "CONFIGURATION / COMPILER POLICY",
      priority: "P3",
      likelyCause:
        "tsconfig has no target/downlevelIteration; tsc defaults prevent for-of on Map/Set/Iterator. Vite already emits modern JS.",
      evidence: "compilerOptions.module=ESNext, no target, no downlevelIteration",
      decision: "CONFIGURATION",
    };
  }

  if (file === "client/src/App.tsx" && code === "TS2322") {
    return {
      category: "C",
      categoryName: "ARCHITECTURAL TYPE CONTRACT DEFECT",
      priority: "P2",
      likelyCause:
        "KioskShell props are { activation? } for Screen Runtime hosting; wouter Route expects RouteComponentProps. Runtime uses useRoute internally; extra route props are unused.",
      evidence:
        "KioskShell.tsx KioskShellProps; App.tsx component={KioskShell}; useRoute('/kiosk/:slug...')",
      decision: "FIX_LATER",
    };
  }

  if (file.includes("/__scripts__/")) {
    return {
      category: "F",
      categoryName: "TOOLING / HARNESS",
      priority: "P3",
      likelyCause: "UAT/live script included by tsconfig include server/**/*",
      evidence: "path under __scripts__",
      decision: "TEST_HARNESS",
    };
  }

  if (file.startsWith("server/services/commercial-catalog/")) {
    return {
      category: "C",
      categoryName: "ARCHITECTURAL TYPE CONTRACT DEFECT",
      priority: "P2",
      likelyCause:
        "Commercial catalog persistence/index types vs Live Plan DTO; not occupancy/checkLimit.",
      evidence: "commercial-catalog service path; not occupancy helper",
      decision: "FIX_LATER",
    };
  }

  if (
    file.includes("operational-session/check") ||
    file.includes("splitPayment") ||
    file.includes("multiCheckAllocation") ||
    file.includes("settlement")
  ) {
    return {
      category: "C",
      categoryName: "ARCHITECTURAL TYPE CONTRACT DEFECT",
      priority: "P2",
      likelyCause:
        "Check/Settlement projection or command types incomplete. Correct fix may need an architecture program.",
      evidence: "Check/Settlement path; Constitution ownership",
      decision: "ARCHITECTURE_PROGRAM_REQUIRED",
    };
  }

  if (file.startsWith("server/order/") || file.includes("DrizzleOrderRepository")) {
    return {
      category: "C",
      categoryName: "ARCHITECTURAL TYPE CONTRACT DEFECT",
      priority: "P2",
      likelyCause: "Order persistence/read-model typing vs aggregate contracts",
      evidence: "Order core-domain path",
      decision: "ARCHITECTURE_PROGRAM_REQUIRED",
    };
  }

  if (file.includes("crmp") || file.includes("CRMP") || file.includes("Crmp")) {
    return {
      category: "C",
      categoryName: "ARCHITECTURAL TYPE CONTRACT DEFECT",
      priority: "P2",
      likelyCause: "CRMP in-memory/drizzle store vs domain types",
      evidence: "CRMP path",
      decision: "FIX_LATER",
    };
  }

  if (file.includes("reporting-platform") || file.includes("reporting-exports")) {
    return {
      category: "D",
      categoryName: "LEGACY CODE",
      priority: "P3",
      likelyCause: "Reporting presentation/legacy surface typing",
      evidence: "reporting-platform / reporting-exports path",
      decision: "LEGACY_ACCEPTED",
    };
  }

  if (file.includes("data-retention")) {
    return {
      category: "H",
      categoryName: "CONFIGURATION / COMPILER POLICY",
      priority: "P3",
      likelyCause: "MapIterator for-of (same TS2802 family) or related iterator typing",
      evidence: "data-retention + iterator/export messages",
      decision: "CONFIGURATION",
    };
  }

  if (file.includes("design-system")) {
    return {
      category: "C",
      categoryName: "ARCHITECTURAL TYPE CONTRACT DEFECT",
      priority: "P3",
      likelyCause: "Design-system token/union exhaustiveness",
      evidence: "design-system path",
      decision: "FIX_LATER",
    };
  }

  if (
    file.includes("CatalogManagementPanels") ||
    file.includes("CapabilityFilterPicker") ||
    file.includes("versionCompare") ||
    file.includes("PlatformOps")
  ) {
    return {
      category: "B",
      categoryName: "REAL TYPE SAFETY DEFECT",
      priority: "P2",
      likelyCause: "Admin catalog UI state/callback typing",
      evidence: "admin platform-ops commercial-catalog UI",
      decision: "FIX_LATER",
    };
  }

  if (code === "TS2459" && message.includes("NormalizedWorkingHours")) {
    return {
      category: "B",
      categoryName: "REAL TYPE SAFETY DEFECT",
      priority: "P2",
      likelyCause: "NormalizedWorkingHours is declared but not exported from businessDay",
      evidence: message,
      decision: "FIX_LATER",
    };
  }

  if (code === "TS7016") {
    return {
      category: "I",
      categoryName: "THIRD-PARTY TYPE DEFECT",
      priority: "P3",
      likelyCause: "Missing declaration file for a JS module",
      evidence: message,
      decision: "TOOLING",
    };
  }

  if (code === "TS7006") {
    return {
      category: "B",
      categoryName: "REAL TYPE SAFETY DEFECT",
      priority: "P2",
      likelyCause: "Implicit any on callback parameter (strict)",
      evidence: message,
      decision: "FIX_LATER",
    };
  }

  if (file.includes("checkoutSubmission.ts") && code === "TS2339") {
    return {
      category: "B",
      categoryName: "REAL TYPE SAFETY DEFECT",
      priority: "P2",
      likelyCause:
        "Local builder annotated as ReadonlyArray so .push is illegal; runtime array is mutable.",
      evidence: "validateCheckoutNotes items: CheckoutDraftSnapshot['items'] = []",
      decision: "FIX_NOW",
    };
  }

  if (file.includes("localization/fx.ts") && code === "TS7053") {
    return {
      category: "B",
      categoryName: "REAL TYPE SAFETY DEFECT",
      priority: "P2",
      likelyCause:
        "Spread { USD: 1, ...rates } inferred as { USD: number } instead of FxRateTable.",
      evidence: "FxRateTable = Record<string, number>; convertSync table[from]/table[to]",
      decision: "FIX_NOW",
    };
  }

  if (file.includes("StatisticsPanel.tsx") && code === "TS2345") {
    return {
      category: "B",
      categoryName: "REAL TYPE SAFETY DEFECT",
      priority: "P2",
      likelyCause: "subscriptionStatus is string | null; mapper requires string.",
      evidence: "mapCommercialStatusToBadgeTone; ownerCommercialDisplay uses ?? inactive",
      decision: "FIX_NOW",
    };
  }

  if (file.includes("KioskShell.tsx") && code === "TS2322") {
    return {
      category: "C",
      categoryName: "ARCHITECTURAL TYPE CONTRACT DEFECT",
      priority: "P2",
      likelyCause:
        "After idle/language returns, hosted hostStage can still be tracking; surface only accepts ordering stages.",
      evidence: "KioskShellStage includes tracking; KioskOrderingSurface stage union narrower",
      decision: "FIX_LATER",
    };
  }

  if (file.includes("MarkPaidSettlementDialog")) {
    return {
      category: "C",
      categoryName: "ARCHITECTURAL TYPE CONTRACT DEFECT",
      priority: "P1",
      likelyCause:
        "UI selected tender includes 'other'; settlement helper accepts only card|cash.",
      evidence: "singleTenderSettlements(selected) TS2345",
      decision: "ARCHITECTURE_PROGRAM_REQUIRED",
    };
  }

  if (file.includes("DiningSessionOrdersList") || file.includes("OrdersWorkspacePanel")) {
    return {
      category: "C",
      categoryName: "ARCHITECTURAL TYPE CONTRACT DEFECT",
      priority: "P2",
      likelyCause: "Workspace order row vs Order/Check identity source contract",
      evidence: message.slice(0, 160),
      decision: "ARCHITECTURE_PROGRAM_REQUIRED",
    };
  }

  if (file.includes("ScreenCredentialRecoveryService")) {
    return {
      category: "C",
      categoryName: "ARCHITECTURAL TYPE CONTRACT DEFECT",
      priority: "P1",
      likelyCause:
        "Recovery presentation token literal missing IssuedOperationalDeviceToken fields.",
      evidence: "presentRecovery(device, { tokenId, secret, deviceId, issuedAt, expiresAt })",
      decision: "FIX_LATER",
    };
  }

  if (file.includes("operational-screen") || file.includes("runtimeInstanceContext") || file.includes("runtimeContextStore")) {
    return {
      category: "C",
      categoryName: "ARCHITECTURAL TYPE CONTRACT DEFECT",
      priority: "P2",
      likelyCause: "Screen Runtime identity/context contract incomplete (e.g. restaurantId).",
      evidence: file,
      decision: "FIX_LATER",
    };
  }

  if (file.includes("Dashboard.tsx") || file.includes("restaurantDashStyles") || file.includes("MenuView.tsx") || file.includes("currencyLocale")) {
    return {
      category: "B",
      categoryName: "REAL TYPE SAFETY DEFECT",
      priority: "P2",
      likelyCause: "UI token/style/locale union mismatch",
      evidence: message.slice(0, 160),
      decision: "FIX_LATER",
    };
  }

  return {
    category: "L",
    categoryName: "UNKNOWN",
    priority: "P2",
    likelyCause: "UNKNOWN — REQUIRES INVESTIGATION",
    evidence: `${file} ${code} ${message.slice(0, 160)}`,
    decision: "UNKNOWN",
  };
}

const certByKey = new Map(certified.diagnostics.map((d) => [d.key, d]));
const certByIdentity = new Map();
for (const d of certified.diagnostics) {
  const list = certByIdentity.get(d.identity) ?? [];
  list.push(d);
  certByIdentity.set(d.identity, list);
}

const usedCertKeys = new Set();
const rows = [];
let id = 0;
const baselineState = { UNCHANGED: 0, MOVED_ONLY: 0, CHANGED: 0, NEW: 0, UNCLASSIFIED: 0 };

for (const d of current.diagnostics) {
  id += 1;
  let state = "UNCLASSIFIED";
  if (certByKey.has(d.key)) {
    state = "UNCHANGED";
    usedCertKeys.add(d.key);
  } else {
    const sameIdentity = (certByIdentity.get(d.identity) ?? []).find(
      (c) => !usedCertKeys.has(c.key)
    );
    if (sameIdentity) {
      state = "MOVED_ONLY";
      usedCertKeys.add(sameIdentity.key);
    } else {
      const sameFileCode = certified.diagnostics.find(
        (c) =>
          !usedCertKeys.has(c.key) &&
          c.file === d.file &&
          c.code === d.code &&
          c.message !== d.message
      );
      if (sameFileCode) {
        state = "CHANGED";
        usedCertKeys.add(sameFileCode.key);
      } else {
        state = "NEW";
      }
    }
  }
  baselineState[state] += 1;
  const cls = classify(d);
  rows.push({
    diagnosticId: `TSF-${String(id).padStart(3, "0")}`,
    file: d.file,
    line: d.line,
    column: d.column,
    code: d.code,
    message: d.message,
    key: d.key,
    baselineState: state,
    currentState: "PRESENT",
    category: cls.category,
    categoryName: cls.categoryName,
    priority: cls.priority,
    likelyCause: cls.likelyCause,
    evidence: cls.evidence,
    remediationDecision: cls.decision,
    status: "OPEN",
  });
}

const removed = certified.diagnostics
  .filter((c) => !usedCertKeys.has(c.key))
  .map((c, i) => ({
    diagnosticId: `TSF-REM-${String(i + 1).padStart(3, "0")}`,
    file: c.file,
    line: c.line,
    column: c.column,
    code: c.code,
    message: c.message,
    key: c.key,
    baselineState: "REMOVED",
    currentState: "ABSENT",
    category: "L",
    categoryName: "UNKNOWN",
    priority: "P2",
    likelyCause: "Present in certified fingerprint, absent now",
    evidence: c.key,
    remediationDecision: "UNKNOWN",
    status: "REMOVED",
  }));

const decisionCounts = {};
const categoryCounts = {};
const priorityCounts = {};
for (const r of rows) {
  decisionCounts[r.remediationDecision] =
    (decisionCounts[r.remediationDecision] ?? 0) + 1;
  categoryCounts[r.category] = (categoryCounts[r.category] ?? 0) + 1;
  priorityCounts[r.priority] = (priorityCounts[r.priority] ?? 0) + 1;
}

const comparison = {
  program: "TYPESCRIPT-ERROR-FORENSICS-AND-REMEDIATION-1",
  certifiedTotal: certified.total,
  currentTotal: current.total,
  delta: current.total - certified.total,
  baselineState: { ...baselineState, REMOVED: removed.length },
  categoryCounts,
  priorityCounts,
  decisionCounts,
  rows,
  removed,
};

writeFileSync(
  join(dir, "ERROR-CLASSIFICATION.json"),
  `${JSON.stringify(comparison, null, 2)}\n`
);
console.log(
  JSON.stringify(
    {
      currentTotal: current.total,
      certifiedTotal: certified.total,
      baselineState: comparison.baselineState,
      categoryCounts,
      priorityCounts,
      decisionCounts,
      unknown: rows.filter((r) => r.category === "L").length,
    },
    null,
    2
  )
);
