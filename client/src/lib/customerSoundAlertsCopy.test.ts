import { describe, expect, it } from "vitest";
import {
  getSoundAlertsEnableActivatingLabel,
  getSoundAlertsEnableCtaLabel,
  getSoundAlertsEnableSuccessLabel,
} from "./customerSoundAlertsCopy";

describe("customerSoundAlertsCopy AUDIO-ENABLE-UX-1", () => {
  it("uses sound-alert copy distinct from notification enrollment", () => {
    expect(getSoundAlertsEnableCtaLabel("ar")).toBe("🔔 تفعيل التنبيهات الصوتية");
    expect(getSoundAlertsEnableCtaLabel("en")).toBe("🔔 Enable sound alerts");
    expect(getSoundAlertsEnableSuccessLabel("ar")).toBe("✅ تم تفعيل التنبيهات الصوتية");
    expect(getSoundAlertsEnableSuccessLabel("en")).toBe("✅ Sound alerts enabled");
    expect(getSoundAlertsEnableActivatingLabel("ar")).toBe("جاري التفعيل...");
  });
});
