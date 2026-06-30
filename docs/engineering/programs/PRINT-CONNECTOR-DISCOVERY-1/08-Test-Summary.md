# PRINT-CONNECTOR-DISCOVERY-1 — Test Summary

---

## New tests

| Test | Coverage |
|------|----------|
| `WindowsGatewayDiscoveryIntegration.test.ts` | End-to-end gateway → RLC discovery |
| `PrintWorkspaceDiscoveryReadService.test.ts` | Workspace DTO projection |
| `discovery.architecture.guards.test.ts` | Regression guards |

---

## Validation commands

```bash
npm run check
npx vitest run
```

---

## Scenarios validated

- Discovery routes through gateway when RLC connected
- Connector offline returns structured failure
- Embedded discovery router removed
- Client uses distributed workspace API
