// src/pages/InsightChristian.tsx
// 인도네시아 기독교 — 고정 콘텐츠 (지역·종족·교단 현황, 접이식 상세 포함)
// 출처: 인도네시아 기독교 현황 및 교단 현황 보고서 (2020~2025 자료 기준)

import { useState, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Cross, ChevronDown, ChevronUp } from "lucide-react";

// ---------- 접이식 섹션 ----------
const Fold = ({ title, badge, defaultOpen, children }: { title: string; badge?: string; defaultOpen?: boolean; children: ReactNode }) => {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="bg-card rounded-2xl border border-rose-300/60 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center gap-2 text-left"
      >
        <span className="flex-1 text-sm font-semibold text-gray-900">{title}</span>
        {badge && (
          <span className="text-[11px] font-gothic font-semibold text-rose-600 bg-rose-500/10 px-2 py-0.5 rounded-full shrink-0">
            {badge}
          </span>
        )}
        {open ? (
          <ChevronUp size={16} className="text-rose-500 shrink-0" />
        ) : (
          <ChevronDown size={16} className="text-rose-500 shrink-0" />
        )}
      </button>
      {open && <div className="px-4 pb-4 border-t border-gray-100 pt-3">{children}</div>}
    </div>
  );
};

// ---------- 데이터 ----------
const REGIONS = [
  {
    t: "① 북수마트라 — 바탁족·니아스",
    b: "90%+",
    d: [
      "인도네시아 기독교 인구의 16.5%(약 470만)를 차지하는 두 번째로 큰 기독교 지역. 토바 호수 주변 전체가 대규모 기독교 공동체이며, 니아스 섬은 95% 이상이 기독교인입니다.",
      "1862년 독일 루터교 선교사 노멘센이 본격 선교를 시작해 바탁어 신약성경을 번역(1878)했고, 1880년대에는 마을·부족 전체가 개종했습니다. 북쪽 아체와 남쪽 이슬람 지역 사이의 '기독교 완충지대'라는 지정학도 작용했습니다.",
      "그 결과 탄생한 HKBP는 현재 아시아 최대 루터교회(약 650만)입니다.",
    ],
  },
  {
    t: "② 북술라웨시 — 미나하사 (마나도)",
    b: "67%",
    d: [
      "북술라웨시 주 인구의 67.3%가 개신교. 17세기부터 네덜란드 VOC 직접 통치 지역으로 일찍 기독교와 접촉했습니다.",
      "미나하사 사람들은 네덜란드 식민 군대·행정에 적극 참여하며 기독교가 민족 정체성의 일부로 자리 잡았습니다.",
    ],
  },
  {
    t: "③ 남술라웨시 — 토라자",
    b: "65%",
    d: [
      "토라자 종족의 약 65%가 개신교. 1913년 네덜란드 개혁교회 선교로 시작, 1947년 독립적인 토라자 교회(Gereja Toraja)가 설립됐습니다.",
      "기독교를 받아들이면서도 전통 장례 문화(람부 솔로)를 유지하는 독특한 공존 문화가 발전해, 세계적으로 유명한 거대 장례 의식이 지금도 이어집니다.",
    ],
  },
  {
    t: "④ 파푸아 — 최고 기독교 집중 지역",
    b: "61~98%",
    d: [
      "파푸아 6개 주의 개신교 비율: 고지파푸아 98%, 중앙파푸아 88%, 파푸아 70%, 서파푸아 69%, 남서파푸아 62%.",
      "지리적 고립으로 이슬람이 거의 들어오지 못한 곳에 19세기 말부터 선교사들이 수백 개 원주민 부족에게 복음을 전했습니다.",
      "파푸아는 인도네시아 인구의 2%이지만 기독교 인구의 15%가 집중되어 있습니다.",
    ],
  },
  {
    t: "⑤ 동누사틍가라(NTT) — 가톨릭의 땅",
    b: "90%+",
    d: [
      "전체 인구의 90% 이상이 기독교(대부분 가톨릭). 16세기 포르투갈이 가톨릭의 씨앗을 뿌렸고, 19세기 후반 예수회가 플로레스·티모르에 선교·학교·병원 네트워크를 구축했습니다.",
      "네덜란드 지배 아래서도 가톨릭 정체성이 유지된, 인도네시아 유일의 가톨릭 다수 지역입니다.",
    ],
  },
  {
    t: "⑥ 말루쿠 — 가장 오래된 기독교",
    b: "50%",
    d: [
      "약 50%가 기독교(개신교 중심). 16세기 포르투갈이 향료 무역을 위해 점령하며 가톨릭 선교가 시작된, 인도네시아에서 가장 오래된 기독교 역사를 가진 곳입니다.",
      "이후 네덜란드 VOC가 포르투갈을 몰아내며 개신교로 전환됐고, 암본 사람들은 네덜란드 식민 군대의 핵심 병력으로 활동하며 기독교가 민족 정체성과 깊이 융합했습니다.",
    ],
  },
  {
    t: "⑦ 칼리만탄 내륙 — 다약족",
    b: "지역별 상이",
    d: [
      "1845년부터 라인 선교회가 중앙 칼리만탄 다약족 선교를 시작했습니다.",
      "보르네오 내륙의 다약족은 이슬람 해안 문화와 분리된 채 기독교를 수용했습니다 — 말레이시아 사라왁의 이반족과 같은 맥락입니다.",
    ],
  },
];

