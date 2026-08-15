# ADMIN-INVOICE-CLEANUP

`admin.generateInvoicePDF` no longer uses catalog or `subscription_plans` prices.

| Concern | Owner |
|---------|-------|
| Invoice amount | Charged Terms `chargedAmount` |
| Plan label on PDF | Live Plan display name |
| Missing Charged Terms | Fail closed `NOT_FOUND` |

Does not reconstruct historical amounts from current Live Plan price (I-RESIDUAL-07).
