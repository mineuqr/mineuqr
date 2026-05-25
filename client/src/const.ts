export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/** Local email/password login page (no external OAuth). */
export const LOGIN_PATH = "/login";

export const getLoginUrl = () => LOGIN_PATH;

/** Wouter-compatible client navigation without a full document reload. */
export function spaNavigate(path: string) {
  if (typeof window === "undefined") return;
  const target = path.startsWith("/") ? path : `/${path}`;
  const current = `${window.location.pathname}${window.location.search}`;
  if (current === target) return;
  window.history.pushState(null, "", target);
  window.dispatchEvent(new PopStateEvent("popstate"));
}
