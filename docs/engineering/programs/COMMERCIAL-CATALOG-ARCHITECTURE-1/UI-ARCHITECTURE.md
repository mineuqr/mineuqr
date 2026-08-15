# UI-ARCHITECTURE.md

UI may present capabilities, limits, usage, upgrade paths, unavailable/Frozen states, and Checkout.

UI must not be the commercial enforcement boundary (ADR-ARCH-006, CE-08).

| Surface | May show | Must not decide |
|---------|----------|-----------------|
| Pricing | Live Plan name, **list** price, capabilities, **limits** (recommended), trial, current plan | Charge amount (server Checkout); entitlement |
| Plan Editor | Current persisted composition | Runtime grant |
| Dashboard | Hub `hasFeature` + Frozen redirect | Mutation allow |
| Owner | Mode + Simulation — No Charge | Billing |

Pricing communicates Capability / Limit / Price / Availability from the **same Live Plan read model**. It must not invent a second matrix. Displayed price is **list price**; until checkout cutover, charge may differ — that difference is a known defect, not a second catalog.
