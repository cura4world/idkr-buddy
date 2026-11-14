# 지도 사진 후보 — 사진이 없어진 11곳 (K-03)

2026-11-14 작성. 출시 전 점검 K-03, `user-checklist.md` (가)-2 의 지도 줄에 딸린 문서입니다.

## 이 문서는 무엇인가

옛 기록 그림과 인물 초상 17장을 뺀 뒤(커밋 `29ba220`), 지도에서 사진이 한 장도 나오지 않게 된 곳이 11곳 있습니다. 그 자리에 넣을 만한 사진을 위키미디어 공용(Wikimedia Commons)에서 곳마다 3장씩 골라 놓았습니다.

- **앱에는 아직 아무것도 넣지 않았습니다.** 이 문서만 만들었고, `src/lib/mapPhotos.ts` 와 `scripts/build-map-photos.mjs` 는 그대로입니다.
- 11곳은 코드로 확인했습니다. 9곳(반자르마신·반튼 라마·비마·빈자이·보고르·반다 제도·크라카타우·푸르워크르토·탄중피낭)은 목록이 비어 있고, 2곳(팔렘방·타라칸)은 목록에 트로펜 박물관 소장 옛 사진만 남아 있어 화면에는 나오지 않습니다(`isShownPhoto`). 프로볼링고는 11곳에 들어가지 않습니다.

## 고르는 방법

마음에 드는 후보를 **"보고르 1·2, 팔렘방 1·3"** 처럼 곳 이름과 번호로 알려 주시면, 그 파일 이름을 `scripts/build-map-photos.mjs` 의 `PICK` 표와 `src/lib/mapPhotos.ts` 에 넣겠습니다. 지도 시트는 곳마다 **최대 2장**을 보여 주므로 2장까지 고르시면 됩니다. 마땅한 것이 없는 곳은 비워 두셔도 됩니다.

**1순위** 표시는 제가 그 곳의 대표 사진으로 권하는 한 장입니다.

## 고른 기준

- 지금의 실제 풍경·건물·자연을 찍은 컬러 사진만 골랐습니다. 옛 기록 사진(트로펜 박물관·KITLV·식민지 시기 흑백 사진·판화·옛 지도)과 인물 초상은 뺐고, 사람 얼굴이 크게 알아볼 만큼 나온 사진도 피했습니다.
- 라이선스는 CC BY · CC BY-SA · CC0 · 퍼블릭 도메인만 받았습니다. CC BY 계열인데 저작자가 비었거나 불명인 사진은 고르지 않았습니다(저장소 규칙).
- 가로로 긴 사진, 원본 폭 1000px 이상, 워터마크·테두리가 없는 것으로 골랐습니다.
- 이미 지도의 다른 곳에 쓰고 있는 사진(152장)과, 빼기로 정한 사진(`SKIP` 목록)은 다시 올리지 않았습니다.
- 저작자·라이선스·크기는 위키미디어 공용 API 가 준 값(`extmetadata` 의 Artist·LicenseShortName)을 그대로 옮겼고, 저작자 이름은 HTML 태그만 벗겼습니다.
- **눈으로 확인**: 표에 올린 33장은 모두 미리보기 그림을 내려받아 직접 보았습니다(장소가 엉뚱하지 않은지, 사람·워터마크가 없는지). 여러 장을 한 화면에 작게(한 장 폭 560px) 늘어놓고 본 것이라, 원본 크기(수천 px)로 확대해 보지는 않았습니다. 원본 설명 글에서 장소가 맞는지도 함께 보았습니다.
- 미리보기 주소는 API 가 준 값 그대로입니다. 폭 640px 을 청했지만 위키미디어가 지금은 `thumb.wikimedia.org` 의 폭 960px 주소를 돌려줍니다(지금 `mapPhotos.ts` 에 있는 주소는 `upload.wikimedia.org` 의 500px). 앱에 넣을 때는 스크립트가 받는 주소 형식을 따로 확인해야 합니다.
- 미리보기 그림이 안 보이면 "원본 페이지" 링크를 눌러 보시면 됩니다.

## 반자르마신 (Banjarmasin)

지도 원고가 말하는 대상: 강이 길을 대신하는 도시, 새벽 수상시장(좁고 긴 배·바나나와 채소), 강가의 금빛 돔 큰 모스크.

