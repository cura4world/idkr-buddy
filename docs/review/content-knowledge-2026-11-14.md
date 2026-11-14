> 2026-11-14 출시 전 점검 3차에서 만든 작업 결과표입니다. 요약과 항목별 처리 현황은 `prelaunch-2026-11-13-followup.md`, 원어민 확인 목록은 `native-check-2026-11-14.md` 를 보세요.
> 표 안의 "보류" 가운데 그 뒤 처리한 것이 있습니다(퍼즐 뜻 칸 9줄, 지도 사진 제외 목록, `orang utan` 표기, 표제어 19개의 ID 이전) — 최종 상태는 followup 문서가 기준입니다.

# 출시 전 점검 5-5 · 5-6 처리 결과 (인도네시아 이해 · 오늘의 문장 · 단어 퍼즐 · 지도)

작업일 2026-11-14 · 브랜치 `release/public` · 커밋·push 하지 않음(작업 파일만 고침).
대상 보고서: `prelaunch.md` 1221~1509행.

## 0. 한눈에

| 절 | 번호 붙은 행 | 고친 것 | 보류 | 이미 고침 / 해당 없음 |
|---|---|---|---|---|
| 5-5 이해(공개 화면) 1~26 | 26 | 19 | 2 | 5 |
| 5-5 오늘의 문장 27~30 | 4 | 3 | 1 | 0 |
| 5-5 단어 퍼즐 31~37 | 7 | 0 | 7 | 0 |
| 5-5 staff 전용 화면 38~45 | 8 | 6 | 2 | 0 |
| **5-5 합계** | **45** | **28** | **12** | **5** |
| **5-6 지도 1~60** | **60** | **52** | **3** | **5** |
| **전체** | **105** | **80** | **15** | **10** |

- 고친 파일 18개(코드 17 + JSON 1): `src/pages/InsightReligion.tsx` · `InsightEthnic.tsx` · `InsightHistory.tsx` · `InsightChristian.tsx` · `PhotoCredits.tsx`, `src/lib/peribahasa.ts`, `src/data/phrase-seed.json`, `src/lib/mapData.ts`, `src/lib/mapPhotos.ts`, `src/lib/mapContent/` 원고 파일 9개 전부(`baliNusa` · `jawaBarat` · `jawaTengahTimur` · `kalimantan` · `maluku` · `papua` · `sulawesi` · `sumateraSelatan` · `sumateraUtara`).
- 손대지 않은 파일: `src/data/kataHariIniWords.ts`(동결 목록), `scripts/build-map-photos.mjs`, `.github/`, `src/lib/tts.ts`, `src/components/PlayButton.tsx`, `docs/release/09-qa-report.md`.
- 편집은 모두 Edit 도구로 했고, 고친 파일 18개(코드 17 + JSON 1)의 CR(`\r`)은 0개(파이썬으로 확인), `phrase-seed.json` 은 JSON 으로 다시 읽힘.
- 검증: `npx tsc --noEmit -p tsconfig.app.json` 을 두 번 돌림. ① 작업 중간: 오류 1건 `src/lib/tips.ts(68,12): error TS2304: Cannot find name 'firstEmoji'.` — **내가 고치지 않은 파일**(그때 다른 작업자가 `tips.ts`·`InsightTips.tsx` 를 고치던 중). ② 마지막(모든 편집 뒤): **오류 0, 종료 코드 0**. `npx esbuild` 로 고친 코드 파일 17개 낱개 검사 모두 통과. `npx vitest run src/test/phraseSeed.test.ts src/test/kataHariIni.test.ts` → 30개 통과. `npm run build` 와 vitest 전체는 돌리지 않음(다른 작업자들이 같은 작업 폴더를 고치는 중).
- `src/pages/PhotoCredits.tsx` 에는 내 변경 말고 다른 작업자의 한 줄(원본 링크에 `whitespace-nowrap`)이 함께 들어 있습니다.
- 지도 단어: 277개, 중복 0, 예문에 표제어 없는 것 0 (고친 뒤 파이썬으로 다시 셈). 원고 136곳 그대로.

출처 줄임말: `enwiki:제목` = `https://en.wikipedia.org/wiki/제목`, `idwiki:제목` = `https://id.wikipedia.org/wiki/제목` (모두 위키백과 API 로 본문·원문을 받아 확인). 줄 번호는 **고친 뒤** 파일 기준.

---

## 1. 고친 것

### 5-5 인도네시아 이해 — 공개 화면 (19행)

