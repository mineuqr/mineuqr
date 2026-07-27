# ORDERING-CHANNEL-HISTORICAL-BACKFILL-1 — Evidence Matrix

| Evidence | Allowed? | CERTAIN channel? | Notes |
|----------|----------|------------------|-------|
| Persisted `ordering_channel` | Yes | Yes (already stamped) | None in corpus |
| Official Ordering Channel Registry | Yes | N/A alone | Maps ids; does not invent history |
| Explicit waiter place path metadata beyond BI | Yes if persisted | — | Not persisted historically |
| Device / kiosk enrollment FK on order | Yes if persisted | — | **Absent** on orders |
| QR-specific persisted channel flag | Yes if persisted | — | **Absent** historically |
| `identityScope = WAITER` | BI only | **No** | Sequence partition; LIKELY waiter_tablet at best |
| `identityScope = KIOSK` | BI only | **No** | Also derived for counter/take_away/pickup/queue/drive_thru |
| `identityScope = TABLE` | BI only | **No** | QR vs `table_session` ambiguity |
| Session id present | Partial | **No** | Shared by QR + waiter table paths |
| Tracking token present | Partial | **No** | Present on all 21 samples |
| Payment method | **Prohibited** | — | Not used |
| Check / revenue / tax / amount | **Prohibited** | — | Not used |
| UI / heuristics / probability | **Prohibited** | — | Not used |

## Classifier source

`scripts/ordering-channel-historical-backfill/historicalChannelClassifier.ts`
