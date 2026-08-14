# TEST-STRATEGY.md

All cases use fixtures. Do not mutate production `600001`.

| # | Case | Expected |
|---|------|----------|
| 1 | Owner + Full Platform | All current Projection / runtime feature keys true; commercial limits unrestricted |
| 2 | Owner + Basic simulation | Exactly current Basic Live Plan keys and limits |
| 3 | Owner + Professional simulation | Exactly current Professional |
| 4 | Owner + Enterprise simulation | Exactly current Enterprise |
| 5 | Return to Full Platform | All capabilities immediately; no subscription write |
| 6 | Professional Live Plan gains a capability | Simulation receives it (no snapshot) |
| 7 | New Projection ID added | Full Platform includes it without owner assignment |
| 8 | Customer Professional fixture | Unchanged while owner simulates anything |
| 9 | Customer Basic | Unchanged |
| 10 | Customer Enterprise | Unchanged |
| 11 | Non-owner admin | Mode mutation forbidden; entitlements stay customer chain |
| 12 | Staff / waiter identity | Cannot activate simulation |
| 13 | Owner with expired `600001` in fixture | Full Platform still works; period ignored |
| 14 | Invalid / missing simulated plan | Deny; not Full Platform |
| 15 | Cache | Owner Full vs Simulated vs customer Professional are distinct keys; no cross-read |

Also: mode change emits audit; checkout/invoice/binding row counts unchanged; Plan Editor composition unchanged by simulation.
