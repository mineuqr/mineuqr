import { afterEach, describe, expect, it } from "vitest";
import type { Request } from "express";
import { baseUrlForLinks, canChangeOwnPassword } from "./httpHelpers";

function mockReq(input: {
  protocol?: string;
  headers?: Record<string, string>;
  host?: string;
}): Request {
  return {
    protocol: input.protocol ?? "http",
    headers: input.headers ?? {},
    get: (name: string) => (name.toLowerCase() === "host" ? input.host : undefined),
  } as Request;
}

describe("canChangeOwnPassword", () => {
  it("returns true when email and passwordHash are present", () => {
    expect(
      canChangeOwnPassword({
        email: "user@example.com",
        passwordHash: "$2a$12$hash",
      })
    ).toBe(true);
  });

  it("returns false for Manus openId without passwordHash", () => {
    expect(
      canChangeOwnPassword({
        email: "oauth@example.com",
        passwordHash: null,
      })
    ).toBe(false);
  });

  it("returns false when email is missing", () => {
    expect(
      canChangeOwnPassword({
        email: null,
        passwordHash: "$2a$12$hash",
      })
    ).toBe(false);
  });
});

describe("baseUrlForLinks", () => {
  const prevPublic = process.env.PUBLIC_APP_URL;

  afterEach(() => {
    if (prevPublic === undefined) delete process.env.PUBLIC_APP_URL;
    else process.env.PUBLIC_APP_URL = prevPublic;
  });

  it("prefers PUBLIC_APP_URL when set", () => {
    process.env.PUBLIC_APP_URL = "https://staging.example/";
    const req = mockReq({});
    expect(baseUrlForLinks(req)).toBe("https://staging.example");
  });

  it("uses Origin when present", () => {
    delete process.env.PUBLIC_APP_URL;
    const req = mockReq({ headers: { origin: "https://app.example" } });
    expect(baseUrlForLinks(req)).toBe("https://app.example");
  });

  it("uses proxy-aware https from x-forwarded-proto when Origin absent", () => {
    delete process.env.PUBLIC_APP_URL;
    const req = mockReq({
      protocol: "http",
      host: "www.mineuqr.com",
      headers: { "x-forwarded-proto": "https" },
    });
    expect(baseUrlForLinks(req)).toBe("https://www.mineuqr.com");
  });
});
