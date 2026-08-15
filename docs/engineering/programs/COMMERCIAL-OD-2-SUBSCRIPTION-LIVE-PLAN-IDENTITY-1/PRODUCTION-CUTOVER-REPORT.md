# PRODUCTION-CUTOVER-REPORT

Program: **COMMERCIAL-OD-2-0088-PRODUCTION-APPLY-1**  
Date: 2026-08-15

## Status

**OD-2 Production Cutover — COMPLETE**

## Backup

AA-supplied TiDB Cloud backup: environment `mineuqr-production`, status Succeeded, 2026-08-15 03:00:30 UTC, expiry 2026-08-16 03:00:30 UTC. Associated with the verified Production target (`mineuqr` / tidbcloud_prod / gateway01). Not restored. Not deleted.

## Apply

`drizzle-kit migrate` 2026-08-15T12:37:43.910Z → 12:37:51.319Z. Success. Journal 0087 → 0088.

## After

`planId` varchar(36) NOT NULL. 7/7 UUIDs resolve. Status 5 active / 2 expired. Bindings agree. Charged Terms untouched.

## Not done

Commit · push · deploy · OD-3 · OD-4 · SAFE DELETE
