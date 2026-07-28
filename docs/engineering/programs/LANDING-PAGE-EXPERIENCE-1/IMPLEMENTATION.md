# IMPLEMENTATION — LANDING-PAGE-EXPERIENCE-1

**Date:** 2026-07-28

## Files touched

| File | Change |
|------|--------|
| `client/src/pages/Home.tsx` | Landing experience restructure |
| `client/src/components/landing/HeroPreview.tsx` | Richer OS preview (channels, kitchen, payments) |
| `client/src/components/landing/ProductJourney.tsx` | New storytelling section |
| `client/src/components/landing/usePrefersReducedMotion.ts` | Motion preference hook |
| `client/src/components/landing/LandingNavbar.tsx` | Journey + Capabilities anchors |
| `client/src/index.css` | Lightweight pulse/tile/glow + reduced-motion kill switch |
| `client/src/locales/en.json` / `ar.json` | Journey, how-it-works, hero support, feature ops keys |

## Experience structure (new)

1. **Hero** — Badge, headline, subtitle, Start Free + Explore Platform (scroll to journey), support line; product preview. Stats removed from first composition.
2. **Trust strip** — Factual capability labels + links to Trust / Security / Pricing trial.
3. **Product journey** — Menu → Ordering → Kitchen → Payments → Analytics → Management → Growth.
4. **Capabilities** — Six primary pillars + six secondary compact rows (hierarchy, not wall of equal cards).
5. **How it works** — Four OS-aligned steps.
6. **CTA** — Start Free + View Plans.
7. **Footer** — unchanged shared marketing footer.

## Motion / performance

- Reused existing `framer-motion` (already in app).
- CSS animations are tiny (pulse/opacity/translate); disabled under `prefers-reduced-motion`.
- No new image assets, no new npm dependencies.
- Scroll animations `once: true` with short durations.

## Conversion levers

- Primary CTA remains free trial / register.
- Secondary CTA teaches the product before pricing.
- Mid-page journey + clearer feature hierarchy reduce bounce from “unclear what this is”.
- Trust strip surfaces Trust Center without inventing customers.
