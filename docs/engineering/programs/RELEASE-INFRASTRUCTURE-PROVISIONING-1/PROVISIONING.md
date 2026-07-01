# RELEASE-INFRASTRUCTURE-PROVISIONING-1

Operational infrastructure provisioning guide for the MineuQR Release Factory.

**Scope:** Provision only. Do not execute releases or certification in this program.

**Next program:** `RELEASE-READINESS-CERTIFICATION-1`

---

## Executive Summary

The Release Factory is implemented in code (workflows committed to `mineuqr/mineuqr`). Operational infrastructure is **not yet provisioned**. Operators must configure GitHub Repository Secrets, Cloudflare R2, production database migrations (`0052`, `0053`), and production API runtime R2 configuration before certification.

This document defines every dependency so provisioning can proceed without ambiguity.

---

## GitHub Provisioning Report

### Workflows Present

| File | Status |
|------|--------|
| `.github/workflows/connector-release.yml` | Present (committed) |
| `.github/workflows/connector-release-admin.yml` | Present (committed) |

### Workflow Audit

| Check | Result | Evidence |
|-------|--------|----------|
| Syntax | Valid YAML | Workflow files parse correctly |
| Triggers | Tag `connector-v*` + `workflow_dispatch` | `connector-release.yml` lines 3–12 |
| Concurrency | `release-${{ github.ref }}`, `cancel-in-progress: false` | Lines 14–16 |
| Permissions | `contents: read`, `id-token: write`, `attestations: write` | Lines 18–21 |
| GitHub Environments | **Not used** | No `environment:` key in workflows |
| Runner | `windows-latest` | Line 26 |
| Node | 22 | Line 47 |

### Release Factory Stages (for operator awareness)

1. Register candidate (DB)
2. Build (`build-release.ps1 -SkipPublish`)
3. Attest (`actions/attest-build-provenance@v2`)
4. Publish (R2 + registry)
5. Verify (checksum + storage)
6. Smoke test (Windows installer)
7. Promote (registry)
8. Activate (registry → dashboard download)

**Do not execute** until secrets, R2, and migrations are provisioned.

---

## GitHub Secrets Specification

See [SECRETS-SPECIFICATION.md](./SECRETS-SPECIFICATION.md) for the canonical table.

**Summary — Repository Secrets required for `connector-release.yml`:**

| Secret | Required |
|--------|----------|
| `DATABASE_URL` | Yes |
| `R2_ACCESS_KEY_ID` | Yes |
| `R2_SECRET_ACCESS_KEY` | Yes |
| `R2_BUCKET_NAME` | Yes |
| `R2_PUBLIC_BASE_URL` | Yes |
| `R2_ACCOUNT_ID` | Conditional (if `R2_ENDPOINT` unset) |
| `R2_ENDPOINT` | Conditional (if `R2_ACCOUNT_ID` unset) |

**Admin workflow** requires only `DATABASE_URL`.

**GitHub Repository Variables:** None required by current workflows.

---

## GitHub Environments (Recommended, Optional)

Current workflows do **not** use GitHub Environments. Optional hardening for certification:

| Environment | Purpose | Recommended Rules |
|-------------|---------|-------------------|
| `production` | Attach to **Activate release** step (future) | Required reviewers (1–2), deployment branch `main` only |
| `staging` | Pre-production `workflow_dispatch` dry-runs | Optional reviewers |

**Not required for initial provisioning.** Document for post-certification hardening.

---

## Cloudflare R2 Provisioning Report

### Requirements

| Item | Specification |
|------|---------------|
| **Bucket** | Dedicated bucket (e.g. `mineuqr-connector-releases`) |
| **Object prefix** | `connector-releases/<version>/` |
| **Installer key** | `connector-releases/<version>/MineuQR-Connector-<version>-Setup.exe` |
| **Manifest key** | `connector-releases/<version>/release-manifest.json` |
| **Endpoint** | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` or custom `R2_ENDPOINT` |
| **Public base URL** | CDN or R2 public/custom domain — **must match production API `R2_PUBLIC_BASE_URL`** |

### Credential Policy (Release Principal)

| Permission | Required | Notes |
|------------|----------|-------|
| `PutObject` | Yes | Publish step |
| `GetObject` | Yes | Verify step |
| `HeadObject` | Yes | Immutable check before upload |
| `DeleteObject` | **No** | Release workflow must not have delete |

### Immutable Policy

Implementation rejects upload if object already exists (`R2ReleaseStorage` → `r2StorageHead` before put). Operators must not manually overwrite `connector-releases/<version>/` objects.

### Provisioning Checklist

- [ ] Create R2 bucket
- [ ] Create API token scoped to bucket prefix `connector-releases/`
- [ ] Configure public access (custom domain or R2.dev) → set `R2_PUBLIC_BASE_URL`
- [ ] Record `R2_ACCOUNT_ID` or full `R2_ENDPOINT`
- [ ] Add all R2 secrets to **GitHub Repository Secrets**
- [ ] Add same R2 variables to **production API deployment** (Vercel/hosting)
- [ ] Validate: `curl -I <R2_PUBLIC_BASE_URL>/connector-releases/test-probe` (after test upload)

---

## Database Provisioning Report

### Required Migrations

| Migration | Program | Purpose |
|-----------|---------|---------|
| `0052_connector_release_distribution.sql` | PRINT-RELEASE-DISTRIBUTION-1 | Creates `connector_published_releases` |
| `0053_connector_release_automation.sql` | PRINT-RELEASE-AUTOMATION-1 | Promotion enum + audit columns |

### Deployment Checklist (operators execute manually)

```bash
# Against TARGET database (staging first, then production)
export DATABASE_URL='mysql://...'
npm run db:preflight    # optional but recommended
npm run db:migrate
```

### Post-Migration Validation

```sql
SHOW COLUMNS FROM connector_published_releases;
-- Expect: status enum with candidate, published, verified, smoke_test_passed, promoted, active, superseded
-- Expect: verifiedAt, smokeTestPassedAt, promotedAt, gitTag, commitSha, workflowRunId, publisher

