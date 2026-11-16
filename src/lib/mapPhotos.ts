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
// 2026-11-16 scripts/build-map-photos.mjs — 지점 136 · 2장 108 · 1장 27 · 0장 1
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
        "file": "2018-12-04 Balikpapan cropped.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/2018-12-04_Balikpapan_cropped.jpg/500px-2018-12-04_Balikpapan_cropped.jpg",
        "author": "consigliere ivan",
        "license": "CC0",
        "licenseUrl": "http://creativecommons.org/publicdomain/zero/1.0/deed.en",
        "page": "https://commons.wikimedia.org/wiki/File:2018-12-04_Balikpapan_cropped.jpg"
      },
      {
        "file": "2018-06-13 Balikpapan Islamic Center.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/2018-06-13_Balikpapan_Islamic_Center.jpg/500px-2018-06-13_Balikpapan_Islamic_Center.jpg",
        "author": "consigliere ivan from Bontang, Indonesia",
        "license": "CC0",
        "licenseUrl": "http://creativecommons.org/publicdomain/zero/1.0/deed.en",
        "page": "https://commons.wikimedia.org/wiki/File:2018-06-13_Balikpapan_Islamic_Center.jpg"
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
        "file": "Kota Banjarmasin.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Kota_Banjarmasin.jpg/500px-Kota_Banjarmasin.jpg",
        "author": "Halim Drone",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Kota_Banjarmasin.jpg"
      },
      {
        "file": "Banjarmasin floating market, 2018.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Banjarmasin_floating_market%2C_2018.jpg/500px-Banjarmasin_floating_market%2C_2018.jpg",
        "author": "Mahfud651",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Banjarmasin_floating_market,_2018.jpg"
      }
    ]
  },
  "Banten Lama": {
    "region": "jawa",
    "photos": [
      {
        "file": "Masjid agung banten lama.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Masjid_agung_banten_lama.jpg/500px-Masjid_agung_banten_lama.jpg",
        "author": "Firdaus31",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Masjid_agung_banten_lama.jpg"
      },
      {
        "file": "Tampak Fondasi Ruang Dayang-Dayang Keraton Surosowan.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Tampak_Fondasi_Ruang_Dayang-Dayang_Keraton_Surosowan.jpg/500px-Tampak_Fondasi_Ruang_Dayang-Dayang_Keraton_Surosowan.jpg",
        "author": "Arif Permana Putra",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Tampak_Fondasi_Ruang_Dayang-Dayang_Keraton_Surosowan.jpg"
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
    "photos": [
      {
        "file": "Kalimalang.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Kalimalang.jpg/500px-Kalimalang.jpg",
        "author": "@preplime",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Kalimalang.jpg"
      },
      {
        "file": "Bekasi Mall Night 2.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Bekasi_Mall_Night_2.jpg/500px-Bekasi_Mall_Night_2.jpg",
        "author": "Garybhaztara",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Bekasi_Mall_Night_2.jpg"
      }
    ]
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
        "file": "Tugu Brastagi.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Tugu_Brastagi.jpg/500px-Tugu_Brastagi.jpg",
        "author": "Ken Marshall",
        "license": "CC BY 2.0",
        "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
        "page": "https://commons.wikimedia.org/wiki/File:Tugu_Brastagi.jpg"
      },
      {
        "file": "Berastagi viewed from Gundaling Hill (Panorama) 01.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Berastagi_viewed_from_Gundaling_Hill_%28Panorama%29_01.jpg/500px-Berastagi_viewed_from_Gundaling_Hill_%28Panorama%29_01.jpg",
        "author": "Christian Advs Sltg",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Berastagi_viewed_from_Gundaling_Hill_(Panorama)_01.jpg"
      }
    ]
  },
  "Bima": {
    "region": "bali-nusa",
    "photos": [
      {
        "file": "Bima di atas bukit.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Bima_di_atas_bukit.jpg/500px-Bima_di_atas_bukit.jpg",
        "author": "Bungpras",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Bima_di_atas_bukit.jpg"
      },
      {
        "file": "City of bima indonesia.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/City_of_bima_indonesia.jpg/500px-City_of_bima_indonesia.jpg",
        "author": "22nurhidayanti",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:City_of_bima_indonesia.jpg"
      }
    ]
  },
  "Binjai": {
    "region": "sumatera",
    "photos": [
      {
        "file": "Binjai.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/Binjai.jpg/500px-Binjai.jpg",
        "author": "Davidelit",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Binjai.jpg"
      },
      {
        "file": "AmirHamzahHouse.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/AmirHamzahHouse.jpg/500px-AmirHamzahHouse.jpg",
        "author": "Davidelit",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:AmirHamzahHouse.jpg"
      }
    ]
  },
  "Bogor": {
    "region": "jawa",
    "photos": [
      {
        "file": "Istana presiden republik Indonesia di Bogor.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Istana_presiden_republik_Indonesia_di_Bogor.jpg/500px-Istana_presiden_republik_Indonesia_di_Bogor.jpg",
        "author": "Nafisathallah",
        "license": "CC BY 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Istana_presiden_republik_Indonesia_di_Bogor.jpg"
      },
      {
        "file": "Kebun Raya Bogor 19.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Kebun_Raya_Bogor_19.jpg/500px-Kebun_Raya_Bogor_19.jpg",
        "author": "Cep Budhi Darma",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Kebun_Raya_Bogor_19.jpg"
      }
    ]
  },
  "Bone": {
    "region": "sulawesi",
    "photos": [
      {
        "file": "Port of Bajoe, Bone, South Sulawesi 3 2012.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Port_of_Bajoe%2C_Bone%2C_South_Sulawesi_3_2012.jpg/500px-Port_of_Bajoe%2C_Bone%2C_South_Sulawesi_3_2012.jpg",
        "author": "Midori",
        "license": "CC BY 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Port_of_Bajoe,_Bone,_South_Sulawesi_3_2012.jpg"
      },
      {
        "file": "KMP Kotabumi at Port of Bajoe Bone South Sulawesi.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/KMP_Kotabumi_at_Port_of_Bajoe_Bone_South_Sulawesi.jpg/500px-KMP_Kotabumi_at_Port_of_Bajoe_Bone_South_Sulawesi.jpg",
        "author": "Midori",
        "license": "CC BY 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:KMP_Kotabumi_at_Port_of_Bajoe_Bone_South_Sulawesi.jpg"
      }
    ]
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
    "photos": [
      {
        "file": "Bunaken.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Bunaken.jpg/500px-Bunaken.jpg",
        "author": "User:Borgx",
        "license": "Public domain",
        "licenseUrl": "",
        "page": "https://commons.wikimedia.org/wiki/File:Bunaken.jpg"
      },
      {
        "file": "Bunaken3.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/Bunaken3.jpg/500px-Bunaken3.jpg",
        "author": "No machine-readable author provided. Borgx assumed (based on copyright claims).",
        "license": "Public domain",
        "licenseUrl": "",
        "page": "https://commons.wikimedia.org/wiki/File:Bunaken3.jpg"
      }
    ]
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
    "photos": [
      {
        "file": "Arjuna Temple Complex in the Dieng Plateau.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Arjuna_Temple_Complex_in_the_Dieng_Plateau.jpg/500px-Arjuna_Temple_Complex_in_the_Dieng_Plateau.jpg",
        "author": "Uncredited",
        "license": "Public domain",
        "licenseUrl": "",
        "page": "https://commons.wikimedia.org/wiki/File:Arjuna_Temple_Complex_in_the_Dieng_Plateau.jpg"
      },
      {
        "file": "Pagi Candi Arjuna Dieng.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Pagi_Candi_Arjuna_Dieng.jpg/500px-Pagi_Candi_Arjuna_Dieng.jpg",
        "author": "Yogaprihananto",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Pagi_Candi_Arjuna_Dieng.jpg"
      }
    ]
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
    "photos": [
      {
        "file": "Abdulrohmatt3.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/Abdulrohmatt3.jpg/500px-Abdulrohmatt3.jpg",
        "author": "Abdulrohmatt",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Abdulrohmatt3.jpg"
      },
      {
        "file": "DSC00029 Java Little Sundanais Traditional Village Kampung Naga (6219569245).jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/DSC00029_Java_Little_Sundanais_Traditional_Village_Kampung_Naga_%286219569245%29.jpg/500px-DSC00029_Java_Little_Sundanais_Traditional_Village_Kampung_Naga_%286219569245%29.jpg",
        "author": "DANIEL JULIE from Paris, France",
        "license": "CC BY 2.0",
        "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
        "page": "https://commons.wikimedia.org/wiki/File:DSC00029_Java_Little_Sundanais_Traditional_Village_Kampung_Naga_(6219569245).jpg"
      }
    ]
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
        "file": "BandaBesarIslandSeenFromFortBelgica.JPG",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/BandaBesarIslandSeenFromFortBelgica.JPG/500px-BandaBesarIslandSeenFromFortBelgica.JPG",
        "author": "Photo by Mark Richards",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "http://creativecommons.org/licenses/by-sa/3.0/",
        "page": "https://commons.wikimedia.org/wiki/File:BandaBesarIslandSeenFromFortBelgica.JPG"
      },
      {
        "file": "Banda-0039.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Banda-0039.jpg/500px-Banda-0039.jpg",
        "author": "Anton Leddin",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Banda-0039.jpg"
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
    "photos": [
      {
        "file": "Mentawai Uma.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Mentawai_Uma.jpg/500px-Mentawai_Uma.jpg",
        "author": "Alex Lapuerta",
        "license": "CC BY 2.0",
        "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
        "page": "https://commons.wikimedia.org/wiki/File:Mentawai_Uma.jpg"
      },
      {
        "file": "Pantai Jati 1.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Pantai_Jati_1.jpg/500px-Pantai_Jati_1.jpg",
        "author": "S Kartika",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Pantai_Jati_1.jpg"
      }
    ]
  },
  "Kepulauan Togean": {
    "region": "sulawesi",
    "photos": [
      {
        "file": "Babyrousa togeanensis.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Babyrousa_togeanensis.jpg/500px-Babyrousa_togeanensis.jpg",
        "author": "Mangkau Zulkifli",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Babyrousa_togeanensis.jpg"
      },
      {
        "file": "Reconnect-resort-buka-buka-island.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Reconnect-resort-buka-buka-island.jpg/500px-Reconnect-resort-buka-buka-island.jpg",
        "author": "Thomasdespin",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Reconnect-resort-buka-buka-island.jpg"
      }
    ]
  },
  "Krakatau": {
    "region": "jawa",
    "photos": [
      {
        "file": "Anak Krakatau-2.JPG",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Anak_Krakatau-2.JPG/500px-Anak_Krakatau-2.JPG",
        "author": "Lord Mountbatten",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Anak_Krakatau-2.JPG"
      },
      {
        "file": "Anak Krakatau.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Anak_Krakatau.jpg/500px-Anak_Krakatau.jpg",
        "author": "Evanradit12",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Anak_Krakatau.jpg"
      }
    ]
  },
  "Kudus": {
    "region": "jawa",
    "photos": [
      {
        "file": "Masjid Menara Kudus.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Masjid_Menara_Kudus.jpg/500px-Masjid_Menara_Kudus.jpg",
        "author": "PL09Puryono",
        "license": "CC0",
        "licenseUrl": "http://creativecommons.org/publicdomain/zero/1.0/deed.en",
        "page": "https://commons.wikimedia.org/wiki/File:Masjid_Menara_Kudus.jpg"
      },
      {
        "file": "Masjid Menara Kudus Tampak Depan.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Masjid_Menara_Kudus_Tampak_Depan.jpg/500px-Masjid_Menara_Kudus_Tampak_Depan.jpg",
        "author": "PL09Puryono",
        "license": "CC0",
        "licenseUrl": "http://creativecommons.org/publicdomain/zero/1.0/deed.en",
        "page": "https://commons.wikimedia.org/wiki/File:Masjid_Menara_Kudus_Tampak_Depan.jpg"
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
    "photos": [
      {
        "file": "Kuta Beach (6924448550).jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Kuta_Beach_%286924448550%29.jpg/500px-Kuta_Beach_%286924448550%29.jpg",
        "author": "Simon_sees from Australia",
        "license": "CC BY 2.0",
        "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
        "page": "https://commons.wikimedia.org/wiki/File:Kuta_Beach_(6924448550).jpg"
      },
      {
        "file": "Kuta Square.JPG",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Kuta_Square.JPG/500px-Kuta_Square.JPG",
        "author": "Sho Horiuchi",
        "license": "CC0",
        "licenseUrl": "http://creativecommons.org/publicdomain/zero/1.0/deed.en",
        "page": "https://commons.wikimedia.org/wiki/File:Kuta_Square.JPG"
      }
    ]
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
        "file": "Cattedrale di Larantuka.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Cattedrale_di_Larantuka.jpg/500px-Cattedrale_di_Larantuka.jpg",
        "author": "Avemundi",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Cattedrale_di_Larantuka.jpg"
      },
      {
        "file": "Prosesi Laut Antar Tuan Meninu (Patung Bayi Yesus).jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Prosesi_Laut_Antar_Tuan_Meninu_%28Patung_Bayi_Yesus%29.jpg/500px-Prosesi_Laut_Antar_Tuan_Meninu_%28Patung_Bayi_Yesus%29.jpg",
        "author": "Flaviana Sogen",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Prosesi_Laut_Antar_Tuan_Meninu_(Patung_Bayi_Yesus).jpg"
      }
    ]
  },
  "Lasem": {
    "region": "jawa",
    "photos": [
      {
        "file": "Oemah Batik Lasem.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/Oemah_Batik_Lasem.jpg/500px-Oemah_Batik_Lasem.jpg",
        "author": "Harditaher",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Oemah_Batik_Lasem.jpg"
      },
      {
        "file": "Sarung batik tulis lasem premium tiga negeri.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Sarung_batik_tulis_lasem_premium_tiga_negeri.jpg/500px-Sarung_batik_tulis_lasem_premium_tiga_negeri.jpg",
        "author": "Kynnrzk",
        "license": "CC0",
        "licenseUrl": "http://creativecommons.org/publicdomain/zero/1.0/deed.en",
        "page": "https://commons.wikimedia.org/wiki/File:Sarung_batik_tulis_lasem_premium_tiga_negeri.jpg"
      }
    ]
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
    "photos": [
      {
        "file": "Kantor Pemerintahan Kota Madiun tahun 2020.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/Kantor_Pemerintahan_Kota_Madiun_tahun_2020.jpg/500px-Kantor_Pemerintahan_Kota_Madiun_tahun_2020.jpg",
        "author": "Anantohermawan1988",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Kantor_Pemerintahan_Kota_Madiun_tahun_2020.jpg"
      },
      {
        "file": "Area depan Eks Roemah Kapitein Tjina Njoo Swie Lian Madiun.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Area_depan_Eks_Roemah_Kapitein_Tjina_Njoo_Swie_Lian_Madiun.jpg/500px-Area_depan_Eks_Roemah_Kapitein_Tjina_Njoo_Swie_Lian_Madiun.jpg",
        "author": "Annidafattiya",
        "license": "CC BY 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Area_depan_Eks_Roemah_Kapitein_Tjina_Njoo_Swie_Lian_Madiun.jpg"
      }
    ]
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
      }
    ]
  },
  "Maros-Pangkep": {
    "region": "sulawesi",
    "photos": [
      {
        "file": "Area sawah tadah hujan dengan bukit karst di rammang-rammang.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Area_sawah_tadah_hujan_dengan_bukit_karst_di_rammang-rammang.jpg/500px-Area_sawah_tadah_hujan_dengan_bukit_karst_di_rammang-rammang.jpg",
        "author": "Chafidwahyu",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Area_sawah_tadah_hujan_dengan_bukit_karst_di_rammang-rammang.jpg"
      },
      {
        "file": "Bantimurung-Bulusauraung National Park.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Bantimurung-Bulusauraung_National_Park.jpg/500px-Bantimurung-Bulusauraung_National_Park.jpg",
        "author": "22Kartika",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Bantimurung-Bulusauraung_National_Park.jpg"
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
        "author": "Snpoj (영어 위키백과)",
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
        "file": "Medan city 2019.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Medan_city_2019.jpg/500px-Medan_city_2019.jpg",
        "author": "Bluesatellite",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Medan_city_2019.jpg"
      },
      {
        "file": "Istana Maimun.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Istana_Maimun.jpg/500px-Istana_Maimun.jpg",
        "author": "Adhmi",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Istana_Maimun.jpg"
      }
    ]
  },
  "Merauke": {
    "region": "papua",
    "photos": [
      {
        "file": "Tugu Lingkaran Brawijaya 969.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/Tugu_Lingkaran_Brawijaya_969.jpg/500px-Tugu_Lingkaran_Brawijaya_969.jpg",
        "author": "Marwan Mohamad",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Tugu_Lingkaran_Brawijaya_969.jpg"
      },
      {
        "file": "Melaleuca.Sp lahan basah TN Wasur.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/Melaleuca.Sp_lahan_basah_TN_Wasur.jpg/500px-Melaleuca.Sp_lahan_basah_TN_Wasur.jpg",
        "author": "Arifrudiana 011213",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Melaleuca.Sp_lahan_basah_TN_Wasur.jpg"
      }
    ]
  },
  "Muara Jambi": {
    "region": "sumatera",
    "photos": [
      {
        "file": "Candi Muaro Jambi di siang hari.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Candi_Muaro_Jambi_di_siang_hari.jpg/500px-Candi_Muaro_Jambi_di_siang_hari.jpg",
        "author": "Ryan Wijaya",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Candi_Muaro_Jambi_di_siang_hari.jpg"
      },
      {
        "file": "004 Main Building, Side View, Candi Tinggi 2 (39127443191).jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/004_Main_Building%2C_Side_View%2C_Candi_Tinggi_2_%2839127443191%29.jpg/500px-004_Main_Building%2C_Side_View%2C_Candi_Tinggi_2_%2839127443191%29.jpg",
        "author": "Anandajoti Bhikkhu from Sadao, Thailand",
        "license": "CC BY 2.0",
        "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
        "page": "https://commons.wikimedia.org/wiki/File:004_Main_Building,_Side_View,_Candi_Tinggi_2_(39127443191).jpg"
      }
    ]
  },
  "Muntilan": {
    "region": "jawa",
    "photos": [
      {
        "file": "Kerkof Muntilan, Magelang, Jawa Tengah.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/Kerkof_Muntilan%2C_Magelang%2C_Jawa_Tengah.jpg/500px-Kerkof_Muntilan%2C_Magelang%2C_Jawa_Tengah.jpg",
        "author": "Makamindo",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Kerkof_Muntilan,_Magelang,_Jawa_Tengah.jpg"
      },
      {
        "file": "Makam Justinus Kardinal Darmoyuwono di Kerkof Muntilan 8.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Makam_Justinus_Kardinal_Darmoyuwono_di_Kerkof_Muntilan_8.jpg/500px-Makam_Justinus_Kardinal_Darmoyuwono_di_Kerkof_Muntilan_8.jpg",
        "author": "Makamindo",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Makam_Justinus_Kardinal_Darmoyuwono_di_Kerkof_Muntilan_8.jpg"
      }
    ]
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
        "author": "Ikhvan (Flickr)",
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
    "photos": [
      {
        "file": "Bundaran Besar Palangka Raya (baru).jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Bundaran_Besar_Palangka_Raya_%28baru%29.jpg/500px-Bundaran_Besar_Palangka_Raya_%28baru%29.jpg",
        "author": "ParadoxP P",
        "license": "CC BY 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Bundaran_Besar_Palangka_Raya_(baru).jpg"
      },
      {
        "file": "Duta Mall Palangka Raya (20260117 145441).jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Duta_Mall_Palangka_Raya_%2820260117_145441%29.jpg/500px-Duta_Mall_Palangka_Raya_%2820260117_145441%29.jpg",
        "author": "Gabpzxs",
        "license": "CC0",
        "licenseUrl": "http://creativecommons.org/publicdomain/zero/1.0/deed.en",
        "page": "https://commons.wikimedia.org/wiki/File:Duta_Mall_Palangka_Raya_(20260117_145441).jpg"
      }
    ]
  },
  "Palembang": {
    "region": "sumatera",
    "photos": [
      {
        "file": "Ampera Bridge at Late Afternoon, Palembang.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Ampera_Bridge_at_Late_Afternoon%2C_Palembang.jpg/500px-Ampera_Bridge_at_Late_Afternoon%2C_Palembang.jpg",
        "author": "Gunawan Kartapranata",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Ampera_Bridge_at_Late_Afternoon,_Palembang.jpg"
      },
      {
        "file": "LRT Palembang Ampera Bridge.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/LRT_Palembang_Ampera_Bridge.jpg/500px-LRT_Palembang_Ampera_Bridge.jpg",
        "author": "Gaudi Renanda",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:LRT_Palembang_Ampera_Bridge.jpg"
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
    "photos": [
      {
        "file": "Monumen Arek Lancor Pamekasan.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/Monumen_Arek_Lancor_Pamekasan.jpg/500px-Monumen_Arek_Lancor_Pamekasan.jpg",
        "author": "Andika Faris",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Monumen_Arek_Lancor_Pamekasan.jpg"
      },
      {
        "file": "Karapan Sapi Madura.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Karapan_Sapi_Madura.jpg/500px-Karapan_Sapi_Madura.jpg",
        "author": "Ivuvisual",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Karapan_Sapi_Madura.jpg"
      }
    ]
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
        "file": "Mintorahayu, Winong, Pati Regency, Central Java, Indonesia - panoramio.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/Mintorahayu%2C_Winong%2C_Pati_Regency%2C_Central_Java%2C_Indonesia_-_panoramio.jpg/500px-Mintorahayu%2C_Winong%2C_Pati_Regency%2C_Central_Java%2C_Indonesia_-_panoramio.jpg",
        "author": "Aris Setiawan",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Mintorahayu,_Winong,_Pati_Regency,_Central_Java,_Indonesia_-_panoramio.jpg"
      },
      {
        "file": "Masjid Agung Baitunnur Pati.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/Masjid_Agung_Baitunnur_Pati.jpg/500px-Masjid_Agung_Baitunnur_Pati.jpg",
        "author": "FPVRICO",
        "license": "CC BY 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Masjid_Agung_Baitunnur_Pati.jpg"
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
        "file": "Equator Pontianak Monument.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Equator_Pontianak_Monument.jpg/500px-Equator_Pontianak_Monument.jpg",
        "author": "baka_neko_baka",
        "license": "CC BY 2.0",
        "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
        "page": "https://commons.wikimedia.org/wiki/File:Equator_Pontianak_Monument.jpg"
      },
      {
        "file": "Pontianak Kapuas Bridge.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/Pontianak_Kapuas_Bridge.jpg/500px-Pontianak_Kapuas_Bridge.jpg",
        "author": "Liuzhary",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Pontianak_Kapuas_Bridge.jpg"
      }
    ]
  },
  "Prambanan": {
    "region": "jawa",
    "photos": [
      {
        "file": "Yogyakarta Indonesia Prambanan-temple-complex-02.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Yogyakarta_Indonesia_Prambanan-temple-complex-02.jpg/500px-Yogyakarta_Indonesia_Prambanan-temple-complex-02.jpg",
        "author": "CEphoto, Uwe Aranas",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Yogyakarta_Indonesia_Prambanan-temple-complex-02.jpg"
      },
      {
        "file": "Brahma temple Prambanan 2017-08-02 (3).jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Brahma_temple_Prambanan_2017-08-02_%283%29.jpg/500px-Brahma_temple_Prambanan_2017-08-02_%283%29.jpg",
        "author": "Magul",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Brahma_temple_Prambanan_2017-08-02_(3).jpg"
      }
    ]
  },
  "Probolinggo": {
    "region": "jawa",
    "photos": [
      {
        "file": "Benteng Mayangan Kota Probolinggo.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/Benteng_Mayangan_Kota_Probolinggo.jpg/500px-Benteng_Mayangan_Kota_Probolinggo.jpg",
        "author": "Gunarta",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Benteng_Mayangan_Kota_Probolinggo.jpg"
      },
      {
        "file": "Fishing boats, Probolinggo, 2016 (02).jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Fishing_boats%2C_Probolinggo%2C_2016_%2802%29.jpg/500px-Fishing_boats%2C_Probolinggo%2C_2016_%2802%29.jpg",
        "author": "Bahnfrend",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Fishing_boats,_Probolinggo,_2016_(02).jpg"
      }
    ]
  },
  "Pulau Belitung": {
    "region": "sumatera",
    "photos": [
      {
        "file": "Berlayar di Semenanjung Belitung.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Berlayar_di_Semenanjung_Belitung.jpg/500px-Berlayar_di_Semenanjung_Belitung.jpg",
        "author": "Tesatj",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Berlayar_di_Semenanjung_Belitung.jpg"
      },
      {
        "file": "Pantai Tanjung Tinggi Belitung 02.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Pantai_Tanjung_Tinggi_Belitung_02.jpg/500px-Pantai_Tanjung_Tinggi_Belitung_02.jpg",
        "author": "Raflinoer32",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Pantai_Tanjung_Tinggi_Belitung_02.jpg"
      }
    ]
  },
  "Pulau Komodo": {
    "region": "bali-nusa",
    "photos": [
      {
        "file": "Komodo Island north aerial.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Komodo_Island_north_aerial.jpg/500px-Komodo_Island_north_aerial.jpg",
        "author": "jon hanson from London",
        "license": "CC BY-SA 2.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0",
        "page": "https://commons.wikimedia.org/wiki/File:Komodo_Island_north_aerial.jpg"
      },
      {
        "file": "Komodo Dragon (01).jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Komodo_Dragon_%2801%29.jpg/500px-Komodo_Dragon_%2801%29.jpg",
        "author": "NAPARAZZI",
        "license": "CC BY-SA 2.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0",
        "page": "https://commons.wikimedia.org/wiki/File:Komodo_Dragon_(01).jpg"
      }
    ]
  },
  "Pulau Mansinam": {
    "region": "papua",
    "photos": [
      {
        "file": "Mansinam Jesus Statue.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Mansinam_Jesus_Statue.jpg/500px-Mansinam_Jesus_Statue.jpg",
        "author": "Radio Republik Indonesia",
        "license": "Public domain",
        "licenseUrl": "",
        "page": "https://commons.wikimedia.org/wiki/File:Mansinam_Jesus_Statue.jpg"
      },
      {
        "file": "Sumur Tua JL Van Hasselt 005.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Sumur_Tua_JL_Van_Hasselt_005.jpg/500px-Sumur_Tua_JL_Van_Hasselt_005.jpg",
        "author": "Muhhussen",
        "license": "CC0",
        "licenseUrl": "http://creativecommons.org/publicdomain/zero/1.0/deed.en",
        "page": "https://commons.wikimedia.org/wiki/File:Sumur_Tua_JL_Van_Hasselt_005.jpg"
      }
    ]
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
    "photos": [
      {
        "file": "Boats at Raijua Pier 2022.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Boats_at_Raijua_Pier_2022.jpg/500px-Boats_at_Raijua_Pier_2022.jpg",
        "author": "Bobby Battileo",
        "license": "CC BY 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Boats_at_Raijua_Pier_2022.jpg"
      },
      {
        "file": "Tubular dress, Savu, Indonesia, early 20th century, cotton - Fernbank Museum of Natural History - DSC09979.JPG",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Tubular_dress%2C_Savu%2C_Indonesia%2C_early_20th_century%2C_cotton_-_Fernbank_Museum_of_Natural_History_-_DSC09979.JPG/500px-Tubular_dress%2C_Savu%2C_Indonesia%2C_early_20th_century%2C_cotton_-_Fernbank_Museum_of_Natural_History_-_DSC09979.JPG",
        "author": "Daderot",
        "license": "CC0",
        "licenseUrl": "http://creativecommons.org/publicdomain/zero/1.0/deed.en",
        "page": "https://commons.wikimedia.org/wiki/File:Tubular_dress,_Savu,_Indonesia,_early_20th_century,_cotton_-_Fernbank_Museum_of_Natural_History_-_DSC09979.JPG"
      }
    ]
  },
  "Pulau Sumba": {
    "region": "bali-nusa",
    "photos": [
      {
        "file": "Kampung Adat Ratenggaro - Sumba.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/Kampung_Adat_Ratenggaro_-_Sumba.jpg/500px-Kampung_Adat_Ratenggaro_-_Sumba.jpg",
        "author": "Sandhi Irawan",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Kampung_Adat_Ratenggaro_-_Sumba.jpg"
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
        "file": "Balohan Sea Port from the hill of east side of Weh Island, Sabang. Aceh.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/Balohan_Sea_Port_from_the_hill_of_east_side_of_Weh_Island%2C_Sabang._Aceh.jpg/500px-Balohan_Sea_Port_from_the_hill_of_east_side_of_Weh_Island%2C_Sabang._Aceh.jpg",
        "author": "Tj Pramono",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Balohan_Sea_Port_from_the_hill_of_east_side_of_Weh_Island,_Sabang._Aceh.jpg"
      },
      {
        "file": "Mangroves in Pulau Weh (8217722738).jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Mangroves_in_Pulau_Weh_%288217722738%29.jpg/500px-Mangroves_in_Pulau_Weh_%288217722738%29.jpg",
        "author": "Pavel Kirillov from St.Petersburg, Russia",
        "license": "CC BY-SA 2.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0",
        "page": "https://commons.wikimedia.org/wiki/File:Mangroves_in_Pulau_Weh_(8217722738).jpg"
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
      }
    ]
  },
  "Purwokerto": {
    "region": "jawa",
    "photos": [
      {
        "file": "View of the General Gatot Subroto Monument.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/View_of_the_General_Gatot_Subroto_Monument.jpg/500px-View_of_the_General_Gatot_Subroto_Monument.jpg",
        "author": "Nararya Danuwijaya",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:View_of_the_General_Gatot_Subroto_Monument.jpg"
      },
      {
        "file": "Alun - Alun Purwokerto & Pendapa Si Panji dengan Latar belakang Gunung Slamet.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Alun_-_Alun_Purwokerto_%26_Pendapa_Si_Panji_dengan_Latar_belakang_Gunung_Slamet.jpg/500px-Alun_-_Alun_Purwokerto_%26_Pendapa_Si_Panji_dengan_Latar_belakang_Gunung_Slamet.jpg",
        "author": "Tyo Satriany",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Alun_-_Alun_Purwokerto_%26_Pendapa_Si_Panji_dengan_Latar_belakang_Gunung_Slamet.jpg"
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
    "photos": [
      {
        "file": "Piaynemo, Raja Ampat (39660320633).jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Piaynemo%2C_Raja_Ampat_%2839660320633%29.jpg/500px-Piaynemo%2C_Raja_Ampat_%2839660320633%29.jpg",
        "author": "peter harris",
        "license": "CC0",
        "licenseUrl": "http://creativecommons.org/publicdomain/zero/1.0/deed.en",
        "page": "https://commons.wikimedia.org/wiki/File:Piaynemo,_Raja_Ampat_(39660320633).jpg"
      },
      {
        "file": "Pulau Piaynemo, Raja Ampat.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Pulau_Piaynemo%2C_Raja_Ampat.jpg/500px-Pulau_Piaynemo%2C_Raja_Ampat.jpg",
        "author": "Rizalubun",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Pulau_Piaynemo,_Raja_Ampat.jpg"
      }
    ]
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
    "photos": [
      {
        "file": "Java Man Statue at the Sangiran Early Man Site.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Java_Man_Statue_at_the_Sangiran_Early_Man_Site.jpg/500px-Java_Man_Statue_at_the_Sangiran_Early_Man_Site.jpg",
        "author": "Ministry of Culture (Indonesia)",
        "license": "Public domain",
        "licenseUrl": "",
        "page": "https://commons.wikimedia.org/wiki/File:Java_Man_Statue_at_the_Sangiran_Early_Man_Site.jpg"
      },
      {
        "file": "Sangiran Early Man Museum, Krikilan Cluster.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Sangiran_Early_Man_Museum%2C_Krikilan_Cluster.jpg/500px-Sangiran_Early_Man_Museum%2C_Krikilan_Cluster.jpg",
        "author": "Ministry of Culture (Indonesia)",
        "license": "Public domain",
        "licenseUrl": "",
        "page": "https://commons.wikimedia.org/wiki/File:Sangiran_Early_Man_Museum,_Krikilan_Cluster.jpg"
      }
    ]
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
        "author": "Mighty Bowo (Flickr)",
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
        "file": "Lawang Sewu in Semarang City.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Lawang_Sewu_in_Semarang_City.jpg/500px-Lawang_Sewu_in_Semarang_City.jpg",
        "author": "Uncredited",
        "license": "Public domain",
        "licenseUrl": "",
        "page": "https://commons.wikimedia.org/wiki/File:Lawang_Sewu_in_Semarang_City.jpg"
      },
      {
        "file": "Gedung Batu Temple Semarang (little cropped).jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Gedung_Batu_Temple_Semarang_%28little_cropped%29.jpg/500px-Gedung_Batu_Temple_Semarang_%28little_cropped%29.jpg",
        "author": "Alex Santosa",
        "license": "CC BY-SA 2.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0",
        "page": "https://commons.wikimedia.org/wiki/File:Gedung_Batu_Temple_Semarang_(little_cropped).jpg"
      }
    ]
  },
  "Serang": {
    "region": "jawa",
    "photos": [
      {
        "file": "Great Mosque of Serang.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/Great_Mosque_of_Serang.jpg/500px-Great_Mosque_of_Serang.jpg",
        "author": "JahlilMA",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Great_Mosque_of_Serang.jpg"
      },
      {
        "file": "Cagar Alam Pulau Dua, Banten, 23042017.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Cagar_Alam_Pulau_Dua%2C_Banten%2C_23042017.jpg/500px-Cagar_Alam_Pulau_Dua%2C_Banten%2C_23042017.jpg",
        "author": "Raffiakbar29",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Cagar_Alam_Pulau_Dua,_Banten,_23042017.jpg"
      }
    ]
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
    "photos": [
      {
        "file": "Tugu Naga Singkawang.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Tugu_Naga_Singkawang.jpg/500px-Tugu_Naga_Singkawang.jpg",
        "author": "Muhammad Ali Yofi",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Tugu_Naga_Singkawang.jpg"
      },
      {
        "file": "Bangunan Cagar Budaya Marga Tjhia.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/Bangunan_Cagar_Budaya_Marga_Tjhia.jpg/500px-Bangunan_Cagar_Budaya_Marga_Tjhia.jpg",
        "author": "Liuzhary",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Bangunan_Cagar_Budaya_Marga_Tjhia.jpg"
      }
    ]
  },
  "Soe": {
    "region": "bali-nusa",
    "photos": [
      {
        "file": "Rumah Bulat.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Rumah_Bulat.jpg/500px-Rumah_Bulat.jpg",
        "author": "Jek Atapada",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Rumah_Bulat.jpg"
      },
      {
        "file": "Oelekam, Central Mollo, South Timor Tengah Regency, East Nusa Tenggara, Indonesia - panoramio.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Oelekam%2C_Central_Mollo%2C_South_Timor_Tengah_Regency%2C_East_Nusa_Tenggara%2C_Indonesia_-_panoramio.jpg/500px-Oelekam%2C_Central_Mollo%2C_South_Timor_Tengah_Regency%2C_East_Nusa_Tenggara%2C_Indonesia_-_panoramio.jpg",
        "author": "Emus Usboko",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Oelekam,_Central_Mollo,_South_Timor_Tengah_Regency,_East_Nusa_Tenggara,_Indonesia_-_panoramio.jpg"
      }
    ]
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
    "photos": [
      {
        "file": "Sukabumi Grand Mosque 2022 01.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Sukabumi_Grand_Mosque_2022_01.jpg/500px-Sukabumi_Grand_Mosque_2022_01.jpg",
        "author": "Afrogindahood",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Sukabumi_Grand_Mosque_2022_01.jpg"
      },
      {
        "file": "Dago Pedestrian Zone, Sukabumi.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/Dago_Pedestrian_Zone%2C_Sukabumi.jpg/500px-Dago_Pedestrian_Zone%2C_Sukabumi.jpg",
        "author": "Afrogindahood",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Dago_Pedestrian_Zone,_Sukabumi.jpg"
      }
    ]
  },
  "Surabaya": {
    "region": "jawa",
    "photos": [
      {
        "file": "Central Surabaya view taken from JW Marriott Surabaya.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Central_Surabaya_view_taken_from_JW_Marriott_Surabaya.jpg/500px-Central_Surabaya_view_taken_from_JW_Marriott_Surabaya.jpg",
        "author": "consigliere ivan",
        "license": "CC BY 2.0",
        "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
        "page": "https://commons.wikimedia.org/wiki/File:Central_Surabaya_view_taken_from_JW_Marriott_Surabaya.jpg"
      },
      {
        "file": "Suramadu Bridge 3.JPG",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Suramadu_Bridge_3.JPG/500px-Suramadu_Bridge_3.JPG",
        "author": "Sakurai Midori",
        "license": "CC BY 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Suramadu_Bridge_3.JPG"
      }
    ]
  },
  "Surakarta": {
    "region": "jawa",
    "photos": [
      {
        "file": "Pura Mangkunegaran Surakarta.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Pura_Mangkunegaran_Surakarta.jpg/500px-Pura_Mangkunegaran_Surakarta.jpg",
        "author": "SakaReksapustaka",
        "license": "CC0",
        "licenseUrl": "http://creativecommons.org/publicdomain/zero/1.0/deed.en",
        "page": "https://commons.wikimedia.org/wiki/File:Pura_Mangkunegaran_Surakarta.jpg"
      },
      {
        "file": "The front facade of Pasar Gedhe Hardjonagoro in 2019.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/The_front_facade_of_Pasar_Gedhe_Hardjonagoro_in_2019.jpg/500px-The_front_facade_of_Pasar_Gedhe_Hardjonagoro_in_2019.jpg",
        "author": "Sam Hidayat",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:The_front_facade_of_Pasar_Gedhe_Hardjonagoro_in_2019.jpg"
      }
    ]
  },
  "Takengon": {
    "region": "sumatera",
    "photos": [
      {
        "file": "Takengon.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/Takengon.jpg/500px-Takengon.jpg",
        "author": "Weirasi",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Takengon.jpg"
      },
      {
        "file": "Laut Tawar Lake.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Laut_Tawar_Lake.jpg/500px-Laut_Tawar_Lake.jpg",
        "author": "ArgoRaung",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Laut_Tawar_Lake.jpg"
      }
    ]
  },
  "Taman Nasional Lorentz": {
    "region": "papua",
    "photos": [
      {
        "file": "Taman Nasional Lorentz.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Taman_Nasional_Lorentz.jpg/500px-Taman_Nasional_Lorentz.jpg",
        "author": "Ganjarmustika1904",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Taman_Nasional_Lorentz.jpg"
      },
      {
        "file": "Wikiearth-Danau Habema Taman Nasional Lorentz.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Wikiearth-Danau_Habema_Taman_Nasional_Lorentz.jpg/500px-Wikiearth-Danau_Habema_Taman_Nasional_Lorentz.jpg",
        "author": "RaiyaniM",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Wikiearth-Danau_Habema_Taman_Nasional_Lorentz.jpg"
      }
    ]
  },
  "Tana Toraja": {
    "region": "sulawesi",
    "photos": [
      {
        "file": "Ke'te' Kesu' 1.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Ke%27te%27_Kesu%27_1.jpg/500px-Ke%27te%27_Kesu%27_1.jpg",
        "author": "Jorge Franganillo",
        "license": "CC BY 2.0",
        "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
        "page": "https://commons.wikimedia.org/wiki/File:Ke%27te%27_Kesu%27_1.jpg"
      },
      {
        "file": "Tarian Pagellu.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/Tarian_Pagellu.jpg/500px-Tarian_Pagellu.jpg",
        "author": "RaiyaniM",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Tarian_Pagellu.jpg"
      }
    ]
  },
  "Tangerang": {
    "region": "jawa",
    "photos": [
      {
        "file": "Azhom 2.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Azhom_2.jpg/500px-Azhom_2.jpg",
        "author": "JahlilMA",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Azhom_2.jpg"
      },
      {
        "file": "Boen Tek Bio.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Boen_Tek_Bio.jpg/500px-Boen_Tek_Bio.jpg",
        "author": "Cun Cun",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Boen_Tek_Bio.jpg"
      }
    ]
  },
  "Tangkuban Perahu": {
    "region": "jawa",
    "photos": [
      {
        "file": "Tangkuban Prahu.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Tangkuban_Prahu.jpg/500px-Tangkuban_Prahu.jpg",
        "author": "Vivi Lestari",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Tangkuban_Prahu.jpg"
      },
      {
        "file": "Tangkuban Parahu.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/Tangkuban_Parahu.jpg/500px-Tangkuban_Parahu.jpg",
        "author": "CHJL",
        "license": "Public domain",
        "licenseUrl": "",
        "page": "https://commons.wikimedia.org/wiki/File:Tangkuban_Parahu.jpg"
      }
    ]
  },
  "Tanjung Puting": {
    "region": "kalimantan",
    "photos": [
      {
        "file": "Orangutan at Tanjung Puting National Park (31266099698).jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Orangutan_at_Tanjung_Puting_National_Park_%2831266099698%29.jpg/500px-Orangutan_at_Tanjung_Puting_National_Park_%2831266099698%29.jpg",
        "author": "Jorge Franganillo",
        "license": "CC BY 2.0",
        "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
        "page": "https://commons.wikimedia.org/wiki/File:Orangutan_at_Tanjung_Puting_National_Park_(31266099698).jpg"
      },
      {
        "file": "Landscape of theTanjung Puting National Park - Indonesia 2.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Landscape_of_theTanjung_Puting_National_Park_-_Indonesia_2.jpg/500px-Landscape_of_theTanjung_Puting_National_Park_-_Indonesia_2.jpg",
        "author": "Thomas Fuhrmann",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Landscape_of_theTanjung_Puting_National_Park_-_Indonesia_2.jpg"
      }
    ]
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
        "file": "Governors House.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Governors_House.jpg/500px-Governors_House.jpg",
        "author": "a_rabin",
        "license": "CC BY 2.0",
        "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
        "page": "https://commons.wikimedia.org/wiki/File:Governors_House.jpg"
      },
      {
        "file": "Pulau Penyengat.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Pulau_Penyengat.jpg/500px-Pulau_Penyengat.jpg",
        "author": "Achmad Rabin Taim",
        "license": "CC BY 2.0",
        "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
        "page": "https://commons.wikimedia.org/wiki/File:Pulau_Penyengat.jpg"
      }
    ]
  },
  "Tarakan": {
    "region": "kalimantan",
    "photos": [
      {
        "file": "Islamic Center Tarakan.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Islamic_Center_Tarakan.jpg/500px-Islamic_Center_Tarakan.jpg",
        "author": "Si Gam",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Islamic_Center_Tarakan.jpg"
      },
      {
        "file": "AmalBeachTarakan.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/AmalBeachTarakan.jpg/500px-AmalBeachTarakan.jpg",
        "author": "Davidelit",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:AmalBeachTarakan.jpg"
      }
    ]
  },
  "Tarutung": {
    "region": "sumatera",
    "photos": [
      {
        "file": "Tarutung - panoramio (1).jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Tarutung_-_panoramio_%281%29.jpg/500px-Tarutung_-_panoramio_%281%29.jpg",
        "author": "hotmahtg",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Tarutung_-_panoramio_(1).jpg"
      },
      {
        "file": "Salib Kasih Tapanuli Utara.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Salib_Kasih_Tapanuli_Utara.jpg/500px-Salib_Kasih_Tapanuli_Utara.jpg",
        "author": "Herryz",
        "license": "CC BY 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Salib_Kasih_Tapanuli_Utara.jpg"
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
        "file": "Ternate in sight.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Ternate_in_sight.jpg/500px-Ternate_in_sight.jpg",
        "author": "Fdprasetyo",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Ternate_in_sight.jpg"
      },
      {
        "file": "Ternate, Keraton.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Ternate%2C_Keraton.jpg/500px-Ternate%2C_Keraton.jpg",
        "author": "Kainjock",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Ternate,_Keraton.jpg"
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
        "file": "Kelenteng Kwan Sing Bio, Kutorejo, Kecamatan Tuban.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Kelenteng_Kwan_Sing_Bio%2C_Kutorejo%2C_Kecamatan_Tuban.jpg/500px-Kelenteng_Kwan_Sing_Bio%2C_Kutorejo%2C_Kecamatan_Tuban.jpg",
        "author": "Klenteng Kwan Sing Bio",
        "license": "Public domain",
        "licenseUrl": "",
        "page": "https://commons.wikimedia.org/wiki/File:Kelenteng_Kwan_Sing_Bio,_Kutorejo,_Kecamatan_Tuban.jpg"
      },
      {
        "file": "Kompleks Pemakaman Sunan Bonang, Tuban.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Kompleks_Pemakaman_Sunan_Bonang%2C_Tuban.jpg/500px-Kompleks_Pemakaman_Sunan_Bonang%2C_Tuban.jpg",
        "author": "Pangeran Kurchilds",
        "license": "CC BY 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Kompleks_Pemakaman_Sunan_Bonang,_Tuban.jpg"
      }
    ]
  },
  "Ubud": {
    "region": "bali-nusa",
    "photos": [
      {
        "file": "Ubud (49818456887).jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Ubud_%2849818456887%29.jpg/500px-Ubud_%2849818456887%29.jpg",
        "author": "Jorge Franganillo",
        "license": "CC BY 2.0",
        "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
        "page": "https://commons.wikimedia.org/wiki/File:Ubud_(49818456887).jpg"
      },
      {
        "file": "Ubud Palace (2022).jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/Ubud_Palace_%282022%29.jpg/500px-Ubud_Palace_%282022%29.jpg",
        "author": "Chainwit.",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Ubud_Palace_(2022).jpg"
      }
    ]
  },
  "Ujung Kulon": {
    "region": "jawa",
    "photos": [
      {
        "file": "Ujung Kulon National Park, 2014.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Ujung_Kulon_National_Park%2C_2014.jpg/500px-Ujung_Kulon_National_Park%2C_2014.jpg",
        "author": "Achmad Soerio Hutomo",
        "license": "CC BY 2.0",
        "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
        "page": "https://commons.wikimedia.org/wiki/File:Ujung_Kulon_National_Park,_2014.jpg"
      },
      {
        "file": "Pulau peucang taman nasional ujung kulon.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Pulau_peucang_taman_nasional_ujung_kulon.jpg/500px-Pulau_peucang_taman_nasional_ujung_kulon.jpg",
        "author": "Ewal Jr",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Pulau_peucang_taman_nasional_ujung_kulon.jpg"
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
    "photos": [
      {
        "file": "Jogja - Tugu Monument (2025) - img 06.jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Jogja_-_Tugu_Monument_%282025%29_-_img_06.jpg/500px-Jogja_-_Tugu_Monument_%282025%29_-_img_06.jpg",
        "author": "Chainwit.",
        "license": "CC BY 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by/4.0",
        "page": "https://commons.wikimedia.org/wiki/File:Jogja_-_Tugu_Monument_(2025)_-_img_06.jpg"
      },
      {
        "file": "Eastern face of west gate, Taman Sari, Yogyakarta, 2014-04-24 (from 19 images).jpg",
        "thumb": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Eastern_face_of_west_gate%2C_Taman_Sari%2C_Yogyakarta%2C_2014-04-24_%28from_19_images%29.jpg/500px-Eastern_face_of_west_gate%2C_Taman_Sari%2C_Yogyakarta%2C_2014-04-24_%28from_19_images%29.jpg",
        "author": "Crisco 1492",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
        "page": "https://commons.wikimedia.org/wiki/File:Eastern_face_of_west_gate,_Taman_Sari,_Yogyakarta,_2014-04-24_(from_19_images).jpg"
      }
    ]
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
