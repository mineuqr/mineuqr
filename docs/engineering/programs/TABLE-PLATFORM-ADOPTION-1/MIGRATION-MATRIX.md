# Migration Matrix — TABLE-PLATFORM-ADOPTION-1

| # | Surface | Before | After | Responsive | Status |
| ---: | --- | --- | --- | --- | --- |
| 1 | CustomerSuccessAccountsSection | raw table + opsTable* | SemanticTable* ops | dual | SemanticBadge commercial |
| 2 | CustomerSuccessTenantsSection | raw table + opsTable* | SemanticTable* ops | dual | SemanticBadge commercial |
| 3 | SecurityAuditTimelineSection | raw table + severity span | SemanticTable* ops | dual | SemanticBadge audit |
| 4 | SecurityRoleChangesSection | raw table | SemanticTable* ops | dual | n/a |
| 5 | SecuritySubscriptionChangesSection | raw table | SemanticTable* ops | dual | n/a |
| 6 | SettlementHistoryPanel | raw ledger + inline states | SemanticTable ledger + states/pagination | scroll | SemanticBadge settlement |
| 7 | PaymentMethodAnalysisSection | raw ledger | SemanticTable ledger | scroll | n/a |
| 8 | RefundAnalyticsSection mix | raw ledger | SemanticTable ledger | scroll | n/a |
| 9 | PaymentHistory | raw + getStatusColor | SemanticTable comfortable | scroll | SemanticBadge invoice |
| 10 | StatisticsPanel | raw + ui Badge | SemanticTable comfortable | scroll | SemanticBadge commercial |
| 11 | CommercialVisibilityDiagnostics | raw + ui Badge | SemanticTable comfortable | scroll | SemanticBadge |
| 12 | GateTable (×3) | raw + Badge variants | SemanticTable comfortable | scroll | SemanticBadge gate |
| — | VirtualizedFleetTable | CSS-grid + virtualization | **excluded** | domain | SemanticBadge (prior) |
| — | WorkingHoursEditor | CSS-grid editor | **excluded** | domain | n/a |
| — | ui/table.tsx | orphan shadcn | facade → semantic-table | — | — |
