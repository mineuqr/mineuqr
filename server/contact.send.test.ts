import { beforeEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  sendEmail: vi.fn<[], Promise<boolean>>(),
  notifyOwner: vi.fn<[], Promise<boolean>>(),
}));

vi.mock("./email", () => ({
  sendEmail: mocks.sendEmail,
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: mocks.notifyOwner,
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
    mocks.notifyOwner.mockResolvedValue(true);
  });

  it("returns success when email and Forge both succeed", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.contact.send(validInput);

    expect(result.success).toBe(true);
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
    expect(mocks.notifyOwner).toHaveBeenCalledTimes(1);
  });

  it("returns success when email succeeds but Forge throws (missing config)", async () => {
    mocks.notifyOwner.mockRejectedValueOnce(
      new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Notification service URL is not configured.",
      })
    );

    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.contact.send(validInput);

    expect(result.success).toBe(true);
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
  });

  it("returns success when email succeeds but Forge returns false", async () => {
    mocks.notifyOwner.mockResolvedValueOnce(false);

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
    expect(mocks.notifyOwner).not.toHaveBeenCalled();
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
