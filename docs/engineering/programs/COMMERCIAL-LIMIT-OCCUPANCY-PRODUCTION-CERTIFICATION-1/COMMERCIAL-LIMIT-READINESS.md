# COMMERCIAL LIMIT READINESS

**Program:** COMMERCIAL-LIMIT-OCCUPANCY-PRODUCTION-CERTIFICATION-1  
**Mode:** read-only. No catalog / plan / subscription mutation.

## Live Plans (sellable)

3 plans, all `isHidden = 0`. 3 limit profiles. 9 limit values. 4 bindings. 8 subscriptions.

| Code | restaurants | categories | items | posTerminals |
|------|-------------|------------|-------|--------------|
| basic | 1 | 10 | 100 | **missing** |
| professional | 1 | 25 | 500 | **missing** |
| enterprise | 1 | 100 | unlimited (`null`) | **missing** |

Plans missing `posTerminals`: `basic`, `professional`, `enterprise`.

## Classification

**NON-BLOCKING / REQUIRED BEFORE POS COMMERCIAL USE**

Not CRITICAL for this occupancy application deploy:

- Production POS occupancy is **0** (no registered/active terminals).
- Current Production POS deployment does not depend on these plans for live terminals.
- After occupancy deploy, `checkLimit({ limitKey: "posTerminals" })` fail-closes a missing key (`limit_key_unsupported` / denied). POS provision will not silently exceed an undefined cap.

Do not seed or repair plans in this program.

## Other quantity keys

`restaurants`, `categories`, and `items` are present on every sellable Live Plan and are readable.

## Result

PASS for occupancy application deployment. POS commercial use still requires a later Commercial catalog program to publish `posTerminals` on the intended Live Plans.
