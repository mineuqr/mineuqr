/**
 * MULTI-CHECK-ALLOCATION-PRODUCTION-ADOPTION-1 (Rev 2.0)
 * Production UI Suspension & Capability Preservation.
 *
 * Status:      Dormant
 * UI:          Disabled
 * Core:        Active (Domain · Persistence · Integration · Projection · API)
 * Reactivation: Supported — remount MultiCheckAllocationPanel in Check Workspace
 *               and restore query invalidation on settlement action bars.
 *
 * Operational UX has moved toward Settlement Record Platform.
 * This capability remains intact for advanced financial workflows.
 */

export const MULTI_CHECK_ALLOCATION_CAPABILITY_STATUS = "dormant" as const;

export const MULTI_CHECK_ALLOCATION_UI_ENABLED = false as const;

export const MULTI_CHECK_ALLOCATION_CORE_ACTIVE = true as const;

export const MULTI_CHECK_ALLOCATION_REACTIVATION_SUPPORTED = true as const;

/** Production UI must not mount MCA presentation when this is false. */
export function isMultiCheckAllocationUiEnabled(): boolean {
  return MULTI_CHECK_ALLOCATION_UI_ENABLED;
}
