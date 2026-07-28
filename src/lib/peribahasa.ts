// src/lib/peribahasa.ts
// "오늘의 인도네시아어"에 쓰이는 속담·관용구 모음.
// 앱에 내장되어 있어 API 호출이 없고, 날짜를 기준으로 하나씩 돌아갑니다.

export interface Peribahasa {
  id: string; // 인도네시아어 문장
  ko: string; // 한국어 뜻
}

export const PERIBAHASA: Peribahasa[] = [
  { id: "Sedikit-sedikit, lama-lama menjadi bukit.", ko: "조금씩 모으다 보면 언덕이 됩니다. 티끌 모아 태산." },
  { id: "Air tenang menghanyutkan.", ko: "잔잔한 물이 (배를) 떠내려 보냅니다. 조용한 사람이 더 깊습니다." },
  { id: "Tak ada gading yang tak retak.", ko: "금 가지 않은 상아는 없습니다. 완벽한 사람은 없습니다." },
  { id: "Malu bertanya, sesat di jalan.", ko: "묻기를 부끄러워하면 길에서 헤맵니다." },
  { id: "Berakit-rakit ke hulu, berenang-renang ke tepian.", ko: "먼저 고생하고 나중에 즐깁니다. 고생 끝에 낙이 옵니다." },
  { id: "Di mana bumi dipijak, di situ langit dijunjung.", ko: "밟고 선 땅에서는 그곳의 하늘을 받듭니다. 그 고장의 법을 따르세요." },
  { id: "Sambil menyelam minum air.", ko: "잠수하면서 물도 마십니다. 일석이조." },
  { id: "Bersatu kita teguh, bercerai kita runtuh.", ko: "뭉치면 굳건하고 흩어지면 무너집니다." },
  { id: "Habis gelap terbitlah terang.", ko: "어둠이 지나면 빛이 떠오릅니다." },
  { id: "Buah jatuh tidak jauh dari pohonnya.", ko: "열매는 나무에서 멀리 떨어지지 않습니다. 그 아버지에 그 아들." },
  { id: "Tong kosong nyaring bunyinya.", ko: "빈 통이 소리가 큽니다. 빈 수레가 요란합니다." },
  { id: "Nasi sudah menjadi bubur.", ko: "밥이 이미 죽이 되었습니다. 엎지른 물입니다." },
  { id: "Seperti katak dalam tempurung.", ko: "껍데기 속 개구리 같습니다. 우물 안 개구리." },
  { id: "Ringan sama dijinjing, berat sama dipikul.", ko: "가벼우면 같이 들고, 무거우면 같이 집니다." },
  { id: "Tak kenal maka tak sayang.", ko: "알지 못하면 사랑하지 못합니다." },
  { id: "Sepandai-pandai tupai melompat, sekali waktu jatuh juga.", ko: "다람쥐도 언젠가는 떨어집니다. 원숭이도 나무에서 떨어집니다." },
  { id: "Rajin pangkal pandai.", ko: "부지런함이 지혜의 뿌리입니다." },
  { id: "Hemat pangkal kaya.", ko: "절약이 넉넉함의 뿌리입니다." },
  { id: "Ada gula, ada semut.", ko: "설탕이 있는 곳에 개미가 있습니다. 이익이 있는 곳에 사람이 모입니다." },
  { id: "Bagai pinang dibelah dua.", ko: "빈랑을 둘로 쪼갠 것 같습니다. 붕어빵처럼 닮았습니다." },
  { id: "Diam itu emas.", ko: "침묵은 금입니다." },
  { id: "Guru yang baik belajar seumur hidup.", ko: "좋은 선생은 평생 배웁니다." },
  { id: "Pelan-pelan saja, yang penting sampai.", ko: "천천히 가도 괜찮아요. 도착하는 게 중요하니까요." },
  { id: "Sedia payung sebelum hujan.", ko: "비 오기 전에 우산을 준비합니다. 유비무환." },
];

/** 오늘 날짜에 해당하는 인덱스 */
export function todayPeribahasaIndex(now: Date = new Date()): number {
  const start = new Date(now.getFullYear(), 0, 1).getTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const day = Math.floor((today - start) / 86400000);
  const n = PERIBAHASA.length;
  return ((day % n) + n) % n;
}

/** 범위를 벗어난 인덱스도 안전하게 감싸서 돌려줍니다. */
export function getPeribahasa(index: number): Peribahasa {
  const n = PERIBAHASA.length;
  const i = ((index % n) + n) % n;
  return PERIBAHASA[i];
}

/** 지금과 다른 문장을 무작위로 하나 고릅니다. */
export function nextRandomIndex(current: number): number {
  const n = PERIBAHASA.length;
  if (n <= 1) return 0;
  let i = current;
  let guard = 0;
  while (i === current && guard < 20) {
    i = Math.floor(Math.random() * n);
    guard += 1;
  }
  return i;
}
