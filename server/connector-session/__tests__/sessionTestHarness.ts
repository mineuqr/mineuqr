import type { ConnectorCapability } from "../../connector-gateway/contracts/gatewayContracts";
import type {
  ConnectorAuthRequest,
  ConnectorAuthResult,
  ConnectorCommandEnvelope,
  ConnectorCommandResponse,
  ConnectorHeartbeatRequest,
  ConnectorHeartbeatResult,
  ConnectorRegisterRequest,
  ConnectorRegisterResult,
} from "../contracts/sessionContracts";
import type { TransportOutboundMessage } from "../contracts/ConnectorTransportPort";
import {
  createInProcessTransportPair,
  type ConnectorPeerTransport,
} from "../infrastructure/InProcessConnectorTransport";
import type { ConnectorNetworkComposition } from "../networkComposition";

const defaultCapabilities: ConnectorCapability = {
  supportsLocalDiscovery: true,
  supportsRemoteExecution: true,
  supportsBackgroundExecution: true,
  supportsInProcessExecution: false,
};

export type ConnectedConnector = {
  connectorId: string;
  restaurantId: number;
  secret: string;
  sessionId: string | null;
  connectorTransport: ConnectorPeerTransport;
};

export async function pairAndConnectConnector(
  network: ConnectorNetworkComposition,
  input: {
    restaurantId: number;
    connectorId: string;
    runtimeId?: string;
    version?: string;
    platform?: string;
  }
): Promise<ConnectedConnector> {
  const pairing = await network.session.authService.issuePairingToken(input.restaurantId);
  const credential = await network.session.authService.completePairing(
    pairing.token,
    input.connectorId
  );
  if (!credential) {
    throw new Error("pairing_failed");
  }

  const transport = createInProcessTransportPair();
  network.session.acceptConnection(transport.cloud);
  const connector = transport.connector;

  const authResult = await sendAndWait<ConnectorAuthResult>(connector, "auth_result", async () => {
    const payload: ConnectorAuthRequest = {
      restaurantId: input.restaurantId,
      connectorId: input.connectorId,
      runtimeId: input.runtimeId ?? "runtime-1",
      credentialSecret: credential.secret,
      version: input.version ?? "1.0.0",
      platform: input.platform ?? "windows",
    };
    await connector.sendInbound({ type: "auth", payload });
  });

  if (!authResult.success || !authResult.sessionId) {
    throw new Error(authResult.message ?? "auth_failed");
  }

  const registerResult = await sendAndWait<ConnectorRegisterResult>(
    connector,
    "register_result",
    async () => {
      const payload: ConnectorRegisterRequest = {
        sessionId: authResult.sessionId!,
        restaurantId: input.restaurantId,
        connectorId: input.connectorId,
        runtimeId: input.runtimeId ?? "runtime-1",
        platform: input.platform ?? "windows",
        version: input.version ?? "1.0.0",
        deploymentType: "local_desktop",
        capabilities: defaultCapabilities,
        hostFingerprint: "fp-test",
        hostLabel: "kitchen-pc",
      };
      await connector.sendInbound({ type: "register", payload });
    }
  );

  if (!registerResult.success) {
    throw new Error(registerResult.message ?? "register_failed");
  }

  connector.onOutbound((message) => {
    if (message.type !== "command") return;
    void respondToCommand(connector, message.payload);
  });

  return {
    connectorId: input.connectorId,
    restaurantId: input.restaurantId,
    secret: credential.secret,
    sessionId: authResult.sessionId,
    connectorTransport: connector,
  };
}

async function respondToCommand(
  connector: ConnectorPeerTransport,
  command: ConnectorCommandEnvelope
): Promise<void> {
  const response: ConnectorCommandResponse = {
    commandId: command.commandId,
    success: true,
    failureCode: null,
    message: null,
    payload: { acknowledged: true },
  };
  await connector.sendInbound({ type: "response", payload: response });
}

async function sendAndWait<T>(
  connector: ConnectorPeerTransport,
  expectedType: TransportOutboundMessage["type"],
  send: () => Promise<void>
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("timeout")), 5_000);
    connector.onOutbound((message) => {
      if (message.type !== expectedType) return;
      clearTimeout(timeout);
      resolve(message.payload as T);
    });
    void send().catch(reject);
  });
}

export async function sendHeartbeat(
  connector: ConnectedConnector
): Promise<ConnectorHeartbeatResult> {
  return sendAndWait<ConnectorHeartbeatResult>(
    connector.connectorTransport,
    "heartbeat_result",
    async () => {
      const payload: ConnectorHeartbeatRequest = {
        sessionId: connector.sessionId!,
        restaurantId: connector.restaurantId,
        connectorId: connector.connectorId,
        version: "1.0.0",
        capabilities: defaultCapabilities,
        receivedAt: new Date().toISOString(),
      };
      await connector.connectorTransport.sendInbound({ type: "heartbeat", payload });
    }
  );
}
