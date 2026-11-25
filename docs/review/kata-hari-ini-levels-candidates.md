# 오늘의 단어 퍼즐 — 4·6글자 단계 후보 (1단계, 검토용)

만든 날: 2026-11-25. **코드에 연결하지 않은 검토용 문서**입니다. 검토 뒤 2단계에서 동결본(`src/data/` 단계별 파일)으로 옮깁니다.
5글자 목록(`kataHariIniWords.ts`·`kataHariIniGuesses.ts`)과 기준일은 바꾸지 않습니다.

## 뽑은 방법

- **정답 후보**: 공용 기본 단어장 01~34권(성경과 신앙 35~41권 제외)의 표제어 중 소문자 a~z 로만 된 4·6글자 단어. 같은 단어가 여러 권에 있으면 번호가 앞선 권을 출처로 적음.
- **뺀 것**: 5글자 목록을 만들 때의 규칙(구어·영어 단어는 정답에서 빼고 입력으로만 받음)에 더해, 이번 지시대로 줄임말·기능어 위주의 아주 쉬운 말을 뺌. 뺀 단어도 아래 "넣을 수 있는 말"에는 남김.
  - 구어: 06 입말·구어 권의 표제어와 뜻에 "(구어)"가 붙은 말
  - 줄임말: 머리글자·음절 줄임에서 온 말(ojek online → ojol, angkutan kota → angkot, dalam jaringan → daring …)
  - 영어 표기 그대로: 영어 철자를 그대로 쓰는 말(band, chef, golf, lift, wifi, folder, laptop). 인도네시아어 철자로 바뀐 차용어(kafe, klub, sweter, survei …)는 남김. eror 는 비표준 표기라 뺌
  - 기능어: 대명사·접속사·전치사·조사·정도 부사·조동사·감탄사(yang, dari, kita, akan, bisa, sangat, sekali …)
- **판단이 갈릴 만한 것(남겨 둠)**: 숫자·서수(satu, tiga, lima, enam, kelima, ketiga, seribu, sejuta), 수분류사로도 쓰는 말(biji, buah, ekor, batang, lembar, potong), 인도네시아어 철자로 바뀐 외래어(bank, film, helm, data, gram, kilo, basket, normal, modern), 빈도 부사(selalu, sering, jarang), 활용형(dicuri). 빼야 하면 검토에서 알려 주세요.
- 예문에서 온 말에는 활용형(adikku, busnya, dibuat …)과 인도네시아어 글 속 외래어(file, jazz …)도 있음 — 5글자도 ibuku 같은 입력을 받으므로 그대로 둠. 정답에는 쓰지 않음.
- **넣을 수 있는 말**: 5글자 `kataHariIniGuesses.ts` 와 같은 방식 — ① 공용 기본 단어장 모든 권(성경과 신앙 포함) 표제어(여러 낱말이면 나눔) ② 예문에 소문자로 나온 낱말. 정답 목록에 있는 말은 다시 적지 않음(두 목록을 합쳐 검사). 5글자 때 더한 ③ 손으로 고른 흔한 단어는 아직 넣지 않음 — 2단계에서 더할 수 있음.

## 개수 요약

| 단계 | 표제어(01~34) | 뺀 단어 | **정답 후보** | 한 바퀴(일) | 넣을 수 있는 말(정답 밖) | 정답 + 넣을 수 있는 말 |
|---|---|---|---|---|---|---|
| 4글자 | 245 | 58 | **187** | 187일 | 207 | 394 |
| 6글자 | 382 | 66 | **316** | 316일 | 316 | 632 |
| (참고) 5글자 | 482 | 25 | 459(동결본) | 459일 | 492 | 951 |

한 바퀴 = 정답 후보 개수(하루 한 문제, 같은 날 같은 단계끼리는 같은 문제).

## 4글자 정답 후보 (187개)

