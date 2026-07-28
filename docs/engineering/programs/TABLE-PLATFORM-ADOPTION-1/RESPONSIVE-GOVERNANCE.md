# Responsive Governance — TABLE-PLATFORM-ADOPTION-1

## Owner

`client/src/design-system/semantic-table` — sole owner of table responsive strategies.

## Strategies

### dual
- Desktop (≥ `lg`): `SemanticTableDesktop` → HTML table
- Mobile (&lt; `lg`): `SemanticTableMobile` → feature-supplied list/cards
- Tokens: `SEMANTIC_TABLE.desktop`, `SEMANTIC_TABLE.mobile`

### scroll
- All breakpoints: `SemanticTableScroll` horizontal overflow frame
- Ledger min-widths via density classes (`ledgerTable` / `ledgerTableNarrow` / comfortable)

## Rules
1. Features must not introduce new table responsive patterns (custom `hidden lg:block` forks, alternate stack tables, etc.).
2. Mobile list **content** remains feature-owned; only the gate is platform-owned.
3. Density (`ops` | `ledger` | `comfortable`) selects typography/spacing, not responsive strategy.
