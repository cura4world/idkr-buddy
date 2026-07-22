// src/pages/InsightOverview.tsx
// 인도네시아 개관 — 고정 콘텐츠 (2025~2026 기준 최신 수치)

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Globe, ChevronDown, ChevronUp } from "lucide-react";

interface Row {
  label: string;
  value: string;
}

const BASIC: Row[] = [
  { label: "공식 국명", value: "인도네시아 공화국 (Republik Indonesia)" },
  { label: "수도", value: "자카르타 (신수도 누산타라로 이전 진행 중)" },
  { label: "인구", value: "약 2억 8,700만 명 (2026) · 세계 4위" },
  { label: "면적", value: "약 191만 km² · 세계 14위 (한국의 약 19배)" },
  { label: "섬", value: "약 17,000여 개 (세계 최대 도서 국가)" },
  { label: "공용어", value: "인도네시아어 (Bahasa Indonesia) · 지역어 700개 이상" },
  { label: "민족", value: "자바족 약 40% 등 300개 이상 민족" },
  { label: "시간대", value: "3개 (서부 WIB · 중부 WITA · 동부 WIT) · 자카르타는 한국보다 2시간 느림" },
  { label: "통화", value: "루피아 (IDR, Rp)" },
  { label: "정치 체제", value: "대통령 중심제 공화국 · 대통령 프라보워 수비안토 (2024년 10월 취임)" },
  { label: "국가 이념", value: "판차실라 (Pancasila) — 5대 건국 원칙" },
  { label: "국가 표어", value: "Bhinneka Tunggal Ika (다양성 속의 통일)" },
];

const ECONOMY: Row[] = [
  { label: "명목 GDP", value: "약 1조 5,400억 달러 (2026) · 세계 17위" },
  { label: "GDP (PPP)", value: "약 5조 4,500억 달러 · 세계 7위" },
  { label: "1인당 GDP", value: "약 5,300달러 (명목) · 약 19,000달러 (PPP)" },
  { label: "경제 성장률", value: "5.1% (2025) — 꾸준한 5%대 성장" },
  { label: "물가 상승률", value: "약 2.4% (2026년 상반기)" },
  { label: "산업 구조", value: "서비스업 45% · 제조업 등 산업 41% · 농업 14%" },
  { label: "주요 자원", value: "니켈(세계 1위) · 팜유(세계 1위) · 석탄 · 천연가스 · 주석" },
  { label: "국제 협력", value: "G20 · ASEAN 최대 경제국 · BRICS 가입 (2025)" },
];

const SOCIETY: Row[] = [
  { label: "종교", value: "이슬람 약 87% (세계 최대 무슬림 인구국) · 기독교 10.5% · 힌두교 1.7% 등" },
  { label: "중위 연령", value: "약 30세 — 젊은 인구 구조" },
  { label: "도시화율", value: "약 58% (계속 상승 중)" },
  { label: "인간개발지수", value: "0.728 (높음 그룹, 2023)" },
  { label: "빈곤율", value: "약 8.3% (국가 빈곤선 기준, 2025)" },
  { label: "최대 도시", value: "자카르타 (수도권 인구 3,000만 이상, 세계 최대급 대도시권)" },
];

const KOREA: Row[] = [
  { label: "외교 관계", value: "1973년 수교 · 특별 전략적 동반자 관계 (2017~)" },
  { label: "경제 협력", value: "한국의 주요 투자처 (제조업·자동차·배터리·인프라)" },
  { label: "인적 교류", value: "한국 체류 인도네시아인 · 인도네시아 내 한인 커뮤니티 활발" },
  { label: "문화", value: "한류(K-pop·드라마·음식) 인기가 매우 높은 나라 중 하나" },
];

interface Sila {
  no: number;
  id: string;   // 인니어 원문
  ko: string;   // 한국어 번역
  desc: string; // 뜻풀이
}

const PANCASILA: Sila[] = [
  {
    no: 1,
    id: "Ketuhanan Yang Maha Esa",
    ko: "유일하신 신에 대한 믿음",
    desc: "모든 국민은 신을 믿는다는 전제. 특정 종교를 국교로 삼지 않되, 무신론은 인정하지 않습니다. 이 원칙 때문에 인도네시아는 이슬람 국가도, 세속 국가도 아닌 '유신론 국가'가 됩니다.",
  },
  {
    no: 2,
    id: "Kemanusiaan yang Adil dan Beradab",
    ko: "공정하고 문명된 인류애",
    desc: "인간의 존엄과 인권을 존중하고, 서로를 공정하고 예의 있게 대한다는 원칙입니다.",
  },
  {
    no: 3,
    id: "Persatuan Indonesia",
    ko: "인도네시아의 통일",
    desc: "수천 개의 섬과 300여 종족을 하나의 국가로 묶는 통합의 원칙. 표어 '다양성 속의 통일'과 짝을 이룹니다.",
  },
  {
    no: 4,
    id: "Kerakyatan yang Dipimpin oleh Hikmat Kebijaksanaan dalam Permusyawaratan/Perwakilan",
    ko: "합의와 대의를 통한 지혜로운 민주주의",
    desc: "폭력이 아니라 '무샤와라(협의)'와 합의로 문제를 풀어가는 민주주의 원칙입니다.",
  },
  {
    no: 5,
    id: "Keadilan Sosial bagi Seluruh Rakyat Indonesia",
    ko: "전 국민을 위한 사회 정의",
    desc: "종족·종교·계층을 가리지 않고 모든 국민이 공정한 대우와 복지를 누리게 한다는 원칙입니다.",
  },
];

