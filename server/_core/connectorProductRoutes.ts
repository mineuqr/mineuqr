import type { Express, Request, Response } from "express";
import {
  completePairingBodySchema,
  connectorProductService,
} from "../connector-product/ConnectorProductService";

export function registerConnectorProductHttpRoutes(app: Express): void {
  app.post("/api/connector/enroll", async (req: Request, res: Response) => {
    const parsed = completePairingBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid enrollment request" });
      return;
    }

    const result = await connectorProductService.completePairing(parsed.data);
    if (!result) {
      res.status(400).json({ message: "Pairing code is invalid or expired" });
      return;
    }

    res.json(result);
  });
}
