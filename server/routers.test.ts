import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

// ─── Mock data must be defined inside factory or use vi.hoisted ─

const mocks = vi.hoisted(() => {
  const mockRestaurant = {
    id: 1,
    userId: 1,
    nameAr: "مطعم التجربة",
    nameEn: "Test Restaurant",
    slug: "test-abc123",
    descriptionAr: "وصف تجريبي",
    descriptionEn: null,
    phone: "+966500000000",
    address: "الرياض",
    logoUrl: null,
    coverUrl: null,
    isActive: true,
    viewCount: 99,
    menuTemplate: "classic",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCategory = {
    id: 1,
    restaurantId: 1,
    nameAr: "مقبلات",
    nameEn: "Appetizers",
    descriptionAr: null,
    descriptionEn: null,
    iconName: null,
    sortOrder: 0,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMenuItem = {
    id: 1,
    categoryId: 1,
    restaurantId: 1,
    nameAr: "حمص",
    nameEn: "Hummus",
    descriptionAr: "حمص تقليدي",
    descriptionEn: null,
    price: "15.00",
    imageUrl: null,
    isAvailable: true,
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTable = {
    id: 1,
    restaurantId: 1,
    tableNumber: 1,
    nameAr: "طاولة 1",
    nameEn: "Table 1",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockHoliday = {
    id: 1,
    restaurantId: 1,
    titleAr: "عطلة",
    titleEn: "Holiday",
    date: "2099-01-01",
    isFullDayClosed: true,
    openTime: null,
    closeTime: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return { mockRestaurant, mockCategory, mockMenuItem, mockTable, mockHoliday };
});

vi.mock("./db", () => ({
  getRestaurantsByUser: vi.fn().mockResolvedValue([mocks.mockRestaurant]),
  getRestaurantById: vi.fn().mockImplementation(async (id: number) => {
    if (id === mocks.mockRestaurant.id) return { ...mocks.mockRestaurant };
    return undefined;
  }),
  getRestaurantBySlug: vi.fn().mockImplementation(async (slug: string) => {
    if (slug === mocks.mockRestaurant.slug) return { ...mocks.mockRestaurant };
    return undefined;
  }),
  createRestaurant: vi.fn().mockResolvedValue({ id: 2 }),
  updateRestaurant: vi.fn().mockResolvedValue(undefined),
  deleteRestaurant: vi.fn().mockResolvedValue(undefined),
  incrementViewCount: vi.fn().mockResolvedValue(undefined),
  getCategoriesByRestaurant: vi.fn().mockResolvedValue([mocks.mockCategory]),
  getCategoryById: vi.fn().mockImplementation(async (id: number) => {
    if (id === mocks.mockCategory.id) return { ...mocks.mockCategory };
    return undefined;
  }),
  createCategory: vi.fn().mockResolvedValue({ id: 2 }),
  updateCategory: vi.fn().mockResolvedValue(undefined),
  deleteCategory: vi.fn().mockResolvedValue(undefined),
  getMenuItemsByCategory: vi.fn().mockResolvedValue([mocks.mockMenuItem]),
  getMenuItemsByRestaurant: vi.fn().mockResolvedValue([mocks.mockMenuItem]),
  getMenuItemById: vi.fn().mockImplementation(async (id: number) => {
    if (id === mocks.mockMenuItem.id) return { ...mocks.mockMenuItem };
    return undefined;
  }),
  createMenuItem: vi.fn().mockResolvedValue({ id: 2 }),
  updateMenuItem: vi.fn().mockResolvedValue(undefined),
  deleteMenuItem: vi.fn().mockResolvedValue(undefined),
  getRestaurantStats: vi.fn().mockResolvedValue({ totalCategories: 3, totalItems: 15, viewCount: 99 }),
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
  getSubscriptionPlans: vi.fn().mockResolvedValue([]),
  getSubscriptionPlanById: vi.fn().mockResolvedValue(null),
  createUserSubscription: vi.fn().mockResolvedValue({ id: 1 }),
  getUserSubscription: vi.fn().mockResolvedValue(null),
  updateUserSubscription: vi.fn().mockResolvedValue({ success: true }),
  isSubscriptionActive: vi.fn().mockResolvedValue(true),
  getTrialEndDate: vi.fn().mockResolvedValue(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)),

  getTableById: vi.fn().mockImplementation(async (id: number) => {
    if (id === mocks.mockTable.id) return { ...mocks.mockTable };
    return undefined;
  }),
  updateTable: vi.fn().mockResolvedValue(undefined),
  deleteTable: vi.fn().mockResolvedValue(undefined),

  getHolidaysByRestaurant: vi.fn().mockResolvedValue([mocks.mockHoliday]),
  getHolidayById: vi.fn().mockImplementation(async (id: number) => {
    if (id === mocks.mockHoliday.id) return { ...mocks.mockHoliday };
    return undefined;
  }),
  createHoliday: vi.fn().mockResolvedValue(2),
  updateHoliday: vi.fn().mockResolvedValue(undefined),
  deleteHoliday: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ url: "https://cdn.example.com/test.png", key: "test.png" }),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

// Must import AFTER mocks
import { appRouter } from "./routers";

// ─── Context helpers ────────────────────────────────────────

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId = 1): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `user-${userId}`,
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ─── Restaurant Tests ───────────────────────────────────────

describe("restaurant router", () => {
  it("lists restaurants for authenticated user", async () => {
    const caller = appRouter.createCaller(createAuthContext(1));
    const result = await caller.restaurant.list();
    expect(result).toHaveLength(1);
    expect(result[0].nameAr).toBe("مطعم التجربة");
  });

  it("gets restaurant by id for owner", async () => {
    const caller = appRouter.createCaller(createAuthContext(1));
    const result = await caller.restaurant.getById({ id: 1 });
    expect(result).not.toBeNull();
    expect(result?.nameAr).toBe("مطعم التجربة");
  });

  it("returns null when non-owner tries to get restaurant", async () => {
    const caller = appRouter.createCaller(createAuthContext(999));
    const result = await caller.restaurant.getById({ id: 1 });
    expect(result).toBeNull();
  });

  it("returns null for non-existent restaurant", async () => {
    const caller = appRouter.createCaller(createAuthContext(1));
    const result = await caller.restaurant.getById({ id: 999 });
    expect(result).toBeNull();
  });

  it("gets restaurant by slug (public)", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.restaurant.getBySlug({ slug: "test-abc123" });
    expect(result).not.toBeUndefined();
    expect(result?.nameAr).toBe("مطعم التجربة");
  });

  it("returns undefined for non-existent slug", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.restaurant.getBySlug({ slug: "nonexistent" });
    expect(result).toBeUndefined();
  });

  it("creates a restaurant", async () => {
    const caller = appRouter.createCaller(createAuthContext(1));
    const result = await caller.restaurant.create({
      nameAr: "مطعم جديد",
      nameEn: "New Restaurant",
    });
    expect(result.id).toBe(2);
    expect(result.slug).toBeDefined();
  });

  it("rejects create with empty name", async () => {
    const caller = appRouter.createCaller(createAuthContext(1));
    await expect(caller.restaurant.create({ nameAr: "" })).rejects.toThrow();
  });

  it("updates restaurant for owner", async () => {
    const caller = appRouter.createCaller(createAuthContext(1));
    const result = await caller.restaurant.update({ id: 1, nameAr: "اسم محدث" });
    expect(result.success).toBe(true);
  });

  it("rejects update for non-owner", async () => {
    const caller = appRouter.createCaller(createAuthContext(999));
    await expect(caller.restaurant.update({ id: 1, nameAr: "hack" })).rejects.toThrow();
  });

  it("deletes restaurant for owner", async () => {
    const caller = appRouter.createCaller(createAuthContext(1));
    const result = await caller.restaurant.delete({ id: 1 });
    expect(result.success).toBe(true);
  });

  it("rejects delete for non-owner", async () => {
    const caller = appRouter.createCaller(createAuthContext(999));
    await expect(caller.restaurant.delete({ id: 1 })).rejects.toThrow();
  });

  it("tracks view for public slug", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.restaurant.trackView({ slug: "test-abc123" });
    expect(result.success).toBe(true);
  });

  it("gets stats for owner", async () => {
    const caller = appRouter.createCaller(createAuthContext(1));
    const result = await caller.restaurant.stats({ id: 1 });
    expect(result).not.toBeNull();
    expect(result?.totalCategories).toBe(3);
    expect(result?.totalItems).toBe(15);
  });

  it("returns null stats for non-owner", async () => {
    const caller = appRouter.createCaller(createAuthContext(999));
    const result = await caller.restaurant.stats({ id: 1 });
    expect(result).toBeNull();
  });
});

// ─── Table Tests (STAB-SEC-1B.3D) ────────────────────────────

describe("table router", () => {
  it("allows owner to update own table", async () => {
    const caller = appRouter.createCaller(createAuthContext(1));
    const result = await caller.table.update({ id: 1, nameAr: "محدث" });
    expect(result).toEqual({ success: true });
  });

  it("forbids non-owner from updating another tenant table", async () => {
    const caller = appRouter.createCaller(createAuthContext(999));
    await expect(caller.table.update({ id: 1, nameAr: "hack" })).rejects.toThrow(
      /غير مصرح بالوصول/
    );
  });

  it("returns NOT_FOUND when updating non-existent table", async () => {
    const caller = appRouter.createCaller(createAuthContext(1));
    await expect(caller.table.update({ id: 999, nameAr: "x" })).rejects.toThrow(
      /الطاولة غير موجودة/
    );
  });

  it("allows owner to delete own table", async () => {
    const caller = appRouter.createCaller(createAuthContext(1));
    const result = await caller.table.delete({ id: 1 });
    expect(result).toEqual({ success: true });
  });

  it("forbids non-owner from deleting another tenant table", async () => {
    const caller = appRouter.createCaller(createAuthContext(999));
    await expect(caller.table.delete({ id: 1 })).rejects.toThrow(
      /غير مصرح بالوصول/
    );
  });

  it("returns NOT_FOUND when deleting non-existent table", async () => {
    const caller = appRouter.createCaller(createAuthContext(1));
    await expect(caller.table.delete({ id: 999 })).rejects.toThrow(
      /الطاولة غير موجودة/
    );
  });
});

// ─── Holiday Tests (STAB-SEC-1B.3D) ───────────────────────────

describe("holiday router", () => {
  it("A) owner manages own holiday → success", async () => {
    const caller = appRouter.createCaller(createAuthContext(1));
    const created = await caller.holiday.create({
      restaurantId: 1,
      titleAr: "عطلة جديدة",
      date: "2099-01-02",
      isFullDayClosed: true,
    });
    expect(created).toEqual({ success: true, id: 2 });

    const updated = await caller.holiday.update({ id: 1, titleAr: "محدث" });
    expect(updated).toEqual({ success: true });

    const deleted = await caller.holiday.delete({ id: 1 });
    expect(deleted).toEqual({ success: true });
  });

  it("B) non-owner manages another tenant holiday → FORBIDDEN (audited)", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const caller = appRouter.createCaller(createAuthContext(999));

    await expect(caller.holiday.list({ restaurantId: 1 })).rejects.toThrow(
      /غير مصرح بالوصول/
    );

    expect(
      warn.mock.calls.some(
        (c) => c[0] === "[AuthAudit] tenant_boundary_violation"
      )
    ).toBe(true);
    warn.mockRestore();
  });

  it("C) missing holiday entity → NOT_FOUND preserved", async () => {
    const caller = appRouter.createCaller(createAuthContext(1));
    await expect(caller.holiday.update({ id: 999, titleAr: "x" })).rejects.toThrow(
      /NOT_FOUND/
    );
    await expect(caller.holiday.delete({ id: 999 })).rejects.toThrow(/NOT_FOUND/);
  });
});

