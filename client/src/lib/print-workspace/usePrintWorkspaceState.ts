import { useCallback, useMemo, useState } from "react";
import type { PrintWorkspaceViewFilter } from "./viewModels";

export type PrintWorkspaceUiState = {
  view: PrintWorkspaceViewFilter;
  search: string;
  statusFilter: "" | "pending" | "preparing" | "ready" | "served" | "cancelled";
  selectedOrderId: number | null;
};

const initialState = (): PrintWorkspaceUiState => ({
  view: "awaiting",
  search: "",
  statusFilter: "",
  selectedOrderId: null,
});

export function usePrintWorkspaceState() {
  const [state, setState] = useState<PrintWorkspaceUiState>(initialState);

  const setView = useCallback((view: PrintWorkspaceViewFilter) => {
    setState((s) => ({ ...s, view, selectedOrderId: null }));
  }, []);

  const setSearch = useCallback((search: string) => {
    setState((s) => ({ ...s, search }));
  }, []);

  const setStatusFilter = useCallback(
    (statusFilter: PrintWorkspaceUiState["statusFilter"]) => {
      setState((s) => ({ ...s, statusFilter }));
    },
    []
  );

  const selectOrder = useCallback((orderId: number | null) => {
    setState((s) => ({ ...s, selectedOrderId: orderId }));
  }, []);

  const queryInput = useMemo(
    () => ({
      view: state.view,
      search: state.search.trim() || undefined,
      status: state.statusFilter || undefined,
    }),
    [state.view, state.search, state.statusFilter]
  );

  return {
    state,
    setView,
    setSearch,
    setStatusFilter,
    selectOrder,
    queryInput,
  };
}
