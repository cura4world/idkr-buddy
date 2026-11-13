# 05. Arga 님이 직접 하실 일 — 순서대로

작성: 2026-11-10 · 코드 쪽은 `release/public` 브랜치에 준비돼 있습니다.
콘솔·계정·비밀값은 Arga 님만 만들 수 있어 여기 모았습니다. **위에서부터 순서대로** 하세요.
뒤 단계가 앞 단계의 값을 씁니다.

`[ ]` 표시는 하신 뒤 체크하시면 됩니다.

---

## 0. 먼저 — 출시 전 선행 조건

- [x] 저장소 밖 security-plan 의 **보안 작업 완료** (`HANDOFF.md` 1번) — 2026-11-12 완료.
- [ ] 2026-09-20 자동 보안 검사 결과 재검토 (`HANDOFF.md` 1번). 이것이 끝나기 전에는 "출시 가능"으로 보지 않습니다.
- [x] 문서의 빈칸 채우기(2026-11-12 HQ 값으로 채움): 사업자명 Naruve Studio(나루브스튜디오) · 대표자 박창홍 · 사업자등록번호 216-09-73358 · 지원 이메일 support@naruve.app · 개인정보 보호책임자 박창홍 · 사업장 주소와 사업용 전화번호는 `terms.html` 의 "사업자 정보" 칸에만 둠(`privacy.html` 에는 주소 없음)
  → `public/privacy.html`, `public/terms.html`, `public/delete-account.html`, `06-store-listing.md`
- [ ] **시행일**(`privacy.html`·`terms.html` 의 `[시행일]` `[effective date]`)은 HQ 가 게시하는 날짜로 정한다. 게시본은 HQ 가 `naruve-ganada` 의 `docs/apps/kata-kata/{privacy,terms,delete}/index.html` 로 올린다.

## 1. 업로드 키 만들기 (PC, 5분)

PC 명령창에서 (자바가 깔려 있으면 `keytool` 이 있습니다):

```
keytool -genkeypair -v -keystore kata-store-upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
```

- 비밀번호 두 개(키 저장소·키)를 정하고 **안전한 곳에 적어 둡니다.** 잃어버리면 Play 에 재설정 요청을 해야 합니다.
- `kata-store-upload.jks` 파일은 **저장소에 올리지 마세요.** 관리자판 APK 키와도 다른 키입니다.
- SHA-1 지문을 적어 둡니다 (3번에서 씀):
  ```
  keytool -list -v -keystore kata-store-upload.jks -alias upload
  ```

## 2. GitHub 비밀값 (저장소 Settings → Secrets and variables → Actions)

**Secrets** 탭:
- [ ] `STORE_KEYSTORE_BASE64` — 키 파일을 base64 로 바꾼 값
  (PowerShell: `[Convert]::ToBase64String([IO.File]::ReadAllBytes("kata-store-upload.jks")) | Set-Clipboard`)
- [ ] `STORE_KEYSTORE_PASSWORD`
- [ ] `STORE_KEY_ALIAS` = `upload`
- [ ] `STORE_KEY_PASSWORD`

**Variables** 탭:
- [ ] `STORE_WEB_CLIENT_ID` — 3번에서 만드는 **웹** 클라이언트 ID (비밀값 아님)

## 3. Google Cloud 콘솔 — 로그인용 OAuth (15분)

기존 프로젝트 `Kata-kata`(Cloud Run 이 있는 곳)를 그대로 써도 됩니다.

1. [ ] **OAuth 동의 화면**: 외부(External), 앱 이름 Kata kata, 지원 이메일, 개인정보처리방침 주소
   `https://naruve.app/apps/kata-kata/privacy/`, 범위는 기본(openid·email·profile)만 → **프로덕션으로 게시**
2. [ ] **OAuth 클라이언트 ID — 웹 애플리케이션** 하나 → 나온 ID 를
   - GitHub 변수 `STORE_WEB_CLIENT_ID` (2번)
   - Worker 변수 `GOOGLE_WEB_CLIENT_ID` (4번)
