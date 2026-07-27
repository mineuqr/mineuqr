# Interaction Specification

## Card states

| State | Behavior |
|-------|----------|
| Default | Soft shadow, category shell |
| Hover | Lift (`-translate-y`), slight scale up, stronger colored shadow glow |
| Active / press | Scale down; radial highlight at pointer (`--x` / `--y`) |
| Focus-visible | Cyan ring for keyboard |
| Disabled / non-interactive | `cursor-default` (presentational buttons without handlers) |

## Tab interaction

- Click / tap selects tab; only one panel mounted at a time  
- Month / Financial share month-year selectors  

## Feedback rules

- Motion supports recognition — never distracts  
- No toast on card hover  
- Export buttons retain distinct success/info borders  

## Accessibility

- Cards expose `aria-label` = `{label}: {value}`  
- Values use `dir="ltr"` for numerals in RTL layouts  
- Contrast maintained via light values on dark tinted shells  
