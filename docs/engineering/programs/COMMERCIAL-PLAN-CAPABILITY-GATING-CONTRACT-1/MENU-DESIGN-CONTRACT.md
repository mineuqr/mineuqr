# MENU DESIGN CONTRACT

**Canonical key:** `menuDesign`  
**HIGH-RISK.** Non-destructive.

## What it controls

Appearance **management**: template, custom colors, custom fonts, branding images used as design writes.

## Classification

| Operation | Procedure | Class |
|-----------|-----------|--------|
| Change template | `restaurant.updateTemplate` | **GATED** |
| Change custom colors | `restaurant.updateCustomColors` | **GATED** |
| Change custom fonts | `restaurant.updateCustomFonts` | **GATED** |
| Logo / cover upload or delete | `restaurant.uploadImage`, `restaurant.deleteImage` | **GATED** |
| In-app design editor / preview of **unsaved** changes | client editor | **UI hide**; cannot persist without gated writes |
| Public menu render with **already stored** template/colors/fonts | public menu | **NOT GATED** |
| Read current stored design for public or frozen display | public GET | **NOT GATED** |

## Required answers (locked)

| # | Question | Answer |
|---|----------|--------|
| A | Can the customer edit design when OFF? | **No.** |
| B | Can the customer preview **new** design when OFF? | **No** as a management action. Showing the **currently stored** public look is render, not preview-of-edit. |
| C | Can the public menu keep rendering the existing design? | **Yes.** |
| D | Does disablement preserve the existing design? | **Yes.** No wipe, no revert to a default theme as a gate. |
| E | Is public rendering dependent on this capability? | **No.** |

## Existing grant to replace

`updateTemplate` / colors currently use `isSubscriptionActive` + `ctx.user.role === "admin"` as a **grant**. That is not commercial entitlement.

Implementation **must** replace that grant with `requireFeature(ownerId, "menuDesign")`.  
Admin / owner **role** must not grant Menu Design. PLATFORM_OWNER remains via the entitlement hub only.

## Disablement

Entitlement OFF. Stored template/colors/fonts/images remain. Public guests see last saved design. FROZEN may still suspend the public menu independently.
