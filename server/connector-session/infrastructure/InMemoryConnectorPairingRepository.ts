import type { PairingTokenRecord } from "../contracts/ConnectorPairingRepository";
import type { ConnectorPairingRepository } from "../contracts/ConnectorPairingRepository";

export class InMemoryConnectorPairingRepository implements ConnectorPairingRepository {
  private readonly byToken = new Map<string, PairingTokenRecord>();

  async save(record: PairingTokenRecord): Promise<void> {
    this.byToken.set(record.token, record);
  }

  async findByToken(token: string): Promise<PairingTokenRecord | null> {
    return this.byToken.get(token) ?? null;
  }

  async consume(token: string, consumedAt: string): Promise<boolean> {
    const record = this.byToken.get(token);
    if (!record || record.consumedAt != null) return false;
    this.byToken.set(token, { ...record, consumedAt });
    return true;
  }
}
