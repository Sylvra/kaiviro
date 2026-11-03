<#
  init-kaiviro.ps1 — Initialise la structure M0 du dépôt KAIVIRO.

  Prérequis :
    - Dépôt cloné, positionné à sa racine.
    - Les fichiers du pack (CLAUDE.md, docs/roadmap/M0_PLAN.md, .gitignore)
      copiés à la racine avant d'exécuter ce script.

  Le script :
    1. Passe sur la branche develop (la crée si besoin).
    2. Crée l'arborescence M0 avec des .gitkeep (Git ignore les dossiers vides).
    3. Vérifie la présence des fichiers fondateurs.
    4. N'effectue NI commit NI push : tu relis puis tu valides toi-même.
#>

$ErrorActionPreference = 'Stop'

if (-not (Test-Path .git)) {
    throw "Lance ce script depuis la racine du dépôt kaiviro."
}

# 1. Branche develop
$current = git rev-parse --abbrev-ref HEAD
if ($current -ne 'develop') {
    git show-ref --verify --quiet refs/heads/develop
    if ($LASTEXITCODE -eq 0) { git switch develop } else { git switch -c develop }
}

# 2. Arborescence
$dirs = @(
    '.github/ISSUE_TEMPLATE', '.github/workflows',
    '.claude/skills',
    'apps/android', 'apps/command-center',
    'services/backend',
    'packages/api-contracts/app', 'packages/api-contracts/admin',
    'packages/schemas/app', 'packages/schemas/ops',
    'packages/shared-types', 'packages/diagnostic-rules',
    'knowledge/automotive', 'knowledge/obd', 'knowledge/mechanical', 'knowledge/electrical',
    'knowledge/hybrid-ev', 'knowledge/maintenance', 'knowledge/sources',
    'infrastructure/raspberry-pi', 'infrastructure/monitoring', 'infrastructure/network',
    'infrastructure/backups', 'infrastructure/cloud',
    'docs/product', 'docs/architecture', 'docs/adr', 'docs/security', 'docs/operations',
    'docs/automotive', 'docs/ai', 'docs/command-center', 'docs/roadmap',
    'tests/contracts', 'tests/integration', 'tests/security'
)

foreach ($d in $dirs) {
    New-Item -ItemType Directory -Force -Path $d | Out-Null
    $keep = Join-Path $d '.gitkeep'
    if (-not (Get-ChildItem -Path $d -Force | Where-Object { $_.Name -ne '.gitkeep' })) {
        New-Item -ItemType File -Force -Path $keep | Out-Null
    }
}

# 3. Fichiers fondateurs
$required = @('CLAUDE.md', 'README.md', 'docs/roadmap/M0_PLAN.md', '.gitignore')
$missing = $required | Where-Object { -not (Test-Path $_) }
if ($missing) {
    Write-Warning ("Fichiers manquants : " + ($missing -join ', '))
} else {
    Write-Host "Fichiers fondateurs présents." -ForegroundColor Green
}

Write-Host ""
Write-Host "Structure créée. Étapes suivantes :" -ForegroundColor Cyan
Write-Host "  git status"
Write-Host "  git add ."
Write-Host "  git commit -m 'chore(m0): structure initiale, CLAUDE.md et plan M0'"
Write-Host "  git push -u origin develop"
Write-Host ""
Write-Host "Puis créer les worktrees (depuis la racine du dépôt) :"
Write-Host "  git worktree add ..\kaiviro-claude-a -b feature/m0-admin-operations develop"
Write-Host "  git worktree add ..\kaiviro-claude-b -b feature/m0-app-stack develop"
