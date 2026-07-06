import type { ProvisioningQrPayload, ProvisioningSession } from "./provisioningSessionContract";
import { PROVISIONING_TIMEOUT_MS } from "./provisioningSessionContract";
import {
  createSessionId,
  getProvisioningSession,
  removeProvisioningSession,
  saveProvisioningSession,
} from "./provisioningSessionStore";
import {
  deviceSnapshotFromFleet,
  projectProvisioningFromSnapshot,
  type DeviceSnapshot,
} from "./provisioningStateProjector";
import type { FleetScreenReadModel } from "@/lib/screen-fleet/fleetReadModel";
import { projectProvisioningHealth } from "./projectProvisioningHealth";
import { projectProvisioningDiagnostics } from "./projectProvisioningDiagnostics";

export type CreateSessionInput = {
  restaurantId: number;
  displayName: string;
  role: string;
  deviceId: string;
  credentials: ProvisioningQrPayload;
};

/**
 * SCREEN-PROVISIONING-WORKSPACE-1 — single provisioning authority.
 * Timeout, rotation, and state projection — not in presentation.
 */
export class ProvisioningSessionManager {
  private pairingStartedAt: string | null = null;
  private activationStartedAt: string | null = null;
  private expirationCount = 0;

  createSession(input: CreateSessionInput): ProvisioningSession {
    const now = new Date();
    const session: ProvisioningSession = {
      sessionId: createSessionId(),
      screenId: input.deviceId,
      deviceId: input.deviceId,
      tokenId: input.credentials.tokenId,
      restaurantId: input.restaurantId,
      displayName: input.displayName,
      role: input.role,
      status: "credentials_ready",
      pairingState: "pairing",
      activationState: "pending",
      startedAt: now.toISOString(),
      updatedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + PROVISIONING_TIMEOUT_MS).toISOString(),
      credentials: input.credentials,
      warnings: [],
      errors: [],
      rotationCount: 0,
      retryCount: 0,
      mode: "create",
    };
    this.pairingStartedAt = now.toISOString();
    saveProvisioningSession(session);
    return session;
  }

  beginRotateSession(input: {
    restaurantId: number;
    displayName: string;
    role: string;
    deviceId: string;
    credentials: ProvisioningQrPayload;
  }): ProvisioningSession {
    const existing = this.findSessionByDevice(input.deviceId);
    const now = new Date();
    const session: ProvisioningSession = {
      sessionId: createSessionId(),
      screenId: input.deviceId,
      deviceId: input.deviceId,
      tokenId: input.credentials.tokenId,
      restaurantId: input.restaurantId,
      displayName: input.displayName,
      role: input.role,
      status: "credentials_ready",
      pairingState: "pairing",
      activationState: "pending",
      startedAt: now.toISOString(),
      updatedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + PROVISIONING_TIMEOUT_MS).toISOString(),
      credentials: input.credentials,
      warnings: [],
      errors: [],
      rotationCount: (existing?.rotationCount ?? 0) + 1,
      retryCount: 0,
      mode: "rotate",
    };
    this.pairingStartedAt = now.toISOString();
    saveProvisioningSession(session);
    return session;
  }

  loadSession(sessionId: string): ProvisioningSession | null {
    return getProvisioningSession(sessionId);
  }

  findSessionByDevice(deviceId: string): ProvisioningSession | null {
    const raw = sessionStorage.getItem("mineuqr:provisioning-sessions:v1");
    if (!raw) return null;
    const store = JSON.parse(raw) as { sessions: Record<string, ProvisioningSession> };
    return Object.values(store.sessions).find((s) => s.deviceId === deviceId) ?? null;
  }

  createDraftSession(restaurantId: number): ProvisioningSession {
    const now = new Date();
    const session: ProvisioningSession = {
      sessionId: createSessionId(),
      screenId: "",
      deviceId: "",
      tokenId: null,
      restaurantId,
      displayName: "",
      role: "kitchen_display",
      status: "created",
      pairingState: "unpaired",
      activationState: "pending",
      startedAt: now.toISOString(),
      updatedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + PROVISIONING_TIMEOUT_MS).toISOString(),
      credentials: null,
      warnings: [],
      errors: [],
      rotationCount: 0,
      retryCount: 0,
      mode: "create",
    };
    saveProvisioningSession(session);
    return session;
  }

  applyCredentials(session: ProvisioningSession, credentials: ProvisioningQrPayload): ProvisioningSession {
    const next: ProvisioningSession = {
      ...session,
      screenId: credentials.deviceId,
      deviceId: credentials.deviceId,
      tokenId: credentials.tokenId,
      credentials,
      status: "credentials_ready",
      pairingState: "pairing",
      updatedAt: new Date().toISOString(),
    };
    this.pairingStartedAt = new Date().toISOString();
    saveProvisioningSession(next);
    return next;
  }

  updateFromFleet(session: ProvisioningSession, fleetScreen: FleetScreenReadModel | null): ProvisioningSession {
    const snapshot: DeviceSnapshot | null = fleetScreen
      ? deviceSnapshotFromFleet(fleetScreen)
      : null;
    let projected = projectProvisioningFromSnapshot(session, snapshot);

    if (projected.status === "expired" && session.status !== "expired") {
      this.expirationCount += 1;
    }

    if (
      projected.pairingState === "paired" &&
      session.pairingState !== "paired" &&
      !this.activationStartedAt
    ) {
      this.activationStartedAt = new Date().toISOString();
    }

    saveProvisioningSession(projected);
    return projected;
  }

  tickTimeout(session: ProvisioningSession, now: number = Date.now()): ProvisioningSession {
    if (Date.parse(session.expiresAt) <= now && session.status !== "expired") {
      this.expirationCount += 1;
      const expired: ProvisioningSession = {
        ...session,
        status: "expired",
        updatedAt: new Date(now).toISOString(),
        warnings: [
          ...session.warnings,
          { code: "provisioning_expired", message: "Provisioning session expired" },
        ],
      };
      saveProvisioningSession(expired);
      return expired;
    }
    return session;
  }

  retry(session: ProvisioningSession): ProvisioningSession {
    const now = new Date();
    const next: ProvisioningSession = {
      ...session,
      retryCount: session.retryCount + 1,
      expiresAt: new Date(now.getTime() + PROVISIONING_TIMEOUT_MS).toISOString(),
      status: session.credentials ? "waiting_for_pairing" : "created",
      errors: [],
      updatedAt: now.toISOString(),
    };
    saveProvisioningSession(next);
    return next;
  }

  cancel(sessionId: string): void {
    const session = getProvisioningSession(sessionId);
    if (!session) return;
    saveProvisioningSession({ ...session, status: "cancelled", updatedAt: new Date().toISOString() });
    removeProvisioningSession(sessionId);
  }

  getHealth(session: ProvisioningSession, now: number = Date.now()) {
    return projectProvisioningHealth(session, now);
  }

  getDiagnostics(session: ProvisioningSession, now: number = Date.now()) {
    return projectProvisioningDiagnostics(session, {
      provisionDurationMs: now - Date.parse(session.startedAt),
      pairingDurationMs: this.pairingStartedAt
        ? now - Date.parse(this.pairingStartedAt)
        : null,
      activationDurationMs: this.activationStartedAt
        ? now - Date.parse(this.activationStartedAt)
        : null,
      retryCount: session.retryCount,
      expirationCount: this.expirationCount,
    });
  }
}

export const provisioningSessionManager = new ProvisioningSessionManager();
