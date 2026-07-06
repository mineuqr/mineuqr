import type { FleetQueryInput, FleetScreenReadModel } from "./fleetReadModel";
import { DEFAULT_FLEET_PAGE_SIZE } from "./fleetReadModel";

export type FleetQueryFetch = (input: FleetQueryInput & { cursor?: string | null }) => Promise<{
  items: FleetScreenReadModel[];
  cursor: {
    nextCursor: string | null;
    previousCursor: string | null;
    pageSize: number;
    hasMore: boolean;
  };
  observability: {
    queryDurationMs: number;
    cacheHit: boolean;
    resultCount: number;
    cursorCount: number;
  };
}>;

/**
 * SCREEN-FLEET-SCALE-1 — client fleet query coordinator.
 * Delegates search/filter/sort/pagination to server — no client-side fleet filtering.
 */
export class FleetQueryEngine {
  private items: FleetScreenReadModel[] = [];
  private nextCursor: string | null = null;
  private lastQuery: FleetQueryInput | null = null;

  constructor(private readonly fetchPage: FleetQueryFetch) {}

  getItems(): FleetScreenReadModel[] {
    return this.items;
  }

  getNextCursor(): string | null {
    return this.nextCursor;
  }

  hasMore(): boolean {
    return this.nextCursor != null;
  }

  async query(input: FleetQueryInput): Promise<FleetScreenReadModel[]> {
    this.lastQuery = input;
    const page = await this.fetchPage({
      ...input,
      limit: input.limit ?? DEFAULT_FLEET_PAGE_SIZE,
      cursor: null,
    });
    this.items = page.items;
    this.nextCursor = page.cursor.nextCursor;
    return this.items;
  }

  async loadMore(): Promise<FleetScreenReadModel[]> {
    if (!this.lastQuery || !this.nextCursor) return this.items;
    const page = await this.fetchPage({
      ...this.lastQuery,
      limit: this.lastQuery.limit ?? DEFAULT_FLEET_PAGE_SIZE,
      cursor: this.nextCursor,
    });
    this.items = [...this.items, ...page.items];
    this.nextCursor = page.cursor.nextCursor;
    return this.items;
  }

  reset(): void {
    this.items = [];
    this.nextCursor = null;
    this.lastQuery = null;
  }
}
