# PRINT-PRODUCTION-VALIDATION-1 — Hardware Inventory

## Physical Hardware — Not Recorded

This certification run did **not** attach or exercise physical printers. Complete this section during the physical validation session.

## Inventory Template

| Field | Record |
|-------|--------|
| Restaurant ID | _TBD_ |
| Printer make/model | _TBD_ |
| Paper width | ☐ 58mm ☐ 80mm ☐ Other: ___ |
| Transport | ☐ USB ☐ Wi-Fi ☐ Ethernet ☐ Bluetooth |
| OS hosting API + printer | ☐ Windows ☐ macOS ☐ Linux |
| API deployment | ☐ Same machine as printer ☐ Remote (blocks embedded) |

## Software Inventory (From Codebase)

| Component | Version / Reference |
|-----------|---------------------|
| Printing Service migrations | `0047_printing_service.sql` |
| Connector selection migration | `0048_print_connector.sql` |
| Order read projections | `0046_order_read_projections.sql` |
| Deployment default | `embedded` |
| Payload format | Plain structured text (not ESC/POS/PDF) |

## Known Topology Constraint

**Critical for physical validation:** Embedded `DeploymentRuntime` discovers printers on the **API host OS**. A cloud-only API without a local print path cannot reach USB/local network printers unless a future `local_desktop` or `edge` runtime is deployed.
