# Design Consistency Report — COMMERCIAL-CAPABILITY-EXPERIENCE-1

## Design system usage

| Element | Component |
|---------|-----------|
| Capability cards | `SemanticSurfaceCard` (`cardType="feature"`) |
| Metrics | `PlatformOpsMetricCard` / `PlatformOpsMetricGrid` |
| Status / domain chips | `PlatformOpsStatusBadge` |
| Sections | Existing `PlatformOpsSection` hosts |
| Forms chrome | Existing CatalogField / dialogs (unchanged mutations) |

## Visual rules honored

- Avoided generic settings checkbox walls  
- Domain grouping as primary hierarchy  
- Enabled state emphasized via border/background on cards  
- RTL: pricing preview sets `dir` from catalog i18n language  
- Accessibility: checkbox `aria-label`, lifecycle `role="list"`, search `aria-label`

## Consistency with Platform Ops Commercial Catalog

Picker and rails reuse Platform Ops tones (`healthy` / `warning` / `unknown`) — no bespoke color system.
