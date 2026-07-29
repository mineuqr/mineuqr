/**
 * DEVICE-MANAGEMENT-PLATFORM-ARCHITECTURE-2
 * Devices dashboard — hosted on existing Platform Ops /devices path.
 */

export const DEVICE_DASHBOARD_SECTIONS = [
  "overview",
  "inventory",
  "health",
  "connectivity",
  "provisioning",
  "assignments",
  "versions",
  "diagnostics",
  "updates",
  "certificates",
] as const;

export type DeviceDashboardSectionId =
  (typeof DEVICE_DASHBOARD_SECTIONS)[number];

export type DeviceDashboardSectionArchitecture = {
  id: DeviceDashboardSectionId;
  title: string;
  maturity: "architecture" | "reserved";
  hostPath: "/admin/platform/devices";
  uiFoundation: "platform-ops-ui";
};

export const DEVICE_DASHBOARD_ARCHITECTURE: readonly DeviceDashboardSectionArchitecture[] =
  [
    {
      id: "overview",
      title: "Overview",
      maturity: "architecture",
      hostPath: "/admin/platform/devices",
      uiFoundation: "platform-ops-ui",
    },
    {
      id: "inventory",
      title: "Inventory",
      maturity: "architecture",
      hostPath: "/admin/platform/devices",
      uiFoundation: "platform-ops-ui",
    },
    {
      id: "health",
      title: "Health",
      maturity: "architecture",
      hostPath: "/admin/platform/devices",
      uiFoundation: "platform-ops-ui",
    },
    {
      id: "connectivity",
      title: "Connectivity",
      maturity: "architecture",
      hostPath: "/admin/platform/devices",
      uiFoundation: "platform-ops-ui",
    },
    {
      id: "provisioning",
      title: "Provisioning",
      maturity: "reserved",
      hostPath: "/admin/platform/devices",
      uiFoundation: "platform-ops-ui",
    },
    {
      id: "assignments",
      title: "Assignments",
      maturity: "architecture",
      hostPath: "/admin/platform/devices",
      uiFoundation: "platform-ops-ui",
    },
    {
      id: "versions",
      title: "Versions",
      maturity: "architecture",
      hostPath: "/admin/platform/devices",
      uiFoundation: "platform-ops-ui",
    },
    {
      id: "diagnostics",
      title: "Diagnostics",
      maturity: "architecture",
      hostPath: "/admin/platform/devices",
      uiFoundation: "platform-ops-ui",
    },
    {
      id: "updates",
      title: "Updates",
      maturity: "reserved",
      hostPath: "/admin/platform/devices",
      uiFoundation: "platform-ops-ui",
    },
    {
      id: "certificates",
      title: "Certificates",
      maturity: "reserved",
      hostPath: "/admin/platform/devices",
      uiFoundation: "platform-ops-ui",
    },
  ] as const;

export const DEVICE_DASHBOARD_HOST_PATH = "/admin/platform/devices" as const;