| 보고서 항목 | 파일:줄 | 이전 | 이후 | 출처 |
|---|---|---|---|---|
| 5-5 #5 | `InsightEthnic.tsx`:179~180 | 파푸아 종족들 `pct: "약 1.5%"`, `bar: 2` | `"약 1.1%"`, `bar: 1` | enwiki:Ethnic_groups_in_Indonesia (2010 센서스 표: Ethnic groups from Papua 2,693,630명 · 1.14%). 2차 출처 → 4절 목록 |
| 5-5 #6 | `InsightReligion.tsx`:189 | 유교 `pct: "약 0.05%"` | `"약 0.03%"` | 종교부 satudata(자료원 Dukcapil) 주별 표를 더한 값: 2022년 유교 74,899명 / 276,534,400명 = 0.027%, 2019~2021도 0.03% — `https://web.archive.org/web/20230709113430/https://satudata.kemenag.go.id/dataset/detail/jumlah-penduduk-menurut-agama` |
| 5-5 #7 | `InsightReligion.tsx`:174 · `InsightEthnic.tsx`:149 | "…마자파힛의 후예들이 발리로 이주하며 형성되었습니다" | "…마자파힛 사람들이 발리로 옮겨 오며 발리 힌두 문화가 이어지고 굳어졌습니다" (종교 화면은 "약 87%가 힌두교도입니다."에서 문장을 끊음) | enwiki:Bali (896·911·914년 비문, 마자파힛의 발리 진출은 1343년), enwiki:Balinese_people (세 차례 이주, 마자파힛 뒤 문화가 다시 짜임) |
| 5-5 #8 | `InsightHistory.tsx`:109 | "1963년 서이리안(파푸아)을 병합했고" | "1963년 유엔 임시 행정기구로부터 서이리안(파푸아)의 행정권을 넘겨받았고(1969년 주민 대표 투표로 귀속 확정)" | enwiki:New_York_Agreement (유엔 행정 1963-05-01 종료), enwiki:Act_of_Free_Choice (1969-07-14~08-02, 대표 1,025명) |
| 5-5 #9 | `InsightHistory.tsx`:85 | "1975년에는 동티모르를 침공해 강제 병합했습니다." | "1975년 12월에는 동티모르에 군을 보냈고, 1976년 27번째 주로 편입했습니다." | enwiki:Indonesian_invasion_of_East_Timor (1975-12-07 시작, 1976-07-17 27번째 주) |
| 5-5 #10 | `InsightHistory.tsx`:240 | "오늘날 '서부는 이슬람, 동부는 기독교'라는 종교 지도의 바탕" | "오늘날 동쪽으로 갈수록 기독교 비율이 높아지는 종교 지도의 바탕" | 단정을 누그러뜨림(의견 항목). 앞서 고친 종교 화면(K-04)과 같은 말 |
| 5-5 #11 | `InsightHistory.tsx`:229 | "15세기 말 … 드막이 마자파힛을 대체했습니다." | "15세기 말 … 드막이 세워졌고, 16세기 초 마자파힛을 대신했습니다." | enwiki:Demak_Sultanate (15세기 마지막 4분기 건국), enwiki:Majapahit (1527년 드막 침공으로 무너짐) |
| 5-5 #12 | `InsightHistory.tsx`:83 | "'아시아의 호랑이'로 불리는 고도성장" | "'아시아의 새끼 호랑이'로 불리는 고도성장" | enwiki:Tiger_Cub_Economies (인도네시아·말레이시아·필리핀·태국·베트남. 네 마리 호랑이는 한국·대만·홍콩·싱가포르) |
| 5-5 #13 | `InsightReligion.tsx`:144 | "NU(나흐다툴 울라마, 약 9천만)와 무함마디야(약 6천만)가" | "NU(나흐다툴 울라마)와 무함마디야가" (숫자 삭제) | enwiki:Nahdlatul_Ulama 는 "2023년 4천만 이상", enwiki:Muhammadiyah 는 "2019년 6천만"·"2008년 2,900만" — 출처마다 크게 달라 숫자를 뺌(검수자 제안의 두 번째 안) |
| 5-5 #17 | `InsightHistory.tsx`:93 | "이후 공산당(PKI)에 책임이 돌려지며 전국적 숙청이 벌어져 약 50만~100만 명이 학살된 것으로 추정됩니다." | "인도네시아 정부는 이 사건을 공산당(PKI)의 쿠데타 시도로 규정했고, 이후 전국적 숙청이 벌어져 약 50만~100만 명이 학살된 것으로 연구자들은 추정합니다." | enwiki:30_September_Movement (군이 PKI 를 주모자로 지목, 정부 공식 서술), enwiki:Indonesian_mass_killings_of_1965–66 ("가장 널리 인용되는 추정 50만~100만") — 92행("좌파 성향 군인들이 … 쿠데타 시도")은 그대로 둠. 6절 "확신하지 못한 것" 참고 |
| 5-5 #18 | `InsightHistory.tsx`:85, 109 | "침공해 강제 병합" / "병합했고" | #9·#8 의 문장으로 함께 바뀜(낱말이 "군을 보냈고 … 편입" / "행정권을 넘겨받았고"가 됨) | #8·#9 와 같은 출처 |
| 5-5 #19 | `InsightEthnic.tsx`:184 | "멜라네시아계 원주민으로, 다른 인도네시아 종족과 인종·문화가 뚜렷이 다릅니다." | "멜라네시아계 원주민으로, 언어와 문화가 매우 다양합니다." | 검수자 제안 그대로(주장 삭제) |
| 5-5 #20 | `InsightEthnic.tsx`:65, 89, 101, 138 | "밝고 개방적인 기질과 …"(순다) / "직설적이고 강인한 기질로 알려져 있습니다."(바탁) / "근면하고 자존심이 강하며, …"(마두라) / "상업 수완이 뛰어나 인도네시아 동부 곳곳에 진출해 있습니다."(부기스) | 기질 서술 4곳 삭제. 부기스는 "인도네시아 동부 곳곳에 이주해 상업에 종사해 왔습니다." | 검수자 제안 그대로(주장 삭제) |
| 5-5 #21 | `InsightReligion.tsx`:143 | "그래서 중동과 달리 토착 문화와 융합된 …" | "그래서 토착 문화와 융합된 …" | 검수자 제안 그대로 |
| 5-5 #22 | `InsightReligion.tsx`:300 | "일부 지역의 교회 설립 제한" | "일부 지역의 예배 장소 건립 허가 문제" | 검수자 제안 그대로(특정 종교 관점을 뺌) |
| 5-5 #23 | `InsightEthnic.tsx`:274~275 | "그래서 '어느 종족인가'를 알면 그 사람의 고향과 신앙 배경까지 짐작할 수 있는 경우가 많습니다." | "이처럼 종족과 종교의 분포가 겹치는 경우가 많습니다." | 검수자 제안 그대로 |
| 5-5 #24 | `InsightEthnic.tsx`:114 | "'른뽕(lenong)'과 오르나멘탈 인형 '온델온델…'" | "'레농(lenong)'과 큰 인형 '온델온델…'" | enwiki:Lenong (브타위 전통 연극), enwiki:Ondel-ondel ("large puppet figure") |
| 5-5 #25 | `InsightEthnic.tsx`:126 | "'나시 파당(rumah makan Padang)' 식당이 이들의 요리입니다." | "'파당 식당(rumah makan Padang)'의 나시 파당(nasi Padang)이 이들의 요리입니다." | 한글과 로마자가 서로 다른 말이던 것을 맞춤 |
| 5-5 #26 | `InsightHistory.tsx`:264 | "보로부두르는 지금도 와이삭…" | "보로부두르에서는 지금도 와이삭…" | 조사 |

### 5-5 오늘의 문장 (3행)

| 보고서 항목 | 파일:줄 | 이전 | 이후 | 출처 |
|---|---|---|---|---|
| 5-5 #27 | `phrase-seed.json`:217 | "…대구 구절이 이어지지만, 보통 앞뒤 두 줄을 함께 말하지만, 앞 구절만…" | "…대구 구절이 이어집니다. 보통 두 줄을 함께 말하지만, 앞 구절만 말해도 뜻이 통합니다." | 문장 오류. `_meta.edits` 에 기록 |
| 5-5 #28 | `phrase-seed.json`:221, 551 | "한국 속담의 '로마에 가면 로마법을 따르라'" / "'침묵은 금이다'라는 한국 속담과 뜻이 완전히 같은" | "한국에서도 쓰는 '로마에 가면 로마법을 따르라'" / "한국에서도 쓰는 '침묵은 금이다'라는 말과 뜻이 같은" | enwiki:When_in_Rome,_do_as_the_Romans_do (성 암브로시우스에게서 온 말), enwiki:Speech_is_silver,_silence_is_golden (아랍 문화에서 비롯, 9세기 기록). `_meta.edits` 에 2건 기록 |
| 5-5 #29 | `peribahasa.ts`:99 · `phrase-seed.json`:748 | "책벌레 → 공부만 파는 사람" | "책벌레 → 책을 아주 좋아하는 사람" | KBBI: *kutu buku* "orang yang senang membaca dan menelaah buku di mana saja" — `https://kbbi.web.id/kutu`. `_meta.edits` 에 기록 |

`_meta.edits` 에 붙인 것 4건(86~105행): Berakit-rakit… `note` / Di mana bumi dipijak… `meaning` / Diam itu emas. `meaning` / Kutu buku `ko`. 모두 "2026-11-14 출시 전 점검 —"으로 시작.

### 5-5 staff 전용 화면 (6행, 모두 `InsightChristian.tsx`)

| 보고서 항목 | 줄 | 이전 | 이후 | 출처 |
|---|---|---|---|---|
| 5-5 #39 | 90 | "파푸아 6개 주의 개신교 비율: … 남서파푸아 62%." (5개만 적음) | "파푸아 6개 주 가운데 다섯 주의 개신교 비율: …(그대로). 남파푸아는 가톨릭이 약 50%로 가장 많습니다(개신교 약 23%)." | enwiki:South_Papua (내무부 2023: 가톨릭 49.62%, 개신교 22.95%) |
| 5-5 #40 | 150 | `m: "주민 90%+"`, `f: "1534년 포르투갈·예수회 유산 · 학교·병원망"` | `m: "주민 약 54%"`, `f: "16세기 포르투갈 도미니코회 선교에서 시작 · 학교·병원망"` | enwiki:East_Nusa_Tenggara (가톨릭 53.73%, 개신교 36.16%), enwiki:Catholic_Church_in_Indonesia (1534년은 포르투갈의 **말루쿠** 도착, 솔로르는 도미니코회, 예수회의 라란투카는 19세기) |
| 5-5 #41 | 129 | "노멘젠대학" | "노멘센대학" (66행 "노멘센"에 맞춤) | 표기 통일 |
| 5-5 #42 | 383 | "무슬림 다수 환경의 소수 교회(서자바 GKP, 발리 GKPB 등)" | "무슬림·힌두 다수 환경의 …" | 같은 파일 152행 "힌두교 환경의 소수 교회" |
| 5-5 #43 | 115 | "1845년부터 라인 선교회가 …" | "1830년대부터 라인 선교회가 …" | enwiki:Christianity_in_Indonesia (1829년 반자르마신·서칼리만탄 방문), enwiki:Evangelical_Church_in_Kalimantan (1838년 응아주·마아냔 다약 선교 시작). 출처마다 1829·1835·1838 로 달라 "1830년대"로 적음 |
| 5-5 #44 | 74 | "북술라웨시 주 인구의 67.3%가 개신교." | "북술라웨시 주 인구의 약 67%가 기독교(개신교 약 63%, 가톨릭 약 4%)." | enwiki:North_Sulawesi (개신교 62.91%, 이슬람 31.84%, 가톨릭 4.45%) |

### 5-6 지도 — 원고 (46행)

