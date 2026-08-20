# RECONCILIATION-REPORT

Approved diagram vs source at `3c15dff9`: **aligned** for the server Confirm await chain.

Gap vs production UX:

1. UI financial truth for unknown-result recovery is **Check.outcome**, not Collection Fact.  
2. Post-HTTP `getByCheck` still sits on the user-perceived Confirm path.  
3. Durable sweep worker is **not** on the Vercel entrypoint.  
4. Production milliseconds for the reported 1s / 7–8s were **not** captured here.

A later implementation program should fix UI/recovery/Vercel worker **without** moving ST/OS/SR before HTTP.

Recommended next-program scope (not this program):

1. Unknown-result recovery must treat a committed Collection Fact as paid even if Check is still OPEN.
2. Do not block the success toast on `settlementRecord.getByCheck`.
3. Start durable downstream recovery on the Vercel entry (`waitUntil` or equivalent). Do not await ST/OS/SR on Confirm HTTP.
