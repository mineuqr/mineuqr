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

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
}

export function useMarketingDocumentMeta(input: {
  title: string;
  description?: string;
  path: string;
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
    upsertMeta("name", "twitter:card", "summary");
    upsertMeta("name", "twitter:title", title);
    upsertMeta("name", "twitter:description", description);
    upsertLink("canonical", canonical);
  }, [input.title, input.description, input.path]);
}
