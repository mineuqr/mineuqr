# Status Ownership Matrix — SEMANTIC-STATUS-BADGE-SYSTEM-1

| Status domain | Meaning owner | Label owner | Tone map |
| --- | --- | --- | --- |
| Order lifecycle | `ORDER_STATUSES` / Order Platform | `orderStatusDisplay.formatOrderStatusLabel` | `mapOrderStatusToBadgeTone` |
| Dining session | Session Platform / `DiningSessionStatus` | `diningSessionCopy` / session workspace labels | `mapTableSessionStatusToBadgeTone` |
| Table board available/occupied | Ops board VM | section local labels | `mapTableSessionStatusToBadgeTone` |
| Print health | Print workspace `WorkspaceHealthState` | `formatHealthLabel` | `mapHealthToneToBadgeTone` ← `healthTone()` |
| Security health | Security Center | section copy | `mapSecurityHealthToBadgeTone` |
| Fleet operator | Screen fleet read model | `operatorFleetStatusLabel` | `mapFleetStatusToBadgeTone` |
| Register duty/availability/shift | CRMP register statuses via register-ops VM | register-ops copy | register mappers |
| Commercial subscription | Commercial platform (external status) | caller-supplied label | `mapCommercialStatusToBadgeTone` |
| Offer type | Offer product field | dashboard i18n | `mapOfferTypeToBadgeTone` |

**Rule:** Design System maps status → tone only. It does not redefine status vocabularies.
