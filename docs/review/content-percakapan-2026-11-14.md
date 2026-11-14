> 2026-11-14 출시 전 점검 3차에서 만든 작업 결과표입니다. 요약과 항목별 처리 현황은 `prelaunch-2026-11-13-followup.md`, 원어민 확인 목록은 `native-check-2026-11-14.md` 를 보세요.
> 표 안의 "보류" 가운데 그 뒤 처리한 것이 있습니다(퍼즐 뜻 칸 9줄, 지도 사진 제외 목록, `orang utan` 표기, 표제어 19개의 ID 이전) — 최종 상태는 followup 문서가 기준입니다.

# 기본 회화집 고친 내역 (출시 전 점검 5-4)

- 대상: `src/data/percakapan/*.ts` (공개 14폴더 + staff 전용 `09-gereja.ts`) 와 같은 폴더의 `REVIEW-2026-11.md`
- 기준: 점검 보고서 5-4 (1130~1220행). 행 번호는 **고친 뒤 지금 파일 기준**이다(장면에 `rev` 줄을 넣어 보고서 번호보다 1~2행 밀린 곳이 있다).
- 표의 모든 칸은 **인도네시아어 원문을 먼저**, 한국어를 뒤에 적었다. 원어민에게 그대로 보여 줄 수 있다.
- 커밋·push 는 하지 않았다. 작업 폴더에만 반영돼 있다.

## 합계

| 층 | 보고서 행 수 | 고침(표 1) | 남김(표 2) | 손대지 않음(표 3) | 적용 못 함(표 4) |
|---|---|---|---|---|---|
| A층 | 12 | 12 | – | – | 0 |
| B층 | 20 | 19 (B-9 는 일부만) | – | – | 1 (B-12) |
| TTS 표기 | 18 | 4 | 14 (그중 3은 "문제 없음" 확인 항목) | – | 0 |
| 판단 필요 | 11 | – | – | 11 | – |
| 합계 | 61 | 35 | 14 | 11 | 1 |

TTS 항목은 보고서에 번호가 없어 나온 순서대로 TTS-1~18 을 붙였다.

바뀐 파일 14개, `git diff --stat -- src/data/percakapan` = **72줄 추가 / 56줄 삭제**.
`01-dasar` `02-perkenalan` `03-makan` `04-belanja` `05-transportasi` `06-penginapan` `07-sehari-hari` `08-kesehatan` `09-gereja` `10-kerja` `12-masalah` `14-hari-raya` `15-kantor` (.ts 13개) + `REVIEW-2026-11.md`.
`11-telepon.ts` `13-uang.ts` `index.ts` `types.ts` 는 그대로다.

## 1. 바꾼 줄 전부

