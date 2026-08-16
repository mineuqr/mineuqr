# FINANCIAL OWNERSHIP

Authority remains:

| Concern | Owner |
|---------|--------|
| Financial settlement state | Check / Financial Settlement Platform |
| Settlement lifecycle | Check |
| Monetary totals | Check (`grandTotal` and related snapshots) |
| Tender / payment facts | Check (default paid line when POS omits tenders) |
| Settlement completion | `settleCheckPaidByIdDetailed` |
| Complimentary / voided / refunded | Existing Check commands (out of this program) |
| Financial reporting | Existing reporting consumers of Check / Settlement Record |

POS never trusts client `totalAmount`, tax, discount, tender amount, payment method, currency, or settlement state.

No POS Payment, Tender, Revenue, or Settlement table.

No Reporting write from POS.
