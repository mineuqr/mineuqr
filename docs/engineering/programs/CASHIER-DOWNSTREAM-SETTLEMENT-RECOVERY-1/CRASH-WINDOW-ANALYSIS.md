# CRASH-WINDOW-ANALYSIS

## CASE A — Collection Fact fails

Check freeze TX rolls back. HTTP fails. No PAID. Sweep finds no production CF+OPEN freeze for that intent (or CF absent). No downstream success.

## CASE B — CF commits, freeze TX commits, process crashes before HTTP

Durable CF + OPEN Check exist. HTTP may be lost. Sweep resumes ST/OS/SR. Confirm retry replays the same CF.

## CASE C — HTTP SUCCESS, process crashes before fire-and-forget

Same durable rows as B. Sweep / next boot / POS idempotency replay schedules recovery. Fire-and-forget loss is no longer permanent.

## CASE D — ST succeeds inside atomic OPEN finalize, crash before COMPLETED mark

Atomic Check TX: ST is not committed without PAID+OS+SR. Retry runs full finalize. If Check already PAID (remaining path), ST skip-if-exists.

## CASE E/F/G — ST / OS / SR transient failure after PAID

Remaining path retries only incomplete components. Collection Fact unchanged. HTTP already succeeded. PAID remains PAID.

## Atomicity proof

CF uses a separate connection (certified). HTTP is **after** awaiting CF **and** committing the Check freeze TX. The crash window this program closes is after that pair exists. The older window (CF committed, Check TX rolled back, no HTTP) is Confirm-retry / CF replay, not this worker.
