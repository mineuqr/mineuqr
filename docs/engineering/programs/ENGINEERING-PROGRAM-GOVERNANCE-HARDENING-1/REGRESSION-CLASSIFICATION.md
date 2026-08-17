# REGRESSION CLASSIFICATION

**Program:** ENGINEERING-PROGRAM-GOVERNANCE-HARDENING-1

## Historical certified evidence

Most recent certified TypeScript statements (count only):

| Program | Reported `error TS*` | Fingerprint of all 188 |
|---------|---------------------:|------------------------|
| COMMERCIAL-ADMIN-LIMIT-ENFORCEMENT-1 | 188 (after harness exclude) | no |
| COMMERCIAL-LIMIT-OCCUPANCY-FINAL-AUDIT-1 | 188 | no |
| COMMERCIAL-LIMIT-OCCUPANCY-PRODUCTION-CERTIFICATION-1 | 188 | no |
| COMMERCIAL-GIT-GOVERNANCE-0094-COMMIT-1 | 188 | no |
| COMMERCIAL-OCCUPANCY-APPLICATION-DEPLOYMENT-1 | 188 | no |
| POST-DEPLOYMENT-COMMERCIAL-OCCUPANCY-SMOKE-1 | 188 | no |

G-08/G-09 briefly reported **193**. Those five extras were identified by **path + code** (`occupancyTestTidb.ts` TS7016, `occupancyTidbWorker.ts` TS1378 ×4) and later removed from the `pnpm check` surface by harness exclude. That episode is evidence that count-only comparison is insufficient: 193 vs 188 was a file-set change, not “the same 188 plus noise.”

No certified program stored a complete 188-row `file:line:column:code:message` fingerprint.

## This measurement vs certified count

| | |
|--|--|
| Previous certified count | 188 |
| Current measured count | 188 |
| Numerical delta | 0 |
| BASELINE COUNT MATCH | **PASS** |
| EXACT HISTORICAL FINGERPRINT COMPARISON | **NOT PROVABLE** |

## Classification of the 188 current diagnostics

| Class | Count | Notes |
|-------|------:|-------|
| A Existing diagnostic unchanged | 0 proven | no historical fingerprint |
| B Existing diagnostic moved (line drift) | 0 proven | no historical fingerprint |
| C Existing diagnostic materially changed | 0 proven | no historical fingerprint |
| D New diagnostic | 0 proven | no historical fingerprint |
| E Removed diagnostic | 0 proven | no historical fingerprint |
| F Unable to classify | **188** | historical evidence insufficient |

**UNCLASSIFIED — HISTORICAL EVIDENCE INSUFFICIENT**

Do **not** label these 188 as PRE-EXISTING. The count matches. The population is not proven identical.

## Count-only is insufficient

Because exact comparison is not provable:

- This is **not** reported as “no regression.”
- This is **not** reported as “BASELINE COUNT MATCH BUT DIAGNOSTIC POPULATION CHANGED” (that requires a proven population delta).
- This is: **count match + fingerprint comparison not provable.**

Future programs must compare against **this** fingerprint (`DIAGNOSTIC-FINGERPRINT.json`). From this program forward, exact comparison is possible.

## App.tsx six

Present in the current fingerprint at the charter locations. Not repaired. Not called newly introduced by this program (no App.tsx edit). Not called historically identical (no prior fingerprint).
