export type PairingTokenRecord = {
  token: string;
  restaurantId: number;
  expiresAt: string;
  consumedAt: string | null;
};

export interface ConnectorPairingRepository {
  save(record: PairingTokenRecord): Promise<void>;
  findByToken(token: string): Promise<PairingTokenRecord | null>;
  consume(token: string, consumedAt: string): Promise<boolean>;
}
