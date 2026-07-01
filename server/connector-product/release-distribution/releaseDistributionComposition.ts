import { DrizzleReleaseRegistry } from "./infrastructure/DrizzleReleaseRegistry";
import { InMemoryReleaseRegistry } from "./infrastructure/InMemoryReleaseRegistry";
import { createReleaseStorage } from "./infrastructure/ReleaseStorage";
import type { ReleaseRegistry } from "./contracts/ReleaseRegistry";
import type { ReleaseStoragePort } from "./contracts/ReleaseStoragePort";
import { ReleaseDistributionService } from "./services/ReleaseDistributionService";
import { ConnectorReleasePublicationService } from "./services/ConnectorReleasePublicationService";
import { ReleaseVerificationService } from "./services/ReleaseVerificationService";
import { ReleasePromotionService } from "./services/ReleasePromotionService";
import { ReleaseAdminService } from "./services/ReleaseAdminService";

export type ReleaseDistributionComposition = {
  registry: ReleaseRegistry;
  storage: ReleaseStoragePort;
  distributionService: ReleaseDistributionService;
  publicationService: ConnectorReleasePublicationService;
  verificationService: ReleaseVerificationService;
  promotionService: ReleasePromotionService;
  adminService: ReleaseAdminService;
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
  const verificationService = new ReleaseVerificationService(registry, storage);
  const promotionService = new ReleasePromotionService(registry);
  const adminService = new ReleaseAdminService(registry);

  return {
    registry,
    storage,
    distributionService,
    publicationService,
    verificationService,
    promotionService,
    adminService,
  };
}

export const releaseDistributionComposition = composeReleaseDistribution();
