export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/** Local email/password login page (no external OAuth). */
export const LOGIN_PATH = "/login";

export const REGISTER_PATH = "/register";

export const getLoginUrl = () => LOGIN_PATH;

export const getRegisterUrl = () => REGISTER_PATH;

/** Wouter-compatible client navigation without a full document reload. */
export function spaNavigate(path: string, options?: { replace?: boolean }) {
  if (typeof window === "undefined") return;
  const target = path.startsWith("/") ? path : `/${path}`;
  const current = `${window.location.pathname}${window.location.search}`;
  if (current === target) return;
  if (options?.replace) {
    window.history.replaceState(null, "", target);
  } else {
    window.history.pushState(null, "", target);
  }
  window.dispatchEvent(new PopStateEvent("popstate"));
}
