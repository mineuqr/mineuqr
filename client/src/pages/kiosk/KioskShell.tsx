import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useRoute, useSearch } from "wouter";
import {
  KioskOrderingClientHost,
  createKioskDeviceSessionId,
  KIOSK_CONFIRMATION_RESET_MS,
  KIOSK_DEFAULT_IDLE_TIMEOUT_MS,
  useOrderingCart,
} from "@/lib/ordering-client";
import type { KioskSessionResetTrigger } from "@/lib/ordering-platform/kioskSessionLifecycle";
import { useLanguage } from "@/contexts/LanguageContext";
import { KioskIdleScreen } from "./KioskIdleScreen";
import { KioskLanguageScreen } from "./KioskLanguageScreen";
import { KioskBrowseStage } from "./KioskBrowseStage";
import { KioskCartStage } from "./KioskCartStage";
import { KioskCheckoutStage } from "./KioskCheckoutStage";
import { KioskConfirmationStage } from "./KioskConfirmationStage";

function readParam(search: string, key: string): string | null {
  try {
    return new URLSearchParams(
      search.startsWith("?") ? search : `?${search}`
    ).get(key);
  } catch {
    return null;
  }
}

/**
 * SELF-ORDERING-KIOSK-PLATFORM-1 — Kiosk channel shell.
 * Owns idle / language / session reset / device chrome only.
 * Ordering stages compose Ordering Client Platform via KioskOrderingClientHost.
 */
export default function KioskShell() {
  const [, idleParams] = useRoute("/kiosk/:slug");
  const [, languageParams] = useRoute("/kiosk/:slug/language");
  const [, menuParams] = useRoute("/kiosk/:slug/menu");
  const [, cartParams] = useRoute("/kiosk/:slug/cart");
  const [, checkoutParams] = useRoute("/kiosk/:slug/checkout");
  const [, confirmedParams] = useRoute("/kiosk/:slug/confirmed");
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { setLanguage } = useLanguage();

  const slug =
    idleParams?.slug ??
    languageParams?.slug ??
    menuParams?.slug ??
    cartParams?.slug ??
    checkoutParams?.slug ??
    confirmedParams?.slug ??
    "";

  const stationId = readParam(search, "station") || "kiosk-1";
  const kioskId = readParam(search, "kiosk") || stationId;
  const tableNumberRaw = readParam(search, "table");
  const tableNumber = tableNumberRaw ? parseInt(tableNumberRaw, 10) : 0;

  const [deviceSessionId, setDeviceSessionId] = useState(() =>
    createKioskDeviceSessionId()
  );
  const [lastActivityAt, setLastActivityAt] = useState(() => Date.now());

  const stage = useMemo(() => {
    if (confirmedParams) return "confirmation" as const;
    if (checkoutParams) return "checkout" as const;
    if (cartParams) return "cart" as const;
    if (menuParams) return "browse" as const;
    if (languageParams) return "language" as const;
    return "idle" as const;
  }, [confirmedParams, checkoutParams, cartParams, menuParams, languageParams]);

  const orderingActive =
    stage === "browse" ||
    stage === "cart" ||
    stage === "checkout" ||
    stage === "confirmation";

  const bumpActivity = useCallback(() => {
    setLastActivityAt(Date.now());
  }, []);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    p.set("station", stationId);
    if (kioskId) p.set("kiosk", kioskId);
    if (tableNumber > 0) p.set("table", String(tableNumber));
    return p.toString();
  }, [stationId, kioskId, tableNumber]);

  const resetSession = useCallback(
    (_trigger: KioskSessionResetTrigger) => {
      setDeviceSessionId(createKioskDeviceSessionId());
      setLanguage("ar");
      setLastActivityAt(Date.now());
      setLocation(`/kiosk/${slug}?${qs}`, { replace: true });
    },
    [slug, qs, setLanguage, setLocation]
  );

  useEffect(() => {
    if (!orderingActive || stage === "confirmation") return;
    const id = window.setInterval(() => {
      if (Date.now() - lastActivityAt >= KIOSK_DEFAULT_IDLE_TIMEOUT_MS) {
        resetSession("timeout");
      }
    }, 5_000);
    return () => window.clearInterval(id);
  }, [orderingActive, stage, lastActivityAt, resetSession]);

  useEffect(() => {
    if (!slug) return;
    const onAny = () => bumpActivity();
    window.addEventListener("pointerdown", onAny);
    window.addEventListener("keydown", onAny);
    return () => {
      window.removeEventListener("pointerdown", onAny);
      window.removeEventListener("keydown", onAny);
    };
  }, [slug, bumpActivity]);

  if (!slug) return null;

  if (stage === "idle") {
    return (
      <KioskIdleScreen
        onStart={() => {
          setDeviceSessionId(createKioskDeviceSessionId());
          bumpActivity();
          setLocation(`/kiosk/${slug}/language?${qs}`);
        }}
      />
    );
  }

  if (stage === "language") {
    return (
      <KioskLanguageScreen
        onSelect={(lang) => {
          setLanguage(lang);
          bumpActivity();
          setLocation(`/kiosk/${slug}/menu?${qs}`);
        }}
      />
    );
  }

  return (
    <KioskOrderingClientHost
      slug={slug}
      stationId={stationId}
      deviceSessionId={deviceSessionId}
      kioskId={kioskId}
      querySuffix={qs}
    >
      <KioskOrderingSurface
        stage={stage}
        slug={slug}
        tableNumber={tableNumber}
        qs={qs}
        onReset={resetSession}
        bumpActivity={bumpActivity}
      />
    </KioskOrderingClientHost>
  );
}

function KioskOrderingSurface(props: {
  stage: "browse" | "cart" | "checkout" | "confirmation";
  slug: string;
  tableNumber: number;
  qs: string;
  onReset: (trigger: KioskSessionResetTrigger) => void;
  bumpActivity: () => void;
}) {
  const { stage, slug, tableNumber, qs, onReset, bumpActivity } = props;
  const cart = useOrderingCart();

  useEffect(() => {
    if (stage !== "confirmation") return;
    const id = window.setTimeout(() => {
      cart.clearCart();
      onReset("successful_order");
    }, KIOSK_CONFIRMATION_RESET_MS);
    return () => window.clearTimeout(id);
  }, [stage, cart, onReset]);

  if (stage === "browse") {
    return <KioskBrowseStage slug={slug} qs={qs} bumpActivity={bumpActivity} />;
  }
  if (stage === "cart") {
    return (
      <KioskCartStage
        slug={slug}
        qs={qs}
        bumpActivity={bumpActivity}
        onCancel={() => {
          cart.clearCart();
          onReset("cancellation");
        }}
      />
    );
  }
  if (stage === "checkout") {
    return (
      <KioskCheckoutStage
        slug={slug}
        tableNumber={tableNumber}
        qs={qs}
        bumpActivity={bumpActivity}
        onCancel={() => {
          cart.clearCart();
          onReset("cancellation");
        }}
      />
    );
  }
  return (
    <KioskConfirmationStage
      slug={slug}
      onDone={() => {
        cart.clearCart();
        onReset("successful_order");
      }}
    />
  );
}
