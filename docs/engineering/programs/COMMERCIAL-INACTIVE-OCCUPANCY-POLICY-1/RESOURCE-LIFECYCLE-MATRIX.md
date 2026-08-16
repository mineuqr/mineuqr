# RESOURCE LIFECYCLE MATRIX

**Program:** COMMERCIAL-INACTIVE-OCCUPANCY-POLICY-1  

| RESOURCE | LIMIT KEY | OCCUPANCY QUERY | ACTIVE | INACTIVE / DISABLED | REPLACED | ARCHIVED | DELETE | RESTORE / REACTIVATE | CREATE | REPLACE |
|----------|-----------|-----------------|--------|---------------------|----------|----------|--------|----------------------|--------|---------|
| restaurants | restaurants | all owner rows | `isActive=true` | `isActive=false` **occupies** | n/a | none | cascade hard delete **releases** | flag flip **no COUNT change** | occupancy helper +1 | n/a |
| categories | categories | all restaurant rows | `isActive=true` | `isActive=false` **occupies** | n/a | none | hard delete **releases** | flag flip **no COUNT change** | occupancy helper +1 | n/a |
| menu items | items | all restaurant rows | `isAvailable=true` | `isAvailable=false` **occupies** | n/a | none | hard delete **releases** | flag flip **no COUNT change** | occupancy helper +1 | n/a |
| POS terminals | posTerminals | provisioned only | `registered`/`active` occupy | `deactivated` **does not occupy** | `replaced` **does not occupy** | none | no API | deactivated→active **consumes** via helper | register consumes | provisioned: delta 0 |
| staff / branches | matrix keys | no COUNT path | n/a | n/a | n/a | n/a | n/a | n/a | not occupancy | n/a |
| devices / screens | feature `devices` | not quantity occupancy | n/a | n/a | n/a | n/a | n/a | n/a | requireFeature | n/a |

Soft-deleted rows: **none** for these tables.
