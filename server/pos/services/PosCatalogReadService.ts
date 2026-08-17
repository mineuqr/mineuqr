/**
 * POS-READ-APIS-IMPLEMENTATION-1
 * POS consumer of restaurant menu rows. POS does not own Menu/Catalog.
 * Category names and imageUrl are projected from canonical Menu tables.
 */

import type { SelectUser } from "../../../drizzle/schema";
import { getCategoriesByRestaurant, getMenuItemsByRestaurant } from "../../db";
import type { PosPermissionGrantStore } from "../infrastructure/PosPermissionGrantStore";
import {
  POS_CATALOG_MAX_ITEMS,
  toPosCatalogItemDto,
  type PosCatalogItemDto,
  type PosCategoryRecord,
  type PosMenuItemRecord,
} from "../read/posCatalogDto";
import { PosAccessService } from "./PosAccessService";
import { requirePosReadContext } from "./requirePosReadContext";

export type PosCatalogItemLoader = (
  restaurantId: number
) => Promise<readonly PosMenuItemRecord[]>;

export type PosCategoryLoader = (
  restaurantId: number
) => Promise<readonly PosCategoryRecord[]>;

export class PosCatalogReadService {
  constructor(
    private readonly grants: PosPermissionGrantStore,
    private readonly access: PosAccessService,
    private readonly loadItems: PosCatalogItemLoader = defaultMenuLoader,
    private readonly loadCategories: PosCategoryLoader = defaultCategoryLoader
  ) {}

  async listItems(input: {
    user: SelectUser;
    command: {
      restaurantId: number;
      terminalId: string;
      availableOnly?: boolean;
    };
  }): Promise<readonly PosCatalogItemDto[]> {
    const context = await requirePosReadContext(this.access, this.grants, {
      user: input.user,
      restaurantId: input.command.restaurantId,
      terminalId: input.command.terminalId,
      procedure: "pos.read.catalog.listItems",
    });
    const [rows, categories] = await Promise.all([
      this.loadItems(context.restaurantId),
      this.loadCategories(context.restaurantId),
    ]);
    const scoped = rows.filter((row) => row.restaurantId === context.restaurantId);
    const filtered = input.command.availableOnly
      ? scoped.filter((row) => row.isAvailable)
      : scoped;
    const names = new Map<number, PosCategoryRecord>();
    for (const category of categories) {
      if (category.restaurantId !== context.restaurantId) continue;
      names.set(category.id, category);
    }
    return filtered
      .slice(0, POS_CATALOG_MAX_ITEMS)
      .map((row) => toPosCatalogItemDto(row, names.get(row.categoryId) ?? null));
  }
}

async function defaultMenuLoader(
  restaurantId: number
): Promise<readonly PosMenuItemRecord[]> {
  const rows = await getMenuItemsByRestaurant(restaurantId);
  return rows.map((row) => ({
    id: row.id,
    categoryId: row.categoryId,
    restaurantId: row.restaurantId,
    nameAr: row.nameAr,
    nameEn: row.nameEn ?? null,
    price: row.price,
    imageUrl: row.imageUrl ?? null,
    isAvailable: row.isAvailable,
    sortOrder: row.sortOrder,
  }));
}

async function defaultCategoryLoader(
  restaurantId: number
): Promise<readonly PosCategoryRecord[]> {
  const rows = await getCategoriesByRestaurant(restaurantId);
  return rows.map((row) => ({
    id: row.id,
    restaurantId: row.restaurantId,
    nameAr: row.nameAr,
    nameEn: row.nameEn ?? null,
  }));
}
