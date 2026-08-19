import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": projectRoot,
      "server-only": fileURLToPath(new URL("./tests/empty.ts", import.meta.url)),
    },
  },
  test: {
    clearMocks: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    restoreMocks: true,
  },
});
