/**
 * DEVICE-MANAGEMENT-PLATFORM-ARCHITECTURE-2
 * Inventory architecture — search / filter / grouping.
 */

export const DEVICE_INVENTORY_FACETS = [
  "search",
  "filter",
  "grouping",
  "tags",
  "capabilities",
  "version",
  "restaurant",
  "device_type",
  "health",
] as const;

export type DeviceInventoryFacetId = (typeof DEVICE_INVENTORY_FACETS)[number];

export type DeviceInventoryArchitecture = {
  id: DeviceInventoryFacetId;
  title: string;
  notes: string;
};

export const DEVICE_INVENTORY_ARCHITECTURE: readonly DeviceInventoryArchitecture[] =
  [
    { id: "search", title: "Search", notes: "Free-text across identity / display name." },
    { id: "filter", title: "Filter", notes: "Faceted filters over inventory columns." },
    { id: "grouping", title: "Grouping", notes: "Group by restaurant, type, health, tags." },
    { id: "tags", title: "Tags", notes: "Operator tags for inventory slices." },
    { id: "capabilities", title: "Capabilities", notes: "Filter by capability flags." },
    { id: "version", title: "Version", notes: "Client / firmware version facet." },
    { id: "restaurant", title: "Restaurant", notes: "Restaurant assignment facet." },
    { id: "device_type", title: "Device Type", notes: "From DEVICE_TYPE_ARCHITECTURE." },
    { id: "health", title: "Health", notes: "From DEVICE_HEALTH_STATUSES." },
  ] as const;
