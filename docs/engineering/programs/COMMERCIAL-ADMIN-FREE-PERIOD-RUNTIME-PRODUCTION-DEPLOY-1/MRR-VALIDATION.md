# MRR VALIDATION

Deployed `chargedTermsMrr.ts`:

- Authority = current Charged Terms snapshot
- Current concession ids are excluded before snapshot load
- Binding leftover is not an MRR fallback
- Catalog price is not used to fabricate MRR
- ARR = MRR × 12

Production snapshots = 0 and concessions = 0, so Production MRR remains fail-closed 0. No snapshot or `$0` terms were created by this deploy.
