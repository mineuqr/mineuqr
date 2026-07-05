/**
 * Runtime configuration version abstraction.
 * v1: device.updatedAt (ISO8601). Future: screenConfigRevision integer.
 */

export type ConfigVersionSource = {
  updatedAt: string;
  screenConfigRevision?: number;
};

export function resolveConfigVersion(source: ConfigVersionSource): string {
  if (source.screenConfigRevision != null) {
    return String(source.screenConfigRevision);
  }
  return source.updatedAt;
}

export function configVersionsDiffer(cached: string | null, server: string): boolean {
  return cached != null && cached !== server;
}
