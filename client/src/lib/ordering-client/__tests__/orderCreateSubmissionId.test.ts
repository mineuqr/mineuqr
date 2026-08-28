import { afterEach, describe, expect, it, vi } from "vitest";
import {
  beginTableOrderCreateSubmission,
  clearTableOrderCreateSubmission,
  digestTableOrderCreatePayload,
  ORDER_CREATE_SUBMISSION_TTL_MS,
  readTableOrderCreateSubmission,
  tableOrderCreateSubmissionStorageKey,
} from "../checkout/orderCreateSubmissionStorage";

function stubSessionStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal("sessionStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  });
  return store;
}

const payload = {
  restaurantId: 1,
  tableNumber: 3,
  customerName: "Ada",
  notes: "no onions",
  items: [{ menuItemId: 10, quantity: 1, notes: null, modifiers: ["x"] }],
};

describe("Table/QR order.create submission persistence", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reuses the same submissionId for retry, remount, and refresh of the same payload", () => {
    stubSessionStorage();
    const digest = digestTableOrderCreatePayload(payload);
    const first = beginTableOrderCreateSubmission(
      { restaurantId: 1, tableNumber: 3, payloadDigest: digest },
      { nowMs: 1_000, createId: () => "11111111-1111-4111-8111-111111111111" }
    );
    expect(first).toBe("11111111-1111-4111-8111-111111111111");
    const afterRefresh = beginTableOrderCreateSubmission(
      { restaurantId: 1, tableNumber: 3, payloadDigest: digest },
      { nowMs: 2_000, createId: () => "22222222-2222-4222-8222-222222222222" }
    );
    expect(afterRefresh).toBe(first);
    expect(readTableOrderCreateSubmission(1, 3, 2_000)?.submissionId).toBe(first);
  });

  it("simulates commit then lost HTTP then refresh then retry with the recovered id", () => {
    stubSessionStorage();
    const digest = digestTableOrderCreatePayload(payload);
    const submissionId = beginTableOrderCreateSubmission(
      { restaurantId: 1, tableNumber: 3, payloadDigest: digest },
      { nowMs: 1_000, createId: () => "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa" }
    );
    expect(readTableOrderCreateSubmission(1, 3, 1_500)?.submissionId).toBe(
      submissionId
    );
    const recovered = beginTableOrderCreateSubmission(
      { restaurantId: 1, tableNumber: 3, payloadDigest: digest },
      { nowMs: 1_800, createId: () => "bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb" }
    );
    expect(recovered).toBe(submissionId);
  });

  it("does not create a server Order merely by persisting the id", () => {
    stubSessionStorage();
    const digest = digestTableOrderCreatePayload(payload);
    beginTableOrderCreateSubmission(
      { restaurantId: 1, tableNumber: 3, payloadDigest: digest },
      { nowMs: 1_000, createId: () => "11111111-1111-4111-8111-111111111111" }
    );
    expect(
      tableOrderCreateSubmissionStorageKey(1, 3)
    ).toBe("mineuqr:order-create-submission:1:3");
    expect(readTableOrderCreateSubmission(1, 3, 1_000)?.submissionId).toBe(
      "11111111-1111-4111-8111-111111111111"
    );
  });

  it("issues a new submissionId after TTL so an abandoned checkout is not replayed", () => {
    stubSessionStorage();
    const digest = digestTableOrderCreatePayload(payload);
    const first = beginTableOrderCreateSubmission(
      { restaurantId: 1, tableNumber: 3, payloadDigest: digest },
      { nowMs: 1_000, createId: () => "11111111-1111-4111-8111-111111111111" }
    );
    const later = beginTableOrderCreateSubmission(
      { restaurantId: 1, tableNumber: 3, payloadDigest: digest },
      {
        nowMs: 1_000 + ORDER_CREATE_SUBMISSION_TTL_MS + 1,
        createId: () => "33333333-3333-4333-8333-333333333333",
      }
    );
    expect(later).not.toBe(first);
    expect(later).toBe("33333333-3333-4333-8333-333333333333");
  });

  it("issues a new submissionId when the payload changes", () => {
    stubSessionStorage();
    const first = beginTableOrderCreateSubmission(
      {
        restaurantId: 1,
        tableNumber: 3,
        payloadDigest: digestTableOrderCreatePayload(payload),
      },
      { nowMs: 1_000, createId: () => "11111111-1111-4111-8111-111111111111" }
    );
    const second = beginTableOrderCreateSubmission(
      {
        restaurantId: 1,
        tableNumber: 3,
        payloadDigest: digestTableOrderCreatePayload({
          ...payload,
          items: [{ menuItemId: 10, quantity: 9 }],
        }),
      },
      { nowMs: 1_100, createId: () => "44444444-4444-4444-8444-444444444444" }
    );
    expect(second).not.toBe(first);
  });

  it("isolates restaurants and tables so two tabs/checkouts stay independent", () => {
    stubSessionStorage();
    const digest = digestTableOrderCreatePayload(payload);
    const table3 = beginTableOrderCreateSubmission(
      { restaurantId: 1, tableNumber: 3, payloadDigest: digest },
      { nowMs: 1_000, createId: () => "11111111-1111-4111-8111-111111111111" }
    );
    const table4 = beginTableOrderCreateSubmission(
      {
        restaurantId: 1,
        tableNumber: 4,
        payloadDigest: digestTableOrderCreatePayload({
          ...payload,
          tableNumber: 4,
        }),
      },
      { nowMs: 1_000, createId: () => "55555555-5555-4555-8555-555555555555" }
    );
    const restaurant2 = beginTableOrderCreateSubmission(
      {
        restaurantId: 2,
        tableNumber: 3,
        payloadDigest: digestTableOrderCreatePayload({
          ...payload,
          restaurantId: 2,
        }),
      },
      { nowMs: 1_000, createId: () => "66666666-6666-4666-8666-666666666666" }
    );
    expect(table3).not.toBe(table4);
    expect(table3).not.toBe(restaurant2);
  });

  it("clears the in-flight identity after success so the next order is new", () => {
    stubSessionStorage();
    const digest = digestTableOrderCreatePayload(payload);
    const first = beginTableOrderCreateSubmission(
      { restaurantId: 1, tableNumber: 3, payloadDigest: digest },
      { nowMs: 1_000, createId: () => "11111111-1111-4111-8111-111111111111" }
    );
    clearTableOrderCreateSubmission(1, 3);
    const second = beginTableOrderCreateSubmission(
      { restaurantId: 1, tableNumber: 3, payloadDigest: digest },
      { nowMs: 1_200, createId: () => "77777777-7777-4777-8777-777777777777" }
    );
    expect(second).not.toBe(first);
  });

  it("ignores client unit amounts when digesting the local payload", () => {
    const withAmount = digestTableOrderCreatePayload({
      ...payload,
      items: payload.items.map((item) => ({ ...item, price: "99.00" })),
    });
    expect(digestTableOrderCreatePayload(payload)).toBe(withAmount);
  });
});
