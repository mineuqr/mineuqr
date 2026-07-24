# REGISTER-CATALOG-MANAGEMENT-1 — Implementation

## Delivered

1. **Domain** — `code`, `registerType`, `archivedAt`; provision uniqueness; rename / changeType / updateCode / archive; catalog events.
2. **Persistence** — `0080_crmp_register_catalog.sql` + Drizzle schema/repository mapping.
3. **Application** — `CrmpRegisterCatalogService` + `crmp.catalog.*` tRPC.
4. **UI** — Register Catalog Manager tab; Ops empty-state → Catalog create.
5. **Tests** — Domain, API, architecture, presentation guards + CRMP regression.
6. **Certification** — [CERTIFICATION.md](./CERTIFICATION.md)

## Non-goals (held)

- Production migrate of `0080`
- Duty / Shift / Settlement / Reporting changes
- Destructive Register delete
- New catalog status `archived` (soft `archivedAt` only)
