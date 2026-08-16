# REGISTER / SHIFT API MAP

Existing CRMP router (`server/crmp/api/crmpRouter.ts`), auth: **`assertRestaurantAccess`** (owner / platform admin). Not POS permissions.

| API | Purpose |
|-----|---------|
| `crmp.catalog.*` | Provision / activate / deactivate Register catalog |
| `crmp.register.open/close/suspend/resume` | Duty lifecycle |
| `crmp.register.assignOperator` / `attachDevice` | Attribution |
| `crmp.register.resolveActive` / `resolveByDevice` / `resolveByOperator` | Read |
| `crmp.financialShift.open/close/archive/listArchive` | Shift lifecycle + archive |
| `crmp.financialShift.getCurrent` / `getTenderSummary` / `getClosingReport` | Read |

**POS APIs added (read/consume only):**

| API | Purpose |
|-----|---------|
| `pos.registerShift.context` | Resolve canonical CRMP context for the authenticated POS cashier/terminal |
| `pos.settlement.initiate` | Requires resolved CRMP context; passes `settlementContextHints` into Check |

POS does **not** duplicate `crmp.register.open` or `crmp.financialShift.open`. Cashiers who are not restaurant owners still open/close via existing Register Ops (CRMP), not via new POS lifecycle APIs. Equating `POS_ACCESS` with Register control is forbidden.
