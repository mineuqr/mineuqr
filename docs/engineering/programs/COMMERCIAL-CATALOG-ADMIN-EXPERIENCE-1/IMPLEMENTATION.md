# IMPLEMENTATION

Host: `/admin/platform/commercial-catalog`

## Experience tabs

| Tab | Module |
|-----|--------|
| Dashboard | Health, readiness, growth, UX metrics |
| Plan Wizard | 11-step guided create → draft/publish |
| Search | Global search + saved filters + windowed results |
| Compare | Version compare · Deep clone · Publication diff · Smart validation |
| Pricing Preview | Draft customer pricing cards |
| Customer Preview | Desktop/tablet/mobile + region/currency |
| Dependencies | Graph + impact + blockers |
| Timeline | Plan lifecycle events |
| Bulk Ops | Multi-select publish/deprecate/retire/archive |
| Manage | Existing MANAGEMENT-UI-1 CRUD panels |

## Supporting files

`client/.../commercial-catalog/experience/*` — observability, productivity store, smart validation, compare, graph, wizard, panels.

## Architecture constraints honored

- Mutations only via existing `commercialCatalog.*` tRPC  
- CC-16 validate before publish (wizard + bulk + publication diff)  
- No duplicated publication/validation domain logic  
- No DB access from UI