| # | 단어 | 뜻 | 출처 단어장 |
|---|---|---|---|
| 1 | adat | 관습/전통 규범 | 34 인도네시아 문화 |
| 2 | adik | 동생 | 14 가족·호칭 |
| 3 | akar | 뿌리 | 29 식물·농업 |
| 4 | akun | 계정 | 33 기술·인터넷 |
| 5 | alam | 자연 | 30 날씨·지형 |
| 6 | alis | 눈썹 | 15 신체·건강 |
| 7 | aman | 안전한 | 11 상태·성질 |
| 8 | anak | 아이/자녀 | 14 가족·호칭 |
| 9 | aneh | 이상한 | 12 평가·정도 |
| 10 | arah | 방향 | 07 이동·존재 |
| 11 | asal | 출신/고향 | 01 인사·기본 표현 |
| 12 | asam | 신 | 17 음식·요리 |
| 13 | asap | 연기 | 26 긴급·안전 |
| 14 | asin | 짠 | 17 음식·요리 |
| 15 | asma | 천식 | 24 의료·병원 |
| 16 | atap | 지붕 | 18 집·생활용품 |
| 17 | awal | 처음/초기의/이른 | 05 시간·날짜·순서 |
| 18 | awan | 구름 | 30 날씨·지형 |
| 19 | awas | 조심해!/주의 | 26 긴급·안전 |
| 20 | ayah | 아버지 | 14 가족·호칭 |
| 21 | ayam | 닭/닭고기 | 17 음식·요리 |
| 22 | babi | 돼지 | 28 동물 |
| 23 | bahu | 어깨 | 15 신체·건강 |
| 24 | baik | 좋은/착한 | 11 상태·성질 |
| 25 | baju | 옷/상의 | 19 옷·외모 |
| 26 | bank | 은행 | 20 쇼핑·돈 |
| 27 | baru | 새로운 | 10 접사 가족 |
| 28 | basi | 상한/쉰 | 11 상태·성질 |
| 29 | batu | 돌/바위 | 30 날씨·지형 |
| 30 | bayi | 아기 | 14 가족·호칭 |
| 31 | bemo | 베모 (소형 합승차) | 31 교통 |
| 32 | bibi | 이모/고모/아주머니 | 14 가족·호칭 |
| 33 | biji | 알 (작은 것 수분류사) | 04 수량·숫자·단위 |
| 34 | biru | 파란 | 11 상태·성질 |
| 35 | bius | 마취 | 24 의료·병원 |
| 36 | blus | 블라우스 | 19 옷·외모 |
| 37 | bola | 공 | 21 취미·운동·여가 |
| 38 | buah | 개 (사물 수분류사) | 04 수량·숫자·단위 |
| 39 | buku | 책 | 23 교육·학교 |
| 40 | bulu | 털/깃털 | 28 동물 |
| 41 | cair | 묽은/액체 상태의 | 11 상태·성질 |
| 42 | cucu | 손주 | 14 가족·호칭 |
| 43 | cuti | 휴가 | 22 직업·직장 |
| 44 | dada | 가슴 | 15 신체·건강 |
| 45 | dagu | 턱 | 15 신체·건강 |
| 46 | dasi | 넥타이 | 19 옷·외모 |
| 47 | data | 데이터/자료 | 33 기술·인터넷 |
| 48 | daun | 잎 | 29 식물·농업 |
| 49 | desa | 마을/촌 | 32 장소·여행 |
| 50 | diam | 가만히 있다/조용히 있다 | 07 이동·존재 |
| 51 | duda | 홀아비/이혼남 | 14 가족·호칭 |
| 52 | dulu | 먼저/예전에 | 05 시간·날짜·순서 |
| 53 | ekor | 마리 (동물 수분류사) | 04 수량·숫자·단위 |
| 54 | enak | 맛있는/기분 좋은 | 17 음식·요리 |
| 55 | enam | 여섯/육 | 04 수량·숫자·단위 |
| 56 | film | 영화 | 34 인도네시아 문화 |
| 57 | gaji | 월급 | 20 쇼핑·돈 |
| 58 | gang | 골목 | 31 교통 |
| 59 | gaun | 드레스 | 19 옷·외모 |
| 60 | gigi | 이/치아 | 15 신체·건강 |
| 61 | gram | 그램 | 04 수량·숫자·단위 |
| 62 | gula | 설탕 | 17 음식·요리 |
| 63 | guru | 선생님 | 23 교육·학교 |
| 64 | hama | 병충해/해충 | 29 식물·농업 |
| 65 | hari | 날/하루 | 05 시간·날짜·순서 |
| 66 | hati | 간 (장기) | 15 신체·건강 |
| 67 | haus | 목마른 | 15 신체·건강 |
| 68 | helm | 헬멧 | 31 교통 |
| 69 | hobi | 취미 | 21 취미·운동·여가 |
| 70 | ikan | 생선/물고기 | 17 음식·요리 |
| 71 | ilmu | 학문/지식 | 23 교육·학교 |
| 72 | ipar | 처남/시누이 등 인척 | 14 가족·호칭 |
| 73 | izin | 허가/조퇴 신청 | 22 직업·직장 |
| 74 | jamu | 자무 (전통 약초 음료) | 24 의료·병원 |
| 75 | jari | 손가락 | 15 신체·건강 |
| 76 | jauh | 먼 | 11 상태·성질 |
| 77 | juta | 백만 (금액 단위) | 20 쇼핑·돈 |
| 78 | kafe | 카페 | 32 장소·여행 |
| 79 | kain | 천/직물 | 19 옷·외모 |
| 80 | kaki | 발/다리 | 15 신체·건강 |
| 81 | kaku | 뻣뻣한/경직된 | 11 상태·성질 |
| 82 | kali | 번/회 (횟수) | 04 수량·숫자·단위 |
| 83 | kaus | 티셔츠 | 19 옷·외모 |
| 84 | kaya | 부유한 | 20 쇼핑·돈 |
| 85 | kera | 원숭이 (긴꼬리원숭이) | 28 동물 |
| 86 | kilo | 킬로그램 | 04 수량·숫자·단위 |
| 87 | kios | 노점/작은 매장 | 20 쇼핑·돈 |
| 88 | klub | 동호회/클럽 | 21 취미·운동·여가 |
| 89 | koin | 동전 | 20 쇼핑·돈 |
| 90 | koki | 요리사 | 22 직업·직장 |
| 91 | kopi | 커피 | 17 음식·요리 |
| 92 | kota | 도시 | 32 장소·여행 |
| 93 | kuat | 강한 | 10 접사 가족 |
| 94 | kuda | 말(동물) | 28 동물 |
| 95 | kuku | 손톱/발톱 | 15 신체·건강 |
| 96 | kuno | 오래된/고풍스러운 | 34 인도네시아 문화 |
| 97 | lada | 후추 (열매·작물) | 29 식물·농업 |
| 98 | lama | 오랜/오랫동안 | 11 상태·성질 |
| 99 | lauk | 반찬 | 17 음식·요리 |
| 100 | laut | 바다 | 30 날씨·지형 |
| 101 | layu | 시들다 | 29 식물·농업 |
| 102 | liar | 야생의 | 28 동물 |
| 103 | lima | 다섯/오 | 04 수량·숫자·단위 |
| 104 | luas | 넓은/광활한 | 11 상태·성질 |
| 105 | lucu | 재미있는/귀여운 | 12 평가·정도 |
| 106 | luka | 상처 | 24 의료·병원 |
| 107 | lupa | 잊다 | 09 인지·소통 |
| 108 | lusa | 모레 | 05 시간·날짜·순서 |
| 109 | maaf | 미안합니다/죄송합니다 | 01 인사·기본 표현 |
| 110 | maag | 위염/속쓰림 | 24 의료·병원 |
| 111 | maju | 앞으로 나아가다 | 07 이동·존재 |
| 112 | malu | 부끄러운 | 16 감정·성격 |
| 113 | mama | 엄마 (친근) | 14 가족·호칭 |
| 114 | mata | 눈 | 15 신체·건강 |
| 115 | meja | 책상/탁자 | 18 집·생활용품 |
| 116 | mual | 메스꺼운 | 15 신체·건강 |
| 117 | muda | 어린/젊은 | 11 상태·성질 |
| 118 | naik | 오르다/타다 | 07 이동·존재 |
| 119 | nasi | 밥/쌀밥 | 17 음식·요리 |
| 120 | niat | 의도/뜻 | 09 인지·소통 |
| 121 | nota | 간이 영수증/전표 | 20 쇼핑·돈 |
| 122 | obat | 약 | 24 의료·병원 |
| 123 | ojek | 오토바이 택시 | 31 교통 |
| 124 | otak | 뇌 | 15 신체·건강 |
| 125 | otot | 근육 | 15 신체·건강 |
| 126 | oval | 타원형의 | 11 상태·성질 |
| 127 | padi | 벼 | 29 식물·농업 |
| 128 | pagi | 아침 | 05 시간·날짜·순서 |
| 129 | paha | 허벅지 | 15 신체·건강 |
| 130 | papa | 아빠 (친근) | 14 가족·호칭 |
| 131 | peci | 프치 (무슬림 남성 챙 없는 모자) | 19 옷·외모 |
| 132 | peta | 지도 | 32 장소·여행 |
| 133 | pipi | 볼/뺨 | 15 신체·건강 |
| 134 | pura | 푸라 (발리 힌두 사원) | 32 장소·여행 |
| 135 | rapi | 깔끔한/정돈된 | 11 상태·성질 |
| 136 | rasa | 느낌/맛 | 10 접사 가족 |
| 137 | rata | 평평한/고른 | 11 상태·성질 |
| 138 | rawa | 늪/습지 | 30 날씨·지형 |
| 139 | ribu | 천 (금액 단위) | 20 쇼핑·돈 |
| 140 | roti | 빵 | 17 음식·요리 |
| 141 | rugi | 손해 | 20 쇼핑·돈 |
| 142 | rusa | 사슴 | 28 동물 |
| 143 | saat | 순간/때 | 05 시간·날짜·순서 |
| 144 | saku | 주머니 | 19 옷·외모 |
| 145 | sapi | 소 | 28 동물 |
| 146 | sapu | 빗자루 | 18 집·생활용품 |
| 147 | sate | 사테 (꼬치구이) | 17 음식·요리 |
| 148 | satu | 하나/일 | 04 수량·숫자·단위 |
| 149 | seni | 예술 | 34 인도네시아 문화 |
| 150 | seri | 비기다/무승부 | 21 취미·운동·여가 |
| 151 | siku | 팔꿈치 | 15 신체·건강 |
| 152 | skor | 점수/스코어 | 21 취미·운동·여가 |
| 153 | sofa | 소파 | 18 집·생활용품 |
| 154 | sore | 오후/저녁 무렵 | 05 시간·날짜·순서 |
| 155 | soto | 소토 (인도네시아식 국) | 17 음식·요리 |
| 156 | staf | 직원/스태프 | 22 직업·직장 |
| 157 | suap | 뇌물 | 27 사회·경제·뉴스 |
| 158 | suhu | 온도 | 30 날씨·지형 |
| 159 | suka | 좋아하다 | 16 감정·성격 |
| 160 | suku | 종족/부족 | 34 인도네시아 문화 |
| 161 | susu | 우유 | 17 음식·요리 |
| 162 | tadi | 아까/방금 전에 | 05 시간·날짜·순서 |
| 163 | tahu | 알다 | 09 인지·소통 |
| 164 | tari | 춤/무용 | 34 인도네시아 문화 |
| 165 | tawa | 웃음 | 16 감정·성격 |
| 166 | tebu | 사탕수수 | 29 식물·농업 |
| 167 | teko | 주전자 | 18 집·생활용품 |
| 168 | tiba | 도착하다 | 07 이동·존재 |
| 169 | tiga | 셋/삼 | 04 수량·숫자·단위 |
| 170 | tisu | 화장지/티슈 | 18 집·생활용품 |
| 171 | toko | 가게 | 20 쇼핑·돈 |
| 172 | topi | 모자 | 19 옷·외모 |
| 173 | truk | 트럭 | 31 교통 |
| 174 | uang | 돈/화폐 | 20 쇼핑·돈 |
| 175 | ular | 뱀 | 28 동물 |
| 176 | umur | 나이 (일상어) | 01 인사·기본 표현 |
| 177 | ungu | 보라색 | 11 상태·성질 |
| 178 | unik | 독특한 | 12 평가·정도 |
| 179 | upah | 임금/삯 | 22 직업·직장 |
| 180 | urat | 힘줄/핏줄 | 15 신체·건강 |
| 181 | usia | 나이/연령 | 05 시간·날짜·순서 |
| 182 | usus | 장(腸) | 15 신체·건강 |
| 183 | utuh | 온전한/완전한 | 11 상태·성질 |
| 184 | vila | 별장/빌라 | 32 장소·여행 |
| 185 | visa | 비자 | 25 행정·법률 |
| 186 | voli | 배구 | 21 취미·운동·여가 |
| 187 | yoga | 요가 | 21 취미·운동·여가 |

## 4글자 뺀 단어 (58개)

