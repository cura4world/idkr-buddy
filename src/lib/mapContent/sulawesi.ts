// src/lib/mapContent/sulawesi.ts
// 배치 7 — 술라웨시 13곳
//
// 단어는 지도 전체에서 유일해야 합니다. 앞 배치들의 210개와도 겹치면 안 됩니다.

import { MapContentTable } from "./types";

export const SULAWESI: MapContentTable = {
  // ---------------- 남술라웨시 ----------------
  "Makassar": {
    desc:
      "술라웨시 최대의 도시이자, 인도네시아 동부 전체의 관문 항구입니다. 자바에서 말루쿠로, 칼리만탄에서 파푸아로 가는 배와 비행기가 이곳을 거칩니다.\n\n" +
      "17세기 이 도시의 고와 왕국은 누구에게나 항구를 열어 두는 정책을 폈습니다. 향신료 무역을 독점하려던 네덜란드에게 이것은 눈엣가시였고, 결국 긴 전쟁 끝에 왕국이 무너졌습니다. 그때 항복 문서에 서명하기를 끝까지 거부한 술탄 하사누딘은 지금 인도네시아의 국가 영웅이며, 이 도시의 공항과 대학에 그의 이름이 붙어 있습니다.\n\n" +
      "항구에는 지금도 나무로 만든 큰 범선이 정박해 있습니다. 부기스 사람들이 대대로 만들어 온 배로, 쇠못 대신 나무못을 쓰고 도면 없이 눈대중으로 짓는데도 대양을 건넙니다. 예부터 이 배를 타고 호주 북부까지 해삼을 잡으러 다녔습니다.",
    words: [
      {
        word: "kapal layar",
        meaning: "범선, 돛단배",
        example: "Kapal layar kayu masih dibuat di pantai ini.",
        exampleKo: "나무 범선이 아직 이 해안에서 만들어집니다.",
      },
      {
        word: "pahlawan nasional",
        meaning: "국가 영웅",
        example: "Sultan itu diangkat menjadi pahlawan nasional.",
        exampleKo: "그 술탄은 국가 영웅으로 추대되었습니다.",
      },
    ],
    wiki: "Makassar",
  },

  "Bone": {
    desc:
      "마카사르 동쪽, 보네 만에 면한 옛 왕국의 자리입니다. 부기스 사람들의 가장 큰 왕국이 이곳에 있었고, 고와와 겨루며 술라웨시 남부의 판을 나눠 가졌습니다.\n\n" +
      "부기스에게는 널리 알려진 서사시가 있습니다. 신들이 하늘에서 내려와 세상을 세우는 이야기를 담은 것으로, 분량이 세계에서 손꼽히게 긴 문학 작품입니다. 옛 문자로 야자잎에 적어 전해 왔고, 그 문자는 지금도 간판이나 표지에서 볼 수 있습니다.\n\n" +
      "부기스 사회에는 명예를 뜻하는 말이 있어, 이것이 상하면 목숨을 걸고 갚는다는 관념이 오래 이어졌습니다. 배를 타고 멀리 나가 새 땅에 자리 잡는 기질과 함께, 이 관념이 부기스 사람들의 성격을 설명하는 말로 자주 쓰입니다.",
    words: [
      {
        word: "kehormatan",
        meaning: "명예",
        example: "Kehormatan keluarga sangat dijaga di daerah ini.",
        exampleKo: "이 지역에서는 집안의 명예를 매우 소중히 지킵니다.",
      },
      {
        word: "naskah",
        meaning: "필사본, 원고",
        example: "Naskah kuno itu ditulis di daun lontar.",
        exampleKo: "그 옛 필사본은 야자잎에 쓰였습니다.",
      },
    ],
    wiki: "Bone Regency",
  },

  "Maros-Pangkep": {
    desc:
      "마카사르 북쪽에 펼쳐진 석회암 지대입니다. 뾰족한 봉우리 수백 개가 논 한가운데 병풍처럼 솟아 있어, 중국 남부의 카르스트 풍경을 떠올리게 합니다.\n\n" +
      "이 봉우리 속 동굴에서 세계를 놀라게 한 그림이 나왔습니다. 벽에 손을 대고 입으로 물감을 뿜어 만든 손자국과, 창을 든 사람들이 멧돼지를 쫓는 장면이 그려져 있습니다. 연대를 재어 보니 4만 년을 훌쩍 넘겼고, 지금까지 알려진 것 중 가장 오래된 이야기 그림으로 꼽힙니다. 유럽 동굴벽화보다 앞섭니다.\n\n" +
      "다만 이 그림들은 빠르게 사라지고 있습니다. 기후가 바뀌면서 벽에서 소금 결정이 자라 그림 층을 밀어내고, 근처 석회암 채굴도 위협이 됩니다. 지금 보이는 것을 기록해 두는 일이 급한 상황입니다.",
    words: [
      {
        word: "gua",
        meaning: "동굴",
        example: "Lukisan itu ditemukan di dalam gua.",
        exampleKo: "그 그림은 동굴 안에서 발견되었습니다.",
      },
      {
        word: "cap tangan",
        meaning: "손도장, 손자국",
        example: "Cap tangan di dinding gua berumur puluhan ribu tahun.",
        exampleKo: "동굴 벽의 손자국은 수만 년 되었습니다.",
      },
    ],
    wiki: "Maros-Pangkep Karst",
  },

  "Tana Toraja": {
    desc:
      "남술라웨시 산속 고원입니다. 이곳의 집은 배처럼 앞뒤가 치솟은 지붕을 이고 있고, 벽에는 붉고 검은 무늬가 빼곡합니다. 집은 북쪽을 향해 서고, 조상에게서 물려받은 자리를 옮기지 않습니다.\n\n" +
      "토라자가 세계에 알려진 것은 장례 때문입니다. 사람이 죽으면 바로 묻지 않습니다. 온 친척이 모이고 돈이 마련될 때까지 몇 달, 때로는 몇 해 동안 시신을 집에 모시며 아직 아픈 사람으로 대합니다. 마침내 장례를 치를 때는 며칠 동안 물소를 잡고 손님을 먹이는데, 물소가 저승길의 값이라고 여겨 좋은 물소 한 마리가 집 한 채 값을 넘기도 합니다.\n\n" +
      "무덤은 절벽을 파서 만들고, 그 앞 난간에 죽은 이를 닮은 나무 인형을 세워 마을을 내려다보게 합니다. 지금은 주민 대부분이 기독교인이지만 이 절차는 교회 예식과 나란히 이어집니다.",
    words: [
      {
        word: "pemakaman",
        meaning: "장례, 매장",
        example: "Pemakaman di sini berlangsung sampai beberapa hari.",
        exampleKo: "이곳의 장례는 며칠 동안 이어집니다.",
      },
      {
        word: "patung kayu",
        meaning: "나무 인형, 목상",
        example: "Patung kayu itu berdiri di depan makam batu.",
        exampleKo: "그 나무 인형은 돌무덤 앞에 서 있습니다.",
      },
    ],
    wiki: "Tana Toraja Regency",
  },

  // ---------------- 서·동남술라웨시 ----------------
  "Mamuju": {
    desc:
      "서술라웨시 주의 중심입니다. 이 주도 2004년에 남술라웨시에서 갈라져 나온 젊은 주여서, 주도라고는 해도 해안을 따라 길게 늘어선 조용한 도시입니다.\n\n" +
      "이 지역에는 만다르 사람들이 삽니다. 바다를 잘 다루기로 이름났고, 양옆에 대나무 날개를 단 좁고 긴 배로 먼바다까지 나갑니다. 이 배는 돛을 올리면 아주 빨라 예전에는 물자와 소식을 나르는 데 쓰였습니다.\n\n" +
      "산 쪽은 코코아 산지입니다. 인도네시아가 한때 세계 3위 코코아 생산국이 된 데에는 이 일대의 몫이 컸습니다. 2021년 큰 지진이 이 도시를 흔들어 관공서와 병원이 무너지고 많은 사람이 집을 잃었습니다.",
    words: [
      {
        word: "cokelat",
        meaning: "초콜릿, 카카오",
        example: "Biji cokelat ditanam di perbukitan ini.",
        exampleKo: "카카오 열매가 이 언덕에서 재배됩니다.",
      },
      {
        word: "layar",
        meaning: "돛",
        example: "Perahu itu melaju cepat ketika layar dinaikkan.",
        exampleKo: "그 배는 돛을 올리면 빠르게 나아갑니다.",
      },
    ],
    wiki: "Mamuju",
  },

  "Kendari": {
    desc:
      "동남술라웨시 주의 중심으로, 좁고 긴 만 안쪽에 자리한 항구 도시입니다. 만이 육지 깊숙이 파고들어 파도가 잔잔하고, 그 덕에 예부터 배가 안전하게 드나들었습니다.\n\n" +
      "이 도시에는 은실 공예가 전해집니다. 머리카락처럼 가는 은실을 구부려 꽃과 잎 모양을 만들어 붙이는 방식으로, 완성된 장신구는 레이스처럼 성글고 가볍습니다. 결혼 예물로 쓰이며 대를 이어 배웁니다.\n\n" +
      "이 지역 땅에는 니켈이 많습니다. 전기차 배터리 수요가 늘면서 술라웨시 남동부는 세계 니켈 산업의 중심이 되었고, 광산과 제련소가 빠르게 들어섰습니다. 일자리가 늘어난 만큼 바다가 붉게 흐려지는 문제도 함께 생겨 논의가 이어집니다.",
    words: [
      {
        word: "perak",
        meaning: "은",
        example: "Perhiasan dari perak itu dibuat dengan tangan.",
        exampleKo: "그 은 장신구는 손으로 만들어집니다.",
      },
      {
        word: "nikel",
        meaning: "니켈",
        example: "Nikel dari daerah ini dipakai untuk baterai.",
        exampleKo: "이 지역의 니켈은 배터리에 쓰입니다.",
      },
    ],
    wiki: "Kendari",
  },

  // ---------------- 중부술라웨시 ----------------
  "Palu": {
    desc:
      "좁고 긴 만 안쪽에 자리한 중부술라웨시의 주도입니다. 산에 둘러싸여 비가 적고, 인도네시아 도시 중 가장 건조한 축에 듭니다.\n\n" +
      "2018년 9월 이 도시는 짧은 시간에 세 가지 재난을 한꺼번에 겪었습니다. 강한 지진이 났고, 곧이어 만 안으로 파도가 밀려들었으며, 그다음에는 땅 자체가 흐르기 시작했습니다. 물을 머금은 모래 지반이 지진에 액체처럼 변해 집과 길이 통째로 수백 미터를 떠내려간 것입니다. 이 현상으로만 몇 개 동네가 지도에서 사라졌고, 전체 사망·실종자는 사천 명이 넘었습니다.\n\n" +
      "지금 그 자리에는 다시 짓지 않고 추모 공간으로 남긴 구역이 있습니다. 도시는 해안을 따라 다시 일어섰지만, 어디에 무엇을 지어도 되는지에 대한 기준이 그때부터 완전히 달라졌습니다.",
    words: [
      {
        word: "tanah bergerak",
        meaning: "땅이 움직임, 지반 유동",
        example: "Tanah bergerak menghanyutkan rumah-rumah di daerah itu.",
        exampleKo: "지반이 움직여 그 지역의 집들이 떠내려갔습니다.",
      },
      {
        word: "korban jiwa",
        meaning: "인명 피해, 사망자",
        example: "Korban jiwa dalam bencana itu sangat banyak.",
        exampleKo: "그 재난의 인명 피해는 매우 컸습니다.",
      },
    ],
    wiki: "Palu",
  },

  "Kepulauan Togean": {
    desc:
      "술라웨시 한가운데 토미니 만에 흩어진 예순 개 남짓한 섬입니다. 사방이 육지로 둘러싸인 만이라 큰 파도가 들어오지 않아 물이 늘 잔잔합니다.\n\n" +
      "이 바다에는 산호가 자라는 세 가지 방식이 한자리에 모여 있습니다. 해안을 두른 것, 조금 떨어져 벽처럼 선 것, 가라앉은 섬 둘레에 고리처럼 남은 것이 모두 있어 연구자들이 자주 찾습니다.\n\n" +
      "섬 사이에는 바자우 사람들의 마을이 있습니다. 바다 위에 기둥을 박고 집을 지어 육지를 거의 밟지 않고 살아온 이들로, 잠수에 오래 견디도록 몸이 적응했다는 연구가 나와 세계의 주목을 받았습니다. 아이들이 배를 저어 학교에 갑니다.",
    words: [
      {
        word: "karang",
        meaning: "산호, 암초",
        example: "Karang di perairan ini masih sangat sehat.",
        exampleKo: "이 바다의 산호는 아직 아주 건강합니다.",
      },
      {
        word: "menahan napas",
        meaning: "숨을 참다",
        example: "Mereka bisa menahan napas sangat lama di dalam air.",
        exampleKo: "그들은 물속에서 아주 오래 숨을 참을 수 있습니다.",
      },
    ],
    wiki: "Togian Islands",
  },

  "Gorontalo": {
    desc:
      "술라웨시 북쪽 팔뚝 부분에 있는 주도입니다. 2000년에 북술라웨시에서 갈라져 나온 주이고, 도시는 강과 호수 사이 평지에 조용히 앉아 있습니다.\n\n" +
      "이 지역은 옥수수의 땅입니다. 쌀보다 옥수수를 주식처럼 먹어 왔고, 지금도 인도네시아 옥수수 수출의 상당 부분이 이 항구에서 나갑니다. 구운 옥수수에 소금과 라임을 뿌려 먹는 것이 흔한 간식입니다.\n\n" +
      "고론탈로 사람들은 이슬람 신앙이 깊으면서도 관습을 함께 지킵니다. 혼례에서는 신부가 화려한 관을 쓰고 정해진 절차를 밟는데, 그 순서 하나하나에 이름이 붙어 있습니다. 호수에는 물이 줄면 드러나는 옛 요새 터가 있어, 포르투갈과 네덜란드가 오가던 시절의 흔적을 남기고 있습니다.",
    words: [
      {
        word: "jagung",
        meaning: "옥수수",
        example: "Jagung menjadi makanan utama di daerah ini.",
        exampleKo: "옥수수는 이 지역의 주식입니다.",
      },
      {
        word: "adat pernikahan",
        meaning: "혼례 관습",
        example: "Adat pernikahan di sini memiliki banyak tahapan.",
        exampleKo: "이곳의 혼례 관습에는 여러 절차가 있습니다.",
      },
    ],
    wiki: "Gorontalo (city)",
  },

  "Wakatobi": {
    desc:
      "술라웨시 남동쪽 바다에 있는 네 개의 큰 섬입니다. 이름은 그 네 섬의 앞 글자를 따서 만든 말입니다.\n\n" +
      "이 바다는 산호 삼각지대의 한가운데에 있습니다. 지구에서 바다 생물의 종류가 가장 많은 구역인데, 그중에서도 이곳은 확인된 산호 종의 대부분이 모여 있는 곳으로 꼽힙니다. 벽처럼 수직으로 떨어지는 지형이 많아 다이빙하는 사람들에게는 이름난 곳입니다.\n\n" +
      "이 섬들에도 바다 위에 지은 마을이 있습니다. 그중 한 마을은 산호 조각을 쌓아 바다를 메우고 그 위에 집을 지어, 없던 땅을 사람이 만들어 낸 셈이 되었습니다. 물고기를 잡아 생계를 잇던 방식과 바다를 보호해야 하는 요구 사이에서 조율이 계속되고 있습니다.",
    words: [
      {
        word: "keanekaragaman",
        meaning: "다양성",
        example: "Keanekaragaman hayati laut di sini paling tinggi di dunia.",
        exampleKo: "이곳의 해양 생물 다양성은 세계에서 가장 높습니다.",
      },
      {
        word: "rumah panggung",
        meaning: "기둥 위에 지은 집",
        example: "Rumah panggung berdiri di atas air laut.",
        exampleKo: "기둥 위에 지은 집이 바닷물 위에 서 있습니다.",
      },
    ],
    wiki: "Wakatobi Regency",
  },

  // ---------------- 북술라웨시 ----------------
  "Manado": {
    desc:
      "술라웨시 북쪽 끝의 주도입니다. 이 도시는 인도네시아에서 기독교 색채가 가장 뚜렷한 도시 중 하나입니다. 미나하사 사람들이 19세기에 네덜란드 선교를 받아들이면서 마을마다 교회가 섰고, 지금도 언덕 위에 흰 종탑이 즐비합니다.\n\n" +
      "미나하사는 교육을 일찍 받아들여 식민지 시절 교사·군인·관리를 많이 배출했습니다. 그래서 자바 밖에서 인도네시아 근대 행정에 가장 먼저 들어간 집단 중 하나가 되었습니다.\n\n" +
      "음식은 인도네시아에서 가장 맵기로 유명합니다. 고추를 갈아 만든 소스에 생선을 재우거나 구워 먹고, 다른 지역 사람들이 겁내는 재료도 거리낌 없이 씁니다. 항구 앞바다에는 화산섬이 떠 있어 저녁이면 그 너머로 해가 집니다.",
    words: [
      {
        word: "pedas",
        meaning: "매운",
        example: "Masakan di kota ini terkenal sangat pedas.",
        exampleKo: "이 도시의 요리는 아주 맵기로 유명합니다.",
      },
      {
        word: "menara lonceng",
        meaning: "종탑",
        example: "Menara lonceng terlihat di hampir setiap desa.",
        exampleKo: "거의 모든 마을에서 종탑이 보입니다.",
      },
    ],
    wiki: "Manado",
  },

  "Tomohon": {
    desc:
      "마나도에서 산으로 올라가면 나오는 고원 도시입니다. 두 화산 사이에 있어 서늘하고 흙이 좋아 꽃이 잘 자랍니다. 인도네시아 전역으로 나가는 꽃의 상당수가 이 비탈에서 오고, 그래서 별명이 꽃의 도시입니다.\n\n" +
      "주민의 대부분이 기독교인이고, 이 도시에는 미나하사 개신교회의 총회 본부가 있습니다. 신학교가 있어 인도네시아 동부 각지에서 학생이 모이고, 언덕 위 큰 십자가가 도시를 내려다봅니다. 마을 규모에 비해 교회가 많아 주일 아침이면 골짜기마다 종소리가 겹칩니다.\n\n" +
      "이 도시의 재래시장은 다른 이유로도 알려져 있습니다. 다른 지역에서는 먹지 않는 짐승까지 파는 곳이라 외지 사람에게는 충격적인 광경이고, 동물 보호 문제로 오래 논란이 되어 일부 품목의 거래가 제한되었습니다.",
    words: [
      {
        word: "sinode",
        meaning: "총회 (교회 조직)",
        example: "Kantor sinode gereja itu berada di kota ini.",
        exampleKo: "그 교회의 총회 본부가 이 도시에 있습니다.",
      },
      {
        word: "kembang",
        meaning: "꽃",
        example: "Kembang dari kota ini dikirim ke seluruh Indonesia.",
        exampleKo: "이 도시의 꽃은 인도네시아 전역으로 보내집니다.",
      },
    ],
    wiki: "Tomohon",
  },

  "Bunaken": {
    desc:
      "마나도 앞바다에 있는 작은 섬이자 해양국립공원입니다. 이곳이 특별한 것은 지형 때문입니다. 섬 가장자리에서 몇십 미터만 나가면 바닥이 수직으로 뚝 떨어져 수백 미터 깊이가 됩니다. 그 벽면에 산호가 층층이 붙어 있어, 물안경만 쓰고 떠 있어도 절벽 위에 있는 기분이 듭니다.\n\n" +
      "깊은 물과 얕은 물이 맞닿아 있어 만나는 생물의 폭이 넓습니다. 손바닥만 한 물고기 떼 사이로 바다거북이 지나가고, 조금 더 나가면 큰 물고기가 지나는 길이 있습니다.\n\n" +
      "인도네시아에서 처음으로 지역 주민과 함께 바다를 관리한 곳이기도 합니다. 입장료를 걷어 마을과 나누고 주민이 감시에 참여하는 방식이 1990년대에 시작되어, 이후 다른 해양공원의 본보기가 되었습니다.",
    words: [
      {
        word: "dinding laut",
        meaning: "해저 절벽",
        example: "Dinding laut di sini turun ratusan meter.",
        exampleKo: "이곳의 해저 절벽은 수백 미터 아래로 떨어집니다.",
      },
      {
        word: "menjaga",
        meaning: "지키다, 보호하다",
        example: "Warga ikut menjaga taman laut ini.",
        exampleKo: "주민들이 이 해양공원을 함께 지킵니다.",
      },
    ],
    wiki: "Bunaken",
  },
};
