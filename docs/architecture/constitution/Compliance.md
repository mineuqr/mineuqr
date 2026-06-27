# Architecture Compliance

> **Constitution §28** · [Architecture Constitution v1.0](./Architecture-Constitution-v1.0.md)

# 28. Architecture Compliance

### Per-program compliance package

Every implementation program must deliver:

#### 1. Architecture Traceability Matrix (ATM)

| Requirement | Blueprint § | ADR | Implementation artifact | Test / FF |
|---|---|---|---|---|
| Lifecycle policy | §5, §7 | 007 | `OrderLifecyclePolicy` | FF-08 |
| … | … | … | … | … |

#### 2. Affected ADRs

List all ADRs implemented, deprecated, or superseded.

#### 3. Affected Blueprint Sections

Explicit section numbers from Part I.

#### 4. Compliance Verification

| Gate | Owner | Evidence |
|---|---|---|
| Design review | Architecture Authority | Signed ATM |
| Code review | Engineering Lead | PR checklist |
| Fitness functions | CI | Automated + manual |
| Integration review | Principal Engineer | Event registry diff |

#### 5. Architecture Review

- **Entry review** — charter vs Constitution (before coding).
- **Mid review** — optional for programs > 4 weeks.
- **Exit review** — certification or conditional certification.

#### 6. Exit Criteria

- All in-scope ATM rows **Implemented + Verified**
- No open **Severity: High** constitutional violations
- Fitness functions green
- Blueprint amendment (if any) merged
- ADRs marked **Implemented**

### Certification outcomes

| Outcome | Meaning |
|---|---|
| **Certified** | Full compliance |
| **Conditionally Certified** | Known gaps with dated remediation ADR |
| **Not Certified** | Merge blocked for program completion milestone |

### 28.4 Architecture Exception Process

For emergencies only:

1. Document exception (scope, duration, approver).
2. Maximum duration: **30 days** unless extended by Authority.
3. Follow-up: ADR or revert; exception cannot become permanent.

**Rule:** *Implementation cannot be certified until compliance is verified.*

---

---

**Related:** [Compliance Checklist](../governance/Compliance-Checklist.md) · [Program Certification](../governance/Program-Certification.md) · [Traceability Matrix Template](../templates/Architecture-Traceability-Matrix.md)