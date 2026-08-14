# BOOTSTRAP-VALIDATION.md

Command: `pnpm exec tsx scripts/bootstrap-persistent-commercial-catalog.mts`  
Path: Discovery → Commercial Projection → Presentation overlay (`projectionFeatureKeysForBridgePlan`).  
No versions, snapshots, publications, retirements, or commercial bindings created.

The approved CLI already invokes bootstrap twice in one process. Phase 14 invoked the CLI a second time.

## First CLI run (Phase 3)

| Pass | bootstrapped | reason | livePlans | prices | capability mappings |
|------|--------------|--------|-----------|--------|---------------------|
| first | true | `bootstrapped` | 3 | 10 | 35 |
| second | false | `already_initialized` (source `db`) | 3 | 10 | 35 |

## Second CLI run (Phase 14)

| Pass | bootstrapped | reason | livePlans | prices | capability mappings |
|------|--------------|--------|-----------|--------|---------------------|
| first | false | `already_initialized` | 3 | 10 | 35 |
| second | false | `already_initialized` | 3 | 10 | 35 |

No duplicates.

## Exact three Live Plans

| code | name | id |
|------|------|----|
| `basic` | Basic | `79cf7bf7-c3b6-45de-8f20-42897cd493ac` |
| `professional` | Professional | `0ade795a-02fa-4d3e-b9b5-262515bade09` |
| `enterprise` | Enterprise | `d836bd10-9d9f-4408-a076-f921354d785a` |

Standard-plan count: **3**. Hidden: none. Bindings: **0**.
