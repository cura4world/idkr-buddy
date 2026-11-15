// scripts/build-map-photos.mjs
// 지도 사진 고정 목록(src/lib/mapPhotos.ts)을 만듭니다. 인터넷이 되는 PC에서 돌립니다.
//
//   node scripts/build-map-photos.mjs            → 빈 지점만 채워 mapPhotos.ts 다시 쓰기 + map-photos-review.html
//   node scripts/build-map-photos.mjs --dry      → mapPhotos.ts 는 쓰지 않고 결과와 확인용 HTML 만
//   node scripts/build-map-photos.mjs --all      → 모든 지점을 처음부터 다시 고름(사람이 확인한 사진도 바뀝니다 — 쓰지 말 것)
//
// 2026-11-15(11차): 기본 동작을 "이미 사진이 있는 지점은 그대로 두고, photos 가 빈 지점만 채우기"로 바꿨습니다.
// 이미 있는 사진은 사람이 한 장씩 확인한 것이라 다시 돌려도 바뀌면 안 됩니다. 그 사진들은 "이미 쓴 사진"으로 먼저
// 올려 두어 새로 고르는 사진과 겹치지 않게 합니다. 확인용 HTML 에는 이번에 채운 지점과 후보가 없는 지점만 나옵니다.
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
import { fileURLToPath } from "node:url";

// fileURLToPath: 경로에 빈칸이 있으면(…/Claude Work/…) URL 의 pathname 은 %20 으로 적혀 파일을 찾지 못합니다(2026-11-15).
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DRY = process.argv.includes("--dry");
const ALL = process.argv.includes("--all");
const UA = "KatakataMapPhotos/1.0 (offline build script)";
const TIMEOUT_MS = 20000;
const THUMB_W = 640;

