# ORDERING-OPERATIONAL-NOTES-PRESENTATION-1 — Implementation

## 1. Summary

Operational Platform now displays projected **Order Notes** and **Item Notes** from Operational DTOs only. Presentation mapper preserves `itemNotes` on line models. Kitchen/Expo cards, Orders detail, Print Workspace, and print text serialize notes with the approved hierarchy.

## 2. Files changed

| File | Change |
|------|--------|
| `client/src/lib/order-presentation/presentationalNote.ts` | **New** — blank → null (presentation only) |
| `client/src/lib/order-presentation/orderPresentationModel.ts` | `itemNotes` on line model |
| `client/src/lib/order-presentation/mapOrderPresentation.ts` | Map order + item notes |
| `client/src/lib/order-presentation/index.ts` | Export helper |
| `client/src/lib/kitchen/lineProjection.ts` | Client DTO mirrors `itemNotes` |
| `client/src/components/kitchen/KitchenExecutionCard.tsx` | Render item notes under lines |
| `client/src/components/operational-workspace/OperationalCard.tsx` | Detail line notes + order notes |
| `client/src/components/print-workspace/PrintWorkspacePanel.tsx` | List + detail notes |
| `server/printing/domain/PrintPayload.ts` | Additive `itemNotes?` on lines |
| `server/printing/infrastructure/payload/OrderReadPrintPayloadBuilder.ts` | Pass through projected notes |
| `server/print-connector/runtime/PrintPayloadTextSerializer.ts` | Item note under line; order notes once |
| Tests + docs | Coverage + architecture |

## 3. Rendering rules (shipped)

- Order notes once · Item notes under owner · No placeholders · No reconstructed notes

## 4. Validation

| Check | Result |
|-------|--------|
| Presentation + print note tests | **32/32 Pass** |
| `npm run build` | **Pass** |

## 5. Certification

**CERTIFIED** — ORDERING-OPERATIONAL-NOTES-PRESENTATION-1.

Operational Platform consumes projected Order Notes and Item Notes only. No Domain, Projection, or Ordering Platform changes.