# Lifecycle Model — Deliverable 4

**Program:** TENANT-IDENTITY-PLATFORM-ARCHITECTURE-1  
**Status:** Architecture only  
**Date:** 2026-07-29

---

## 1. Canonical lifecycle states

Applies to Organization, Tenant, Restaurant, Branch (and Membership with analogous subset).

```
Created
  → Provisioned
    → Active
      ⇄ Suspended
      → Archived
        → Deleted (logical)
```

| State | Meaning |
|-------|---------|
| **Created** | Identity minted (canonical ID issued); not yet ready for ops |
| **Provisioned** | Required identity links/config present; not yet serving production traffic |
| **Active** | Normal operational state |
| **Suspended** | Temporarily barred from normal ops; identity retained |
| **Archived** | Soft end-of-life; retained for audit/history; not operational |
| **Deleted (logical)** | Tombstoned; ID reserved forever; data retention per DRAP/policy |

There is **no** physical hard-delete of canonical identity in the architecture (storage purge is a retention concern, not identity reuse).

---

## 2. Legal transitions

| From | To | Allowed | Notes |
|------|-----|---------|-------|
| Created | Provisioned | ✓ | Complete mandatory identity fields/links |
| Created | Deleted (logical) | ✓ | Abort before provision |
| Provisioned | Active | ✓ | Go-live |
| Provisioned | Archived / Deleted | ✓ | Abort |
| Active | Suspended | ✓ | Policy / billing hold / security |
| Suspended | Active | ✓ | Recovery |
| Active | Archived | ✓ | Wind-down |
| Suspended | Archived | ✓ | Wind-down from hold |
| Archived | Active | ✓ (recovery) | Controlled restore — see §4 |
| Archived | Deleted (logical) | ✓ | After retention policy |
| Deleted (logical) | * | ✗ | **Terminal** |
| Any | rename display fields | ✓ | Does not change state, ID, or lineage (**RI-01**, **RI-02**) |
| Any | accountable-owner transfer | ✓ | State/ID/lineage unchanged; membership may change |
| Any | hierarchy reparent (same ID) | ✗ | Forbidden (**RI-01**); use controlled migration |

Forbidden: Active → Created; Deleted → Active; skipping mint (no Active without ID); mutating parent of an existing canonical ID.

---

## 3. Terminal states

| State | Terminal? | ID fate |
|-------|-----------|---------|
| Deleted (logical) | **Yes** | Permanently reserved; never reused |
| Archived | Semi-terminal | May recover to Active under policy |

---

## 4. Recovery policy

| Scenario | Policy |
|----------|--------|
| Suspended → Active | Standard; audit reason required |
| Archived → Active | Elevated; Organization/Tenant Owner or Platform support with audit |
| Deleted → anything | **Forbidden** — create a **new** entity with new ID if needed |
| Accidental archive | Restore path; operational number retained |
| Parent archived | Children must not remain Active without explicit policy; default cascade to Suspended/Archived |

---

## 5. Cascade rules (architecture)

| Parent transition | Default child effect |
|-------------------|----------------------|
| Organization Suspended | Tenants Suspended (inherit) |
| Tenant Suspended | Restaurants Suspended |
| Restaurant Archived | Branches Archived |
| Parent Deleted (logical) | Children already Archived/Deleted; never orphan Active children |

Cascade is **identity lifecycle**, not RBAC revoke (RBAC reacts to membership/ownership events separately).

---

## 6. Membership lifecycle (summary)

`invited → active ⇄ suspended → revoked`  
Revoked membership IDs are not reused for a different user↔scope binding semantics without a new Membership ID.

---

## 7. Audit

Every transition records: actor, reason, from/to, timestamp, correlation id. Identity audit is owned by Tenant Identity (Security/RBAC may consume).
