# CACHE AND REALTIME DESIGN

**Program:** POS-READ-APIS-IMPLEMENTATION-1  
Do not invent a second invalidation system. Read ≠ event delivery.

## Server

POS read procedures are **stateless queries**. No server response cache. Projection freshness is whatever Order Read / Settlement projection already guarantee (`generatedAt`, schema versions, projection revision).

Financial settlement state is as fresh as the Order Settlement projection store. POS must not add a TTL that outlives that store.

## Client (current)

There is **no POS cashier UI** in this program (Phase E deferred).

Existing Orders Workspace (owner/admin) already:

- queries `order.read.listActive` with `staleTime: 0`
- invalidates on Realtime Platform `orders` hints (`useOrdersWorkspaceRealtime`)
- uses `queryStructuralSharing` (TDA-008 is FIX_LATER on that helper; POS does not change it)

When a POS client is adopted later it should:

- use `pos.read.orders.*` query keys, **or** share invalidation only if the same restaurant projection is the source
- subscribe to Realtime `orders` the same way, not add a second EventSource
- **not** poll if realtime is the canonical hint path, except documented recovery cadence already used by Orders Workspace

## Kitchen / device screens

Kitchen queue polling/realtime remains `operationalDevice.runtime.getKitchenQueue` + kitchen read freshness. POS read APIs must not become kitchen transport.

## Catalog

Menu availability is not on the `orders` realtime channel. A future POS sale UI may refetch catalog on focus or after menu admin mutations. Do not piggyback catalog on order SSE.

## Settlement

No POS polling loop. Refetch after POS settlement **mutations** (existing write program) using the same pattern as other POS commands: invalidate the read query on mutation success (client, later).
