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
  window.dispatchEvent(new Event("dramaku:auth-changed"));
}

/**
 * Cek role dari server-side admin list (data/admins.json via /api/admins).
 * Default: viewer kalau email tidak terdaftar atau API error.
 */
export async function fetchUserRole(email: string): Promise<Role> {
  try {
    const res = await fetch("/api/admins");
    if (!res.ok) return "viewer";
    const data = (await res.json()) as { admins?: { email: string }[] };
    const list = (data.admins ?? []).map((a) => a.email.trim().toLowerCase());
    return list.includes(email.trim().toLowerCase()) ? "admin" : "viewer";
  } catch {
    return "viewer";
  }
}
