// src/pages/InsightEthnic.tsx
// 인도네시아 종족 — 고정 콘텐츠 (300개 이상 종족, 주요 종족의 분포와 특징)
// 비율은 2010년 인구센서스(BPS) 기준이며, 인도네시아 종족 통계에서 가장 널리 인용되는 수치입니다.

import { useState, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Users, ChevronDown, ChevronUp } from "lucide-react";

interface Ethnic {
  name: string;      // 한국어 이름
  id: string;        // 인니어 이름
  pct: string;       // 인구 비율
  bar: number;       // 0~100 막대 길이
  color: string;     // 막대 색
  region: string;    // 주요 거주지
  desc: string[];    // 설명 문단
}

// 접이식 섹션 (teal 테마)
const Fold = ({ title, defaultOpen, children }: { title: string; defaultOpen?: boolean; children: ReactNode }) => {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <section className="bg-card rounded-2xl border border-teal-300/60 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center gap-2 text-left bg-teal-400/10"
      >
        <span className="flex-1 text-sm font-semibold text-teal-800">{title}</span>
        {open ? (
          <ChevronUp size={16} className="text-teal-600 shrink-0" />
        ) : (
          <ChevronDown size={16} className="text-teal-600 shrink-0" />
        )}
      </button>
      {open && <div className="px-4 py-3.5 border-t border-teal-300/40">{children}</div>}
    </section>
  );
};

