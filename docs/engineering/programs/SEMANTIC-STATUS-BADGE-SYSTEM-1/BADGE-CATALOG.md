# Badge Catalog — SEMANTIC-STATUS-BADGE-SYSTEM-1

```ts
import {
  SemanticBadge,
  StatusBadge,
  OutlineBadge,
  CompactBadge,
  DotBadge,
  IconBadge,
  CountBadge,
  InteractiveBadge,
  mapOrderStatusToBadgeTone,
} from "@/design-system/semantic-badge";
```

## Components

| Component | Defaults | Example |
| --- | --- | --- |
| `SemanticBadge` | soft / sm | `<SemanticBadge tone="success">Active</SemanticBadge>` |
| `StatusBadge` | soft | Alias of SemanticBadge soft |
| `OutlineBadge` | outline | Inactive commercial |
| `CompactBadge` | compact chrome | Ops tables |
| `DotBadge` | showDot | Register duty |
| `IconBadge` | icon required | Icon + label |
| `CountBadge` | filled + count | `-15%` |
| `InteractiveBadge` | interactive | Clickable chip |

## Props (`SemanticBadge`)

`tone`, `density`, `size`, `showDot`, `icon`, `count`, `compact`, `interactive`, `disabled`, `asChild`, `className`, children

## Domain adapters (consume, don't redefine)

| Mapper | Domain source |
| --- | --- |
| `mapOrderStatusToBadgeTone` | Order Platform statuses |
| `mapTableSessionStatusToBadgeTone` | Session / table board |
| `mapHealthToneToBadgeTone` | Print workspace `healthTone()` |
| `mapSecurityHealthToBadgeTone` | Security health |
| `mapFleetStatusToBadgeTone` | Fleet operator kind |
| `mapRegisterDutyToBadgeTone` | Register duty presentation tone |
| `mapRegisterAvailabilityToBadgeTone` | Catalog availability tone |
| `mapRegisterShiftToBadgeTone` | Shift presence tone |
| `mapCommercialStatusToBadgeTone` | Commercial presentation state |
| `mapOfferTypeToBadgeTone` | Offer type tags |

## Feature wrappers (thin only)

- `CommercialStatusBadge`
- `HealthStatusBadge`
- `DutyBadge` / `AvailabilityBadge` / `ShiftBadge`
- `FleetOperatorStatusPill`
