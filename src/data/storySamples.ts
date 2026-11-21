// src/data/storySamples.ts
// 맛보기 이야기 3편 (하·중·상 한 편씩) — 무료 사용자에게 열어 두는 이야기입니다(2026-11-16 사용자 결정).
// 새 이야기 불러오기는 Plus 전용이 되었고, 무료 사용자는 이 세 편으로 "단어를 누르면 뜻이 나오는" 읽기를 맛봅니다.
// - 앱 안에 들어 있어 AI 를 부르지 않고(비용 0) 인터넷 없이도 열립니다. 단어 뜻 보기는 다른 이야기와 같이 단어 조회를 씁니다.
// - Plus 사용자에게는 보이지 않습니다(자기 이야기가 있음). 신고 단추도 달지 않습니다(사람이 쓰고 확인한 글).
// - 2026-11-22: 주제 고르기·난이도 재조정(lib/story.ts)에 맞춰 세 편을 새로 썼습니다(사용자 요청 — 예전 세 편은 원어민 확인 전이었음).
//   하·음식 "Nasi Goreng Ibu"(40~60단어), 중·동화 "Kancil dan Buaya"(70~100단어), 상·여행 "Menyambut Pagi di Borobudur"(110~150단어).
//   길이·문장 길이·문법 범위는 lib/story.ts 의 DIFF_INFO 와 같은 기준입니다.
// - 글을 고치면 id 는 그대로 두어도 됩니다(맛보기는 음성을 만들지 않으므로 캐시 키가 없음).

import type { StoryRecord } from "@/lib/storyStore";

export const SAMPLE_ID_PREFIX = "sample-";

export const isSampleStory = (id: string | undefined | null): boolean =>
  !!id && id.indexOf(SAMPLE_ID_PREFIX) === 0;

