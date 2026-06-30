import { DrizzleReleaseRegistry } from "./infrastructure/DrizzleReleaseRegistry";
import { InMemoryReleaseRegistry } from "./infrastructure/InMemoryReleaseRegistry";
import { createReleaseStorage } from "./infrastructure/ReleaseStorage";
import type { ReleaseRegistry } from "./contracts/ReleaseRegistry";
import type { ReleaseStoragePort } from "./contracts/ReleaseStoragePort";
import { ReleaseDistributionService } from "./services/ReleaseDistributionService";
import { ConnectorReleasePublicationService } from "./services/ConnectorReleasePublicationService";

export type ReleaseDistributionComposition = {
  registry: ReleaseRegistry;
  storage: ReleaseStoragePort;
  distributionService: ReleaseDistributionService;
  publicationService: ConnectorReleasePublicationService;
};

function createRegistry(): ReleaseRegistry {
  if (process.env.VITEST === "true" || process.env.CONNECTOR_RELEASE_REGISTRY_IN_MEMORY === "1") {
    return new InMemoryReleaseRegistry();
  }
  return new DrizzleReleaseRegistry();
}

export function composeReleaseDistribution(): ReleaseDistributionComposition {
  const registry = createRegistry();
  const storage = createReleaseStorage();
  const distributionService = new ReleaseDistributionService(registry, storage);
  const publicationService = new ConnectorReleasePublicationService(registry, storage);

  return {
    registry,
    storage,
    distributionService,
    publicationService,
  };
}

export const releaseDistributionComposition = composeReleaseDistribution();
