/**
 * Default audit persistence no-op for unit tests (opsLog-only assertions).
 * PR-5 auditEmitter tests override via setAuditPersistFnForTests.
 */
import { vi } from "vitest";

vi.mock("./server/audit/auditRepository", () => ({
  insertAuditEvent: vi.fn().mockResolvedValue({ id: 1 }),
}));
