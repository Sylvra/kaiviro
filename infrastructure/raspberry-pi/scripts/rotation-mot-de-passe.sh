#!/usr/bin/env bash
# KAIVIRO · rotation du mot de passe des dépôts restic (SSD et Google Drive).
# À lancer par un humain, sur la Pi :   sudo bash rotation-mot-de-passe.sh
#
# Les instantanés ne sont ni relus ni réécrits : restic chiffre ses données avec une clé maîtresse,
# protégée par une ou plusieurs clés de mot de passe. On ajoute une nouvelle clé, on vérifie, puis on retire l'ancienne.
# Ordre sûr : tant que l'ancienne clé n'est pas retirée de tous les dépôts, l'ancien mot de passe reste valable.
# Le nouveau mot de passe n'est jamais affiché par ce script.
set -euo pipefail

[ "$(id -u)" -eq 0 ] || { echo "Lancer avec sudo." >&2; exit 1; }

ENVF=/opt/kaiviro/backups/.env
[ -f "$ENVF" ] || { echo "Sauvegardes non installées." >&2; exit 1; }
# shellcheck source=/dev/null
. "$ENVF"
if [ -n "${RCLONE_CONFIG:-}" ]; then export RCLONE_CONFIG; fi

ANCIEN="$RESTIC_PASSWORD_FILE"
NOUVEAU="${ANCIEN}.nouveau"
unset RESTIC_PASSWORD_FILE RESTIC_REPOSITORY

DEPOTS=("$RESTIC_REPOSITORY_LOCAL")
if [ -n "${RESTIC_REPOSITORY_OFFSITE:-}" ]; then DEPOTS+=("$RESTIC_REPOSITORY_OFFSITE"); fi

# Les timers ne doivent pas lancer une sauvegarde pendant la rotation.
systemctl stop kaiviro-backup.timer kaiviro-backup-offsite.timer kaiviro-restore-test.timer 2>/dev/null || true
trap 'systemctl start kaiviro-backup.timer kaiviro-backup-offsite.timer kaiviro-restore-test.timer 2>/dev/null || true' EXIT

echo "== Nouveau mot de passe (jamais affiché)"
umask 077
head -c 48 /dev/urandom | base64 | tr -d '\n' > "$NOUVEAU"
chmod 0400 "$NOUVEAU"

declare -A CLE_ANCIENNE
echo "== 1. Ajout de la nouvelle clé"
for d in "${DEPOTS[@]}"; do
  id="$(restic -r "$d" --password-file "$ANCIEN" key list --json | grep -o '"current":true,"id":"[0-9a-f]*"' | sed 's/.*"id":"\([0-9a-f]*\)"/\1/')"
  [ -n "$id" ] || { echo "Clé courante introuvable sur ${d}." >&2; exit 1; }
  CLE_ANCIENNE["$d"]="$id"
  restic -r "$d" --password-file "$ANCIEN" key add --new-password-file "$NOUVEAU" --host kaiviro-rotation >/dev/null
  echo "   ${d} : clé ajoutée"
done

echo "== 2. Vérification avec le nouveau mot de passe"
for d in "${DEPOTS[@]}"; do
  restic -r "$d" --password-file "$NOUVEAU" cat config >/dev/null
  echo "   ${d} : lisible"
done

echo "== 3. Bascule du fichier de mot de passe"
install -o root -g root -m 0400 "$NOUVEAU" "${ANCIEN}.tmp"
cp -p "$ANCIEN" "${ANCIEN}.ancien"
mv "${ANCIEN}.tmp" "$ANCIEN"
rm -f "$NOUVEAU"

echo "== 4. Retrait de l'ancienne clé"
for d in "${DEPOTS[@]}"; do
  restic -r "$d" --password-file "$ANCIEN" key remove "${CLE_ANCIENNE[$d]}" >/dev/null
  echo "   ${d} : ancienne clé retirée"
done
shred -u "${ANCIEN}.ancien" 2>/dev/null || rm -f "${ANCIEN}.ancien"

echo "== 5. Contrôle : sauvegardes et tests avec le nouveau mot de passe"
systemctl start kaiviro-backup.service
if [ -n "${RESTIC_REPOSITORY_OFFSITE:-}" ]; then systemctl start kaiviro-backup-offsite.service; fi
systemctl start kaiviro-restore-test.service
for d in "${DEPOTS[@]}"; do
  echo "   ${d} : $(restic -r "$d" --password-file "$ANCIEN" key list --json | grep -o '"id"' | wc -l) clé(s)"
done
echo
echo "OK. Rotation terminée. L'ancien mot de passe ne déverrouille plus aucun dépôt."
echo "À FAIRE : copier le nouveau mot de passe dans votre gestionnaire, depuis un terminal qui n'est pas lu par Claude :"
echo "  sudo cat ${ANCIEN}"
echo "Puis remplacer l'ancienne entrée dans le gestionnaire."
