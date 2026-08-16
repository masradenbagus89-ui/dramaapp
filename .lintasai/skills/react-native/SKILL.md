---
nama: react-native
deskripsi: Aplikasi mobile React Native/Expo kelas-industri — anti-crash render (&& falsy, teks di luar Text), list virtual mulus, animasi GPU Reanimated, navigasi & UI native, gambar expo-image, state minimal, safe-area tanpa loncat.
divisi: stack
pemicu: [react-native, expo, expo-router, reanimated, flashlist, flatlist, legendlist, bottom-sheet, aplikasi-mobile, aplikasi-hp, aplikasi-android, aplikasi-iphone, app-android, app-ios, mobile-app, bikin-app-hp, app-hp, scroll-patah-patah, aplikasi-lemot-hp]
rawan_keamanan: false
menggantikan: []
---

# Skill: React Native / Expo (aplikasi mobile) — kelas industri

> Pola & performa untuk aplikasi HP (Android/iOS) berbasis React Native + Expo. Pola React umum
> (state immutability, key stabil, compound components, anti boolean-props) TETAP berlaku —
> rujuk `skills/react-patterns/SKILL.md`; skill ini fokus pada yang KHUSUS mobile.
>
> **Inti:** di web, kesalahan render cuma bikin tampilan aneh; di React Native beberapa kesalahan
> yang sama membuat aplikasi **CRASH keras di produksi** (menutup sendiri). Plus: HP punya CPU/RAM
> terbatas — list & animasi yang asal jadi terasa patah-patah (jank) di HP kelas menengah Indonesia.

📐 **Cek versi terpasang DULU** (`expo --version`, `package.json`): API RN/Expo bergerak cepat —
`boxShadow`/`experimental_backgroundImage` butuh RN baru (Arsitektur Baru), `getBoundingClientRect` RN 0.82+,
native tabs expo-router masih berlabel `unstable`. Salah versi = kode "kelihatan benar" tapi tak jalan.
Ragu API ada? **Buktikan dulu:** `grep -rl "namaAPI" node_modules/react-native/Libraries` (atau `node_modules/<paket>/src`)
+ baca `version` di `package.json` paketnya — **0 hasil = jangan pakai**, sebut alternatif versi terpasang.

---

## 1. Kontrak (yang HARUS benar — hasil yang tak boleh gagal)

- 🔒 **HASIL — Render tak boleh bikin crash produksi.** Dua pembunuh khas RN: **(a)** `{value && <X/>}` saat `value` bisa `0`/`""` — falsy tapi "renderable", RN mencoba merender teks di luar `<Text>` → **crash keras** (di web cuma muncul "0"); **(b)** string/angka jadi anak langsung `<View>` → error "Text strings must be rendered within a <Text> component".
- 🔒 **HASIL — Scroll & list tak boleh patah-patah.** List apa pun pakai virtualizer (hanya render yang terlihat); item list ringan (tanpa query/komputasi berat); posisi scroll JANGAN di `useState` (event scroll menembak tiap frame → re-render beruntun → jank).
- 🔒 **HASIL — Animasi hanya `transform` + `opacity`** (jalan di GPU/UI-thread). Animasi `width`/`height`/`top`/`margin` memicu hitung-ulang layout TIAP frame → patah-patah, boros baterai.

---

## 2. Cara rakit (📐 CARA BAKU / 💡 SARAN)

### A. Render inti (CRITICAL — sumber crash #1)

1. 📐 Kondisional render: **ternary** (`count > 0 ? <Badge/> : null`) atau boolean eksplisit (`!!name && ...`) — JANGAN `{count && ...}`/`{name && ...}` polos. Pasang lint `react/jsx-no-leaked-render` biar robot yang menangkap. Paling jernih: early-return.
2. 📐 SEMUA teks di dalam `<Text>` — termasuk hasil interpolasi (`{jumlah}` di dalam `<View>` = crash).

### B. List performa (HIGH — layar feed/riwayat/pencarian)

