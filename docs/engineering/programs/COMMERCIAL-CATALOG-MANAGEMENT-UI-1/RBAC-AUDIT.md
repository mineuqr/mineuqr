# RBAC + AUDIT

## RBAC

- Client: Platform Ops shell + `useAuthGate` (admin only)  
- Server: every `commercialCatalog.*` procedure uses `assertAdminAccess`  
- Mutations map to admin capabilities: Manage Catalog / Publish / Retire / Pricing / Promotions (all gated by platform admin role — same foundation RBAC model)

## Audit

Server services already emit Catalog audit events on create/update/publish/deprecate/retire/regional/migration/promotion. UI does not bypass services — all mutations go through tRPC → domain services → audit emitters.

## Observability

`catalogManagementUiObservability` tracks:

- CRUD attempts / successes / failures / success rate  
- Validation runs / failures  
- Publication attempts / failures  

Surfaced on Commercial Health panel.
