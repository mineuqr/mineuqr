# UI-ENFORCEMENT-GOVERNANCE.md

UI MUST consume `useCommercialFeatureVisibility().hasFeature("<key>")` or the canonical entitlement result.

Allowed presentation: hide, disable, lock, upgrade prompt, `CommercialUpgradeBanner`.

Forbidden: `if (plan === "basic") hide Screens`.

UI is **not** authorization. Direct API calls MUST still be denied (CE-08, I-CE-06).
