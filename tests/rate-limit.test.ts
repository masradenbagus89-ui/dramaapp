// Tes untuk pembatas laju jendela-tetap MURNI (lib/rate-limit checkRate).
// Waktu `now` disuntik manual supaya deterministik (tak bergantung jam nyata).
import { describe, it, expect } from "vitest";
import { checkRate } from "../lib/rate-limit";

type Hit = { count: number; resetAt: number };
const fresh = () => new Map<string, Hit>();

describe("checkRate — pembatas laju jendela-tetap", () => {
  it("permintaan pertama diizinkan, sisa = limit - 1", () => {
    const d = checkRate(fresh(), "k", 1000, 3, 60_000);
    expect(d.allowed).toBe(true);
    expect(d.remaining).toBe(2);
  });

  it("memblokir saat batas tercapai", () => {
    const store = fresh();
    checkRate(store, "k", 1000, 3, 60_000); // ke-1
    checkRate(store, "k", 1000, 3, 60_000); // ke-2
    checkRate(store, "k", 1000, 3, 60_000); // ke-3 (mentok)
    const d = checkRate(store, "k", 1000, 3, 60_000); // ke-4 → tolak
    expect(d.allowed).toBe(false);
    expect(d.remaining).toBe(0);
    expect(d.retryAfterSec).toBe(60); // (61000 - 1000) / 1000
  });

  it("jendela reset setelah waktu lewat → diizinkan lagi", () => {
    const store = fresh();
    checkRate(store, "k", 1000, 1, 60_000); // mentok (limit 1)
    expect(checkRate(store, "k", 2000, 1, 60_000).allowed).toBe(false);
    expect(checkRate(store, "k", 61_001, 1, 60_000).allowed).toBe(true);
  });

  it("kunci berbeda dihitung terpisah", () => {
    const store = fresh();
    checkRate(store, "a", 1000, 1, 60_000); // a mentok
    expect(checkRate(store, "b", 1000, 1, 60_000).allowed).toBe(true);
  });

  it("retryAfterSec dibulatkan ke atas", () => {
    const store = fresh();
    checkRate(store, "k", 0, 1, 1500); // resetAt = 1500
    const d = checkRate(store, "k", 1000, 1, 1500); // sisa 500ms → ceil(0.5) = 1
    expect(d.allowed).toBe(false);
    expect(d.retryAfterSec).toBe(1);
  });
});