| 보고서 항목 | 파일 · 장면 제목 · 몇 번째 줄 | 이전 (id / ko) | 이후 (id / ko) | 바꾼 이유 | 원어민에게 물을 것 |
|---|---|---|---|---|---|
| A-1 | `08-kesehatan.ts:43` · 약국에서 약 사기 · 5번째 줄 | `Nggak, cuma pusing aja.`<br>아니요, 그냥 어지럽기만 해요. | `Nggak, cuma pusing aja.` (그대로)<br>아니요, 머리만 아파요. | 앞 줄이 두통약·열 이야기라 여기 `pusing` 은 '머리가 아프다' | 이 흐름에서 `pusing` 을 '머리가 아프다'로 읽는 것이 맞는지 |
| A-2 | `07-sehari-hari.ts:44` · 세탁소에 빨래 맡기기 · 9번째 줄 | `Kaos merah itu agak luntur.`<br>저 빨간 티셔츠가 좀 물이 빠져요. | `Kaus merah itu agak luntur.`<br>(한국어 그대로) | KBBI 표준형, 단어장과 표기 통일 | 회화에서 `kaus` 로 적어도 어색하지 않은지(실생활은 `kaos` 가 흔함) |
| A-3 | `12-masalah.ts:123` · 쇼핑몰에서 아이를 잃어버렸을 때 · 5번째 줄 | `Kaos kuning, celana pendek biru.`<br>노란 티셔츠에 파란 반바지요. | `Kaus kuning, celana pendek biru.`<br>(한국어 그대로) | A-2 와 같음 | A-2 와 같음 |
| A-4 | `01-dasar.ts:15` · 처음 만나 인사 · 2번째 줄 | `Pagi! Maaf, kita baru pertama kali ketemu, ya?`<br>안녕하세요! 저희 처음 뵙는 거 맞죠? | (인니어 그대로)<br>안녕하세요! 실례지만, 우리 처음 뵙는 거 맞죠? | `Maaf` 가 번역에서 빠졌고 `kita` 는 '우리' | 없음(한국어만 바꿈) |
| A-5 | `15-kantor.ts:59` · 잃어버린 신분증(KTP) 다시 받기 · 4번째 줄 | `Bawa kartu keluarga juga?`<br>가족관계부(KK)도 가져오셨어요? | (인니어 그대로)<br>가족관계등록부(KK)도 가져오셨어요? | '가족관계부'는 없는 말. **선택**: 단어장 `25 행정·법률` 35·36행 표제어 `가족관계등록부` 에 맞춤(두 글자만 더함). 보고서 예시 `가족 카드(KK)` 는 쓰지 않음 | 없음. (주인 확인: `가족 카드(KK)` 쪽이 좋으면 이 줄만 바꾸면 됨. 단어장 43행 예문뜻은 아직 '가족 카드') |
| A-6 | `03-makan.ts:73`·`74` · 맵기와 양 부탁하기 · 11·12번째 줄 | `Terus tolong nggak pakai bawang, ya.` / `Oke, tanpa bawang.`<br>그리고 양파는 빼주세요. / 네, 양파 빼고요. | (인니어 그대로)<br>그리고 마늘·양파는 빼주세요. / 네, 마늘·양파 빼고요. | `bawang` 은 양파·마늘·샬롯을 아우름. **선택**: 한국어를 넓히는 쪽(인니어·소리를 안 건드림). 띄어쓰기는 같은 장면 70행 "빼주세요"에 맞춰 그대로 둠 | 식당에서 `nggak pakai bawang` 이라고 하면 보통 무엇을 빼 주는지(양파·마늘·튀긴 샬롯 모두인지) |
| A-7 | `02-perkenalan.ts:119` · 연락처 주고받기 · 5번째 줄 | `Bentar, aku catat dulu.`<br>잠깐만요, 저장할게요. | (인니어 그대로)<br>잠깐만요, 적어 둘게요. | `catat` 은 '적다'. 다음 줄 `simpan` 이 '저장하다' | 없음(한국어만 바꿈) |
| A-8 | `15-kantor.ts:128` · 증명사진 찍고 서류 복사하기 · 9번째 줄 | `Jangan, nanti nggak bisa dilegalisir.`<br>아니요, 코팅하면 원본 인증을 못 받아요. | `Jangan, nanti nggak bisa dilegalisasi.`<br>(한국어 그대로) | KBBI 표준형 `legalisasi`, 단어장 예문과 통일 | 손님 말투에서 `dilegalisasi` 가 딱딱하게 들리지 않는지(실생활은 `dilegalisir`). 바로 앞 줄 `dilaminating` 은 그대로 둠(판단 필요 8번) |
| A-9 | `14-hari-raya.ts:78` · 장례식에 조문하기 · 1번째 줄 | `Bu Rina, saya turut berduka cita atas meninggalnya Bapak.`<br>리나 씨, 아버님 일로 깊은 애도를 표합니다. | `Bu Rina, saya turut berdukacita atas meninggalnya ayah Ibu.`<br>(한국어 그대로) | KBBI 는 `berdukacita` 를 붙여 씀 (같은 줄에 B-13 도 함께 반영) | 붙여 쓴 `berdukacita` 가 화면에서 낯설지 않은지 |
| A-10 | `15-kantor.ts:114`(인니어 제목)·`120` · 증명사진 찍고 서류 복사하기 · 제목·1번째 줄 | 제목 `Pas Foto dan Fotokopi Dokumen` / `Mas, mau foto buat pas foto.`<br>증명사진 찍으려고요. | 제목 `Pasfoto dan Fotokopi Dokumen` / `Mas, mau foto buat pasfoto.`<br>(한국어 그대로) | KBBI 표제어 `pasfoto`. 장면 id `kantor-pas-foto` 는 그대로 | `pasfoto` 붙여쓰기가 맞는지(보고서도 "온라인 재확인 못 함") |
| A-11 | `09-gereja.ts:105` · 위로하고 함께 기도하기 · 14번째 줄 (staff 전용) | `Berikan damai sejahtera yang melampaui akal.`<br>모든 지각에 뛰어난 평강을 주소서. | `Berikan damai sejahtera yang melampaui segala akal.`<br>(한국어 그대로) | 빌립보서 4:7 TB "yang melampaui segala akal" — `segala` 가 빠져 있었음 | 없음(성경 본문 대조) |
| A-12 | `REVIEW-2026-11.md:56` | "기존 34장면은 줄이지 않았다." | "기존 40장면(공개 32 + gereja 8)은 줄이지 않았다." | 실제 옛 장면은 공개 32 + gereja 8 = 40. **선택**: 40 (같은 문서의 전체 94 − 새 54 와 맞음) | 없음(문서 숫자) |
| B-1 | `05-transportasi.ts:15` · Gojek·Grab 기사와 대화 · 1번째 줄 | `Halo, Bang. Yang pesan Grab atas nama Rina?`<br>여보세요, 기사님. 리나 이름으로 그랩 부른 거 맞죠? | `Halo, Bang. Grab atas nama Rina, ya?`<br>(한국어 그대로) | `yang pesan` 은 부른 사람(승객 자신)을 가리켜 승객 대사로 어색 | 승객이 기사에게 전화로 확인할 때 이 말이 자연스러운지 |
| B-2 | `05-transportasi.ts:25` · 같은 장면 · 11번째 줄 | `Bang, tolong pelan-pelan ya.`<br>기사님, 좀 천천히 가주세요. | `Bang, tolong hati-hati ya.`<br>기사님, 조심히 가주세요. | 두 줄 앞에서 급하다고 해 놓고 천천히 가 달라고 함. 한국어도 인니어에 맞춤 | 바로 다음 줄이 `Saya hati-hati kok` 라 `hati-hati` 가 두 줄 이어지는데 괜찮은지 |
| B-3 | `05-transportasi.ts:136`·`137`(제목)·옛 141~144행 · 오토바이 점검하기(옛 "주유하고 오토바이 점검하기") | 제목 `Isi Bensin dan Servis Motor` / 주유하고 오토바이 점검하기. 1~4번째 줄: `Bang, isi bensin full ya.` / `Pertalite atau Pertamax?` / `Pertamax aja.` / `Siap. Semuanya lima puluh ribu.`<br>기름 가득 넣어 주세요. / 뻐르딸리떼요, 뻐르따막스요? / 뻐르따막스로요. / 알겠습니다. 전부 5만이에요. | 제목 `Servis Motor` / 오토바이 점검하기. 주유 4줄 삭제. 첫 줄이 `Bang, ban belakang kayaknya kempes.` (뒷타이어가 바람 빠진 것 같아요)로 시작. 줄 수 15 → 11 | 주유소 직원은 정비를 안 하고 정비소는 주유를 안 함. **선택**: 주유 부분을 빼는 쪽(장면을 둘로 나누면 새 장면·새 문장이 필요). 제목에서도 주유를 뺌(`Isi Bensin dan` / "주유하고"만 지움) | ① 정비소(bengkel)에 들어가 첫마디로 `Bang, ban belakang kayaknya kempes.` 가 자연스러운지 ② 제목 `Servis Motor` 가 괜찮은지 ③ 주유가 빠졌는데 `Berapa kalau sekalian?`(같이 하면 얼마예요?)가 여전히 통하는지 |
| B-4 | `03-makan.ts:194` · 초대받아 집에서 식사하기 · 10번째 줄 | `Enak banget! Bumbunya dalam ya.`<br>진짜 맛있어요! 양념이 깊네요. | `Enak banget! Bumbunya meresap ya.`<br>진짜 맛있어요! 양념이 잘 배었네요. | "양념이 깊다"의 직역투. 한국어도 `meresap`(배다)에 맞춤 | 른당을 먹고 하는 말로 `Bumbunya meresap` 이 자연스러운지 |
| B-5 | `01-dasar.ts:144` · 헤어지며 인사하기 · 9번째 줄 | `Pesan Grab aja, udah aku pesan tadi.`<br>그랩 부르려고요, 아까 불렀어요. | `Naik Grab aja, udah aku pesan tadi.`<br>그랩 타고 가요, 아까 불러 놨어요. | 부르겠다는 말과 이미 불렀다는 말이 한 줄에 같이 있었음(보고서 제안 그대로) | `Naik Grab aja, udah aku pesan tadi.` 가 자연스러운지 |
| B-6 | `01-dasar.ts:91`·`92`·`93`·`95` · 고맙다고 인사하기 · 3·4·5·7번째 줄 | `Kalau nggak dibantu, aku pasti kesusahan.` / `Kebetulan aku lagi lewat aja kok.` / `Tetep aja, aku ngerasa nggak enak.` / `Lain kali aku traktir, ya.`<br>(한국어는 처음부터 존댓말) | `Kalau nggak dibantu, saya pasti kesusahan.` / `Kebetulan saya lagi lewat aja kok.` / `Tetep aja, saya ngerasa nggak enak.` / `Lain kali saya traktir, ya.`<br>(한국어 그대로) | 인니어는 친한 말(`aku`), 한국어는 존댓말이라 거리감이 다름. **선택**: 인니어 `aku`→`saya` 4곳(낱말 4개). 다른 안은 한국어 12줄을 모두 반말로 바꾸는 것 | ① `saya` 를 쓰면서 `Tetep aja`·`ngerasa`·`Kan kita temen` 같은 구어가 섞여도 자연스러운지 ② 오히려 `aku` 로 두고 한국어를 반말로 바꾸는 편이 나은지(주인 판단) |
| B-7 | `02-perkenalan.ts:120` · 연락처 주고받기 · 6번째 줄 | `Udah. Aku miscall ya, biar kamu simpan nomorku.`<br>됐어요. 제가 한 번 걸게요, 제 번호도 저장하시게요. | `Udah. Aku miscall ya, biar Mbak simpan nomor saya.`<br>(한국어 그대로) | 같은 상대를 `Mbak` 이라 부르다 `kamu` 로 내려감. 보고서 문구 `biar Mbak simpan nomor saya` 를 그대로 넣음 | **한 줄 안에 `Aku` 와 `nomor saya` 가 섞였다.** `…biar Mbak simpan nomorku.` 가 더 나은지. 같은 장면의 `aku catat`·`aku chat`·`nama aku`, 상대의 `kamu ada Instagram?` 과 어울리는지 |
| B-8 | `02-perkenalan.ts:27` · 가족에 대해 묻기 · 13번째 줄 | `Aku anak tunggal, jadi rumah sepi.`<br>저는 외동이라 집이 조용해요. | `Saya anak tunggal, jadi rumah sepi.`<br>(한국어 그대로) | 상대는 `saya`, 이쪽만 `Aku`. **선택**: 이 한 낱말을 `Saya` 로(반대쪽은 2곳을 바꿔야 함) | 처음 만난 사이라 `Saya` 로 맞추는 것이 맞는지 |
| B-9 (일부만) | `08-kesehatan.ts:75` · 병원에서 접수하기 · 10번째 줄 | `Nomor antre Anda dua belas.`<br>대기 번호가 12번이세요. | `Nomor antrean Bapak dua belas.`<br>(한국어 그대로) | ① 병원 창구는 `Anda` 보다 `Bapak/Ibu` ② `nomor antrean` 으로 통일(`15-kantor.ts:35`). **③ 은 적용하지 않음**: 보고서 문장 `Nomor antrean Bapak dua belas, kira-kira tiga puluh menit.` 을 그대로 넣으면 다음 두 줄(`Kira-kira berapa lama?` / `Sekitar tiga puluh menit.`)이 같은 말을 되풀이하게 되어 그 두 줄을 지워야 하는데, 보고서에 줄을 지우라는 말이 없어 줄 수(15)를 건드리지 않았다 | ① 환자가 남자일 때 `Bapak` 이 맞는지 ② 지금 흐름(`Antrenya lama nggak?` → `Nomor antrean Bapak dua belas.` → `Kira-kira berapa lama?` → `Sekitar tiga puluh menit.`)이 어색한지 — 어색하면 한 줄로 합치고 두 줄을 지움(주인 결정) |
| B-10 | `08-kesehatan.ts:120` · 병문안 가기 · 1번째 줄 | `Permisi, boleh masuk?`<br>실례합니다, 들어가도 돼요? | (인니어 그대로)<br>실례합니다, 들어가도 돼? | 3번째 줄부터 반말인데 첫 줄만 존댓말. 보고서 제안 `들어가도 돼?` 만 반영 | 없음. (주인 확인: 앞의 "실례합니다"는 존댓말 그대로다. "실례할게, 들어가도 돼?" 처럼 맞출지) |
| B-11 | `12-masalah.ts:43` · 휴대폰 화면이 깨졌을 때 · 8번째 줄 | `Aman, cuma ganti layar. Tapi sebaiknya di-backup dulu.`<br>괜찮아요, 화면만 가는 거예요. 그래도 먼저 백업하시는 게 좋아요. | `Aman, cuma ganti layar.`<br>괜찮아요, 화면만 가는 거예요. | 터치가 안 되는 폰은 손님이 백업할 수 없음 → 백업 문장만 뺌(줄 수는 그대로) | 없음(문장 삭제) |
| B-13 | `14-hari-raya.ts:78` · 장례식에 조문하기 · 1번째 줄 (A-9 와 같은 줄) | `…atas meninggalnya Bapak.`<br>리나 씨, 아버님 일로 깊은 애도를 표합니다. | `…atas meninggalnya ayah Ibu.`<br>(한국어 그대로) | `Bu Rina` 에게 `Bapak` 이라 하면 '남편'으로도 읽힘. **선택**: 인니어를 `ayah Ibu` 로(한국어 '아버님'은 뜻이 분명해 그대로). 이 줄은 A-9 로 어차피 소리를 새로 받음 | `ayah Ibu` 가 조문 인사로 자연스러운지(`ayahanda Ibu`, `Bapak Ibu` 등 더 알맞은 말이 있는지) |
| B-14 | `04-belanja.ts:21` · 시장에서 채소 사기 · 7번째 줄 | `Bayamnya seikat berapa?`<br>바얌(시금치 같은 채소) 한 단에 얼마예요? | `Bayamnya seikat berapa? Seikat juga, ya.`<br>바얌(시금치 같은 채소) 한 단에 얼마예요? 한 단도 주세요. | 산다는 말 없이 합계에 들어가 있었음(보고서 제안 문구 추가) | 값을 묻는 말 바로 뒤에 `Seikat juga, ya.` 를 붙이는 것이 자연스러운지. 고추 값(15,000)이 대사에 없다는 지적은 보고서에 고칠 문구가 없어 그대로 |
| B-15 | `07-sehari-hari.ts:106` · 미용실에서 머리 자르기 · 7번째 줄 | `Potong lima puluh ribu, keramas lima belas ribu.`<br>커트 5만, 샴푸 1만 5천이에요. | `Potong lima puluh ribu, keramas lima belas ribu. Jadi enam puluh lima ribu.`<br>커트 5만, 샴푸 1만 5천이에요. 그럼 6만 5천이에요. | 합계를 물었는데 합계가 없었음. 한국어는 같은 파일 38행(`Jadi …` = "그럼 …이에요")에 맞춤 | 없음(같은 파일에 같은 꼴의 문장이 있음) |
| B-16 | `06-penginapan.ts:79` · 관광지 입장권 사기 · 4번째 줄 | `Jadi delapan puluh ribu. Di sini bayarnya nontunai, ya, Pak.`<br>그럼 8만이에요. 여기는 현금 말고 카드나 QR로만 받아요. | (인니어 그대로)<br>그럼 8만이에요. 여기는 현금을 안 받아요. | '카드나 QR'은 원문에 없는 말 | 없음(한국어만 바꿈) |
| B-17 | `10-kerja.ts:17` · 회의 일정 잡기 · 4번째 줄 | `Rabu pagi Pak Hendra ada kunjungan ke pabrik.`<br>수요일 오전엔 헨드라 부장님이 공장 방문이 있으세요. | (인니어 그대로)<br>수요일 오전엔 헨드라 님이 공장 방문이 있으세요. | 직급('부장')은 원문에 없음 | 없음(한국어만 바꿈) |
| B-18 | `09-gereja.ts:97`·`98` · 위로하고 함께 기도하기 · 6·7번째 줄 (staff 전용) | `Iya, sampai akhir dia masih doain kami.` / `Sekarang dia sudah tenang bersama Tuhan.`<br>(아래 B-19 참고) | `Iya, sampai akhir beliau masih doain kami.` / `Sekarang beliau sudah tenang bersama Tuhan.` | 돌아가신 어머니를 가리킬 때는 `beliau` | 자기 어머니를 말할 때(6번째 줄, 자녀의 말)도 `beliau` 가 자연스러운지 |
| B-19 | `09-gereja.ts:92`~`103`·`106` · 같은 장면 · 1~12·15번째 줄의 **한국어만** (staff 전용) | `Aku turut berduka, ya.` 삼가 조의를 표해요. / `Makasih udah datang.` 와줘서 고마워요. / `Aku nggak tahu harus bilang apa.` 무슨 말을 해야 할지 모르겠어요. / `Nggak apa-apa, kehadiranmu aja udah cukup.` 괜찮아요, 와주신 것만으로 충분해요. / `Ibumu orang yang baik banget.` 어머님은 정말 좋은 분이셨어요. / (6번째) 네, 마지막까지 저희를 위해 기도하셨어요. / (7번째) 이제 주님 곁에서 평안하실 거예요. / `Aku percaya itu, tapi tetap berat.` 그렇게 믿어요, 그래도 힘드네요. / `Wajar kok. Nangis aja kalau mau.` 당연하죠. 울고 싶으면 우세요. / `Makasih ya, aku ngerasa lebih ringan.` 고마워요, 마음이 좀 가벼워졌어요. / `Boleh aku doakan kamu sekarang?` 지금 기도해 드려도 될까요? / `Boleh banget, tolong ya.` 그럼요, 부탁해요. / `Amin. Terima kasih banyak.` 아멘. 정말 감사합니다. | 인니어는 B-18·A-11 말고 그대로. 한국어: 나도 마음이 아파. / 와줘서 고마워. / 무슨 말을 해야 할지 모르겠어. / 괜찮아, 와준 것만으로 충분해. / 어머님은 정말 좋은 분이셨어. / 응, 마지막까지 우리를 위해 기도하셨어. / 이제 주님 곁에서 평안하실 거야. / 그렇게 믿어, 그래도 힘드네. / 당연하지. 울고 싶으면 울어. / 고마워, 마음이 좀 가벼워졌어. / 지금 기도해 줘도 될까? / 그럼, 부탁해. / 아멘. 정말 고마워. (기도문 두 줄 "…하소서 / …주소서"는 그대로) | 인니어는 `Aku`·`kamu`·`Ibumu`, 한국어는 전부 존댓말. **선택**: 한국어를 친구 말투로. 인니어를 격식체로 바꾸려면 `kamu`·`-mu` 대신 쓸 호칭을 새로 지어야 하는데 보고서에 없어 인니어는 건드리지 않음 | 원어민: 없음(한국어만). **주인 확인**: 한국어 13줄을 반말로 다시 썼다. 첫 줄 "삼가 조의를 표해요"는 반말로 옮길 수 없어 "나도 마음이 아파."로 풀었다. 존댓말이 더 낫다면 이 13줄을 되돌리고 인니어 호칭을 원어민과 정해야 한다 |
| B-20 | `09-gereja.ts:208` · 기도 부탁하기 · 13번째 줄 (staff 전용) | `Pasti. Saya juga doain kamu.`<br>그럼요. 저도 기도할게요. | `Pasti. Saya juga doain Mbak.`<br>(한국어 그대로) | `Mbak` 이라 부르다 `kamu` 로 내려감 | 상대(B)는 이쪽을 계속 `kamu` 라고 부른다(6·8번째 줄). 한쪽만 `Mbak` 이어도 자연스러운지 |
| TTS-3 | `05-transportasi.ts:76` · 기차표 사기 · 12번째 줄 | `Bisa, nomor 12A ya. Boleh lihat identitasnya?`<br>돼요, 12A로요. 신분증 좀 볼 수 있을까요? | `Bisa, nomor dua belas A ya. Boleh lihat identitasnya?`<br>(한국어 그대로) | 음성이 `12A` 를 다르게 읽을 수 있어 낱말로 풀어 씀(다른 숫자는 원래 모두 낱말) | 좌석 번호를 글로 `dua belas A` 라고 적어도 괜찮은지 |
| TTS-4 | `06-penginapan.ts:37` · 방에 문제가 있을 때 · 2번째 줄 | `Malam, Mbak. Saya di kamar 512. AC-nya nggak dingin.`<br>안녕하세요. 512호인데요, 에어컨이 시원하지 않아요. | `Malam, Mbak. Saya di kamar lima satu dua. AC-nya nggak dingin.`<br>(한국어 그대로) | 음성이 "lima ratus dua belas"로 읽을 수 있어 방 번호 읽기대로 풀어 씀 | 방 번호 512 를 `lima satu dua` 로 읽는 것이 맞는지(`lima dua belas` 도 쓰는지) |
| TTS-5 | `06-penginapan.ts:98` · 체크아웃하고 짐 맡기기 · 1번째 줄 | `Mbak, saya mau check-out. Kamar 305.`<br>체크아웃할게요. 305호예요. | `Mbak, saya mau check-out. Kamar tiga kosong lima.`<br>(한국어 그대로) | 위와 같음 | 305 를 `tiga kosong lima` 로 읽는 것이 맞는지(`tiga nol lima` 도 쓰는지) |
| TTS-6 | `03-makan.ts:48` · 음식 주문하기 · 11번째 줄 | `Saya ulang ya: nasi goreng ayam pakai telur, es teh manis, air putih.`<br>확인할게요: 치킨 나시고렝 계란 추가, 달콤한 아이스티, 물이요. | `Saya ulang ya, nasi goreng ayam pakai telur, es teh manis, air putih.`<br>(한국어 그대로) | 한 줄 듣기 요청문이 "콜론 뒤만 읽어라"여서 `Saya ulang ya` 가 빠질 수 있음 → 쉼표로 | 없음(문장 부호) |

