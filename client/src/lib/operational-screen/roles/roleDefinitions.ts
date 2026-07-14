import type { OperationalDeviceRole } from "../../../../../server/operational-device/domain/deviceRoles";
import { DEVICE_ROLE_LABELS } from "../../../../../server/operational-device/domain/deviceRoles";
import type {
  RoleCapabilityDeclaration,
  RoleLifecycleContext,
  RuntimeRoleDefinition,
} from "./runtimeRoleContract";
import { resolveRoleRuntimeStatus } from "./runtimeRoleState";
import {
  createBlockedRoleLifecycle,
  createOperationalRoleLifecycle,
} from "./roleConfigurationLifecycle";

function kitchenCapabilities(): RoleCapabilityDeclaration {
  return {
    supportsOrders: true,
    supportsTickets: true,
    supportsQueue: false,
    supportsReadyOrders: false,
    supportsDensity: true,
    supportsCategoryFilter: true,
    supportsTimeline: false,
    supportsAnimation: false,
    supportsPrintMonitor: false,
    supportsKioskOrdering: false,
  };
}

function kioskCapabilities(): RoleCapabilityDeclaration {
  return {
    supportsOrders: true,
    supportsTickets: false,
    supportsQueue: false,
    supportsReadyOrders: false,
    supportsDensity: false,
    supportsCategoryFilter: false,
    supportsTimeline: false,
    supportsAnimation: false,
    supportsPrintMonitor: false,
    supportsKioskOrdering: true,
  };
}

function createOperationalRoleDefinition(
  role: OperationalDeviceRole,
  description: { en: string; ar: string }
): RuntimeRoleDefinition {
  const lifecycle = createOperationalRoleLifecycle();

  return {
    metadata: {
      role,
      displayName: DEVICE_ROLE_LABELS[role],
      description,
      operational: true,
      capabilities: kitchenCapabilities(),
      configurationSchemaVersion: "1",
      futurePrograms: ["KITCHEN-CATEGORY-FILTER-1", "KITCHEN-DISPLAY-DENSITY-1"],
    },
    lifecycle,
    resolveRuntimeStatus(bootstrapPhase, _context, reconnecting) {
      return resolveRoleRuntimeStatus(bootstrapPhase, true, reconnecting);
    },
    collectDiagnostics(ctx: RoleLifecycleContext) {
      const configState = lifecycle.getConfigurationState();
      const config = configState.lastConfiguration;
      return {
        presentation: "kitchen_queue",
        configurationApplyCount: configState.configurationApplyCount,
        activeConfiguration: config
          ? {
              language: config.active.language,
              direction: config.active.direction,
            }
          : null,
        trackedConfiguration: config
          ? {
              density: config.tracked.density,
              densityActivated: config.tracked.densityActivated,
              categoryIds: config.tracked.categoryIds,
              categoriesActivated: config.tracked.categoriesActivated,
            }
          : null,
        heartbeatCount: ctx.heartbeatCount,
        reconnectCount: ctx.reconnectCount,
      };
    },
    presentationKey: "kitchen",
  };
}

function createBlockedRoleDefinition(
  role: OperationalDeviceRole,
  description: { en: string; ar: string },
  capabilities: RoleCapabilityDeclaration,
  futurePrograms: string[],
  blockedReason: { en: string; ar: string }
): RuntimeRoleDefinition {
  const lifecycle = createBlockedRoleLifecycle();

  return {
    metadata: {
      role,
      displayName: DEVICE_ROLE_LABELS[role],
      description,
      operational: false,
      capabilities,
      configurationSchemaVersion: "1",
      futurePrograms,
      blockedReason,
    },
    lifecycle,
    resolveRuntimeStatus(bootstrapPhase, _context, reconnecting) {
      return resolveRoleRuntimeStatus(bootstrapPhase, false, reconnecting);
    },
    collectDiagnostics(ctx: RoleLifecycleContext) {
      const configState = lifecycle.getConfigurationState();
      const config = configState.lastConfiguration;
      return {
        blockedReason,
        waitingForPrograms: futurePrograms,
        configurationApplyCount: configState.configurationApplyCount,
        configurationReceived: config != null,
        configurationHealth: config
          ? {
              state: config.configurationState,
              version: config.version,
              validationErrors: config.validationErrors,
            }
          : null,
        heartbeatCount: ctx.heartbeatCount,
      };
    },
    presentationKey: "blocked",
  };
}

