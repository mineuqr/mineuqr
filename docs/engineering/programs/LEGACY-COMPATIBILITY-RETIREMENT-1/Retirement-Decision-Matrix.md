# Retirement Decision Matrix

**Program:** LEGACY-COMPATIBILITY-RETIREMENT-1

| Artifact | Decision | Reason |
|----------|----------|--------|
| `LEGACY_DIRECT_PROJECTION_KEYS` | **Retire Immediately** | UNUSED — zero consumers |
| `LEGACY_COMPAT_FEATURE_KEYS` (set) | **Keep Temporarily** | ACTIVE Runtime vocabulary |
| Alias map + expand | **Keep Temporarily** | Bound snapshot continuity |
| `cap.legacy.*` matrix | **Keep Temporarily** | I-SRE-02 completeness |
| Unbound planFeatureMatrix extras | **Keep Temporarily** | Unbound bridge |
| UI gates (`templates`/`reports`/…) | **Blocked** | Live client consumers; needs UI migration program |
| Catalog locale orphans | **Keep Temporarily** | UNUSED but harmless; locale sweep later |
| `LEGACY_PLAN_BRIDGE` | **Keep Temporarily** | Active plan-id continuity |

## Key-level blocked set (cannot retire now)

`reports`, `excelExport`, `templates`, `customColors`, `customFonts`

## Conditions to unlock later retirement

1. Production audit: zero bound snapshot `featureKey` values in legacy set (or migrate snapshots).  
2. UI entitlement program: gates use Projection IDs (`reporting`) or drop branding gates.  
3. deniedFeatures no longer special-cases `qrMenu`/`search`.  
4. Unbound subscription count = 0.