소리를 새로 받게 `rev` 를 올린 장면 21개 (인니어 대사·줄 수가 바뀐 장면만): `dasar-terima-kasih` `dasar-pamit` `perkenalan-keluarga` `perkenalan-tukar-kontak` `makan-pesan` `makan-diundang` `belanja-pasar-sayur` `transportasi-ojol`(2→3) `transportasi-beli-tiket` `transportasi-bengkel` `penginapan-komplain-kamar` `penginapan-check-out` `sehari-hari-laundry` `sehari-hari-potong-rambut` `kesehatan-pendaftaran` `gereja-hibur-doakan` `gereja-minta-doa` `masalah-hp-rusak` `masalah-anak-hilang` `hari-raya-melayat` `kantor-pas-foto`. 나머지 20개는 새로 `rev: 2`.
한국어만 바꾼 장면(`dasar-kenalan` `makan-permintaan` `penginapan-tiket-wisata` `kesehatan-apotek` `kesehatan-jenguk` `kerja-atur-rapat` `kantor-ganti-ktp`)은 `rev` 를 건드리지 않았다.

## 2. TTS 표기 의심 — 고치지 않고 남긴 것

보고서가 "맞는 읽기"만 적고 바꿔 쓸 표기를 주지 않은 것들이다. 인니어 줄은 화면에도 그대로 보이므로, 소리 나는 대로(`ha-pe`, `we-a`) 바꿔 쓰면 학습자가 보는 글이 틀어진다. 실기기에서 들어 보고 정할 항목이다. 행 번호는 **보고서 기준**(일부 파일은 지금 1~2행 밀려 있다).

