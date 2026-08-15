# CURRENT SNAPSHOT RULE

**Canonical method (exactly one):**

```
WHERE subscriptionId = S
ORDER BY effectiveFrom DESC, version DESC
LIMIT 1
```

As-of T (not implemented for historical reporting in this program): `effectiveFrom <= T`, same order.

MRR and new Admin invoices use this current row. Do not sum versions. Do not use createdAt alone. Do not use Live Plan current price.

Fallback: if the snapshot table has no row for S, Binding leftover charged columns may be read (pre-0089 / unbound). Once a snapshot exists, it wins.
