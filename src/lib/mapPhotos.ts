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
// 2026-11-10 scripts/build-map-photos.mjs — 지점 136 · 2장 73 · 1장 36 · 0장 27
export const MAP_PHOTOS: Record<string, MapPlacePhotos> = {
  "Agats": {
    "region": "papua",
    "photos": [
      {
        "file": "Agats Skyline.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/a/a7/Agats_Skyline.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Government of Indonesia Regency Government of Asmat",
        "license": "Public domain",
        "licenseUrl": "",
        "page": "https://commons.wikimedia.org/wiki/File:Agats_Skyline.jpg"
      },
      {
        "file": "Asmat Tribesman (48277997957).jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/6/68/Asmat_Tribesman_%2848277997957%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/d/d7/Ambon.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "OGS",
        "license": "CC BY 2.5",
        "licenseUrl": "https://creativecommons.org/licenses/by/2.5",
        "page": "https://commons.wikimedia.org/wiki/File:Ambon.jpg"
      },
      {
        "file": "Baai van Ambon met moskee - KITLV 1400033.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/c/c2/Baai_van_Ambon_met_moskee_-_KITLV_1400033.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "file": "COLLECTIE TROPENMUSEUM Afgevaardigden van de Badui (oftewel Kanekes) bevolking TMnr 60016564.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/6/69/COLLECTIE_TROPENMUSEUM_Afgevaardigden_van_de_Badui_%28oftewel_Kanekes%29_bevolking_TMnr_60016564.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "J. Hardeman (Fotograaf/photographer).",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Afgevaardigden_van_de_Badui_(oftewel_Kanekes)_bevolking_TMnr_60016564.jpg"
      },
      {
        "file": "Baduy children, Kanekes, Banten Province, Java Island, Indonesia.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/1/13/Baduy_children%2C_Kanekes%2C_Banten_Province%2C_Java_Island%2C_Indonesia.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Paul Hessels",
        "license": "CC BY 2.0",
        "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
        "page": "https://commons.wikimedia.org/wiki/File:Baduy_children,_Kanekes,_Banten_Province,_Java_Island,_Indonesia.jpg"
      }
    ]
  },
  "Balikpapan": {
    "region": "kalimantan",
    "photos": [
      {
        "file": "COLLECTIE TROPENMUSEUM Gezicht over de Baai van Balikpapan met olietanks en steigers van de Bataafsche Petroleum Maatschappij (BPM) TMnr 60018714.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/0/0a/COLLECTIE_TROPENMUSEUM_Gezicht_over_de_Baai_van_Balikpapan_met_olietanks_en_steigers_van_de_Bataafsche_Petroleum_Maatschappij_%28BPM%29_TMnr_60018714.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Gezicht_over_de_Baai_van_Balikpapan_met_olietanks_en_steigers_van_de_Bataafsche_Petroleum_Maatschappij_(BPM)_TMnr_60018714.jpg"
      },
      {
        "file": "COLLECTIE TROPENMUSEUM Luchtfoto olieraffinaderij TMnr 20017995.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/e/e5/COLLECTIE_TROPENMUSEUM_Luchtfoto_olieraffinaderij_TMnr_20017995.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/b/b5/Museum_Aceh.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "file": "COLLECTIE TROPENMUSEUM Plein met kantoren in Teloekbetoeng de Lampongsche Districten op Zuid-Sumatra. TMnr 60013127.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/a/ab/COLLECTIE_TROPENMUSEUM_Plein_met_kantoren_in_Teloekbetoeng_de_Lampongsche_Districten_op_Zuid-Sumatra._TMnr_60013127.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Plein_met_kantoren_in_Teloekbetoeng_de_Lampongsche_Districten_op_Zuid-Sumatra._TMnr_60013127.jpg"
      },
      {
        "file": "Radin Inten 2 Airport.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/e/e7/Radin_Inten_2_Airport.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "BabesloJR",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Radin_Inten_2_Airport.jpg"
      }
    ]
  },
  "Bandung": {
    "region": "jawa",
    "photos": [
      {
        "file": "Bandung Pasupati Skyline.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/6/67/Bandung_Pasupati_Skyline.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Prayudi Setiadharma",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Bandung_Pasupati_Skyline.jpg"
      },
      {
        "file": "COLLECTIE TROPENMUSEUM Villa Isola aan de Lembangweg bij Bandoeng TMnr 60026636.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/a/a7/COLLECTIE_TROPENMUSEUM_Villa_Isola_aan_de_Lembangweg_bij_Bandoeng_TMnr_60026636.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "file": "COLLECTIE TROPENMUSEUM Het bezoek van de Gouverneur-Generaal mr. Dirk Fock aan Bandjermasin tijdens zijn rondreis door de Zuider- en Oosterafdeling van Borneo 1924-04-00 TMnr 60013434.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/0/0a/COLLECTIE_TROPENMUSEUM_Het_bezoek_van_de_Gouverneur-Generaal_mr._Dirk_Fock_aan_Bandjermasin_tijdens_zijn_rondreis_door_de_Zuider-_en_Oosterafdeling_van_Borneo_1924-04-00_TMnr_60013434.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Het_bezoek_van_de_Gouverneur-Generaal_mr._Dirk_Fock_aan_Bandjermasin_tijdens_zijn_rondreis_door_de_Zuider-_en_Oosterafdeling_van_Borneo_1924-04-00_TMnr_60013434.jpg"
      },
      {
        "file": "Japanese attack on Borneo, 1941-1942.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/1/16/Japanese_attack_on_Borneo%2C_1941-1942.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/9/95/The_old_missigit_of_Bantam.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/e/ed/Kue_Bagiak_Gajah_Oling%2C_Banyuwangi.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/1/19/Batam_Busway_Interior.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Abelard Fuah",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Batam_Busway_Interior.jpg"
      },
      {
        "file": "COLLECTIE TROPENMUSEUM Havengezicht met olietanks van de Shell op Poelau Samboe TMnr 10018445.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/7/7e/COLLECTIE_TROPENMUSEUM_Havengezicht_met_olietanks_van_de_Shell_op_Poelau_Samboe_TMnr_10018445.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Havengezicht_met_olietanks_van_de_Shell_op_Poelau_Samboe_TMnr_10018445.jpg"
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
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/1/18/Bengkulu_Governor_Office.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "MPikli",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Bengkulu_Governor_Office.jpg"
      },
      {
        "file": "COLLECTIE TROPENMUSEUM Een drietal Europese vrouwen gekleed in sarongs met op de achtergrond Fort Marlborough te Benkoelen TMnr 60042951.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/b/bf/COLLECTIE_TROPENMUSEUM_Een_drietal_Europese_vrouwen_gekleed_in_sarongs_met_op_de_achtergrond_Fort_Marlborough_te_Benkoelen_TMnr_60042951.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Een_drietal_Europese_vrouwen_gekleed_in_sarongs_met_op_de_achtergrond_Fort_Marlborough_te_Benkoelen_TMnr_60042951.jpg"
      }
    ]
  },
  "Berastagi": {
    "region": "sumatera",
    "photos": [
      {
        "file": "COLLECTIE TROPENMUSEUM Hotel Brastagi aan de voet van de vulkaan Sibayak TMnr 60023683.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/9/97/COLLECTIE_TROPENMUSEUM_Hotel_Brastagi_aan_de_voet_van_de_vulkaan_Sibayak_TMnr_60023683.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/0/0d/Sultan_Muhammad_Salahuddin_bersama_Tentara_BKR_Bima_depan_Istana_ASI_Mbojo.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/6/60/Amir_Hamzah_Wali_Kota_Binjai.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "file": "COLLECTIE TROPENMUSEUM Het hoofd van de deelstaat Negara Pasundan met zijn secretaris TMnr 60054594.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/d/d8/COLLECTIE_TROPENMUSEUM_Het_hoofd_van_de_deelstaat_Negara_Pasundan_met_zijn_secretaris_TMnr_60054594.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Het_hoofd_van_de_deelstaat_Negara_Pasundan_met_zijn_secretaris_TMnr_60054594.jpg"
      },
      {
        "file": "COLLECTIE TROPENMUSEUM Luchtfoto van het paleis van de Gouverneur-Generaal in Buitenzorg TMnr 60027049.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/e/e8/COLLECTIE_TROPENMUSEUM_Luchtfoto_van_het_paleis_van_de_Gouverneur-Generaal_in_Buitenzorg_TMnr_60027049.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Luchtfoto_van_het_paleis_van_de_Gouverneur-Generaal_in_Buitenzorg_TMnr_60027049.jpg"
      }
    ]
  },
  "Bone": {
    "region": "sulawesi",
    "photos": [
      {
        "file": "COLLECTIE TROPENMUSEUM Paleis van de vorstin van Bone op Celebes TMnr 60015648.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/8/85/COLLECTIE_TROPENMUSEUM_Paleis_van_de_vorstin_van_Bone_op_Celebes_TMnr_60015648.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Paleis_van_de_vorstin_van_Bone_op_Celebes_TMnr_60015648.jpg"
      },
      {
        "file": "COLLECTIE TROPENMUSEUM Hofdames in Bone Celebes TMnr 10003352.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/0/09/COLLECTIE_TROPENMUSEUM_Hofdames_in_Bone_Celebes_TMnr_10003352.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Hofdames_in_Bone_Celebes_TMnr_10003352.jpg"
      }
    ]
  },
  "Borobudur": {
    "region": "jawa",
    "photos": [
      {
        "file": "Borobudur-perfect-buddha.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/6/66/Borobudur-perfect-buddha.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Photo by Jan-Pieter Nap , 2004.",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "http://creativecommons.org/licenses/by-sa/3.0/",
        "page": "https://commons.wikimedia.org/wiki/File:Borobudur-perfect-buddha.jpg"
      },
      {
        "file": "Borobudur mural.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/d/d1/Borobudur_mural.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/6/6f/Brahmavihara_Arama.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Daniel Pratt",
        "license": "Public domain",
        "licenseUrl": "",
        "page": "https://commons.wikimedia.org/wiki/File:Brahmavihara_Arama.jpg"
      },
      {
        "file": "Braham Arama Vihara.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/7/7c/Braham_Arama_Vihara.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/5/5b/Bukit-jungle_09N8618.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Nomo michael hoefner / http://www.zwo5.de",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Bukit-jungle_09N8618.jpg"
      },
      {
        "file": "Leuser-orangs 09N8683.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/6/66/Leuser-orangs_09N8683.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/c/cd/Kantor_Walikota_Bukit_Tinggi.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Official Website of National Library of Indonesia",
        "license": "Public domain",
        "licenseUrl": "",
        "page": "https://commons.wikimedia.org/wiki/File:Kantor_Walikota_Bukit_Tinggi.jpg"
      },
      {
        "file": "Ngarai Sianok.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/f/f9/Ngarai_Sianok.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "file": "COLLECTIE TROPENMUSEUM Prent voorstellende Cheribon in de zeventiende eeuw gezien vanaf de rede TMnr 60034631.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/e/e8/COLLECTIE_TROPENMUSEUM_Prent_voorstellende_Cheribon_in_de_zeventiende_eeuw_gezien_vanaf_de_rede_TMnr_60034631.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Prent_voorstellende_Cheribon_in_de_zeventiende_eeuw_gezien_vanaf_de_rede_TMnr_60034631.jpg"
      },
      {
        "file": "DPRD Kota Cirebon-Jie.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/a/a7/DPRD_Kota_Cirebon-Jie.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Jie73",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:DPRD_Kota_Cirebon-Jie.jpg"
      }
    ]
  },
  "Danau Kelimutu": {
    "region": "bali-nusa",
    "photos": [
      {
        "file": "Kelimutu crater lakes.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/d/d2/Kelimutu_crater_lakes.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "file": "COLLECTIE TROPENMUSEUM Batak prauwen bij Haranggaol aan het Tobameer TMnr 60043981.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/7/74/COLLECTIE_TROPENMUSEUM_Batak_prauwen_bij_Haranggaol_aan_het_Tobameer_TMnr_60043981.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Tassilo Adam",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Batak_prauwen_bij_Haranggaol_aan_het_Tobameer_TMnr_60043981.jpg"
      },
      {
        "file": "COLLECTIE TROPENMUSEUM Houtsnijwerk op de voorsteven van een Toba Batak prauw Tobameer TMnr 10017614.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/f/fc/COLLECTIE_TROPENMUSEUM_Houtsnijwerk_op_de_voorsteven_van_een_Toba_Batak_prauw_Tobameer_TMnr_10017614.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Tassilo Adam",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Houtsnijwerk_op_de_voorsteven_van_een_Toba_Batak_prauw_Tobameer_TMnr_10017614.jpg"
      }
    ]
  },
  "Dataran Tinggi Dieng": {
    "region": "jawa",
    "photos": [
      {
        "file": "COLLECTIE TROPENMUSEUM Olieverfschildering door Max Fleischer voorstellend vier tempels op het Diëng Plateau TMnr 822-2.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/b/bf/COLLECTIE_TROPENMUSEUM_Olieverfschildering_door_Max_Fleischer_voorstellend_vier_tempels_op_het_Di%C3%ABng_Plateau_TMnr_822-2.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Max Fleischer 1861-1930 (Schilder).",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Olieverfschildering_door_Max_Fleischer_voorstellend_vier_tempels_op_het_Di%C3%ABng_Plateau_TMnr_822-2.jpg"
      }
    ]
  },
  "Demak": {
    "region": "jawa",
    "photos": [
      {
        "file": "Masjid demak.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/c/c7/Masjid_demak.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Astayoga at English Wikipedia",
        "license": "Public domain",
        "licenseUrl": "",
        "page": "https://commons.wikimedia.org/wiki/File:Masjid_demak.jpg"
      },
      {
        "file": "COLLECTIE TROPENMUSEUM De moskee van Demak TMnr 10016515.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/2/29/COLLECTIE_TROPENMUSEUM_De_moskee_van_Demak_TMnr_10016515.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "file": "COLLECTIE TROPENMUSEUM Luchtfoto van Denpasar TMnr 10029767.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/4/40/COLLECTIE_TROPENMUSEUM_Luchtfoto_van_Denpasar_TMnr_10029767.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "C.J. (Cees) Taillie (Fotograaf/photographer).",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Luchtfoto_van_Denpasar_TMnr_10029767.jpg"
      },
      {
        "file": "Denpasar, Denpasar City, Bali, Indonesia - panoramio - 우한길(HK Woo) (10).jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/8/82/Denpasar%2C_Denpasar_City%2C_Bali%2C_Indonesia_-_panoramio_-_%EC%9A%B0%ED%95%9C%EA%B8%B8%28HK_Woo%29_%2810%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "우한길(HK Woo)",
        "license": "CC BY 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Denpasar,_Denpasar_City,_Bali,_Indonesia_-_panoramio_-_%EC%9A%B0%ED%95%9C%EA%B8%B8(HK_Woo)_(10).jpg"
      }
    ]
  },
  "Depok": {
    "region": "jawa",
    "photos": [
      {
        "file": "0211m tarian-lenggang-nyai-betawi.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/c/c9/0211m_tarian-lenggang-nyai-betawi.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Fery Hartono",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:0211m_tarian-lenggang-nyai-betawi.jpg"
      },
      {
        "file": "Client Display di KPP Depok Sawangan.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/b/bb/Client_Display_di_KPP_Depok_Sawangan.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/9/93/Shortly_after_takeoff%2C_H_Aroeboesman_Ende_Flores_%28ENE-WATE%29%2C_Trigana_Air_ATR42-300_%2834336886686%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/2/24/Gili_Meno_West_Coast.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "(작가 표시 없음)",
        "license": "Public domain",
        "licenseUrl": "",
        "page": "https://commons.wikimedia.org/wiki/File:Gili_Meno_West_Coast.jpg"
      },
      {
        "file": "Gili Trawangan Dawn 2.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/b/b9/Gili_Trawangan_Dawn_2.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/1/1f/Masjid_Agung_Gorontalo.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Ministry of Religion of Indonesia",
        "license": "Public domain",
        "licenseUrl": "",
        "page": "https://commons.wikimedia.org/wiki/File:Masjid_Agung_Gorontalo.jpg"
      },
      {
        "file": "Gedung Rektorat Universitas Negeri Gorontalo.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/d/d0/Gedung_Rektorat_Universitas_Negeri_Gorontalo.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/0/03/Ice_dew_bromo.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Benni indo",
        "license": "CC0",
        "licenseUrl": "http://creativecommons.org/publicdomain/zero/1.0/deed.en",
        "page": "https://commons.wikimedia.org/wiki/File:Ice_dew_bromo.jpg"
      },
      {
        "file": "Mount Bromo eruption 2011 01 22.JPG",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/b/b9/Mount_Bromo_eruption_2011_01_22.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/a/a9/Gunung_Kerinci_dari_tempat_wisata_Swarga.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/f/f2/Jungle-patrol_09N9067.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Nomo michael hoefner / http://www.zwo5.de",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Jungle-patrol_09N9067.jpg"
      },
      {
        "file": "Leuser.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/0/0b/Leuser.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/0/0f/Rinjani_volcano_satellite.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "file": "COLLECTIE TROPENMUSEUM De Istiqlal moskee in aanbouw en de kathedraal TMnr 20025717.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/1/17/COLLECTIE_TROPENMUSEUM_De_Istiqlal_moskee_in_aanbouw_en_de_kathedraal_TMnr_20025717.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_De_Istiqlal_moskee_in_aanbouw_en_de_kathedraal_TMnr_20025717.jpg"
      },
      {
        "file": "Istiqlal di tahun 2013.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/f/fc/Istiqlal_di_tahun_2013.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Iwan Budi Arta SH (Sarjana Hukum)",
        "license": "CC0",
        "licenseUrl": "http://creativecommons.org/publicdomain/zero/1.0/deed.en",
        "page": "https://commons.wikimedia.org/wiki/File:Istiqlal_di_tahun_2013.jpg"
      }
    ]
  },
  "Jakarta": {
    "region": "jawa",
    "photos": [
      {
        "file": "Jakarta Skyline West.JPG",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/2/29/Jakarta_Skyline_West.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/8/89/Bob-Kerrey-Pedestrian-Bridge.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Novrialdi D Putra",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Bob-Kerrey-Pedestrian-Bridge.jpg"
      },
      {
        "file": "Kota jambi.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/3/34/Kota_jambi.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/c/cd/Transmetrojayapura.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Rafli Fajar Ardiana",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Transmetrojayapura.jpg"
      },
      {
        "file": "YosSudarsoBayFromSkyline.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/8/89/YosSudarsoBayFromSkyline.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/1/19/Launching_of_Jember_car-free_night.jpeg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "TonyIndra",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Launching_of_Jember_car-free_night.jpeg"
      },
      {
        "file": "Psik-unej-universitas-jember-777x437.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/9/9b/Psik-unej-universitas-jember-777x437.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/6/6f/Kawah_Ijen_volcano%2C_Java.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "NASA Earth Observatory image by Jesse Allen, using Landsat data from the U.S. Geological Survey.",
        "license": "Public domain",
        "licenseUrl": "",
        "page": "https://commons.wikimedia.org/wiki/File:Kawah_Ijen_volcano,_Java.jpg"
      },
      {
        "file": "Mount Merapi Ijen A.JPG",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/7/7c/Mount_Merapi_Ijen_A.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/a/ad/Candi_Surowono_1.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "ESCapade",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Candi_Surowono_1.jpg"
      },
      {
        "file": "Wali Kota Kediri Samsul Ashar.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/7/73/Wali_Kota_Kediri_Samsul_Ashar.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/c/cd/Kendari_Modern_Library.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Diskominfo Sultra",
        "license": "Public domain",
        "licenseUrl": "",
        "page": "https://commons.wikimedia.org/wiki/File:Kendari_Modern_Library.jpg"
      },
      {
        "file": "Kendari at night.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/6/63/Kendari_at_night.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/3/3f/Banda_Neira_1724.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "(작가 표시 없음)",
        "license": "Public domain",
        "licenseUrl": "",
        "page": "https://commons.wikimedia.org/wiki/File:Banda_Neira_1724.jpg"
      },
      {
        "file": "COLLECTIE TROPENMUSEUM Militairen bij het standbeeld van Koning Willem III op Banda TMnr 10018594.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/c/c9/COLLECTIE_TROPENMUSEUM_Militairen_bij_het_standbeeld_van_Koning_Willem_III_op_Banda_TMnr_10018594.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Militairen_bij_het_standbeeld_van_Koning_Willem_III_op_Banda_TMnr_10018594.jpg"
      }
    ]
  },
  "Kepulauan Derawan": {
    "region": "kalimantan",
    "photos": [
      {
        "file": "Stingless Jellyfish Kakaban.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/c/c1/Stingless_Jellyfish_Kakaban.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Christinefb",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Stingless_Jellyfish_Kakaban.jpg"
      },
      {
        "file": "Escape to the Island.JPG",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/5/5d/Escape_to_the_Island.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/b/b5/COLLECTIE_TROPENMUSEUM_De_Togian-eilanden_%28Schildpad-eilanden%29_TMnr_60018679.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_De_Togian-eilanden_(Schildpad-eilanden)_TMnr_60018679.jpg"
      },
      {
        "file": "COLLECTIE TROPENMUSEUM S.S. Van Overstraten van de KPM bij de Togian-eilanden (Schildpad-eilanden) TMnr 60018678.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/7/79/COLLECTIE_TROPENMUSEUM_S.S._Van_Overstraten_van_de_KPM_bij_de_Togian-eilanden_%28Schildpad-eilanden%29_TMnr_60018678.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/3/30/John_Webber_Plate_XVI_The_Fan_Palm_in_the_Island_of_Cracatoa.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/0/06/COLLECTIE_TROPENMUSEUM_De_minaret_bij_de_moskee_van_Koedoes_TMnr_10016671.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_De_minaret_bij_de_moskee_van_Koedoes_TMnr_10016671.jpg"
      },
      {
        "file": "COLLECTIE TROPENMUSEUM Gespleten poort bij de moskee van Koedoes TMnr 10016516.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/4/45/COLLECTIE_TROPENMUSEUM_Gespleten_poort_bij_de_moskee_van_Koedoes_TMnr_10016516.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/e/ee/Sasando_Building_Kupang.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Government of East Nusa Tenggara",
        "license": "Public domain",
        "licenseUrl": "",
        "page": "https://commons.wikimedia.org/wiki/File:Sasando_Building_Kupang.jpg"
      },
      {
        "file": "COLLECTIE TROPENMUSEUM Haven van Kupang TMnr 10010359.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/d/da/COLLECTIE_TROPENMUSEUM_Haven_van_Kupang_TMnr_10010359.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/a/af/Komodoairport1.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "file": "COLLECTIE TROPENMUSEUM Erepoort voor de rooms-katholieke kerk tijdens een feestdag in Larantoeka TMnr 10016682.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/b/b9/COLLECTIE_TROPENMUSEUM_Erepoort_voor_de_rooms-katholieke_kerk_tijdens_een_feestdag_in_Larantoeka_TMnr_10016682.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Erepoort_voor_de_rooms-katholieke_kerk_tijdens_een_feestdag_in_Larantoeka_TMnr_10016682.jpg"
      },
      {
        "file": "COLLECTIE TROPENMUSEUM Gezicht vanaf Larantoeka op het eiland Adonara TMnr 10018570.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/7/71/COLLECTIE_TROPENMUSEUM_Gezicht_vanaf_Larantoeka_op_het_eiland_Adonara_TMnr_10018570.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/9/95/Kurulu_Village_War_Chief.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Paul from Working and living in Jayapura (Papua Province) and Jakarta, Indonesia",
        "license": "CC BY 2.0",
        "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
        "page": "https://commons.wikimedia.org/wiki/File:Kurulu_Village_War_Chief.jpg"
      },
      {
        "file": "Yali man Baliem Valley Papua.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/f/f9/Yali_man_Baliem_Valley_Papua.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "file": "COLLECTIE TROPENMUSEUM Het raadhuis van Magelang TMnr 60046225.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/a/a3/COLLECTIE_TROPENMUSEUM_Het_raadhuis_van_Magelang_TMnr_60046225.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Het_raadhuis_van_Magelang_TMnr_60046225.jpg"
      },
      {
        "file": "Magelang Borobudur.JPG",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/3/31/Magelang_Borobudur.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "handy.darklord",
        "license": "CC0",
        "licenseUrl": "http://creativecommons.org/publicdomain/zero/1.0/deed.en",
        "page": "https://commons.wikimedia.org/wiki/File:Magelang_Borobudur.JPG"
      }
    ]
  },
  "Makassar": {
    "region": "sulawesi",
    "photos": [
      {
        "file": "COLLECTIE TROPENMUSEUM De Passarstraat te Makassar. TMnr 60008238.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/d/db/COLLECTIE_TROPENMUSEUM_De_Passarstraat_te_Makassar._TMnr_60008238.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_De_Passarstraat_te_Makassar._TMnr_60008238.jpg"
      },
      {
        "file": "Makassar-Graha-Pena2.JPG",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/b/bb/Makassar-Graha-Pena2.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Lofor",
        "license": "CC BY 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Makassar-Graha-Pena2.JPG"
      }
    ]
  },
  "Malang": {
    "region": "jawa",
    "photos": [
      {
        "file": "COLLECTIE TROPENMUSEUM Kerk van het Heilig Hart te Malang. TMnr 60005904.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/a/ac/COLLECTIE_TROPENMUSEUM_Kerk_van_het_Heilig_Hart_te_Malang._TMnr_60005904.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Kerk_van_het_Heilig_Hart_te_Malang._TMnr_60005904.jpg"
      },
      {
        "file": "Candi Jago C.JPG",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/4/43/Candi_Jago_C.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/9/9d/Mangiwang_Mamuju_Tengah.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Government of Mamuju Tengah, Indonesia",
        "license": "Public domain",
        "licenseUrl": "",
        "page": "https://commons.wikimedia.org/wiki/File:Mangiwang_Mamuju_Tengah.jpg"
      },
      {
        "file": "Bupati Mamuju Sitti Sutinah Suhardi.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/b/bd/Bupati_Mamuju_Sitti_Sutinah_Suhardi.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/3/33/Manadofromsky.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/d/de/Manokwari_City_Mall.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Nurdiansyah46",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Manokwari_City_Mall.jpg"
      },
      {
        "file": "Het schip de \"Bensbach\" op de rede van Manokwari - Collectie stichting Nationaal Museum van Wereldculturen - TM-60010071.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/b/b1/Het_schip_de_%22Bensbach%22_op_de_rede_van_Manokwari_-_Collectie_stichting_Nationaal_Museum_van_Wereldculturen_-_TM-60010071.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Gijsbert van der Sande",
        "license": "Public domain",
        "licenseUrl": "",
        "page": "https://commons.wikimedia.org/wiki/File:Het_schip_de_%22Bensbach%22_op_de_rede_van_Manokwari_-_Collectie_stichting_Nationaal_Museum_van_Wereldculturen_-_TM-60010071.jpg"
      }
    ]
  },
  "Maros-Pangkep": {
    "region": "sulawesi",
    "photos": [
      {
        "file": "COLLECTIE TROPENMUSEUM De waterval bij Maros TMnr 3728-860.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/a/af/COLLECTIE_TROPENMUSEUM_De_waterval_bij_Maros_TMnr_3728-860.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/5/54/Hubbul_Wathan_Islamic_Center.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/b/b3/Jesus_Statue_Maumere.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/9/99/COLLECTIE_TROPENMUSEUM_De_Sultan_van_Deli_Amaluddin_Sani_Perkasa_Alam_Shah_tijdens_het_verlaten_van_de_Grote_Moskee_op_de_dag_van_zijn_kroning_TMnr_60027930.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_De_Sultan_van_Deli_Amaluddin_Sani_Perkasa_Alam_Shah_tijdens_het_verlaten_van_de_Grote_Moskee_op_de_dag_van_zijn_kroning_TMnr_60027930.jpg"
      },
      {
        "file": "COLLECTIE TROPENMUSEUM Menigte voor het Istana Maimun het paleis van de Sultan van Deli TMnr 60027931.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/4/4a/COLLECTIE_TROPENMUSEUM_Menigte_voor_het_Istana_Maimun_het_paleis_van_de_Sultan_van_Deli_TMnr_60027931.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
    "photos": [
      {
        "file": "Muntilan kerk.JPG",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/8/82/Muntilan_kerk.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Albert kok",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Muntilan_kerk.JPG"
      }
    ]
  },
  "Nusa Penida": {
    "region": "bali-nusa",
    "photos": [
      {
        "file": "Nusa Penida - panoramio cropped.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/6/62/Nusa_Penida_-_panoramio_cropped.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/1/17/Indonesia_nusantara_oli_20240219_lrg.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "NASA Earth Observatory images by Michala Garrison, using Landsat data from the U.S. Geological Survey",
        "license": "Public domain",
        "licenseUrl": "",
        "page": "https://commons.wikimedia.org/wiki/File:Indonesia_nusantara_oli_20240219_lrg.jpg"
      },
      {
        "file": "KP-IKN Nusantara city.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/e/e2/KP-IKN_Nusantara_city.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/c/c0/Tour_de_Singkarak_2013_%282%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/6/60/Pagaruyung_palace_at_night_Batusangkar.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/a/a3/Bird%27s_eye_view_of_Palembang.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Unknown author Unknown author",
        "license": "Public domain",
        "licenseUrl": "",
        "page": "https://commons.wikimedia.org/wiki/File:Bird%27s_eye_view_of_Palembang.JPG"
      },
      {
        "file": "COLLECTIE TROPENMUSEUM De rivier de Musi bij Palembang TMnr 5426-8.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/5/51/COLLECTIE_TROPENMUSEUM_De_rivier_de_Musi_bij_Palembang_TMnr_5426-8.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/8/84/Cocoa_processing_factory_in_Palu.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/6/6a/Pasir-padi.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/1/16/COLLECTIE_TROPENMUSEUM_Moskee_Indonesi%C3%AB_TMnr_10016740.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/1/1b/Pekanbaru_2019.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "file": "COLLECTIE TROPENMUSEUM Luchtfoto van Siantar TMnr 10015093.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/e/e5/COLLECTIE_TROPENMUSEUM_Luchtfoto_van_Siantar_TMnr_10015093.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Luchtfoto_van_Siantar_TMnr_10015093.jpg"
      },
      {
        "file": "COLLECTIE TROPENMUSEUM Straatgezicht met het Juliana Hotel Pematangsiantar TMnr 10015092.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/a/a3/COLLECTIE_TROPENMUSEUM_Straatgezicht_met_het_Juliana_Hotel_Pematangsiantar_TMnr_10015092.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Straatgezicht_met_het_Juliana_Hotel_Pematangsiantar_TMnr_10015092.jpg"
      }
    ]
  },
  "Pontianak": {
    "region": "kalimantan",
    "photos": [
      {
        "file": "COLLECTIE TROPENMUSEUM Gekapte sagostammen worden stroomafwaarts op de rivier bij Pontianak gevlot West-Borneo TMnr 10011237.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/4/4d/COLLECTIE_TROPENMUSEUM_Gekapte_sagostammen_worden_stroomafwaarts_op_de_rivier_bij_Pontianak_gevlot_West-Borneo_TMnr_10011237.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Gekapte_sagostammen_worden_stroomafwaarts_op_de_rivier_bij_Pontianak_gevlot_West-Borneo_TMnr_10011237.jpg"
      },
      {
        "file": "COLLECTIE TROPENMUSEUM Straatgezicht met watertonnen TMnr 60014537.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/6/63/COLLECTIE_TROPENMUSEUM_Straatgezicht_met_watertonnen_TMnr_60014537.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/d/d5/COLLECTIE_TROPENMUSEUM_Beeld_van_Shiva_als_Mahadeva_op_de_Candi_Lara_Jonggrang_oftewel_het_Prambanan_tempelcomplex_TMnr_60046668.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Beeld_van_Shiva_als_Mahadeva_op_de_Candi_Lara_Jonggrang_oftewel_het_Prambanan_tempelcomplex_TMnr_60046668.jpg"
      },
      {
        "file": "COLLECTIE TROPENMUSEUM De Candi Lara Jonggrang oftewel het Prambanan tempelcomplex TMnr 20026907.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/2/2b/COLLECTIE_TROPENMUSEUM_De_Candi_Lara_Jonggrang_oftewel_het_Prambanan_tempelcomplex_TMnr_20026907.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/f/f1/Bupati_Probolinggo_Raden_Toemenggoeng_Djojonegoro.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Unknown author Unknown author",
        "license": "CC BY 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Bupati_Probolinggo_Raden_Toemenggoeng_Djojonegoro.jpg"
      },
      {
        "file": "COLLECTIE TROPENMUSEUM Feestelijke optocht tijdens een Javaanse bruiloft te Probolinggo Oost-Java TMnr 10002996.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/0/0e/COLLECTIE_TROPENMUSEUM_Feestelijke_optocht_tijdens_een_Javaanse_bruiloft_te_Probolinggo_Oost-Java_TMnr_10002996.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
    "photos": [
      {
        "file": "Church celebrating the 40th anniverary of the Protestant missiona... - Collectie stichting Nationaal Museum van Wereldculturen - TM-60061485.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/b/bb/Church_celebrating_the_40th_anniverary_of_the_Protestant_missiona..._-_Collectie_stichting_Nationaal_Museum_van_Wereldculturen_-_TM-60061485.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Unknown author Unknown author",
        "license": "Public domain",
        "licenseUrl": "",
        "page": "https://commons.wikimedia.org/wiki/File:Church_celebrating_the_40th_anniverary_of_the_Protestant_missiona..._-_Collectie_stichting_Nationaal_Museum_van_Wereldculturen_-_TM-60061485.jpg"
      },
      {
        "file": "Church interior celebrating the 40th anniverary of the Protestant... - Collectie stichting Nationaal Museum van Wereldculturen - TM-60061486.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/9/9c/Church_interior_celebrating_the_40th_anniverary_of_the_Protestant..._-_Collectie_stichting_Nationaal_Museum_van_Wereldculturen_-_TM-60061486.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Unknown author Unknown author",
        "license": "Public domain",
        "licenseUrl": "",
        "page": "https://commons.wikimedia.org/wiki/File:Church_interior_celebrating_the_40th_anniverary_of_the_Protestant..._-_Collectie_stichting_Nationaal_Museum_van_Wereldculturen_-_TM-60061486.jpg"
      }
    ]
  },
  "Pulau Nias": {
    "region": "sumatera",
    "photos": [
      {
        "file": "COLLECTIE TROPENMUSEUM Een familie op Nias TMnr 10005771.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/4/41/COLLECTIE_TROPENMUSEUM_Een_familie_op_Nias_TMnr_10005771.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Een_familie_op_Nias_TMnr_10005771.jpg"
      },
      {
        "file": "COLLECTIE TROPENMUSEUM Een groep onderworpen koppensnellers Nias TMnr 10001505.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/6/6e/COLLECTIE_TROPENMUSEUM_Een_groep_onderworpen_koppensnellers_Nias_TMnr_10001505.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Een_groep_onderworpen_koppensnellers_Nias_TMnr_10001505.jpg"
      }
    ]
  },
  "Pulau Sabu": {
    "region": "bali-nusa",
    "photos": [
      {
        "file": "COLLECTIE TROPENMUSEUM De Radja van Liae met gezin Sawoe TMnr 10006075.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/7/71/COLLECTIE_TROPENMUSEUM_De_Radja_van_Liae_met_gezin_Sawoe_TMnr_10006075.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_De_Radja_van_Liae_met_gezin_Sawoe_TMnr_10006075.jpg"
      }
    ]
  },
  "Pulau Sumba": {
    "region": "bali-nusa",
    "photos": [
      {
        "file": "COLLECTIE TROPENMUSEUM Drie aanzienlijke vrouwen gekleed in een danskostuum Kanangar Soemba TMnr 10005880.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/e/e4/COLLECTIE_TROPENMUSEUM_Drie_aanzienlijke_vrouwen_gekleed_in_een_danskostuum_Kanangar_Soemba_TMnr_10005880.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Drie_aanzienlijke_vrouwen_gekleed_in_een_danskostuum_Kanangar_Soemba_TMnr_10005880.jpg"
      },
      {
        "file": "Faroe.sumba.3.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/7/7b/Faroe.sumba.3.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Erik Christensen",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "http://creativecommons.org/licenses/by-sa/3.0/",
        "page": "https://commons.wikimedia.org/wiki/File:Faroe.sumba.3.jpg"
      }
    ]
  },
  "Pulau Weh": {
    "region": "sumatera",
    "photos": [
      {
        "file": "COLLECTIE TROPENMUSEUM Marineschepen in de haven van Sabang op het eiland We TMnr 60011324.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/f/fe/COLLECTIE_TROPENMUSEUM_Marineschepen_in_de_haven_van_Sabang_op_het_eiland_We_TMnr_60011324.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/0/02/Mother_Temple_of_Besakih.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Xeviro at English Wikipedia",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "http://creativecommons.org/licenses/by-sa/3.0/",
        "page": "https://commons.wikimedia.org/wiki/File:Mother_Temple_of_Besakih.jpg"
      },
      {
        "file": "Presiden Jokowi Didampingi Gubernur Koster di Pura Besakih untuk peresmian.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/1/1d/Presiden_Jokowi_Didampingi_Gubernur_Koster_di_Pura_Besakih_untuk_peresmian.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/4/47/Alun_-_Alun_Purwokerto_1947._%28Berwarna%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Photografer : Hugo Wilmar. Colouring by= Van Coolwijk,D.",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Alun_-_Alun_Purwokerto_1947._(Berwarna).jpg"
      },
      {
        "file": "Alun - Alun di Purwokerto, 1931.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/0/09/Alun_-_Alun_di_Purwokerto%2C_1931.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/4/41/Kapuas_Bridge_Putussibau.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Lookmie",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Kapuas_Bridge_Putussibau.jpg"
      },
      {
        "file": "COLLECTIE TROPENMUSEUM Gezicht op de rivier Kapoeas met daarin woningen gefotografeerd vanaf de controleurssteiger ter hoogte van Poetoes Sibau TMnr 10020034.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/2/20/COLLECTIE_TROPENMUSEUM_Gezicht_op_de_rivier_Kapoeas_met_daarin_woningen_gefotografeerd_vanaf_de_controleurssteiger_ter_hoogte_van_Poetoes_Sibau_TMnr_10020034.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Stuut (Fotograaf/photographer).",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Gezicht_op_de_rivier_Kapoeas_met_daarin_woningen_gefotografeerd_vanaf_de_controleurssteiger_ter_hoogte_van_Poetoes_Sibau_TMnr_10020034.jpg"
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
        "file": "COLLECTIE TROPENMUSEUM Groep dansers uit Sasak TMnr 10004747.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/4/4b/COLLECTIE_TROPENMUSEUM_Groep_dansers_uit_Sasak_TMnr_10004747.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Groep_dansers_uit_Sasak_TMnr_10004747.jpg"
      },
      {
        "file": "Lombok's Sasak Tribe Traditional Cloth.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/5/51/Lombok%27s_Sasak_Tribe_Traditional_Cloth.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "First Lombok Tour",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Lombok%27s_Sasak_Tribe_Traditional_Cloth.jpg"
      }
    ]
  },
  "Salatiga": {
    "region": "jawa",
    "photos": [
      {
        "file": "COLLECTIE TROPENMUSEUM De Toetangsche weg te Salatiga Midden-Java TMnr 10007722.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/e/ee/COLLECTIE_TROPENMUSEUM_De_Toetangsche_weg_te_Salatiga_Midden-Java_TMnr_10007722.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_De_Toetangsche_weg_te_Salatiga_Midden-Java_TMnr_10007722.jpg"
      },
      {
        "file": "COLLECTIE TROPENMUSEUM Kerk te Salatiga Midden Java TMnr 10016742.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/1/15/COLLECTIE_TROPENMUSEUM_Kerk_te_Salatiga_Midden_Java_TMnr_10016742.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "H. (Hendrik) Veen (Fotograaf/photographer).",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Kerk_te_Salatiga_Midden_Java_TMnr_10016742.jpg"
      }
    ]
  },
  "Samarinda": {
    "region": "kalimantan",
    "photos": [
      {
        "file": "Panoramic Samarinda City From Islamic Centre Tower - panoramio (cropped).jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/d/da/Panoramic_Samarinda_City_From_Islamic_Centre_Tower_-_panoramio_%28cropped%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/5/54/Duurstede_Fort%2C_Saparua%2C_Ambon_-_Indonesia.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Dani wid",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Duurstede_Fort,_Saparua,_Ambon_-_Indonesia.jpg"
      },
      {
        "file": "Saparua from Duurstede Fort.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/f/f8/Saparua_from_Duurstede_Fort.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "file": "Catholic church at Sawahlunto.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/9/99/Catholic_church_at_Sawahlunto.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "WahyuS",
        "license": "CC BY 2.0",
        "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
        "page": "https://commons.wikimedia.org/wiki/File:Catholic_church_at_Sawahlunto.jpg"
      },
      {
        "file": "Masjid-agung-sawahlunto.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/e/eb/Masjid-agung-sawahlunto.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "id;user:Mamasamala",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Masjid-agung-sawahlunto.jpg"
      }
    ]
  },
  "Semarang": {
    "region": "jawa",
    "photos": [
      {
        "file": "COLLECTIE TROPENMUSEUM Chinees huis in Semarang TMnr 60022048.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/b/bd/COLLECTIE_TROPENMUSEUM_Chinees_huis_in_Semarang_TMnr_60022048.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Chinees_huis_in_Semarang_TMnr_60022048.jpg"
      },
      {
        "file": "COLLECTIE TROPENMUSEUM Het hoofdkantoor van de Nederlandsch-Indische Spoorweg Maatschappij (NIS) in Semarang TMnr 10032316.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/7/74/COLLECTIE_TROPENMUSEUM_Het_hoofdkantoor_van_de_Nederlandsch-Indische_Spoorweg_Maatschappij_%28NIS%29_in_Semarang_TMnr_10032316.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/1/10/Alun-alun_Sidoarjo.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/4/43/Ramayana-Mall-Sorong.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/c/c3/COLLECTIE_TROPENMUSEUM_De_Pasar_Besar_met_op_de_achtergrond_het_spoorwegviaduct_de_zogenoemde_Hogeweg_Soerabaja_TMnr_10014832.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_De_Pasar_Besar_met_op_de_achtergrond_het_spoorwegviaduct_de_zogenoemde_Hogeweg_Soerabaja_TMnr_10014832.jpg"
      },
      {
        "file": "COLLECTIE TROPENMUSEUM De achterzijde van het residentiehuis langs de Kali Ketabang Soerabaja TMnr 60005128.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/d/dc/COLLECTIE_TROPENMUSEUM_De_achterzijde_van_het_residentiehuis_langs_de_Kali_Ketabang_Soerabaja_TMnr_60005128.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "file": "COLLECTIE TROPENMUSEUM 'Leden van de 'Toradjasche Christelijke Jongelieden Vereeniging 'Boenga Lalan'' voor de pastorie te Malaboh Toraja Sulawesi.' TMnr 10001356.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/a/a5/COLLECTIE_TROPENMUSEUM_%27Leden_van_de_%27Toradjasche_Christelijke_Jongelieden_Vereeniging_%27Boenga_Lalan%27%27_voor_de_pastorie_te_Malaboh_Toraja_Sulawesi.%27_TMnr_10001356.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_%27Leden_van_de_%27Toradjasche_Christelijke_Jongelieden_Vereeniging_%27Boenga_Lalan%27%27_voor_de_pastorie_te_Malaboh_Toraja_Sulawesi.%27_TMnr_10001356.jpg"
      },
      {
        "file": "COLLECTIE TROPENMUSEUM Dodenfeest in Toraja Celebes TMnr 10003185.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/e/ee/COLLECTIE_TROPENMUSEUM_Dodenfeest_in_Toraja_Celebes_TMnr_10003185.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Dodenfeest_in_Toraja_Celebes_TMnr_10003185.jpg"
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
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/a/a5/Masjid_Agung_Tanjung_Selor.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "file": "COLLECTIE TROPENMUSEUM Straatgezicht met de protestantse kerk en de ingang van een moskee Tandjong Pinang TMnr 10015181.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/a/af/COLLECTIE_TROPENMUSEUM_Straatgezicht_met_de_protestantse_kerk_en_de_ingang_van_een_moskee_Tandjong_Pinang_TMnr_10015181.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Straatgezicht_met_de_protestantse_kerk_en_de_ingang_van_een_moskee_Tandjong_Pinang_TMnr_10015181.jpg"
      },
      {
        "file": "Muhammad Arif, MP of Tanjungpinang (2004-2021).jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/3/3e/Muhammad_Arif%2C_MP_of_Tanjungpinang_%282004-2021%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "file": "COLLECTIE TROPENMUSEUM Afscheepsteiger Tarakan 14 TMnr 10010382.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/c/cf/COLLECTIE_TROPENMUSEUM_Afscheepsteiger_Tarakan_14_TMnr_10010382.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Afscheepsteiger_Tarakan_14_TMnr_10010382.jpg"
      },
      {
        "file": "COLLECTIE TROPENMUSEUM Steiger en olietanks van de Bataafsche Petroleum Maatschappij (BPM) op het eiland Tarakan TMnr 60018735.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/3/30/COLLECTIE_TROPENMUSEUM_Steiger_en_olietanks_van_de_Bataafsche_Petroleum_Maatschappij_%28BPM%29_op_het_eiland_Tarakan_TMnr_60018735.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Steiger_en_olietanks_van_de_Bataafsche_Petroleum_Maatschappij_(BPM)_op_het_eiland_Tarakan_TMnr_60018735.jpg"
      }
    ]
  },
  "Tarutung": {
    "region": "sumatera",
    "photos": [
      {
        "file": "COLLECTIE TROPENMUSEUM Een overstroming van de Silindoengvlakte bij Taroetoeng TMnr 60021568.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/7/7c/COLLECTIE_TROPENMUSEUM_Een_overstroming_van_de_Silindoengvlakte_bij_Taroetoeng_TMnr_60021568.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "file": "COLLECTIE TROPENMUSEUM Het kantoor van de assistent-resident in Tasikmalaja TMnr 10015379.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/d/d5/COLLECTIE_TROPENMUSEUM_Het_kantoor_van_de_assistent-resident_in_Tasikmalaja_TMnr_10015379.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Het_kantoor_van_de_assistent-resident_in_Tasikmalaja_TMnr_10015379.jpg"
      },
      {
        "file": "Mt galunggung volcanic crater.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/8/88/Mt_galunggung_volcanic_crater.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Rossche",
        "license": "CC BY 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Mt_galunggung_volcanic_crater.jpg"
      }
    ]
  },
  "Tenganan": {
    "region": "bali-nusa",
    "photos": [
      {
        "file": "Gerinsing wayang,40 x 200 cm from the collection of Balique Arts of Indonesia..JPG",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/0/0d/Gerinsing_wayang%2C40_x_200_cm_from_the_collection_of_Balique_Arts_of_Indonesia..JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Chris Hazzard",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Gerinsing_wayang,40_x_200_cm_from_the_collection_of_Balique_Arts_of_Indonesia..JPG"
      },
      {
        "file": "Tenganan 1981 0017.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/d/d0/Tenganan_1981_0017.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/2/20/COLLECTIE_TROPENMUSEUM_Ingang_van_het_paleis_van_de_sultan_van_Ternate_TMnr_60018584.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Ingang_van_het_paleis_van_de_sultan_van_Ternate_TMnr_60018584.jpg"
      },
      {
        "file": "COLLECTIE TROPENMUSEUM Lijfwacht van de Sultan van Ternate TMnr 60039372.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/f/f4/COLLECTIE_TROPENMUSEUM_Lijfwacht_van_de_Sultan_van_Ternate_TMnr_60039372.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Lijfwacht_van_de_Sultan_van_Ternate_TMnr_60039372.jpg"
      }
    ]
  },
  "Timika": {
    "region": "papua",
    "photos": [
      {
        "file": "Bandar Udara Mozes Kilangin Timika.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/f/f4/Bandar_Udara_Mozes_Kilangin_Timika.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Rhani Lilianti Kata",
        "license": "CC BY 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Bandar_Udara_Mozes_Kilangin_Timika.jpg"
      },
      {
        "file": "Parking Area Moses Kilangin International Airport, Timika-Papua (Upload by Richard Erari).jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/f/fa/Parking_Area_Moses_Kilangin_International_Airport%2C_Timika-Papua_%28Upload_by_Richard_Erari%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "file": "COLLECTIE TROPENMUSEUM Een protestantse kerk in Tobelo TMnr 60014252.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/b/b6/COLLECTIE_TROPENMUSEUM_Een_protestantse_kerk_in_Tobelo_TMnr_60014252.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Een_protestantse_kerk_in_Tobelo_TMnr_60014252.jpg"
      },
      {
        "file": "COLLECTIE TROPENMUSEUM Halmahera Pakata Tobelo (voorgrond) en rorehe TMnr 10010571.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/b/bb/COLLECTIE_TROPENMUSEUM_Halmahera_Pakata_Tobelo_%28voorgrond%29_en_rorehe_TMnr_10010571.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "file": "COLLECTIE TROPENMUSEUM Een stadsgezicht van Tomohon van bovenaf gezien TMnr 60014273.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/c/c6/COLLECTIE_TROPENMUSEUM_Een_stadsgezicht_van_Tomohon_van_bovenaf_gezien_TMnr_60014273.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Een_stadsgezicht_van_Tomohon_van_bovenaf_gezien_TMnr_60014273.jpg"
      },
      {
        "file": "COLLECTIE TROPENMUSEUM Kerk te Tomohon. TMnr 60008323.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/a/a3/COLLECTIE_TROPENMUSEUM_Kerk_te_Tomohon._TMnr_60008323.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Unknown author Unknown author",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Kerk_te_Tomohon._TMnr_60008323.jpg"
      }
    ]
  },
  "Trowulan": {
    "region": "jawa",
    "photos": [
      {
        "file": "COLLECTIE TROPENMUSEUM De Candi Bajang Ratu TMnr 10028291.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/5/55/COLLECTIE_TROPENMUSEUM_De_Candi_Bajang_Ratu_TMnr_10028291.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Dr. W.G.N. (Wicher Gosen Nicolaas) van der Sleen (Fotograaf/photographer).",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_De_Candi_Bajang_Ratu_TMnr_10028291.jpg"
      },
      {
        "file": "Majapahit, Piggy Bank.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/0/04/Majapahit%2C_Piggy_Bank.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Original uploader was Gunawan Kartapranata at en.wikipedia",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "http://creativecommons.org/licenses/by-sa/3.0/",
        "page": "https://commons.wikimedia.org/wiki/File:Majapahit,_Piggy_Bank.jpg"
      }
    ]
  },
  "Tuban": {
    "region": "jawa",
    "photos": [
      {
        "file": "COLLECTIE TROPENMUSEUM Alun-alun met omsloten waringinbomen en voetbalveld Toeban TMnr 10027598.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/8/80/COLLECTIE_TROPENMUSEUM_Alun-alun_met_omsloten_waringinbomen_en_voetbalveld_Toeban_TMnr_10027598.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
        "author": "Dr. W.G.N. (Wicher Gosen Nicolaas) van der Sleen (Fotograaf/photographer).",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:COLLECTIE_TROPENMUSEUM_Alun-alun_met_omsloten_waringinbomen_en_voetbalveld_Toeban_TMnr_10027598.jpg"
      },
      {
        "file": "COLLECTIE TROPENMUSEUM Grot te Rengel Oost-Java TMnr 10021628.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/2/23/COLLECTIE_TROPENMUSEUM_Grot_te_Rengel_Oost-Java_TMnr_10021628.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/d/d2/COLLECTIE_TROPENMUSEUM_Markt_bij_een_puri_in_Oeboed_TMnr_10024054.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/7/7f/COLLECTIE_TROPENMUSEUM_Een_bantengstier_en_een_kalf_op_een_moerasweide_in_het_wildreservaat_Udjung_Kulon_op_West-Java_TMnr_10006631.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/3/3d/Bandar_Udara_Matahora_Wakatobi.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
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

/** 그 지점의 사진(최대 2장). 없으면 빈 배열. */
export function getPlacePhotos(id: string): MapPhoto[] {
  const p = MAP_PHOTOS[id];
  return p ? p.photos.slice(0, 2) : [];
}

/** 사진이 한 장 이상 있는 지점 수 (확인용) */
export function photoPlaceCount(): number {
  return Object.keys(MAP_PHOTOS).filter((k) => MAP_PHOTOS[k].photos.length > 0).length;
}
