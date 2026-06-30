# PRINTING-1 — Workspace Integration

## Server

`printWorkspaceRouter` extended with:

### Read

- `read.listOrders` — unchanged; `order_read_*` only
- `read.getOrderDetail` — enriched with `printJobs[]` from Printing Service
- `read.previewTicket` — returns canonical payload (no rendering)

### Commands

- `commands.printOrder`
- `commands.reprint`
- `commands.markPrinted`
- `commands.cancelPrint`

All commands delegate to `PrintWorkspaceCommandService` → `PrintingService`.

## Client

`PrintWorkspacePanel` uses `usePrintWorkspaceActionPort` (tRPC mutations) instead of `disabledPrintWorkspaceActionPort`.

Buttons:

- **Print / Reprint** — active when order detail loaded
- **Preview** — fetches payload JSON
- **Cancel print** — active when a job is `pending`, `dispatched`, or `printing`

## Architecture Rule

The workspace never calls OS APIs or connector code. It invokes service contracts only.

## Operator Context

Commands attach `operatorUserId` from authenticated session (`ctx.user.id`).
