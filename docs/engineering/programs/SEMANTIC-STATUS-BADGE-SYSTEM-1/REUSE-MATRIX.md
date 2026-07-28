# Reuse Matrix — SEMANTIC-STATUS-BADGE-SYSTEM-1

| Asset | Decision |
| --- | --- |
| `SEMANTIC_TONE.badge` | **REUSE** as soft density SSOT |
| `ui/badge.tsx` | **KEEP** for non-status shadcn chrome; status UX → SemanticBadge |
| `CommercialStatusBadge` | **MIGRATE** → SemanticBadge wrapper; delete STATUS_STYLES |
| `HealthStatusBadge` | **MIGRATE** → SemanticBadge |
| `RegisterStatusBadges` | **MIGRATE** → DotBadge/SemanticBadge |
| `FleetOperatorStatusPill` | **MIGRATE** → SemanticBadge |
| `operatorFleetStatusPillClass` | **FACADE** → `semanticBadgeToneClass` |
| `securityStatusBadgeClass` | **FACADE** → mapper + tone class |
| `adminSemantic.status*` | **FACADE** → filled badge tones |
| Order `statusColors` (Dashboard + DiningSessionOrdersList) | **REMOVE** → mapper |
| Board `TABLE_STATUS_STYLES` / `STATUS_STYLES` | **REMOVE** → mapper + row tone |
| DiningSessionBanner STATUS_STYLES | **REMOVE** → filled tone |
| Offer type color maps (duplicated) | **REMOVE** → mapper |
| Landing status pills | **ALIGN** → `semanticBadgeToneClass` |
| Kitchen / PrintJob local presentation | **DEFER** observation — next pass |
| PaymentHistory getStatusColor | **DEFER** observation |
| SlaIndicator late pill | **DEFER** observation |
