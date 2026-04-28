import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    solidPlugin(),
    tailwindcss(),
    VitePWA({
      srcDir: "src/sync",
      filename: "sw.ts",
      strategies: "injectManifest",
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,woff2,png,svg}"],
      },
      manifest: {
        name: "bmad-todo",
        short_name: "bmad-todo",
        start_url: "/",
        display: "standalone",
        theme_color: "#F4EFE6",
        icons: [],
      },
      devOptions: { enabled: false },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      "/tasks": "http://localhost:3000",
      "/health": "http://localhost:3000",
      "/admin": "http://localhost:3000",
    },
  },
  preview: {
    port: 4173,
    proxy: {
      "/tasks": "http://localhost:3000",
      "/health": "http://localhost:3000",
      "/admin": "http://localhost:3000",
    },
  },
  build: {
    target: "esnext",
  },
});
