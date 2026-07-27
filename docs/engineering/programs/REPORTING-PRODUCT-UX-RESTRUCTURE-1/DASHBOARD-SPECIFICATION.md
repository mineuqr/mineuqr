# Dashboard Specification

## Shared operational dashboard (Today + Month)

### Layout

```
[ Title ]
[ Primary question ]
[ Adaptive 1 / 2 / 3 column grid ]
  Cash | Card | Refund
  Tax  | Orders | Net (spans 2 on large)
```

### Rules

- Exactly **six** cards  
- No charts  
- No secondary KPI strip  
- No averages / rates  
- Large type, generous spacing, modern radius  

### Period controls

| Tab | Control |
|-----|---------|
| Today | Implicit Business Day bounds (`businessDayTodayReportingBounds`) |
| Month | Gregorian month + year selects |
| Financial | Same month/year selects as analysis period |

### Responsive

| Breakpoint | Grid |
|------------|------|
| Mobile | 1 column |
| Tablet (`sm`) | 2 columns |
| Desktop (`lg`) | 3 columns; Net spans 2 |

### Touch

Minimum comfortable tap area via padded `rounded-2xl` cards (≥ ~44px height).
