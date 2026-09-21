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
  "United States": "Amerika",
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
};

/**
 * Label negara untuk ditampilkan. Nama yang belum terdaftar dipulangkan apa
 * adanya — lebih baik penonton membaca "Portugal" daripada chip-nya hilang.
 */
export function labelNegara(nama: string): string {
  return NAMA_INDONESIA[nama] ?? nama;
}
