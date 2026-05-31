import { NextRequest, NextResponse } from "next/server";
import type { Drama } from "@/lib/types";
import { isAdminEmail } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FALLBACK_GRADIENTS = [
  "from-rose-500 via-pink-700 to-purple-900",
  "from-amber-600 via-orange-800 to-red-950",
  "from-emerald-600 via-teal-800 to-slate-900",
  "from-indigo-700 via-purple-800 to-slate-900",
  "from-fuchsia-700 via-rose-800 to-stone-900",
  "from-stone-600 via-zinc-800 to-black",
  "from-violet-600 via-indigo-800 to-blue-950",
  "from-red-600 via-rose-800 to-purple-950",
  "from-yellow-500 via-amber-700 to-orange-900",
  "from-pink-600 via-rose-700 to-red-900",
];

function pickRandomGradient(): string {
  return FALLBACK_GRADIENTS[Math.floor(Math.random() * FALLBACK_GRADIENTS.length)];
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function githubEnv() {
  const owner = process.env.GITHUB_REPO_OWNER;
  const repo = process.env.GITHUB_REPO_NAME;
  const branch = process.env.GITHUB_BRANCH ?? "main";
  const token = process.env.GITHUB_TOKEN;
  if (!owner || !repo || !token) {
    throw new Error(
      "GITHUB_TOKEN, GITHUB_REPO_OWNER, dan GITHUB_REPO_NAME wajib di-set di Vercel env vars.",
    );
  }
  return { owner, repo, branch, token };
}

async function readDramasFromGithub(): Promise<{ dramas: Drama[]; sha: string }> {
  const { owner, repo, branch, token } = githubEnv();
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/data/dramas.json?ref=${encodeURIComponent(branch)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      cache: "no-store",
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub read gagal: ${res.status} ${text}`);
  }
  const data = (await res.json()) as { sha: string; content: string; encoding: string };
  if (data.encoding !== "base64") {
    throw new Error(`Encoding tak dikenal dari GitHub: ${data.encoding}`);
  }
  const json = Buffer.from(data.content, "base64").toString("utf-8");
  const dramas = JSON.parse(json) as Drama[];
  return { dramas, sha: data.sha };
}

async function writeDramasToGithub(
  dramas: Drama[],
  sha: string,
  commitMessage: string,
): Promise<void> {
  const { owner, repo, branch, token } = githubEnv();
  const json = JSON.stringify(dramas, null, 2) + "\n";
  const contentB64 = Buffer.from(json, "utf-8").toString("base64");
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/data/dramas.json`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: commitMessage,
        content: contentB64,
        sha,
        branch,
      }),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub write gagal: ${res.status} ${text}`);
  }
}

export async function POST(req: NextRequest) {
  try {
    const requesterEmail = req.headers.get("x-admin-email");
    if (!(await isAdminEmail(requesterEmail))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as Partial<{
      id: string;
      title: string;
      category: string;
      synopsis: string;
      views: string;
      episodes: number;
      posterImage: string;
      heroImage: string;
      gradient: string;
      exclusive: boolean;
    }>;

    if (!body.title?.trim()) {
      return NextResponse.json({ error: "Judul wajib diisi." }, { status: 400 });
    }
    if (!body.category?.trim()) {
      return NextResponse.json({ error: "Kategori wajib diisi." }, { status: 400 });
    }
    const epNum = Number(body.episodes);
    if (!Number.isFinite(epNum) || epNum < 1) {
      return NextResponse.json({ error: "Jumlah episode minimal 1." }, { status: 400 });
    }

    const { dramas, sha } = await readDramasFromGithub();
    const id = body.id?.trim() || slugify(body.title);
    if (!id) {
      return NextResponse.json({ error: "ID drama tidak valid." }, { status: 400 });
    }

    const existingIdx = dramas.findIndex((d) => d.id === id);
    const isNew = existingIdx === -1;

    let drama: Drama;
    if (isNew) {
      drama = {
        id,
        title: body.title.trim(),
        category: body.category as Drama["category"],
        episodes: Math.floor(epNum),
        views: body.views?.trim() || "1.0K",
        synopsis: body.synopsis?.trim() || "",
        gradient: body.gradient?.trim() || pickRandomGradient(),
        ...(body.posterImage?.trim() ? { posterImage: body.posterImage.trim() } : {}),
        ...(body.heroImage?.trim() ? { heroImage: body.heroImage.trim() } : {}),
        ...(body.exclusive ? { exclusive: true } : {}),
      };
      dramas.unshift(drama);
    } else {
      const existing = dramas[existingIdx];
      drama = {
        ...existing,
        title: body.title.trim(),
        category: body.category as Drama["category"],
        episodes: Math.floor(epNum),
        ...(body.views?.trim() ? { views: body.views.trim() } : {}),
        ...(body.synopsis?.trim() ? { synopsis: body.synopsis.trim() } : {}),
        ...(body.gradient?.trim() ? { gradient: body.gradient.trim() } : {}),
        ...(body.posterImage?.trim() ? { posterImage: body.posterImage.trim() } : {}),
        ...(body.heroImage?.trim() ? { heroImage: body.heroImage.trim() } : {}),
        ...(typeof body.exclusive === "boolean" ? { exclusive: body.exclusive } : {}),
      };
      dramas[existingIdx] = drama;
    }

    const action = isNew ? "added" : "updated";
    const commitMessage = `admin: ${action} drama "${drama.title}" (${drama.episodes} eps)`;
    await writeDramasToGithub(dramas, sha, commitMessage);

    return NextResponse.json({ ok: true, id: drama.id, action, drama });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal simpan drama";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const requesterEmail = req.headers.get("x-admin-email");
    if (!(await isAdminEmail(requesterEmail))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = (await req.json()) as { id?: string };
    if (!id?.trim()) {
      return NextResponse.json({ error: "ID wajib diisi." }, { status: 400 });
    }

    const { dramas, sha } = await readDramasFromGithub();
    const idx = dramas.findIndex((d) => d.id === id);
    if (idx === -1) {
      return NextResponse.json({ error: "Drama tidak ditemukan." }, { status: 404 });
    }
    const title = dramas[idx].title;
    dramas.splice(idx, 1);

    const commitMessage = `admin: remove drama "${title}"`;
    await writeDramasToGithub(dramas, sha, commitMessage);

    return NextResponse.json({ ok: true, removed: { id, title } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal hapus drama";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
