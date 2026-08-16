# CAPABILITY REGISTRY

| Display | Canonical key | `runtimeCapabilityId` | Origin |
|---------|---------------|----------------------|--------|
| Session Management | `sessionTableManagement` | `cap.session.management` | catalog_promoted |
| Menu & Item Management | `menuManagement` | `cap.menu.management` | catalog_promoted |
| Menu Design | `menuDesign` | `cap.menu.design` | catalog_promoted |
| QR Codes | `smartQr` | `cap.qr.smart` | catalog_promoted |

`FEATURE_KEYS` = Projection(19) ∪ legacy. FULL_PLATFORM `allCurrentFeatures()` includes the four keys automatically.

No aliases. `qrCodes` remains a **limit** key only.
