/**
 * POS-READ-APIS-IMPLEMENTATION-1
 * POS consumer of restaurant menu rows. POS does not own Menu/Catalog.
 */

import type { SelectUser } from "../../../drizzle/schema";
import { getMenuItemsByRestaurant } from "../../db";
import type { PosPermissionGrantStore } from "../infrastructure/PosPermissionGrantStore";
import {
  POS_CATALOG_MAX_ITEMS,
  toPosCatalogItemDto,
  type PosCatalogItemDto,
  type PosMenuItemRecord,
} from "../read/posCatalogDto";
import { PosAccessService } from "./PosAccessService";
import { requirePosReadContext } from "./requirePosReadContext";

export type PosCatalogItemLoader = (
  restaurantId: number
) => Promise<readonly PosMenuItemRecord[]>;

export class PosCatalogReadService {
  constructor(
    private readonly grants: PosPermissionGrantStore,
    private readonly access: PosAccessService,
    private readonly loadItems: PosCatalogItemLoader = defaultMenuLoader
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
    const rows = await this.loadItems(context.restaurantId);
    const scoped = rows.filter((row) => row.restaurantId === context.restaurantId);
    const filtered = input.command.availableOnly
      ? scoped.filter((row) => row.isAvailable)
      : scoped;
    return filtered.slice(0, POS_CATALOG_MAX_ITEMS).map(toPosCatalogItemDto);
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
    isAvailable: row.isAvailable,
    sortOrder: row.sortOrder,
  }));
}
