# Komponen & hook dipakai-ulang (§2.I) — rujukan `react-patterns`

> Bagian dari `skills/react-patterns` — dibuka on-demand dari SKILL.md inti; membaca berkas ini TERCATAT tanda-terima Palang Rak (path skills/**.md).
> Konteks: detail butir §2.I (compound components · custom hooks · anti boolean-prop · React 19) + 🧪 contoh kodenya — Kontrak 🔒 §1, Self-verify & DoD tetap di `skills/react-patterns/SKILL.md`.

### I. Komponen & hook yang bisa dipakai-ulang (serapan ECC)

19. 📐 **Compound components** (Tabs/Accordion/Menu) — bagi state lewat Context ke sub-komponen, bukan prop-drilling berlapis. Induk pegang state; anak (`Tabs.List`, `Tabs.Panel`) konsumsi Context.
20. 📐 **Custom hooks** untuk logika berulang: `useToggle` (boolean + fungsi balik), `useDebounce` (§F butir 12 → `skills/react-patterns/rujukan/tes-data-fetching.md`), `useQuery` (fetch + loading/error). Ekstrak logika, bukan tampilan.
    - 📐 **Modul dalam — HANYA saat perlu (YAGNI).** Logika rumit/berulang → tarik ke custom hook / util ber-interface kecil (pemanggil cukup tahu input→output). Uji-hapus = pagar ANTI over-engineering: kalau abstraksi itu dihapus tak ada yang rugi → jangan buat. Komponen sederhana jangan dibungkus lapisan. Kerja internal AI — **jangan dinarasikan ke client**.
21. 📐 **🔒 HASIL — Jebakan infinite-loop `useQuery`/`useEffect` (unstable dependency).** Kalau fetcher/opsi dioper sebagai fungsi-inline atau object-literal, tiap render bikin referensi BARU → efek yang bergantung padanya jalan lagi → set-state → render lagi → **loop fetch tak berujung** (bisa jatuhkan API/tagihan membengkak). Perbaiki: simpan fetcher/opsi terbaru di `useRef` (di-update via `useEffect` sebelum efek fetch), supaya `refetch` tetap **stabil-referensi** walau caller mengoper literal. Alternatif: bungkus dengan `useMemo`/`useCallback` di sisi caller, atau serahkan ke TanStack Query (query key sebagai array primitif stabil). 🙂 jangan bikin fetcher/opsi baru tiap render — pencarian ke server jadi terus dikirim ulang tanpa henti.
22. 📐 **Anti boolean-prop menjamur → varian eksplisit (komposisi).** Komponen yang perilakunya diatur tumpukan boolean (`isThread`, `isEditing`, `isForwarding`) = tiap boolean MENGGANDAKAN jumlah keadaan (3 boolean = 8 kombinasi, sebagian mustahil) + rantai kondisional tak terawat. Ganti: pecah jadi VARIAN eksplisit (`ThreadComposer`, `EditMessageComposer`) yang merakit bagian bersama (compound components butir 19) — nama komponen mendokumentasikan diri, keadaan mustahil hilang. 🙂 daripada satu mesin serba-bisa penuh saklar, bikin beberapa alat jadi yang jelas fungsinya — onderdilnya tetap sama.
23. 📐 **`children` > render-props untuk MENYUSUN struktur** (`renderHeader={() => ...}` kaku + pemakai wajib paham signature callback); render-props tetap SAH saat child butuh DATA balik dari parent (mis. `renderItem={({ item }) => ...}` di list virtual).
24. 📐 **React 19+ SAJA (cek versi `react` terpasang dulu):** `ref` kini prop biasa (tanpa `forwardRef`) + `use(Context)` menggantikan `useContext` (boleh dipanggil kondisional). React ≤18: tetap `forwardRef`/`useContext` — JANGAN campur dua gaya di satu codebase.

---

🧪 **`useQuery` stabil-referensi — cegah infinite-loop (butir 21 di atas):**
```tsx
function useQuery<T>(fetcher: () => Promise<T>, opts?: object) {
  const fetcherRef = useRef(fetcher); const optsRef = useRef(opts)
  useEffect(() => { fetcherRef.current = fetcher; optsRef.current = opts })  // simpan yang terbaru
  const refetch = useCallback(() => fetcherRef.current(), [])               // STABIL walau caller oper literal
  useEffect(() => { refetch().then(setData).catch(setError) }, [refetch])   // TIDAK loop: refetch tak berubah
}
```

🧪 **Compound component (Tabs + Context, butir 19 di atas):**
```tsx
const TabsContext = createContext<TabsContextValue | undefined>(undefined)
export function Tabs({ children, defaultTab }: { children: React.ReactNode; defaultTab: string }) {
  const [activeTab, setActiveTab] = useState(defaultTab)
  return <TabsContext.Provider value={{ activeTab, setActiveTab }}>{children}</TabsContext.Provider>
}
// Tabs.List / Tabs.Tab / Tabs.Panel konsumsi useContext(TabsContext) — tanpa prop-drilling
```

🧪 **Varian eksplisit — anti boolean-prop menjamur (butir 22 di atas):**

❌ **SALAH** (tiap boolean menggandakan keadaan; kombinasi mustahil ikut lahir):
```tsx
<Composer isThread isEditing={false} isDMThread={false} isForwarding showAttachments />
// pembaca harus menyimulasikan 5 saklar di kepala utk tahu apa yang dirender
```
✅ **BENAR** (varian eksplisit merakit bagian bersama — nama = dokumentasi):
```tsx
<ThreadComposer channelId="abc" />    // di dalam: <Composer.Frame><Composer.Input/>… rakitan khusus thread
<EditMessageComposer messageId="x" /> // varian lain merakit bagian SAMA (butir 19) dgn aksi beda
```
