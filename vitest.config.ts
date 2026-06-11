import { defineConfig } from "vitest/config";
import path from "path";

const templateRoot = path.resolve(import.meta.dirname);

export default defineConfig({
  root: templateRoot,
  resolve: {
    alias: {
      "@": path.resolve(templateRoot, "client", "src"),
      "@commercial": path.resolve(templateRoot, "src", "lib", "commercial"),
      "@shared": path.resolve(templateRoot, "shared"),
      "@assets": path.resolve(templateRoot, "attached_assets"),
    },
  },
  test: {
    environment: "node",
    setupFiles: ["./vitest.audit-setup.ts"],
    include: [
      "server/**/*.test.ts",
      "server/**/*.spec.ts",
      "client/**/*.test.ts",
      "client/**/*.spec.ts",
      "src/**/*.test.ts",
      "src/**/*.spec.ts",
    ],
  },
});
