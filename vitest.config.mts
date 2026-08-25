import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@/src/components": fileURLToPath(
        new URL("./frontend/src/components", import.meta.url),
      ),
      "@/src/features": fileURLToPath(
        new URL("./frontend/src/features", import.meta.url),
      ),
      "@/src/lib": fileURLToPath(
        new URL("./frontend/src/lib", import.meta.url),
      ),
      "@": projectRoot,
      "server-only": fileURLToPath(new URL("./tests/empty.ts", import.meta.url)),
    },
  },
  test: {
    clearMocks: true,
    environment: "node",
    include: [
      "backend/tests/**/*.test.ts",
      "backend/tests/**/*.test.mjs",
      "frontend/tests/**/*.test.ts",
      "frontend/tests/**/*.test.mjs",
      "frontend/src/features/**/*.test.tsx"
    ],
    restoreMocks: true,
  },
});
