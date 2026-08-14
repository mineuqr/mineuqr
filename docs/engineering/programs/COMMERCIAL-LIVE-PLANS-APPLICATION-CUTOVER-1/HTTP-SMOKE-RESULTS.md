# HTTP-SMOKE-RESULTS.md

**NOT RUN — DEPLOYMENT OUT OF SCOPE**

This program is forbidden to deploy. Authenticated production smoke of login, dashboard, Commercial Plans, Plan Editor, and live persistence would exercise the **currently deployed** application against 0086, or would require deploying the new application.

Neither is authorized here. Results are not fabricated.

Automated substitutes (in-process):

| Concern | Evidence |
|---------|----------|
| Plan editor saveLive | router + UI guards + TEST A/C |
| Public pricing hydrate | public catalog tests + production 3 live plans |
| Entitlement resolution | runtime tests + fail-closed tests |
| Checkout charge | `createCheckoutSession` tests + unchanged `subscription_plans` |

Authenticated HTTP smoke remains a **post-deploy** Architecture Authority checklist item.
