# ADMIN-DASHBOARD-UX-REFINE-1A — RTL Alignment & Content Width

**Program:** Admin Dashboard Rebuild  
**Phase:** UX-REFINE-1A — Low-risk visual refinement  
**Date:** 2026-06-07  
**Status:** Complete  

**Prerequisites:** REBUILD-3A, UX-REFINE-1

---

## 1. Executive Summary

Live desktop review identified two remaining Operations UX issues: **RTL tab alignment** and **excessive content width**. This phase refines layout rhythm, action density, and Communications consistency without changing routes, architecture, auth, or commercial logic.

---

## 2. Issue A — Tabs RTL Alignment

### Problem

Tab bar (`الحسابات | المستأجرون | الاتصالات`) appeared anchored to the left of a wide content area. In Arabic this felt like secondary controls, not primary navigation aligned with the page title.

### Root cause

`TabsList` used `w-full max-w-md` inside a column flex container. Flex `align-items: stretch` expanded the tab bar to the full content width regardless of `max-w-md`, leaving tabs visually disconnected from the title edge.

### Fix

| Change | Detail |
|--------|--------|
| `opsTabList` token | `w-fit max-w-full self-start` — sizes to content, aligns to inline-start |
| Inline-start | Right in RTL, left in LTR — aligns with title in both locales |
| Tab spacing | `mb-2`, Tabs root `gap-1` |

**File:** `adminDashStyles.ts`, `AdminManagement.tsx`

---

## 3. Issue B — Excessive Content Width

### Problem

Operations content used `max-w-7xl` (~1280px), stretching tables and filters on desktop.

### Fix

| Element | Before | After |
|---------|--------|-------|
| Shell header + main | `max-w-7xl` | `narrowContent` → `max-w-5xl` (~1024px) |
| Layout | Full-bleed within sidebar | Centered `mx-auto` SaaS console width |

New token: `opsShellMax` = `mx-auto w-full max-w-5xl`  
New prop: `AdminOperationsShell.narrowContent`

**Files:** `adminDashStyles.ts`, `AdminOperationsShell.tsx`, `AdminManagement.tsx`

---

## 4. Issue C — Header Rhythm

Tighter vertical rhythm without removing hierarchy:

```text
Title
Tabs
Filters
Content
```

| Area | Adjustment |
|------|------------|
| Header band | `py-2 sm:py-3` (was `py-3 sm:py-4`) |
| Main padding | `py-3 sm:py-4`, `space-y-2` |
| Tabs → content | `mb-2`, `gap-1` |
| Toolbar frame | `opsWorkspace space-y-2`, toolbar `p-2 sm:p-2.5` |
| Filter row gap | `gap-1.5`; search area `sm:max-w-xl` |

---

## 5. Issue D — Actions Column Density

### Problem

`AdminActionGroup` rendered zone separators (`|`) and multi-row flex layout in table cells, wasting horizontal and vertical space.

### Fix

| Component | Change |
|-----------|--------|
| `AdminActionGroup` | `compact` prop — inline `gap-0.5`, no separators |
| `AdminIconButton` | `compact` prop — `h-7 w-7` icon buttons |
| Table cells | `opsTableActionsCell` — `w-[1%] whitespace-nowrap px-2` |
| Row padding | `opsTableCell` → `py-1.5` |

Applied to Accounts and Tenants table + mobile action rows.

**Files:** `AdminActionGroup.tsx`, `AdminIconButton.tsx`, `AdminManagement.tsx`, `adminDashStyles.ts`

---

## 6. Issue E — Communications Consistency

### Problem

Communications used nested bordered cards inside the content frame, feeling heavier than Accounts/Tenants.

### Fix

| Before | After |
|--------|-------|
| Nested `rounded-lg border` sections in `gap-3` grid | Flat `divide-y` / `lg:divide-x` panels inside shared frame |
| Separate card padding stacks | `p-2.5 sm:p-3` matching table tab density |
| Custom button heights | `adminDash.opBtn` + `opsSelect` tokens |
| Email placeholder | Dashed `border-t` footer strip (same card) |

**File:** `CommunicationsTab.tsx`

---

## 7. Constraints Preserved

- No new routes
- No REBUILD-3B
- No architecture / auth / commercial changes
- No branding or color palette changes

---

## 8. File Inventory

| File | Change |
|------|--------|
| `client/src/components/admin/layout/adminDashStyles.ts` | `opsShellMax`, `opsTabList`, `opsTableActionsCell`, `opIconBtn`, tighter spacing |
| `client/src/components/admin/layout/AdminOperationsShell.tsx` | `narrowContent` prop |
| `client/src/components/admin/operations/OperationsTabFrame.tsx` | Tighter toolbar gaps, filter max-width |
| `client/src/components/admin/operations/AdminActionGroup.tsx` | `compact` variant |
| `client/src/components/admin/operations/AdminIconButton.tsx` | `compact` variant |
| `client/src/pages/AdminManagement.tsx` | Narrow shell, RTL tabs, compact actions |
| `client/src/pages/admin/operations/CommunicationsTab.tsx` | Flat panel layout |
