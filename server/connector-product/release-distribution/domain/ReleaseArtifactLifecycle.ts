import type { PublishedReleaseStatus } from "./PublishedRelease";

export type ArtifactPublicationPolicy = "immutable" | "reclaim-canonical";

export type RetireCanonicalArtifactsInput = {
  version: string;
  installerFileName: string;
  installerStorageKey: string;
  manifestStorageKey: string;
  retiredAt: string;
  workflowRunId: string | null;
  reason: "superseded" | "canonical-reclaim";
};

export type RetiredCanonicalArtifacts = {
  archivedInstallerKey: string;
  archivedManifestKey: string;
};

function retiredAtSlug(retiredAt: string): string {
  return retiredAt.replace(/[:.]/g, "-");
}

function auditSuffix(workflowRunId: string | null, reason: RetireCanonicalArtifactsInput["reason"]): string {
  if (workflowRunId) return workflowRunId;
  return reason === "canonical-reclaim" ? "canonical-reclaim" : "unknown";
}

export function buildArchivedInstallerKey(
  version: string,
  installerFileName: string,
  retiredAt: string,
  workflowRunId: string | null,
  reason: RetireCanonicalArtifactsInput["reason"]
): string {
  const base = `connector-releases/archive/${version}/${retiredAtSlug(retiredAt)}/${auditSuffix(workflowRunId, reason)}`;
  return `${base}/${installerFileName}`.replace(/\\/g, "/");
}

export function buildArchivedManifestKey(
  version: string,
  retiredAt: string,
  workflowRunId: string | null,
  reason: RetireCanonicalArtifactsInput["reason"]
): string {
  const base = `connector-releases/archive/${version}/${retiredAtSlug(retiredAt)}/${auditSuffix(workflowRunId, reason)}`;
  return `${base}/release-manifest.json`.replace(/\\/g, "/");
}

/** Candidate republication may reclaim canonical keys; all other states remain immutable. */
export function resolveArtifactPublicationPolicy(
  registryStatus: PublishedReleaseStatus | undefined
): ArtifactPublicationPolicy {
  return registryStatus === "candidate" ? "reclaim-canonical" : "immutable";
}

export function isPendingStorageKey(storageKey: string): boolean {
  return storageKey.startsWith("pending:");
}
