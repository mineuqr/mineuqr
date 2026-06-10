import { useEffect } from "react";
import { useLocation } from "wouter";

type AdminLegacyRedirectProps = {
  to: string;
};

/**
 * PHASE-A — bookmark-compatible client redirect for retired admin entrypoints.
 */
export function AdminLegacyRedirect({ to }: AdminLegacyRedirectProps) {
  const [, setLocation] = useLocation();

  useEffect(() => {
    setLocation(to);
  }, [setLocation, to]);

  return <div className="min-h-screen bg-[#0b0e14]" aria-hidden />;
}
