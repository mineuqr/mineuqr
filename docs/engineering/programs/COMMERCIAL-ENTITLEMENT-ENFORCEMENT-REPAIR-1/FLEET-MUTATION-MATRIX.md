# FLEET-MUTATION-MATRIX.md

| Operation | Required capability | Before | Repair |
|-----------|---------------------|--------|--------|
| management.create | `devices` | Restaurant access only | Enforced |
| management.disable | `devices` | Restaurant access only | Enforced |
| management.enable | `devices` | Restaurant access only | Enforced |
| management.rotateToken | `devices` | Restaurant access only | Enforced |
| management.regenerateCredential | `devices` | Restaurant access only | Enforced |
| management.deleteScreen | `devices` | Restaurant access only | Enforced |
| management.revokeToken | `devices` | Restaurant access only | Enforced |
| management.updateScreenSettings | `devices` | Restaurant access only | Enforced |
| management.list | `devices` | Restaurant access only | Enforced |
| management.get | `devices` | Restaurant access only | Enforced |
| management.getScreenCredential | `devices` | Restaurant access only | Enforced |
| management.getHealthSummary | `devices` | Restaurant access only | Enforced |
| fleet.queryScreens | `devices` | Restaurant access only | Enforced |
| fleet.getKpis | `devices` | Restaurant access only | Enforced |
| fleet.getObservability | `devices` | Restaurant access only | Enforced |
| runtime.* | Device token / role | Unchanged | **Outside** `devices` boundary |

Intentional non-`devices` operations: already-issued screen runtime (kitchen queue, heartbeat, pairing redeem). Those use device credentials, not commercial fleet management.
