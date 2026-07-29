/**
 * COMMERCIAL-CATALOG-ADMIN-EXPERIENCE-1 — local productivity state (no domain logic).
 */

const KEY = "commercial-catalog-admin-experience-v1";

export type CatalogProductivityState = {
  favorites: string[];
  pinnedPlans: string[];
  recentEntityIds: string[];
  savedFilters: Array<{ id: string; name: string; query: string; status?: string }>;
  wizardDrafts: Record<string, unknown>;
};

const EMPTY: CatalogProductivityState = {
  favorites: [],
  pinnedPlans: [],
  recentEntityIds: [],
  savedFilters: [],
  wizardDrafts: {},
};

function read(): CatalogProductivityState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY };
    return { ...EMPTY, ...JSON.parse(raw) };
  } catch {
    return { ...EMPTY };
  }
}

function write(state: CatalogProductivityState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore quota */
  }
}

export const catalogProductivityStore = {
  get(): CatalogProductivityState {
    return read();
  },
  toggleFavorite(id: string) {
    const s = read();
    s.favorites = s.favorites.includes(id)
      ? s.favorites.filter((x) => x !== id)
      : [...s.favorites, id].slice(-40);
    write(s);
    return s;
  },
  togglePinnedPlan(id: string) {
    const s = read();
    s.pinnedPlans = s.pinnedPlans.includes(id)
      ? s.pinnedPlans.filter((x) => x !== id)
      : [...s.pinnedPlans, id].slice(-20);
    write(s);
    return s;
  },
  touchRecent(id: string) {
    const s = read();
    s.recentEntityIds = [id, ...s.recentEntityIds.filter((x) => x !== id)].slice(
      0,
      30
    );
    write(s);
    return s;
  },
  saveFilter(name: string, query: string, status?: string) {
    const s = read();
    s.savedFilters = [
      { id: crypto.randomUUID(), name, query, status },
      ...s.savedFilters,
    ].slice(0, 20);
    write(s);
    return s;
  },
  saveWizardDraft(draftId: string, payload: unknown) {
    const s = read();
    s.wizardDrafts[draftId] = payload;
    write(s);
    return s;
  },
  clearWizardDraft(draftId: string) {
    const s = read();
    delete s.wizardDrafts[draftId];
    write(s);
    return s;
  },
};
