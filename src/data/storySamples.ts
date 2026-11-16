// src/data/storySamples.ts
// 맛보기 이야기 3편 (하·중·상 한 편씩) — 무료 사용자에게 열어 두는 이야기입니다(2026-11-16 사용자 결정).
// 새 이야기 불러오기는 Plus 전용이 되었고, 무료 사용자는 이 세 편으로 "단어를 누르면 뜻이 나오는" 읽기를 맛봅니다.
// - 앱 안에 들어 있어 AI 를 부르지 않고(비용 0) 인터넷 없이도 열립니다. 단어 뜻 보기는 다른 이야기와 같이 단어 조회를 씁니다.
// - Plus 사용자에게는 보이지 않습니다(자기 이야기가 있음). 신고 단추도 달지 않습니다(사람이 쓰고 확인한 글).
// - "Pagi di Pasar" 는 스토어 스크린샷용으로 썼던 글(run9)에 두 문장을 더해 하 분량(80단어 남짓)에 맞춘 것,
//   나머지 두 편은 2026-11-16 에 새로 씀(중 110~150, 상 150~190단어 — lib/story.ts 의 DIFF_INFO 와 같은 기준).
//   세 편 모두 원어민 확인 목록(docs/review/native-check-2026-11-14.md 의 맛보기 이야기 절)에 올렸습니다.
// - 글을 고치면 id 는 그대로 두어도 됩니다(맛보기는 음성을 만들지 않으므로 캐시 키가 없음).

import type { StoryRecord } from "@/lib/storyStore";

export const SAMPLE_ID_PREFIX = "sample-";

export const isSampleStory = (id: string | undefined | null): boolean =>
  !!id && id.indexOf(SAMPLE_ID_PREFIX) === 0;

