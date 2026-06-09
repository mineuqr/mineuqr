/**
 * Legacy route `/statistics` — redirects to canonical `/admin/analytics` (HOTFIX-UI-2).
 * Bookmark compatibility; no duplicate shell or layout.
 */
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Statistics() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    setLocation("/admin/analytics");
  }, [setLocation]);

  return <div className="min-h-screen bg-[#0b0e14]" aria-hidden />;
}
