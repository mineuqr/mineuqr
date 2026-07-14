# BUSINESS-IDENTITY-REMEDIATION-1 — Architecture & Forensics

**Status:** Root cause confirmed · Remediation: host-independent business-day window conversion  
**Context:** Production `pnpm db:order-read:backfill` failed after migration `0064` on orders `1890001` / `1890002`.

---

## 1. Ownership

| Concern | Owner |
|---------|--------|
| Live identity allocation | `DrizzleBusinessIdentityAllocator.allocateForNewOrder` (sequence) |
| Historic / projection / backfill | `ensureAssigned` (chronological rank in business-day window) |
| Business day math | `shared/utils/businessDay.ts` (`resolveBusinessDayKey`, `resolveBusinessDayWindow`) |
| Uniqueness | `uq_orders_restaurant_business_day_display` (migration `0061`) |

Hot path does **not** use windows. Historic path **does**. Replay determinism depends on window ISO bounds being host-independent.

---

## 2. Forensic timeline (restaurant `720007`)

| Time (UTC) | Event |
|------------|--------|
| ≤ 2026-06-12 | Orders placed **before** business-identity columns existed → `businessDay` / `daily_display_number` NULL |
| `2026-06-11T13:09` … `2026-06-12T13:25` | Later rematerialized as display `#1`…`#10` on business day `2026-06-11` |
| `2026-06-12T16:07:09` | Order **1890001** (`ORD-0016`) created · session null · table 540001 |
| `2026-06-12T16:09:47` | Order **1890002** (`ORD-0017`) created · ~2.5 min later · same table · notes present |
| 2026-07-14 ~09:30Z | Operator backfill (host `Asia/Riyadh`) assigns through **1890001** → `(2026-06-11, 11)` |
| 2026-07-14 ~09:32Z | **1890002** retries `(2026-06-11, 11)` ×5 → `ER_DUP_ENTRY` · backfill abort |
| After abort | **223** orders still NULL identity (all in tenant `720007`) |

Restaurant working hours (material): **Friday `open: 23:45`**.  
`2026-06-12` is Friday → local 19:07 is **before** Friday open → `resolveBusinessDayKey` correctly returns **`2026-06-11`**.

Neither order was manually repaired. No allocator bypass. Collision is algorithmically deterministic under the broken window.

---

## 3. Root cause (evidence-backed)

### Defect

`localWallToUtcIso` in `shared/utils/businessDay.ts` builds the initial `Date` via:

```ts
new Date("2026-06-11T09:00:00") // ← host-local interpretation, not an absolute wall clock
```

On hosts whose TZ equals `Asia/Riyadh`, the offset adjustment is applied **twice**, shifting the entire business-day window **3 hours earlier**.

| Bound | Expected (Riyadh correct) | Produced on `Asia/Riyadh` host |
|-------|---------------------------|-------------------------------|
| Start (Thu 09:00) | `2026-06-11T06:00:00.000Z` | `2026-06-11T03:00:00.000Z` |
| End (Fri 23:45) | `2026-06-12T20:45:00.000Z` | `2026-06-12T17:45:00.000Z` |

### Failure mode in `ensureAssigned`

1. `businessDay = resolveBusinessDayKey(createdAt)` → still `2026-06-11` (key path is correct).
2. `window = resolveBusinessDayWindow(day)` → **truncated early**.
3. Orders with `createdAt ≥ broken end` are **outside** the SQL rank window but still labeled day `2026-06-11`.
4. Every such order gets:

   `dailyDisplayNumber = count(in_window) + 1` → **same integer**.

5. First claimant (1890001) stores `#11`. Second (1890002) recomputes `#11` forever. Retry cannot help.

### Evidence

- TiDB: `createdAt < expected_end (20:45Z)` is true for both orders; `< broken_end (17:45Z)` is **false**.
- Broken in-window set ends at `1860001` (`13:25Z`); afternoon orders sit outside.
- Production allocator params for failure: `2026-06-11, 11, 1890002`.
- Holder of `#11`: `1890001` (updated during same backfill run).
- Null-identity cohort remaining after abort: 223.

### Classification

| Candidate | Verdict |
|-----------|---------|
| Legacy migration / missing allocation | Contributing **precondition** (NULL identities) — not the collision mechanism |
| Hot-path allocator bug | **No** — uses sequence only |
| Manual SQL / constraint disable | **No** |
| Write/read model inconsistency | **No** |
| Backfill orchestration bug | **No** — correctly calls `ensureAssigned` |
| **Historic rank + host-dependent window ISO** | **Yes — root cause** |

---

## 4. Architecture audit — replay determinism

Historic allocation is **not** deterministic across operator environments until window conversion is host-independent. UTC CI/Vercel hosts may coincidentally produce correct bounds; `Asia/Riyadh` operator hosts produce truncated windows and collisions on long business days (late next-day open).

---

## 5. Remediation design (minimal)

1. Fix `localWallToUtcIso` to treat the wall-clock string as timezone-target wall time via a **UTC initial guess + iterative offset refine** (never `new Date(localIso)` without `Z`).
2. Pin absolute ISO expectations in unit tests (Friday late-open fixture matching production hours).
3. Re-run official `pnpm db:order-read:backfill` — no manual row edits.
4. Leave already-assigned `#1`…`#11` intact; under corrected window they match true chronological ranks (1890001 remains `#11`; 1890002 becomes `#12`).

**Out of scope:** Ordering Platform, UI channels, constraint changes, ad-hoc SQL.
