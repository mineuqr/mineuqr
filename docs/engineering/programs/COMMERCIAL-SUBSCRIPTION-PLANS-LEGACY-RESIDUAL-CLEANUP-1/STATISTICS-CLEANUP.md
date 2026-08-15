# STATISTICS-CLEANUP

| API | Status | After |
|-----|--------|-------|
| `admin.getStatistics` | Deprecated, no client callers | Counts from `user_subscriptions`; `totalRevenue` = **canonical MRR** |
| `computeAdminMrr` / `monthlyEquivalentPlanPrice` | Second MRR | **Deleted** |
| `admin.getRevenueByMonth` | Soft-sunset, no client callers | Month labels, `revenue: 0` — not Check Revenue, not MRR |

No second MRR source remains.
