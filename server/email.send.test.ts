import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  resendSend: vi.fn(),
  smtpSendMail: vi.fn(),
}));

vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: mocks.resendSend },
  })),
}));

vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: mocks.smtpSendMail,
    })),
  },
}));

describe("sendEmail transport", () => {
  const originalResendKey = process.env.RESEND_API_KEY;
  const originalEmailUser = process.env.EMAIL_USER;
  const originalEmailPassword = process.env.EMAIL_PASSWORD;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mocks.resendSend.mockResolvedValue({ data: { id: "msg_123" }, error: null });
    mocks.smtpSendMail.mockResolvedValue({});
  });

  afterEach(() => {
    if (originalResendKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalResendKey;
    if (originalEmailUser === undefined) delete process.env.EMAIL_USER;
    else process.env.EMAIL_USER = originalEmailUser;
    if (originalEmailPassword === undefined) delete process.env.EMAIL_PASSWORD;
    else process.env.EMAIL_PASSWORD = originalEmailPassword;
  });

  it("uses Resend when RESEND_API_KEY is set", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    const { sendEmail } = await import("./email");

    const ok = await sendEmail({
      to: "info@mineuqr.com",
      subject: "Test",
      html: "<p>Hi</p>",
    });

    expect(ok).toBe(true);
    expect(mocks.resendSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "MineuQR <info@mineuqr.com>",
        to: "info@mineuqr.com",
        subject: "Test",
        html: "<p>Hi</p>",
      })
    );
    expect(mocks.smtpSendMail).not.toHaveBeenCalled();
  });

  it("returns false when Resend returns an error", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    mocks.resendSend.mockResolvedValueOnce({
      data: null,
      error: { message: "API key invalid" },
    });
    const { sendEmail } = await import("./email");

    const ok = await sendEmail({
      to: "user@example.com",
      subject: "Test",
      html: "<p>Hi</p>",
    });

    expect(ok).toBe(false);
  });

  it("falls back to SMTP when RESEND_API_KEY is unset", async () => {
    delete process.env.RESEND_API_KEY;
    process.env.EMAIL_USER = "info@mineuqr.com";
    process.env.EMAIL_PASSWORD = "secret";
    const { sendEmail } = await import("./email");

    const ok = await sendEmail({
      to: "user@example.com",
      subject: "Test",
      html: "<p>Hi</p>",
    });

    expect(ok).toBe(true);
    expect(mocks.smtpSendMail).toHaveBeenCalled();
    expect(mocks.resendSend).not.toHaveBeenCalled();
  });

  it("returns false on SMTP when credentials are missing", async () => {
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_USER;
    delete process.env.EMAIL_PASSWORD;
    const { sendEmail } = await import("./email");

    const ok = await sendEmail({
      to: "user@example.com",
      subject: "Test",
      html: "<p>Hi</p>",
    });

    expect(ok).toBe(false);
    expect(mocks.smtpSendMail).not.toHaveBeenCalled();
  });
});
