#!/usr/bin/env node
// lintasAI CLI launcher - spawns PowerShell scripts
// Usage: npx lintasai <command> [args]

const { spawn } = require("child_process");
const path = require("path");
const os = require("os");

const KIT_ROOT = path.resolve(__dirname, "..");

const COMMANDS = {
  "init": "setup-pola-b.ps1",
  "team-setup": "team-setup.ps1",
  "update": "update-kit.ps1",
  "uninstall": "uninstall.ps1",
  "install-windows": "install-windows.ps1",
  // kit.ps1 subcommands
  "doctor": ["kit.ps1", "doctor"],
  "check-update": ["kit.ps1", "check-update"],
  "version": ["kit.ps1", "version"],
  "rollback": ["kit.ps1", "rollback"],
  "setup": ["kit.ps1", "setup"],
  "status": ["kit.ps1", "status"],
  "diff": ["kit.ps1", "diff"],
};

function showHelp() {
  console.log("");
  console.log("lintasAI CLI - AI workflow kit for Claude Code");
  console.log("");
  console.log("Usage:");
  console.log("  npx lintasai <command> [args]");
  console.log("");
  console.log("Commands:");
  console.log("  init           Setup kit di project (alias setup-pola-b)");
  console.log("  team-setup     Nyalakan kerja kelompok (CODEOWNERS+PR template+panduan kunci main)");
  console.log("  update         Update kit ke versi terbaru");
  console.log("  check-update   Cek apakah ada versi baru (read-only)");
  console.log("  doctor         Verify kit integrity");
  console.log("  status         Show kit status ringkas (1-layar)");
  console.log("  version        Show kit version");
  console.log("  rollback       Rollback ke versi sebelumnya");
  console.log("  uninstall      Remove kit dari project");
  console.log("");
  console.log("Examples:");
  console.log("  npx lintasai init");
  console.log("  npx lintasai update");
  console.log("  npx lintasai doctor");
  console.log("");
  console.log("More info: https://github.com/ojokesusu/lintasAI");
}

if (os.platform() !== "win32") {
  console.error("");
  console.error("[ERROR] lintasAI saat ini Windows-only (v1.x).");
  console.error("");
  console.error("Platform terdeteksi: " + os.platform() + " (" + os.arch() + ")");
  console.error("Reason: kit bergantung ke PowerShell 5.1+ + WPF (popup GUI) +");
  console.error("        Windows path conventions (C:\\, %USERPROFILE%).");
  console.error("");
  console.error("Workaround sekarang:");
  console.error("  1. Pakai Windows VM (VirtualBox/VMware/Hyper-V) + Windows 10+");
  console.error("  2. Pakai WSL2 hanya untuk Claude Code, tapi project di /mnt/c/ Windows-side");
  console.error("  3. Tunggu v2.0+ (cross-platform via Node-native helpers, ETA 2026 Q4)");
  console.error("");
  console.error("Track progress: https://github.com/ojokesusu/lintasAI/issues?q=label%3Across-platform");
  process.exit(1);
}

// v1.5.6 Fix #4: Claude Code Desktop vs Web context detection.
// Web context (claude.ai chat) TIDAK punya filesystem access - `npx lintasai init`
// akan gagal silent / aneh. Detect lebih awal supaya user tahu pakai Desktop.
const isInteractiveTTY = process.stdin.isTTY === true || process.stdout.isTTY === true;
const hasClaudeCodeEnv = !!(
  process.env.CLAUDE_CODE_ENTRYPOINT ||
  process.env.CLAUDECODE ||
  process.env.CLAUDE_CODE === "desktop"
);
const looksLikeShell = !!(process.env.SHELL || process.env.ComSpec || process.env.PSModulePath);

if (!isInteractiveTTY && !hasClaudeCodeEnv && !looksLikeShell) {
  console.error("");
  console.error("[ERROR] lintasAI tampaknya dijalankan dari Claude.ai Web (browser).");
  console.error("");
  console.error("Web Claude TIDAK SUPPORT filesystem operations (mkdir, write file, spawn process).");
  console.error("Kit ini butuh shell access untuk: clone repo, write .claude-kit/, run setup-pola-b.ps1.");
  console.error("");
  console.error("Solusi: pakai Claude Code DESKTOP (bukan Web):");
  console.error("  1. Download Desktop: https://claude.ai/download");
  console.error("  2. Install + sign in pakai akun Anthropic kamu");
  console.error("  3. Buka project folder di Desktop, paste prompt JALANKAN_KIT.md");
  console.error("");
  console.error("Kalau kamu YAKIN ini Desktop (false positive detection), set env:");
  console.error("  Windows PowerShell: $env:CLAUDECODE='1'; npx lintasai init");
  console.error("");
  process.exit(1);
}

