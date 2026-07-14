/**
 * ORDERING-CLIENT-CART-1 — Cart orchestrator (lifecycle, hydrate, persist, reset).
 * Requires CartScopeAdapter; channels do not orchestrate.
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
import type { CartScopeAdapter } from "../contracts/CartScopeAdapter";
import { useOptionalOrderingClientRuntime } from "../context/OrderingClientProvider";
import {
  clearCartByScopeKey,
  loadCartByScopeKey,
  saveCartByScopeKey,
} from "./cartPersistence";
import type { OrderingCartItem } from "./cartTypes";

export type OrderingCartCapabilities = Readonly<{
  canAddToCart: boolean;
}>;

export type OrderingCartContextValue = Readonly<{
  items: OrderingCartItem[];
  addItem: (item: Omit<OrderingCartItem, "quantity">) => void;
  removeItem: (menuItemId: number) => void;
  updateQuantity: (menuItemId: number, quantity: number) => void;
  updateNotes: (menuItemId: number, notes: string) => void;
  clearCart: () => void;
  totalItems: number;
  totalAmount: number;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  scopeKey: string;
  capabilities: OrderingCartCapabilities;
}>;

const OrderingCartContext = createContext<OrderingCartContextValue | null>(null);

export type OrderingCartProviderProps = {
  scope: CartScopeAdapter;
  children: ReactNode;
};

export function OrderingCartProvider({
  scope,
  children,
}: OrderingCartProviderProps) {
  const scopeKey = scope.resolveScopeKey();
  const runtime = useOptionalOrderingClientRuntime();

  const [items, setItems] = useState<OrderingCartItem[]>(() =>
    loadCartByScopeKey(scopeKey)
  );
  const [isOpen, setIsOpen] = useState(false);

  // Re-hydrate when scope identity changes (multi-table / multi-restaurant).
  useEffect(() => {
    setItems(loadCartByScopeKey(scopeKey));
    setIsOpen(false);
  }, [scopeKey]);

  useEffect(() => {
    saveCartByScopeKey(scopeKey, items);
  }, [scopeKey, items]);

  const addItem = useCallback((item: Omit<OrderingCartItem, "quantity">) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.menuItemId === item.menuItemId);
      if (existing) {
        return prev.map((i) =>
          i.menuItemId === item.menuItemId
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  }, []);

  const removeItem = useCallback((menuItemId: number) => {
    setItems((prev) => prev.filter((i) => i.menuItemId !== menuItemId));
  }, []);

  const updateQuantity = useCallback((menuItemId: number, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.menuItemId !== menuItemId));
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.menuItemId === menuItemId ? { ...i, quantity } : i))
    );
  }, []);

  const updateNotes = useCallback((menuItemId: number, notes: string) => {
    setItems((prev) =>
      prev.map((i) => (i.menuItemId === menuItemId ? { ...i, notes } : i))
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setIsOpen(false);
    clearCartByScopeKey(scopeKey);
  }, [scopeKey]);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = items.reduce(
    (sum, item) => sum + parseFloat(item.price) * item.quantity,
    0
  );

  const capabilities: OrderingCartCapabilities = useMemo(
    () => ({
      canAddToCart: runtime?.runtime?.capabilities.canAddToCart ?? true,
    }),
    [runtime]
  );

  const value: OrderingCartContextValue = {
    items,
    addItem,
    removeItem,
    updateQuantity,
    updateNotes,
    clearCart,
    totalItems,
    totalAmount,
    isOpen,
    setIsOpen,
    scopeKey,
    capabilities,
  };

  return (
    <OrderingCartContext.Provider value={value}>
      {children}
    </OrderingCartContext.Provider>
  );
}

export function useOrderingCart(): OrderingCartContextValue {
  const ctx = useContext(OrderingCartContext);
  if (!ctx) {
    throw new Error(
      "useOrderingCart must be used within OrderingCartProvider (Ordering Client Platform)"
    );
  }
  return ctx;
}

/** Alias preserved for existing channel presentation imports. */
export const useCart = useOrderingCart;
