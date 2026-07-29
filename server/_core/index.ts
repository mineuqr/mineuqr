import "dotenv/config";
import { createServer } from "http";
import net from "net";
import { createApp } from "./createApp";
import { attachConnectorWebSocketServer } from "./connectorWebSocketServer";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = await createApp();
  const server = createServer(app);
  attachConnectorWebSocketServer(server);

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    void import("../services/commercial-catalog")
      .then(({ ensureCatalogReady }) => ensureCatalogReady())
      .then((r) => {
        console.log(
          `[CommercialCatalog] adoption ready (${JSON.stringify(r)})`
        );
      })
      .catch((e) => {
        console.warn("[CommercialCatalog] adoption seed skipped:", e);
      });
  });
}

if (!process.env.VERCEL) {
  startServer().catch(console.error);
}