export const STORY_SAMPLES: StoryRecord[] = [
  {
    id: "sample-nasigoreng",
    createdAt: 0,
    title: "Nasi Goreng Ibu",
    titleKo: "어머니의 나시고렝",
    category: "인도네시아 음식",
    difficulty: "하",
    indonesian:
      "Ini nasi goreng. Nasi goreng sangat terkenal di Indonesia. Orang Indonesia makan nasi goreng kapan saja. Biasanya ada telur dan kerupuk di atasnya.\n\n" +
      "Ibu memasak nasi goreng setiap hari Minggu. Ibu memakai bawang putih, kecap manis, dan cabai. Rasanya manis dan sedikit pedas. Saya selalu minta tambah!",
    korean:
      "이것은 나시고렝입니다. 나시고렝은 인도네시아에서 아주 유명합니다. 인도네시아 사람들은 언제든지 나시고렝을 먹습니다. 보통 위에 달걀과 크루푹이 올라갑니다.\n\n" +
      "어머니는 일요일마다 나시고렝을 만드십니다. 어머니는 마늘, 달콤한 간장(케찹 마니스), 고추를 넣으십니다. 맛은 달고 조금 맵습니다. 저는 늘 더 달라고 합니다!",
    background: [
      {
        heading: "kecap manis",
        body: "인도네시아 요리에 많이 쓰는 걸쭉하고 달콤한 간장입니다. 나시고렝의 단맛과 짙은 색이 여기서 나옵니다.",
      },
      {
        heading: "kerupuk",
        body: "주로 타피오카 녹말 반죽을 말렸다가 튀긴 바삭한 과자로, 새우나 생선 맛이 흔합니다. 인도네시아 사람들은 밥을 먹을 때 반찬처럼 곁들여 먹기를 좋아합니다.",
      },
    ],
  },
  {
    id: "sample-kancil",
    createdAt: 0,
    title: "Kancil dan Buaya",
    titleKo: "칸칠과 악어",
    category: "인도네시아 동화",
    difficulty: "중",
    indonesian:
      "Pada suatu hari, Kancil ingin pergi ke seberang sungai. Di sana ada banyak buah yang matang. Sayangnya, sungai itu lebar dan penuh buaya yang lapar.\n\n" +
      "Kancil lalu berteriak, “Hai, Buaya! Raja akan membagikan daging untuk kalian. Berbarislah supaya aku bisa menghitung kalian!” Para buaya percaya, lalu segera berbaris sampai ke seberang sungai. Kancil melompat dari punggung ke punggung sambil menghitung, “Satu, dua, tiga, ...”\n\n" +
      "Ketika sampai di seberang, Kancil tertawa. “Terima kasih, Buaya! Sebenarnya aku hanya ingin menyeberang.” Para buaya marah, tetapi Kancil sudah berlari ke dalam hutan.",
    korean:
      "어느 날, 칸칠은 강 건너편으로 가고 싶었습니다. 그곳에는 잘 익은 과일이 많이 있었습니다. 안타깝게도 강은 넓었고, 배고픈 악어들로 가득했습니다.\n\n" +
      "그래서 칸칠은 크게 외쳤습니다. “어이, 악어들아! 왕께서 너희에게 고기를 나누어 주신대. 내가 셀 수 있게 줄을 서 봐!” 악어들은 그 말을 믿고 곧바로 강 건너편까지 줄을 섰습니다. 칸칠은 수를 세면서 악어의 등에서 등으로 뛰어 건넜습니다. “하나, 둘, 셋…”\n\n" +
      "건너편에 닿자 칸칠은 웃었습니다. “고마워, 악어들아! 사실 나는 강을 건너고 싶었을 뿐이야.” 악어들은 화가 났지만, 칸칠은 벌써 숲속으로 달려가 버렸습니다.",
    background: [
      {
        heading: "칸칠(kancil)",
        body: "칸칠은 동남아시아 숲에 사는 사슴을 닮은 아주 작은 동물(쥐사슴)입니다. 인도네시아 옛이야기에서는 몸은 작지만 꾀가 많아 힘센 동물을 이기는 주인공으로 나옵니다.",
      },
      {
        heading: "힘보다 지혜",
        body: "칸칠 이야기는 아이들에게 힘보다 지혜가 중요하다는 것을 알려 주는 이야기로 사랑받습니다. 한편 남을 속이는 꾀가 늘 옳은지 함께 이야기해 보는 교재로 쓰이기도 합니다.",
      },
      {
        heading: "berbaris",
        body: "‘줄을 서다’라는 뜻입니다. 학교 조회 때 선생님이 “Ayo, berbaris!”(자, 줄 서세요!)라고 말하는 것처럼 일상에서 자주 씁니다.",
      },
    ],
  },
  {
    id: "sample-borobudur",
    createdAt: 0,
    title: "Menyambut Pagi di Borobudur",
    titleKo: "보로부두르에서 맞는 아침",
    category: "인도네시아 여행",
    difficulty: "상",
    indonesian:
      "Jika Anda berkunjung ke Yogyakarta, jangan lewatkan Candi Borobudur, candi Buddha terbesar di dunia yang dibangun pada abad ke-8 dan ke-9. Candi ini terletak sekitar 40 kilometer dari pusat Kota Yogyakarta sehingga perjalanan dengan mobil atau bus wisata biasanya memakan waktu satu sampai dua jam.\n\n" +
      "Banyak wisatawan memilih datang pagi-pagi sekali. Dari Bukit Punthuk Setumbu yang tidak jauh dari candi, mereka menyaksikan matahari terbit perlahan dari balik gunung, sementara puncak Borobudur menyembul di antara kabut. Pemandangan itu bagaikan lukisan yang hidup.\n\n" +
      "Meskipun udara terasa sejuk pada pagi hari, siang hari bisa sangat panas, jadi bawalah topi dan air minum. Pengunjung juga diminta berpakaian sopan dan tidak memanjat stupa. Kalau ingin naik ke bagian atas candi, sebaiknya Anda memesan tiket terlebih dahulu karena jumlah pengunjung yang boleh naik dibatasi setiap hari.",
    korean:
      "족자카르타에 간다면 보로부두르 사원을 놓치지 마세요. 8~9세기에 세워진, 세계에서 가장 큰 불교 사원입니다. 사원은 족자카르타 시내 중심에서 40킬로미터쯤 떨어져 있어서, 승용차나 관광버스로 보통 한두 시간이 걸립니다.\n\n" +
      "많은 여행자가 아주 이른 아침에 찾아옵니다. 사원에서 멀지 않은 푼툭 스툼부 언덕에서, 사람들은 해가 산 뒤에서 천천히 떠오르는 모습을 지켜봅니다. 그사이 보로부두르의 꼭대기가 안개 사이로 살며시 모습을 드러냅니다. 그 풍경은 마치 살아 있는 그림 같습니다.\n\n" +
      "아침에는 공기가 선선하지만 한낮에는 무척 더울 수 있으니 모자와 마실 물을 챙기세요. 방문객은 단정한 옷차림을 하고 스투파에 올라가지 말아야 합니다. 사원 위층까지 올라가고 싶다면 위층에 오를 수 있는 인원이 하루 단위로 제한되어 있으므로 미리 표를 예약하는 것이 좋습니다.",
    background: [
      {
        heading: "푼툭 스툼부",
        body: "보로부두르 서쪽의 작은 언덕으로, 안개에 싸인 사원과 그 뒤의 므라피·므르바부 화산을 함께 볼 수 있는 해돋이 명소입니다. 해 뜨기 전 어두울 때 오르므로 손전등이 있으면 좋습니다.",
      },
      {
        heading: "위층 입장 제한",
        body: "사원을 보호하기 위해 2023년부터 위층에 오르는 인원을 하루 단위로 제한하고, 오르는 사람에게는 판단 잎으로 엮은 샌들 ‘우파낫(upanat)’을 신게 합니다. 제도는 바뀔 수 있으니 떠나기 전에 공식 안내를 확인하세요.",
      },
      {
        heading: "Anda와 bagaikan",
        body: "Anda는 처음 보는 사람이나 독자에게 쓰는 정중한 ‘당신’입니다. bagaikan은 ‘마치 ~같은’이라는 뜻으로, seperti보다 글맛이 있는 문어 표현입니다.",
      },
    ],
  },
];
