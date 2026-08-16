# ERROR SEMANTICS

**Program:** COMMERCIAL-LIMIT-OCCUPANCY-TIDB-CONCURRENCY-PROOF-1  
**STATUS:** G-06 mapper PASS in-process; capacity rejection under contention NOT observed (both racers succeeded)

P15: `throwCommercialOccupancyTrpcError` still maps:

- `CommercialLimitExceededError` → tRPC `FORBIDDEN`
- `CommercialOccupancyUnavailableError` → tRPC `INTERNAL_SERVER_ERROR`

They do not collapse into authorization copy.

The last-slot loser never became `CommercialLimitExceededError` on TiDB because **both creates succeeded**. Contention did not exercise the G-06 capacity-rejection path.
