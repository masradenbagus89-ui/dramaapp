// -------------------------------------------------------------------------
// NAMA NEGARA: nilai data (Inggris) -> label yang dibaca penonton (Indonesia).
//
// Kolom `country` milik `Drama` datang dari OMDb dan SELALU berbahasa Inggris
// ("United States", "China"). Yang boleh diterjemahkan hanya LABEL-nya; nilai
// yang masuk ke alamat URL (`?negara=China`) WAJIB tetap asli, sebab itulah
// yang dicocokkan `cocokNegara` di lib/discover.ts. Kalau keduanya tertukar,
// chip "Cina" akan tergambar rapi lalu memulangkan halaman hampa — rusak SENYAP,
// tanpa satu pun pesan error.
//
// Daftarnya sengaja tidak lengkap sedunia: cukup negara yang sudah ada di
// katalog + negara produsen drama/film yang wajar muncul berikutnya. Nama di
// luar daftar dipakai APA ADANYA (bukan dibuang), jadi katalog yang tumbuh tidak
// pernah kehilangan chip hanya karena namanya belum sempat didaftarkan di sini.
// -------------------------------------------------------------------------

const NAMA_INDONESIA: Record<string, string> = {
  // Sudah ada di katalog per 2026-09-21.
  // "Amerika Serikat", bukan "Amerika": sejak daftar negara dikelompokkan per
  // BENUA (2026-11-25) ada kelompok bernama "Amerika", dan dua baris bernama
  // sama di satu menu — satu judul kelompok, satu negara — membuat penonton
  // (dan tes) salah menunjuk. Nama resminya memang Amerika Serikat.
  "United States": "Amerika Serikat",
  "United Kingdom": "Inggris",
  Canada: "Kanada",
  Germany: "Jerman",
  China: "Cina",
  Australia: "Australia",
  "New Zealand": "Selandia Baru",
  Iran: "Iran",
  // Belum ada isinya, tapi paling mungkin menyusul untuk katalog drama Asia.
  Japan: "Jepang",
  "South Korea": "Korea",
  "North Korea": "Korea Utara",
  Thailand: "Thailand",
  India: "India",
  Taiwan: "Taiwan",
  "Hong Kong": "Hong Kong",
  Singapore: "Singapura",
  Malaysia: "Malaysia",
  Philippines: "Filipina",
  Vietnam: "Vietnam",
  Indonesia: "Indonesia",
  France: "Prancis",
  Spain: "Spanyol",
  Italy: "Italia",
  Netherlands: "Belanda",
  Turkey: "Turki",
  Russia: "Rusia",
  Mexico: "Meksiko",
  Brazil: "Brasil",
  Egypt: "Mesir",
  "Saudi Arabia": "Arab Saudi",
  // Ditambahkan 2026-11-14. Menu Negara naik dari 12 jadi 24 nama (owner:
  // "negara bisa kamu tambahkan lagi negaranya"), dan 8 di antaranya langsung
  // tergambar dalam bahasa Inggris karena belum terdaftar di sini —
  // "Czech Republic" berdiri di antara "Cina" dan "Korea". Fallback-nya
  // memang sengaja memulangkan nama asli (lebih baik terbaca daripada
  // hilang), tapi daftar separuh-Indonesia terbaca seperti terjemahan yang
  // belum selesai. Kedelapan nama ini diambil dari yang BENAR-BENAR ada di
  // katalog hari itu; sisanya menyusul kalau katalog tumbuh.
  Ireland: "Irlandia",
  Hungary: "Hungaria",
  "Czech Republic": "Ceko",
  "South Africa": "Afrika Selatan",
  Iceland: "Islandia",
  Finland: "Finlandia",
  Denmark: "Denmark",
  Malta: "Malta",
  // Produsen film yang paling mungkin menyusul di urutan berikutnya.
  Sweden: "Swedia",
  Norway: "Norwegia",
  Belgium: "Belgia",
  Poland: "Polandia",
  Austria: "Austria",
  Switzerland: "Swiss",
  Portugal: "Portugal",
  Greece: "Yunani",
  Argentina: "Argentina",
  Colombia: "Kolombia",
  Chile: "Cile",
  "United Arab Emirates": "Uni Emirat Arab",
  Israel: "Israel",
  Pakistan: "Pakistan",
  Bangladesh: "Bangladesh",
  Nigeria: "Nigeria",
  Kenya: "Kenya",
  Morocco: "Maroko",
  Ukraine: "Ukraina",
  Romania: "Rumania",
  Serbia: "Serbia",
  Croatia: "Kroasia",
  Bulgaria: "Bulgaria",
  Lithuania: "Lituania",
  Estonia: "Estonia",
  Latvia: "Latvia",
  Luxembourg: "Luksemburg",
  Cyprus: "Siprus",
  // Ditambahkan 2026-11-25 — keempatnya BENAR-BENAR ada di katalog hari itu
  // (terukur dari 57 negara di halaman /film), tapi belum terdaftar sehingga
  // tergambar dalam bahasa Inggris di tengah daftar berbahasa Indonesia.
  Cambodia: "Kamboja",
  "Dominican Republic": "Republik Dominika",
  Jordan: "Yordania",
  Paraguay: "Paraguay",
  Swaziland: "Eswatini",
  // Dipendekkan dengan sengaja. Nama resminya 43 huruf, sedangkan menu Negara
  // digambar 4 kolom dengan sel yang menolak membungkus baris
  // (KELAS_EMPAT_NAMA di app/components/beranda/NavMenus.tsx) — satu nama
  // sepanjang itu melebarkan SELURUH dropdown sampai keluar layar HP.
  // Wilayahnya sendiri memang lazim disebut "Georgia Selatan" saja.
  "South Georgia and the South Sandwich Islands": "Georgia Selatan",
};

