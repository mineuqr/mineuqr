# Breaking Change & Compatibility Guide

| Field | Value |
|-------|-------|
| **Program** | ARCHITECTURE-CONSTITUTION-VERSIONING-1 |
| **Constitution** | CV-02 · CV-03 · CV-05 |
| **Date** | 2026-07-27 |

## What counts as breaking (Major)

| Change | Major? |
|--------|--------|
| Repeal or invert a binding rule | Yes |
| Change Approval Authority | Yes |
| Change ownership / Truth Layer meaning | Yes |
| Change certification fail conditions in a way that invalidates prior certs without migration | Yes |
| Add clarifying example | No — Minor |
| Fix typo | No — Patch |
| Add non-binding guidance appendix | Usually Minor |

## Required process (CV-03)

1. Draft ADR stating break, impact, migration  
2. Architecture Review  
3. Architecture Authority Approval  
4. Publish new Major version with CV-01 + CV-05 block  
5. Prior version → Deprecated (not deleted)  
6. Update Constitution Registry  

## CV-05 block template (required on successor)

```markdown
## Compatibility & Migration (CV-05)

- **Compatibility:** [compatible / breaking]
- **Replaces:** [Unique Name Version]
- **Migration:** [steps for programs / registries / mirrors]
- **Affected domains:** [list]
```

## Compatibility with Reporting Enforcement

GOV-11…16 continue to enforce Reporting rules. Version bumps of Reporting constitutions must still pass Mirror Integrity — Operational Mirrors update only after governance adoption of the new version (never the reverse).
