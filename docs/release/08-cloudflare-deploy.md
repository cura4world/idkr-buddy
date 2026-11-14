# 08. 공개판 서버(`kata-public`) 배포 안내 — 노트북에서 그대로 따라 하기

작성: 2026-11-14 (9차) · 대상: Arga 님 · 걸리는 시간: 20~30분
(같은 번호의 `08-polish-stories.md` 는 다른 문서입니다. 이 문서는 서버 배포만 다룹니다.)

이 문서는 `05-arga-checklist.md` 4절을 **순서대로 따라 할 수 있게** 풀어 쓴 것입니다.
명령은 회색 상자를 통째로 복사해 붙여 넣으면 됩니다. **비밀값은 명령에 적지 않습니다** — 명령을 치면 물어보는 칸이 나오고, 거기에 붙여 넣으면 화면에 보이지 않습니다.

> 이 문서의 명령은 9차 작업에서 **실제로 실행하지 않았습니다**(배포·로그인·비밀값 입력은 Arga 님만 합니다).
> 확인한 것은 둘뿐입니다 — 설정 파일이 읽히는지(`wrangler deploy --dry-run`, 로그인 없이 통과)와 서버 테스트(46개 통과).
> 화면에 나오는 글자는 wrangler 판에 따라 조금 다를 수 있습니다.

---

## 시작하기 전에 준비할 것 (4가지)

| 준비물 | 어디에 있나 |
|---|---|
| ① Cloudflare 계정 로그인 | kata-sermon 서버가 있는 그 계정 |
| ② `AI_PROXY_URL`, `PROXY_SECRET` 값 | **kata-sermon 서버에 넣은 것과 같은 값.** Cloudflare 화면에서는 비밀값을 다시 볼 수 없으니, 처음 넣을 때 적어 둔 곳(비밀번호 관리 앱 등)에서 꺼냅니다 |
| ③ 서비스 계정 JSON 파일 | 오늘 받은 `kata-play-billing@…` 의 JSON 키 파일(저장소 밖에 보관한 것) |
| ④ 노트북에 Node.js | 명령창에서 `node -v` 를 쳐서 숫자가 나오면 됩니다 |

②를 찾을 수 없으면 여기서 멈추고 CC 에게 알려 주세요(Cloud Run 쪽에서 새로 정해야 합니다).

---

## 1단계. 명령창을 열고 서버 폴더로 가기

PowerShell 을 열고:

```powershell
cd "C:\Users\Paul Park\Desktop\Claude Work\Kata kata\idkr-buddy\workers\kata-public"
git pull
```

`git pull` 뒤에 `Already up to date.` 또는 받아 온 파일 목록이 나오면 됩니다.

## 2단계. Cloudflare 에 로그인

```powershell
npx wrangler login
```

- 브라우저가 열립니다. Cloudflare 에 로그인하고 **Allow** 를 누릅니다.
- 명령창에 `Successfully logged in.` 이 나오면 됩니다.
- 처음이면 `Need to install the following packages: wrangler` 라고 물을 수 있습니다. `y` 를 누릅니다.

확인(어느 계정으로 들어갔는지):

```powershell
npx wrangler whoami
```

## 3단계. 저장 공간(KV) 만들기

```powershell
npx wrangler kv namespace create PUBLIC_KV
```

끝에 이런 글이 나옵니다(숫자·글자는 다릅니다):

```
[[kv_namespaces]]
binding = "PUBLIC_KV"
id = "0123456789abcdef0123456789abcdef"
```

**`id = "…"` 안의 32자**를 복사합니다. (비밀값이 아닙니다.)

> "설정 파일에 넣을까요?" 같은 물음이 나오면 **`n`(아니요)** 을 누르세요. 다음 단계에서 직접 넣습니다(자동으로 넣으면 같은 칸이 두 번 생길 수 있습니다).

## 4단계. 설정 파일에 그 id 넣기

메모장으로 설정 파일을 엽니다:

```powershell
notepad wrangler.toml
```

아래 줄을 찾아서:

```
id = "REPLACE_WITH_PUBLIC_KV_ID"
```

`REPLACE_WITH_PUBLIC_KV_ID` 를 방금 복사한 32자로 바꾸고 저장합니다(따옴표는 그대로 둡니다).

**나머지 값은 이미 채워져 있습니다. 고치지 마세요.**

