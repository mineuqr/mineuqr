# ENTITLEMENT ACCESS

Authority remains:

```
Live Plan → commercial_limit_values.posTerminals → checkLimit → Effective POS Entitlement
```

Access requires `entitlement.available` (included > 0 or unlimited).

Missing / zero `posTerminals` fail-closes access. No devices fallback. No hard-coded 1.

Provisioning (may this restaurant create another terminal?) stays on `assertProvisioningAllowed`.

Production Live Plans still have no `posTerminals` seed. Do not fail-open. Seed belongs to `POS-DOMAIN-PRODUCTION-APPLY-1` (or a later apply that includes grants).
