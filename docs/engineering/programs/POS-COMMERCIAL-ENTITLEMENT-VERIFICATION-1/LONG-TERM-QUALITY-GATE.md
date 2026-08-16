# LONG-TERM QUALITY GATE

MineuQR is a multi-restaurant SaaS. POS consumes Commercial; it does not replace it.

## A. REQUIRED NOW

**None.** The POS commercial boundary already uses Live Plan `posTerminals` via `checkLimit`, fail-closes when missing, and gates operational commands on `available`. Owner/admin/PLATFORM_OWNER are not cashiers.

Why wait is correct: inventing a POS feature key, freeze system, or occupancy lock **now** would duplicate Commercial or invent policy.

## B. REQUIRED FOUNDATION FOR FUTURE

| Item | Why today | Scale | Debt if skipped forever |
|------|-----------|-------|-------------------------|
| Seed `posTerminals` on Live Plans that sell POS | Professional catalogs must state quantity | Per plan, all restaurants on that plan | POS stays fail-closed at 0 (safe, unsellable) |
| Shared `checkLimit` occupancy atomicity | Prevents over-provision under concurrency | All limits (restaurants, categories, items, terminals) | Rare over-limit rows; same as rest of platform |
| Commercial policy: excess terminals on downgrade | Product must say freeze vs grandfather | Multi-terminal restaurants, plan changes | Operators keep using extra terminals until expiry/0 |
| Optional POS **feature** key if POS is sold independently of quantity | Add-on / packaging | Future add-ons | Cannot turn POS off while leaving a leftover limit row except by setting 0 |
| Restaurant Administrator RBAC (not cashier) | When RBAC platform lands | Staff vs cashier | Must not collapse into POS_ACCESS |

How it scales: one Live Plan per offering; many restaurants; many terminals per restaurant via one limit key; cashiers via grants not commercial seats; branches later as a **new** commercial limit (do not overload `posTerminals` or `devices`). Hardware and payments attach as optional associations / later capabilities. Country compliance (ZATCA) stays outside this gate.

## C. SAFE TO DEFER

- Per-terminal billing, POS add-on invoices, POS pricing engine  
- POS Workspace / `/pos` UI  
- POS read APIs (next program)  
- Aligning unused `PosAccessService.authorize()` with `evaluate()`  
- Branch-level POS caps  
- Hardware SKU entitlements  
- Payment-provider commercial add-ons  
- Country-specific POS compliance packs  

Complexity avoided: no POS billing ledger, no POS subscription state machine, no freeze table.

## D. SHOULD NEVER BE INTRODUCED

- POS subscription / billing / plan / entitlement tables  
- Duplicated commercial resolvers or projections  
- `devices` as POS terminal quantity  
- Owner = Cashier, Admin = Cashier, PLATFORM_OWNER = Cashier  
- POS-owned outer Order transaction  
- POS-specific freeze/lockout duplicating lifecycle  
- POS-specific locking around `checkLimit`  
- `if (plan === "basic")` or `if (isOwner) return true` as commercial grant  
- Collapsing commercial + authorization + terminal into one guard  
- “Missing limit means unlimited” for customer POS  
- Per-terminal invoices from inside POS  

## Intentionally not built in this program

UI, billing, migrations, Production seed, concurrent occupancy primitive, downgrade auto-deactivation.
