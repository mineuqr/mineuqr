# Reference Model — Deliverable 6

**Program:** TENANT-IDENTITY-PLATFORM-ARCHITECTURE-1  
**Status:** Architecture only  
**Date:** 2026-07-29  
**Revision:** RI-02 · RI-03 · ON-LAW

---

## 1. Reference classes

| Class | Audience | Primary key | Secondary |
|-------|----------|-------------|-----------|
| **Internal references** | Services, DB, events | Canonical ID | — |
| **Public references** | Customer-facing URLs / payloads | Canonical ID or token that resolves **only** via Tenant Identity to Canonical ID | Mutable slug (alias — never authoritative) |
| **Operational references** | Support, ops UI | Operational Number (**display/search**) | Must resolve to Canonical ID via Tenant Identity |
| **Support references** | Tickets, runbooks | Operational Number + Canonical ID | Display name (non-authoritative) |
| **API references** | External/public APIs | **Canonical ID only** as identity | Operational Number never as API identity |
| **External integration references** | Partners, marketplace, webhooks, QR | Canonical ID (scoped) | Partner correlation ids (theirs) |

---

## 2. RI-02 — External Reference Stability

All externally exposed references resolve through **Canonical Identity**.

| External surface | Bound to |
|------------------|----------|
| Public URLs | Canonical ID (or Identity-issued public token → Canonical ID) |
| QR Codes | Canonical ID / Identity-issued token |
| API identifiers | Canonical ID |
| Webhook payloads | Canonical ID |
| Integration identifiers | Canonical ID |
| Customer-facing references | Canonical ID (names are labels only) |

Changes to Restaurant/Branch name, Owner, Email, Phone, Domain, or Brand **must never invalidate** these references.

---

## 3. Exposure policy

| Identifier | Internal systems | Staff/admin UI | Public customer UI | Partner API | AI tools |
|------------|------------------|----------------|--------------------|-------------|----------|
| Canonical Organization ID | ✓ | ✓ | Rare | ✓ (if contracted) | ✓ |
| Canonical Tenant ID | ✓ | ✓ | Rare | ✓ | ✓ |
| Canonical Restaurant ID | ✓ | ✓ | ✓ (as needed) | ✓ | ✓ |
| Canonical Branch ID | ✓ | ✓ | If needed | ✓ | ✓ |
| Operational Numbers | Display/search | Display/search | Optional label | ✗ as identity | Prefer canonical; never as authority |
| Database surrogate | ✓ storage only | ✗ contract | ✗ | ✗ | ✗ |
| Display name / email / phone | ✓ as data | ✓ | ✓ | ✓ as data | ✓ as data — **never as ID** |
| Slug | Alias only | Alias | Alias | Optional alias | Alias only — resolve via TIP (**RI-03**) |

---

## 4. Laws

| Rule ID | Statement |
|---------|-----------|
| **REF-01** | New integrations **must** accept canonical IDs as authoritative (**RI-02**). |
| **REF-02** | Public surfaces may show names; persistence and authz use Canonical IDs. |
| **REF-03** | Sequential operational numbers are not identity and not an auth factor (**ON-LAW**). |
| **REF-04** | Events carry canonical IDs for tenancy entities. |
| **REF-05** | External systems may store their own foreign keys; MineuQR maps via canonical ID. |
| **REF-06** | Deprecating a public alias (slug) does not change canonical ID (**RI-02**). |
| **REF-07** | Alias/slug/name/ops-number → Canonical ID resolution is performed **only** by Tenant Identity (**RI-03**). |
| **REF-08** | Business Domains must not implement independent lookup from mutable attributes (**RI-03**). |

---

## 5. Resolution order (Tenant Identity only)

```
1. Canonical ID          → authoritative
2. Identity-issued token → resolves to Canonical ID (TIP)
3. Operational Number    → support search aid → TIP resolves to Canonical ID
4. Slug / alias          → UX → TIP resolves to Canonical ID (may be stale)
5. Name / email / phone  → search only — never unique identity authority
```

Steps 3–5 are **Tenant Identity Platform** capabilities — not domain logic (**RI-03**).

---

## 6. Cross-platform reference contract

| Consumer | Must store / pass |
|----------|-------------------|
| RBAC scopes | Canonical Org/Tenant/Restaurant/Branch IDs |
| Subscription attachments | Canonical Tenant ID (or interim Restaurant ID) |
| Order / Check / Device / Realtime | Restaurant (and Branch if applicable) **canonical** IDs |
| AI context | Canonical IDs + Tenant boundary |
| Reporting dimensions | Canonical IDs; names as labels |
| QR / Marketplace / Webhooks | Canonical IDs (**RI-02**) |

---

## 7. What must never be an external identity contract

- Owner user email  
- Restaurant display name  
- Phone number  
- Billing domain  
- Mutable marketing slug alone  
- Operational Number alone  
- Raw DB auto-increment as public API id (target state)
