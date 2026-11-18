# 원어민 검수 결과 반영안 (2026-11-19 작성 · 아직 앱에 반영하지 않음)

- 검수: 원어민 1명(2026-11-14, 학습지 "Belajar Bahasa Indonesia" 207문항 모두 답함). 다른 두 분은 답이 오지 않아 **이 한 분의 답으로 검수를 마친다(Arga 결정, 2026-11-19)**.
- 학습지 문항 원본은 claude.ai 아티팩트 "Belajar Bahasa Indonesia"(11/14 판), 답 원문은 claude.ai 대화 "단어장·회화집 검수 정리"에 있다. 이름은 여기 적지 않는다(공개 저장소).
- 기호: A·B = 고른 쪽, AB = 둘 다 자연스러움, W = 자연스러움, K = 어색함. 번호는 학습지 번호(L1 회화 27 · L2 단어·문장 88 · L3 예문 92).
- 위치는 2026-11-19 `main`(`75e1d24`) 기준 파일:줄. 반영할 때 다시 찾는다.
- **회화 문장(인도네시아어)을 바꾸는 장면은 `rev` 를 올린다**(소리 새로 만듦). 단어장 표제어를 바꾸면 `sharedIdMigration.ts` 에 새 판(v5)을 만든다(CLAUDE.md 규칙).

## 한눈에

| 묶음 | 개수 | 처리 |
|---|---|---|
| ① 답대로 바로 고칠 것 | 회화 6(+뜻 1) · 단어장 예문 15 · 뜻 4 · 표기 1 · 화면 2 · 지도 1 | 아래 표대로 |
| ② 고치되 새 문장이 필요한 것 | 4 | 대안 문장은 Claude 가 씀 — 원어민 확인 없음 |
| ③ 정할 것 (규칙과 부딪힘) | 6 | Arga 결정 |
| ④ 그대로 둠 (답이 지금 앱과 같거나 "둘 다 자연스러움") | 나머지 전부 | 3부 예문 92개 중 91개 포함 |

## ① 답대로 바로 고칠 것

### 회화집 (인도네시아어가 바뀌는 장면은 rev +1)

| 번호 | 답 | 파일:줄 | 지금 | 바꿀 것 |
|---|---|---|---|---|
| L1-2 | B | `percakapan/01-dasar.ts:17` | `Senang kenal, Mas Arga.` | `Salam kenal, Mas Arga.` |
| L1-2 | B | `percakapan/01-dasar.ts:18` | `Senang kenal juga. …` | `Salam kenal juga. …` (같은 장면 맞장구) |
| L1-8 | A | `percakapan/15-kantor.ts:128` | `… nggak bisa dilegalisasi.` | `… nggak bisa dilegalisir.` |
| L1-12 | K | `percakapan/05-transportasi.ts:26` | `Tenang, Mbak. Saya hati-hati kok.` / 걱정 마세요. 조심히 갈게요. | `Baik, Mbak.` / 네, 알겠습니다. (검수자 메모: 기사는 "Baik, Pak/Ibu" — 이 장면 손님 호칭 Mbak 에 맞춤) |
| L1-20 | K | `percakapan/04-belanja.ts:21` | `Bayamnya seikat berapa? Seikat juga, ya.` | `Bayamnya seikat berapa? Mau seikat, ya!` (검수자 메모 그대로) |
| L1-24 | B | `percakapan/12-masalah.ts:128` | `… Sudah ketemu sama satpam di lantai dua.` | `… Sudah ditemukan satpam di lantai dua.` |

한국어 뜻만 바꾸는 것(rev 그대로):

| 번호 | 파일:줄 | 지금 | 바꿀 것 | 근거 |
|---|---|---|---|---|
| L1-7 | `percakapan/03-makan.ts:73` | 그리고 마늘·양파는 빼주세요. | 그리고 튀긴 양파(바왕 고렝)는 빼 주세요. | "nggak pakai bawang" 은 보통 bawang goreng 이라는 답 |

### 단어장 예문 (표제어 그대로 — 이전표 필요 없음)

