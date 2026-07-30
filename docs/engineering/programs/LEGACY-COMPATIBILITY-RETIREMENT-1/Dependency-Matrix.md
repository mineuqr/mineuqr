# Dependency Matrix

**Program:** LEGACY-COMPATIBILITY-RETIREMENT-1

| Artifact | Server | Client | Runtime | Catalog | Plans | Offerings | Subscriptions | Tests | Docs |
|----------|:------:|:------:|:-------:|:-------:|:-----:|:---------:|:-------------:|:-----:|:----:|
| `LEGACY_COMPAT_FEATURE_KEYS` | ✓ matrix | ✓ labels | ✓ FEATURE_KEYS | — | unbound | — | via snapshot expand | ✓ | ✓ |
| `LEGACY_TO_PROJECTION` | ✓ | — | ✓ expand | ✓ normalize write | — | ✓ public normalize | ✓ | ✓ | ✓ |
| `expandFeatureKeysForRuntime` | ✓ | — | ✓ resolvers | — | — | — | ✓ bound | ✓ | ✓ |
| `cap.legacy.*` matrix | ✓ | — | ✓ | — | — | — | ✓ | ✓ | ✓ |
| `planFeatureMatrix` legacy | ✓ unbound | — | bridge only | — | unbound | — | unbound only | ✓ | ✓ |
| `featureVisibility` legacy keys | — | ✓ | — | — | — | — | via entitlements | ✓ | ✓ |
| Catalog locale orphans | — | latent | — | unused picker | — | — | — | — | ✓ |
| `LEGACY_PLAN_BRIDGE` | ✓ | — | ✓ plan id | ✓ seed | ✓ | — | ✓ | ✓ | ✓ |
| `LEGACY_DIRECT_PROJECTION_KEYS` | — | — | — | — | — | — | — | — | retired |

**Commercial Projection / FILTER_KEYS:** no legacy keys (Projection-only).
