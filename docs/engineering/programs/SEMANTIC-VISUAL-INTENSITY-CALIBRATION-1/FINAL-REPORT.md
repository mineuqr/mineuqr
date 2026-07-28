# FINAL REPORT — SEMANTIC-VISUAL-INTENSITY-CALIBRATION-1

**Date:** 2026-07-28  
**Type:** Visual Intensity Calibration (Presentation Only)  
**Status:** READY FOR ARCHITECTURE AUTHORITY REVIEW  
**Do not commit / push / deploy**

---

## Verdict

Semantic visual intensity is calibrated **~+30%** via light alpha, rim, and glow diffusion—not saturation. Operational cards inherit clearer domain identity; Landing and Application share the same richer lighting language.

---

## 1. Calibrated visual intensity

- Ambient radial / edge rim / hover bloom / icon glow / executive glow raised  
- Panel border clarity `/40`  
- Hover brightness `1.05`  
- Domain accent borders `/52–/58`  

---

## 2. Adopted pages / surfaces

Dashboard · Sessions · Orders · Kitchen · Payments · Revenue · Analytics · Fleet · Register · Commercial · Admin · Security · Statistics · Print · Landing (CSS parity) · Executive KPIs

---

## 3. Remaining neutral cards

| Allowed neutral | Reason |
| --- | --- |
| Auth / Profile / form Cards | Structural shells (not business domain metrics) |
| Dialogs / AlertDialogs | Modal chrome |
| Unavailable “—” renewal meta | Soft `information` domain only |

---

## 4. Lighting improvements

Cards read as illuminated from within: stronger top wash, clearer inset rim, domain-tinted ambient on `data-domain` / `data-category`, Landing hover matched to app.

---

## 5. Performance

No animation libraries · no `transition-all` · transform/opacity/filter/box-shadow only · negligible CSS delta.

---

## 6. Accessibility

`prefers-reduced-motion` unchanged · WCAG text contrast unchanged · color reinforces labels/values, not sole cue.

---

## Artifacts

- [AUDIT.md](./AUDIT.md)  
- [IMPLEMENTATION.md](./IMPLEMENTATION.md)  
- Guards: `.../__tests__/semanticVisualIntensityCalibration.architecture.guards.test.ts`  

**Awaiting Architecture Authority approval.**