const command = process.argv[2];
const args = process.argv.slice(3);

if (!command || command === "help" || command === "--help" || command === "-h") {
  showHelp();
  process.exit(0);
}

const target = COMMANDS[command];
if (!target) {
  console.error("[ERROR] Unknown command: " + command);
  console.error("Run: npx lintasai help");
  process.exit(1);
}

// Build powershell command
const userCwd = process.cwd();
// For init/update/uninstall: pass user CWD explicitly so script knows real project root
const shouldPassProjectRoot = ["init", "update", "uninstall", "team-setup"].includes(command);
let psArgs;
if (Array.isArray(target)) {
  // kit.ps1 subcommand. Inject -ProjectRoot so kit.ps1 inspects the kit di USER CWD
  // (.claude-kit di project), bukan di npm cache ($PSScriptRoot). L1-RUN-003.
  psArgs = [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    path.join(KIT_ROOT, target[0]),
    target[1],
    "-ProjectRoot",
    userCwd,
    ...args,
  ];
} else if (shouldPassProjectRoot) {
  // Direct script call with -ProjectRoot
  psArgs = ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", path.join(KIT_ROOT, target), "-ProjectRoot", userCwd, ...args];
} else {
  // Direct script call
  psArgs = ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", path.join(KIT_ROOT, target), ...args];
}

// v1.26.1 fix: detect non-interactive execution (AI tool / CI) and signal it to the
// PowerShell scripts. WHY: with { stdio: "inherit" } the child PowerShell inherits an
// OPEN STDIN PIPE. If that pipe has no human typing, Read-Host BLOCKS FOREVER (it does
// not throw, so the scripts' try/catch fallbacks never fire) -> `npx ... init` hangs.
// "No human keyboard" == stdin is not a TTY (open pipe/redirect) OR an explicit env
// signal is set. In that case we: (a) set LINTASAI_NONINTERACTIVE=1 so the PS helper
// Test-LintasInteractiveInput forces console mode + skips every prompt with a safe
// default (and never opens a blocking GUI popup); (b) add -NonInteractive so even an
// ungated Read-Host THROWS instead of blocking (caught by the existing safe fallbacks).
// A real human in a terminal keeps stdin.isTTY === true -> prompts behave as before.
// ESCAPE HATCH (v1.27.0): a human in Git Bash / mintty has stdin backed by a pipe
// (process.stdin.isTTY is undefined), so they would WRONGLY be treated as
// non-interactive and silently get safe defaults instead of prompts. Setting
// LINTASAI_INTERACTIVE=1 forces interactive mode and wins over all auto-detection
// (also honored by the PS helper Test-LintasInteractiveInput, so both layers agree).
// We deliberately do NOT auto-treat Git Bash (MSYSTEM/TERM) as interactive, because
// the AI Bash tool runs there too and MUST stay non-interactive to avoid the hang.
const forceInteractiveVal = process.env.LINTASAI_INTERACTIVE;
const forceInteractive = !!(forceInteractiveVal && forceInteractiveVal !== "0" && forceInteractiveVal !== "false");
const stdinIsInteractive = process.stdin.isTTY === true;
const envNonInteractive = !!(
  process.env.LINTASAI_NONINTERACTIVE ||
  process.env.CLAUDECODE ||
  process.env.CI
);
const nonInteractive = forceInteractive ? false : (!stdinIsInteractive || envNonInteractive);

const childEnv = Object.assign({}, process.env);
if (nonInteractive) {
  childEnv.LINTASAI_NONINTERACTIVE = "1";
  // Insert -NonInteractive right after -NoProfile (index 0) so it precedes -File.
  psArgs.splice(1, 0, "-NonInteractive");
}

const child = spawn("powershell.exe", psArgs, { stdio: "inherit", cwd: userCwd, env: childEnv });
child.on("error", (err) => {
  console.error("[ERROR] Gagal spawn powershell.exe: " + err.message);
  console.error("Pastikan powershell.exe ada di PATH atau install PowerShell 7+: https://aka.ms/powershell");
  process.exit(127);
});
child.on("close", (code) => {
  process.exit(code || 0);
});