| 번호 | 답 | 파일:줄 | 바꿀 예문 / 예문 뜻 |
|---|---|---|---|
| L2-3 | B | `03 전치사·접속사.csv:94` misalnya | `Indonesia punya banyak buah tropis, misalnya mangga dan durian.` / 인도네시아에는 열대 과일이 많은데, 예를 들면 망고와 두리안이다. |
| L2-10 | B | `09 인지·소통.csv:67` menyadari | `Dia terlambat menyadari kesalahannya.` / 그는 자기 잘못을 늦게 깨달았다. |
| L2-13 | B | `12 평가·정도.csv:28` melulu | `Dia mengeluh melulu tanpa mau berusaha.` / (뜻 그대로) — 메모: melulu 는 동사 뒤 |
| L2-15 | B | `15 신체·건강.csv:75` bernapas | `Dia bernapas lega setelah mendengar kabar itu.` / (뜻 그대로) |
| L2-16 | 메모 | `17 음식·요리.csv:29` mengiris | `Dia mengiris tomat tipis-tipis.` / 그는 토마토를 얇게 썰었다. — 메모: mengiris=얇게 썰기, 잘게는 mencincang |
| L2-17 | B | `18 집·생활용품.csv:2` kamar | `Kamarnya selalu rapi dan bersih.` / 그의 방은 항상 깔끔하고 깨끗하다. |
| L2-21 | B | `24 의료·병원.csv:8` dokter | `Dokter itu melayani pasien dengan penuh kasih dan secara profesional.` / (뜻 그대로) |
| L2-23 | B | `27 사회·경제·뉴스.csv:61` jurnalis | `Jurnalis itu melaporkan langsung dari lokasi bencana.` / (뜻 그대로) |
| L2-25 | B | `29 식물·농업.csv:48` semangka | `Semangka paling segar saat cuaca panas.` / 수박은 더운 날씨에 가장 시원하다. |
| L2-26 | B | `32 장소·여행.csv:23` bioskop | `Kami menonton film di bioskop akhir pekan lalu.` / 우리는 지난 주말에 영화관에서 영화를 봤다. |
| L2-48 | B | `41 설교 표현.csv:10` sola scriptura | `… prinsip Reformasi bahwa …` (대문자 R) |
| L2-52 | 메모 | `10 접사 가족.csv:2` mengajar | `Beliau mengajar matematika di sekolah.` / 그분은 학교에서 수학을 가르친다. — 메모: "Ibu itu"는 격식 없음, beliau 가 낫다 |
| L2-59 | B | `08 행위·조작.csv:93` menekan | `Tekan tombol ini untuk menyalakan mesin.` / 이 버튼을 눌러 기계를 켜세요. |
| L2-62 | K | `02 인칭·지시·의문.csv:95` sana-sini | `Dia mencari kuncinya ke sana-sini.` / (뜻 그대로) — 검수자 메모 그대로 |
| L2-63 | B | `12 평가·정도.csv:51` membedakan | `Sulit membedakan kedua anak kembar itu.` / 그 쌍둥이 두 아이를 구별하기가 어렵다. |

### 단어장 뜻·예문 뜻 (인도네시아어 그대로)

| 번호 | 파일:줄 | 지금 | 바꿀 것 | 근거 |
|---|---|---|---|---|
| L2-14 | `13 빈도·양태.csv:13` mendadak | 그의 갑작스러운 떠남은 … | 그의 갑작스러운 별세는 모든 사람을 놀라게 했다. | 이 문장의 kepergian 은 "세상을 떠남" |
| L2-22 | `25 행정·법률.csv:50` legalisasi | 뜻 "공증/원본 대조 확인", 예문 뜻 "…먼저 공증을 받아야 한다." | 뜻 "원본 대조 확인(발급 기관의 사본 인증)", 예문 뜻 "그의 졸업장은 먼저 학교에서 원본 대조 확인을 받아야 한다." | 졸업장 legalisasi 는 학교·대학에서 |
| L2-47 | `40 교회 직분·사역.csv:64` sidang jemaat | 뜻 "당회/총회", 예문 뜻 "당회에서 건축을 결정했습니다." | 뜻 "교인 총회(공동의회)", 예문 뜻 "교인 총회에서 건축을 결정했다." | 투표권 있는 교인 전체(또는 대표)의 회의 |
| L2-68 | `37 예배·예전.csv:78` Minggu Sengsara | 뜻 "고난 주간의 주일" | 뜻 "사순절 기간의 주일들" (예문 뜻도 맞춰 손봄) | 부활절 앞 한 주일이 아니라 사순절의 여러 주일 |

