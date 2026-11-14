> 2026-11-14 출시 전 점검 3차에서 만든 작업 결과표입니다. 요약과 항목별 처리 현황은 `prelaunch-2026-11-13-followup.md`, 원어민 확인 목록은 `native-check-2026-11-14.md` 를 보세요.
> 표 안의 "보류" 가운데 그 뒤 처리한 것이 있습니다(퍼즐 뜻 칸 9줄, 지도 사진 제외 목록, `orang utan` 표기, 표제어 19개의 ID 이전) — 최종 상태는 followup 문서가 기준입니다.

# 공개 단어장·성경과 신앙 단어장 고침 결과 (점검 보고서 5-2, 5-3)

작업 날짜 2026-11-14 · 브랜치 `release/public` · **커밋·push 는 하지 않았습니다** (작업 파일만 고침).

## 0. 한눈에 보기

| 구분 | 항목 수 |
|---|---|
| 1. 고친 것 | **47** (CSV 51행 + 그림 키 10개) |
| 2. 고치지 않은 것(보류) | **67** (오류 표 21 + 판단 필요 46) |
| 3. 이미 고침 / 해당 없음 | **34** (이미 고침 3 + 기계 검사 표 28 + 판단 필요 중 조치 대상 아님 3) |
| 합계 | **148** = 오류 표 71행(01~11 15, 12~23 23, 24~34 17, 5-3 표본 13, 표본 밖 3) + 판단 필요 49개(16+12+21) + 기계 검사 표 28행(동음이의 11, 기독교 어휘 17) |

- 바뀐 파일: `data/categories/` 27개, `src/data/illust/` 7개 = 34개, `git diff --numstat` 합계 **+61 / −61** (CSV 51줄 + 그림 키 10줄, 기대값과 일치).
- 단어 수: `Seed generated: 41 categories, 3555 words.` (변화 없음)

### 확인에 쓴 출처와 기준

| 약칭 | 출처 | 비고 |
|---|---|---|
| KBBI | KBBI VI Daring 공식판 `https://kbbi.kemendikdasmen.go.id/entri/<낱말>` | `kbbi.kemdikbud.go.id` 는 이 PC 에서 접속 실패(응답 없음). 공식판 새 주소는 열림. KBBI 거울 사이트(kbbi.web.id 등)는 KBBI 와 **같은 출처 하나**로 셈 |
| enwikt | 영어 위키낱말사전 `https://en.wiktionary.org/wiki/<낱말>` (Indonesian 항목) | API 는 429(요청 과다)로 막혀 `index.php?action=raw` 로 읽음 |
| idwiki | 인도네시아어 위키백과 문서 제목·넘겨주기, 그리고 `Wikipedia:Daftar kosakata bahasa Indonesia yang sering salah dieja` | |
| sederet | 인니–영 사전 `https://www.sederet.com/id-en/<낱말>` | glosbe 는 403 으로 막힘 |
| KamusSABDA | `https://kamus.sabda.org/kamus/<낱말>` (품사 표시) | |
| EYD | EYD V 공식 `https://ejaan.kemendikdasmen.go.id/eyd/...` | |
| TB-sabda / TB-bible.com | `https://alkitab.sabda.org/verse.php?...` (TB 1974) / `https://www.bible.com/bible/306/<절>.TB` | 성경 용어는 두 곳 모두 TB 본문으로 대조 |
| 표준 / 우리말샘 | `https://stdict.korean.go.kr/search/searchResult.do?searchKeyword=<낱말>` / `https://opendict.korean.go.kr/search/searchResult?query=<낱말>` | 한국어 표기 |

- **적용 기준**: 검수자 제안의 근거가 된 사실(표준 철자, 낱말 뜻, TB 표기, 한국어 규범 표기)을 위 출처 **두 곳 이상**이 뒷받침할 때만 고침.
- 출처가 서로 다르거나, 지금 표기가 틀렸다고 말하는 출처가 없거나, 제안이 둘 이상이라 하나로 정해지지 않거나, 새 예문을 지어야 하거나, 출처로 확인할 사실이 없는 순수 문체 문제는 **보류**.
- 한 행이 표 1~3 중 정확히 한 곳에만 나옵니다. 항목 번호는 보고서 각 표의 위에서부터 센 순서(판단 필요는 보고서 번호 그대로).

---

## 1. 고친 것 (47)