const Section = ({ title, rows, defaultOpen }: { title: string; rows: Row[]; defaultOpen?: boolean }) => {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <section className="bg-card rounded-2xl border border-sky-300/60 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center gap-2 text-left bg-sky-400/10"
      >
        <span className="flex-1 text-sm font-semibold text-sky-800">{title}</span>
        {open ? (
          <ChevronUp size={16} className="text-sky-600 shrink-0" />
        ) : (
          <ChevronDown size={16} className="text-sky-600 shrink-0" />
        )}
      </button>
      {open && (
        <dl className="divide-y divide-gray-100 border-t border-sky-300/40">
          {rows.map((r) => (
            <div key={r.label} className="px-4 py-2.5 flex gap-3">
              <dt className="w-24 shrink-0 text-xs font-gothic font-semibold text-gray-400 pt-0.5">{r.label}</dt>
              <dd className="flex-1 text-sm font-gothic text-gray-800 leading-relaxed">{r.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
};

const PancasilaSection = ({ defaultOpen }: { defaultOpen?: boolean }) => {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <section className="bg-card rounded-2xl border border-sky-300/60 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center gap-2 text-left bg-sky-400/10"
      >
        <span className="flex-1 text-sm font-semibold text-sky-800">건국 이념 · 판차실라(Pancasila)</span>
        {open ? (
          <ChevronUp size={16} className="text-sky-600 shrink-0" />
        ) : (
          <ChevronDown size={16} className="text-sky-600 shrink-0" />
        )}
      </button>
      {open && (
        <div className="border-t border-sky-300/40">
          <p className="px-4 pt-3 pb-1 text-[13px] font-gothic text-gray-600 leading-relaxed">
            산스크리트어로 &lsquo;판차(pañca, 다섯)&rsquo; + &lsquo;실라(śīla, 원칙)&rsquo;.
            초대 대통령 수카르노가 1945년 제시한 다섯 가지 건국 원칙으로, 헌법 전문에 담겨
            있습니다. 이슬람 국가와 세속 국가 사이의 &lsquo;타협&rsquo;으로 탄생했습니다.
          </p>
          <div className="divide-y divide-gray-100">
            {PANCASILA.map((s) => (
              <div key={s.no} className="px-4 py-3 flex gap-3">
                <span className="w-7 h-7 shrink-0 rounded-full bg-sky-500 text-white text-sm font-bold flex items-center justify-center">
                  {s.no}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 leading-snug">{s.ko}</p>
                  <p className="mt-0.5 text-xs font-word italic text-sky-700 leading-snug break-words">{s.id}</p>
                  <p className="mt-1 text-[13px] font-gothic text-gray-600 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

const InsightOverview = () => {
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
          <span className="w-9 h-9 rounded-xl bg-sky-400 flex items-center justify-center shadow-lg shadow-black/30">
            <Globe size={18} className="text-white" />
          </span>
          <h1 className="text-xl font-semibold text-white leading-none">인도네시아 개관</h1>
        </div>
      </header>

      <p className="mb-4 text-[13px] font-gothic text-white/60 leading-relaxed px-1">
        적도에 걸친 세계 최대의 섬나라. 인구 세계 4위, 동남아시아 최대 경제국이자
        세계에서 무슬림이 가장 많이 사는 나라입니다.
      </p>

      <div className="space-y-3">
        <Section title="기본 정보" rows={BASIC} defaultOpen />
        <Section title="경제" rows={ECONOMY} />
        <Section title="사회" rows={SOCIETY} />
        <Section title="한국과 인도네시아" rows={KOREA} />
        <PancasilaSection />
      </div>

      <p className="mt-4 text-[11px] font-gothic text-white/35 px-1">
        ※ 수치는 2025~2026년 IMF·세계은행·인도네시아 통계청 자료 기준입니다.
      </p>
    </div>
  );
};

export default InsightOverview;
