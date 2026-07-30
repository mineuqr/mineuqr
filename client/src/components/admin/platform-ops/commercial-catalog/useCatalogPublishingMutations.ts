/**
 * COMMERCIAL-PLATFORM-ADOPTION-1
 * Canonical Catalog publishing mutations for admin UI.
 * Preserves one-click draft→publish by approve-then-publish when needed.
 * Does not evaluate entitlements (I-CPP-01 / I-SRE-01).
 */

import { trpc } from "@/lib/trpc";

export type CatalogPublishingMutationHandlers = {
  onPublishSuccess?: () => void | Promise<void>;
  onPublishError?: (message: string) => void;
  onLifecycleSuccess?: () => void | Promise<void>;
  onLifecycleError?: (message: string) => void;
};

/**
 * Wires commercialCatalog.publishing.* — never foundation publishVersion.
 */
export function useCatalogPublishingMutations(
  handlers: CatalogPublishingMutationHandlers = {}
) {
  const approveMut =
    trpc.commercialCatalog.publishing.approveVersion.useMutation();
  const scheduleMut =
    trpc.commercialCatalog.publishing.schedulePublish.useMutation();
  const cancelScheduleMut =
    trpc.commercialCatalog.publishing.cancelSchedule.useMutation();
  const publishMut = trpc.commercialCatalog.publishing.publishVersion.useMutation(
    {
      onSuccess: async () => {
        await handlers.onPublishSuccess?.();
      },
      onError: (err) => handlers.onPublishError?.(err.message),
    }
  );
  const deprecateMut =
    trpc.commercialCatalog.publishing.deprecateVersion.useMutation({
      onSuccess: async () => {
        await handlers.onLifecycleSuccess?.();
      },
      onError: (err) => handlers.onLifecycleError?.(err.message),
    });
  const retireMut = trpc.commercialCatalog.publishing.retireVersion.useMutation({
    onSuccess: async () => {
      await handlers.onLifecycleSuccess?.();
    },
    onError: (err) => handlers.onLifecycleError?.(err.message),
  });
  const archiveMut =
    trpc.commercialCatalog.publishing.archiveVersion.useMutation({
      onSuccess: async () => {
        await handlers.onLifecycleSuccess?.();
      },
      onError: (err) => handlers.onLifecycleError?.(err.message),
    });

  /**
   * Canonical publish: ensure Approved (idempotent when already approved),
   * then workflow-enforced publish. Same end-state as former foundation publish.
   */
  async function publishVersion(versionId: string) {
    try {
      await approveMut.mutateAsync({ versionId });
    } catch {
      // Already approved/scheduled or not draft — publish will enforce.
    }
    return publishMut.mutateAsync({ versionId });
  }

  return {
    approveMut,
    scheduleMut,
    cancelScheduleMut,
    publishMut,
    deprecateMut,
    retireMut,
    archiveMut,
    publishVersion,
    isPublishing:
      approveMut.isPending ||
      publishMut.isPending ||
      scheduleMut.isPending ||
      cancelScheduleMut.isPending,
  };
}
