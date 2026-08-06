// src/lib/mapContent/jawaTengahTimur.ts
// 배치 1 — 자바 중부·동부 27곳 (마두라 포함)
//
// 설명은 4~6문장 · 2~3문단. 뻔한 지리 설명 대신 그 지점의 이야기 하나를 중심에 둡니다.
// 단어는 지도 전체에서 유일해야 합니다. 새 배치를 더할 때 반드시 중복 검사를 돌리세요.

import { MapContentTable } from "./types";

export const JAWA_TENGAH_TIMUR: MapContentTable = {
  // ---------------- 중부 자바 서쪽 ----------------
  "Purwokerto": {
    desc:
      "슬라멧 산 남쪽 기슭에 자리한 중부 자바의 내륙 도시입니다. 슬라멧은 자바에서 두 번째로 높은 화산이고, 그 아래 바뉴마스 일대는 예부터 왕궁 문화의 바깥이라는 뜻에서 만짜느가라라고 불렸습니다.\n\n" +
      "이곳 사람들의 자바어는 족자나 솔로의 궁정 자바어와 소리가 확연히 다릅니다. 단어 끝을 또박또박 끊어 발음해서 응아팍이라고 부르는데, 자바 안에서도 금방 알아듣는 억양입니다. 인도네시아 코미디언 중에 바뉴마스 출신이 유난히 많은 것도 이 억양 덕입니다.\n\n" +
      "먹거리로는 믄도안이 유명합니다. 얇게 뜬 템페에 반죽을 입혀 일부러 덜 익혀 축축하게 튀겨낸 것으로, 바삭하게 튀긴 템페만 알던 사람에게는 낯선 식감입니다.",
    words: [
      {
        word: "tempe",
        meaning: "템페 (콩 발효 식품)",
        example: "Tempe di Purwokerto digoreng setengah matang.",
        exampleKo: "푸르워커르토에서는 템페를 덜 익게 튀깁니다.",
      },
      {
        word: "logat",
        meaning: "억양, 사투리",
        example: "Logat orang Banyumas mudah dikenali.",
        exampleKo: "바뉴마스 사람의 억양은 금방 알아챌 수 있습니다.",
      },
    ],
  },

  "Dataran Tinggi Dieng": {
    desc:
      "해발 2,000미터 화산 고원입니다. 이름은 산스크리트어로 신들이 사는 곳이라는 뜻이며, 실제로 이곳에는 인도네시아에서 가장 오래된 석조 힌두 사원들이 남아 있습니다. 8세기에 세워진 아르주나 사원군은 보로부두르보다 앞섭니다.\n\n" +
      "고원 곳곳에서 땅이 김을 뿜습니다. 시키당 분화구는 지금도 진흙이 끓고 유황 냄새가 진하며, 색이 변하는 호수 틀라가 와르나가 그 옆에 있습니다. 새벽 기온이 영하로 떨어져 서리가 내리는 날이 있는데, 자바에서 서리를 볼 수 있는 몇 안 되는 곳입니다.\n\n" +
      "이 척박한 고원에서 감자와 담배가 자랍니다. 그리고 이곳에서만 태어나는 머리카락이 엉킨 아이들이 있어, 마을에서는 정해진 절차를 밟아 그 머리를 잘라주는 의식을 치릅니다.",
    words: [
      {
        word: "kentang",
        meaning: "감자",
        example: "Kentang tumbuh baik di dataran yang dingin.",
        exampleKo: "감자는 서늘한 고원에서 잘 자랍니다.",
      },
      {
        word: "kabut",
        meaning: "안개",
        example: "Kabut sering menutupi candi pada pagi hari.",
        exampleKo: "아침이면 안개가 자주 사원을 덮습니다.",
      },
    ],
    wiki: "Dieng Plateau",
  },

  "Borobudur": {
    desc:
      "9세기 샤일렌드라 왕조가 세운 세계 최대의 불교 유적입니다. 탑이 아니라 산 하나를 통째로 쌓아 올린 구조여서, 아래층부터 회랑을 따라 오르면 부조를 순서대로 읽으며 정상에 닿게 되어 있습니다. 부조 패널이 2,600여 장, 불상이 500구 넘게 있습니다.\n\n" +
      "그런데 이 거대한 것이 수백 년간 잊혔습니다. 자바가 이슬람으로 바뀌고 정치의 중심이 동쪽으로 옮겨가는 사이 화산재와 밀림에 덮였고, 1814년 영국 통치기에 래플스가 사람을 보내 파내면서 다시 세상에 나왔습니다.\n\n" +
      "지금도 살아 있는 종교 장소입니다. 해마다 와이삭이 되면 승려들이 촛불을 들고 인근 멘둣 사원에서 이곳까지 걸어 올라옵니다.",
    words: [
      {
        word: "candi",
        meaning: "(힌두·불교) 사원 유적",
        example: "Candi ini dibangun pada abad kesembilan.",
        exampleKo: "이 사원은 9세기에 지어졌습니다.",
      },
      {
        word: "relief",
        meaning: "부조",
        example: "Relief di dinding menceritakan kisah Buddha.",
        exampleKo: "벽의 부조는 부처의 이야기를 전합니다.",
      },
    ],
  },

  "Magelang": {
    desc:
      "보로부두르로 가는 사람들이 반드시 지나는 도시이지만, 정작 자바 사람들에게는 다른 이유로 익숙합니다. 도시 한복판의 나지막한 언덕 티다르에는 옛날 자바 섬이 바다 위에서 흔들릴 때 신들이 이 언덕을 못처럼 박아 섬을 고정했다는 이야기가 전해집니다. 그래서 자바의 못이라고 부릅니다.\n\n" +
      "네덜란드는 이 서늘하고 물 좋은 분지에 군을 두었고, 그 자리에 지금 인도네시아 육군사관학교가 있습니다. 대통령을 여럿 배출한 학교여서, 인도네시아 사람에게 마글랑은 군인의 도시로 통합니다.\n\n" +
      "므라피와 슴빙 두 화산 사이에 놓여 흙이 검고 기름집니다. 시내를 조금만 벗어나면 담배밭과 고추밭이 이어집니다.",
    words: [
      {
        word: "bukit",
        meaning: "언덕",
        example: "Bukit Tidar berada di tengah kota.",
        exampleKo: "티다르 언덕은 도시 한가운데에 있습니다.",
      },
      {
        word: "perwira",
        meaning: "장교",
        example: "Banyak perwira dididik di kota ini.",
        exampleKo: "많은 장교가 이 도시에서 길러졌습니다.",
      },
    ],
  },

  "Yogyakarta": {
    desc:
      "인도네시아에서 유일하게 왕이 다스리는 지역입니다. 다른 주는 주지사를 선거로 뽑지만 이곳만은 술탄 하멩쿠부워노가 대대로 주지사를 겸합니다. 1945년 독립 직후 술탄이 새 공화국 편에 서겠다고 선언한 값입니다. 1946년부터 3년 동안은 이 도시가 인도네시아의 수도였습니다.\n\n" +
      "왕궁 크라톤을 중심으로 남쪽 바다와 북쪽 므라피 화산을 잇는 보이지 않는 축 위에 도시가 놓여 있고, 그 축을 따라 난 말리오보로 거리에 밤마다 노점과 인력거가 몰립니다.\n\n" +
      "동시에 학생의 도시입니다. 가자마다 대학을 비롯해 백 곳이 넘는 대학이 있어 인도네시아 전역에서 젊은이가 모이고, 그래서 물가가 싸고 밥집이 늦게까지 열려 있습니다.",
    words: [
      {
        word: "keraton",
        meaning: "왕궁",
        example: "Keraton masih menjadi pusat kota ini.",
        exampleKo: "왕궁은 지금도 이 도시의 중심입니다.",
      },
      {
        word: "becak",
        meaning: "베짝 (자전거 인력거)",
        example: "Kami naik becak di sepanjang Malioboro.",
        exampleKo: "우리는 말리오보로를 따라 베짝을 탔습니다.",
      },
    ],
  },

  "Muntilan": {
    desc:
      "므라피 화산 서쪽 기슭, 마글랑과 족자를 잇는 길목의 작은 읍입니다. 화산재가 쌓여 땅이 검고 기름져 예부터 담배와 사탕수수를 길렀고, 보로부두르로 가는 길에 대부분 그냥 지나치는 곳입니다. 그러나 자바 사람들 사이에서 이곳은 자바의 베들레헴으로 불립니다.\n\n" +
      "1897년 네덜란드 예수회 신부 프란스 판 리트가 이곳에 자리를 잡았습니다. 그는 개종을 재촉하는 대신 자바어와 자바의 예법을 먼저 배웠고, 1900년부터 교사 양성 학교를 세워 신자가 아닌 아이들에게도 문을 열었습니다. 전환점은 1904년이었습니다. 병을 고치러 찾아온 사리크라마라는 자바인이 세례를 받고 바르나바스라는 이름을 얻은 뒤 고향 칼리바왕으로 돌아가 이웃에게 신앙을 전했고, 그해 12월 판 리트는 슨당소노의 샘가에서 자바인 171명에게 세례를 주었습니다.\n\n" +
      "자바인 교회의 시작으로 여겨지는 사건입니다. 그 샘은 지금 인도네시아에서 손꼽히는 순례지가 되었고, 무틸란의 학교에서는 첫 인도네시아인 주교 알베르투스 수기요프라나타가 나왔습니다. 무슬림이 절대다수인 지역 한복판에 1898년 세워진 성 안토니우스 성당이 아직 그대로 서 있습니다.",
    words: [
      {
        word: "membaptis",
        meaning: "세례를 주다",
        example: "Pastor itu membaptis 171 orang di dekat mata air.",
        exampleKo: "그 신부는 샘 근처에서 171명에게 세례를 주었습니다.",
      },
      {
        word: "mata air",
        meaning: "샘",
        example: "Mata air di Sendangsono masih mengalir sampai sekarang.",
        exampleKo: "슨당소노의 샘은 지금도 흐릅니다.",
      },
      {
        word: "ziarah",
        meaning: "순례",
        example: "Setiap bulan Mei banyak umat datang berziarah ke sini.",
        exampleKo: "5월마다 많은 신자가 이곳으로 순례를 옵니다.",
      },
    ],
  },

  "Semarang": {
    desc:
      "중부 자바의 관문 항구이자, 자바에서 중국계의 흔적이 가장 진하게 남은 도시입니다. 15세기 초 명나라 정화의 함대가 이 앞바다에 닿았고, 그를 모시는 삼포콩 사원이 지금도 향 연기 속에 서 있습니다. 붉은 기둥에 자바식 지붕을 올린 그 건물 자체가 두 문화가 섞인 결과입니다.\n\n" +
      "구시가 코타 라마에는 네덜란드 시절 건물이 통째로 남아 있습니다. 그중 창이 아주 많아 천 개의 문이라 불리는 라왕 세우는 철도 회사 본부였다가 일본군 점령기에는 다른 용도로 쓰인 아픈 내력이 있습니다.\n\n" +
      "다만 이 도시는 물과 싸우고 있습니다. 해수면보다 낮은 구역이 늘어 바닷물이 길로 올라오는 날이 잦아졌고, 항구 일대는 매년 지반이 내려앉고 있습니다.",
    words: [
      {
        word: "kelenteng",
        meaning: "중국식 사원",
        example: "Kelenteng tua itu masih ramai dikunjungi.",
        exampleKo: "그 오래된 중국식 사원은 지금도 사람이 붐빕니다.",
      },
      {
        word: "banjir",
        meaning: "홍수, 물난리",
        example: "Air laut naik dan menyebabkan banjir di jalan.",
        exampleKo: "바닷물이 올라와 길에 물난리가 났습니다.",
      },
    ],
  },

  "Salatiga": {
    desc:
      "므르바부 산과 틀로모요 산 사이 해발 500미터 남짓한 곳에 앉은 작은 도시입니다. 서늘하고 조용해서 네덜란드 사람들이 휴양지로 삼았고, 지금도 자바에서 가장 살기 편한 도시로 자주 꼽힙니다.\n\n" +
      "도시의 나이는 상당히 많습니다. 근처에서 발견된 플룸풍안 비문이 750년에 새겨진 것이어서, 살라티가는 1,200년이 넘는 생일을 매년 챙깁니다.\n\n" +
      "규모에 비해 사람 구성이 다양합니다. 사탸 와짜나 기독교대학이 있어 파푸아, 니아스, 토라자, 암본 등 전국에서 학생이 모여드는데, 인구가 20만이 채 안 되는 도시에서 이만큼 다양한 언어가 오가는 곳은 드뭅니다. 인도네시아의 관용도 조사에서 이 도시가 늘 상위에 오르는 이유이기도 합니다.",
    words: [
      {
        word: "mahasiswa",
        meaning: "대학생",
        example: "Mahasiswa dari Papua banyak belajar di kota ini.",
        exampleKo: "파푸아에서 온 대학생이 이 도시에서 많이 공부합니다.",
      },
      {
        word: "prasasti",
        meaning: "비문, 비석",
        example: "Prasasti itu ditulis pada tahun 750.",
        exampleKo: "그 비문은 750년에 새겨졌습니다.",
      },
    ],
  },

  "Prambanan": {
    desc:
      "보로부두르에서 동쪽으로 한 시간 거리에 있는 힌두 사원군입니다. 9세기 마타람 왕국이 세웠고, 가운데 시바 사원은 높이가 47미터로 뾰족하게 솟아 있습니다. 완만하게 퍼진 보로부두르와 나란히 두면 두 종교가 건물을 어떻게 다르게 상상했는지가 한눈에 보입니다.\n\n" +
      "회랑 벽에는 라마야나가 새겨져 있습니다. 지금도 건기 밤이면 사원을 배경으로 그 이야기를 무용극으로 올립니다.\n\n" +
      "이 사원에는 유명한 전설이 붙어 있습니다. 청혼을 거절하려던 공주가 하룻밤에 천 개의 사원을 지어 보이라고 요구했고, 거의 다 채운 것을 알고 새벽닭 소리를 미리 내게 하자 화가 난 상대가 공주를 돌로 만들어 마지막 상으로 세웠다는 이야기입니다. 시바 사원 북쪽 방의 두르가 상을 사람들은 아직도 로로 종그랑이라 부릅니다.",
    words: [
      {
        word: "arca",
        meaning: "석상, 신상",
        example: "Arca Durga berdiri di ruang sebelah utara.",
        exampleKo: "두르가 상은 북쪽 방에 서 있습니다.",
      },
      {
        word: "legenda",
        meaning: "전설",
        example: "Legenda itu diceritakan turun-temurun.",
        exampleKo: "그 전설은 대대로 전해집니다.",
      },
    ],
  },
};