// 지점 → 직접 고른 Commons 파일 이름 (앞에 "File:" 없이). 자동 결과보다 먼저 씁니다.
const PICK = {
  // "Borobudur": ["Borobudur-Nothwest-view.jpg"],
  // 2026-11-14 출시 전 점검 K-02: 자동 선택이 페로 제도의 숨바 마을 사진(Faroe.sumba.3.jpg)을 골라 직접 고름.
  "Pulau Sumba": ["Kampung Adat Ratenggaro - Sumba.jpg"],

  // ── 2026-11-15(11차): 비어 있던 41곳의 후보. 자동으로 나온 후보와 공용 검색 결과를 화면으로 보고 골랐습니다.
  //    아직 사람(Arga)이 확인하기 전입니다 — 확인용 HTML 을 보고 바꿀 것은 여기서 파일 이름을 바꿉니다.
  //    "자동"이라고 적지 않은 줄은 자동 선택이 엉뚱해서(다른 나라·다른 도시·옛 판화·음식·버스 등) 직접 찾아 바꾼 것입니다.
  // 관광지
  "Raja Ampat": ["Piaynemo, Raja Ampat (39660320633).jpg", "Pulau Piaynemo, Raja Ampat.jpg"], // 1번을 카르스트 섬 풍경으로(자동은 둘 다 물속)
  "Pulau Komodo": ["Komodo Island north aerial.jpg", "Komodo Dragon (01).jpg"], // 자동
  "Bunaken": ["Bunaken.jpg", "Bunaken3.jpg"], // 자동
  "Pulau Belitung": ["Berlayar di Semenanjung Belitung.jpg", "Pantai Tanjung Tinggi Belitung 02.jpg"], // 2번을 화강암 해변으로
  "Kuta": ["Kuta Beach (6924448550).jpg", "Kuta Square.JPG"], // 자동
  "Dataran Tinggi Dieng": ["Arjuna Temple Complex in the Dieng Plateau.jpg", "Pagi Candi Arjuna Dieng.jpg"], // 자동
  "Tangkuban Perahu": ["Tangkuban Prahu.jpg", "Tangkuban Parahu.jpg"], // 자동 2번은 옛 흑백 사진
  "Kepulauan Mentawai": ["Mentawai Uma.jpg", "Pantai Jati 1.jpg"], // 자동 1번은 항구 간판
  "Krakatau": ["Anak Krakatau-2.JPG", "Anak Krakatau.jpg"], // 자동은 둘 다 18세기 판화(하나는 반다의 구눙 아피)
  "Tanjung Puting": ["Orangutan at Tanjung Puting National Park (31266099698).jpg", "Landscape of theTanjung Puting National Park - Indonesia 2.jpg"], // 1번을 오랑우탄으로
  "Kepulauan Banda": ["BandaBesarIslandSeenFromFortBelgica.JPG", "Banda-0039.jpg"], // 자동
  "Sangiran": ["Java Man Statue at the Sangiran Early Man Site.jpg", "Sangiran Early Man Museum, Krikilan Cluster.jpg"], // 2번을 두개골 대신 박물관으로
  "Muara Jambi": ["Candi Muaro Jambi di siang hari.jpg", "004 Main Building, Side View, Candi Tinggi 2 (39127443191).jpg"], // 자동
  "Taman Nasional Lorentz": ["Taman Nasional Lorentz.jpg", "Wikiearth-Danau Habema Taman Nasional Lorentz.jpg"], // 자동 2번은 새(동물원 사진으로 보임)
  // 종교·역사
  "Banten Lama": ["Masjid agung banten lama.jpg", "Tampak Fondasi Ruang Dayang-Dayang Keraton Surosowan.jpg"], // 자동 2번은 메단의 모스크
  "Lasem": ["Oemah Batik Lasem.jpg", "Sarung batik tulis lasem premium tiga negeri.jpg"], // 자동은 둘 다 이란의 라셈
  "Muntilan": ["Kerkof Muntilan, Magelang, Jawa Tengah.jpg", "Makam Justinus Kardinal Darmoyuwono di Kerkof Muntilan 8.jpg"], // 판 리트 신부가 묻힌 가톨릭 묘지(자동은 석공예 가게·면사무소 간판)
  "Pulau Mansinam": ["Mansinam Jesus Statue.jpg", "Sumur Tua JL Van Hasselt 005.jpg"], // 자동
  "Pulau Sabu": ["Boats at Raijua Pier 2022.jpg", "Tubular dress, Savu, Indonesia, early 20th century, cotton - Fernbank Museum of Natural History - DSC09979.JPG"], // 자동 1번은 플로레스 섬 해안. 사부 섬 풍경 사진은 찾지 못해 이웃 라이주아 섬 부두로
  "Soe": ["Rumah Bulat.jpg", "Oelekam, Central Mollo, South Timor Tengah Regency, East Nusa Tenggara, Indonesia - panoramio.jpg"], // 자동
  // 종족·문화
  "Kampung Naga": ["Abdulrohmatt3.jpg", "DSC00029 Java Little Sundanais Traditional Village Kampung Naga (6219569245).jpg"], // 2번을 인물 사진 대신 마을 풍경으로
  "Pamekasan": ["Monumen Arek Lancor Pamekasan.jpg", "Karapan Sapi Madura.jpg"], // 2번을 묘지 안내판 대신 소 경주(마두라 문화)로
  "Takengon": ["Takengon.jpg", "Laut Tawar Lake.jpg"], // 자동
  "Bone": ["Port of Bajoe, Bone, South Sulawesi 3 2012.jpg", "KMP Kotabumi at Port of Bajoe Bone South Sulawesi.jpg"], // 자동(바조에 항구). 부기스 왕국을 보여 주는 사진은 찾지 못함 — 약한 후보
  // 도시
  "Banjarmasin": ["Kota Banjarmasin.jpg", "Banjarmasin floating market, 2018.jpg"], // 자동 2번은 1859년 판화
  "Surakarta": ["Pura Mangkunegaran Surakarta.jpg", "The front facade of Pasar Gedhe Hardjonagoro in 2019.jpg"], // 자동 2번은 음식 사진
  "Bogor": ["Istana presiden republik Indonesia di Bogor.jpg", "Kebun Raya Bogor 19.jpg"], // 2번을 식물원으로
  "Serang": ["Great Mosque of Serang.jpg", "Cagar Alam Pulau Dua, Banten, 23042017.jpg"], // 자동
  "Tanjungpinang": ["Governors House.jpg", "Pulau Penyengat.jpg"], // 자동
  "Palangkaraya": ["Bundaran Besar Palangka Raya (baru).jpg", "Duta Mall Palangka Raya (20260117 145441).jpg"], // 자동
  "Merauke": ["Tugu Lingkaran Brawijaya 969.jpg", "Melaleuca.Sp lahan basah TN Wasur.jpg"], // 자동 2번은 여러 장을 이어 붙인 사진
  "Bima": ["Bima di atas bukit.jpg", "City of bima indonesia.jpg"], // 자동 2번은 인물 사진
  "Singkawang": ["Tugu Naga Singkawang.jpg", "Bangunan Cagar Budaya Marga Tjhia.jpg"], // 자동
  "Bekasi": ["Kalimalang.jpg", "Bekasi Mall Night 2.jpg"], // 자동
  "Tangerang": ["Azhom 2.jpg", "Boen Tek Bio.jpg"], // 2번을 박물관 실내 대신 사원 바깥 모습으로
  "Sukabumi": ["Sukabumi Grand Mosque 2022 01.jpg", "Dago Pedestrian Zone, Sukabumi.jpg"], // 자동
  "Purwokerto": ["View of the General Gatot Subroto Monument.jpg", "Alun - Alun Purwokerto & Pendapa Si Panji dengan Latar belakang Gunung Slamet.jpg"], // 2번을 슬라멧 산이 보이는 광장으로
  "Madiun": ["Kantor Pemerintahan Kota Madiun tahun 2020.jpg", "Area depan Eks Roemah Kapitein Tjina Njoo Swie Lian Madiun.jpg"], // 자동
  "Binjai": ["Binjai.jpg", "AmirHamzahHouse.jpg"], // 자동
  "Yogyakarta": ["Jogja - Tugu Monument (2025) - img 06.jpg", "Eastern face of west gate, Taman Sari, Yogyakarta, 2014-04-24 (from 19 images).jpg"], // 자동 2번은 시내버스
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
  // 2026-11-14 3차(출시 전 점검 5-6 #36~38): src/lib/mapPhotos.ts 에서 손으로 뺀 17장.
  // 여기에 없으면 스크립트를 다시 돌릴 때 되살아납니다. 다시 돌린 뒤에는 그 자리에 다른 초상·옛 그림이
  // 들어오지 않았는지 확인용 HTML 을 사람이 봐야 합니다.
  //   옛 기록 그림(지금 모습이 아님)
  "Japanese attack on Borneo, 1941-1942.jpg",
  "The old missigit of Bantam.jpg",
  "Sultan Muhammad Salahuddin bersama Tentara BKR Bima depan Istana ASI Mbojo.jpg",
  "Resident Offce Resident Office Buitenzorg.jpg",
  "Banda Neira 1724.jpg",
  "Fort Belgica 1824.jpg",
  "John Webber Plate XVI The Fan Palm in the Island of Cracatoa.jpg",
  "Bird's eye view of Palembang.JPG",
  "Alun - Alun Purwokerto 1947. (Berwarna).jpg",
  "Alun - Alun di Purwokerto, 1931.jpg",
  "Tarakan landing (AWM 090812).jpg",
  //   인물 초상 · 라이선스가 의심스러운 것
  "Amir Hamzah Wali Kota Binjai.jpg",
  "Wali Kota Kediri Samsul Ashar.jpg",
  "Bupati Mamuju Sitti Sutinah Suhardi.jpg",
  "Esau Sesa.jpg",
  "Muhammad Arif, MP of Tanjungpinang (2004-2021).jpg",
  "Presiden Jokowi Didampingi Gubernur Koster di Pura Besakih untuk peresmian.jpg",
  // 2026-11-15(11차): 빈 41곳을 채울 때 자동 선택에 들어온 엉뚱한 사진. 다시 돌려도 "다른 후보"로도 나오지 않게 합니다.
  //   다른 나라·다른 곳
  "Lasem Iran (67251211).jpeg",
  "Mazandaran - Lasem road - panoramio (1).jpg",
  "Coast of the Savu Sea on Flores Island, Indonesia, 20250823 1102 2842.jpg",
  "Tugu Garuda Pancasila di Gereja Santo Agustinus Karawaci (2025).jpg",
  "Tugu Garuda Pancasila di Gereja Santo Thomas Rasul (2025).jpg",
  "Tugu Garuda Pancasila di Gereja Santo Gregorius Agung Kutabumi (2025).jpg",
  //   옛 판화·그림·옛 흑백 사진, 지폐, 이어 붙인 사진, 인물
  "The Scream.jpg",
  "AMH-8034-KB View of Gunung Api.jpg",
  "John Webber Plate XV View in the Island of Cracatoa.jpg",
  "017c.Emil Karl Schumacher.jpg",
  "1. ZM Stoomschip Celebes in gevecht met een Kota Mara 6 aug 1859 Poeloe Kananat opgenomen.jpg",
  "Market and trade in Bantam (Banten), Romeyn de Hooghe, 1682-1733.jpg",
  "Banda1810Cole.jpg",
  "Fort Nassau 1646.jpg",
  "TE-2022-100000-belakang.jpg",
  "Merauke skyline.jpg",
  "Child dancers, Sumbawa.jpg",
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
const NONE = new Set([
  // 2026-11-15(11차): 투구 교회 — 공용에 교회 건물 사진이 없습니다(검색 "Gereja Tugu Jakarta"·"Tugu Church Jakarta"·"Kampung Tugu Koja").
  // 자동 선택은 이름에 Tugu 가 들어간 다른 성당의 기념비 사진이었습니다. 마을(캄풍 투구) 사진 RoemahToegoe1.jpg(CC BY 4.0),
  // Keroncong Tugu.jpg(CC BY-SA 4.0)는 있으나 교회를 보여 주지는 않아 넣지 않았습니다.
  "Gereja Tugu",
]);

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
// 2026-11-15: 집 PC 에서는 0.4초 간격으로도 계속 429(40초 대기)가 나와, 간격을 환경 변수로 늘릴 수 있게 했습니다.
//   예) MAP_PHOTOS_PACE_MS=6000 node scripts/build-map-photos.mjs --dry
const PACE_MS = Math.max(400, Number(process.env.MAP_PHOTOS_PACE_MS || "400") || 400);
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
        // 원본 주소(upload.wikimedia.org)를 담아 두고, 화면용 500px 주소는 sizedThumb 가 만듭니다.
        // 예전에는 API 의 thumburl 을 썼는데, 2026-11 부터 thumburl 이 thumb.wikimedia.org + 추적용 꼬리(?utm_…)로 와서
        // 아래 usable 의 주소 검사에 전부 걸려 후보가 0장이 됐습니다(11차에서 확인). 앱이 쓰는 주소 형식
        // (upload.wikimedia.org/…/thumb/…/500px-이름)은 그대로 열립니다.
        thumb: String(ii.url || "").split("?")[0],
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

// picked: PICK 표에 사람이 직접 적은 파일 — 이름 거르기(BAD·BAD2)는 건너뜁니다(교회 지점의 교회 사진처럼 일부러 고른 것).
// 라이선스·크기·형식·주소 검사는 직접 고른 파일에도 똑같이 합니다.
function usable(info, picked) {
  if (!info || !info.thumb || !info.page) return false;
  if (info.mime !== "image/jpeg") return false;
  if (info.width < 480 || info.height < 320) return false;
  if (!FREE.test(info.license)) return false;
  if (!picked && (BAD.test(info.file) || BAD2.test(info.file))) return false;
  if (info.thumb.indexOf("https://upload.wikimedia.org/wikipedia/commons/") !== 0) return false;
  return true;
}

// 지금 mapPhotos.ts 에 적혀 있는 목록(@generated 구간). 읽지 못하면 멈춥니다 — 빈 목록으로 보고 전부 다시 고르면 안 되므로.
function readExisting() {
  const src = fs.readFileSync(path.join(ROOT, "src/lib/mapPhotos.ts"), "utf8");
  const a = src.indexOf("export const MAP_PHOTOS");
  const b = src.indexOf("// @generated-end");
  if (a < 0 || b < a) throw new Error("mapPhotos.ts 에서 지금 목록을 찾지 못했습니다");
  const json = src.slice(src.indexOf("= ", a) + 2, b).trim().replace(new RegExp(";\\s*$"), "");
  return JSON.parse(json);
}

// ── 4. 고르기 ────────────────────────────────────────────────
async function main() {
  const places = readPlaces();
  const used = new Set();
  const result = {};
  const log = [];
  // 이미 사진이 있는 지점은 그대로 둡니다(--all 이 아니면). 그 사진들은 먼저 "쓴 사진"으로 올립니다.
  const existing = ALL ? {} : readExisting();
  let kept = 0;
  for (const v of Object.values(existing)) {
    for (const ph of v.photos || []) {
      used.add(ph.file);
      used.add(ph.thumb);
    }
  }
  for (const p of places) {
    const ex = existing[p.id];
    if (ex && ex.photos && ex.photos.length > 0) {
      result[p.id] = ex;
      kept++;
      continue;
    }
    if (NONE.has(p.id)) {
      result[p.id] = { region: p.region, photos: [] };
      log.push([p, [], "NONE", []]);
      continue;
    }
    const hand = PICK[p.id] ? PICK[p.id].slice() : [];
    let names = hand.slice();
    try {
      for (const n of await wikiCandidates(p.wiki)) if (!names.includes(n)) names.push(n);
    } catch (e) {
      console.warn("위키 실패", p.id, e.message);
    }
    names = names.filter((n) => PHOTO.test(n) && !SKIP.has(n) && (hand.includes(n) || !BAD.test(n)));
    const ok = (i) => usable(i, hand.includes(i.file));
    // 한 지점의 조회가 실패해도 전체를 멈추지 않고 다음 지점으로 넘어갑니다.
    let infos = [];
    try {
      infos = (await fileInfo(names.slice(0, 12 + hand.length))).filter(ok);
    } catch (e) {
      console.warn("파일 정보 실패", p.id, e.message);
    }
    if (infos.filter((i) => !used.has(i.file)).length < 2) {
      try {
        const more = (await commonsSearch(p.wiki + " " + (p.type === "city" ? "city" : ""))).filter(
          (n) => PHOTO.test(n) && !BAD.test(n) && !SKIP.has(n) && !names.includes(n)
        );
        infos = infos.concat((await fileInfo(more)).filter(ok));
      } catch (e) {
        console.warn("공용 검색 실패", p.id, e.message);
      }
    }
    // 직접 고른 것(PICK)을 맨 앞에, 옛 식민지 시대 기록 사진(트로펜 박물관·KITLV)은 오늘의 모습이 아니라 뒤로 돌립니다(2026-11-11 확인).
    const rankOf = (i) => (hand.includes(i.file) ? 0 : ARCHIVE.test(i.file) ? 2 : 1);
    infos = infos.map((i, n) => [i, n]).sort((a, b) => rankOf(a[0]) - rankOf(b[0]) || a[1] - b[1]).map((x) => x[0]);
    const picked = [];
    const spare = []; // 고르지 않은 나머지 후보 — 확인용 HTML 에 "다른 후보"로 보여 사람이 바꿔 고를 수 있게
    for (const i of infos) {
      if (used.has(i.file) || used.has(i.thumb)) continue;
      if (!attributable(i)) continue; // 저작자를 표시할 수 없는 CC BY 계열 사진은 쓰지 않음(K-01)
      if (ARCHIVE.test(i.file) && !hand.includes(i.file)) continue; // 기록 사진은 앱이 보여 주지 않으므로 새로 넣지 않음
      if (picked.length >= 2) {
        if (spare.length < 4 && !spare.some((s) => s.file === i.file)) spare.push(i);
        continue;
      }
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
    log.push([p, picked, "", spare]);
    console.log(p.id.padEnd(24), picked.length, picked.map((i) => i.file).join(" | "));
    await sleep(250);
  }
  if (!ALL) console.log("\n그대로 둔 지점 " + kept + " · 이번에 본 빈 지점 " + log.length);

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

  // 5. mapPhotos.ts 다시 쓰기 (@generated 구간만). --dry 면 건너뜁니다.
  if (!DRY) {
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
  }

  // 확인용 HTML 과 같은 내용의 JSON (저장소에 넣지 않습니다). 이번에 본 지점(빈 지점)만 나옵니다.
  const esc = (s) => String(s).replace(new RegExp("[&<>\"]", "g"), (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const TYPE_KO = { city: "도시", spot: "관광지", faith: "종교·역사", culture: "종족·문화" };
  const cell = (i, cls, tag) =>
    '<td class="' + cls + '"><a href="' + esc(i.page) + '" target="_blank" rel="noopener"><img loading="lazy" src="' + esc(sizedThumb(i)) + '" width="240"></a><br>' +
    "<b>" + tag + "</b><br><small>" + esc(i.file) + "<br>" + esc(i.author || "(작가 표시 없음)") + " · " + esc(i.license) + "</small></td>";
  const rows = log
    .map(([p, picked, note, spare], n) =>
      "<tr><td class=\"place\">" + (n + 1) + ". <b>" + esc(p.ko) + "</b><br>" + esc(p.id) + "<br><small>" + esc((TYPE_KO[p.type] || p.type) + (p.staff ? " · 관리자·Special 전용" : "") + " · " + p.hint) + "<br>위키 문서: " + esc(p.wiki) + " " + note + "</small>" +
      (picked.length === 0 ? '<br><b class="none">후보 없음</b>' : "") + "</td>" +
      picked.map((i, k) => cell(i, "in", "넣은 사진 " + (k + 1))).join("") +
      (spare || []).map((i, k) => cell(i, "alt", "다른 후보 " + (k + 1))).join("") +
      "</tr>"
    )
    .join("\n");
  const filled = log.filter((l) => l[1].length > 0).length;
  const review = path.join(os.tmpdir(), "map-photos-review.html");
  fs.writeFileSync(
    review,
    '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>지도 사진 후보</title>' +
      "<style>body{font-family:sans-serif;margin:12px}table{border-collapse:collapse}td{border:1px solid #bbb;padding:6px;vertical-align:top;max-width:252px;word-break:break-all}" +
      "td.place{min-width:150px;max-width:200px;word-break:keep-all}td.in{background:#e7f5ec}td.alt{background:#f4f4f4}.none{color:#b00020}img{display:block;height:auto}</style>" +
      "<h1>지도 사진 후보 — 비어 있던 지점 " + log.length + "곳</h1>" +
      "<p>만든 날 " + new Date().toISOString().slice(0, 10) + " · 사진을 넣은 지점 " + filled + " · 후보 없음 " + (log.length - filled) + "</p>" +
      "<p>초록 칸 = 지금 목록(mapPhotos.ts)에 넣은 사진, 회색 칸 = 바꿔 넣을 수 있는 다른 후보. 사진을 누르면 위키미디어 공용의 원본 설명 페이지가 열립니다.<br>" +
      "이미 사진이 있던 지점은 이 표에 없습니다(바꾸지 않았습니다). 뺄 사진·바꿀 사진은 지점 번호와 함께 알려 주세요.</p>" +
      "<table>" + rows + "</table>",
    "utf8"
  );
  const brief = (i) => ({ file: i.file, author: i.author || "", license: i.license, page: i.page });
  fs.writeFileSync(
    path.join(os.tmpdir(), "map-photos-review.json"),
    JSON.stringify(log.map(([p, picked, note, spare]) => ({ id: p.id, ko: p.ko, type: p.type, staff: !!p.staff, wiki: p.wiki, picked: picked.map(brief), spare: (spare || []).map(brief) })), null, 2),
    "utf8"
  );
  console.log((DRY ? "mapPhotos.ts 는 쓰지 않음(--dry)" : "mapPhotos.ts 갱신") + ", 확인용 HTML: " + review);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
