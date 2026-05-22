import { describe, it, expect } from "vitest";
import nodemailer from "nodemailer";

describe("Email Configuration (Yahoo SMTP)", () => {
  it("should have EMAIL_HOST configured", () => {
    expect(process.env.EMAIL_HOST).toBe("smtp.mail.yahoo.com");
  });

  it("should have EMAIL_PORT configured to 465", () => {
    expect(process.env.EMAIL_PORT).toBe("465");
  });

  it("should have EMAIL_SECURE set to true", () => {
    expect(process.env.EMAIL_SECURE).toBe("true");
  });

  it("should have EMAIL_USER configured", () => {
    expect(process.env.EMAIL_USER).toBeTruthy();
    expect(process.env.EMAIL_USER).toContain("@yahoo.com");
  });

  it("should have EMAIL_PASSWORD configured", () => {
    expect(process.env.EMAIL_PASSWORD).toBeTruthy();
    expect(process.env.EMAIL_PASSWORD!.length).toBeGreaterThan(0);
  });

  it("should have EMAIL_FROM configured", () => {
    expect(process.env.EMAIL_FROM).toBeTruthy();
  });

  it("should verify SMTP connection to Yahoo with SSL", async () => {
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
