# ADMIN UI

Surface: Customer Success account subscription dialog.

## Create

Fields remain distinct:

- Plan (Live Plan UUID)
- Billing cycle
- Live Plan price (catalog display only; no Admin price input)
- Free period: None / Days / Calendar months
- Duration + reason when enabled
- Calculated **Free until** date

When Free period is enabled:

- Status is forced `active`
- Explicit subscription end date is omitted (server uses concession `endsAt`)
- Request includes `freePeriod: { unit, duration, reason }`

When Free period is None, the existing paid create path is used.

## Edit / grant / revise / cancel

- Current concession is loaded via `admin.getCommercialConcession`
- Enabling Free period on a subscription with no current concession → `grantCommercialConcession`
- Enabling Free period when a current concession exists → `reviseCommercialConcession`
- **Cancel free period** button calls `cancelCommercialConcession`
- Plan/cycle/status edits without a free-period payload use the existing update mutation

Copy states that catalog price is display-only and that a free period is not a paid commitment and not a trial.