3. 📐 **Virtualizer untuk list APA PUN** (walau pendek): `FlashList` (`@shopify/flash-list`) atau `LegendList` — BUKAN `ScrollView` + `.map()` (merender semua item sekaligus; 50 item = 50 komponen hidup).
4. 📐 **Item list = fungsi render bodoh**: tanpa query/fetch, tanpa banyak hook/Context, terima **props primitif** (`name={item.name}`, bukan objek baru `user={{...}}`) supaya `memo()` bekerja; callback di-hoist ke akar list (`useCallback`), bukan arrow baru per item. Style inline per-render → hoist ke module scope.
5. 📐 **Referensi data stabil**: JANGAN `.map()`/`.filter()` data tepat sebelum masuk list (referensi baru tiap render = seluruh baris terlihat di-render ulang, parah saat search-as-you-type). Transformasi per-item dikerjakan DI DALAM item (selector store — Zustand `useStore(s => ...)`), bukan di parent.
6. 📐 List campur jenis (header + pesan + gambar) → field `type` per item + `getItemType` (pool recycling terpisah — header tak pernah di-recycle jadi sel gambar) + estimasi ukuran per type.
7. 📐 Gambar di list: minta ukuran pas dari server/CDN (`?w=200&h=200`, 2× ukuran tampil untuk retina) — JANGAN muat foto 4000px untuk thumbnail 100px (RAM jebol + scroll jank).

### C. Animasi, gesture & scroll (Reanimated)

8. 📐 Animasikan `transform` (scale/translate/rotate) + `opacity` SAJA (🔒 §1). Panel buka-tutup: `scaleY`/`translateY` + `transformOrigin`, bukan animasi `height`.
9. 📐 Posisi scroll → `useSharedValue` + `useAnimatedScrollHandler` (untuk animasi, jalan di UI-thread tanpa re-render) atau `useRef` (untuk pelacakan pasif) — **JANGAN `useState`** (🔒 §1).
10. 📐 **State = ground-truth, visual = turunan**: simpan KEADAAN (`pressed` 0/1, `progress`), turunkan visual via `interpolate` — jangan simpan `scale`/`opacity` langsung (satu state bisa menyetir banyak properti + gampang di-debug). Turunan antar shared-value pakai `useDerivedValue` (bukan `useAnimatedReaction` — itu untuk efek samping: haptics/`runOnJS`).
11. 💡 Press-state beranimasi (tombol mengecil saat ditekan): `GestureDetector` + `Gesture.Tap()` (worklet UI-thread, tanpa bolak-balik JS-thread) > `Pressable` `onPressIn/Out`. Pakai `.get()`/`.set()` (bukan `.value`) — wajib bila React Compiler aktif.

### D. Navigasi & UI native (rasa "aplikasi beneran", bukan web dibungkus)

12. 📐 **Navigator NATIVE**: stack → `@react-navigation/native-stack` / stack bawaan expo-router (JANGAN `@react-navigation/stack` JS); tabs → native tabs (`react-native-bottom-tabs` / expo-router NativeTabs). Header pakai opsi native (`headerLargeTitleEnabled`, `headerSearchBarOptions`) — bukan komponen header custom. Transisi/gesture jalan di UI-thread + a11y platform gratis.
13. 📐 **Safe-area di layar ber-scroll**: `contentInsetAdjustmentBehavior="automatic"` di ScrollView akar — BUKAN bungkus `SafeAreaView`/padding manual (konten bisa scroll ke belakang status-bar secara natural, tak loncat saat keyboard/toolbar muncul). Spacing atas/bawah yang BERUBAH-ubah (keyboard) → `contentInset` + `scrollIndicatorInsets`, bukan `padding` (tanpa hitung-ulang layout).
14. 📐 Modal/sheet → `<Modal presentationStyle="formSheet">` native atau React Navigation `presentation: 'formSheet'` (swipe-dismiss + keyboard + a11y bawaan) — hindari bottom-sheet JS. Menu dropdown/context → menu native (💡 `zeego`) — bukan `View` absolute-position buatan sendiri.
15. 📐 `Pressable` (bukan `TouchableOpacity`/`TouchableHighlight` — legacy); di dalam list ber-gesture pakai `Pressable` dari `react-native-gesture-handler` (sepaket dengan ScrollView-nya).
16. 📐 Gambar → **`expo-image`** (cache memori+disk, placeholder blurhash, `contentFit`, `transition`, `recyclingKey` untuk list) — bukan `Image` bawaan RN. 💡 Lightbox/galeri → `@nandorojo/galeria`.

### E. State (berlaku umum, sering salah di RN)

17. 📐 **State seminimal mungkin, sisanya diturunkan saat render** (total/keranjang/fullName = hitung, bukan `useState`+`useEffect` — render dobel + bisa basi). Next-state tergantung state lama → functional updater `set(prev => ...)`; state objek → bandingkan dulu di updater (`prev` sama → return `prev`, skip render).
18. 📐 **Fallback pakai `??`, bukan initialState**: `const [_v, setV] = useState<T|undefined>(undefined); const v = _v ?? dariServer` — `undefined` = "user belum memilih", nilai server berubah → tampilan ikut; sekali user menyentuh, pilihannya menang. (initialState menyalin sekali lalu basi.)