| 보고서 항목 | 파일 | 행 | 단어 | 이전 | 이후 | 근거 출처 1 | 근거 출처 2 |
|---|---|---|---|---|---|---|---|
| 5-2 01~11 ① | 10 접사 가족 | 9 | mempercayai (표제어·예문) | `mempercayai` / `Saya mempercayai kata-katanya…` | `memercayai` / `Saya memercayai kata-katanya…` | KBBI https://kbbi.kemendikdasmen.go.id/entri/memercayai — "bentuk tidak baku: mempercayai" | enwikt https://en.wiktionary.org/wiki/mempercayai — "nonstandard, proscribed" |
| 5-2 01~11 ② | 10 접사 가족 | 10 | mempercayakan (표제어·예문) | `mempercayakan` / `Dia mempercayakan anaknya…` | `memercayakan` / `Dia memercayakan anaknya…` | KBBI https://kbbi.kemendikdasmen.go.id/entri/memercayakan — "bentuk tidak baku: mempercayakan" | enwikt https://en.wiktionary.org/wiki/mempercayakan — "proscribed" |
| 5-2 01~11 ③ | 01 인사·기본 표현 | 56 | turut berduka cita (표제어·예문) | `turut berduka cita` / `Kami turut berduka cita atas…` | `turut berdukacita` / `Kami turut berdukacita atas…` | KBBI https://kbbi.kemendikdasmen.go.id/entri/dukacita — "bentuk tidak baku: duka cita"; `berdukacita` 예문 "kami turut ~ sehubungan dengan meninggalnya anak Anda" | idwiki 목록 https://id.wikipedia.org/wiki/Wikipedia:Daftar_kosakata_bahasa_Indonesia_yang_sering_salah_dieja — Benar `dukacita` / Salah `duka cita` |
| 5-2 01~11 ④ | 08 행위·조작 | 71 | mengumpulkan (예문) | `…mengumpulkan perangko…` | `…mengumpulkan prangko…` | KBBI https://kbbi.kemendikdasmen.go.id/entri/prangko — "bentuk tidak baku: perangko" | enwikt https://en.wiktionary.org/wiki/perangko — "alternative form of prangko" (idwiki `Perangko` → `Prangko` 넘겨주기) |
| 5-2 01~11 ⑥ | 05 시간·날짜·순서 | 65 | pukul (뜻) | `~시 (정각)` | `~시 (시각을 말할 때)` | KBBI https://kbbi.kemendikdasmen.go.id/entri/pukul — "saat yang menyatakan satuan waktu tertentu" (정각이라는 제한 없음) | EYD https://ejaan.kemendikdasmen.go.id/eyd/penggunaan-tanda-baca/tanda-titik/ — 예 "pukul 01.35.20 (pukul 1 lewat 35 menit 20 detik)" |
| 5-2 01~11 ⑪ | 07 이동·존재 | 38 | pindah (뜻) | `옮기다/이사하다` | `옮겨 가다/이사하다` | KBBI https://kbbi.kemendikdasmen.go.id/entri/pindah — "v beralih atau bertukar tempat"(자동사) / enwikt https://en.wiktionary.org/wiki/pindah — "intransitive: to move; to relocate" | 표준 https://stdict.korean.go.kr/search/searchResult.do?searchKeyword=옮기다 — "자리를 바꾸게 하다. ‘옮다’의 사동사"(타동) |
| 5-2 01~11 ⑬ | 04 수량·숫자·단위 | 7 | menyusut (예문뜻) | `그 호수의 수자원이 급격히 줄어들었다.` | `그 호수의 저수량이 급격히 줄어들었다.` | KBBI https://kbbi.kemendikdasmen.go.id/entri/cadangan — "persediaan; serep" | enwikt https://en.wiktionary.org/wiki/cadangan — "backup, provision, reserve, stock" (sederet https://www.sederet.com/id-en/cadangan — "reserve") |
| 5-2 12~23 ① | 18 집·생활용품 | 88 | saklar (표제어·예문) | `saklar` / `Saklar lampunya…` | `sakelar` / `Sakelar lampunya…` | KBBI https://kbbi.kemendikdasmen.go.id/entri/sakelar — "bentuk tidak baku: saklar" | enwikt https://en.wiktionary.org/wiki/saklar — "nonstandard form of sakelar" |
| 5-2 12~23 ② | 19 옷·외모 | 54 | resleting (표제어·예문) | `resleting` / `Resleting tasnya macet.` | `ritsleting` / `Ritsleting tasnya macet.` | KBBI https://kbbi.kemendikdasmen.go.id/entri/ritsleting — "bentuk tidak baku: resleting" | enwikt https://en.wiktionary.org/wiki/resleting — "alternative form of ritsleting" (idwiki 문서 제목 `Ritsleting`) |
| 5-2 12~23 ③ | 21 취미·운동·여가 | 52 | fotografi (예문) | `…secara otodidak.` | `…secara autodidak.` | KBBI https://kbbi.kemendikdasmen.go.id/entri/autodidak — "bentuk tidak baku: otodidak" | enwikt https://en.wiktionary.org/wiki/autodidak — "otodidak: nonstandard" |
| 5-2 12~23 ⑧ | 13 빈도·양태 | 82 | berbalas (뜻) | `서로 주고받으며` | `서로 주고받다` | KBBI https://kbbi.kemendikdasmen.go.id/entri/berbalas — 품사 "v"(동사) | KamusSABDA https://kamus.sabda.org/kamus/berbalas — "POS: Kata Benda, Kata Kerja" (sederet: "reciprocated") |
| 5-2 12~23 ⑨ | 17 음식·요리 | 78 | es campur (뜻) | `에스참푸르 (모듬 빙수)` | `에스참푸르 (모둠 빙수)` | 우리말샘 https://opendict.korean.go.kr/search/searchResult?query=모듬 — "모듬 회 ⇒ 규범 표기는 ‘모둠 회’이다" | 표준 https://stdict.korean.go.kr/search/searchResult.do?searchKeyword=모듬 — ‘모듬’은 심마니 은어/"→ 모임"뿐, `모둠냄비` 는 표제어 |
| 5-2 12~23 ⑩ | 19 옷·외모 | 10 | jaket (뜻) | `재킷/자켓` | `재킷` | 표준 https://stdict.korean.go.kr/search/searchResult.do?searchKeyword=자켓 — "자켓 → 재킷" | 우리말샘 https://opendict.korean.go.kr/search/searchResult?query=자켓 — "규범 표기는 ‘재킷’이다" |
| 5-2 12~23 ⑫ | 14 가족·호칭 | 60 | Kak (뜻) | `형/누나 (손위 사람 호칭)` | `형/오빠/누나/언니 (손위 사람 호칭)` | KBBI https://kbbi.kemendikdasmen.go.id/entri/kakak — "kata sapaan kepada orang (laki-laki atau perempuan) yang dianggap lebih tua"; https://kbbi.kemendikdasmen.go.id/entri/kak — "kp kakak" | sederet https://www.sederet.com/id-en/kakak — "older brother … elder sister" |
| 5-2 12~23 ⑬ | 12 평가·정도 | 65 | mengecewakan (뜻) | `실망스러운` | `실망스러운/실망시키다` | KBBI https://kbbi.kemendikdasmen.go.id/entri/mengecewakan — "v menyebabkan (menjadikan) kecewa; tidak memuaskan" | sederet https://www.sederet.com/id-en/mengecewakan — "disappointing; disappoint" |
| 5-2 12~23 ⑮ | 19 옷·외모 | 13 | gaun (뜻) | `드레스/가운` | `드레스` | KBBI https://kbbi.kemendikdasmen.go.id/entri/gaun — "baju terusan wanita" / enwikt https://en.wiktionary.org/wiki/gaun — "dress (borrowed … without ‘gown’ sense)" | 표준 https://stdict.korean.go.kr/search/searchResult.do?searchKeyword=가운 — 법복·의례복 / 우리말샘 — 의사 가운·실내복 (여성 드레스 뜻 없음) |
| 5-2 12~23 ⑯ | 14 가족·호칭 | 7 | istri (예문뜻) | `…인내심 있고 사랑스러운 여성이다.` | `…인내심 있고 사랑이 많은 여성이다.` | KBBI https://kbbi.kemendikdasmen.go.id/entri/kasih — "kemurahan hati: … hati yang penuh kasih kepada orang-orang lemah" | sederet https://www.sederet.com/id-en/penuh%20kasih — "loving; compassionate" |
| 5-2 12~23 ⑱ | 13 빈도·양태 | 48 | ironisnya (예문뜻) | `…가장 잘 하는 분야에서…` | `…가장 잘하는 분야에서…` | 표준 https://stdict.korean.go.kr/search/searchResult.do?searchKeyword=잘하다 — 표제어 `잘-하다`(한 낱말) | 우리말샘 https://opendict.korean.go.kr/search/searchResult?query=잘하다 — "익숙하고 능란하게 하다" |
| 5-2 12~23 ⑲ | 14 가족·호칭 | 23 | melahirkan (예문뜻) | `…건강한 남자 아이를 낳았다.` | `…건강한 남자아이를 낳았다.` | 표준 https://stdict.korean.go.kr/search/searchResult.do?searchKeyword=남자아이 — 표제어 `남자-아이` | 우리말샘 https://opendict.korean.go.kr/search/searchResult?query=남자아이 — 표제어 `남자-아이` |
| 5-2 12~23 ㉑ | 17 음식·요리 | 79 | menumis (예문뜻) | `어머니는 채소를 볶기 전에 양파를 볶으신다.` | `어머니는 채소 요리를 하기 전에 양파를 볶으신다.` | KBBI https://kbbi.kemendikdasmen.go.id/entri/memasak — "membuat (mengolah) penganan, makanan…" | enwikt https://en.wiktionary.org/wiki/memasak — "to cook" (sederet: "cook; cooking") |
| 5-2 12~23 ㉒ | 21 취미·운동·여가 | 91 | renang (예문뜻) | `수영은 허리에 좋은 운동이다.` | `수영은 등(허리)에 좋은 운동이다.` | KBBI https://kbbi.kemendikdasmen.go.id/entri/punggung — "bagian belakang tubuh … dari leher sampai ke tulang ekor" | enwikt https://en.wiktionary.org/wiki/punggung — "back" (sederet: "back") |
| 5-2 12~23 ㉓ | 23 교육·학교 | 73 | absensi (예문뜻) | `선생님이 수업 전에 출석을 부른다.` | `선생님이 수업 전에 출석부를 적는다.` | KBBI https://kbbi.kemendikdasmen.go.id/entri/mengisi — "memberi isi; memasukkan sesuatu ke dalam" / enwikt https://en.wiktionary.org/wiki/mengisi — "to fill in" | enwikt https://en.wiktionary.org/wiki/absensi — 2번 뜻 attendance register / sederet https://www.sederet.com/id-en/absensi — "attendance" |
| 5-2 24~34 ① | 24 의료·병원 | 52 | maag (예문뜻) | `위염이 있으면 끼니를 거르지 마라.` | `위염이 있으면 끼니를 늦추지 마라.` | KBBI https://kbbi.kemendikdasmen.go.id/entri/telat — "kasip; terlambat" | enwikt https://en.wiktionary.org/wiki/telat — "late" (sederet: "late; overdue") |
| 5-2 24~34 ② | 24 의료·병원 | 57 | stroke (표제어·예문) | `stroke` / `Kakeknya terkena stroke…` | `strok` / `Kakeknya terkena strok…` | KBBI https://kbbi.kemendikdasmen.go.id/entri/strok — "bentuk tidak baku: stroke" | idwiki https://id.wikipedia.org/wiki/Strok — 문서 제목 `Strok`, `Stroke` 는 넘겨주기 (enwikt 도 Indonesian 항목은 `strok`) |
| 5-2 24~34 ③ | 25 행정·법률 | 31 | wajib (예문) | `Sholat lima waktu…` | `Salat lima waktu…` | KBBI https://kbbi.kemendikdasmen.go.id/entri/salat — "bentuk tidak baku: solat, shalat, sholat" | enwikt https://en.wiktionary.org/wiki/salat — "shalat, solat, sholat: all nonstandard" (idwiki 목록도 같음) |
| 5-2 24~34 ⑥ | 28 동물 | 7 | gajah (예문) | `Gajah Sumatera adalah…` | `Gajah sumatra adalah…` | KBBI https://kbbi.kemendikdasmen.go.id/entri/Sumatra — 섬 이름은 `Sumatra` (`Sumatera` 는 "provinsi di pulau Sumatra") | idwiki https://id.wikipedia.org/wiki/Gajah_sumatra — 문서 제목 `Gajah sumatra` / EYD 대문자 규칙 18 https://ejaan.kemendikdasmen.go.id/eyd/penggunaan-huruf/huruf-kapital/ — 종류 이름에 쓰인 지명은 소문자 (같은 파일 32행 `Badak jawa` 와 맞춤) |
| 5-2 24~34 ⑦ | 28 동물 | 33 | orangutan (표제어·예문) | `orangutan` / `Orangutan hidup…` | `orang utan` / `Orang utan hidup…` | KBBI https://kbbi.kemendikdasmen.go.id/entri/orang%20utan — "bentuk tidak baku: orangutan" | idwiki https://id.wikipedia.org/wiki/Orang_utan — 문서 제목 `Orang utan`, `Orangutan` 은 넘겨주기 (enwikt `orang utan`) |
| 5-2 24~34 ⑧ | 28 동물 | 49 | kecoa (표제어·예문) | `kecoa` / `Ada kecoa di bawah…` | `kecoak` / `Ada kecoak di bawah…` | KBBI https://kbbi.kemendikdasmen.go.id/entri/kecoak — "bentuk tidak baku: kacoak, kecuak, kecoa" | enwikt https://en.wiktionary.org/wiki/kecoa — "nonstandard form of kecoak" |
| 5-2 24~34 ⑨ | 28 동물 | 52 | cicak (표제어·예문) | `cicak` / `Ada cicak merayap…` | `cecak` / `Ada cecak merayap…` | KBBI https://kbbi.kemendikdasmen.go.id/entri/cecak — "bentuk tidak baku: cicak" | enwikt https://en.wiktionary.org/wiki/cicak — "proscribed, common" (idwiki `Cicak` → `Cecak` 넘겨주기) |
| 5-2 24~34 ⑩ | 29 식물·농업 | 15 | akar (예문) | `…menghujam jauh ke dalam tanah.` | `…menghunjam jauh ke dalam tanah.` | KBBI https://kbbi.kemendikdasmen.go.id/entri/hunjam (menghunjam 실림) · https://kbbi.kemendikdasmen.go.id/entri/menghujam — "Entri tidak ditemukan" | sederet https://www.sederet.com/id-en/menghunjam — 실림("stabbing"), `menghujam` 은 없음 / KamusSABDA https://kamus.sabda.org/kamus/menghunjam — 동사, `menghujam` 은 없음 |
| 5-2 24~34 ⑭ | 31 교통 | 34 | angkot (예문뜻) | `저는 시장까지 앙콧을 두 번 갈아탔습니다.` | `저는 시장까지 앙콧을 두 번 탔습니다.` | enwikt https://en.wiktionary.org/wiki/naik — "to ride in or on something" | sederet https://www.sederet.com/id-en/naik — "ride" (원문 `naik … dua kali` = 두 번 탐) |
| 5-2 24~34 ⑯ | 32 장소·여행 | 34 | klenteng (표제어·예문) | `klenteng` / `Klenteng tua itu…` | `kelenteng` / `Kelenteng tua itu…` | KBBI https://kbbi.kemendikdasmen.go.id/entri/kelenteng — "bentuk tidak baku: klenteng" | idwiki 목록 — Benar `kelenteng` / Salah `klenteng`; 문서 제목 https://id.wikipedia.org/wiki/Kelenteng |
| 5-2 24~34 ⑰ | 33 기술·인터넷 | 12 | menyalin (뜻) | `복사하다` | `베끼다/복사하다` | KBBI https://kbbi.kemendikdasmen.go.id/entri/menyalin — "menurun (tulisan); menulis kembali; meniru: … ~ pelajaran itu dari buku temannya" | sederet https://www.sederet.com/id-en/menyalin — "copy; … transcribing" |
| 5-3 표본 ① | 35 성경 핵심어 | 3 | Yesus (예문) | `Yesus adalah jalan kebenaran dan hidup.` | `"Yesus adalah jalan, kebenaran, dan hidup."` (쉼표가 들어가 큰따옴표로 감쌈) | TB-sabda https://alkitab.sabda.org/verse.php?book=Yoh&chapter=14&verse=6 — "Akulah jalan dan kebenaran dan hidup"(세 가지를 나열) | TB-bible.com https://www.bible.com/bible/306/JHN.14.6.TB — 같은 본문 / 쉼표는 EYD https://ejaan.kemendikdasmen.go.id/eyd/penggunaan-tanda-baca/tanda-koma/ 규칙 1(나열) |
| 5-3 표본 ② | 35 성경 핵심어 | 46 | buah Roh (예문) | `Buah Roh adalah kasih sukacita dan damai sejahtera.` | `"Buah Roh adalah kasih, sukacita, dan damai sejahtera."` | TB-sabda https://alkitab.sabda.org/verse.php?book=Gal&chapter=5&verse=22 — "kasih, sukacita, damai sejahtera, …" | TB-bible.com https://www.bible.com/bible/306/GAL.5.22.TB — 같은 본문 |
| 5-3 표본 ③ | 35 성경 핵심어 · 38 교리·신학 · 40 교회 직분·사역 | 35:9, 35:23, 38:56, 40:10, 40:16 | injil (표제어 1 + 예문 4) | 표제어 `injil`; 예문 `menyebarkan injil`, `memberitakan injil`(3곳) | 표제어 `Injil`; 예문 모두 `Injil` | TB-sabda https://alkitab.sabda.org/verse.php?book=Mrk&chapter=1&verse=1 — "permulaan Injil tentang Yesus Kristus" (막 16:15, 롬 1:16 도 대문자) | TB-bible.com https://www.bible.com/bible/306/MRK.1.1.TB — 같은 본문 (KBBI 표제어도 `Injil`) |
| 5-3 표본 ④ | 36 성경 인물·지명 | 40 | Samuel (예문뜻) | `사무엘은 이스라엘의 마지막 선지자이자 사사였다.` | `사무엘은 이스라엘의 선지자이자 마지막 사사였다.` | idwiki https://id.wikipedia.org/wiki/Samuel — "Dia merupakan hakim terakhir sebelum … masa kerajaan. Samuel juga nabi…" | 한국어 위키백과 https://ko.wikipedia.org/wiki/사무엘 — "예언자이자 … 사실상 최후의 사사(판관)" (TB 삼상 7:15 "Samuel memerintah sebagai hakim") |
| 5-3 표본 ⑤ | 36 성경 인물·지명 | 56 | Yordania (표제어·예문) | `Yordania` / `…di sungai Yordania oleh Yohanes.` | `Yordan` / `…di sungai Yordan oleh Yohanes.` | TB-sabda https://alkitab.sabda.org/verse.php?book=Mat&chapter=3&verse=13 — "dari Galilea ke Yordan" | TB-bible.com https://www.bible.com/bible/306/MAT.3.13.TB — 같은 본문 (idwiki 문서 `Sungai Yordan`) |
| 5-3 표본 ⑦ | 38 교리·신학 | 36 | antiKristus (표제어·예문) | `antiKristus` / `AntiKristus akan muncul…` | `antikristus` / `Antikristus akan muncul…` | TB-sabda https://alkitab.sabda.org/verse.php?book=1Yoh&chapter=2&verse=18 — "seorang antikristus akan datang" | TB-bible.com https://www.bible.com/bible/306/1JN.2.18.TB — 같은 본문 |
| 5-3 표본 ⑧ | 38 교리·신학 | 72 | anthropologi teologi (표제어·예문) | `anthropologi teologi` / `Anthropologi teologi membahas…` | `antropologi teologis` / `Antropologi teologis membahas…` | KBBI https://kbbi.kemendikdasmen.go.id/entri/antropologi (h 없음) · https://kbbi.kemendikdasmen.go.id/entri/teologis — "a berkenaan dengan teologi" | enwikt https://en.wiktionary.org/wiki/antropologi / idwiki 본문 검색 "antropologi teologis" 5건(`Holisme` 의 절 제목, `Teologi sistematika` 등) |
| 5-3 표본 ⑨ | 38 교리·신학 | 83 | buku kehidupan (표제어·예문) | `buku kehidupan` / `…dalam buku kehidupan.` | `kitab kehidupan` / `…dalam kitab kehidupan.` | TB-sabda https://alkitab.sabda.org/verse.php?book=Why&chapter=20&verse=12 — "yaitu kitab kehidupan" (빌 4:3 도 같음) | TB-bible.com https://www.bible.com/bible/306/REV.20.12.TB · https://www.bible.com/bible/306/PHP.4.3.TB |
| 5-3 표본 ⑩ | 38 교리·신학 | 85 | millenium (표제어·예문) | `millenium` / `Millenium adalah…` | `milenium` / `Milenium adalah…` | KBBI https://kbbi.kemendikdasmen.go.id/entri/milenium (실림) · `millenium` 은 "Entri tidak ditemukan" | enwikt https://en.wiktionary.org/wiki/milenium / idwiki 문서 `Milenium` (TB 본문에는 없는 말이라 KBBI 표기를 따름) |
| 5-3 표본 ⑪ | 41 설교 표현 | 7 | imanuel (표제어) | `imanuel` | `Imanuel` | TB-sabda https://alkitab.sabda.org/verse.php?book=Mat&chapter=1&verse=23 — "menamakan Dia Imanuel" | TB-bible.com https://www.bible.com/bible/306/MAT.1.23.TB — 같은 본문 |
| 5-3 표본 ⑫ | 41 설교 표현 | 9 | gloria (예문·예문뜻) | `…di tempat yang maha tinggi.` / `지극히 높은 곳에서는 하나님께 영광이라는 뜻이다.` | `…di tempat yang mahatinggi.` / `글로리아 인 엑셀시스 데오는 지극히 높은 곳에서는 하나님께 영광이라는 뜻이다.` | TB-sabda https://alkitab.sabda.org/verse.php?book=Luk&chapter=2&verse=14 — "Kemuliaan bagi Allah di tempat yang mahatinggi" | TB-bible.com https://www.bible.com/bible/306/LUK.2.14.TB — 같은 본문 (예문뜻 주어는 원문 `Gloria in excelsis Deo berarti…` 그대로 보탬) |
| 5-3 표본 ⑬ | 39 기도·찬양 | 70 | Dalam nama Tuhan Yesus (뜻·예문뜻) | `예수님의 이름으로` / `예수님의 이름으로 기도합니다. 아멘.` | `주 예수님의 이름으로` / `주 예수님의 이름으로 기도합니다. 아멘.` | TB-sabda https://alkitab.sabda.org/verse.php?book=Kol&chapter=3&verse=17 — "dalam nama Tuhan Yesus" ↔ 개역한글 https://www.bible.com/bible/88/COL.3.17.KRV "주 예수의 이름으로" | TB-bible.com https://www.bible.com/bible/306/COL.3.17.TB / sederet https://www.sederet.com/id-en/Tuhan — "god; lord" |
| 5-3 표본 밖 ① | 36 성경 인물·지명 | 16 | Noach (표제어·예문) | `Noach` / `Noach adalah orang yang benar di matanya Allah.` | `Nuh` / `Nuh adalah orang yang benar di mata Allah.` | TB-sabda https://alkitab.sabda.org/verse.php?book=Kej&chapter=6&verse=9 — "Nuh adalah seorang yang benar"; 6:8 "di mata TUHAN" | TB-bible.com https://www.bible.com/bible/306/GEN.6.9.TB · https://www.bible.com/bible/306/GEN.6.8.TB |
| 5-3 표본 밖 ② | 36 성경 인물·지명 | 48 | Nikodem (표제어·예문) | `Nikodem` / `Nikodem datang kepada Yesus…` | `Nikodemus` / `Nikodemus datang kepada Yesus…` | TB-sabda https://alkitab.sabda.org/verse.php?book=Yoh&chapter=3&verse=1 — "seorang Farisi yang bernama Nikodemus" | TB-bible.com https://www.bible.com/bible/306/JHN.3.1.TB — 같은 본문 |

