/**
 * ORDERING-CLIENT-CHECKOUT-1 / KIOSK-IDENTITY-ADOPTION-1 —
 * Ordering Client Platform checkout orchestrator.
 * Owns form state, submission lifecycle, notes validation presentation, order summary.
 * Consumes cart + runtime gates; places orders via table (order.create) or
 * identity (order.placeWithIdentity). Channel-agnostic — no channel forks here.
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { useOrderingCart } from "../cart/OrderingCartProvider";
import { useOptionalOrderingClientRuntime } from "../context/OrderingClientProvider";
import {
  buildOrderSummaryLines,
  mapCheckoutSubmitError,
  presentOrderNoteError,
  validateCheckoutNotes,
} from "./checkoutSubmission";
import {
  isCheckoutIdentitySubmit,
  type CheckoutDraftSnapshot,
  type CheckoutOrderSummaryLine,
  type CheckoutSubmissionStatus,
  type CheckoutSubmitError,
  type CheckoutSubmitOutcome,
  type CheckoutSubmitRequest,
} from "./checkoutTypes";

export type OrderingCheckoutContextValue = Readonly<{
  customerName: string;
  setCustomerName: (v: string) => void;
  customerPhone: string;
  setCustomerPhone: (v: string) => void;
  orderNotes: string;
  setOrderNotes: (v: string) => void;
  submissionStatus: CheckoutSubmissionStatus;
  isSubmitting: boolean;
  lastError: CheckoutSubmitError | null;
  summaryLines: CheckoutOrderSummaryLine[];
  totalAmount: number;
  itemCount: number;
  supportsOrderNotes: boolean;
  supportsItemNotes: boolean;
  maxOrderNoteLength: number;
  maxItemNoteLength: number;
  submit: (request: CheckoutSubmitRequest) => Promise<CheckoutSubmitOutcome>;
  resetSubmission: () => void;
  goToBrowse: () => void;
}>;

const OrderingCheckoutContext =
  createContext<OrderingCheckoutContextValue | null>(null);

export type OrderingCheckoutProviderProps = {
  children: ReactNode;
};

export function OrderingCheckoutProvider({
  children,
}: OrderingCheckoutProviderProps) {
  const { language: uiLanguage } = useLanguage();
  const language = uiLanguage === "ar" ? "ar" : "en";
  const runtime = useOptionalOrderingClientRuntime();
  const cart = useOrderingCart();
  const createOrderMutation = trpc.order.create.useMutation();
  const placeWithIdentityMutation = trpc.order.placeWithIdentity.useMutation();

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [submissionStatus, setSubmissionStatus] =
    useState<CheckoutSubmissionStatus>("idle");
  const [lastError, setLastError] = useState<CheckoutSubmitError | null>(null);

  const items = cart.items;
  const totalAmount = cart.totalAmount;
  const gates = runtime?.gates;
  const navigator = runtime?.navigator ?? null;

  const summaryLines = useMemo(() => buildOrderSummaryLines(items), [items]);
  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const resetSubmission = useCallback(() => {
    setSubmissionStatus("idle");
    setLastError(null);
  }, []);

  const resetForm = useCallback(() => {
    setCustomerName("");
    setCustomerPhone("");
    setOrderNotes("");
  }, []);

  const goToBrowse = useCallback(() => {
    if (navigator) {
      navigator.goToBrowse();
      return;
    }
  }, [navigator]);

  const submit = useCallback(
    async (request: CheckoutSubmitRequest): Promise<CheckoutSubmitOutcome> => {
      const identitySubmit = isCheckoutIdentitySubmit(request);
      const tableReady =
        !identitySubmit &&
        !!request.tableId &&
        Number.isInteger(request.tableNumber);
      if (
        !request.channelAllowsSubmit ||
        !request.restaurantId ||
        items.length === 0 ||
        !gates?.platformCanPlaceOrder ||
        (!identitySubmit && !tableReady)
      ) {
        return {
          ok: false,
          error: { code: "NOT_READY", message: "Checkout not ready" },
        };
      }

      setSubmissionStatus("pending");
      setLastError(null);

      const validated = validateCheckoutNotes({
        orderNotes,
        items,
        maxOrderNoteLength: gates.notes.maxOrderNoteLength,
        maxItemNoteLength: gates.notes.maxItemNoteLength,
      });

      if (!validated.ok) {
        const error: CheckoutSubmitError = {
          ...validated.error,
          message:
            validated.error.code === "ORDER_NOTE_INVALID"
              ? presentOrderNoteError(validated.error.message, language)
              : validated.error.message,
        };
        setLastError(error);
        setSubmissionStatus("failure");
        return { ok: false, error };
      }

      const draft: CheckoutDraftSnapshot = {
        customerName,
        customerPhone,
        orderNotes,
        items: validated.items,
        totalAmount,
      };

      const linePayload = validated.items.map(
        ({ menuItemId, quantity, notes }) => ({
          menuItemId,
          quantity,
          notes,
        })
      );

      try {
        const result = identitySubmit
          ? await placeWithIdentityMutation.mutateAsync({
              restaurantId: request.restaurantId,
              serviceMode: request.identity.serviceMode,
              fulfilmentAnchor: request.identity.fulfilmentAnchor,
              sessionToken: request.sessionToken,
              customerName: customerName || undefined,
              customerPhone: customerPhone || undefined,
              notes: validated.orderNotes ?? undefined,
              items: linePayload,
            })
          : await createOrderMutation.mutateAsync({
              restaurantId: request.restaurantId,
              tableId: request.tableId,
              tableNumber: request.tableNumber,
              sessionToken: request.sessionToken,
              customerName: customerName || undefined,
              customerPhone: customerPhone || undefined,
              notes: validated.orderNotes ?? undefined,
              items: linePayload,
            });

        if (!result.trackingToken) {
          const error: CheckoutSubmitError = {
            code: "MISSING_TRACKING_TOKEN",
            message: "Missing tracking token",
          };
          setLastError(error);
          setSubmissionStatus("failure");
          return { ok: false, error };
        }

        const placed = {
          orderId: result.orderId,
          orderNumber: result.orderNumber,
          trackingToken: result.trackingToken,
          sessionToken: result.sessionToken,
          tableNumber: result.tableNumber,
          fulfilmentLabel:
            "fulfilmentLabel" in result
              ? result.fulfilmentLabel
              : undefined,
          totalAmount: result.totalAmount,
          itemCount: result.itemCount,
          createdAt: result.createdAt,
        };

        request.onSuccess?.(placed, draft);
        cart.clearCart();
        resetForm();
        setSubmissionStatus("success");

        if (navigator) {
          navigator.goToTracking(result.trackingToken);
        }

        return { ok: true, result: placed };
      } catch (error) {
        const mapped = mapCheckoutSubmitError(error, language);
        setLastError(mapped);
        setSubmissionStatus("failure");
        return { ok: false, error: mapped };
      }
    },
    [
      cart,
      createOrderMutation,
      placeWithIdentityMutation,
      customerName,
      customerPhone,
      gates,
      items,
      language,
      navigator,
      orderNotes,
      resetForm,
      totalAmount,
    ]
  );

  const value: OrderingCheckoutContextValue = {
    customerName,
    setCustomerName,
    customerPhone,
    setCustomerPhone,
    orderNotes,
    setOrderNotes,
    submissionStatus,
    isSubmitting: submissionStatus === "pending",
    lastError,
    summaryLines,
    totalAmount,
    itemCount,
    supportsOrderNotes: gates?.notes.supportsOrderNotes ?? true,
    supportsItemNotes: gates?.notes.supportsItemNotes ?? true,
    maxOrderNoteLength: gates?.notes.maxOrderNoteLength ?? 500,
    maxItemNoteLength: gates?.notes.maxItemNoteLength ?? 300,
    submit,
    resetSubmission,
    goToBrowse,
  };

  return (
    <OrderingCheckoutContext.Provider value={value}>
      {children}
    </OrderingCheckoutContext.Provider>
  );
}

export function useOrderingCheckout(): OrderingCheckoutContextValue {
  const ctx = useContext(OrderingCheckoutContext);
  if (!ctx) {
    throw new Error(
      "useOrderingCheckout requires OrderingCheckoutProvider (Ordering Client Platform)"
    );
  }
  return ctx;
}

export function useOptionalOrderingCheckout(): OrderingCheckoutContextValue | null {
  return useContext(OrderingCheckoutContext);
}
