# PRINT-GATEWAY-1 — Gateway Registry

---

## ConnectorRegistry

`ConnectorRegistry` manages connector session lifecycle:

- **register** — creates `ConnectorSession` with initial online status and heartbeat timestamp
- **getSession(restaurantId)** — primary lookup for routing (one connector per restaurant in v1)
- **getSessionByInstance(connectorInstanceId)** — instance-scoped lookup
- **unregister** — removes session when connector disconnects permanently

Registration command includes identity, metadata, capabilities, and endpoint. Registration does not execute print I/O.

---

## ConnectorRegistryRepository

Persistence abstraction (`ConnectorRegistryRepository.ts`):

```typescript
interface ConnectorRegistryRepository {
  save(session: ConnectorSession): Promise<void>;
  findByRestaurant(restaurantId: number): Promise<ConnectorSession | null>;
  findByInstance(connectorInstanceId: string): Promise<ConnectorSession | null>;
  listAll(): Promise<ConnectorSession[]>;
  remove(restaurantId: number, connectorInstanceId: string): Promise<boolean>;
}
```

`InMemoryConnectorRegistryRepository` maintains dual indexes by restaurant and instance ID.

---

## ConnectorResolver

Resolves the active connector for print routing:

| Result | Meaning |
|--------|---------|
| `found` | Registered and online (or degraded but routable) |
| `unregistered` | No connector for restaurant |
| `offline` | Heartbeat exceeded offline threshold |
| `degraded` | Heartbeat delayed; still routable in v1 |

Resolver composes registry lookup with `ConnectorHealthService.evaluate()`.

---

## ConnectorDirectory

Read-only facade for operational visibility:

- `listSessions()` — all registered connectors
- `getHealthForRestaurant(restaurantId)` — health snapshot for monitoring/UI (future)
