export const INFRASTRUCTURE_FAILURES = [
  "authentication_failure",
  "registration_failure",
  "transport_unavailable",
  "session_expired",
  "connector_unavailable",
  "heartbeat_timeout",
  "version_mismatch",
  "duplicate_session",
] as const;

export type InfrastructureFailureCode = (typeof INFRASTRUCTURE_FAILURES)[number];

export type InfrastructureFailure = {
  code: InfrastructureFailureCode;
  message: string;
};

export function infrastructureFailure(
  code: InfrastructureFailureCode,
  message: string
): InfrastructureFailure {
  return { code, message };
}
