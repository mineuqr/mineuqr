# CHECK-MANAGEMENT-ARCHITECTURE-1 — Migration

**Migration required:** Yes  
**File:** `drizzle/0069_check_management.sql`  
**Journal tag:** `0069_check_management`  

---

## 1. Why migration is required

Check Management introduces a new authoritative aggregate (`operational_checks`) and Business Settings tax columns. These cannot be expressed as ephemeral runtime state without violating snapshot immutability and multi-tenant durability requirements.

| Change | Ownership justification |
|--------|-------------------------|
| `restaurants.taxEnabled` / `taxMode` / `taxPolicyJson` | Business Settings own live tax policy |
| `operational_checks` table | Check sub-domain under Operational Session Platform |
| `dining_sessions.activeCheckId` | Session owns active Check reference only (not Check identity) |

No Order Domain / Order Read tables are altered.

---

## 2. Migration plan

1. Run governed migrate (`pnpm db:migrate` / platform migrate path).
2. Confirm journal terminus `0069_check_management`.
3. New sessions create Checks immediately on open.
4. Legacy open sessions receive Checks lazily via `ensureOpenCheckForSession` / resolve / settle paths (no mandatory historical backfill of closed sessions).

---

## 3. Rollback notes

Rollback is not automatic. Dropping `operational_checks` would destroy monetary documents. Prefer forward-fix only after production apply.

---

## 4. Governance

- Canonical journal entry count updated to **70**
- Tail tag: **`0069_check_management`**
- Guard: `pnpm db:governance-check`
