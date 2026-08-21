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
    "out/**",
    "build/**",
    "dist/**",
    "coverage/**",
    "node_modules/**",

    ".wrangler/**",
    ".sites-runtime/**",
    "outputs/**",
    "work/**",

    "public/maplibre/**",

    "next-env.d.ts",
  ]),
]);