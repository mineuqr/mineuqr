# CI-PNPM-GOVERNANCE-ALIGNMENT-1 — Implementation
## Engineering / Certification Report

**Program:** CI-PNPM-GOVERNANCE-ALIGNMENT-1  
**Type:** CI Governance Alignment  
**Date:** 2026-07-15  
**Decision:** **CERTIFIED**

---

## 1. Root Cause

GitHub Actions failed in `pnpm/action-setup@v4` **before** `pnpm install` with:

```text
Multiple versions of pnpm specified
```

Two declarations conflicted:

| Source | Value |
|--------|--------|
| [`package.json`](package.json) `packageManager` | `pnpm@10.4.1+sha512…` (Corepack integrity pin) |
| [`.github/workflows/migration-governance.yml`](.github/workflows/migration-governance.yml) `pnpm/action-setup` input | `version: 10.4.1` |

`pnpm/action-setup@v4` compares the action `version` string to the full `packageManager` suffix after `pnpm@`.  
`10.4.1` ≠ `10.4.1+sha512…`, so the action throws even though the intended pnpm major/minor/patch is the same.

Connector workflows already omitted `version` and were not affected.

---

## 2. Files Modified

| File | Change |
|------|--------|
| `.github/workflows/migration-governance.yml` | Removed `with.version` from `pnpm/action-setup@v4`; rely on `package.json#packageManager` |
| `docs/engineering/programs/CI-PNPM-GOVERNANCE-ALIGNMENT-1/IMPLEMENTATION.md` | This report |

**Unchanged:** pnpm version `10.4.1`, `packageManager` field, Node 20, install/governance/test steps, connector workflows.

---

## 3. Authoritative source

**Single authority:** `package.json` → `"packageManager": "pnpm@10.4.1+sha512…"`

CI installs that exact Corepack-pinned pnpm via `pnpm/action-setup@v4` without a redundant `version` input.

---

## 4. CI Validation

| Check | Result |
|-------|--------|
| Dual pnpm declaration removed | **PASS** |
| Migration governance workflow steps preserved | **PASS** (`pnpm install --frozen-lockfile`, governance guard, vitest) |
| Local `pnpm db:governance-check` | Run in close-out |
| Re-run GitHub Actions Migration Governance | Run after push |

---

## 5. Certification

**CERTIFIED** — CI declares pnpm once via `packageManager`. Migration Governance workflow can proceed past dependency setup without changing the pnpm version or CI behavior beyond version-source alignment.
