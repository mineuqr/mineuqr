import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useRoute, useSearch } from "wouter";
import {
  KioskOrderingClientHost,
  createKioskDeviceSessionId,
  KIOSK_CONFIRMATION_RESET_MS,
  KIOSK_DEFAULT_IDLE_TIMEOUT_MS,
  useOrderingCart,
} from "@/lib/ordering-client";
import type { KioskShellStage } from "@/lib/ordering-client/kiosk/createKioskOrderingNavigator";
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

/** KIOSK-SCREEN-ACTIVATION-1 — Screen Runtime supplies identity; shell keeps stage ownership. */
export type KioskShellActivation = Readonly<{
  slug: string;
  stationId: string;
  restaurantId?: number;
  kioskId?: string;
}>;

export type KioskShellProps = Readonly<{
  activation?: KioskShellActivation;
}>;

/**
 * SELF-ORDERING-KIOSK-PLATFORM-1 — Kiosk channel shell.
 * Owns idle / language / session reset / device chrome only.
 * Ordering stages compose Ordering Client Platform via KioskOrderingClientHost.
 *
 * KIOSK-SCREEN-ACTIVATION-1 — when `activation` is set, stages are host-state driven
 * (Screen Runtime at `/screen`) instead of `/kiosk/:slug` routes.
 */
export default function KioskShell({ activation }: KioskShellProps = {}) {
  const [, idleParams] = useRoute("/kiosk/:slug");
  const [, languageParams] = useRoute("/kiosk/:slug/language");
  const [, menuParams] = useRoute("/kiosk/:slug/menu");
  const [, cartParams] = useRoute("/kiosk/:slug/cart");
  const [, checkoutParams] = useRoute("/kiosk/:slug/checkout");
  const [, confirmedParams] = useRoute("/kiosk/:slug/confirmed");
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { setLanguage } = useLanguage();

  const hosted = activation != null;

  const slugFromRoute =
    idleParams?.slug ??
    languageParams?.slug ??
    menuParams?.slug ??
    cartParams?.slug ??
    checkoutParams?.slug ??
    confirmedParams?.slug ??
    "";

  const slug = hosted ? activation.slug : slugFromRoute;
  const stationId = hosted
    ? activation.stationId
    : readParam(search, "station") || "kiosk-1";
  const kioskId = hosted
    ? activation.kioskId || activation.stationId
    : readParam(search, "kiosk") || stationId;

  const [deviceSessionId, setDeviceSessionId] = useState(() =>
    createKioskDeviceSessionId()
  );
  const [lastActivityAt, setLastActivityAt] = useState(() => Date.now());
  const [hostStage, setHostStage] = useState<KioskShellStage>("idle");
  const [hostTrackingToken, setHostTrackingToken] = useState<string | null>(null);

  const routeStage = useMemo(() => {
    if (confirmedParams) return "confirmation" as const;
    if (checkoutParams) return "checkout" as const;
    if (cartParams) return "cart" as const;
    if (menuParams) return "browse" as const;
    if (languageParams) return "language" as const;
    return "idle" as const;
  }, [confirmedParams, checkoutParams, cartParams, menuParams, languageParams]);

  const stage = hosted
    ? hostStage === "resetting"
      ? "idle"
      : hostStage
    : routeStage;

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
    return p.toString();
  }, [stationId, kioskId]);

  const onHostStageNavigate = useCallback(
    (next: KioskShellStage, extras?: { trackingToken?: string }) => {
      setHostStage(next);
      if (extras?.trackingToken) setHostTrackingToken(extras.trackingToken);
      if (next === "idle") setHostTrackingToken(null);
      bumpActivity();
    },
    [bumpActivity]
  );

  const resetSession = useCallback(
    (_trigger: KioskSessionResetTrigger) => {
      setDeviceSessionId(createKioskDeviceSessionId());
      setLanguage("ar");
      setLastActivityAt(Date.now());
      if (hosted) {
        setHostStage("idle");
        setHostTrackingToken(null);
        return;
      }
      setLocation(`/kiosk/${slug}?${qs}`, { replace: true });
    },
    [hosted, slug, qs, setLanguage, setLocation]
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
          if (hosted) {
            setHostStage("language");
            return;
          }
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
          if (hosted) {
            setHostStage("browse");
            return;
          }
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
      restaurantId={activation?.restaurantId}
      kioskId={kioskId}
      querySuffix={qs}
      onHostStageNavigate={hosted ? onHostStageNavigate : undefined}
      hostStage={hosted ? hostStage : undefined}
    >
      <KioskOrderingSurface
        stage={stage}
        slug={slug}
        stationId={stationId}
        qs={qs}
        trackingToken={hosted ? hostTrackingToken : null}
        onReset={resetSession}
        bumpActivity={bumpActivity}
      />
    </KioskOrderingClientHost>
  );
}

function KioskOrderingSurface(props: {
  stage: "browse" | "cart" | "checkout" | "confirmation";
  slug: string;
  stationId: string;
  qs: string;
  trackingToken: string | null;
  onReset: (trigger: KioskSessionResetTrigger) => void;
  bumpActivity: () => void;
}) {
  const { stage, slug, stationId, qs, trackingToken, onReset, bumpActivity } = props;
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
        stationId={stationId}
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
      trackingToken={trackingToken}
      onDone={() => {
        cart.clearCart();
        onReset("successful_order");
      }}
    />
  );
}
