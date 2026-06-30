# PRINT-RELEASE-DISTRIBUTION-1

## Architecture Summary

Release distribution is a dedicated layer between immutable release builds and the Dashboard download API.

- **Release Authority:** `connector-product/release/connector-release.json` (unchanged)
- **Release Registry:** `connector_published_releases` — records published releases and the single active release
- **Release Storage:** `ReleaseStoragePort` — local filesystem (`uploads/`) in development, Cloudflare R2 in production
- **Release Distribution Service:** resolves the active published release and download URL for the API
- **Publication Workflow:** `build-release.ps1` → finalize → `connector-release-publish.ts` → activate

The Dashboard continues to call `printWorkspace.read.getConnectorDownload`. `ConnectorProductService` now reads from the distribution service instead of environment variables.

## Distribution Flow

```
connector-release.json
  → Release Build (dist/connector-release/<version>/)
  → Finalize (release-manifest.json + SHA256SUMS.txt)
  → Publish (storage upload + registry register)
  → Activate (single active release in registry)
  → ReleaseDistributionService.getCurrentDownloadInfo()
  → ConnectorProductService.getDownloadInfo()
  → Dashboard ConnectorDownloadPanel
```