// ─── Category Tests ─────────────────────────────────────────

describe("category router", () => {
  it("lists categories for owner", async () => {
    const caller = appRouter.createCaller(createAuthContext(1));
    const result = await caller.category.list({ restaurantId: 1 });
    expect(result).toHaveLength(1);
    expect(result[0].nameAr).toBe("مقبلات");
  });

  it("returns empty for non-owner", async () => {
    const caller = appRouter.createCaller(createAuthContext(999));
    const result = await caller.category.list({ restaurantId: 1 });
    expect(result).toEqual([]);
  });

  it("lists categories publicly", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.category.listPublic({ restaurantId: 1 });
    expect(result).toHaveLength(1);
  });

  it("creates a category", async () => {
    const caller = appRouter.createCaller(createAuthContext(1));
    const result = await caller.category.create({
      restaurantId: 1,
      nameAr: "أطباق رئيسية",
      nameEn: "Main Dishes",
    });
    expect(result.id).toBe(2);
  });

  it("rejects category create for non-owner", async () => {
    const caller = appRouter.createCaller(createAuthContext(999));
    await expect(
      caller.category.create({ restaurantId: 1, nameAr: "فئة" })
    ).rejects.toThrow();
  });

  it("rejects category create with empty name", async () => {
    const caller = appRouter.createCaller(createAuthContext(1));
    await expect(
      caller.category.create({ restaurantId: 1, nameAr: "" })
    ).rejects.toThrow();
  });

  it("updates a category", async () => {
    const caller = appRouter.createCaller(createAuthContext(1));
    const result = await caller.category.update({ id: 1, nameAr: "مقبلات محدثة" });
    expect(result.success).toBe(true);
  });

  it("rejects update for non-owner", async () => {
    const caller = appRouter.createCaller(createAuthContext(999));
    await expect(
      caller.category.update({ id: 1, nameAr: "hack" })
    ).rejects.toThrow();
  });

  it("rejects update for non-existent category", async () => {
    const caller = appRouter.createCaller(createAuthContext(1));
    await expect(
      caller.category.update({ id: 999, nameAr: "test" })
    ).rejects.toThrow();
  });

  it("deletes a category", async () => {
    const caller = appRouter.createCaller(createAuthContext(1));
    const result = await caller.category.delete({ id: 1 });
    expect(result.success).toBe(true);
  });

  it("rejects delete for non-owner", async () => {
    const caller = appRouter.createCaller(createAuthContext(999));
    await expect(caller.category.delete({ id: 1 })).rejects.toThrow();
  });
});

