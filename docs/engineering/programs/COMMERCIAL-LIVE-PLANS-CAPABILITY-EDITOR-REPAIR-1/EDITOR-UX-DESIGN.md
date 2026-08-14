# EDITOR-UX-DESIGN.md

## Required flow

```
Select Basic / Professional / Enterprise
    → view capabilities
    → enable / disable individual capability
    → Save
    → Live Plan updated (no publish)
```

## Surface

`PlanCreationWizard` replaces the bundle `<Select>` with `CapabilityFilterPicker`.

Each card shows:

- Arabic name
- English name
- Capability identity (`projectionKeys` or `presentationId`)
- Enabled / disabled state
- Locked explanation when `alwaysEnabled`

Layout: domain groups → responsive two-column cards (`sm:grid-cols-2`). Existing Platform Ops / RTL language. Search matches AR, EN, and keys. Desktop, touch, and narrow layouts use the same picker (`max-h-[28rem]` scroll).

Bundle dropdown is **removed**. A bundle row remains an implementation grouping behind `featureBundleId`; it is not the commercial authority.

## Counts the administrator sees

| Kind | Count | Notes |
|------|------:|-------|
| Commercial-visible cards | 12 | picker |
| Always-on product claims (no Projection ID) | 4 | session / menu / design / smartQr — visible, locked, explained |
| Commercially editable cards | 8 | ordering, waiter, kiosk, counterPickup, financialSettlement, register, kitchen, reporting |
| Hidden foundation | 2 | printing, realtime — auto-on |
| Hidden dependency | 1 | devices — auto-on from kitchen / waiter / kiosk / expo |
| Hidden Expo | 1 | stored on Enterprise (15th key); not in picker |

Stored bootstrap counts remain **7 / 13 / 15**. The picker does not invent extra stored keys.

## Residual UX

Expo is commercially hidden (approved Presentation). It can still be persisted via `saveLive({ capabilities })` (tests). Unhiding Expo would be a Presentation change, not this repair.