export const kitchenDisplayRole = createOperationalRoleDefinition("kitchen_display", {
  en: "Kitchen production queue — tickets and order execution.",
  ar: "طابور إنتاج المطبخ — التذاكر وتنفيذ الطلبات.",
});

export const expoDisplayRole = createOperationalRoleDefinition("expo_display", {
  en: "Expo coordination workspace — final operational review and Ready transition.",
  ar: "مساحة تنسيق الإكسبو — المراجعة التشغيلية النهائية وانتقال الجاهز.",
});

export const pickupDisplayRole = createBlockedRoleDefinition(
  "pickup_display",
  {
    en: "Pickup queue for ready orders.",
    ar: "طابور الاستلام للطلبات الجاهزة.",
  },
  {
    supportsOrders: true,
    supportsTickets: false,
    supportsQueue: true,
    supportsReadyOrders: true,
    supportsDensity: false,
    supportsCategoryFilter: false,
    supportsTimeline: false,
    supportsAnimation: false,
    supportsPrintMonitor: false,
    supportsKioskOrdering: false,
  },
  ["SCREEN-CONFIG-RUNTIME-1"],
  {
    en: "Pickup runtime is registered — customer pickup queue UI activates in a future program.",
    ar: "وقت تشغيل الاستلام مسجّل — واجهة طابور الاستلام تُفعّل في برنامج لاحق.",
  }
);

export const customerDisplayRole = createBlockedRoleDefinition(
  "customer_display",
  {
    en: "Customer-facing order status timeline.",
    ar: "جدول زمني لحالة الطلبات للعملاء.",
  },
  {
    supportsOrders: true,
    supportsTickets: false,
    supportsQueue: false,
    supportsReadyOrders: false,
    supportsDensity: false,
    supportsCategoryFilter: false,
    supportsTimeline: true,
    supportsAnimation: true,
    supportsPrintMonitor: false,
    supportsKioskOrdering: false,
  },
  ["SCREEN-CONFIG-RUNTIME-1"],
  {
    en: "Customer display runtime is registered — timeline and animation activate in a future program.",
    ar: "وقت تشغيل شاشة العملاء مسجّل — الجدول الزمني والرسوم تُفعّل في برنامج لاحق.",
  }
);

export const printMonitorRole = createBlockedRoleDefinition(
  "print_monitor",
  {
    en: "Print queue monitor for production routing.",
    ar: "مراقب طابور الطباعة لتوجيه الإنتاج.",
  },
  {
    supportsOrders: true,
    supportsTickets: false,
    supportsQueue: false,
    supportsReadyOrders: false,
    supportsDensity: false,
    supportsCategoryFilter: false,
    supportsTimeline: false,
    supportsAnimation: false,
    supportsPrintMonitor: true,
    supportsKioskOrdering: false,
  },
  ["SCREEN-CONFIG-RUNTIME-1"],
  {
    en: "Print monitor runtime is registered — print routing UI activates in a future program.",
    ar: "وقت تشغيل مراقب الطباعة مسجّل — واجهة توجيه الطباعة تُفعّل في برنامج لاحق.",
  }
);

/** KIOSK-SCREEN-ACTIVATION-1 — operational role; mounts KioskShell via presentation_kiosk. */
export const selfOrderingKioskRole = ((): RuntimeRoleDefinition => {
  const lifecycle = createOperationalRoleLifecycle();
  const role = "self_ordering_kiosk" as const;
  return {
    metadata: {
      role,
      displayName: DEVICE_ROLE_LABELS[role],
      description: {
        en: "Self-service ordering kiosk.",
        ar: "كiosk الطلب الذاتي.",
      },
      operational: true,
      capabilities: kioskCapabilities(),
      configurationSchemaVersion: "1",
      futurePrograms: ["KIOSK-SCREEN-ACTIVATION-1"],
    },
    lifecycle,
    resolveRuntimeStatus(bootstrapPhase, _context, reconnecting) {
      return resolveRoleRuntimeStatus(bootstrapPhase, true, reconnecting);
    },
    collectDiagnostics(ctx: RoleLifecycleContext) {
      const configState = lifecycle.getConfigurationState();
      const config = configState.lastConfiguration;
      return {
        presentation: "kiosk_shell",
        configurationApplyCount: configState.configurationApplyCount,
        activeConfiguration: config
          ? {
              language: config.active.language,
              direction: config.active.direction,
            }
          : null,
        heartbeatCount: ctx.heartbeatCount,
        reconnectCount: ctx.reconnectCount,
      };
    },
    presentationKey: "kiosk",
  };
})();