| 항목 | 위치(보고서 기준) | 인니어 표기 | 맞는 읽기 · 우려 | 남긴 이유 |
|---|---|---|---|---|
| TTS-1 | 전체 | 가장 긴 줄 95자, 장면 최대 약 634자 | 서버 한도 6000자 안. 초과 없음 | 문제 없음(확인만). 이번에 길어진 줄(B-15 약 75자)도 기존 최장 95자보다 짧다 |
| TTS-2 | 전체 | 인니어 줄 안 한글·괄호 설명 0건 | – | 문제 없음(확인만) |
| TTS-7 | `14-hari-raya.ts:63` | `"Selamat, ya. Semoga langgeng." Itu udah cukup.` | 따옴표가 들어간 줄. 음성 영향 없을 것으로 봄 | 바꿀 표기 없음 |
| TTS-8 | `05-transportasi.ts:91` | `Bundaran HI` | "ha-i" — 영어 "hi"로 읽힐 위험이 가장 큼 | 고유 지명 표기. 들어 보고 정할 것 |
| TTS-9 | `02-perkenalan.ts:114`, `07-sehari-hari.ts:65`, `11-telepon.ts:81`, `13-uang.ts:41` | `WA` | "we-a" | 바꿀 표기 없음 |
| TTS-10 | `12-masalah.ts:35`·`104` | `HP` | "ha-pe" | 바꿀 표기 없음(다른 장면의 `hape` 와 섞여 있음 — 판단 필요 8번) |
| TTS-11 | `05-transportasi.ts:98`, `06-penginapan.ts:36`, `07-sehari-hari.ts:56`·`58`·`61` | `AC` | "a-se" | 바꿀 표기 없음 |
| TTS-12 | `07-sehari-hari.ts:21`·`22`, `15-kantor.ts:14`·`20`·`21`·`37` | `RT` / `RW` | "er-te" / "er-we" | 바꿀 표기 없음 |
| TTS-13 | `03-makan.ts:114`·`22`·`23`, `04-belanja.ts:102`, `06-penginapan.ts:79` | `QRIS` / `QR` | "kris" / "ki-er" | 바꿀 표기 없음 |
| TTS-14 | `04-belanja.ts:99` | `COD` | "se-o-de" | 바꿀 표기 없음 |
| TTS-15 | `15-kantor.ts:98`·`99`·`101`·`105` | `SIM`, `SIM A` | 낱말 "sim" + "a" | 바꿀 표기 없음 |
| TTS-16 | `15-kantor.ts:56`·`101`, `13-uang.ts:17`·`21`·`36`·`56`, `08-kesehatan.ts:68`·`104`, `14-hari-raya.ts:41`, `12-masalah.ts:36`·`77`, `02-perkenalan.ts:19`, `04-belanja.ts:83`, `11-telepon.ts:37` | `KTP` `NPWP` `BPJS` `THR` `PLN` `BCA` `ATM` `LCD` `USG` `SMA` `PIN` `VIP` | 낱자 읽기 | 바꿀 표기 없음 |
| TTS-17 | `11-telepon.ts:40`, `04-belanja.ts:35`, `08-kesehatan.ts:50` 등 | `Lee`, `ukuran L`, `Vitamin C dan zinc`, 붙임표 꼴(`AC-nya` `LCD-nya` `SIM-nya` `THR-nya` `Wi-Fi-nya` `PIN-nya` `link-nya` `username-nya` `boarding pass-nya`) | 읽기가 흔들릴 수 있음 | 바꿀 표기 없음. (`di-backup` 은 B-11 로 문장째 없어짐) |
| TTS-18 | 전체 | `Rp` 0건, 퍼센트·도(°)·슬래시 0건 | – | 문제 없음(확인만) |

