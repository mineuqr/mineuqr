# ADMIN-DASHBOARD-UX-REFINE-1 — Operations Layout Density & Consistency

**Program:** Admin Dashboard Rebuild  
**Phase:** UX-REFINE-1 — Focused UX/UI refinement (no architecture change)  
**Date:** 2026-06-07  
**Status:** Complete  

**Prerequisites:** REBUILD-3A

---

## 1. Executive Summary

Operations workspace (`/admin/operations`) was refined for **density**, **visual hierarchy**, and **cross-tab consistency** before REBUILD-3B route extraction. No routes, authorization, or commercial logic were changed.

Target rhythm aligned with the existing **Pricing** page: compact cards, smaller typography scale, tighter section spacing — without changing colors, theme, or branding.

---

## 2. Confirmed Issues Addressed

| Issue | Resolution |
|-------|------------|
| Excessive vertical whitespace | Compact shell, removed duplicate section headers/descriptions |
| Oversized tenant cards | Replaced card grid with table + compact mobile rows |
| Accounts / Tenants / Communications inconsistency | Shared `OperationsTabFrame` pattern across all three tabs |
| Header bloat | Shell: **Title → Tabs → Content** (subtitle removed) |
| RTL polish | Logical properties (`me`/`pe`/`end`/`start`), `text-start`, `dir="ltr"` on emails/dates |
| Pricing page alignment | `ops*` density tokens, `rounded-xl` cards, `text-xs`/`text-sm` scale |

---

## 3. UX-1A — Header Compression

| Element | Before | After |
|---------|--------|-------|
| Shell subtitle | `workspaceSubtitle` under title | Removed |
| Shell padding | `py-6` header, `space-y-8` main | `compact` → `py-3 sm:py-4`, `space-y-3 py-4` |
| Page title | `pageTitle` (2xl/3xl) | `pageTitleCompact` (xl/2xl) |
| Tabs margin | `mb-6` | `mb-3`, `h-9` tab list |
| Per-tab section headers | `AdminSection` title + description + icon | Removed — tab labels suffice |

**Files:** `AdminOperationsShell.tsx`, `AdminManagement.tsx`, `adminDashStyles.ts`

---

## 4. UX-1B — Accounts Density

| Element | Change |
|---------|--------|
| Layout | `OperationsTabFrame` (toolbar card + list card) replaces double-card + `AdminSection` |
| Filters | `opsInput` / `opsSelect` (`h-8`, `text-sm`) |
| Table | `opsTableHead` / `opsTableCell` (`px-3 py-2`) |
| Mobile rows | `opsListRow` with compact badge stack |
| Toolbar gap | `ResponsiveOperationsBar` `gap-2` |

**Files:** `AdminManagement.tsx` (`AccountsTab`), `OperationsTabFrame.tsx`, `adminDashStyles.ts`

---

## 5. UX-1C — Tenants Density

| Element | Before | After |
|---------|--------|-------|
| Card per restaurant | Full `Card` with `dl`, inherited entitlements box, `p-4 sm:p-6` | Desktop **table** (5 columns) |
| Mobile | Same large cards | `opsListRow` compact articles |
| Section wrapper | `AdminSection` + `AdminOperationsSection` | `OperationsTabFrame` |
| Add restaurant | Section-level action | Toolbar `toolbarActions` |
| Metadata | Address, phone, currency inline | Name, owner, subscription, plan, actions (operator-focused) |

**Files:** `AdminManagement.tsx` (`TenantsTab`)

---

## 6. UX-1D — Shared Patterns

New shared component:

```text
client/src/components/admin/operations/OperationsTabFrame.tsx
```

| Pattern | Usage |
|---------|-------|
| `opsWorkspace` (`space-y-3`) | Vertical rhythm between toolbar and content |
| `operationsCard` + `opsToolbar` | Filter/search bar container |
| Optional `listLabel` | Slim count/header strip inside content card |
| `toolbarActions` | Primary tab actions (e.g. Add restaurant) |

All three tabs now follow:

```text
[ Toolbar card: filters / context ]
[ Content card: listLabel? + table or form grid ]
```

**Files:** `OperationsTabFrame.tsx`, `CommunicationsTab.tsx`, `AdminManagement.tsx`, `adminDashStyles.ts`

---

## 7. UX-1E — RTL Polish

| Area | Treatment |
|------|-----------|
| Table headers | `text-start` (not `text-left`) |
| Search icons | `end-2.5` / clear button `start-2.5` |
| Icon margins | `me-*` logical spacing on buttons |
| Email / dates / counts | `dir="ltr"` where content is Latin/numeric |
| Filter flow | `ResponsiveOperationsBar` stacks on mobile, row on `sm+` (natural in RTL) |
| Character counter | `text-end` for length display |

No mirror-only hacks; layout uses Tailwind logical utilities throughout new code.

---

## 8. Supporting Token Additions

`adminDashStyles.ts` — UX-REFINE-1 density tokens:

| Token | Purpose |
|-------|---------|
| `pageTitleCompact` / `pageSubtitleCompact` | Shell header |
| `opsWorkspace` | Tab vertical spacing |
| `opsToolbar` | Toolbar card padding |
| `opsTableHead` / `opsTableCell` | Table density |
| `opsListRow` | Mobile list rows |
| `opsInput` / `opsSelect` | Filter control height |

`AdminEmptyState` — reduced padding and icon size for denser empty states.

---

## 9. Out of Scope (Preserved)

- No new routes
- No REBUILD-3B file extraction
- No authorization / `accountClassification` / `OWNER_OPEN_ID` changes
- No commercial logic changes
- No color / theme / branding changes

---

## 10. File Inventory

| File | Change |
|------|--------|
| `client/src/components/admin/operations/OperationsTabFrame.tsx` | **New** — shared tab layout |
| `client/src/components/admin/layout/adminDashStyles.ts` | Density tokens |
| `client/src/components/admin/layout/AdminOperationsShell.tsx` | `compact` prop |
| `client/src/components/admin/operations/ResponsiveOperationsBar.tsx` | Tighter gap |
| `client/src/components/admin/operations/AdminEmptyState.tsx` | Smaller empty state |
| `client/src/components/admin/operations/index.ts` | Export `OperationsTabFrame` |
| `client/src/pages/AdminManagement.tsx` | Accounts + Tenants + shell refactor |
| `client/src/pages/admin/operations/CommunicationsTab.tsx` | `OperationsTabFrame` + compact forms |
