/**
 * DEVICE-MANAGEMENT-PLATFORM-ARCHITECTURE-2
 * Assignment targets — architecture only; no business entity ownership.
 */

export const DEVICE_ASSIGNMENT_TARGETS = [
  "restaurant",
  "branch",
  "kitchen",
  "station",
  "counter",
  "zone",
  "table_area",
] as const;

export type DeviceAssignmentTargetId =
  (typeof DEVICE_ASSIGNMENT_TARGETS)[number];

export type DeviceAssignmentArchitecture = {
  id: DeviceAssignmentTargetId;
  title: string;
  notes: string;
};

export const DEVICE_ASSIGNMENT_ARCHITECTURE: readonly DeviceAssignmentArchitecture[] =
  [
    {
      id: "restaurant",
      title: "Restaurant",
      notes: "Operational scope assignment — restaurant business ownership unchanged.",
    },
    {
      id: "branch",
      title: "Branch",
      notes: "Branch / location assignment metadata.",
    },
    {
      id: "kitchen",
      title: "Kitchen",
      notes: "Kitchen plane assignment.",
    },
    {
      id: "station",
      title: "Station",
      notes: "Prep / expo station assignment.",
    },
    {
      id: "counter",
      title: "Counter",
      notes: "Front-of-house counter assignment.",
    },
    {
      id: "zone",
      title: "Zone",
      notes: "Service zone assignment.",
    },
    {
      id: "table_area",
      title: "Table Area",
      notes: "Dining area assignment — not table/order ownership.",
    },
  ] as const;
