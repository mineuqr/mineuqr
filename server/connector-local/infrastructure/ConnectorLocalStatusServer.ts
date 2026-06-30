import { createServer, type Server } from "node:http";
import type { ServiceSupervisorSnapshot } from "../services/LocalConnectorServiceSupervisor";

export type ConnectorLocalStatusServer = {
  server: Server;
  port: number;
};

export function startConnectorLocalStatusServer(input: {
  port?: number;
  getSnapshot: () => ServiceSupervisorSnapshot;
  onRestart?: () => Promise<void>;
}): Promise<ConnectorLocalStatusServer> {
  const port = input.port ?? 9477;

  const server = createServer(async (req, res) => {
    const url = req.url ?? "/";
    if (req.method === "GET" && url === "/status") {
      writeJson(res, 200, input.getSnapshot());
      return;
    }

    if (req.method === "POST" && url === "/restart") {
      await input.onRestart?.();
      writeJson(res, 200, { ok: true });
      return;
    }

    writeJson(res, 404, { error: "not_found" });
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      resolve({ server, port });
    });
  });
}

function writeJson(res: import("node:http").ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}
