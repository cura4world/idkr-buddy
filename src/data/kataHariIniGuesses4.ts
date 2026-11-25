// src/data/kataHariIniGuesses4.ts
// 오늘의 단어 퍼즐 4글자 단계에서 정답 말고도 입력으로 받아 주는 실제 단어들 (소문자 a~z 4글자).
// 정답 목록(kataHariIniWords4.ts)에 있는 말은 여기 다시 적지 않습니다 — 두 목록을 합쳐서 검사합니다.
//
// 만든 날: 2026-11-25. 5글자 kataHariIniGuesses.ts 와 같은 방식으로 출처를 합쳤습니다.
// 1) 공용 기본 단어장 표제어(성경과 신앙 포함, 여러 낱말 표제어는 낱말로 나눔, 정답에서 뺀 구어·줄임말 등도 여기)
// 2) 기본 단어장 예문에 소문자로 한 번 이상 나온 낱말
// 3) 손으로 고른 흔한 표준 4글자 단어(고유명사·요일·욕설·성인 단어 제외)
// 단어장 CSV 와 연결되어 있지 않으므로 CSV 가 바뀌어도 그대로입니다.
// 아는 실제 단어가 거절된다는 말이 나오면 여기에 알파벳순으로 끼워 넣으면 됩니다(순서는 판정에 영향 없음).

export const KATA4_EXTRA_GUESSES: ReadonlyArray<string> = [
  "abad", "abai", "abdi", "abis", "abon", "acak", "acar", "acuh", "adab", "adil",
  "aduh", "aduk", "agak", "agar", "agen", "ahli", "ajak", "ajal", "ajar", "akad",
  "akal", "akan", "aksi", "akta", "akur", "alas", "alat", "alga", "alih", "alim",
  "alir", "alot", "alpa", "alun", "alur", "amal", "amat", "amin", "amis", "amuk",
  "anda", "anti", "anut", "apak", "apel", "apik", "apit", "arak", "aral", "arca",
  "arif", "arti", "arus", "asah", "asas", "aset", "asli", "asri", "asuh", "atas",
  "atau", "atom", "atur", "aula", "awak", "awam", "awet", "ayak", "ayat", "ayun",
  "azan", "babi", "baca", "bagi", "bait", "baja", "baki", "baku", "band", "bapa",
  "bara", "bata", "baut", "bawa", "bayu", "beda", "beku", "bela", "beli", "bemo",
  "beri", "besi", "bete", "biak", "biar", "bias", "bila", "bina", "biro", "bisa",
  "bisu", "blok", "bodi", "boga", "boks", "bolu", "bros", "bual", "buat", "bubu",
  "budi", "buih", "buka", "bumi", "buru", "busa", "buta", "calo", "cara", "cari",
  "cela", "ceri", "chef", "ciri", "cita", "cium", "ciut", "coba", "cuci", "cuil",
  "cuka", "cuma", "cumi", "curi", "dadu", "dahi", "daki", "dana", "dara", "dari",
  "daya", "debu", "demi", "demo", "depa", "dera", "deru", "dewa", "dewi", "diet",
  "dini", "diri", "dong", "dosa", "drum", "duel", "duga", "duit", "duka", "duku",
  "dupa", "duri", "duta", "ecer", "edar", "edit", "efek", "ejek", "elak", "elit",
  "elok", "elus", "emas", "enau", "epik", "eram", "erat", "eror", "esai", "esok",
  "etis", "etos", "fana", "fase", "feri", "fide", "file", "foto", "gada", "gado",
  "gaib", "gali", "gaul", "gaya", "gede", "gema", "giat", "gila", "gini", "gips",
  "giro", "gitu", "gizi", "goda", "golf", "gong", "grup", "guci", "guna", "gusi",
  "halo", "haru", "hawa", "hela", "hias", "hina", "hulu", "huma", "huni", "idam",
  "idap", "ijuk", "ikal", "ikat", "ikon", "ikut", "imam", "iman", "imun", "inap",
  "inci", "info", "inti", "iris", "irit", "isak", "isap", "itik", "jadi", "jaga",
  "jago", "jahe", "jala", "jasa", "jati", "jaya", "jazz", "jeda", "jemu", "jera",
  "jika", "jitu", "jiwa", "joki", "jual", "judo", "juga", "juri", "juru", "kaca",
  "kado", "kail", "kaji", "kala", "kami", "kamp", "kamu", "kata", "kaum", "kayu",
  "keju", "kena", "kepo", "khas", "kian", "kias", "kiat", "kini", "kira", "kiri",
  "kisi", "kita", "kiwi", "klik", "kode", "koko", "koma", "koor", "kram", "krim",
  "kuah", "kuas", "kubu", "kuil", "kuli", "kupu", "kura", "kurs", "kutu", "laba",
  "labu", "laci", "laga", "lagi", "lagu", "laik", "lain", "laju", "laki", "laku",
  "lalu", "lari", "lega", "lele", "lesu", "liat", "lidi", "lift", "liga", "liku",
  "lobi", "logo", "loyo", "luap", "luar", "lugu", "madu", "main", "maka", "mama",
  "mana", "mari", "masa", "mati", "maut", "mega", "menu", "mini", "misi", "mode",
  "mosi", "muak", "muat", "muka", "mula", "mumi", "mutu", "nabi", "nada", "nadi",
  "naga", "naif", "nama", "nila", "nira", "noda", "nona", "ntar", "obor", "ojol",
  "olah", "oleh", "oles", "olok", "onar", "opor", "opsi", "oven", "pacu", "pada",
  "padu", "pagu", "paku", "pala", "papa", "para", "pare", "pari", "paru", "pede",
  "peka", "pena", "peri", "pers", "peti", "picu", "pilu", "pion", "pipa", "pita",
  "piza", "pola", "poni", "pori", "pose", "pria", "puas", "puja", "pula", "raba",
  "ragi", "ragu", "raja", "rame", "ramu", "ratu", "raut", "raya", "rayu", "reda",
  "regu", "reka", "rela", "riak", "rice", "roda", "rona", "ruas", "rupa", "rute",
  "sagu", "saja", "saji", "sama", "sana", "sang", "sapa", "sari", "sauh", "saus",
  "sawi", "sawo", "saya", "sayu", "sedu", "segi", "sela", "semi", "sepi", "seru",
  "sesi", "sewa", "siap", "sidi", "sila", "sini", "sisa", "sisi", "sita", "situ",
  "siul", "soal", "sola", "soli", "sori", "stok", "suam", "suar", "suci", "sudi",
  "syal", "taat", "tabu", "taji", "tali", "tama", "tamu", "tani", "tapa", "tapi",
  "tata", "tega", "teka", "teki", "teks", "tema", "tepi", "teri", "tiap", "tipe",
  "tipu", "tiri", "tiru", "tiup", "toga", "tong", "tren", "tuah", "tuai", "tuan",
  "tuas", "tugu", "tuli", "ubah", "uban", "ubin", "ucap", "udah", "udik", "uduk",
  "ufuk", "ujar", "ukir", "ukur", "ulah", "ulam", "ulas", "ulat", "ulet", "ulur",
  "umat", "umbi", "umum", "undi", "unit", "unta", "urai", "urus", "urut", "usah",
  "usai", "usap", "usik", "usir", "usul", "utan", "utus", "veto", "visi", "wali",
  "wifi", "wira", "yang", "zona",
];
