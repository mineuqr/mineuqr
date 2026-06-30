# PRINT-RELEASE-DISTRIBUTION-1 — Migration Notes

## Database

Run migration `0052_connector_release_distribution.sql` before publishing the first release.

## First Publication

After a successful release build:

```bash
npm run release:connector:publish
```

Or use the full Windows pipeline (build + finalize + publish):

```powershell
powershell -File connector-product/windows/build-release.ps1
```

## Environment

| Environment | Storage | Required configuration |
|-------------|---------|------------------------|
| Development | Local filesystem under `uploads/connector-releases/` | `PUBLIC_APP_URL` or `MINEUQR_PUBLIC_API_URL` |
| Production | Cloudflare R2 | `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_BASE_URL`, `R2_ENDPOINT` or `R2_ACCOUNT_ID` |

## Deprecated

- Manual per-release `MINEUQR_CONNECTOR_DOWNLOAD_URL` / `CONNECTOR_DOWNLOAD_URL` configuration is removed from `ConnectorProductService`.

## Rollback

Activate a prior published release by re-running publish for that version (if artifacts remain in storage) or by updating registry status through a future operations tool. Do not modify immutable published artifacts in place.