// ─── MenuItem Tests ─────────────────────────────────────────

describe("menuItem router", () => {
  it("lists items by category", async () => {
    const caller = appRouter.createCaller(createAuthContext(1));
    const result = await caller.menuItem.listByCategory({ categoryId: 1 });
    expect(result).toHaveLength(1);
    expect(result[0].nameAr).toBe("حمص");
  });

  it("lists items by restaurant (public)", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.menuItem.listByRestaurant({ restaurantId: 1 });
    expect(result).toHaveLength(1);
  });

  it("creates a menu item", async () => {
    const caller = appRouter.createCaller(createAuthContext(1));
    const result = await caller.menuItem.create({
      categoryId: 1,
      restaurantId: 1,
      nameAr: "فتوش",
      price: "12.00",
    });
    expect(result.id).toBe(2);
  });

  it("rejects create for non-owner", async () => {
    const caller = appRouter.createCaller(createAuthContext(999));
    await expect(
      caller.menuItem.create({
        categoryId: 1,
        restaurantId: 1,
        nameAr: "صنف",
        price: "10",
      })
    ).rejects.toThrow();
  });

  it("rejects create with empty name", async () => {
    const caller = appRouter.createCaller(createAuthContext(1));
    await expect(
      caller.menuItem.create({
        categoryId: 1,
        restaurantId: 1,
        nameAr: "",
        price: "10",
      })
    ).rejects.toThrow();
  });

  it("updates a menu item", async () => {
    const caller = appRouter.createCaller(createAuthContext(1));
    const result = await caller.menuItem.update({ id: 1, nameAr: "حمص محدث" });
    expect(result.success).toBe(true);
  });

  it("toggles availability", async () => {
    const caller = appRouter.createCaller(createAuthContext(1));
    const result = await caller.menuItem.update({ id: 1, isAvailable: false });
    expect(result.success).toBe(true);
  });

  it("rejects update for non-owner", async () => {
    const caller = appRouter.createCaller(createAuthContext(999));
    await expect(
      caller.menuItem.update({ id: 1, nameAr: "hack" })
    ).rejects.toThrow();
  });

  it("rejects update for non-existent item", async () => {
    const caller = appRouter.createCaller(createAuthContext(1));
    await expect(
      caller.menuItem.update({ id: 999, nameAr: "test" })
    ).rejects.toThrow();
  });

  it("deletes a menu item", async () => {
    const caller = appRouter.createCaller(createAuthContext(1));
    const result = await caller.menuItem.delete({ id: 1 });
    expect(result.success).toBe(true);
  });

  it("rejects delete for non-owner", async () => {
    const caller = appRouter.createCaller(createAuthContext(999));
    await expect(caller.menuItem.delete({ id: 1 })).rejects.toThrow();
  });

  it("rejects delete for non-existent item", async () => {
    const caller = appRouter.createCaller(createAuthContext(1));
    await expect(caller.menuItem.delete({ id: 999 })).rejects.toThrow();
  });
});