SELECT COUNT(*) FROM connector_published_releases;
-- Expect: 0 rows before first release (or only test rows in staging)
```

**Do not activate a release during provisioning.**

---

## Release Registry Readiness

### Schema Compatibility

Drizzle schema (`drizzle/schema.ts`) matches migrations `0052` + `0053`.

### Provisioning Requirements

- Target database reachable from GitHub Actions (`DATABASE_URL` with TLS for TiDB Cloud)
- Migrations `0052` and `0053` applied
- No pre-existing `active` release unless intentional (first release should start empty)

### State Machine (reference)

```
candidate → published → verified → smoke_test_passed → promoted → active
```

Previous `active` → `superseded` on new activation.

---

## Runtime Configuration Matrix

### A. GitHub Repository Secrets (Release Workflow)

| Secret | Workflow |
|--------|----------|
| `DATABASE_URL` | `connector-release.yml`, `connector-release-admin.yml` |
| `R2_*` (6 secrets) | `connector-release.yml` only |

### B. GitHub Repository Variables

| Variable | Required |
|----------|----------|
| *(none)* | — |

### C. Workflow-Injected Runtime (automatic)

| Variable | Source |
|----------|--------|
| `RELEASE_GIT_TAG` | `github.ref_name` |
| `RELEASE_COMMIT_SHA` | `github.sha` |
| `RELEASE_WORKFLOW_RUN_ID` | `github.run_id` |
| `RELEASE_PUBLISHER` | `github.actor` |

### D. Production API Runtime (Dashboard download)

The deployed API **must** have R2 configuration identical to release storage resolution:

| Variable | Required for Download URL |
|----------|---------------------------|
| `R2_ACCESS_KEY_ID` | Optional at read time if public URL only |
| `R2_SECRET_ACCESS_KEY` | Optional at read time if public URL only |
| `R2_BUCKET_NAME` | Optional at read time if public URL only |
| `R2_PUBLIC_BASE_URL` | **Yes** — `ReleaseDistributionService.resolveDownloadUrl` |
| `R2_ENDPOINT` or `R2_ACCOUNT_ID` | Yes if using signed/private fallback |
| `DATABASE_URL` | **Yes** — registry read for active release |

**Critical:** GHA secrets alone are insufficient. Production API host must resolve `R2_PUBLIC_BASE_URL` for customer downloads.

### E. Application Configuration (not release-specific)

| Variable | Release Impact |
|----------|----------------|
| `PUBLIC_APP_URL` | Not used when R2 configured |
| `CONNECTOR_DOWNLOAD_URL` | Deprecated — do not set |

---

## Operational Runbook

See [OPERATIONS-RUNBOOK.md](./OPERATIONS-RUNBOOK.md).

---

## Provisioning Checklist

### GitHub

- [ ] Confirm workflows visible in **Actions** tab (`Connector Release`, `Connector Release Admin`)
- [ ] Create Repository Secrets per [SECRETS-SPECIFICATION.md](./SECRETS-SPECIFICATION.md)
- [ ] Confirm `workflow_dispatch` enabled (default for repos with Actions)
- [ ] *(Optional)* Create `production` environment with reviewers

### Cloudflare R2

- [ ] Bucket + token provisioned
- [ ] Public URL configured and tested
- [ ] Secrets added to GitHub
- [ ] Same R2 public base URL on production API deployment

### Database

- [ ] `0052` applied
- [ ] `0053` applied
- [ ] Schema validation query passed
- [ ] `DATABASE_URL` secret points to correct environment

### Readiness for Certification

- [ ] All checklist items complete
- [ ] Staging `workflow_dispatch` dry-run authorized (certification program)
- [ ] No production release executed during provisioning

---

## Blocking Issues

| Issue | Impact |
|-------|--------|
| GitHub Secrets not created | Workflow fails at candidate/publish |
| Migrations not applied | SQL errors on registry operations |
| R2 not on production API | Dashboard download URL null or broken |
| `R2_PUBLIC_BASE_URL` mismatch | Installer URL 404 for customers |
| No successful dry-run plan | Certification cannot proceed |

---

## Next Actions

1. Operator provisions GitHub Secrets (staging DB first recommended).
2. Operator provisions Cloudflare R2 + public URL.
3. Operator runs migrations `0052`/`0053` on staging, then production.
4. Operator mirrors R2 config on production API deployment.
5. Proceed to **RELEASE-READINESS-CERTIFICATION-1** with staging `workflow_dispatch`.
