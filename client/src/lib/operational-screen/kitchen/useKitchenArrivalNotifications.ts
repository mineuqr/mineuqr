import { useEffect, useRef } from "react";
import { playKitchenOrderArrivalSound, primeOwnerAlertAudioAsset } from "@/lib/notificationSound";
import type { KitchenRuntimeQueue } from "./kitchenRuntimeReadModel";
import {
  buildKitchenArrivalBaselineToken,
  KitchenArrivalNotificationManager,
  resolveKitchenArrivalProcessMode,
} from "./kitchenArrivalNotification";

export type KitchenArrivalNotificationInput = Readonly<{
  enabled: boolean;
  queue: KitchenRuntimeQueue | null;
  isLoading: boolean;
  isError: boolean;
  isShowingStaleData: boolean;
  categoryFilterVersion: number;
  configurationVersion: string | null;
  reconnectCount: number;
  connectivityState: string;
}>;

/**
 * Runtime-side effect bridge — wires arrival manager to filtered kitchen queue updates.
 * Presentation components must not import this module.
 */
export function useKitchenArrivalNotifications(input: KitchenArrivalNotificationInput): void {
  const managerRef = useRef<KitchenArrivalNotificationManager | null>(null);
  if (managerRef.current == null) {
    managerRef.current = new KitchenArrivalNotificationManager(playKitchenOrderArrivalSound);
  }

  useEffect(() => {
    if (!input.enabled) return;
    const prime = () => {
      void primeOwnerAlertAudioAsset();
    };
    window.addEventListener("pointerdown", prime, { once: true });
    window.addEventListener("keydown", prime, { once: true });
    return () => {
      window.removeEventListener("pointerdown", prime);
      window.removeEventListener("keydown", prime);
    };
  }, [input.enabled]);

  useEffect(() => {
    return () => {
      managerRef.current?.dispose();
    };
  }, []);

  useEffect(() => {
    if (!input.enabled) return;

    const manager = managerRef.current!;
    const state = manager.getState();
    const baselineToken = buildKitchenArrivalBaselineToken({
      categoryFilterVersion: input.categoryFilterVersion,
      configurationVersion: input.configurationVersion,
      reconnectCount: input.reconnectCount,
    });

    const mode = resolveKitchenArrivalProcessMode({
      baselineEstablished: state.baselineEstablished,
      lastBaselineToken: state.lastBaselineToken,
      baselineToken,
      connectivityState: input.connectivityState,
      isShowingStaleData: input.isShowingStaleData,
      isQueueError: input.isError,
      isLoading: input.isLoading,
      hasQueue: input.queue != null,
    });

    manager.processFilteredQueue(input.queue, { mode, baselineToken });
  }, [
    input.enabled,
    input.queue,
    input.isLoading,
    input.isError,
    input.isShowingStaleData,
    input.categoryFilterVersion,
    input.configurationVersion,
    input.reconnectCount,
    input.connectivityState,
  ]);
}
