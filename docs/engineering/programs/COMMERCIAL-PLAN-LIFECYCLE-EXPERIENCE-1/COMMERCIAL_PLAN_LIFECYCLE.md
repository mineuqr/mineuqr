# COMMERCIAL PLAN LIFECYCLE

| Field | Value |
|-------|-------|
| **Program** | COMMERCIAL-PLAN-LIFECYCLE-EXPERIENCE-1 |
| **Status** | Architecture Decision · **Amendment Revision 1** |
| **Date** | 2026-07-30 |

---

## 0. Scope clarification

“Commercial Plan Lifecycle” spans **three artifacts**:

| Artifact | Question answered |
|----------|-------------------|
| **Plan Identity** | What commercial product exists? |
| **Plan Version** | What sellable commercial contract is offered? |
| **Subscription Instance** | What commercial relationship does a tenant hold? |

Plus **Commercial Snapshot** — frozen entitlement facts at bind/activate (not a mutable lifecycle SM).

States named in the program brief are mapped below to the correct artifact. Mixing Catalog and Subscription states in one machine is **forbidden**.

---

## 1. Plan Identity lifecycle (Catalog)

Plan Identity is durable (**CC-01**). It is not the sellable contract.

| State | Purpose | Allowed transitions | Owner | Runtime responsibility | Entry | Exit |
|-------|---------|---------------------|-------|------------------------|-------|------|
| **Available** | Identity may have Published versions offered | → Hidden, → Retired | Commercial Catalog | Storefront may list Published versions of this Plan | Plan created | Hidden/Retired command |
| **Hidden** | Identity retained; storefront suppresses Plan | → Available, → Retired | Commercial Catalog | Selection UIs omit Plan | Admin hide | Unhide or Retire |
| **Retired** | Identity closed for new commercial acquisition | → Archived | Commercial Catalog | No new subs to any version; existing via Subscription + Snapshot | All versions retired *or* explicit identity retire | Archive when retention allows |
| **Archived** | Historical identity only | — (terminal) | Commercial Catalog | Read-only history (**CC-10**) | Retention policy | — |

---

## 2. Plan Version lifecycle (Catalog Offering) — canonical

Extends foundation states with governance gates and archive.

### 2.1 State list

| State | Purpose |
|-------|---------|
| **Draft** | Editable commercial composition; not sellable |
| **InternalReview** | Composition frozen for review; not sellable |
| **Approved** | Review passed; awaiting schedule or publish |
| **Scheduled** | Approved; publish at declared effective time |
| **Published** | Immutable; eligible for new subscriptions (storefront) |
| **Deprecated** | Immutable; limited/no new acquisition; renewals typically allowed |
| **Retired** | Immutable; no new subscriptions; renewals per Retirement Policy |
| **Archived** | Terminal catalog history; no commercial acquisition or renewal |

### 2.2 Per-state detail

#### Draft

| Field | Content |
|-------|---------|
| **Purpose** | Author commercial composition (prices, cycles, features, limits, policies, CC-14, CC-15) |
| **Allowed transitions** | → InternalReview · → Approved *(short path)* · → Published *(direct path if governance waived)* · discard (delete draft only) |
| **Owner** | Commercial Catalog |
| **Runtime responsibility** | Never used for entitlement evaluation |
| **Entry** | Create version; or return from InternalReview (reject) |
| **Exit** | Submit for review / approve / publish / discard |

#### InternalReview

| Field | Content |
|-------|---------|
| **Purpose** | Human/governance review of commercial readiness |
| **Allowed transitions** | → Draft (reject) · → Approved |
| **Owner** | Commercial Catalog (state) · Architecture/Commercial Authority (decision) |
| **Runtime responsibility** | Not sellable; mutable fields locked except review annotations |
| **Entry** | SubmitDraftForReview |
| **Exit** | Approve or Reject |

#### Approved

| Field | Content |
|-------|---------|
| **Purpose** | CC-16-ready and authority-approved; not yet live |
| **Allowed transitions** | → Scheduled · → Published · → Draft *(withdraw approval — rare, audited)* |
| **Owner** | Commercial Catalog |
| **Runtime responsibility** | Not sellable |
| **Entry** | ApproveReview or ApproveDraft |
| **Exit** | Schedule / Publish / Withdraw |

#### Scheduled

| Field | Content |
|-------|---------|
| **Purpose** | Time-gated publication |
| **Allowed transitions** | → Published *(at effectiveAt)* · → Approved *(cancel schedule)* |
| **Owner** | Commercial Catalog |
| **Runtime responsibility** | Not sellable until Published |
| **Entry** | SchedulePublish(effectiveAt) |
| **Exit** | Auto-publish or cancel |

