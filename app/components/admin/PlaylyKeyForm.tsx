"use client";

// Form pasang/ganti kunci API Playly.
//
// Yang PERLU diingat saat membaca berkas ini: komponen ini TIDAK pernah
// memegang kunci yang tersimpan. Kunci yang diketik admin dikirim sekali ke
// server lalu dilupakan; yang ditampilkan balik hanya bentuk tersamarnya
// ("plyk_••••••••json"). Jadi membuka DevTools di halaman ini pun tidak
// memperlihatkan kunci yang sudah tersimpan.
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  Loader2,
  PlugZap,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PlaylyKeyStatus } from "@/lib/playly";

type Pesan = { type: "ok" | "error"; text: string };

const PERINTAH_BUAT_KUNCI =
  'node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"';

export default function PlaylyKeyForm({
  initialStatus,
  apiUrl,
  adminEmail,
}: {
  initialStatus: PlaylyKeyStatus;
  apiUrl: string;
  adminEmail: string;
}) {
  const [status, setStatus] = useState<PlaylyKeyStatus>(initialStatus);
  const [key, setKey] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [menguji, setMenguji] = useState(false);
  const [mencabut, setMencabut] = useState(false);
  const [pesan, setPesan] = useState<Pesan | null>(null);
  // Tanggal diformat setelah komponen tampil, bukan saat dirender di server —
  // supaya hasil di server dan di browser tidak berbeda (zona waktunya beda).
  const [waktuUbah, setWaktuUbah] = useState("");

  useEffect(() => {
    setWaktuUbah(
      status.updatedAt ? new Date(status.updatedAt).toLocaleString("id-ID") : "",
    );
  }, [status.updatedAt]);

  const simpan = async (e: React.FormEvent) => {
    e.preventDefault();
    setPesan(null);

    if (!key.trim()) {
      setPesan({ type: "error", text: "Tempel dulu kunci API dari Playly." });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/playly/key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: key.trim() }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        status?: PlaylyKeyStatus;
        error?: string;
      };

      if (!res.ok || !data.ok || !data.status) {
        setPesan({
          type: "error",
          text: data.error ?? `Gagal menyimpan (HTTP ${res.status}).`,
        });
        return;
      }

      setStatus(data.status);
      setKey(""); // kosongkan kotak isian: jangan tinggalkan kunci di layar
      setPesan({
        type: "ok",
        text: "Kunci tersimpan dalam keadaan terenkripsi. Lanjut klik Uji sambungan untuk memastikan Playly menerimanya.",
      });
    } catch {
      setPesan({ type: "error", text: "Koneksi ke server DramaKu gagal. Coba lagi." });
    } finally {
      setSubmitting(false);
    }
  };

  const cabut = async () => {
    const setuju = confirm(
      "Cabut kunci Playly dari database?\n\nAkibatnya: daftar video Playly tidak bisa dimuat lagi sampai kunci baru dipasang. Video yang terlanjur terpasang di halaman publik TETAP tampil.",
    );
    if (!setuju) return;

    setPesan(null);
    setMencabut(true);
    try {
      const res = await fetch("/api/admin/playly/key", { method: "DELETE" });
      const data = (await res.json()) as {
        ok?: boolean;
        status?: PlaylyKeyStatus;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.status) {
        setPesan({
          type: "error",
          text: data.error ?? `Gagal mencabut (HTTP ${res.status}).`,
        });
        return;
      }
      setStatus(data.status);
      setPesan({ type: "ok", text: "Kunci sudah dicabut dari database." });
    } catch {
      setPesan({ type: "error", text: "Koneksi ke server DramaKu gagal. Coba lagi." });
    } finally {
      setMencabut(false);
    }
  };

  // Uji sambungan sungguhan: memanggil Playly lewat server kita, memakai kunci
  // yang tersimpan. Ini yang membedakan "kunci sudah ditulis" dari "kunci
  // benar-benar diterima Playly".
  const uji = async () => {
    setPesan(null);
    setMenguji(true);
    try {
      const res = await fetch("/api/admin/playly/videos", { cache: "no-store" });
      const data = (await res.json()) as {
        ok?: boolean;
        count?: number;
        skipped?: number;
        error?: string;
      };

      if (!res.ok || !data.ok) {
        setPesan({
          type: "error",
          text: data.error ?? `Playly menolak permintaan (HTTP ${res.status}).`,
        });
        return;
      }

      const jumlah = data.count ?? 0;
      const dilewati = data.skipped ?? 0;
      const catatanDilewati =
        dilewati > 0
          ? ` (${dilewati} dilewati karena alamatnya tidak lolos pemeriksaan)`
          : "";
      setPesan({
        type: "ok",
        text:
          jumlah > 0
            ? `Sambungan berhasil — ${jumlah} video terbaca dari Playly${catatanDilewati}.`
            : "Sambungan berhasil, tapi Playly belum punya video yang bisa ditampilkan.",
      });
    } catch {
      setPesan({ type: "error", text: "Koneksi ke server DramaKu gagal. Coba lagi." });
    } finally {
      setMenguji(false);
    }
  };

  const sibuk = submitting || menguji || mencabut;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
      {/* --- Peringatan: kunci pengacak belum dipasang -------------------- */}
      {!status.encryptionReady && (
        <div className="mb-5 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
          <div className="flex items-start gap-2 text-sm text-amber-100">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <div>
              <p>
                <strong>PLAYLY_ENCRYPTION_KEY belum dipasang.</strong> Ini kunci
                pengacak yang dipakai untuk mengenkripsi kunci Playly sebelum masuk
                database. Tanpa ini, penyimpanan akan ditolak. Buat satu dengan
                perintah di bawah, lalu isikan di berkas{" "}
                <code className="text-amber-200">.env.local</code> (lokal) atau
                Environment Variables di Vercel:
              </p>
              <code className="mt-2 block overflow-x-auto rounded bg-black/40 p-2 text-[11px] text-amber-200">
                {PERINTAH_BUAT_KUNCI}
              </code>
            </div>
          </div>
        </div>
      )}

      {/* --- Status kunci saat ini ---------------------------------------- */}
      <div className="rounded-xl border border-zinc-800 bg-black/20 p-4">
        <h2 className="text-sm font-bold text-white">Status kunci</h2>

        {status.configured ? (
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-[140px_1fr]">
            <dt className="text-zinc-500">Kunci terpasang</dt>
            <dd className="flex items-center gap-2 font-mono text-zinc-100">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              {status.masked}
            </dd>

            <dt className="text-zinc-500">Disimpan di</dt>
            <dd className="text-zinc-300">
              {status.source === "database"
                ? "Database (terenkripsi)"
                : "Environment Variable PLAYLY_API_KEY di server"}
            </dd>

            {status.source === "database" && (
              <>
                <dt className="text-zinc-500">Terakhir diubah</dt>
                <dd className="text-zinc-300">
                  {waktuUbah || "—"}
                  {status.updatedBy ? ` oleh ${status.updatedBy}` : ""}
                </dd>
              </>
            )}
          </dl>
        ) : (
          <p className="mt-3 text-sm text-zinc-400">
            Belum ada kunci. Tempel kunci dari Playly di kotak di bawah untuk mulai
            menampilkan video mereka.
          </p>
        )}

        <p className="mt-3 text-xs text-zinc-500">
          Alamat Playly yang dipakai: <span className="font-mono">{apiUrl}</span>
        </p>
      </div>

      {/* --- Form pasang/ganti kunci -------------------------------------- */}
      <form onSubmit={simpan} className="mt-5">
        <Label htmlFor="playly-key" className="text-zinc-300">
          {status.configured ? "Ganti dengan kunci baru" : "Kunci API Playly"}
        </Label>
        <Input
          id="playly-key"
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="plyk_..."
          autoComplete="off"
          spellCheck={false}
          aria-describedby="playly-key-bantuan"
          className="mt-2 min-h-11 rounded-lg border-zinc-700 bg-zinc-900 font-mono text-white focus-visible:border-amber-400 focus-visible:ring-0"
        />
        <p id="playly-key-bantuan" className="mt-2 text-xs text-zinc-500">
          Kunci Playly selalu diawali <span className="font-mono">plyk_</span>. Tempel
          apa adanya, tanpa tanda kutip atau spasi. Setelah tersimpan, kunci tidak
          bisa dilihat lagi dari halaman ini — hanya bisa diganti.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="submit"
            disabled={sibuk}
            className="min-h-11 rounded-full px-5 text-sm font-semibold"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <KeyRound className="h-4 w-4" aria-hidden="true" />
            )}
            {status.configured ? "Simpan kunci baru" : "Simpan kunci"}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => void uji()}
            disabled={sibuk || !status.configured}
            className="min-h-11 rounded-full px-5 text-sm font-semibold"
          >
            {menguji ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <PlugZap className="h-4 w-4" aria-hidden="true" />
            )}
            Uji sambungan
          </Button>

          {status.configured && status.source === "database" && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => void cabut()}
              disabled={sibuk}
              className="min-h-11 rounded-full px-5 text-sm font-semibold text-rose-300 hover:bg-rose-500/10 hover:text-rose-200"
            >
              {mencabut ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              )}
              Cabut kunci
            </Button>
          )}
        </div>
      </form>

      {/* --- Pesan hasil (dibacakan pembaca layar saat berubah) ----------- */}
      <div aria-live="polite" className="mt-4 empty:mt-0">
        {pesan && (
          <p
            className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${
              pesan.type === "ok"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-100"
                : "border-rose-500/40 bg-rose-500/10 text-rose-100"
            }`}
          >
            {pesan.type === "ok" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            ) : (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            )}
            <span>{pesan.text}</span>
          </p>
        )}
      </div>

      <p className="mt-4 text-xs text-zinc-600">Masuk sebagai {adminEmail}</p>
    </div>
  );
}
