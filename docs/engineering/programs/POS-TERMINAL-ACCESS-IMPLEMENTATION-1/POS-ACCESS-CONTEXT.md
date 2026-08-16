# POS ACCESS CONTEXT

Server-derived only:

```
{
  userId
  restaurantId
  terminalId
  permissions[]   // from grant store
  restaurantScope // owner | admin | pos_grant
}
```

Returned only when access is granted. Denied decisions expose an internal `reasonCode` and the same public FORBIDDEN message at the router.

The next sales program must consume this context. This program does not create orders.
