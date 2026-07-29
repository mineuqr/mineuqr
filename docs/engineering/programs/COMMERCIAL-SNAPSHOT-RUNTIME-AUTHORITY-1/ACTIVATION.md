# ACTIVATION

| Path | Snapshot + Binding |
|------|--------------------|
| Trial `createTrialSubscription` | Yes (`trial_activated`) |
| Register owner | Yes (existing ADOPTION wiring) |
| Admin create | Yes (`plan_selected`) via `ensureCommercialSnapshotBoundForSubscription` |
| Admin update (plan/period/activate) | Yes (`upgrade` / `downgrade` / `renewal` / `plan_selected`) |
| PayPal activation | Yes (`plan_selected`) |
| Tap activation | Yes (`plan_selected`) |

Historical Snapshot definition rows are preserved; binding points at the latest Snapshot id.