interface Denom {
  a: string; // 약칭
  n: string; // 이름
  m: string; // 규모
  f: string; // 특징
}

const D_SUMATRA: Denom[] = [
  { a: "HKBP", n: "바탁기독교개신교회", m: "약 650만 (2024)", f: "1861년 독일 라인선교회 출발 · 아시아 최대 루터교회 · 노멘젠대학" },
  { a: "GKPI", n: "인도네시아 기독교개신교회", m: "약 59만", f: "1964년 HKBP에서 분립 · 도시 사역" },
  { a: "BNKP", n: "니아스 개신교회", m: "약 46만", f: "니아스족의 80% · 1915~21년 대부흥" },
  { a: "GBKP", n: "카로 바탁 개신교회", m: "약 40만", f: "카로 고원 · 개혁/장로교 · 카로어 사역" },
  { a: "HKI", n: "인도네시아 후리아 기독교회", m: "약 35만", f: "1927년 토착 자립운동으로 분립" },
  { a: "GKPS", n: "시말룽운 개신교회", m: "약 22만", f: "시말룽운어 성경(1969) · 농업훈련센터" },
  { a: "GMI", n: "인도네시아 감리교회", m: "약 12만", f: "메단 중심 · 학교 110개 이상 운영" },
  { a: "GKPM", n: "믄타와이 개신교회", m: "약 5만", f: "믄타와이 군도 부족 사역" },
];

const D_JAVA: Denom[] = [
  { a: "GKI", n: "인도네시아 기독교회", m: "약 23만+", f: "화교 교회에서 다민족화 · BPK Penabur 학교 네트워크" },
  { a: "GKJ", n: "자바 기독교회", m: "약 23만", f: "자바어 사역 · 자바 6개 주" },
  { a: "GKJW", n: "동자바 기독교회", m: "약 15만", f: "동자바 종족교회 · 자바어 예전" },
  { a: "GKSBS", n: "남수마트라 기독교회", m: "약 15만+", f: "자바 이주민(트란스미그란) 사역" },
  { a: "GITJ", n: "자바 땅의 복음교회", m: "약 4만", f: "세계 최초의 비유럽계 메노나이트 교회" },
  { a: "GKP", n: "파순단 기독교회", m: "약 3.3만", f: "무슬림 다수 순다족 지역의 소수 교회" },
];

const D_BALINT: Denom[] = [
  { a: "GMIT", n: "티모르 개신교회", m: "약 114만 (2023)", f: "NTT 최대 개신교단 · 1966년 부흥 · 2,500여 기도공동체" },
  { a: "가톨릭 NTT", n: "동누사틍가라 가톨릭", m: "주민 90%+", f: "1534년 포르투갈·예수회 유산 · 학교·병원망" },
  { a: "GKS", n: "숨바 기독교회", m: "수십만", f: "마라푸 토착종교 환경 속 사역" },
  { a: "GKPB", n: "발리 개신교회", m: "약 1.3만", f: "힌두교 환경의 소수 교회 · 관광 디아코니아" },
];

