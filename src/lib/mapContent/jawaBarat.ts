// src/lib/mapContent/jawaBarat.ts
// 배치 2 — 자바 서부 · 자카르타권 16곳
//
// 단어는 지도 전체에서 유일해야 합니다. 배치 1(자바 중·동부)의 56개와도 겹치면 안 됩니다.

import { MapContentTable } from "./types";

export const JAWA_BARAT: MapContentTable = {
  // ---------------- 자카르타권 ----------------
  "Jakarta": {
    desc:
      "네 개의 이름을 거쳐 온 도시입니다. 순다 왕국의 항구 순다 클라파였다가, 1527년 이슬람 세력이 빼앗아 자야카르타로 바꾸었고, 네덜란드가 그 위에 운하를 파고 바타비아를 세웠으며, 독립과 함께 자카르타가 되었습니다. 옛 항구에는 지금도 나무로 만든 화물 범선이 짐을 싣습니다.\n\n" +
      "이곳 토박이를 브타위라고 부릅니다. 자바인, 순다인, 중국계, 아랍계, 발리인이 오랜 세월 섞여 만들어진 사람들이라 말도 음식도 어느 쪽 하나로 딱 떨어지지 않습니다. 도시가 커지면서 이들은 점점 외곽으로 밀려났습니다.\n\n" +
      "지금 자카르타의 가장 큰 걱정은 물과 무게입니다. 지하수를 뽑아 쓴 탓에 북부는 해마다 가라앉고, 우기에는 도심이 잠깁니다. 그래서 정부는 칼리만탄에 새 수도를 짓고 있습니다.",
    words: [
      {
        word: "macet",
        meaning: "(길이) 막히다, 정체된",
        example: "Jalan di Jakarta selalu macet pada jam pulang kerja.",
        exampleKo: "자카르타 길은 퇴근 시간이면 늘 막힙니다.",
      },
      {
        word: "pendatang",
        meaning: "외지에서 온 사람, 이주민",
        example: "Banyak pendatang mencari pekerjaan di ibu kota.",
        exampleKo: "많은 이주민이 수도에서 일자리를 찾습니다.",
      },
    ],
  },

  "Bogor": {
    desc:
      "자카르타에서 남쪽으로 한 시간, 살락 산 자락에 있는 도시입니다. 별명이 비의 도시인데 과장이 아닙니다. 일 년에 비 오는 날이 300일 가까이 되어 세계에서 천둥이 가장 잦은 곳 중 하나로 꼽힙니다. 오후 세 시쯤이면 하늘이 갑자기 어두워지는 것이 이곳의 일상입니다.\n\n" +
      "그 습하고 서늘한 기후 덕에 1817년 네덜란드가 이곳에 식물원을 열었습니다. 87헥타르에 만 종이 넘는 식물이 자라고, 동남아 열대 식물학의 출발점이 된 곳입니다. 고무나무와 기름야자가 인도네시아 전역으로 퍼져 나간 것도 여기서 시작되었습니다.\n\n" +
      "식물원 안에는 대통령궁이 있습니다. 네덜란드 총독의 별장이던 건물이고, 지금도 정원에 사슴이 풀을 뜯습니다.",
    words: [
      {
        word: "hujan",
        meaning: "비",
        example: "Hujan turun hampir setiap sore di kota ini.",
        exampleKo: "이 도시에는 거의 매일 오후에 비가 내립니다.",
      },
      {
        word: "kebun",
        meaning: "정원, 밭",
        example: "Kebun itu menyimpan lebih dari sepuluh ribu jenis tanaman.",
        exampleKo: "그 정원에는 만 종이 넘는 식물이 있습니다.",
      },
    ],
  },

  "Depok": {
    desc:
      "지금은 자카르타로 출퇴근하는 사람들이 사는 큰 위성도시이지만, 이 땅에는 특이한 내력이 있습니다.\n\n" +
      "1714년 네덜란드 동인도회사 관리였던 코르넬리스 하스텔레인이 죽으면서 자기 땅을 소유한 노예들에게 물려주었습니다. 자유를 얻은 이들은 기독교 신앙을 받아들이고 열두 개의 성씨를 갖게 되었으며, 그 후손들이 대대로 이 땅에 살았습니다. 사람들은 이들을 데폭 사람이라 불렀고, 자바 한복판에 유럽식 성씨를 쓰는 기독교 마을이 생긴 셈이었습니다. 지금도 옛 교회와 공동체 건물이 남아 있습니다.\n\n" +
      "오늘의 데폭은 완전히 다른 얼굴입니다. 인도네시아 대학이 이곳으로 옮겨 오면서 학생 도시가 되었고, 인구 200만이 넘는 도시로 커졌습니다.",
    words: [
      {
        word: "warisan",
        meaning: "유산, 물려받은 것",
        example: "Tanah itu menjadi warisan bagi para bekas budak.",
        exampleKo: "그 땅은 해방된 노예들에게 유산이 되었습니다.",
      },
      {
        word: "keturunan",
        meaning: "후손, 자손",
        example: "Keturunan mereka masih tinggal di kota ini.",
        exampleKo: "그들의 후손은 지금도 이 도시에 삽니다.",
      },
    ],
  },

  "Tangerang": {
    desc:
      "자카르타 서쪽에 붙은 도시이고, 인도네시아의 관문 공항이 여기 있습니다. 인도네시아에 들어오는 사람 대부분이 처음 밟는 땅이 자카르타가 아니라 탕에랑인 셈입니다.\n\n" +
      "이 도시에는 아주 오래된 중국계 공동체가 있습니다. 17세기부터 강가의 요새 근처에 자리 잡아 치나 븐텡이라 불렸는데, 오래 살면서 언어와 옷차림이 현지화되어 중국어를 못 하는 이들이 많습니다. 결혼식 풍습이나 제사에는 두 문화가 함께 남아 있습니다.\n\n" +
      "지금은 공장과 신도시가 끝없이 이어지는 곳입니다. 자카르타의 값이 오르면서 사람과 산업이 이쪽으로 밀려 나왔습니다.",
    words: [
      {
        word: "pesawat",
        meaning: "비행기",
        example: "Pesawat dari Korea mendarat di kota ini.",
        exampleKo: "한국에서 온 비행기는 이 도시에 착륙합니다.",
      },
      {
        word: "leluhur",
        meaning: "조상",
        example: "Mereka masih menghormati leluhur dengan cara lama.",
        exampleKo: "그들은 아직도 옛 방식으로 조상을 기립니다.",
      },
    ],
  },

  "Bekasi": {
    desc:
      "자카르타 동쪽 위성도시입니다. 인도네시아 젊은이들 사이에서 이 도시는 농담의 소재입니다. 너무 덥고 너무 멀어서 지구가 아니라 다른 행성이라는 우스개가 오래 돌았고, 브카시 사람들도 그 농담을 즐깁니다.\n\n" +
      "농담 뒤에는 사정이 있습니다. 이곳은 인도네시아 최대급 공업지대여서 자동차와 전자 공장이 줄지어 있고, 아침마다 수십만 명이 자카르타로 나갑니다. 논이던 땅이 한 세대 만에 공장과 아파트로 덮였습니다.\n\n" +
      "역사도 짧지 않습니다. 독립전쟁 때 이 일대에서 격렬한 싸움이 있었고, 도시 표어에도 그 기억이 남아 있습니다.",
    words: [
      {
        word: "panas",
        meaning: "더운, 뜨거운",
        example: "Udara di Bekasi terkenal sangat panas.",
        exampleKo: "브카시의 공기는 아주 덥기로 유명합니다.",
      },
      {
        word: "buruh",
        meaning: "노동자",
        example: "Ribuan buruh bekerja di kawasan industri itu.",
        exampleKo: "수천 명의 노동자가 그 공업지대에서 일합니다.",
      },
    ],
  },

  // ---------------- 서부 자바 고원 ----------------
  "Bandung": {
    desc:
      "해발 768미터 분지에 있어 네덜란드가 파리를 흉내 내 꾸민 도시입니다. 브라가 거리의 아르데코 건물들이 그 시절 흔적이고, 한때는 수도를 이곳으로 옮기려는 계획까지 있었습니다.\n\n" +
      "1955년 이 도시에서 아시아·아프리카 회의가 열렸습니다. 갓 독립한 스물아홉 나라의 지도자들이 모여 식민주의에 반대하고 어느 진영에도 서지 않겠다고 선언했고, 그 정신을 반둥 정신이라 부릅니다. 회의장이던 건물은 지금 박물관입니다.\n\n" +
      "오늘의 반둥은 순다 문화의 중심이자 젊은 도시입니다. 공과대학을 비롯한 대학이 많고, 서늘한 날씨 덕에 주말이면 자카르타 사람들이 옷을 사러 몰려옵니다.",
    words: [
      {
        word: "konferensi",
        meaning: "회의, 회담",
        example: "Konferensi itu diadakan pada tahun 1955.",
        exampleKo: "그 회의는 1955년에 열렸습니다.",
      },
      {
        word: "pakaian",
        meaning: "옷, 의복",
        example: "Banyak orang datang ke Bandung untuk membeli pakaian.",
        exampleKo: "많은 사람이 옷을 사러 반둥에 옵니다.",
      },
    ],
  },

  "Sukabumi": {
    desc:
      "서부 자바 남쪽, 게데 산과 남해 사이의 산간 지역입니다. 이름은 순다어로 좋은 땅이라는 뜻이고, 네덜란드가 이 서늘한 비탈에 차 농원을 열면서 붙은 이름입니다. 지금도 산허리를 따라 차밭이 이어집니다.\n\n" +
      "남쪽 해안은 전혀 다른 얼굴입니다. 절벽과 폭포가 이어지는 칠레투 일대는 아주 오래된 지층이 드러난 곳이라 유네스코 세계지질공원으로 지정되었고, 팔라부한라투 앞바다는 파도가 세서 서핑하는 사람들이 찾습니다.\n\n" +
      "다만 이 땅은 흔들립니다. 자바 남쪽 바다 밑에서 판이 밀려 들어오는 자리라 지진이 잦고, 학교에서 대피 훈련을 자주 합니다.",
    words: [
      {
        word: "teh",
        meaning: "차",
        example: "Kebun teh tumbuh di lereng gunung ini.",
        exampleKo: "차밭이 이 산비탈에 펼쳐져 있습니다.",
      },
      {
        word: "gempa",
        meaning: "지진",
        example: "Gempa sering terjadi di pantai selatan Jawa.",
        exampleKo: "자바 남쪽 해안에서는 지진이 자주 일어납니다.",
      },
    ],
  },

  "Tasikmalaya": {
    desc:
      "순다 지역의 공예 도시입니다. 대나무살에 종이를 발라 꽃을 그린 우산, 나무를 깎아 만든 굽 있는 신, 늪에서 자라는 풀로 엮은 돗자리가 이곳에서 나옵니다. 기계로 찍어내는 물건에 밀려 장인은 줄었지만, 아직 골목마다 작업장이 남아 있습니다.\n\n" +
      "동시에 이슬람 기숙학교가 아주 많은 곳이어서 산트리의 도시라고도 불립니다. 마을마다 학교가 있고, 새벽이면 코란 읽는 소리가 골목에 퍼집니다.\n\n" +
      "주변은 온통 산입니다. 갈룽궁 화산이 1982년 크게 터졌을 때 화산재가 하늘을 덮어 지나던 여객기 네 개의 엔진이 모두 멈췄다가 겨우 되살아난 일이 있었습니다.",
    words: [
      {
        word: "anyaman",
        meaning: "엮어 만든 세공",
        example: "Anyaman dari daerah ini dijual ke seluruh Jawa.",
        exampleKo: "이 지역의 엮음 세공은 자바 전역으로 팔려 나갑니다.",
      },
      {
        word: "payung",
        meaning: "우산",
        example: "Payung kertas itu dilukis dengan tangan.",
        exampleKo: "그 종이 우산은 손으로 그림을 그린 것입니다.",
      },
    ],
  },

  // ---------------- 북부 해안 · 반텐 ----------------
  "Cirebon": {
    desc:
      "이름부터 새우 냄새가 납니다. 순다어로 물을 뜻하는 차이와 잔새우를 뜻하는 르본이 붙은 말이라, 이 도시는 예부터 새우를 잡아 젓갈을 담그던 갯마을에서 시작했습니다. 지금도 인도네시아 요리의 바탕이 되는 새우 젓갈이 여기서 많이 나옵니다.\n\n" +
      "자바 북해안 한가운데라 자바 문화와 순다 문화가 겹치고, 여기에 중국과 아랍이 더해졌습니다. 이 도시의 바틱은 그래서 다릅니다. 자바 내륙의 갈색 계열 대신 파랑과 빨강을 쓰고, 무늬는 중국식 구름입니다. 겹겹이 밀려오는 구름을 그린 므가 믄둥은 인도네시아 바틱 중에서도 한눈에 알아볼 수 있습니다.\n\n" +
      "왈리송오의 한 사람인 수난 구눙 자티가 이곳에서 술탄국을 열었고, 그의 묘는 지금도 순례객이 끊이지 않습니다. 15세기에 세운 왕궁도 남아 있습니다.",
    words: [
      {
        word: "udang",
        meaning: "새우",
        example: "Nama kota ini berasal dari kata udang kecil.",
        exampleKo: "이 도시의 이름은 잔새우를 뜻하는 말에서 왔습니다.",
      },
      {
        word: "awan",
        meaning: "구름",
        example: "Motif awan menjadi ciri khas batik Cirebon.",
        exampleKo: "구름 무늬는 치르본 바틱의 특징입니다.",
      },
    ],
  },

  "Serang": {
    desc:
      "반텐 주의 행정 중심입니다. 반텐은 2000년에야 서부 자바에서 갈라져 나온 젊은 주이지만, 그 이름은 인도네시아 역사에서 아주 오래된 것입니다.\n\n" +
      "이 지역에는 데부스라는 독특한 전통이 남아 있습니다. 쇠꼬챙이로 몸을 찌르거나 뜨거운 것을 다루면서도 다치지 않는 것을 보이는 공연인데, 원래는 반텐 술탄국 시절 사람들에게 담대함을 심으려던 훈련에서 나왔다고 전해집니다. 지금은 결혼식이나 마을 행사에서 볼 수 있습니다.\n\n" +
      "북쪽 칠레곤 일대에는 인도네시아 최대의 제철소가 있어, 조용한 주도 옆으로 굴뚝과 항만이 이어지는 낯선 풍경이 펼쳐집니다.",
    words: [
      {
        word: "besi",
        meaning: "쇠, 철",
        example: "Pabrik besi terbesar di Indonesia ada di dekat sini.",
        exampleKo: "인도네시아 최대의 제철 공장이 이 근처에 있습니다.",
      },
      {
        word: "pertunjukan",
        meaning: "공연",
        example: "Pertunjukan itu sering diadakan pada pesta pernikahan.",
        exampleKo: "그 공연은 결혼식에서 자주 열립니다.",
      },
    ],
  },

  "Banten Lama": {
    desc:
      "지금은 무너진 담과 풀밭뿐이지만, 400년 전 이곳은 동남아에서 손꼽히는 국제 항구였습니다. 반텐 술탄국은 후추를 팔아 부유해졌고, 중국·인도·아랍·유럽의 배가 이 항구에 몰렸습니다.\n\n" +
      "1596년 네덜란드 배가 처음 인도네시아 땅에 닿은 곳도 여기입니다. 후추를 사러 온 상인들이었지만 결국 350년의 식민 지배가 시작되는 자리가 되었습니다. 그들이 나중에 쌓은 스펠베이크 요새의 벽이 아직 남아 있습니다.\n\n" +
      "무너진 도시 한가운데 대모스크만은 살아 있습니다. 자바식 다층 지붕에 등대처럼 생긴 흰 첨탑이 붙어 있는데, 중국인 건축가와 네덜란드인이 함께 지었다는 이야기가 전해집니다. 지금도 자바 곳곳에서 순례객이 이 모스크와 술탄들의 묘를 찾아옵니다.",
    words: [
      {
        word: "lada",
        meaning: "후추",
        example: "Kerajaan ini menjadi kaya karena lada.",
        exampleKo: "이 왕국은 후추 덕에 부유해졌습니다.",
      },
      {
        word: "benteng",
        meaning: "요새, 성채",
        example: "Dinding benteng tua itu masih berdiri.",
        exampleKo: "그 오래된 요새의 벽은 아직 서 있습니다.",
      },
    ],
    wiki: "Great Mosque of Banten",
  },

  // ---------------- 화산과 밀림 ----------------
  "Krakatau": {
    desc:
      "1883년 8월, 자바와 수마트라 사이의 이 섬이 스스로를 날려버렸습니다. 폭발음은 4,800킬로미터 떨어진 인도양의 섬에서도 들렸고, 이것은 기록으로 남은 인류 역사상 가장 멀리 간 소리입니다.\n\n" +
      "정작 사람을 죽인 것은 소리가 아니라 물이었습니다. 무너진 섬이 만든 거대한 파도가 해안 마을들을 덮쳐 3만 6천 명이 넘게 목숨을 잃었습니다. 하늘로 올라간 재는 몇 년 동안 지구의 기온을 떨어뜨렸고, 그 시절 유럽 화가들이 그린 유난히 붉은 노을이 이 화산 때문이었다고 봅니다.\n\n" +
      "1927년 그 자리에서 새 섬이 솟아올랐습니다. 사람들은 크라카타우의 아이라고 부릅니다. 이 아이도 2018년에 한쪽이 무너져 다시 파도를 일으켰습니다. 지금도 자라고 있습니다.",
    words: [
      {
        word: "letusan",
        meaning: "분화, 폭발",
        example: "Letusan tahun 1883 terdengar sampai jauh sekali.",
        exampleKo: "1883년의 분화는 아주 멀리까지 들렸습니다.",
      },
      {
        word: "gelombang",
        meaning: "파도, 물결",
        example: "Gelombang besar menghancurkan desa di pantai.",
        exampleKo: "큰 파도가 해안 마을을 무너뜨렸습니다.",
      },
    ],
  },

  "Ujung Kulon": {
    desc:
      "자바 섬의 서쪽 끝, 사람의 손이 가장 늦게까지 닿지 않은 밀림입니다. 크라카타우가 터졌을 때 이 일대가 쑥대밭이 되어 사람들이 떠났고, 그 덕에 숲이 되살아났다는 역설이 있습니다.\n\n" +
      "이곳은 자바코뿔소가 지구에서 유일하게 남은 서식지입니다. 뿔이 하나뿐이고 갑옷 같은 주름이 있는 이 코뿔소는 한때 아시아 여러 나라에 살았지만 이제 이 반도에 수십 마리만 남았습니다. 사람 눈에는 거의 띄지 않아, 연구자들도 카메라와 발자국으로만 확인합니다.\n\n" +
      "표범과 긴팔원숭이, 악어도 함께 삽니다. 유네스코 세계자연유산이며, 배를 타고 들어가 걸어서만 다닐 수 있습니다.",
    words: [
      {
        word: "badak",
        meaning: "코뿔소",
        example: "Badak bercula satu hanya hidup di tempat ini.",
        exampleKo: "외뿔 코뿔소는 이곳에서만 삽니다.",
      },
      {
        word: "langka",
        meaning: "희귀한, 드문",
        example: "Hewan langka itu jarang terlihat manusia.",
        exampleKo: "그 희귀한 동물은 사람 눈에 좀처럼 띄지 않습니다.",
      },
    ],
  },

  "Tangkuban Perahu": {
    desc:
      "반둥 북쪽에 있는 화산인데, 이름이 곧 그 모양입니다. 뒤집힌 배라는 뜻이고 능선이 정말 엎어놓은 배처럼 길고 평평합니다.\n\n" +
      "여기에는 순다 사람들이 대대로 전해 온 이야기가 붙어 있습니다. 헤어져 자란 아들이 자기 어머니인 줄 모르고 청혼하자, 어머니는 하룻밤에 호수와 배를 만들면 승낙하겠다고 했습니다. 거의 다 만들어 가는 것을 보고 그녀가 새벽을 앞당기자 화가 난 아들이 배를 걷어차 뒤집었고, 그것이 이 산이 되었다는 이야기입니다.\n\n" +
      "차로 분화구 가장자리까지 올라갈 수 있어 접근이 쉽습니다. 유황 냄새가 올라오는 큰 분화구를 내려다볼 수 있고, 산기슭에는 온천이 있습니다.",
    words: [
      {
        word: "perahu",
        meaning: "배, 나룻배",
        example: "Bentuk gunung ini seperti perahu.",
        exampleKo: "이 산의 모양은 배와 같습니다.",
      },
      {
        word: "terbalik",
        meaning: "뒤집힌, 거꾸로 된",
        example: "Perahu itu terbalik dan menjadi gunung.",
        exampleKo: "그 배는 뒤집혀 산이 되었습니다.",
      },
    ],
  },

  // ---------------- 순다 전통 마을 ----------------
  "Baduy": {
    desc:
      "자카르타에서 차로 서너 시간이면 닿는 산속에, 바깥 문물을 스스로 거절하고 사는 사람들이 있습니다. 순다계인 바두이족입니다.\n\n" +
      "이들은 안쪽과 바깥쪽으로 나뉩니다. 안쪽 사람들은 흰옷만 입고 전기와 기계를 쓰지 않으며, 신발을 신지 않고 어디든 걸어서 갑니다. 자카르타에 갈 일이 있어도 며칠을 걸어서 갑니다. 바깥쪽 사람들은 검푸른 옷을 입고 바깥과 거래도 하지만, 기본 규범은 함께 지킵니다. 이 규범을 어기면 안쪽에서 바깥쪽으로 옮겨 살아야 합니다.\n\n" +
      "해마다 한 번 이들은 지방 정부를 찾아가 농사 소식을 전하고 선물을 건네는 행사를 치릅니다. 수백 명이 줄지어 걸어 나오는 이 행렬은 자바 서부에서 가장 인상적인 광경 중 하나입니다.",
    words: [
      {
        word: "larangan",
        meaning: "금지, 금기",
        example: "Ada banyak larangan yang mereka jaga sejak dulu.",
        exampleKo: "그들이 옛날부터 지켜 온 금기가 많습니다.",
      },
      {
        word: "berjalan kaki",
        meaning: "걸어서 가다",
        example: "Mereka berjalan kaki sampai ke kota.",
        exampleKo: "그들은 도시까지 걸어서 갑니다.",
      },
    ],
    wiki: "Baduy people",
  },

  "Kampung Naga": {
    desc:
      "타식말라야 근처 계곡 아래에 있는 백여 채짜리 마을입니다. 큰길에서 계단을 한참 내려가야 나오는데, 내려가는 순간 시대가 바뀝니다.\n\n" +
      "집은 모두 대나무와 나무로 짓고 야자 잎으로 지붕을 이었습니다. 크기와 방향, 창의 위치까지 정해진 대로여서 어느 집도 튀지 않습니다. 마을에는 전기가 들어오지 않습니다. 정부가 넣으려 했지만 주민들이 사양했습니다. 볏짚 지붕에 불이 날까 걱정해서이기도 하고, 조상이 정한 방식을 바꾸지 않기 위해서이기도 합니다.\n\n" +
      "이들은 무슬림이면서 순다의 옛 규범을 함께 지킵니다. 특정 요일에는 마을의 내력을 입에 올리지 않는 관습도 있습니다. 관광객을 막지는 않지만, 마을 사람들의 하루는 관광과 상관없이 흘러갑니다.",
    words: [
      {
        word: "bambu",
        meaning: "대나무",
        example: "Semua rumah di desa ini dibuat dari bambu.",
        exampleKo: "이 마을의 모든 집은 대나무로 지어졌습니다.",
      },
      {
        word: "listrik",
        meaning: "전기",
        example: "Warga desa memilih hidup tanpa listrik.",
        exampleKo: "마을 사람들은 전기 없이 사는 쪽을 택했습니다.",
      },
    ],
  },
};