## 3. 판단 필요 — 손대지 않은 것

| 번호 | 위치(보고서 기준) | 인니어 · 내용 | 물을 것 / 정할 것 | 이번 수정과 겹친 점 |
|---|---|---|---|---|
| 1 | `01-dasar.ts:16`·`40~47`, `09-gereja.ts:16` | `Nama saya Arga.` / `Saya tinggal di daerah Depok, dekat stasiun.` / `Saya tiga puluh delapan tahun.` / `Istri saya juga orang Korea.` / `Saya kerja di perusahaan Korea, bagian ekspor.` | 개발자 본인 신상으로 보이면 공개판에 그대로 둘지(주인 판단) | 없음 |
| 2 | `05-transportasi.ts:64~77` | `Mbak, mau beli tiket ke Yogya.` … `Besok pagi…` — 역 창구에서 다음 날 표를 삼 | 지금도 KAI 창구에서 다음 날 표를 살 수 있는지 | 같은 장면의 `12A` 만 TTS-3 으로 풀어 씀 |
| 3 | `04-belanja.ts:79` | `Kantong plastiknya mau beli? Dua ribu satu.` | 마트 비닐봉지 판매 설정이 맞는지(도시에 따라 금지) | 없음 |
| 4 | `07-sehari-hari.ts:77` | `Bu, galon air satu sama gas tiga kilo, ya.` | 보조금 LPG 3kg 를 동네 가게에서 배달받는 설정이 지금도 맞는지 | 없음 |
| 5 | 장면 제목 "Gojek·Grab 기사와 대화", `Grab`, `Hotel Santika … dekat Bundaran HI`, `BCA`, `Pertalite/Pertamax`, `Transjakarta`, `Zoom`, `Instagram` | 실제 상호·상표 | 스토어 앱의 장면 제목·대사에 남의 상표를 둘지 | `Pertalite`/`Pertamax` 두 줄은 B-3 로 없어졌다. `Grab` 은 B-1·B-5 로 문장이 바뀌었지만 상표는 그대로 있다 |
| 6 | `14-hari-raya.ts:19` "끄뚜팟", `03-makan.ts:137`·`139` "론똥" ↔ 단어장 "크투팟"·"론통" | `ketupat`, `lontong` 의 한글 표기 | 된소리/예사소리 표기를 어느 쪽으로 통일할지 | 예로 든 "뻐르따막스"는 B-3 로 없어졌다 |
| 7 | `04-belanja.ts:99` | `Ini COD ya, Bu.` / 착불(COD)이에요. | '착불' 대신 "받을 때 결제(COD)"로 바꿀지 | 없음 |
| 8 | `15-kantor.ts:126`·`19`, `01-dasar.ts:115`, `02-perkenalan.ts:92` | `dilaminating`, `sudah saya tanda tangan dan cap`, `Hape`/`hape` | 구어 비표준형을 둘지 | `dilaminating` 바로 다음 줄의 `dilegalisir` 는 A-8 로 `dilegalisasi` 가 됐다. 한 장면 안에 비표준(`dilaminating`)과 표준(`dilegalisasi`)이 나란히 있다 |
| 9 | `08-kesehatan.ts:89` 등 | 난이도 '상' 1개, '하' 0개 | 난이도 값을 손볼지(지금 화면에 안 보임) | 없음 |
| 10 | `13-uang.ts:78`·`80` | 환율 숫자(1,000원 = 11,500루피아, 1달러 = 16,200루피아) | 시세라 낡는 숫자를 둘지 | 없음 |
| 11 | `15-kantor.ts:31` "동사무소 직원" ↔ `15-kantor.ts:52` "주민센터 직원" | 역할 이름 | 어느 쪽으로 통일할지 | 없음 |

