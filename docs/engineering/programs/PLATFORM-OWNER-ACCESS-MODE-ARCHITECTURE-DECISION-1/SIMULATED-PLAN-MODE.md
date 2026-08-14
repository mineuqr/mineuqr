# SIMULATED-PLAN-MODE.md

## Semantics

```
SIMULATED_PLAN + simulatedPlanCode
    → resolve current Live Plan by code
    → current capabilities
    → current commercial limits
```

Live simulation. No snapshot, no freeze, no owner-specific capability copy.

If Professional gains a capability in the Plan Editor, the next owner resolve in Simulated Professional **receives it**. Same Live Plan customers would receive.

## Selection

Discover **current non-hidden Live Plans** from the catalog (codes + Presentation names). Do not hardcode only three plans. Do not expose raw UUIDs in the owner UI.

## Consume, do not edit

Simulation **must not** write `commercial_plans` or bundle features. The Plan Editor remains the only composition authority.

## Return

```
mode = FULL_PLATFORM
simulatedPlanCode = null
```

Immediate Full Platform on the next resolve. No subscription, billing, or binding mutation.

## Unavailable plan

Keep `mode = SIMULATED_PLAN` and the code. Deny commercial entitlements. Surface `SIMULATION_UNAVAILABLE`. Require an explicit “Return to Full Platform” (or pick another live plan). **Never** silently upgrade to Full Platform.
