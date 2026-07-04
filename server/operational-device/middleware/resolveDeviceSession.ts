import type { TrpcContext } from "../../_core/context";
import { operationalDeviceComposition } from "../operationalDeviceComposition";
import type { OperationalDeviceSession } from "../domain/deviceContracts";

export async function resolveDeviceSessionFromRequest(
  req: TrpcContext["req"]
): Promise<OperationalDeviceSession | null> {
  const header =
    typeof req.headers.authorization === "string"
      ? req.headers.authorization
      : undefined;
  const parsed = operationalDeviceComposition.authService.parseAuthorizationHeader(header);
  if (!parsed) return null;
  return operationalDeviceComposition.authService.validateCredentials(parsed);
}