### 표제어를 바꾼 19개 — 뒤따라야 할 일

표제어(1열)가 바뀌면 단어 ID(`shared_{단어장}_{표제어}`)가 바뀝니다. 아래는 제가 **한 것**과 **하지 않은 것**입니다.

| 단어장 | 옛 표제어 → 새 표제어 | 그림 키(`src/data/illust`) | 퍼즐 동결 목록 |
|---|---|---|---|
| 01 | `turut berduka cita` → `turut berdukacita` | `illust-salam.json` 키 바꿈 | 없음 |
| 10 | `mempercayai` → `memercayai` | `illust-imbuhan.json` 키 바꿈 | 없음 |
| 10 | `mempercayakan` → `memercayakan` | `illust-imbuhan.json` 키 바꿈 | 없음 |
| 18 | `saklar` → `sakelar` | `illust-rumah.json` 키 바꿈 | 없음 |
| 19 | `resleting` → `ritsleting` | `illust-pakaian.json` 키 바꿈 | 없음 |
| 24 | `stroke` → `strok` | `illust-rumah-sakit.json` 키 바꿈 | 없음 |
| 28 | `orangutan` → `orang utan` | `illust-hewan.json` 키 바꿈 | 없음 |
| 28 | `kecoa` → `kecoak` | `illust-hewan.json` 키 바꿈 | **`kataHariIniWords.ts` 435행 `["kecoa", "바퀴벌레"]` (407번 · 2027-12-22 정답)** — 손대지 않음 |
| 28 | `cicak` → `cecak` | `illust-hewan.json` 키 바꿈 | **`kataHariIniWords.ts` 214행 `["cicak", …]` (186번 · 2027-05-15 정답)** — 손대지 않음 |
| 32 | `klenteng` → `kelenteng` | `illust-wisata.json` 키 바꿈 | 없음 |
| 35 | `injil` → `Injil` | 그림 없음 | `kataHariIniGuesses.ts` 30행에 `"injil"`(추측 허용 낱말) — 손대지 않음 |
| 36 | `Noach` → `Nuh` | 그림 없음 | 없음 |
| 36 | `Nikodem` → `Nikodemus` | 그림 없음 | 없음 |
| 36 | `Yordania` → `Yordan` | 그림 없음 | 없음 |
| 38 | `antiKristus` → `antikristus` | 그림 없음 | 없음 |
| 38 | `anthropologi teologi` → `antropologi teologis` | 그림 없음 | 없음 |
| 38 | `buku kehidupan` → `kitab kehidupan` | 그림 없음 | 없음 |
| 38 | `millenium` → `milenium` | 그림 없음 | 없음 |
| 41 | `imanuel` → `Imanuel` | 그림 없음 | 없음 |

