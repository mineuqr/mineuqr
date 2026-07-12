# SCREEN-MANAGEMENT-UX-1E

**Classification:** UX Implementation — Phase 1E (final UX phase)  
**Status:** Complete  
**Architecture baseline:** SCREEN-MANAGEMENT-UX-ARCHITECTURE-1 Revision B

## Summary

Phase 1E unifies fleet table and card actions through a shared `FleetScreenActions` component. Table rows now expose the same operator actions as cards with consistent Revision B labels. Presentation only.

## Files

| File | Change |
|------|--------|
| `FleetScreenActions.tsx` | **New** — shared Open screen / Settings / Manage actions |
| `fleetScreenActionsPresentation.ts` | **New** — certified action labels |
| `FleetScreenTableRow.tsx` | Shared actions, status pill, attention indicator |
| `FleetScreenCard.tsx` | Uses shared `FleetScreenActions` |
| `ScreenManagementWorkspacePanel.tsx` | Wider table min-width for action column |
| Architecture / unit tests | UX-1E guards + label tests |

## Validation

`pnpm build` · relevant vitest suites

## Roadmap

Upon certification, **SCREEN-MANAGEMENT-UX** (Revision B) is functionally complete. Next official program: **KITCHEN-ITEM-FILTERING-1**.
