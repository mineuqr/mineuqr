/** Canonical provisioning lifecycle state. */
export type ProvisioningStatus =
  | "created"
  | "credentials_ready"
  | "waiting_for_pairing"
  | "pairing"
  | "connected"
  | "activating"
  | "operational"
  | "expired"
  | "cancelled"
  | "failed";

export type ProvisioningPairingState = "unpaired" | "pairing" | "paired" | "revoked" | "unknown";

export type ProvisioningActivationState =
  | "pending"
  | "loading_configuration"
  | "loading_capabilities"
  | "loading_runtime"
  | "operational"
  | "blocked"
  | "failed";

export type ProvisioningWarning = {
  code: string;
  message: string;
};

export type ProvisioningError = {
  code: string;
  message: string;
};

export type ProvisioningQrPayload = {
  deviceId: string;
  tokenId: string;
  secret: string;
  activationCode: string;
  qrPayload: Record<string, unknown>;
};

/**
 * SCREEN-PROVISIONING-WORKSPACE-1 — provisioning runtime contract.
 * Persisted in sessionStorage for workspace refresh survival (operator session only).
 */
export type ProvisioningSession = {
  sessionId: string;
  screenId: string;
  deviceId: string;
  tokenId: string | null;
  restaurantId: number;
  displayName: string;
  role: string;
  status: ProvisioningStatus;
  pairingState: ProvisioningPairingState;
  activationState: ProvisioningActivationState;
  startedAt: string;
  updatedAt: string;
  expiresAt: string;
  credentials: ProvisioningQrPayload | null;
  warnings: ProvisioningWarning[];
  errors: ProvisioningError[];
  rotationCount: number;
  retryCount: number;
  mode: "create" | "rotate" | "resume";
};

export type ProvisioningHealth = {
  status: ProvisioningStatus;
  pairingState: ProvisioningPairingState;
  activationState: ProvisioningActivationState;
  expired: boolean;
  secondsRemaining: number;
  retryCount: number;
  rotationCount: number;
  warningCount: number;
  errorCount: number;
};

export type ProvisioningObservability = {
  provisionDurationMs: number;
  pairingDurationMs: number | null;
  activationDurationMs: number | null;
  retryCount: number;
  expirationCount: number;
};

export type ProvisioningDiagnostics = {
  session: ProvisioningSession;
  health: ProvisioningHealth;
  observability: ProvisioningObservability;
  pairingTimeline: Array<{ at: string; state: ProvisioningPairingState }>;
  activationTimeline: Array<{ at: string; state: ProvisioningActivationState }>;
};

export const PROVISIONING_TIMEOUT_MS = 30 * 60 * 1000;
