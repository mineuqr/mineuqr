/** RUNTIME-BOOTSTRAP-CONTRACT-1 — device credential persistence (pairing writes, bootstrap reads). */

export const OPERATIONAL_SCREEN_CREDENTIAL_KEY = "mineuqr:operational-screen:credentials:v1";

export const OPERATIONAL_SCREEN_CREDENTIALS_CHANGED = "mineuqr:operational-screen:credentials-changed";

export type OperationalScreenCredentials = {
  deviceId: string;
  tokenId: string;
  secret: string;
  pairedAt: string;
  protocolVersion: 2;
};

/** SCREEN-PAIRING-STORE-STABILITY-1 — snapshot cache for useSyncExternalStore contract. */
let cachedRaw: string | null | undefined;
let cachedSnapshot: OperationalScreenCredentials | null = null;

function notifyCredentialChange(): void {
  if (typeof window === "undefined") return;
  if (typeof window.dispatchEvent !== "function") return;
  window.dispatchEvent(new Event(OPERATIONAL_SCREEN_CREDENTIALS_CHANGED));
}

function parseCredentialRaw(raw: string): OperationalScreenCredentials | null {
  try {
    const parsed = JSON.parse(raw) as Partial<OperationalScreenCredentials>;
    if (
      typeof parsed.deviceId !== "string" ||
      typeof parsed.tokenId !== "string" ||
      typeof parsed.secret !== "string" ||
      typeof parsed.pairedAt !== "string"
    ) {
      return null;
    }
    return {
      deviceId: parsed.deviceId,
      tokenId: parsed.tokenId,
      secret: parsed.secret,
      pairedAt: parsed.pairedAt,
      protocolVersion: 2,
    };
  } catch {
    return null;
  }
}

function replaceSnapshotCache(raw: string | null, snapshot: OperationalScreenCredentials | null): void {
  cachedRaw = raw;
  cachedSnapshot = snapshot;
}

function readRawFromStorage(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(OPERATIONAL_SCREEN_CREDENTIAL_KEY);
}

export function readOperationalScreenCredentials(): OperationalScreenCredentials | null {
  const raw = readRawFromStorage();
  if (raw === cachedRaw) {
    return cachedSnapshot;
  }

  const snapshot = raw == null ? null : parseCredentialRaw(raw);
  replaceSnapshotCache(raw, snapshot);
  return snapshot;
}

export function writeOperationalScreenCredentials(
  input: Omit<OperationalScreenCredentials, "protocolVersion" | "pairedAt"> & {
    pairedAt?: string;
  }
): OperationalScreenCredentials {
  const record: OperationalScreenCredentials = {
    deviceId: input.deviceId,
    tokenId: input.tokenId,
    secret: input.secret,
    pairedAt: input.pairedAt ?? new Date().toISOString(),
    protocolVersion: 2,
  };

  if (typeof window !== "undefined") {
    const serialized = JSON.stringify(record);
    const previousRaw = readRawFromStorage();
    window.localStorage.setItem(OPERATIONAL_SCREEN_CREDENTIAL_KEY, serialized);
    replaceSnapshotCache(serialized, record);
    if (previousRaw !== serialized) {
      notifyCredentialChange();
    }
  }

  return record;
}

export function clearOperationalScreenCredentials(): void {
  if (typeof window === "undefined") return;

  const previousRaw = readRawFromStorage();
  if (previousRaw == null) {
    replaceSnapshotCache(null, null);
    return;
  }

  window.localStorage.removeItem(OPERATIONAL_SCREEN_CREDENTIAL_KEY);
  replaceSnapshotCache(null, null);
  notifyCredentialChange();
}
