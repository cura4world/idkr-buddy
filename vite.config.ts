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

// @fontsource 글꼴 CSS 는 woff2 뒤에 woff(옛 형식) 대체 주소를 함께 적어 둡니다. 앱이 도는 웹뷰·브라우저는
// 모두 woff2 를 읽으므로 woff 주소를 걷어내 빌드(=APK)에 woff 파일이 들어가지 않게 합니다(약 1.6MB 절약).
// 글꼴 CSS 는 src/fonts.ts 에서 JS import 로 불러야 이 변환을 거칩니다(CSS @import 로 넣으면 거치지 않음).
function woff2Only(): Plugin {
  const woffSrc = new RegExp(",\\s*url\\([^)]*\\.woff\\)\\s*format\\(['\"]woff['\"]\\)", "g");
  return {
    name: "woff2-only",
    enforce: "pre",
    transform(code, id) {
      if (!id.includes("/@fontsource/") || !id.endsWith(".css")) return null;
      return { code: code.replace(woffSrc, ""), map: null };
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
    woff2Only(),
    react(),
    mode === "development" && componentTagger(),
    copyWellKnown(),
    VitePWA({
      // 미리보기 APK(VITE_PREVIEW=1)는 APK 안의 파일을 바로 엽니다. 서비스워커를 만들지도,
      // 등록하지도 않습니다(registerSW.js 가 index.html 에 들어가지 않음).
      disable: process.env.VITE_PREVIEW === "1",
      registerType: "autoUpdate",
      workbox: {
        globPatterns: ["**/*.{js,mjs,css,html,ico,png,svg,woff2,json}"],
        // 메인 번들이 기본 한도(2MiB)에 닿아 넘으면 캐시에서 빠지고 빌드가 실패합니다.
        // 오프라인에서도 앱이 열리도록 메인 번들은 반드시 캐시돼야 하므로 한도를 올립니다.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        // 단어장 색연필 그림(src/data/illust → assets/illust-*.json)은 설치 때 한꺼번에 받지 않고,
        // 그 단어장을 열 때 받은 것만 폰에 남깁니다(src/lib/illust.ts).
        // 글꼴(약 2.5MB, Gowun Dodum 은 95조각)도 설치 때 한꺼번에 받지 않습니다. 화면에 나온 글자가 든
        // 조각만 처음 볼 때 받아 "kata-fonts" 에 남깁니다. 파일 이름에 해시가 있어 글꼴이 바뀔 때만 새로 받습니다.
        // (미리보기 APK 는 웹 파일을 APK 안에 담아 이 캐시와 상관없이 오프라인에서도 글꼴이 나옵니다. 스토어 앱은
        //  GitHub Pages 를 원격으로 열기 때문에 이 캐시에 받아 둔 글꼴 조각만 오프라인에서 나옵니다 — C-26.)
        globIgnores: ["**/illust-*.json", "**/*.woff2", "**/*.woff"],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes("/assets/") && url.pathname.endsWith(".woff2"),
            handler: "CacheFirst",
            options: {
              cacheName: "kata-fonts",
              expiration: { maxEntries: 160 },
            },
          },
          {
            urlPattern: ({ url }) => url.pathname.includes("/assets/illust-") && url.pathname.endsWith(".json"),
            handler: "CacheFirst",
            options: {
              cacheName: "kata-illust",
              expiration: { maxEntries: 80 },
            },
          },
        ],
        // 저장소 규칙: 정규식 리터럴 대신 new RegExp (C-27)
        navigateFallbackDenylist: [new RegExp("^/~oauth"), new RegExp("^/\\.well-known/")],
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