## 4. 보고서 항목인데 적용하지 못한 것

| 보고서 항목 | 위치 | 지금 문장 (id / ko) | 보고서 제안 | 적용하지 못한 이유 |
|---|---|---|---|---|
| B-12 | `12-masalah.ts:126`~`128` · 쇼핑몰에서 아이를 잃어버렸을 때 · 8~10번째 줄 | `Saya umumkan lewat pengeras suara, pintu keluar juga kami jaga.` / `Namanya Juna. Tolong cepat, ya, Pak.` / `Bu, itu dia! Sudah ketemu sama satpam di lantai dua.`<br>안내 방송을 하고, 출입구도 지키도록 할게요. / 이름은 주나예요. 빨리 부탁드려요. / 저기 있네요! 2층 경비원이 찾았대요. | "사이에 한 줄(무전 연락 등)" | 넣을 인니어 문장이 보고서에 없다. 새 문장을 지어 넣는 것은 "보고서 밖의 개선을 만들지 말 것"에 어긋나 넣지 않았다. 원어민에게 물을 후보(코드에는 없음): 9번째 줄 뒤에 경비원 대사 `Sebentar, Bu, saya hubungi petugas lain lewat radio.` (잠깐만요, 무전으로 다른 직원에게 연락할게요.) 그리고 마지막 줄 `ketemu sama satpam` 이 '경비원을 만났다'로도 읽힌다는 지적도 바꿀 문구가 없어 그대로다(후보: `Sudah ditemukan satpam di lantai dua.`) |

