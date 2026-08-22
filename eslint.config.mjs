import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextCoreWebVitals,
  ...nextTypeScript,

  {
    rules: {
      // Temporary during Revan + Christo integration.
      // Restore to "error" after legacy backend typing is cleaned up.
      "@typescript-eslint/no-explicit-any": "off",
    },
  },

  globalIgnores([
    ".next/**",
    "**/.next/**",
    "out/**",
    "**/out/**",
    "build/**",
    "**/build/**",
    "dist/**",
    "**/dist/**",
    "coverage/**",
    "**/coverage/**",
    "node_modules/**",
    "**/node_modules/**",

    ".wrangler/**",
    "**/.wrangler/**",
    ".sites-runtime/**",
    "**/.sites-runtime/**",
    "outputs/**",
    "**/outputs/**",
    "work/**",
    "**/work/**",

    "public/maplibre/**",
    "**/public/maplibre/**",

    "next-env.d.ts",
    "**/next-env.d.ts",
  ]),
]);
