#!/usr/bin/env bash
# KAIVIRO — sauvegarde restic proposée (mission A, 2026-11-05).
# À relire et appliquer par Johan uniquement. Aucun secret dans ce fichier.
# Usage : sudo ./backup.sh <scope> <repository>
#   scope      : pi-config | pi-monitoring-data
#   repository : local | offsite
# Écrit l'état au format packages/schemas/ops/backup-run.schema.json.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=/dev/null
. "${HERE}/.env"

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

case "$SCOPE" in
  pi-config)          PATHS=(/etc/ssh/sshd_config.d /etc/nftables.conf /etc/wireguard /opt/kaiviro) ;;
  pi-monitoring-data) PATHS=(/var/lib/docker/volumes/kaiviro-monitoring_uptime_kuma_data /var/lib/docker/volumes/kaiviro-monitoring_grafana_data) ;;
  *) echo "scope inconnu : $SCOPE" >&2; exit 2 ;;
esac

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
}

# Volumes Docker : arrêter le service concerné pour une copie cohérente (option, à valider).
if ! out="$(restic backup --tag "kaiviro,${SCOPE}" --json "${PATHS[@]}" 2>&1)"; then
  write_state failed null "restic backup a échoué"
  exit 1
fi
SNAP="$(printf '%s\n' "$out" | grep '"message_type":"summary"' | sed -n 's/.*"snapshot_id":"\([0-9a-f]*\)".*/\1/p' | tail -n1)"

# Rétention : un échec ici ne doit pas laisser l'ancien état « succeeded » affiché.
# La sauvegarde est faite mais la rétention a échoué : état « partial », sortie non nulle.
if ! restic forget --tag "kaiviro,${SCOPE}" \
  --keep-daily "${KEEP_DAILY:-7}" --keep-weekly "${KEEP_WEEKLY:-4}" --keep-monthly "${KEEP_MONTHLY:-6}" \
  --prune >/dev/null 2>&1; then
  write_state partial "${SNAP:-null}" "sauvegarde faite, rétention (restic forget --prune) en échec"
  echo "PARTIEL ${RUN_ID} snapshot=${SNAP:-inconnu} : rétention en échec" >&2
  exit 3
fi

write_state succeeded "${SNAP:-null}" null
echo "OK ${RUN_ID} snapshot=${SNAP:-inconnu}"