| 칸 | 지금 값 | 뜻 |
|---|---|---|
| `GOOGLE_WEB_CLIENT_ID` | `228056729729-…apps.googleusercontent.com` | 오늘 만든 웹 클라이언트 ID |
| `PLAY_PACKAGE` | `app.naruve.katakata` | 앱 패키지 이름 |
| `PRODUCT_IDS` | `plus` | 구독 상품 ID |
| `AI_DAILY_BUDGET` | `{"all":3000,"tts":1000}` | 하루 전체 3,000번, 그중 소리 1,000번까지 |
| `LIMITS_JSON` | (빈칸) | 비워 두면 기본 한도를 씁니다 |

## 5단계. 비밀값 4개 넣기

하나씩 합니다. 명령을 치면 `Enter a secret value:` 라고 묻습니다. **거기에 값을 붙여 넣고 Enter.** 붙여 넣은 글자는 화면에 보이지 않는 것이 정상입니다.

처음 한 번은 "kata-public 이라는 서버가 아직 없는데 새로 만들까요?" 하고 묻습니다. **`y`** 를 누릅니다.

**(1) AI 중계 주소** — kata-sermon 과 같은 값

```powershell
npx wrangler secret put AI_PROXY_URL
```

**(2) AI 중계 비밀값** — kata-sermon 과 같은 값

```powershell
npx wrangler secret put PROXY_SECRET
```

**(3) 서비스 계정 JSON** — 이것만 파일에서 바로 넣습니다(여러 줄이라 붙여 넣기가 잘 안 됩니다).
아래에서 `<JSON 파일 경로>` 만 실제 파일 위치로 바꿔 주세요. 파일 내용은 화면에 나오지 않습니다.

```powershell
Get-Content -Raw "<JSON 파일 경로>" | npx wrangler secret put PLAY_SERVICE_ACCOUNT
```

예: `Get-Content -Raw "D:\보관\kata-play-billing.json" | npx wrangler secret put PLAY_SERVICE_ACCOUNT`

**(4) 관리자 열쇠(ADMIN_KEY)** — 새로 만드는 값입니다. **32자 이상**이어야 합니다.

먼저 무작위 48자를 만들어 **클립보드에 복사**합니다(화면에는 나오지 않습니다):

```powershell
$b = New-Object byte[] 36; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); ([Convert]::ToBase64String($b) -replace '[+/=]','x') | Set-Clipboard; "클립보드에 복사했습니다"
```

- **지금 바로 비밀번호 관리 앱(또는 안전한 곳)에 붙여 넣어 `Kata kata ADMIN_KEY` 라는 이름으로 저장하세요.** 나중에 다시 볼 방법이 없습니다.
- 그다음 서버에 넣습니다(물으면 Ctrl+V → Enter):

```powershell
npx wrangler secret put ADMIN_KEY
```

- 다 넣은 뒤 다른 글자를 아무거나 한 번 복사해 클립보드를 덮어씁니다.

**들어갔는지 확인** (이름만 나오고 값은 나오지 않습니다):

```powershell
npx wrangler secret list
```

`AI_PROXY_URL`, `PROXY_SECRET`, `PLAY_SERVICE_ACCOUNT`, `ADMIN_KEY` 네 이름이 보이면 됩니다.

> 넣지 않는 것: `TELEGRAM_BOT_TOKEN`·`TELEGRAM_CHAT_ID`(신고 알림 — 방침에 텔레그램을 넣을지 정한 뒤), `AI_PAUSED`(비상 차단용, 평소에는 없음).

## 6단계. 배포

```powershell
npx wrangler deploy
```

끝에 이런 줄이 나오면 성공입니다:

```
Deployed kata-public triggers
  https://kata-public.<계정이름>.workers.dev
  schedule: 17 * * * *
```

**주소가 `https://kata-public.cura4world.workers.dev` 인지 꼭 보세요.** 앱이 이 주소로 연결하게 되어 있습니다.
다르면 여기서 멈추고 나온 주소를 CC 에게 알려 주세요(앱 코드 한 줄을 고쳐야 합니다).

## 7단계. 살아 있는지 확인

브라우저 주소창에 넣습니다:

```
https://kata-public.cura4world.workers.dev/
```

이렇게 나오면 됩니다:

```json
{"ok":true,"service":"kata-public"}
```

## 8단계. 사용량 세는 곳과 하루 상한 확인

