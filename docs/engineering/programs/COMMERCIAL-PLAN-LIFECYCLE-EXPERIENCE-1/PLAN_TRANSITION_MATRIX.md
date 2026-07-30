# PLAN TRANSITION MATRIX

| Field | Value |
|-------|-------|
| **Program** | COMMERCIAL-PLAN-LIFECYCLE-EXPERIENCE-1 |
| **Date** | 2026-07-30 |

---

## A. Plan Version (Catalog)

### A.1 Allowed transitions

| From \ To | Draft | InternalReview | Approved | Scheduled | Published | Deprecated | Retired | Archived |
|-----------|:-----:|:--------------:|:--------:|:---------:|:---------:|:----------:|:-------:|:--------:|
| **Draft** | — | ✓ | ✓¹ | — | ✓² | — | — | — |
| **InternalReview** | ✓³ | — | ✓ | — | — | — | — | — |
| **Approved** | ✓⁴ | — | — | ✓ | ✓ | — | — | — |
| **Scheduled** | — | — | ✓⁵ | — | ✓⁶ | — | — | — |
| **Published** | — | — | — | — | — | ✓ | ✓ | — |
| **Deprecated** | — | — | — | — | — | — | ✓ | — |
| **Retired** | — | — | — | — | — | — | — | ✓ |
| **Archived** | — | — | — | — | — | — | — | — |

¹ Short-path approve when InternalReview waived by governance.  
² Direct publish when governance gate waived **and** CC-16 passes.  
³ Reject to Draft.  
⁴ Withdraw approval (audited).  
⁵ Cancel schedule.  
⁶ At `effectiveAt` (system) or forced publish.

### A.2 Forbidden transitions (normative)

| Transition | Reason |
|------------|--------|
| Published → Draft / InternalReview / Approved / Scheduled | Immutability (**CC-02**) |
| Deprecated → Published | Reopen sale only via **new Version** |
| Retired → Published / Deprecated | Terminal commercial path; new Version required |
| Archived → * | Terminal |
| * → mutate prices/features/limits on Published+ | Immutability |
| Draft → Deprecated / Retired / Archived | Never published |
| Scheduled → Draft | Must cancel to Approved first |
| Any → skip CC-16 into Published | Fail closed |

### A.3 Validation rules

| Transition | Guards |
|------------|--------|
| → Published | **CC-16** publication validation; version payload freeze; audit |
| → InternalReview | Draft complete enough for review checklist (org policy) |
| → Approved | Reviewer authority; CC-16 preflight recommended |
| → Scheduled | `effectiveAt` in future; Approved |
| → Deprecated | Published; optional migration notice policy |
| → Retired | Published or Deprecated; Retirement Policy attached |
| → Archived | Retired; archive policy (no open renewal-eligible OR explicit force with Grandfathered remaining) |

### A.4 Terminal states

| State | Terminal? | Recovery |
|-------|-----------|----------|
| Archived | **Yes** | None — publish successor Version on same or new Plan Identity |
| Retired | Soft terminal for acquisition | Archive only; holders continue via Subscription/Snapshot |
| Published/Deprecated | Non-terminal | Deprecate/Retire forward only |

### A.5 Recovery paths (Catalog)

| Situation | Path |
|-----------|------|
| Failed publish | Remain pre-publish; fix Draft; re-validate CC-16 |
| Wrong Published content | **Cannot edit** — create new Version; migrate via CC-14 |
| Accidental Deprecate | Cannot un-deprecate to Published — new Version or accept Deprecated until Retire |
| Cancel Scheduled | → Approved |

---

## B. Plan Identity (Catalog)

| From | Allowed | Forbidden | Terminal | Recovery |
|------|---------|-----------|----------|----------|
| Available | Hidden, Retired | Archived direct | No | — |
| Hidden | Available, Retired | Published Version mutate | No | Unhide |
| Retired | Archived | Available (prefer new Identity) | Soft | Archive |
| Archived | — | All | **Yes** | New Plan Identity |

---

## C. Subscription Instance

### C.1 Allowed transitions

| From \ To | Draft | Trial | Active | Grace | Suspended | Expired | Cancelled | Archived |
|-----------|:-----:|:-----:|:------:|:-----:|:---------:|:-------:|:---------:|:--------:|
| **Draft** | — | ✓ | ✓ | — | — | — | ✓ | ✓⁷ |
| **Trial** | — | — | ✓ | — | — | ✓ | ✓ | — |
| **Active** | — | — | —⁸ | ✓ | ✓ | ✓ | ✓ | — |
| **Grace** | — | — | ✓ | — | ✓ | ✓ | ✓ | — |
| **Suspended** | — | — | ✓ | — | — | ✓ | ✓ | — |
| **Expired** | — | — | △⁹ | — | — | — | ✓ | ✓ |
| **Cancelled** | — | — | △⁹ | — | — | — | — | ✓ |
| **Archived** | — | — | — | — | — | — | — | — |

⁷ Abort without commercial history of value.  
⁸ Upgrade/downgrade/renewal typically **remain Active** (plan change ≠ state change).  
⁹ △ = only via **new subscription instance** / explicit reactivation product path — not silent reopen.

### C.2 Forbidden

| Transition | Reason |
|------------|--------|
| * → Draft from commercial states | History integrity |
| Archived → * | Terminal |
| Expired/Cancelled → Active in-place | Prefer new instance (**SP lifecycle**) |
| Grace → Trial | No regression |
| Suspended → Grace | Must recover to Active or end |
| Any entitlement mutate Snapshot | Immutability |

### C.3 Validation rules

| Action / transition | Rules |
|---------------------|-------|
| Activate | Catalog Version **Published** (or policy exception admin); Snapshot create+bind+activate |
| Upgrade | Target ∈ CC-14 `upgradeTargets`; source Version readable; new Snapshot |
| Downgrade | Target ∈ `downgradeTargets`; excess resource policy; new Snapshot |
| Renew | Source Version not Archived; if Retired, RetirementPolicy.allowRenewals; billing signal OOS |
| → Grace | Billing/renewal failure signal (future Billing) or admin policy |
| → Suspended | Explicit policy; not used as silent Grace substitute |
| Grandfathered mode | Derived when Snapshot.version ∈ {Deprecated, Retired} and continuation allowed |

### C.4 Terminal states

| State | Terminal? | Recovery |
|-------|-----------|----------|
| Archived | **Yes** | New Subscription instance |
| Cancelled / Expired | Soft terminal | Archive; or new instance for return |

### C.5 Recovery paths (Subscription)

| From | To | Path |
|------|-----|------|
| Grace | Active | Successful renewal/payment signal |
| Suspended | Active | CS/platform recover + audit |
| Expired | Active | New activation / new instance |
| Cancelled | Active | New instance preferred |
| Grandfathered Active | Active (non-GF) | Upgrade/migrate to Published Version + new Snapshot |

---

## D. Snapshot (artifact phases)

| From | Allowed | Forbidden |
|------|---------|-----------|
| Created | → Bound | Mutate payload |
| Bound | → Activated; replace via new Snapshot | Mutate payload |
| Activated | Superseded by **new** Snapshot bind | Mutate; unfreeze |

**Terminal:** None as state — superseded Snapshots remain readable history.