| 단어 | 뜻 | 출처 단어장 | 뺀 이유 |
|---|---|---|---|
| abis | 다 떨어진/~하고 나서 (구어, = habis) | 06 입말·구어 | 구어 |
| bete | 짜증 난/기분이 꿀꿀한 (구어) | 06 입말·구어 | 구어 |
| buat | ~를 위해 (구어) | 03 전치사·접속사 | 구어 |
| cuma | 그냥/단지 (구어, = hanya) | 06 입말·구어 | 구어 |
| dong | 좀/~잖아 (구어, 재촉·강조) | 06 입말·구어 | 구어 |
| gede | 큰 (구어, = besar) | 06 입말·구어 | 구어 |
| gini | 이렇게 (구어, = begini) | 06 입말·구어 | 구어 |
| gitu | 그렇게 (구어, = begitu) | 06 입말·구어 | 구어 |
| kepo | 남의 일을 캐묻기 좋아하는 (구어) | 06 입말·구어 | 구어 |
| masa | 설마/그럴 리가 (구어) | 06 입말·구어 | 구어 |
| ntar | 이따가 (구어, = nanti) | 06 입말·구어 | 구어 |
| pede | 자신감 있는 (구어, percaya diri) | 06 입말·구어 | 구어 |
| rame | 북적이는/떠들썩한 (구어, = ramai) | 06 입말·구어 | 구어 |
| sama | ~와/~에게 (구어, = dengan·kepada) | 06 입말·구어 | 구어 |
| seru | 재미있는/신나는 (구어) | 06 입말·구어 | 구어 |
| sori | 미안 (구어) | 06 입말·구어 | 구어 |
| tapi | 그렇지만 (구어) | 03 전치사·접속사 | 구어 |
| udah | 이미/벌써 (구어, = sudah) | 06 입말·구어 | 구어 |
| aduh | 아야/아이고 (감탄) | 06 입말·구어 | 기능어·문법 말(대명사·접속사·전치사·조사·정도 부사·조동사·감탄사) |
| agak | 좀/약간 | 12 평가·정도 | 기능어·문법 말(대명사·접속사·전치사·조사·정도 부사·조동사·감탄사) |
| agar | ~하기 위해 | 03 전치사·접속사 | 기능어·문법 말(대명사·접속사·전치사·조사·정도 부사·조동사·감탄사) |
| akan | ~할 것이다 | 05 시간·날짜·순서 | 기능어·문법 말(대명사·접속사·전치사·조사·정도 부사·조동사·감탄사) |
| amat | 매우/몹시 | 12 평가·정도 | 기능어·문법 말(대명사·접속사·전치사·조사·정도 부사·조동사·감탄사) |
| atau | 또는/혹은 | 03 전치사·접속사 | 기능어·문법 말(대명사·접속사·전치사·조사·정도 부사·조동사·감탄사) |
| bagi | ~에게 있어서 | 03 전치사·접속사 | 기능어·문법 말(대명사·접속사·전치사·조사·정도 부사·조동사·감탄사) |
| bisa | 할 수 있다 | 01 인사·기본 표현 | 기능어·문법 말(대명사·접속사·전치사·조사·정도 부사·조동사·감탄사) |
| dari | ~에서/~로부터 | 03 전치사·접속사 | 기능어·문법 말(대명사·접속사·전치사·조사·정도 부사·조동사·감탄사) |
| demi | ~를 위하여 | 03 전치사·접속사 | 기능어·문법 말(대명사·접속사·전치사·조사·정도 부사·조동사·감탄사) |
| diri | 자신 | 02 인칭·지시·의문 | 기능어·문법 말(대명사·접속사·전치사·조사·정도 부사·조동사·감탄사) |
| halo | 여보세요/안녕 (가벼운 인사) | 01 인사·기본 표현 | 기능어·문법 말(대명사·접속사·전치사·조사·정도 부사·조동사·감탄사) |
| jadi | 그래서/그러니까 | 03 전치사·접속사 | 기능어·문법 말(대명사·접속사·전치사·조사·정도 부사·조동사·감탄사) |
| jika | 만약 ~라면 | 03 전치사·접속사 | 기능어·문법 말(대명사·접속사·전치사·조사·정도 부사·조동사·감탄사) |
| juga | ~도/또한 | 03 전치사·접속사 | 기능어·문법 말(대명사·접속사·전치사·조사·정도 부사·조동사·감탄사) |
| kami | 우리 (듣는 사람 제외) | 02 인칭·지시·의문 | 기능어·문법 말(대명사·접속사·전치사·조사·정도 부사·조동사·감탄사) |
| kamu | 너 (비격식) | 02 인칭·지시·의문 | 기능어·문법 말(대명사·접속사·전치사·조사·정도 부사·조동사·감탄사) |
| kian | 점점/갈수록 | 12 평가·정도 | 기능어·문법 말(대명사·접속사·전치사·조사·정도 부사·조동사·감탄사) |
| kita | 우리 (듣는 사람 포함) | 02 인칭·지시·의문 | 기능어·문법 말(대명사·접속사·전치사·조사·정도 부사·조동사·감탄사) |
| lagi | 다시/또 | 13 빈도·양태 | 기능어·문법 말(대명사·접속사·전치사·조사·정도 부사·조동사·감탄사) |
| lalu | 그러고 나서 | 03 전치사·접속사 | 기능어·문법 말(대명사·접속사·전치사·조사·정도 부사·조동사·감탄사) |
| maka | 그러므로 | 03 전치사·접속사 | 기능어·문법 말(대명사·접속사·전치사·조사·정도 부사·조동사·감탄사) |
| mana | 어느/어디 | 02 인칭·지시·의문 | 기능어·문법 말(대명사·접속사·전치사·조사·정도 부사·조동사·감탄사) |
| mari | 자, ~합시다 (권유) | 01 인사·기본 표현 | 기능어·문법 말(대명사·접속사·전치사·조사·정도 부사·조동사·감탄사) |
| oleh | ~에 의해 (피동) | 03 전치사·접속사 | 기능어·문법 말(대명사·접속사·전치사·조사·정도 부사·조동사·감탄사) |
| pada | ~에 (시간·대상) | 03 전치사·접속사 | 기능어·문법 말(대명사·접속사·전치사·조사·정도 부사·조동사·감탄사) |
| saja | ~만/~뿐 | 12 평가·정도 | 기능어·문법 말(대명사·접속사·전치사·조사·정도 부사·조동사·감탄사) |
| sana | 저기/저쪽 | 02 인칭·지시·의문 | 기능어·문법 말(대명사·접속사·전치사·조사·정도 부사·조동사·감탄사) |
| sang | ~님 (높임 관사) | 02 인칭·지시·의문 | 기능어·문법 말(대명사·접속사·전치사·조사·정도 부사·조동사·감탄사) |
| saya | 저/제 (격식) | 02 인칭·지시·의문 | 기능어·문법 말(대명사·접속사·전치사·조사·정도 부사·조동사·감탄사) |
| sini | 여기 | 02 인칭·지시·의문 | 기능어·문법 말(대명사·접속사·전치사·조사·정도 부사·조동사·감탄사) |
| situ | 거기 | 02 인칭·지시·의문 | 기능어·문법 말(대명사·접속사·전치사·조사·정도 부사·조동사·감탄사) |
| yang | ~하는/~인 (관계사) | 02 인칭·지시·의문 | 기능어·문법 말(대명사·접속사·전치사·조사·정도 부사·조동사·감탄사) |
| eror | 오류/에러 | 33 기술·인터넷 | 비표준 표기 |
| band | 밴드 (음악) | 21 취미·운동·여가 | 영어 표기 그대로(차용어) |
| chef | 요리사 | 22 직업·직장 | 영어 표기 그대로(차용어) |
| golf | 골프 | 21 취미·운동·여가 | 영어 표기 그대로(차용어) |
| lift | 엘리베이터 | 26 긴급·안전 | 영어 표기 그대로(차용어) |
| wifi | 와이파이 | 33 기술·인터넷 | 영어 표기 그대로(차용어) |
| ojol | 온라인 오토바이 택시 (ojek online) | 31 교통 | 줄임말(머리글자·음절 줄임에서 온 말) |

## 6글자 정답 후보 (316개)

