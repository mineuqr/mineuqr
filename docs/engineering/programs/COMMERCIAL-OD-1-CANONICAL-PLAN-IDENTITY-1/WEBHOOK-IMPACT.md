# WEBHOOK-IMPACT

Webhooks and provider payloads were not modified.

## Classification

| Field | Class | Meaning |
|-------|-------|---------|
| PayPal `custom_id.planId` | **B — compatibility metadata** | MineuQR integer echoed by checkout |
| Tap `metadata.plan_id` | **B — compatibility metadata** | Same |
| PayPal order / capture id | **F — payment transaction** | Not plan identity |
| Tap charge id | **F — payment transaction** | Not plan identity |

This is **not** Class A (canonical internal identity) and **not** a provider-owned plan/product catalog id (Class C).

## Future

When checkout sends UUID in metadata, webhooks correlate that UUID and bind `bindings.planId`. Provider transaction IDs stay unchanged.

No external integration requires the legacy integer as a **permanent internal** MineuQR plan identity. They require whatever checkout put in metadata, plus their own transaction ids.
