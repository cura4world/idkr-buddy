// scripts/build-map-photos.mjs
// 지도 사진 고정 목록(src/lib/mapPhotos.ts)을 만듭니다. 인터넷이 되는 PC에서 돌립니다.
//
//   node scripts/build-map-photos.mjs            → mapPhotos.ts 다시 쓰기 + map-photos-review.html
//   node scripts/build-map-photos.mjs --dry      → 파일은 쓰지 않고 결과만 출력
//
// 하는 일
// 확인용 HTML 은 운영체제 임시 폴더에 만듭니다(저장소 밖).
//
//   1. src/lib/mapData.ts 의 핀 전부와 mapContent 의 위키 문서 제목·지역을 읽습니다.
//   2. 지점마다 영문 위키피디아 문서의 자유 라이선스 대표 사진 + 본문 사진,
//      모자라면 위키미디어 공용 검색 결과에서 후보를 모읍니다.
//   3. 공용(Commons)에서 작가·라이선스·썸네일(폭 640)을 받아, 자유 라이선스만 남깁니다.
//   4. 한 사진은 한 지점에만 씁니다. 구체적인 지점(관광지·종교·문화)을 먼저 채우고 도시는 나중에 채웁니다
//      (보로부두르 사진이 마글랑으로 가지 않게).
//   5. mapPhotos.ts 의 @generated 구간을 다시 쓰고, 눈으로 확인할 HTML 을 만듭니다.
//
// 사람이 고칠 곳: 아래 PICK(지점마다 직접 고른 파일 이름), SKIP(쓰지 않을 파일 이름), NONE(사진을 두지 않을 지점).
// 저장소 규칙: 정규식 리터럴 대신 new RegExp, 모든 fetch 에 AbortController 마감.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(new RegExp("^/([A-Za-z]:)"), "$1")), "..");
const DRY = process.argv.includes("--dry");
const UA = "KatakataMapPhotos/1.0 (offline build script)";
const TIMEOUT_MS = 20000;
const THUMB_W = 640;

// 지점 → 직접 고른 Commons 파일 이름 (앞에 "File:" 없이). 자동 결과보다 먼저 씁니다.
const PICK = {
  // "Borobudur": ["Borobudur-Nothwest-view.jpg"],
  // 2026-11-14 출시 전 점검 K-02: 자동 선택이 페로 제도의 숨바 마을 사진(Faroe.sumba.3.jpg)을 골라 직접 고름.
  "Pulau Sumba": ["Kampung Adat Ratenggaro - Sumba.jpg"],
};
// 어디에도 쓰지 않을 파일 이름
// 2026-11-11 첫 실행 확인: 도시(마나도) 대표 사진으로 교회 건물 두 장이 들어와 공개판에 맞지 않아 뺍니다.
const SKIP = new Set([
  "Cathedral Church Manado - panoramio.jpg",
  "Gereja Pantekosta di Indonesia (GPdI) Manado - panoramio.jpg",
  // 2026-11-14 K-02: 인도네시아 숨바 섬이 아니라 페로 제도(Faroe)의 숨바 마을
  "Faroe.sumba.3.jpg",
  // 2026-11-14 K-01: CC BY 인데 저작자 불명(식민지 시대 군수 초상) — 저작자를 표시할 수 없어 쓰지 않음
  "Bupati Probolinggo Raden Toemenggoeng Djojonegoro.jpg",
]);

// 원본 페이지의 저작자 칸이 비었거나 주소뿐인 사진의 저작자 (2026-11-14 K-01 — 원본 설명 글과 Flickr 계정 이름에서 확인).
// 자동으로 읽은 값 대신 이 이름을 씁니다.
const AUTHOR_FIX = {
  "Jesus Statue Maumere.jpg": "Snpoj (영어 위키백과)",
  "Tour de Singkarak 2013 (2).jpg": "Ikhvan (Flickr)",
  "Padang Panjang Train - Sawahlunto.jpg": "Mighty Bowo (Flickr)",
};
// 저작자 표시가 조건인 라이선스(CC BY·CC BY-SA)인데 저작자를 알 수 없는 사진은 고르지 않습니다.
const NEEDS_AUTHOR = new RegExp("^CC BY", "i");
const NO_AUTHOR = new RegExp("^\\s*$|unknown author|^https?://", "i");
function attributable(i) {
  return !(NEEDS_AUTHOR.test(i.license || "") && NO_AUTHOR.test(i.author || ""));
}
// 사진을 두지 않을 지점 (그 지점을 잘 보여 주는 자유 사진이 없을 때)
const NONE = new Set([]);

