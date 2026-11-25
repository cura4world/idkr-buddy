// src/data/kataHariIniGuesses6.ts
// 오늘의 단어 퍼즐 6글자 단계에서 정답 말고도 입력으로 받아 주는 실제 단어들 (소문자 a~z 6글자).
// 정답 목록(kataHariIniWords6.ts)에 있는 말은 여기 다시 적지 않습니다 — 두 목록을 합쳐서 검사합니다.
//
// 만든 날: 2026-11-25. 5글자 kataHariIniGuesses.ts 와 같은 방식으로 출처를 합쳤습니다.
// 1) 공용 기본 단어장 표제어(성경과 신앙 포함, 여러 낱말 표제어는 낱말로 나눔, 정답에서 뺀 구어·줄임말 등도 여기)
// 2) 기본 단어장 예문에 소문자로 한 번 이상 나온 낱말
// 단어장 CSV 와 연결되어 있지 않으므로 CSV 가 바뀌어도 그대로입니다.
// 아는 실제 단어가 거절된다는 말이 나오면 여기에 알파벳순으로 끼워 넣으면 됩니다(순서는 판정에 영향 없음).

export const KATA6_EXTRA_GUESSES: ReadonlyArray<string> = [
  "adalah", "adanya", "adikku", "adikmu", "adonan", "ajaran", "akibat", "alasan", "amplop", "anggap",
  "anggun", "anggur", "angkat", "angkot", "anjing", "antara", "apakah", "asuhan", "bagian", "bagiku",
  "bahkan", "balita", "banget", "bareng", "bawaan", "bawang", "begini", "begitu", "beliau", "bentuk",
  "berapa", "berapi", "berdoa", "berhak", "berisi", "berjam", "berkat", "betapa", "bicara", "bidang",
  "bilang", "bimbel", "binasa", "bohong", "buahan", "buatan", "bukuku", "bungsu", "busnya", "cabang",
  "cahaya", "campak", "campur", "cerita", "cicipi", "cobaan", "cooker", "curhat", "daftar", "dagang",
  "dampak", "daring", "dateng", "dengan", "desain", "dewasa", "diajak", "diaken", "dibaca", "dibagi",
  "dibawa", "dibeli", "diberi", "dibuat", "dibuka", "dicuci", "dijaga", "dijual", "dimuat", "diraut",
  "diriku", "dirimu", "disewa", "diubah", "diurus", "dorong", "duluan", "elegan", "enamel", "enggak",
  "engkau", "firman", "folder", "fungsi", "galeri", "gambar", "garing", "gasnya", "gawang", "gereja",
  "gimana", "global", "gloria", "godaan", "goreng", "gotong", "gratia", "gurumu", "hadiah", "harimu",
  "hatiku", "hendak", "hikmat", "hingga", "hormat", "hosana", "ibadah", "ibunya", "ikhlas", "imanen",
  "instan", "istana", "itulah", "jangan", "jemaat", "jernih", "jingga", "justru", "jutaan", "kabari",
  "kadang", "kakiku", "kalian", "kangen", "kanker", "karang", "kardus", "karena", "karpet", "kartun",
  "kasihi", "kenapa", "kepada", "keping", "kertas", "ketawa", "ketemu", "ketika", "khusus", "kiamat",
  "kidung", "komisi", "krayon", "kritik", "kukumu", "kuliah", "kumpul", "kurban", "lancar", "landas",
  "lanjut", "laptop", "layang", "lentik", "lintas", "lorong", "lubang", "luring", "magrib", "maksud",
  "mampir", "mantap", "martir", "masing", "materi", "maupun", "mazmur", "melaju", "melaut", "menara",
  "meniup", "menuai", "meraih", "merata", "mereka", "meriah", "mezbah", "migran", "mimbar", "moyang",
  "nabiah", "nambah", "negeri", "nektar", "neraka", "ngaret", "ngebut", "nonton", "nunggu", "nurani",
  "nyaman", "nyampe", "nyesel", "nyokap", "nyusul", "online", "opname", "paduan", "pahami", "paling",
  "pandai", "panjat", "patung", "pelaut", "pelita", "peluit", "pemilu", "pemuda", "pemula", "penari",
  "pencak", "pengap", "pengen", "percik", "permen", "pernah", "pinang", "pinjam", "pintas", "ponsel",
  "proses", "pujian", "puncak", "rahmat", "rantau", "rempah", "retret", "rohani", "royong", "saling",
  "sambil", "sampai", "sangat", "santun", "satpam", "sayang", "seakan", "sebaik", "sebuah", "secara",
  "sedang", "segala", "sehari", "seiman", "sejati", "sejauh", "sekali", "sektor", "selain", "selama",
  "selera", "semata", "semoga", "sempat", "sentuh", "seolah", "serupa", "setiap", "seumur", "siaran",
  "silang", "simbol", "simpan", "solusi", "sosial", "sulung", "sumpah", "suntuk", "supaya", "swasta",
  "syalom", "syukur", "tabrak", "tabung", "takhta", "takraw", "tambah", "tampak", "tampil", "tarian",
  "tasnya", "tayang", "teknik", "teknis", "tembok", "tenaga", "tengah", "terasa", "terbit", "terigu",
  "terima", "terjun", "tertib", "tetapi", "tilang", "timnya", "tombol", "tropis", "tuanya", "tunggu",
  "uangmu", "ucapan", "undang", "unggun", "urapan", "urusan", "urutan", "utusan", "wanita",
];
