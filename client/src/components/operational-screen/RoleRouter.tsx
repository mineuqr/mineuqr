import { screenTypeLabel } from "@/lib/operational-screen/screenLabels";
import { isBlockedRole } from "@/lib/operational-screen/runtimeCapabilities";
import { useRuntimeContext } from "./OperationalScreenRuntimeProvider";
import { BlockedRuntimeScreen } from "./BlockedRuntimeScreen";
import { KitchenScreenPanel } from "./KitchenScreenPanel";
import { PrintMonitorScreenPanel } from "./PrintMonitorScreenPanel";

export function RoleRouter() {
  const context = useRuntimeContext();
  const { role } = context.identity;
  const language = context.presentation.language;

  if (isBlockedRole(role)) {
    return <BlockedRuntimeScreen />;
  }

  if (context.capabilities.server.canAccessKitchenQueue) {
    return <KitchenScreenPanel />;
  }

  if (context.capabilities.server.canAccessPrintMonitor) {
    return <PrintMonitorScreenPanel />;
  }

  return (
    <BlockedRuntimeScreen
      message={
        language === "ar"
          ? `لا يتوفر وقت تشغيل لنوع الشاشة ${screenTypeLabel(role, language)}`
          : `Runtime not available for ${screenTypeLabel(role, language)}`
      }
    />
  );
}