// 핀 id 를 그대로 쓰면 엉뚱한 문서에 걸리는 곳 (예전 src/lib/map.ts 의 표). mapContent 의 wiki 가 우선입니다.
const WIKI_TITLE = {
  "Yogyakarta": "Yogyakarta",
  "Danau Toba": "Lake Toba",
  "Raja Ampat": "Raja Ampat Islands",
  "Gunung Bromo": "Mount Bromo",
  "Kawah Ijen": "Ijen",
  "Pulau Komodo": "Komodo (island)",
  "Gunung Rinjani": "Mount Rinjani",
  "Tana Toraja": "Tana Toraja Regency",
  "Pulau Belitung": "Belitung",
  "Nusa Penida": "Nusa Penida",
  "Gili Trawangan": "Gili Islands",
  "Dataran Tinggi Dieng": "Dieng Plateau",
  "Tangkuban Perahu": "Tangkuban Perahu",
  "Ujung Kulon": "Ujung Kulon National Park",
  "Kepulauan Mentawai": "Mentawai Islands",
  "Pulau Nias": "Nias",
  "Pulau Weh": "Weh Island",
  "Bukit Lawang": "Bukit Lawang",
  "Gunung Kerinci": "Mount Kerinci",
  "Krakatau": "Krakatoa",
  "Kepulauan Derawan": "Derawan Islands",
  "Tanjung Puting": "Tanjung Puting",
  "Kepulauan Togean": "Togian Islands",
  "Kepulauan Banda": "Banda Islands",
  "Lembah Baliem": "Baliem Valley",
  "Pulau Sumba": "Sumba",
  "Danau Kelimutu": "Kelimutu",
  "Kuta": "Kuta",
  "Ubud": "Ubud",
  "Bunaken": "Bunaken",
  "Wakatobi": "Wakatobi Regency",
  "Nusantara": "Nusantara (planned city)",
  "Surakarta": "Surakarta",
};

// mapContent 파일 → 지역
const FILE_REGION = {
  sumateraUtara: "sumatera",
  sumateraSelatan: "sumatera",
  jawaBarat: "jawa",
  jawaTengahTimur: "jawa",
  baliNusa: "bali-nusa",
  kalimantan: "kalimantan",
  sulawesi: "sulawesi",
  maluku: "maluku",
  papua: "papua",
};

// 공용 이미지(지도·국기·문장·로고 등)와 몽타주는 거릅니다.
const BAD = new RegExp(
  // 2026-11-11 첫 실행에서 우표·은행 건물·학교 단체 사진·교회 건물이 지점 대표 사진으로 들어와 더 거릅니다.
  "logo|icon|map|peta|flag|bendera|seal|emblem|lambang|coat.of.arms|locator|location|banner|symbol|blank|question|disambig|montage|collage|kolase|diagram|chart|graph|svg$" +
    "|stamp|perangko|prangko|banknote|uang kertas|rupiah|bank indonesia|volksschool|school|sekolah|portrait|potret",
  "i"
);
// 2026-11-11 세 번째 실행 확인: 식민지 시대 인물·군인·총독 사진, 회화·판화, 도시 핀의 교회 건물이 섞여 들어와 거릅니다.
// (교회 사진이 필요한 지점은 위 PICK 에 직접 적습니다.)
const BAD2 = new RegExp(
  "gouverneur|europese|koppensnellers|onderworpen|militairen|koning willem|lijfwacht|radja|vorstin|hofdames|secretaris|" +
    "olieverfschildering|prent |schildering|painting|kerk|church|catholic|katolik|protestant|pastorie|christelijke|missiona|piggy bank",
  "i"
);
const ARCHIVE = new RegExp("tropenmuseum|kitlv|wereldculturen", "i");

