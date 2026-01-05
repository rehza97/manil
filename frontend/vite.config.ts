import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: ["axios"],
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    watch: {
      usePolling: true, // Required for Docker volume mounts
    },
    hmr: {
      host: "localhost", // Use localhost for HMR client connection
      port: 5173,
    },
  },
});
