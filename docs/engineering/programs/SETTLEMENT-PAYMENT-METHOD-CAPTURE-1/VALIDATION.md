# SETTLEMENT-PAYMENT-METHOD-CAPTURE-1 — Validation

| Requirement | Result |
|-------------|--------|
| Operator selects payment method | **Pass** — MarkPaidSettlementDialog |
| API receives settlements[] | **Pass** — session.markPaid |
| Domain persists selected method | **Pass** — resolveStaffSettlementLines |
| Legacy omit → other | **Pass** — defaultPaidSettlementLine |
| Reporting unchanged | **Pass** — architecture guard |
| Catalog / labels SSOT | **Pass** |
| Multi-tender API ready | **Pass** |
| Unit + architecture tests | **Pass** (27) |
| `pnpm build` | **Pass** |
