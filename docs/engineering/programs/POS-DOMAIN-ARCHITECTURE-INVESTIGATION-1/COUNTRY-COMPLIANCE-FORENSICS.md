# COUNTRY COMPLIANCE FORENSICS

No `ZATCA` / `zatca` / Saudi e-invoicing implementation was found in TypeScript or docs search.

Tax today:

- Restaurant `taxEnabled` / `taxMode` / `taxPolicyJson` (`restaurants` in `drizzle/schema.ts`)
- Frozen onto Check as `taxPolicySnapshotJson` / `taxBreakdownJson`
- Default currency snapshot parse uses SAR as fallback (`checkMapper.ts`) — **Check/tax snapshot**, not POS core
- Commercial catalog regions have `countryCode` / `taxPolicyRef`

Legal document identity: ADR-ARCH-027 (operational document identity). Channel sequence ≠ invoice number.

**POS core can remain country-neutral.** Country adapters sit after Check → Settlement → Invoice/Receipt. Do not add Saudi conditionals to a future POS domain.

**READY** for a boundary contract. ZATCA is a future Country Compliance program.
