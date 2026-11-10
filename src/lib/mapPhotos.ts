// src/lib/mapPhotos.ts
// 지도 시트의 사진 — 고정 목록 (S55, 2026-11-10 결정).
//
// 예전에는 핀을 누를 때마다 위키피디아에서 사진을 찾아 왔습니다. 그 방식은 지점끼리 무엇을
// 골랐는지 모르기 때문에 같은 사진이 여러 곳에 겹쳐 나왔고, 엉뚱한 사진도 섞였습니다.
// 그래서 사진을 미리 골라 이 파일에 적어 두고, 시트는 이 목록만 씁니다(네트워크 검색 없음).
//
// 규칙
//   · 지점마다 최대 2장. 한 사진은 지도 전체에서 한 지점에만 씁니다(겹침 금지).
//   · 위키미디어 공용(Commons)의 자유 라이선스 사진만 씁니다(CC BY · CC BY-SA · CC0 · 퍼블릭 도메인).
//     en.wikipedia 자체 파일(공정 이용)은 공개 앱에 쓸 수 없습니다.
//   · CC BY 계열은 사진마다 작가·라이선스·원본 주소를 보여야 합니다 → 설정 > 앱 정보 > 사진 출처
//     (/about/photos, src/pages/PhotoCredits.tsx). 시트에는 출처 문구를 두지 않습니다.
//   · 마땅한 사진이 없는 지점은 photos: [] 로 둡니다. 목록에 없는 지점도 사진을 그리지 않습니다.
//
// 만드는 법: node scripts/build-map-photos.mjs  (인터넷이 되는 PC에서 — 위키미디어 API 를 부릅니다)
//   → 이 파일을 통째로 다시 쓰고, 사람이 볼 확인용 HTML 을 함께 만듭니다.
//   사진이 그 지점을 잘 보여 주는지는 사람이 확인합니다. 바꿀 사진은 스크립트의 PICK 표에 적고 다시 돌립니다.

export type MapRegion = "sumatera" | "jawa" | "bali-nusa" | "kalimantan" | "sulawesi" | "maluku" | "papua";

export const MAP_REGION_ORDER: MapRegion[] = ["sumatera", "jawa", "bali-nusa", "kalimantan", "sulawesi", "maluku", "papua"];

export const MAP_REGION_LABEL: Record<MapRegion, { ko: string; id: string }> = {
  sumatera: { ko: "수마트라", id: "Sumatera" },
  jawa: { ko: "자바", id: "Jawa" },
  "bali-nusa": { ko: "발리·누사틍가라", id: "Bali dan Nusa Tenggara" },
  kalimantan: { ko: "칼리만탄", id: "Kalimantan" },
  sulawesi: { ko: "술라웨시", id: "Sulawesi" },
  maluku: { ko: "말루쿠", id: "Maluku" },
  papua: { ko: "파푸아", id: "Papua" },
};

export interface MapPhoto {
  file: string;        // Commons 파일 이름 ("File:" 없이)
  thumb: string;       // 화면에 띄우는 주소 (upload.wikimedia.org, 폭 640px 썸네일)
  author: string;      // 작가 (Commons 의 Artist, 글자만)
  license: string;     // 예: "CC BY-SA 4.0"
  licenseUrl: string;  // 라이선스 본문 주소 (없으면 "")
  page: string;        // 원본 설명 페이지 (commons.wikimedia.org/wiki/File:...)
}

export interface MapPlacePhotos {
  region: MapRegion;
  photos: MapPhoto[];
}