3. [ ] **OAuth 클라이언트 ID — Android** (패키지 `app.naruve.katakata`) 를 SHA-1 마다 하나씩:
   - 업로드 키 SHA-1 (1번)
   - **Play 앱 서명 키 SHA-1** — Play Console → 앱 → 테스트 및 출시 → 앱 무결성 → 앱 서명 (5번에서 첫 업로드 뒤에 보임)
   - (선택) 디버그 빌드로 시험할 때만: 디버그 키 SHA-1

   ※ Android 클라이언트가 없거나 SHA-1 이 다르면 로그인 창이 뜨지 않고 `FAILED`/`NO_ACCOUNT` 가 납니다. 가장 흔한 실수입니다.
4. [ ] **Google Play Android Developer API** 사용 설정 (API 및 서비스 → 라이브러리)
5. [ ] **서비스 계정** 만들기 → JSON 키 받기 → 6번 Play Console 에서 이 계정을 초대 → Worker 비밀값 `PLAY_SERVICE_ACCOUNT` 에 JSON 전체를 넣음

## 4. Cloudflare — 공개판 서버 `kata-public` (15분)

1. [ ] KV 네임스페이스 `PUBLIC_KV` 만들기
2. [ ] Worker `kata-public` 만들기 → `workers/kata-public/worker.js` 내용을 붙여 넣기 → KV 바인딩 이름 `PUBLIC_KV`
3. [ ] 변수: `GOOGLE_WEB_CLIENT_ID`, `PLAY_PACKAGE`=`app.naruve.katakata`, `PRODUCT_IDS`=`plus`
4. [ ] 비밀값:
   - `AI_PROXY_URL`, `PROXY_SECRET` — **kata-sermon Worker 에 넣은 것과 같은 값** (Cloud Run 중계)
   - `PLAY_SERVICE_ACCOUNT` — 3-5번의 JSON
   - `ADMIN_KEY` — 아무 긴 무작위 문자열 (신고 조회용, 따로 보관)
5. [ ] 주소 확인: `https://kata-public.cura4world.workers.dev/` 를 열면 `{"ok":true,"service":"kata-public"}`
   - 주소가 다르면 `src/lib/account.ts` 의 `PUBLIC_BASE` 한 줄을 고칩니다
6. [ ] ⚠ **Cloud Run 호출 형식 대조** — 저는 kata-sermon Worker 소스를 볼 수 없어서, 결정 기록에 적힌 대로
   `POST AI_PROXY_URL` + 헤더 `x-kata-proxy`(비밀)·`x-kata-model`(모델) + 본문 그대로로 만들었습니다.
   kata-sermon 의 `/ai/gemini` 처리부와 다르면 `worker.js` 의 `handleAi` 안 `tfetch(env.AI_PROXY_URL, …)` 부분만 맞추면 됩니다.

## 5. Play Console — 앱 만들기와 첫 업로드 (30분)

1. [ ] 앱 만들기: 이름 Kata kata, 기본 언어 한국어, 앱, 무료(인앱 구매 있음)
2. [ ] GitHub → Actions → **Build Store AAB (공개판)** → Run workflow (브랜치 `release/public` 또는 병합 뒤 `main`)
   → 끝나면 아티팩트 `kata-kata-store-aab` 다운로드
3. [ ] 테스트 및 출시 → **내부 테스트** → 새 버전 → AAB 업로드 (Play 앱 서명 사용 동의)
4. [ ] 앱 서명 키 SHA-1 을 3-3번 Android 클라이언트에 추가
5. [ ] 내부 테스터에 Arga 님 Google 계정 추가 → 테스트 링크로 설치

## 6. Play Console — 구독 상품 (첫 업로드 뒤에 열림)

- [ ] 수익 창출 → 구독 → 상품 ID **`plus`** (바꾸면 Worker `PRODUCT_IDS` 도 같이)
  - 기본 요금제 `monthly` (1개월, 자동 갱신) / `yearly` (1년, 자동 갱신)
  - 가격 (**2026-11-14 결정**): **월간 3,900원 / 연간 34,800원**(월 2,900원 꼴). 다른 나라 가격은 Play 가 환율로 채움
    - 앱은 Play 에서 받은 가격만 보여 줍니다. 월 환산 "(월 2,900원)"과 할인율은 앱이 Play 연 가격 ÷ 12 로 계산하므로,
      **콘솔에 넣은 값이 곧 화면 값**입니다. 다른 값을 넣으면 화면도 그 값으로 바뀝니다(코드를 고칠 필요 없음).
    - 미리보기 APK 에만 대체값 34,800원 / 3,900원이 들어 있습니다(`src/lib/plusCopy.ts`). 가격을 바꾸면 이 두 숫자도 같이.
  - 각 기본 요금제에 **7일 무료 체험** 제안