const D_KALSUL: Denom[] = [
  { a: "GMIM", n: "미나하사 복음교회", m: "약 80~85만", f: "북술라웨시 기독교 중심 · 대학·병원 운영" },
  { a: "Gereja Toraja", n: "토라자 교회", m: "약 80~100만", f: "남술라웨시 최대 · 전통문화와 공존" },
  { a: "GKST", n: "중부술라웨시 기독교회", m: "약 50만", f: "포소 분쟁(1998~2005) 이후 화해·평화 사역" },
  { a: "GKII", n: "케마인질교회 (KINGMI)", m: "약 50만+", f: "복음주의(C&MA) · 칼리만탄~파푸아 광역" },
  { a: "GKE", n: "칼리만탄 복음교회", m: "약 33만", f: "다약족 사역에서 출발 · 칼리만탄 5개 주" },
  { a: "GMIST", n: "상이헤탈라우드 복음교회", m: "약 22만", f: "상이헤·탈라우드 군도 인구의 90%+" },
];

const D_MALPAP: Denom[] = [
  { a: "GKI-TP", n: "파푸아 땅 복음 기독교회", m: "약 65~80만", f: "1855년 첫 선교 유산 · 파푸아 최초 토착 교단 · 인권 사역" },
  { a: "GPM", n: "말루쿠 개신교회", m: "약 58만", f: "1605년 VOC 첫 예배까지 거슬러가는 최고(最古) 전통 · 분쟁 후 화해 사역" },
  { a: "GIDI", n: "인도네시아 복음교회", m: "수십만", f: "파푸아 산악지대 · 병원 운영 · 해외 선교" },
  { a: "KINGMI Papua", n: "케마인질교회 파푸아", m: "50만+ 추정", f: "중부 고원 다니·메파고 종족" },
  { a: "GMIH", n: "할마헤라 복음교회", m: "약 15~30만", f: "북말루쿠 · 분쟁 피해 후 평화신학" },
];

const D_NATIONAL: Denom[] = [
  { a: "가톨릭 (KWI)", n: "인도네시아 가톨릭교회", m: "약 860만 (2023)", f: "38개 교구 · NTT·중부자바·서칼리만탄·파푸아 강세 · 카리타스·전국 학교망" },
  { a: "GPIB", n: "인도네시아 서부 개신교회", m: "약 60만+", f: "26개 주 전국 · 동부 출신 디아스포라의 도시 교회" },
];

const D_PENTE: Denom[] = [
  { a: "GBI", n: "인도네시아 베델교회", m: "약 300~350만", f: "1970년 설립 · 지교회 6,100개+ · 도시 중산층·화교 동원력 최강 · 한국 내 인도네시아인 사역의 주요 교단" },
  { a: "GPdI", n: "인도네시아 오순절교회", m: "수백만", f: "1924년 설립 · 인도네시아 오순절 운동의 원점 · 70개+ 시노드의 모교회" },
  { a: "Bethany", n: "베타니 인도네시아", m: "교회 1,000개+", f: "2003년 GBI에서 독립 · 수라바야 응인덴 교회는 주간 출석 14만 명, 동남아 최대급" },
  { a: "GSJA", n: "하나님의 성회", m: "수십만", f: "미국 AG 협력 · 도시 청년 사역" },
  { a: "기타", n: "마와르 샤론 · 티베리아스 등", m: "각 수만+", f: "GBI 계열 분립 · 찬양·치유 중심 메가처치" },
];

const DenomList = ({ items }: { items: Denom[] }) => (
  <div className="space-y-2.5">
    {items.map((d) => (
      <div key={d.a} className="bg-gray-50 rounded-xl px-3 py-2.5">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-[13.5px] font-bold text-gray-900">{d.a}</span>
          <span className="text-xs font-gothic text-gray-500">{d.n}</span>
          <span className="ml-auto text-[11px] font-gothic font-semibold text-rose-600 shrink-0">{d.m}</span>
        </div>
        <p className="mt-1 text-xs font-gothic text-gray-600 leading-relaxed">{d.f}</p>
      </div>
    ))}
  </div>
);

