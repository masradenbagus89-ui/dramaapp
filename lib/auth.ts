const KEY = "dramaku:user";

export type Role = "admin" | "viewer";

export type User = {
  name: string;
  email: string;
  role: Role;
  avatarColor?: string;
};

export const AVATAR_COLORS = [
  { id: "amber-rose", label: "Emas-Rose", className: "from-amber-400 to-rose-500" },
  { id: "violet-fuchsia", label: "Ungu", className: "from-violet-500 to-fuchsia-600" },
  { id: "emerald-teal", label: "Hijau", className: "from-emerald-500 to-teal-600" },
  { id: "blue-cyan", label: "Biru", className: "from-blue-500 to-cyan-500" },
  { id: "orange-red", label: "Oranye", className: "from-orange-500 to-red-600" },
  { id: "pink-purple", label: "Pink", className: "from-pink-500 to-purple-600" },
] as const;

export const DEFAULT_AVATAR_COLOR = "from-amber-400 to-rose-500";

export function getAvatarClass(user: User | null): string {
  return user?.avatarColor || DEFAULT_AVATAR_COLOR;
}

export function readUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const u = JSON.parse(raw);
    if (typeof u?.name === "string" && typeof u?.email === "string") {
      const role: Role = u.role === "admin" ? "admin" : "viewer";
      const avatarColor =
        typeof u.avatarColor === "string" ? u.avatarColor : undefined;
      return { name: u.name, email: u.email, role, avatarColor };
    }
    return null;
  } catch {
    return null;
  }
}

export function writeUser(user: User): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(user));
  window.dispatchEvent(new Event("dramaku:auth-changed"));
}

export function clearUser(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
  // Hapus juga cookie sesi admin di server (fire-and-forget).
  void fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
  window.dispatchEvent(new Event("dramaku:auth-changed"));
}

/**
 * Cek role yang DIAKUI SERVER untuk email ini, lewat /api/admins.
 * Default: viewer kalau tidak terdaftar, tidak berhak bertanya, atau API error.
 *
 * `?email=` dikirim supaya server bisa menolak kalau yang ditanyakan BUKAN
 * pemilik sesi — bukan supaya server mempercayainya sebagai identitas.
 * Sejak 2026-10-24 endpoint itu tak lagi menyerahkan daftar email admin kepada
 * pemanggil biasa (app/api/admins/route.ts), jadi di sini jawabannya dibaca
 * dalam dua bentuk:
 *   - `{ isAdmin }`  → jawaban untuk pemilik sesi penonton (bentuk baru)
 *   - `{ admins }`   → jawaban untuk sesi ADMIN, yang memang menerima daftar
 *                      penuh; dipertahankan supaya pemanggil bersesi admin
 *                      tetap mendapat jawaban benar tanpa permintaan kedua.
 */
export async function fetchUserRole(email: string): Promise<Role> {
  try {
    const res = await fetch(`/api/admins?email=${encodeURIComponent(email)}`);
    // Gagal-AMAN: 401/403/429 dari server = jangan menaikkan hak siapa pun.
    if (!res.ok) return "viewer";
    const data = (await res.json()) as {
      isAdmin?: boolean;
      admins?: { email: string }[];
    };
    if (typeof data.isAdmin === "boolean") {
      return data.isAdmin ? "admin" : "viewer";
    }
    const list = (data.admins ?? []).map((a) => a.email.trim().toLowerCase());
    return list.includes(email.trim().toLowerCase()) ? "admin" : "viewer";
  } catch {
    return "viewer";
  }
}

/** True kalau email sudah di daftar admin, tapi sesi browser masih penonton. */
export function needsAdminRelogin(
  user: User | null,
  emailIsAdmin: boolean,
): boolean {
  return Boolean(user && user.role !== "admin" && emailIsAdmin);
}

/** Pertahankan nama kustom dari sesi lama kalau emailnya sama. */
export function nameAfterLogin(
  apiName: string,
  email: string,
  existing: User | null,
): string {
  if (
    existing &&
    existing.email.trim().toLowerCase() === email.trim().toLowerCase() &&
    existing.name.trim()
  ) {
    return existing.name;
  }
  return apiName;
}
