# First Release Provisioning Runbook

**Program:** RELEASE-INFRASTRUCTURE-PROVISIONING-1  
**Audience:** Platform operators  
**Do not execute a production release in this runbook.**

---

## Step 1 — GitHub Secrets

1. Open `https://github.com/mineuqr/mineuqr/settings/secrets/actions`
2. Create each secret per [SECRETS-SPECIFICATION.md](./SECRETS-SPECIFICATION.md)
3. **Start with staging `DATABASE_URL`** before production
4. Verify secret **names** match exactly (case-sensitive)

**Validation:** Secret list shows 7 secrets for release workflow (or 6 if using only `R2_ACCOUNT_ID` or only `R2_ENDPOINT`).

---

## Step 2 — Cloudflare R2

1. Create bucket (e.g. `mineuqr-connector-releases`)
2. Create API token:
   - Permissions: Object Read & Write on bucket prefix `connector-releases/`
   - **No delete** permission for release token
3. Configure public access:
   - Custom domain (recommended) or R2 public access
   - Record base URL → `R2_PUBLIC_BASE_URL`
4. Record `R2_ACCOUNT_ID` from Cloudflare dashboard
5. Add all values to GitHub Secrets
6. Add `R2_PUBLIC_BASE_URL` (+ DB URL) to **production API** deployment settings

**Validation:**

```bash
# After manual test upload of empty probe file at connector-releases/_probe.txt
curl -I "https://<R2_PUBLIC_BASE_URL>/connector-releases/_probe.txt"
```

Remove probe object via admin tooling if needed.

---

## Step 3 — Database Migrations

**Target:** Staging database first.

```bash
export DATABASE_URL='mysql://...staging...'
npm run db:preflight
npm run db:migrate
```

**Validate:**

```sql
SHOW COLUMNS FROM connector_published_releases LIKE 'status';
-- Type must include: candidate, published, verified, smoke_test_passed, promoted, active, superseded

SHOW COLUMNS FROM connector_published_releases LIKE 'workflowRunId';
-- Must exist
```

Repeat for production when staging certification passes.

**Do not insert or activate releases during provisioning.**

---

## Step 4 — GitHub Workflow Availability

1. Confirm **Actions** enabled on repository
2. Confirm workflows appear:
   - `Connector Release`
   - `Connector Release Admin`
3. Confirm default branch contains `.github/workflows/connector-release.yml`

**Validation:** Workflow file visible in Actions UI without YAML errors.

---

## Step 5 — Workflow Dispatch Readiness

Prepare for certification (do not run production yet):

1. Confirm `connector-product/release/connector-release.json` version (currently `1.0.0`)
2. Plan tag: `connector-v1.0.0` (must match manifest version)
3. Staging certification should use **workflow_dispatch** first:
   - Actions → Connector Release → Run workflow
   - Branch: `main`
   - Optional input `version`: `1.0.0`

**Pre-flight:** All secrets and staging migrations complete.

---

## Step 6 — Rollback Preparation

Current capabilities (limited):

| Action | Tool | Effect |
|--------|------|--------|
| Supersede active release | `Connector Release Admin` workflow → `supersede-only` | Removes `active` status; **no automatic prior-version activation** |
| R2 object cleanup | Separate admin credentials with delete | Not in release workflow |
| Re-release same version | **Blocked** | Immutable storage rejects overwrite |

**Before first release:** Document break-glass admin R2 credentials stored separately from release token.

---

## Step 7 — Certification Readiness

Provisioning is complete when:

- [ ] All GitHub Secrets created (names verified)
- [ ] R2 bucket + public URL configured
- [ ] Production API has `R2_PUBLIC_BASE_URL` + `DATABASE_URL`
- [ ] Migrations `0052` + `0053` applied to target DB
- [ ] `connector_published_releases` schema validated
- [ ] Workflows visible in GitHub Actions
- [ ] **No production release executed**

**Authorize next program:** `RELEASE-READINESS-CERTIFICATION-1`

---

## Smoke Testing (Certification Reference)

Provisioning does not run smoke tests. Certification will execute:

`connector-product/windows/smoke-test-installer.ps1`

Current checks: silent install, health on `:9477/status`, uninstall.  
Registration/pairing checks are certification gaps to track separately.

---

## Promotion & Activation (Certification Reference)

Registry transitions during certification:

```
candidate → published → verified → smoke_test_passed → promoted → active
```

Dashboard download appears only after `active`.

---

## Common Provisioning Mistakes

| Mistake | Symptom |
|---------|---------|
| R2 secrets only on GHA, not API host | Workflow succeeds; Dashboard has no download URL |
| Migration `0053` skipped | Enum/status column errors |
| Wrong `DATABASE_URL` in secrets | Registry writes to wrong environment |
| `R2_PUBLIC_BASE_URL` with trailing slash | Usually tolerated (code strips); prefer no trailing slash |
| Tag `v1.0.0` instead of `connector-v1.0.0` | Workflow not triggered on tag push |
