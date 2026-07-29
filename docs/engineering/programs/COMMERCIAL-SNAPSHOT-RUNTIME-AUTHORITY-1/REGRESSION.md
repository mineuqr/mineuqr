# REGRESSION

| Surface | Expectation |
|---------|-------------|
| Unbound subscriptions | Legacy Bridge unchanged |
| Bound subscriptions | Snapshot-exclusive features/limits |
| Payments | Webhook logic unchanged; post-activate bind only |
| Orders / checks / reporting | Consume same entitlement DTO; authority source branch-only |
| Client hooks | Unchanged API; meta may include `commercialResolutionSource` |
