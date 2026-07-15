import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  type WaiterShellStage,
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

export type WaiterShellActivation = Readonly<{
  slug: string;
  restaurantId?: number;
}>;

export type WaiterShellProps = Readonly<{
  /** OPERATIONAL-SCREEN-CATALOG-POLICY-1 — Screen Runtime host mode. */
  activation?: WaiterShellActivation;
}>;

type TableBinding = {
  tableId: number;
  tableNumber: number;
  sessionId: number;
  sessionToken: string;
};

/**
 * WAITER-ORDERING-FOUNDATION-1 — Waiter channel shell.
 * WAITER-SESSION-BINDING-HARDENING-1 — revalidates URL/host session binding.
 * OPERATIONAL-SCREEN-CATALOG-POLICY-1 — optional Screen Runtime activation host.
 */
export default function WaiterShell({ activation }: WaiterShellProps = {}) {
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

  const hosted = activation != null;

  const returnPath =
    typeof window !== "undefined"
      ? `${window.location.pathname}${window.location.search}`
      : "/waiter";
  const loginRedirect = `${LOGIN_PATH}?returnTo=${encodeURIComponent(returnPath)}`;

  const { user, authPending } = useAuth({
    redirectOnUnauthenticated: true,
    redirectPath: loginRedirect,
  });

  const slugFromRoute =
    entryParams?.slug ??
    tablesParams?.slug ??
    menuParams?.slug ??
    cartParams?.slug ??
    checkoutParams?.slug ??
    confirmedParams?.slug ??
    "";

  const slug = hosted ? activation.slug : slugFromRoute;

  const routeStage = useMemo((): WaiterShellStage | "picker" | "entry" => {
    if (confirmedParams) return "confirmation";
    if (checkoutParams) return "checkout";
    if (cartParams) return "cart";
    if (menuParams) return "browse";
    if (tablesParams) return "tables";
    if (entryParams) return "entry";
    if (isRoot) return "picker";
    return "picker";
  }, [
    confirmedParams,
    checkoutParams,
    cartParams,
    menuParams,
    tablesParams,
    entryParams,
    isRoot,
  ]);

  const [hostStage, setHostStage] = useState<WaiterShellStage>("tables");
  const [hostBinding, setHostBinding] = useState<TableBinding | null>(null);
  const [hostTrackingToken, setHostTrackingToken] = useState<string | null>(
    null
  );

  const stage: WaiterShellStage | "picker" | "entry" = hosted
    ? hostStage
    : routeStage;

  const restaurantsQuery = trpc.waiter.listRestaurants.useQuery(undefined, {
    enabled: !!user && !hosted,
  });

  const restaurantFromList = useMemo(() => {
    if (!slug || !restaurantsQuery.data) return null;
    return restaurantsQuery.data.find((r) => r.slug === slug) ?? null;
  }, [slug, restaurantsQuery.data]);

  const restaurantId =
    activation?.restaurantId ?? restaurantFromList?.id ?? null;

  const restaurantName = restaurantFromList
    ? language === "ar"
      ? restaurantFromList.nameAr
      : restaurantFromList.nameEn || restaurantFromList.nameAr
    : slug;

  const urlTableId = Number(readParam(search, "tableId") || 0);
  const urlTableNumber = Number(readParam(search, "table") || 0);
  const urlSessionId = Number(readParam(search, "sessionId") || 0);
  const urlSessionToken = readParam(search, "session") || "";

  const tableId = hosted ? hostBinding?.tableId ?? 0 : urlTableId;
  const tableNumber = hosted ? hostBinding?.tableNumber ?? 0 : urlTableNumber;
  const sessionId = hosted ? hostBinding?.sessionId ?? 0 : urlSessionId;
  const sessionToken = hosted
    ? hostBinding?.sessionToken ?? ""
    : urlSessionToken;

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

  const onHostStageNavigate = useCallback(
    (next: WaiterShellStage, extras?: { trackingToken?: string }) => {
      setHostStage(next);
      if (extras?.trackingToken) setHostTrackingToken(extras.trackingToken);
      if (next === "tables") {
        setHostBinding(null);
        setHostTrackingToken(null);
      }
    },
    []
  );

  const clearBindingToTables = useCallback(() => {
    if (hosted) {
      setHostBinding(null);
      setHostTrackingToken(null);
      setHostStage("tables");
      return;
    }
    setLocation(`/waiter/${slug}/tables`, { replace: true });
  }, [hosted, slug, setLocation]);

  useEffect(() => {
    if (hosted || !user || !slug) return;
    if (stage === "entry") {
      setLocation(`/waiter/${slug}/tables`, { replace: true });
      return;
    }
    if (sessionDependentStage && !orderingBound) {
      setLocation(`/waiter/${slug}/tables`, { replace: true });
    }
  }, [
    hosted,
    user,
    slug,
    stage,
    sessionDependentStage,
    orderingBound,
    setLocation,
  ]);

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
    clearBindingToTables();
  }, [
    sessionDependentStage,
    orderingBound,
    slug,
    bindingGuard.validating,
    bindingGuard.isValid,
    bindingGuard.invalidReason,
    sessionBinding?.sessionToken,
    lang,
    clearBindingToTables,
  ]);

  const goMenuWithBinding = (binding: TableBinding) => {
    staleRecoveryKeyRef.current = null;
    if (hosted) {
      setHostBinding(binding);
      setHostStage("browse");
      return;
    }
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

  if (!hosted && stage === "picker") {
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

  if (!hosted && (restaurantsQuery.isLoading || stage === "entry")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <Loader2 className="w-10 h-10 animate-spin text-teal-400" />
      </div>
    );
  }

  if (!hosted && !restaurantFromList) {
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

  if (!restaurantId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-8 text-center">
        {language === "ar"
          ? "تعذر تحديد المطعم"
          : "Restaurant context unavailable"}
      </div>
    );
  }

  if (stage === "tables" || !orderingBound) {
    return (
      <WaiterTablesStage
        restaurantId={restaurantId}
        restaurantName={restaurantName}
        onBack={
          hosted
            ? undefined
            : () => setLocation("/waiter")
        }
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

  return (
    <WaiterOrderingClientHost
      slug={slug}
      stationId={WAITER_STATION_ID}
      tableNumber={tableNumber}
      sessionId={sessionId}
      querySuffix={qs}
      onHostStageNavigate={hosted ? onHostStageNavigate : undefined}
      hostStage={hosted ? hostStage : undefined}
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
          trackingToken={hosted ? hostTrackingToken : undefined}
          onBackToTables={clearBindingToTables}
          onOrderAgain={() => {
            if (hosted) {
              setHostStage("browse");
              return;
            }
            setLocation(`/waiter/${slug}/menu?${qs}`);
          }}
        />
      )}
    </WaiterOrderingClientHost>
  );
}
