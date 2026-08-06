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
    wiki: "Kuta, Bali",
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
    wiki: "Mataram, Lombok",
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

  "Gunung Rinjani": {
    desc:
      "롬복 한가운데 솟은 3,726미터 화산으로, 인도네시아에서 두 번째로 높은 화산입니다. 정상까지 이틀 이상 걸어야 하는데, 능선에 올라서면 발밑에 초승달 모양의 푸른 호수가 나타납니다.\n\n" +
      "이 호수는 사삭족과 발리 힌두 신자 모두에게 성스러운 곳입니다. 사람들은 이곳까지 걸어 올라와 호수에 제물을 놓고 기도하며, 호숫가에서 솟는 온천물로 몸을 씻습니다. 순례와 등반이 같은 길 위에서 이루어지는 셈입니다.\n\n" +
      "이 산은 무서운 내력도 있습니다. 1257년 같은 자리에 있던 화산이 터졌는데, 그 재가 지구 전체의 기온을 끌어내려 유럽에 흉년과 기근을 불렀다고 봅니다. 지금의 린자니는 그 폭발이 남긴 그릇 안에 새로 자란 산입니다.",
    words: [
      {
        word: "mendaki",
        meaning: "(산을) 오르다",
        example: "Mereka mendaki selama dua hari untuk sampai ke puncak.",
        exampleKo: "그들은 정상에 닿으려고 이틀 동안 올랐습니다.",
      },
      {
        word: "suci",
        meaning: "거룩한, 신성한",
        example: "Danau itu dianggap suci oleh dua agama.",
        exampleKo: "그 호수는 두 종교 모두에게 거룩하게 여겨집니다.",
      },
    ],
    wiki: "Mount Rinjani",
  },

  // ---------------- 숨바와 · 코모도 ----------------
  "Bima": {
    desc:
      "숨바와 섬 동쪽 끝의 항구 도시입니다. 예부터 술탄국이 있던 곳이고, 목재와 말과 소금을 실어 나르는 배가 드나들었습니다. 지금도 이 지역 말은 인도네시아 안에서 이름이 있습니다.\n\n" +
      "이 도시에서 서쪽으로 얼마 떨어지지 않은 곳에 탐보라 화산이 있습니다. 1815년 이 산이 터졌는데, 기록에 남은 인류 역사상 가장 큰 분화였습니다. 산의 윗부분이 통째로 날아가 높이가 천 미터 넘게 낮아졌고, 근처의 작은 왕국 하나가 사람과 언어까지 통째로 사라졌습니다.\n\n" +
      "그 재는 지구를 한 바퀴 돌았습니다. 이듬해 유럽과 북미에서는 여름에도 눈이 내려 그해를 여름이 없던 해라 부릅니다. 인도네시아의 한 산이 세계의 밥상을 흔든 셈입니다.",
    words: [
      {
        word: "kuda",
        meaning: "말",
        example: "Kuda dari daerah ini terkenal kuat.",
        exampleKo: "이 지역의 말은 튼튼하기로 유명합니다.",
      },
      {
        word: "abu",
        meaning: "재",
        example: "Abu letusan itu menutupi langit selama berbulan-bulan.",
        exampleKo: "그 분화의 재가 몇 달 동안 하늘을 덮었습니다.",
      },
    ],
    wiki: "Bima, Indonesia",
  },

  "Labuan Bajo": {
    desc:
      "플로레스 섬 서쪽 끝의 작은 항구입니다. 얼마 전까지 어부들이 살던 마을이었는데, 코모도로 가는 배가 모두 여기서 뜨면서 인도네시아에서 가장 빠르게 변한 곳 중 하나가 되었습니다. 언덕마다 호텔이 서고, 공항이 커졌습니다.\n\n" +
      "앞바다에는 섬이 흩어져 있습니다. 배를 타고 나가면 분홍빛이 도는 모래 해변과, 계단처럼 이어진 언덕에서 내려다보는 파당 섬의 풍경이 나옵니다. 물속에서는 만타가리 떼가 지나갑니다.\n\n" +
      "빠른 변화에는 그늘도 있습니다. 물과 전기가 모자라고, 배 삯과 땅값이 오르면서 원래 살던 사람들이 밀려나는 문제가 계속 이야기됩니다.",
    words: [
      {
        word: "nelayan",
        meaning: "어부",
        example: "Dulu kampung ini hanya dihuni nelayan.",
        exampleKo: "예전에 이 마을에는 어부들만 살았습니다.",
      },
      {
        word: "kapal",
        meaning: "배, 선박",
        example: "Semua kapal menuju Komodo berangkat dari sini.",
        exampleKo: "코모도로 가는 배는 모두 여기서 출발합니다.",
      },
    ],
  },

  "Pulau Komodo": {
    desc:
      "코모도왕도마뱀이 사는 섬입니다. 몸길이가 3미터에 이르는 세계에서 가장 큰 도마뱀으로, 이 섬과 이웃한 몇 개의 섬에만 삽니다. 침에 독이 있어 한 번 물면 사냥감이 오래 버티지 못합니다.\n\n" +
      "바깥 세계가 이 짐승을 안 것은 1910년대입니다. 네덜란드 관리가 소문을 듣고 확인하러 왔다가 표본을 가져가면서 알려졌고, 곧 사냥꾼들이 몰려들자 1930년대에 보호가 시작되었습니다.\n\n" +
      "섬 사람들에게는 다른 이야기가 있습니다. 옛날 한 여인이 쌍둥이를 낳았는데 하나는 사람이고 하나는 도마뱀이어서, 둘은 남매로 여겨진다는 것입니다. 그래서 이곳 사람들은 이 짐승을 오라라고 부르며 함부로 해치지 않았습니다.",
    words: [
      {
        word: "kadal",
        meaning: "도마뱀",
        example: "Kadal raksasa ini hanya hidup di beberapa pulau.",
        exampleKo: "이 거대한 도마뱀은 몇 개의 섬에만 삽니다.",
      },
      {
        word: "berburu",
        meaning: "사냥하다",
        example: "Mereka berburu rusa di padang rumput.",
        exampleKo: "그들은 초원에서 사슴을 사냥합니다.",
      },
    ],
    wiki: "Komodo (island)",
  },

  // ---------------- 플로레스 · 숨바 ----------------
  "Ende": {
    desc:
      "플로레스 섬 남쪽 해안의 항구 도시입니다. 이 도시가 인도네시아 역사에 남은 것은 한 사람의 유배 때문입니다.\n\n" +
      "1934년 네덜란드는 젊은 수카르노를 이곳으로 보냈습니다. 자바에서 멀리 떼어놓으려던 것이었고, 그는 아내와 함께 작은 집에 살며 4년을 보냈습니다. 할 일이 없던 그는 마을 사람들과 연극을 만들고, 집 앞 브링인 나무 아래 앉아 오래 생각했다고 전해집니다. 나중에 그가 내놓은 판짜실라, 곧 인도네시아 건국 다섯 원칙의 뼈대를 이 나무 아래에서 얻었다고 스스로 말했습니다.\n\n" +
      "가톨릭이 다수인 이 섬에서 무슬림이던 그가 신부들과 책을 빌려 읽고 토론한 경험도 그 생각에 스몄습니다. 유배지의 집은 지금 박물관이고, 나무는 아직 그 자리에 있습니다.",
    words: [
      {
        word: "diasingkan",
        meaning: "유배되다, 격리되다",
        example: "Dia diasingkan ke pulau ini selama empat tahun.",
        exampleKo: "그는 4년 동안 이 섬으로 유배되었습니다.",
      },
      {
        word: "pohon",
        meaning: "나무",
        example: "Dia sering duduk di bawah pohon besar itu.",
        exampleKo: "그는 그 큰 나무 아래 자주 앉았습니다.",
      },
    ],
    wiki: "Ende, Ende",
  },

  "Danau Kelimutu": {
    desc:
      "플로레스 산꼭대기에 나란히 있는 세 개의 화구호입니다. 놀라운 것은 색입니다. 하나는 청록, 하나는 짙은 초록, 하나는 검붉은 색을 띠는데, 붙어 있는데도 색이 다르고 몇 년마다 색이 바뀝니다. 호수 아래에서 올라오는 화산 가스가 물속 성분을 바꾸기 때문입니다.\n\n" +
      "이 지역 리오족은 이곳을 죽은 사람의 영혼이 모이는 자리로 여깁니다. 젊어서 죽은 이, 나이 들어 죽은 이, 나쁜 일을 한 이가 각각 다른 호수로 간다고 믿어 왔습니다.\n\n" +
      "새벽에 어둠 속을 걸어 올라가 정상에서 해가 뜨기를 기다립니다. 빛이 들면서 세 호수의 색이 차례로 드러나는 순간이 이곳을 찾는 이유입니다.",
    words: [
      {
        word: "warna",
        meaning: "색",
        example: "Warna danau itu berubah setiap beberapa tahun.",
        exampleKo: "그 호수의 색은 몇 년마다 바뀝니다.",
      },
      {
        word: "roh",
        meaning: "영혼, 혼",
        example: "Mereka percaya roh orang mati berkumpul di sini.",
        exampleKo: "그들은 죽은 이의 영혼이 여기 모인다고 믿습니다.",
      },
    ],
    wiki: "Kelimutu",
  },

  "Pulau Sumba": {
    desc:
      "누사틍가라 남쪽에 있는 마른 섬입니다. 비가 적어 밀림 대신 누런 초원이 펼쳐지고, 그 위에 말이 풀을 뜯습니다. 인도네시아의 다른 섬과 풍경이 확연히 다릅니다.\n\n" +
      "숨바 사람들은 마라뿌라 부르는 조상 신앙을 오래 지켜 왔습니다. 마을은 언덕 위에 짓고, 가운데에 뾰족하게 솟은 지붕의 집들이 돌무덤을 둘러싸고 있습니다. 무덤에 쓰는 돌은 수 톤에 이르러 온 마을이 함께 끌어 옮깁니다.\n\n" +
      "해마다 건기가 끝날 무렵 파솔라가 열립니다. 두 편으로 나뉜 기수들이 말을 달리며 나무 창을 던지는 행사인데, 땅에 피가 떨어져야 그해 농사가 잘된다고 여겨 왔습니다. 지금은 창끝을 뭉툭하게 하고 경찰이 지켜보지만, 여전히 거칩니다.",
    words: [
      {
        word: "padang rumput",
        meaning: "초원, 풀밭",
        example: "Kuda liar berlari di padang rumput yang luas.",
        exampleKo: "야생마가 넓은 초원을 달립니다.",
      },
      {
        word: "kubur",
        meaning: "무덤",
        example: "Batu kubur itu sangat berat.",
        exampleKo: "그 무덤 돌은 아주 무겁습니다.",
      },
    ],
    wiki: "Sumba",
  },
};
