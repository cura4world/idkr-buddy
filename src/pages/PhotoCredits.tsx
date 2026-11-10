// src/pages/PhotoCredits.tsx
// 사진 출처 (/about/photos) — 설정 > 앱 정보에서 들어옵니다 (S55).
// 지도 시트에는 출처 문구를 두지 않고, 여기 사진마다 작가·라이선스·원본 링크를 모아 둡니다.
// CC BY · CC BY-SA 는 사진마다 저작자 표시가 필요합니다. 목록은 src/lib/mapPhotos.ts(고정 목록) 하나입니다.
//
// 설정 화면에서 쓰는 진입 행: export const PhotoCreditsLink

import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight, Image as ImageIcon } from "lucide-react";
import { goBackOr } from "@/lib/nav";
import { MAP_CITIES, MAP_CULTURE, MAP_FAITH, MAP_SPOTS } from "@/lib/mapData";
import { MAP_PHOTOS, MAP_REGION_LABEL, MAP_REGION_ORDER, MapPhoto, MapRegion, getPlacePhotos } from "@/lib/mapPhotos";

export const PHOTO_CREDITS_PATH = "/about/photos";

/** 설정(앱 정보) 목록에 넣는 한 줄. 누르면 사진 출처 화면으로 갑니다. */
export const PhotoCreditsLink = ({ className }: { className?: string }) => {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(PHOTO_CREDITS_PATH)}
      className={
        "w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-muted/60 transition-colors " + (className || "")
      }
    >
      <ImageIcon size={20} strokeWidth={1.7} className="text-muted-foreground shrink-0" />
      <span className="flex-1 min-w-0">
        <span className="block font-gothic text-[0.9375rem] leading-tight text-foreground">사진 출처</span>
        <span className="block mt-0.5 font-word text-[0.75rem] text-muted-foreground">Sumber foto</span>
      </span>
      <ChevronRight size={16} className="shrink-0 text-muted-foreground/50" />
    </button>
  );
};

interface Group {
  region: MapRegion;
  places: { id: string; ko: string; photos: MapPhoto[] }[];
}

function buildGroups(): Group[] {
  const ko: Record<string, string> = {};
  [MAP_CITIES, MAP_SPOTS, MAP_FAITH, MAP_CULTURE].forEach((list) =>
    list.forEach((p) => {
      ko[p.id] = p.ko;
    })
  );
  return MAP_REGION_ORDER.map((region) => ({
    region,
    places: Object.keys(MAP_PHOTOS)
      // 지도 시트에 실제로 보이는 사진만 출처에 적습니다(기록 사진 제외, 지점마다 최대 2장).
      .filter((id) => MAP_PHOTOS[id].region === region && getPlacePhotos(id).length > 0)
      .map((id) => ({ id, ko: ko[id] || id, photos: getPlacePhotos(id) }))
      .sort((a, b) => a.ko.localeCompare(b.ko, "ko")),
  })).filter((g) => g.places.length > 0);
}

const SECTION = "mb-2 px-1 font-gothic text-[0.875rem] font-bold tracking-[0.02em] text-[#3B4245]";
const CARD = "bg-card rounded-[18px] overflow-hidden";
const CARD_STYLE = { boxShadow: "0 1px 3px rgba(16,40,50,0.06)" };

const PhotoCredits = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const groups = buildGroups();
  const total = groups.reduce((n, g) => n + g.places.reduce((m, p) => m + p.photos.length, 0), 0);

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto pb-9">
      <header className="sticky top-0 z-30 bg-background text-foreground border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => goBackOr(navigate, location.key, "/")}
          className="text-foreground hover:text-foreground/70 w-9 h-9 flex items-center justify-center -ml-1 shrink-0"
          title="뒤로"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="flex-1 min-w-0 truncate font-gothic text-base font-semibold uppercase tracking-[0.08em]">SUMBER FOTO</h1>
      </header>

      <div className="px-4 pt-4 flex flex-col gap-[18px]">
        <div className={CARD + " px-4 py-3.5"} style={CARD_STYLE}>
          <p className="font-gothic text-[0.875rem] leading-[1.65] text-[#33393C] break-keep">
            지도에 나오는 사진은 위키미디어 공용(Wikimedia Commons)에 자유 라이선스로 공개된 사진입니다.
            사진마다 작가와 라이선스를 적고, 원본 페이지로 이어 둡니다.
          </p>
          {total > 0 ? (
            <p className="mt-1.5 font-gothic text-[0.75rem] text-muted-foreground">사진 {total}장</p>
          ) : null}
        </div>

        {groups.length === 0 ? (
          <div className={CARD + " px-4 py-6 text-center"} style={CARD_STYLE}>
            <p className="font-gothic text-[0.875rem] leading-relaxed text-muted-foreground break-keep">
              사진 목록을 준비하고 있습니다.
              <br />
              목록이 정해지기 전까지 지도에는 사진이 나오지 않습니다.
            </p>
          </div>
        ) : (
          groups.map((g) => (
            <section key={g.region}>
              <p className={SECTION}>
                {MAP_REGION_LABEL[g.region].ko}
                <span className="ml-1.5 font-word font-normal text-[0.75rem] text-muted-foreground">
                  {MAP_REGION_LABEL[g.region].id}
                </span>
              </p>
              <div className={CARD} style={CARD_STYLE}>
                {g.places.map((p, i) => (
                  <div
                    key={p.id}
                    className={"px-4 py-3 " + (i < g.places.length - 1 ? "border-b border-[#EEF1F3]" : "")}
                  >
                    <p className="flex items-baseline gap-1.5 min-w-0">
                      <span className="font-gothic text-[0.9375rem] font-semibold text-foreground">{p.ko}</span>
                      <span className="font-word text-[0.75rem] text-muted-foreground truncate">{p.id}</span>
                    </p>
                    {p.photos.map((ph, k) => (
                      <p key={ph.file} className="mt-1 font-gothic text-[0.78125rem] leading-[1.55] text-[#4A5257] break-all">
                        <span className="text-muted-foreground">사진 {k + 1} · </span>
                        {ph.author}
                        {" · "}
                        {ph.licenseUrl ? (
                          <a href={ph.licenseUrl} className="underline underline-offset-2">
                            {ph.license}
                          </a>
                        ) : (
                          ph.license
                        )}
                        {" · "}
                        <a href={ph.page} className="text-[#2C6D63] underline underline-offset-2">
                          원본
                        </a>
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
};

export default PhotoCredits;
