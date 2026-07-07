import { describe, expect, it } from "vitest";
import { resolveEntityImagePublicUrl } from "@shared/entityImage";
import { resolveOfferImageUrl } from "../offerImage";

describe("offerImage", () => {
  it("prefers canonical image.publicUrl over legacy imageUrl", () => {
    expect(
      resolveOfferImageUrl({
        imageUrl: "https://legacy.example/old.jpg",
        image: {
          storageKey: "offers/1/1-x.jpg",
          publicUrl: "https://cdn.example/new.jpg",
          width: 100,
          height: 100,
          mimeType: "image/jpeg",
          fileSize: 1000,
          uploadedAt: "2026-07-07T00:00:00.000Z",
        },
      })
    ).toBe("https://cdn.example/new.jpg");
  });

  it("falls back to legacy imageUrl", () => {
    expect(resolveOfferImageUrl({ imageUrl: "https://legacy.example/old.jpg" })).toBe(
      "https://legacy.example/old.jpg"
    );
  });

  it("resolveEntityImagePublicUrl returns undefined when empty", () => {
    expect(resolveEntityImagePublicUrl(null, null)).toBeUndefined();
  });
});
