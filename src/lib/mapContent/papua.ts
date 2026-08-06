// src/lib/mapContent/papua.ts
// 배치 9 — 파푸아 10곳 (지도 원고의 마지막 지역)
//
// 단어는 지도 전체에서 유일해야 합니다. 앞 배치들의 246개와도 겹치면 안 됩니다.

import { MapContentTable } from "./types";

export const PAPUA: MapContentTable = {
  // ---------------- 서파푸아 ----------------
  "Raja Ampat": {
    desc:
      "파푸아 서쪽 끝 바다에 흩어진 천오백 개가 넘는 섬과 바위섬입니다. 이름은 네 명의 왕이라는 뜻으로, 알에서 나온 네 사람이 각각 큰 섬의 왕이 되었다는 이야기에서 왔습니다.\n\n" +
      "이 바다는 지구에서 물속 생물의 종류가 가장 많은 곳으로 꼽힙니다. 확인된 산호가 550종을 넘고 물고기는 천오백 종이 넘습니다. 태평양과 인도양의 물이 이 좁은 통로에서 만나 영양분을 실어 오기 때문인데, 그래서 손바닥만 한 물고기부터 만타가리와 고래상어까지 한 바다에서 지나갑니다.\n\n" +
      "이 풍요를 지킨 것은 옛 관습이었습니다. 사시라 부르는 규칙이 있어 일정 기간 특정 구역에서 잡는 것을 금하고, 그 기간이 끝나야 다시 들어갑니다. 지금은 이 관습을 해양보호구역 제도와 이어 붙여 마을이 직접 바다를 관리합니다.",
    words: [
      {
        word: "hiu",
        meaning: "상어",
        example: "Hiu paus kadang lewat di perairan ini.",
        exampleKo: "고래상어가 이따금 이 바다를 지나갑니다.",
      },
      {
        word: "melarang",
        meaning: "금지하다",
        example: "Adat melarang orang menangkap ikan di daerah itu.",
        exampleKo: "관습이 그 구역에서 고기 잡는 것을 금합니다.",
      },
    ],
    wiki: "Raja Ampat Islands",
  },

  "Sorong": {
    desc:
      "파푸아 서쪽 끝의 항구 도시이자 라자 암팟으로 들어가는 관문입니다. 배와 비행기가 모두 여기를 거치기 때문에, 파푸아를 찾는 사람 대부분이 첫발을 딛는 곳입니다.\n\n" +
      "이 도시는 원래 기름 때문에 생겼습니다. 1930년대 네덜란드 회사가 이 일대에서 유전을 찾아내며 사람이 모였고, 회사 이름의 머리글자가 도시 이름의 유래라는 이야기가 전해집니다. 지금도 항구에는 기름과 목재를 실은 배가 드나듭니다.\n\n" +
      "동시에 인도네시아 각지에서 온 사람들과 파푸아 원주민이 뒤섞인 도시이기도 합니다. 시장에서는 자바 말과 부기스 말과 파푸아 여러 부족의 말이 함께 들리고, 아침에는 생선구이와 사고 전분으로 만든 죽을 파는 노점이 늘어섭니다.",
    words: [
      {
        word: "sagu",
        meaning: "사고 (야자 전분, 파푸아의 주식)",
        example: "Sagu menjadi makanan pokok di daerah ini.",
        exampleKo: "사고는 이 지역의 주식입니다.",
      },
      {
        word: "gerbang",
        meaning: "관문, 문",
        example: "Kota ini menjadi gerbang menuju Raja Ampat.",
        exampleKo: "이 도시는 라자 암팟으로 가는 관문입니다.",
      },
    ],
    wiki: "Sorong",
  },

  "Manokwari": {
    desc:
      "파푸아 북서쪽 해안에 있는 도시입니다. 뒤로는 아르팍 산이 서 있고 앞으로는 잔잔한 만이 펼쳐집니다.\n\n" +
      "인도네시아 사람들은 이 도시를 복음의 도시라 부릅니다. 1855년 두 독일인 선교사가 이 앞바다의 작은 섬에 내리면서 파푸아 선교가 시작되었고, 그 뒤 이 해안을 중심으로 교회와 학교가 퍼져 나갔습니다. 지금 파푸아 주민 대다수가 기독교인인 것은 그 시작에서 이어진 흐름입니다.\n\n" +
      "산에는 아르팍 사람들이 살며, 이 지역 숲에는 다른 곳에 없는 새들이 있습니다. 수컷이 숲 바닥을 깨끗이 쓸어 무대를 만들고 그 위에서 깃을 펴 춤추는 극락조가 이 산에서 관찰됩니다. 새를 보러 오는 사람들이 마을에 묵으며 안내를 받습니다.",
    words: [
      {
        word: "Injil",
        meaning: "복음",
        example: "Injil pertama kali masuk ke Papua lewat daerah ini.",
        exampleKo: "복음은 이 지역을 통해 파푸아에 처음 들어왔습니다.",
      },
      {
        word: "burung",
        meaning: "새",
        example: "Burung langka itu menari di lantai hutan.",
        exampleKo: "그 희귀한 새는 숲 바닥에서 춤을 춥니다.",
      },
    ],
    wiki: "Manokwari",
  },

  "Pulau Mansinam": {
    desc:
      "마노콰리 앞바다에 있는 아주 작은 섬입니다. 배로 십여 분이면 닿는 이 섬이 파푸아 기독교의 출발점입니다.\n\n" +
      "1855년 2월 5일, 독일인 오테와 가이슬러가 이 섬 모래밭에 내렸습니다. 그들은 무릎을 꿇고 이 땅을 위해 기도했다고 전해집니다. 말도 통하지 않고 풍토병이 심한 곳이라 처음 여러 해 동안 열매가 거의 없었고, 두 사람은 목수 일과 농사를 하며 사람들과 함께 지냈습니다. 첫 세례가 나오기까지 수십 년이 걸렸습니다.\n\n" +
      "그날은 지금 파푸아에서 복음이 들어온 날로 기념되며, 해마다 2월 5일이면 각지에서 배를 타고 이 섬으로 모여듭니다. 섬 언덕에는 큰 예수상이 서 있고, 두 선교사가 처음 발을 디딘 자리와 옛 우물이 표시되어 있습니다. 인도네시아 대통령들이 방문한 자리이기도 합니다.",
    words: [
      {
        word: "misionaris",
        meaning: "선교사",
        example: "Dua misionaris mendarat di pulau ini pada tahun 1855.",
        exampleKo: "두 선교사가 1855년에 이 섬에 내렸습니다.",
      },
      {
        word: "berlutut",
        meaning: "무릎 꿇다",
        example: "Mereka berlutut dan berdoa di atas pasir.",
        exampleKo: "그들은 모래 위에 무릎 꿇고 기도했습니다.",
      },
      {
        word: "peringatan",
        meaning: "기념, 기념일",
        example: "Peringatan itu diadakan setiap tanggal lima Februari.",
        exampleKo: "그 기념 행사는 매년 2월 5일에 열립니다.",
      },
    ],
    wiki: "Mansinam",
  },

  "Timika": {
    desc:
      "파푸아 남쪽 저지대의 도시입니다. 이 도시가 생긴 이유는 산 위에 있습니다. 해발 4,000미터가 넘는 곳에서 세계 최대급의 금과 구리 광산이 운영되고 있고, 티미카는 그 광산으로 들어가는 관문이자 노동자들의 생활 도시입니다.\n\n" +
      "이 광산은 인도네시아 정부에 큰 세수를 안겨 주지만, 오래도록 논란의 중심이었습니다. 파낸 흙과 돌을 강에 흘려보내 하류의 숲과 마을이 바뀌었고, 그 땅에 살던 아뭉메와 코모로 사람들에게 돌아간 몫과 환경 피해를 두고 다툼이 이어졌습니다. 광산 주변에는 오랜 기간 무장 충돌도 있었습니다.\n\n" +
      "저지대라 덥고 습하며, 도시 바깥으로 나가면 곧 늪지와 사고야자 숲이 이어집니다. 인도네시아 각지에서 온 사람이 많아 파푸아에서 인구가 빠르게 늘어난 도시 중 하나입니다.",
    words: [
      {
        word: "emas",
        meaning: "금",
        example: "Tambang emas terbesar berada di pegunungan ini.",
        exampleKo: "가장 큰 금광이 이 산맥에 있습니다.",
      },
      {
        word: "tembaga",
        meaning: "구리",
        example: "Tembaga dari sini dikirim ke banyak negara.",
        exampleKo: "이곳의 구리는 여러 나라로 보내집니다.",
      },
    ],
    wiki: "Timika",
  },
};
