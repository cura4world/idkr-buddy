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
};
