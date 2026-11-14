// 자동 화면 회귀 테스트(Playwright) 설정 — `npm run test:e2e`
//
// 빌드 두 벌을 따로 만들어 각각 서빙합니다(저장소의 dist 는 건드리지 않습니다).
//   preview : 미리보기 빌드(VITE_PREVIEW=1, build-preview.yml 과 같은 방식) → .e2e-dist/preview, 포트 4317
//             스토어 앱처럼 동작하고 등급은 localStorage "kata-preview-tier" 를 따릅니다(src/lib/plan.ts).
//   web     : 일반 빌드(GitHub Pages 에 올라가는 것과 같음)              → .e2e-dist/web, 포트 4318
//             키 없는 브라우저의 안내 화면(WebGate), 그리고 window.KataStore 를 흉내 내 실제 스토어 앱 경로(심사용 등급)를 봅니다.
//
// 환경 변수
//   E2E_SKIP_BUILD=1  이미 만들어 둔 .e2e-dist 를 그대로 서빙합니다(테스트만 고칠 때).
//   CI=1              실패 시 1회 재시도, 리포터를 github + html 로.
//
// src/data/seed.json 은 `npm run test:e2e` 가 먼저 만듭니다(두 빌드가 동시에 만들지 않게 여기서는 만들지 않음).

import { defineConfig, devices } from "@playwright/test";

const PREVIEW_PORT = 4317;
const WEB_PORT = 4318;
const BASE = "/idkr-buddy/";
const skipBuild = process.env.E2E_SKIP_BUILD === "1";

function serverCommand(outDir: string, port: number): string {
  const serve = "npx vite preview --outDir " + outDir + " --port " + port + " --strictPort --host 127.0.0.1";
  if (skipBuild) return serve;
  return "npx vite build --outDir " + outDir + " --emptyOutDir && " + serve;
}

const phone = {
  ...devices["Desktop Chrome"],
  viewport: { width: 360, height: 732 },
  deviceScaleFactor: 2,
  hasTouch: true,
  isMobile: true,
};

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 30000,
  expect: { timeout: 7000 },
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never", outputFolder: "playwright-report" }]]
    : [["list"]],
  use: {
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",
    serviceWorkers: "block",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "preview",
      testMatch: new RegExp("preview[\\\\/].*\\.spec\\.ts$"),
      use: { ...phone, baseURL: "http://127.0.0.1:" + PREVIEW_PORT + BASE },
    },
    {
      name: "web",
      testMatch: new RegExp("web[\\\\/].*\\.spec\\.ts$"),
      use: { ...phone, baseURL: "http://127.0.0.1:" + WEB_PORT + BASE },
    },
  ],
  webServer: [
    {
      command: serverCommand(".e2e-dist/preview", PREVIEW_PORT),
      url: "http://127.0.0.1:" + PREVIEW_PORT + BASE,
      env: { VITE_PREVIEW: "1", VITE_PREVIEW_BUILD: "e2e" },
      reuseExistingServer: false,
      timeout: 300000,
      stdout: "ignore",
      stderr: "pipe",
    },
    {
      command: serverCommand(".e2e-dist/web", WEB_PORT),
      url: "http://127.0.0.1:" + WEB_PORT + BASE,
      reuseExistingServer: false,
      timeout: 300000,
      stdout: "ignore",
      stderr: "pipe",
    },
  ],
});