| 보고서 항목 | 파일:줄 | 이전 | 이후 | 출처 |
|---|---|---|---|---|
| 5-6 #1 Makassar | `sulawesi.ts`:13 | "그때 항복 문서에 서명하기를 끝까지 거부한 술탄 하사누딘은" | "1667년 조약에 서명하고도 다시 일어나 1669년까지 싸운 술탄 하사누딘은" | enwiki:Hasanuddin_of_Gowa, enwiki:Treaty_of_Bongaya (1667-11-18 서명, 몇 달 뒤 파기, 1669-06-12 함락) |
| 5-6 #2 Bukittinggi | `sumateraUtara.ts`:327 | "1948년 네덜란드가 자카르타를 다시 점령하고" | "1948년 네덜란드가 임시 수도 족자카르타를 점령하고" | enwiki:Emergency_Government_of_the_Republic_of_Indonesia |
| 5-6 #3 Ende | `baliNusa.ts`:275~276 | "집 앞 브링인 나무 아래 앉아" / "나무는 아직 그 자리에 있습니다" | "빵나무 아래 앉아" / "그 나무가 있던 자리는 공원이 되었습니다" | idwiki:Pohon_Sukun_Bung_Karno_di_Ende (빵나무, 타만 르눙안 붕 카르노 공원 안), idwiki:Museum_Situs_Bung_Karno. **"1980년쯤 다시 심었다"는 내 출처로 확인하지 못해 쓰지 않음** |
| 5-6 #4 Tanjung Selor | `kalimantan.ts`:213, 226~227 | "…갈라져 나온, 인도네시아에서 가장 젊은 주입니다." / `Ini provinsi termuda di Indonesia.` "이곳은 … 가장 젊은 주입니다." | "…갈라져 나온 주로, 2022년 파푸아에 새 주들이 생기기 전까지는 인도네시아에서 가장 젊은 주였습니다." / `Kalimantan Utara pernah menjadi provinsi termuda di Indonesia.` "북칼리만탄은 한때 인도네시아에서 가장 젊은 주였습니다." | enwiki:North_Kalimantan (2012-10-25), enwiki:South_Papua (2022-07-25). **검수자 제안과 다르게 함** — 표제어 `provinsi termuda` 는 두고 문장을 참이 되게 고침(6절) |
| 5-6 #5 Ambon | `maluku.ts`:57 | "페라 사니리라는 오래된 관습" | "펠라라는 오래된 관습" | idwiki:Pela (기독교 마을과 이슬람 마을을 잇기도 하는 동맹). "간동"은 붙이지 않음 — 출처의 표제는 pela |
| 5-6 #6 Pematangsiantar | `sumateraUtara.ts`:192 | "1960년대 일본제 삼륜 오토바이를 개조한" | "1940~50년대 영국제 BSA 오토바이를 개조한" | idwiki:Kota_Pematangsiantar (BSA 500cc, 영국제 옛 모델), idwiki:Becak_mesin (1940·50년대, 검색 요약으로 확인) |
| 5-6 #7 Pulau Sumba | `baliNusa.ts`:320 | "해마다 건기가 끝날 무렵 파솔라가" | "해마다 2~3월 우기에 파솔라가" | enwiki:Pasola (2~3월 4주), enwiki:Sumba (건기 5~11월, 우기 12~4월) |
| 5-6 #8 Labuan Bajo | `baliNusa.ts`:231 | "파당 섬의 풍경" | "파다르 섬의 풍경" | enwiki:Padar,_Indonesia |
| 5-6 #9 Timika | `papua.ts`:107 | "아뭉메와 코모로 사람들" | "아뭉메와 카모로 사람들" | idwiki:Suku_Kamoro |
| 5-6 #10 Derawan | `kalimantan.ts`:259 | "카칵반이라는 섬" | "카카반이라는 섬" | enwiki:Kakaban |
| 5-6 #11 Danau Toba | `sumateraUtara.ts`:121 | "동남아에서 가장 큰 호수이고" | "세계에서 가장 큰 화산 호수이고" | enwiki:Lake_Toba ("largest lake in Indonesia and the largest volcanic lake in the world"), enwiki:Tonlé_Sap (동남아 최대 담수호) |
| 5-6 #12 Jambi | `sumateraSelatan.ts`:80 | "강 상류에는 벽돌 사원이" | "강 하류에는 벽돌 사원이" | idwiki:Kompleks_Candi_Muaro_Jambi (바탕하리 강가, 시에서 동쪽 약 26km) |
| 5-6 #13 Bengkulu `bendera` | `sumateraSelatan.ts`:130~131 | `Bendera pertama dijahit dengan tangan di kota ini.` "첫 국기는 이 도시에서 손으로 꿰매졌습니다." | `Bendera pertama dijahit dengan tangan oleh Fatmawati.` "첫 국기는 파트마와티가 손으로 꿰맸습니다." | enwiki:Fatmawati, idwiki:Bendera_Pusaka (파트마와티가 꿰맴. 1943년 결혼 뒤 자카르타 거주) |
| 5-6 #14 Serang | `jawaBarat.ts`:205 | "북쪽 칠레곤 일대에는" | "북서쪽 칠레곤 일대에는" | enwiki:Serang (6°7′S 106°9′E), enwiki:Cilegon (6.003°S 106.011°E) → 북으로 약 13km, 서로 약 15km. **검수자 "서쪽" 대신 좌표대로 "북서쪽"** |
| 5-6 #15 Bandar Lampung | `sumateraSelatan.ts`:190 | "차와 사람이 모두 이 도시의 항구를 지납니다. 밤이면 대형 여객선이 줄지어 해협을 건넙니다." | "차와 사람이 이 도시를 거쳐 바카우헤니 항구로 갑니다. 밤이면 그 항구에서 대형 여객선이 줄지어 해협을 건넙니다." | idwiki:Pelabuhan_Bakauheni (남람풍 군 바카우헤니 면), enwiki:Port_of_Bakauheni. 방향("남쪽")과 거리는 확인하지 않아 적지 않음 |
| 5-6 #16 Gunung Leuser | `sumateraUtara.ts`:79 | "세계자연유산으로 지정하면서 동시에 위험에 처한 유산 목록에도 올렸습니다" | "2004년 이 숲을 세계자연유산으로 지정했고, 2011년에는 위험에 처한 유산 목록에도 올렸습니다" | enwiki:Tropical_Rainforest_Heritage_of_Sumatra |
| 5-6 #17 Gorontalo | `sulawesi.ts`:192 | "호수에는 물이 줄면 드러나는 옛 요새 터가 있어" | "호수를 내려다보는 언덕에는 옛 요새가 있어" | enwiki:Otanaha_Fortress (듬베 언덕 위, 림보토 호수가 내려다보임) |
| 5-6 #18 Sawahlunto | `sumateraUtara.ts`:369 | "1880년대 네덜란드가 이곳에서 질 좋은 석탄을 발견하고 광산을 열었고" | "1860년대 후반 네덜란드가 이곳에서 질 좋은 석탄을 발견했고 1890년대 초 광산을 열었으며" | idwiki:Kota_Sawahlunto (더 흐레버 조사 1867년, 생산 1892년부터, 철도 1894년). enwiki:Sawahlunto 는 "19세기 중반 발견" — 발견 연도가 1867/1868 로 갈려 "1860년대 후반"으로 적음 |
| 5-6 #19 Bogor | `jawaBarat.ts`:34, 46~47 | "87헥타르에 만 종이 넘는 식물" / `lebih dari sepuluh ribu jenis tanaman` "만 종이 넘는" | "87헥타르에 3천여 종, 만 그루가 넘는 식물" / `lebih dari tiga ribu jenis tanaman` "3천 종이 넘는" | enwiki:Bogor_Botanical_Gardens (87ha, 13,983점 · 3,373종). 2차 출처 → 4절 목록 |
| 5-6 #20 Pangkalpinang | `sumateraSelatan.ts`:213 | "…이슬람 모스크와 중국 사원, 성당과 힌두 사원이 한 구역에 모여 있는 광장을 가지고 있습니다. 다른 종교의 건물을 나란히 세워 두고 오간다는 점에서 인도네시아에서도 자주 언급되는 곳입니다." | "그래서 이 도시에는 모스크와 교회, 중국계 사원과 불교 사원이 함께 있습니다." | idwiki:Kota_Pangkalpinang (예배 장소 목록만 있음: 모스크·개신교회·성당·비하라·푸라). **네 건물이 모인 광장은 찾지 못해 그 주장을 뺌** |
| 5-6 #21 Nusa Penida | `baliNusa.ts`:78 | "티라스만가 절벽과 클링킹 해변의 풍경이" | "클링킹 해변의 절벽 풍경이" | enwiki:Nusa_Penida 관광지 목록(Kelingking·Broken Beach·Angel Billabong·Crystal Bay·Atuh·Diamond …)에 맞는 이름이 없어 뺌 |
| 5-6 #22 Kupang | `baliNusa.ts`:392 | "인도네시아에서 기독교인 비율이 가장 높은 주" | "인도네시아에서 기독교인 비율이 아주 높은 주" | enwiki:East_Nusa_Tenggara (가톨릭 53.73 + 개신교 36.16 = 약 90%), enwiki:Highland_Papua (2022: 개신교 90.45 + 가톨릭 7.50 = 약 98%) |
| 5-6 #23 Soe (staff) | `baliNusa.ts`:411 | "둥근 벌집 모양의 흙집에서 불을 피워 겨울을 납니다" | "풀로 지붕을 덮은 둥근 집에서 불을 피워 추운 철을 납니다" | idwiki:Ume_Kbubu (둥근 집, 원뿔 지붕을 띠풀로 덮음, 벽은 대나무) |
| 5-6 #24 Kampung Naga | `jawaBarat.ts`:335 | (같은 원고 안) "야자 잎으로 지붕을" ↔ "볏짚 지붕에 불이 날까" | 뒤쪽을 "야자 잎 지붕에 불이 날까"로 맞춤 | idwiki:Kampung_Naga ("atap rumah harus dari daun nipah, ijuk, atau alang-alang") |
| 5-6 #25 Kudus | `jawaTengahTimur.ts`:274 | "인도네시아에서 유일하게 아랍어 지명을 가진 도시로" | "자바에서 드물게 아랍어에서 온 이름을 가진 도시로" | enwiki:Kudus_Regency ("the only place in Java …") ↔ idwiki:Kabupaten_Kudus ("Kudus bukan satu-satunya … di Tanah Jawa") — 두 출처가 엇갈려 "유일"을 "드물게"로 더 누그러뜨림 |
| 5-6 #26 Bengkulu | `sumateraSelatan.ts`:123 | "네덜란드에 넘기고 싱가포르를 받았습니다" | "네덜란드에 넘기고 말라카를 받았으며, 싱가포르에 대한 권리도 인정받았습니다" | enwiki:Anglo-Dutch_Treaty_of_1824 |
| 5-6 #27 Dieng | `jawaTengahTimur.ts`:34 | "이름은 산스크리트어로 신들이 사는 곳" | "이름은 옛 자바어로 신들이 사는 곳" | enwiki:Dieng_Plateau, idwiki:Dataran_tinggi_Dieng (bahasa Jawa kuno: di + hyang) |
| 5-6 #28 Medan | `sumateraUtara.ts`:101 | "영국 식민지 시절 실려 온 인도계" | "네덜란드 식민지 시절 농원 일꾼으로 건너온 인도계" | enwiki:Indian_Indonesians (1830년대부터 네덜란드가 농원 노동력으로 타밀인을 데려옴) |
| 5-6 #29 Banyuwangi | `jawaTengahTimur.ts`:560 | "배를 타면 30분 만에 발리에 닿기 때문에" | "배를 타면 한 시간쯤이면 발리에 닿기 때문에" | idwiki:Pelabuhan_Ketapang ("sekitar 1 jam") |
| 5-6 #30 Kepulauan Banda | `maluku.ts`:35 | "20세기 초 네덜란드가 … 유배 보냈고" | "1930년대 네덜란드가 … 유배 보냈고" | enwiki:Mohammad_Hatta (1936-01 반다네이라로 옮겨짐, 1942-02 수카부미로) |
| 5-6 #40 Muntilan (staff) | `jawaTengahTimur.ts`:121 | "무틸란의 학교에서는" | "문틸란의 학교에서는" | 핀 이름(mapData.ts:140) |
| 5-6 #42 Bukit Lawang | `sumateraUtara.ts`:236 | "보호 강가에 있는" | "보호록 강가에 있는" | idwiki:Bukit_Lawang (Kecamatan Bohorok). enwiki 는 "Bahorok River" — 두 표기가 함께 쓰임 |
| 5-6 #43 만타가리 3곳 | `baliNusa.ts`:78, 231 · `papua.ts`:13 | "만타가리" | "만타가오리" | 한국어 오타 |
| 5-6 #44 Pulau Nias | `sumateraUtara.ts`:257~258, 268~271 | 3문단 "19세기 말 독일 선교사들이 … 1916년 무렵 … 큰 회개 운동 … 손꼽히는 규모입니다." / 단어 `kebangunan rohani`(영적 각성, 부흥) | 그 문단을 빼고 첫 문단 끝에 "지금 주민 대부분은 개신교인입니다." 한 문장만 둠 / 단어 `rumah adat`(전통 가옥) `Rumah adat di pulau ini dibangun tanpa paku.` "이 섬의 전통 가옥은 못 없이 지어졌습니다." | 공개판 종교 균형 결정. 새 예문은 원고 2문단("못 하나 없이 짜맞춰져")에서 가져옴 |
| 5-6 #45 Kupang | `baliNusa.ts`:392, 395~398 | 3문단 "1965년 이후 이 지역에서는 교회가 빠르게 자랐습니다. … 개신교 대학과 신학교가 있어 … 주일 아침이면 도시의 길이 예배당으로 향하는 사람들로 붐빕니다." / 단어 `jemaat`(교인, 회중) | "동누사틍가라는 인도네시아에서 기독교인 비율이 아주 높은 주입니다. 쿠팡에는 대학이 여럿 있어 티모르·로테·사부·숨바에서 학생이 모입니다." / 단어 `kering`(마른, 건조한) `Tanah di pulau ini kering dan air sulit didapat.` "이 섬의 땅은 메마르고 물을 구하기 어렵습니다." | 공개판 종교 균형 결정. 새 예문은 원고 1문단("건조한 땅 … 물이 늘 모자랍니다")에서 가져옴 |
| 5-6 #46 Manokwari | `papua.ts`:57, 61~64 | 2문단 "인도네시아 사람들은 이 도시를 복음의 도시라 부릅니다. 1855년 두 독일인 선교사가 … 그 시작에서 이어진 흐름입니다." / 단어 `Injil`(복음) | "1855년 파푸아에 온 첫 선교사들이 이 앞바다의 작은 섬에 내렸기 때문에, 인도네시아 사람들은 이 도시를 복음의 도시라 부릅니다." (별명 소개 한 문장) / 단어 `teluk`(만, 바다가 뭍으로 들어온 곳) `Kota ini menghadap teluk yang tenang.` "이 도시는 잔잔한 만을 마주하고 있습니다." | 공개판 종교 균형 결정. 새 예문은 원고 1문단("앞으로는 잔잔한 만이")에서 가져옴 |
| 5-6 #47 Jayapura | `papua.ts`:219, 229, 231 | "주일 아침이면 언덕마다 찬송이 울리고" / 뜻 "찬송, 노래" / "언덕 위 교회에서 찬송이 들립니다." | "일요일 아침이면 언덕마다 노랫소리가 울리고" / 뜻 "노래" / "언덕 위 교회에서 노랫소리가 들립니다." (인니어 예문은 그대로) | 검수자 제안 그대로 |
| 5-6 #48 Pematangsiantar | `sumateraUtara.ts`:203~206 | 단어 `pendeta`(목사) `Banyak pendeta berasal dari kota ini.` | 단어 `sekolah`(학교) `Banyak sekolah didirikan di kota ini sejak dulu.` "이 도시에는 예부터 학교가 많이 세워졌습니다." (설명 문단은 그대로) | 검수자 제안(`sekolah`). 새 예문은 원고("교회와 학교가 일찍 세워져")에서 가져옴 |
| 5-6 #49 `kuningan` 예문 | `jawaTengahTimur.ts`:309 | `Pengrajin kuningan …` | `Perajin kuningan …` | KBBI: *pengrajin* → *perajin* — `https://kbbi.web.id/rajin`, `https://id.wiktionary.org/wiki/perajin` (KBBI VI 인용) |
| 5-6 #53 `cokelat` 예문 | `sulawesi.ts`:108~109 | `Biji cokelat ditanam di perbukitan ini.` "카카오 열매가 …" | `Pohon cokelat ditanam di perbukitan ini.` "카카오나무가 이 언덕에서 재배됩니다." | 검수자 제안 `Pohon kakao …` 는 표제어 `cokelat` 이 예문에서 빠져 "예문에 표제어 없는 것 0" 원칙이 깨짐 → `Pohon cokelat` 으로 함 |
| 5-6 #54 Labuan Bajo | `baliNusa.ts`:232 | "배 삯과 땅값이" | "뱃삯과 땅값이" | 맞춤법 |
| 5-6 #55 Mentawai | `sumateraUtara.ts`:280 | "시카레이라 부르는 이들" | "시케레이라 부르는 이들" | enwiki:Mentawai_people (Sikerei) |
| 5-6 #56 Tanjungpinang | `sumateraSelatan.ts`:57 | "프냥앗 섬" | "프녱앗 섬" | idwiki:Pulau_Penyengat |
| 5-6 #58 Leuser 표기 | `sumateraUtara.ts`:215, 236 | "르우서 국립공원" (2곳) | "르우세르 국립공원" (핀 이름 mapData.ts:120 에 맞춤) | 표기 통일 |
| 5-6 #59 Tanjung Selor | `kalimantan.ts`:215 | "불란 사람들의 마을" | "불룽안 사람들의 마을" | enwiki:Sultanate_of_Bulungan, enwiki:Bulungan_Regency (탄중 슬로르가 군청 소재지) |
| 5-6 #60 Mansinam (staff) | `papua.ts`:79 | "독일인 오테와 가이슬러" | "독일인 오토와 가이슬러" | idwiki:Pulau_Mansinam (Ottow dan Geissler) |