**제 범위 밖이라 하지 않은 것 (부모 작업에서 결정 필요)**

1. `src/lib/sharedIdMigration.ts` 의 `LEGACY_WORD_RENAMES` 에 위 19쌍이 없습니다. 넣지 않으면 이 단어들에 붙여 둔 "다시 외울 표시"가 따라오지 않습니다. `WORDLIST-PLAN.md` §5 는 표 추가 + 표시 키 버전 올림(`kata-shared-ids-v2` → `v3`) + `src/test/sharedIdMigration.test.ts` 갱신을 요구합니다.
2. 학습·퀴즈 화면(`StudyMode`·`QuizMode`·`SavedStudyMode`·`SavedQuizMode`)이 쓰는 `src/lib/wordCase.ts` 의 `displayWord` 는 예문 **문장 가운데**에 대문자로 쓰인 근거가 없으면 `PROPER` 목록을 보고, 거기에도 없으면 표제어 첫 글자를 소문자로 낮춰 보여 줍니다. `Injil`·`Nuh` 는 목록에 있고 `Yordan` 은 예문 가운데에 있어 대문자로 보이지만, **`Imanuel`·`Nikodemus` 는 예문 맨 앞에만 나오고 목록에 없어 학습·퀴즈 화면에서는 여전히 소문자로 보일 것입니다**(코드를 읽고 판단, 화면 확인은 못 함. `Nikodem` 일 때도 같았고 36번의 다른 인명도 같은 사정일 수 있음). `PROPER` 에 `imanuel`, `nikodemus` 를 더하면 됩니다.
3. 퍼즐 정답 동결본의 `kecoa`·`cicak` 은 그대로입니다. 단어장은 KBBI 표준형(`kecoak`·`cecak`), 퍼즐은 옛 표기로 서로 다르게 됩니다(둘 다 5글자라 퍼즐 동작에는 영향 없음).
4. `src/lib/mapContent/sumateraUtara.ts` 241행에 `word: "orangutan"` 이 있습니다(지도 원고, 단어장 밖).
5. `data/REVIEW-2026-11.md`·`WORDLIST-PLAN.md` 이력은 갱신하지 않았습니다.

