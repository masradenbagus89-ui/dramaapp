// Hardlink agent — runs on PC backup, exposed via Caddy reverse-proxy
//
// Usage:
//   $env:HARDLINK_AGENT_SECRET = "your-secret-here"
//   $env:VIDEO_ROOT = "C:\Users\USER\Downloads\video"   # optional, has default
//   node hardlink-agent.js
//
// Endpoints:
//   GET  /health           -> { ok, videoRoot }
//   POST /hardlink         -> { ok, action, count, ... }
//        body: { dramaId }
//        header: x-agent-secret

const http = require("http");
const fs = require("fs");
const path = require("path");

const VIDEO_ROOT =
  process.env.VIDEO_ROOT || "C:\\Users\\USER\\Downloads\\video";
const PORT = parseInt(process.env.PORT || "8089", 10);
const SECRET = process.env.HARDLINK_AGENT_SECRET;

if (!SECRET) {
  console.error(
    "[hardlink-agent] FATAL: HARDLINK_AGENT_SECRET env var belum di-set.",
  );
  console.error('Set dulu di PowerShell:');
  console.error('  $env:HARDLINK_AGENT_SECRET = "<token-rahasia>"');
  console.error("Lalu jalankan lagi: node hardlink-agent.js");
  process.exit(1);
}

function jsonResponse(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(data));
}

function isValidDramaId(id) {
  return typeof id === "string" && /^[a-z0-9-]+$/.test(id) && id.length <= 100;
}

function processHardlink(dramaId) {
  const cleanFolder = path.join(VIDEO_ROOT, dramaId);
  const rawFolder = path.join(VIDEO_ROOT, "_raw_" + dramaId);

  // Already prepared?
  if (fs.existsSync(path.join(cleanFolder, "1.mp4"))) {
    const files = fs
      .readdirSync(cleanFolder)
      .filter((f) => /^\d+\.mp4$/.test(f));
    return {
      ok: true,
      action: "already-prepared",
      count: files.length,
      message: "Folder sudah berisi pattern N.mp4, tidak ada yang perlu diubah.",
    };
  }

  // Decide source folder
  let source;
  if (fs.existsSync(rawFolder)) {
    source = rawFolder;
  } else if (fs.existsSync(cleanFolder)) {
    // Files exist in cleanFolder but not numbered — rename to raw
    fs.renameSync(cleanFolder, rawFolder);
    source = rawFolder;
  } else {
    return {
      ok: false,
      error: `Folder tidak ditemukan: "${cleanFolder}" atau "${rawFolder}". Drop file mp4 dulu di salah satunya.`,
    };
  }

  // Ensure clean folder exists
  if (!fs.existsSync(cleanFolder))
    fs.mkdirSync(cleanFolder, { recursive: true });

  // Build episode mapping
  const allFiles = fs
    .readdirSync(source)
    .filter((f) => f.toLowerCase().endsWith(".mp4"));
  const mapping = {};
  for (const file of allFiles) {
    const m = file.match(/(\d+)/);
    if (!m) continue;
    const ep = parseInt(m[1], 10);
    if (!Number.isFinite(ep)) continue;
    if (!mapping[ep]) mapping[ep] = [];
    mapping[ep].push(file);
  }

  let created = 0;
  const duplicates = [];
  const failures = [];
  for (const epStr of Object.keys(mapping)) {
    const ep = parseInt(epStr, 10);
    const entries = mapping[ep];
    if (entries.length > 1) {
      duplicates.push({ ep, files: entries });
      continue;
    }
    const dst = path.join(cleanFolder, `${ep}.mp4`);
    if (fs.existsSync(dst)) continue;
    try {
      fs.linkSync(path.join(source, entries[0]), dst);
      created++;
    } catch (e) {
      failures.push({ ep, file: entries[0], error: e.message });
    }
  }

  return {
    ok: true,
    action: "created",
    count: created,
    duplicates,
    failures,
    sourceFolder: source,
    cleanFolder,
    message: `Created ${created} hardlinks. ${duplicates.length} duplicates skipped. ${failures.length} failures.`,
  };
}

const server = http.createServer((req, res) => {
  // CORS (so admin form could also call directly if needed in future)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, x-agent-secret",
  );

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "GET" && req.url === "/health") {
    return jsonResponse(res, 200, {
      ok: true,
      videoRoot: VIDEO_ROOT,
      port: PORT,
    });
  }

  if (req.method === "POST" && req.url === "/hardlink") {
    const providedSecret = req.headers["x-agent-secret"];
    if (providedSecret !== SECRET) {
      return jsonResponse(res, 401, { error: "Unauthorized" });
    }

    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const parsed = JSON.parse(body || "{}");
        const dramaId = parsed.dramaId;
        if (!isValidDramaId(dramaId)) {
          return jsonResponse(res, 400, {
            error:
              "Invalid dramaId. Harus huruf kecil, angka, dash. Maks 100 char.",
          });
        }
        const result = processHardlink(dramaId);
        jsonResponse(res, result.ok ? 200 : 400, result);
      } catch (e) {
        jsonResponse(res, 500, { error: e.message });
      }
    });
    return;
  }

  jsonResponse(res, 404, { error: "Not found" });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(
    `[hardlink-agent] Listening on http://127.0.0.1:${PORT}`,
  );
  console.log(`[hardlink-agent] Video root: ${VIDEO_ROOT}`);
  console.log(
    `[hardlink-agent] Secret set: YES (length: ${SECRET.length})`,
  );
  console.log(
    `[hardlink-agent] Test health: curl http://127.0.0.1:${PORT}/health`,
  );
});