### 5-6 지도 — 핀·사진·코드 (6행)

| 보고서 항목 | 파일:줄 | 이전 | 이후 | 출처·근거 |
|---|---|---|---|---|
| 5-6 #36 Pura Besakih | `mapPhotos.ts` Pura Besakih | 사진 2장 | `Presiden Jokowi Didampingi Gubernur Koster di Pura Besakih untuk peresmian.jpg` 뺌(1장 남음) | Commons 설명: 작가 Bali Post, 출처 balipost.com 기사, CC0 표기 — 신문사 사진의 CC0 는 믿기 어렵고 인물 사진 |
| 5-6 #37 옛 기록 그림 | `mapPhotos.ts` 9곳 | 화면에 나오던 옛 그림 11장 | 뺌: Banjarmasin 1 · Banten Lama 1 · Bima 1 · Bogor 1 · Kepulauan Banda 2 · Krakatau 1 · Palembang 1 · Purwokerto 2 · Tarakan 1 (Probolinggo 는 앞 단계에서 이미 뺌) | Commons 설명으로 하나씩 확인: 1941~42 침공 지도(1982년 간행), "Colonial era sketch"(19세기 석판화), 1900년대 술탄·병사 사진, Resident Office Buitenzorg, 1724~26·1824 그림, 1808년 간행 판화, 1659년 팔렘방 정복도(17세기 VOC), 1947·1931 광장, 1945 상륙. **Palembang 은 검수자가 "의견"으로 둔 것 — 17세기 VOC 정복 그림이라 뺌** |
| 5-6 #38 인물 초상 | `mapPhotos.ts` 5곳 | 인물 사진 5장 | 뺌: Binjai 1(시장) · Kediri 1(시장) · Mamuju 1(군수) · Manokwari 1(옛 군수) · Tanjungpinang 1(시의원). Bima·Pura Besakih 는 #37·#36 에서, Probolinggo 는 앞 단계에서 뺌 | Commons 설명: "Mayor of Kediri …", "Mamuju Regent …", "Bupati Manokwari … 1989-1995" 등 |
| 5-6 #39 Takengon | `mapData.ts`:159 | `"ko":"타큉온"` | `"ko":"타켕온"` | 한글 표기 |
| 5-6 #41 사진 출처 화면 | `PhotoCredits.tsx`:11, 43~58, 71~72 | `buildGroups()` 가 staff 핀을 거르지 않음 | `usePlan()` 의 `staff` 를 받아 `staff:true` 핀을 staff 가 아닌 사람에게는 뺌(`buildGroups(staff)`) | IndoMap.tsx:210 `pinShown` 과 같은 기준. tsc·esbuild 통과. **폰 확인 필요** |
| 5-6 #57 반튼/반텐 | `mapData.ts`:41 | 세랑 힌트 "반튼 주도" | "반텐 주도" (원고·다른 핀과 통일) | 표기 통일 |