#### Published

| Field | Content |
|-------|---------|
| **Purpose** | Live sellable immutable contract |
| **Allowed transitions** | → Deprecated · → Retired *(direct retire allowed by policy)* |
| **Owner** | Commercial Catalog |
| **Runtime responsibility** | Selection/activation may reference; entitlement uses Snapshot copy |
| **Entry** | Publish (CC-16 pass) or Scheduled fire |
| **Exit** | Deprecate / Retire |

#### Deprecated

| Field | Content |
|-------|---------|
| **Purpose** | Soft end-of-sale; warn migrations; renewals typically OK |
| **Allowed transitions** | → Retired |
| **Owner** | Commercial Catalog |
| **Runtime responsibility** | Hidden from new selection by default; renewals + grandfathered instances continue via Snapshot |
| **Entry** | Deprecate |
| **Exit** | Retire |

#### Retired

| Field | Content |
|-------|---------|
| **Purpose** | Hard end-of-sale; renewals only if Retirement Policy `allowRenewals` |
| **Allowed transitions** | → Archived |
| **Owner** | Commercial Catalog |
| **Runtime responsibility** | No new plan selection; existing Snapshots remain valid |
| **Entry** | Retire from Published or Deprecated |
| **Exit** | Archive when no renewal-eligible holders remain *or* retention forces archive with Remaining holders grandfathered until Cancelled/Expired |

#### Archived

| Field | Content |
|-------|---------|
| **Purpose** | Terminal catalog record |
| **Allowed transitions** | none |
| **Owner** | Commercial Catalog |
| **Runtime responsibility** | History only; Snapshots still immutable for past periods |
| **Entry** | ArchiveRetired |
| **Exit** | — |

### 2.3 Compatibility with foundation enum

| Foundation today | This architecture |
|------------------|-------------------|
| `draft` | Draft (+ optional InternalReview/Approved/Scheduled as refinements of pre-publish) |
| `published` | Published |
| `deprecated` | Deprecated |
| `retired` | Retired |
| *(none)* | Archived |

**Law:** Pre-publish governance states **MUST NOT** weaken CC-16. Publish remains fail-closed.

**Implementation note (non-normative):** Runtime may collapse InternalReview/Approved/Scheduled into Draft until a future foundation extension; architecture still requires the gates as decision SSOT.

---

## 3. Subscription Instance lifecycle (tenant commercial relationship)

Canonical architecture (refines SUBSCRIPTION-PLATFORM-ARCHITECTURE-1). Runtime today implements a subset — **architecture is authoritative**.

| State | Purpose | Allowed transitions | Owner | Runtime responsibility | Entry | Exit |
|-------|---------|---------------------|-------|------------------------|-------|------|
| **Draft** | Prepared instance; not enabling | → Trial, → Active, → Cancelled | Subscription | No entitlements | Create pending | Activate / abort |
| **Trial** | Time-bounded trial entitlements from Snapshot | → Active, → Expired, → Cancelled | Subscription | Entitlements from bound Snapshot | Activate trial | Convert / end |
| **Active** | Paid/contract entitlements in force | → Grace, → Suspended, → Expired, → Cancelled; plan change via upgrade/downgrade/renewal *(state may stay Active)* | Subscription | Entitlements from bound Snapshot | Convert / pay / admin activate | Leave Active |
| **Grace** | Temporary continuation after renewal/payment issue | → Active, → Suspended, → Expired, → Cancelled | Subscription | Entitlements continue per Grace policy | Billing/renewal signal (Billing OOS) | Recover or exhaust |
| **Suspended** | Entitlements blocked (non-grace) | → Active, → Cancelled, → Expired | Subscription | Features/limits denied | Policy / risk / non-pay | Recover / end |
| **Expired** | Term ended without renewal | → Archived; → Active only via **new activation path** | Subscription | No enablement | Term end | Archive |
| **Cancelled** | Explicit end | → Archived | Subscription | No enablement | Cancel command | Archive |
| **Archived** | Historical instance | — | Subscription | History only | Retention | — |

### 3.1 Grandfathered (mode, not exclusive state)

