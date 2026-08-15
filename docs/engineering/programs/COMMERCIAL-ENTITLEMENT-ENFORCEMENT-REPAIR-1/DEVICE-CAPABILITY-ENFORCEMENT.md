# DEVICE-CAPABILITY-ENFORCEMENT.md

Canonical capability: **`devices`** / `cap.device.management` (CAP-29 + CAP-30).

`kitchen` remains Kitchen Display runtime. It is not the fleet-create gate.

| Surface | Requires `devices`? |
|---------|---------------------|
| management.create / disable / enable / rotate / regenerate / delete / revoke / update settings | Yes |
| management.list / get / getScreenCredential / getHealthSummary | Yes — management surface |
| fleet.queryScreens / getKpis / getObservability | Yes — operator fleet reads |
| runtime.authenticate / heartbeat / kitchen queue / pairing redeem | No — issued-device runtime |

Registry overlay: `devices` is now `runtimeEnforced: "full"` alongside `ordering`.