사진을 뺀 결과(파이썬으로 HEAD 와 대조): 목록 169장 → 152장, 화면 표시 **119장·84곳 → 102장·73곳**. 사진이 하나도 안 나오게 된 곳 11곳: Banjarmasin, Banten Lama, Bima, Binjai, Bogor, Kepulauan Banda, Krakatau, Palembang, Purwokerto, Tanjungpinang, Tarakan. (HANDOFF·문서의 "85곳·120장"은 옛 값이 됨.)

---

## 2. 고치지 않은 것 (보류)

| 항목 | 파일:줄 | 검수자 제안 | 보류 이유 |
|---|---|---|---|
| 5-5 #14 종교 비율 각주 | `InsightReligion.tsx`:307 "※ 비율은 2023~2024년 인도네시아 종교부 통계 기준입니다." | 실제 쓴 출처(내무부 주민등록 통계 2023)로 | 종교부 satudata 가 싣는 표의 자료원이 내무부 Dukcapil 이라 "종교부 통계"가 틀렸다고 단정할 수 없음(위 #6 의 주소, 표 머리에 "Sumber Data : Dukcapil"). 화면의 87.1·7.4·3.1·1.7·0.7 이 **몇 년 값인지는 원표로 확인하지 못함**(보관본은 2022년까지: 87.40·7.47·3.07·1.70·0.73). #6 을 0.03 으로 고쳐 "기준 연도가 섞인" 문제는 사라짐. 바꾼다면 "종교부가 공개한 주민등록 통계(내무부 집계)" 정도 — 연도는 소유자 확인 필요 |
| 5-5 #16 QA 문서의 "역사 서술 3곳뿐" | `docs/release/09-qa-report.md`:68 | 실제 수로 고침 | 내 담당 파일 밖(문서). 이번 수정으로 줄 수가 또 바뀜(종교 화면 "교회 설립 제한"이 빠짐 등) → 모든 수정이 끝난 뒤 한 번에 다시 세어 고쳐야 함 |
| 5-5 #30 `di mall` | `phrase-seed.json`:256 | `di mal` | 의견 항목. 검수자 스스로 `REVIEW-2026-11.md` 의 생활 표기 전례(flashdisk)면 그대로 둘 수 있다고 적음 → 표기 원칙 결정 필요 |
| 5-5 #31 karet·rawan·telat 뜻 잘림 | `kataHariIniWords.ts`:108, 260, 439 | "고무" / "(사고·재해가) 잦은" / "늦은 (구어)" | **보류(동결 목록)** — 지시대로 파일을 건드리지 않음. 뜻이 괄호가 닫히지 않은 채 힌트·결과에 나옴(2027-01-29, 06-30, 12-26) |
| 5-5 #32 tidak "아니오" | `kataHariIniWords.ts`:82 | "아니요" | 보류(동결 목록) |
| 5-5 #33 bunga "이자 (금융)" | `kataHariIniWords.ts`:155 | "꽃; 이자" | 보류(동결 목록) |
| 5-5 #34 kakak "형" | `kataHariIniWords.ts`:175 | "형·오빠·누나·언니" | 보류(동결 목록) |
| 5-5 #35 cabut | `kataHariIniWords.ts`:419 | "뽑다; (은어) 자리를 뜨다" | 보류(동결 목록) |
| 5-5 #36 kasir·virus | `kataHariIniWords.ts`:44, 391 | "계산대·계산원" / "바이러스" | 보류(동결 목록) |
| 5-5 #37 QA 문서의 482·469 | `docs/release/09-qa-report.md`:91 | 459 · `mod 459` · 492 | 내 담당 파일 밖(문서). 실제 값은 확인함: 정답 459줄(`kataHariIniWords.ts`), 추측 492개(`kataHariIniGuesses.ts`), 합 951 |
| 5-5 #38 Mazmur 46:2 (staff) | `peribahasa.ts`:119 | 자료 기준 `verse: 1`, 표시 번호는 결정 | 검수자도 "표시 유지 여부 결정"이라 적은 판단 항목. `verse` 만 1 로 바꾸면 한국어 본문(46:1)과 어긋날 수 있고, 한국어 본문은 기기에만 있어 확인 못 함 |
| 5-5 #45 "아시아에서 필리핀·중국 다음 세 번째" (staff) | `InsightChristian.tsx`:248 | 인도 포함 여부 확인 | enwiki:Christianity_in_Asia 본문에 나라별 순위 숫자가 없어 확인 못 함 → 숫자·순위는 바꾸지 않음 |
| 5-6 #50 `cengkeh` | `maluku.ts`:16, 18 | `cengkih` | 검수자가 "공용 단어장(`29 식물·농업.csv`:40)과 함께 정할 것"이라 적음. 표제어를 바꾸는 일이고 단어장은 내 담당 밖 → 표기 원칙(KBBI 표준형 ↔ 생활 표기) 결정 필요 |
| 5-6 #51 `vihara` | `kalimantan.ts`:39, 41 · `baliNusa.ts`:485 | `wihara` | 위와 같음(`32 장소·여행.csv`:33). 종단·관공서는 vihara 를 씀 |
| 5-6 #52 `orangutan` | `sumateraUtara.ts`:241, 243 · `kalimantan.ts`:92 | `orang utan` | 위와 같음(`28 동물.csv`:33) |

