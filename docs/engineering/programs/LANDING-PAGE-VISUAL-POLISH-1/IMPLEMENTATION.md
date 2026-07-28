# IMPLEMENTATION — LANDING-PAGE-VISUAL-POLISH-1

**Date:** 2026-07-28

## Approach

CSS-first polish layered onto existing landing architecture. No new dependencies. No layout redesign.

## Changes

### `client/src/index.css`
- Deeper multi-radial page background + fixed subtle noise overlay
- Stronger glass nav, card surfaces (inset highlight, softer shadows)
- Category accent tokens (`qr`, `ordering`, `kitchen`, `payments`, `analytics`, `tables`, `mgmt`, `growth`, `lang`) — desaturated oklch
- Hero aurora + product stage glow/frame classes
- Button / trust-chip / secondary-row micro-interactions + focus rings
- Chart bar / sparkline / status soft animations; all disabled under reduced motion

### Components
- `HeroPreview.tsx` — stage frame, status chip, accent tiles, mini bar chart + sparkline (illustrative chrome only)
- `ProductJourney.tsx` — per-step accents + hover lift
- `Home.tsx` — hero aurora/stage spacing, primary feature accents, polished how-it-works + CTA glow

## Not changed
- Brand logo, primary teal identity, section order, routes, marketing strategy
- No fabricated testimonials or claimed live metrics
