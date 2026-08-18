import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Pengaturan alat tes (Vitest) untuk dramaapp.
// - Tes diletakkan di folder `tests/` (terpisah dari kode produksi).
// - Lingkungan default = "node" (untuk fungsi murni). Berkas tes yang butuh
//   `window`/`localStorage` (mis. preferensi subtitle) menandai dirinya sendiri
//   dengan komentar `// @vitest-environment jsdom` di baris paling atas.
// - Tes boleh mengimpor lewat jalur biasa (`../lib/...`), TAPI alias "@/" tetap
//   dipetakan: sebagian modul produksi memakainya di dalam dirinya sendiri
//   (mis. lib/session.ts -> "@/lib/store"), jadi tanpa pemetaan ini tes yang
//   menyentuh modul tersebut gagal memuat. Sumber kebenarannya tsconfig.json
//   ("@/*" -> "./*") — samakan kalau di sana berubah.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.{test,spec}.ts"],
  },
});
