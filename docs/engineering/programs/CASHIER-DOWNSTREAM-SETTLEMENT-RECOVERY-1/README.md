# CASHIER-DOWNSTREAM-SETTLEMENT-RECOVERY-1

**SUPERSEDED — Phase 2 Cashier Critical Path Simplification**

> هذا البرنامج محفوظ كسجل تاريخي فقط. القرار المعتمد لاحقاً يعرّف نجاح Cashier بأنه إنشاء أو إعادة تشغيل Production Collection Fact، ثم HTTP success. أزيلت منه منظومة Cashier-specific recovery وworker وendpoint وCron؛ أما ST/OS/SR فتبقى معالجة تشغيلية خلفية لا تعيد تعريف PAID. راجع [SUPERSEDED.md](./SUPERSEDED.md).

Durable recovery for Cashier ST / OS / SR after Collection Fact commit and HTTP success. No 0098. No new financial authority.

## Financial vs operational

| Kind | What it is |
|---|---|
| **FINANCIAL FACT** | Production Collection Fact (`created` / `replayed`) |
| **DOWNSTREAM RECOVERY OBLIGATION** | Existing production cashier Collection Fact + incomplete Check ST/OS/SR |

HTTP still returns after Collection Fact. Recovery is after HTTP.

## Documents

- [ARCHITECTURE-DECISION-REPORT.md](./ARCHITECTURE-DECISION-REPORT.md)
- [IMPLEMENTATION-REPORT.md](./IMPLEMENTATION-REPORT.md)
- [RECOVERY-STATE-MACHINE.md](./RECOVERY-STATE-MACHINE.md)
- [CRASH-WINDOW-ANALYSIS.md](./CRASH-WINDOW-ANALYSIS.md)
- [DOWNSTREAM-IDEMPOTENCY.md](./DOWNSTREAM-IDEMPOTENCY.md)
- [RECOVERY-EXECUTION-MODEL.md](./RECOVERY-EXECUTION-MODEL.md)
- [DEPENDENCY-RECONCILIATION.md](./DEPENDENCY-RECONCILIATION.md)
- [VALIDATION-REPORT.md](./VALIDATION-REPORT.md)
- [RECONCILIATION-REPORT.md](./RECONCILIATION-REPORT.md)
