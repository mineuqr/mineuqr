# CAPABILITY-GOVERNANCE.md

## Canonical identity (CE-01)

Required fields:

| Field | Example (`devices`) |
|-------|---------------------|
| Canonical key | `devices` |
| Capability identity | `cap.device.management` |
| EN / AR names | Devices & Screens / الأجهزة والشاشات |
| Owning domain | Operational device / Screen Management |
| Required entitlement | `devices` |
| Affected operations | management + fleet (not runtime) |

Do not create `screenManagement` / `deviceManagement` aliases.

## Definition of Done (CE-26)

1. Canonical identity  
2. Projection mapping  
3. Live Plan composition  
4. Entitlement resolution  
5. Server enforcement  
6. UI presentation  
7. Negative tests  
8. Positive tests  
9. Expired / Frozen analysis  
10. Regression  
11. Documentation  

## Change DoD (CE-27)

Live Plan add/remove of a capability MUST verify runtime, UI, server, positive/negative paths, cache isolation, existing customers, and owner simulation. No customer rebind.