| 후보 | 미리보기 | 무엇을 찍은 사진 | 저작자 | 라이선스 | 원본 페이지 | 원본 크기 | 눈으로 확인 |
|---|---|---|---|---|---|---|---|
| 1 **(1순위)** | ![Kegiatan Jual Beli di Pasar Terapung Lok Baintan (1).jpg](https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d4/Kegiatan_Jual_Beli_di_Pasar_Terapung_Lok_Baintan_%281%29.jpg/960px-Kegiatan_Jual_Beli_di_Pasar_Terapung_Lok_Baintan_%281%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail) | 록 바인탄 수상시장을 위에서 내려다본 모습. 과일·채소를 실은 배 수십 척 | Marwan Mohamad | CC BY-SA 4.0 | [Kegiatan Jual Beli di Pasar Terapung Lok Baintan (1).jpg](https://commons.wikimedia.org/wiki/File:Kegiatan_Jual_Beli_di_Pasar_Terapung_Lok_Baintan_%281%29.jpg) | 5165×3404 | 확인함. 배와 강이 화면을 채우고 사람은 작게 보임 |
| 2 | ![Masjid Raya Sabilal Muhtadi depan.jpg](https://thumb.wikimedia.org/wikipedia/commons/thumb/4/44/Masjid_Raya_Sabilal_Muhtadi_depan.jpg/960px-Masjid_Raya_Sabilal_Muhtadi_depan.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail) | 사빌랄 무흐타딘 대모스크 정면. 구릿빛 돔과 높은 첨탑 | Ilham Mufti Laksono | CC BY-SA 4.0 | [Masjid Raya Sabilal Muhtadi depan.jpg](https://commons.wikimedia.org/wiki/File:Masjid_Raya_Sabilal_Muhtadi_depan.jpg) | 4160×2340 | 확인함. 사람 없음. 하늘이 조금 흐림 |
| 3 | ![Jukung Pasar Terapung.jpg](https://thumb.wikimedia.org/wikipedia/commons/thumb/3/36/Jukung_Pasar_Terapung.jpg/960px-Jukung_Pasar_Terapung.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail) | 수상시장의 배(주쿵)가 빽빽이 모인 모습을 바로 위에서 찍은 사진 | Muhammad Haris | CC BY-SA 4.0 | [Jukung Pasar Terapung.jpg](https://commons.wikimedia.org/wiki/File:Jukung_Pasar_Terapung.jpg) | 3000×2000 | 확인함. 색이 화려함. 사람은 삿갓에 가려 얼굴이 거의 안 보임 |

록 바인탄 수상시장은 행정구역으로는 반자르마신 시 바로 옆 반자르 군(Banjar)에 있습니다. 반자르마신에서 배로 가는 대표 수상시장이라 후보에 넣었습니다. 시장 아주머니들 얼굴이 크게 나온 사진(Midori 의 근접 사진 등)은 뺐습니다.

찾아본 검색어: Banjarmasin pasar terapung / Masjid Raya Sabilal Muhtadin / 분류 Lok Baintan Floating Market / Banjarmasin Martapura river

## 반튼 라마 (Banten Lama)

지도 원고가 말하는 대상: 무너진 담과 풀밭만 남은 옛 항구, 스펠베이크 요새의 벽, 자바식 다층 지붕에 등대 같은 흰 첨탑이 붙은 대모스크.

| 후보 | 미리보기 | 무엇을 찍은 사진 | 저작자 | 라이선스 | 원본 페이지 | 원본 크기 | 눈으로 확인 |
|---|---|---|---|---|---|---|---|
| 1 **(1순위)** | ![Masjid Banten 111225 0560 mer.JPG](https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5b/Masjid_Banten_111225_0560_mer.JPG/960px-Masjid_Banten_111225_0560_mer.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail) | 반튼 대모스크를 동쪽에서 본 모습. 흰 첨탑과 다층 지붕이 함께 보임 | Wibowo Djatmiko (Wie146) | CC BY-SA 3.0 | [Masjid Banten 111225 0560 mer.JPG](https://commons.wikimedia.org/wiki/File:Masjid_Banten_111225_0560_mer.JPG) | 1280×768 | 확인함. 원고가 말하는 첨탑·지붕이 한 장에 들어 있음. 사람은 멀리 작게. 원본 폭 1280px 로 조금 작음 |
| 2 | ![Benteng Speelwijk 05.jpg](https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8a/Benteng_Speelwijk_05.jpg/960px-Benteng_Speelwijk_05.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail) | 스펠베이크 요새의 남은 벽과 풀밭 | Arif Permana Putra | CC BY-SA 4.0 | [Benteng Speelwijk 05.jpg](https://commons.wikimedia.org/wiki/File:Benteng_Speelwijk_05.jpg) | 3456×2304 | 확인함. 사람 없음. 2026년 사진 |
| 3 | ![Keraton Surosowan (1).jpg](https://thumb.wikimedia.org/wikipedia/commons/thumb/1/16/Keraton_Surosowan_%281%29.jpg/960px-Keraton_Surosowan_%281%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail) | 수로소완 궁터를 두른 벽돌 담과 풀밭(산책길·의자가 보임) | Mirani Pramitasari | CC BY-SA 4.0 | [Keraton Surosowan (1).jpg](https://commons.wikimedia.org/wiki/File:Keraton_Surosowan_%281%29.jpg) | 6000×4000 | 확인함. 사람 없음. 2026년 사진 |

첨탑을 가까이서 찍은 사진(Masjid agung banten lama.jpg)은 앞쪽에 사람 얼굴이 뚜렷해 뺐습니다.

찾아본 검색어: Masjid Agung Banten / Benteng Speelwijk / Keraton Surosowan

## 비마 (Bima)

지도 원고가 말하는 대상: 숨바와 섬 동쪽 끝의 항구 도시, 서쪽의 탐보라 화산(1815년 분화, 윗부분이 날아간 산).

| 후보 | 미리보기 | 무엇을 찍은 사진 | 저작자 | 라이선스 | 원본 페이지 | 원본 크기 | 눈으로 확인 |
|---|---|---|---|---|---|---|---|
| 1 **(1순위)** | ![IMG city of bima indonesia-2020.jpg](https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4d/IMG_city_of_bima_indonesia-2020.jpg/960px-IMG_city_of_bima_indonesia-2020.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail) | 언덕에서 내려다본 비마 만과 건너편 산 | 22nurhidayanti | CC BY-SA 4.0 | [IMG city of bima indonesia-2020.jpg](https://commons.wikimedia.org/wiki/File:IMG_city_of_bima_indonesia-2020.jpg) | 3264×1836 | 확인함. 바다와 산이 넓게 보이는 풍경. 원본 설명이 "Panorama of bima city" 한 줄뿐이라 정확한 촬영 지점은 확인하지 못했습니다 |
| 2 | ![Mount Tambora Volcano, Sumbawa Island, Indonesia.jpg](https://thumb.wikimedia.org/wikipedia/commons/thumb/7/78/Mount_Tambora_Volcano%2C_Sumbawa_Island%2C_Indonesia.jpg/960px-Mount_Tambora_Volcano%2C_Sumbawa_Island%2C_Indonesia.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail) | 우주정거장에서 찍은 탐보라 화산의 칼데라(지름 6km) | NASA (국제우주정거장 Expedition 20 승무원) | Public domain | [Mount Tambora Volcano, Sumbawa Island, Indonesia.jpg](https://commons.wikimedia.org/wiki/File:Mount_Tambora_Volcano,_Sumbawa_Island,_Indonesia.jpg) | 4256×2828 | 확인함. 산 윗부분이 날아간 자리가 한눈에 보임 |
| 3 | ![Tambora crater rim 2.jpg](https://thumb.wikimedia.org/wikipedia/commons/thumb/0/08/Tambora_crater_rim_2.jpg/960px-Tambora_crater_rim_2.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail) | 탐보라 화산 분화구 가장자리의 아침 풍경 | Paul Hessels | CC BY 2.0 | [Tambora crater rim 2.jpg](https://commons.wikimedia.org/wiki/File:Tambora_crater_rim_2.jpg) | 1289×863 | 확인함. 사람 없음. 원본 폭 1289px 로 조금 작음 |

비마 항구·옛 술탄 궁(아시 음보조)의 요즘 사진은 조건에 맞는 것을 찾지 못했습니다(검색 결과가 없거나 1899년 탐사 사진뿐). 그래서 도시 전경 1장과 원고의 절반을 차지하는 탐보라 화산 2장을 올렸습니다. 어린 기수들의 경마 사진(Pacuan Kuda Bima.jpg)은 아이들 얼굴이 크게 나와 뺐습니다.

찾아본 검색어: Bima Sumbawa pelabuhan(0건) / Museum Asi Mbojo(0건) / Asi Mbojo(0건) / Istana Bima / Pelabuhan Bima(0건) / Teluk Bima / Kota Bima / Bima West Nusa Tenggara city / Tambora caldera

## 빈자이 (Binjai)

지도 원고가 말하는 대상: 메단 옆의 작은 도시, 람부탄으로 유명, 네덜란드 시절 놓인 철길이 메단까지 이어짐.

| 후보 | 미리보기 | 무엇을 찍은 사진 | 저작자 | 라이선스 | 원본 페이지 | 원본 크기 | 눈으로 확인 |
|---|---|---|---|---|---|---|---|
| 1 **(1순위)** | ![Stasiun Binjai New Image.jpg](https://thumb.wikimedia.org/wikipedia/commons/thumb/6/63/Stasiun_Binjai_New_Image.jpg/960px-Stasiun_Binjai_New_Image.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail) | 빈자이 역 정면. 네덜란드 시절 지은 역 건물 | Fadhil Dimas Nabillah | CC BY-SA 4.0 | [Stasiun Binjai New Image.jpg](https://commons.wikimedia.org/wiki/File:Stasiun_Binjai_New_Image.jpg) | 4288×3216 | 확인함. 사람 없음. 건물에 BINJAI 글자가 보임 |
| 2 | ![Binjai.jpg](https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6c/Binjai.jpg/960px-Binjai.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail) | 빈자이 시내 로터리와 기념 조형물 | Davidelit | CC BY-SA 4.0 | [Binjai.jpg](https://commons.wikimedia.org/wiki/File:Binjai.jpg) | 3950×2298 | 확인함. 차와 오토바이가 지나가는 평범한 시내 모습 |
| 3 | ![Rambutan Binjai.jpg](https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7c/Rambutan_Binjai.jpg/960px-Rambutan_Binjai.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail) | 바구니에 수북이 담긴 빈자이 람부탄 | Sakurai Midori | CC BY-SA 3.0 | [Rambutan Binjai.jpg](https://commons.wikimedia.org/wiki/File:Rambutan_Binjai.jpg) | 1280×960 | 확인함. 과일만 찍힘. 단, 찍은 곳은 자카르타 파사르 바루의 과일 가게입니다(빈자이 품종). 원본 폭 1280px |

람부탄 사진은 모두 '빈자이 품종'을 자카르타에서 찍은 것이고, 빈자이 현지 길가의 람부탄 사진은 찾지 못했습니다.

찾아본 검색어: Binjai kota / Stasiun Binjai / rambutan Binjai / 분류 Binjai(요청 제한으로 못 받음)

## 보고르 (Bogor)

지도 원고가 말하는 대상: 살락 산 자락의 비의 도시, 1817년에 연 식물원, 식물원 안의 대통령궁(옛 총독 별장).

| 후보 | 미리보기 | 무엇을 찍은 사진 | 저작자 | 라이선스 | 원본 페이지 | 원본 크기 | 눈으로 확인 |
|---|---|---|---|---|---|---|---|
| 1 **(1순위)** | ![Istana Kepresidenan Bogor (Photos by Apri DAV).jpg](https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e4/Istana_Kepresidenan_Bogor_%28Photos_by_Apri_DAV%29.jpg/960px-Istana_Kepresidenan_Bogor_%28Photos_by_Apri_DAV%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail) | 식물원 안 연못 너머로 본 보고르 대통령궁. 앞에 연꽃 | Apri DAV | CC BY-SA 4.0 | [Istana Kepresidenan Bogor (Photos by Apri DAV).jpg](https://commons.wikimedia.org/wiki/File:Istana_Kepresidenan_Bogor_%28Photos_by_Apri_DAV%29.jpg) | 4160×3120 | 확인함. 사람 없음. 식물원과 궁이 한 장에 들어 있음 |
| 2 | ![Bogor Botanical Gardens Java23.jpg](https://thumb.wikimedia.org/wikipedia/commons/thumb/7/77/Bogor_Botanical_Gardens_Java23.jpg/960px-Bogor_Botanical_Gardens_Java23.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail) | 식물원의 숲길 끝에 보이는 대통령궁 | Arabsalam | CC BY-SA 4.0 | [Bogor Botanical Gardens Java23.jpg](https://commons.wikimedia.org/wiki/File:Bogor_Botanical_Gardens_Java23.jpg) | 2592×1944 | 확인함. 큰 나무가 우거진 길. 사람은 멀리 작게 |
| 3 | ![Kota Bogor & Gunung Salak.jpg](https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7b/Kota_Bogor_%26_Gunung_Salak.jpg/960px-Kota_Bogor_%26_Gunung_Salak.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail) | 보고르 시가지와 뒤편의 살락 산 | ArgoRaung | CC BY-SA 3.0 | [Kota Bogor & Gunung Salak.jpg](https://commons.wikimedia.org/wiki/File:Kota_Bogor_%26_Gunung_Salak.jpg) | 1024×768 | 확인함. 붉은 지붕의 시가지와 산. 원본 폭 1024px 로 작음(썸네일로는 충분) |

"Kebun Raya Bogor 01~08.jpg"(Cep Budhi Darma) 묶음은 그림은 좋지만 왼쪽 아래에 서명 워터마크가 있어 뺐습니다. 정원의 사슴 사진은 찾지 못했습니다.

찾아본 검색어: Kebun Raya Bogor / Istana Bogor / Istana Bogor rusa(0건) / Bogor Palace deer(0건) / Bogor Botanical Gardens palace pond(0건) / Bogor Gunung Salak

## 반다 제도 (Kepulauan Banda)

지도 원고가 말하는 대상: 육두구의 섬, 1621년의 학살, 1930년대 하타 등 독립운동가의 유배지, 지금은 조용한 섬과 산호 바다.

| 후보 | 미리보기 | 무엇을 찍은 사진 | 저작자 | 라이선스 | 원본 페이지 | 원본 크기 | 눈으로 확인 |
|---|---|---|---|---|---|---|---|
| 1 **(1순위)** | ![Banda Pisang view on Api.jpg](https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f7/Banda_Pisang_view_on_Api.jpg/960px-Banda_Pisang_view_on_Api.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail) | 피상 섬 해변에서 바라본 반다의 화산섬 구눙 아피 | WiDi | CC BY-SA 4.0 | [Banda Pisang view on Api.jpg](https://commons.wikimedia.org/wiki/File:Banda_Pisang_view_on_Api.jpg) | 3840×2160 | 확인함. 맑은 바다와 원뿔 모양 화산섬. 사람 없음 |
| 2 | ![Benteng Belgica 2026 03.jpg](https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0e/Benteng_Belgica_2026_03.jpg/960px-Benteng_Belgica_2026_03.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail) | 반다 네이라의 벨기카 요새(네덜란드가 17세기에 쌓은 요새) 바깥벽 | Zhilal Darma | CC BY-SA 4.0 | [Benteng Belgica 2026 03.jpg](https://commons.wikimedia.org/wiki/File:Benteng_Belgica_2026_03.jpg) | 6000×4000 | 확인함. 사람 없음. 2026년 사진 |
| 3 | ![Rumah Pengasingan Bung Hatta 03.jpg](https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c4/Rumah_Pengasingan_Bung_Hatta_03.jpg/960px-Rumah_Pengasingan_Bung_Hatta_03.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail) | 하타가 유배 시절 살던 집(반다 네이라) | Zhilal Darma | CC BY-SA 4.0 | [Rumah Pengasingan Bung Hatta 03.jpg](https://commons.wikimedia.org/wiki/File:Rumah_Pengasingan_Bung_Hatta_03.jpg) | 6000×4000 | 확인함. 사람 없음. 원고의 유배 이야기와 맞음 |

검색 결과의 절반 이상이 옛 지도·판화·1900년 전후 탐사 사진이어서 모두 걸렀습니다. 구눙 아피에서 내려다본 반다 네이라 전경(Bandaneira-0039.JPG)은 구도가 가장 좋지만 1998년 필름 사진이라 색이 바래 후보에서 뺐습니다.

찾아본 검색어: Banda Neira / Banda Naira / Banda Neira Gunung Api / Gunung Api Banda / Benteng Belgica / Banda Islands nutmeg / Banda Besar / Pulau Banda / Istana Mini Banda / Rumah pengasingan Hatta Banda / 분류 Banda Islands

## 크라카타우 (Krakatau)

지도 원고가 말하는 대상: 1883년 대폭발, 1927년에 솟은 새 섬 아낙 크라카타우, 2018년에 한쪽이 무너짐.

| 후보 | 미리보기 | 무엇을 찍은 사진 | 저작자 | 라이선스 | 원본 페이지 | 원본 크기 | 눈으로 확인 |
|---|---|---|---|---|---|---|---|
| 1 **(1순위)** | ![Anak Krakatau, january 2016.jpg](https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d3/Anak_Krakatau%2C_january_2016.jpg/960px-Anak_Krakatau%2C_january_2016.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail) | 바다에서 본 아낙 크라카타우. 정상에서 연기가 오름(2016년) | Tyke | CC BY-SA 4.0 | [Anak Krakatau, january 2016.jpg](https://commons.wikimedia.org/wiki/File:Anak_Krakatau,_january_2016.jpg) | 3841×2632 | 확인함. 사람 없음. 산이 화면 가득 |
| 2 | ![Anak Krakatau-2.JPG](https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a5/Anak_Krakatau-2.JPG/960px-Anak_Krakatau-2.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail) | 멀리서 본 아낙 크라카타우 섬 전체(2013년) | Lord Mountbatten | CC BY-SA 3.0 | [Anak Krakatau-2.JPG](https://commons.wikimedia.org/wiki/File:Anak_Krakatau-2.JPG) | 2736×1824 | 확인함. 바다 위의 섬 모양이 한눈에 보임 |
| 3 | ![Krakatoa eruption 2008.jpg](https://thumb.wikimedia.org/wikipedia/commons/thumb/4/44/Krakatoa_eruption_2008.jpg/960px-Krakatoa_eruption_2008.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail) | 밤에 용암을 뿜는 아낙 크라카타우(2008년) | Thomas.Schiet | Public domain | [Krakatoa eruption 2008.jpg](https://commons.wikimedia.org/wiki/File:Krakatoa_eruption_2008.jpg) | 3888×2592 | 확인함. 어두운 바탕에 붉은 용암. 지도 시트에서는 꽤 어둡게 보일 수 있음 |

세 장 모두 2018년 12월 붕괴 이전 사진이라 지금의 산보다 높고 뾰족합니다. 붕괴 뒤(2022년) 사진(Anak Krakatau.jpg)은 섬이 점처럼 작게 찍혀 쓰기 어렵습니다.

찾아본 검색어: Anak Krakatau / Krakatoa volcano island

## 팔렘방 (Palembang)

지도 원고가 말하는 대상: 무시 강이 가르는 오래된 도시, 강 위의 붉은 다리(암페라 다리), 생선 반죽 음식(펨펙), 수상 가옥.

| 후보 | 미리보기 | 무엇을 찍은 사진 | 저작자 | 라이선스 | 원본 페이지 | 원본 크기 | 눈으로 확인 |
|---|---|---|---|---|---|---|---|
| 1 **(1순위)** | ![LRT Palembang Melintas di Samping Jembatan Ampera Palembang.jpg](https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ef/LRT_Palembang_Melintas_di_Samping_Jembatan_Ampera_Palembang.jpg/960px-LRT_Palembang_Melintas_di_Samping_Jembatan_Ampera_Palembang.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail) | 무시 강 위의 붉은 암페라 다리와 그 옆을 지나는 경전철(2020년) | Herusutimbul | CC BY-SA 4.0 | [LRT Palembang Melintas di Samping Jembatan Ampera Palembang.jpg](https://commons.wikimedia.org/wiki/File:LRT_Palembang_Melintas_di_Samping_Jembatan_Ampera_Palembang.jpg) | 3000×2000 | 확인함. 사람 없음. 다리가 화면 가운데 크게 |
| 2 | ![Ampera Bridge at Noon, Palembang.jpg](https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7d/Ampera_Bridge_at_Noon%2C_Palembang.jpg/960px-Ampera_Bridge_at_Noon%2C_Palembang.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail) | 강가에서 본 암페라 다리와 무시 강(2011년) | Gunawan Kartapranata | CC BY-SA 3.0 | [Ampera Bridge at Noon, Palembang.jpg](https://commons.wikimedia.org/wiki/File:Ampera_Bridge_at_Noon,_Palembang.jpg) | 1984×1381 | 확인함. 강과 작은 배가 함께 보임 |
| 3 | ![Pempek campur.JPG](https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c2/Pempek_campur.JPG/960px-Pempek_campur.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail) | 접시에 담긴 펨펙 | Midori | CC BY-SA 3.0 | [Pempek campur.JPG](https://commons.wikimedia.org/wiki/File:Pempek_campur.JPG) | 2848×2136 | 확인함. 음식만 찍힘 |

수상 가옥·배 위의 주유소 사진은 조건에 맞는 것을 찾지 못했습니다. "Jembatan Ampera awak.JPG" 는 '퍼블릭 도메인'이라 적혀 있지만 근거가 분명하지 않아 뺐습니다.

찾아본 검색어: Jembatan Ampera / Ampera Bridge Musi river / Sungai Musi Palembang / Sungai Musi rumah rakit(0건) / Palembang Musi river houses(0건) / pempek Palembang

## 푸르워크르토 (Purwokerto)

지도 원고가 말하는 대상: 슬라멧 산 남쪽 기슭의 내륙 도시, 응아팍 억양, 덜 익혀 튀긴 템페 '믄도안'.

| 후보 | 미리보기 | 무엇을 찍은 사진 | 저작자 | 라이선스 | 원본 페이지 | 원본 크기 | 눈으로 확인 |
|---|---|---|---|---|---|---|---|
| 1 **(1순위)** | ![Gunung Slamet dari Stasiun Purwokerto.jpg](https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8d/Gunung_Slamet_dari_Stasiun_Purwokerto.jpg/960px-Gunung_Slamet_dari_Stasiun_Purwokerto.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail) | 푸르워크르토 역에서 바라본 슬라멧 산(해 질 무렵) | Tyo Satriany | CC BY-SA 4.0 | [Gunung Slamet dari Stasiun Purwokerto.jpg](https://commons.wikimedia.org/wiki/File:Gunung_Slamet_dari_Stasiun_Purwokerto.jpg) | 3264×2448 | 확인함. 사람 없음. 산이 또렷함. 조금 어두운 저녁 빛 |
| 2 | ![Alun - Alun Purwokerto & Pendapa Si Panji dengan Latar belakang Gunung Slamet.jpg](https://thumb.wikimedia.org/wikipedia/commons/thumb/0/09/Alun_-_Alun_Purwokerto_%26_Pendapa_Si_Panji_dengan_Latar_belakang_Gunung_Slamet.jpg/960px-Alun_-_Alun_Purwokerto_%26_Pendapa_Si_Panji_dengan_Latar_belakang_Gunung_Slamet.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail) | 시내 광장(알룬알룬)의 PURWOKERTO 글자 조형물, 뒤로 흐릿한 슬라멧 산 | Tyo Satriany | CC BY-SA 4.0 | [Alun - Alun Purwokerto & Pendapa Si Panji dengan Latar belakang Gunung Slamet.jpg](https://commons.wikimedia.org/wiki/File:Alun_-_Alun_Purwokerto_%26_Pendapa_Si_Panji_dengan_Latar_belakang_Gunung_Slamet.jpg) | 2560×1920 | 확인함. 도시 이름이 사진 안에 보임. 산은 안개로 희미함 |
| 3 | ![Mendoan.jpg](https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b7/Mendoan.jpg/960px-Mendoan.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail) | 바나나 잎 위에 올린 믄도안과 풋고추 | Hersy ardianty a | CC BY-SA 4.0 | [Mendoan.jpg](https://commons.wikimedia.org/wiki/File:Mendoan.jpg) | 2976×1984 | 확인함. 음식만 찍힘 |

찾아본 검색어: Purwokerto Gunung Slamet / Alun-alun Purwokerto / Purwokerto kota / mendoan

## 탄중피낭 (Tanjungpinang)

지도 원고가 말하는 대상: 리아우 제도 주의 중심, 프녱앗 섬의 술탄국 유적과 왕실 묘, 라자 알리 하지, 해안의 수상 마을.

| 후보 | 미리보기 | 무엇을 찍은 사진 | 저작자 | 라이선스 | 원본 페이지 | 원본 크기 | 눈으로 확인 |
|---|---|---|---|---|---|---|---|
| 1 **(1순위)** | ![Masjid Raya Sultan Riau.jpg](https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d6/Masjid_Raya_Sultan_Riau.jpg/960px-Masjid_Raya_Sultan_Riau.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail) | 프녱앗 섬의 리아우 술탄 대모스크(노란 건물과 초록 계단) | Liliaini | CC BY-SA 4.0 | [Masjid Raya Sultan Riau.jpg](https://commons.wikimedia.org/wiki/File:Masjid_Raya_Sultan_Riau.jpg) | 2000×1333 | 확인함. 사람 없음. 파란 하늘에 노란 건물이 선명함 |
| 2 | ![Pulau Penyengat 3.jpg](https://thumb.wikimedia.org/wikipedia/commons/thumb/3/36/Pulau_Penyengat_3.jpg/960px-Pulau_Penyengat_3.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail) | 프녱앗 섬에 있는 라자 알리 하지의 묘 | a_rabin | CC BY 2.0 | [Pulau Penyengat 3.jpg](https://commons.wikimedia.org/wiki/File:Pulau_Penyengat_3.jpg) | 4000×3000 | 확인함. 묘비에 "Raja Ali Haji 1808-1873" 글자가 보임. 원고의 인물과 맞음 |
| 3 | ![Kota Tanjung Pinang Dari Atas - panoramio.jpg](https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e7/Kota_Tanjung_Pinang_Dari_Atas_-_panoramio.jpg/960px-Kota_Tanjung_Pinang_Dari_Atas_-_panoramio.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail) | 언덕에서 내려다본 탄중피낭 시가지와 바다 | Dj Onces Saputra | CC BY 3.0 | [Kota Tanjung Pinang Dari Atas - panoramio.jpg](https://commons.wikimedia.org/wiki/File:Kota_Tanjung_Pinang_Dari_Atas_-_panoramio.jpg) | 5184×3456 | 확인함. 사진 아래쪽에 지붕과 마른 나뭇가지가 걸려 구도는 평범함 |

해안 수상 마을 사진은 조건에 맞는 것을 찾지 못했습니다. 같은 모스크를 찍은 Herusutimbul 의 사진 2장은 사람이 가운데 크게 나오거나 어안 렌즈로 심하게 휘어 뺐습니다.

찾아본 검색어: Tanjungpinang / Tanjung Pinang / Tanjungpinang kota(0건) / Tanjungpinang pelantar(0건) / Tanjungpinang harbour stilt houses(0건) / Pulau Penyengat masjid / Penyengat island

## 타라칸 (Tarakan)

지도 원고가 말하는 대상: 북칼리만탄의 섬 도시, 석유와 태평양전쟁의 흔적, 새우 양식, 도시 한가운데의 맹그로브 숲과 코주부원숭이.

| 후보 | 미리보기 | 무엇을 찍은 사진 | 저작자 | 라이선스 | 원본 페이지 | 원본 크기 | 눈으로 확인 |
|---|---|---|---|---|---|---|---|
| 1 **(1순위)** | ![Hutan Mangrove Rumah Bagi Mereka.jpg](https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a3/Hutan_Mangrove_Rumah_Bagi_Mereka.jpg/960px-Hutan_Mangrove_Rumah_Bagi_Mereka.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail) | 타라칸 맹그로브·코주부원숭이 보전 구역의 숲과 나무 위 원숭이 무리 | Ryan Hidayat Alwi | CC BY-SA 4.0 | [Hutan Mangrove Rumah Bagi Mereka.jpg](https://commons.wikimedia.org/wiki/File:Hutan_Mangrove_Rumah_Bagi_Mereka.jpg) | 4288×2848 | 확인함. 숲 전체가 보이고 원숭이 여러 마리. 색 보정이 꽤 진한 사진 |
| 2 | ![Puncak Pohon Perepat.jpg](https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d2/Puncak_Pohon_Perepat.jpg/960px-Puncak_Pohon_Perepat.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail) | 같은 보전 구역의 나뭇가지 위 코주부원숭이 어미와 새끼 | Ryan Hidayat Alwi | CC BY-SA 4.0 | [Puncak Pohon Perepat.jpg](https://commons.wikimedia.org/wiki/File:Puncak_Pohon_Perepat.jpg) | 4486×2991 | 확인함. 동물만 찍힘 |
| 3 | ![Kawasan Konservasi Mangrove dan Bekantan Kota Tarakan.JPG](https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f9/Kawasan_Konservasi_Mangrove_dan_Bekantan_Kota_Tarakan.JPG/960px-Kawasan_Konservasi_Mangrove_dan_Bekantan_Kota_Tarakan.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail) | 보전 구역 입구(원숭이 조형물이 있는 초록색 문) | Ezagren | CC BY-SA 4.0 | [Kawasan Konservasi Mangrove dan Bekantan Kota Tarakan.JPG](https://commons.wikimedia.org/wiki/File:Kawasan_Konservasi_Mangrove_dan_Bekantan_Kota_Tarakan.JPG) | 6000×4000 | 확인함. 사람 없음. 앞에 오토바이 세 대. 풍경으로는 평범함 |

석유 시설·전쟁 유적(참호·포대)·새우 양식장의 요즘 사진은 찾지 못했습니다. 전쟁 관련은 1945년 기록 사진뿐이라 걸렀습니다.

찾아본 검색어: Tarakan mangrove / Kawasan Konservasi Mangrove dan Bekantan / Kota Tarakan / Tarakan island / Tarakan pumpjack(0건) / Tarakan bunker(0건) / tambak udang Tarakan(0건)

## 후보를 찾지 못한 곳

없습니다. 11곳 모두 3장씩 올렸습니다. 다만 아래는 원고가 말하는 대상 가운데 사진을 찾지 못한 것입니다.

- 비마: 항구, 옛 술탄 궁
- 빈자이: 현지의 람부탄(올린 사진은 자카르타에서 찍은 빈자이 품종)
- 보고르: 대통령궁 정원의 사슴
- 팔렘방: 수상 가옥, 배 위의 주유소
- 탄중피낭: 해안의 수상 마을
- 타라칸: 석유 시설, 전쟁 유적, 새우 양식장

## 넣기 전에 다시 볼 것

- 고르신 사진은 넣을 때 원본 페이지의 라이선스·저작자를 한 번 더 확인하고, 설정 > 앱 정보 > 사진 출처(`/about/photos`)에 함께 나오는지 봅니다.
- 크라카타우 사진은 모두 2018년 붕괴 이전 모습입니다. 원고가 2018년 붕괴를 말하므로, 그대로 써도 되는지 정해 주시면 됩니다.
- 반자르마신의 록 바인탄 시장은 행정구역상 옆 군입니다. 엄밀히 시 안의 사진만 원하시면 2번(모스크)만 쓰시면 됩니다.
