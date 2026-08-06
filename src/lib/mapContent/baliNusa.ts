// src/lib/mapContent/baliNusa.ts
// 배치 3 — 발리 · 누사틍가라 22곳
//
// 단어는 지도 전체에서 유일해야 합니다. 앞 배치들의 단어와도 겹치면 안 됩니다.

import { MapContentTable } from "./types";

export const BALI_NUSA: MapContentTable = {
  // ---------------- 발리 ----------------
  "Denpasar": {
    desc:
      "발리의 행정 중심이자 가장 큰 도시입니다. 관광객이 떠올리는 발리와 달리 이곳은 사람들이 실제로 사는 곳이어서, 시장과 학교와 관공서가 뒤엉킨 평범한 인도네시아 도시의 얼굴을 하고 있습니다.\n\n" +
      "그러나 이 도시에는 무거운 기억이 있습니다. 1906년 네덜란드 군대가 밀고 들어오자 바둥 왕가의 사람들이 항복 대신 흰옷을 입고 왕궁을 나섰습니다. 왕과 사제, 여자와 아이들까지 대열을 이뤄 총구 앞으로 걸어 나갔고 수백 명이 그 자리에서 죽었습니다. 발리 사람들은 이 죽음의 행렬을 뿌뿌딴이라 부릅니다. 도시 한복판 광장에 그 기념비가 서 있습니다.\n\n" +
      "지금 덴파사르는 발리 문화가 학문으로 정리되는 곳이기도 합니다. 예술대학과 박물관이 있고, 해마다 여는 발리 예술축제가 한 달 동안 이어집니다.",
    words: [
      {
        word: "menyerah",
        meaning: "항복하다, 포기하다",
        example: "Mereka memilih mati daripada menyerah.",
        exampleKo: "그들은 항복하느니 죽는 쪽을 택했습니다.",
      },
      {
        word: "tugu",
        meaning: "기념비",
        example: "Tugu itu berdiri di tengah alun-alun kota.",
        exampleKo: "그 기념비는 도시 광장 한가운데 서 있습니다.",
      },
    ],
  },

  "Ubud": {
    desc:
      "발리 내륙, 계단식 논과 원숭이 숲 사이에 있는 마을입니다. 이름은 약초를 뜻하는 우밧에서 왔다고 하며, 예부터 치유의 땅으로 여겨졌습니다.\n\n" +
      "1930년대에 이곳 왕가가 유럽 화가와 음악가들을 불러들이면서 마을의 성격이 바뀌었습니다. 독일 화가 발터 슈피스가 정착해 발리 화가들과 어울렸고, 그 만남에서 지금 우리가 아는 발리 회화가 나왔습니다. 그가 케착 공연의 형태를 다듬는 데 관여했다는 이야기도 전해집니다.\n\n" +
      "논에 물을 대는 방식도 이곳의 자랑입니다. 수박이라 불리는 공동 관개 조직이 천 년 넘게 물을 나눠 왔는데, 사원에서 사제가 순서를 정하는 종교이자 농법입니다. 유네스코가 이 체계를 세계문화유산으로 지정했습니다.",
    words: [
      {
        word: "sawah",
        meaning: "논",
        example: "Sawah bertingkat itu diairi secara bergiliran.",
        exampleKo: "그 계단식 논은 순서를 정해 물을 댑니다.",
      },
      {
        word: "melukis",
        meaning: "그림을 그리다",
        example: "Banyak seniman datang ke sini untuk melukis.",
        exampleKo: "많은 예술가가 그림을 그리러 이곳에 옵니다.",
      },
    ],
  },

  "Kuta": {
    desc:
      "발리 관광이 시작된 해변입니다. 1970년대 배낭여행자들이 파도를 찾아 모여들면서 어촌이 숙소 거리로 바뀌었고, 지금은 발리에서 가장 붐비는 곳이 되었습니다. 서쪽을 보고 있어 노을이 좋습니다.\n\n" +
      "2002년 이곳 밤거리에서 폭탄 테러가 일어나 200명이 넘게 목숨을 잃었습니다. 스무 개가 넘는 나라의 사람들이 함께 죽은 사건이라 발리에 깊은 상처를 남겼고, 관광이 몇 년 동안 얼어붙었습니다. 지금 그 자리에는 희생자의 이름을 모두 새긴 추모비가 서 있습니다.\n\n" +
      "해변은 다시 붐빕니다. 초보자용 파도가 완만해 서핑을 처음 배우는 사람들이 널빤지를 빌려 들어가고, 저녁이면 모래밭에 사람들이 줄지어 앉아 해가 지는 것을 봅니다.",
    words: [
      {
        word: "ombak",
        meaning: "파도",
        example: "Ombak di pantai ini cocok untuk pemula.",
        exampleKo: "이 해변의 파도는 초보자에게 알맞습니다.",
      },
      {
        word: "korban",
        meaning: "희생자, 피해자",
        example: "Nama para korban tertulis di monumen itu.",
        exampleKo: "희생자들의 이름이 그 기념비에 적혀 있습니다.",
      },
    ],
  },

  "Nusa Penida": {
    desc:
      "발리 남동쪽 바다 건너에 있는 섬입니다. 발리 본섬이 초록으로 덮인 것과 달리 이곳은 석회암이라 메마르고, 해안은 깎아지른 절벽입니다. 물이 귀해 오랫동안 사람이 적게 살았습니다.\n\n" +
      "발리 사람들에게 이 섬은 오래도록 두려운 곳이었습니다. 병과 재앙을 몰고 다닌다는 존재가 사는 섬으로 여겨져, 본섬에서 죄를 지은 이를 이곳으로 보냈다는 이야기도 전해집니다. 지금도 섬의 사원에서는 그 존재를 달래는 의식을 치릅니다.\n\n" +
      "그 절벽이 이제는 사람을 부릅니다. 티라스만가 절벽과 클링킹 해변의 풍경이 알려지면서 배가 끊임없이 오가고, 앞바다에는 만타가리와 개복치가 나타납니다.",
    words: [
      {
        word: "tebing",
        meaning: "절벽",
        example: "Tebing di pulau ini sangat curam.",
        exampleKo: "이 섬의 절벽은 아주 가파릅니다.",
      },
      {
        word: "menakutkan",
        meaning: "무섭게 하는, 두려운",
        example: "Dulu pulau ini dianggap menakutkan.",
        exampleKo: "예전에 이 섬은 두려운 곳으로 여겨졌습니다.",
      },
    ],
  },

  "Tenganan": {
    desc:
      "발리 동부에 있는 담으로 둘러싸인 마을입니다. 이곳 사람들은 발리 아가, 즉 힌두 자바 세력이 들어오기 전부터 살던 원래의 발리인이라고 스스로를 여깁니다. 그래서 카스트를 따르지 않고, 마을 밖 사람과 결혼하면 마을을 떠나야 하는 규범을 오래 지켜 왔습니다.\n\n" +
      "이 마을에서만 나오는 천이 있습니다. 그링싱이라 부르는 이 천은 날실과 씨실을 미리 각각 염색해 짜야 무늬가 맞아떨어지는 방식이라, 한 장을 완성하는 데 몇 년이 걸립니다. 세계에서 이 방식을 쓰는 곳은 몇 되지 않습니다.\n\n" +
      "해마다 열리는 판단 싸움도 유명합니다. 가시가 돋은 판단 잎을 들고 젊은이들이 맞붙는데, 이기고 지는 것보다 신에게 피를 바치는 데 뜻이 있습니다. 상처는 강황 섞은 약을 발라 아뭅니다.",
    words: [
      {
        word: "menenun",
        meaning: "(천을) 짜다",
        example: "Perempuan di desa ini menenun kain khusus.",
        exampleKo: "이 마을 여자들은 특별한 천을 짭니다.",
      },
      {
        word: "duri",
        meaning: "가시",
        example: "Daun berduri itu dipakai dalam upacara.",
        exampleKo: "가시 돋친 그 잎은 의식에 쓰입니다.",
      },
    ],
  },

  // ---------------- 롬복 · 길리 ----------------
  "Mataram": {
    desc:
      "롬복 섬 서쪽에 있는 도시이자 서누사틍가라 주의 중심입니다. 이름은 자바의 옛 왕국에서 왔지만, 이 도시를 만든 것은 발리였습니다. 18세기에 발리 카랑아슴 왕가가 롬복 서부를 다스리면서 사원과 정원을 지었고, 그 흔적이 지금도 시내에 남아 있습니다.\n\n" +
      "그래서 이 도시는 두 겹입니다. 인구의 대부분은 무슬림 사삭족이고 모스크가 곳곳에 있는데, 그 사이에 발리 힌두 사원이 함께 서 있습니다. 이슬람 명절과 힌두 명절이 같은 거리에서 지나갑니다.\n\n" +
      "2018년 큰 지진이 롬복을 흔들어 수백 명이 죽고 수십만 명이 집을 잃었습니다. 무너진 모스크와 학교를 다시 세우는 데 몇 해가 걸렸습니다.",
    words: [
      {
        word: "taman",
        meaning: "정원, 공원",
        example: "Taman tua itu dibangun oleh raja dari Bali.",
        exampleKo: "그 오래된 정원은 발리에서 온 왕이 지었습니다.",
      },
      {
        word: "runtuh",
        meaning: "무너지다",
        example: "Banyak bangunan runtuh karena gempa itu.",
        exampleKo: "그 지진으로 많은 건물이 무너졌습니다.",
      },
    ],
  },

  "Gili Trawangan": {
    desc:
      "롬복 북서쪽 앞바다에 나란히 뜬 세 개의 작은 산호섬입니다. 길리는 사삭 말로 그냥 작은 섬이라는 뜻이라, 현지에서는 이름 뒤에 각각의 이름을 붙여 부릅니다.\n\n" +
      "이 섬들에는 자동차와 오토바이가 없습니다. 마차와 자전거, 그리고 걷는 것이 전부입니다. 섬 하나를 한 바퀴 도는 데 한두 시간이면 충분합니다.\n\n" +
      "물속이 이 섬의 본체입니다. 얕은 곳에도 산호가 있어 물안경만 쓰면 바다거북을 만날 수 있고, 죽어가던 산호를 되살리려고 쇠틀을 바다에 넣어 산호를 붙이는 작업이 오래 이어지고 있습니다. 다만 사람이 몰리면서 쓰레기와 물 부족이 섬의 숙제가 되었습니다.",
    words: [
      {
        word: "penyu",
        meaning: "바다거북",
        example: "Penyu sering terlihat di perairan dangkal.",
        exampleKo: "바다거북이 얕은 바다에서 자주 보입니다.",
      },
      {
        word: "sepeda",
        meaning: "자전거",
        example: "Di pulau ini orang berkeliling dengan sepeda.",
        exampleKo: "이 섬에서는 자전거로 돌아다닙니다.",
      },
    ],
    wiki: "Gili Islands",
  },

  "Sade": {
    desc:
      "롬복 남부에 있는 사삭족 전통 마을입니다. 집은 대나무 뼈대에 짚을 이고, 바닥은 흙에 물소 똥을 개어 발라 굳힙니다. 벌레가 꼬이지 않고 바닥이 단단해진다고 하여 대대로 이어 온 방법인데, 냄새는 마르면 사라집니다.\n\n" +
      "마을 가운데에는 곡식 창고가 줄지어 서 있습니다. 버섯 모양 지붕에 기둥이 가늘어 쥐가 올라가지 못하게 되어 있고, 이 창고가 사삭 마을의 상징입니다.\n\n" +
      "이곳에는 신부를 데려가는 혼인 풍습이 남아 있습니다. 두 사람이 마음을 정하면 남자가 여자를 밤에 데리고 나가고, 그 뒤에 양가가 마주 앉아 절차를 밟습니다. 겉으로는 납치처럼 보이지만 미리 합의된 형식입니다.",
    words: [
      {
        word: "lumbung",
        meaning: "곡식 창고",
        example: "Lumbung padi berdiri di tengah desa.",
        exampleKo: "곡식 창고가 마을 한가운데 서 있습니다.",
      },
      {
        word: "atap",
        meaning: "지붕",
        example: "Atap rumah itu dibuat dari jerami.",
        exampleKo: "그 집의 지붕은 짚으로 만들었습니다.",
      },
    ],
    wiki: "Sasak people",
  },
};
