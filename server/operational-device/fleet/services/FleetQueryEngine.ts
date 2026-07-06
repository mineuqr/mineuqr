import type {
  FleetGroupBy,
  FleetScreenGroup,
  FleetScreenQuery,
  FleetScreenQueryResult,
  FleetKpiResult,
  OperationalScreenFleetReadModel,
  FleetSortField,
} from "../domain/fleetReadModelContracts";
import {
  clampFleetPageSize,
  FLEET_QUERY_CATALOG_VERSION,
} from "../domain/fleetReadModelContracts";
import {
  fleetOperationalRank,
  matchesCanonicalFilters,
} from "../domain/fleetCanonicalState";
import { projectFleetReadModel } from "./projectFleetReadModel";
import type { FleetReadStore } from "../infrastructure/FleetReadStore";

type CursorPayload = {
  sortValue: string;
  screenId: string;
};

type CacheEntry = {
  key: string;
  result: FleetScreenQueryResult;
  expiresAt: number;
};

const CACHE_TTL_MS = 5_000;

function normalizeQuery(query: FleetScreenQuery): FleetScreenQuery {
  return {
    ...query,
    limit: clampFleetPageSize(query.limit),
    sortBy: query.sortBy ?? "updated",
    sortOrder: query.sortOrder ?? "desc",
    groupBy: query.groupBy ?? "none",
    search: query.search?.trim() || undefined,
  };
}

function cacheKey(query: FleetScreenQuery): string {
  return JSON.stringify({
    restaurantId: query.restaurantId,
    search: query.search,
    role: query.role,
    operationalState: query.operationalState,
    businessReadiness: query.businessReadiness,
    connectivityState: query.connectivityState,
    branchId: query.branchId,
    zoneId: query.zoneId,
    configurationState: query.configurationState,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
    limit: query.limit,
    cursor: query.cursor,
    groupBy: query.groupBy,
  });
}

function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function decodeCursor(cursor: string): CursorPayload | null {
  try {
    return JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as CursorPayload;
  } catch {
    return null;
  }
}

function sortValueFor(model: OperationalScreenFleetReadModel, sortBy: FleetSortField): string {
  switch (sortBy) {
    case "displayName":
      return model.displayName.toLowerCase();
    case "lastSeen":
      return model.lastHeartbeat ?? "";
    case "operationalState":
      return String(fleetOperationalRank(model.canonicalState.operationalState)).padStart(2, "0");
    case "role":
      return model.role;
    case "created":
      return model.createdAt;
    case "version":
      return model.reportedVersion ?? "";
    case "updated":
    default:
      return model.updatedAt;
  }
}

function sortModels(
  models: OperationalScreenFleetReadModel[],
  sortBy: FleetSortField,
  sortOrder: "asc" | "desc"
): OperationalScreenFleetReadModel[] {
  return [...models].sort((a, b) => {
    const av = sortValueFor(a, sortBy);
    const bv = sortValueFor(b, sortBy);
    let cmp = av.localeCompare(bv);
    if (cmp === 0) cmp = a.screenId.localeCompare(b.screenId);
    return sortOrder === "desc" ? -cmp : cmp;
  });
}

function paginate(
  models: OperationalScreenFleetReadModel[],
  query: FleetScreenQuery
): { items: OperationalScreenFleetReadModel[]; cursor: FleetScreenQueryResult["cursor"] } {
  const pageSize = clampFleetPageSize(query.limit);
  const sortBy = query.sortBy ?? "updated";
  const sortOrder = query.sortOrder ?? "desc";

  let startIndex = 0;
  if (query.cursor) {
    const decoded = decodeCursor(query.cursor);
    if (decoded) {
      const idx = models.findIndex(
        (m) =>
          m.screenId === decoded.screenId && sortValueFor(m, sortBy) === decoded.sortValue
      );
      if (idx >= 0) startIndex = idx + 1;
    }
  }

  const page = models.slice(startIndex, startIndex + pageSize);
  const hasMore = startIndex + pageSize < models.length;
  const last = page[page.length - 1];

  return {
    items: page,
    cursor: {
      pageSize,
      hasMore,
      nextCursor:
        hasMore && last
          ? encodeCursor({ sortValue: sortValueFor(last, sortBy), screenId: last.screenId })
          : null,
      previousCursor: query.cursor ?? null,
    },
  };
}

