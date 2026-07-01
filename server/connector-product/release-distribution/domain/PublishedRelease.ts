import type { ConnectorDistributionManifest } from "../../release/connectorReleaseTypes";

export type PublishedReleaseStatus =
  | "candidate"
  | "published"
  | "verified"
  | "smoke_test_passed"
  | "promoted"
  | "active"
  | "superseded";

export const RELEASE_STATE_TRANSITIONS: Record<
  PublishedReleaseStatus,
  readonly PublishedReleaseStatus[]
> = {
  candidate: ["published", "superseded"],
  published: ["verified", "superseded"],
  verified: ["smoke_test_passed", "superseded"],
  smoke_test_passed: ["promoted", "superseded"],
  promoted: ["active", "superseded"],
  active: ["superseded"],
  superseded: [],
};

/** Pre-production and active releases that may be administratively superseded. */
export const ADMINISTRATIVE_SUPERSEDE_SOURCE_STATUSES: readonly PublishedReleaseStatus[] = [
  "candidate",
  "published",
  "verified",
  "smoke_test_passed",
  "promoted",
  "active",
];

export type ReleaseAuditContext = {
  gitTag: string | null;
  commitSha: string | null;
  workflowRunId: string | null;
  publisher: string | null;
};

export type PublishedReleaseRecord = {
  version: string;
  productName: string;
  installerFileName: string;
  installerSha256: string;
  storageKey: string;
  releaseManifest: ConnectorDistributionManifest;
  status: PublishedReleaseStatus;
  publishedAt: string | null;
  verifiedAt: string | null;
  smokeTestPassedAt: string | null;
  promotedAt: string | null;
  activatedAt: string | null;
  audit: ReleaseAuditContext;
};

export type RegisterCandidateInput = {
  version: string;
  productName: string;
  installerFileName: string;
  audit: ReleaseAuditContext;
  registeredAt: string;
};

export type RegisterPublishedReleaseInput = {
  version: string;
  productName: string;
  installerFileName: string;
  installerSha256: string;
  storageKey: string;
  releaseManifest: ConnectorDistributionManifest;
  publishedAt: string;
};

export type PublishedReleaseDownload = {
  version: string;
  productName: string;
  installerFileName: string;
  installerSha256: string;
  downloadUrl: string;
  releaseManifest: ConnectorDistributionManifest;
};

export function assertReleaseTransition(
  from: PublishedReleaseStatus,
  to: PublishedReleaseStatus
): void {
  const allowed = RELEASE_STATE_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    throw new Error(`Invalid release state transition: ${from} → ${to}`);
  }
}

export function canAdministrativelySupersede(status: PublishedReleaseStatus): boolean {
  return ADMINISTRATIVE_SUPERSEDE_SOURCE_STATUSES.includes(status);
}
