import { z } from "zod";
import { connectorNetworkComposition } from "../connector-session/networkComposition";
import {
  MINEUQR_CONNECTOR_PRODUCT_NAME,
  MINEUQR_CONNECTOR_VERSION,
} from "./productVersion";

const DOWNLOAD_URL =
  process.env.MINEUQR_CONNECTOR_DOWNLOAD_URL?.trim() ||
  process.env.CONNECTOR_DOWNLOAD_URL?.trim() ||
  null;

export type ConnectorDownloadInfo = {
  productName: string;
  version: string;
  downloadUrl: string | null;
  downloadReady: boolean;
  windowsInstallerName: string;
};

export type ConnectorPairingIssue = {
  pairingToken: string;
  restaurantId: number;
  expiresAt: string;
  productName: string;
};

export class ConnectorProductService {
  async getDownloadInfo(): Promise<ConnectorDownloadInfo> {
    return {
      productName: MINEUQR_CONNECTOR_PRODUCT_NAME,
      version: MINEUQR_CONNECTOR_VERSION,
      downloadUrl: DOWNLOAD_URL,
      downloadReady: Boolean(DOWNLOAD_URL),
      windowsInstallerName: `MineuQR-Connector-${MINEUQR_CONNECTOR_VERSION}-Setup.exe`,
    };
  }

  async issuePairingToken(restaurantId: number): Promise<ConnectorPairingIssue> {
    const pairing = await connectorNetworkComposition.session.authService.issuePairingToken(
      restaurantId
    );
    return {
      pairingToken: pairing.token,
      restaurantId: pairing.restaurantId,
      expiresAt: pairing.expiresAt,
      productName: MINEUQR_CONNECTOR_PRODUCT_NAME,
    };
  }

  async completePairing(input: {
    pairingToken: string;
    connectorInstanceId: string;
    hostLabel?: string;
    version?: string;
  }) {
    const credential = await connectorNetworkComposition.session.authService.completePairing(
      input.pairingToken,
      input.connectorInstanceId
    );
    if (!credential) {
      return null;
    }

    const apiBase =
      process.env.MINEUQR_PUBLIC_API_URL?.trim() ||
      process.env.PUBLIC_APP_URL?.trim() ||
      null;
    let cloudEndpoint: string | null = null;
    if (apiBase) {
      try {
        const url = new URL(apiBase);
        cloudEndpoint = `${url.protocol === "https:" ? "wss" : "ws"}://${url.host}/connector/ws`;
      } catch {
        cloudEndpoint = null;
      }
    }

    return {
      restaurantId: credential.restaurantId,
      connectorId: input.connectorInstanceId,
      credentialSecret: credential.secret,
      cloudEndpoint,
      productName: MINEUQR_CONNECTOR_PRODUCT_NAME,
      version: MINEUQR_CONNECTOR_VERSION,
    };
  }
}

export const connectorProductService = new ConnectorProductService();

export const completePairingBodySchema = z.object({
  pairingToken: z.string().min(8).max(256),
  connectorInstanceId: z.string().min(3).max(128),
  hostLabel: z.string().max(128).optional(),
  version: z.string().max(32).optional(),
});
