import { describe, expect, it } from "vitest";

describe("PayPal API Keys", () => {
  it("should have PAYPAL_CLIENT_ID set", () => {
    expect(process.env.PAYPAL_CLIENT_ID).toBeDefined();
    expect(process.env.PAYPAL_CLIENT_ID!.length).toBeGreaterThan(10);
  });

  it("should have PAYPAL_SECRET set", () => {
    expect(process.env.PAYPAL_SECRET).toBeDefined();
    expect(process.env.PAYPAL_SECRET!.length).toBeGreaterThan(10);
  });

  it("should be able to get PayPal access token", async () => {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const secret = process.env.PAYPAL_SECRET;

    if (!clientId || !secret) {
      console.warn("PayPal keys not set, skipping live test");
      return;
    }

    const auth = Buffer.from(`${clientId}:${secret}`).toString("base64");

    const response = await fetch("https://api.sandbox.paypal.com/v1/oauth2/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    expect(response.ok).toBe(true);
    const data = await response.json() as { access_token: string };
    expect(data.access_token).toBeDefined();
    expect(data.access_token.length).toBeGreaterThan(0);
  }, 15000);
});