**동결 목록에 대해 알릴 것**: `kataHariIniWords.ts` 20행 머리말에 "뜻(두 번째 칸)은 고쳐도 됩니다. 단어(첫 번째 칸)는 고치지 않습니다."라고 적혀 있습니다. #31~#36 은 모두 뜻 칸이고 낱말·순서·줄 수는 그대로이므로, 소유자가 허락하면 위 제안 문구 10개를 그대로 넣을 수 있습니다(`src/test/kataHariIni.test.ts` 는 낱말만 검사).

### 번호 없는 "판단 필요" 항목 — 손대지 않음

**5-5 (이해·문장·퍼즐)**
- 속담 형태(원어민 확인): `peribahasa.ts` 68 *Sedikit-sedikit…*, 81 *Ringan sama dijinjing…*(순서), 80 *Seperti katak dalam tempurung*, 76 *Habis gelap terbitlah terang*(카르티니 서간집 제목에서 온 말), 69 *Air tenang menghanyutkan* 의 한국어 "배를". `phrase-seed.json` 의 "Kerja sama dia cuma bikin makan hati terus." 예문.
- 인니어 철자: `InsightEthnic.tsx`:102 karapan sapi(kerapan), `Insight.tsx`:151·`InsightTips.tsx`:155 Tips(tip), 정답 낱말 sirup·kecoa.
- 퍼즐 정답의 성격: (구어)·(은어) 꼬리표가 남은 정답 8개(kalau·keren·bakal·kabur·payah·cabut·telat·betul), janda·bajaj.
- 이해 화면: 주요 종족 12개 선정 기준, 말레이족 3.7%(연구자 재분류 값), '자바 이슬람(kejawen)', "무신론은 인정하지 않습니다", 신수도 이전 "진행 중", `InsightOverview.tsx` 연도 없는 숫자와 각주 출처, "약 17,000여 개", "350년 네덜란드 지배", "화교 차별을 철폐", "수퍼스마르", 말루쿠·포소 분쟁 언급 없음, `tips.ts`:53 프롬프트 말투.
- 그 밖: "Cepat O/X" 표기, 된소리·거센소리 표기 혼용.

**5-6 (지도)**
- 사진: 사람이 주인공인 민족지 사진(Agats `Asmat Tribesman`, Lembah Baliem `Kurulu Village War Chief`·`Yali man`, Baduy `Baduy children`), 지점을 잘 보여 주지 않는 사진(Batam 버스 안·호텔, Depok 번호표 기계, Ende 비행기, Sorong·Manokwari 쇼핑몰, Banyuwangi 과자, Padang 자전거 대회, 공항 사진 4곳), "Unknown author Unknown author" 표기(이제 화면에 나오는 것은 없음 — 남은 것은 모두 걸러지는 기록 사진. "(작가 표시 없음)"으로 화면에 나오는 것은 Gili Trawangan 2장으로 둘 다 퍼블릭 도메인), 사진 없는 공개 핀.
- 표기 원칙: 된소리 섞임, `mapData.ts`:162 "텅아난", Gili Trawangan ↔ "길리 제도", 소롱·메라우케 힌트의 "주도", `mapData.ts`:120 "오랑우탄의 마지막 서식지".
- 사실(작게 어긋남): Banda Aceh 이슬람법 순서, Saparua 지폐, Balikpapan 첫 유정, Bengkulu "18세기", Makassar 피니시, Nusantara 시점, Takengon 전설 출처.
- 핀 위치: Kawah Ijen(약 30km 남쪽에 찍힘), Kuta(바다에 찍힘).
- 민감 서술·교회가 사실 설명으로 나오는 핀(Manado "네덜란드 선교를 받아들이면서 …" 포함), 공개 핀의 종교 어휘 수 — 이번 수정 뒤 기독교 어휘 표제어는 6개 → **2개**(`nyanyian`(뜻을 "노래"로), `menara lonceng`)로 줄었음.
- 원어민 확인(검수자 1차 의견): `baliNusa.ts`:440 `air pohon lontar`, `sumateraSelatan.ts`:180 `dikukus`, 174 `Cina`.

---

## 3. 이미 고침 / 해당 없음

| 항목 | 상태 | 확인한 것 |
|---|---|---|
| 5-5 #1 말루쿠 개념도·문장 | 이미 고침 | `InsightReligion.tsx`:76~78 `rel: "mixed"`, 276~279·290~291 문장 |
| 5-5 #2 동누사틍가라 가톨릭 비율 | 이미 고침 | `InsightReligion.tsx`:165 "약 90%가 기독교(가톨릭 약 54%, 개신교 약 36%)" |
| 5-5 #3 누사틍가라 개념도 | 이미 고침 | `InsightReligion.tsx`:71~73 `rel: "mixed"` |
| 5-5 #4 임렉 국경일 | 이미 고침 | `InsightReligion.tsx`:193 |
| 5-5 #15 '인도네시아 기독교' 페이지 안내 | 이미 고침 | `InsightReligion.tsx`:155~156 `staffNote`, 202·265 `showChristianLink` |
| 5-6 #31 Pulau Sumba 사진 | 이미 고침 | `mapPhotos.ts` Pulau Sumba = `Kampung Adat Ratenggaro - Sumba.jpg` |
| 5-6 #32 Jambi `Bob-Kerrey-Pedestrian-Bridge.jpg` | **해당 없음(확인)** | Commons 설명 "jembatan gentala arasy", 2017-01-20, 작가 Novrialdi D Putra(같은 지점의 `Kota jambi.jpg` 와 같은 작가) → 잠비의 근탈라 아라시 보행교 사진에 파일 이름만 잘못 붙은 것. 빼지 않음. 그림 자체는 내려받아 보지 않음 — `https://commons.wikimedia.org/wiki/File:Bob-Kerrey-Pedestrian-Bridge.jpg` |
| 5-6 #33 Maumere 작가 | 이미 고침 | author "Snpoj (영어 위키백과)" |
| 5-6 #34 Probolinggo 초상 | 이미 고침 | 초상 없음(남은 한 장은 걸러지는 기록 사진) |
| 5-6 #35 Padang·Sawahlunto 작가 | 이미 고침 | "Ikhvan (Flickr)", 스크립트 `AUTHOR_FIX` 에 "Mighty Bowo (Flickr)" |

---

## 4. 통계 원표 대조가 필요한 수치

검수자 기억이나 위키백과(2차 출처)에서 온 숫자입니다. 화면에 들어갔으므로 소유자가 원표(BPS·Dukcapil·공식 자료)와 한 번 맞춰 보아야 합니다.