/**
 * NAMA KEMBAR: ejaan lain -> ejaan RESMI yang dipakai sebagai acuan.
 *
 * ⚠️ KENAPA ADA (owner 2026-11-25): data katalog memuat "USA" DAN
 * "United States" sekaligus — dua ejaan untuk satu negara. Akibatnya menu
 * Negara menampilkan DUA baris ("USA" dan "Amerika"), masing-masing berisi
 * separuh filmnya, dan mengklik salah satunya menyembunyikan separuh lainnya.
 * Rusak SENYAP: tak ada error, cuma daftar yang terasa janggal dan hasil
 * pencarian yang diam-diam tidak lengkap.
 *
 * Isinya sengaja PENDEK dan hanya berisi ejaan yang terbukti ada di data
 * (diukur dari /film 2026-11-25), bukan daftar tebakan. Menambah entri di sini
 * aman: ia cuma menyatukan, tak pernah membuang negara.
 */
const NAMA_KEMBAR: Record<string, string> = {
  USA: "United States",
  US: "United States",
  UK: "United Kingdom",
  Korea: "South Korea",
};

/**
 * Ejaan resmi sebuah negara — dipakai SEBELUM menghitung, membandingkan, atau
 * menyusun daftar, supaya satu negara tidak pernah terhitung dua kali.
 *
 * Nama yang tak punya kembaran dipulangkan apa adanya (hanya dirapikan
 * spasinya), jadi katalog yang tumbuh tidak pernah kehilangan negara.
 */
export function namaKanonik(nama: string): string {
  const rapi = nama.trim();
  return NAMA_KEMBAR[rapi] ?? rapi;
}

/**
 * BENUA tiap negara — urutan tampilnya ditentukan `URUTAN_BENUA` di bawah.
 *
 * ⚠️ KENAPA ADA (owner 2026-11-25: *"untuk negara kamu buat lebih banyak lagi
 * atau kamu ada solusi lain agar semua negara bisa muncul"*): katalog memuat
 * 57 negara sedangkan menu hanya memuat 24 teratas. Menampilkan 57 nama
 * sekaligus sebagai daftar datar membuat negara yang dicari justru lebih sulit
 * ditemukan daripada sebelumnya. Owner memilih dikelompokkan per benua dari 3
 * pilihan yang diajukan.
 *
 * Negara yang belum terdaftar di sini TIDAK hilang — ia masuk kelompok
 * "Lainnya" di urutan terakhir (lihat `benuaDari`). Itu disengaja: daftar yang
 * menghapus apa yang belum dikenalnya akan menyembunyikan judul tanpa satu pun
 * peringatan.
 */
