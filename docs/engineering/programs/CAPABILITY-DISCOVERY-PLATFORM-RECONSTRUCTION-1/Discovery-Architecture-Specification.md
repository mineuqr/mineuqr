# Discovery Architecture Specification

**Program:** CAPABILITY-DISCOVERY-PLATFORM-RECONSTRUCTION-1  
**Status:** Design specification (no runtime implementation in this program)

---

## 1. Architectural law

```
MineuQR Platform (production code)
        ↓
Capability Discovery (Canonical Registry)  ← SSOT for “what exists”
        ↓
Commercial Projection (future)             ← SSOT for “what is sellable on Plans”
        ↓
Commercial Catalog Plans / Offerings
        ↓
Published Offerings
        ↓
Subscription Runtime (Snapshot entitlements)
        ↓
Customer Experience
```

**Forensics conclusion adopted:** Commercial Filter Registry is **not** Platform SSOT. Discovery is.

---

## 2. Discovery Registry properties

| Property | Rule |
|----------|------|
| Contents | Only production-implemented capabilities |
| IDs | Permanent `CAP-xx` |
| Ownership | Exactly one Architectural Owner |
| Boundary | Exactly one primary bounded context |
| Commercializable | Derived eligibility boolean/class — not marketing |
| Forbidden entries | Legacy FEATURE_KEYS, Planned roadmap, blocked roles, pure governance docs |

---

## 3. Capability identity

```
CapabilityId    = CAP-{nn}
RuntimeCapId    = optional future cap.* (projection concern)
FilterKey       = optional future Plan toggle (projection concern)
```

Discovery **must not** store FEATURE_KEYS as identity. Legacy mapping is a **crosswalk document**, not Registry columns for identity.

---

## 4. Required fields (normative schema)

Every Discovery record SHALL include:

1. Canonical Capability ID  
2. Capability Name  
3. Domain  
4. Subdomain  
5. Architectural Owner  
6. Aggregate Owner  
7. Platform Layer  
8. Description  
9. Dependencies (typed)  
10. Runtime Entry Points  
11. UI Entry Points  
12. API Entry Points  
13. Permissions model summary  
14. Commercializable (ELIGIBLE | NOT READY)  
15. Current Production Status  
16. Lifecycle  

Evidence paths SHOULD be cited in reconstruction/forensics packages; optional in machine registry later.

---

## 5. Ownership & boundaries

- Architectural Owner is the **accountability** owner (who changes the capability).  
- Aggregate Owner is the **data/AR** owner when applicable.  
- Cross-domain consumption is allowed; **dual write ownership** is an architecture violation.  
- Nested contexts (e.g. Screen under Device) are allowed when primary owner is explicit.

---

## 6. Relationship model

Allowed edge types: Requires · Extends · Optional · Depends On · Consumes · Provides.  
Edges require evidence. Inference without evidence is forbidden.

---

## 7. Commercial eligibility derivation

Eligibility is a **function of evidence gates** (see Commercial Eligibility Matrix), evaluated at Discovery time.  
Plans **must not** invent capabilities absent from Discovery.  
Plans **may omit** ELIGIBLE capabilities (packaging choice).  
Plans **must not** include NOT READY capabilities as independent sellable toggles without AA exception.

---

## 8. Change control

| Change | Authority |
|--------|-----------|
| Add Discovery capability | Requires production implementation evidence + AA |
| Remove / retire | Requires deprecation program; consumers inventory |
| Change owner | AA + Ownership Matrix update |
| Change eligibility | Re-run evidence gates; document |
| Emit Commercial Projection | Separate implementation program |

---

## 9. Relation to prior PLATFORM-CAPABILITY-DISCOVERY-1

| Aspect | Prior | Reconstruction |
|--------|-------|----------------|
| Scope | 46 incl. Planned/Experimental | **42 production-only** |
| Authority | Discovery catalog | **Canonical Discovery SSOT** |
| Commercial link | Annotated onto FEATURE_KEYS | **Projection designed; not implemented** |
| IDs | CAP-01…46 | CAP-01…48 with exclusions + CAP-47/48 |

Prior catalog remains historical reference; **this Canonical Registry supersedes it as SSOT** pending AA ratification.
