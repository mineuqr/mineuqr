# Architecture Decision Hierarchy

> **Constitution §18** · [Architecture Constitution v1.0](./Architecture-Constitution-v1.0.md)
> **Diagram source:** [architecture-overview.mmd](../diagrams/architecture-overview.mmd)

# 18. Architecture Decision Hierarchy

### Official authority stack

```
Architecture Vision          (Constitution §1 — immutable intent)
        ↓
Architecture Principles      (Constitution §1 — P1–P7)
        ↓
Architecture Governance    (Constitution §18–28, ADR-ARCH-013)
        ↓
ADRs                         (ADR-ARCH-001 … n)
        ↓
Architecture Blueprint     (Constitution Part I §1–17)
        ↓
Implementation Programs    (ORDER-1, ORDER-EVENTS-1, …)
        ↓
Code                         (Repository)
```

### Precedence rules

1. **Higher layers always win.** If code contradicts an ADR, the code is non-compliant until fixed or the ADR is superseded through governance (§26).
2. **ADRs interpret principles** for specific decisions. They do not override Vision or Principles.
3. **The Blueprint operationalizes ADRs** into aggregate design, policies, events, and paths. Programs implement Blueprint sections; they do not redefine them silently.
4. **Implementation Programs** are time-bounded execution vehicles. They must cite Blueprint sections and ADRs (§28). They never create parallel architecture.
5. **Code is the lowest authority.** Convenience, deadlines, or local optimization do not override constitutional layers.

### Conflict resolution

| Situation | Resolution |
|---|---|
| Code vs Blueprint | Code is wrong unless Blueprint change is approved (§27) |
| Blueprint vs ADR | Blueprint must align with ADR; amend Blueprint or supersede ADR |
| ADR vs Principle | ADR is wrong; reject or supersede ADR |
| Two ADRs conflict | Later superseding ADR wins; both marked in registry |
| Program scope vs Constitution | Narrow program scope; do not expand Order to absorb foreign concerns (§25) |
| Emergency production fix | Allowed under **Architecture Exception Process** (§28.4); must produce follow-up ADR or revert within defined window |

### Authority

| Layer | Approver |
|---|---|
| Vision, Principles, Constitution | Architecture Authority |
| ADRs (Accept/Reject/Supersede) | Architecture Authority |
| Blueprint amendments | Architecture Authority |
| Implementation Programs (charter) | Architecture Authority + Engineering Lead |
| Code merge | Engineering (subject to compliance §28) |

**Constitutional rule:** *No implementation may contradict a higher layer.*

---

---

**Related:** [Governance](./Governance.md) · [ADR Lifecycle](../governance/ADR-Lifecycle.md) · [ADR Registry](./ADR-Registry.md)