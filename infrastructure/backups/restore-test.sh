#!/usr/bin/env bash
# KAIVIRO — test de restauration proposé (mission A, 2026-11-05).
# À relire et appliquer par Johan uniquement.
# Restaure le dernier instantané dans un dossier TEMPORAIRE. Ne touche jamais aux emplacements d'origine.
# Usage : sudo ./restore-test.sh <scope> <repository>
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
export RESTIC_PASSWORD_FILE

now() { date -u +%Y-%m-%dT%H:%M:%SZ; }
RUN_ID="rt-$(date -u +%Y%m%dT%H%M%SZ)-${SCOPE}-${REPO_NAME}"
STARTED="$(now)"
TARGET="$(mktemp -d /tmp/kaiviro-restore-XXXXXX)"
trap 'rm -rf "$TARGET"' EXIT

result=succeeded
verified=true
err=null

if ! restic restore latest --tag "kaiviro,${SCOPE}" --target "$TARGET" >/dev/null 2>&1; then
  result=failed; verified=false; err='"restic restore a échoué"'
else
  # Fichiers témoins : chemins absolus séparés par des espaces dans RESTORE_WITNESS_FILES.
  for f in ${RESTORE_WITNESS_FILES:-}; do
    if [ ! -f "${TARGET}${f}" ]; then
      verified=false; err="\"témoin absent : ${f}\""; break
    fi
    if [ "$(sha256sum < "$f")" != "$(sha256sum < "${TARGET}${f}")" ]; then
      # Un écart peut être légitime si le fichier a changé depuis la sauvegarde : à analyser.
      verified=false; err="\"témoin différent : ${f}\""; break
    fi
  done
  [ -z "${RESTORE_WITNESS_FILES:-}" ] && { verified=false; err='"aucun fichier témoin configuré"'; }
  [ "$verified" = false ] && result=partial
fi

cat > "${STATE_DIR}/latest-restore-test.json" <<JSON
{"id":"${RUN_ID}","kind":"restore_test","scope":"${SCOPE}","started_at":"${STARTED}","finished_at":"$(now)","result":"${result}","repository":"${REPO_NAME}","snapshot_id":null,"bytes_added":null,"files_total":null,"error":${err},"restore_verified":${verified}}
JSON
cp "${STATE_DIR}/latest-restore-test.json" "${STATE_DIR}/${RUN_ID}.json"

echo "${result} ${RUN_ID} restore_verified=${verified}"
[ "$result" = succeeded ]
