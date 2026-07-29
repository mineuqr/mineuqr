# Identifier Model — Deliverable 2

**Program:** TENANT-IDENTITY-PLATFORM-ARCHITECTURE-1  
**Status:** Architecture only  
**Date:** 2026-07-29

> **Non-binding note:** This document defines **philosophy and requirements**. It does **not** prescribe UUID vs ULID vs KSUID vs custom codec, storage column types, or migration mapping.

---

## 1. Canonical identifier types

| Identifier | Identifies | Permanence |
|------------|------------|------------|
| **Platform ID** | Logical platform root / deployment identity | Permanent for deployment |
| **Organization ID** | Organization | Permanent for entity lifetime |
| **Tenant ID** | Tenant | Permanent for entity lifetime |
| **Restaurant ID** | Restaurant | Permanent for entity lifetime |
| **Branch ID** | Branch | Permanent for entity lifetime |
| **User ID** | Platform User (principal) | Permanent; Auth/User store may co-own issuance under Identity contract |
| **Membership ID** | Membership binding | Permanent for binding lifetime |

Each entity also may carry an **Operational Number** (human-facing) — see [OPERATIONAL-NUMBERING.md](./OPERATIONAL-NUMBERING.md).

**ON-LAW:** Operational Numbers are **not** Canonical Identity, primary keys, ownership/authorization/API/integration identifiers.

---

## 2. Requirements (normative)

| Requirement | Statement |
|-------------|-----------|
| **Immutable** | Once issued, the canonical ID never changes. |
| **Globally unique** | Unique across the platform (and designed for multi-region without collision). |
| **Human-safe** | Safe to display in support tools; no secrets embedded; avoid confusing ambiguous glyphs where shown. |
| **Machine-safe** | URL-safe / API-safe; unambiguous encoding; case policy defined at issuance. |
| **Never reused** | After logical delete, ID remains reserved forever. |
| **Never reassigned** | ID never points to a different entity; parent lineage never rewritten on the same ID (**RI-01**). |
| **Never inferred** | Must not be computed from name, email, domain, phone, owner, slug, operational number, or DB surrogate (**RI-03**). |
| **Opaque** | No embedded business semantics (plan, region, role, status). |
| **Independent of DB IDs** | Surrogate integers/auto-increments are storage concerns — not the platform contract. |

---

## 3. Format philosophy (implementation-agnostic)

```
Canonical ID = opaque, unique, immutable token issued by Tenant Identity
```

### Allowed philosophies (choose later in Foundation)

| Approach | Notes |
|----------|-------|
| Random / UUID-class | Strong uniqueness; opaque |
| Time-sortable unique (ULID-class) | Ops-friendly ordering without semantics |
| Prefixed opaque (`org_…`, `ten_…`, `rst_…`, `br_…`) | Type-safe at glance; prefix is **type tag only**, not business data |

### Forbidden encodings

| Encoding | Why forbidden |
|----------|---------------|
| Restaurant name / slug as ID | Mutable; collisions; rename breaks refs |
| Owner email / phone | PII; mutable; transferable wrongly |
| Domain name | Mutable; multi-brand |
| Status / plan / region in ID | Semantic; changes over time |
| Raw database auto-increment as **public contract** | Couples storage; hard to federate; easy to scrape |
| Role or permission fragments | RBAC concern |

**Slugs** may exist as **mutable aliases** for UX/URLs — they are **not** canonical IDs. Alias → Canonical ID resolution belongs **exclusively** to Tenant Identity (**RI-03**). External refs must survive alias/name changes (**RI-02**).

---

## 4. Issuance laws

| Rule ID | Statement |
|---------|-----------|
| **CID-01** | Only Tenant Identity (or delegated issuance service under its contract) mints hierarchy IDs. |
| **CID-02** | Domains, AI, UI, and Subscription **never** mint Organization/Tenant/Restaurant/Branch IDs. |
| **CID-03** | Issuance is append-only: create issues ID; updates never replace it. |
| **CID-04** | Clone / copy / franchise spin-up issues **new** IDs under the **target** parent — never copy or reparent existing IDs (**RI-01**). |
| **CID-05** | Import/migration maps legacy keys → canonical IDs via explicit mapping; restructuring migrations mint new IDs rather than reassign parents (**RI-01**). |
| **CID-06** | Parent is fixed at mint for the life of the ID. Same-ID reparenting is **always forbidden**. Controlled migration mints **new** IDs under the target parent and archives sources (**RI-01**). |

---

## 5. Relationship to other keys

| Key kind | Status | Use |
|----------|--------|-----|
| Canonical ID | **Sole authoritative identity contract** | APIs, events, FK references, RBAC scopes, AI, QR, webhooks (**RI-02**) |
| Operational Number | **Human ops label only** (**ON-LAW**) | Support display/search — not API/ownership/authz identity |
| Database surrogate | **Storage** | Internal only; not external contract |
| Slug / vanity path | **Alias** | Mutable; resolve only via Tenant Identity (**RI-03**) |
| Display name | **Business data** | Never identity |

---

## 6. Multi-region / federation readiness

Canonical IDs must be issuable without a single global auto-increment bottleneck. Uniqueness strategy is an implementation concern; the architecture requires **collision-free platform-wide uniqueness** and **no region encoded as identity semantics** (region may be metadata).

---

## 7. Resolution authority (**RI-03**)

Business Domains, AI, and integrations **receive** Canonical IDs. They must not resolve identity from name, slug, email, phone, domain, or operational number. Any alias→ID lookup is Tenant Identity Platform only.