- [ ] **(a) 연간 가격 확인** — 위 34,800원으로 넣었는지. 예전 문서에 적혀 있던 잠정 연간 가격은 폐기된 값입니다.
- [ ] **(b) 체험 제안 ID 에 `trial` 을 넣기** — 예: `trial-7d`. 서버가 Play 응답에서 체험 단계를 못 읽을 때 이 글자로
      체험을 알아봅니다(`03-architecture.md` "체험 판정"). 이름에 `trial` 이 없으면 체험 중인 사람이 Plus 한도로 잡힐 수 있습니다.
- [ ] **(c) 체험 제안의 자격을 "신규 고객 획득 — 이 구독을 구매한 적이 없는 사용자"로** — 화면의
      "무료 체험은 계정마다 한 번만 제공됩니다"가 이 설정에 기대고 있습니다. 앱은 Play 가 체험 제안을 줄 때만 "7일 무료"를 보여 줍니다.
- [ ] **(d) 유예 기간·계정 보류 기간을 정해서 여기에 적어 두기** — 기본 요금제마다 설정합니다.
      서버는 유예 기간(`IN_GRACE_PERIOD`)에는 Plus 를 유지하고 계정 보류(`ON_HOLD`)에는 무료로 내립니다.
      기본값에 맡기면 결제 실패 뒤 며칠 동안 Plus 가 유지되는지 아무도 모릅니다.
      → 정한 값: 월간 유예 `___`일 · 보류 `___`일 / 연간 유예 `___`일 · 보류 `___`일
- [ ] 사용자 및 권한 → 3-5번 서비스 계정 초대 → 앱 권한: **재무 데이터 보기**, **주문 및 구독 관리**
  - **⚠ "주문 및 구독 관리" 권한이 빠지면 구매 조회는 되는데 구매 확인(acknowledge)만 실패합니다.
    그러면 모든 구매가 사흘 뒤 Google 에 의해 자동 환불됩니다. 두 권한을 모두 넣었는지 반드시 다시 확인하세요.**
  - 지금 서버는 확인이 실패해도 Plus 는 먼저 열어 주고 10분마다 다시 확인하지만, 권한이 없으면 끝내 성공하지 못해 사흘 뒤 환불됩니다.
  - 확인 실패는 Cloudflare 에서 볼 수 있습니다: Worker 로그의 `ACK_FAILED status=403`, KV 의 `ackfail:` 로 시작하는 키(7일 보관).
    내부 테스트에서 구독한 뒤 **KV 에 `ackfail:` 키가 하나도 없는지** 확인하세요.
- [ ] **(e) 서비스 계정 권한은 넣은 뒤 반영까지 시간이 걸릴 수 있습니다**(길면 하루). 넣자마자 시험하면
      조회부터 401·403 이 나는데, 코드 오류가 아닙니다. 이때 앱은 "결제는 완료되었습니다. 확인 중입니다."를 보여 주고 자동으로 다시 확인합니다.
- [ ] 설정 → 라이선스 테스트 → Arga 님 계정 추가 (실제 결제 없이 구독 시험)
- [ ] **(f) 환불 처리 방침 정하기** — 콘솔에서 환불할 때 두 가지가 있습니다.
  - "환불 + 권한 회수(구독 취소)": 서버가 **하루 안에** 알아채고 무료로 내립니다(마지막 확인에서 24시간이 지난 뒤 첫 요청 때 Play 에 다시 묻습니다).
    바로 내려야 하면 Cloudflare KV 에서 그 계정의 `ent:<uid>` 를 지웁니다(관리자가 준 Special 등급이 있었다면 다시 줘야 함).
  - "환불만"(권한은 그대로): Play 가 만료일까지 이용 가능하다고 답하므로 Plus 가 만료일까지 유지됩니다.
  - 어느 쪽을 기본으로 할지, 환불 문의를 어디로 받을지(support@naruve.app) 정해 둡니다.
