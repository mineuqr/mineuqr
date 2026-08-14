# UX-DESIGN.md

## Visibility

Only the Platform Owner sees this control. Not customers, not other admins, not the Plan Editor.

Persistent **banner / status chip** (RTL-safe, existing Platform Ops language):

- `Owner Access: Full Platform` / `وصول المالك: المنصة كاملة`
- `Owner Access: Simulating Professional` / `وصول المالك: محاكاة الاحترافية`

Simulation must be visually obvious (warning tone, not the same as a customer “current plan” badge).

## Control surface (owner-only)

```
Access Mode
  ○ Full Platform
  ○ Simulate a Plan

Plan (if simulate)
  [ Basic | Professional | Enterprise | … live plans ]

[ Return to Full Platform ]
```

Plan names from Presentation (AR + EN), identity = catalog code. No bundle IDs.

Not the Commercial Plan Editor. Editor still composes Live Plans; this surface only **selects which current plan to consume**.

## Routing

Do not send the owner to `/subscription` to “renew” for platform access. Subscription page may still show historical `600001` as inert history; it is not the access control.

## Pricing

If the owner opens Public Pricing while simulating, show a simulation note. Do not highlight a “current paid plan” from `600001`.
