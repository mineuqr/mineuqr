/**
 * ADR-ARCH-016 Rule 18 — production order print routes Cloud → Gateway → RLC only.
 * Embedded execution is explicit opt-in for local development and tests.
 */
export function resolvePrintConnectorExecutionMode(): "embedded" | "remote" {
  if (process.env.NODE_ENV === "production") {
    return "remote";
  }

  const configured = process.env.PRINT_CONNECTOR_EXECUTION_MODE?.trim().toLowerCase();
  return configured === "embedded" ? "embedded" : "remote";
}
