/**
 * COMMERCIAL-CATALOG-PUBLIC-PUBLISHING-1
 * In-process governance overlay (Approved / Scheduled / Archived) — no DB redesign.
 * Does not participate in entitlement decisions.
 */

export type PublicationWorkflowOverlay = {
  approved?: boolean;
  scheduledEffectiveAt?: string | null;
  archived?: boolean;
};

const overlays = new Map<string, PublicationWorkflowOverlay>();

export function getPublicationOverlay(
  versionId: string
): PublicationWorkflowOverlay | null {
  return overlays.get(versionId) ?? null;
}

export function setPublicationOverlay(
  versionId: string,
  patch: PublicationWorkflowOverlay
): PublicationWorkflowOverlay {
  const next = { ...(overlays.get(versionId) ?? {}), ...patch };
  overlays.set(versionId, next);
  return next;
}

export function clearPublicationOverlay(versionId: string): void {
  overlays.delete(versionId);
}

export function clearAllPublicationOverlays(): void {
  overlays.clear();
}
