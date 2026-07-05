import type {
  RoleLifecycleContext,
  RoleLifecycleHandlers,
  RuntimeRoleDefinition,
} from "./runtimeRoleContract";

/** No-op lifecycle handlers — lifecycle still executes for every role. */
export const blockedRoleLifecycle: RoleLifecycleHandlers = {
  initialize() {},
  mount() {},
  activate() {},
  deactivate() {},
  dispose() {},
  handleConfiguration() {},
  handleHeartbeat() {},
  handleReconnect() {},
};

export function invokeLifecycle(
  handlers: RoleLifecycleHandlers,
  method: keyof RoleLifecycleHandlers,
  ctx: RoleLifecycleContext,
  ...args: unknown[]
): void {
  const fn = handlers[method] as (...params: unknown[]) => void;
  fn(ctx, ...args);
}

export function buildLifecycleContext(
  definition: RuntimeRoleDefinition,
  platform: {
    context: RoleLifecycleContext["context"];
    bootstrapPhase: RoleLifecycleContext["bootstrapPhase"];
    heartbeatCount: number;
    reconnectCount: number;
    reconnecting: boolean;
  }
): RoleLifecycleContext {
  const runtimeStatus = definition.resolveRuntimeStatus(
    platform.bootstrapPhase,
    platform.context,
    platform.reconnecting
  );
  return {
    context: platform.context,
    bootstrapPhase: platform.bootstrapPhase,
    runtimeStatus,
    heartbeatCount: platform.heartbeatCount,
    reconnectCount: platform.reconnectCount,
  };
}