const ETHNICS: Ethnic[] = [
  {
    name: "자바족",
    id: "Suku Jawa",
    pct: "약 40.1%",
    bar: 40,
    color: "bg-teal-600",
    region: "중부·동부 자바",
    desc: [
      "약 1억 명에 달하는 인도네시아 최대 종족이자, 정치·문화의 중심 세력입니다. 역대 대통령 다수가 자바 출신일 만큼 국가 운영에서 영향력이 큽니다.",
      "예의와 조화, 감정 절제를 중시하는 '할루스(halus, 세련됨)' 문화가 특징입니다. 대부분 무슬림이지만, 힌두·불교·토착 신앙이 녹아든 '자바 이슬람(kejawen)' 전통이 깊게 남아 있습니다.",
      "와양(그림자 인형극), 바틱, 가믈란 음악 등 인도네시아를 대표하는 문화 유산의 본고장입니다.",
    ],
  },
  {
    name: "순다족",
    id: "Suku Sunda",
    pct: "약 15.5%",
    bar: 15,
    color: "bg-emerald-500",
    region: "서부 자바 (반둥 일대)",
    desc: [
      "약 4천만 명으로 두 번째로 큰 종족입니다. 서부 자바의 고원 지대에 살며, 반둥이 문화 중심지입니다.",
      "거의 전부가 독실한 수니 무슬림입니다. 밝고 개방적인 기질과 신선한 채소 쌈(lalapan) 중심의 순다 요리로 잘 알려져 있습니다.",
    ],
  },
  {
    name: "말레이족",
    id: "Suku Melayu",
    pct: "약 3.7%",
    bar: 4,
    color: "bg-sky-500",
    region: "수마트라 동부 해안·리아우",
    desc: [
      "인도네시아어(바하사 인도네시아)의 뿌리가 된 말레이어를 쓰는 종족입니다. 수마트라 동해안과 리아우 제도에 흩어져 살며, 말레이시아·싱가포르의 말레이인과 같은 뿌리입니다.",
      "이슬람과 항구 무역 문화가 정체성의 핵심입니다.",
    ],
  },
  {
    name: "바탁족",
    id: "Suku Batak",
    pct: "약 3.6%",
    bar: 4,
    color: "bg-rose-500",
    region: "북수마트라 (토바 호수)",
    desc: [
      "인도네시아에서 기독교(개신교) 비율이 매우 높은 대표적 종족입니다. 19세기 독일 선교사들의 선교로 다수가 개신교(HKBP 등)를 받아들였습니다.",
      "마르가(marga)라는 부계 씨족 제도가 강하고, 교육열이 높아 의사·변호사·교사 등 전문직 진출이 많습니다. 직설적이고 강인한 기질로 알려져 있습니다.",
      "토바·카로·만다일링·시말룽운 등 여러 하위 집단으로 나뉩니다.",
    ],
  },
  {
    name: "마두라족",
    id: "Suku Madura",
    pct: "약 3.0%",
    bar: 3,
    color: "bg-amber-500",
    region: "마두라섬·동부 자바",
    desc: [
      "자바 북동쪽 마두라섬과 동부 자바에 사는 독실한 무슬림 종족입니다. 근면하고 자존심이 강하며, 전국으로 이주해 상업에 종사하는 경우가 많습니다.",
      "소 경주 '카라판 사피(karapan sapi)'로 유명합니다.",
    ],
  },
  {
    name: "브타위족",
    id: "Suku Betawi",
    pct: "약 2.9%",
    bar: 3,
    color: "bg-orange-500",
    region: "자카르타",
    desc: [
      "수도 자카르타의 원주민입니다. 식민지 시대 바타비아(옛 자카르타)에서 말레이·자바·순다·아랍·중국·인도계가 섞여 형성된 혼합 종족입니다.",
      "코미디 연극 '른뽕(lenong)'과 오르나멘탈 인형 '온델온델(ondel-ondel)'이 상징입니다.",
    ],
  },
  {
    name: "미낭카바우족",
    id: "Suku Minangkabau",
    pct: "약 2.7%",
    bar: 3,
    color: "bg-fuchsia-500",
    region: "서수마트라 (파당)",
    desc: [
      "세계 최대의 모계 사회로 유명합니다. 재산과 가문의 이름이 어머니에서 딸로 이어지며, 이슬람과 모계 전통이 공존합니다.",
      "고향을 떠나 타지에서 성공하는 '머란타우(merantau)' 문화가 강합니다. 전국 어디서나 볼 수 있는 '나시 파당(rumah makan Padang)' 식당이 이들의 요리입니다.",
    ],
  },
  {
    name: "부기스족",
    id: "Suku Bugis",
    pct: "약 2.7%",
    bar: 3,
    color: "bg-indigo-500",
    region: "남술라웨시 (마카사르)",
    desc: [
      "동남아 최고의 항해·조선 민족으로 이름난 무슬림 종족입니다. '피니시(pinisi)'라는 전통 목조 범선을 만들어 군도 전역을 누볐습니다.",
      "상업 수완이 뛰어나 인도네시아 동부 곳곳에 진출해 있습니다.",
    ],
  },
  {
    name: "발리족",
    id: "Suku Bali",
    pct: "약 1.7%",
    bar: 2,
    color: "bg-violet-500",
    region: "발리섬",
    desc: [
      "인도네시아에서 거의 유일하게 힌두교를 지켜온 종족입니다. 이슬람 확산기에 자바의 힌두 왕국 마자파힛 후예들이 발리로 이주하며 형성되었습니다.",
      "사원 의례, 무용, 회화 등 예술과 종교가 일상에 깊이 배어 있어 세계적인 문화 관광지가 되었습니다.",
    ],
  },
  {
    name: "다약족",
    id: "Suku Dayak",
    pct: "약 1.4%",
    bar: 2,
    color: "bg-lime-600",
    region: "칼리만탄 (보르네오 내륙)",
    desc: [
      "보르네오섬 내륙의 원주민 통칭입니다. 수백 개 하위 부족으로 나뉘며, 강가의 긴 공동주택 '루마 판장(rumah panjang)'에서 살아온 전통이 있습니다.",
      "토착 신앙(카하링안), 기독교, 이슬람 등 다양한 종교를 가집니다.",
    ],
  },
  {
    name: "미나하사족",
    id: "Suku Minahasa",
    pct: "약 0.5%",
    bar: 1,
    color: "bg-red-500",
    region: "북술라웨시 (마나도)",
    desc: [
      "북술라웨시의 대표적 기독교 종족입니다. 네덜란드 시기 일찍 개신교를 받아들여 교육 수준이 높고, 인도네시아에서 손꼽히는 기독교 밀집 지역을 이룹니다.",
    ],
  },
  {
    name: "파푸아 종족들",
    id: "Suku-suku Papua",
    pct: "약 1.5%",
    bar: 2,
    color: "bg-stone-500",
    region: "파푸아 (뉴기니섬 서부)",
    desc: [
      "멜라네시아계 원주민으로, 다른 인도네시아 종족과 인종·문화가 뚜렷이 다릅니다. 다니족·아스맛족 등 250개 이상의 부족과 언어로 나뉩니다.",
      "다수가 기독교(개신교·가톨릭)를 믿으며, 목각 예술과 고산지대 농경 문화가 유명합니다.",
    ],
  },
];

