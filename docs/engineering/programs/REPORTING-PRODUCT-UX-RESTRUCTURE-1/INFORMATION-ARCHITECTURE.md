# Information Architecture

```
Reports (Restaurant Reports)
├── Today .................... operational awareness (6 cards)
├── This Month .............. same IA, month scope + month picker
└── Financial Analytics ..... analysis workspace
    ├── Period picker (month/year)
    ├── Sales flow strip (Total → Refund → Net)
    ├── Sales Trend
    ├── Payment Analysis
    ├── Sales Source Analysis
    ├── Refund Analysis
    ├── Tax Analysis
    └── Exports (Excel month/year)
```

## Object model (product, not platform)

| Object | Kind | Notes |
|--------|------|-------|
| Cash Sales / Card Sales | Dashboard Card (presentation) | Derived from payment buckets; not new `KpiId` |
| Refund / Tax / Orders / Net | KPI display | Existing dictionary ids / DTO fields |
| Payment Overview (export) | Widget | Remains on export Executive Summary; not on Today/Month |
| Sales Source rows | Shell | Values appear when channel facts publish |

## Progressive disclosure

Operational tabs never embed Financial Analytics depth.  
Financial Analytics never duplicates the six-card operational grid as its primary story.
