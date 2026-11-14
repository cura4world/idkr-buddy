// `npm run test:e2e:nobuild [-- playwright 인자]`
// 이미 만들어 둔 .e2e-dist 를 그대로 서빙해 화면 회귀 테스트만 다시 돌립니다(테스트 파일만 고쳤을 때).
// 앱 코드를 고쳤다면 `npm run test:e2e` 로 다시 빌드해야 합니다.
// 환경 변수를 넣는 방식이 셸마다 달라(윈도우 cmd·PowerShell·bash) 노드에서 넣습니다.

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

for (const dir of [".e2e-dist/preview/index.html", ".e2e-dist/web/index.html"]) {
  if (!existsSync(dir)) {
    console.error(dir + " 가 없습니다. 먼저 `npm run test:e2e` 로 한 번 빌드하세요.");
    process.exit(1);
  }
}

const r = spawnSync("npx", ["playwright", "test", ...process.argv.slice(2)], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, E2E_SKIP_BUILD: "1" },
});
process.exit(r.status === null ? 1 : r.status);
