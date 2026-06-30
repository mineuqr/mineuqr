import { hostname } from "node:os";
import { randomUUID } from "node:crypto";
import {
  defaultCloudEndpointFromApiBase,
  FileLocalConnectorConfigProvider,
} from "../../connector-local/infrastructure/FileLocalConnectorConfigProvider";
import {
  readStoredEnrollment,
  writeStoredEnrollment,
} from "../../connector-local/infrastructure/connectorEnrollmentStore";
import { MINEUQR_CONNECTOR_VERSION } from "../../connector-local/infrastructure/productIdentity";

export type CompleteEnrollmentInput = {
  pairingToken: string;
  connectorInstanceId?: string;
  hostLabel?: string;
  cloudEndpoint?: string;
  apiBaseUrl: string;
};

export type CompleteEnrollmentResult =
  | { ok: true; restaurantId: number; connectorId: string }
  | { ok: false; message: string };

export async function completeConnectorEnrollmentFromToken(
  input: CompleteEnrollmentInput
): Promise<CompleteEnrollmentResult> {
  const connectorId = input.connectorInstanceId?.trim() || `rlc-${randomUUID()}`;
  const response = await fetch(new URL("/api/connector/enroll", input.apiBaseUrl), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pairingToken: input.pairingToken.trim(),
      connectorInstanceId: connectorId,
      hostLabel: input.hostLabel?.trim() || hostname(),
      version: MINEUQR_CONNECTOR_VERSION,
    }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    return { ok: false, message: body?.message ?? "Pairing failed" };
  }

  const body = (await response.json()) as {
    restaurantId: number;
    connectorId: string;
    credentialSecret: string;
    cloudEndpoint?: string;
  };

  const cloudEndpoint =
    input.cloudEndpoint?.trim() ||
    body.cloudEndpoint?.trim() ||
    defaultCloudEndpointFromApiBase();

  await writeStoredEnrollment({
    cloudEndpoint,
    restaurantId: body.restaurantId,
    connectorId: body.connectorId,
    credentialSecret: body.credentialSecret,
    hostLabel: input.hostLabel?.trim() || hostname(),
  });

  return { ok: true, restaurantId: body.restaurantId, connectorId: body.connectorId };
}

export async function readEnrollmentSummary(): Promise<{
  enrolled: boolean;
  restaurantId: number | null;
  connectorId: string | null;
}> {
  const stored = await readStoredEnrollment();
  if (stored) {
    return {
      enrolled: true,
      restaurantId: stored.restaurantId,
      connectorId: stored.connectorId,
    };
  }

  try {
    const config = new FileLocalConnectorConfigProvider().load();
    return {
      enrolled: true,
      restaurantId: config.restaurantId,
      connectorId: config.connectorId,
    };
  } catch {
    return { enrolled: false, restaurantId: null, connectorId: null };
  }
}