---

## 2. 고치지 않은 것 (보류) (67)

### 2-1. 오류 표 행 (21)

| 보고서 항목 | 파일 | 행 | 단어 | 검수자 제안 | 보류 이유 |
|---|---|---|---|---|---|
| 5-2 01~11 ⑦ | 05 ↔ 11 | 05:79 ↔ 11:43 | minggu ini ↔ sibuk | 한쪽 예문을 새로 씀 | 겹침 자체는 파일에서 확인됨(`Minggu ini saya sangat sibuk.` ↔ `Saya sangat sibuk minggu ini.`). 그러나 고치려면 새 예문을 지어야 하고, 새 문장은 출처로 확인할 대상이 아니라 원어민 확인이 필요 |
| 5-2 01~11 ⑧ | 10 ↔ 16 | 10:13 ↔ 16:35 | merasa ↔ senang | 한쪽 예문을 새로 씀 | 위와 같음(새 예문 필요) |
| 5-2 01~11 ⑨ | 03 전치사·접속사 | 29 | meskipun (예문뜻) | `내리지만` → `내렸지만` | 한국어 문장 안 시제 맞춤이라 사전·규범 출처 두 곳으로 확인할 사실이 없음. 제안 자체는 타당해 보이며, 승인만 있으면 한 낱말 교체로 끝남 |
| 5-2 01~11 ⑩ | 08 행위·조작 | 94 | menempel | 표제어를 `menempelkan` 으로, 또는 뜻을 `붙다/달라붙다` 로 | **출처가 제안과 다름.** KBBI VI https://kbbi.kemendikdasmen.go.id/entri/menempel 은 자동사 뜻(melekat)과 함께 "v melekatkan sesuatu: dilarang ~ pengumuman di sini"(타동, 붙이다)도 실음. sederet 도 "attach; paste". 지금 뜻 `붙이다` 가 틀렸다고 할 수 없음. 제안도 두 갈래 |
| 5-2 01~11 ⑫ | 04 수량·숫자·단위 | 87 | piring (뜻) | `한 그릇 (음식 수분류사)` → `접시/그릇 (음식 수분류사)` | piring = 접시(plate)는 KBBI·enwikt 로 확인됨. 그러나 제안 문구에는 "접시"가 들어 있어 `scripts/check-wordlist.js` 가 18:32 `piring = 접시` 와 **"뜻이 같은 중복"으로 잡게 됨**(뜻 포함 관계로 판정, 중복 0건이 통과 조건). `그릇 (음식 수분류사)` 로 하면 통과하지만 제안과 다른 문구라 임의로 정하지 않음 |
| 5-2 01~11 ⑭ | 07 이동·존재 | 53 | mudik (예문뜻) | `명절이 다가오면` → `르바란이 다가오면` | Lebaran = 이슬람 명절(Idulfitri)임은 KBBI·enwikt 로 확인. 그러나 "명절"이 틀린 번역이라는 근거는 없음(번역 방침 문제). 같은 경우가 17:70, 19:35, 22:62, **34:31, 34:54(보고서에 없음)** 에도 있어 한 줄만 바꾸면 불일치가 그대로 남음 → 판단 필요 12~23 #9 와 함께 한 번에 정할 일 |
| 5-2 01~11 ⑮ | 10 접사 가족 | 2 | mengajar (예문뜻) | 번역을 `그 여자분은…` 으로, 또는 예문을 `Guru itu mengajar…` 로 | 제안이 두 갈래. `Ibu` 를 여교사 호칭으로 쓰는 문맥이면 지금 번역도 가능 → 원어민 확인 |
| 5-2 12~23 ④ | 16 감정·성격 | 66 | optimis | `optimistis` 로 | **출처가 서로 다름.** KBBI VI https://kbbi.kemendikdasmen.go.id/entri/optimis 는 명사("orang yang selalu berpengharapan baik")만, 형용사는 `optimistis`. 그러나 enwikt https://en.wiktionary.org/wiki/optimis 는 형용사 "optimistic"(동의어 optimistis)도 표시 없이 싣고, sederet https://www.sederet.com/id-en/optimis 도 첫 뜻이 "optimistic" |
| 5-2 12~23 ⑤ | 16 감정·성격 | 67 | pesimis | `pesimistis` 로 | KBBI https://kbbi.kemendikdasmen.go.id/entri/pesimis (명사만)와 enwikt(명사만)는 제안과 맞지만 sederet 는 "pessimist; pessimistic" 둘 다. 무엇보다 바로 윗줄 `optimis` 와 짝이라 한쪽만 바꾸면 66·67행이 어긋남 → 두 줄을 함께 정해야 함 |
| 5-2 12~23 ⑪ | 14 가족·호칭 | 21 | sesama (뜻) | `이웃/다른 사람들 (같은 처지의 사람)` | KBBI: "sama-sama (satu golongan)", sederet: "fellow; neighbor". 지금 뜻이 어색한 것은 맞으나 제안 문구("다른 사람들")도 사전 뜻과 딱 맞지 않아 문구 선택이 필요(의견 항목) |
| 5-2 12~23 ⑭ | 13 빈도·양태 | 38 | sebetulnya (뜻·예문뜻) | `사실은/실은`, `실은 말씀드리고…` | KBBI https://kbbi.kemendikdasmen.go.id/entri/sebetulnya: "sebenarnya; sesungguhnya"(사실은). 그러나 sederet https://www.sederet.com/id-en/sebetulnya 는 "actually" 뒤에 **"frankly"** 도 가능한 뜻으로 실음 → "솔직히"가 틀렸다고 두 출처가 말하지 않음 |
| 5-2 12~23 ⑰ | 13 빈도·양태 | 67 | barangkali (예문·예문뜻) | 예문 끝을 `?` 로, 또는 예문뜻을 평서문으로 | 평서문↔의문문 불일치는 사실. 제안이 두 갈래이고 어느 쪽이 자연스러운지는 원어민 판단(KBBI 뜻은 "mungkin") |
| 5-2 12~23 ⑳ | 14 가족·호칭 | 77 | mengandung (예문뜻) | `그는` → `그녀는` | 출처로 확인할 사실이 아니라 표기 방침("그/그녀" 통일 기준). 판단 필요 12~23 #1 과 같은 문제 |
| 5-2 24~34 ④ | 25 행정·법률 | 35, 36 | kartu keluarga, KK (뜻) | `가족 카드 (세대 구성원을 적은 문서, 한국의 주민등록등본에 가까움)` | 한국어 위키백과 https://ko.wikipedia.org/wiki/가족관계등록부 — "가족관계등록부는 개인별로 작성된다"는 확인(검수자 논거 한쪽). KK 쪽 정의는 KBBI `kartu` 항목에서 하위 표제어를 확인하지 못했고 idwiki `Kartu Keluarga` 본문도 읽지 못함 → 두 출처 미달. 또 뜻을 바꾸면 35·36행 예문뜻("가족관계등록부 사본", "등록부에 오르지 않았다")도 함께 바꿔야 해 제안 범위를 넘음 |
| 5-2 24~34 ⑤ | 25 행정·법률 | 43 | surat nikah (예문뜻) | 35행 뜻과 같은 말로 통일 | 바로 위 ④ 에 달림. 지금 35행 뜻(가족관계등록부)에 맞추면 ④ 를 받아들일 때 다시 고쳐야 하고, 43행의 "가족 카드"는 ④ 의 제안과 같은 말임 → ④ 와 함께 한 번에 |
| 5-2 24~34 ⑪ | 29 식물·농업 | 20 | rotan (뜻) | `등나무/등(籐)` → `라탄/등(籐)` | **출처가 제안과 다름.** 표준 https://stdict.korean.go.kr/search/searchResult.do?searchKeyword=등나무 에 `등-나무2 (籐나무)` "야자나뭇과 등속 식물… 의자나 가구 따위를 만드는 데 쓴다"가 따로 실려 있어 지금 뜻이 맞음. `라탄` 은 표준국어대사전에 없고 우리말샘은 "규범 표기는 ‘래탠’" |
| 5-2 24~34 ⑫ | 29 식물·농업 | 40 | cengkeh | `cengkih` 로 | 주 표제어가 `cengkih` 인 것은 맞음(KBBI 뜻풀이, idwiki 문서 제목·목록은 `cengkeh` 를 "Salah"로 적음, enwikt 는 alternative form). 그러나 **KBBI VI 공식판 https://kbbi.kemendikdasmen.go.id/entri/cengkeh 는 `cengkeh` 를 비표준 표시(`→`, "bentuk tidak baku")가 아니라 뜻풀이 "n cengkih" 를 가진 표제어로 실음.** 최신 KBBI 기준으로 비표준이라고 확정하지 못함(검수자도 "재확인 권장") |
| 5-2 24~34 ⑬ | 29 식물·농업 | 53 | bibit (뜻·예문뜻) | 뜻 `모종/묘목`, 예문뜻 `볏모는 작은 모판에서 기른다.` | **출처가 제안과 다름.** 검수자는 "씨모는 남한 표준어가 아님(북한어)"이라 했으나 표준 https://stdict.korean.go.kr/search/searchResult.do?searchKeyword=씨모 에 `씨-모` 「명사」『농업』 "씨에서 싹이 터서 난 모"로 실려 있음(우리말샘도 일반어). 예문뜻 "볍씨 모종"이 어색한 것은 따로 볼 만함(`볏모` 는 표준국어대사전 표제어) |
| 5-2 24~34 ⑮ | 32 장소·여행 | 33 | vihara | `wihara` 로 | 주 표제어가 `wihara` 인 것은 맞음(KBBI 뜻풀이, idwiki 문서 제목 `Wihara`, enwikt). 그러나 KBBI VI https://kbbi.kemendikdasmen.go.id/entri/vihara 는 `vihara` 를 비표준 표시 없이 "n wihara" 로 싣고, idwiki 본문도 "Wihara atau vihara", 오류 목록에도 없음. **지금 표기가 틀렸다고 한 출처가 없음** |
| 5-3 표본 ⑥ | 38 교리·신학 | 21 | omnipresent | `omnipresen` 으로 | 두 출처 미달. `omnipresen` 은 KBBI("Entri tidak ditemukan")·sederet·KamusSABDA·enwikt 어디에도 없고, idwiki 에서만 넘겨주기(`Omnipresen` → `Maha Hadir`)와 본문 4건으로 확인됨. TB 본문에도 없음(SABDA 검색 0건). GotQuestions 인니어판은 `Mahahadir` 를 씀. 영어 철자가 인니어가 아닌 것은 분명하나 무엇으로 바꿀지는 원어민·교단 확인 |
| 5-3 표본 밖 ③ | 35 성경 핵심어 | 29 ↔ 75 | mujizat ↔ mukjizat | TB 표기 하나만 남김 | TB 가 `mujizat` 인 것은 확인(행 2:22 "mujizat-mujizat", sabda·bible.com 모두). 그러나 한 줄을 지우면 단어 수가 3,555 → 3,554 로 바뀌고(금지), 75행을 `mujizat` 로 고치면 같은 파일 안 표제어 중복이 됨. 75행을 다른 낱말로 바꾸는 것은 새 내용이라 결정 필요 |

