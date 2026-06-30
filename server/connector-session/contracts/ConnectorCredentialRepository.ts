import type { ConnectorCredentialRecord } from "./sessionContracts";

export type TouchEnrollmentInput = {
  lastSeenAt: string;
  connectorVersion?: string | null;
};

export interface ConnectorCredentialRepository {
  save(record: ConnectorCredentialRecord): Promise<void>;
  findById(credentialId: string): Promise<ConnectorCredentialRecord | null>;
  findByConnectorInstanceId(connectorInstanceId: string): Promise<ConnectorCredentialRecord | null>;
  findActiveByRestaurant(restaurantId: number): Promise<ConnectorCredentialRecord[]>;
  touchEnrollment(credentialId: string, input: TouchEnrollmentInput): Promise<void>;
  revoke(credentialId: string, revokedAt: string): Promise<boolean>;
}
