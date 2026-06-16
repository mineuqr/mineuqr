import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  getSoundAlertsEnableActivatingLabel,
  getSoundAlertsEnableCtaLabel,
  getSoundAlertsEnableSuccessLabel,
} from "@/lib/customerSoundAlertsCopy";
import {
  isCustomerReadyAudioPrepared,
  prepareCustomerReadyAudioFromUserGesture,
} from "@/lib/customerReadyAudioPrepare";
import { cn } from "@/lib/utils";

type CustomerSoundAlertsEnableProps = {
  language: "ar" | "en";
  className?: string;
};

/**
 * AUDIO-ENABLE-UX-1 — enables READY audio playback on mobile; not push/notifications.
 */
export function CustomerSoundAlertsEnable({
  language,
  className,
}: CustomerSoundAlertsEnableProps) {
  const [enabled, setEnabled] = useState(() => isCustomerReadyAudioPrepared());
  const [activating, setActivating] = useState(false);

  useEffect(() => {
    if (isCustomerReadyAudioPrepared()) {
      setEnabled(true);
    }
  }, []);

  const handleEnable = useCallback(async () => {
    if (enabled || activating) return;
    setActivating(true);
    try {
      const ready = await prepareCustomerReadyAudioFromUserGesture();
      if (ready) {
        setEnabled(true);
      }
    } finally {
      setActivating(false);
    }
  }, [enabled, activating]);

  if (enabled) {
    return (
      <p
        className={cn(
          "text-center text-sm font-medium text-green-700 dark:text-green-400",
          className
        )}
        role="status"
      >
        {getSoundAlertsEnableSuccessLabel(language)}
      </p>
    );
  }

  return (
    <Button
      type="button"
      className={cn(
        "w-full font-bold py-5 bg-orange-500 hover:bg-orange-600 text-white",
        className
      )}
      disabled={activating}
      onClick={() => void handleEnable()}
    >
      {activating
        ? getSoundAlertsEnableActivatingLabel(language)
        : getSoundAlertsEnableCtaLabel(language)}
    </Button>
  );
}
