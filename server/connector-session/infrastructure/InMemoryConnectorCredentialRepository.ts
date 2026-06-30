import type { ConnectorCredentialRecord } from "../contracts/sessionContracts";
import type {
  ConnectorCredentialRepository,
  TouchEnrollmentInput,
} from "../contracts/ConnectorCredentialRepository";

function isActiveRecord(record: ConnectorCredentialRecord): boolean {
  if (record.revokedAt != null || record.status === "revoked") return false;
  if (record.expiresAt != null && Date.parse(record.expiresAt) <= Date.now()) return false;
  return true;
}

export class InMemoryConnectorCredentialRepository implements ConnectorCredentialRepository {
  private readonly byId = new Map<string, ConnectorCredentialRecord>();
  private readonly byInstanceId = new Map<string, string>();

  async save(record: ConnectorCredentialRecord): Promise<void> {
    const normalized: ConnectorCredentialRecord = {
      ...record,
      status: record.status ?? (record.revokedAt != null ? "revoked" : "active"),
      lastSeenAt: record.lastSeenAt ?? null,
      connectorVersion: record.connectorVersion ?? null,
    };
    this.byId.set(record.credentialId, normalized);
    if (record.connectorInstanceId != null) {
      this.byInstanceId.set(record.connectorInstanceId, record.credentialId);
    }
  }

  async findById(credentialId: string): Promise<ConnectorCredentialRecord | null> {
    return this.byId.get(credentialId) ?? null;
  }

  async findByConnectorInstanceId(connectorInstanceId: string): Promise<ConnectorCredentialRecord | null> {
    const credentialId = this.byInstanceId.get(connectorInstanceId);
    if (!credentialId) return null;
    return this.byId.get(credentialId) ?? null;
  }

  async findActiveByRestaurant(restaurantId: number): Promise<ConnectorCredentialRecord[]> {
    return Array.from(this.byId.values()).filter(
      (record) => record.restaurantId === restaurantId && isActiveRecord(record)
    );
  }

  async touchEnrollment(credentialId: string, input: TouchEnrollmentInput): Promise<void> {
    const record = this.byId.get(credentialId);
    if (!record || !isActiveRecord(record)) return;
    this.byId.set(credentialId, {
      ...record,
      lastSeenAt: input.lastSeenAt,
      connectorVersion: input.connectorVersion ?? record.connectorVersion ?? null,
    });
  }

  async revoke(credentialId: string, revokedAt: string): Promise<boolean> {
    const record = this.byId.get(credentialId);
    if (!record) return false;
    this.byId.set(credentialId, { ...record, revokedAt, status: "revoked" });
    return true;
  }
}
