# SESSION-AND-MULTI-DEVICE.md

## Recommendation: A. Account-persistent

| Model | Safety | Convenience | Audit | Testing |
|-------|--------|-------------|-------|---------|
| A. Account-persistent | High if fail-closed | High (reload/login keep mode) | High (one row) | Best |
| B. Session-specific | Logout can reset to Full Platform (forbidden surprise) | Re-pick plan every login | Weaker | Poor |
| C. Device-specific | Split-brain | Confusing | Weak | Poor |

**Account-persistent** matches “survive page reload”, “auditable”, and “simulation must not become Full Platform on session refresh.”

## Transitions

| Event | Behavior |
|-------|----------|
| Reload | Same mode |
| Logout / login | Same mode (still owner-only after re-auth) |
| Session expire | Re-auth; mode unchanged |
| Other device | Same mode; banner shows simulation |
| Live Plan composition changes while simulating | Next resolve sees new capabilities |
| Simulated plan missing | Stay in SIMULATED_PLAN; deny; explicit return |

Login of a **non-owner** on another account is unrelated. Their entitlements never read `platform_owner_access_mode`.
