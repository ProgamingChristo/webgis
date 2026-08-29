import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@/data": fileURLToPath(new URL("../data", import.meta.url)),
      "@/lib": fileURLToPath(new URL("./lib", import.meta.url)),
      "@/src": fileURLToPath(new URL("./src", import.meta.url)),
      "@/types": fileURLToPath(new URL("../types", import.meta.url)),
      "@": fileURLToPath(new URL("./", import.meta.url)),
      "server-only": fileURLToPath(new URL("../tests/empty.ts", import.meta.url)),
    },
  },
  test: {
    clearMocks: true,
    environment: "node",
    include: [
      "tests/**/*.test.ts",
      "tests/**/*.test.tsx",
      "tests/**/*.test.mjs",
      "src/features/**/*.test.tsx",
    ],
    restoreMocks: true,
  },
});
