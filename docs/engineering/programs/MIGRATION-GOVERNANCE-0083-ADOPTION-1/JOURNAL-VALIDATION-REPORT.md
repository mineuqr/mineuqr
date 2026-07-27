# MIGRATION-GOVERNANCE-0083-ADOPTION-1 — Journal Validation Report

| Check | Result |
|-------|--------|
| Entry count | **84** |
| Last tag | `0083_order_ordering_channel` |
| idx contiguous 0…83 | **Pass** (`validateJournalOrdering` empty) |
| `when` monotonic | **Pass** (0083 `when` = 1784690000000 > 0082) |
| SQL file present for every journal tag | **Pass** |
| Non-legacy orphans | **None** |
| Legacy orphans | 9 (documented; unchanged) |

## Journal entry (adopted)

```json
{
  "idx": 83,
  "version": "5",
  "when": 1784690000000,
  "tag": "0083_order_ordering_channel",
  "breakpoints": true
}
```

## Guard output

```
Journal entries: 84
Last journal tag: 0083_order_ordering_channel
✓ Journal ↔ SQL lineage consistent (canonical migrations 0000–0083).
[governance-guard] OK
```
