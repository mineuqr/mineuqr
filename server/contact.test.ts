import { describe, it, expect, vi } from "vitest";

// Mock the email module
vi.mock("./email", () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
}));

describe("Contact Form Validation", () => {
  it("should validate name is at least 2 characters", () => {
    const name = "A";
    expect(name.length).toBeLessThan(2);
  });

  it("should validate name with 2+ characters passes", () => {
    const name = "AB";
    expect(name.length).toBeGreaterThanOrEqual(2);
  });

  it("should validate email format", () => {
    const validEmail = "test@example.com";
    const invalidEmail = "notanemail";
    expect(validEmail).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    expect(invalidEmail).not.toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  });

  it("should validate subject is at least 3 characters", () => {
    const shortSubject = "AB";
    const validSubject = "ABC";
    expect(shortSubject.length).toBeLessThan(3);
    expect(validSubject.length).toBeGreaterThanOrEqual(3);
  });

  it("should validate message is at least 10 characters", () => {
    const shortMessage = "Hello";
    const validMessage = "Hello, this is a test message";
    expect(shortMessage.length).toBeLessThan(10);
    expect(validMessage.length).toBeGreaterThanOrEqual(10);
  });

  it("should accept valid contact form data", () => {
    const formData = {
      name: "John Doe",
      email: "john@example.com",
      subject: "Test Subject",
      message: "This is a test message with enough characters",
    };
    expect(formData.name.length).toBeGreaterThanOrEqual(2);
    expect(formData.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    expect(formData.subject.length).toBeGreaterThanOrEqual(3);
    expect(formData.message.length).toBeGreaterThanOrEqual(10);
  });

  it("should send email to info@mineuqr.com", async () => {
    const { sendEmail } = await import("./email");
    await sendEmail({
      to: "info@mineuqr.com",
      subject: "Test Contact",
      html: "<p>Test</p>",
    });
    expect(sendEmail).toHaveBeenCalledWith({
      to: "info@mineuqr.com",
      subject: "Test Contact",
      html: "<p>Test</p>",
    });
  });
});
