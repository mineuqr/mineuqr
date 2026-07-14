/**
 * ORDERING-CLIENT-BROWSE-1 — Ordering Client Platform browse orchestrator.
 * Owns category navigation, search, tabs, scroll sync, item selection, filtered catalog.
 * Consumes catalogs exclusively from Ordering Runtime via OrderingClientProvider.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useOptionalOrderingClientRuntime } from "../context/OrderingClientProvider";
import type { OrderingClientRuntimeGates } from "../runtime/orderingRuntimeGates";
import {
  filterBrowseItems,
  resolveBrowseMenuTab,
  resolveBrowsePresentationStatus,
  resolveDefaultCategoryId,
} from "./browseCatalog";
import type {
  BrowsePresentationStatus,
  OrderingBrowseCatalogItem,
  OrderingBrowseCategory,
  OrderingBrowseTab,
} from "./browseTypes";

export type OrderingBrowseContextValue = Readonly<{
  categories: OrderingBrowseCategory[];
  items: OrderingBrowseCatalogItem[];
  offers: unknown[];
  activeCategoryId: number | null;
  setActiveCategoryId: (id: number | null) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  menuTab: OrderingBrowseTab;
  setMenuTab: (tab: OrderingBrowseTab) => void;
  filteredItems: OrderingBrowseCatalogItem[];
  showScrollTop: boolean;
  selectedItemId: number | null;
  selectItem: (id: number | null) => void;
  clearSelectedItem: () => void;
  presentationStatus: BrowsePresentationStatus;
  restaurant: unknown;
  isLoading: boolean;
  gates: OrderingClientRuntimeGates;
}>;

const OrderingBrowseContext = createContext<OrderingBrowseContextValue | null>(
  null
);

export type OrderingBrowseProviderProps = {
  children: ReactNode;
};

/**
 * Browse lifecycle for the ordering experience.
 * Requires OrderingClientProvider (hosted table path or browse-only host).
 */
export function OrderingBrowseProvider({ children }: OrderingBrowseProviderProps) {
  const runtime = useOptionalOrderingClientRuntime();
  if (!runtime) {
    throw new Error(
      "OrderingBrowseProvider requires OrderingClientProvider (Ordering Client Platform)"
    );
  }

  const categories = runtime.categories as OrderingBrowseCategory[];
  const items = runtime.items as OrderingBrowseCatalogItem[];
  const offers = runtime.offers;
  const restaurant = runtime.restaurant as { isActive?: boolean } | null;

  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [menuTab, setMenuTabState] = useState<OrderingBrowseTab>("menu");
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);

  useEffect(() => {
    setActiveCategoryId((current) =>
      resolveDefaultCategoryId(categories, current)
    );
  }, [categories]);

  useEffect(() => {
    setMenuTabState((current) =>
      resolveBrowseMenuTab(current, offers?.length ?? 0)
    );
  }, [offers?.length]);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const setMenuTab = useCallback((tab: OrderingBrowseTab) => {
    setMenuTabState(tab);
  }, []);

  const selectItem = useCallback((id: number | null) => {
    setSelectedItemId(id);
  }, []);

  const clearSelectedItem = useCallback(() => {
    setSelectedItemId(null);
  }, []);

  const filteredItems = useMemo(
    () => filterBrowseItems(items, activeCategoryId, searchQuery),
    [items, activeCategoryId, searchQuery]
  );

  const presentationStatus = resolveBrowsePresentationStatus({
    isLoading: runtime.isLoading,
    restaurant,
  });

  const value: OrderingBrowseContextValue = {
    categories: categories ?? [],
    items: items ?? [],
    offers: offers ?? [],
    activeCategoryId,
    setActiveCategoryId,
    searchQuery,
    setSearchQuery,
    menuTab,
    setMenuTab,
    filteredItems,
    showScrollTop,
    selectedItemId,
    selectItem,
    clearSelectedItem,
    presentationStatus,
    restaurant: runtime.restaurant,
    isLoading: runtime.isLoading,
    gates: runtime.gates,
  };

  return (
    <OrderingBrowseContext.Provider value={value}>
      {children}
    </OrderingBrowseContext.Provider>
  );
}

export function useOrderingBrowse(): OrderingBrowseContextValue {
  const ctx = useContext(OrderingBrowseContext);
  if (!ctx) {
    throw new Error(
      "useOrderingBrowse requires OrderingBrowseProvider (Ordering Client Platform)"
    );
  }
  return ctx;
}

/** Optional access — channel shells may render outside browse host. */
export function useOptionalOrderingBrowse(): OrderingBrowseContextValue | null {
  return useContext(OrderingBrowseContext);
}
