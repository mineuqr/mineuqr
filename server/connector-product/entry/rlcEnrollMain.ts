import { parseArgs } from "node:util";
import { hostname } from "node:os";
import { completeConnectorEnrollmentFromToken } from "../enrollment/connectorEnrollmentClient";

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      token: { type: "string" },
      api: { type: "string" },
      host: { type: "string" },
    },
  });

  const pairingToken = values.token?.trim();
  const apiBaseUrl = values.api?.trim();
  if (!pairingToken || !apiBaseUrl) {
    console.error("Usage: rlc-enroll --token <code> --api <server-url>");
    process.exit(1);
  }

  const result = await completeConnectorEnrollmentFromToken({
    pairingToken,
    apiBaseUrl,
    hostLabel: values.host?.trim() || hostname(),
  });

  if (!result.ok) {
    console.error(result.message);
    process.exit(1);
  }

  console.log(
    JSON.stringify({
      ok: true,
      restaurantId: result.restaurantId,
      connectorId: result.connectorId,
    })
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
