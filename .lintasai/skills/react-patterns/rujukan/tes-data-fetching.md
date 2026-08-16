# Tes komponen, race fetch & debounce (§2.E-F) — rujukan `react-patterns`

> Bagian dari `skills/react-patterns` — dibuka on-demand dari SKILL.md inti; membaca berkas ini TERCATAT tanda-terima Palang Rak (path skills/**.md).
> Konteks: detail butir §2.E-F (tes RTL · race fetch · debounce) + 🧪 contoh kodenya — Kontrak 🔒 §1, Self-verify & DoD tetap di `skills/react-patterns/SKILL.md`.

### E. Tes komponen React (RTL — React Testing Library)

> 📐 **WAJIB cek versi terpasang dulu:** MSW v1→v2 breaking (`rest`→`http`, `res(ctx.json)`→`HttpResponse.json`); `userEvent` v13→v14 (wajib `setup()`); `jest-axe` (Jest) vs `vitest-axe` (Vitest).

10. 📐 **Prioritas query: `getByRole` > `getByLabelText` > `getByPlaceholderText` > `getByText` > `getByTestId`** — uji yang user LIHAT/pakai, bukan DOM internal. `userEvent.setup()` + SELALU `await`. Async pakai `findBy*`/`waitFor`, JANGAN `setTimeout` (flaky #1). Mock jaringan pakai MSW `onUnhandledRequest: 'error'` (request tak ter-mock → MERAH keras, lihat 🔒 §1 SKILL.md inti). Gotcha `renderHook` + React Query: buat `QueryClient` **SEKALI di luar** wrapper.

### F. Race fetch, debounce & data-fetching

11. 📐 Utamakan **SWR/TanStack Query** untuk data (dedup + cache + revalidate). Kalau TERPAKSA gulung sendiri `useEffect`+`fetch`: **WAJIB `AbortController` + `return () => controller.abort()`** — batalkan request lama saat `deps` ganti/unmount (tanpa cleanup: respons lama menimpa baru → balapan 🔒 §1 SKILL.md inti). Set-state pakai **functional updater** `setX(prev => ...)` (anti nilai-basi di async). `<ErrorBoundary>` HANYA menangkap error render/lifecycle — BUKAN event handler/`fetch().then` (untuk itu `try/catch` + set-state). 🔒 **Boundary WAJIB punya jalan keluar:** tombol yang me-reset state-nya + reset otomatis saat route/kunci data berubah (`resetKeys`). Boundary tanpa reset = user **terkunci di layar error sampai refresh manual** — dan di SPA, pindah halaman pun tak menyembuhkannya. Contoh `reset` bawaan Next (`error.tsx`) ada di `templates/STACK_GUIDE.md` §2.5 — RUJUK, jangan salin. Isi fallback-nya: kalimat awam + tombol, **jangan** `error.message` mentah (bocor detail internal, `skills/backend/SKILL.md` §3).
12. 📐 **Debounce search-as-you-type.** JANGAN tembak query tiap ketikan — turunkan `debouncedQuery` lewat `useDebounce(value, 300-500ms)` lalu fetch HANYA saat debounce berubah. GOTCHA: SWR/TanStack Query TIDAK men-debounce (tiap huruf = cache-key beda = tetap 1 hit DB) → debounce DULU baru serahkan ke Query. Pasangkan `AbortController` + guard panjang minimal. 🙂 tunggu ~⅓ detik user berhenti mengetik baru cari.

---

🧪 **`AbortController` di `useEffect` (§F butir 11 di atas):**
```tsx
useEffect(() => {
  const c = new AbortController()
  fetch(url, { signal: c.signal })
    .then(handleResponse)
    .catch(e => { if (e.name !== 'AbortError') setError(e) })  // AbortError = batal normal; error NYATA → set-state
  return () => c.abort()
}, [url])
```

🧪 **`useDebounce` (§F butir 12 di atas):**
```tsx
function useDebounce<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const h = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(h)              // RESET timer tiap ketikan baru
  }, [value, delay])
  return debounced
}
```
