// src/lib/mapContent/kalimantan.ts
// 배치 6 — 칼리만탄 12곳
//
// 단어는 지도 전체에서 유일해야 합니다. 앞 배치들의 186개와도 겹치면 안 됩니다.

import { MapContentTable } from "./types";

export const KALIMANTAN: MapContentTable = {
  // ---------------- 서칼리만탄 ----------------
  "Pontianak": {
    desc:
      "적도가 도시 한복판을 지나갑니다. 강가에 적도를 표시한 탑이 서 있고, 해마다 태양이 바로 머리 위에 오는 날이면 그 아래 선 사람의 그림자가 잠시 사라집니다. 그 순간을 보러 사람들이 모입니다.\n\n" +
      "도시는 두 강이 만나는 자리에 있습니다. 카푸아스는 인도네시아에서 가장 긴 강이고, 상류의 고무와 목재가 이 물길을 따라 내려옵니다. 낮은 땅이라 물때에 맞춰 강물이 오르내리고, 강가에는 기둥을 박고 지은 집이 늘어서 있습니다.\n\n" +
      "이 도시 인구의 상당수가 중국계입니다. 말레이인, 다약인과 함께 살면서 음식과 명절이 뒤섞였고, 설이 되면 강가에서 용춤이 벌어집니다.",
    words: [
      {
        word: "khatulistiwa",
        meaning: "적도",
        example: "Kota ini terletak tepat di garis khatulistiwa.",
        exampleKo: "이 도시는 적도선 바로 위에 있습니다.",
      },
      {
        word: "bayangan",
        meaning: "그림자",
        example: "Bayangan orang hilang sejenak pada hari itu.",
        exampleKo: "그날에는 사람의 그림자가 잠시 사라집니다.",
      },
    ],
    wiki: "Pontianak",
  },

  "Singkawang": {
    desc:
      "폰티아낙 북쪽 해안에 있는 도시입니다. 인도네시아에서 중국계 비율이 가장 높은 도시로, 인구의 절반 가까이가 하카 계열입니다. 18세기 금을 캐러 온 광부들이 스스로 조직을 만들어 다스리던 공동체가 이 일대에 있었고, 그 후손들이 남아 도시를 이뤘습니다.\n\n" +
      "그래서 이 도시에는 사원이 아주 많습니다. 골목마다 붉은 향 연기가 나고, 도시의 별명도 천 개의 사원 도시입니다.\n\n" +
      "정월 대보름 무렵 열리는 행사가 이 도시의 얼굴입니다. 무당들이 칼날 위에 앉은 가마를 타고 거리를 도는데, 볼과 몸에 쇠꼬챙이를 꿴 채 지나갑니다. 인도네시아 각지와 이웃 나라에서 이 광경을 보러 옵니다.",
    words: [
      {
        word: "vihara",
        meaning: "불교 사원",
        example: "Ada ratusan vihara di kota kecil ini.",
        exampleKo: "이 작은 도시에 수백 개의 불교 사원이 있습니다.",
      },
      {
        word: "arak-arakan tandu",
        meaning: "가마 행렬",
        example: "Arak-arakan tandu berjalan keliling kota.",
        exampleKo: "가마 행렬이 도시를 한 바퀴 돕니다.",
      },
    ],
    wiki: "Singkawang",
  },

  "Putussibau": {
    desc:
      "카푸아스 강을 거슬러 끝까지 올라가면 나오는 읍입니다. 여기서 더 가려면 배를 갈아타야 하고, 그 위로는 말레이시아 국경까지 숲입니다.\n\n" +
      "이 일대에는 다약 사람들의 긴 집이 남아 있습니다. 하나의 지붕 아래 수십 가구가 나란히 사는 구조로, 각 집의 문이 하나의 긴 마루로 이어져 있습니다. 마루는 회의장이자 잔칫상이자 아이들의 놀이터입니다. 기둥 위에 높이 올려 지어 짐승과 물을 피합니다.\n\n" +
      "다약은 하나의 종족이 아니라 칼리만탄 내륙에 사는 여러 집단을 함께 부르는 이름입니다. 이 지역에서는 20세기 초 선교가 들어와 지금은 기독교인이 많고, 옛 관습과 신앙이 겹쳐 있는 마을이 흔합니다.",
    words: [
      {
        word: "rumah panjang",
        meaning: "긴 집 (다약 공동 가옥)",
        example: "Puluhan keluarga tinggal dalam satu rumah panjang.",
        exampleKo: "수십 가구가 한 채의 긴 집에 삽니다.",
      },
      {
        word: "hulu",
        meaning: "강 상류",
        example: "Desa itu berada jauh di hulu sungai.",
        exampleKo: "그 마을은 강 상류 멀리에 있습니다.",
      },
    ],
    wiki: "Putussibau",
  },

  // ---------------- 중부칼리만탄 · 남칼리만탄 ----------------
  "Tanjung Puting": {
    desc:
      "중부칼리만탄 남쪽의 국립공원입니다. 이곳에 가는 방법은 배뿐입니다. 지붕이 있는 나무배를 빌려 강을 거슬러 며칠 머무는데, 밤에는 배 위에서 자고 아침이면 양옆 나무에서 코주부원숭이가 뛰어다닙니다.\n\n" +
      "1971년 이곳에서 오랑우탄 연구가 시작되었습니다. 캐나다 출신 연구자가 숲에 들어와 수십 년을 관찰하며 이들의 생활을 처음으로 자세히 기록했고, 잡혀 있던 개체를 숲으로 돌려보내는 일도 함께 했습니다.\n\n" +
      "정해진 시간에 먹이대에 과일을 놓으면 숲에서 오랑우탄이 천천히 내려옵니다. 어미가 새끼를 안고 나무를 타는 모습을 몇 미터 앞에서 볼 수 있는데, 그러면서도 이들이 야생이라는 사실은 변하지 않습니다.",
    words: [
      {
        word: "perahu kayu",
        meaning: "나무배",
        example: "Kami menyusuri sungai dengan perahu kayu.",
        exampleKo: "우리는 나무배로 강을 거슬러 올라갔습니다.",
      },
      {
        word: "meneliti",
        meaning: "연구하다, 조사하다",
        example: "Dia meneliti orangutan selama puluhan tahun.",
        exampleKo: "그는 수십 년 동안 오랑우탄을 연구했습니다.",
      },
    ],
    wiki: "Tanjung Puting",
  },

  "Palangkaraya": {
    desc:
      "중부칼리만탄의 주도입니다. 이 도시에는 이루어지지 않은 계획이 하나 있습니다. 1957년 수카르노가 이곳을 새 수도로 삼겠다며 직접 첫 기둥을 박았습니다. 자바에 치우친 나라의 중심을 국토 한가운데로 옮기겠다는 구상이었는데, 정권이 바뀌며 흐지부지되었습니다.\n\n" +
      "그래서 이 도시는 계획도시의 흔적을 어정쩡하게 지니고 있습니다. 길이 지나치게 넓고 곧게 뻗어 있는데 그 옆은 아직 숲입니다.\n\n" +
      "주변은 대부분 이탄 습지입니다. 1990년대에 이 습지를 논으로 바꾸겠다며 백만 헥타르에 물길을 냈지만 흙이 농사에 맞지 않아 실패했고, 물이 빠진 이탄은 그 뒤로 해마다 불에 탑니다. 건기가 되면 도시가 연기에 잠깁니다.",
    words: [
      {
        word: "rencana",
        meaning: "계획",
        example: "Rencana memindahkan ibu kota ke sini tidak jadi.",
        exampleKo: "수도를 이곳으로 옮기려던 계획은 이루어지지 않았습니다.",
      },
      {
        word: "rawa gambut",
        meaning: "이탄 습지",
        example: "Rawa gambut di sekitar kota mudah terbakar.",
        exampleKo: "도시 주변의 이탄 습지는 쉽게 불이 붙습니다.",
      },
    ],
    wiki: "Palangka Raya",
  },

  "Banjarmasin": {
    desc:
      "강이 도로를 대신하는 도시입니다. 바리토 강과 그 지류가 시가지를 그물처럼 가로질러, 집도 시장도 학교도 물가에 붙어 있습니다. 그래서 별명이 천 개의 강 도시입니다.\n\n" +
      "새벽 다섯 시면 수상시장이 섭니다. 좁고 긴 배에 바나나와 채소를 싣고 나온 사람들이 물 위에서 물건을 주고받고, 갈고리 달린 장대로 배를 끌어당겨 흥정합니다. 아침 국수를 파는 배도 함께 떠 있습니다. 다만 다리와 도로가 늘면서 이 시장은 해마다 작아지고 있습니다.\n\n" +
      "반자르 사람들은 이슬람 신앙이 깊고, 이 지역 출신 학자가 18세기에 쓴 책은 지금도 동남아 여러 나라의 이슬람 학교에서 읽힙니다. 강가에는 금빛 돔의 큰 모스크가 서 있습니다.",
    words: [
      {
        word: "pasar terapung",
        meaning: "수상시장",
        example: "Pasar terapung dimulai sebelum matahari terbit.",
        exampleKo: "수상시장은 해가 뜨기 전에 시작됩니다.",
      },
      {
        word: "menawar",
        meaning: "값을 흥정하다",
        example: "Pembeli menawar harga dari atas perahu.",
        exampleKo: "손님이 배 위에서 값을 흥정합니다.",
      },
    ],
    wiki: "Banjarmasin",
  },

  // ---------------- 동칼리만탄 ----------------
  "Nusantara": {
    desc:
      "인도네시아가 짓고 있는 새 수도입니다. 자카르타가 가라앉고 막히고 넘치는 문제를 더는 손볼 수 없다고 보고, 2019년 정부가 수도를 칼리만탄 동쪽 숲으로 옮기겠다고 발표했습니다. 이름은 옛말로 여러 섬이라는 뜻입니다.\n\n" +
      "자바에 인구와 돈이 지나치게 몰린 나라에서 중심을 국토 한가운데로 옮긴다는 구상은 수카르노 때부터 있었습니다. 팔랑카라야에서 한 번 좌절된 그 생각이 60여 년 만에 다시 시도되는 셈입니다.\n\n" +
      "2024년 독립기념일 행사를 이곳에서 열며 대통령궁과 광장이 먼저 문을 열었습니다. 그러나 도시 하나를 통째로 짓는 일이라 예산과 투자, 원주민의 땅 문제, 숲을 미는 데 따른 반발이 함께 따라옵니다. 완성까지는 20년 넘게 걸릴 계획입니다.",
    words: [
      {
        word: "memindahkan",
        meaning: "옮기다, 이전하다",
        example: "Pemerintah memindahkan ibu kota ke pulau ini.",
        exampleKo: "정부는 수도를 이 섬으로 옮기고 있습니다.",
      },
      {
        word: "pembangunan",
        meaning: "건설, 개발",
        example: "Pembangunan kota baru itu memakan waktu puluhan tahun.",
        exampleKo: "그 새 도시의 건설은 수십 년이 걸립니다.",
      },
    ],
    wiki: "Nusantara",
  },

  "Balikpapan": {
    desc:
      "동칼리만탄 해안의 석유 도시입니다. 1897년 이 앞바다에서 처음 기름이 솟았고, 곧 정유소와 항구가 세워지면서 도시가 생겼습니다. 지금도 인도네시아에서 손꼽히는 정유 시설이 이곳에 있습니다.\n\n" +
      "그 기름 때문에 이 도시는 전쟁의 표적이 되었습니다. 태평양전쟁 때 일본군이 가장 먼저 노린 곳 중 하나였고, 종전 무렵에는 연합군이 상륙하며 다시 크게 부서졌습니다. 지금도 앞바다에는 그때 가라앉은 배들이 남아 있습니다.\n\n" +
      "회사가 운영하는 도시로 자란 덕에 인도네시아 도시치고 길과 상하수도가 잘 정비되어 있습니다. 도심 가까운 숲에는 보호받는 곰이 살고, 새 수도로 가는 관문 공항도 이 도시에 있습니다.",
    words: [
      {
        word: "kilang minyak",
        meaning: "정유소",
        example: "Kilang minyak besar berdiri di tepi kota ini.",
        exampleKo: "큰 정유소가 이 도시 가장자리에 있습니다.",
      },
      {
        word: "perang",
        meaning: "전쟁",
        example: "Kota ini rusak berat karena perang.",
        exampleKo: "이 도시는 전쟁으로 크게 부서졌습니다.",
      },
    ],
    wiki: "Balikpapan",
  },

  "Samarinda": {
    desc:
      "마하캄 강가에 있는 동칼리만탄의 주도입니다. 강이 워낙 넓어 큰 배가 도시 한복판까지 들어오고, 석탄을 실은 바지선이 줄지어 지나갑니다. 이 지역은 인도네시아 최대의 석탄 산지여서, 강을 오르내리는 배 대부분이 검은 짐을 싣고 있습니다.\n\n" +
      "노천 광산이 도시 가까이까지 파고들면서 문제도 생겼습니다. 파낸 자리에 물이 고인 웅덩이가 시내 근처에 수백 개 남아 있고, 여기서 아이들이 목숨을 잃는 사고가 이어져 오래 논란이 되었습니다.\n\n" +
      "강 상류에는 다약 마을이 있어 나무를 깎은 기둥과 구슬 공예가 이어집니다. 이 지역에서 나는 실크 사롱은 손으로 짜는데, 무늬 하나를 완성하는 데 여러 날이 걸립니다.",
    words: [
      {
        word: "tongkang",
        meaning: "바지선, 짐배",
        example: "Tongkang batu bara lewat di sungai ini setiap hari.",
        exampleKo: "석탄 바지선이 매일 이 강을 지나갑니다.",
      },
      {
        word: "manik-manik",
        meaning: "구슬, 비즈 공예",
        example: "Manik-manik dipakai untuk menghias pakaian adat.",
        exampleKo: "구슬은 전통 의상을 꾸미는 데 쓰입니다.",
      },
    ],
    wiki: "Samarinda",
  },

  // ---------------- 북칼리만탄 ----------------
  "Tanjung Selor": {
    desc:
      "북칼리만탄 주의 중심입니다. 이 주는 2012년에야 동칼리만탄에서 갈라져 나온, 인도네시아에서 가장 젊은 주입니다. 주도라고는 해도 강가의 작은 읍에 가깝고, 관공서 건물 몇 채가 들판 사이에 서 있습니다.\n\n" +
      "이 일대는 말레이시아와 국경을 맞대고 있어 예부터 국경을 넘나드는 생활이 자연스러웠습니다. 산속 마을 사람들에게는 인도네시아 도시보다 국경 너머 말레이시아 마을이 더 가깝고, 물건도 그쪽에서 사 오는 일이 많습니다. 그래서 국경 지역 개발이 이 주의 오랜 과제입니다.\n\n" +
      "강 하구에는 불란 사람들의 마을이 있고, 옛 술탄국의 흔적도 남아 있습니다. 상류로 올라가면 여전히 배가 유일한 길입니다.",
    words: [
      {
        word: "perbatasan",
        meaning: "국경, 접경",
        example: "Warga di perbatasan sering berbelanja di negara tetangga.",
        exampleKo: "접경 주민들은 이웃 나라에서 자주 장을 봅니다.",
      },
      {
        word: "provinsi termuda",
        meaning: "가장 젊은 주",
        example: "Ini provinsi termuda di Indonesia.",
        exampleKo: "이곳은 인도네시아에서 가장 젊은 주입니다.",
      },
    ],
    wiki: "Tanjung Selor",
  },

  "Tarakan": {
    desc:
      "북칼리만탄 앞바다의 작은 섬 도시입니다. 이곳에서도 20세기 초에 기름이 나왔고, 그 때문에 이 섬은 태평양전쟁의 첫 전장 중 하나가 되었습니다. 1942년 일본군이 이 섬을 노려 상륙했고, 1945년에는 호주군이 다시 밀고 들어왔습니다. 작은 섬에서 오래 격렬한 싸움이 이어져 지금도 참호와 포대의 흔적이 남아 있습니다.\n\n" +
      "지금 이 섬의 살림은 새우입니다. 갯벌을 막아 만든 못에서 큰 새우를 길러 일본과 한국으로 보냅니다.\n\n" +
      "섬 한쪽에는 맹그로브 숲이 보호되고 있습니다. 나무 위 데크를 걸으면 코주부원숭이가 앉아 있는 것을 도시 한가운데서 볼 수 있습니다.",
    words: [
      {
        word: "udang windu",
        meaning: "블랙타이거 새우",
        example: "Udang windu dari pulau ini diekspor ke Jepang.",
        exampleKo: "이 섬의 블랙타이거 새우는 일본으로 수출됩니다.",
      },
      {
        word: "bakau",
        meaning: "맹그로브",
        example: "Hutan bakau dilindungi di tepi kota.",
        exampleKo: "맹그로브 숲이 도시 가장자리에서 보호되고 있습니다.",
      },
    ],
    wiki: "Tarakan",
  },

  "Kepulauan Derawan": {
    desc:
      "동칼리만탄 앞바다에 흩어진 산호섬들입니다. 물이 얕고 맑아 배에서 내리기 전에 바닥이 보입니다.\n\n" +
      "이곳은 바다거북이 알을 낳으러 오는 곳으로 이름났습니다. 밤이면 암컷이 모래밭으로 기어 올라와 구멍을 파고 알을 묻고, 몇 주 뒤 새끼들이 한꺼번에 나와 바다로 달려갑니다. 예전에는 알을 걷어 파는 일이 흔했지만 지금은 금지되고 사람들이 둥지를 지킵니다.\n\n" +
      "카칵반이라는 섬에는 바닷물이 갇혀 만들어진 호수가 있는데, 그 안에 침을 쓰지 않는 해파리가 삽니다. 오랜 세월 천적이 없어 독이 필요 없어진 것입니다. 그 호수에서는 해파리 사이를 헤엄쳐 다닐 수 있습니다.",
    words: [
      {
        word: "bertelur",
        meaning: "알을 낳다",
        example: "Penyu bertelur di pantai ini setiap malam.",
        exampleKo: "바다거북이 밤마다 이 해변에서 알을 낳습니다.",
      },
      {
        word: "ubur-ubur",
        meaning: "해파리",
        example: "Ubur-ubur di danau itu tidak menyengat.",
        exampleKo: "그 호수의 해파리는 쏘지 않습니다.",
      },
    ],
    wiki: "Derawan Islands",
  },
};