### 표기·화면·지도

| 번호 | 답 | 위치 | 지금 | 바꿀 것 | 메모 |
|---|---|---|---|---|---|
| L2-53 | B | `32 장소·여행.csv:33` 표제어 | `vihara` / `Vihara itu ramai saat Waisak.` | `wihara` / `Wihara itu ramai saat Waisak.` / 뜻 "위하라 (불교 사원)" | KBBI 도 wihara 가 표준 → 규칙과 같은 방향. **표제어가 바뀌므로 이전표 v5 + `LEGACY_WORD_RENAMES`** |
| L2-87 | B | `src/pages/Index.tsx:1196` 홈 소제목 | `Kenali Indonesia` | `Mengenal Indonesia` | 한국어 "인도네시아 알아가기" 그대로. 좁은 폭(320px) 잘림 다시 확인 |
| L2-88 | W+메모 | `src/pages/Index.tsx:1251` (관리자·Special 만) | `Firman hari ini` | `Firman Hari Ini` | 제목은 낱말 첫 글자를 대문자로 |
| L2-70 | B | `src/lib/mapContent/sulawesi.ts:106~108` 지도 단어 | word `cokelat` / `Pohon cokelat ditanam …` | word `kakao` · 뜻 "카카오" / `Pohon kakao ditanam di perbukitan ini.` | 나무는 kakao 라고 부름 |

## ② 고치되 새 문장이 필요한 것 — Claude 가 쓴 대안 (원어민 확인 없음)

검수자가 지금 예문을 어색하다고 했거나 다른 문장을 골랐지만, 고른 문장에 **표제어가 없어서** 예문으로 쓸 수 없는 경우다. 아래 대안은 Claude 가 썼다. 반영하면 원어민이 보지 않은 문장이 앱에 들어간다.

| 번호 | 위치 | 지금 | 대안 | 이유 |
|---|---|---|---|---|
| L2-1 | `01 인사·기본 표현.csv:7` selamat tinggal | `Selamat tinggal, kami pulang dulu.` | `Selamat tinggal, semoga kita bisa bertemu lagi.` / 안녕히 계세요, 또 만날 수 있기를 바랍니다. | 내일 또 볼 사이에 "Selamat tinggal"은 무겁다 — 오래 헤어질 때 쓰는 문장으로 |
| L2-12 | `11 상태·성질.csv:36` lunak | `Roti ini sangat lunak.` | `Tanah di kebun itu lunak setelah hujan.` / 비가 온 뒤 그 밭의 흙이 물러졌다. (뜻 "부드러운/무른") | 빵은 empuk 이라고 함 |
| L2-18 | `21 취미·운동·여가.csv:25` maraton | `Dia ikut maraton sepuluh kilometer.` | `Dia berhasil menyelesaikan maraton sejauh empat puluh dua kilometer.` / 그는 42킬로미터 마라톤을 완주했다. | 10km 달리기는 maraton 이라 하지 않음 |
| L3-7 | `12 평가·정도.csv:21` lebih-lebih | `Dia tidak suka keramaian, lebih-lebih di tempat tertutup.` | `Saya suka semua buah, lebih-lebih mangga.` / 나는 모든 과일을 좋아하는데, 특히 망고를 좋아한다. | 3부 92개 중 유일하게 "어색" — 뜻이 분명하지 않다는 메모 |

## ③ 정할 것 — 규칙과 부딪힘

