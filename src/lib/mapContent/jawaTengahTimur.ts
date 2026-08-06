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

  // ---------------- 북부 해안 · 이슬람화 ----------------
  "Demak": {
    desc:
      "자바 최초의 이슬람 왕국이 선 자리입니다. 15세기 말 마자파힛이 기울 때 라덴 파타가 이곳에서 나라를 열었고, 자바의 무게중심이 힌두 내륙에서 이슬람 해안으로 넘어갔습니다. 지금은 스마랑 옆의 조용한 소도시이지만, 자바 이슬람의 출발점으로 여겨집니다.\n\n" +
      "대모스크에는 유명한 기둥이 하나 있습니다. 네 개의 큰 기둥 중 하나가 통나무가 아니라 자투리 나무를 묶어 만든 것인데, 왈리송오의 한 사람인 수난 칼리자가가 남은 조각을 모아 세웠다고 전해집니다.\n\n" +
      "이 모스크에는 첨탑이 없고 대신 자바 전통 가옥의 삼단 지붕을 얹었습니다. 있던 것을 부수는 대신 그 위에 새 신앙을 얹은 방식이 건물에 그대로 남아 있습니다.",
    words: [
      {
        word: "masjid",
        meaning: "모스크, 이슬람 사원",
        example: "Masjid tertua di Jawa berdiri di kota ini.",
        exampleKo: "자바에서 가장 오래된 모스크가 이 도시에 서 있습니다.",
      },
      {
        word: "tiang",
        meaning: "기둥",
        example: "Salah satu tiang dibuat dari potongan kayu kecil.",
        exampleKo: "기둥 하나는 작은 나무 조각들로 만들어졌습니다.",
      },
    ],
    wiki: "Great Mosque of Demak",
  },

  "Sangiran": {
    desc:
      "솔로 북쪽의 나지막한 언덕과 마른 개울이 이어지는 평범해 보이는 들판입니다. 그러나 이 땅은 백만 년 전 지층이 그대로 드러난 곳이어서, 1930년대부터 초기 인류의 화석이 쏟아져 나왔습니다.\n\n" +
      "여기서 나온 호모 에렉투스 화석은 세계에서 발견된 같은 종 화석의 상당수를 차지합니다. 아시아에 인류가 언제 도착했는가 하는 질문의 답이 이 언덕에서 나온 셈입니다.\n\n" +
      "지금은 지층을 그대로 보여주는 박물관이 서 있고, 밭을 갈던 마을 사람들이 화석을 알아보고 신고해 온 내력도 함께 전시되어 있습니다. 유네스코 세계문화유산입니다.",
    words: [
      {
        word: "fosil",
        meaning: "화석",
        example: "Fosil manusia purba ditemukan di ladang ini.",
        exampleKo: "고대 인류의 화석이 이 밭에서 발견되었습니다.",
      },
      {
        word: "purba",
        meaning: "태고의, 아주 오래된",
        example: "Lapisan tanah purba masih terlihat jelas.",
        exampleKo: "아주 오래된 지층이 아직 뚜렷하게 보입니다.",
      },
    ],
  },

  "Surakarta": {
    desc:
      "솔로라고 더 많이 불립니다. 1745년 옛 왕궁이 반란으로 불탄 뒤 이곳으로 옮겨 세운 도시이고, 얼마 지나지 않아 왕실이 둘로 갈라지면서 카수나난과 망쿠느가란 두 왕궁이 한 도시 안에 남게 되었습니다.\n\n" +
      "그 덕에 궁정 예술이 두 갈래로 이어졌습니다. 가믈란과 궁중 무용의 격식이 여기서 다듬어졌고, 바틱도 마찬가지입니다. 라웨얀과 카우만 골목에 들어가면 담 너머로 천을 널어 말리는 집들이 아직 늘어서 있습니다.\n\n" +
      "격식의 도시라는 인상과 달리 상인의 도시이기도 합니다. 클레웨르 시장은 자바 최대의 직물 도매시장이고, 새벽 5시에 여는 소토집 앞에 줄이 서는 곳입니다.",
    words: [
      {
        word: "batik",
        meaning: "바틱 (밀랍으로 무늬를 낸 천)",
        example: "Kain batik dijemur di halaman rumah.",
        exampleKo: "바틱 천을 집 마당에 널어 말립니다.",
      },
      {
        word: "keris",
        meaning: "끄리스 (물결 모양 단검)",
        example: "Keris disimpan sebagai pusaka keluarga.",
        exampleKo: "끄리스는 집안의 가보로 보관됩니다.",
      },
    ],
  },

  "Kudus": {
    desc:
      "이름부터 다릅니다. 인도네시아에서 유일하게 아랍어 지명을 가진 도시로, 예루살렘을 뜻하는 알쿠드스에서 왔습니다.\n\n" +
      "이 도시가 기억되는 이유는 왈리송오의 한 사람인 수난 쿠두스의 방식 때문입니다. 그는 힌두 신자가 많던 이곳에서 이슬람을 전하면서 소를 잡지 말라고 가르쳤습니다. 힌두교가 소를 신성하게 여기는 것을 존중한 것입니다. 지금도 쿠두스에서는 소 대신 물소를 씁니다. 모스크 옆에 선 붉은 벽돌 탑도 이슬람 첨탑이 아니라 힌두 사원 문 모양 그대로입니다.\n\n" +
      "오늘의 쿠두스는 담배 도시이기도 합니다. 정향을 섞어 만드는 인도네시아 특유의 담배 산업이 여기서 컸고, 큰 회사의 본사와 공장이 도시를 먹여 살립니다.",
    words: [
      {
        word: "menara",
        meaning: "탑",
        example: "Menara itu dibangun seperti gapura Hindu.",
        exampleKo: "그 탑은 힌두 사원 문처럼 지어졌습니다.",
      },
      {
        word: "menyembelih",
        meaning: "도축하다, 잡다",
        example: "Warga di sini tidak menyembelih sapi.",
        exampleKo: "이곳 주민들은 소를 잡지 않습니다.",
      },
    ],
    wiki: "Menara Kudus Mosque",
  },

  "Pati": {
    desc:
      "중부 자바 북해안의 농업 도시입니다. 무리아 산에서 내려온 물로 논이 넓게 펼쳐져 있고, 지역 표어에도 논과 물고기가 들어갑니다.\n\n" +
      "인도네시아 사람이라면 이 도시 이름을 땅콩 봉지에서 먼저 봤을 가능성이 높습니다. 전국에서 팔리는 볶은 땅콩 상표 중 하나가 이곳에서 시작해 지금도 공장을 두고 있습니다.\n\n" +
      "해안 쪽 주와나 마을은 놋쇠 공예로 알려져 있습니다. 대대로 놋을 두드려 그릇과 장식을 만들어 왔고, 옆으로는 새우 양식장이 이어집니다.",
    words: [
      {
        word: "kacang",
        meaning: "땅콩, 콩",
        example: "Pabrik kacang di kota ini terkenal di seluruh Indonesia.",
        exampleKo: "이 도시의 땅콩 공장은 인도네시아 전역에 알려져 있습니다.",
      },
      {
        word: "kuningan",
        meaning: "놋쇠",
        example: "Pengrajin kuningan bekerja turun-temurun di desa itu.",
        exampleKo: "놋쇠 장인들이 그 마을에서 대를 이어 일합니다.",
      },
    ],
    wiki: "Pati Regency",
  },

  // ---------------- 동부 자바 내륙 ----------------
  "Madiun": {
    desc:
      "동부 자바 내륙, 솔로에서 수라바야로 가는 철길 한가운데 있는 도시입니다. 네덜란드가 설탕을 실어 나르려 깐 철도가 도시의 뼈대가 되었고, 지금도 인도네시아에서 기차를 직접 만드는 유일한 공장이 여기 있습니다. 자카르타의 통근 전동차도, 이웃 나라로 수출되는 객차도 마디운에서 나옵니다.\n\n" +
      "이 도시의 이름이 현대사에 남은 것은 1948년 때문입니다. 독립전쟁이 한창이던 그해 9월 공산당 세력이 마디운을 장악하고 정부에 맞섰다가 한 달 만에 진압되었습니다. 네덜란드와 싸우는 중에 벌어진 내부 충돌이라 상처가 깊었고, 이후 인도네시아 정치에서 공산주의를 말할 때 늘 따라붙는 이름이 되었습니다.\n\n" +
      "오늘의 마디운은 훨씬 소박합니다. 땅콩 소스를 끼얹은 채소 요리는 마디운식이 표준으로 통하고, 발효 찹쌀로 만든 사탕은 역 앞에서 파는 대표 선물입니다.",
    words: [
      {
        word: "kereta api",
        meaning: "기차",
        example: "Gerbong kereta api itu dibuat di Madiun.",
        exampleKo: "그 기차 객차는 마디운에서 만들어졌습니다.",
      },
      {
        word: "pabrik",
        meaning: "공장",
        example: "Pabrik itu mempekerjakan ribuan orang.",
        exampleKo: "그 공장은 수천 명을 고용합니다.",
      },
      {
        word: "pemberontakan",
        meaning: "반란, 봉기",
        example: "Pemberontakan tahun 1948 hanya bertahan satu bulan.",
        exampleKo: "1948년의 봉기는 한 달만 버텼습니다.",
      },
    ],
  },

  "Kediri": {
    desc:
      "브란타스 강가에 앉은 동부 자바의 오래된 도시입니다. 11세기부터 12세기까지 크디리 왕국의 중심이었고, 그 시절 왕 자야바야가 남겼다는 예언은 지금도 인도네시아에서 회자됩니다. 자바가 오래 지배당한 뒤 결국 스스로 서게 된다는 내용이라, 독립운동기에 특히 많이 인용되었습니다.\n\n" +
      "현대의 크디리는 담배 회사의 도시입니다. 정향 담배를 만드는 대기업 한 곳이 여기서 태어나 도시 경제의 큰 부분을 차지하고 있습니다.\n\n" +
      "도시 입구에는 파리 개선문을 닮은 커다란 건축물이 서 있어 처음 오는 사람을 어리둥절하게 만듭니다. 지역의 상징으로 2000년대에 세운 것입니다.",
    words: [
      {
        word: "rokok",
        meaning: "담배",
        example: "Pabrik rokok besar berdiri di kota ini.",
        exampleKo: "큰 담배 공장이 이 도시에 있습니다.",
      },
      {
        word: "ramalan",
        meaning: "예언",
        example: "Ramalan raja itu masih sering dikutip.",
        exampleKo: "그 왕의 예언은 지금도 자주 인용됩니다.",
      },
    ],
  },

  "Tuban": {
    desc:
      "자바 북해안의 항구 마을입니다. 마자파힛 시절에는 왕국의 바깥 문 역할을 하던 큰 항구여서 중국과 참파의 배가 드나들었고, 이슬람도 이 해안을 통해 들어왔습니다.\n\n" +
      "왈리송오의 한 사람인 수난 보낭의 묘가 시내 한복판에 있습니다. 그는 가믈란과 노래로 가르쳤다고 전해지며, 지금도 자바 각지에서 순례객이 버스를 타고 이 무덤을 찾아옵니다.\n\n" +
      "땅은 석회암입니다. 그래서 물이 귀하고 농사가 어려운 대신 시멘트 공장이 들어섰고, 해안가에는 야자수에서 받은 수액을 파는 가게가 늘어서 있습니다. 갓 받은 것은 달고 시원하지만 하루만 두면 술이 됩니다.",
    words: [
      {
        word: "makam",
        meaning: "무덤, 묘",
        example: "Peziarah datang ke makam wali setiap hari.",
        exampleKo: "순례객이 매일 성인의 무덤을 찾아옵니다.",
      },
      {
        word: "nira",
        meaning: "야자 수액",
        example: "Nira yang baru diambil rasanya manis.",
        exampleKo: "갓 받은 야자 수액은 맛이 답니다.",
      },
    ],
  },

  "Trowulan": {
    desc:
      "지금은 사탕수수밭과 마을이 이어진 평범한 들판이지만, 이 아래에 마자파힛의 수도가 묻혀 있습니다. 14세기 하얌 우룩 왕과 재상 가자 마다의 시대에 이 왕국은 지금의 인도네시아 대부분과 그 너머까지 영향을 미쳤고, 인도네시아가 하나의 나라라는 관념의 뿌리를 여기서 찾습니다.\n\n" +
      "남은 것은 대부분 붉은 벽돌입니다. 돌이 아니라 벽돌로 지은 도시였기 때문에, 바장 라투 문이나 목욕터처럼 형태가 남은 몇 곳을 빼면 유적은 밭 아래에 흩어져 있습니다. 한 변이 수백 미터에 이르는 인공 저수지 스가란은 물을 다루던 기술을 보여줍니다.\n\n" +
      "흥미롭게도 이 마을은 지금도 청동과 벽돌을 다룹니다. 조상의 일이 손끝에 남은 셈입니다.",
    words: [
      {
        word: "kerajaan",
        meaning: "왕국",
        example: "Kerajaan itu pernah menguasai banyak pulau.",
        exampleKo: "그 왕국은 한때 많은 섬을 다스렸습니다.",
      },
      {
        word: "bata",
        meaning: "벽돌",
        example: "Bangunan kuno di sini dibuat dari bata merah.",
        exampleKo: "이곳의 옛 건물은 붉은 벽돌로 지어졌습니다.",
      },
    ],
  },

  // ---------------- 동부 자바 동쪽 · 마두라 ----------------
  "Malang": {
    desc:
      "해발 450미터 분지에 자리해 자바의 큰 도시 중 가장 서늘합니다. 네덜란드가 계획도시로 다듬은 곳이라 넓은 가로수길과 그 시절 주택이 지금도 남아 있고, 그 위로 사과 과수원이 있는 고원 마을 바투가 이어집니다.\n\n" +
      "이 일대는 훨씬 오래된 역사도 품고 있습니다. 13세기 싱하사리 왕국이 여기서 일어나 마자파힛으로 이어졌고, 시내 주변에 그때의 작은 사원들이 흩어져 있습니다.\n\n" +
      "젊은 도시이기도 합니다. 브라위자야 대학을 비롯한 여러 대학이 있어 학생이 많고, 축구 응원 열기가 인도네시아에서 손꼽힐 만큼 뜨겁습니다.",
    words: [
      {
        word: "apel",
        meaning: "사과",
        example: "Kebun apel banyak terdapat di daerah Batu.",
        exampleKo: "바투 지역에는 사과 과수원이 많습니다.",
      },
      {
        word: "sejuk",
        meaning: "서늘한, 시원한",
        example: "Udara di kota ini sejuk sepanjang tahun.",
        exampleKo: "이 도시의 공기는 일 년 내내 서늘합니다.",
      },
    ],
  },

  "Sidoarjo": {
    desc:
      "수라바야 바로 남쪽에 붙은 도시입니다. 두 강 사이 저지대여서 예부터 못을 파 새우와 밀크피시를 길렀고, 지역 상징에도 이 두 가지가 들어갑니다. 새우 머리로 만든 검은 소스는 동부 자바 음식의 기본 맛입니다.\n\n" +
      "그러나 이 도시의 이름을 전국에 알린 것은 2006년의 사고입니다. 가스 시추 중에 뜨거운 진흙이 솟기 시작했고, 멈추지 않은 채 여러 마을을 삼켰습니다. 수천 가구가 집을 잃었고 지금도 진흙 위에 제방을 쌓아 가둬 둔 상태입니다.\n\n" +
      "그 넓은 진흙 벌판 옆으로 고속도로와 공장이 지나갑니다. 인도네시아의 빠른 성장과 그 대가가 한 화면에 들어오는 드문 곳입니다.",
    words: [
      {
        word: "lumpur",
        meaning: "진흙",
        example: "Lumpur panas menenggelamkan beberapa desa.",
        exampleKo: "뜨거운 진흙이 여러 마을을 삼켰습니다.",
      },
      {
        word: "tambak",
        meaning: "양식장",
        example: "Udang dari tambak ini dikirim ke luar negeri.",
        exampleKo: "이 양식장의 새우는 해외로 보내집니다.",
      },
    ],
  },

  "Surabaya": {
    desc:
      "인도네시아 제2의 도시이자 동부 자바의 관문 항구입니다. 이름은 상어와 악어를 뜻하는 두 단어에서 왔다고 하며, 둘이 싸우는 모습이 도시의 상징입니다.\n\n" +
      "1945년 11월 10일이 이 도시의 날입니다. 독립을 선언한 지 석 달도 안 된 때, 영국군이 최후통첩을 보내자 청년들이 물러서지 않고 맞섰습니다. 몇 주 동안의 전투로 수많은 사람이 죽었지만 그 저항이 인도네시아 독립 의지를 세계에 알렸고, 그날은 지금 영웅의 날로 기념됩니다.\n\n" +
      "옛 도심 암펠 일대에는 수난 암펠의 묘를 중심으로 아랍계 거리가 형성되어 있어, 향과 대추야자를 파는 좁은 골목을 지나면 곧바로 순례객이 모인 마당이 나옵니다.",
    words: [
      {
        word: "pahlawan",
        meaning: "영웅",
        example: "Hari Pahlawan diperingati setiap 10 November.",
        exampleKo: "영웅의 날은 매년 11월 10일에 기념됩니다.",
      },
      {
        word: "pertempuran",
        meaning: "전투",
        example: "Pertempuran itu berlangsung selama tiga minggu.",
        exampleKo: "그 전투는 3주 동안 이어졌습니다.",
      },
    ],
  },

  "Gunung Bromo": {
    desc:
      "화산 안에 화산이 들어 있는 지형입니다. 옛 거대 분화가 남긴 칼데라 바닥에 모래 벌판이 펼쳐지고, 그 한가운데 브로모가 김을 뿜으며 서 있습니다. 새벽에 능선에서 내려다보면 안개 위로 봉우리만 떠오르는데, 인도네시아에서 가장 많이 찍힌 풍경 중 하나입니다.\n\n" +
      "이 산자락에는 텡거족이 삽니다. 자바가 이슬람으로 바뀔 때 산으로 물러난 사람들의 후손으로, 지금도 힌두 신앙을 지키고 있습니다.\n\n" +
      "해마다 카사다가 되면 이들은 농작물과 가축을 지고 분화구 가장자리까지 올라가 아래로 던집니다. 조상의 약속을 지키는 제사입니다. 그 아래 비탈에서는 던져진 제물을 받으려는 사람들이 그물을 들고 기다립니다.",
    words: [
      {
        word: "kawah",
        meaning: "분화구",
        example: "Asap putih keluar dari kawah setiap hari.",
        exampleKo: "매일 분화구에서 흰 연기가 나옵니다.",
      },
      {
        word: "sesaji",
        meaning: "제물, 공물",
        example: "Warga membawa sesaji ke tepi kawah.",
        exampleKo: "주민들이 제물을 분화구 가장자리로 가져갑니다.",
      },
    ],
    wiki: "Mount Bromo",
  },

  "Probolinggo": {
    desc:
      "브로모로 올라가는 사람들이 거쳐 가는 북해안 항구 도시입니다. 마두라 해협에 면해 있어 어선이 많고, 마두라계 주민이 섞여 살아 말씨가 이웃 도시와 조금 다릅니다.\n\n" +
      "이 도시는 바람으로 유명합니다. 건기 끝 무렵이면 산에서 바다로 마른 바람이 몇 달씩 불어 나뭇가지를 흔들고 빨래를 하루 만에 말립니다. 사람들은 이 바람에 이름을 따로 붙여 부릅니다.\n\n" +
      "그 바람과 볕 덕에 망고가 답니다. 프로볼링고 망고는 인도네시아 안에서 이름값이 있고, 길가 노점에 계절마다 산더미처럼 쌓입니다.",
    words: [
      {
        word: "mangga",
        meaning: "망고",
        example: "Mangga dari kota ini terkenal manis.",
        exampleKo: "이 도시의 망고는 달기로 유명합니다.",
      },
      {
        word: "angin",
        meaning: "바람",
        example: "Angin kering bertiup selama musim kemarau.",
        exampleKo: "건기 동안 마른 바람이 붑니다.",
      },
    ],
  },

  "Pamekasan": {
    desc:
      "마두라 섬 가운데에 있는 도시입니다. 자바와 좁은 해협을 사이에 두고 있을 뿐인데 분위기가 확 다릅니다. 땅이 척박해 논 대신 옥수수와 소금밭이 많고, 사람들은 말이 직설적이며 이슬람 색채가 자바보다 진합니다.\n\n" +
      "마두라를 소금의 섬이라 부르는 이유가 이 일대에 있습니다. 볕이 강하고 비가 적어 바닷물을 가두어 말리기에 좋아서, 건기가 되면 해안을 따라 하얀 소금 더미가 줄지어 쌓입니다.\n\n" +
      "추수가 끝나면 소 경주가 열립니다. 두 마리를 나무 썰매에 매어 짧은 흙길을 달리게 하는데, 경주에 나가는 소는 사람보다 좋은 대접을 받으며 길러집니다. 이 도시는 마두라 바틱의 중심이기도 해서, 자바 바틱보다 색이 훨씬 강렬합니다.",
    words: [
      {
        word: "garam",
        meaning: "소금",
        example: "Petani garam bekerja pada musim kemarau.",
        exampleKo: "소금 농부는 건기에 일합니다.",
      },
      {
        word: "sapi",
        meaning: "소",
        example: "Sapi untuk lomba dirawat dengan sangat baik.",
        exampleKo: "경주에 나가는 소는 아주 정성껏 길러집니다.",
      },
    ],
  },

  "Jember": {
    desc:
      "동부 자바 남동쪽의 농업 도시입니다. 네덜란드 시절 이 일대에 대규모 농원이 들어서면서 자바 각지에서 사람이 모여들었고, 그래서 자바인과 마두라인이 섞인 독특한 말씨가 자리 잡았습니다.\n\n" +
      "이곳의 담뱃잎은 세계 시장에서 이름이 있습니다. 시가를 감싸는 겉잎으로 쓰이는 종류가 이 땅에서 잘 자라, 지금도 유럽 경매장으로 실려 나갑니다. 수확기가 되면 잎을 그늘에 매달아 말리는 긴 창고들이 들판에 늘어섭니다.\n\n" +
      "한편 이 조용한 도시는 해마다 한 번 완전히 달라집니다. 거리를 활주로 삼아 수백 명이 거대한 의상을 입고 행진하는 축제가 열리는데, 규모로는 세계에서 손꼽히는 패션 카니발입니다.",
    words: [
      {
        word: "tembakau",
        meaning: "담뱃잎",
        example: "Tembakau dari Jember diekspor ke Eropa.",
        exampleKo: "즘버르의 담뱃잎은 유럽으로 수출됩니다.",
      },
      {
        word: "perkebunan",
        meaning: "농원, 플랜테이션",
        example: "Perkebunan besar dibuka pada masa kolonial.",
        exampleKo: "큰 농원들이 식민지 시대에 열렸습니다.",
      },
    ],
    wiki: "Jember Regency",
  },

  "Banyuwangi": {
    desc:
      "자바 섬의 동쪽 끝입니다. 여기서 배를 타면 30분 만에 발리에 닿기 때문에, 부두에는 밤낮없이 화물차와 오토바이가 줄을 섭니다. 자바와 발리를 오가는 거의 모든 육상 물류가 이 좁은 해협을 건넙니다.\n\n" +
      "이 지역 원주민은 오싱족입니다. 자바인도 발리인도 아닌 자기 말과 자기 춤을 지켜 왔고, 대표적인 춤 간드룽은 원래 추수를 감사하며 추던 것입니다. 힌두 유산과 이슬람이 한 마을 안에 겹쳐 있는 곳이 많습니다.\n\n" +
      "뒤로는 이젠 화산, 앞으로는 서핑으로 알려진 남쪽 해변이 있어 관광의 관문 노릇도 합니다.",
    words: [
      {
        word: "tarian",
        meaning: "춤",
        example: "Tarian Gandrung berasal dari daerah ini.",
        exampleKo: "간드룽 춤은 이 지역에서 나왔습니다.",
      },
      {
        word: "dermaga",
        meaning: "부두, 선착장",
        example: "Truk mengantre di dermaga sepanjang malam.",
        exampleKo: "트럭들이 밤새 부두에 줄을 섭니다.",
      },
    ],
  },

  "Kawah Ijen": {
    desc:
      "분화구 안에 청록색 호수가 담긴 화산입니다. 아름다워 보이지만 이 물은 세계에서 가장 산성이 강한 호수 중 하나여서, 금속도 오래 견디지 못합니다.\n\n" +
      "밤에 오르는 사람이 많은 이유는 파란 불꽃 때문입니다. 바위틈에서 새어 나온 유황 가스가 공기와 만나 타면서 푸른 불길을 냅니다. 어두울 때만 보이기 때문에 새벽 두세 시에 손전등을 들고 오릅니다.\n\n" +
      "그 불길 옆에서 사람이 일합니다. 굳은 유황 덩어리를 깨어 대나무 바구니에 담고, 70에서 90킬로그램을 어깨에 지고 분화구 벽을 걸어 올라와 산 아래까지 내려갑니다. 하루 두 번 나르는 사람도 있습니다. 관광객이 새벽 풍경을 찍는 바로 그 자리에서 벌어지는 일입니다.",
    words: [
      {
        word: "belerang",
        meaning: "유황",
        example: "Para penambang memikul belerang dari dasar kawah.",
        exampleKo: "광부들이 분화구 바닥에서 유황을 짊어지고 나릅니다.",
      },
      {
        word: "memikul",
        meaning: "짊어지다, 메다",
        example: "Dia memikul beban hampir sembilan puluh kilogram.",
        exampleKo: "그는 거의 90킬로그램의 짐을 짊어집니다.",
      },
    ],
    wiki: "Ijen",
  },
};