| # | 단어 | 뜻 | 출처 단어장 |
|---|---|---|---|
| 1 | akurat | 정확한 (수치) | 12 평가·정도 |
| 2 | alamat | 주소 | 32 장소·여행 |
| 3 | alergi | 알레르기 | 24 의료·병원 |
| 4 | alumni | 동문/졸업생 | 23 교육·학교 |
| 5 | anjing | 개 | 28 동물 |
| 6 | anjlok | 폭락하다 | 27 사회·경제·뉴스 |
| 7 | anting | 귀걸이 | 19 옷·외모 |
| 8 | apotek | 약국 | 24 의료·병원 |
| 9 | arisan | 아리산 (돌아가며 목돈을 타는 계모임) | 34 인도네시아 문화 |
| 10 | arloji | 손목시계 | 19 옷·외모 |
| 11 | atasan | 상사 | 22 직업·직장 |
| 12 | aturan | 규칙/규정 | 25 행정·법률 |
| 13 | ayunan | 그네 | 21 취미·운동·여가 |
| 14 | bagasi | 수하물/짐 | 32 장소·여행 |
| 15 | bahasa | 언어 | 23 교육·학교 |
| 16 | bahaya | 위험 | 26 긴급·안전 |
| 17 | bangga | 자랑스러운 | 16 감정·성격 |
| 18 | bangsa | 민족/국민 | 25 행정·법률 |
| 19 | bangun | 일어나다 | 15 신체·건강 |
| 20 | banjir | 홍수 | 30 날씨·지형 |
| 21 | bantal | 베개 | 18 집·생활용품 |
| 22 | banyak | 많은 | 04 수량·숫자·단위 |
| 23 | barang | 물건/상품 | 20 쇼핑·돈 |
| 24 | basket | 농구 | 21 취미·운동·여가 |
| 25 | batang | 자루/그루 (긴 물건 수분류사) | 04 수량·숫자·단위 |
| 26 | bensin | 휘발유 | 31 교통 |
| 27 | berada | ~에 있다/처하다 | 07 이동·존재 |
| 28 | berani | 용감한 | 10 접사 가족 |
| 29 | berita | 뉴스/소식 | 33 기술·인터넷 |
| 30 | berkas | 파일/서류 | 33 기술·인터넷 |
| 31 | bersih | 깨끗한 | 11 상태·성질 |
| 32 | bersin | 재채기하다 | 15 신체·건강 |
| 33 | budaya | 문화 | 34 인도네시아 문화 |
| 34 | bupati | 군수 | 27 사회·경제·뉴스 |
| 35 | burung | 새 | 28 동물 |
| 36 | campak | 홍역 | 24 의료·병원 |
| 37 | cantik | 예쁜/아름다운 | 19 옷·외모 |
| 38 | capung | 잠자리 | 28 동물 |
| 39 | cedera | 부상 | 21 취미·운동·여가 |
| 40 | celana | 바지 | 19 옷·외모 |
| 41 | cerdas | 영리한 | 16 감정·성격 |
| 42 | cermat | 신중한/꼼꼼한 | 16 감정·성격 |
| 43 | cermin | 거울 | 18 집·생활용품 |
| 44 | cincin | 반지 | 19 옷·외모 |
| 45 | daerah | 지역 | 32 장소·여행 |
| 46 | daging | 고기 | 17 음식·요리 |
| 47 | daster | 다스테르 (여성용 헐렁한 원피스) | 19 옷·외모 |
| 48 | datang | 오다 | 07 이동·존재 |
| 49 | dicuri | 도둑맞다 | 26 긴급·안전 |
| 50 | dingin | 차가운/추운 | 11 상태·성질 |
| 51 | diskon | 할인 | 20 쇼핑·돈 |
| 52 | dokter | 의사 | 24 의료·병원 |
| 53 | doktor | 박사 | 23 교육·학교 |
| 54 | dompet | 지갑 | 20 쇼핑·돈 |
| 55 | donasi | 기부/성금 | 26 긴급·안전 |
| 56 | durian | 두리안 | 29 식물·농업 |
| 57 | ekspor | 수출 | 27 사회·경제·뉴스 |
| 58 | energi | 에너지 | 27 사회·경제·뉴스 |
| 59 | fisika | 물리 | 23 교육·학교 |
| 60 | garasi | 차고 | 18 집·생활용품 |
| 61 | gayung | 물바가지 | 18 집·생활용품 |
| 62 | gedung | 건물 | 32 장소·여행 |
| 63 | gejala | 증상 | 24 의료·병원 |
| 64 | gelang | 팔찌 | 19 옷·외모 |
| 65 | ginjal | 신장/콩팥 | 15 신체·건강 |
| 66 | gorden | 커튼 | 18 집·생활용품 |
| 67 | gratis | 무료인 | 20 쇼핑·돈 |
| 68 | gudang | 창고 | 18 집·생활용품 |
| 69 | guling | 안고 자는 긴 베개 | 18 집·생활용품 |
| 70 | guntur | 천둥 | 30 날씨·지형 |
| 71 | gunung | 산 | 30 날씨·지형 |
| 72 | gurita | 문어 | 28 동물 |
| 73 | hambar | 싱거운/맛없는 | 17 음식·요리 |
| 74 | hampir | 거의/하마터면 | 12 평가·정도 |
| 75 | hancur | 부서진/산산조각 난 | 11 상태·성질 |
| 76 | handuk | 수건 | 18 집·생활용품 |
| 77 | hangat | 따뜻한 | 11 상태·성질 |
| 78 | hanyut | 떠내려가다 | 26 긴급·안전 |
| 79 | harian | 일간의/매일의 | 05 시간·날짜·순서 |
| 80 | hidung | 코 | 15 신체·건강 |
| 81 | hilang | 잃어버리다/없어지다 | 26 긴급·안전 |
| 82 | ijazah | 졸업장/학위증 | 23 교육·학교 |
| 83 | impian | 꿈/이상 | 16 감정·성격 |
| 84 | jadwal | 시간표/일정 | 31 교통 |
| 85 | jagung | 옥수수 | 29 식물·농업 |
| 86 | jarang | 드문/희박한 | 13 빈도·양태 |
| 87 | jenius | 천재적인 | 16 감정·성격 |
| 88 | jilbab | 질밥 (무슬림 여성 머릿수건) | 19 옷·외모 |
| 89 | joging | 조깅 | 21 취미·운동·여가 |
| 90 | jumlah | 수량/총계 | 04 수량·숫자·단위 |
| 91 | kacang | 콩/땅콩 | 29 식물·농업 |
| 92 | kaleng | 캔 (수분류사) | 04 수량·숫자·단위 |
| 93 | kalung | 목걸이 | 19 옷·외모 |
| 94 | kambuh | 재발하다/도지다 | 24 의료·병원 |
| 95 | kamera | 카메라 | 33 기술·인터넷 |
| 96 | kampus | 대학 캠퍼스 | 23 교육·학교 |
| 97 | kancil | 애기사슴 (민담 속 꾀 많은 동물) | 28 동물 |
| 98 | kanker | 암 | 24 의료·병원 |
| 99 | kantin | 매점/구내식당 | 23 교육·학교 |
| 100 | kantor | 사무실/회사 | 22 직업·직장 |
| 101 | kapsul | 캡슐 | 24 의료·병원 |
| 102 | karcis | 승차권/입장권 | 31 교통 |
| 103 | karier | 경력/커리어 | 22 직업·직장 |
| 104 | karung | 자루 (큰 포대) | 04 수량·숫자·단위 |
| 105 | kebaya | 크바야 (여성 전통 상의) | 19 옷·외모 |
| 106 | kecewa | 실망한 | 16 감정·성격 |
| 107 | kecoak | 바퀴벌레 | 28 동물 |
| 108 | kelapa | 코코넛 | 29 식물·농업 |
| 109 | kelima | 다섯 번째 | 04 수량·숫자·단위 |
| 110 | keliru | 착각한/잘못 안 | 12 평가·정도 |
| 111 | keluar | 나가다 | 07 이동·존재 |
| 112 | kembar | 쌍둥이의 | 14 가족·호칭 |
| 113 | kemeja | 셔츠(버튼형) | 19 옷·외모 |
| 114 | kening | 이마 | 15 신체·건강 |
| 115 | kenyal | 쫄깃한/탄력 있는 | 11 상태·성질 |
| 116 | kepala | 머리 | 15 신체·건강 |
| 117 | kerbau | 물소 | 28 동물 |
| 118 | kereta | 기차 | 31 교통 |
| 119 | kering | 건조한 | 11 상태·성질 |
| 120 | ketiga | 세 번째 | 04 수량·숫자·단위 |
| 121 | klinik | 의원/클리닉 | 24 의료·병원 |
| 122 | kloset | 변기 | 18 집·생활용품 |
| 123 | komodo | 코모도왕도마뱀 | 28 동물 |
| 124 | kompor | 가스레인지/레인지 | 18 집·생활용품 |
| 125 | konser | 콘서트 | 21 취미·운동·여가 |
| 126 | korban | 피해자/희생자 | 26 긴급·안전 |
| 127 | kosong | 빈 | 11 상태·성질 |
| 128 | kredit | 할부/신용 대출 | 20 쇼핑·돈 |
| 129 | krisis | 위기 | 27 사회·경제·뉴스 |
| 130 | kucing | 고양이 | 28 동물 |
| 131 | kulkas | 냉장고 | 18 집·생활용품 |
| 132 | kuning | 노란 | 11 상태·성질 |
| 133 | kurang | 덜/부족하게 | 12 평가·정도 |
| 134 | ladang | 밭/농지 | 29 식물·농업 |
| 135 | lambat | 느린 | 11 상태·성질 |
| 136 | langit | 하늘 | 30 날씨·지형 |
| 137 | langka | 희귀한/드문 | 12 평가·정도 |
| 138 | lantai | 바닥/층 | 18 집·생활용품 |
| 139 | lemari | 옷장/장롱 | 18 집·생활용품 |
| 140 | lembah | 계곡/골짜기 | 30 날씨·지형 |
| 141 | lembap | 습한 | 11 상태·성질 |
| 142 | lembar | 장 (종이 수분류사) | 04 수량·숫자·단위 |
| 143 | lembur | 야근/초과근무 | 22 직업·직장 |
| 144 | lembut | 부드러운/온화한 | 11 상태·성질 |
| 145 | lengan | 소매/팔 | 19 옷·외모 |
| 146 | lenyap | 사라지다/자취를 감추다 | 07 이동·존재 |
| 147 | lincah | 활발한/민첩한 | 16 감정·성격 |
| 148 | lokasi | 위치/장소 | 07 이동·존재 |
| 149 | losmen | 여인숙/저가 숙소 | 32 장소·여행 |
| 150 | magang | 인턴십/실습 | 22 직업·직장 |
| 151 | mainan | 장난감 | 10 접사 가족 |
| 152 | mangga | 망고 | 29 식물·농업 |
| 153 | masjid | 모스크/이슬람 사원 | 34 인도네시아 문화 |
| 154 | masker | 마스크 | 24 의료·병원 |
| 155 | matang | 익은/성숙한 | 17 음식·요리 |
| 156 | medali | 메달 | 21 취미·운동·여가 |
| 157 | meluap | 넘쳐흐르다 | 30 날씨·지형 |
| 158 | melulu | 오직/줄곧 | 12 평가·정도 |
| 159 | memang | 정말/확실히/과연 | 13 빈도·양태 |
| 160 | memuji | 칭찬하다 | 09 인지·소통 |
| 161 | menang | 이기다 | 21 취미·운동·여가 |
| 162 | menari | 춤추다 | 34 인도네시아 문화 |
| 163 | menepi | 길가로 붙다/비켜서다 | 07 이동·존재 |
| 164 | menipu | 속이다/사기 치다 | 26 긴급·안전 |
| 165 | mentah | 날것의/덜 익은 | 17 음식·요리 |
| 166 | menuju | ~로 향하다 | 07 이동·존재 |
| 167 | merasa | 느끼다 | 10 접사 가족 |
| 168 | merica | 후추 | 17 음식·요리 |
| 169 | mertua | 시부모/장인·장모 | 14 가족·호칭 |
| 170 | minder | 자신 없는/위축된 | 16 감정·성격 |
| 171 | minggu | 주/일주일 | 05 시간·날짜·순서 |
| 172 | minyak | 기름 | 17 음식·요리 |
| 173 | miring | 기울어진/비스듬한 | 11 상태·성질 |
| 174 | miskin | 가난한 | 20 쇼핑·돈 |
| 175 | modern | 현대적인 | 34 인도네시아 문화 |
| 176 | montir | 정비공 | 22 직업·직장 |
| 177 | monyet | 원숭이 | 28 동물 |
| 178 | mukena | 무크나 (여성 기도복) | 19 옷·외모 |
| 179 | muncul | 나타나다 | 07 이동·존재 |
| 180 | mundur | 뒤로 물러나다 | 07 이동·존재 |
| 181 | muntah | 토하다/구토 | 24 의료·병원 |
| 182 | museum | 박물관 | 32 장소·여행 |
| 183 | musisi | 음악가 | 34 인도네시아 문화 |
| 184 | nampan | 쟁반 | 18 집·생활용품 |
| 185 | nangka | 잭프루트 | 29 식물·농업 |
| 186 | negara | 국가/나라 | 25 행정·법률 |
| 187 | normal | 정상적인 | 12 평가·정도 |
| 188 | nyamuk | 모기 | 28 동물 |
| 189 | nyaris | 하마터면/거의 | 12 평가·정도 |
| 190 | ongkos | 차비/운임 | 31 교통 |
| 191 | oranye | 주황색 | 11 상태·성질 |
| 192 | pabrik | 공장 | 27 사회·경제·뉴스 |
| 193 | padang | 평원/들판 | 30 날씨·지형 |
| 194 | pantai | 해변/해안 | 30 날씨·지형 |
| 195 | pantas | 마땅한/어울리는 | 12 평가·정도 |
| 196 | parfum | 향수 | 19 옷·외모 |
| 197 | parkir | 주차/주차하다 | 31 교통 |
| 198 | partai | 정당 | 27 사회·경제·뉴스 |
| 199 | pasang | 쌍/켤레 (짝 수분류사) | 04 수량·숫자·단위 |
| 200 | pasien | 환자 | 24 의료·병원 |
| 201 | paspor | 여권 | 25 행정·법률 |
| 202 | payung | 우산 | 18 집·생활용품 |
| 203 | pelaku | 범인/가해자 | 26 긴급·안전 |
| 204 | pemain | 선수/연주자 | 10 접사 가족 |
| 205 | pemalu | 수줍음 많은 | 16 감정·성격 |
| 206 | pendek | 짧은/키가 작은 | 11 상태·성질 |
| 207 | penipu | 사기꾼 | 26 긴급·안전 |
| 208 | pensil | 연필 | 23 교육·학교 |
| 209 | pepaya | 파파야 | 29 식물·농업 |
| 210 | perahu | 작은 배/나룻배 | 31 교통 |
| 211 | perang | 전쟁 | 27 사회·경제·뉴스 |
| 212 | perban | 붕대 | 24 의료·병원 |
| 213 | persen | 퍼센트 | 04 수량·숫자·단위 |
| 214 | petani | 농부 | 29 식물·농업 |
| 215 | piknik | 소풍/피크닉 | 21 취미·운동·여가 |
| 216 | pindah | 옮겨 가다/이사하다 | 07 이동·존재 |
| 217 | pintar | 똑똑한/잘하는 | 16 감정·성격 |
| 218 | piring | 그릇 (음식 수분류사) | 04 수량·숫자·단위 |
| 219 | pisang | 바나나 | 29 식물·농업 |
| 220 | piyama | 잠옷 | 19 옷·외모 |
| 221 | polisi | 경찰 | 25 행정·법률 |
| 222 | polusi | 오염/공해 | 27 사회·경제·뉴스 |
| 223 | posisi | 자리/위치 | 07 이동·존재 |
| 224 | potong | 조각 (자른 것 수분류사) | 04 수량·숫자·단위 |
| 225 | produk | 제품 | 20 쇼핑·돈 |
| 226 | protes | 항의/항의하다 | 27 사회·경제·뉴스 |
| 227 | proyek | 프로젝트/사업 | 22 직업·직장 |
| 228 | publik | 대중/공공 | 27 사회·경제·뉴스 |
| 229 | pulang | 돌아가다/귀가하다 | 07 이동·존재 |
| 230 | pulpen | 볼펜 | 23 교육·학교 |
| 231 | pusing | 어지러운/머리가 아픈 | 15 신체·건강 |
| 232 | radang | 염증 | 24 의료·병원 |
| 233 | rakyat | 국민/백성 | 27 사회·경제·뉴스 |
| 234 | rambut | 머리카락 | 15 신체·건강 |
| 235 | ransel | 배낭 | 32 장소·여행 |
| 236 | rektor | 총장 | 23 교육·학교 |
| 237 | remaja | 청소년 | 14 가족·호칭 |
| 238 | renang | 수영 (종목) | 21 취미·운동·여가 |
| 239 | rendah | 낮은 | 10 접사 가족 |
| 240 | resesi | 경기 침체 | 27 사회·경제·뉴스 |
| 241 | ribuan | 수천의 | 04 수량·숫자·단위 |
| 242 | ringan | 가벼운 | 11 상태·성질 |
| 243 | rontok | 떨어지다/빠지다 | 29 식물·농업 |
| 244 | rumput | 풀/잔디 | 29 식물·농업 |
| 245 | runtuh | 무너지다 | 26 긴급·안전 |
| 246 | rupiah | 루피아 (인도네시아 화폐) | 20 쇼핑·돈 |
| 247 | sambal | 삼발 소스(인도네시아 고추 소스) | 17 음식·요리 |
| 248 | sampah | 쓰레기 | 27 사회·경제·뉴스 |
| 249 | sandal | 샌들/슬리퍼 | 19 옷·외모 |
| 250 | santai | 여유로운/느긋한 | 11 상태·성질 |
| 251 | santan | 코코넛 밀크 | 17 음식·요리 |
| 252 | sarang | 둥지/보금자리 | 28 동물 |
| 253 | sarung | 사룽 (허리에 두르는 천) | 19 옷·외모 |
| 254 | segera | 곧바로/바로 | 05 시간·날짜·순서 |
| 255 | sejuta | 백만 | 04 수량·숫자·단위 |
| 256 | selalu | 항상 | 13 빈도·양태 |
| 257 | sembuh | 낫다/완치되다 | 24 의료·병원 |
| 258 | sempit | 좁은 | 11 상태·성질 |
| 259 | senang | 기쁜/즐거운 | 16 감정·성격 |
| 260 | sendok | 숟가락 | 18 집·생활용품 |
| 261 | senyum | 미소 | 16 감정·성격 |
| 262 | sepatu | 신발 | 19 옷·외모 |
| 263 | sepeda | 자전거 | 31 교통 |
| 264 | sepupu | 사촌 | 14 가족·호칭 |
| 265 | seribu | 천 | 04 수량·숫자·단위 |
| 266 | sering | 자주 | 13 빈도·양태 |
| 267 | serius | 진지한/심각한 | 12 평가·정도 |
| 268 | sesaat | 잠시 동안 | 05 시간·날짜·순서 |
| 269 | sesama | 이웃/같은 사람 | 14 가족·호칭 |
| 270 | sesuai | 부합하는/맞는 | 12 평가·정도 |
| 271 | setuju | 동의하다 | 09 인지·소통 |
| 272 | sidang | 재판/공판 | 25 행정·법률 |
| 273 | sinyal | 신호/수신 상태 | 33 기술·인터넷 |
| 274 | sirene | 사이렌 | 26 긴급·안전 |
| 275 | sistem | 시스템/체계 | 33 기술·인터넷 |
| 276 | spidol | 보드마커 | 23 교육·학교 |
| 277 | stabil | 안정된 | 27 사회·경제·뉴스 |
| 278 | sukses | 성공한 | 12 평가·정도 |
| 279 | sungai | 강 | 30 날씨·지형 |
| 280 | suntik | 주사 | 24 의료·병원 |
| 281 | survei | 여론 조사/설문 조사 | 27 사회·경제·뉴스 |
| 282 | sweter | 스웨터 | 19 옷·외모 |
| 283 | syarat | 조건/구비 요건 | 25 행정·법률 |
| 284 | tablet | 알약/정제 | 24 의료·병원 |
| 285 | tampan | 잘생긴 | 19 옷·외모 |
| 286 | tangan | 손 | 15 신체·건강 |
| 287 | tangga | 계단 | 18 집·생활용품 |
| 288 | tangis | 울음 | 16 감정·성격 |
| 289 | taring | 송곳니 | 28 동물 |
| 290 | tautan | 링크 | 33 기술·인터넷 |
| 291 | teater | 연극/극장 | 21 취미·운동·여가 |
| 292 | tebing | 절벽 | 30 날씨·지형 |
| 293 | teliti | 꼼꼼한/세심한 | 16 감정·성격 |
| 294 | tempat | 장소/공간 | 32 장소·여행 |
| 295 | tenang | 차분한/평온한 | 16 감정·성격 |
| 296 | tepung | 밀가루/가루 | 17 음식·요리 |
| 297 | terang | 밝은 | 11 상태·성질 |
| 298 | terasi | 트라시 (새우젓 페이스트) | 17 음식·요리 |
| 299 | ternak | 가축 | 28 동물 |
| 300 | tinggi | 높은/키가 큰 | 11 상태·성질 |
| 301 | tolong | ~해 주세요 (부탁) | 01 인사·기본 표현 |
| 302 | tujuan | 목적/목표 | 09 인지·소통 |
| 303 | tukang | ~장이/기술자 (직종 앞에 붙임) | 22 직업·직장 |
| 304 | tulang | 뼈 | 15 신체·건강 |
| 305 | tumbuh | 자라다 | 07 이동·존재 |
| 306 | tumpul | 무딘 | 11 상태·성질 |
| 307 | ukiran | 조각/조각품 | 34 인도네시아 문화 |
| 308 | ukuran | 치수/사이즈 | 19 옷·외모 |
| 309 | untung | 이익/이득 | 20 쇼핑·돈 |
| 310 | vaksin | 백신 | 24 의료·병원 |
| 311 | wahana | 놀이기구 | 21 취미·운동·여가 |
| 312 | warung | 와룽 (작은 동네 가게·식당) | 20 쇼핑·돈 |
| 313 | wayang | 와양 (그림자극·인형극) | 34 인도네시아 문화 |
| 314 | wihara | 위하라 (불교 사원) | 32 장소·여행 |
| 315 | wisata | 관광/여행 | 32 장소·여행 |
| 316 | wisuda | 졸업식 | 23 교육·학교 |