function groupModels(
  models: OperationalScreenFleetReadModel[],
  groupBy: FleetGroupBy,
  restaurantId: number
): FleetScreenGroup[] | null {
  if (groupBy === "none") return null;

  const groups = new Map<string, FleetScreenGroup>();

  for (const screen of models) {
    let key: string;
    let label: string;
    let branchId: number | null = null;
    let zoneId: number | null = null;
    let role: OperationalScreenFleetReadModel["role"] | null = null;

    switch (groupBy) {
      case "restaurant":
        key = `restaurant:${restaurantId}`;
        label = `Restaurant ${restaurantId}`;
        break;
      case "branch":
        key = `branch:${screen.branchId ?? "none"}`;
        label = screen.branchId != null ? `Branch ${screen.branchId}` : "No branch";
        branchId = screen.branchId;
        break;
      case "zone":
        key = `zone:${screen.zoneId ?? "none"}`;
        label = screen.zoneId != null ? `Zone ${screen.zoneId}` : "No zone";
        zoneId = screen.zoneId;
        break;
      case "role":
        key = `role:${screen.role}`;
        label = screen.role;
        role = screen.role;
        break;
      default:
        key = "all";
        label = "All";
    }

    const existing = groups.get(key);
    if (existing) {
      existing.screens.push(screen);
    } else {
      groups.set(key, { key, label, branchId, zoneId, role, screens: [screen] });
    }
  }

  return Array.from(groups.values());
}

export type FleetQueryEngineMetrics = {
  cacheHits: number;
  cacheMisses: number;
  totalQueries: number;
};

/**
 * SCREEN-FLEET-SCALE-1 — single fleet query authority.
 * Search, filter, sort, cursor pagination, and grouping happen here — never in React.
 */
export class FleetQueryEngine {
  private readonly cache = new Map<string, CacheEntry>();
  private metrics: FleetQueryEngineMetrics = {
    cacheHits: 0,
    cacheMisses: 0,
    totalQueries: 0,
  };

  constructor(private readonly store: FleetReadStore) {}

  getMetrics(): FleetQueryEngineMetrics {
    return { ...this.metrics };
  }

  clearCache(): void {
    this.cache.clear();
  }

  async queryScreens(query: FleetScreenQuery): Promise<FleetScreenQueryResult> {
    const started = performance.now();
    this.metrics.totalQueries += 1;

    const normalized = normalizeQuery(query);
    const key = cacheKey(normalized);
    const cached = this.cache.get(key);
    const now = Date.now();

    if (cached && cached.expiresAt > now) {
      this.metrics.cacheHits += 1;
      return {
        ...cached.result,
        observability: {
          ...cached.result.observability,
          queryDurationMs: performance.now() - started,
          cacheHit: true,
        },
      };
    }

    this.metrics.cacheMisses += 1;

    const statusFilter =
      normalized.operationalState === "maintenance" || normalized.businessReadiness === "maintenance"
        ? ("disabled" as const)
        : undefined;

    const rows = await this.store.fetchDeviceRows({
      restaurantId: normalized.restaurantId,
      search: normalized.search,
      role: normalized.role,
      branchId: normalized.branchId,
      status: statusFilter,
      sortBy: normalized.sortBy,
      sortOrder: normalized.sortOrder,
    });

    let models = rows.map((row) => projectFleetReadModel(row));

    models = models.filter((model) =>
      matchesCanonicalFilters(model, {
        operationalState: normalized.operationalState,
        businessReadiness: normalized.businessReadiness,
        connectivityState: normalized.connectivityState,
      })
    );

    if (normalized.zoneId !== undefined) {
      models = models.filter((m) => m.zoneId === normalized.zoneId);
    }

    models = sortModels(models, normalized.sortBy ?? "updated", normalized.sortOrder ?? "desc");

    const { items, cursor } = paginate(models, normalized);
    const groups = groupModels(items, normalized.groupBy ?? "none", normalized.restaurantId);

    const result: FleetScreenQueryResult = {
      generatedAt: new Date().toISOString(),
      queryCatalogVersion: FLEET_QUERY_CATALOG_VERSION,
      items,
      groups,
      cursor,
      observability: {
        queryDurationMs: performance.now() - started,
        cacheHit: false,
        resultCount: items.length,
        cursorCount: cursor.hasMore ? 1 : 0,
      },
    };

    this.cache.set(key, { key, result, expiresAt: now + CACHE_TTL_MS });

    return result;
  }

  async getKpis(restaurantId: number): Promise<FleetKpiResult> {
    const rows = await this.store.fetchDeviceRows({ restaurantId });
    const models = rows.map((row) => projectFleetReadModel(row));

    return {
      generatedAt: new Date().toISOString(),
      total: models.length,
      online: models.filter((m) => m.healthSummary.presence === "online").length,
      offline: models.filter((m) => m.healthSummary.presence === "offline").length,
      disabled: models.filter((m) => m.canonicalState.maintenanceState === "maintenance").length,
      operational: models.filter((m) => m.canonicalState.operationalState === "operational").length,
      degraded: models.filter((m) => m.canonicalState.operationalState === "degraded").length,
    };
  }
}
