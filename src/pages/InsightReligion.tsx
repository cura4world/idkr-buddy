// src/pages/InsightReligion.tsx
// 인도네시아 종교 — 고정 콘텐츠 (6개 공인 종교의 분포와 특징)

import { useState, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Landmark, ChevronDown, ChevronUp } from "lucide-react";

interface Religion {
  name: string;
  pct: string;
  bar: number; // 0~100 막대 길이
  color: string;
  desc: string[];
}

// 접이식 섹션
const Fold = ({ title, defaultOpen, children }: { title: string; defaultOpen?: boolean; children: ReactNode }) => {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <section className="bg-card rounded-2xl border border-violet-300/60 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center gap-2 text-left bg-violet-400/10"
      >
        <span className="flex-1 text-sm font-semibold text-violet-800">{title}</span>
        {open ? (
          <ChevronUp size={16} className="text-violet-600 shrink-0" />
        ) : (
          <ChevronDown size={16} className="text-violet-600 shrink-0" />
        )}
      </button>
      {open && <div className="px-4 py-3.5 border-t border-violet-300/40">{children}</div>}
    </section>
  );
};

const RELIGIONS: Religion[] = [
  {
    name: "이슬람",
    pct: "약 87.1%",
    bar: 87,
    color: "bg-emerald-500",
    desc: [
      "약 2억 4천만 명으로 단일 국가 기준 세계 최대의 무슬림 인구입니다. 대부분 수니파이며, 자바·수마트라 등 서부 지역에 집중되어 있습니다.",
      "13~16세기 아랍·인도 상인들의 무역로를 따라 해안에서부터 평화적으로 확산되었습니다. 그래서 중동과 달리 토착 문화와 융합된 온건한 이슬람 전통이 강합니다.",
      "세계 최대 이슬람 조직인 NU(나흐다툴 울라마, 약 9천만)와 무함마디야(약 6천만)가 학교·병원·대학을 운영하며 온건 노선을 이끕니다.",
    ],
  },
  {
    name: "개신교",
    pct: "약 7.4%",
    bar: 7,
    color: "bg-sky-500",
    desc: [
      "약 2,080만 명. 네덜란드 식민 시기와 19세기 유럽 선교의 유산으로, 파푸아·북술라웨시·북수마트라(바탁)·말루쿠 등 동부와 내륙에 집중되어 있습니다.",
      "자세한 내용은 '인도네시아 기독교' 페이지에서 다룹니다.",
    ],
  },
  {
    name: "가톨릭",
    pct: "약 3.1%",
    bar: 3,
    color: "bg-indigo-500",
    desc: [
      "약 860만 명. 16세기 포르투갈 선교로 시작된 인도네시아에서 가장 오래된 기독교 전통입니다.",
      "동누사틍가라(NTT·플로레스)는 주민의 90% 이상이 가톨릭인 '가톨릭의 땅'입니다.",
    ],
  },
  {
    name: "힌두교",
    pct: "약 1.7%",
    bar: 2,
    color: "bg-orange-500",
    desc: [
      "약 470만 명, 대부분 발리에 삽니다. 발리는 주민의 약 87%가 힌두교도로, 이슬람 확산 시기 자바의 힌두 왕국 마자파힛의 후예들이 발리로 이주하며 형성되었습니다.",
      "인도 힌두교와 달리 조상 숭배·토착 신앙이 융합된 '발리 힌두'라는 독자적 형태입니다. 침묵의 날 '녀피(Nyepi)'에는 섬 전체가 하루 동안 멈춥니다.",
    ],
  },
  {
    name: "불교",
    pct: "약 0.7%",
    bar: 1,
    color: "bg-amber-500",
    desc: [
      "약 200만 명, 주로 화교 공동체입니다. 고대에는 스리위자야·샤일렌드라 왕조가 불교를 꽃피웠고, 세계 최대 불교 유적 보로부두르가 그 유산입니다.",
    ],
  },
  {
    name: "유교",
    pct: "약 0.05%",
    bar: 1,
    color: "bg-rose-400",
    desc: [
      "화교 소수가 신봉합니다. 수하르토 시대에 공인 지위를 잃었다가 2000년 압두라만 와힛 대통령 때 회복되었습니다. 설날(Imlek)도 이때 국경일이 되었습니다.",
    ],
  },
];

const InsightReligion = () => {
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
          <span className="w-9 h-9 rounded-xl bg-violet-500 flex items-center justify-center shadow-lg shadow-black/30">
            <Landmark size={18} className="text-white" />
          </span>
          <h1 className="text-xl font-semibold text-white leading-none">인도네시아 종교</h1>
        </div>
      </header>

      <div className="space-y-2">
      <Fold title="종교 국가도, 세속 국가도 아닌 나라">
        <p className="text-sm font-gothic text-gray-700 leading-relaxed">
          인도네시아는 이슬람 국가가 아닙니다. 건국 이념 판차실라의 첫 번째 원칙이
          &ldquo;유일신에 대한 믿음&rdquo;이어서, 특정 종교를 국교로 삼지 않되 모든 국민이
          종교를 가질 것을 전제합니다. 주민등록증(KTP)에는 종교가 표기되며,
          정부가 공인한 종교는 이슬람·개신교·가톨릭·힌두교·불교·유교 6개입니다.
        </p>
      </Fold>

      <Fold title="6개 공인 종교" defaultOpen>
        <div className="-mx-4 -my-3.5 divide-y divide-gray-100">
          {RELIGIONS.map((r) => (
            <div key={r.name} className="px-4 py-3.5">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[15px] font-semibold text-gray-900">{r.name}</span>
                <span className="text-xs font-gothic font-semibold text-gray-500">{r.pct}</span>
                <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden ml-1">
                  <div className={`h-full rounded-full ${r.color}`} style={{ width: r.bar + "%" }} />
                </div>
              </div>
              {r.desc.map((d, i) => (
                <p key={i} className="text-[13px] font-gothic text-gray-600 leading-relaxed mt-1">
                  {d}
                </p>
              ))}
            </div>
          ))}
        </div>
      </Fold>

      <Fold title="서쪽에서 동쪽으로 — 종교의 지도">
        <p className="text-sm font-gothic text-gray-700 leading-relaxed">
          이슬람은 무역로를 따라 서쪽 해안에서 동쪽으로 퍼졌습니다. 그래서 서부(수마트라·자바)는
          이슬람이 압도적이고, 동쪽으로 갈수록 기독교 비율이 높아집니다. 발리(힌두)를 지나
          동누사틍가라·말루쿠·파푸아에 이르면 기독교가 다수가 됩니다. 아체는 유일하게
          샤리아(이슬람법)가 시행되는 특별 자치주입니다.
        </p>
      </Fold>

      <Fold title="공존과 긴장">
        <p className="text-sm font-gothic text-gray-700 leading-relaxed">
          6개 종교의 명절이 모두 국경일입니다 — 이슬람의 르바란, 기독교의 성탄절과 부활절,
          힌두교의 녀피, 불교의 와이삭, 유교의 설날까지. 이웃 종교의 명절을 서로 축하하는
          문화가 뿌리내려 있습니다. 다만 신성모독법, 일부 지역의 교회 설립 제한, 소수 종파에 대한
          차별 등 긴장 요소도 함께 존재합니다.
        </p>
      </Fold>
      </div>

      <p className="mt-4 text-[11px] font-gothic text-white/35 px-1">
        ※ 비율은 2023~2024년 인도네시아 종교부 통계 기준입니다.
      </p>
    </div>
  );
};

export default InsightReligion;