## 6글자 뺀 단어 (66개)

| 단어 | 뜻 | 출처 단어장 | 뺀 이유 |
|---|---|---|---|
| banget | 진짜/엄청 (구어, = sekali) | 06 입말·구어 | 구어 |
| bareng | 같이/함께 (구어, = bersama) | 06 입말·구어 | 구어 |
| bilang | 말하다 (구어) | 06 입말·구어 | 구어 |
| curhat | 속마음을 털어놓다 (구어) | 06 입말·구어 | 구어 |
| dateng | 오다 (구어, = datang) | 06 입말·구어 | 구어 |
| duluan | 먼저 (구어) | 06 입말·구어 | 구어 |
| enggak | 아니/~않다 (구어) | 06 입말·구어 | 구어 |
| garing | 썰렁한 (농담이) (구어) | 06 입말·구어 | 구어 |
| gimana | 어떻게/어때 (구어, = bagaimana) | 06 입말·구어 | 구어 |
| kangen | 보고 싶다/그립다 (구어, = rindu) | 06 입말·구어 | 구어 |
| ketemu | 만나다/찾다 (구어, = bertemu) | 06 입말·구어 | 구어 |
| mampir | 잠깐 들르다 (구어) | 07 이동·존재 | 구어 |
| mantap | 훌륭한/끝내주는 (구어) | 12 평가·정도 | 구어 |
| ngaret | (약속·행사가) 늦어지다 (구어) | 06 입말·구어 | 구어 |
| ngebut | 과속하다/쌩쌩 달리다 (구어) | 06 입말·구어 | 구어 |
| nonton | (영화·경기를) 보다 (구어, = menonton) | 06 입말·구어 | 구어 |
| nyampe | 도착하다 (구어, = sampai) | 06 입말·구어 | 구어 |
| nyesel | 후회하다 (구어, = menyesal) | 06 입말·구어 | 구어 |
| nyokap | 엄마 (자카르타 은어) | 06 입말·구어 | 구어 |
| opname | 입원하다 (구어) | 24 의료·병원 | 구어 |
| pengen | ~하고 싶다 (구어, = ingin) | 06 입말·구어 | 구어 |
| sumpah | 진짜로/맹세코 (구어, 강조) | 06 입말·구어 | 구어 |
| antara | ~사이에 | 03 전치사·접속사 | 기능어·문법 말(대명사·접속사·전치사·조사·정도 부사·조동사·감탄사) |
| apakah | ~입니까 (의문 표지) | 02 인칭·지시·의문 | 기능어·문법 말(대명사·접속사·전치사·조사·정도 부사·조동사·감탄사) |
| bahkan | 심지어/게다가 | 03 전치사·접속사 | 기능어·문법 말(대명사·접속사·전치사·조사·정도 부사·조동사·감탄사) |
| begini | 이렇게/이런 식으로 | 02 인칭·지시·의문 | 기능어·문법 말(대명사·접속사·전치사·조사·정도 부사·조동사·감탄사) |
| begitu | 그토록/그렇게 | 12 평가·정도 | 기능어·문법 말(대명사·접속사·전치사·조사·정도 부사·조동사·감탄사) |
| beliau | 그분 (높임말) | 02 인칭·지시·의문 | 기능어·문법 말(대명사·접속사·전치사·조사·정도 부사·조동사·감탄사) |
| berapa | 얼마/몇 | 02 인칭·지시·의문 | 기능어·문법 말(대명사·접속사·전치사·조사·정도 부사·조동사·감탄사) |
| betapa | 얼마나 | 12 평가·정도 | 기능어·문법 말(대명사·접속사·전치사·조사·정도 부사·조동사·감탄사) |
| dengan | ~와 함께/~로 | 03 전치사·접속사 | 기능어·문법 말(대명사·접속사·전치사·조사·정도 부사·조동사·감탄사) |
| diriku | 나 자신 | 02 인칭·지시·의문 | 기능어·문법 말(대명사·접속사·전치사·조사·정도 부사·조동사·감탄사) |
| dirimu | 너 자신 | 02 인칭·지시·의문 | 기능어·문법 말(대명사·접속사·전치사·조사·정도 부사·조동사·감탄사) |
| engkau | 그대/너 (문어·노래체) | 02 인칭·지시·의문 | 기능어·문법 말(대명사·접속사·전치사·조사·정도 부사·조동사·감탄사) |
| hingga | ~에 이르기까지 | 03 전치사·접속사 | 기능어·문법 말(대명사·접속사·전치사·조사·정도 부사·조동사·감탄사) |
| jangan | ~하지 마라 | 02 인칭·지시·의문 | 기능어·문법 말(대명사·접속사·전치사·조사·정도 부사·조동사·감탄사) |
| justru | 오히려/바로 | 03 전치사·접속사 | 기능어·문법 말(대명사·접속사·전치사·조사·정도 부사·조동사·감탄사) |
| kalian | 너희들 | 02 인칭·지시·의문 | 기능어·문법 말(대명사·접속사·전치사·조사·정도 부사·조동사·감탄사) |
| karena | ~때문에 | 03 전치사·접속사 | 기능어·문법 말(대명사·접속사·전치사·조사·정도 부사·조동사·감탄사) |
| kenapa | 왜 (구어) | 02 인칭·지시·의문 | 기능어·문법 말(대명사·접속사·전치사·조사·정도 부사·조동사·감탄사) |
| kepada | ~에게 (사람) | 03 전치사·접속사 | 기능어·문법 말(대명사·접속사·전치사·조사·정도 부사·조동사·감탄사) |
| ketika | ~할 때 | 03 전치사·접속사 | 기능어·문법 말(대명사·접속사·전치사·조사·정도 부사·조동사·감탄사) |
| mereka | 그들 | 02 인칭·지시·의문 | 기능어·문법 말(대명사·접속사·전치사·조사·정도 부사·조동사·감탄사) |
| paling | 가장/제일 | 12 평가·정도 | 기능어·문법 말(대명사·접속사·전치사·조사·정도 부사·조동사·감탄사) |
| pernah | ~한 적 있다 | 05 시간·날짜·순서 | 기능어·문법 말(대명사·접속사·전치사·조사·정도 부사·조동사·감탄사) |
| saling | 서로 | 02 인칭·지시·의문 | 기능어·문법 말(대명사·접속사·전치사·조사·정도 부사·조동사·감탄사) |
| sambil | ~하면서 | 03 전치사·접속사 | 기능어·문법 말(대명사·접속사·전치사·조사·정도 부사·조동사·감탄사) |
| sampai | ~까지 | 03 전치사·접속사 | 기능어·문법 말(대명사·접속사·전치사·조사·정도 부사·조동사·감탄사) |
| sangat | 매우/아주 | 12 평가·정도 | 기능어·문법 말(대명사·접속사·전치사·조사·정도 부사·조동사·감탄사) |
| sedang | ~하는 중이다 | 05 시간·날짜·순서 | 기능어·문법 말(대명사·접속사·전치사·조사·정도 부사·조동사·감탄사) |
| sekali | 매우/대단히 (뒤에 위치) | 12 평가·정도 | 기능어·문법 말(대명사·접속사·전치사·조사·정도 부사·조동사·감탄사) |
| selama | ~하는 동안 | 03 전치사·접속사 | 기능어·문법 말(대명사·접속사·전치사·조사·정도 부사·조동사·감탄사) |
| semoga | ~하기를 바라요 | 01 인사·기본 표현 | 기능어·문법 말(대명사·접속사·전치사·조사·정도 부사·조동사·감탄사) |
| setiap | 각각의/매~ | 02 인칭·지시·의문 | 기능어·문법 말(대명사·접속사·전치사·조사·정도 부사·조동사·감탄사) |
| supaya | ~하도록 | 03 전치사·접속사 | 기능어·문법 말(대명사·접속사·전치사·조사·정도 부사·조동사·감탄사) |
| tetapi | 그러나 (격식) | 03 전치사·접속사 | 기능어·문법 말(대명사·접속사·전치사·조사·정도 부사·조동사·감탄사) |
| folder | 폴더 | 33 기술·인터넷 | 영어 표기 그대로(차용어) |
| laptop | 노트북 | 33 기술·인터넷 | 영어 표기 그대로(차용어) |
| angkot | 앙콧 (노선 합승 미니버스, angkutan kota) | 31 교통 | 줄임말(머리글자·음절 줄임에서 온 말) |
| bimbel | 입시 학원 (bimbingan belajar) | 23 교육·학교 | 줄임말(머리글자·음절 줄임에서 온 말) |
| daring | 온라인의 (dalam jaringan) | 33 기술·인터넷 | 줄임말(머리글자·음절 줄임에서 온 말) |
| luring | 오프라인의 (luar jaringan) | 33 기술·인터넷 | 줄임말(머리글자·음절 줄임에서 온 말) |
| pemilu | 총선/선거 (pemilihan umum) | 27 사회·경제·뉴스 | 줄임말(머리글자·음절 줄임에서 온 말) |
| ponsel | 휴대폰 | 33 기술·인터넷 | 줄임말(머리글자·음절 줄임에서 온 말) |
| satpam | 경비원 (satuan pengamanan) | 22 직업·직장 | 줄임말(머리글자·음절 줄임에서 온 말) |
| tilang | 교통 딱지/범칙금 | 31 교통 | 줄임말(머리글자·음절 줄임에서 온 말) |

