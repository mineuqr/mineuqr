import { describe, expect, it } from "vitest";
import {
  formatProjectedFulfilmentLabel,
  localizedProjectedFulfilmentLabel,
} from "../formatProjectedFulfilment";

describe("OPERATIONAL-FULFILMENT-PRESENTATION-1 projected fulfilment formatting", () => {
  it("formats table anchors with Table/Room prefix from projected label", () => {
    expect(
      formatProjectedFulfilmentLabel(
        {
          serviceMode: "table_service",
          fulfilmentAnchorType: "table",
          fulfilmentLabel: "12",
        },
        { isAr: false }
      )
    ).toBe("Table 12");
    expect(
      formatProjectedFulfilmentLabel(
        {
          serviceMode: "table_service",
          fulfilmentAnchorType: "table",
          fulfilmentLabel: "12",
        },
        { isAr: true, tableUnit: "room" }
      )
    ).toBe("غرفة 12");
  });

  it("displays station / pickup / queue / lane labels as projected", () => {
    expect(
      formatProjectedFulfilmentLabel(
        {
          serviceMode: "counter",
          fulfilmentAnchorType: "station",
          fulfilmentLabel: "Station A",
        },
        { isAr: false }
      )
    ).toBe("Station A");
    expect(
      formatProjectedFulfilmentLabel(
        {
          serviceMode: "pickup",
          fulfilmentAnchorType: "pickup_point",
          fulfilmentLabel: "Pickup A",
        },
        { isAr: false }
      )
    ).toBe("Pickup A");
    expect(
      formatProjectedFulfilmentLabel(
        {
          serviceMode: "queue",
          fulfilmentAnchorType: "queue",
          fulfilmentLabel: "Queue 3",
        },
        { isAr: false }
      )
    ).toBe("Queue 3");
    expect(
      formatProjectedFulfilmentLabel(
        {
          serviceMode: "drive_thru",
          fulfilmentAnchorType: "drive_lane",
          fulfilmentLabel: "Lane 2",
        },
        { isAr: false }
      )
    ).toBe("Lane 2");
  });

  it("localizes takeaway stamps without reconstructing from tableNumber", () => {
    expect(
      formatProjectedFulfilmentLabel(
        {
          serviceMode: "take_away",
          fulfilmentAnchorType: "station",
          fulfilmentLabel: "Take Away",
        },
        { isAr: true }
      )
    ).toBe("سفري");
    expect(
      localizedProjectedFulfilmentLabel({
        serviceMode: "take_away",
        fulfilmentAnchorType: "station",
        fulfilmentLabel: "Take Away",
      }).en
    ).toBe("Take Away");
  });
});
