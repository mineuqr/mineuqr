import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  sendEmail: vi.fn<[], Promise<boolean>>(),
}));

vi.mock("./email", () => ({
  sendEmail: mocks.sendEmail,
}));

import { appRouter } from "./routers";

const validInput = {
  name: "John Doe",
  email: "john@example.com",
  subject: "Test Subject",
  message: "This is a test message with enough characters",
};

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("contact.send", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sendEmail.mockResolvedValue(true);
  });

  it("returns success when primary email succeeds", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.contact.send(validInput);

    expect(result.success).toBe(true);
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
  });

  it("fails when primary email delivery fails", async () => {
    mocks.sendEmail.mockResolvedValueOnce(false);

    const caller = appRouter.createCaller(createPublicContext());

    await expect(caller.contact.send(validInput)).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      message: "حدث خطأ في إرسال الرسالة. يرجى المحاولة لاحقاً",
    });
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid contact input (validation)", async () => {
    const caller = appRouter.createCaller(createPublicContext());

    await expect(
      caller.contact.send({
        ...validInput,
        message: "short",
      })
    ).rejects.toBeTruthy();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });
});