## 4글자 넣을 수 있는 말 — 정답 밖 (207개)

출처: 표제어 = 공용 단어장 표제어(성경과 신앙·위에서 뺀 단어 포함), 예문 = 예문에 소문자로 나온 낱말. 알파벳순(순서는 판정과 상관없음).

**표제어 (122개)**

abis, aduh, agak, agar, akal, akan, akta, alat, amat, amin, arus, atas,
atau, ayat, bagi, bait, band, bara, bela, bete, biak, bisa, buat, bumi,
chef, cuci, cuma, dari, daya, demi, dini, diri, dong, dosa, eror, feri,
fide, gede, gini, gitu, golf, halo, ikat, imam, iman, inap, jadi, jaga,
jika, jiwa, juga, juru, kami, kamp, kamu, kata, kaum, kayu, kepo, kian,
kiri, kita, kode, koko, koor, lagi, lagu, lain, lalu, lari, lele, lift,
luar, maka, mana, mari, masa, mati, misi, muka, nabi, nama, ntar, ojol,
oleh, opor, pada, pede, pers, pula, ragu, rame, raya, rice, roda, saja,
sama, sana, sang, saya, seru, sidi, sini, situ, sola, soli, sori, suci,
tamu, tapi, tata, tema, tiri, udah, uduk, umat, umum, usah, utan, wali,
wifi, yang