### 2-2. 판단 필요 — 01~11 (16)

| 보고서 항목 | 파일·행 | 내용 | 보류 이유 |
|---|---|---|---|
| 판단 01~11 #1 | 05:25 ↔ 05:73 | `kemarin lusa` / `kemarin dulu` 둘 다 "그저께" | 고칠 방향이 제안되지 않음. 한 줄을 지우면 단어 수가 바뀜. KBBI 하위 표제어는 확인하지 못함 |
| 판단 01~11 #2 | 02:54 | `Sang Raja…` / "공의롭게" | EYD V `Kata Sandang si dan sang` 쪽은 본문이 스크립트로 실려 읽지 못함 → 출처 0곳 |
| 판단 01~11 #3 | 06:47, 06:48 | `gue`, `lo` 주의 표시 없음 | 표기 방침(주의 문구를 넣을지)이라 출처 확인 대상 아님 |
| 판단 01~11 #4 | 06:40, 06:42, 06:96 | `lebay`, `kepo`, `jutek` | 위와 같음 |
| 판단 01~11 #5 | 01:87 | `numpang tanya` | 굳은 표현으로 둘지의 방침 문제 |
| 판단 01~11 #6 | 02:95 | `sana-sini` | KBBI `sana` 항목에서 하위 표제어를 확인하지 못함(비로그인 화면에 안 나옴). 예문 교체도 필요해 단순 교정이 아님 |
| 판단 01~11 #7 | 05:33 | `sejak tadi` 예문 | 예문을 새로 써야 함 |
| 판단 01~11 #8 | 08:34 | `menarik napas` | 예문 선택 문제 |
| 판단 01~11 #9 | 08:93 | `memulai mesin` | 자연스러움 → 원어민 |
| 판단 01~11 #10 | 07:93 | `…licin dan bisa terpeleset` | 자연스러움 → 원어민 |
| 판단 01~11 #11 | 03:10 | `Bukannya minta maaf malah dia marah.` | 어순 → 원어민 |
| 판단 01~11 #12 | 08:75 | `dua file` | 영어 낱말을 둘지의 방침 문제 |
| 판단 01~11 #13 | 04:33, 05:59, 01:58 | `Hari kemerdekaan`, `Selamat tahun baru` | 대문자 규칙을 두 출처로 확인하지 못함 |
| 판단 01~11 #14 | 05:49 | `Umat Muslim` | 확인하지 못함 |
| 판단 01~11 #15 | 08:2 ↔ 34:27, 10:3 ↔ 23:37 | 거의 같은 예문 | 새 예문 필요 |
| 판단 01~11 #16 | 겹치는 표제어 10건 | 의도된 동음이의어, 다만 `memperbarui`(10:5 ↔ 38:81)는 뜻이 사실상 같음 | 한쪽을 지우면 단어 수가 바뀜. staff 에게만 두 줄이 함께 보이는 문제라 방침 결정 필요 |

### 2-3. 판단 필요 — 12~23 (11)

| 보고서 항목 | 파일·행 | 내용 | 보류 이유 |
|---|---|---|---|
| 판단 12~23 #1 | 14:4, 19:32, 19:33, 19:72, 19:73, 19:79 | "그/그녀" 섞임 | 통일 기준이 정해져야 함(출처 확인 대상 아님) |
| 판단 12~23 #2 | 17:63 `sate`, 19:62 `jenggot` | KBBI 표준형과 생활 표기 | KBBI VI 확인: `sate` = "n **cak** satai"(입말 표시), `jenggot` = "n janggut"(비표준 표시 없음). 간판 표기와의 선택 문제라 방침 결정 필요 |
| 판단 12~23 #3 | 22:83 `shift`, 22:27 `chef`, 21:62 `snorkeling`, 예문 속 `jazz`·`file`·`keyboard`·`celana jeans`·`HP` | 영어 원어 표기 | 방침 문제(어디까지 KBBI 형으로 바꿀지). 낱말별 확인은 하지 않음 |
| 판단 12~23 #4 | 18:26, 19:58 | 표제어가 파생형으로만 나오는 예문 | 예문 교체 필요 |
| 판단 12~23 #5 | 12:97, 12:98, 12:70, 21:13, 21:49, 21:64 | 06 밖 입말 표기 | 방침 문제 |
| 판단 12~23 #6 | 12:11, 20:31, 22:88 | 비교의 `dari` / `daripada` | 규범 확인을 두 출처로 하지 못함 |
| 판단 12~23 #7 | 12:51, 19:74, 23:82 | 부자연스러울 수 있는 예문 | 원어민 |
| 판단 12~23 #8 | 16:2, 17:65, 18:73, 18:5 | 뜻이 좁거나 다르게 읽힘 | 여러 낱말의 뜻 문구 선택(의견) |
| 판단 12~23 #9 | 14:46 ↔ 17:70, 19:35, 22:62 | Lebaran 번역이 "르바란"/"명절"로 갈림 | 번역 방침. 5-2 01~11 ⑭(07:53)와 34:31, 34:54 까지 한 번에 정할 일 |
| 판단 12~23 #10 | 23:67 | 의무 교육 12년 | 사실 확인 필요(법령 출처를 열지 못함) |
| 판단 12~23 #11 | 여러 쌍 | 비슷한 예문 | 새 예문 필요 |