export const STORY_SAMPLES: StoryRecord[] = [
  {
    id: "sample-pasar",
    createdAt: 0,
    title: "Pagi di Pasar",
    titleKo: "시장의 아침",
    category: "인도네시아 생활",
    difficulty: "하",
    indonesian:
      "Setiap hari Sabtu, Rina pergi ke pasar bersama ibunya. Mereka berangkat pagi-pagi karena udara masih sejuk dan sayurnya masih segar.\n\n" +
      "Di pasar, Ibu membeli bayam, tomat, dan ikan. Ibu juga menawar harga dengan penjual sayur. Rina membantu membawa tas belanja. Seorang penjual buah tersenyum dan memberi Rina sepotong mangga. “Manis sekali!” kata Rina.\n\n" +
      "Sebelum pulang, mereka minum es kelapa muda di warung kecil. Bagi Rina, pasar bukan hanya tempat berbelanja, tetapi juga tempat bertemu orang-orang yang ramah. Rina sudah tidak sabar menunggu hari Sabtu berikutnya.",
    korean:
      "토요일마다 리나는 어머니와 함께 시장에 갑니다. 공기가 아직 시원하고 채소가 싱싱해서 두 사람은 아침 일찍 집을 나섭니다.\n\n" +
      "시장에서 어머니는 시금치와 토마토, 생선을 삽니다. 어머니는 채소 장수와 값을 흥정하기도 합니다. 리나는 장바구니 드는 것을 돕습니다. 과일 장수가 웃으며 리나에게 망고 한 조각을 줍니다. “정말 달아요!” 리나가 말합니다.\n\n" +
      "집에 돌아가기 전에 두 사람은 작은 가게에서 코코넛 얼음 음료를 마십니다. 리나에게 시장은 장을 보는 곳일 뿐 아니라 친절한 사람들을 만나는 곳입니다. 리나는 벌써 다음 토요일이 기다려집니다.",
    background: [
      {
        heading: "재래시장",
        body: "인도네시아의 재래시장(pasar tradisional)은 이른 아침이 가장 붐빕니다. 그날 들어온 채소와 생선을 사려는 사람들이 해가 뜰 무렵부터 모입니다.",
      },
      {
        heading: "es kelapa muda",
        body: "어린 코코넛의 물과 속살에 얼음을 넣은 음료입니다. 더운 날 시장이나 길가 가게에서 흔히 마십니다.",
      },
    ],
  },
  {
    id: "sample-hujan",
    createdAt: 0,
    title: "Hujan Sore di Jakarta",
    titleKo: "자카르타의 오후 비",
    category: "인도네시아 생활",
    difficulty: "중",
    indonesian:
      "Sore itu, Budi baru keluar dari kantornya ketika langit tiba-tiba menjadi gelap. Tidak lama kemudian, hujan turun dengan deras. Jalan-jalan mulai tergenang air, dan kendaraan bergerak sangat pelan.\n\n" +
      "Budi ingin memesan ojek online, tetapi aplikasinya menunjukkan bahwa semua pengemudi sedang sibuk. Akhirnya, ia memutuskan untuk menunggu di sebuah warung kopi di dekat kantor. Pemilik warung menyambutnya dengan ramah dan menawarkan segelas teh manis panas.\n\n" +
      "Sambil menunggu hujan reda, Budi mengobrol dengan beberapa orang yang juga berteduh di sana. Mereka bercerita tentang pekerjaan, keluarga, dan banjir tahun lalu. Satu jam kemudian, hujan berhenti. Budi pulang dengan hati yang hangat. Ternyata, hujan sore tidak selalu membawa kesulitan. Kadang-kadang hujan juga mempertemukan kita dengan teman baru.",
    korean:
      "그날 오후, 부디가 막 사무실을 나섰을 때 하늘이 갑자기 어두워졌습니다. 얼마 지나지 않아 비가 세차게 쏟아졌습니다. 길에는 물이 고이기 시작했고, 차들은 아주 느리게 움직였습니다.\n\n" +
      "부디는 앱으로 오토바이 택시(오젝)를 부르려 했지만, 앱에는 모든 기사가 바쁘다고 나왔습니다. 결국 그는 사무실 근처의 작은 커피 가게에서 기다리기로 했습니다. 가게 주인은 반갑게 맞아 주며 뜨겁고 달콤한 차 한 잔을 권했습니다.\n\n" +
      "비가 그치기를 기다리면서 부디는 그곳에서 함께 비를 피하던 몇몇 사람들과 이야기를 나누었습니다. 그들은 일과 가족, 그리고 작년의 홍수에 대해 이야기했습니다. 한 시간 뒤 비가 멈췄습니다. 부디는 따뜻한 마음으로 집에 돌아갔습니다. 오후의 비가 늘 어려움만 가져오는 것은 아니었습니다. 때로는 비가 새 친구를 만나게 해 주기도 합니다.",
    background: [
      {
        heading: "우기의 오후 비",
        body: "인도네시아는 대략 11월부터 3월 무렵이 우기입니다. 이때는 오후에 굵은 비가 갑자기 쏟아졌다가 한두 시간 만에 그치는 일이 흔해서, 사람들은 가까운 가게나 처마 밑에서 잠시 비를 피합니다. 이렇게 비를 피하는 것을 berteduh라고 합니다.",
      },
      {
        heading: "오젝(ojek)",
        body: "오토바이 뒤에 손님을 태우는 교통수단입니다. 지금은 앱으로 부르는 ojek online(줄여서 ojol)이 널리 쓰여, 길이 막히는 도시에서 빨리 이동하거나 음식을 배달받을 때 많이 이용합니다.",
      },
      {
        heading: "teh manis",
        body: "인도네시아 식당에서 차를 시키면 보통 설탕을 넣은 달콤한 차가 나옵니다. 설탕 없는 차를 원하면 teh tawar라고 따로 말해야 합니다.",
      },
    ],
  },
  {
    id: "sample-batik",
    createdAt: 0,
    title: "Batik: Kain yang Bercerita",
    titleKo: "바틱: 이야기를 담은 천",
    category: "인도네시아 문화",
    difficulty: "상",
    indonesian:
      "Batik adalah salah satu warisan budaya Indonesia yang paling terkenal. Kata “batik” sering dikaitkan dengan kata dalam bahasa Jawa yang berarti menulis titik-titik kecil. Untuk membuat batik tulis, perajin menggambar motif di atas kain dengan canting, yaitu alat kecil berisi malam atau lilin panas. Bagian kain yang tertutup malam tidak akan menyerap warna ketika kain dicelupkan.\n\n" +
      "Proses ini bisa diulang berkali-kali sampai muncul pola yang rumit dan berlapis. Karena itu, sehelai batik tulis yang halus dapat dikerjakan selama berminggu-minggu, bahkan berbulan-bulan. Selain batik tulis, ada juga batik cap yang dibuat dengan stempel tembaga sehingga prosesnya jauh lebih cepat.\n\n" +
      "Setiap daerah memiliki ciri khasnya sendiri. Batik dari Yogyakarta dan Solo cenderung berwarna cokelat dan biru tua, sedangkan batik pesisir seperti dari Pekalongan dan Cirebon biasanya lebih cerah. Pada tanggal 2 Oktober 2009, UNESCO mengakui batik Indonesia sebagai Warisan Budaya Takbenda. Sejak saat itu, tanggal tersebut diperingati sebagai Hari Batik Nasional, dan banyak orang Indonesia mengenakan batik dengan bangga.",
    korean:
      "바틱은 인도네시아에서 가장 잘 알려진 문화유산 가운데 하나입니다. ‘바틱’이라는 말은 작은 점을 찍어 쓴다는 뜻의 자와어와 흔히 연결됩니다. 바틱 툴리스(손으로 그린 바틱)를 만들 때 장인은 짠팅으로 천 위에 무늬를 그립니다. 짠팅은 뜨거운 밀랍을 담는 작은 도구입니다. 밀랍으로 덮인 부분은 천을 염료에 담가도 색이 배지 않습니다.\n\n" +
      "이 과정을 여러 번 되풀이하면 복잡하고 여러 겹으로 된 무늬가 나타납니다. 그래서 정교한 바틱 툴리스 한 장은 몇 주, 길게는 몇 달에 걸쳐 만들어지기도 합니다. 바틱 툴리스 말고도 구리 도장으로 찍어 만드는 바틱 짭이 있는데, 이 방법은 훨씬 빠릅니다.\n\n" +
      "지역마다 저마다의 특징이 있습니다. 족자카르타와 솔로의 바틱은 갈색과 짙은 남색이 많은 반면, 프칼롱안이나 치르본 같은 해안 지역의 바틱은 대체로 색이 더 밝습니다. 2009년 10월 2일, 유네스코는 인도네시아 바틱을 무형문화유산으로 인정했습니다. 그 뒤로 이날은 ‘국가 바틱의 날’로 기념되고, 많은 인도네시아 사람들이 자랑스럽게 바틱을 입습니다.",
    background: [
      {
        heading: "바틱 입는 날",
        body: "인도네시아의 많은 관공서와 회사, 학교에서는 금요일 같은 정해진 날에 바틱 옷을 입습니다. 결혼식처럼 격식 있는 자리에서도 바틱 셔츠는 정장으로 통합니다.",
      },
      {
        heading: "무늬에 담긴 뜻",
        body: "바틱 무늬에는 저마다 뜻이 있습니다. 예를 들어 칼 모양이 비스듬히 이어지는 parang 무늬는 꺾이지 않는 의지를 뜻한다고 알려져 있고, 예전에는 궁정 사람만 입을 수 있는 무늬도 있었습니다.",
      },
      {
        heading: "tulis와 cap",
        body: "batik tulis는 ‘쓴 바틱’, batik cap은 ‘도장 찍은 바틱’이라는 뜻입니다. tulis(쓰다), cap(도장), titik(점)처럼 바틱 이야기에는 기본 단어가 많이 나옵니다.",
      },
    ],
  },
];
