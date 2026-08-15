# OWNER-EXCEPTION.md

Platform Owner is not a customer subscription account.

```
PLATFORM_OWNER
  ├── FULL_PLATFORM
  └── SIMULATED_PLAN
```

`resolveOwnerEntitlements` evaluates `isPlatformOwner` **before** customer subscriptions. Owner results are stamped `ACTIVE` / `platform_owner_exempt`.

## Do not

- Freeze the Owner because of subscription **600001**, trial expiry, or a customer period end
- Modify, renew, bind, or delete 600001
- Bind the Owner to a Live Plan for Frozen
- Make SIMULATED_PLAN depend on `user_subscriptions` or customer Frozen

Owner Access Mode is unchanged.
