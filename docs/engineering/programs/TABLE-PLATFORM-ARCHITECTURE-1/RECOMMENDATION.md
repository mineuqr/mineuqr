# Recommendation — TABLE-PLATFORM-ARCHITECTURE-1

## Decision

**B) MineuQR requires a canonical Table Platform.**

Authorize follow-on program:

# TABLE-PLATFORM-ADOPTION-1

---

## Not chosen: A) Already architecturally sound

Rejected because:

- No shared table component layer
- Unused `ui/table` proves incomplete adoption, not soundness
- Measurable fork clusters (5 + 3 + 4)
- Status/responsive/empty-state inconsistency documented with file paths

---

## Recommended adoption shape

1. **Create** `client/src/design-system/semantic-table/` (presentation only).
2. **Adopt** Admin opsTable family first (highest duplication).
3. **Adopt** Settlement + reporting ledgers second.
4. **Adopt** PaymentHistory / Statistics third.
5. **Leave** Fleet virtualization + WorkingHours as domain (optional chrome later).
6. **Enforce** SemanticBadge in all status cells.
7. **Retire or wrap** orphan `ui/table` under SemanticTable (single entry).

## Program constraints for adoption

- Presentation only
- No API/DB/query/ownership changes
- No commit until Architecture Authority approval of adoption program
- Phased; feature adapters preserve existing data wiring

---

## Investigation gate

This program made **no code changes**.  
Await Architecture Authority approval to start **TABLE-PLATFORM-ADOPTION-1**.
