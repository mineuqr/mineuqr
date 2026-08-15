# PUBLIC VS MANAGEMENT CONTRACT

Disabling a **management** capability does **not** disable public render or public resolution unless another architecture (FROZEN, `ordering`) already does.

| Capability | MANAGEMENT | Owner READ | PUBLIC RENDER | PUBLIC RESOLUTION | MUTATION |
|------------|------------|------------|---------------|-------------------|----------|
| `sessionTableManagement` | Owner timeline/workspace | Gated | N/A | Guest `getActiveByTable` / `getByToken` **not gated** | `markPaid` / `markComplimentary` / `close` gated |
| `menuManagement` | Category / item / offer editor | Editor reads gated | Public menu **not gated** | Public menu GET **not gated** | Catalog writes gated |
| `menuDesign` | Template / colors / fonts / branding writes | Editor reads of design settings: gated if editor-only | Public menu uses **stored** design **not gated** | Same | Design writes gated |
| `smartQr` | Table/QR CRUD + QR dashboard | Table list gated | Public menu **not gated** | Public QR resolve **not gated** | Table writes gated |

## Rule

**Capability OFF = cannot manage. Existing public artifacts keep serving.**

FROZEN may still suspend public menu/order. That is lifecycle, not these four keys.