// 원본(수 MB)이 아니라 폭 500px 썸네일을 씁니다. 위키미디어 표준 썸네일 폭(500)이고, 폰 시트 두 칸에 충분합니다.
// 원본이 500px 보다 작으면 원본을 그대로 씁니다.
function sizedThumb(i) {
  const orig = String(i.thumb || "").split("?")[0];
  const base = "https://upload.wikimedia.org/wikipedia/commons/";
  if (!(i.width > 500) || orig.indexOf(base) !== 0 || orig.indexOf(base + "thumb/") === 0) return orig;
  const rest = orig.slice(base.length); // a/a7/Name.jpg
  const name = rest.slice(rest.lastIndexOf("/") + 1);
  return base + "thumb/" + rest + "/500px-" + name;
}
const PHOTO = new RegExp("\\.(jpe?g)$", "i");
const FREE = new RegExp("^(cc[ -]by|cc0|public domain|pd\\b|pd-)", "i");
const TAG = new RegExp("<[^>]*>", "g");
const WS = new RegExp("\\s+", "g");

function plain(html) {
  return String(html || "").replace(TAG, " ").replace(WS, " ").trim();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// 2026-11-11 두 번째 실행: 위키미디어가 빠른 연속 요청을 막아(429) 중간에 멈췄습니다.
// 요청 사이에 쉬고, 막히면 Retry-After 또는 점점 길게 기다렸다 다시 부릅니다(최대 6번).
const PACE_MS = 400;
let lastCall = 0;
async function getJson(url) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const wait = lastCall + PACE_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastCall = Date.now();
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, { signal: c.signal, headers: { "User-Agent": UA } });
      if (res.status === 429 || res.status >= 500) {
        const ra = Number(res.headers.get("retry-after") || "0");
        await sleep(Math.min(60000, Math.max(ra * 1000, 5000 * Math.pow(2, attempt))));
        continue;
      }
      if (!res.ok) throw new Error("HTTP " + res.status + " " + url);
      return await res.json();
    } catch (e) {
      if (attempt === 5) throw e;
      await sleep(3000 * (attempt + 1));
    } finally {
      clearTimeout(t);
    }
  }
  throw new Error("FAILED " + url);
}

// ── 1. 핀 읽기 ───────────────────────────────────────────────
function readPlaces() {
  const md = fs.readFileSync(path.join(ROOT, "src/lib/mapData.ts"), "utf8");
  const out = [];
  for (const [name, type] of [["MAP_SPOTS", "spot"], ["MAP_FAITH", "faith"], ["MAP_CULTURE", "culture"], ["MAP_CITIES", "city"]]) {
    const m = md.match(new RegExp("export const " + name + ": MapPlace\\[\\] = (\\[[\\s\\S]*?\\]);"));
    if (!m) throw new Error("mapData 에서 " + name + " 을 찾지 못했습니다");
    for (const p of JSON.parse(m[1])) out.push({ ...p, type });
  }
  const wiki = {};
  const region = {};
  const dir = path.join(ROOT, "src/lib/mapContent");
  for (const f of fs.readdirSync(dir)) {
    const base = f.replace(new RegExp("\\.ts$"), "");
    if (!FILE_REGION[base]) continue;
    let cur = null;
    for (const line of fs.readFileSync(path.join(dir, f), "utf8").split("\n")) {
      const k = line.match(new RegExp('^  "([^"]+)": \\{'));
      if (k) {
        cur = k[1];
        region[cur] = FILE_REGION[base];
      }
      const w = line.match(new RegExp('^    wiki: "([^"]+)"'));
      if (w && cur) wiki[cur] = w[1];
    }
  }
  for (const p of out) {
    p.wiki = wiki[p.id] || WIKI_TITLE[p.id] || p.id;
    p.region = region[p.id] || "";
    if (!p.region) console.warn("지역을 모르는 핀:", p.id, "(mapContent 에 원고가 없음)");
  }
  // 구체적인 지점 먼저, 도시는 tier 2 → tier 1 (큰 도시 문서의 대표 사진은 몽타주가 많음)
  const rank = (p) => (p.type === "city" ? (p.tier === 2 ? 1 : 2) : 0);
  return out.sort((a, b) => rank(a) - rank(b));
}

// ── 2. 후보 모으기 ───────────────────────────────────────────
async function wikiCandidates(title) {
  const u =
    "https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1&prop=pageprops%7Cimages&ppprop=page_image_free&imlimit=50&titles=" +
    encodeURIComponent(title);
  const d = await getJson(u);
  const pages = Object.values((d.query && d.query.pages) || {});
  const p = pages[0] || {};
  const list = [];
  const lead = p.pageprops && p.pageprops.page_image_free;
  if (lead) list.push(lead.replace(new RegExp("_", "g"), " "));
  for (const im of p.images || []) {
    const name = String(im.title || "").replace(new RegExp("^File:"), "");
    if (name && !list.includes(name)) list.push(name);
  }
  return list;
}

