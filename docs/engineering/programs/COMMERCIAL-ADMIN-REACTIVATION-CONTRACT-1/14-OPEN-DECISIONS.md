# 14 — OPEN DECISIONS

These do **not** reopen Model A vs B vs C.

## OD-REACT-1 — Period-end algorithm

Admin-supplied `subscriptionEndDate` vs cycle-derived default (`computeAdminSubscriptionPeriodEnd`).  
**Recommendation for implementation:** allow Admin override; if omitted, derive from selected cycle (monthly +1 calendar month, yearly +1 year). Must be strictly in the future.

## OD-REACT-2 — Reason required?

Contract recommends a required reason string for the audit event. Exact max length can follow concession reason (512).

## OD-REACT-3 — Close implicit update in the same implementation program

Yes. Shipping a dedicated procedure while leaving `status=active` on update would leave the GAP open.

## OD-REACT-4 — Webhook after cancel

Customer checkout that writes `status=active` is **not** Admin Reactivation. Needs its own contract later. Do not start it here.

## OD-REACT-5 — Trial status as “reactivate”

Setting `status=trial` on a canceled paid row is not Reactivation. Implementation should refuse trial-as-reactivate unless a later Trial contract says otherwise.

## Still blocked (other programs)

- OD-4 / SAFE DELETE
- Snapshot/concession backfill
- Production data repair
- Tax / FX / Payments redesign
