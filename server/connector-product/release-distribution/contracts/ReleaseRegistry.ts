import type {
  PublishedReleaseRecord,
  RegisterCandidateInput,
  RegisterPublishedReleaseInput,
  ReleaseAuditContext,
} from "../domain/PublishedRelease";

export interface ReleaseRegistry {
  registerCandidate(input: RegisterCandidateInput): Promise<PublishedReleaseRecord>;
  completePublication(input: RegisterPublishedReleaseInput): Promise<PublishedReleaseRecord>;
  /** @deprecated Use completePublication in automation flows. */
  registerPublishedRelease(input: RegisterPublishedReleaseInput): Promise<PublishedReleaseRecord>;
  findByVersion(version: string): Promise<PublishedReleaseRecord | null>;
  getActiveRelease(): Promise<PublishedReleaseRecord | null>;
  transitionRelease(
    version: string,
    nextStatus: PublishedReleaseRecord["status"],
    timestamp: string
  ): Promise<PublishedReleaseRecord>;
  activateRelease(version: string, activatedAt: string): Promise<PublishedReleaseRecord | null>;
  updateAuditContext(version: string, audit: ReleaseAuditContext): Promise<PublishedReleaseRecord | null>;
}
