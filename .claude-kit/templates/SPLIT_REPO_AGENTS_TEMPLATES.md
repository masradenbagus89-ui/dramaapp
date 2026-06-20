# AGENTS.md Templates - Split Repo (INDEX)

> 3 AGENTS.md template DEFAULT untuk 3 repo split (OPT-IN: 4th template untuk tools repo kalau team >20 staff).
> File ini cuma index. Detail per repo ada di split-agents/ subfolder.

## Templates Available

1. [Frontend Repo AGENTS.md](split-agents/FRONTEND.md) - Untuk <project>-frontend (Frontend staff: dapat edit data CRUD, tidak DDL)
2. [Backend Repo AGENTS.md](split-agents/BACKEND.md) - Untuk <project>-backend (Backend staff + owner: full DB control termasuk DDL)
3. [Shared Repo AGENTS.md](split-agents/SHARED.md) - Untuk <project>-shared (types only; both Frontend & Backend dapat akses read)
4. [Tools Repo AGENTS.md](split-agents/TOOLS.md) - Untuk <project>-tools (owner + Backend staff kalau pakai 4-repo split) **(OPT-IN)**

## Cara AI Pakai

Saat split repo migration:
1. Owner pilih untuk deploy template (Y/N)
2. AI read template per file (FRONTEND.md, BACKEND.md, dst)
3. AI customize dengan project name + GitHub username staff
4. AI deploy ke masing-masing repo: 
   - <project>-frontend/AGENTS.md
   - <project>-backend/AGENTS.md
   - <project>-shared/AGENTS.md
   - <project>-tools/AGENTS.md
5. Commit per repo dengan message: "feat: add AGENTS.md from lintasAI v1.0.0 template"

## Customization Variables

Saat deploy, replace placeholder:
- `<project>` -> nama project user (e.g., "akses")
- `<project>-frontend` -> nama repo frontend
- `<project>-backend` -> nama repo backend
- `<owner>` -> GitHub username owner