### 2-4. 판단 필요 — 24~41 (19)

| 보고서 항목 | 파일·행 | 내용 | 보류 이유 |
|---|---|---|---|
| 판단 24~41 #1 | 34:29, 34:36, 34:31 | `Idul Fitri`·`Idul Adha`·`halal bihalal` | KBBI 붙여쓰기와 실생활 표기 사이의 방침. KBBI `Lebaran` 뜻풀이에 "Idulfitri"로 적혀 있는 것만 확인 |
| 판단 24~41 #2 | 34:41, 25:18 | `pendopo`, `bergotong-royong` | KBBI VI 는 `pendopo` 를 온전한 표제어로 실음(https://kbbi.kemendikdasmen.go.id/entri/pendopo) → 고칠 근거 약함. `bergotong royong` 은 KBBI 에 하이픈 없이 실림(한 출처만 확인) |
| 판단 24~41 #3 | 33:26, 27, 28, 34, 76 | 영어 그대로인 표제어 | 방침 문제 |
| 판단 24~41 #4 | 24:88 | BPJS 뜻 | 뜻 문구 선택 |
| 판단 24~41 #5 | 26:2 | 112 긴급번호 | 사실 확인 부탁 항목 |
| 판단 24~41 #6 | 26:13, 26:72 | "누전", "해결되었다" | 확인하지 않음 |
| 판단 24~41 #7 | 25:52, 53, 57, 47 | 행정 단위 뜻 | 뜻 문구 선택 |
| 판단 24~41 #8 | 27:32 | `memenangkan` / `memenangi` | 규범과 실제 쓰임이 갈림 |
| 판단 24~41 #9 | 34:65 | 종족 일반화 | 편집 판단 |
| 판단 24~41 #10 | 24:66, 25:50, 25:80, 26:21 | 명사 표제어에 동사 파생형 예문 | 예문 교체 필요 |
| 판단 24~41 #11 | 공개 01~34 | 기독교 문화 어휘 0건 | 소유자에게 묻는 항목(고칠 줄 없음) |
| 판단 24~41 #13 | 35:20 외 6곳 | `surga` ↔ TB `sorga` | **TB(1974)는 `sorga`** — 마 6:9 "Bapa kami yang di sorga" (https://alkitab.sabda.org/verse.php?book=Mat&chapter=6&verse=9 , https://www.bible.com/bible/306/MAT.6.9.TB 둘 다). KBBI 는 `sorga → surga`. "성경 용어는 TB 표기" 규칙을 그대로 적용하면 `sorga` 가 되는데, 6곳을 바꾸는 큰 변경이고 보고서도 판을 정해 달라는 항목이라 손대지 않음 |
| 판단 24~41 #14 | 35:27, 37:9, 36번 책 이름 | `iblis`/`Iblis`, `bait suci`/`Bait Suci`, 책 이름 형식 | TB 마 4:1 은 "dicobai **Iblis**"(sabda·bible.com 둘 다 대문자). `Bait Suci` 는 확인하지 않음. 세 가지가 묶인 항목이고 책 이름 형식은 정답이 하나가 아니라 부분만 고치지 않음 |
| 판단 24~41 #15 | 37:78 | `Minggu Sengsara` 뜻 | 교단 확인 |
| 판단 24~41 #16 | 38:5, 38:86 | `kehidupan yang penuh kekekalan`, `tribulasi` | 원어민·교단 |
| 판단 24~41 #17 | 39:15 | `koor` | KBBI VI 는 `koor` 를 온전한 표제어로 실음("kelompok paduan suara", https://kbbi.kemendikdasmen.go.id/entri/koor) → 고칠 근거 없음 |
| 판단 24~41 #18 | 40:2, 40:7, 40:64 | `sesama percaya`, `sidang jemaat` | 원어민·교단 |
| 판단 24~41 #19 | 40:34 ↔ 41:15 | Amanat Agung = 대위임령 / 지상명령 | 어느 쪽으로 맞출지 결정 필요 |
| 판단 24~41 #20 | 41:22, 35, 36, 60 | 호격·순서 표현 뒤 쉼표 없음 | 여러 줄에 쉼표를 넣는 일(따옴표 처리 포함). 줄별 제안이 없음 |

---

## 3. 이미 고침 / 해당 없음 (34)

### 3-1. 이미 고침 (3) — 지금 파일에서 확인

| 보고서 항목 | 파일 | 행 | 단어 | 지금 값 |
|---|---|---|---|---|
| 5-2 01~11 ⑤ | 07 이동·존재 | 95 | kehadiran | 뜻 `참석/출석` |
| 5-2 12~23 ⑥ | 20 쇼핑·돈 | 8 | menyewa | 뜻 `세내다/임차하다/빌리다`, 예문뜻 `그들은 도심에 아파트를 빌렸다.` |
| 5-2 12~23 ⑦ | 17 음식·요리 | 92 | bawang merah | 뜻 `샬롯 (작은 붉은 양파)`, 예문뜻 `샬롯을 얇게 썰어 주세요.` |

### 3-2. 해당 없음 — 판단 필요 중 조치 제안이 없는 것 (3)

| 보고서 항목 | 내용 | 이유 |
|---|---|---|
| 판단 12~23 #12 | 동음이의어 11쌍(의도 가능) | 뜻이 모두 다르다고 보고서가 판정. 고칠 것 없음 |
| 판단 24~41 #12 | 23:50 `ulangan` ↔ 36:72 `Ulangan` | 단어장이 달라 ID 충돌 없음. 스크립트 한계 보고일 뿐 |
| 판단 24~41 #21 | 39:57~68, 41:22~45 대문자 문장형 표제어 | 보고서가 "새 발견 아님(범위 밖으로 둔 것)"이라 적음 |

### 3-3. 해당 없음 — 기계 검사 표 (28): 판정이 "의도 가능/무관"이고 고칠 제안이 없는 행

**표제어 중복 표 (11)** — 모두 "동음이의·의도 가능". 작업 뒤에도 `check-wordlist.js` 동음이의어 20건 그대로.

| # | 표제어 | 위치 | 비고 |
|---|---|---|---|
| 1 | baru | 10:4 ↔ 13:86 | |
| 2 | biji | 04:81 ↔ 29:17 | |
| 3 | buah | 04:76 ↔ 17:12 | |
| 4 | bunga | 20:64 ↔ 29:14 | |
| 5 | gelas | 04:86 ↔ 18:33 | |
| 6 | menarik | 08:34 ↔ 12:33 | |
| 7 | menguap | 15:35 ↔ 30:47 | |
| 8 | piring | 04:87 ↔ 18:32 | 04:87 의 뜻 문구는 표 2-1(5-2 01~11 ⑫)에서 따로 다룸 |
| 9 | resep | 17:83 ↔ 24:62 | |
| 10 | tablet | 24:63 ↔ 33:23 | |
| 11 | tahu | 09:10 ↔ 17:68 | |

**성경·기독교 어휘 표 (17)** — 보고서 판정이 모두 "무관/일반 뜻/문화 어휘".

