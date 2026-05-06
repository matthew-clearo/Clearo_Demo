import path from "node:path";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "../../"),
    },
  },
  test: {
    environment: "node",
    setupFiles: [],
    include: ["src/app/api/**/*.test.js"],
  },
});
