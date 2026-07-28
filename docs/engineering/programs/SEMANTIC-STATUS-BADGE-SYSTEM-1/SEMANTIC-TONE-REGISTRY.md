# Semantic Tone Registry — SEMANTIC-STATUS-BADGE-SYSTEM-1

**Color family owner:** `SEMANTIC_TONE` (semantic-card)  
**Badge tone registry owner:** `semantic-badge/tokens/badgeTone.ts`

---

## Base tones → soft classes (SSOT)

| Tone | Soft surface |
| --- | --- |
| success | `SEMANTIC_TONE.badge.success` |
| warning | `SEMANTIC_TONE.badge.warning` |
| danger | `SEMANTIC_TONE.badge.danger` |
| info | `SEMANTIC_TONE.badge.info` |
| neutral | `SEMANTIC_TONE.badge.neutral` |
| accent | `SEMANTIC_TONE.badge.accent` |

## Lifecycle presentation tones → base

| Badge tone | Resolves to |
| --- | --- |
| pending | warning |
| processing / operational | info |
| completed | success |
| cancelled / refunded | danger |
| archived / disabled | neutral |
| executive | accent |

## Densities

Each base tone owns soft / filled / outline / dot surfaces in `badgeTone.ts`.

Filled examples: `bg-green-600/90 text-white` (success), `bg-cyan-500 text-slate-900` (info), …

Hover/focus owned by `semanticBadgeHoverClass` + `SEMANTIC_BADGE_FOCUS`.