const InsightEthnic = () => {
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
          <span className="w-9 h-9 rounded-xl bg-teal-500 flex items-center justify-center shadow-lg shadow-black/30">
            <Users size={18} className="text-white" />
          </span>
          <h1 className="text-xl font-semibold text-white leading-none">인도네시아 종족</h1>
        </div>
      </header>

      <p className="mb-4 text-[13px] font-gothic text-white/60 leading-relaxed px-1">
        인도네시아에는 300개가 넘는 종족과 700개 이상의 언어가 있습니다. 그럼에도
        &ldquo;다양성 속의 통일(Bhinneka Tunggal Ika)&rdquo;이라는 표어 아래 하나의 나라를 이룹니다.
      </p>

      <div className="space-y-2">
        <Fold title="다양성 속의 통일">
          <p className="text-sm font-gothic text-gray-700 leading-relaxed">
            인도네시아는 세계에서 가장 다민족적인 나라 중 하나입니다. 자바섬에 인구 절반 이상이
            몰려 있어 자바족·순다족이 전체의 과반을 차지하지만, 섬마다 고유한 언어·관습(adat)·
            신앙을 가진 종족들이 살아갑니다. 대부분의 종족은 특정 지역에 모여 살며, 도시와 이주
            지역에서 서로 섞입니다.
          </p>
        </Fold>

        <Fold title="주요 종족" defaultOpen>
          <div className="-mx-4 -my-3.5 divide-y divide-gray-100">
            {ETHNICS.map((e) => (
              <div key={e.name} className="px-4 py-3.5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[15px] font-semibold text-gray-900">{e.name}</span>
                  <span className="text-xs font-word italic text-gray-400">{e.id}</span>
                  <span className="text-xs font-gothic font-semibold text-gray-500 ml-auto">{e.pct}</span>
                </div>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div className={`h-full rounded-full ${e.color}`} style={{ width: e.bar + "%" }} />
                  </div>
                </div>
                <p className="text-[11px] font-gothic font-semibold text-teal-700 mb-1">
                  📍 {e.region}
                </p>
                {e.desc.map((d, i) => (
                  <p key={i} className="text-[13px] font-gothic text-gray-600 leading-relaxed mt-1">
                    {d}
                  </p>
                ))}
              </div>
            ))}
          </div>
        </Fold>

        <Fold title="종족과 종교, 지역의 관계">
          <p className="text-sm font-gothic text-gray-700 leading-relaxed">
            종족·종교·지역은 서로 긴밀히 얽혀 있습니다. 서부(자바·순다·말레이·미낭카바우)는
            무슬림이 절대다수이고, 북수마트라의 바탁족, 북술라웨시의 미나하사족, 파푸아 종족들은
            기독교가 강합니다. 발리족은 힌두교를 지켜왔습니다. 그래서 &ldquo;어느 종족인가&rdquo;를
            알면 그 사람의 고향과 신앙 배경까지 짐작할 수 있는 경우가 많습니다.
          </p>
        </Fold>
      </div>

      <p className="mt-4 text-[11px] font-gothic text-white/35 px-1">
        ※ 비율은 2010년 인도네시아 통계청(BPS) 인구센서스 기준이며, 종족 통계에서 가장 널리
        인용되는 수치입니다.
      </p>
    </div>
  );
};

export default InsightEthnic;