### F. Styling & poles (konsisten + murah)

19. 📐 `gap` di parent untuk jarak antar-anak (bukan `margin` per-anak); `padding` untuk ruang-dalam. `borderRadius` selalu + `borderCurve: 'continuous'` (sudut mulus ala iOS). Hierarki teks: BATASI ragam `fontSize` — bedakan lewat `fontWeight` + warna abu.
20. 💡 RN baru (cek versi): shadow pakai string CSS `boxShadow: '0 2px 8px rgba(0,0,0,0.1)'` (bukan objek `shadowColor...`/`elevation`); gradient pakai `experimental_backgroundImage: 'linear-gradient(...)'` (tanpa lib pihak-ketiga).

### G. Gotcha proyek Expo/monorepo (bikin build gagal senyap)

21. 📐 **Monorepo: dependency ber-kode-native WAJIB terdaftar di `package.json` APP-nya** (autolinking cuma memindai `node_modules` app — dep native yang cuma ada di `packages/ui` TIDAK ter-link → error runtime). Versi dep SATU untuk seluruh monorepo (exact, tanpa `^`) — enforce via `syncpack`/overrides.
22. 📐 Font → config plugin `expo-font` (tertanam saat build, tersedia sejak launch) — bukan `useFonts` async (layar kosong menunggu font). Sesudah ubah plugin: `npx expo prebuild` + rebuild.
23. 💡 `Intl.NumberFormat`/`DateTimeFormat` MAHAL dibuat — hoist ke module scope (locale statis) / `useMemo` (locale dinamis); jangan di dalam render/loop. Ukur dimensi view: `useLayoutEffect` (awal, sinkron) + `onLayout` (perubahan) — bukan `measure()` async.
24. 💡 React Compiler aktif → destructure fungsi dari hook di awal render (`const { push } = useRouter()`, jangan `router.push` — cache compiler ter-key ke objek yang berubah tiap render), dan shared-value pakai `.get()`/`.set()`.

---

## 3. Powerful — Contoh pola ❌→✅ (ambil POLANYA, jangan salin mentah — cek versi RN/Expo terpasang)

🧪 **Anti-crash `&&` falsy (§2 butir 1)** — beda keras dari web:

❌ **SALAH** (crash produksi bila `count` = 0 atau `name` = ""):
```tsx
<View>
  {name && <Text>{name}</Text>}
  {count && <Text>{count} item</Text>} // count=0 → RN merender "0" di luar <Text> → CRASH
</View>
```
✅ **BENAR** (ternary / boolean eksplisit):
```tsx
<View>
  {name ? <Text>{name}</Text> : null}
  {count > 0 ? <Text>{count} item</Text> : null}
</View>
```

🧪 **Posisi scroll tanpa jank (§2 butir 9)**:

❌ **SALAH** (re-render tiap frame scroll):
```tsx
const [scrollY, setScrollY] = useState(0)
<ScrollView onScroll={(e) => setScrollY(e.nativeEvent.contentOffset.y)} scrollEventThrottle={16} />
```
✅ **BENAR** (shared value — UI-thread, nol re-render):
```tsx
const scrollY = useSharedValue(0)
const onScroll = useAnimatedScrollHandler({ onScroll: (e) => { scrollY.value = e.contentOffset.y } })
<Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} />
```

🧪 **List virtual + item ringan (§2 butir 3-5)**:

❌ **SALAH** (ScrollView render semua + item berat + referensi baru tiap ketikan):
```tsx
<ScrollView>
  {items.map((it) => <Row key={it.id} user={{ id: it.id, name: it.name }} // objek baru → memo mati
    onPress={() => buka(it.id)} />)}                                      // arrow baru per item
</ScrollView>
```
✅ **BENAR** (virtualizer + props primitif + callback hoist):
```tsx
const onPressRow = useCallback((id: string) => buka(id), [])
<FlashList data={items} keyExtractor={(it) => it.id}
  renderItem={({ item }) => <Row id={item.id} name={item.name} onPress={onPressRow} />} />
// Row = memo(...) menerima primitif → re-render hanya saat nilainya benar-benar berubah
```

---

## 4. Self-verify (sangkal diri sendiri SEBELUM bilang "selesai")

