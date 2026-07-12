import { describe, expect, it } from "vitest";
import { fleetScreenActionLabels } from "@/lib/screen-management/fleetScreenActionsPresentation";

describe("fleetScreenActionsPresentation", () => {
  it("uses Revision B certified action labels", () => {
    const en = fleetScreenActionLabels("en");
    expect(en.openScreen).toBe("Open screen");
    expect(en.setUpScreen).toBe("Set up screen");
    expect(en.settings).toBe("Settings");
  });

  it("provides Arabic action labels", () => {
    const ar = fleetScreenActionLabels("ar");
    expect(ar.openScreen).toBe("فتح الشاشة");
    expect(ar.setUpScreen).toBe("إعداد الشاشة");
  });
});
