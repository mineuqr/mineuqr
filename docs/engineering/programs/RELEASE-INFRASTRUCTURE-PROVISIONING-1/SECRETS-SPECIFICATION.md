# Release Factory — GitHub Secrets Specification

Canonical operator reference. **Never commit secret values.**

Repository: `https://github.com/mineuqr/mineuqr`

Configure at: **Settings → Secrets and variables → Actions → Repository secrets**

---

## connector-release.yml

| Secret Name | Purpose | Used By | Required | Expected Format | Validation Rule |
|-------------|---------|---------|----------|-----------------|-----------------|
| `DATABASE_URL` | MySQL/TiDB connection for release registry | `candidate`, `publish`, `verify`, `promote`, `activate` steps via `scripts/connector-release-automation.ts` | **Yes** | `mysql://user:pass@host:port/database` | Connection succeeds with TLS; `SHOW TABLES` includes `connector_published_releases` after migrations |
| `R2_ACCESS_KEY_ID` | R2 S3-compatible access key | `publish`, `verify` via `R2ReleaseStorage` | **Yes** | Cloudflare API token access key id | Non-empty; paired with secret key |
| `R2_SECRET_ACCESS_KEY` | R2 S3-compatible secret | `publish`, `verify` | **Yes** | Secret string | Non-empty |
| `R2_BUCKET_NAME` | Target bucket name | `publish`, `verify` | **Yes** | Bucket name string | Bucket exists in Cloudflare account |
| `R2_PUBLIC_BASE_URL` | Public CDN/domain base for download URLs | `publish` (return URL), production API `resolveDownloadUrl` | **Yes** | `https://cdn.example.com` (no trailing slash) | HTTPS; returns 200/403 for probe object (not 404 on base) |
| `R2_ACCOUNT_ID` | Cloudflare account ID for endpoint derivation | `ENV.r2Endpoint` when `R2_ENDPOINT` unset | **Conditional** | 32-char hex string | Required if `R2_ENDPOINT` not set |
| `R2_ENDPOINT` | S3 API endpoint override | `R2ReleaseStorage` | **Conditional** | `https://<accountid>.r2.cloudflarestorage.com` | Required if `R2_ACCOUNT_ID` not set |

### Failure Behavior If Missing

| Missing Secret | Failure Point | Error Symptom |
|----------------|---------------|---------------|
| `DATABASE_URL` | Register candidate | `Database unavailable` |
| Any R2 secret (incomplete set) | Publish | Falls back to local filesystem → `PUBLIC_APP_URL ... required` (not set in GHA) |
| `R2_PUBLIC_BASE_URL` | Publish (with other R2 set) | `hasR2Config()` false or URL build fails |

### R2 Minimum IAM Scope (Release Token)

```
Allow: s3:PutObject, s3:GetObject, s3:HeadObject
Resource: arn:aws:s3:::<bucket>/connector-releases/*
Deny:  s3:DeleteObject
```

Use a **separate** admin token with delete for break-glass cleanup only (not in release workflow).

---

## connector-release-admin.yml

| Secret Name | Purpose | Used By | Required | Expected Format | Validation Rule |
|-------------|---------|---------|----------|-----------------|-----------------|
| `DATABASE_URL` | Registry supersede operation | `connector-release-admin.ts` | **Yes** | Same as release workflow | Active release row updatable |

---

## Production API Deployment (Not GitHub — Required for Dashboard)

These are **not** GitHub secrets but must match release storage for download URLs:

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | Yes | Read active release from registry |
| `R2_PUBLIC_BASE_URL` | Yes | Build customer download URL |
| `R2_ACCESS_KEY_ID` | If private bucket | Only if not fully public CDN |
| `R2_SECRET_ACCESS_KEY` | If private bucket | Same |
| `R2_BUCKET_NAME` | If private bucket | Same |
| `R2_ACCOUNT_ID` or `R2_ENDPOINT` | If private bucket | Same |

---

## Unused / Deprecated

| Name | Status |
|------|--------|
| `MINEUQR_CONNECTOR_DOWNLOAD_URL` | **Deprecated** — do not provision |
| `CONNECTOR_DOWNLOAD_URL` | **Deprecated** — do not provision |
| `PUBLIC_APP_URL` | Not required for GHA release (R2 path) |

---

## GitHub Repository Variables

**None required** by current workflows.

---

## Provisioning Order

1. `DATABASE_URL` (staging)
2. Run migrations `0052`, `0053`
3. R2 bucket + token
4. `R2_*` secrets
5. Verify `DATABASE_URL` (production) before production certification
6. Mirror R2 + `DATABASE_URL` on production API host
