# CREATE RACES

## Setup

TiDB `mineuqr-stagIn` via `G07_DATABASE_URL`. Independent pools `db` and `dbB`. Occupancy verified with `SELECT COUNT(*)` on domain tables (`restaurants`, `categories`, `menu_items`) for synthetic owners `980801801`–`980801803`.

StagIn `restaurants` lacks later columns (`taxEnabled`). Inserts used raw SQL `(userId, slug, nameAr)` on the occupancy connection so COUNT remains the real table. No schema migration.

## Last slot (cap = 2, occupancy = 1)

| Resource | Fulfilled | Limit exceeded | Final COUNT | Cap |
|----------|-----------|----------------|-------------|-----|
| restaurants | 1 | 1 | 2 | 2 |
| categories | 1 | 1 | 2 | 2 |
| items | 1 | 1 | 2 | 2 |

Two OS processes (tsx workers, separate pools): 1 success (`COMMERCIAL_LIMIT_EXCEEDED` loser), COUNT=2.

## At cap (occupancy = cap = 1)

Three concurrent restaurant creates: fulfilled 0, exceeded 3, COUNT=1. No extra row.

## Verdict

**A. PASS.** G-07 serialization is used correctly on domain COUNT+INSERT. Occupancy never exceeded cap.