- [ ] Tak ada `{value && <X/>}` dengan `value` yang bisa `0`/`""`? Semua string di dalam `<Text>`? (uji: render dengan `count=0`, `name=""` — tak crash?)
- [ ] Semua list pakai virtualizer (FlashList/LegendList), item ringan ber-props primitif, callback di-hoist, data tak di-`.map()`/`.filter()` sebelum masuk list?
- [ ] Animasi hanya `transform`/`opacity`? Posisi scroll bukan `useState`? State = ground-truth (visual via `interpolate`)?
- [ ] Navigator native (native-stack/native tabs)? Safe-area via `contentInsetAdjustmentBehavior` (bukan SafeAreaView + padding manual)?
- [ ] Gambar `expo-image` + ukuran pas dari server (list tak memuat foto raksasa)?
- [ ] Monorepo: dep native ada di `package.json` app + versi seragam? Font via config plugin?
- [ ] Diuji di perangkat/emulator Android kelas-menengah (bukan cuma simulator iOS terbaru) — scroll list panjang tetap mulus?

---

## 5. Definition-of-Done

- [ ] **Kontrak (§1) terpenuhi**: nol pola crash render + list mulus + animasi GPU-only.
- [ ] **Edge case**: `count=0`/string kosong, list 500+ item, ketik cepat di search (list tak re-render semua), rotasi/resize, keyboard muncul (layout tak loncat), koneksi lambat (placeholder gambar tampil).
- [ ] **Self-verify (§4) tercentang** dengan bukti `berkas:baris`.
- [ ] Lint `react/jsx-no-leaked-render` terpasang; build dev Android + iOS jalan; minimal 1 uji manual scroll list panjang di perangkat nyata/emulator.

---

## 6. Handoff / rujuk-silang (reuse-first — JANGAN salin, RUJUK)

- 📐 Pola React umum (immutability, `key` stabil, compound components, anti boolean-props, debounce, race fetch) → `skills/react-patterns/SKILL.md` — berlaku penuh di RN.
- 📐 Panggil API backend + kontrak error → `skills/backend/SKILL.md`; retry/timeout panggilan jaringan HP (sinyal putus-nyambung) → `skills/tahan-gagal/SKILL.md`.
- 📐 Login/sesi di mobile (secure storage token, JANGAN AsyncStorage polos untuk token) → `skills/auth/SKILL.md`.
- 📐 Aksesibilitas (label, kontras, ukuran sentuh) → `skills/a11y/SKILL.md` — prinsipnya sama, API-nya `accessibilityLabel`/`accessibilityRole`.

---

## 7. Threat-model 3-baris + batas jujur

- 🗃️ **LATAR — Threat-model:** **Aset:** aplikasi tak crash di tangan user + rasa "aplikasi native" (scroll/animasi mulus di HP kelas menengah). **Mode-gagal khas:** crash `&&` falsy / teks di luar `<Text>` (lolos di dev, meledak di produksi) · jank list (ScrollView+map, item berat, referensi goyang) · animasi layout-props · dep native monorepo tak ter-link (build jalan, runtime mati) · font/gambar async bikin layar kosong. **Mitigasi:** ternary + lint jsx-no-leaked-render + virtualizer + props primitif + transform/opacity + native navigator + expo-image + config-plugin font + dep di app dir.
- 🗃️ **LATAR — Batas jujur:** skill ini menaikkan lantai kualitas RN/Expo; **tidak meliputi** penulisan modul native (Swift/Kotlin), push notification, in-app purchase, atau rilis ke App Store/Play Store (proses review toko beda dunia) — sebut eksplisit bila client butuh.
- 🗃️ **LATAR — kredit (MIT © Vercel, `vercel-labs/agent-skills` skill `react-native-skills` v1.0.0, serap 2026-08-09):** dikurasi dari 35+ rule (core-rendering, list-performance, animation, scroll, navigation, react-state, state-architecture, react-compiler, UI, design-system, monorepo, fonts, Intl) — ditulis-ulang dua-register + disesuaikan konteks client Indonesia (HP kelas menengah). **DITOLAK dari sumber sama:** rule `imports-design-system-folder` (lapisan re-export = over-engineering untuk app kecil, langgar Ponytail/YAGNI) · contoh spesifik `SolitoImage` (niche, cukup expo-image). `zeego`/`Galeria`/`LegendList` diserap sebagai 💡 SARAN (bukan wajib) — library pilihan vendor, bukan standar.

🙂 **Non-Programmer:** aplikasi HP beda dari website: kesalahan kecil yang di web cuma bikin tampilan aneh, di aplikasi HP bisa bikin **aplikasi menutup sendiri** di HP pembeli. Skill ini memasang pagar untuk itu, plus memastikan daftar panjang (feed/riwayat) tetap mulus digulir di HP biasa (bukan cuma HP mahal), animasi tidak bikin baterai boros, dan tombol/menu terasa seperti aplikasi asli — bukan website yang dibungkus.
