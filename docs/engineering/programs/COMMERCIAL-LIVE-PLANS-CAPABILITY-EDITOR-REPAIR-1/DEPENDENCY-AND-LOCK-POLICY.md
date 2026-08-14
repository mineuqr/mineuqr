# DEPENDENCY-AND-LOCK-POLICY.md

Separation used by this repair:

| Kind | Meaning |
|------|---------|
| **A. Platform-infrastructure dependency** | Required by another capability; not a paid differentiator |
| **B. Commercial capability** | Customer-meaningful product claim |
| **C. Commercially editable capability** | Administrator may add/remove it on a Live Plan |

Foundational **does not** automatically mean “uneditable locked checkbox.”

## Presentation cards

| presentationId | Class | alwaysEnabled | Stored Projection | Decision |
|----------------|-------|---------------|-------------------|----------|
| sessionTableManagement | commercial | true | none | **B, not C.** Product claim on every plan. No Projection ID exists. Shown locked with `alwaysOnProductNote`. Not silently hidden. |
| menuManagement | commercial | true | none | Same. |
| menuDesign | commercial | true | none | Same. |
| smartQr | commercial | true | none | Same. |
| ordering | commercial | false | `ordering` | **C.** Editable. |
| waiter | commercial | false | `waiter` | **C.** Devices auto-satisfied. |
| kiosk | commercial | false | `kiosk` | **C.** Devices auto-satisfied. |
| counterPickup | commercial | false | `counterPickup` | **C.** |
| financialSettlement | commercial | false | four settlement keys | **C.** One card; children are nested details, not a second architecture. |
| register | commercial | false | `register` | **C.** Enterprise bootstrap includes it. |
| kitchen | commercial | false | `kitchen` | **C.** Devices auto-satisfied. |
| reporting | commercial | false | `reporting` | **C.** |
| printing | foundation | true | `printing` | **A.** Hidden. Always on via rules. Not a paid differentiator. |
| realtime | foundation | true | `realtime` | **A.** Hidden. Always on via rules. |
| devices | dependent | false | `devices` | **A.** Hidden. Forced when kitchen / waiter / kiosk / expo is on. |
| expo | commercial | false | `expo` | **B, stored on Enterprise.** Hidden from picker (approved Presentation). Residual: not UI-editable. |

## Dependencies preserved

- Kitchen / Waiter / Kiosk / Expo → `devices`
- Table ordering → financial settlement Projection keys
- Printing / realtime always applied on save

Dependencies do **not** hide the eight editable commercial cards.
