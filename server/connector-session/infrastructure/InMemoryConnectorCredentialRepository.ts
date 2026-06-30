import type { ConnectorCredentialRecord } from "../contracts/sessionContracts";
import type { ConnectorCredentialRepository } from "../contracts/ConnectorCredentialRepository";

export class InMemoryConnectorCredentialRepository implements ConnectorCredentialRepository {
  private readonly byId = new Map<string, ConnectorCredentialRecord>();

  async save(record: ConnectorCredentialRecord): Promise<void> {
    this.byId.set(record.credentialId, record);
  }

  async findById(credentialId: string): Promise<ConnectorCredentialRecord | null> {
    return this.byId.get(credentialId) ?? null;
  }

  async findActiveByRestaurant(restaurantId: number): Promise<ConnectorCredentialRecord[]> {
    return Array.from(this.byId.values()).filter(
      (record) =>
        record.restaurantId === restaurantId &&
        record.revokedAt == null &&
        (record.expiresAt == null || Date.parse(record.expiresAt) > Date.now())
    );
  }

  async revoke(credentialId: string, revokedAt: string): Promise<boolean> {
    const record = this.byId.get(credentialId);
    if (!record) return false;
    this.byId.set(credentialId, { ...record, revokedAt });
    return true;
  }
}
