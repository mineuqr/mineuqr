import type {
  PublishedReleaseRecord,
  RegisterPublishedReleaseInput,
} from "../domain/PublishedRelease";

export interface ReleaseRegistry {
  registerPublishedRelease(input: RegisterPublishedReleaseInput): Promise<PublishedReleaseRecord>;
  findByVersion(version: string): Promise<PublishedReleaseRecord | null>;
  getActiveRelease(): Promise<PublishedReleaseRecord | null>;
  activateRelease(version: string, activatedAt: string): Promise<PublishedReleaseRecord | null>;
}
