# PRINT-PRODUCTION-VALIDATION-1 — Performance Report

## Measurements

| Metric | Target | Measured | Status |
|--------|--------|----------|--------|
| Discovery latency (p50) | Document | **Not measured** | Pending |
| Discovery latency (p95) | Document | **Not measured** | Pending |
| Print latency (click → OS submit) | Document | **Not measured** | Pending |
| End-to-end (click → printed job) | Document | **Not measured** | Pending |
| Order event → job created | Document | **Not measured** | Pending |

## Measurement Protocol (Manual)

Use browser DevTools + server timestamps:

1. **Discovery:** Record time from refresh click to `discoverPrinters` response.
2. **Print:** Record time from Print click to:
   - tRPC mutation complete
   - `print_jobs.status = printed` (DB query)
   - physical output starts (stopwatch)

Repeat 10 runs; report median and p95.

## Expected Bottlenecks (Architectural)

| Stage | Notes |
|-------|-------|
| OS discovery | `Get-Printer` / `lpstat` subprocess — can be 1–10s on Windows |
| OS print submit | `Out-Printer` / `lp` — driver-dependent |
| DB writes | Job + history + attempts — typically sub-100ms |
| Projections | Order read must be warm for payload build |

## Automated Baseline

Unit test suite (26 tests): **135ms** total execution (not representative of production I/O).

## Section Verdict

**NOT CERTIFIED** — no production performance data collected.
