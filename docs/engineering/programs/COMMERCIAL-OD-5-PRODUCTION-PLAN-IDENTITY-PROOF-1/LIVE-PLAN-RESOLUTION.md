# LIVE-PLAN-RESOLUTION

Production `commercial_plans` (3 rows):

| code | UUID | isHidden |
|------|------|----------|
| basic | `79cf7bf7-c3b6-45de-8f20-42897cd493ac` | false |
| professional | `0ade795a-02fa-4d3e-b9b5-262515bade09` | false |
| enterprise | `d836bd10-9d9f-4408-a076-f921354d785a` | false |

Schema: `id` PRIMARY KEY (unique). `code` unique index `commercial_plans_code_uq` (`NON_UNIQUE = 0`).  
Duplicate codes: **0**. Null/empty codes: **0**.

Resolution:

| Integer | Code | UUID | Rows for that code |
|--------:|------|------|-------------------:|
| 30001 | basic | `79cf7bf7-c3b6-45de-8f20-42897cd493ac` | 1 |
| 30002 | professional | `0ade795a-02fa-4d3e-b9b5-262515bade09` | 1 |
| 30003 | enterprise | `d836bd10-9d9f-4408-a076-f921354d785a` | 1 |

ONE integer → ONE code → ONE UUID.
