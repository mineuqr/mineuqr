# IMPLEMENTATION — REACT-130-REALTIME-FORENSICS-1

## Root cause
`SemanticKpiCard` always mounts `<Icon />`. Platform Ops Realtime (and other ops pages) call `PlatformOpsMetricCard` without `icon` → `Icon` is `undefined` → React #130.

## Fix
`PlatformOpsMetricCard` defaults `icon` to `Activity` when omitted.

## Tests
`react130RealtimeForensics.architecture.guards.test.ts` (+ foundation/adoption suites).
