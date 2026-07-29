# Operational Numbering — Deliverable 3

**Program:** TENANT-IDENTITY-PLATFORM-ARCHITECTURE-1  
**Status:** Architecture only  
**Date:** 2026-07-29  
**Revision:** ON-LAW — Operational Numbers Are Not Identity

---

## 1. Purpose

**Operational Numbers** are stable, human-readable labels for support, finance ops, and on-site staff.

```
Canonical ID     → sole authoritative identity (machines, APIs, authz scopes, integrations)
Operational #    → human operations only
```

---

## 2. Architecture Law — Operational Numbers Are Not Identity

Operational Numbers exist exclusively for **human operations**.

| They **are** | They are **NOT** |
|--------------|------------------|
| Human-readable | Canonical Identity |
| Stable | Primary Keys |
| Support-friendly | Ownership references |
| Operational | Authorization references |
| | Integration identifiers |
| | API identity |
| | Business-relationship keys |

**Canonical Identity remains the only authoritative identity throughout the platform.**

```
Restaurant ID  ≠  Restaurant #000001
Tenant ID      ≠  Tenant #000001
Branch ID      ≠  Branch #001
```

**RI-03:** Domains and integrations must **never** resolve identity using Operational Number as authority. Support tools may *display* or *search* by number; resolution to Canonical ID is performed **only** by Tenant Identity.

---

## 3. Number families (examples)

| Entity | Example form | Notes |
|--------|--------------|-------|
| Organization | `Organization #000001` | Platform-wide sequence (or org-space policy) |
| Tenant | `Tenant #000001` | Platform-wide or per-Organization sequence |
| Restaurant | `Restaurant #000001` | Platform-wide preferred for support |
| Branch | `Branch #001` | Per-Restaurant sequence (short) |

Exact padding width is a presentation policy; architecture requires **zero-padded fixed-width display** for ops consistency.

---

## 4. Requirements (normative)

| Requirement | Statement |
|-------------|-----------|
| **Readable** | Suitable for phone support and printed ops docs |
| **Stable** | Does not change on rename or accountable-owner transfer |
| **Sequential where appropriate** | Monotonic issuance within its numbering space |
| **Independent of database IDs** | Not equal to SQL auto-increment contract |
| **Never reuse** | Retired numbers are not reissued |
| **Not secret** | May appear in UI/support; still not Auth |
| **Not authoritative identity** | Never sole machine FK; never API identity contract (**ON-LAW**) |

---

## 5. Numbering spaces

| Number | Scope of sequence | Rationale |
|--------|-------------------|-----------|
| Organization # | Platform | Support finds any customer org |
| Tenant # | Platform **or** per-Organization | Prefer platform-wide for MineuQR support |
| Restaurant # | Platform | Primary ops handle today |
| Branch # | Per Restaurant | Short local numbers (`#001`) |

**Law:** Operational number + entity type uniquely labels an entity for humans within its numbering space. It does **not** replace Canonical ID.

---

## 6. Relationship to canonical IDs

| Rule ID | Statement |
|---------|-----------|
| **ON-01** | Every numbered entity has exactly one canonical ID and at most one primary operational number. |
| **ON-02** | Operational numbers are issued at provisioning (or activation) — not derived from names. |
| **ON-03** | APIs use canonical IDs as identity; operational numbers are support/display/search aids only. |
| **ON-04** | Public customer-facing identity must not rely on sequential numbers alone (enumeration risk). |
| **ON-05** | Renumbering is forbidden except Architecture Authority break-glass + audited remapping program. |
| **ON-06** | Changing business attributes never changes operational numbers or canonical IDs (**RI-02**). |

---

## 7. Display conventions

```
Restaurant #000142          ← human ops label (NOT identity)
  canonical: rst_…          ← authoritative identity
  name: "Café Nile"         ← mutable business data
```

Support scripts confirm number + name with humans; systems key off **canonical ID**.

---

## 8. Independence from ADR-ARCH-027

Operational Document Identity (orders, checks, RF-######, etc.) remains under **Operational Document Identity** standards. Tenant Identity operational numbers label **tenancy entities** for humans — not financial documents, and not canonical tenancy identity.
