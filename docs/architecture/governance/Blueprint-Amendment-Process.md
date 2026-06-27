# Blueprint Amendment Process

> **Constitution §27** · [Governance](../constitution/Governance.md)

# 27. Blueprint Governance

### Blueprint ownership

| Owner | Role |
|---|---|
| Architecture Authority | Constitutional steward |
| Principal Engineer | Maintainer of Part I specification |
| Domain representatives | Review integration sections |

### Review cadence

| Activity | Frequency |
|---|---|
| Constitutional review | Annual or post-major program |
| Blueprint delta review | Each program kickoff + exit |
| Integration landscape review | When Kitchen/Print/Session programs charter |

### Change approval process

1. Proposed change documented as **Blueprint Amendment Request** (BAR).
2. Impact analysis: ADRs affected, programs affected, fitness functions affected.
3. Architecture Authority approval **before** dependent implementation merges.
4. Amendment merged into Constitution Part I with version bump.

### Implementation traceability

Every program charter **must** include:

```
Program: ORDER-1
Blueprint sections: §3, §5, §7, §9, §10, §13
ADRs: 001, 002, 005, 007, 008 (if accepted)
Exit fitness functions: FF-01 … FF-12
```

### Versioning

- Constitution version: `MAJOR.MINOR` (MAJOR = Authority ratified structural change).
- Current ratification baseline: **1.0.0** (ARCH-1 elevation + §18–29).

---

---

**Template:** [Blueprint-Amendment.md](../templates/Blueprint-Amendment.md)