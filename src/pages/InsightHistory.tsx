// src/pages/InsightHistory.tsx
// 인도네시아 역사 — 세로 타임라인 (위 = 최신, 아래 = 옛날). 항목 탭 → 상세 팝업.
// 고정 콘텐츠, 전체 한국어.

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Hourglass, X } from "lucide-react";

interface HistEvent {
  y: string; // 연도 표시
  t: string; // 제목
  d: string[]; // 상세 문단
}

interface Era {
  era: string;
  period: string;
  events: HistEvent[];
}

// 위 = 최신 → 아래 = 옛날
const ERAS: Era[] = [
  {
    era: "개혁 시대와 오늘",
    period: "1998 ~ 현재",
    events: [
      {
        y: "2024~",
        t: "프라보워 시대",
        d: [
          "2024년 10월 프라보워 수비안토가 제8대 대통령으로 취임했습니다. 조코위 정부의 장관이자 전 특전사령관 출신입니다.",
          "칼리만탄의 신수도 누산타라(IKN) 건설과 이전이 진행 중이며, 2025년에는 BRICS에 정식 가입해 국제 무대에서의 위상을 키우고 있습니다.",
          "무상급식 등 대규모 복지 정책과 8% 성장 목표를 내세우고 있습니다.",
        ],
      },
      {
        y: "2014~2024",
        t: "조코위 시대 — 인프라의 10년",
        d: [
          "가구 판매상 출신으로 솔로 시장·자카르타 주지사를 거친 조코 위도도(조코위)는 엘리트 가문 출신이 아닌 첫 대통령이었습니다.",
          "고속도로·항만·공항·자카르타 지하철(MRT) 등 대규모 인프라 건설을 밀어붙였고, 니켈 원광 수출 금지로 전기차 배터리 산업 유치를 시작했습니다.",
          "2022년 신수도법을 통과시켜 가라앉는 자카르타를 대신할 새 수도 누산타라 건설을 시작했습니다.",
        ],
      },
      {
        y: "2004~2014",
        t: "유도요노와 민주주의 정착",
        d: [
          "2004년 수실로 밤방 유도요노(SBY)가 최초의 국민 직선제 대통령으로 당선됐습니다.",
          "2004년 12월 수마트라 대지진·쓰나미로 아체에서만 16만 명 이상이 희생됐지만, 이 비극이 계기가 되어 2005년 헬싱키 협정으로 30년 아체 분쟁이 평화적으로 끝났습니다.",
          "안정적인 경제 성장과 함께 인도네시아는 '민주주의와 이슬람이 공존하는 나라'의 모델로 자리 잡았습니다.",
        ],
      },
      {
        y: "1998~2004",
        t: "레포르마시 — 민주화 개혁",
        d: [
          "수하르토 퇴진 후 하비비·와힛·메가와티 대통령이 이어지며 급속한 민주화가 진행됐습니다. 언론 자유, 정당 설립 자유, 지방 분권이 도입됐습니다.",
          "1999년 동티모르가 주민투표로 분리를 선택해 2002년 독립했습니다.",
          "와힛(구스 두르) 대통령은 화교 차별을 철폐하고 유교를 공인 종교로 복원했습니다. 2001년에는 메가와티가 첫 여성 대통령이 됐습니다.",
        ],
      },
    ],
  },
  {
    era: "수하르토 신질서",
    period: "1966 ~ 1998",
    events: [
      {
        y: "1997~98",
        t: "금융위기와 수하르토 퇴진",
        d: [
          "1997년 아시아 금융위기로 루피아 가치가 폭락하고 경제가 무너졌습니다. IMF 구제금융의 긴축 조건은 민생을 더 악화시켰습니다.",
          "1998년 5월 자카르타 폭동과 대학생 시위 끝에 수하르토가 32년 만에 퇴진했습니다. 이 격동기에 화교 공동체가 큰 피해를 입었습니다.",
        ],
      },
      {
        y: "1966~98",
        t: "신질서 — 개발과 독재의 32년",
        d: [
          "수하르토는 '신질서(Orde Baru)'를 내걸고 반공·개발 노선으로 통치했습니다. 녹색혁명으로 쌀 자급을 달성하고 빈곤율을 크게 낮췄으며 '아시아의 호랑이'로 불리는 고도성장을 이뤘습니다.",
          "그러나 골카르당 중심의 관제 정치, 언론 통제, 군의 정치 개입(드위풍시), 그리고 가족·측근의 천문학적 부패가 함께 자랐습니다.",
          "1975년에는 동티모르를 침공해 강제 병합했습니다.",
        ],
      },
      {
        y: "1965",
        t: "9·30 사건 — 현대사의 비극",
        d: [
          "1965년 9월 30일 밤 좌파 성향 군인들이 육군 장성 6명을 살해하는 쿠데타 시도가 일어났고, 수하르토 소장이 이를 진압했습니다.",
          "이후 공산당(PKI)에 책임이 돌려지며 전국적 숙청이 벌어져 약 50만~100만 명이 학살된 것으로 추정됩니다. 20세기 최대 규모의 비극 중 하나입니다.",
          "수카르노는 실권을 잃었고, 1966년 권한 이양 문서(수퍼스마르)로 수하르토 시대가 시작됐습니다.",
        ],
      },
    ],
  },
  {
    era: "독립과 건국",
    period: "1945 ~ 1965",
    events: [
      {
        y: "1955~65",
        t: "수카르노의 교도 민주주의",
        d: [
          "1955년 반둥에서 아시아·아프리카 29개국 회의를 주최하며 수카르노는 제3세계 비동맹 운동의 지도자로 떠올랐습니다.",
          "그러나 국내에서는 1959년부터 '교도 민주주의'를 선언하고 의회를 약화시키며 권위주의로 기울었습니다.",
          "1963년 서이리안(파푸아)을 병합했고, 말레이시아와의 대결 정책(콘프론타시)으로 국제적으로 고립됐으며 경제는 초인플레이션에 빠졌습니다.",
        ],
      },
      {
        y: "1945~49",
        t: "독립전쟁 — 무장과 외교의 투쟁",
        d: [
          "일본 패망 후 돌아온 네덜란드는 두 차례 대규모 군사 작전으로 식민지를 되찾으려 했습니다.",
          "수라바야 전투(1945년 11월)의 영웅적 저항, 게릴라전, 그리고 유엔 외교전이 함께 전개됐습니다.",
          "국제 여론의 압박 끝에 1949년 12월 27일 네덜란드가 주권을 이양했습니다. 11월 10일은 지금도 '영웅의 날'로 기념됩니다.",
        ],
      },
      {
        y: "1945.8.17",
        t: "독립 선언",
        d: [
          "일본 항복 이틀 후인 1945년 8월 17일 아침, 수카르노와 하타가 자카르타에서 독립을 선언했습니다.",
          "하루 뒤 판차실라를 담은 헌법이 채택되고 수카르노가 초대 대통령이 됐습니다.",
          "'인도네시아'라는 하나의 국가, '인도네시아어'라는 하나의 언어로 17,000개 섬과 300여 민족이 한 나라가 되는 여정이 시작됐습니다.",
        ],
      },
    ],
  },
  {
    era: "일본 점령기",
    period: "1942 ~ 1945",
    events: [
      {
        y: "1942~45",
        t: "일본 점령 — 3년 반의 격변",
        d: [
          "1942년 3월 일본군이 네덜란드령 동인도를 점령했습니다. 350년 네덜란드 지배가 순식간에 무너지는 것을 본 경험은 독립 의지에 큰 영향을 줬습니다.",
          "로무샤(강제 노역)로 수십만 명이 희생되고 식량 징발로 기근이 발생하는 등 고통이 컸습니다.",
          "한편 일본은 전쟁 협력을 얻기 위해 수카르노 등 민족주의자들에게 활동 공간을 주고 청년 군사훈련을 시켰는데, 이것이 훗날 독립전쟁의 기반이 됐습니다.",
        ],
      },
    ],
  },
  {
    era: "네덜란드 식민 시대",
    period: "1800 ~ 1942",
    events: [
      {
        y: "1908~42",
        t: "민족 각성 — 하나의 인도네시아",
        d: [
          "1908년 부디 우토모 결성을 시작으로 근대적 민족 운동이 싹텄습니다(5월 20일은 '민족 각성의 날').",
          "1928년 10월 28일 청년들이 '하나의 조국, 하나의 민족, 하나의 언어 — 인도네시아'를 선언한 '청년의 맹세(숨파 프무다)'는 결정적 전환점이었습니다.",
          "수카르노가 이끄는 국민당 등 독립운동이 성장하자 네덜란드는 지도자들을 체포·유배했습니다.",
        ],
      },
      {
        y: "1830~70",
        t: "강제재배제도 — 착취의 절정",
        d: [
          "자바 농민들에게 농지의 일부에 커피·사탕수수·인디고 등 수출 작물을 강제로 재배시킨 제도입니다.",
          "네덜란드 국가 재정의 3분의 1을 채울 만큼 막대한 부를 가져갔지만, 자바에는 기근이 반복됐습니다.",
          "1860년 소설 「막스 하벨라르」가 식민지의 참상을 고발해 네덜란드 여론을 흔들었고, 이후 '윤리 정책'으로 전환하는 계기가 됐습니다.",
        ],
      },
      {
        y: "1825~30",
        t: "자바 전쟁 — 디포네고로의 봉기",
        d: [
          "족자카르타의 왕자 디포네고로가 이끈 대규모 반식민 전쟁입니다. 자바 인구 상당수가 참여했고 약 20만 명이 희생됐습니다.",
          "네덜란드는 협상을 구실로 디포네고로를 체포해 유배했습니다. 그는 오늘날 국가 영웅으로 추앙받습니다.",
        ],
      },
      {
        y: "1800~1942",
        t: "네덜란드령 동인도의 완성",
        d: [
          "VOC 해산 후 네덜란드 정부가 직접 식민 통치를 시작했습니다. 19세기 내내 정복 전쟁으로 지배를 군도 전체로 넓혔습니다.",
          "가장 길었던 아체 전쟁(1873~1904)을 끝으로 오늘날 인도네시아 영토의 원형이 만들어졌습니다.",
          "20세기 초 '윤리 정책'으로 교육이 일부 확대됐는데, 여기서 배출된 신지식인들이 역설적으로 독립운동의 주역이 됐습니다. 여성 교육의 선구자 카르티니도 이 시기의 인물입니다.",
        ],
      },
    ],
  },
  {
    era: "대항해 시대와 VOC",
    period: "1511 ~ 1799",
    events: [
      {
        y: "1602~1799",
        t: "네덜란드 동인도회사(VOC)",
        d: [
          "세계 최초의 주식회사이자 국가에 준하는 권한(군대·조약·화폐)을 가진 VOC가 향신료 무역을 장악했습니다.",
          "1619년 바타비아(지금의 자카르타)를 건설해 아시아 본부로 삼았고, 1621년 반다 제도에서는 육두구 독점을 위해 주민을 학살·추방했습니다.",
          "말루쿠에서 포르투갈을 몰아내며 개신교가 전파되기 시작했습니다. VOC는 부패와 재정난으로 1799년 해산되고 식민지는 국가로 넘어갔습니다.",
        ],
      },
      {
        y: "1511~",
        t: "포르투갈의 도래와 향신료 전쟁",
        d: [
          "1511년 포르투갈이 믈라카를 점령하며 유럽 세력이 처음 군도에 들어왔습니다. 목표는 유럽에서 금값이던 정향·육두구의 산지 말루쿠(향료 제도)였습니다.",
          "포르투갈과 함께 가톨릭이 전래되어 말루쿠·플로레스에 인도네시아에서 가장 오래된 기독교 공동체가 생겼습니다.",
          "이후 스페인·영국·네덜란드가 뛰어들며 군도는 유럽 열강의 각축장이 됐습니다.",
        ],
      },
    ],
  },
  {
    era: "이슬람 술탄국 시대",
    period: "13세기 ~ 17세기",
    events: [
      {
        y: "16~17세기",
        t: "마타람과 아체 — 이슬람 왕국의 전성기",
        d: [
          "자바 중부의 마타람 술탄국은 술탄 아궁(1613~1645) 때 자바 대부분을 지배했고, 지금도 족자카르타 술탄 가문으로 이어집니다.",
          "수마트라 북단의 아체 술탄국은 '메카의 베란다'로 불리며 이슬람 학문과 무역의 중심이 됐습니다.",
          "이슬람은 강요보다는 상인과 수피(신비주의자)들을 통해 토착 문화와 섞이며 퍼졌습니다.",
        ],
      },
      {
        y: "15~16세기",
        t: "드막과 왈리 송오 — 자바의 이슬람화",
        d: [
          "15세기 말 자바 최초의 이슬람 왕국 드막이 마자파힛을 대체했습니다.",
          "'왈리 송오(아홉 성인)'로 불리는 전도자들은 그림자극 와양과 가믈란 음악 같은 자바 전통문화를 활용해 이슬람을 전했습니다. 이 유연한 전파 방식이 인도네시아 이슬람의 관용적 성격을 만들었습니다.",
          "같은 시기 믈라카 해협의 믈라카 술탄국은 동남아 이슬람 무역망의 중심이었습니다.",
        ],
      },
      {
        y: "13세기",
        t: "이슬람의 도래 — 사무드라 파사이",
        d: [
          "수마트라 북부의 사무드라 파사이가 군도 최초의 이슬람 술탄국이 됐습니다(13세기 말).",
          "이슬람은 아랍·인도·중국 무슬림 상인들의 무역로를 따라 항구 도시부터 평화적으로 확산됐습니다.",
          "서쪽 해안에서 동쪽으로 퍼져간 이 경로가 오늘날 '서부는 이슬람, 동부는 기독교'라는 종교 지도의 바탕이 됐습니다.",
        ],
      },
    ],
  },
  {
    era: "힌두·불교 왕국 시대",
    period: "4세기 ~ 16세기",
    events: [
      {
        y: "1293~16세기",
        t: "마자파힛 — 누산타라의 제국",
        d: [
          "동자바의 마자파힛은 인도네시아 역사상 최대의 제국입니다. 재상 가자 마다는 '군도(누산타라)를 통일할 때까지 향신료를 입에 대지 않겠다'는 팔라파 맹세로 유명합니다.",
          "14세기 전성기에는 오늘날 인도네시아 대부분과 말레이 반도까지 영향력이 미쳤습니다.",
          "신수도 이름 '누산타라', 국장 가루다, 국가 표어 '비네카 퉁갈 이카'가 모두 이 시대의 유산입니다. 이슬람 확산과 함께 쇠퇴했고, 힌두 귀족들이 발리로 옮겨가 발리 힌두 문화가 이어졌습니다.",
        ],
      },
      {
        y: "8~9세기",
        t: "보로부두르와 프람바난",
        d: [
          "중부 자바에서 불교 샤일렌드라 왕조가 세계 최대 불교 유적 보로부두르(9세기 초)를, 힌두 산자야 왕조가 프람바난 사원군(9세기 중반)을 세웠습니다.",
          "두 종교가 나란히 대규모 사원을 지은 것은 당시부터 이어진 공존의 전통을 보여줍니다.",
          "둘 다 유네스코 세계문화유산이며, 보로부두르는 지금도 와이삭(석가탄신일) 행사가 열립니다.",
        ],
      },
      {
        y: "7~13세기",
        t: "스리위자야 — 바다의 제국",
        d: [
          "수마트라 팔렘방을 중심으로 한 해상 제국 스리위자야는 믈라카 해협의 동서 무역을 장악했습니다.",
          "동남아 최대의 불교 학문 중심지로, 중국과 인도의 승려들이 유학을 왔습니다.",
          "'바다로 연결된 군도 국가'라는 인도네시아의 원형을 보여준 첫 세력입니다.",
        ],
      },
      {
        y: "4~7세기",
        t: "최초의 왕국들",
        d: [
          "인도와의 교류로 힌두교·불교와 문자가 들어오며 역사 시대가 시작됩니다.",
          "동칼리만탄의 쿠타이 왕국이 남긴 4세기경 산스크리트 비문이 인도네시아에서 가장 오래된 기록입니다. 서자바에는 타루마느가라 왕국이 있었습니다.",
        ],
      },
    ],
  },
  {
    era: "선사 시대",
    period: "약 170만 년 전 ~",
    events: [
      {
        y: "BC 2000~",
        t: "오스트로네시아인의 이주",
        d: [
          "오늘날 인도네시아인의 주된 조상인 오스트로네시아계 사람들이 대만 방면에서 배를 타고 군도로 이주해 왔습니다.",
          "벼농사, 가축, 아웃리거 카누(카누 양옆에 균형 장치를 단 배)를 가져왔고, 이들의 언어가 오늘날 인도네시아어의 뿌리입니다.",
          "기원전후부터는 정향·육두구가 이미 인도와 로마까지 팔려나가, 향신료 무역의 역사가 2천 년을 넘습니다.",
        ],
      },
      {
        y: "170만 년 전~",
        t: "자바 원인에서 동굴벽화까지",
        d: [
          "자바에서 발견된 호모 에렉투스 '자바 원인'은 인류 진화 연구의 기념비적 발견입니다(약 100만~170만 년 전).",
          "플로레스 섬에서는 키 1m의 소형 인류 '플로레스인(호빗)'이 발견돼 세계를 놀라게 했습니다.",
          "술라웨시의 동굴벽화는 4만 년 이상 된 세계에서 가장 오래된 구상 회화로 꼽힙니다.",
        ],
      },
    ],
  },
];

