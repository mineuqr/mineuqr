# PRINT-UX-2A — Operational Goals

**Authority:** ADR-ARCH-016 v1.2

---

## Mission

Transform Print Workspace from an infrastructure dashboard into an **operational workspace**.

Within five seconds the operator knows:

1. **Can I print?** — `SystemReadyBanner` + `deriveOperationalPrintStatus`
2. **Why can't I print?** — operator subline (not infrastructure errors)
3. **What should I do next?** — single primary action per step

---

## Personas

Restaurant owner, cashier, manager, kitchen operator — not developers.

---

## Success Criteria

- One production printing UX path (distributed only)
- No legacy embedded-printing assumptions in operator workflow
- Diagnostics secondary and collapsed by default