| Field | Content |
|-------|---------|
| **Definition** | Subscription is **Grandfathered** when its bound Snapshot references a Plan Version in **Deprecated** or **Retired**, and policy still permits continuation/renewal |
| **Owner** | Subscription (mode flag / derived fact) · Catalog (Retirement/Migration policies) |
| **Runtime** | Entitlements remain Snapshot-bound; Catalog mutations irrelevant |
| **Exit** | Upgrade/downgrade to a Published target; or Expire/Cancel; or renew onto a migrated Snapshot when policy requires |

Grandfathered **MAY** overlay Trial/Active/Grace only. Suspended/Expired/Cancelled/Archived are not “grandfathered commercial continuation.”

---

## 4. Commercial Snapshot artifact lifecycle (non-mutable SM)

| Phase | Purpose | Owner |
|-------|---------|-------|
| **Created** | Snapshot captured from immutable Plan Version (or bridge) | Catalog defines schema; Subscription persists |
| **Bound** | Linked to Subscription instance; **immutability begins** | Subscription |
| **Activated** | Exclusive entitlement SSOT for that instance (**CC-13**, Snapshot Runtime Authority) | Subscription |

### 4.1 Commercial Snapshot Invariant (constitutional)

Once a Snapshot becomes **bound** to any Subscription:

| Rule | Normative requirement |
|------|------------------------|
| **Permanent immutability** | The Snapshot MUST become permanently immutable |
| **No modification** | A Snapshot MUST NEVER be modified |
| **No reuse after plan change** | A Snapshot MUST NEVER be reused after the Commercial Plan definition changes |
| **Plan change → new Snapshot** | Any Commercial Plan change MUST produce a **new** Snapshot |
| **Entitlement SSOT** | Runtime Entitlements MUST always be resolved **exclusively** from the bound Snapshot |
| **No Catalog entitlement path** | Runtime MUST NEVER resolve entitlements directly from mutable Catalog data |

### 4.2 Snapshot Identity (**I-CPL-13**)

- A Subscription SHALL reference **exactly one active** Commercial Snapshot at any point in time.
- Whenever a Subscription changes Commercial Plans (Upgrade, Downgrade, Migration, Renewal requiring a new commercial definition, or Administrative Plan Replacement), the runtime SHALL bind the Subscription to a **newly created** Snapshot.
- Historical Snapshots SHALL remain immutable and permanently preserved.
- Historical Subscriptions SHALL continue referencing their historical Snapshot.
- No historical Snapshot may ever be **overwritten** or **repointed**.

Bind reasons (not states): `plan_selected` | `trial_activated` | `upgrade` | `downgrade` | `renewal` | `migration` | `admin_plan_replacement`.

---

## 5. Cross-plane actions (experience)

| Action | Catalog effect | Subscription effect | Snapshot effect |
|--------|----------------|---------------------|-----------------|
| **Create plan/version** | Plan Identity + Draft Version | — | — |
| **Publish** | Version → Published | — | — |
| **Activate / select plan** | — | Draft→Trial/Active | Create+Bind+Activate |
| **Upgrade** | Uses CC-14 upgradeTargets | Remains Active (typical) | New Snapshot (upgrade) |
| **Downgrade** | Uses CC-14 downgradeTargets | Active; excess limits per policy | New Snapshot (downgrade) |
| **Renew** (same commercial definition) | Version must allow renewals | Active↔Grace recovery | **Retain** active Snapshot (**I-CPL-13**) |
| **Renew** (new commercial definition) | Successor Version / policy | Active↔Grace recovery | **New** Snapshot; prior Snapshot preserved historically |
| **Migrate / Admin plan replace** | CC-14 / admin policy | Remains Active (typical) | **New** Snapshot; never reuse prior |
| **Suspend** | — | → Suspended | Snapshot unchanged |
| **Expire** | — | → Expired | Snapshot retained |
| **Cancel** | — | → Cancelled | Snapshot retained |
| **Deprecate/Retire version** | Version state change | Existing become Grandfathered mode if continuing | Unchanged |
| **Grandfather continue** | Policy allows | Active/Grace + Grandfathered | Unchanged |
| **Archive version** | → Archived | Must not break historical Snapshot reads | Unchanged |

---

## 6. Owner summary

| State family | Owner |
|--------------|-------|
| Plan Identity / Plan Version states | **Commercial Catalog** |
| Subscription states + Grandfathered mode | **Subscription Platform** |
| Snapshot create/bind/activate | **Subscription** persists; **Catalog** schema |
| Billing signals into Grace/Suspend | **Billing** (future) emits signals; Subscription owns transitions |
| Entitlement evaluation | **Subscription** from Snapshot only |
| AI / Order / Restaurant / Reporting | **Consumers** — never own plan lifecycle |
