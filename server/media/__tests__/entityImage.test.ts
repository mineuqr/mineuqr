import { describe, expect, it } from "vitest";
import {
  buildEntityImageMetadata,
  probeImageDimensions,
  validateEntityImageUpload,
} from "../entityImage";

describe("entityImage OFFER-IMAGE-MANAGEMENT-1", () => {
  it("rejects oversize uploads", () => {
    expect(() =>
      validateEntityImageUpload({
        buffer: Buffer.alloc(6 * 1024 * 1024),
        contentType: "image/png",
        fileName: "big.png",
      })
    ).toThrow(/5/);
  });

  it("rejects unsupported mime types", () => {
    expect(() =>
      validateEntityImageUpload({
        buffer: Buffer.from("x"),
        contentType: "application/pdf",
        fileName: "doc.pdf",
      })
    ).toThrow();
  });

  it("probes PNG dimensions", () => {
    const png = Buffer.alloc(24);
    png[0] = 0x89;
    png[1] = 0x50;
    png[2] = 0x4e;
    png[3] = 0x47;
    png.writeUInt32BE(640, 16);
    png.writeUInt32BE(480, 20);
    expect(probeImageDimensions(png)).toEqual({ width: 640, height: 480 });
  });

  it("builds canonical metadata", () => {
    const png = Buffer.alloc(24);
    png[0] = 0x89;
    png[1] = 0x50;
    png[2] = 0x4e;
    png[3] = 0x47;
    png.writeUInt32BE(100, 16);
    png.writeUInt32BE(200, 20);
    const meta = buildEntityImageMetadata({
      storageKey: "offers/1/1-abc-photo.png",
      publicUrl: "https://cdn.example/offers/1/1-abc-photo.png",
      mimeType: "image/png",
      fileSize: 24,
      buffer: png,
    });
    expect(meta.storageKey).toContain("offers/1/");
    expect(meta.publicUrl).toContain("https://");
    expect(meta.width).toBe(100);
    expect(meta.height).toBe(200);
    expect(meta.mimeType).toBe("image/png");
    expect(meta.fileSize).toBe(24);
    expect(meta.uploadedAt).toMatch(/^\d{4}-/);
  });
});
