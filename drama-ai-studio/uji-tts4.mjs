import { createHash, randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import WebSocket from "ws";
const TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
const CHROMIUM = "143.0.3650.75";
const MAYOR = CHROMIUM.split(".")[0];
let SELISIH_JAM = 0; // detik; jam mesin ini terbukti tertinggal
async function samakanJam() {
  const r = await fetch("https://speech.platform.bing.com/", { method: "HEAD" });
  const d = r.headers.get("date");
  if (d) SELISIH_JAM = (new Date(d).getTime() - Date.now()) / 1000;
  console.log("selisih jam mesin vs server:", SELISIH_JAM.toFixed(1), "detik");
}
function gec() {
  let t = Date.now() / 1000 + SELISIH_JAM + 11644473600;
  t -= t % 300;
  t *= 1e7;
  return createHash("sha256").update(t.toFixed(0) + TOKEN, "ascii").digest("hex").toUpperCase();
}
await samakanJam();
const ws = new WebSocket(
  `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${TOKEN}&Sec-MS-GEC=${gec()}&Sec-MS-GEC-Version=1-${CHROMIUM}`,
  { headers: {
    Pragma: "no-cache", "Cache-Control": "no-cache",
    Origin: "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold",
    "User-Agent": `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${MAYOR}.0.0.0 Safari/537.36 Edg/${MAYOR}.0.0.0`,
    "Accept-Encoding": "gzip, deflate, br, zstd",
    "Accept-Language": "en-US,en;q=0.9",
  } }
);
const potongan = [];
ws.on("open", () => {
  ws.send(`X-Timestamp:${new Date().toString()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}`);
  const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='zh-CN'><voice name='zh-CN-XiaoxiaoNeural'><prosody rate='-8%'>三年前，我被所有人丢掉了。</prosody></voice></speak>`;
  ws.send(`X-RequestId:${randomUUID().replace(/-/g,"")}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${new Date().toString()}Z\r\nPath:ssml\r\n\r\n${ssml}`);
});
ws.on("message", (d, bin) => {
  if (!bin) { if (d.toString().includes("Path:turn.end")) ws.close(); return; }
  const b = Buffer.from(d), n = b.readUInt16BE(0);
  if (b.subarray(2, 2+n).toString("ascii").includes("Path:audio")) potongan.push(b.subarray(2+n));
});
ws.on("error", (e) => { console.log("GALAT:", e.message); process.exit(1); });
ws.on("close", () => {
  const a = Buffer.concat(potongan);
  if (a.length < 1000) { console.log("GAGAL, byte:", a.length); process.exit(1); }
  writeFileSync(process.argv[2], a);
  console.log("BERHASIL:", a.length, "byte MP3");
});
setTimeout(() => { console.log("TIMEOUT"); process.exit(1); }, 30000);
