import { useEffect, useMemo, useState } from "react";
import type { DiningSessionRecoveryResult } from "@/lib/diningSessionRecovery";
import {
  resolvePostSubmissionOrderingBlock,
  type PostSubmissionGuardResult,
} from "@/lib/customerJourneyGuard";
import { attachDiningSessionRevalidationListeners } from "@/lib/diningSessionRevalidation";

export function usePostSubmissionGuard({
  slug,
  tableNumber,
  recovery,
  recoveryDone,
}: {
  slug: string;
  tableNumber: number;
  recovery: DiningSessionRecoveryResult;
  recoveryDone: boolean;
}) {
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!slug || tableNumber <= 0) return;
    return attachDiningSessionRevalidationListeners(() => {
      setRevision((value) => value + 1);
    });
  }, [slug, tableNumber]);

  useEffect(() => {
    if (!slug || tableNumber <= 0) return;
    const handlePageShow = () => setRevision((value) => value + 1);
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [slug, tableNumber]);

  return useMemo((): PostSubmissionGuardResult => {
    void revision;
    return resolvePostSubmissionOrderingBlock({
      slug,
      tableNumber,
      recovery,
      recoveryDone,
    });
  }, [slug, tableNumber, recovery, recoveryDone, revision]);
}
