/**
 * GLOBAL-SAAS-COMPLIANCE-AND-PAYMENT-READINESS-1
 * Per-route document title + meta description for marketing SPA pages.
 */
import { useEffect } from "react";
import { MINEUQR_BRAND_NAME } from "@/const/branding";
import { MINEUQR_PUBLIC_SITE_ORIGIN } from "@/const/publicContact";

const DEFAULT_DESCRIPTION =
  "MineuQR is a restaurant operating system for digital menus, QR ordering, kiosk and waiter ordering, kitchen operations, and reporting.";

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(
    `meta[${attr}="${key}"]`
  );
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLink(rel: string, href: string, hreflang?: string) {
  const selector = hreflang
    ? `link[rel="${rel}"][hreflang="${hreflang}"]`
    : `link[rel="${rel}"]:not([hreflang])`;
  let el = document.head.querySelector<HTMLLinkElement>(selector);
  if (!el) {
    el = document.createElement("link");
    el.rel = rel;
    if (hreflang) el.hreflang = hreflang;
    document.head.appendChild(el);
  }
  el.href = href;
}

export function useMarketingDocumentMeta(input: {
  title: string;
  description?: string;
  path: string;
  /** Optional hreflang alternates, e.g. [{ lang: "ar", path: "/pricing" }, ...] */
  hreflang?: Array<{ lang: string; path: string }>;
  locale?: string;
}) {
  useEffect(() => {
    const title = input.title.includes(MINEUQR_BRAND_NAME)
      ? input.title
      : `${input.title} · ${MINEUQR_BRAND_NAME}`;
    const description = input.description?.trim() || DEFAULT_DESCRIPTION;
    const canonical = `${MINEUQR_PUBLIC_SITE_ORIGIN}${input.path.startsWith("/") ? input.path : `/${input.path}`}`;

    document.title = title;
    upsertMeta("name", "description", description);
    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:type", "website");
    upsertMeta("property", "og:url", canonical);
    upsertMeta("property", "og:site_name", MINEUQR_BRAND_NAME);
    if (input.locale) {
      upsertMeta("property", "og:locale", input.locale === "ar" ? "ar_SA" : "en_US");
    }
    upsertMeta("name", "twitter:card", "summary");
    upsertMeta("name", "twitter:title", title);
    upsertMeta("name", "twitter:description", description);
    upsertLink("canonical", canonical);
    for (const alt of input.hreflang ?? []) {
      const href = `${MINEUQR_PUBLIC_SITE_ORIGIN}${alt.path.startsWith("/") ? alt.path : `/${alt.path}`}`;
      upsertLink("alternate", href, alt.lang);
    }
  }, [
    input.title,
    input.description,
    input.path,
    input.locale,
    JSON.stringify(input.hreflang ?? []),
  ]);
}