**예문 (85개)**

abad, adil, aduk, ahli, alun, arti, asli, asri, aula, awam, baca, baut,
bawa, beda, beli, beri, buka, buru, buta, cara, cari, cita, coba, cumi,
drum, duka, emas, erat, esok, file, foto, gado, gizi, grup, hias, ikut,
inti, irit, jahe, jawa, jazz, kado, kena, khas, kini, kira, kram, krim,
kupu, kura, laba, laci, laki, lega, liga, madu, main, menu, muat, mula,
olah, paku, para, paru, peka, puas, raja, reda, sepi, siap, sila, sisa,
soal, syal, taat, tali, tama, teka, teki, teks, tepi, tiap, tuan, urus,
usul

## 6글자 넣을 수 있는 말 — 정답 밖 (316개)

출처: 표제어 = 공용 단어장 표제어(성경과 신앙·위에서 뺀 단어 포함), 예문 = 예문에 소문자로 나온 낱말. 알파벳순(순서는 판정과 상관없음).

**표제어 (150개)**

ajaran, amplop, anggur, angkat, angkot, antara, apakah, asuhan, bagian, bahkan, banget, bareng,
bawang, begini, begitu, beliau, berapa, berapi, berdoa, berkat, betapa, bicara, bilang, bimbel,
buatan, bungsu, campur, cobaan, cooker, curhat, daftar, daring, dateng, dengan, diaken, diriku,
dirimu, duluan, enggak, engkau, firman, folder, garing, gereja, gimana, gloria, godaan, goreng,
gotong, gratia, hikmat, hingga, hormat, hosana, ibadah, imanen, jangan, jemaat, justru, kalian,
kangen, karena, kasihi, kenapa, kepada, kertas, ketemu, ketika, khusus, kiamat, kidung, komisi,
kumpul, laptop, lintas, luring, mampir, mantap, mereka, mezbah, migran, mimbar, moyang, negeri,
neraka, ngaret, ngebut, nonton, nurani, nyampe, nyesel, nyokap, online, opname, paduan, paling,
panjat, pemilu, pemuda, pencak, pengen, percik, pernah, pinang, pintas, ponsel, pujian, rahmat,
rantau, retret, rohani, royong, saling, sambil, sampai, sangat, santun, satpam, secara, sedang,
seiman, sekali, selain, selama, semoga, sentuh, setiap, seumur, siaran, silang, sosial, sulung,
sumpah, supaya, swasta, syalom, syukur, tabrak, takhta, takraw, tampil, tengah, terima, terjun,
tetapi, tilang, tunggu, unggun, urapan, wanita

