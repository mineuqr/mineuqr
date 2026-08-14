# ACCESS-MODE-MODEL.md

## Canonical states (exactly two)

```
ownerAccessMode:
  mode: FULL_PLATFORM | SIMULATED_PLAN
  simulatedPlanCode: string | null   # Live Plan code, e.g. "professional"
```

| Mode | `simulatedPlanCode` | Meaning |
|------|---------------------|---------|
| `FULL_PLATFORM` | `null` | All current commercial capabilities; no plan lookup |
| `SIMULATED_PLAN` | required Live Plan **code** | Consume that plan’s **current** capabilities and commercial limits |

No third stored mode. `SIMULATION_UNAVAILABLE` is a **runtime outcome**, not a persisted state (see FAILURE-MODES).

## Sufficiency

Two modes are sufficient. Do not add Draft, Preview, Partial, or “owner plan” states.

Identity of the simulated plan is the **catalog code** (`basic` / `professional` / `enterprise` / future codes), not a database UUID. Runtime resolves code → current Live Plan. UUIDs change across catalog resets; codes are the commercial identity already used by Presentation and Public Pricing.

## Persistence recommendation

**C. Dedicated owner access table** (account-persistent).

Reject:

| Option | Why not |
|--------|---------|
| A. User table column | Contaminates `users`; encourages `userId === 1` thinking |
| B. Account table | No separate account entity today |
| D. Session-only | Reload/login would drop simulation or, worse, default to Full Platform |
| E. App config | Not auditable per change; not switchable without deploy |

Conceptual table (do **not** migrate in this program):

```
platform_owner_access_mode
  userId              PK, must be the platform owner
  mode                FULL_PLATFORM | SIMULATED_PLAN
  simulatedPlanCode   nullable
  updatedAt
  updatedByUserId
```

Do not put this on `user_subscriptions`, `subscription_plans`, or `commercial_subscription_bindings`.

Default row when first created: `FULL_PLATFORM` / `null`.
