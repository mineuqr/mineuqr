import { ScreenErrorBoundary } from "@/components/operational-screen/ScreenErrorBoundary";
import { spaNavigate } from "@/const";
import { useEffect } from "react";

/** Legacy route — redirects to /screen (SCREEN-PAIRING-CODE-1). */
export default function OperationalScreenPair() {
  useEffect(() => {
    spaNavigate("/screen", { replace: true });
  }, []);

  return (
    <ScreenErrorBoundary>
      <div className="flex min-h-screen items-center justify-center bg-[#0b0e14]" />
    </ScreenErrorBoundary>
  );
}
