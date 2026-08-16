# MENU DESIGN GATING

**Key:** `menuDesign`

Gated: `restaurant.updateTemplate`, `updateCustomColors`, `updateCustomFonts`, `uploadImage`, `deleteImage`.

Removed: `isSubscriptionActive` + `ctx.user.role === "admin"` grant.

Public menu continues to render stored template/colors/fonts. No design wipe.
