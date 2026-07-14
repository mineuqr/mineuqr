# KIOSK-BROWSE-PRESENTATION-ADOPTION-1 — Architecture

**Type:** Presentation Adoption (Shared Browse UI)  
**Status:** Implemented  

---

## 1. Browse Presentation Forensics

### Pipeline

```
Menu Item (DB)
  → Ordering Runtime (getRuntimeBySlug / menu.products)
  → OrderingRuntimeContext (useOrderingRuntime → items)
  → OrderingBrowseProvider (filteredItems / offers / categories)
  → Shared browse components (MenuBrowseArea)
  → QR MenuTemplates  |  KioskBrowseStage
```

### Root cause

**Presentation adoption gap.** Runtime, Browse Provider, and catalog fields already carried `imageUrl`, `descriptionAr`, `calories`, `isAvailable`, and pricing. `KioskBrowseStage` previously rendered a thin name/price row and did not consume the shared item presentation used by QR.

Special Offers were already adopted in `KIOSK-PRESENTATION-ADOPTION-1`.

### Evidence (property matrix — summary)

| Property | Runtime | Browse Provider | Shared component | QR | Kiosk (before) | Gap |
|----------|:-------:|:---------------:|:----------------:|:--:|:--------------:|-----|
| imageUrl | Y | Y | MenuItemsGrid | Y | cart-only | Presentation |
| descriptionAr | Y | Y | MenuItemsGrid | Y | N | Presentation |
| calories | Y | Y | MenuItemsGrid (grid) | Y | N | Presentation |
| isAvailable | Y | Y | MenuItemsGrid | Y | N | Presentation |
| price | Y | Y | MenuItemsGrid | Y | Y | OK |
| offers | Y | Y | MenuOffersTabBar / OffersTabPanel | Y | Y | OK (prior) |
| search | — | Y | MenuSearchAndCategories | Y | N | Presentation |
| category isActive | Y | passthrough | MenuSearchAndCategories | Y | N | Presentation |
| dietary / badges | N | N | N | N | N | Data absent |

Full forensic detail retained in program implementation report §1.

---

## 2. Ownership

| Concern | Owner |
|---------|--------|
| Catalog data | Ordering Runtime |
| Browse filter / tabs | OrderingBrowseProvider |
| Item/offer presentation | Shared `client/src/components/menu/*` |
| QR skin / restaurant header | MenuTemplates |
| Kiosk chrome (cart / idle) | KioskBrowseStage / KioskShell |

No Runtime, Projection, DTO, Storage, or Business Identity ownership changes.

---

## 3. Shared component policy

```
MenuBrowseArea ──► QR MenuTemplates
MenuBrowseArea ──► KioskBrowseStage
```

Kiosk-only differences (documented):

- Sticky kiosk header + cart navigation
- `canAddToCart` (no table gate)
- `searchSticky={false}` (avoid double sticky chrome)
- No QR template skins / TemplateHeader (kiosk UX)
