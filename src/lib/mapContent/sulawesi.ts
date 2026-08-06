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
};