| # | 위치 | 걸린 말 | 판정 |
|---|---|---|---|
| 1 | 01:23 maaf | 죄(죄송) | 무관 |
| 2 | 01:24 mohon maaf | 죄(죄송) | 무관 |
| 3 | 01:25 maaf mengganggu | 죄(죄송) | 무관 |
| 4 | 01:70 saya tidak mengerti | 죄(죄송) | 무관 |
| 5 | 01:71 bisa diulang | 죄(죄송) | 무관 |
| 6 | 01:81 tidak bisa | 죄(죄송) | 무관 |
| 7 | 20:40 kembalian | 죄(죄송) | 무관 |
| 8 | 09:82 menyatakan | 죄(무죄) | 무관 |
| 9 | 10:11 kepercayaan | 믿음 | 일반 뜻 |
| 10 | 16:15 keyakinan | 믿음 | 일반 뜻 |
| 11 | 12:64 memuaskan | pelayanan | 일반 뜻(서비스) |
| 12 | 05:49 Jumat | beribadah, 예배 | 문화 어휘 |
| 13 | 19:31 sarung | beribadah, 예배 | 문화 어휘 |
| 14 | 19:34 mukena | 기도 | 문화 어휘 |
| 15 | 25:31 wajib | 기도 | 문화 어휘 (같은 줄의 `Sholat` 철자는 표 1 의 5-2 24~34 ③ 에서 고침) |
| 16 | 25:72 hak | beribadah, 예배 | 종교 일반(권리) |
| 17 | 34:9 masjid | 예배 | 문화 어휘 |

---

## 4. 원어민 확인이 필요한 단어장 항목

1. `Barangkali ada yang bisa membantu saya di sini.` (13:67) — 마침표로 끝나는 평서문이 자연스러운가요, 물음표를 붙인 질문이 자연스러운가요? 한국어 뜻은 지금 "혹시 … 계신가요?"(질문)입니다.
2. `Dia selalu optimis menghadapi tantangan.` / `Sikap pesimis tidak membantu menyelesaikan masalah.` (16:66, 16:67) — 일상 글에서 `optimis`·`pesimis` 를 형용사로 써도 자연스러운가요? 학습자에게 `optimistis`·`pesimistis` 로 가르쳐야 하나요?
3. `Dia menempel foto di dinding kamarnya.` (08:94) — `menempel` 을 "붙이다"(타동)로 쓴 문장이 자연스러운가요, `menempelkan` 이 더 낫나요?
4. `Ibu itu mengajar matematika di sekolah.` (10:2) — `Ibu itu` 가 "그 (여)선생님"으로 읽히나요, "그 아주머니"로 읽히나요?
5. `Vihara itu ramai saat Waisak.` (32:33), `Cengkeh dari Maluku terkenal di dunia.` (29:40) — 표제어를 KBBI 주 표제어 `wihara`·`cengkih` 로 바꾸면 어색한가요? 실제 간판·글에서는 어느 쪽이 보통인가요?
6. `Guru mengisi absensi sebelum pelajaran.` (23:73) — "출석부를 적는다"로 옮겼습니다. 교사가 이름을 부르는 것(출석을 부르다)도 이 말로 하나요? (KBBI 는 `absensi` 를 "ketidakhadiran" 으로만 싣는데 표제어 뜻은 "출석부/출결"입니다.)
7. `Renang adalah olahraga yang baik untuk punggung.` (21:91) — 여기서 `punggung` 은 등 전체인가요, 허리 건강을 말할 때도 쓰나요? ("등(허리)"로 옮겨 둠)
8. `Saya naik angkot dua kali untuk sampai ke pasar.` (31:34) — "앙콧을 두 번 탔다(= 한 번 갈아탔다)"로 읽는 것이 맞나요?
9. `Bibit padi disemai di petak kecil.` (29:53) — `bibit padi` 는 볍씨인가요, 어린 모(볏모)인가요? `disemai` 와 함께 쓰는 것이 자연스러운가요?
10. `Tekan tombol ini untuk memulai mesin.` (08:93) — `memulai mesin` 이 자연스러운가요? (`menyalakan`/`menghidupkan mesin`)
11. `Hati-hati, lantainya licin dan bisa terpeleset.` (07:93) / `Bukannya minta maaf malah dia marah.` (03:10) / `Dia mencari kuncinya sana-sini.` (02:95) — 세 문장의 어순·표현이 자연스러운가요?
12. `Sulit membedakan kedua kembar itu.` (12:51) / `Tolong pinjam sisirmu sebentar.` (19:74) / `Tolong pinjam pensilmu sebentar.` (23:82) — `kedua anak kembar itu`, `Boleh pinjam …?` 쪽이 더 자연스러운가요?
13. `Allah yang omnipresent hadir di mana-mana sekaligus.` (38:21) — 교회·신학교에서는 `omnipresen` 과 `mahahadir` 중 무엇을 쓰나요?
14. `Kita percaya akan kehidupan yang penuh kekekalan.` (38:5) / `bersekutu bersama sesama percaya` (40:2) / `Persekutuan antar sesama percaya` (40:7) — `kehidupan kekal`, `sesama orang percaya` 가 맞는 표현인가요?
15. `Sidang jemaat memutuskan pembangunan gedung.` (40:64) / `Minggu Sengsara` (37:78) — `sidang jemaat` 는 당회(임원 회의)인가요 회중인가요? `Minggu Sengsara` 는 고난 주간의 주일 하루인가요, 사순절 기간의 주일들인가요?
16. `Saudara-saudara terkasih mari kita membuka Alkitab kita.` / `Yang kedua firman ini mengajak kita bersyukur.` (41:22, 41:36) — 호격·순서 표현 뒤에 쉼표를 넣어야 하나요?

(소유자 결정 사항 — 원어민이 아니라 방침) TB 는 `sorga`·`Iblis`·`mujizat` 로 적습니다. 단어장은 `surga`(6곳)·`iblis`·`mujizat`+`mukjizat` 입니다. "TB 표기를 따른다"를 `surga`·`iblis` 에도 적용할지 정해 주셔야 합니다.

---

## 5. 생성·형식 검사 결과

| 검사 | 명령 | 결과 |
|---|---|---|
| 시드 | `node scripts/csv-to-seed.js` | `Seed generated: 41 categories, 3555 words.` (작업 전과 같음) |
| 단어장 점검 | `node scripts/check-wordlist.js` | `총 3555단어 / 중복 0건 / 동음이의어 20건 / 형식오류 0건` (작업 전과 같음) |
| 형식 (파이썬 `csv` 모듈, 41개 파일) | 스크래치패드 `wl/fmt.py` | `files=41 rows=3555 (01~34: 3005, 35~41: 550) bad_rows=0 CR_bytes=0 BOM_files=0 bad_final_newline=0` — 모든 행이 정확히 4열, 빈 칸·앞뒤 공백 0, CR 0 바이트, BOM 0, 끝 개행 정상, 파일 안 표제어 중복(소문자 비교) 0 |
| 그림 파일 | 같은 스크립트 | 34개 JSON 모두 파싱됨, CSV 표제어에 없는 그림 키 0개, CR 0 바이트 |
| 바뀐 양 | `git diff --numstat -- data/categories src/data/illust` | 34개 파일, +61 / −61 (기대값: CSV 51줄 + 그림 키 10줄 = 61) |

- 편집은 전부 Edit 도구로 했습니다(sed·heredoc·파이썬으로 CSV 를 다시 쓰지 않음). 파이썬은 읽기·검사에만 썼습니다.
- git 상태를 바꾸는 명령(add/commit/push/stash/checkout)은 실행하지 않았습니다.
- 하지 않은 검증: `npx tsc`, `npm run build`, `npx vitest run src/test/sharedIdMigration.test.ts` (지시 범위 밖. 작업 중 다른 파일들이 동시에 바뀌고 있어 제 변경만의 결과로 볼 수 없음).
- 보고서 항목은 아니지만 눈에 띈 것: 35:34 `Yesus berkata Akulah jalan kebenaran dan hidup.` 도 35:3 과 같은 쉼표 문제가 있습니다(손대지 않음).

### 폰에서 눈으로 볼 것

1. 단어장 10(접사 가족)·18·19·24·28·32·01 에서 표제어를 바꾼 단어(`memercayai`, `sakelar`, `ritsleting`, `strok`, `orang utan`, `kecoak`, `cecak`, `kelenteng`, `turut berdukacita`) 카드에 **색연필 그림이 그대로 붙어 있는지**.
2. 성경과 신앙 35 의 `Yesus`, `buah Roh` 예문에 쉼표가 보이고 따옴표(`"`)가 화면에 드러나지 않는지.
3. 41 의 `Imanuel`, 36 의 `Nikodemus` 가 단어장 목록과 학습·퀴즈 화면에서 대문자로 보이는지(위 "뒤따라야 할 일" 2번 — 소문자로 보이면 `wordCase.ts` 손질 필요).
