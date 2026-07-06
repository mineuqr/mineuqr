import type { ProvisioningSession } from "./provisioningSessionContract";

const STORE_KEY = "mineuqr:provisioning-sessions:v1";

type SessionStore = {
  sessions: Record<string, ProvisioningSession>;
  activeByRestaurant: Record<string, string>;
};

function readStore(): SessionStore {
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    if (!raw) return { sessions: {}, activeByRestaurant: {} };
    return JSON.parse(raw) as SessionStore;
  } catch {
    return { sessions: {}, activeByRestaurant: {} };
  }
}

function writeStore(store: SessionStore): void {
  sessionStorage.setItem(STORE_KEY, JSON.stringify(store));
}

export function saveProvisioningSession(session: ProvisioningSession): void {
  const store = readStore();
  store.sessions[session.sessionId] = session;
  store.activeByRestaurant[String(session.restaurantId)] = session.sessionId;
  writeStore(store);
}

export function getProvisioningSession(sessionId: string): ProvisioningSession | null {
  return readStore().sessions[sessionId] ?? null;
}

export function getActiveProvisioningSession(restaurantId: number): ProvisioningSession | null {
  const store = readStore();
  const sessionId = store.activeByRestaurant[String(restaurantId)];
  if (!sessionId) return null;
  return store.sessions[sessionId] ?? null;
}

export function removeProvisioningSession(sessionId: string): void {
  const store = readStore();
  const session = store.sessions[sessionId];
  delete store.sessions[sessionId];
  if (session) {
    const active = store.activeByRestaurant[String(session.restaurantId)];
    if (active === sessionId) delete store.activeByRestaurant[String(session.restaurantId)];
  }
  writeStore(store);
}

export function createSessionId(): string {
  return `prov_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