부분 적용 1건은 표 1 의 B-9 에 적었다(호칭·낱말만 고치고, 두 줄을 한 줄로 합치는 것은 줄을 지워야 해서 보류).

## 5. 소리 캐시 키 — 줄을 고치면 새 소리가 나오는가

결론: **글자를 고쳐도 키는 저절로 바뀌지 않는다. 장면마다 `rev` 를 올려야 한다.** (이번에 올렸다)

- `src/lib/percakapanAudio.ts:282~284` `revPart(scene)` — `scene.rev` 가 있으면 `"::r" + rev`, 없으면 빈 문자열
- `src/lib/percakapanAudio.ts:286~288` 전체 듣기 키 = `"all::" + 장면 id + revPart + "::" + 줄 수`
- `src/lib/percakapanAudio.ts:290~292` 한 줄 듣기 키 = `"line::" + 장면 id + revPart + "::" + 줄 번호 + "::" + 화자 이름`
- 키에 **대사 글자는 들어가지 않는다.** 그래서 글자만 고치면 폰의 IndexedDB(`kata-percakapan-audio`)에 받아 둔 옛 소리가 계속 나온다.
- 줄 수가 바뀌면 전체 듣기 키는 저절로 달라지지만, 한 줄 듣기는 줄 번호가 밀려 **다른 문장의 옛 소리**가 나온다(B-3 가 이 경우). 그래서 줄 수가 바뀐 장면도 `rev` 가 필요하다.
- `rev` 는 데이터 쪽 선택 필드다(`src/data/percakapan/types.ts:43~47`). 전역 버전 상수는 없다. `percakapanAudio.ts` 는 고치지 않았다.
- 서버(`workers/kata-public/worker.js`)에서 소리를 저장해 두는 코드는 찾지 못했다(`cache`·`KV` 검색으로 확인, 전체 정독은 아님). 서버 쪽에서 비울 캐시는 없는 것으로 본다.
- 한국어만 고친 줄은 소리와 상관없다(음성은 인니어 `id` 만 읽는다).
- 영향: `rev` 를 올린 21개 장면은 다음에 들을 때 소리를 한 번 새로 만든다(공개판은 `shared-audio` 사용량).

