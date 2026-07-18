<!-- LINTAS:SEKSI §ears-kriteria -->

## Kriteria Sukses gaya EARS (Indonesia) — opsional (rujukan on-demand)

> Adopsi notasi EARS (Easy Approach to Requirements Syntax, asal Rolls-Royce; dipakai AWS Kiro). OPSIONAL (Tingkat-2, ditawarkan bukan dipaksa). Dipakai saat menulis **kriteria sukses** di konfirmasi-lingkup §3 / DoD §4 / rencana §4.19. Kekuatannya: memaksa munculnya edge case (§4 "4 state + edge case") TAPI tetap kalimat terstruktur yang bisa DIBACA staff non-programmer — bukan jargon.

### Template (di-Indonesia-kan)
- **KETIKA** [kondisi/pemicu] **MAKA SISTEM HARUS** [perilaku]. — kejadian normal
- **JIKA** [kondisi khusus/error] **MAKA** [perilaku]. — kasus khusus/gagal
- **SELAMA** [kondisi berjalan] **SISTEM HARUS** [perilaku]. — kondisi terus-menerus
- **DI MANA** [fitur bersyarat aktif] **SISTEM HARUS** [perilaku]. — fitur opsional

### Contoh
- KETIKA admin submit form undang dengan email valid MAKA SISTEM HARUS membuat record undangan + kirim email.
- JIKA email sudah terdaftar MAKA SISTEM HARUS menolak + tampilkan pesan per-field (bukan error global).
- SELAMA upload berlangsung SISTEM HARUS menampilkan progres + tombol batal.
- DI MANA 2FA diaktifkan SISTEM HARUS meminta kode sebelum akses dashboard.

### Kenapa berguna
Menulis "KETIKA X MAKA HARUS Y" memaksa memikirkan: apa pemicunya? apa yang gagal (JIKA)? apa yang berlangsung (SELAMA)? — persis disiplin edge case §4. Tetap opsional: kriteria sukses biasa (prosa awam) tetap sah bila lebih pas.