1. **파푸아 종족 약 1.1%** (`InsightEthnic.tsx`:179) — 영어 위키백과의 2010 센서스 표 값(2,693,630명·1.14%). BPS 2010 센서스 원표 미확인.
2. **유교 약 0.03%** (`InsightReligion.tsx`:189) — 종교부 satudata 보관본(자료원 Dukcapil)의 2022년 주별 표를 내가 더한 값(74,899 / 276,534,400). 2023년 값 자체는 못 봄.
3. **종교 비율 87.1·7.4·3.1·1.7·0.7 과 각주의 연도** (`InsightReligion.tsx`:138~181, 307) — 고치지 않음. 보관본 2022년은 87.40·7.47·3.07·1.70·0.73, 영어 위키백과는 지금 2025년 내무부 값 87.15·7.37·3.07·1.66·0.75 를 씀. 화면 값이 어느 해인지 원표 확인 필요.
4. **동누사틍가라 가톨릭 약 54%·개신교 약 36%** (`InsightReligion.tsx`:165 — 앞 단계, `InsightChristian.tsx`:150 — 이번) — 위키백과 53.73·36.16(종교부 satudata 인용), 검수자 53.98·36.23(2024).
5. **북술라웨시 기독교 약 67%(개신교 약 63%, 가톨릭 약 4%)** (`InsightChristian.tsx`:74, staff) — 위키백과 62.91·4.45.
6. **남파푸아 가톨릭 약 50%·개신교 약 23%** (`InsightChristian.tsx`:90, staff) — 위키백과(내무부 2023) 49.62·22.95, 정보상자는 49.93·22.61.
7. **`InsightChristian.tsx`:90 의 나머지 다섯 주 "개신교 비율"** (고치지 않음) — 고지파푸아 98%는 위키백과로는 개신교 90.45 + 가톨릭 7.50 = **기독교 합계**로 보임. 중앙파푸아 88·파푸아 70·서파푸아 69·남서파푸아 62 도 개신교만인지 합계인지 확인 필요. 같은 파일 99행 "90% 이상이 기독교(대부분 가톨릭)", 63·97행 `b: "90%+"` 도 같이 볼 것.
8. **보고르 식물원 "3천여 종, 만 그루가 넘는"** (`jawaBarat.ts`:34, 46~47) — 위키백과 13,983점·3,373종. 식물원(BRIN) 공식 수치 미확인.
9. **NU·무함마디야 회원 수** — 숫자를 뺌. 다시 넣으려면 출처·연도를 함께 적어야 함(위키백과: NU "2023년 4천만 이상", 무함마디야 "2019년 6천만").
10. **9·30 사건 희생자 "약 50만~100만"** (`InsightHistory.tsx`:93) — 숫자는 그대로 두고 "연구자들은 추정"만 붙임.
11. **사와룬토 연도** (`sumateraUtara.ts`:369) — "1860년대 후반 발견, 1890년대 초 채굴"로 폭을 두어 적음(인니어 위키백과 1867·1892, 검수자 1868·1891~92, 영어 위키백과는 "1876년 채굴 시작"이라는 다른 서술도 있음). 유네스코 등재 문서로 확인하면 좋음.
12. **바뉴왕이–발리 페리 "한 시간쯤"** (`jawaTengahTimur.ts`:560) — 인니어 위키백과 "sekitar 1 jam". ASDP 공식 시간 미확인.
13. **검수자가 적은 숫자 중 내가 쓰지 않은 것**: 말루쿠 52.7·39.6·6.9, 북말루쿠 74, 서누사틍가라 96 (앞 단계에서 `InsightReligion.tsx` 주석 71·76행에 들어가 있음 — 주석이라 화면에는 안 나옴).

---

## 5. 지도 사진

### 뺀 것 (17장) — 스크립트 `scripts/build-map-photos.mjs` 의 `SKIP` 에 넣을 파일 이름

스크립트는 `mapPhotos.ts` 를 통째로 다시 쓰므로, **아래 이름을 `SKIP` 에 넣지 않고 스크립트를 다시 돌리면 뺀 사진이 되살아납니다.** (스크립트는 지시대로 건드리지 않았습니다.)

