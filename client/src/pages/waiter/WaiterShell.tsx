import { useEffect, useMemo, useRef } from "react";
import { useLocation, useRoute, useSearch } from "wouter";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { LOGIN_PATH } from "@/const";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  WaiterOrderingClientHost,
  useWaiterSessionBindingGuard,
  waiterBindingInvalidMessage,
} from "@/lib/ordering-client";
import { trpc } from "@/lib/trpc";
import { WaiterBrowseStage } from "./WaiterBrowseStage";
import { WaiterCartStage } from "./WaiterCartStage";
import { WaiterCheckoutStage } from "./WaiterCheckoutStage";
import { WaiterConfirmationStage } from "./WaiterConfirmationStage";
import { WaiterTablesStage } from "./WaiterTablesStage";

function readParam(search: string, key: string): string | null {
  try {
    return new URLSearchParams(
      search.startsWith("?") ? search : `?${search}`
    ).get(key);
  } catch {
    return null;
  }
}

const WAITER_STATION_ID = "waiter";

/**
 * WAITER-ORDERING-FOUNDATION-1 — Waiter channel shell.
 * WAITER-SESSION-BINDING-HARDENING-1 — revalidates URL session binding before
 * browse/cart/checkout; clears stale bindings without creating sessions.
 * Ordering stages compose Ordering Client Platform via WaiterOrderingClientHost.
 */
