import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // proxy API calls to the backend in dev (api uses the /api global prefix)
    proxy: { "/api": "http://localhost:4000" },
  },
});
