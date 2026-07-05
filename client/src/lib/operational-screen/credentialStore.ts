/** RUNTIME-BOOTSTRAP-CONTRACT-1 — device credential persistence (pairing writes, bootstrap reads). */

export const OPERATIONAL_SCREEN_CREDENTIAL_KEY = "mineuqr:operational-screen:credentials:v1";

export type OperationalScreenCredentials = {
  deviceId: string;
  tokenId: string;
  secret: string;
  pairedAt: string;
  protocolVersion: 2;
};

export function readOperationalScreenCredentials(): OperationalScreenCredentials | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(OPERATIONAL_SCREEN_CREDENTIAL_KEY);
    if (!raw) return null;
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
    window.localStorage.setItem(OPERATIONAL_SCREEN_CREDENTIAL_KEY, JSON.stringify(record));
  }
  return record;
}

export function clearOperationalScreenCredentials(): void {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(OPERATIONAL_SCREEN_CREDENTIAL_KEY);
  }
}
