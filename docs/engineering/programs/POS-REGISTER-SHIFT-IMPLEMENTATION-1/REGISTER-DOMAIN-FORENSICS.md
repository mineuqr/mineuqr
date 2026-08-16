# REGISTER DOMAIN FORENSICS

**Canonical entity:** `CashRegister` (`shared/crmp/register/registerContract.ts`)

**Identity:** `crmp_registers.registerId` — deterministic `reg_{restaurantId}_{code}`

**Two planes (ADR-ARCH-030):**

- Catalog: `provisioned | active | inactive`
- Duty: `closed | open | suspended`

**Lifecycle owner:** `RegisterDomainService` (`open`, `close`, `suspend`, `resume`, operator assign, device attach)

**Not Device. Not money owner. Not POS Terminal.**

`registerType` includes `mobile_pos`. That is a Register catalog type, not a POS Terminal.

Optional `deviceId` on the Register may reference an Operational Device. POS Terminal `optionalDeviceId` is a separate association that Settlement Context can use for device→register discovery.
