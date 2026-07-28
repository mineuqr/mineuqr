# MIGRATION-MATRIX — SEMANTIC-CARD-PLATFORM-ADOPTION-1

| Module | Before | After |
| --- | --- | --- |
| Restaurant reporting KPI strips | RestaurantKpiCard | SemanticKpiCard |
| Admin KPI strips | AdminStatCard | SemanticKpiCard |
| Commercial executive KPIs | AdminStatCard | SemanticKpiCard |
| Commercial needs attention | local AttentionCard | SemanticKpiCard |
| Settlement trend insights | custom panel | SemanticKpiCard |
| Executive Today/Month | SemanticExecutive via adapter | SemanticExecutive* |
| Session workspace KPIs | RestaurantKpiCard | SemanticKpiCard |
| DiningSessionSummaryCard | ui/Badge + dl | SemanticBadge + SemanticKpiCard |
| OperationalCard late chip | local span | SemanticBadge |
| CurrentPrinterCard | STATE_TONE text | SemanticBadge |
| ConnectorSessionCard | local status span | SemanticBadge |
| Kitchen / Fleet / Board tickets | domain cards | OBSERVE (follow-up) |