// ─── Auth Tests ─────────────────────────────────────────────

describe("auth router", () => {
  it("returns null for unauthenticated user", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("returns user for authenticated user", async () => {
    const caller = appRouter.createCaller(createAuthContext(1));
    const result = await caller.auth.me();
    expect(result).not.toBeNull();
    expect(result?.name).toBe("Test User");
  });
});


// ─── Template Tests ─────────────────────────────────────────

describe("restaurant.updateTemplate", () => {
  it("updates template to classic (free) for owner", async () => {
    const caller = appRouter.createCaller(createAuthContext(1));
    const result = await caller.restaurant.updateTemplate({ id: 1, menuTemplate: "classic" });
    expect(result.success).toBe(true);
  });

  it("updates template to premium for subscribed user", async () => {
    const caller = appRouter.createCaller(createAuthContext(1));
    const result = await caller.restaurant.updateTemplate({ id: 1, menuTemplate: "elegant" });
    expect(result.success).toBe(true);
  });

  it("rejects premium template for non-subscribed user", async () => {
    const db = await import("./db");
    (db.isSubscriptionActive as any).mockResolvedValueOnce(false);
    (db.getTrialEndDate as any).mockResolvedValueOnce(null);

    const caller = appRouter.createCaller(createAuthContext(1));
    await expect(caller.restaurant.updateTemplate({ id: 1, menuTemplate: "elegant" })).rejects.toThrow("المدفوعة");
  });

  it("rejects template update for non-owner", async () => {
    const caller = appRouter.createCaller(createAuthContext(999));
    await expect(caller.restaurant.updateTemplate({ id: 1, menuTemplate: "classic" })).rejects.toThrow();
  });

  it("rejects template update for non-existent restaurant", async () => {
    const caller = appRouter.createCaller(createAuthContext(1));
    await expect(caller.restaurant.updateTemplate({ id: 999, menuTemplate: "classic" })).rejects.toThrow();
  });

  it("allows premium template during active trial", async () => {
    const db = await import("./db");
    (db.isSubscriptionActive as any).mockResolvedValueOnce(false);
    (db.getTrialEndDate as any).mockResolvedValueOnce(new Date(Date.now() + 24 * 60 * 60 * 1000));

    const caller = appRouter.createCaller(createAuthContext(1));
    const result = await caller.restaurant.updateTemplate({ id: 1, menuTemplate: "neon" });
    expect(result.success).toBe(true);
  });

  it("validates template id enum", async () => {
    const caller = appRouter.createCaller(createAuthContext(1));
    await expect(caller.restaurant.updateTemplate({ id: 1, menuTemplate: "invalid" as any })).rejects.toThrow();
  });
});

describe("restaurant.updateCustomColors", () => {
  it("saves valid custom colors for subscribed owner", async () => {
    const caller = appRouter.createCaller(createAuthContext(1));
    const result = await caller.restaurant.updateCustomColors({
      id: 1,
      customColors: {
        bg1: "#112233",
        bg2: "#445566",
        accent: "#ff6600",
        card: "#223344",
        textColor: "#ffffff",
      },
    });
    expect(result.success).toBe(true);
  });

  it("saves partial custom colors (only some fields)", async () => {
    const caller = appRouter.createCaller(createAuthContext(1));
    const result = await caller.restaurant.updateCustomColors({
      id: 1,
      customColors: {
        accent: "#ff0000",
      },
    });
    expect(result.success).toBe(true);
  });

  it("clears custom colors by passing null", async () => {
    const caller = appRouter.createCaller(createAuthContext(1));
    const result = await caller.restaurant.updateCustomColors({
      id: 1,
      customColors: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects custom colors for non-subscribed user", async () => {
    const db = await import("./db");
    (db.isSubscriptionActive as any).mockResolvedValueOnce(false);
    (db.getTrialEndDate as any).mockResolvedValueOnce(null);

    const caller = appRouter.createCaller(createAuthContext(1));
    await expect(
      caller.restaurant.updateCustomColors({
        id: 1,
        customColors: { accent: "#ff0000" },
      })
    ).rejects.toThrow("المدفوعة");
  });

  it("allows custom colors during active trial", async () => {
    const db = await import("./db");
    (db.isSubscriptionActive as any).mockResolvedValueOnce(false);
    (db.getTrialEndDate as any).mockResolvedValueOnce(new Date(Date.now() + 24 * 60 * 60 * 1000));

    const caller = appRouter.createCaller(createAuthContext(1));
    const result = await caller.restaurant.updateCustomColors({
      id: 1,
      customColors: { bg1: "#aabbcc" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects custom colors for non-owner", async () => {
    const caller = appRouter.createCaller(createAuthContext(999));
    await expect(
      caller.restaurant.updateCustomColors({
        id: 1,
        customColors: { accent: "#ff0000" },
      })
    ).rejects.toThrow();
  });

  it("rejects custom colors for non-existent restaurant", async () => {
    const caller = appRouter.createCaller(createAuthContext(1));
    await expect(
      caller.restaurant.updateCustomColors({
        id: 999,
        customColors: { accent: "#ff0000" },
      })
    ).rejects.toThrow();
  });

  it("rejects invalid hex color format", async () => {
    const caller = appRouter.createCaller(createAuthContext(1));
    await expect(
      caller.restaurant.updateCustomColors({
        id: 1,
        customColors: { accent: "red" },
      })
    ).rejects.toThrow();
  });

  it("rejects short hex color format", async () => {
    const caller = appRouter.createCaller(createAuthContext(1));
    await expect(
      caller.restaurant.updateCustomColors({
        id: 1,
        customColors: { accent: "#f00" },
      })
    ).rejects.toThrow();
  });
});