const BENUA: Record<string, string> = {
  // --- Asia (paling atas: inilah yang dicari penonton Indonesia) ---
  Indonesia: "Asia",
  "South Korea": "Asia",
  "North Korea": "Asia",
  Japan: "Asia",
  China: "Asia",
  "Hong Kong": "Asia",
  Taiwan: "Asia",
  Thailand: "Asia",
  India: "Asia",
  Philippines: "Asia",
  Malaysia: "Asia",
  Singapore: "Asia",
  Vietnam: "Asia",
  Cambodia: "Asia",
  Bangladesh: "Asia",
  Pakistan: "Asia",
  // --- Timur Tengah ---
  Turkey: "Timur Tengah",
  "Saudi Arabia": "Timur Tengah",
  "United Arab Emirates": "Timur Tengah",
  Israel: "Timur Tengah",
  Iran: "Timur Tengah",
  Jordan: "Timur Tengah",
  Cyprus: "Timur Tengah",
  // --- Eropa ---
  "United Kingdom": "Eropa",
  Ireland: "Eropa",
  France: "Eropa",
  Germany: "Eropa",
  Spain: "Eropa",
  Italy: "Eropa",
  Portugal: "Eropa",
  Netherlands: "Eropa",
  Belgium: "Eropa",
  Switzerland: "Eropa",
  Austria: "Eropa",
  Luxembourg: "Eropa",
  Sweden: "Eropa",
  Norway: "Eropa",
  Denmark: "Eropa",
  Finland: "Eropa",
  Iceland: "Eropa",
  Poland: "Eropa",
  "Czech Republic": "Eropa",
  Hungary: "Eropa",
  Romania: "Eropa",
  Bulgaria: "Eropa",
  Croatia: "Eropa",
  Serbia: "Eropa",
  Greece: "Eropa",
  Malta: "Eropa",
  Russia: "Eropa",
  Ukraine: "Eropa",
  Estonia: "Eropa",
  Latvia: "Eropa",
  Lithuania: "Eropa",
  // --- Amerika ---
  "United States": "Amerika",
  Canada: "Amerika",
  Mexico: "Amerika",
  Brazil: "Amerika",
  Argentina: "Amerika",
  Colombia: "Amerika",
  Chile: "Amerika",
  Paraguay: "Amerika",
  "Dominican Republic": "Amerika",
  // --- Afrika ---
  "South Africa": "Afrika",
  Nigeria: "Afrika",
  Kenya: "Afrika",
  Morocco: "Afrika",
  Egypt: "Afrika",
  Swaziland: "Afrika",
  // --- Oseania ---
  Australia: "Oseania",
  "New Zealand": "Oseania",
};

/** Kelompok untuk negara yang belum didaftarkan di `BENUA`. */
export const BENUA_LAINNYA = "Lainnya";

/**
 * Urutan kelompok di dalam menu. Asia di depan dengan sengaja — situs ini
 * katalog drama/film Asia untuk penonton Indonesia, jadi menaruh Eropa atau
 * Amerika lebih dulu (yang judulnya memang paling banyak) akan membuat yang
 * paling dicari justru paling jauh dari mata.
 */
export const URUTAN_BENUA = [
  "Asia",
  "Timur Tengah",
  "Eropa",
  "Amerika",
  "Afrika",
  "Oseania",
  BENUA_LAINNYA,
] as const;

/** Benua sebuah negara. Belum terdaftar = kelompok "Lainnya", bukan dibuang. */
export function benuaDari(nama: string): string {
  return BENUA[namaKanonik(nama)] ?? BENUA_LAINNYA;
}

/**
 * Label negara untuk ditampilkan. Nama yang belum terdaftar dipulangkan apa
 * adanya — lebih baik penonton membaca "Portugal" daripada chip-nya hilang.
 */
export function labelNegara(nama: string): string {
  const resmi = namaKanonik(nama);
  return NAMA_INDONESIA[resmi] ?? resmi;
}
