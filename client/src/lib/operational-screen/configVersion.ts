/**
 * Runtime configuration version abstraction (client contract mirror).
 * Server resolves via screenConfigRevision — stable across heartbeat updates.
 */

export type ConfigVersionSource = {
  updatedAt: string;
  screenConfigRevision?: number;
};

export function resolveConfigVersion(source: ConfigVersionSource): string {
  if (source.screenConfigRevision != null && source.screenConfigRevision > 0) {
    return String(source.screenConfigRevision);
  }
  return source.updatedAt;
}

export function configVersionsDiffer(cached: string | null, server: string): boolean {
  return cached != null && cached !== server;
}