| 번호 | 답 | 지금 | 부딪히는 규칙 | 제안 |
|---|---|---|---|---|
| L2-75 | A `resleting` | 표제어 `ritsleting` (`19 옷·외모.csv:54`) | 단어장은 KBBI 표기(DECISIONS 15장 8차) — 11/14 에 resleting → ritsleting 으로 바꿈 | **표제어는 KBBI 그대로, 뜻에 "(흔히 resleting)"** 을 덧붙임 |
| L2-76 | A `stroke` | 표제어 `strok` (`24 의료·병원.csv:57`) | 같음 | 같음 — 뜻에 "(흔히 stroke)" |
| L2-77 | A `orangutan` | 표제어 `orang utan` (`28 동물.csv:33`) | 같음 | 같음 — 뜻에 "(흔히 orangutan)" |
| L2-32 | B `Juruselamat` | 표제어 `juru selamat` (`35 성경 핵심어.csv:86`), 같은 단어장 4행은 이미 `Juruselamat` | 단어장 KBBI(일반 낱말 juru selamat) vs 성경 호칭 | **`Juruselamat` 으로** — 예수님을 가리키는 호칭이라 대문자·붙여 씀(TB 표기와도 같음). 표제어 변경 → 이전표 v5. 공개판에서는 성경 단어장이 숨겨져 있어 관리자판·회원판만 영향 |
| L1-25 | A `12A` | `nomor dua belas A` (`05-transportasi.ts:76`) | 회화 글은 소리 내어 읽는 글이라 숫자를 글자로 적어 둠 | **그대로 둠** 권장 — 숫자로 바꾸면 읽는 소리가 어긋날 수 있음. 한국어 뜻은 이미 "12A" |
| L3-73 | W + 메모 "apapun 붙여 씀" | `apa pun` (`38 교리·신학.csv:66` 예문) | PUEBI·KBBI 는 `apa pun`(띄어 씀)이 표준 | **그대로 둠** — 검수자 메모가 표준 표기와 다름 |

참고(그대로 둠): L3-2 "tujuh belas" 예문 — 글로는 "17 Agustus"가 낫다는 메모. 표제어가 숫자 낱말이라 예문도 글자로 둔다.

## ④ 그대로 두는 것 (요약)

- **회화**: L1-1·6·9·10·11·13·14·15·16·17·18·19·21·22·23 — 답이 지금 앱 문장과 같거나 "둘 다 자연스러움". L1-3(비닐봉지 판매: 도시엔 아직 있음, 2,000~5,000) · L1-4 · L1-5(pusing=두통, 한국어 "머리만 아파요" 맞음) · L1-26/27(호텔 방 번호를 낱자로 읽는 지금 방식이 맞음).
- **단어장**: L2-2·4·5·6·7·8·9·11·19(12년, 이미 반영)·20·24·27~31·33~46·49·50·51·54~58·60·61·64·65·66·67·69·71~74·78~86 — 지금 앱과 같은 쪽, 또는 둘 다 자연스러움, 또는 이미 바뀌어 있음(kecoak·cecak·kelenteng·Injil·memercayai·memercayakan·sakelar·antropologi teologis·kitab kehidupan·milenium·Imanuel·berdukacita).
  - L2-43·65(providensi·omnipresen): "듣는 사람에 맞춰" — 단어장 뜻은 그대로. L2-40(responsorium): 교회마다 다름 — 그대로.
- **3부 예문 92개**: 91개 "자연스러움"(L3-7 만 어색 → ②).

## ⑤ 원어민이 보지 않은 것

- **맛보기 이야기 3편**(`native-check-2026-11-14.md` 9절, `src/data/storySamples.ts`) — 학습지(11/14)보다 뒤(11/16)에 만들어 문항에 없다. 무료 사용자가 처음 보는 이야기라 눈에 띈다.
- ②의 대안 4문장.
- 11/14 이후 새로 들어간 글: 오늘의 카드(서버가 날마다 만들고 Gemini 가 한 번 더 확인).

## 반영 순서 (정해지면)

1. 회화 6줄(+뜻 1줄) — 장면 5개 rev +1.
2. 단어장 예문·뜻(① 표) → `node scripts/check-wordlist.js`(3,555단어·중복 0·형식 오류 0 그대로인지).
3. 표제어 2개(wihara · Juruselamat, ③에서 정하면) → 이전표 v5 + `LEGACY_WORD_RENAMES` + 시험.
4. 홈 소제목·지도 단어.
5. `native-check-2026-11-14.md` 맨 위에 "검수 종료 — 결과는 이 문서" 한 줄.
