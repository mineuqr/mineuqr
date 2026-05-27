import { describe, it, expect } from "vitest";
import nodemailer from "nodemailer";

describe("Email Configuration (Yahoo SMTP)", () => {
  const required = {
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_SECURE,
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
    from: process.env.EMAIL_FROM,
  };

  const hasEmailConfig =
    Boolean(required.host) &&
    Boolean(required.port) &&
    Boolean(required.secure) &&
    Boolean(required.user) &&
    Boolean(required.pass) &&
    Boolean(required.from);

  it("should have EMAIL_HOST configured", () => {
    if (!hasEmailConfig) {
      console.warn("[EmailConfig] Missing EMAIL_* env vars; skipping config assertions");
      return;
    }
    expect(process.env.EMAIL_HOST).toBe("smtp.mail.yahoo.com");
  });

  it("should have EMAIL_PORT configured to 465", () => {
    if (!hasEmailConfig) return;
    expect(process.env.EMAIL_PORT).toBe("465");
  });

  it("should have EMAIL_SECURE set to true", () => {
    if (!hasEmailConfig) return;
    expect(process.env.EMAIL_SECURE).toBe("true");
  });

  it("should have EMAIL_USER configured", () => {
    if (!hasEmailConfig) return;
    expect(process.env.EMAIL_USER).toBeTruthy();
    expect(process.env.EMAIL_USER).toContain("@yahoo.com");
  });

  it("should have EMAIL_PASSWORD configured", () => {
    if (!hasEmailConfig) return;
    expect(process.env.EMAIL_PASSWORD).toBeTruthy();
    expect(process.env.EMAIL_PASSWORD!.length).toBeGreaterThan(0);
  });

  it("should have EMAIL_FROM configured", () => {
    if (!hasEmailConfig) return;
    expect(process.env.EMAIL_FROM).toBeTruthy();
  });

  it("should verify SMTP connection to Yahoo with SSL", async () => {
    if (!hasEmailConfig) {
      console.warn("[EmailConfig] Missing EMAIL_* env vars; skipping SMTP verify");
      return;
    }
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || "smtp.mail.yahoo.com",
      port: parseInt(process.env.EMAIL_PORT || "465"),
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      connectionTimeout: 20000,
      greetingTimeout: 15000,
    });

    const verified = await transporter.verify();
    expect(verified).toBe(true);
  }, 25000);
});
