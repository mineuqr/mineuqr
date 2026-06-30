# PRINT-CONNECTOR-LOCAL-1 — Composition

---

## Composition Root

`server/connector-local/connectorLocalComposition.ts`

```typescript
composeConnectorLocal({
  transportFactory: GatewayTransportFactory,  // required
  configProvider?: LocalConnectorConfigProvider,
  commandHandler?: ConnectorCommandHandler,
  reconnectPolicy?: ConnectorReconnectPolicy,
})
```

---

## Deployment Isolation

- All RLC wiring terminates in `connectorLocalComposition.ts`
- No changes to `printingComposition.ts`, `PrintingService`, or `PrintConnectorPort`
- Gateway/session modules consumed via **contracts only** — not modified

---

## Integration Test Pattern

`wireTestRlc()` pairs `composeConnectorNetwork()` with in-process transport and `composeConnectorLocal()` for end-to-end bootstrap validation without wire protocol.
