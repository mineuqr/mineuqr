# Reporting Object Model Specification

| Field | Value |
|-------|-------|
| **Program** | REPORTING-UX-CONSTITUTION-EXTENSION-1 |
| **Constitution** | OBJ-01…OBJ-04 |
| **Normative text** | [`Reporting-Object-Model-and-KPI-Lifecycle-Constitution-v1.0.md`](../../../architecture/constitution/Reporting-Object-Model-and-KPI-Lifecycle-Constitution-v1.0.md) |
| **Date** | 2026-07-27 |

## Object catalog

| Object | Rule | Owns data? | Defines calculation? | Source of Truth? |
|--------|------|------------|----------------------|------------------|
| KPI | OBJ-01 | No (references canonical source) | Yes (one method in dictionary) | No — points to canonical source |
| Widget | OBJ-02 | No | No | No |
| Analytics | OBJ-03 | No | No | No — groups KPIs only |
| Dashboard Card | OBJ-04 | No | No | No |

## Relationship chain (normative)

```
Business Event → Canonical Source → KPI → Widget → Dashboard Card → Dashboard → Export (Excel / PDF)
```

## Classification guide

| Question | If yes → |
|----------|----------|
| Has `KpiId` + definition + owner + source + formula? | **KPI** |
| Composes presentation of KPI(s) without owning truth? | **Widget** |
| Named area grouping related KPIs for a broader question? | **Analytics** |
| Single UI tile showing one KPI or Widget? | **Dashboard Card** |

## Boundary examples

| Concept | Classification | Rationale |
|---------|----------------|-----------|
| Total Sales (`revenue`) | KPI | Dictionary entry; Settlement Record SoT |
| Payment Overview | Widget → Card | Presentation tender total; no `KpiId` |
| Sales Analytics | Analytics | Groups operational KPIs / trends |
| RestaurantKpiCard for Total Sales | Dashboard Card | Renders one KPI |
| Excel Executive sheet | Export surface | Same KPI semantics as Dashboard |

## Anti-patterns (Architecture Violations)

- Treating a Widget as a KPI without dictionary elevation  
- Defining formulas inside a Widget or Card  
- Analytics “owning” a KPI (ownership stays with KPI owner)  
- Export inventing a second definition of the same Business Name  
- Skipping layers (e.g. Dashboard Card reading raw DB without KPI / service path)