// ---------- 페이지 ----------
const InsightChristian = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background px-4 pt-4 pb-8 max-w-lg mx-auto">
      <header className="flex items-center gap-2 mb-4">
        <button
          onClick={() => navigate("/insight")}
          className="w-9 h-9 rounded-full flex items-center justify-center text-white/85 hover:bg-white/10 active:bg-white/15 -ml-1"
          title="뒤로"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl bg-rose-500 flex items-center justify-center shadow-lg shadow-black/30">
            <Cross size={18} className="text-white" />
          </span>
          <h1 className="text-xl font-semibold text-white leading-none">인도네시아 기독교</h1>
        </div>
      </header>

      <div className="space-y-2">
      <Fold title="핵심 통계" defaultOpen>
        <div className="grid grid-cols-3 gap-2 text-center mb-3">
          <div className="bg-rose-500/5 rounded-xl py-2.5">
            <p className="text-lg font-bold text-rose-600">10.5%</p>
            <p className="text-[11px] font-gothic text-gray-500">전체 기독교</p>
          </div>
          <div className="bg-rose-500/5 rounded-xl py-2.5">
            <p className="text-lg font-bold text-rose-600">7.4%</p>
            <p className="text-[11px] font-gothic text-gray-500">개신교</p>
          </div>
          <div className="bg-rose-500/5 rounded-xl py-2.5">
            <p className="text-lg font-bold text-rose-600">3.1%</p>
            <p className="text-[11px] font-gothic text-gray-500">가톨릭</p>
          </div>
        </div>
        <p className="text-sm font-gothic text-gray-700 leading-relaxed">
          기독교인은 약 2,940만 명(2023)으로, 개신교 약 2,080만·가톨릭 약 860만입니다.
          동남아시아 최대 개신교 인구 보유국이자 아시아에서 필리핀·중국 다음 세 번째,
          그리고 나이지리아에 이어 무슬림 세계에서 두 번째로 큰 기독교 인구를 가진 나라입니다.
        </p>
      </Fold>

      <Fold title="왜 동부·내륙이 기독교가 되었나 — 3가지 패턴">
        <ol className="space-y-2.5">
          <li className="text-[13px] font-gothic text-gray-700 leading-relaxed">
            <span className="font-semibold text-gray-900">1. 이슬람이 늦게 닿은 곳.</span>{" "}
            이슬람은 무역로를 따라 서쪽 해안에서 동쪽으로 퍼졌습니다. 파푸아·내륙 칼리만탄처럼
            고립된 지역에는 이슬람보다 기독교 선교가 먼저 들어갔습니다.
          </li>
          <li className="text-[13px] font-gothic text-gray-700 leading-relaxed">
            <span className="font-semibold text-gray-900">2. 네덜란드 식민 구조.</span>{" "}
            VOC는 이슬람이 강한 자바·서수마트라에서는 선교를 거의 막고, 동부 군도에서는
            적극적으로 기독교화를 추진했습니다.
          </li>
          <li className="text-[13px] font-gothic text-gray-700 leading-relaxed">
            <span className="font-semibold text-gray-900">3. 19세기 유럽 선교사들의 집중 투입.</span>{" "}
            VOC 해산(1799) 후 독일·네덜란드 선교사들이 언어 연구·성경 번역·학교·병원을 병행하며
            기독교가 종족 문화의 뿌리로 자리 잡게 했습니다.
          </li>
        </ol>
      </Fold>

      <Fold title="교파별 지역 분담">
        <p className="text-[13px] font-gothic text-gray-600 leading-relaxed mb-2.5">
          네덜란드는 개신교-가톨릭 갈등을 피하려 지역별로 교파를 나눴고, 그 구조가 지금도 남아 있습니다.
        </p>
        <div className="space-y-1.5 text-[13px] font-gothic">
          {[
            ["수마트라 바탁족", "개신교 (루터교 HKBP)"],
            ["칼리만탄 다약족", "개신교"],
            ["술라웨시 토라자·미나하사", "개신교 (개혁교회)"],
            ["말루쿠 암본족", "개신교"],
            ["플로레스·서티모르 (NTT)", "가톨릭"],
            ["파푸아", "개신교"],
          ].map(([r, d]) => (
            <div key={r} className="flex gap-2">
              <span className="flex-1 text-gray-700">{r}</span>
              <span className="text-gray-500">{d}</span>
            </div>
          ))}
        </div>
      </Fold>
      </div>

      {/* 지역·종족별 상세 (접이식) */}
      <h2 className="text-sm font-semibold text-white/80 px-1 mb-2 mt-5">지역·종족별 상세</h2>
      <div className="space-y-2 mb-5">
        {REGIONS.map((r) => (
          <Fold key={r.t} title={r.t} badge={r.b}>
            {r.d.map((p, i) => (
              <p key={i} className="text-[13px] font-gothic text-gray-700 leading-relaxed mb-2 last:mb-0">
                {p}
              </p>
            ))}
          </Fold>
        ))}
      </div>

      {/* 에큐메니컬 구조 */}
      <div className="mb-5">
      <Fold title="교회 연합 구조">
        <div className="space-y-2 text-[13px] font-gothic">
          {[
            ["PGI", "인도네시아 교회협의회 — 개혁·루터교 중심 104개 교단 (2024)"],
            ["KWI", "가톨릭 주교회의 — 38개 교구 전체"],
            ["PGLII", "복음주의 연합"],
            ["PGPI", "오순절 연합 — 70개 이상 시노드, 추정 400만+"],
          ].map(([a, d]) => (
            <div key={a} className="flex gap-2.5">
              <span className="w-12 shrink-0 font-bold text-gray-900">{a}</span>
              <span className="flex-1 text-gray-600 leading-relaxed">{d}</span>
            </div>
          ))}
        </div>
      </Fold>
      </div>

      {/* 교단 현황 (접이식) */}
      <h2 className="text-sm font-semibold text-white/80 px-1 mb-2">주요 교단 현황</h2>
      <div className="space-y-2 mb-5">
        <Fold title="수마트라 — 바탁·니아스 루터교 계열" badge="8개">
          <DenomList items={D_SUMATRA} />
        </Fold>
        <Fold title="자바 — 개혁·메노나이트·화교 계열" badge="6개">
          <DenomList items={D_JAVA} />
        </Fold>
        <Fold title="발리·누사틍가라" badge="4개">
          <DenomList items={D_BALINT} />
        </Fold>
        <Fold title="칼리만탄·술라웨시" badge="6개">
          <DenomList items={D_KALSUL} />
        </Fold>
        <Fold title="말루쿠·파푸아" badge="5개">
          <DenomList items={D_MALPAP} />
        </Fold>
        <Fold title="전국 교단" badge="2개">
          <DenomList items={D_NATIONAL} />
        </Fold>
        <Fold title="오순절·은사주의 — 성장의 중심" badge="5개+">
          <p className="text-[13px] font-gothic text-gray-600 leading-relaxed mb-2.5">
            인도네시아 기독교의 &lsquo;보이는 성장&rsquo;은 주로 이 계열에서 일어납니다. 도시 동원력과
            메가처치 문화를 발전시켰습니다.
          </p>
          <DenomList items={D_PENTE} />
        </Fold>
      </div>

      {/* 부가 정보 (접이식) */}
      <h2 className="text-sm font-semibold text-white/80 px-1 mb-2">더 알아보기</h2>
      <div className="space-y-2">
        <Fold title="말레이시아와 비교하면">
          <div className="space-y-1.5 text-[13px] font-gothic">
            {[
              ["기독교 비율", "말레이시아 9.1% · 인도네시아 10.5%"],
              ["집중 지역", "말: 동말레이시아(사바·사라왁) · 인: 동인도네시아"],
              ["기독교화 경로", "말: 영국 식민+브룩 왕조 · 인: 네덜란드+독일 선교사"],
              ["법적 지위", "말: 무슬림 전도 금지 · 인: 6개 종교 공식 인정"],
            ].map(([a, d]) => (
              <div key={a} className="flex gap-2">
                <span className="w-20 shrink-0 font-semibold text-gray-800">{a}</span>
                <span className="flex-1 text-gray-600 leading-relaxed">{d}</span>
              </div>
            ))}
            <p className="text-gray-600 leading-relaxed pt-1.5">
              두 나라 모두 이슬람 무역로에서 벗어난 내륙·도서 지역에 기독교 종족이 집중되어 있고,
              기독교가 민족 정체성의 핵심이 되었다는 공통점이 있습니다.
            </p>
          </div>
        </Fold>
        <Fold title="사역·협력 참고">
          <ul className="space-y-2 text-[13px] font-gothic text-gray-700 leading-relaxed list-disc pl-4">
            <li>HKBP·GMIM·토라자 교회·GKI-TP 같은 종족 교단은 대학·병원·학교를 보유해 협력의 실제 거점이 됩니다.</li>
            <li>무슬림 다수 환경의 소수 교회(서자바 GKP, 발리 GKPB 등)는 민감성과 지역 교단의 자립을 최우선으로 고려해야 합니다.</li>
            <li>도시·디아스포라 사역(한국 체류 인도네시아인 포함)에서는 GBI 등 오순절 계열의 네트워크가 가장 동원력이 높습니다.</li>
          </ul>
        </Fold>
      </div>

      <p className="mt-4 text-[11px] font-gothic text-white/35 px-1 leading-relaxed">
        ※ 교인 수는 각 교단 자체 보고·WCC·LWF 자료 기반 추정치입니다 (2020~2025).
      </p>
    </div>
  );
};

export default InsightChristian;
