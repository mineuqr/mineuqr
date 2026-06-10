/**
 * REBUILD-5E — Security diagnostics ownership surface.
 * Server-side audit and threat modules; no Security Center UI in this phase.
 */
import { getSecurityDiagnosticsAssets } from "@/lib/admin/domains/security";

export const SECURITY_DIAGNOSTICS_MODULE_PATHS = getSecurityDiagnosticsAssets().map(
  (asset) => asset.ownerPath
);

/** Placeholder for future Security Center diagnostics panel. */
export function SecurityDiagnosticsSection() {
  return null;
}