## 6. 검증과 남긴 판단

- `npx tsc --noEmit -p tsconfig.app.json` → 종료 코드 0 (`src/data/seed.json` 은 이미 있어서 다시 만들지 않음)
- 없어야 정상인 말 검색(대소문자 구분, `src/data/percakapan/*.ts`): `Kaos` `dilegalisir` `berduka cita` `Pas Foto`/`pas foto` `antre Anda` `Bumbunya dalam` `pelan-pelan` `Yang pesan Grab` `di-backup` `Pertamax` `isi bensin`, 그리고 인니어 줄 안 아라비아 숫자 → **모두 0건**
- 장면 수: `cat: "` 등장 94회 (전과 같음). 장면 id·화자·줄 순서는 바꾸지 않았다. 줄 수가 바뀐 장면은 `transportasi-bengkel` 하나(15 → 11).
- 줄바꿈: Edit 도구가 `02-perkenalan.ts` 와 `09-gereja.ts` 를 CRLF 로 다시 써서(CR 155개·214개) diff 가 파일 전체로 잡혔다. 내용 편집은 모두 Edit 도구로 했고, **이 두 파일의 줄바꿈 바이트만** 저장소 밖 파이썬 스크립트로 LF 로 되돌렸다. 지금 `src/data/percakapan/` 의 모든 파일은 CR 0개이고, diff 는 의도한 줄만 남는다.
- `REVIEW-2026-11.md` 는 A-12(56행 숫자)만 고쳤다. 그 문서의 "기존 장면에서 고친 것" 표에는 이번 `rev` 변경이 적혀 있지 않고, "교회와 신앙 8장면은 … 고칠 곳이 없었다"(62행)와 "기존 장면 줄 수 12~16줄"(56행, `transportasi-bengkel` 이 11줄이 됨)이 지금 상태와 어긋난다. 문서를 더 손보는 것은 지시에 없어 두었다.
