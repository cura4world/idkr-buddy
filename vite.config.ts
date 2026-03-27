import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
import fs from "fs";
import type { Plugin } from "vite";

// .well-known 폴더를 빌드 output에 복사하는 플러그인
function copyWellKnown(): Plugin {
  return {
    name: "copy-well-known",
    closeBundle() {
      const src = "public/.well-known";
      const dest = "dist/.well-known";
      if (fs.existsSync(src)) {
        fs.mkdirSync(dest, { recursive: true });
        fs.readdirSync(src).forEach((file) => {
          fs.copyFileSync(`${src}/${file}`, `${dest}/${file}`);
        });
      }
    },
  };
}

export default defineConfig(({ mode }) => ({
  base: '/idkr-buddy/',
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    copyWellKnown(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2,json}"],
        navigateFallbackDenylist: [/^\/~oauth/, /^\/.well-known\//],
      },
      manifest: {
        name: "Kata kata - 인도네시아어 단어장",
        short_name: "Kata kata",
        description: "인도네시아어-한국어 단어 학습 앱",
        theme_color: "#F3EFEA",
        background_color: "#F3EFEA",
        display: "standalone",
        orientation: "portrait",
        start_url: "/idkr-buddy/",
        icons: [
          {
            src: "/idkr-buddy/icon-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable"
          },
          {
            src: "/idkr-buddy/icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable"
          }
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