async function commonsSearch(q) {
  const u =
    "https://commons.wikimedia.org/w/api.php?action=query&format=json&list=search&srnamespace=6&srlimit=10&srsearch=" +
    encodeURIComponent(q + " filetype:bitmap");
  const d = await getJson(u);
  return ((d.query && d.query.search) || []).map((s) => String(s.title).replace(new RegExp("^File:"), ""));
}

// ── 3. 작가·라이선스 ─────────────────────────────────────────
const infoCache = new Map();
async function fileInfo(names) {
  const need = names.filter((n) => !infoCache.has(n));
  for (let i = 0; i < need.length; i += 40) {
    const chunk = need.slice(i, i + 40);
    const u =
      "https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url%7Cextmetadata%7Csize%7Cmime&iiurlwidth=" +
      THUMB_W +
      "&iiextmetadatafilter=Artist%7CLicenseShortName%7CLicenseUrl%7CUsageTerms&titles=" +
      encodeURIComponent(chunk.map((n) => "File:" + n).join("|"));
    const d = await getJson(u);
    const norm = {};
    for (const n of (d.query && d.query.normalized) || []) norm[n.to] = n.from;
    for (const p of Object.values((d.query && d.query.pages) || {})) {
      const title = String(p.title || "");
      const asked = (norm[title] || title).replace(new RegExp("^File:"), "");
      const ii = p.imageinfo && p.imageinfo[0];
      if (!ii) {
        infoCache.set(asked, null);
        continue;
      }
      const m = ii.extmetadata || {};
      infoCache.set(asked, {
        file: title.replace(new RegExp("^File:"), ""),
        thumb: String(ii.thumburl || ""),
        width: ii.width || 0,
        height: ii.height || 0,
        mime: String(ii.mime || ""),
        author: AUTHOR_FIX[title.replace(new RegExp("^File:"), "")] || plain(m.Artist && m.Artist.value).slice(0, 120),
        license: plain(m.LicenseShortName && m.LicenseShortName.value).slice(0, 60),
        licenseUrl: String((m.LicenseUrl && m.LicenseUrl.value) || ""),
        page: String(ii.descriptionurl || ""),
      });
    }
    for (const n of chunk) if (!infoCache.has(n)) infoCache.set(n, null);
    await sleep(300);
  }
  return names.map((n) => infoCache.get(n)).filter(Boolean);
}

function usable(info) {
  if (!info || !info.thumb || !info.page) return false;
  if (info.mime !== "image/jpeg") return false;
  if (info.width < 480 || info.height < 320) return false;
  if (!FREE.test(info.license)) return false;
  if (BAD.test(info.file) || BAD2.test(info.file)) return false;
  if (info.thumb.indexOf("https://upload.wikimedia.org/wikipedia/commons/") !== 0) return false;
  return true;
}

