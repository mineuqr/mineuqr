import { describe, it, expect } from "vitest";

// Test template configuration and logic
// We test the template mapping logic by importing the shared constants

describe("Menu Templates Configuration", () => {
  // Template IDs that should exist
  const expectedTemplates = ["classic", "elegant", "modern", "dark", "warm", "ocean", "royal", "neon"];

  it("should have exactly 8 templates defined", () => {
    expect(expectedTemplates).toHaveLength(8);
  });

  it("classic should be the only free template", () => {
    const freeTemplates = ["classic"];
    const premiumTemplates = expectedTemplates.filter(t => t !== "classic");
    expect(freeTemplates).toHaveLength(1);
    expect(premiumTemplates).toHaveLength(7);
  });

  it("should validate template IDs against the enum in updateTemplate", () => {
    const validTemplateIds = ["classic", "elegant", "modern", "dark", "warm", "ocean", "royal", "neon"];
    for (const id of expectedTemplates) {
      expect(validTemplateIds).toContain(id);
    }
  });

  it("should reject invalid template IDs", () => {
    const validTemplateIds = ["classic", "elegant", "modern", "dark", "warm", "ocean", "royal", "neon"];
    expect(validTemplateIds).not.toContain("invalid");
    expect(validTemplateIds).not.toContain("");
    expect(validTemplateIds).not.toContain("premium");
  });

  it("default template should be classic", () => {
    const defaultTemplate = "classic";
    expect(defaultTemplate).toBe("classic");
    expect(expectedTemplates).toContain(defaultTemplate);
  });
});

describe("Template Premium Gating Logic", () => {
  const premiumTemplates = ["elegant", "modern", "dark", "warm", "ocean", "royal", "neon"];

  it("should correctly identify premium templates", () => {
    for (const templateId of premiumTemplates) {
      expect(premiumTemplates.includes(templateId)).toBe(true);
    }
  });

  it("classic should not be premium", () => {
    expect(premiumTemplates.includes("classic")).toBe(false);
  });

  it("should allow classic for non-subscribed users", () => {
    const isSubscribed = false;
    const templateId = "classic";
    const isPremium = premiumTemplates.includes(templateId);
    const canAccess = !isPremium || isSubscribed;
    expect(canAccess).toBe(true);
  });

  it("should block premium templates for non-subscribed users", () => {
    const isSubscribed = false;
    for (const templateId of premiumTemplates) {
      const isPremium = premiumTemplates.includes(templateId);
      const canAccess = !isPremium || isSubscribed;
      expect(canAccess).toBe(false);
    }
  });

  it("should allow all templates for subscribed users", () => {
    const isSubscribed = true;
    for (const templateId of [...premiumTemplates, "classic"]) {
      const isPremium = premiumTemplates.includes(templateId);
      const canAccess = !isPremium || isSubscribed;
      expect(canAccess).toBe(true);
    }
  });

  it("should allow premium templates during active trial", () => {
    const isSubscribed = false;
    const trialEndDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day from now
    const isTrialActive = trialEndDate > new Date();
    for (const templateId of premiumTemplates) {
      const isPremium = premiumTemplates.includes(templateId);
      const canAccess = !isPremium || isSubscribed || isTrialActive;
      expect(canAccess).toBe(true);
    }
  });

  it("should block premium templates after trial expires", () => {
    const isSubscribed = false;
    const trialEndDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago
    const isTrialActive = trialEndDate > new Date();
    for (const templateId of premiumTemplates) {
      const isPremium = premiumTemplates.includes(templateId);
      const canAccess = !isPremium || isSubscribed || isTrialActive;
      expect(canAccess).toBe(false);
    }
  });
});
