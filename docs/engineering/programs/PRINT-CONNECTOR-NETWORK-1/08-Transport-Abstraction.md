# PRINT-CONNECTOR-NETWORK-1 — Transport Abstraction

---

## Design Principle

Business layers **never** depend on concrete wire protocols. Transport is replaceable behind `ConnectorTransportPort`.

---

## Ports

| Port | Role |
|------|------|
| `ConnectorTransportConnection` | Duplex cloud-side connection (send outbound, receive inbound) |
| `ConnectorTransportRegistry` | Track, bind, and lookup live connections |
| `TransportInboundMessage` | `auth`, `register`, `heartbeat`, `response` |
| `TransportOutboundMessage` | `auth_result`, `register_result`, `heartbeat_result`, `command` |

---

## Explicit Non-Implementation

This program does **not** ship:

- WebSocket server
- HTTP/2 handler
- gRPC service
- Named pipe listener

Those are future transport adapters implementing `ConnectorTransportConnection`.

---

## Test Transport

`InProcessConnectorTransport` provides in-memory duplex pairs for protocol validation without network I/O.

---

## RLC Initiation Model

Cloud calls `acceptConnection(connection)` when RLC opens an outbound transport. Cloud never dials restaurant networks.
