#!/usr/bin/env bash
# KAIVIRO — sauvegarde restic (mission A, révisé le 2026-11-12 pour la Pi réelle).
# Aucun secret dans ce fichier. Lancé par kaiviro-backup.timer, ou à la main :
#   sudo /opt/kaiviro/backups/backup.sh <scope> <repository>
#   scope      : pi-config
#   repository : local | offsite
# Écrit l'état au format packages/schemas/ops/backup-run.schema.json (S6)
# et des métriques lues par Node Exporter (collecteur textfile), donc visibles dans NEXUS.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=/dev/null
. "${HERE}/.env"
# shellcheck source=/dev/null
. "${HERE}/metriques.sh"

SCOPE="${1:?scope requis}"
REPO_NAME="${2:?repository requis (local|offsite)}"
STATE_DIR="${KAIVIRO_STATE_DIR:-/var/lib/kaiviro/backup-state}"
mkdir -p "$STATE_DIR"

case "$REPO_NAME" in
  local)   export RESTIC_REPOSITORY="$RESTIC_REPOSITORY_LOCAL" ;;
  offsite) export RESTIC_REPOSITORY="$RESTIC_REPOSITORY_OFFSITE" ;;
  *) echo "repository inconnu : $REPO_NAME" >&2; exit 2 ;;
esac
# Le mot de passe est lu depuis un fichier root:root 0400, jamais passé en argument.
export RESTIC_PASSWORD_FILE
# Dépôt hors site via rclone : la configuration de root est dans un fichier dédié (install-copie-drive.sh).
if [ -n "${RCLONE_CONFIG:-}" ]; then export RCLONE_CONFIG; fi

case "$SCOPE" in
  # Configuration de la Pi telle qu'elle existe : SSH, supervision, unités systemd.
  # Les clés Tailscale ne sont pas sauvegardées : une nouvelle connexion au tailnet suffit.
  pi-config) CANDIDATS=(/etc/ssh/sshd_config.d /etc/prometheus /etc/default/prometheus /etc/default/prometheus-node-exporter /etc/systemd/system /opt/kaiviro) ;;
  *) echo "scope inconnu : $SCOPE" >&2; exit 2 ;;
esac
# Seuls les chemins présents sont sauvegardés : un chemin absent ne doit pas faire échouer la sauvegarde.
PATHS=()
for p in "${CANDIDATS[@]}"; do [ -e "$p" ] && PATHS+=("$p"); done

now() { date -u +%Y-%m-%dT%H:%M:%SZ; }
RUN_ID="bk-$(date -u +%Y%m%dT%H%M%SZ)-${SCOPE}-${REPO_NAME}"
STARTED="$(now)"

write_state() {
  # $1 result, $2 snapshot_id|null, $3 error|null
  local snap err
  [ "$2" = "null" ] && snap=null || snap="\"$2\""
  [ "$3" = "null" ] && err=null || err="\"$(printf '%s' "$3" | tr -d '"\\' | cut -c1-400)\""
  cat > "${STATE_DIR}/latest-backup.json.tmp" <<JSON
{"id":"${RUN_ID}","kind":"backup","scope":"${SCOPE}","started_at":"${STARTED}","finished_at":"$(now)","result":"$1","repository":"${REPO_NAME}","snapshot_id":${snap},"bytes_added":null,"files_total":null,"error":${err},"restore_verified":null}
JSON
  mv "${STATE_DIR}/latest-backup.json.tmp" "${STATE_DIR}/latest-backup.json"
  cp "${STATE_DIR}/latest-backup.json" "${STATE_DIR}/${RUN_ID}.json"
  ecrire_metriques backup "$SCOPE" "$REPO_NAME" "$1"
}

if ! out="$(restic backup --tag "kaiviro,${SCOPE}" --json "${PATHS[@]}" 2>&1)"; then
  write_state failed null "restic backup a échoué"
  exit 1
fi
SNAP="$(printf '%s\n' "$out" | grep '"message_type":"summary"' | sed -n 's/.*"snapshot_id":"\([0-9a-f]*\)".*/\1/p' | tail -n1)"

# Rétention : un échec ici ne doit pas laisser l'ancien état « succeeded » affiché.
if ! restic forget --tag "kaiviro,${SCOPE}" \
  --keep-daily "${KEEP_DAILY:-7}" --keep-weekly "${KEEP_WEEKLY:-4}" --keep-monthly "${KEEP_MONTHLY:-6}" \
  --prune >/dev/null 2>&1; then
  write_state partial "${SNAP:-null}" "sauvegarde faite, rétention (restic forget --prune) en échec"
  echo "PARTIEL ${RUN_ID} snapshot=${SNAP:-inconnu} : rétention en échec" >&2
  exit 3
fi

write_state succeeded "${SNAP:-null}" null
echo "OK ${RUN_ID} snapshot=${SNAP:-inconnu}"