// ── 고정 목록 ────────────────────────────────────────────────
// 아직 비어 있습니다: 2026-11-10 밤 작업 환경에서 위키미디어에 접속할 수 없어(차단)
// 목록을 만들지 못했습니다. 비어 있는 동안 시트에는 사진이 나오지 않습니다.
// scripts/build-map-photos.mjs 를 돌리면 이 아래가 채워집니다.
// @generated-start
// 2026-11-10 scripts/build-map-photos.mjs — 지점 136 · 2장 66 · 1장 38 · 0장 32
export const MAP_PHOTOS: Record<string, MapPlacePhotos> = {
  "Agats": {
    "region": "papua",
    "photos": [
      {
        "file": "Agats Skyline.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Agats_Skyline.jpg/500px-Agats_Skyline.jpg",
        "author": "Government of Indonesia Regency Government of Asmat",
        "license": "Public domain",
        "licenseUrl": "",
        "page": "https://commons.wikimedia.org/wiki/File:Agats_Skyline.jpg"
      },
      {
        "file": "Asmat Tribesman (48277997957).jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/Asmat_Tribesman_%2848277997957%29.jpg/500px-Asmat_Tribesman_%2848277997957%29.jpg",
        "author": "David Stanley from Nanaimo, Canada",
        "license": "CC BY 2.0",
        "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
        "page": "https://commons.wikimedia.org/wiki/File:Asmat_Tribesman_(48277997957).jpg"
      }
    ]
  },
  "Ambon": {
    "region": "maluku",
    "photos": [
      {
        "file": "Ambon.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Ambon.jpg/500px-Ambon.jpg",
        "author": "OGS",
        "license": "CC BY 2.5",
        "licenseUrl": "https://creativecommons.org/licenses/by/2.5",
        "page": "https://commons.wikimedia.org/wiki/File:Ambon.jpg"
      },
      {
        "file": "Baai van Ambon met moskee - KITLV 1400033.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Baai_van_Ambon_met_moskee_-_KITLV_1400033.jpg/500px-Baai_van_Ambon_met_moskee_-_KITLV_1400033.jpg",
        "author": "Woodbury and Page",
        "license": "Public domain",
        "licenseUrl": "",
        "page": "https://commons.wikimedia.org/wiki/File:Baai_van_Ambon_met_moskee_-_KITLV_1400033.jpg"
      }
    ]
  },
  "Baduy": {
    "region": "jawa",
    "photos": [
      {
        "file": "Baduy children, Kanekes, Banten Province, Java Island, Indonesia.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Baduy_children%2C_Kanekes%2C_Banten_Province%2C_Java_Island%2C_Indonesia.jpg/500px-Baduy_children%2C_Kanekes%2C_Banten_Province%2C_Java_Island%2C_Indonesia.jpg",
        "author": "Paul Hessels",
        "license": "CC BY 2.0",
        "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
        "page": "https://commons.wikimedia.org/wiki/File:Baduy_children,_Kanekes,_Banten_Province,_Java_Island,_Indonesia.jpg"
      },
      {
        "file": "COLLECTIE TROPENMUSEUM Afgevaardigden van de Badui (oftewel Kanekes) bevolking TMnr 60016564.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/COLLECTIE_TROPENMUSEUM_Afgevaardigden_van_de_Badui_%28oftewel_Kanekes%29_bevolking_TMnr_60016564.jpg/500px-COLLECTIE_TROPENMUSEUM_Afgevaardigden_van_de_Badui_%28oftewel_Kanekes%29_bevolking_TMnr_60016564.jpg",
        "author": "J. Hardeman (Fotograaf/photographer).",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Afgevaardigden_van_de_Badui_(oftewel_Kanekes)_bevolking_TMnr_60016564.jpg"
      }
    ]
  },
  "Balikpapan": {
    "region": "kalimantan",
    "photos": [
      {
        "file": "COLLECTIE TROPENMUSEUM Gezicht over de Baai van Balikpapan met olietanks en steigers van de Bataafsche Petroleum Maatschappij (BPM) TMnr 60018714.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/COLLECTIE_TROPENMUSEUM_Gezicht_over_de_Baai_van_Balikpapan_met_olietanks_en_steigers_van_de_Bataafsche_Petroleum_Maatschappij_%28BPM%29_TMnr_60018714.jpg/500px-COLLECTIE_TROPENMUSEUM_Gezicht_over_de_Baai_van_Balikpapan_met_olietanks_en_steigers_van_de_Bataafsche_Petroleum_Maatschappij_%28BPM%29_TMnr_60018714.jpg",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Gezicht_over_de_Baai_van_Balikpapan_met_olietanks_en_steigers_van_de_Bataafsche_Petroleum_Maatschappij_(BPM)_TMnr_60018714.jpg"
      },
      {
        "file": "COLLECTIE TROPENMUSEUM Luchtfoto olieraffinaderij TMnr 20017995.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/COLLECTIE_TROPENMUSEUM_Luchtfoto_olieraffinaderij_TMnr_20017995.jpg/500px-COLLECTIE_TROPENMUSEUM_Luchtfoto_olieraffinaderij_TMnr_20017995.jpg",
        "author": "Drs. F.A.M. (Frans) Welman (Fotograaf/photographer).",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Luchtfoto_olieraffinaderij_TMnr_20017995.jpg"
      }
    ]
  },
  "Banda Aceh": {
    "region": "sumatera",
    "photos": [
      {
        "file": "Museum Aceh.JPG",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Museum_Aceh.JPG/500px-Museum_Aceh.JPG",
        "author": "Si Gam",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Museum_Aceh.JPG"
      }
    ]
  },
  "Bandar Lampung": {
    "region": "sumatera",
    "photos": [
      {
        "file": "Radin Inten 2 Airport.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Radin_Inten_2_Airport.jpg/500px-Radin_Inten_2_Airport.jpg",
        "author": "BabesloJR",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Radin_Inten_2_Airport.jpg"
      },
      {
        "file": "COLLECTIE TROPENMUSEUM Plein met kantoren in Teloekbetoeng de Lampongsche Districten op Zuid-Sumatra. TMnr 60013127.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/COLLECTIE_TROPENMUSEUM_Plein_met_kantoren_in_Teloekbetoeng_de_Lampongsche_Districten_op_Zuid-Sumatra._TMnr_60013127.jpg/500px-COLLECTIE_TROPENMUSEUM_Plein_met_kantoren_in_Teloekbetoeng_de_Lampongsche_Districten_op_Zuid-Sumatra._TMnr_60013127.jpg",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Plein_met_kantoren_in_Teloekbetoeng_de_Lampongsche_Districten_op_Zuid-Sumatra._TMnr_60013127.jpg"
      }
    ]
  },
  "Bandung": {
    "region": "jawa",
    "photos": [
      {
        "file": "Bandung Pasupati Skyline.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Bandung_Pasupati_Skyline.jpg/500px-Bandung_Pasupati_Skyline.jpg",
        "author": "Prayudi Setiadharma",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Bandung_Pasupati_Skyline.jpg"
      },
      {
        "file": "COLLECTIE TROPENMUSEUM Villa Isola aan de Lembangweg bij Bandoeng TMnr 60026636.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/COLLECTIE_TROPENMUSEUM_Villa_Isola_aan_de_Lembangweg_bij_Bandoeng_TMnr_60026636.jpg/500px-COLLECTIE_TROPENMUSEUM_Villa_Isola_aan_de_Lembangweg_bij_Bandoeng_TMnr_60026636.jpg",
        "author": "P.J. van Baarda (Fotograaf/photographer).",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Villa_Isola_aan_de_Lembangweg_bij_Bandoeng_TMnr_60026636.jpg"
      }
    ]
  },
  "Banjarmasin": {
    "region": "kalimantan",
    "photos": [
      {
        "file": "Japanese attack on Borneo, 1941-1942.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Japanese_attack_on_Borneo%2C_1941-1942.jpg/500px-Japanese_attack_on_Borneo%2C_1941-1942.jpg",
        "author": "J.J. Nortier",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Japanese_attack_on_Borneo,_1941-1942.jpg"
      }
    ]
  },
  "Banten Lama": {
    "region": "jawa",
    "photos": [
      {
        "file": "The old missigit of Bantam.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/The_old_missigit_of_Bantam.jpg/500px-The_old_missigit_of_Bantam.jpg",
        "author": "Charles William Meredith van de Velde / Paul Lauters",
        "license": "Public domain",
        "licenseUrl": "",
        "page": "https://commons.wikimedia.org/wiki/File:The_old_missigit_of_Bantam.jpg"
      }
    ]
  },
  "Banyuwangi": {
    "region": "jawa",
    "photos": [
      {
        "file": "Kue Bagiak Gajah Oling, Banyuwangi.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ed/Kue_Bagiak_Gajah_Oling%2C_Banyuwangi.jpg/500px-Kue_Bagiak_Gajah_Oling%2C_Banyuwangi.jpg",
        "author": "DPM PTSP Provinsi Jawa Timur",
        "license": "Public domain",
        "licenseUrl": "",
        "page": "https://commons.wikimedia.org/wiki/File:Kue_Bagiak_Gajah_Oling,_Banyuwangi.jpg"
      }
    ]
  },
  "Batam": {
    "region": "sumatera",
    "photos": [
      {
        "file": "Batam Busway Interior.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Batam_Busway_Interior.jpg/500px-Batam_Busway_Interior.jpg",
        "author": "Abelard Fuah",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Batam_Busway_Interior.jpg"
      },
      {
        "file": "Marriott Hotels Batam.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Marriott_Hotels_Batam.jpg/500px-Marriott_Hotels_Batam.jpg",
        "author": "Mr.henry yansyah",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Marriott_Hotels_Batam.jpg"
      }
    ]
  },
  "Bekasi": {
    "region": "jawa",
    "photos": []
  },
  "Bengkulu": {
    "region": "sumatera",
    "photos": [
      {
        "file": "Bengkulu Governor Office.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Bengkulu_Governor_Office.jpg/500px-Bengkulu_Governor_Office.jpg",
        "author": "MPikli",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Bengkulu_Governor_Office.jpg"
      },
      {
        "file": "COLLECTIE TROPENMUSEUM Oud krijgskostuum van Engganezen Enggano Benkoelen TMnr 10001783.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/COLLECTIE_TROPENMUSEUM_Oud_krijgskostuum_van_Engganezen_Enggano_Benkoelen_TMnr_10001783.jpg/500px-COLLECTIE_TROPENMUSEUM_Oud_krijgskostuum_van_Engganezen_Enggano_Benkoelen_TMnr_10001783.jpg",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Oud_krijgskostuum_van_Engganezen_Enggano_Benkoelen_TMnr_10001783.jpg"
      }
    ]
  },
  "Berastagi": {
    "region": "sumatera",
    "photos": [
      {
        "file": "COLLECTIE TROPENMUSEUM Hotel Brastagi aan de voet van de vulkaan Sibayak TMnr 60023683.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/COLLECTIE_TROPENMUSEUM_Hotel_Brastagi_aan_de_voet_van_de_vulkaan_Sibayak_TMnr_60023683.jpg/500px-COLLECTIE_TROPENMUSEUM_Hotel_Brastagi_aan_de_voet_van_de_vulkaan_Sibayak_TMnr_60023683.jpg",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Hotel_Brastagi_aan_de_voet_van_de_vulkaan_Sibayak_TMnr_60023683.jpg"
      }
    ]
  },
  "Bima": {
    "region": "bali-nusa",
    "photos": [
      {
        "file": "Sultan Muhammad Salahuddin bersama Tentara BKR Bima depan Istana ASI Mbojo.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Sultan_Muhammad_Salahuddin_bersama_Tentara_BKR_Bima_depan_Istana_ASI_Mbojo.jpg/500px-Sultan_Muhammad_Salahuddin_bersama_Tentara_BKR_Bima_depan_Istana_ASI_Mbojo.jpg",
        "author": "Museum Samparaja Bima",
        "license": "CC0",
        "licenseUrl": "http://creativecommons.org/publicdomain/zero/1.0/deed.en",
        "page": "https://commons.wikimedia.org/wiki/File:Sultan_Muhammad_Salahuddin_bersama_Tentara_BKR_Bima_depan_Istana_ASI_Mbojo.jpg"
      }
    ]
  },
  "Binjai": {
    "region": "sumatera",
    "photos": [
      {
        "file": "Amir Hamzah Wali Kota Binjai.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Amir_Hamzah_Wali_Kota_Binjai.jpg/500px-Amir_Hamzah_Wali_Kota_Binjai.jpg",
        "author": "F-L-I-X-A-R",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Amir_Hamzah_Wali_Kota_Binjai.jpg"
      }
    ]
  },
  "Bogor": {
    "region": "jawa",
    "photos": [
      {
        "file": "Resident Offce Resident Office Buitenzorg.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Resident_Offce_Resident_Office_Buitenzorg.jpg/500px-Resident_Offce_Resident_Office_Buitenzorg.jpg",
        "author": "Taufik Hasunna Archive Documentation",
        "license": "Public domain",
        "licenseUrl": "",
        "page": "https://commons.wikimedia.org/wiki/File:Resident_Offce_Resident_Office_Buitenzorg.jpg"
      }
    ]
  },
  "Bone": {
    "region": "sulawesi",
    "photos": []
  },
  "Borobudur": {
    "region": "jawa",
    "photos": [
      {
        "file": "Borobudur-perfect-buddha.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Borobudur-perfect-buddha.jpg/500px-Borobudur-perfect-buddha.jpg",
        "author": "Photo by Jan-Pieter Nap , 2004.",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "http://creativecommons.org/licenses/by-sa/3.0/",
        "page": "https://commons.wikimedia.org/wiki/File:Borobudur-perfect-buddha.jpg"
      },
      {
        "file": "Borobudur mural.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/Borobudur_mural.jpg/500px-Borobudur_mural.jpg",
        "author": "frank wouters from antwerpen, belgium",
        "license": "CC BY 2.0",
        "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
        "page": "https://commons.wikimedia.org/wiki/File:Borobudur_mural.jpg"
      }
    ]
  },
  "Brahmavihara-Arama": {
    "region": "bali-nusa",
    "photos": [
      {
        "file": "Brahmavihara Arama.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Brahmavihara_Arama.jpg/500px-Brahmavihara_Arama.jpg",
        "author": "Daniel Pratt",
        "license": "Public domain",
        "licenseUrl": "",
        "page": "https://commons.wikimedia.org/wiki/File:Brahmavihara_Arama.jpg"
      },
      {
        "file": "Braham Arama Vihara.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Braham_Arama_Vihara.jpg/500px-Braham_Arama_Vihara.jpg",
        "author": "Flickr user: Jos Dielis https://www.flickr.com/photos/dielis/",
        "license": "CC BY 2.0",
        "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
        "page": "https://commons.wikimedia.org/wiki/File:Braham_Arama_Vihara.jpg"
      }
    ]
  },
  "Bukit Lawang": {
    "region": "sumatera",
    "photos": [
      {
        "file": "Bukit-jungle 09N8618.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Bukit-jungle_09N8618.jpg/500px-Bukit-jungle_09N8618.jpg",
        "author": "Nomo michael hoefner / http://www.zwo5.de",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Bukit-jungle_09N8618.jpg"
      },
      {
        "file": "Leuser-orangs 09N8683.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Leuser-orangs_09N8683.jpg/500px-Leuser-orangs_09N8683.jpg",
        "author": "Nomo michael hoefner / http://www.zwo5.de",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Leuser-orangs_09N8683.jpg"
      }
    ]
  },
  "Bukittinggi": {
    "region": "sumatera",
    "photos": [
      {
        "file": "Kantor Walikota Bukit Tinggi.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/c/cd/Kantor_Walikota_Bukit_Tinggi.jpg",
        "author": "Official Website of National Library of Indonesia",
        "license": "Public domain",
        "licenseUrl": "",
        "page": "https://commons.wikimedia.org/wiki/File:Kantor_Walikota_Bukit_Tinggi.jpg"
      },
      {
        "file": "Ngarai Sianok.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Ngarai_Sianok.jpg/500px-Ngarai_Sianok.jpg",
        "author": "MichaelJLowe",
        "license": "CC BY-SA 2.5",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.5",
        "page": "https://commons.wikimedia.org/wiki/File:Ngarai_Sianok.jpg"
      }
    ]
  },
  "Bunaken": {
    "region": "sulawesi",
    "photos": []
  },
  "Cirebon": {
    "region": "jawa",
    "photos": [
      {
        "file": "DPRD Kota Cirebon-Jie.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/DPRD_Kota_Cirebon-Jie.jpg/500px-DPRD_Kota_Cirebon-Jie.jpg",
        "author": "Jie73",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:DPRD_Kota_Cirebon-Jie.jpg"
      },
      {
        "file": "Gedung BAT -Jie73.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/Gedung_BAT_-Jie73.jpg/500px-Gedung_BAT_-Jie73.jpg",
        "author": "Jie73",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Gedung_BAT_-Jie73.jpg"
      }
    ]
  },
  "Danau Kelimutu": {
    "region": "bali-nusa",
    "photos": [
      {
        "file": "Kelimutu crater lakes.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/Kelimutu_crater_lakes.jpg/500px-Kelimutu_crater_lakes.jpg",
        "author": "Tom Casadevall (U.S. Geological Survey)",
        "license": "Public domain",
        "licenseUrl": "",
        "page": "https://commons.wikimedia.org/wiki/File:Kelimutu_crater_lakes.jpg"
      }
    ]
  },
  "Danau Toba": {
    "region": "sumatera",
    "photos": [
      {
        "file": "Lake Toba, North Sumatra (71).JPG",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Lake_Toba%2C_North_Sumatra_%2871%29.JPG/500px-Lake_Toba%2C_North_Sumatra_%2871%29.JPG",
        "author": "Wagino 20100516",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Lake_Toba,_North_Sumatra_(71).JPG"
      },
      {
        "file": "Lake Toba Aerial View.JPG",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Lake_Toba_Aerial_View.JPG/500px-Lake_Toba_Aerial_View.JPG",
        "author": "Kodibuddi",
        "license": "Public domain",
        "licenseUrl": "",
        "page": "https://commons.wikimedia.org/wiki/File:Lake_Toba_Aerial_View.JPG"
      }
    ]
  },
  "Dataran Tinggi Dieng": {
    "region": "jawa",
    "photos": []
  },
  "Demak": {
    "region": "jawa",
    "photos": [
      {
        "file": "Masjid demak.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Masjid_demak.jpg/500px-Masjid_demak.jpg",
        "author": "Astayoga at English Wikipedia",
        "license": "Public domain",
        "licenseUrl": "",
        "page": "https://commons.wikimedia.org/wiki/File:Masjid_demak.jpg"
      },
      {
        "file": "COLLECTIE TROPENMUSEUM De moskee van Demak TMnr 10016515.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/COLLECTIE_TROPENMUSEUM_De_moskee_van_Demak_TMnr_10016515.jpg/500px-COLLECTIE_TROPENMUSEUM_De_moskee_van_Demak_TMnr_10016515.jpg",
        "author": "Woodbury &amp; Page (Fotostudio). niet bekend / unknown (Fotograaf/photographer).",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_De_moskee_van_Demak_TMnr_10016515.jpg"
      }
    ]
  },
  "Denpasar": {
    "region": "bali-nusa",
    "photos": [
      {
        "file": "Denpasar, Denpasar City, Bali, Indonesia - panoramio - 우한길(HK Woo) (10).jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Denpasar%2C_Denpasar_City%2C_Bali%2C_Indonesia_-_panoramio_-_%EC%9A%B0%ED%95%9C%EA%B8%B8%28HK_Woo%29_%2810%29.jpg/500px-Denpasar%2C_Denpasar_City%2C_Bali%2C_Indonesia_-_panoramio_-_%EC%9A%B0%ED%95%9C%EA%B8%B8%28HK_Woo%29_%2810%29.jpg",
        "author": "우한길(HK Woo)",
        "license": "CC BY 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Denpasar,_Denpasar_City,_Bali,_Indonesia_-_panoramio_-_%EC%9A%B0%ED%95%9C%EA%B8%B8(HK_Woo)_(10).jpg"
      },
      {
        "file": "Denpasar, Denpasar City, Bali, Indonesia - panoramio - 우한길(HK Woo) (3).jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/Denpasar%2C_Denpasar_City%2C_Bali%2C_Indonesia_-_panoramio_-_%EC%9A%B0%ED%95%9C%EA%B8%B8%28HK_Woo%29_%283%29.jpg/500px-Denpasar%2C_Denpasar_City%2C_Bali%2C_Indonesia_-_panoramio_-_%EC%9A%B0%ED%95%9C%EA%B8%B8%28HK_Woo%29_%283%29.jpg",
        "author": "우한길(HK Woo)",
        "license": "CC BY 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Denpasar,_Denpasar_City,_Bali,_Indonesia_-_panoramio_-_%EC%9A%B0%ED%95%9C%EA%B8%B8(HK_Woo)_(3).jpg"
      }
    ]
  },
  "Depok": {
    "region": "jawa",
    "photos": [
      {
        "file": "0211m tarian-lenggang-nyai-betawi.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/0211m_tarian-lenggang-nyai-betawi.jpg/500px-0211m_tarian-lenggang-nyai-betawi.jpg",
        "author": "Fery Hartono",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:0211m_tarian-lenggang-nyai-betawi.jpg"
      },
      {
        "file": "Client Display di KPP Depok Sawangan.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Client_Display_di_KPP_Depok_Sawangan.jpg/500px-Client_Display_di_KPP_Depok_Sawangan.jpg",
        "author": "Mesin Antrian Vorsea",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Client_Display_di_KPP_Depok_Sawangan.jpg"
      }
    ]
  },
  "Ende": {
    "region": "bali-nusa",
    "photos": [
      {
        "file": "Shortly after takeoff, H Aroeboesman Ende Flores (ENE-WATE), Trigana Air ATR42-300 (34336886686).jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Shortly_after_takeoff%2C_H_Aroeboesman_Ende_Flores_%28ENE-WATE%29%2C_Trigana_Air_ATR42-300_%2834336886686%29.jpg/500px-Shortly_after_takeoff%2C_H_Aroeboesman_Ende_Flores_%28ENE-WATE%29%2C_Trigana_Air_ATR42-300_%2834336886686%29.jpg",
        "author": "Ontheway Advice",
        "license": "CC0",
        "licenseUrl": "http://creativecommons.org/publicdomain/zero/1.0/deed.en",
        "page": "https://commons.wikimedia.org/wiki/File:Shortly_after_takeoff,_H_Aroeboesman_Ende_Flores_(ENE-WATE),_Trigana_Air_ATR42-300_(34336886686).jpg"
      }
    ]
  },
  "Gereja Tugu": {
    "region": "jawa",
    "photos": []
  },
  "Gili Trawangan": {
    "region": "bali-nusa",
    "photos": [
      {
        "file": "Gili Meno West Coast.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Gili_Meno_West_Coast.jpg/500px-Gili_Meno_West_Coast.jpg",
        "author": "(작가 표시 없음)",
        "license": "Public domain",
        "licenseUrl": "",
        "page": "https://commons.wikimedia.org/wiki/File:Gili_Meno_West_Coast.jpg"
      },
      {
        "file": "Gili Trawangan Dawn 2.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Gili_Trawangan_Dawn_2.jpg/500px-Gili_Trawangan_Dawn_2.jpg",
        "author": "(작가 표시 없음)",
        "license": "Public domain",
        "licenseUrl": "",
        "page": "https://commons.wikimedia.org/wiki/File:Gili_Trawangan_Dawn_2.jpg"
      }
    ]
  },
  "Gorontalo": {
    "region": "sulawesi",
    "photos": [
      {
        "file": "Masjid Agung Gorontalo.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Masjid_Agung_Gorontalo.jpg/500px-Masjid_Agung_Gorontalo.jpg",
        "author": "Ministry of Religion of Indonesia",
        "license": "Public domain",
        "licenseUrl": "",
        "page": "https://commons.wikimedia.org/wiki/File:Masjid_Agung_Gorontalo.jpg"
      },
      {
        "file": "Gedung Rektorat Universitas Negeri Gorontalo.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Gedung_Rektorat_Universitas_Negeri_Gorontalo.jpg/500px-Gedung_Rektorat_Universitas_Negeri_Gorontalo.jpg",
        "author": "Universitas Negeri Gorontalo",
        "license": "Public domain",
        "licenseUrl": "",
        "page": "https://commons.wikimedia.org/wiki/File:Gedung_Rektorat_Universitas_Negeri_Gorontalo.jpg"
      }
    ]
  },
  "Gunung Bromo": {
    "region": "jawa",
    "photos": [
      {
        "file": "Ice dew bromo.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/Ice_dew_bromo.jpg/500px-Ice_dew_bromo.jpg",
        "author": "Benni indo",
        "license": "CC0",
        "licenseUrl": "http://creativecommons.org/publicdomain/zero/1.0/deed.en",
        "page": "https://commons.wikimedia.org/wiki/File:Ice_dew_bromo.jpg"
      },
      {
        "file": "Mount Bromo eruption 2011 01 22.JPG",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Mount_Bromo_eruption_2011_01_22.JPG/500px-Mount_Bromo_eruption_2011_01_22.JPG",
        "author": "Vladimír Rýpar, www.volanidalek.cz",
        "license": "CC BY 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Mount_Bromo_eruption_2011_01_22.JPG"
      }
    ]
  },
  "Gunung Kerinci": {
    "region": "sumatera",
    "photos": [
      {
        "file": "Gunung Kerinci dari tempat wisata Swarga.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Gunung_Kerinci_dari_tempat_wisata_Swarga.jpg/500px-Gunung_Kerinci_dari_tempat_wisata_Swarga.jpg",
        "author": "Muhamad Izzul Fiqih",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Gunung_Kerinci_dari_tempat_wisata_Swarga.jpg"
      }
    ]
  },
  "Gunung Leuser": {
    "region": "sumatera",
    "photos": [
      {
        "file": "Jungle-patrol 09N9067.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Jungle-patrol_09N9067.jpg/500px-Jungle-patrol_09N9067.jpg",
        "author": "Nomo michael hoefner / http://www.zwo5.de",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Jungle-patrol_09N9067.jpg"
      },
      {
        "file": "Leuser.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Leuser.jpg/500px-Leuser.jpg",
        "author": "The original uploader was Agungdwinurcahya at Wikipedia .",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Leuser.jpg"
      }
    ]
  },
  "Gunung Rinjani": {
    "region": "bali-nusa",
    "photos": [
      {
        "file": "Rinjani volcano satellite.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Rinjani_volcano_satellite.jpg/500px-Rinjani_volcano_satellite.jpg",
        "author": "NASA.gov",
        "license": "Public domain",
        "licenseUrl": "",
        "page": "https://commons.wikimedia.org/wiki/File:Rinjani_volcano_satellite.jpg"
      }
    ]
  },
  "Istiqlal": {
    "region": "jawa",
    "photos": [
      {
        "file": "Istiqlal di tahun 2013.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fc/Istiqlal_di_tahun_2013.jpg/500px-Istiqlal_di_tahun_2013.jpg",
        "author": "Iwan Budi Arta SH (Sarjana Hukum)",
        "license": "CC0",
        "licenseUrl": "http://creativecommons.org/publicdomain/zero/1.0/deed.en",
        "page": "https://commons.wikimedia.org/wiki/File:Istiqlal_di_tahun_2013.jpg"
      },
      {
        "file": "COLLECTIE TROPENMUSEUM De Istiqlal moskee in aanbouw en de kathedraal TMnr 20025717.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/COLLECTIE_TROPENMUSEUM_De_Istiqlal_moskee_in_aanbouw_en_de_kathedraal_TMnr_20025717.jpg/500px-COLLECTIE_TROPENMUSEUM_De_Istiqlal_moskee_in_aanbouw_en_de_kathedraal_TMnr_20025717.jpg",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_De_Istiqlal_moskee_in_aanbouw_en_de_kathedraal_TMnr_20025717.jpg"
      }
    ]
  },
  "Jakarta": {
    "region": "jawa",
    "photos": [
      {
        "file": "Jakarta Skyline West.JPG",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/Jakarta_Skyline_West.JPG/500px-Jakarta_Skyline_West.JPG",
        "author": "(WT-en) Jpatokal at English Wikivoyage",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Jakarta_Skyline_West.JPG"
      }
    ]
  },
  "Jambi": {
    "region": "sumatera",
    "photos": [
      {
        "file": "Bob-Kerrey-Pedestrian-Bridge.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Bob-Kerrey-Pedestrian-Bridge.jpg/500px-Bob-Kerrey-Pedestrian-Bridge.jpg",
        "author": "Novrialdi D Putra",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Bob-Kerrey-Pedestrian-Bridge.jpg"
      },
      {
        "file": "Kota jambi.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Kota_jambi.jpg/500px-Kota_jambi.jpg",
        "author": "Novrialdi D Putra",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Kota_jambi.jpg"
      }
    ]
  },
  "Jayapura": {
    "region": "papua",
    "photos": [
      {
        "file": "Transmetrojayapura.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Transmetrojayapura.jpg/500px-Transmetrojayapura.jpg",
        "author": "Rafli Fajar Ardiana",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Transmetrojayapura.jpg"
      },
      {
        "file": "YosSudarsoBayFromSkyline.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/YosSudarsoBayFromSkyline.jpg/500px-YosSudarsoBayFromSkyline.jpg",
        "author": "Michael Cookson",
        "license": "Public domain",
        "licenseUrl": "",
        "page": "https://commons.wikimedia.org/wiki/File:YosSudarsoBayFromSkyline.jpg"
      }
    ]
  },
  "Jember": {
    "region": "jawa",
    "photos": [
      {
        "file": "Launching of Jember car-free night.jpeg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Launching_of_Jember_car-free_night.jpeg/500px-Launching_of_Jember_car-free_night.jpeg",
        "author": "TonyIndra",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Launching_of_Jember_car-free_night.jpeg"
      },
      {
        "file": "Psik-unej-universitas-jember-777x437.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Psik-unej-universitas-jember-777x437.jpg/500px-Psik-unej-universitas-jember-777x437.jpg",
        "author": "Rizkiamaludin",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Psik-unej-universitas-jember-777x437.jpg"
      }
    ]
  },
  "Kampung Naga": {
    "region": "jawa",
    "photos": []
  },
  "Kawah Ijen": {
    "region": "jawa",
    "photos": [
      {
        "file": "Kawah Ijen volcano, Java.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Kawah_Ijen_volcano%2C_Java.jpg/500px-Kawah_Ijen_volcano%2C_Java.jpg",
        "author": "NASA Earth Observatory image by Jesse Allen, using Landsat data from the U.S. Geological Survey.",
        "license": "Public domain",
        "licenseUrl": "",
        "page": "https://commons.wikimedia.org/wiki/File:Kawah_Ijen_volcano,_Java.jpg"
      },
      {
        "file": "Mount Merapi Ijen A.JPG",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Mount_Merapi_Ijen_A.JPG/500px-Mount_Merapi_Ijen_A.JPG",
        "author": "ESCapade",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Mount_Merapi_Ijen_A.JPG"
      }
    ]
  },
  "Kediri": {
    "region": "jawa",
    "photos": [
      {
        "file": "Candi Surowono 1.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/Candi_Surowono_1.jpg/500px-Candi_Surowono_1.jpg",
        "author": "ESCapade",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Candi_Surowono_1.jpg"
      },
      {
        "file": "Wali Kota Kediri Samsul Ashar.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Wali_Kota_Kediri_Samsul_Ashar.jpg/500px-Wali_Kota_Kediri_Samsul_Ashar.jpg",
        "author": "Government of Kediri City, East Java, Indonesia",
        "license": "Public domain",
        "licenseUrl": "",
        "page": "https://commons.wikimedia.org/wiki/File:Wali_Kota_Kediri_Samsul_Ashar.jpg"
      }
    ]
  },
  "Kendari": {
    "region": "sulawesi",
    "photos": [
      {
        "file": "Kendari Modern Library.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Kendari_Modern_Library.jpg/500px-Kendari_Modern_Library.jpg",
        "author": "Diskominfo Sultra",
        "license": "Public domain",
        "licenseUrl": "",
        "page": "https://commons.wikimedia.org/wiki/File:Kendari_Modern_Library.jpg"
      },
      {
        "file": "Kendari at night.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/Kendari_at_night.jpg/500px-Kendari_at_night.jpg",
        "author": "Government of Indonesia",
        "license": "Public domain",
        "licenseUrl": "",
        "page": "https://commons.wikimedia.org/wiki/File:Kendari_at_night.jpg"
      }
    ]
  },
  "Kepulauan Banda": {
    "region": "maluku",
    "photos": [
      {
        "file": "Banda Neira 1724.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Banda_Neira_1724.jpg/500px-Banda_Neira_1724.jpg",
        "author": "(작가 표시 없음)",
        "license": "Public domain",
        "licenseUrl": "",
        "page": "https://commons.wikimedia.org/wiki/File:Banda_Neira_1724.jpg"
      },
      {
        "file": "Fort Belgica 1824.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fd/Fort_Belgica_1824.jpg/500px-Fort_Belgica_1824.jpg",
        "author": "Q.M.R. Ver Huell",
        "license": "Public domain",
        "licenseUrl": "",
        "page": "https://commons.wikimedia.org/wiki/File:Fort_Belgica_1824.jpg"
      }
    ]
  },
  "Kepulauan Derawan": {
    "region": "kalimantan",
    "photos": [
      {
        "file": "Stingless Jellyfish Kakaban.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Stingless_Jellyfish_Kakaban.jpg/500px-Stingless_Jellyfish_Kakaban.jpg",
        "author": "Christinefb",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Stingless_Jellyfish_Kakaban.jpg"
      },
      {
        "file": "Escape to the Island.JPG",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Escape_to_the_Island.JPG/500px-Escape_to_the_Island.JPG",
        "author": "Toni Sitania",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Escape_to_the_Island.JPG"
      }
    ]
  },
  "Kepulauan Mentawai": {
    "region": "sumatera",
    "photos": []
  },
  "Kepulauan Togean": {
    "region": "sulawesi",
    "photos": [
      {
        "file": "COLLECTIE TROPENMUSEUM De Togian-eilanden (Schildpad-eilanden) TMnr 60018679.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/COLLECTIE_TROPENMUSEUM_De_Togian-eilanden_%28Schildpad-eilanden%29_TMnr_60018679.jpg/500px-COLLECTIE_TROPENMUSEUM_De_Togian-eilanden_%28Schildpad-eilanden%29_TMnr_60018679.jpg",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_De_Togian-eilanden_(Schildpad-eilanden)_TMnr_60018679.jpg"
      },
      {
        "file": "COLLECTIE TROPENMUSEUM S.S. Van Overstraten van de KPM bij de Togian-eilanden (Schildpad-eilanden) TMnr 60018678.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/COLLECTIE_TROPENMUSEUM_S.S._Van_Overstraten_van_de_KPM_bij_de_Togian-eilanden_%28Schildpad-eilanden%29_TMnr_60018678.jpg/500px-COLLECTIE_TROPENMUSEUM_S.S._Van_Overstraten_van_de_KPM_bij_de_Togian-eilanden_%28Schildpad-eilanden%29_TMnr_60018678.jpg",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_S.S._Van_Overstraten_van_de_KPM_bij_de_Togian-eilanden_(Schildpad-eilanden)_TMnr_60018678.jpg"
      }
    ]
  },
  "Krakatau": {
    "region": "jawa",
    "photos": [
      {
        "file": "John Webber Plate XVI The Fan Palm in the Island of Cracatoa.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/John_Webber_Plate_XVI_The_Fan_Palm_in_the_Island_of_Cracatoa.jpg/500px-John_Webber_Plate_XVI_The_Fan_Palm_in_the_Island_of_Cracatoa.jpg",
        "author": "John Webber (1751-1793)",
        "license": "Public domain",
        "licenseUrl": "",
        "page": "https://commons.wikimedia.org/wiki/File:John_Webber_Plate_XVI_The_Fan_Palm_in_the_Island_of_Cracatoa.jpg"
      }
    ]
  },
  "Kudus": {
    "region": "jawa",
    "photos": [
      {
        "file": "COLLECTIE TROPENMUSEUM De minaret bij de moskee van Koedoes TMnr 10016671.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/COLLECTIE_TROPENMUSEUM_De_minaret_bij_de_moskee_van_Koedoes_TMnr_10016671.jpg/500px-COLLECTIE_TROPENMUSEUM_De_minaret_bij_de_moskee_van_Koedoes_TMnr_10016671.jpg",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_De_minaret_bij_de_moskee_van_Koedoes_TMnr_10016671.jpg"
      },
      {
        "file": "COLLECTIE TROPENMUSEUM Gespleten poort bij de moskee van Koedoes TMnr 10016516.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/COLLECTIE_TROPENMUSEUM_Gespleten_poort_bij_de_moskee_van_Koedoes_TMnr_10016516.jpg/500px-COLLECTIE_TROPENMUSEUM_Gespleten_poort_bij_de_moskee_van_Koedoes_TMnr_10016516.jpg",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Gespleten_poort_bij_de_moskee_van_Koedoes_TMnr_10016516.jpg"
      }
    ]
  },
  "Kupang": {
    "region": "bali-nusa",
    "photos": [
      {
        "file": "Sasando Building Kupang.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ee/Sasando_Building_Kupang.jpg/500px-Sasando_Building_Kupang.jpg",
        "author": "Government of East Nusa Tenggara",
        "license": "Public domain",
        "licenseUrl": "",
        "page": "https://commons.wikimedia.org/wiki/File:Sasando_Building_Kupang.jpg"
      },
      {
        "file": "COLLECTIE TROPENMUSEUM Haven van Kupang TMnr 10010359.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/COLLECTIE_TROPENMUSEUM_Haven_van_Kupang_TMnr_10010359.jpg/500px-COLLECTIE_TROPENMUSEUM_Haven_van_Kupang_TMnr_10010359.jpg",
        "author": "Prof. A.A. (August Adriaan) Pulle (Fotograaf/photographer).",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Haven_van_Kupang_TMnr_10010359.jpg"
      }
    ]
  },
  "Kuta": {
    "region": "bali-nusa",
    "photos": []
  },
  "Labuan Bajo": {
    "region": "bali-nusa",
    "photos": [
      {
        "file": "Komodoairport1.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Komodoairport1.jpg/500px-Komodoairport1.jpg",
        "author": "Indonesian Ministry of Transportation",
        "license": "Public domain",
        "licenseUrl": "",
        "page": "https://commons.wikimedia.org/wiki/File:Komodoairport1.jpg"
      }
    ]
  },
  "Larantuka": {
    "region": "bali-nusa",
    "photos": [
      {
        "file": "COLLECTIE TROPENMUSEUM Gezicht vanaf Larantoeka op het eiland Adonara TMnr 10018570.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/COLLECTIE_TROPENMUSEUM_Gezicht_vanaf_Larantoeka_op_het_eiland_Adonara_TMnr_10018570.jpg/500px-COLLECTIE_TROPENMUSEUM_Gezicht_vanaf_Larantoeka_op_het_eiland_Adonara_TMnr_10018570.jpg",
        "author": "Dhr. C.C.F.M. (Charles Constant François Marie) Le Roux (Fotograaf/photographer).",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Gezicht_vanaf_Larantoeka_op_het_eiland_Adonara_TMnr_10018570.jpg"
      }
    ]
  },
  "Lasem": {
    "region": "jawa",
    "photos": []
  },
  "Lembah Baliem": {
    "region": "papua",
    "photos": [
      {
        "file": "Kurulu Village War Chief.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Kurulu_Village_War_Chief.jpg/500px-Kurulu_Village_War_Chief.jpg",
        "author": "Paul from Working and living in Jayapura (Papua Province) and Jakarta, Indonesia",
        "license": "CC BY 2.0",
        "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
        "page": "https://commons.wikimedia.org/wiki/File:Kurulu_Village_War_Chief.jpg"
      },
      {
        "file": "Yali man Baliem Valley Papua.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Yali_man_Baliem_Valley_Papua.jpg/500px-Yali_man_Baliem_Valley_Papua.jpg",
        "author": "710928003",
        "license": "CC BY 2.0",
        "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
        "page": "https://commons.wikimedia.org/wiki/File:Yali_man_Baliem_Valley_Papua.jpg"
      }
    ]
  },
  "Madiun": {
    "region": "jawa",
    "photos": []
  },
  "Magelang": {
    "region": "jawa",
    "photos": [
      {
        "file": "Magelang Borobudur.JPG",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Magelang_Borobudur.JPG/500px-Magelang_Borobudur.JPG",
        "author": "handy.darklord",
        "license": "CC0",
        "licenseUrl": "http://creativecommons.org/publicdomain/zero/1.0/deed.en",
        "page": "https://commons.wikimedia.org/wiki/File:Magelang_Borobudur.JPG"
      },
      {
        "file": "COLLECTIE TROPENMUSEUM Het raadhuis van Magelang TMnr 60046225.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/COLLECTIE_TROPENMUSEUM_Het_raadhuis_van_Magelang_TMnr_60046225.jpg/500px-COLLECTIE_TROPENMUSEUM_Het_raadhuis_van_Magelang_TMnr_60046225.jpg",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Het_raadhuis_van_Magelang_TMnr_60046225.jpg"
      }
    ]
  },
  "Makassar": {
    "region": "sulawesi",
    "photos": [
      {
        "file": "Makassar-Graha-Pena2.JPG",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Makassar-Graha-Pena2.JPG/500px-Makassar-Graha-Pena2.JPG",
        "author": "Lofor",
        "license": "CC BY 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Makassar-Graha-Pena2.JPG"
      },
      {
        "file": "Jalkot makassar.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Jalkot_makassar.jpg/500px-Jalkot_makassar.jpg",
        "author": "Jalkot makassar",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Jalkot_makassar.jpg"
      }
    ]
  },
  "Malang": {
    "region": "jawa",
    "photos": [
      {
        "file": "Candi Jago C.JPG",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/Candi_Jago_C.JPG/500px-Candi_Jago_C.JPG",
        "author": "ESCapade",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Candi_Jago_C.JPG"
      }
    ]
  },
  "Mamuju": {
    "region": "sulawesi",
    "photos": [
      {
        "file": "Mangiwang Mamuju Tengah.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/Mangiwang_Mamuju_Tengah.jpg/500px-Mangiwang_Mamuju_Tengah.jpg",
        "author": "Government of Mamuju Tengah, Indonesia",
        "license": "Public domain",
        "licenseUrl": "",
        "page": "https://commons.wikimedia.org/wiki/File:Mangiwang_Mamuju_Tengah.jpg"
      },
      {
        "file": "Bupati Mamuju Sitti Sutinah Suhardi.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/Bupati_Mamuju_Sitti_Sutinah_Suhardi.jpg/500px-Bupati_Mamuju_Sitti_Sutinah_Suhardi.jpg",
        "author": "Government of Mamuju regency, West Sulawesi, Indonesia",
        "license": "Public domain",
        "licenseUrl": "",
        "page": "https://commons.wikimedia.org/wiki/File:Bupati_Mamuju_Sitti_Sutinah_Suhardi.jpg"
      }
    ]
  },
  "Manado": {
    "region": "sulawesi",
    "photos": [
      {
        "file": "Manadofromsky.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/Manadofromsky.jpg/500px-Manadofromsky.jpg",
        "author": "en:Wihelmin",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "http://creativecommons.org/licenses/by-sa/3.0/",
        "page": "https://commons.wikimedia.org/wiki/File:Manadofromsky.jpg"
      }
    ]
  },
  "Manokwari": {
    "region": "papua",
    "photos": [
      {
        "file": "Manokwari City Mall.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Manokwari_City_Mall.jpg/500px-Manokwari_City_Mall.jpg",
        "author": "Nurdiansyah46",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Manokwari_City_Mall.jpg"
      },
      {
        "file": "Esau Sesa.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Esau_Sesa.jpg/500px-Esau_Sesa.jpg",
        "author": "Pemkab Manokwari",
        "license": "Public domain",
        "licenseUrl": "",
        "page": "https://commons.wikimedia.org/wiki/File:Esau_Sesa.jpg"
      }
    ]
  },
  "Maros-Pangkep": {
    "region": "sulawesi",
    "photos": [
      {
        "file": "COLLECTIE TROPENMUSEUM De waterval bij Maros TMnr 3728-860.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/COLLECTIE_TROPENMUSEUM_De_waterval_bij_Maros_TMnr_3728-860.jpg/500px-COLLECTIE_TROPENMUSEUM_De_waterval_bij_Maros_TMnr_3728-860.jpg",
        "author": "Josias Cornelis Rappard",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_De_waterval_bij_Maros_TMnr_3728-860.jpg"
      }
    ]
  },
  "Mataram": {
    "region": "bali-nusa",
    "photos": [
      {
        "file": "Hubbul Wathan Islamic Center.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/Hubbul_Wathan_Islamic_Center.jpg/500px-Hubbul_Wathan_Islamic_Center.jpg",
        "author": "Government of West Nusa Tenggara province",
        "license": "Public domain",
        "licenseUrl": "",
        "page": "https://commons.wikimedia.org/wiki/File:Hubbul_Wathan_Islamic_Center.jpg"
      }
    ]
  },
  "Maumere": {
    "region": "bali-nusa",
    "photos": [
      {
        "file": "Jesus Statue Maumere.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/b/b3/Jesus_Statue_Maumere.jpg",
        "author": "(작가 표시 없음)",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "http://creativecommons.org/licenses/by-sa/3.0/",
        "page": "https://commons.wikimedia.org/wiki/File:Jesus_Statue_Maumere.jpg"
      }
    ]
  },
  "Medan": {
    "region": "sumatera",
    "photos": [
      {
        "file": "COLLECTIE TROPENMUSEUM De Sultan van Deli Amaluddin Sani Perkasa Alam Shah tijdens het verlaten van de Grote Moskee op de dag van zijn kroning TMnr 60027930.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/COLLECTIE_TROPENMUSEUM_De_Sultan_van_Deli_Amaluddin_Sani_Perkasa_Alam_Shah_tijdens_het_verlaten_van_de_Grote_Moskee_op_de_dag_van_zijn_kroning_TMnr_60027930.jpg/500px-COLLECTIE_TROPENMUSEUM_De_Sultan_van_Deli_Amaluddin_Sani_Perkasa_Alam_Shah_tijdens_het_verlaten_van_de_Grote_Moskee_op_de_dag_van_zijn_kroning_TMnr_60027930.jpg",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_De_Sultan_van_Deli_Amaluddin_Sani_Perkasa_Alam_Shah_tijdens_het_verlaten_van_de_Grote_Moskee_op_de_dag_van_zijn_kroning_TMnr_60027930.jpg"
      },
      {
        "file": "COLLECTIE TROPENMUSEUM Menigte voor het Istana Maimun het paleis van de Sultan van Deli TMnr 60027931.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/COLLECTIE_TROPENMUSEUM_Menigte_voor_het_Istana_Maimun_het_paleis_van_de_Sultan_van_Deli_TMnr_60027931.jpg/500px-COLLECTIE_TROPENMUSEUM_Menigte_voor_het_Istana_Maimun_het_paleis_van_de_Sultan_van_Deli_TMnr_60027931.jpg",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Menigte_voor_het_Istana_Maimun_het_paleis_van_de_Sultan_van_Deli_TMnr_60027931.jpg"
      }
    ]
  },
  "Merauke": {
    "region": "papua",
    "photos": []
  },
  "Muara Jambi": {
    "region": "sumatera",
    "photos": []
  },
  "Muntilan": {
    "region": "jawa",
    "photos": []
  },
  "Nusa Penida": {
    "region": "bali-nusa",
    "photos": [
      {
        "file": "Nusa Penida - panoramio cropped.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/Nusa_Penida_-_panoramio_cropped.jpg/500px-Nusa_Penida_-_panoramio_cropped.jpg",
        "author": "Roland Unger",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Nusa_Penida_-_panoramio_cropped.jpg"
      }
    ]
  },
  "Nusantara": {
    "region": "kalimantan",
    "photos": [
      {
        "file": "Indonesia nusantara oli 20240219 lrg.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/Indonesia_nusantara_oli_20240219_lrg.jpg/500px-Indonesia_nusantara_oli_20240219_lrg.jpg",
        "author": "NASA Earth Observatory images by Michala Garrison, using Landsat data from the U.S. Geological Survey",
        "license": "Public domain",
        "licenseUrl": "",
        "page": "https://commons.wikimedia.org/wiki/File:Indonesia_nusantara_oli_20240219_lrg.jpg"
      },
      {
        "file": "KP-IKN Nusantara city.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/KP-IKN_Nusantara_city.jpg/500px-KP-IKN_Nusantara_city.jpg",
        "author": "Nusantara city gov. office, page 14",
        "license": "Public domain",
        "licenseUrl": "",
        "page": "https://commons.wikimedia.org/wiki/File:KP-IKN_Nusantara_city.jpg"
      }
    ]
  },
  "Padang": {
    "region": "sumatera",
    "photos": [
      {
        "file": "Tour de Singkarak 2013 (2).jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/Tour_de_Singkarak_2013_%282%29.jpg/500px-Tour_de_Singkarak_2013_%282%29.jpg",
        "author": "https://www.flickr.com/people/60933389@N06/",
        "license": "CC BY 2.0",
        "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
        "page": "https://commons.wikimedia.org/wiki/File:Tour_de_Singkarak_2013_(2).jpg"
      }
    ]
  },
  "Pagaruyung": {
    "region": "sumatera",
    "photos": [
      {
        "file": "Pagaruyung palace at night Batusangkar.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Pagaruyung_palace_at_night_Batusangkar.jpg/500px-Pagaruyung_palace_at_night_Batusangkar.jpg",
        "author": "Official Website of Ministry of Foreign Affairs Indonesia",
        "license": "Public domain",
        "licenseUrl": "",
        "page": "https://commons.wikimedia.org/wiki/File:Pagaruyung_palace_at_night_Batusangkar.jpg"
      }
    ]
  },
  "Palangkaraya": {
    "region": "kalimantan",
    "photos": []
  },
  "Palembang": {
    "region": "sumatera",
    "photos": [
      {
        "file": "Bird's eye view of Palembang.JPG",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Bird%27s_eye_view_of_Palembang.JPG/500px-Bird%27s_eye_view_of_Palembang.JPG",
        "author": "Unknown author Unknown author",
        "license": "Public domain",
        "licenseUrl": "",
        "page": "https://commons.wikimedia.org/wiki/File:Bird%27s_eye_view_of_Palembang.JPG"
      },
      {
        "file": "COLLECTIE TROPENMUSEUM De rivier de Musi bij Palembang TMnr 5426-8.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/COLLECTIE_TROPENMUSEUM_De_rivier_de_Musi_bij_Palembang_TMnr_5426-8.jpg/500px-COLLECTIE_TROPENMUSEUM_De_rivier_de_Musi_bij_Palembang_TMnr_5426-8.jpg",
        "author": "Johannes Ykema (Uitgever).",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_De_rivier_de_Musi_bij_Palembang_TMnr_5426-8.jpg"
      }
    ]
  },
  "Palu": {
    "region": "sulawesi",
    "photos": [
      {
        "file": "Cocoa processing factory in Palu.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Cocoa_processing_factory_in_Palu.jpg/500px-Cocoa_processing_factory_in_Palu.jpg",
        "author": "Kementerian Perdagangan dan Industri Republik Indonesia",
        "license": "Public domain",
        "licenseUrl": "",
        "page": "https://commons.wikimedia.org/wiki/File:Cocoa_processing_factory_in_Palu.jpg"
      }
    ]
  },
  "Pamekasan": {
    "region": "jawa",
    "photos": []
  },
  "Pangkalpinang": {
    "region": "sumatera",
    "photos": [
      {
        "file": "Pasir-padi.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Pasir-padi.jpg/500px-Pasir-padi.jpg",
        "author": "City Government of Pangkal Pinang",
        "license": "Public domain",
        "licenseUrl": "",
        "page": "https://commons.wikimedia.org/wiki/File:Pasir-padi.jpg"
      }
    ]
  },
  "Pati": {
    "region": "jawa",
    "photos": [
      {
        "file": "COLLECTIE TROPENMUSEUM Moskee Indonesië TMnr 10016740.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/COLLECTIE_TROPENMUSEUM_Moskee_Indonesi%C3%AB_TMnr_10016740.jpg/500px-COLLECTIE_TROPENMUSEUM_Moskee_Indonesi%C3%AB_TMnr_10016740.jpg",
        "author": "H. (Hendrik) Veen (Fotograaf/photographer).",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Moskee_Indonesi%C3%AB_TMnr_10016740.jpg"
      }
    ]
  },
  "Pekanbaru": {
    "region": "sumatera",
    "photos": [
      {
        "file": "Pekanbaru 2019.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Pekanbaru_2019.jpg/500px-Pekanbaru_2019.jpg",
        "author": "Investment and Integrated Services Office of the City Government of Pekanbaru",
        "license": "Public domain",
        "licenseUrl": "",
        "page": "https://commons.wikimedia.org/wiki/File:Pekanbaru_2019.jpg"
      }
    ]
  },
  "Pematangsiantar": {
    "region": "sumatera",
    "photos": [
      {
        "file": "Taman Hewan Pematang Siantar (1).JPG",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Taman_Hewan_Pematang_Siantar_%281%29.JPG/500px-Taman_Hewan_Pematang_Siantar_%281%29.JPG",
        "author": "Wagino 20100516",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Taman_Hewan_Pematang_Siantar_(1).JPG"
      },
      {
        "file": "COLLECTIE TROPENMUSEUM Luchtfoto van Siantar TMnr 10015093.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/COLLECTIE_TROPENMUSEUM_Luchtfoto_van_Siantar_TMnr_10015093.jpg/500px-COLLECTIE_TROPENMUSEUM_Luchtfoto_van_Siantar_TMnr_10015093.jpg",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Luchtfoto_van_Siantar_TMnr_10015093.jpg"
      }
    ]
  },
  "Pontianak": {
    "region": "kalimantan",
    "photos": [
      {
        "file": "COLLECTIE TROPENMUSEUM Gekapte sagostammen worden stroomafwaarts op de rivier bij Pontianak gevlot West-Borneo TMnr 10011237.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/COLLECTIE_TROPENMUSEUM_Gekapte_sagostammen_worden_stroomafwaarts_op_de_rivier_bij_Pontianak_gevlot_West-Borneo_TMnr_10011237.jpg/500px-COLLECTIE_TROPENMUSEUM_Gekapte_sagostammen_worden_stroomafwaarts_op_de_rivier_bij_Pontianak_gevlot_West-Borneo_TMnr_10011237.jpg",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Gekapte_sagostammen_worden_stroomafwaarts_op_de_rivier_bij_Pontianak_gevlot_West-Borneo_TMnr_10011237.jpg"
      },
      {
        "file": "COLLECTIE TROPENMUSEUM Straatgezicht met watertonnen TMnr 60014537.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/COLLECTIE_TROPENMUSEUM_Straatgezicht_met_watertonnen_TMnr_60014537.jpg/500px-COLLECTIE_TROPENMUSEUM_Straatgezicht_met_watertonnen_TMnr_60014537.jpg",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Straatgezicht_met_watertonnen_TMnr_60014537.jpg"
      }
    ]
  },
  "Prambanan": {
    "region": "jawa",
    "photos": [
      {
        "file": "COLLECTIE TROPENMUSEUM Beeld van Shiva als Mahadeva op de Candi Lara Jonggrang oftewel het Prambanan tempelcomplex TMnr 60046668.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/COLLECTIE_TROPENMUSEUM_Beeld_van_Shiva_als_Mahadeva_op_de_Candi_Lara_Jonggrang_oftewel_het_Prambanan_tempelcomplex_TMnr_60046668.jpg/500px-COLLECTIE_TROPENMUSEUM_Beeld_van_Shiva_als_Mahadeva_op_de_Candi_Lara_Jonggrang_oftewel_het_Prambanan_tempelcomplex_TMnr_60046668.jpg",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Beeld_van_Shiva_als_Mahadeva_op_de_Candi_Lara_Jonggrang_oftewel_het_Prambanan_tempelcomplex_TMnr_60046668.jpg"
      },
      {
        "file": "COLLECTIE TROPENMUSEUM De Candi Lara Jonggrang oftewel het Prambanan tempelcomplex TMnr 20026907.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/COLLECTIE_TROPENMUSEUM_De_Candi_Lara_Jonggrang_oftewel_het_Prambanan_tempelcomplex_TMnr_20026907.jpg/500px-COLLECTIE_TROPENMUSEUM_De_Candi_Lara_Jonggrang_oftewel_het_Prambanan_tempelcomplex_TMnr_20026907.jpg",
        "author": "Boy Lawson",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_De_Candi_Lara_Jonggrang_oftewel_het_Prambanan_tempelcomplex_TMnr_20026907.jpg"
      }
    ]
  },
  "Probolinggo": {
    "region": "jawa",
    "photos": [
      {
        "file": "Bupati Probolinggo Raden Toemenggoeng Djojonegoro.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/Bupati_Probolinggo_Raden_Toemenggoeng_Djojonegoro.jpg/500px-Bupati_Probolinggo_Raden_Toemenggoeng_Djojonegoro.jpg",
        "author": "Unknown author Unknown author",
        "license": "CC BY 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Bupati_Probolinggo_Raden_Toemenggoeng_Djojonegoro.jpg"
      },
      {
        "file": "COLLECTIE TROPENMUSEUM Feestelijke optocht tijdens een Javaanse bruiloft te Probolinggo Oost-Java TMnr 10002996.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/COLLECTIE_TROPENMUSEUM_Feestelijke_optocht_tijdens_een_Javaanse_bruiloft_te_Probolinggo_Oost-Java_TMnr_10002996.jpg/500px-COLLECTIE_TROPENMUSEUM_Feestelijke_optocht_tijdens_een_Javaanse_bruiloft_te_Probolinggo_Oost-Java_TMnr_10002996.jpg",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Feestelijke_optocht_tijdens_een_Javaanse_bruiloft_te_Probolinggo_Oost-Java_TMnr_10002996.jpg"
      }
    ]
  },
  "Pulau Belitung": {
    "region": "sumatera",
    "photos": []
  },
  "Pulau Komodo": {
    "region": "bali-nusa",
    "photos": []
  },
  "Pulau Mansinam": {
    "region": "papua",
    "photos": []
  },
  "Pulau Nias": {
    "region": "sumatera",
    "photos": [
      {
        "file": "Lompat Batu Nias.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Lompat_Batu_Nias.jpg/500px-Lompat_Batu_Nias.jpg",
        "author": "Doni Ismanto",
        "license": "CC BY 2.0",
        "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
        "page": "https://commons.wikimedia.org/wiki/File:Lompat_Batu_Nias.jpg"
      },
      {
        "file": "COLLECTIE TROPENMUSEUM Een familie op Nias TMnr 10005771.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/COLLECTIE_TROPENMUSEUM_Een_familie_op_Nias_TMnr_10005771.jpg/500px-COLLECTIE_TROPENMUSEUM_Een_familie_op_Nias_TMnr_10005771.jpg",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Een_familie_op_Nias_TMnr_10005771.jpg"
      }
    ]
  },
  "Pulau Sabu": {
    "region": "bali-nusa",
    "photos": []
  },
  "Pulau Sumba": {
    "region": "bali-nusa",
    "photos": [
      {
        "file": "Faroe.sumba.3.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Faroe.sumba.3.jpg/500px-Faroe.sumba.3.jpg",
        "author": "Erik Christensen",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "http://creativecommons.org/licenses/by-sa/3.0/",
        "page": "https://commons.wikimedia.org/wiki/File:Faroe.sumba.3.jpg"
      },
      {
        "file": "COLLECTIE TROPENMUSEUM Drie aanzienlijke vrouwen gekleed in een danskostuum Kanangar Soemba TMnr 10005880.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/COLLECTIE_TROPENMUSEUM_Drie_aanzienlijke_vrouwen_gekleed_in_een_danskostuum_Kanangar_Soemba_TMnr_10005880.jpg/500px-COLLECTIE_TROPENMUSEUM_Drie_aanzienlijke_vrouwen_gekleed_in_een_danskostuum_Kanangar_Soemba_TMnr_10005880.jpg",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Drie_aanzienlijke_vrouwen_gekleed_in_een_danskostuum_Kanangar_Soemba_TMnr_10005880.jpg"
      }
    ]
  },
  "Pulau Weh": {
    "region": "sumatera",
    "photos": [
      {
        "file": "COLLECTIE TROPENMUSEUM Marineschepen in de haven van Sabang op het eiland We TMnr 60011324.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/COLLECTIE_TROPENMUSEUM_Marineschepen_in_de_haven_van_Sabang_op_het_eiland_We_TMnr_60011324.jpg/500px-COLLECTIE_TROPENMUSEUM_Marineschepen_in_de_haven_van_Sabang_op_het_eiland_We_TMnr_60011324.jpg",
        "author": "Christiaan Benjamin Nieuwenhuis",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Marineschepen_in_de_haven_van_Sabang_op_het_eiland_We_TMnr_60011324.jpg"
      }
    ]
  },
  "Pura Besakih": {
    "region": "bali-nusa",
    "photos": [
      {
        "file": "Mother Temple of Besakih.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Mother_Temple_of_Besakih.jpg/500px-Mother_Temple_of_Besakih.jpg",
        "author": "Xeviro at English Wikipedia",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "http://creativecommons.org/licenses/by-sa/3.0/",
        "page": "https://commons.wikimedia.org/wiki/File:Mother_Temple_of_Besakih.jpg"
      },
      {
        "file": "Presiden Jokowi Didampingi Gubernur Koster di Pura Besakih untuk peresmian.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Presiden_Jokowi_Didampingi_Gubernur_Koster_di_Pura_Besakih_untuk_peresmian.jpg/500px-Presiden_Jokowi_Didampingi_Gubernur_Koster_di_Pura_Besakih_untuk_peresmian.jpg",
        "author": "Bali Post",
        "license": "CC0",
        "licenseUrl": "http://creativecommons.org/publicdomain/zero/1.0/deed.en",
        "page": "https://commons.wikimedia.org/wiki/File:Presiden_Jokowi_Didampingi_Gubernur_Koster_di_Pura_Besakih_untuk_peresmian.jpg"
      }
    ]
  },
  "Purwokerto": {
    "region": "jawa",
    "photos": [
      {
        "file": "Alun - Alun Purwokerto 1947. (Berwarna).jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Alun_-_Alun_Purwokerto_1947._%28Berwarna%29.jpg/500px-Alun_-_Alun_Purwokerto_1947._%28Berwarna%29.jpg",
        "author": "Photografer : Hugo Wilmar. Colouring by= Van Coolwijk,D.",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Alun_-_Alun_Purwokerto_1947._(Berwarna).jpg"
      },
      {
        "file": "Alun - Alun di Purwokerto, 1931.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Alun_-_Alun_di_Purwokerto%2C_1931.jpg/500px-Alun_-_Alun_di_Purwokerto%2C_1931.jpg",
        "author": "Photografer : Dr. W.G.N. (Wicher Gosen Nicolaas) van der Sleen.",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Alun_-_Alun_di_Purwokerto,_1931.jpg"
      }
    ]
  },
  "Putussibau": {
    "region": "kalimantan",
    "photos": [
      {
        "file": "Kapuas Bridge Putussibau.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Kapuas_Bridge_Putussibau.jpg/500px-Kapuas_Bridge_Putussibau.jpg",
        "author": "Lookmie",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Kapuas_Bridge_Putussibau.jpg"
      },
      {
        "file": "Construction in Putussibau.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Construction_in_Putussibau.jpg/500px-Construction_in_Putussibau.jpg",
        "author": "Government of Kapuas Hulu Regency",
        "license": "Public domain",
        "licenseUrl": "",
        "page": "https://commons.wikimedia.org/wiki/File:Construction_in_Putussibau.jpg"
      }
    ]
  },
  "Raja Ampat": {
    "region": "papua",
    "photos": []
  },
  "Sade": {
    "region": "bali-nusa",
    "photos": [
      {
        "file": "Lombok's Sasak Tribe Traditional Cloth.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Lombok%27s_Sasak_Tribe_Traditional_Cloth.jpg/500px-Lombok%27s_Sasak_Tribe_Traditional_Cloth.jpg",
        "author": "First Lombok Tour",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Lombok%27s_Sasak_Tribe_Traditional_Cloth.jpg"
      },
      {
        "file": "COLLECTIE TROPENMUSEUM Groep dansers uit Sasak TMnr 10004747.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/COLLECTIE_TROPENMUSEUM_Groep_dansers_uit_Sasak_TMnr_10004747.jpg/500px-COLLECTIE_TROPENMUSEUM_Groep_dansers_uit_Sasak_TMnr_10004747.jpg",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Groep_dansers_uit_Sasak_TMnr_10004747.jpg"
      }
    ]
  },
  "Salatiga": {
    "region": "jawa",
    "photos": [
      {
        "file": "Mount Telomoyo.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/0/0a/Road_to_the_summit_of_Mount_Telomoyo.jpg",
        "author": "Andi Widhibrata ( Widhibrata at en.wikipedia )",
        "license": "Public domain",
        "licenseUrl": "",
        "page": "https://commons.wikimedia.org/wiki/File:Road_to_the_summit_of_Mount_Telomoyo.jpg"
      },
      {
        "file": "COLLECTIE TROPENMUSEUM De Toetangsche weg te Salatiga Midden-Java TMnr 10007722.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ee/COLLECTIE_TROPENMUSEUM_De_Toetangsche_weg_te_Salatiga_Midden-Java_TMnr_10007722.jpg/500px-COLLECTIE_TROPENMUSEUM_De_Toetangsche_weg_te_Salatiga_Midden-Java_TMnr_10007722.jpg",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_De_Toetangsche_weg_te_Salatiga_Midden-Java_TMnr_10007722.jpg"
      }
    ]
  },
  "Samarinda": {
    "region": "kalimantan",
    "photos": [
      {
        "file": "Panoramic Samarinda City From Islamic Centre Tower - panoramio (cropped).jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/Panoramic_Samarinda_City_From_Islamic_Centre_Tower_-_panoramio_%28cropped%29.jpg/500px-Panoramic_Samarinda_City_From_Islamic_Centre_Tower_-_panoramio_%28cropped%29.jpg",
        "author": "Kurniawan Dwi",
        "license": "CC BY 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Panoramic_Samarinda_City_From_Islamic_Centre_Tower_-_panoramio_(cropped).jpg"
      }
    ]
  },
  "Sangiran": {
    "region": "jawa",
    "photos": []
  },
  "Saparua": {
    "region": "maluku",
    "photos": [
      {
        "file": "Duurstede Fort, Saparua, Ambon - Indonesia.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/Duurstede_Fort%2C_Saparua%2C_Ambon_-_Indonesia.jpg/500px-Duurstede_Fort%2C_Saparua%2C_Ambon_-_Indonesia.jpg",
        "author": "Dani wid",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Duurstede_Fort,_Saparua,_Ambon_-_Indonesia.jpg"
      },
      {
        "file": "Saparua from Duurstede Fort.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Saparua_from_Duurstede_Fort.jpg/500px-Saparua_from_Duurstede_Fort.jpg",
        "author": "Dani wid",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Saparua_from_Duurstede_Fort.jpg"
      }
    ]
  },
  "Sawahlunto": {
    "region": "sumatera",
    "photos": [
      {
        "file": "Masjid-agung-sawahlunto.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Masjid-agung-sawahlunto.jpg/500px-Masjid-agung-sawahlunto.jpg",
        "author": "id;user:Mamasamala",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Masjid-agung-sawahlunto.jpg"
      },
      {
        "file": "Padang Panjang Train - Sawahlunto.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Padang_Panjang_Train_-_Sawahlunto.jpg/500px-Padang_Panjang_Train_-_Sawahlunto.jpg",
        "author": "https://www.flickr.com/photos/mightybowo/",
        "license": "CC BY-SA 2.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0",
        "page": "https://commons.wikimedia.org/wiki/File:Padang_Panjang_Train_-_Sawahlunto.jpg"
      }
    ]
  },
  "Semarang": {
    "region": "jawa",
    "photos": [
      {
        "file": "COLLECTIE TROPENMUSEUM Chinees huis in Semarang TMnr 60022048.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/COLLECTIE_TROPENMUSEUM_Chinees_huis_in_Semarang_TMnr_60022048.jpg/500px-COLLECTIE_TROPENMUSEUM_Chinees_huis_in_Semarang_TMnr_60022048.jpg",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Chinees_huis_in_Semarang_TMnr_60022048.jpg"
      },
      {
        "file": "COLLECTIE TROPENMUSEUM Het hoofdkantoor van de Nederlandsch-Indische Spoorweg Maatschappij (NIS) in Semarang TMnr 10032316.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/COLLECTIE_TROPENMUSEUM_Het_hoofdkantoor_van_de_Nederlandsch-Indische_Spoorweg_Maatschappij_%28NIS%29_in_Semarang_TMnr_10032316.jpg/500px-COLLECTIE_TROPENMUSEUM_Het_hoofdkantoor_van_de_Nederlandsch-Indische_Spoorweg_Maatschappij_%28NIS%29_in_Semarang_TMnr_10032316.jpg",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Het_hoofdkantoor_van_de_Nederlandsch-Indische_Spoorweg_Maatschappij_(NIS)_in_Semarang_TMnr_10032316.jpg"
      }
    ]
  },
  "Serang": {
    "region": "jawa",
    "photos": []
  },
  "Sidoarjo": {
    "region": "jawa",
    "photos": [
      {
        "file": "Alun-alun Sidoarjo.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Alun-alun_Sidoarjo.jpg/500px-Alun-alun_Sidoarjo.jpg",
        "author": "Government of Sidoarjo",
        "license": "Public domain",
        "licenseUrl": "",
        "page": "https://commons.wikimedia.org/wiki/File:Alun-alun_Sidoarjo.jpg"
      }
    ]
  },
  "Singkawang": {
    "region": "kalimantan",
    "photos": []
  },
  "Soe": {
    "region": "bali-nusa",
    "photos": []
  },
  "Sorong": {
    "region": "papua",
    "photos": [
      {
        "file": "Ramayana-Mall-Sorong.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/Ramayana-Mall-Sorong.jpg/500px-Ramayana-Mall-Sorong.jpg",
        "author": "Nurdiansyah46",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Ramayana-Mall-Sorong.jpg"
      }
    ]
  },
  "Sukabumi": {
    "region": "jawa",
    "photos": []
  },
  "Surabaya": {
    "region": "jawa",
    "photos": [
      {
        "file": "COLLECTIE TROPENMUSEUM De Pasar Besar met op de achtergrond het spoorwegviaduct de zogenoemde Hogeweg Soerabaja TMnr 10014832.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/COLLECTIE_TROPENMUSEUM_De_Pasar_Besar_met_op_de_achtergrond_het_spoorwegviaduct_de_zogenoemde_Hogeweg_Soerabaja_TMnr_10014832.jpg/500px-COLLECTIE_TROPENMUSEUM_De_Pasar_Besar_met_op_de_achtergrond_het_spoorwegviaduct_de_zogenoemde_Hogeweg_Soerabaja_TMnr_10014832.jpg",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_De_Pasar_Besar_met_op_de_achtergrond_het_spoorwegviaduct_de_zogenoemde_Hogeweg_Soerabaja_TMnr_10014832.jpg"
      },
      {
        "file": "COLLECTIE TROPENMUSEUM De achterzijde van het residentiehuis langs de Kali Ketabang Soerabaja TMnr 60005128.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/COLLECTIE_TROPENMUSEUM_De_achterzijde_van_het_residentiehuis_langs_de_Kali_Ketabang_Soerabaja_TMnr_60005128.jpg/500px-COLLECTIE_TROPENMUSEUM_De_achterzijde_van_het_residentiehuis_langs_de_Kali_Ketabang_Soerabaja_TMnr_60005128.jpg",
        "author": "H. Salzwedel (Fotograaf/photographer).",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_De_achterzijde_van_het_residentiehuis_langs_de_Kali_Ketabang_Soerabaja_TMnr_60005128.jpg"
      }
    ]
  },
  "Surakarta": {
    "region": "jawa",
    "photos": []
  },
  "Takengon": {
    "region": "sumatera",
    "photos": []
  },
  "Taman Nasional Lorentz": {
    "region": "papua",
    "photos": []
  },
  "Tana Toraja": {
    "region": "sulawesi",
    "photos": [
      {
        "file": "COLLECTIE TROPENMUSEUM Dodenfeest in Toraja Celebes TMnr 10003185.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ee/COLLECTIE_TROPENMUSEUM_Dodenfeest_in_Toraja_Celebes_TMnr_10003185.jpg/500px-COLLECTIE_TROPENMUSEUM_Dodenfeest_in_Toraja_Celebes_TMnr_10003185.jpg",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Dodenfeest_in_Toraja_Celebes_TMnr_10003185.jpg"
      },
      {
        "file": "COLLECTIE TROPENMUSEUM Schaalmodellen van Toraja huizen Celebes TMnr 60028782.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/COLLECTIE_TROPENMUSEUM_Schaalmodellen_van_Toraja_huizen_Celebes_TMnr_60028782.jpg/500px-COLLECTIE_TROPENMUSEUM_Schaalmodellen_van_Toraja_huizen_Celebes_TMnr_60028782.jpg",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Schaalmodellen_van_Toraja_huizen_Celebes_TMnr_60028782.jpg"
      }
    ]
  },
  "Tangerang": {
    "region": "jawa",
    "photos": []
  },
  "Tangkuban Perahu": {
    "region": "jawa",
    "photos": []
  },
  "Tanjung Puting": {
    "region": "kalimantan",
    "photos": []
  },
  "Tanjung Selor": {
    "region": "kalimantan",
    "photos": [
      {
        "file": "Masjid Agung Tanjung Selor.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Masjid_Agung_Tanjung_Selor.jpg/500px-Masjid_Agung_Tanjung_Selor.jpg",
        "author": "Government of Bulungan Regency",
        "license": "Public domain",
        "licenseUrl": "",
        "page": "https://commons.wikimedia.org/wiki/File:Masjid_Agung_Tanjung_Selor.jpg"
      }
    ]
  },
  "Tanjungpinang": {
    "region": "sumatera",
    "photos": [
      {
        "file": "Muhammad Arif, MP of Tanjungpinang (2004-2021).jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Muhammad_Arif%2C_MP_of_Tanjungpinang_%282004-2021%29.jpg/500px-Muhammad_Arif%2C_MP_of_Tanjungpinang_%282004-2021%29.jpg",
        "author": "City Parliament of Tanjung Pinang, Government of Republic of Indonesia",
        "license": "Public domain",
        "licenseUrl": "",
        "page": "https://commons.wikimedia.org/wiki/File:Muhammad_Arif,_MP_of_Tanjungpinang_(2004-2021).jpg"
      }
    ]
  },
  "Tarakan": {
    "region": "kalimantan",
    "photos": [
      {
        "file": "Tarakan landing (AWM 090812).jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/Tarakan_landing_%28AWM_090812%29.jpg/500px-Tarakan_landing_%28AWM_090812%29.jpg",
        "author": "not stated",
        "license": "Public domain",
        "licenseUrl": "",
        "page": "https://commons.wikimedia.org/wiki/File:Tarakan_landing_(AWM_090812).jpg"
      },
      {
        "file": "COLLECTIE TROPENMUSEUM Afscheepsteiger Tarakan 14 TMnr 10010382.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/COLLECTIE_TROPENMUSEUM_Afscheepsteiger_Tarakan_14_TMnr_10010382.jpg/500px-COLLECTIE_TROPENMUSEUM_Afscheepsteiger_Tarakan_14_TMnr_10010382.jpg",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Afscheepsteiger_Tarakan_14_TMnr_10010382.jpg"
      }
    ]
  },
  "Tarutung": {
    "region": "sumatera",
    "photos": [
      {
        "file": "COLLECTIE TROPENMUSEUM Een overstroming van de Silindoengvlakte bij Taroetoeng TMnr 60021568.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/COLLECTIE_TROPENMUSEUM_Een_overstroming_van_de_Silindoengvlakte_bij_Taroetoeng_TMnr_60021568.jpg/500px-COLLECTIE_TROPENMUSEUM_Een_overstroming_van_de_Silindoengvlakte_bij_Taroetoeng_TMnr_60021568.jpg",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Een_overstroming_van_de_Silindoengvlakte_bij_Taroetoeng_TMnr_60021568.jpg"
      }
    ]
  },
  "Tasikmalaya": {
    "region": "jawa",
    "photos": [
      {
        "file": "Mt galunggung volcanic crater.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Mt_galunggung_volcanic_crater.jpg/500px-Mt_galunggung_volcanic_crater.jpg",
        "author": "Rossche",
        "license": "CC BY 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Mt_galunggung_volcanic_crater.jpg"
      },
      {
        "file": "COLLECTIE TROPENMUSEUM Het kantoor van de assistent-resident in Tasikmalaja TMnr 10015379.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/COLLECTIE_TROPENMUSEUM_Het_kantoor_van_de_assistent-resident_in_Tasikmalaja_TMnr_10015379.jpg/500px-COLLECTIE_TROPENMUSEUM_Het_kantoor_van_de_assistent-resident_in_Tasikmalaja_TMnr_10015379.jpg",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Het_kantoor_van_de_assistent-resident_in_Tasikmalaja_TMnr_10015379.jpg"
      }
    ]
  },
  "Tenganan": {
    "region": "bali-nusa",
    "photos": [
      {
        "file": "Gerinsing wayang,40 x 200 cm from the collection of Balique Arts of Indonesia..JPG",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Gerinsing_wayang%2C40_x_200_cm_from_the_collection_of_Balique_Arts_of_Indonesia..JPG/500px-Gerinsing_wayang%2C40_x_200_cm_from_the_collection_of_Balique_Arts_of_Indonesia..JPG",
        "author": "Chris Hazzard",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Gerinsing_wayang,40_x_200_cm_from_the_collection_of_Balique_Arts_of_Indonesia..JPG"
      },
      {
        "file": "Tenganan 1981 0017.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Tenganan_1981_0017.jpg/500px-Tenganan_1981_0017.jpg",
        "author": "Chris Hazzard",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Tenganan_1981_0017.jpg"
      }
    ]
  },
  "Ternate": {
    "region": "maluku",
    "photos": [
      {
        "file": "COLLECTIE TROPENMUSEUM Ingang van het paleis van de sultan van Ternate TMnr 60018584.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/COLLECTIE_TROPENMUSEUM_Ingang_van_het_paleis_van_de_sultan_van_Ternate_TMnr_60018584.jpg/500px-COLLECTIE_TROPENMUSEUM_Ingang_van_het_paleis_van_de_sultan_van_Ternate_TMnr_60018584.jpg",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Ingang_van_het_paleis_van_de_sultan_van_Ternate_TMnr_60018584.jpg"
      },
      {
        "file": "COLLECTIE TROPENMUSEUM Uitzicht op Ternate TMnr 3728-865.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/COLLECTIE_TROPENMUSEUM_Uitzicht_op_Ternate_TMnr_3728-865.jpg/500px-COLLECTIE_TROPENMUSEUM_Uitzicht_op_Ternate_TMnr_3728-865.jpg",
        "author": "Jhr. J.C. (Josias Cornelis) Rappard (Schilder).",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Uitzicht_op_Ternate_TMnr_3728-865.jpg"
      }
    ]
  },
  "Timika": {
    "region": "papua",
    "photos": [
      {
        "file": "Bandar Udara Mozes Kilangin Timika.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/Bandar_Udara_Mozes_Kilangin_Timika.jpg/500px-Bandar_Udara_Mozes_Kilangin_Timika.jpg",
        "author": "Rhani Lilianti Kata",
        "license": "CC BY 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Bandar_Udara_Mozes_Kilangin_Timika.jpg"
      },
      {
        "file": "Parking Area Moses Kilangin International Airport, Timika-Papua (Upload by Richard Erari).jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Parking_Area_Moses_Kilangin_International_Airport%2C_Timika-Papua_%28Upload_by_Richard_Erari%29.jpg/500px-Parking_Area_Moses_Kilangin_International_Airport%2C_Timika-Papua_%28Upload_by_Richard_Erari%29.jpg",
        "author": "Richarderari",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Parking_Area_Moses_Kilangin_International_Airport,_Timika-Papua_(Upload_by_Richard_Erari).jpg"
      }
    ]
  },
  "Tobelo": {
    "region": "maluku",
    "photos": [
      {
        "file": "Government office areal on north halmahera - panoramio.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Government_office_areal_on_north_halmahera_-_panoramio.jpg/500px-Government_office_areal_on_north_halmahera_-_panoramio.jpg",
        "author": "Marcky Bolung",
        "license": "CC BY 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Government_office_areal_on_north_halmahera_-_panoramio.jpg"
      },
      {
        "file": "COLLECTIE TROPENMUSEUM Halmahera Pakata Tobelo (voorgrond) en rorehe TMnr 10010571.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/COLLECTIE_TROPENMUSEUM_Halmahera_Pakata_Tobelo_%28voorgrond%29_en_rorehe_TMnr_10010571.jpg/500px-COLLECTIE_TROPENMUSEUM_Halmahera_Pakata_Tobelo_%28voorgrond%29_en_rorehe_TMnr_10010571.jpg",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Halmahera_Pakata_Tobelo_(voorgrond)_en_rorehe_TMnr_10010571.jpg"
      }
    ]
  },
  "Tomohon": {
    "region": "sulawesi",
    "photos": [
      {
        "file": "Gunung Lokon.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Gunung_Lokon.jpg/500px-Gunung_Lokon.jpg",
        "author": "Tkx",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Gunung_Lokon.jpg"
      },
      {
        "file": "COLLECTIE TROPENMUSEUM Een stadsgezicht van Tomohon van bovenaf gezien TMnr 60014273.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c6/COLLECTIE_TROPENMUSEUM_Een_stadsgezicht_van_Tomohon_van_bovenaf_gezien_TMnr_60014273.jpg/500px-COLLECTIE_TROPENMUSEUM_Een_stadsgezicht_van_Tomohon_van_bovenaf_gezien_TMnr_60014273.jpg",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Een_stadsgezicht_van_Tomohon_van_bovenaf_gezien_TMnr_60014273.jpg"
      }
    ]
  },
  "Trowulan": {
    "region": "jawa",
    "photos": [
      {
        "file": "Segaran.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Segaran.jpg/500px-Segaran.jpg",
        "author": "Gunawan Kartapranata",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Segaran.jpg"
      },
      {
        "file": "Wringin Lawang, Trowulan.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Wringin_Lawang%2C_Trowulan.jpg/500px-Wringin_Lawang%2C_Trowulan.jpg",
        "author": "Original uploader was Gunawan Kartapranata at en.wikipedia",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "http://creativecommons.org/licenses/by-sa/3.0/",
        "page": "https://commons.wikimedia.org/wiki/File:Wringin_Lawang,_Trowulan.jpg"
      }
    ]
  },
  "Tuban": {
    "region": "jawa",
    "photos": [
      {
        "file": "COLLECTIE TROPENMUSEUM Alun-alun met omsloten waringinbomen en voetbalveld Toeban TMnr 10027598.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/COLLECTIE_TROPENMUSEUM_Alun-alun_met_omsloten_waringinbomen_en_voetbalveld_Toeban_TMnr_10027598.jpg/500px-COLLECTIE_TROPENMUSEUM_Alun-alun_met_omsloten_waringinbomen_en_voetbalveld_Toeban_TMnr_10027598.jpg",
        "author": "Dr. W.G.N. (Wicher Gosen Nicolaas) van der Sleen (Fotograaf/photographer).",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Alun-alun_met_omsloten_waringinbomen_en_voetbalveld_Toeban_TMnr_10027598.jpg"
      },
      {
        "file": "COLLECTIE TROPENMUSEUM Grot te Rengel Oost-Java TMnr 10021628.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/COLLECTIE_TROPENMUSEUM_Grot_te_Rengel_Oost-Java_TMnr_10021628.jpg/500px-COLLECTIE_TROPENMUSEUM_Grot_te_Rengel_Oost-Java_TMnr_10021628.jpg",
        "author": "H. (Hendrik) Veen (Fotograaf/photographer).",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Grot_te_Rengel_Oost-Java_TMnr_10021628.jpg"
      }
    ]
  },
  "Ubud": {
    "region": "bali-nusa",
    "photos": [
      {
        "file": "COLLECTIE TROPENMUSEUM Markt bij een puri in Oeboed TMnr 10024054.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/COLLECTIE_TROPENMUSEUM_Markt_bij_een_puri_in_Oeboed_TMnr_10024054.jpg/500px-COLLECTIE_TROPENMUSEUM_Markt_bij_een_puri_in_Oeboed_TMnr_10024054.jpg",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Markt_bij_een_puri_in_Oeboed_TMnr_10024054.jpg"
      }
    ]
  },
  "Ujung Kulon": {
    "region": "jawa",
    "photos": [
      {
        "file": "COLLECTIE TROPENMUSEUM Een bantengstier en een kalf op een moerasweide in het wildreservaat Udjung Kulon op West-Java TMnr 10006631.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/COLLECTIE_TROPENMUSEUM_Een_bantengstier_en_een_kalf_op_een_moerasweide_in_het_wildreservaat_Udjung_Kulon_op_West-Java_TMnr_10006631.jpg/500px-COLLECTIE_TROPENMUSEUM_Een_bantengstier_en_een_kalf_op_een_moerasweide_in_het_wildreservaat_Udjung_Kulon_op_West-Java_TMnr_10006631.jpg",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Een_bantengstier_en_een_kalf_op_een_moerasweide_in_het_wildreservaat_Udjung_Kulon_op_West-Java_TMnr_10006631.jpg"
      }
    ]
  },
  "Wakatobi": {
    "region": "sulawesi",
    "photos": [
      {
        "file": "Bandar Udara Matahora Wakatobi.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Bandar_Udara_Matahora_Wakatobi.jpg/500px-Bandar_Udara_Matahora_Wakatobi.jpg",
        "author": "Indonesian Ministry of Transportation",
        "license": "Public domain",
        "licenseUrl": "",
        "page": "https://commons.wikimedia.org/wiki/File:Bandar_Udara_Matahora_Wakatobi.jpg"
      }
    ]
  },
  "Yogyakarta": {
    "region": "jawa",
    "photos": []
  }
};
// @generated-end

// 네덜란드 식민지 시대 기록 사진(트로펜 박물관·KITLV·세계문화박물관 소장)은 오늘의 모습이 아니어서 보여 주지 않습니다.
// 목록(위 @generated 구간)에는 남겨 두어, 나중에 사람이 고를 때 참고할 수 있게 합니다. (2026-11-11 결정)
const ARCHIVE = new RegExp("tropenmuseum|kitlv|wereldculturen", "i");

/** 화면에 보여 줄 사진인지 — 지도 시트와 사진 출처 화면이 같은 기준을 씁니다. */
export function isShownPhoto(ph: MapPhoto): boolean {
  return !ARCHIVE.test(ph.file);
}

/** 그 지점의 사진(최대 2장). 없으면 빈 배열. */
export function getPlacePhotos(id: string): MapPhoto[] {
  const p = MAP_PHOTOS[id];
  return p ? p.photos.filter(isShownPhoto).slice(0, 2) : [];
}

/** 사진이 한 장 이상 있는 지점 수 (확인용) */
export function photoPlaceCount(): number {
  return Object.keys(MAP_PHOTOS).filter((k) => getPlacePhotos(k).length > 0).length;
}
