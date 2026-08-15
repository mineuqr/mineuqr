# COMMERCIAL-ROUTE-GUARD.md

## Central authority

`useFrozenCommercialRouteGuard` reads hub meta and redirects to `/pricing` when `commercialAccountState === FROZEN`.

Mounted on:

- `Dashboard` — covers `/dashboard` and `/dashboard/:section` (menu, screens, settings, reports)
- `TemplateSelector` — `/dashboard/templates/:restaurantId`

This is presentation. Server mutations still deny independently.

## Forbidden bypasses

- Hide-button-only
- `if (isOwner) allow` on customer Frozen
- `if (role === admin) allow`
- pathname allow-lists that skip Frozen
- localStorage Frozen flags

## Other routes

| Route | Guard |
|-------|-------|
| `/pricing`, `/subscription`, `/billing`, `/payments` | Open for renewal |
| `/login`, `/register` | Auth |
| `/menu/:slug` and table QR | Public Frozen experience, not this guard |
| `/admin/*` | Platform admin; Owner Access, not customer Frozen |
| `/statistics` | Legacy redirect to `/admin/analytics` |
