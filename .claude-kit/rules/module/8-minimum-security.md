<!-- LINTAS:SEKSI §8-minimum-security -->

## 8. Keamanan minimum
- **Jangan percaya input client/header/URL.** Validasi & sanitasi di server sebelum dipakai.
- **Otorisasi per-resource** pakai identitas server-side (token/sesi terverifikasi), BUKAN ID dari body request. Cegah IDOR.
- **Secret hanya di env/secret manager.** Jangan di repo, log, atau `console.log` debug.
- **Pakai library kripto/auth standar** (bcrypt/argon2, JWT teruji, `crypto.randomBytes`). Jangan bikin sendiri.
- **Escape output sesuai konteks** (HTML, SQL, shell, log, URL). Parameterized query, hindari string concat.
- **Rate limit + batas payload** untuk endpoint sensitif/mahal (login, signup, search, upload, API berbayar).
- **Audit log aksi sensitif** (login, ubah role, delete, akses admin): who/what/when/from-where.
- **Threat model 3-baris** per fitur baru di `docs/<fitur>.md`: aset dilindungi / attacker model / mitigasi utama. Fitur berisiko (auth/bayar/data-pribadi/upload/publik) → naik kelas pakai checklist STRIDE (`templates/THREAT_MODEL_NON_LEGAL.md` peta kedua).
- **Respon insiden:** sinyal kebocoran rahasia / akses tak sah (staf chat "ke-commit `.env`", "email GitHub token bocor", `secret-guard` menyala) → AI buka `docs/SECURITY_INCIDENT_PLAYBOOK.md` + pandu langkah. JANGAN rotate/force-push/hapus-jejak sendiri tanpa memandu.
- **Dependency:** pin versi di production, audit CVE rutin, jangan auto-update tanpa tes.

---

