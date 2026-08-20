# PRODUCTION-COLLECTION-FACT-COMMIT-EXECUTION-HARDENING-1 — Architecture Decision Report

**Decision: HARDEN EXECUTION ONLY**
**Contract: UNCHANGED**
**Cashier: NOT ADOPTED**
**ADR-039: not superseded**

---

## 1. What the previous contract program already proved

`PRODUCTION-COLLECTION-FACT-COMMIT-CONTRACT-1` defined identity, snapshot, production validation, COMMITTED/PAID labels, and architecture non-adoption.

Its tests proved:

| Layer | Proven | Not proven by that suite alone |
|---|---|---|
| `assertProductionCollectionFactCommit` | production preconditions | writer persistence |
| In-memory `commitCollectionFact` | create / replay / intent conflict / amount fingerprint conflict | field-by-field fingerprint; insert count; DUPLICATE catch; STORAGE abort |
| `updateCollectionFact()` / `deleteCollectionFact()` throw | repository stubs forbidden | stored object cannot be mutated in memory |
| Downstream throw + stub UPDATE | labels | store insert not invoked as compensation |
| Architecture greps | Cashier/Confirm do not import writer | — |

A test named "retry" was an identical second `commitCollectionFact` call. That proves **writer lookup replay**, not database engine atomicity, and not "insert threw after persist."

`created` / `replayed` labels do **not** by themselves prove a single `store.insert` call.

---

## 2. Defects found (not contract defects)

1. **Mutable stored objects.** In-memory store kept the same object reference the writer built. A caller assigning `fact.amount` could mutate the stored financial snapshot. Drizzle insert returned the same object (DB row would be unchanged; in-process copy would not).
2. **Fingerprint binding tested mainly via amount.** Other payload fields were in the hash but not exercised on the writer path.
3. **Insert-then-DUPLICATE recovery untested.** Writer has a `DUPLICATE` catch for persist-success / lost-ack races; tests never drove it.
4. **STORAGE failure untested.** Failed insert could theoretically be confused with commit.

No 0098. No second financial authority. No Cashier integration required.

---

## 3. Hardening chosen (smallest correct path)

- Freeze a structured clone of the Collection Fact at writer insert, in-memory store insert, and drizzle insert return.
- Keep UPDATE/DELETE as throwing stubs. Do **not** add DB triggers.
- Prove replay with an **insert counter** (second call must not insert).
- Prove persist-success + `DUPLICATE` → `replayed`, one row.
- Prove `STORAGE` → no row.
- Prove fingerprint CONFLICT for amount, tax, discount, tenders, composition, order identity, currency, business day, tax policy, checkId — without mutating the original.
- Strengthen guards: no `.update(paymentCollectionFacts)`, no `onDuplicateKeyUpdate`, reporting adapter SELECT-only.

The contract vocabulary (`paymentIntentId`, COMMITTED = PAID, ST/OS/SR downstream) is unchanged.

---

## 4. What remains intentionally unproven

- Live TiDB unique-index races (this program forbids production writes; no new test database was authorized).
- HTTP transport layer (HTTP SUCCESS remains the writer return / future channel response, not a new endpoint).
- Cashier Confirm cutover.

Those are future adoption or infrastructure programs, not execution-contract gaps that require a new financial model.
