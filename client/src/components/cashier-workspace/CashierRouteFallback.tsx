/**
 * CASHIER-UX-FULLSCREEN-AND-THEME-1
 * Exit control when Cashier is immersive but the workspace panel is not mounted.
 */
import { cashierUiLabel, type CashierLang } from "@/lib/cashier-workspace/cashierCopy";
import { cashierPos } from "@/lib/cashier-workspace/cashierPosStyles";
import { syncDashboardUrl } from "@/lib/dashboardUrl";
import type { ReactNode } from "react";

type Props = {
  restaurantId: number;
  language: CashierLang;
  children: ReactNode;
};

export function CashierRouteFallback({ restaurantId, language, children }: Props) {
  const dir = language === "ar" ? "rtl" : "ltr";
  return (
    <div className="flex min-h-svh flex-col bg-[#f4f5f7] p-4" dir={dir}>
      <button
        type="button"
        className={`${cashierPos.headerBtnPrimary} mb-4 self-start`}
        onClick={() => syncDashboardUrl({ restaurantId, section: "home" })}
      >
        {cashierUiLabel("returnDashboard", language)}
      </button>
      {children}
    </div>
  );
}
