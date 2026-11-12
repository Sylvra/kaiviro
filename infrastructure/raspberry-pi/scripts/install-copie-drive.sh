#!/usr/bin/env bash
# KAIVIRO · copie hors site des sauvegardes sur Google Drive (copie 3 de la règle 3-2-1, choix de Johan le 2026-11-12).
# Prérequis : install-sauvegardes.sh déjà lancé, rclone configuré pour l'utilisateur sylvra avec le remote « gdrive: ».
# À lancer par un humain, sur la Pi :   sudo bash install-copie-drive.sh
#
# Ce script :
#   1. copie la configuration rclone de sylvra dans /etc/kaiviro/rclone.conf (root:root 0600), sans l'afficher ;
#      les tâches de root ne touchent ainsi jamais au fichier de sylvra, utilisé par gdrive-sync ;
#   2. crée un dépôt restic chiffré dans Drive (KAIVIRO-BACKUPS/restic), avec le même mot de passe que le dépôt local ;
#      Google ne voit que des blocs chiffrés ;
#   3. ajoute une sauvegarde quotidienne vers Drive (04:15) et le test de restauration mensuel depuis Drive ;
#   4. lance une première sauvegarde et un premier test depuis Drive.
# Le script est idempotent.
set -euo pipefail

[ "$(id -u)" -eq 0 ] || { echo "Lancer avec sudo." >&2; exit 1; }

DEST=/opt/kaiviro/backups
ENVF="${DEST}/.env"
SOURCE_RCLONE=/home/sylvra/.config/rclone/rclone.conf
RCLONE_ROOT=/etc/kaiviro/rclone.conf
DEPOT="rclone:gdrive:KAIVIRO-BACKUPS/restic"

[ -f "$ENVF" ] || { echo "Lancer d'abord install-sauvegardes.sh." >&2; exit 1; }
[ -f "$SOURCE_RCLONE" ] || { echo "Configuration rclone de sylvra introuvable." >&2; exit 1; }
command -v rclone >/dev/null || { echo "rclone absent." >&2; exit 1; }

echo "== Scripts à jour dans ${DEST}"
ICI="$(cd "$(dirname "$0")" && pwd)"
for f in backup.sh restore-test.sh metriques.sh; do
  [ -f "${ICI}/${f}" ] || { echo "Fichier manquant à côté du script : ${f}" >&2; exit 1; }
done
install -o root -g root -m 0750 "${ICI}/backup.sh" "${ICI}/restore-test.sh" "${ICI}/metriques.sh" "$DEST/"

echo "== Configuration rclone pour root (jamais affichée)"
install -o root -g root -m 0600 "$SOURCE_RCLONE" "$RCLONE_ROOT"
RCLONE_CONFIG="$RCLONE_ROOT" rclone listremotes | grep -qx "gdrive:" || { echo "Remote gdrive: absent." >&2; exit 1; }

echo "== Dépôt hors site dans ${ENVF}"
sed -i "s|^RESTIC_REPOSITORY_OFFSITE=.*|RESTIC_REPOSITORY_OFFSITE=${DEPOT}|" "$ENVF"
grep -q "^RCLONE_CONFIG=" "$ENVF" || echo "RCLONE_CONFIG=${RCLONE_ROOT}" >> "$ENVF"
chmod 0600 "$ENVF"

echo "== Dépôt chiffré ${DEPOT}"
# shellcheck source=/dev/null
. "$ENVF"
export RCLONE_CONFIG RESTIC_PASSWORD_FILE
if ! restic -r "$DEPOT" cat config >/dev/null 2>&1; then
  restic -r "$DEPOT" init
fi

echo "== Timers systemd"
cat > /etc/systemd/system/kaiviro-backup-offsite.service <<EOF
[Unit]
Description=KAIVIRO · sauvegarde restic de pi-config vers Google Drive
After=network-online.target kaiviro-backup.service
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=${DEST}/backup.sh pi-config offsite
Nice=10
EOF
cat > /etc/systemd/system/kaiviro-backup-offsite.timer <<'EOF'
[Unit]
Description=KAIVIRO · sauvegarde quotidienne vers Google Drive

[Timer]
OnCalendar=*-*-* 04:15
RandomizedDelaySec=15min
Persistent=true

[Install]
WantedBy=timers.target
EOF
# Le test mensuel restaure depuis le SSD puis depuis Drive.
cat > /etc/systemd/system/kaiviro-restore-test.service <<EOF
[Unit]
Description=KAIVIRO · test de restauration de pi-config (SSD puis Drive)
After=kaiviro-backup.service kaiviro-backup-offsite.service

[Service]
Type=oneshot
ExecStart=${DEST}/restore-test.sh pi-config local
ExecStart=${DEST}/restore-test.sh pi-config offsite
Nice=10
EOF
systemctl daemon-reload
systemctl enable -q --now kaiviro-backup-offsite.timer

echo "== Première sauvegarde et premier test depuis Drive"
systemctl start kaiviro-backup-offsite.service
"${DEST}/restore-test.sh" pi-config offsite

echo "== Contrôles"
systemctl is-active kaiviro-backup-offsite.timer
ls -l /var/lib/prometheus/node-exporter/kaiviro_*offsite*.prom
echo "OK. Copie hors site sur Google Drive installée (KAIVIRO-BACKUPS/restic, chiffrée)."