- [ ] **(g) 실시간 개발자 알림(RTDN) — 지금은 연결하지 않음으로 결정해 둠** — 환불·갱신을 서버가 Play 에 주기적으로
      다시 물어 처리하도록 고쳤습니다(이용 중 하루 한 번, 만료·무료 뒤 30일 동안 한 시간에 한 번까지). 환불 반영이 하루까지 늦는 것이
      문제가 되면 그때 Pub/Sub 주제를 연결합니다(서버 코드 추가 필요 — CC 에게).
- [ ] **(h) Play Console 결제 프로필의 한국 판매용 사업자 정보·환불 안내** — 약관 페이지의 "사업자 정보"
      (`https://naruve.app/apps/kata-kata/terms/#business-info`)와 같은 값(상호·대표자·사업자등록번호·주소·연락처)인지 대조합니다.

## 7. Play Console — 앱 콘텐츠(정책)

- [ ] 개인정보처리방침: `https://naruve.app/apps/kata-kata/privacy/`
- [ ] 앱 액세스: "로그인이 필요함" → 심사자 안내: *"아무 Google 계정으로 로그인하면 모든 기능을 쓸 수 있습니다."*
- [ ] 광고: 없음
- [ ] 콘텐츠 등급 설문: 교육, 폭력·성적 내용 없음, 사용자 간 소통 없음, AI 생성 콘텐츠 있음(신고 기능 있음)
- [ ] 타겟층: **16세 이상**을 권합니다 (약관은 만 14세 이상. 13~15세를 넣으면 청소년 대상 추가 검토가 붙음)
- [ ] 데이터 보안: `07-data-safety.md` 답안 그대로
- [ ] 계정 삭제 주소: `https://naruve.app/apps/kata-kata/delete/`
- [ ] 스토어 등록정보: `06-store-listing.md` + 스크린샷 (폰 2~8장), 아이콘 512×512, 그래픽 이미지 1024×500

## 8. 웹 반영 (CC 에게)

- [ ] `release/public` 를 `main` 에 병합 → Pages 배포 확인
  - 바뀐 동작은 모두 "스토어 앱일 때만" 켜지므로 관리자판·회원판 APK 에서는 달라지는 것이 없어야 합니다.
    예외 두 가지는 모든 판에 적용됩니다: 지도 사진 출처 표시 + 위키미디어 공용 사진만 사용, 정책 페이지 3개 공개
  - 병합 뒤 Arga 님 폰에서 **아무것도 달라지지 않았는지** 먼저 확인

## 9. 내부 테스트 시나리오 (스토어 앱)

- [ ] 처음 열면 로그인 화면 → Google 로그인 → 홈
- [ ] 홈에 뉴스·말씀과 기도·설교가 없음, 맨 아래 "구독 / Kata kata Plus"
- [ ] 사전에서 `buruk` 검색 → 결과 → 내 단어장에 담기 → 결과 맨 끝 "풀이가 이상해요" 보임
- [ ] 단어 발음 버튼 → Gemini 음성으로 들림 (폰 기계음 아님)
- [ ] 이야기 만들기 → 뒷면 끝 신고 버튼
- [ ] 지도 → 핀 → 사진 아래 "사진: 저작자 (라이선스) / Wikimedia Commons"
- [ ] 설정 → 내 계정(이메일, 오늘 사용량) → 백업 파일 저장 → 다운로드 폴더에 파일
- [ ] Plus → 가격 두 개(연간 카드: "연 34,800원" 크게 · "(월 2,900원)" 작게, Play Console 값과 같은지) → 버튼 바로 아래 첫 줄
      "해지 전까지 매년 자동으로 결제됩니다." → (라이선스 테스터로) 구독 → "Plus 이용 중"
