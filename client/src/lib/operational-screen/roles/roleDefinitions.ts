import type { OperationalDeviceRole } from "../../../../../server/operational-device/domain/deviceRoles";
import { DEVICE_ROLE_LABELS } from "../../../../../server/operational-device/domain/deviceRoles";
import type {
  RoleCapabilityDeclaration,
  RoleLifecycleContext,
  RuntimeRoleDefinition,
} from "./runtimeRoleContract";
import { resolveRoleRuntimeStatus } from "./runtimeRoleState";
import { blockedRoleLifecycle } from "./runtimeRoleLifecycle";

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
  };
}

function createOperationalRoleDefinition(
  role: OperationalDeviceRole,
  description: { en: string; ar: string }
): RuntimeRoleDefinition {
  return {
    metadata: {
      role,
      displayName: DEVICE_ROLE_LABELS[role],
      description,
      operational: true,
      capabilities: kitchenCapabilities(),
      configurationSchemaVersion: "1",
      futurePrograms: [
        "SCREEN-CONFIG-RUNTIME-1",
        "KITCHEN-CATEGORY-FILTER-1",
        "KITCHEN-DISPLAY-DENSITY-1",
      ],
    },
    lifecycle: blockedRoleLifecycle,
    resolveRuntimeStatus(bootstrapPhase, _context, reconnecting) {
      return resolveRoleRuntimeStatus(bootstrapPhase, true, reconnecting);
    },
    collectDiagnostics(ctx: RoleLifecycleContext) {
      return {
        presentation: "kitchen_queue",
        configAdvertised: {
          supportsDensity: true,
          supportsCategoryFilter: true,
        },
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
    lifecycle: blockedRoleLifecycle,
    resolveRuntimeStatus(bootstrapPhase, _context, reconnecting) {
      return resolveRoleRuntimeStatus(bootstrapPhase, false, reconnecting);
    },
    collectDiagnostics(ctx: RoleLifecycleContext) {
      return {
        blockedReason,
        waitingForPrograms: futurePrograms,
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
  en: "Expo assembly queue — ready tickets and handoff coordination.",
  ar: "طابور التجهيز — التذاكر الجاهزة وتنسيق التسليم.",
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
  },
  ["SCREEN-CONFIG-RUNTIME-1"],
  {
    en: "Print monitor runtime is registered — print routing UI activates in a future program.",
    ar: "وقت تشغيل مراقب الطباعة مسجّل — واجهة توجيه الطباعة تُفعّل في برنامج لاحق.",
  }
);

export const selfOrderingKioskRole = createBlockedRoleDefinition(
  "self_ordering_kiosk",
  {
    en: "Self-service ordering kiosk.",
    ar: "كiosk الطلب الذاتي.",
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
    supportsPrintMonitor: false,
  },
  ["SCREEN-CONFIG-RUNTIME-1"],
  {
    en: "Self ordering runtime is registered — kiosk ordering UI activates in a future program.",
    ar: "وقت تشغيل الطلب الذاتي مسجّل — واجهة الكiosk تُفعّل في برنامج لاحق.",
  }
);
