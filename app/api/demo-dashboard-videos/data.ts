// Data contoh untuk API tiruan dashboard. Dipisah supaya route daftar dan
// route detail memakai sumber yang sama.
//
// Alamat video/gambar di bawah sudah dicek hidup (HTTP 200) pada 2026-08-12.
// Item terakhir SENGAJA memakai http (bukan https) supaya terlihat bahwa
// penyaring di sisi WebMovie benar-benar menolaknya.
export const DEMO_VIDEOS = [
  {
    id: "vid-001",
    title: "Bunga Mekar (contoh)",
    description: "Video contoh berlisensi CC0 untuk menguji sambungan dashboard.",
    video_url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    thumbnail_url: "https://placehold.co/640x360/png",
    created_at: "2026-08-12T09:00:00Z",
  },
  {
    id: "vid-002",
    title: "Jumat Ceria (contoh)",
    description: "Video contoh kedua, untuk memastikan grid menampilkan lebih dari satu.",
    video_url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4",
    thumbnail_url: null,
    created_at: "2026-08-12T10:00:00Z",
  },
  {
    id: "vid-003-ditolak",
    title: "Video lewat http (harus ditolak)",
    description: "Alamatnya bukan https, jadi wajib disaring supaya tidak blank di browser.",
    video_url: "http://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    thumbnail_url: null,
    created_at: "2026-08-12T11:00:00Z",
  },
];