**예문 (166개)**

adalah, adanya, adikku, adikmu, adonan, akibat, alasan, anggap, anggun, bagiku, balita, bawaan,
bentuk, berhak, berisi, berjam, bidang, binasa, bohong, buahan, bukuku, busnya, cabang, cahaya,
cerita, cicipi, dagang, dampak, desain, dewasa, diajak, dibaca, dibagi, dibawa, dibeli, diberi,
dibuat, dibuka, dicuci, dijaga, dijual, dimuat, diraut, disewa, diubah, diurus, dorong, elegan,
enamel, fungsi, galeri, gambar, gasnya, gawang, global, gurumu, hadiah, harimu, hatiku, hendak,
ibunya, ikhlas, instan, istana, itulah, jernih, jingga, jutaan, kabari, kadang, kakiku, karang,
kardus, karpet, kartun, keping, ketawa, krayon, kritik, kukumu, kuliah, kurban, lancar, landas,
lanjut, layang, lentik, lorong, lubang, magrib, maksud, martir, masing, materi, maupun, mazmur,
melaju, melaut, menara, meniup, menuai, meraih, merata, meriah, nabiah, nambah, nektar, nunggu,
nyaman, nyusul, pahami, pandai, patung, pelaut, pelita, peluit, pemula, penari, pengap, permen,
pinjam, proses, puncak, rempah, sayang, seakan, sebaik, sebuah, segala, sehari, sejati, sejauh,
sektor, selera, semata, sempat, seolah, serupa, simbol, simpan, solusi, suntuk, tabung, tambah,
tampak, tarian, tasnya, tayang, teknik, teknis, tembok, tenaga, terasa, terbit, terigu, tertib,
timnya, tombol, tropis, tuanya, uangmu, ucapan, undang, urusan, urutan, utusan
## 2단계 확정 (2026-11-25)

검토(Claude) 반영 뒤 동결본으로 옮긴 내용입니다 — `src/data/kataHariIniWords4.ts`·`kataHariIniWords6.ts`·`kataHariIniGuesses4.ts`·`kataHariIniGuesses6.ts`.

| 단계 | 정답(최종) | 한 바퀴 | 기준일(0번) | 넣을 수 있는 말(정답 밖) | 입력으로 받는 말 합계 |
|---|---|---|---|---|---|
| 4글자 | 183 | 183일 | 2026-11-26 | 534 | 717 |
| 6글자 | 313 | 313일 | 2026-11-26 | 319 | 632 |

- 정답에서 더 뺌(넣을 수 있는 말에는 남김): 4글자 babi, bemo, mama, papa / 6글자 anjing, campak, kanker
- 그 밖의 "판단 갈릴 만한 단어"(숫자·서수, 수분류사, bank·film 등 외래어, selalu·sering·jarang, dicuri)는 정답에 남김
- 뜻의 "/" 는 5글자 목록처럼 "·" 로 바꿈
- 출제 순서: 알파벳순 → 씨앗(4글자 202611264, 6글자 202611266)으로 한 번 섞어 고정

### 뜻 고침 (힌트로 보이는 칸)

| 단어 | 예전 뜻 | 고친 뜻 |
|---|---|---|
| biji | 알 (작은 것 수분류사) | 씨앗·알 (작은 것 세는 말) |
| buah | 개 (사물 수분류사) | 과일·열매 (사물 세는 말) |
| ekor | 마리 (동물 수분류사) | 꼬리 (동물 세는 말) |
| hati | 간 (장기) | 마음·간 |
| batang | 자루/그루 (긴 물건 수분류사) | 줄기·막대 (긴 것 세는 말) |
| kaleng | 캔 (수분류사) | 캔·깡통 |
| lembar | 장 (종이 수분류사) | 장·낱장 (종이 세는 말) |
| pasang | 쌍/켤레 (짝 수분류사) | 쌍·켤레 (짝 세는 말) |
| piring | 그릇 (음식 수분류사) | 접시 |
| potong | 조각 (자른 것 수분류사) | 조각 (자른 것 세는 말) |

### 4글자 넣을 수 있는 말 — 손으로 더한 단어 (324개)

흔한 표준 4글자 단어(단어장에 없어도 됨). 고유명사·요일 이름·욕설·성인 단어는 넣지 않음. 예문에서 자동으로 들어온 jawa(고유명사)는 뺌.

abai, abdi, abon, acak, acar, acuh, adab, agen, ajak, ajal, ajar, akad,
aksi, akur, alas, alga, alih, alim, alir, alot, alpa, alur, amal, amis,
amuk, anda, anti, anut, apak, apel, apik, apit, arak, aral, arca, arif,
asah, asas, aset, asuh, atom, atur, awak, awet, ayak, ayun, azan, baja,
baki, baku, bapa, bata, bayu, beku, besi, biar, bias, bila, bina, biro,
bisu, blok, bodi, boga, boks, bolu, bros, bual, bubu, budi, buih, busa,
calo, cela, ceri, ciri, cium, ciut, cuil, cuka, curi, dadu, dahi, daki,
dana, dara, debu, demo, depa, dera, deru, dewa, dewi, diet, duel, duga,
duit, duku, dupa, duri, duta, ecer, edar, edit, efek, ejek, elak, elit,
elok, elus, enau, epik, eram, esai, etis, etos, fana, fase, gada, gaib,
gali, gaul, gaya, gema, giat, gila, gips, giro, goda, gong, guci, guna,
gusi, haru, hawa, hela, hina, hulu, huma, huni, idam, idap, ijuk, ikal,
ikon, imun, inci, info, iris, isak, isap, itik, jago, jala, jasa, jati,
jaya, jeda, jemu, jera, jitu, joki, jual, judo, juri, kaca, kail, kaji,
kala, keju, kias, kiat, kisi, kiwi, klik, koma, kuah, kuas, kubu, kuil,
kuli, kurs, kutu, labu, laga, laik, laju, laku, lesu, liat, lidi, liku,
lobi, logo, loyo, luap, lugu, maut, mega, mini, mode, mosi, muak, mumi,
mutu, nada, nadi, naga, naif, nila, nira, noda, nona, obor, oles, olok,
onar, opsi, oven, pacu, padu, pagu, pala, pare, pari, pena, peri, peti,
picu, pilu, pion, pipa, pita, piza, pola, poni, pori, pose, pria, puja,
raba, ragi, ramu, ratu, raut, rayu, regu, reka, rela, riak, rona, ruas,
rupa, rute, sagu, saji, sapa, sari, sauh, saus, sawi, sawo, sayu, sedu,
segi, sela, semi, sesi, sewa, sisi, sita, siul, stok, suam, suar, sudi,
tabu, taji, tani, tapa, tega, teri, tipe, tipu, tiru, tiup, toga, tong,
tren, tuah, tuai, tuas, tugu, tuli, ubah, uban, ubin, ucap, udik, ufuk,
ujar, ukir, ukur, ulah, ulam, ulas, ulat, ulet, ulur, umbi, undi, unit,
unta, urai, urut, usai, usap, usik, usir, utus, veto, visi, wira, zona

