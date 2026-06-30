# PRINT-CONNECTOR-ARCH-1 — Deployment Architecture

## Objective

Separate **business architecture** from **deployment architecture** without changing production behavior.

## Before

```
Printing Service → PrintConnectorPort → Connector Runtime → Platform Adapter → Transport → OS
```

## After

```
Printing Service → PrintConnectorPort → Connector Runtime → Deployment Runtime → Platform Adapter → Transport → OS
```

## Principle

Where the connector executes (API process, desktop host, edge node, Android device) is an **implementation detail**. Business code never branches on deployment location.

## Default

`embedded` — connector runs in-process with the API server (unchanged production path).

## Configuration

Optional override via environment (composition root only):

```
PRINT_CONNECTOR_DEPLOYMENT=embedded|local_desktop|android|edge|future
```

Unset or invalid values default to `embedded`.
