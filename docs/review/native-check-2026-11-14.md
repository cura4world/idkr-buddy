# 원어민 확인 목록 (2026-11-14, 출시 전 점검 3차)

이번에 고친 인도네시아어 문장과, 고치지 않고 남겨 둔 물음을 한곳에 모았습니다. **인도네시아어 원문이 먼저** 나옵니다.
원어민(또는 인도네시아어 교사)께 이 파일을 그대로 보여 드리고, 어색한 줄만 표시해 달라고 하면 됩니다.

- 고친 근거와 출처는 같은 폴더의 `content-wordlist-2026-11-14.md` · `content-percakapan-2026-11-14.md` · `content-knowledge-2026-11-14.md` 에 있습니다.
- 답을 받으면 Claude 에게 "원어민 확인 결과 반영"이라고 하고 표시한 줄을 알려 주세요. 회화 문장을 고치면 그 장면의 소리도 새로 만들어집니다(`rev` 올림).

| 구역 | 확인할 것 | 수 |
|---|---|---|
| 1 | 기본 회화집 — 이번에 바꾼 줄 전부 | 35행 |
| 2 | 기본 회화집 — 고치지 못하고 남긴 것(문장을 새로 지어야 함) | 1건 + 일부 적용 1건 |
| 3 | 단어장 — 예문·표기 물음 | 16건 |
| 4 | 단어장 — 표제어 표기를 바꾼 낱말 | 19개 |
| 5 | 지도·인도네시아 이해 — 새로 쓰거나 고친 예문 | 8문장 |
| 6 | 회화집 — 읽는 소리(TTS) 표기가 의심스러워 남긴 것 | 14건 |

## 1. 기본 회화집 — 이번에 바꾼 줄 전부

"이전 → 이후"에서 인도네시아어가 바뀐 줄은 문장 자체를, 한국어만 바뀐 줄은 뜻이 맞는지를 봐 주세요.

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

## 2. 기본 회화집 — 고치지 못하고 남긴 것

| 보고서 항목 | 위치 | 지금 문장 (id / ko) | 보고서 제안 | 적용하지 못한 이유 |
|---|---|---|---|---|
| B-12 | `12-masalah.ts:126`~`128` · 쇼핑몰에서 아이를 잃어버렸을 때 · 8~10번째 줄 | `Saya umumkan lewat pengeras suara, pintu keluar juga kami jaga.` / `Namanya Juna. Tolong cepat, ya, Pak.` / `Bu, itu dia! Sudah ketemu sama satpam di lantai dua.`<br>안내 방송을 하고, 출입구도 지키도록 할게요. / 이름은 주나예요. 빨리 부탁드려요. / 저기 있네요! 2층 경비원이 찾았대요. | "사이에 한 줄(무전 연락 등)" | 넣을 인니어 문장이 보고서에 없다. 새 문장을 지어 넣는 것은 "보고서 밖의 개선을 만들지 말 것"에 어긋나 넣지 않았다. 원어민에게 물을 후보(코드에는 없음): 9번째 줄 뒤에 경비원 대사 `Sebentar, Bu, saya hubungi petugas lain lewat radio.` (잠깐만요, 무전으로 다른 직원에게 연락할게요.) 그리고 마지막 줄 `ketemu sama satpam` 이 '경비원을 만났다'로도 읽힌다는 지적도 바꿀 문구가 없어 그대로다(후보: `Sudah ditemukan satpam di lantai dua.`) |

부분 적용 1건은 표 1 의 B-9 에 적었다(호칭·낱말만 고치고, 두 줄을 한 줄로 합치는 것은 줄을 지워야 해서 보류).

## 3. 단어장 — 예문·표기 물음

괄호 안 숫자는 단어장 번호:줄 번호입니다(예: 13:67 = 13번 단어장 67번째 줄).

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

## 4. 단어장 — 표제어 표기를 바꾼 낱말 (19개)

사전(KBBI)과 성경(TB) 표기에 맞춰 바꿨습니다. 실제 생활에서 어느 쪽을 더 쓰는지, 학습자에게 이 표기로 가르쳐도 되는지 봐 주세요.

| 단어장 | 이전 | 이후 |
|---|---|---|
| 01 인사·기본 표현 | `turut berduka cita` | `turut berdukacita` |
| 10 접사 가족 | `mempercayai` | `memercayai` |
| 10 접사 가족 | `mempercayakan` | `memercayakan` |
| 18 집·생활용품 | `saklar` | `sakelar` |
| 19 옷·외모 | `resleting` | `ritsleting` |
| 24 의료·병원 | `stroke` | `strok` |
| 28 동물 | `orangutan` | `orang utan` |
| 28 동물 | `kecoa` | `kecoak` |
| 28 동물 | `cicak` | `cecak` |
| 32 장소·여행 | `klenteng` | `kelenteng` |
| 35 성경 핵심어 | `injil` | `Injil` |
| 36 성경 인물·지명 | `Noach` | `Nuh` |
| 36 성경 인물·지명 | `Nikodem` | `Nikodemus` |
| 36 성경 인물·지명 | `Yordania` | `Yordan` |
| 38 교리·신학 | `antiKristus` | `antikristus` |
| 38 교리·신학 | `anthropologi teologi` | `antropologi teologis` |
| 38 교리·신학 | `buku kehidupan` | `kitab kehidupan` |
| 38 교리·신학 | `millenium` | `milenium` |
| 41 설교 표현 | `imanuel` | `Imanuel` |

지도 원고의 `orangutan` 두 곳도 `orang utan` 으로 맞췄습니다(부킷 라왕 단어, 칼리만탄 예문 `Dia meneliti orang utan selama puluhan tahun.`).

## 5. 지도·인도네시아 이해 — 새로 쓰거나 고친 예문과 사람이 읽고 정할 문장

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

## 6. 회화집 — 읽는 소리(TTS) 표기가 의심스러워 남긴 것

화면에 보이는 글을 바꾸지 않고는 고칠 수 없어 남긴 것입니다. 폰에서 그 장면을 들어 보고 이상하게 읽히는 것만 알려 주세요.

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

