# Dependency Report

| Rule | Implementation |
|------|----------------|
| Table ordering ⇒ Financial Settlement | `applyCommercialPresentationRules`: if `ordering` then all settlement Projection keys = true |
| Kitchen / Kiosk / Waiter (/ Expo) ⇒ Devices | Same helper sets `devices=true` |
| Settlement children nested | Dependent presentation rows `commercialVisible=false`; details on `financialSettlement` card |
| Devices not marketed | `dependencyDriven` + not commercialVisible |

No ownership / Discovery dependency changes.
