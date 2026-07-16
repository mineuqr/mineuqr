# BUSINESS-TAX-POLICY-SETTINGS-1 — Validation

**Date:** 2026-07-16  
**Decision:** **PRODUCTION CERTIFIED**

---

## Commands

```bash
pnpm exec vitest run \
  client/src/lib/__tests__/businessTaxPolicySettings.test.ts \
  client/src/lib/__tests__/businessTaxPolicySettings.architecture.guards.test.ts

pnpm db:governance-check
pnpm build
```

---

## Results

| Gate | Result |
|------|--------|
| Unit + architecture guards | **9 passed** |
| Migration governance | **PASS** — terminus `0069_check_management` (no new migrations) |
| `pnpm build` | **PASS** |

---

## Acceptance criteria

| Criterion | Status |
|-----------|--------|
| Business Settings expose Financial Policy | **PASS** |
| Tax Enabled works (`taxEnabled`) | **PASS** |
| Tax Rate works (`taxPolicyJson`) | **PASS** |
| Pricing Mode works (`taxMode`) | **PASS** |
| Country suggestions work (opt-in only) | **PASS** — SA / AE |
| Check snapshots remain immutable | **PASS** — no Check code changes; live settings only |
| Reporting remains compatible (snapshots, not live settings) | **PASS** — Reporting Platform untouched |
| No migrations / no architecture redesign | **PASS** |
| No Order / Session / Check / Reporting / Runtime / Order Read / Business Identity changes | **PASS** |

---

## Final certification

**BUSINESS-TAX-POLICY-SETTINGS-1 — PRODUCTION CERTIFIED**

Restaurant Settings now manage Financial Policy through the certified Business Settings APIs. Check immutability and Reporting snapshot consumption remain intact.
