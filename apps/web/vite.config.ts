import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [solidPlugin(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      "/tasks": "http://localhost:3000",
      "/health": "http://localhost:3000",
    },
  },
  build: {
    target: "esnext",
  },
});