옛 기록 그림(#37)
```
"Japanese attack on Borneo, 1941-1942.jpg",
"The old missigit of Bantam.jpg",
"Sultan Muhammad Salahuddin bersama Tentara BKR Bima depan Istana ASI Mbojo.jpg",
"Resident Offce Resident Office Buitenzorg.jpg",
"Banda Neira 1724.jpg",
"Fort Belgica 1824.jpg",
"John Webber Plate XVI The Fan Palm in the Island of Cracatoa.jpg",
"Bird's eye view of Palembang.JPG",
"Alun - Alun Purwokerto 1947. (Berwarna).jpg",
"Alun - Alun di Purwokerto, 1931.jpg",
"Tarakan landing (AWM 090812).jpg",
```
인물 초상(#38) · 라이선스 의심(#36)
```
"Amir Hamzah Wali Kota Binjai.jpg",
"Wali Kota Kediri Samsul Ashar.jpg",
"Bupati Mamuju Sitti Sutinah Suhardi.jpg",
"Esau Sesa.jpg",
"Muhammad Arif, MP of Tanjungpinang (2004-2021).jpg",
"Presiden Jokowi Didampingi Gubernur Koster di Pura Besakih untuk peresmian.jpg",
```
(이미 `SKIP` 에 있는 것: `Faroe.sumba.3.jpg`, `Bupati Probolinggo Raden Toemenggoeng Djojonegoro.jpg`, 마나도 교회 2장.)

함께 알릴 것
- `mapPhotos.ts` 53행의 생성 요약 주석("지점 136 · 2장 66 · 1장 38 · 0장 32")과 49~51행 "아직 비어 있습니다" 주석은 옛 값입니다(생성 구간이라 고치지 않음).
- 자동 선택이 "위키 문서의 첫 사진"이라, `SKIP` 만 넣고 다시 돌리면 그 자리에 **다음 사진**(또 다른 초상·옛 그림)이 들어올 수 있습니다. 다시 돌린 뒤 확인용 HTML 을 사람이 봐야 합니다. 옛 그림을 거르는 기준(`ARCHIVE`, mapPhotos.ts 맨 아래)은 여전히 파일 이름의 tropenmuseum·kitlv·wereldculturen 뿐입니다.
- 사진이 없어진 11곳에 지금 모습 사진을 넣으려면 `PICK` 에 직접 적어야 합니다(새 사진은 지시대로 넣지 않았습니다).

### 원어민·사람 확인이 필요한 것

새로 쓰거나 고친 인니어 예문(내가 쓴 것 — 원어민 확인 대상)
1. `sumateraUtara.ts`:270 `Rumah adat di pulau ini dibangun tanpa paku.`
2. `sumateraUtara.ts`:205 `Banyak sekolah didirikan di kota ini sejak dulu.`
3. `baliNusa.ts`:397 `Tanah di pulau ini kering dan air sulit didapat.`
4. `papua.ts`:63 `Kota ini menghadap teluk yang tenang.`
5. `kalimantan.ts`:226 `Kalimantan Utara pernah menjadi provinsi termuda di Indonesia.`
6. `sulawesi.ts`:108 `Pohon cokelat ditanam di perbukitan ini.` (cokelat 을 나무 뜻으로 쓴 것 — KBBI 첫 뜻이지만 입말로는 kakao 가 더 흔할 수 있음)
7. `sumateraSelatan.ts`:130 `Bendera pertama dijahit dengan tangan oleh Fatmawati.`
8. `jawaBarat.ts`:46 `Kebun itu menyimpan lebih dari tiga ribu jenis tanaman.`

사람이 읽고 정할 문장(민감·판단)
1. `InsightHistory.tsx`:85 동티모르 — "침공해 강제 병합" → "군을 보냈고 … 편입". 검수자 제안대로지만 반대쪽에서는 지나치게 순하다고 볼 수 있는 낱말입니다.
2. `InsightHistory.tsx`:93 9·30 사건 — "인도네시아 정부는 … 규정했고"를 넣은 문장.
3. `InsightHistory.tsx`:109 서이리안 — 괄호 안 "(1969년 주민 대표 투표로 귀속 확정)".
4. `baliNusa.ts`:276 엔데 — "그 나무가 있던 자리는 공원이 되었습니다". 검수자는 "원래 나무는 죽었고 1980년쯤 같은 자리에 다시 심었다"고 했으나 내 출처로는 확인 못 함. 확인되면 그 문장으로 바꾸는 것이 더 정확합니다.
5. `sumateraSelatan.ts`:213 팡칼피낭 — 한 문장으로 줄어듦. 실제로 "네 종교 건물이 모인 곳"이 있는지 현지 확인이 되면 되살릴 수 있습니다.
6. 줄어든 종교 관련 문단 3곳(Pulau Nias·Kupang·Manokwari) — 문단 길이가 짧아졌습니다. 폰에서 시트 모양 확인.
7. `PhotoCredits.tsx` — 공개판(무료·Plus)에서 사진 출처 화면에 마우메레·사파루아·토벨로·토모혼이 **안 나오고**, 관리자·Special 에서는 **나오는지**, "사진 N장" 합계가 등급에 따라 달라지는지.
8. Jambi 다리 사진(#32) — 그림을 직접 보지 않았습니다. 지도에서 잠비 핀을 눌러 다리 사진이 잠비의 근탈라 아라시 다리인지 한 번 볼 것.

---

## 6. 낭독 캐시 키 — 읽기만 하고 확인한 것

**결론: 지도·오늘의 문장에서 소리 내어 읽는 글은 캐시 키가 "읽는 글자 자체"에서 만들어집니다. 글을 고치면 새 키가 되어 새 음성이 만들어지므로 버전을 올릴 곳이 없습니다. 키는 건드리지 않았습니다.**

| 무엇을 읽나 | 어디서 | 키가 만들어지는 곳 |
|---|---|---|
| 지도 — 핀 ID(예: "Takengon") | `src/pages/IndoMap.tsx`:1030 `speak(selected.id, "id")` | 아래 공통 경로 |
| 지도 — 단어(표제어) | `src/pages/IndoMap.tsx`:1117 `speak(w.word, "id")` | 아래 공통 경로 |
| 오늘의 문장 — 문장·구절·예문 | `src/pages/PhraseDetail.tsx`:459, 549, 578, 628 | 아래 공통 경로 |

공통 경로
1. `IndoMap.tsx`:84~102 의 `speak()` 는 `window.AndroidTTS.speak(text, 언어)` 를 부릅니다. 관리자판·회원판은 이것이 폰 내장 음성이라 캐시가 없습니다.
2. 스토어 앱은 `src/lib/storeTtsShim.ts` 가 그 자리를 채웁니다. 36~38행: 인니어 "낱말 모양"(3낱말 이하·40자 이하·한글 없음·문장부호로 안 끝남, `nativeTts.ts`:61~68)은 폰 내장 음성 → 캐시 없음. 그 밖에는 23행 `ttsPlayer.toggle("say:" + t, t)`.
3. `src/lib/tts.ts`:587(및 625·726행) 캐시 키 = `key + "::v=" + 목소리 + "::" + 조각번호 + "/" + 조각수 + SAY_CACHE_VER`. 여기서 `key` 가 `"say:" + 읽는 글` 이므로 **글이 곧 키**입니다. (`SAY_CACHE_VER` 는 40행 `"::id1"` — 발음 방식 전체를 바꿀 때만 올리는 값.)

함께 알릴 것
- 지도에서 **설명·예문·한국어 뜻은 읽지 않습니다**(읽는 것은 핀 ID 와 표제어뿐). 이번에 핀 ID 는 하나도 바꾸지 않았고, 표제어는 4개가 새 낱말로 바뀜(`rumah adat`·`sekolah`·`kering`·`teluk`) — 모두 "낱말 모양"이라 폰 내장 음성으로 읽힙니다.
- 인도네시아 이해 화면(역사·종교·종족·개요·기독교)에는 낭독이 없습니다. `InsightTips.tsx`:245 만 AI 가 만든 인니어 표현을 같은 경로로 읽습니다.
- **음성이 아닌 글 캐시 한 가지**: 오늘의 문장 해설은 `src/lib/phrase.ts`:284~291 에서 "폰 저장소(IndexedDB `kata-phrases`) → 앱에 담긴 seed" 순으로 찾고, seed 를 한 번 읽으면 폰에 저장합니다. 키는 문장이고 버전이 없습니다(9~12행). 그래서 **이미 그 문장을 열어 본 폰**(개발자·아내 폰, 시험 기기)에서는 이번에 고친 4개 문장(Berakit-rakit… / Di mana bumi… / Diam itu emas. / Kutu buku)의 해설이 옛 글로 남습니다. 새로 설치하는 사용자에게는 고친 글이 나옵니다. "다시 받기"는 seed 가 아니라 AI 로 새로 만듭니다. 고칠지 여부는 소유자 판단(이번에는 손대지 않음). 문장 카드 앞면의 한국어(`item.ko`, PhraseDetail.tsx:478)는 `peribahasa.ts` 에서 바로 오므로 "책을 아주 좋아하는 사람"은 바로 반영됩니다.

---

## 7. 지시와 다르게 판단한 곳 · 확신하지 못한 것

1. **5-6 #4 (가장 젊은 주)** — 검수자는 "단어·예문을 바꿈"이라 했으나 표제어 `provinsi termuda` 를 그대로 두고 설명과 예문을 "한때 가장 젊은 주였다"로 고쳤습니다. 표제어를 바꾸면 새 낱말을 지어내야 하고 277개 중복 검사·원어민 확인 범위가 커지기 때문입니다. 틀린 문장을 외우게 되는 문제는 없어졌습니다.
2. **5-6 #14 (칠레곤)** — 검수자 "서쪽" 대신 좌표로 계산한 "북서쪽".
3. **5-6 #25 (쿠두스)** — 검수자 "자바에서 유일" 대신 "자바에서 드물게"(인니어 위키백과가 "유일하지 않다"고 적음).
4. **5-6 #53 (cokelat)** — 검수자 `Pohon kakao` 대신 `Pohon cokelat`(표제어가 예문에 있어야 함).
5. **5-6 #5 (펠라)** — 검수자 "펠라 간동" 대신 "펠라".
6. **5-6 #44~#46** — "문단을 줄이고 단어를 바꿈"을 따랐습니다. 종교 인구 사실 한 문장은 남겼습니다(Nias "주민 대부분은 개신교인", Kupang "기독교인 비율이 아주 높은 주", Manokwari 별명의 유래). 더 줄일지, staff 용으로 돌릴지는 소유자 판단입니다. 새 표제어 3개와 #48 의 `sekolah` 는 내가 골랐습니다.
7. **5-5 #13** — "자체 추산"을 붙이는 대신 숫자를 뺐습니다(출처마다 4천만~9천만으로 달라 "자체 추산 9천만"도 확인 못 함).
8. **5-5 #17** — 92행("좌파 성향 군인들이 … 쿠데타 시도")은 그대로 두고 93행만 고쳤습니다. 92행도 인도네시아 공식 서술과 다른 표현이라는 지적이었으므로, 더 고칠지 판단이 필요합니다.
9. **5-6 #41 (`PhotoCredits.tsx`)** — 지시의 "관련 파일" 목록에 없는 파일이지만, 5-6 표의 "확실" 항목이고 다른 작업자가 건드리지 않은 파일이라 고쳤습니다. 화면 동작은 폰에서 확인하지 못했습니다.
10. **`docs/release/09-qa-report.md` (5-5 #16·#37)** — 반대로 이쪽은 고치지 않았습니다(문서, 다른 작업과 겹칠 수 있음). #37 은 값이 확정(459·492)이라 한 줄만 바꾸면 됩니다.
11. **동결 목록(5-5 #31~#36)** — 지시대로 건드리지 않았지만, 파일 머리말은 뜻 칸 수정을 허용합니다(2절 아래 참고).
12. **위키백과에만 기댄 사실** — 출처는 거의 모두 위키백과(영어·인니어)입니다. BPS·유네스코 원문은 이번에 열지 않았고, 종교부 satudata 는 보관본(web.archive.org)으로 봤습니다. KBBI 공식 사이트(kbbi.kemdikbud.go.id)는 이 PC 에서 열리지 않아 `kbbi.web.id`(KBBI 3판)와 인니어 위키낱말사전으로 대신했습니다.
