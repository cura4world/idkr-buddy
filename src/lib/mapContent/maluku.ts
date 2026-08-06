// src/lib/mapContent/maluku.ts
// 배치 8 — 말루쿠 5곳
//
// 단어는 지도 전체에서 유일해야 합니다. 앞 배치들의 236개와도 겹치면 안 됩니다.

import { MapContentTable } from "./types";

export const MALUKU: MapContentTable = {
  "Ternate": {
    desc:
      "바다에서 솟은 화산 하나가 통째로 섬이 된 곳입니다. 지름이 10킬로미터 남짓한 이 작은 섬이 한때 세계 경제를 흔들었습니다. 정향이 지구에서 오직 이 일대에서만 자랐기 때문입니다.\n\n" +
      "유럽에서 정향은 같은 무게의 금값에 견주어졌고, 그 향신료를 찾아 포르투갈과 에스파냐가 배를 보냈습니다. 마젤란 함대의 살아남은 배가 세계를 한 바퀴 돌아 유럽에 닿았을 때 실려 있던 짐도 이 지역의 향신료였습니다. 이어서 네덜란드가 들어와 나무를 심는 곳과 베어내는 곳을 정해 값을 조절했습니다.\n\n" +
      "테르나테 술탄국은 그 사이에서 밀고 당기며 오래 버텼습니다. 지금도 화산 기슭에 왕궁이 남아 있고, 섬을 한 바퀴 도는 길에서는 유럽 각국이 세운 요새를 차례로 지나칩니다.",
    words: [
      {
        word: "cengkeh",
        meaning: "정향",
        example: "Dulu cengkeh hanya tumbuh di pulau-pulau ini.",
        exampleKo: "예전에 정향은 이 섬들에서만 자랐습니다.",
      },
      {
        word: "rempah",
        meaning: "향신료",
        example: "Bangsa Eropa datang jauh untuk mencari rempah.",
        exampleKo: "유럽인들은 향신료를 찾아 멀리서 왔습니다.",
      },
    ],
    wiki: "Ternate",
  },

  "Kepulauan Banda": {
    desc:
      "말루쿠 남쪽 바다에 떠 있는 열 개 남짓한 작은 섬입니다. 육두구가 세계에서 오직 이곳에서만 나던 시절, 이 섬들은 지도상의 어떤 땅보다 값비쌌습니다.\n\n" +
      "1621년 네덜란드는 이 섬 사람들이 자기들하고만 거래하지 않는다는 이유로 군대를 보냈습니다. 만 오천 명 남짓이던 주민 대부분이 죽거나 끌려갔고, 빈 섬에 농장을 세워 노예를 부려 육두구를 길렀습니다. 향신료 무역의 가장 어두운 장면으로 기록된 사건입니다.\n\n" +
      "이 섬들은 훗날 다른 방식으로도 이름을 남겼습니다. 20세기 초 네덜란드가 인도네시아 독립운동가들을 이 외딴 섬으로 유배 보냈고, 하타를 비롯한 이들이 여기서 몇 해를 지내며 마을 아이들을 가르쳤습니다. 지금은 배가 뜸한 조용한 섬이고, 물속에는 산호와 가라앉은 배가 남아 있습니다.",
    words: [
      {
        word: "pala",
        meaning: "육두구",
        example: "Pala dari kepulauan ini sangat mahal di Eropa.",
        exampleKo: "이 제도의 육두구는 유럽에서 매우 비쌌습니다.",
      },
      {
        word: "penjajahan",
        meaning: "식민 지배",
        example: "Penjajahan meninggalkan luka yang dalam di pulau ini.",
        exampleKo: "식민 지배는 이 섬에 깊은 상처를 남겼습니다.",
      },
    ],
    wiki: "Banda Islands",
  },

  "Ambon": {
    desc:
      "말루쿠 주의 중심 도시이자 만 안쪽에 자리한 항구입니다. 이 도시는 인도네시아에서 기독교와 이슬람이 거의 반반으로 나뉜 드문 곳이고, 그 때문에 축복과 상처를 함께 겪었습니다.\n\n" +
      "1999년부터 몇 해 동안 이 도시에서 종교 간 충돌이 이어져 수천 명이 목숨을 잃고 도시가 갈라졌습니다. 사소한 다툼에서 시작된 일이 걷잡을 수 없이 번진 것이었습니다. 2002년 화해 협정 이후 사람들은 오랜 시간에 걸쳐 다시 섞여 살기 시작했고, 지금은 함께 일하고 함께 장을 봅니다.\n\n" +
      "암본에는 페라 사니리라는 오래된 관습이 있습니다. 기독교 마을과 이슬람 마을이 형제 마을로 맺어져 서로의 어려움을 돕는 약속인데, 충돌 시기에도 이 약속을 지킨 마을들이 있었습니다. 노래를 잘하기로도 이름난 도시여서, 인도네시아 유명 가수 중에 암본 출신이 유난히 많습니다.",
    words: [
      {
        word: "kerukunan",
        meaning: "화목, 서로 어울려 지냄",
        example: "Warga berusaha menjaga kerukunan antaragama.",
        exampleKo: "주민들은 종교 간 화목을 지키려 애씁니다.",
      },
      {
        word: "berdamai",
        meaning: "화해하다",
        example: "Kedua kelompok akhirnya berdamai setelah bertahun-tahun.",
        exampleKo: "두 집단은 오랜 세월 끝에 마침내 화해했습니다.",
      },
    ],
    wiki: "Ambon, Maluku",
  },

  "Saparua": {
    desc:
      "암본 동쪽에 있는 작은 섬입니다. 이 섬은 인도네시아 독립운동사에서 이른 시기의 저항으로 기억됩니다.\n\n" +
      "1817년 네덜란드가 다시 돌아와 세금과 강제 노동을 물리자, 토마스 마툴레시라는 이가 섬 사람들을 이끌고 요새를 점령했습니다. 파티무라라는 이름으로 더 알려진 그는 몇 달을 버티다 붙잡혀 암본에서 처형되었습니다. 그는 지금 국가 영웅이며, 인도네시아 지폐에 얼굴이 실려 있습니다.\n\n" +
      "이 섬은 말루쿠 기독교의 오랜 터전이기도 합니다. 마을마다 오래된 교회가 있고, 사람들은 성씨와 마을 관습을 함께 지켜 왔습니다. 저항을 이끈 이들 가운데 교회 교사와 마을 어른이 섞여 있었다는 점이 이 섬의 역사를 특별하게 만듭니다.",
    words: [
      {
        word: "perlawanan",
        meaning: "저항, 항쟁",
        example: "Perlawanan itu dimulai di pulau kecil ini.",
        exampleKo: "그 항쟁은 이 작은 섬에서 시작되었습니다.",
      },
      {
        word: "uang kertas",
        meaning: "지폐",
        example: "Wajahnya tercetak di uang kertas Indonesia.",
        exampleKo: "그의 얼굴은 인도네시아 지폐에 실려 있습니다.",
      },
    ],
    wiki: "Saparua",
  },

  "Tobelo": {
    desc:
      "할마헤라 섬 북쪽 해안의 읍입니다. 이 지역은 19세기 말 네덜란드 선교회가 들어와 학교와 병원을 세우면서 기독교가 자리 잡았고, 지금도 북할마헤라 기독교의 중심입니다.\n\n" +
      "1999년 말루쿠 전역의 충돌이 이곳까지 번져 이 조용한 해안에서도 큰 희생이 있었습니다. 그 뒤 마을들이 다시 서기까지 여러 해가 걸렸고, 교회와 모스크의 지도자들이 함께 앉아 이야기하는 자리가 그 회복의 출발점이 되었습니다.\n\n" +
      "앞바다에는 코코넛 나무가 늘어선 해변과 산호섬이 있고, 안쪽으로는 정향과 코프라 농원이 이어집니다. 태평양전쟁 때 일본군이 이 일대에 진지를 두어, 지금도 숲에 굴과 콘크리트 구조물이 남아 있습니다.",
    words: [
      {
        word: "pemulihan",
        meaning: "회복, 복구",
        example: "Pemulihan desa itu memakan waktu bertahun-tahun.",
        exampleKo: "그 마을의 회복에는 여러 해가 걸렸습니다.",
      },
      {
        word: "kelapa",
        meaning: "코코넛",
        example: "Pohon kelapa tumbuh di sepanjang pantai ini.",
        exampleKo: "코코넛 나무가 이 해변을 따라 자랍니다.",
      },
    ],
    wiki: "Tobelo",
  },
};
