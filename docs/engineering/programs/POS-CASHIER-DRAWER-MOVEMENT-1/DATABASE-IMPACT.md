# DATABASE IMPACT

**DATABASE MUTATION TARGET: 0**

No migration. Latest journal remains `0093_pos_sale_idempotency`. No `0094_`.

Not created:

- `pos_cash_movements`
- `pos_drawer_movements`
- `pos_cash_ledger`
- `pos_cashiers`

Authoritative table remains `crmp_drawer_movements`, written only by CRMP.
