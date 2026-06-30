# PRINTING-1 — Integration Contracts

## Ports (interfaces only)

### `PrintConnectorPort`

```typescript
submit(submission: PrintConnectorSubmission): Promise<void>
```

Submits a job with canonical `PrintPayload`. **PRINTING-1** ships `NoOpPrintConnectorPort` (ops log only).

### `PrintResultPort`

Callback surface for PRINT-CONNECTOR-1:

- `reportPrintingStarted`
- `reportPrintSuccess`
- `reportPrintFailure`

Wired in `printingComposition.ts` as `printResultPort`.

### `PrintStatusPublisher`

Publishes operational events to ops logging (extensible to other transports).

## Order Integration Port

`OrderPrintDispatchPort` (existing) implemented by `OrderPrintDispatchAdapter`.

## Payload Contract

`PrintPayload` — renderer-independent JSON (`schemaVersion: 1`) built by `OrderReadPrintPayloadBuilder` from `order_read_orders` + `order_read_order_line_items`.

No ESC/POS, PDF, templates, or images.

## Workspace Contracts

`PrintWorkspaceActionPort` (server: `printWorkspaceActionContracts.ts`) implemented by `PrintWorkspaceCommandService`.
