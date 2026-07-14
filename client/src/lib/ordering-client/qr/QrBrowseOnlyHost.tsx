import type { ReactNode } from "react";
import { ORDERING_CHANNEL_QR } from "@shared/ordering-platform/orderingPlatformContracts";
import { OrderingBrowseProvider } from "../browse/OrderingBrowseProvider";
import { OrderingClientProvider } from "../context/OrderingClientProvider";
import { OrderingClientErrorBoundary } from "../runtime/OrderingClientErrorBoundary";

export type QrBrowseOnlyHostProps = {
  slug: string;
  children: ReactNode;
};

/**
 * ORDERING-CLIENT-BROWSE-1 — public browse-only `/menu/:slug` host.
 * Runtime + browse orchestration; no cart (no table scope).
 */
export function QrBrowseOnlyHost({ slug, children }: QrBrowseOnlyHostProps) {
  if (!slug) return null;

  return (
    <OrderingClientErrorBoundary>
      <OrderingClientProvider channel={ORDERING_CHANNEL_QR} slug={slug}>
        <OrderingBrowseProvider>{children}</OrderingBrowseProvider>
      </OrderingClientProvider>
    </OrderingClientErrorBoundary>
  );
}
