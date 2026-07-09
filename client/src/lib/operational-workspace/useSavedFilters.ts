import { useCallback, useEffect, useMemo, useState } from "react";

export type SavedFilterPreset = {
  id: string;
  labelEn: string;
  labelAr: string;
  status?: string;
  view?: string;
  search?: string;
};

export const DEFAULT_ORDER_FILTERS: SavedFilterPreset[] = [
  { id: "all", labelEn: "All Orders", labelAr: "كل الطلبات" },
  { id: "pending", labelEn: "Needs Acceptance", labelAr: "بانتظار القبول", status: "pending" },
  { id: "preparing", labelEn: "Preparing", labelAr: "قيد التحضير", status: "preparing" },
  { id: "ready", labelEn: "Ready", labelAr: "جاهز", status: "ready" },
  { id: "late", labelEn: "Late Orders", labelAr: "طلبات متأخرة", status: "late" },
];

export const DEFAULT_PRINT_FILTERS: SavedFilterPreset[] = [
  { id: "awaiting", labelEn: "Awaiting Print", labelAr: "بانتظار الطباعة", view: "awaiting" },
  { id: "completed", labelEn: "Recently Completed", labelAr: "مكتملة مؤخراً", view: "completed" },
  { id: "failures", labelEn: "Print Failures", labelAr: "فشل الطباعة", view: "awaiting" },
];

function storageKey(workspace: string, restaurantId: number) {
  return `mineuqr:operational-filters:${workspace}:${restaurantId}`;
}

export function useSavedFilters(
  workspace: string,
  restaurantId: number,
  defaults: SavedFilterPreset[]
) {
  const [activeId, setActiveId] = useState(defaults[0]?.id ?? "all");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(workspace, restaurantId));
      if (raw) setActiveId(raw);
    } catch {
      /* ignore */
    }
  }, [workspace, restaurantId]);

  const select = useCallback(
    (id: string) => {
      setActiveId(id);
      try {
        localStorage.setItem(storageKey(workspace, restaurantId), id);
      } catch {
        /* ignore */
      }
    },
    [workspace, restaurantId]
  );

  const active = useMemo(
    () => defaults.find((f) => f.id === activeId) ?? defaults[0],
    [defaults, activeId]
  );

  return { presets: defaults, activeId, active, select };
}