const InsightHistory = () => {
  const navigate = useNavigate();
  const [popup, setPopup] = useState<HistEvent | null>(null);
  const popupOpenRef = useRef(false);

  // 팝업 열림 상태에서 뒤로가기 → 팝업만 닫기
  useEffect(() => {
    const onPop = () => {
      if (popupOpenRef.current) {
        popupOpenRef.current = false;
        setPopup(null);
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const openPopup = (ev: HistEvent) => {
    setPopup(ev);
    if (!popupOpenRef.current) {
      popupOpenRef.current = true;
      try {
        history.pushState({ kkHist: true }, "");
      } catch (e) {}
    }
  };

  const closePopup = () => {
    if (popupOpenRef.current) {
      popupOpenRef.current = false;
      try {
        history.back();
        return;
      } catch (e) {}
    }
    setPopup(null);
  };

  return (
    <div
      className="min-h-screen px-4 pt-4 pb-10 max-w-lg mx-auto"
      style={{
        backgroundImage:
          "linear-gradient(180deg, hsl(201 76% 14%) 0%, hsl(196 72% 22%) 55%, hsl(195 68% 30%) 100%)",
      }}
    >
      <header className="flex items-center gap-2 mb-2">
        <button
          onClick={() => navigate("/insight")}
          className="w-9 h-9 rounded-full flex items-center justify-center text-white/85 hover:bg-white/10 active:bg-white/15 -ml-1"
          title="뒤로"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center shadow-lg shadow-black/30">
            <Hourglass size={18} className="text-white" />
          </span>
          <h1 className="text-lg font-semibold text-white leading-none">인도네시아 역사</h1>
        </div>
      </header>

      <p className="mb-5 text-[13px] font-gothic text-white/55 leading-relaxed px-1">
        위가 오늘, 아래로 내려갈수록 옛날입니다. 제목을 누르면 자세한 이야기가 열립니다.
      </p>

      {/* 세로 타임라인 */}
      <div className="relative pl-6">
        {/* 세로 라인 */}
        <div className="absolute left-[7px] top-1 bottom-1 w-[2px] bg-amber-400/25 rounded-full" />

        {ERAS.map((era) => (
          <div key={era.era} className="mb-7 last:mb-0">
            {/* 시대 헤더 */}
            <div className="relative mb-3">
              <span className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-amber-400 border-[3px] border-background shadow" />
              <h2 className="text-[15px] font-semibold text-amber-300 leading-tight">{era.era}</h2>
              <p className="text-[11px] font-gothic text-amber-200/50 mt-0.5">{era.period}</p>
            </div>

            {/* 사건들 */}
            <div className="space-y-2.5">
              {era.events.map((ev) => (
                <button
                  key={ev.t}
                  onClick={() => openPopup(ev)}
                  className="relative w-full text-left group"
                >
                  <span className="absolute -left-[21px] top-2.5 w-2 h-2 rounded-full bg-amber-300/70 group-active:bg-amber-300" />
                  <span className="block bg-white/[0.06] active:bg-white/[0.12] border border-white/10 rounded-xl px-3.5 py-2.5 transition-colors">
                    <span className="block text-[11px] font-gothic font-semibold text-amber-300/80">{ev.y}</span>
                    <span className="block text-sm font-gothic font-medium text-white/90 mt-0.5 leading-snug">{ev.t}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 상세 팝업 */}
      {popup && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-5 kkh-fade"
          onClick={closePopup}
        >
          <div
            className="w-full max-w-md bg-card rounded-2xl shadow-2xl max-h-[80vh] overflow-y-auto kkh-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-card px-5 pt-4 pb-3 border-b border-gray-100 flex items-start gap-3">
              <div className="flex-1">
                <p className="text-[11px] font-gothic font-bold text-amber-600">{popup.y}</p>
                <h3 className="text-base font-semibold text-gray-900 mt-0.5 leading-snug">{popup.t}</h3>
              </div>
              <button
                onClick={closePopup}
                className="w-8 h-8 rounded-full bg-black/5 text-gray-500 flex items-center justify-center shrink-0"
              >
                <X size={16} />
              </button>
            </div>
            <div className="px-5 py-4">
              {popup.d.map((p, i) => (
                <p key={i} className="text-sm font-gothic text-gray-700 leading-relaxed mb-2.5 last:mb-0">
                  {p}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .kkh-fade { animation: kkhFade 0.15s ease-out; }
        .kkh-pop { animation: kkhPop 0.22s cubic-bezier(0.22,1,0.36,1); }
        @keyframes kkhFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes kkhPop { from { opacity: 0; transform: translateY(24px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
      `}</style>
    </div>
  );
};

export default InsightHistory;