export default function WaiterShell() {
  const { language } = useLanguage();
  const lang = language === "ar" ? "ar" : "en";
  const [, setLocation] = useLocation();
  const search = useSearch();
  const [isRoot] = useRoute("/waiter");
  const [, entryParams] = useRoute("/waiter/:slug");
  const [, tablesParams] = useRoute("/waiter/:slug/tables");
  const [, menuParams] = useRoute("/waiter/:slug/menu");
  const [, cartParams] = useRoute("/waiter/:slug/cart");
  const [, checkoutParams] = useRoute("/waiter/:slug/checkout");
  const [, confirmedParams] = useRoute("/waiter/:slug/confirmed");

  const returnPath =
    typeof window !== "undefined"
      ? `${window.location.pathname}${window.location.search}`
      : "/waiter";
  const loginRedirect = `${LOGIN_PATH}?returnTo=${encodeURIComponent(returnPath)}`;

  const { user, authPending } = useAuth({
    redirectOnUnauthenticated: true,
    redirectPath: loginRedirect,
  });

  const slug =
    entryParams?.slug ??
    tablesParams?.slug ??
    menuParams?.slug ??
    cartParams?.slug ??
    checkoutParams?.slug ??
    confirmedParams?.slug ??
    "";

  const stage = useMemo(() => {
    if (confirmedParams) return "confirmation" as const;
    if (checkoutParams) return "checkout" as const;
    if (cartParams) return "cart" as const;
    if (menuParams) return "browse" as const;
    if (tablesParams) return "tables" as const;
    if (entryParams) return "entry" as const;
    if (isRoot) return "picker" as const;
    return "picker" as const;
  }, [
    confirmedParams,
    checkoutParams,
    cartParams,
    menuParams,
    tablesParams,
    entryParams,
    isRoot,
  ]);

  const restaurantsQuery = trpc.waiter.listRestaurants.useQuery(undefined, {
    enabled: !!user,
  });

  const restaurant = useMemo(() => {
    if (!slug || !restaurantsQuery.data) return null;
    return restaurantsQuery.data.find((r) => r.slug === slug) ?? null;
  }, [slug, restaurantsQuery.data]);

  const tableId = Number(readParam(search, "tableId") || 0);
  const tableNumber = Number(readParam(search, "table") || 0);
  const sessionId = Number(readParam(search, "sessionId") || 0);
  const sessionToken = readParam(search, "session") || "";

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (tableId > 0) p.set("tableId", String(tableId));
    if (tableNumber > 0) p.set("table", String(tableNumber));
    if (sessionId > 0) p.set("sessionId", String(sessionId));
    if (sessionToken) p.set("session", sessionToken);
    return p.toString();
  }, [tableId, tableNumber, sessionId, sessionToken]);

  const orderingBound =
    tableId > 0 && tableNumber > 0 && sessionId > 0 && !!sessionToken;

  const sessionDependentStage =
    stage === "browse" || stage === "cart" || stage === "checkout";

  const sessionBinding = useMemo(
    () =>
      orderingBound && slug
        ? {
            slug,
            tableNumber,
            sessionId,
            sessionToken,
          }
        : null,
    [orderingBound, slug, tableNumber, sessionId, sessionToken]
  );

  const bindingGuard = useWaiterSessionBindingGuard({
    enabled: !!user && !!sessionBinding && sessionDependentStage,
    binding: sessionBinding,
  });

  const staleRecoveryKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user || !slug) return;
    if (stage === "entry") {
      setLocation(`/waiter/${slug}/tables`, { replace: true });
      return;
    }
    if (sessionDependentStage && !orderingBound) {
      setLocation(`/waiter/${slug}/tables`, { replace: true });
    }
  }, [user, slug, stage, sessionDependentStage, orderingBound, setLocation]);

  useEffect(() => {
    if (!sessionDependentStage || !orderingBound || !slug) return;
    if (bindingGuard.validating || bindingGuard.isValid) return;
    if (!bindingGuard.invalidReason) return;

    const key = `${sessionBinding?.sessionToken}|${bindingGuard.invalidReason}`;
    if (staleRecoveryKeyRef.current === key) return;
    staleRecoveryKeyRef.current = key;

    toast.error(
      waiterBindingInvalidMessage(bindingGuard.invalidReason, lang)
    );
    // Clear binding by navigating to tables without query — do not attach/create.
    setLocation(`/waiter/${slug}/tables`, { replace: true });
  }, [
    sessionDependentStage,
    orderingBound,
    slug,
    bindingGuard.validating,
    bindingGuard.isValid,
    bindingGuard.invalidReason,
    sessionBinding?.sessionToken,
    lang,
    setLocation,
  ]);

  const goMenuWithBinding = (binding: {
    tableId: number;
    tableNumber: number;
    sessionId: number;
    sessionToken: string;
  }) => {
    staleRecoveryKeyRef.current = null;
    const p = new URLSearchParams();
    p.set("tableId", String(binding.tableId));
    p.set("table", String(binding.tableNumber));
    p.set("sessionId", String(binding.sessionId));
    p.set("session", binding.sessionToken);
    setLocation(`/waiter/${slug}/menu?${p.toString()}`);
  };

  if (authPending || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <Loader2 className="w-10 h-10 animate-spin text-teal-400" />
      </div>
    );
  }

  if (stage === "picker") {
    if (restaurantsQuery.isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
          <Loader2 className="w-10 h-10 animate-spin text-teal-400" />
        </div>
      );
    }
    const restaurants = restaurantsQuery.data ?? [];
    return (
      <div className="min-h-screen bg-slate-950 text-white px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">
          {language === "ar" ? "طلب النادل" : "Waiter Ordering"}
        </h1>
        <p className="text-white/60 mb-6">
          {language === "ar"
            ? "اختر مطعماً لفتح مساحة العمل"
            : "Choose a restaurant to open the workspace"}
        </p>
        <ul className="space-y-3 max-w-lg">
          {restaurants.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => setLocation(`/waiter/${r.slug}/tables`)}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left hover:bg-white/10"
              >
                <p className="font-semibold text-lg">
                  {language === "ar" ? r.nameAr : r.nameEn || r.nameAr}
                </p>
                <p className="text-sm text-white/50">{r.slug}</p>
              </button>
            </li>
          ))}
          {restaurants.length === 0 ? (
            <p className="text-white/50">
              {language === "ar"
                ? "لا توجد مطاعم متاحة لحسابك"
                : "No restaurants available for this account"}
            </p>
          ) : null}
        </ul>
      </div>
    );
  }

  if (restaurantsQuery.isLoading || stage === "entry") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <Loader2 className="w-10 h-10 animate-spin text-teal-400" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-950 text-white p-8 text-center">
        <p>
          {language === "ar"
            ? "لا تملك صلاحية الوصول لهذا المطعم"
            : "You do not have access to this restaurant"}
        </p>
        <button
          type="button"
          onClick={() => setLocation("/waiter")}
          className="rounded-xl bg-teal-500 px-6 py-3 font-semibold text-slate-950"
        >
          {language === "ar" ? "اختيار مطعم" : "Choose restaurant"}
        </button>
      </div>
    );
  }

  if (stage === "tables" || !orderingBound) {
    return (
      <WaiterTablesStage
        restaurantId={restaurant.id}
        restaurantName={
          language === "ar"
            ? restaurant.nameAr
            : restaurant.nameEn || restaurant.nameAr
        }
        onBack={() => setLocation("/waiter")}
        onSelectTable={goMenuWithBinding}
      />
    );
  }

  if (
    sessionDependentStage &&
    (bindingGuard.validating || !bindingGuard.isValid)
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <Loader2 className="w-10 h-10 animate-spin text-teal-400" />
      </div>
    );
  }

  const clearBindingToTables = () => {
    setLocation(`/waiter/${slug}/tables`, { replace: true });
  };

  return (
    <WaiterOrderingClientHost
      slug={slug}
      stationId={WAITER_STATION_ID}
      tableNumber={tableNumber}
      sessionId={sessionId}
      querySuffix={qs}
    >
      {stage === "browse" && (
        <WaiterBrowseStage
          slug={slug}
          qs={qs}
          tableNumber={tableNumber}
          onBackToTables={clearBindingToTables}
        />
      )}
      {stage === "cart" && (
        <WaiterCartStage slug={slug} qs={qs} tableNumber={tableNumber} />
      )}
      {stage === "checkout" && (
        <WaiterCheckoutStage
          slug={slug}
          qs={qs}
          tableId={tableId}
          tableNumber={tableNumber}
          sessionToken={sessionToken}
        />
      )}
      {stage === "confirmation" && (
        <WaiterConfirmationStage
          tableNumber={tableNumber}
          onBackToTables={clearBindingToTables}
          onOrderAgain={() => setLocation(`/waiter/${slug}/menu?${qs}`)}
        />
      )}
    </WaiterOrderingClientHost>
  );
}
