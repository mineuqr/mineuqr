# OWNER-IDENTITY.md

Canonical check: `isPlatformOwner(user)` in `server/platform-owner-access/identity.ts`.

```
authenticated user.openId
  → ENV.ownerOpenId configured and valid (platformProtectionHealth)
  → isPlatformAccountUser(user)
  → true / false
```

Fail closed when `OWNER_OPEN_ID` is missing, empty, or longer than 64 characters.

Never used:

- `userId === 1`
- `role === "admin"`
- restaurant ownership
- frontend flags, localStorage, or cookies

Frontend visibility is not authorization. Every mutation calls `assertPlatformOwner`.
