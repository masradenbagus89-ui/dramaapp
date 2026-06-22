import { defineConfig } from "vitest/config";

// Pengaturan alat tes (Vitest) untuk dramaapp.
// - Tes diletakkan di folder `tests/` (terpisah dari kode produksi).
// - Lingkungan default = "node" (untuk fungsi murni). Berkas tes yang butuh
//   `window`/`localStorage` (mis. preferensi subtitle) menandai dirinya sendiri
//   dengan komentar `// @vitest-environment jsdom` di baris paling atas.
// - Tes mengimpor kode lewat jalur biasa (`../lib/...`), jadi tidak perlu alias.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.{test,spec}.ts"],
  },
});
