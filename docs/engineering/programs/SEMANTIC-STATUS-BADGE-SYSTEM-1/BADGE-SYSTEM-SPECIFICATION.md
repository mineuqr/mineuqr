# Badge System Specification — SEMANTIC-STATUS-BADGE-SYSTEM-1

**Package:** `client/src/design-system/semantic-badge/`  
**Date:** 2026-07-28  
**Layer:** Presentation only

---

## Purpose

Establish the official MineuQR Semantic Status Badge System so every status badge shares:

- one implementation (`SemanticBadge`)
- one tone registry
- one visual language (soft / filled / outline)
- one mapping layer from domain status → tone

Status **meanings** remain owned by platform domains. This package never invents order/session/settlement constants.

---

## Ownership

| Concern | Owner |
| --- | --- |
| Color families (success/warning/…) | `SEMANTIC_TONE` (`semantic-card/tokens/semanticTone.ts`) |
| Badge tone keys + densities | `semantic-badge/tokens/badgeTone.ts` |
| Badge chrome (size/radius/focus) | `semantic-badge/tokens/badgeSurface.ts` |
| Domain → tone maps | `semantic-badge/mappers/statusToneMappers.ts` |
| Order status values | Order Platform (`ORDER_STATUSES`) |
| Session status values | Session Platform |
| Settlement statuses | Settlement Platform |
| Labels | Existing `*-presentation` / `orderStatusDisplay` modules |

---

## Densities

| Density | Use |
| --- | --- |
| `soft` | Default restaurant/ops chips (border + tint fill) |
| `filled` | Admin commercial / dense ops pills |
| `outline` | Inactive / quiet tags |

Soft surfaces for base tones are **identical** to `SEMANTIC_TONE.badge` (no fork).

---

## Badge tones

Base: `neutral | info | success | warning | danger | accent`  

Presentation lifecycle keys (resolve to base families):  
`pending | processing | completed | cancelled | refunded | archived | disabled | executive | operational`

---

## Components

Single implementation with named variants (not forks):

- `SemanticBadge` — primary API
- `StatusBadge` — soft default
- `OutlineBadge` — outline density
- `CompactBadge` — denser padding
- `DotBadge` — leading status dot
- `IconBadge` — leading icon
- `CountBadge` — numeric / percent chip
- `InteractiveBadge` — button semantics + focus ring

---

## Accessibility

- `data-slot="semantic-badge"` + `data-tone` / `data-density`
- Interactive: keyboard focus ring (`SEMANTIC_BADGE_FOCUS`)
- Disabled: `aria-disabled` + opacity
- RTL: text content inherits parent `dir`
- Screen readers: use label text / `aria-label` on DotBadge

---

## Prohibited

- Local Tailwind status color maps in feature components
- Redefining domain status string vocabularies
- Business logic / API / DTO / DB changes
