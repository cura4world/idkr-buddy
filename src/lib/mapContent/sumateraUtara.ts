// src/lib/mapContent/sumateraUtara.ts
// 배치 4 — 수마트라 북부 17곳 (아체 · 북수마트라 · 서수마트라)
//
// 단어는 지도 전체에서 유일해야 합니다. 앞 배치들의 129개와도 겹치면 안 됩니다.

import { MapContentTable } from "./types";

export const SUMATERA_UTARA: MapContentTable = {
  // ---------------- 아체 ----------------
  "Banda Aceh": {
    desc:
      "수마트라 최북단의 도시입니다. 이곳은 오래도록 독립적인 땅이었습니다. 16세기 아체 술탄국은 후추와 향신료로 부유했고 오스만 제국과 사절을 주고받았으며, 네덜란드가 인도네시아 전역을 삼킨 뒤에도 아체는 30년 넘게 싸워 마지막까지 굴복하지 않았습니다.\n\n" +
      "2004년 12월 26일 아침, 앞바다에서 일어난 지진이 거대한 파도를 보냈습니다. 도시의 절반이 씻겨 나갔고 아체에서만 십육만 명이 넘게 목숨을 잃었습니다. 물이 3킬로미터 안쪽까지 밀고 들어와, 지금도 육지 한복판에 그때 떠밀려 온 배가 그대로 놓여 있습니다.\n\n" +
      "그 재앙이 오래된 내전을 끝냈습니다. 이듬해 정부와 무장 조직이 평화 협정에 서명했고, 아체는 이슬람법을 적용하는 특별자치주가 되었습니다. 도시 한복판의 대모스크는 파도 속에서도 무너지지 않아 사람들이 그 안에서 살아남았습니다.",
    words: [
      {
        word: "gelombang tsunami",
        meaning: "쓰나미",
        example: "Gelombang tsunami menghancurkan setengah kota ini.",
        exampleKo: "쓰나미가 이 도시의 절반을 무너뜨렸습니다.",
      },
      {
        word: "damai",
        meaning: "평화로운, 평화",
        example: "Perjanjian damai ditandatangani setahun kemudian.",
        exampleKo: "평화 협정이 이듬해에 체결되었습니다.",
      },
    ],
  },

  "Pulau Weh": {
    desc:
      "인도네시아 국토의 서쪽 끝입니다. 반다아체에서 배로 한 시간 거리에 있고, 섬 북서쪽 끝에는 영토의 시작점을 알리는 표석이 서 있어 인도네시아 사람들이 일부러 찾아옵니다.\n\n" +
      "이 섬은 원래 수마트라와 붙어 있었는데 화산 활동으로 떨어져 나왔습니다. 그래서 해안이 곧바로 깊은 물로 떨어지고, 물속에는 화산 가스가 올라오는 구멍이 있어 바닥에서 거품이 솟습니다.\n\n" +
      "다이빙하는 사람들에게 이름난 곳입니다. 물이 맑고 산호가 좋아 커다란 물고기가 지나가고, 섬에는 오토바이 몇 대와 숙소 몇 채가 전부라 조용합니다.",
    words: [
      {
        word: "menyelam",
        meaning: "잠수하다",
        example: "Banyak orang datang ke pulau ini untuk menyelam.",
        exampleKo: "많은 사람이 잠수하러 이 섬에 옵니다.",
      },
      {
        word: "batas",
        meaning: "경계, 끝",
        example: "Tugu itu menandai batas wilayah Indonesia.",
        exampleKo: "그 표석은 인도네시아 영토의 경계를 나타냅니다.",
      },
    ],
    wiki: "Weh Island",
  },

  "Takengon": {
    desc:
      "아체 산속 해발 1,200미터, 라웃 타와르 호숫가에 있는 읍입니다. 이곳 사람들은 아체인이 아니라 가요족으로, 자기 말과 자기 춤을 지켜 왔습니다. 여럿이 무릎을 꿇고 앉아 손뼉과 몸짓을 맞추는 춤이 이 지역에서 나왔습니다.\n\n" +
      "이 고원의 이름을 세계에 알린 것은 커피입니다. 화산재 토양과 서늘한 기후에서 자란 아라비카가 신맛과 향이 좋아 유럽과 미국으로 나가고, 인도네시아 최대의 아라비카 산지가 이 일대입니다. 골목마다 생두를 널어 말리는 마당이 있습니다.\n\n" +
      "호수에는 검은 물고기 이야기가 전해집니다. 남매가 배를 타고 나갔다가 물고기가 되었다는 이야기인데, 지금도 이 호수에서만 잡히는 물고기에 그 이름이 붙어 있습니다.",
    words: [
      {
        word: "kopi",
        meaning: "커피",
        example: "Kopi dari dataran tinggi ini dikirim ke luar negeri.",
        exampleKo: "이 고원의 커피는 해외로 보내집니다.",
      },
      {
        word: "menjemur",
        meaning: "볕에 말리다",
        example: "Warga menjemur biji kopi di halaman rumah.",
        exampleKo: "주민들이 집 마당에서 커피콩을 말립니다.",
      },
    ],
    wiki: "Takengon",
  },

  "Gunung Leuser": {
    desc:
      "아체와 북수마트라에 걸친 거대한 국립공원입니다. 낮은 늪지에서 3,000미터 넘는 산까지 이어져 있어, 수마트라에 사는 짐승이 거의 다 이 안에 있습니다.\n\n" +
      "특별한 것은 이곳이 지구에서 유일하게 오랑우탄과 코뿔소와 코끼리와 호랑이가 한 숲에 함께 사는 곳이라는 점입니다. 그러나 넷 다 사라질 위기에 있습니다. 기름야자 농원이 숲을 잘라 들어오고, 길이 뚫린 자리로 밀렵꾼이 따라 들어옵니다.\n\n" +
      "유네스코는 이 숲을 세계자연유산으로 지정하면서 동시에 위험에 처한 유산 목록에도 올렸습니다. 지키는 사람들과 베어내는 힘이 지금도 맞서 있는 땅입니다.",
    words: [
      {
        word: "hutan",
        meaning: "숲, 밀림",
        example: "Hutan ini menjadi rumah bagi banyak hewan langka.",
        exampleKo: "이 숲은 많은 희귀 동물의 집입니다.",
      },
      {
        word: "punah",
        meaning: "멸종하다",
        example: "Harimau Sumatera hampir punah.",
        exampleKo: "수마트라호랑이는 거의 멸종 위기입니다.",
      },
    ],
    wiki: "Gunung Leuser National Park",
  },

  // ---------------- 북수마트라 · 바탁 ----------------
  "Medan": {
    desc:
      "수마트라 최대의 도시입니다. 이 도시를 키운 것은 담배였습니다. 19세기 네덜란드가 이 일대에 담배 농원을 열면서 세계 시장에서 값을 인정받았고, 일손을 대려고 자바와 중국 남부에서 사람을 실어 왔습니다.\n\n" +
      "그래서 메단은 인도네시아에서 사람 구성이 가장 복잡한 도시 중 하나입니다. 바탁인, 자바인, 말레이인, 중국계, 그리고 영국 식민지 시절 실려 온 인도계가 함께 삽니다. 인도계가 모여 사는 캄풍 마드라스에는 힌두 사원이 있고, 그 옆 거리에 중국 사원과 모스크가 나란히 있습니다.\n\n" +
      "먹는 것으로 유명한 도시이기도 합니다. 국수 한 그릇에도 중국식과 말레이식이 섞여 있고, 두리안 노점이 밤늦게까지 불을 켭니다. 도심에는 술탄의 궁전과 검은 돔의 큰 모스크가 남아 있습니다.",
    words: [
      {
        word: "beragam",
        meaning: "다양한, 여러 가지의",
        example: "Penduduk kota ini sangat beragam.",
        exampleKo: "이 도시의 주민은 아주 다양합니다.",
      },
      {
        word: "mi",
        meaning: "국수, 면",
        example: "Mi khas Medan dipengaruhi masakan Tionghoa.",
        exampleKo: "메단 특유의 국수는 중국 요리의 영향을 받았습니다.",
      },
    ],
  },

  "Danau Toba": {
    desc:
      "동남아에서 가장 큰 호수이고, 그냥 호수가 아니라 화산이 무너진 자리입니다. 7만 4천 년 전 이곳에서 인류 역사상 가장 큰 규모의 분화가 일어났습니다. 하늘이 몇 년간 어두워지고 지구 기온이 떨어졌으며, 그때 인류의 수가 크게 줄었다는 학설이 있을 만큼 큰 사건이었습니다.\n\n" +
      "그 구덩이에 물이 차 길이 100킬로미터의 호수가 되었고, 가운데에는 싱가포르만 한 섬이 솟아 있습니다. 사모시르라 부르는 이 섬이 바탁 문화의 중심입니다.\n\n" +
      "호숫가 마을에는 배 모양으로 앞뒤가 치솟은 지붕의 집들이 서 있습니다. 바탁 사람들은 성씨를 아주 중요하게 여겨 처음 만나면 서로의 성씨를 묻고, 같은 성씨면 곧바로 친척처럼 대합니다. 이 규칙이 지금도 인도네시아 어디서나 바탁 사람들 사이에서 작동합니다.",
    words: [
      {
        word: "marga",
        meaning: "씨족, 성씨",
        example: "Orang Batak selalu menanyakan marga saat berkenalan.",
        exampleKo: "바탁 사람은 처음 만나면 늘 성씨를 묻습니다.",
      },
      {
        word: "raksasa",
        meaning: "거대한, 거인",
        example: "Letusan raksasa itu membentuk danau ini.",
        exampleKo: "그 거대한 분화가 이 호수를 만들었습니다.",
      },
    ],
    wiki: "Lake Toba",
  },

  "Tarutung": {
    desc:
      "토바 호수 남쪽 산골짜기에 있는 읍입니다. 인도네시아 개신교에서 이 이름은 특별합니다.\n\n" +
      "1862년 독일 선교사 루트비히 노멘젠이 이 골짜기에 들어왔습니다. 앞서 온 선교사들이 목숨을 잃은 뒤라 위험한 걸음이었고, 그는 언덕에 올라 이 땅을 달라고 기도했다고 전해집니다. 그 자리를 지금 기도의 언덕이라 부릅니다. 그는 바탁 말을 배워 성경을 옮기고 학교와 병원을 세웠으며, 40년 넘게 이곳에 머물다 바탁 땅에 묻혔습니다.\n\n" +
      "그 결과 세워진 교회가 HKBP입니다. 동남아에서 가장 큰 개신교 교단으로 자랐고, 본부는 이 근처 페아라자에 있습니다. 지금도 골짜기마다 뾰족한 종탑이 서 있고, 주일이면 온 마을이 흰옷을 입고 걸어 나옵니다. 바탁 사람들이 인도네시아 전역으로 흩어지면서 이 교회도 자카르타부터 파푸아까지 퍼졌습니다.",
    words: [
      {
        word: "penginjil",
        meaning: "전도자, 복음 전하는 사람",
        example: "Penginjil itu tinggal di lembah ini lebih dari empat puluh tahun.",
        exampleKo: "그 전도자는 이 골짜기에서 40년 넘게 살았습니다.",
      },
      {
        word: "menerjemahkan",
        meaning: "번역하다",
        example: "Dia menerjemahkan Alkitab ke dalam bahasa Batak.",
        exampleKo: "그는 성경을 바탁어로 번역했습니다.",
      },
      {
        word: "bukit doa",
        meaning: "기도의 언덕",
        example: "Banyak orang naik ke bukit doa untuk berdoa.",
        exampleKo: "많은 사람이 기도하러 기도의 언덕에 오릅니다.",
      },
    ],
  },

  "Berastagi": {
    desc:
      "메단에서 산으로 두 시간 올라가면 나오는 서늘한 고원 읍입니다. 양옆으로 시나붕과 시바약 두 화산이 보이고, 시장에는 산에서 내려온 오렌지와 백향과가 쌓여 있습니다. 마르키사라 부르는 이 열매로 만든 시럽이 이 지역 선물입니다.\n\n" +
      "이 일대는 카로 바탁의 땅입니다. 토바 바탁과 말도 관습도 다르며, 마을에는 여러 가족이 한 지붕 아래 사는 큰 전통 가옥이 남아 있습니다.\n\n" +
      "카로 사람들에게는 특별한 장례 풍습이 있습니다. 세월이 지난 뒤 조상의 뼈를 다시 꺼내 씻고 새 자리에 모시는 의식으로, 온 친척이 모여 며칠 동안 치릅니다. 기독교인이 다수인 지금도 이 절차는 형태를 바꿔 이어집니다.\n\n" +
      "시나붕 화산은 400년을 잠잠하다가 2010년 깨어났습니다. 그 뒤 여러 해 동안 재를 뿜어 산기슭 마을 사람들이 집을 떠나야 했습니다.",
    words: [
      {
        word: "jeruk",
        meaning: "귤, 오렌지",
        example: "Jeruk dari daerah ini terkenal manis.",
        exampleKo: "이 지역의 귤은 달기로 유명합니다.",
      },
      {
        word: "tulang",
        meaning: "뼈",
        example: "Tulang leluhur dibersihkan dalam upacara itu.",
        exampleKo: "그 의식에서 조상의 뼈를 씻습니다.",
      },
    ],
  },

  "Pematangsiantar": {
    desc:
      "메단에서 토바 호수로 가는 길목에 있는 북수마트라 제2의 도시입니다. 시내를 다니다 보면 1960년대 일본제 삼륜 오토바이를 개조한 인력거가 굉음을 내며 지나갑니다. 다른 도시에서는 사라진 이 차가 이곳에서만 아직 굴러다녀 도시의 상징이 되었습니다.\n\n" +
      "이 도시는 바탁 사람들이 산에서 내려와 도시 생활을 시작한 곳이기도 합니다. 교회와 학교가 일찍 세워져 목사와 교사를 많이 배출했고, 시내 한복판에 큰 교회 건물들이 서 있습니다.\n\n" +
      "동시에 중국계 상인이 많아 사원과 시장이 함께 있습니다. 서늘한 고원 초입이라 공기가 메단보다 훨씬 편합니다.",
    words: [
      {
        word: "becak motor",
        meaning: "오토바이 인력거",
        example: "Becak motor tua masih berjalan di kota ini.",
        exampleKo: "낡은 오토바이 인력거가 아직 이 도시를 달립니다.",
      },
      {
        word: "pendeta",
        meaning: "목사",
        example: "Banyak pendeta berasal dari kota ini.",
        exampleKo: "많은 목사가 이 도시 출신입니다.",
      },
    ],
    wiki: "Pematangsiantar",
  },

  "Binjai": {
    desc:
      "메단 서쪽에 붙은 작은 도시입니다. 큰 도시 옆이라 조용하지만, 인도네시아 사람들에게는 람부탄으로 알려져 있습니다. 붉은 껍질에 털이 돋은 이 열매가 이 지역에서 특히 달아, 철이 되면 길가에 다발로 쌓입니다.\n\n" +
      "이 도시는 르우서 국립공원과 부킷 라왕으로 가는 길이 갈라지는 지점이기도 합니다. 오랑우탄을 보러 가는 사람들이 여기서 방향을 잡습니다.\n\n" +
      "네덜란드 시절 담배와 고무 농원이 이 일대를 둘러싸고 있었고, 그때 놓인 철길이 지금도 메단까지 이어집니다.",
    words: [
      {
        word: "buah",
        meaning: "과일, 열매",
        example: "Buah rambutan dari daerah ini sangat manis.",
        exampleKo: "이 지역의 람부탄은 아주 답니다.",
      },
      {
        word: "karet",
        meaning: "고무",
        example: "Perkebunan karet dibuka di sekitar kota ini.",
        exampleKo: "이 도시 주변에 고무 농원이 열렸습니다.",
      },
    ],
    wiki: "Binjai",
  },

  "Bukit Lawang": {
    desc:
      "르우서 국립공원 가장자리, 보호 강가에 있는 작은 마을입니다. 이곳이 알려진 것은 오랑우탄 때문입니다. 1970년대에 애완용으로 잡혔던 오랑우탄을 다시 야생으로 돌려보내는 시설이 여기 세워졌고, 그 후손들이 지금 숲에 살고 있습니다.\n\n" +
      "그래서 이 마을에서는 걸어서 숲에 들어가 오랑우탄을 만날 수 있습니다. 사람 손을 탄 적이 있는 개체가 섞여 있어 가까이 오기도 하지만, 안내인들은 먹이를 주지 말라고 단단히 이릅니다.\n\n" +
      "2003년 큰물이 이 마을을 덮쳤습니다. 상류에서 불법으로 나무를 벤 탓에 산이 물을 잡아 두지 못한 것이 원인으로 지목되었고, 200명 넘게 목숨을 잃었습니다. 마을은 다시 지어졌고, 지금은 숲을 지키는 일이 곧 마을을 지키는 일이 되었습니다.",
    words: [
      {
        word: "orangutan",
        meaning: "오랑우탄",
        example: "Orangutan liar masih hidup di hutan ini.",
        exampleKo: "야생 오랑우탄이 아직 이 숲에 삽니다.",
      },
      {
        word: "banjir bandang",
        meaning: "급류, 갑자기 불어난 물",
        example: "Banjir bandang menghancurkan desa itu pada tahun 2003.",
        exampleKo: "2003년 급류가 그 마을을 무너뜨렸습니다.",
      },
    ],
  },

  "Pulau Nias": {
    desc:
      "수마트라 서쪽 바다에 떨어져 있는 섬입니다. 오래 고립되어 있어 인도네시아 안에서도 독특한 문화가 남았습니다.\n\n" +
      "가장 알려진 것은 돌 뛰어넘기입니다. 젊은 남자가 2미터 높이의 돌탑을 도움닫기해 뛰어넘는 것으로, 옛날에는 전사가 될 자격을 보이는 시험이었습니다. 마을에는 거대한 돌 의자와 비석이 남아 있고, 나무로 지은 큰 집들이 못 하나 없이 짜맞춰져 있습니다. 지진이 잦은 섬이라 흔들려도 무너지지 않게 지은 방식입니다.\n\n" +
      "19세기 말 독일 선교사들이 들어와 지금은 주민 대부분이 개신교인입니다. 1916년 무렵 이 섬에 큰 회개 운동이 일어나 짧은 기간에 교회가 크게 자랐고, 니아스 교회는 지금도 인도네시아에서 손꼽히는 규모입니다.\n\n" +
      "남쪽 해안은 파도가 길고 규칙적이어서 세계 각지에서 서핑하는 사람들이 찾아옵니다.",
    words: [
      {
        word: "melompat",
        meaning: "뛰어넘다, 도약하다",
        example: "Pemuda itu melompati menara batu setinggi dua meter.",
        exampleKo: "그 청년은 2미터 높이의 돌탑을 뛰어넘습니다.",
      },
      {
        word: "kebangunan rohani",
        meaning: "영적 각성, 부흥",
        example: "Kebangunan rohani terjadi di pulau ini pada awal abad ke-20.",
        exampleKo: "20세기 초 이 섬에 영적 각성이 일어났습니다.",
      },
    ],
    wiki: "Nias",
  },

  "Kepulauan Mentawai": {
    desc:
      "수마트라 서쪽 바다에 남북으로 늘어선 네 개의 큰 섬과 수십 개의 작은 섬입니다. 본토와 오래 떨어져 있어 이곳 사람들의 말과 문화는 수마트라와 확연히 다릅니다.\n\n" +
      "멘타와이 사람들은 온몸에 무늬를 새기는 전통이 있었습니다. 세계에서 가장 오래된 문신 문화 중 하나로 꼽히며, 무늬마다 그 사람의 일과 지위를 나타냈습니다. 시카레이라 부르는 이들이 약초로 병을 다루고 마을의 의식을 이끌었는데, 근대 이후 여러 압력을 받아 이 전통은 크게 줄었습니다.\n\n" +
      "이 섬들 아래로 판이 밀려 들어가는 자리라 큰 지진이 반복됩니다. 2010년 지진 뒤에 온 파도가 마을들을 쓸었고, 그 뒤로 높은 곳에 마을을 다시 앉히는 일이 이어졌습니다.\n\n" +
      "역설적으로 이 험한 바다가 세계적인 서핑지가 되었습니다. 배에서 자며 파도를 찾아다니는 여행이 이곳에서 자리 잡았습니다.",
    words: [
      {
        word: "tato",
        meaning: "문신",
        example: "Tato di tubuh mereka menunjukkan asal dan pekerjaan.",
        exampleKo: "그들 몸의 문신은 출신과 일을 나타냅니다.",
      },
      {
        word: "dukun",
        meaning: "주술사, 전통 치료사",
        example: "Dukun memimpin upacara di kampung itu.",
        exampleKo: "주술사가 그 마을의 의식을 이끕니다.",
      },
    ],
    wiki: "Mentawai Islands",
  },

  // ---------------- 서수마트라 · 미낭카바우 ----------------
  "Padang": {
    desc:
      "서수마트라의 항구 도시이자 미낭카바우 사람들의 관문입니다. 인도네시아 어느 도시를 가도 파당 식당 간판이 보입니다. 밥 한 접시를 시키면 작은 접시 십여 개가 상에 깔리고, 손댄 것만 값을 치르는 방식이 전국으로 퍼졌습니다. 코코넛 밀크에 향신료를 넣어 오래 졸인 쇠고기 요리가 그중 대표입니다.\n\n" +
      "미낭카바우 사회에는 인도네시아에서 가장 눈에 띄는 특징이 있습니다. 재산과 성씨가 어머니에서 딸로 이어집니다. 집과 논은 여자의 것이고, 남자는 결혼하면 아내 집으로 들어갑니다. 무슬림이 다수인 사회에서 이런 모계 관습이 이어져 온 것은 세계적으로도 드뭅니다.\n\n" +
      "그래서 미낭 남자들은 젊어서 고향을 떠납니다. 배워서 무언가 되어 돌아온다는 관습을 므란따우라 하고, 이 전통이 인도네시아 곳곳에 미낭 상인과 지식인을 퍼뜨렸습니다. 초대 부통령 하타를 비롯해 건국기의 지도자가 이 지역에서 여럿 나왔습니다.",
    words: [
      {
        word: "merantau",
        meaning: "고향을 떠나 객지로 나가다",
        example: "Banyak pemuda merantau untuk mencari ilmu.",
        exampleKo: "많은 청년이 배움을 찾아 객지로 나갑니다.",
      },
      {
        word: "warisan ibu",
        meaning: "어머니에게서 물려받는 것",
        example: "Rumah dan sawah menjadi warisan ibu di daerah ini.",
        exampleKo: "이 지역에서 집과 논은 어머니에게서 물려받습니다.",
      },
    ],
    wiki: "Padang",
  },

  "Bukittinggi": {
    desc:
      "미낭카바우 고원 한복판, 세 개의 화산에 둘러싸인 서늘한 도시입니다. 도시 한가운데 네덜란드 시절 세운 시계탑이 서 있는데, 지붕만은 미낭카바우식 뿔 모양으로 얹혀 있습니다.\n\n" +
      "도시 아래에는 굴이 있습니다. 일본군 점령기에 주민들을 동원해 판 것으로, 몇 킬로미터에 이르는 통로가 지금도 남아 있습니다. 그 옆으로는 깊은 협곡이 도시를 가르고 지나갑니다.\n\n" +
      "인도네시아 역사에서 이 도시가 결정적인 순간이 있습니다. 1948년 네덜란드가 자카르타를 다시 점령하고 지도자들을 붙잡았을 때, 이곳에서 비상정부가 세워져 나라의 이름을 이어받았습니다. 몇 달 동안 인도네시아 공화국의 정부가 이 산속 도시에 있었던 셈입니다.",
    words: [
      {
        word: "jam",
        meaning: "시계, 시간",
        example: "Menara jam itu menjadi lambang kota.",
        exampleKo: "그 시계탑은 도시의 상징이 되었습니다.",
      },
      {
        word: "terowongan",
        meaning: "굴, 터널",
        example: "Terowongan itu digali pada masa pendudukan Jepang.",
        exampleKo: "그 굴은 일본 점령기에 파였습니다.",
      },
    ],
    wiki: "Bukittinggi",
  },

  "Pagaruyung": {
    desc:
      "미낭카바우 왕국의 옛 궁전이 있는 곳입니다. 지붕이 물소 뿔처럼 여러 겹으로 하늘을 향해 뻗어 있고, 벽 전체에 나무를 깎아 넣은 무늬가 빼곡합니다. 미낭카바우라는 이름 자체가 이긴 물소라는 뜻이라고 전해지는데, 이웃 나라와 싸우는 대신 물소를 겨루어 이겼다는 이야기에서 왔습니다.\n\n" +
      "이 왕국은 특이한 방식으로 다스려졌습니다. 왕이 모든 것을 정하지 않고 관습과 종교와 정치를 나누어 여러 어른이 함께 맡았으며, 마을 일은 모여 앉아 이야기가 하나로 모일 때까지 논의해 정했습니다. 이 방식을 지금도 인도네시아 사회는 중요한 전통으로 여깁니다.\n\n" +
      "지금 서 있는 궁전은 원래 것이 아닙니다. 여러 차례 불에 타 다시 지어졌고, 2007년 벼락으로 또 한 번 잿더미가 된 뒤 지금 모습으로 복원되었습니다.",
    words: [
      {
        word: "kerbau",
        meaning: "물소",
        example: "Bentuk atap itu meniru tanduk kerbau.",
        exampleKo: "그 지붕 모양은 물소 뿔을 본뜬 것입니다.",
      },
      {
        word: "musyawarah",
        meaning: "함께 의논해 결정함",
        example: "Keputusan diambil melalui musyawarah.",
        exampleKo: "결정은 함께 의논해서 내립니다.",
      },
    ],
    wiki: "Pagaruyung Palace",
  },

  "Sawahlunto": {
    desc:
      "서수마트라 산속의 탄광 도시입니다. 1880년대 네덜란드가 이곳에서 질 좋은 석탄을 발견하고 광산을 열었고, 파낸 석탄을 파당 항구까지 실어 나르려고 험한 산을 뚫어 철도를 놓았습니다.\n\n" +
      "그 갱도에서 일한 사람들 중에는 자바에서 실려 온 죄수들이 있었습니다. 쇠사슬을 찬 채 일했다 하여 사슬 노예라 불렸고, 자바·중국·인도 각지에서 온 노동자들이 뒤섞이면서 이 산골에 독특한 말과 공동체가 생겼습니다.\n\n" +
      "석탄이 줄면서 도시는 한때 비었습니다. 그러나 남은 갱도와 기관차와 사택을 그대로 보존해 산업 유산으로 되살렸고, 2019년 유네스코 세계문화유산이 되었습니다. 지금은 옛 광차를 타고 갱도를 지나는 관광지가 되었습니다.",
    words: [
      {
        word: "batu bara",
        meaning: "석탄",
        example: "Batu bara dari kota ini dikirim ke pelabuhan Padang.",
        exampleKo: "이 도시의 석탄은 파당 항구로 보내졌습니다.",
      },
      {
        word: "rantai",
        meaning: "사슬",
        example: "Para pekerja itu bekerja dengan rantai di kaki.",
        exampleKo: "그 노동자들은 발에 사슬을 찬 채 일했습니다.",
      },
    ],
    wiki: "Sawahlunto",
  },
};