// ── 4. 고르기 ────────────────────────────────────────────────
async function main() {
  const places = readPlaces();
  const used = new Set();
  const result = {};
  const log = [];
  for (const p of places) {
    if (NONE.has(p.id)) {
      result[p.id] = { region: p.region, photos: [] };
      log.push([p, [], "NONE"]);
      continue;
    }
    let names = [];
    if (PICK[p.id]) names = PICK[p.id].slice();
    try {
      for (const n of await wikiCandidates(p.wiki)) if (!names.includes(n)) names.push(n);
    } catch (e) {
      console.warn("위키 실패", p.id, e.message);
    }
    names = names.filter((n) => PHOTO.test(n) && !BAD.test(n) && !SKIP.has(n));
    // 한 지점의 조회가 실패해도 전체를 멈추지 않고 다음 지점으로 넘어갑니다.
    let infos = [];
    try {
      infos = (await fileInfo(names.slice(0, 12))).filter(usable);
    } catch (e) {
      console.warn("파일 정보 실패", p.id, e.message);
    }
    if (infos.filter((i) => !used.has(i.file)).length < 2) {
      try {
        const more = (await commonsSearch(p.wiki + " " + (p.type === "city" ? "city" : ""))).filter(
          (n) => PHOTO.test(n) && !BAD.test(n) && !SKIP.has(n) && !names.includes(n)
        );
        infos = infos.concat((await fileInfo(more)).filter(usable));
      } catch (e) {
        console.warn("공용 검색 실패", p.id, e.message);
      }
    }
    // 옛 식민지 시대 기록 사진(트로펜 박물관·KITLV)은 오늘의 모습이 아니라 뒤로 돌립니다(2026-11-11 확인).
    infos.sort((a, b) => (ARCHIVE.test(a.file) ? 1 : 0) - (ARCHIVE.test(b.file) ? 1 : 0));
    const picked = [];
    for (const i of infos) {
      if (picked.length >= 2) break;
      if (used.has(i.file) || used.has(i.thumb)) continue;
      if (!attributable(i)) continue; // 저작자를 표시할 수 없는 CC BY 계열 사진은 쓰지 않음(K-01)
      picked.push(i);
      used.add(i.file);
      used.add(i.thumb);
    }
    result[p.id] = {
      region: p.region,
      photos: picked.map((i) => ({
        file: i.file,
        thumb: sizedThumb(i),
        author: i.author || "(작가 표시 없음)",
        license: i.license,
        licenseUrl: i.licenseUrl,
        page: i.page,
      })),
    };
    log.push([p, picked, ""]);
    console.log(p.id.padEnd(24), picked.length, picked.map((i) => i.file).join(" | "));
    await sleep(250);
  }

  // 겹침 검사 (한 번 더)
  const seen = new Map();
  for (const [id, v] of Object.entries(result)) {
    for (const ph of v.photos) {
      if (seen.has(ph.thumb)) throw new Error("겹친 사진: " + ph.file + " — " + seen.get(ph.thumb) + " / " + id);
      seen.set(ph.thumb, id);
    }
  }
  const n2 = Object.values(result).filter((v) => v.photos.length === 2).length;
  const n1 = Object.values(result).filter((v) => v.photos.length === 1).length;
  const n0 = Object.values(result).filter((v) => v.photos.length === 0).length;
  console.log("\n지점 " + places.length + " · 2장 " + n2 + " · 1장 " + n1 + " · 0장 " + n0);
  if (DRY) return;

  // 5. mapPhotos.ts 다시 쓰기 (@generated 구간만)
  const file = path.join(ROOT, "src/lib/mapPhotos.ts");
  const src = fs.readFileSync(file, "utf8");
  const a = src.indexOf("// @generated-start");
  const b = src.indexOf("// @generated-end");
  if (a < 0 || b < a) throw new Error("mapPhotos.ts 에 @generated 표시가 없습니다");
  const ordered = {};
  for (const k of Object.keys(result).sort()) ordered[k] = result[k];
  const body =
    "// @generated-start\n// " +
    new Date().toISOString().slice(0, 10) +
    " scripts/build-map-photos.mjs — 지점 " + places.length + " · 2장 " + n2 + " · 1장 " + n1 + " · 0장 " + n0 + "\n" +
    "export const MAP_PHOTOS: Record<string, MapPlacePhotos> = " +
    JSON.stringify(ordered, null, 2) +
    ";\n";
  fs.writeFileSync(file, src.slice(0, a) + body + src.slice(b), "utf8");

  // 확인용 HTML (저장소에 넣지 않습니다)
  const esc = (s) => String(s).replace(new RegExp("[&<>\"]", "g"), (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const rows = log
    .map(([p, picked, note]) =>
      "<tr><td><b>" + esc(p.ko) + "</b><br>" + esc(p.id) + "<br><small>" + esc(p.type + " · " + p.wiki) + " " + note + "</small></td>" +
      picked.map((i) => '<td><img src="' + esc(i.thumb) + '" width="240"><br><small>' + esc(i.file) + "<br>" + esc(i.author) + " · " + esc(i.license) + "</small></td>").join("") +
      "</tr>"
    )
    .join("\n");
  const review = path.join(os.tmpdir(), "map-photos-review.html");
  fs.writeFileSync(
    review,
    '<!doctype html><meta charset="utf-8"><title>map photos</title><table border="1" cellpadding="6">' + rows + "</table>",
    "utf8"
  );
  console.log("mapPhotos.ts 갱신, 확인용 HTML: " + review);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