- [ ] (비행기 모드로 Plus 화면 열기) 가격 자리에 "가격을 불러오는 중" → 잠시 뒤 "가격을 불러오지 못했습니다 · 다시 불러오기", 구독 버튼이 눌리지 않음
- [ ] (라이선스 테스터) 결제 창에서 결제를 마치자마자 비행기 모드 → "결제는 완료되었습니다. 확인 중입니다." → 인터넷을 켜면 앱을 끄지 않아도 Plus 로 바뀌고 알림
- [ ] (라이선스 테스터) 구독한 뒤 Play Console 에서 그 주문을 **환불 + 권한 회수** → 하루 안에 앱이 무료로 돌아감(앱을 껐다 켜지 않아도, 화면으로 돌아올 때)
- [ ] 구독 중에 구독 버튼이 다시 보이는 경우(다른 기기 등) 눌렀을 때 "이미 보유" 오류 대신 "구독을 다시 연결했습니다"
- [ ] 체험을 이미 쓴 Play 계정으로 로그인 → 홈·게임방·이야기·이해·내 정보의 Plus 버튼에 "7일 무료 체험" 대신 "자세히 보기"
- [ ] 화면 위아래가 상단바·하단바에 가리지 않음, 키보드가 입력창을 가리지 않음
- [ ] 폰 뒤로가기: 화면 안에서 한 단계씩, 홈에서는 앱이 뒤로 물러남 → 다시 열었을 때도 뒤로가기가 화면 안에서 동작
- [ ] (라이선스 테스터) 구독 결제 화면에서 결제 직후 앱을 바로 끄고 다시 켬 → 잠시 뒤 Plus 로 표시됨 (구매 재확인)
- [ ] 설정 → 계정 삭제(두 번) → 로그인 화면으로 돌아감

## 10. 알고 계셔야 할 것

- **관리자판 APK 빌드(`build-apk.yml`)도 지금은 실패할 가능성이 큽니다.** 스토어 빌드를 만들다 보니
  `android-actions/setup-android@v3` 가 2026-11 러너에서 실패했습니다(마지막 성공은 2026-08-10).
  다음에 관리자판 APK 를 다시 빌드할 일이 생기면 `build-store.yml` 처럼 SDK 설정 단계를 바꿔야 합니다.
- 공개판 사용량 한도(무료 텍스트 200·음성 30/일 등)는 **잠정값**입니다. Worker 변수 `LIMITS_JSON` 하나로 바꿉니다.
- 단어 발음 듣기도 음성 한도에 들어갑니다(같은 단어는 기기에 저장돼 두 번째부터는 세지 않음). 재논의 때 함께 정하면 됩니다.
- **스토어 앱에서 한국어 문장 듣기**(단어장 뜻·오늘의 문장 풀이 등)도 Gemini 음성으로 갑니다. 지금 음성 요청은
  "인도네시아어를 읽어라" 지시로 가므로 한국어 발음 품질은 확인이 필요하고, 한도도 함께 씁니다.
  음성 재논의 때 "한국어 듣기를 뺄지 / 따로 지시할지"를 같이 정하면 됩니다(폰 내장 음성은 넣지 않기로 함).
- 사용량 한도는 서버가 **부르기 전에 한 칸을 잡고, 실패하면 돌려주는** 방식입니다. Cloudflare KV 는 동시에 쓰는
  값을 원자적으로 맞춰 주지 않아, 한 사람이 같은 순간에 여러 요청을 몰아 보내면 한도를 조금 넘길 수 있습니다.
  사용자가 늘어나면 카운터를 Durable Object 로 바꾸는 것을 권합니다(그때 요청 주세요).
- 공개판 서버는 앱이 실제로 보내는 요청 모양만 통과시킵니다(글·음성 본문과 몇 가지 설정). 나중에 새 AI 기능이
  다른 설정(예: 시스템 지시문)을 쓰게 되면 `workers/kata-public/worker.js` 의 `sanitizeAiBody` 도 같이 고쳐야 합니다.
- Google 로그인 버튼은 지금 글자만 있습니다. Google 의 공식 로그인 버튼 이미지를 넣으려면 Google 브랜딩 안내에서 받은 파일을 쓰세요(제가 로고를 그려 넣지 않았습니다).
