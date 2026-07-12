import { describe, expect, it } from "vitest";
import {
  resolveAccessFocusFromManageAction,
  resolveDetailsTabFromManageAction,
  screenDetailsTabLabel,
} from "@/lib/screen-management/screenDetailsPresentation";

describe("screenDetailsPresentation", () => {
  it("labels tabs for operators", () => {
    expect(screenDetailsTabLabel("display", "en")).toBe("Display");
    expect(screenDetailsTabLabel("access", "ar")).toBe("الوصول");
    expect(screenDetailsTabLabel("diagnostics", "en")).toBe("Diagnostics");
  });

  it("routes manage actions to Display, Access, or Diagnostics tabs", () => {
    expect(resolveDetailsTabFromManageAction("show_qr")).toBe("access");
    expect(resolveDetailsTabFromManageAction("copy_link")).toBe("access");
    expect(resolveDetailsTabFromManageAction("regenerate")).toBe("access");
    expect(resolveDetailsTabFromManageAction("delete")).toBe("access");
    expect(resolveDetailsTabFromManageAction("diagnostics")).toBe("diagnostics");
  });

  it("keeps diagnostics out of access focus", () => {
    expect(resolveAccessFocusFromManageAction("diagnostics")).toBeNull();
    expect(resolveAccessFocusFromManageAction("show_qr")).toBe("show_qr");
    expect(resolveAccessFocusFromManageAction("regenerate")).toBe("regenerate");
  });
});
