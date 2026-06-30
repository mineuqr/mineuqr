import type { ConnectorCredentialRecord, PairingTokenIssue } from "../contracts/sessionContracts";
import type { ConnectorCredentialRepository } from "../contracts/ConnectorCredentialRepository";
import type { ConnectorPairingRepository } from "../contracts/ConnectorPairingRepository";
import type { InfrastructureFailureCode } from "../contracts/sessionFailureContracts";
import {
  generateConnectorSecret,
  generatePairingToken,
  hashConnectorSecret,
  verifyConnectorSecret,
} from "../infrastructure/connectorCrypto";

export const MIN_CONNECTOR_VERSION = "1.0.0";

export type IssuedConnectorCredential = {
  credentialId: string;
  secret: string;
  restaurantId: number;
  issuedAt: string;
  expiresAt: string | null;
};

export type CredentialValidationResult =
  | { valid: true; credential: ConnectorCredentialRecord }
  | { valid: false; failureCode: InfrastructureFailureCode; message: string };

/**
 * Domain B authentication — pairing tokens and scoped connector credentials.
 */
export class ConnectorAuthenticationService {
  constructor(
    private readonly pairingRepository: ConnectorPairingRepository,
    private readonly credentialRepository: ConnectorCredentialRepository,
    private readonly pairingTtlMs: number = 15 * 60 * 1000,
    private readonly now: () => number = () => Date.now()
  ) {}

  async issuePairingToken(restaurantId: number): Promise<PairingTokenIssue> {
    const token = generatePairingToken();
    const expiresAt = new Date(this.now() + this.pairingTtlMs).toISOString();
    await this.pairingRepository.save({ token, restaurantId, expiresAt, consumedAt: null });
    return { token, restaurantId, expiresAt };
  }

  async completePairing(
    token: string,
    connectorInstanceId: string
  ): Promise<IssuedConnectorCredential | null> {
    const existing = await this.credentialRepository.findByConnectorInstanceId(connectorInstanceId);
    if (existing && existing.revokedAt == null && existing.status !== "revoked") {
      return null;
    }

    const pairing = await this.pairingRepository.findByToken(token);
    if (!pairing || pairing.consumedAt != null || Date.parse(pairing.expiresAt) <= this.now()) {
      return null;
    }

    const consumed = await this.pairingRepository.consume(token, new Date(this.now()).toISOString());
    if (!consumed) return null;

    const secret = generateConnectorSecret();
    const credentialId = `cred-${connectorInstanceId}`;
    const issuedAt = new Date(this.now()).toISOString();

    const record: ConnectorCredentialRecord = {
      credentialId,
      restaurantId: pairing.restaurantId,
      secretHash: hashConnectorSecret(secret),
      issuedAt,
      expiresAt: null,
      revokedAt: null,
      connectorInstanceId,
      status: "active",
      lastSeenAt: null,
      connectorVersion: null,
    };
    await this.credentialRepository.save(record);

    return {
      credentialId,
      secret,
      restaurantId: pairing.restaurantId,
      issuedAt,
      expiresAt: null,
    };
  }

  async validateCredential(input: {
    credentialId: string;
    credentialSecret: string;
    restaurantId: number;
    connectorId: string;
    version: string;
  }): Promise<CredentialValidationResult> {
    if (!isVersionCompatible(input.version, MIN_CONNECTOR_VERSION)) {
      return {
        valid: false,
        failureCode: "version_mismatch",
        message: "Connector version is not supported",
      };
    }

    const credential = await this.credentialRepository.findById(input.credentialId);
    if (!credential) {
      return {
        valid: false,
        failureCode: "authentication_failure",
        message: "Unknown connector credential",
      };
    }

    if (credential.revokedAt != null) {
      return {
        valid: false,
        failureCode: "authentication_failure",
        message: "Connector credential revoked",
      };
    }

    if (credential.expiresAt != null && Date.parse(credential.expiresAt) <= this.now()) {
      return {
        valid: false,
        failureCode: "session_expired",
        message: "Connector credential expired",
      };
    }

    if (credential.restaurantId !== input.restaurantId) {
      return {
        valid: false,
        failureCode: "authentication_failure",
        message: "Credential tenant mismatch",
      };
    }

    if (
      credential.connectorInstanceId != null &&
      credential.connectorInstanceId !== input.connectorId
    ) {
      return {
        valid: false,
        failureCode: "authentication_failure",
        message: "Credential instance mismatch",
      };
    }

    if (!verifyConnectorSecret(input.credentialSecret, credential.secretHash)) {
      return {
        valid: false,
        failureCode: "authentication_failure",
        message: "Invalid connector credential",
      };
    }

    await this.credentialRepository.touchEnrollment(input.credentialId, {
      lastSeenAt: new Date(this.now()).toISOString(),
      connectorVersion: input.version,
    });

    return { valid: true, credential };
  }

  async revokeCredential(credentialId: string): Promise<boolean> {
    return this.credentialRepository.revoke(credentialId, new Date(this.now()).toISOString());
  }
}

function isVersionCompatible(version: string, minimum: string): boolean {
  const parse = (value: string) => value.split(".").map((part) => Number(part) || 0);
  const current = parse(version);
  const min = parse(minimum);
  for (let index = 0; index < 3; index += 1) {
    if ((current[index] ?? 0) < (min[index] ?? 0)) return false;
    if ((current[index] ?? 0) > (min[index] ?? 0)) return true;
  }
  return true;
}
