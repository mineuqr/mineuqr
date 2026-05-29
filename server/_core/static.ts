import express, { type Express } from "express";
import fs from "fs";
import path from "path";

function resolveDistPublicPath(): string {
  const fromCwd = path.resolve(process.cwd(), "dist", "public");
  if (fs.existsSync(fromCwd)) {
    return fromCwd;
  }
  // Bundled server entry (dist/index.js): static assets sit beside the bundle.
  return path.resolve(import.meta.dirname, "public");
}

export function serveStatic(app: Express) {
  const distPath = resolveDistPublicPath();
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
