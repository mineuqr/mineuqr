# REPORTING-SALES-CHANNEL-ANALYTICS-1 — Architecture Compliance Report

| Rule | Compliance |
|------|------------|
| Capability lives in Reporting Platform | Yes |
| Presentation is passive | Yes — DTO bind only |
| No Revenue / Settlement / Refund / Tax law changes | Yes |
| No Business Calendar / Identity / Ownership changes | Yes (channel stamp is separate provenance column) |
| Canonical ordering identity for channels | Yes — OrderingChannelId + documented legacy fallback |
| No UI aggregation | Yes |
| No duplicate revenue / payment analytics | Yes — Order Sales plane only |
| Future channels without UI redesign | Yes — pass-through + catalog registration |
| Backward compatible reporting API | Yes — additive procedure |
| Documentation package complete | Yes |

## Observations (non-blocking)

1. **Metric plane:** Channel analytics uses served Order Sales, not Check Revenue — dual-metric awareness required for operators.
2. **Table Sessions:** No dedicated `OrderingChannelId` for table-session today; card is fed by legacy TABLE-scope fallback and future registration. Live QR stamps to `qr`.
3. **Language:** API builder defaults channelName to EN; presentation re-labels via shared `reportingSalesChannelLabel`.
4. **Migration:** `0083_order_ordering_channel.sql` must be applied before stamps persist in production DB.

## Final verdict recommendation

**B. Certified with observations**
