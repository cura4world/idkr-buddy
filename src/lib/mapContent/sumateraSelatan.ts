// src/lib/mapContent/sumateraSelatan.ts
// 배치 5 — 수마트라 남부 · 리아우 15곳
//
// 단어는 지도 전체에서 유일해야 합니다. 앞 배치들의 164개와도 겹치면 안 됩니다.

import { MapContentTable } from "./types";

export const SUMATERA_SELATAN: MapContentTable = {
  // ---------------- 리아우 · 해협 ----------------
  "Pekanbaru": {
    desc:
      "리아우 주의 중심 도시입니다. 시아크 강가의 작은 장터였던 곳이 20세기 중반 석유가 나오면서 완전히 달라졌습니다. 이 일대의 유전은 인도네시아 최대 규모였고, 그 기름이 수십 년 동안 나라 살림의 큰 몫을 감당했습니다.\n\n" +
      "그러나 이 땅의 다른 얼굴은 연기입니다. 리아우에는 두껍게 쌓인 이탄 습지가 넓게 펼쳐져 있는데, 기름야자 농원을 만들려고 물을 빼고 불을 놓으면 땅속 깊은 곳까지 오래 탑니다. 건기가 되면 연기가 도시를 덮어 학교가 문을 닫고 이웃 나라까지 뿌옇게 만듭니다.\n\n" +
      "한편 이 지역의 말레이어는 인도네시아어의 뿌리이기도 합니다. 여러 섬이 뒤섞인 나라에서 무역에 쓰이던 이 지역 말이 공용어의 바탕이 되었습니다.",
    words: [
      {
        word: "minyak",
        meaning: "기름, 석유",
        example: "Minyak ditemukan di daerah ini pada abad ke-20.",
        exampleKo: "20세기에 이 지역에서 석유가 발견되었습니다.",
      },
      {
        word: "asap",
        meaning: "연기",
        example: "Asap menutupi kota pada musim kemarau.",
        exampleKo: "건기가 되면 연기가 도시를 덮습니다.",
      },
    ],
    wiki: "Pekanbaru",
  },

  "Batam": {
    desc:
      "싱가포르에서 배로 40분 거리에 있는 섬입니다. 1970년대까지 어부 몇천 명이 살던 곳이었는데, 정부가 싱가포르에 맞서는 산업 지역으로 지정하면서 인구가 백만이 넘는 도시가 되었습니다.\n\n" +
      "이 섬의 일은 대부분 조립과 조선입니다. 전자 부품과 선박 블록을 만들어 곧바로 배에 실어 보내며, 인도네시아 각지에서 일자리를 찾아 온 사람들이 뒤섞여 삽니다. 그래서 토박이 문화라 할 것이 뚜렷하지 않고, 대신 어디서 왔느냐를 먼저 묻는 도시가 되었습니다.\n\n" +
      "섬 사이를 잇는 여섯 개의 다리가 있어 이웃 섬들이 하나처럼 붙어 있습니다. 국경이 가까워 환율과 물가가 바다 건너 사정에 따라 출렁입니다.",
    words: [
      {
        word: "pabrik perakitan",
        meaning: "조립 공장",
        example: "Banyak pabrik perakitan berdiri di pulau ini.",
        exampleKo: "많은 조립 공장이 이 섬에 있습니다.",
      },
      {
        word: "jembatan",
        meaning: "다리, 교량",
        example: "Enam jembatan menghubungkan pulau-pulau ini.",
        exampleKo: "여섯 개의 다리가 이 섬들을 잇습니다.",
      },
    ],
    wiki: "Batam",
  },

  "Tanjungpinang": {
    desc:
      "리아우 제도 주의 중심이자, 말레이 세계의 오래된 중심 중 하나입니다. 바탐이 새로 만든 산업 도시라면 이곳은 역사가 쌓인 도시입니다.\n\n" +
      "가까운 프냥앗 섬에 조호르·리아우 술탄국의 궁터와 왕실 묘가 남아 있습니다. 이 섬에서 라자 알리 하지라는 학자가 19세기에 말레이어 문법과 사전을 정리했고, 그 작업이 훗날 인도네시아어의 규범을 세우는 데 바탕이 되었습니다. 그래서 이 일대를 인도네시아어의 고향이라 부르기도 합니다.\n\n" +
      "지금은 조용한 항구 도시입니다. 나무 기둥을 물에 박고 그 위에 지은 수상 마을이 해안을 따라 이어지고, 배를 타야 갈 수 있는 골목이 아직 남아 있습니다.",
    words: [
      {
        word: "bahasa Melayu",
        meaning: "말레이어",
        example: "Bahasa Melayu dari daerah ini menjadi dasar bahasa Indonesia.",
        exampleKo: "이 지역의 말레이어가 인도네시아어의 바탕이 되었습니다.",
      },
      {
        word: "kamus",
        meaning: "사전",
        example: "Dia menyusun kamus dan tata bahasa Melayu.",
        exampleKo: "그는 말레이어 사전과 문법을 엮었습니다.",
      },
    ],
    wiki: "Tanjungpinang",
  },

  // ---------------- 잠비 · 븡쿨루 ----------------
  "Jambi": {
    desc:
      "바탕하리 강가에 있는 도시입니다. 인도네시아에서 가장 긴 강 중 하나인 이 물길을 따라 예부터 배가 오르내렸고, 상류의 계피와 고무가 이 도시를 거쳐 바다로 나갔습니다.\n\n" +
      "이 일대는 7세기부터 스리위자야의 세력권이었고, 강 상류에는 벽돌 사원이 흩어진 넓은 유적이 있습니다. 강가에는 지금도 나무로 지은 수상 가옥이 늘어서 있어 물이 불면 함께 오르내립니다.\n\n" +
      "잠비의 숲에는 오랑 림바라 불리는 사람들이 삽니다. 숲을 옮겨 다니며 사냥과 채집으로 살아온 이들인데, 농원이 숲을 잘라 들어오면서 살 곳이 좁아졌습니다. 이들을 위한 학교와 정착 사업이 여러 차례 시도되었지만, 숲을 떠나는 일과 지키는 일 사이에서 답이 쉽지 않습니다.",
    words: [
      {
        word: "sungai besar",
        meaning: "큰 강",
        example: "Sungai besar itu mengalir melewati kota ini.",
        exampleKo: "그 큰 강은 이 도시를 지나 흐릅니다.",
      },
      {
        word: "berpindah",
        meaning: "옮겨 다니다, 이동하다",
        example: "Mereka dulu hidup berpindah di dalam hutan.",
        exampleKo: "그들은 예전에 숲속을 옮겨 다니며 살았습니다.",
      },
    ],
    wiki: "Jambi (city)",
  },

  "Muara Jambi": {
    desc:
      "잠비 시내에서 강을 따라 조금 내려가면 나오는 유적지입니다. 규모가 놀랍습니다. 사방 몇 킬로미터에 걸쳐 벽돌 건물터가 흩어져 있어, 면적으로는 동남아 최대의 사원 유적으로 꼽힙니다.\n\n" +
      "7세기에서 13세기 사이 이곳은 불교를 공부하러 오는 사람들이 모이던 배움터였습니다. 중국 승려들이 인도로 가는 길에 이곳에 들러 산스크리트를 익히고 갔다는 기록이 남아 있습니다. 바다를 낀 이 강가가 한때 아시아 불교 학문의 길목이었던 셈입니다.\n\n" +
      "오랫동안 밀림과 흙에 묻혀 있다가 19세기에 영국인이 발견했고, 지금도 발굴이 계속됩니다. 유적 사이로 마을 사람들의 밭과 길이 나 있어, 관광지라기보다 사람이 사는 들판 같습니다.",
    words: [
      {
        word: "biara",
        meaning: "수도원, 승원",
        example: "Dulu ada biara tempat orang belajar agama di sini.",
        exampleKo: "예전에 이곳에는 종교를 배우던 승원이 있었습니다.",
      },
      {
        word: "menggali",
        meaning: "파다, 발굴하다",
        example: "Para ahli masih menggali situs ini sampai sekarang.",
        exampleKo: "전문가들이 지금도 이 유적을 발굴하고 있습니다.",
      },
    ],
    wiki: "Muaro Jambi Temple Compounds",
  },

  "Bengkulu": {
    desc:
      "수마트라 서남 해안의 조용한 주도입니다. 이곳에는 영국의 흔적이 남아 있습니다. 18세기 영국 동인도회사가 후추를 얻으려고 이 해안에 자리를 잡고 말버러 요새를 쌓았는데, 인도네시아에 남은 영국 요새로는 가장 큰 것입니다. 나중에 영국은 이 땅을 네덜란드에 넘기고 싱가포르를 받았습니다.\n\n" +
      "이 도시는 수카르노가 유배 생활을 한 두 번째 장소이기도 합니다. 플로레스의 엔데에서 이곳으로 옮겨 와 몇 해를 지냈고, 그가 살던 집이 남아 있습니다. 훗날 아내가 된 파트마와티를 이곳에서 만났는데, 그녀가 손으로 꿰맨 붉고 흰 천이 1945년 독립 선언식에 걸린 첫 국기가 되었습니다.\n\n" +
      "이 지역 숲에는 세계에서 가장 큰 꽃이 핍니다. 잎도 줄기도 없이 땅에서 곧바로 지름 1미터에 이르는 붉은 꽃이 피었다가 며칠 만에 시듭니다.",
    words: [
      {
        word: "bendera",
        meaning: "깃발, 국기",
        example: "Bendera pertama dijahit dengan tangan di kota ini.",
        exampleKo: "첫 국기는 이 도시에서 손으로 꿰매졌습니다.",
      },
      {
        word: "bunga",
        meaning: "꽃",
        example: "Bunga terbesar di dunia tumbuh di hutan ini.",
        exampleKo: "세계에서 가장 큰 꽃이 이 숲에서 자랍니다.",
      },
    ],
    wiki: "Bengkulu",
  },

  "Gunung Kerinci": {
    desc:
      "3,805미터로 인도네시아에서 가장 높은 화산이자, 수마트라의 지붕입니다. 사방이 차밭과 밀림으로 둘러싸여 있고 정상까지 이틀을 걸어야 합니다. 맑은 날 꼭대기에 서면 서쪽으로 인도양이, 동쪽으로 끝없는 숲이 보입니다.\n\n" +
      "이 산자락의 크린치 계곡은 흙이 좋아 인도네시아에서 가장 오래된 차 농원 중 하나가 있고, 계피가 세계 시장으로 나갑니다. 산 아래 호수와 늪지에는 물이 맑아 사람들이 그 물로 논을 댑니다.\n\n" +
      "이 숲은 수마트라호랑이가 가장 많이 남은 곳이기도 합니다. 마을 사람들은 호랑이를 조상과 이어진 존재로 여겨 함부로 이름을 부르지 않는 관습이 있었습니다. 사람과 호랑이가 같은 산에서 오래 버텨 온 셈입니다.",
    words: [
      {
        word: "puncak",
        meaning: "정상, 꼭대기",
        example: "Puncak gunung ini paling tinggi di Sumatera.",
        exampleKo: "이 산의 정상은 수마트라에서 가장 높습니다.",
      },
      {
        word: "harimau",
        meaning: "호랑이",
        example: "Harimau masih hidup di hutan sekitar gunung ini.",
        exampleKo: "호랑이가 아직 이 산 주변 숲에 삽니다.",
      },
    ],
    wiki: "Mount Kerinci",
  },

  "Palembang": {
    desc:
      "무시 강이 도시를 가르고 지나가는, 인도네시아에서 손꼽히게 오래된 도시입니다. 7세기부터 이곳에는 스리위자야가 있었습니다. 배를 가진 이 왕국은 말라카 해협을 쥐고 수백 년 동안 동남아 바다를 지배했으며, 중국과 인도를 잇는 뱃길의 관문이었습니다.\n\n" +
      "이 왕국은 불교의 중심이기도 했습니다. 7세기 중국 승려 의정이 인도로 가는 길에 이곳에 여러 해 머물며 산스크리트를 배웠고, 이 도시에 천 명이 넘는 승려가 공부하고 있다고 기록했습니다.\n\n" +
      "지금 팔렘방은 강 위의 붉은 다리와 생선 반죽 음식으로 알려져 있습니다. 생선살에 사고 전분을 섞어 쪄내거나 튀긴 뒤 검고 새콤한 소스에 찍어 먹는데, 이 도시 사람들은 아침으로도 먹습니다. 강가에는 수상 가옥과 배 위의 주유소가 여전히 있습니다.",
    words: [
      {
        word: "pedagang",
        meaning: "상인",
        example: "Pedagang dari Cina dan India datang ke kota ini.",
        exampleKo: "중국과 인도의 상인들이 이 도시에 왔습니다.",
      },
      {
        word: "adonan ikan",
        meaning: "생선 반죽",
        example: "Adonan ikan itu dikukus lalu digoreng.",
        exampleKo: "그 생선 반죽은 쪄낸 다음 튀깁니다.",
      },
    ],
    wiki: "Palembang",
  },

  // ---------------- 남부 해안 · 섬 ----------------
  "Bandar Lampung": {
    desc:
      "수마트라 남쪽 끝의 항구 도시입니다. 자바와는 좁은 해협 하나를 사이에 두고 있어, 두 섬을 오가는 차와 사람이 모두 이 도시의 항구를 지납니다. 밤이면 대형 여객선이 줄지어 해협을 건넙니다.\n\n" +
      "1883년 크라카타우가 터졌을 때 이 해안이 정면으로 파도를 맞았습니다. 도시가 통째로 쓸려 나가 지금 자리에 다시 세워졌고, 바닷가에 그때 파도에 떠밀려 온 등부표가 기념물로 서 있습니다.\n\n" +
      "람풍은 인도네시아의 이주 정책이 가장 크게 시행된 곳이기도 합니다. 네덜란드 시절부터 자바에서 사람들을 옮겨 와 땅을 나눠 주었고, 그 결과 지금은 자바계 주민이 원주민보다 많습니다. 마을 이름에 자바 지명이 그대로 붙어 있는 곳이 많습니다.",
    words: [
      {
        word: "penyeberangan",
        meaning: "건너감, 도선",
        example: "Penyeberangan ke Jawa berlangsung sepanjang malam.",
        exampleKo: "자바로 건너가는 배가 밤새 오갑니다.",
      },
      {
        word: "perpindahan penduduk",
        meaning: "주민 이주",
        example: "Perpindahan penduduk dari Jawa mengubah daerah ini.",
        exampleKo: "자바에서 온 주민 이주가 이 지역을 바꿨습니다.",
      },
    ],
    wiki: "Bandar Lampung",
  },

  "Pangkalpinang": {
    desc:
      "방카 섬의 중심 도시입니다. 이 섬의 역사는 주석이 만들었습니다. 18세기부터 이 땅에서 주석이 쏟아져 나왔고, 캐낼 사람을 대려고 중국 남부에서 노동자를 대규모로 실어 왔습니다. 그 후손들이 지금 섬 인구의 큰 몫을 이룹니다.\n\n" +
      "그래서 이 도시는 이슬람 모스크와 중국 사원, 성당과 힌두 사원이 한 구역에 모여 있는 광장을 가지고 있습니다. 다른 종교의 건물을 나란히 세워 두고 오간다는 점에서 인도네시아에서도 자주 언급되는 곳입니다.\n\n" +
      "독립 직후 네덜란드가 다시 밀고 들어왔을 때 수카르노와 하타가 이 섬으로 유배되었습니다. 그들이 갇혀 지내던 집이 남아 있고, 그곳에서 네덜란드와의 마지막 협상이 시작되었습니다.\n\n" +
      "주석 광산이 파낸 자리에는 물이 고여 푸른 못이 되었습니다. 아름다워 보이지만 물에 금속이 섞여 있어 사람이 들어가면 안 되는 곳입니다.",
    words: [
      {
        word: "timah",
        meaning: "주석",
        example: "Timah dari pulau ini dijual ke seluruh dunia.",
        exampleKo: "이 섬의 주석은 전 세계로 팔려 나갑니다.",
      },
      {
        word: "tambang",
        meaning: "광산",
        example: "Bekas tambang itu kini menjadi kolam.",
        exampleKo: "그 폐광 자리는 지금 못이 되었습니다.",
      },
    ],
    wiki: "Pangkalpinang",
  },

  "Pulau Belitung": {
    desc:
      "방카 옆에 있는 섬입니다. 해변에 집채만 한 화강암 덩어리들이 모래 위에 흩어져 있어 다른 곳에서 보기 어려운 풍경을 만듭니다. 물이 얕고 맑아 바위 사이로 배를 저어 다닐 수 있습니다.\n\n" +
      "이 섬도 오래 주석을 캐던 곳이었습니다. 광산이 문을 닫으면서 섬은 가난해졌고 젊은이들이 떠났습니다.\n\n" +
      "그 시절 이야기를 쓴 소설 한 권이 섬을 바꿨습니다. 문 닫힐 위기의 시골 학교에서 열 명의 아이가 배우는 이야기였는데, 인도네시아에서 크게 읽히고 영화로도 만들어졌습니다. 그 뒤 사람들이 소설 속 학교와 해변을 보러 오기 시작했고, 지금은 관광이 섬의 새 살림이 되었습니다. 배움이 사람을 어디까지 데려가는가를 다룬 이야기가 실제로 섬의 형편을 바꾼 셈입니다.",
    words: [
      {
        word: "novel",
        meaning: "소설",
        example: "Novel itu membuat pulau ini terkenal.",
        exampleKo: "그 소설이 이 섬을 유명하게 만들었습니다.",
      },
      {
        word: "batu granit",
        meaning: "화강암",
        example: "Batu granit besar berserakan di pantai.",
        exampleKo: "큰 화강암들이 해변에 흩어져 있습니다.",
      },
    ],
    wiki: "Belitung Regency",
  },
};
