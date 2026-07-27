# Architecture Review Board (ARB)

| Field | Value |
|-------|-------|
| **Program** | ARCHITECTURE-GOVERNANCE-OPERATIONS-1 |
| **Type** | Architecture Ops |
| **Date** | 2026-07-27 |
| **Normative anchors** | [Architecture-Review-Process.md](../governance/Architecture-Review-Process.md) · Authority Model |

## Purpose

Repeatable board process for contested or high-impact architecture decisions.

## Meeting cadence

| Cadence | Use |
|---------|-----|
| **Scheduled** | Bi-weekly (or as Authority sets) for backlog of Proposed ADRs / Pending constitutions / certifications |
| **Triggered** | Within 5 business days of a review trigger |
| **Async** | Default for uncontested items; sync when contested |

## Review triggers

- ADR Proposed that changes ownership, boundaries, or Business Law encoding  
- Constitution Pending Review (Major or new)  
- Production Certification for architecture-impacting programs  
- Cross-domain conflict (CD-04)  
- Exception extension beyond initial window  
- Annual Architecture Review prep items  

## Required participants

| Role | Required? |
|------|-----------|
| Architecture Authority (or delegate with recorded proxy) | Yes for binding vote |
| TDA | Yes for architecture-impacting |
| Domain Architect(s) for touched domains | Yes |
| Program Owner (if program under review) | Yes |
| Technical Reviewers | As assigned |
| Security / Identity (when CD-03 Security/Identity touched) | As needed |

## Decision recording

Every ARB decision MUST record: date · attendees · artifact IDs · options considered · decision · vote tally · dissent · follow-ups · link to ADR/constitution/cert record.

## Voting

- Recommendation vote of ARB members present  
- Binding adoption remains with **Architecture Authority** (Authority Model)  
- Quorum: Authority (or proxy) + TDA + ≥1 Domain Architect for affected domain  

## Tie resolution

ARB recommendation ties → Architecture Authority decides.  
If Authority absent → defer; no silent “pass.”

## Escalation

ARB cannot resolve → escalate per Authority Model to Architecture Authority with conflict brief (CD-04 stack applied).
