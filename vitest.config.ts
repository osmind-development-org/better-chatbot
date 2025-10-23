import { defineConfig } from "vitest/config";

import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    exclude: ["**/tests/**", "**/node_modules/**"],
    alias: {
      "server-only": new URL(
        "./src/test-utils/server-only-mock.ts",
        import.meta.url,
      ).pathname,
    },
  },
});