명령창에서 아래 두 줄을 차례로 칩니다. 첫 줄은 열쇠를 **보이지 않게** 물어봅니다(5단계에서 저장해 둔 `ADMIN_KEY` 를 붙여 넣고 Enter).

```powershell
$k = Read-Host "ADMIN_KEY" -AsSecureString
```

```powershell
$p = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($k)); Invoke-RestMethod "https://kata-public.cura4world.workers.dev/admin/budget" -Headers @{ "x-admin-key" = $p } | ConvertTo-Json -Depth 5; $p = $null
```

나온 글에서 세 가지를 봅니다:

| 볼 것 | 맞는 값 | 다르면 |
|---|---|---|
| `"counter"` | `"durable-object"` | `"kv"` 면 사용량 카운터가 켜지지 않은 것. 대시보드에 붙여 넣어 배포했을 때 이렇게 됩니다 → 6단계를 다시 |
| `"caps"` | `"all": 3000`, `"tts": 1000` | 숫자가 다르면 `wrangler.toml` 의 `AI_DAILY_BUDGET` 줄 확인 |
| `"invalid"` | `false` | `true` 면 상한 값이 잘못 적혀 **AI 가 모두 막힌 상태**입니다 → CC 에게 |

`403` 이 나오면 열쇠를 잘못 붙여 넣은 것입니다. 두 줄을 다시 칩니다.

## 9단계. 끝난 뒤

1. **`wrangler.toml` 을 저장소에 올릴지** — KV id 는 비밀값이 아니라 올려도 됩니다. CC 에게 "KV id 넣었으니 커밋해 줘"라고 하면 됩니다(올려 두면 다음 배포 때 다시 넣지 않아도 됩니다).
2. `05-arga-checklist.md` 4절의 칸에 체크합니다.
3. 다음 할 일은 같은 문서 **7절(심사용 계정에 등급 주기)** 과 **9절(내부 테스트 시나리오)** 입니다.
   - 주의: 스토어 앱은 `https://cura4world.github.io/idkr-buddy/` 의 화면을 불러옵니다. `release/public` 을 `main` 에 병합하기 전까지는 **예전 화면**이 보입니다(정상). 로그인·결제 시험은 병합 뒤에 합니다.

---

## 잘 안 될 때

| 보이는 것 | 뜻 | 할 일 |
|---|---|---|
| `KV namespace 'REPLACE_WITH_PUBLIC_KV_ID' is not valid` 같은 오류 | 4단계를 건너뜀 | `wrangler.toml` 에 KV id 를 넣습니다 |
| `Authentication error` / `not logged in` | 로그인이 풀림 | 2단계를 다시 |
| 배포는 됐는데 7단계 주소가 열리지 않음 | 처음 배포 직후 1~2분 걸릴 수 있음 | 잠시 뒤 다시. 계속 안 되면 6단계에 나온 주소를 확인 |
| 8단계에서 `"counter":"kv"` | Durable Object 가 안 붙음 | `npx wrangler deploy` 를 다시. 그래도 같으면 CC 에게 |
| 앱에서 로그인이 안 됨(`FAILED`) | 서버 문제가 아니라 OAuth 설정일 가능성이 큼 | `05-arga-checklist.md` 3절의 Android 클라이언트 SHA-1 을 확인 |
| 앱에서 AI 가 "지금은 사용할 수 없습니다" | ② 비밀값이 다르거나, 하루 상한에 닿았거나, `invalid` | 8단계를 다시 보고, 값이 맞으면 `AI_PROXY_URL`·`PROXY_SECRET` 을 다시 넣습니다(5단계 (1)(2)) |
| Cloudflare 대시보드에 `exceeded CPU` 오류 | 무료 요금제의 처리 시간 한도 | CC 에게 알려 주세요(Workers Paid 월 5달러가 필요할 수 있음 — 아직 재 보지 못한 항목) |

비밀값을 잘못 넣었으면 같은 `secret put` 명령을 다시 치면 덮어씁니다. 지우려면 `npx wrangler secret delete <이름>`.

## 하지 말 것

- 비밀값을 `wrangler.toml`·문서·채팅·메일에 적지 않습니다.
- 서비스 계정 JSON 파일을 저장소 폴더 안에 두지 않습니다.
- kata-sermon 서버의 설정은 건드리지 않습니다(값만 같은 것을 씁니다).
