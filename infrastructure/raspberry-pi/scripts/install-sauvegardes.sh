#!/usr/bin/env bash
# KAIVIRO · sauvegardes de la Pi (BACKUP_AND_RESTORE, copie 2 de la règle 3-2-1).
# À lancer par un humain, sur la Pi, depuis le dossier qui contient aussi backup.sh, restore-test.sh et metriques.sh :
#   sudo bash install-sauvegardes.sh
#
# Ce script :
#   1. installe restic (paquet Debian, licence BSD-2-Clause) ;
#   2. crée le mot de passe du dépôt dans /etc/kaiviro/restic.pass (root:root 0400), sans jamais l'afficher ;
#   3. initialise un dépôt chiffré sur le SSD (/srv/kaiviro-backups/restic), un autre disque que le système (carte SD) ;
#   4. installe les scripts dans /opt/kaiviro/backups et deux timers systemd :
#      sauvegarde quotidienne de pi-config, test de restauration mensuel ;
#   5. lance une première sauvegarde et un premier test de restauration.
# La copie hors site (copie 3) reste une décision humaine. Le script est idempotent.
set -euo pipefail

[ "$(id -u)" -eq 0 ] || { echo "Lancer avec sudo." >&2; exit 1; }
ICI="$(cd "$(dirname "$0")" && pwd)"
for f in backup.sh restore-test.sh metriques.sh; do
  [ -f "${ICI}/${f}" ] || { echo "Fichier manquant à côté du script : ${f}" >&2; exit 1; }
done

DEST=/opt/kaiviro/backups
SECRET=/etc/kaiviro/restic.pass
DEPOT=/srv/kaiviro-backups/restic

echo "== restic"
apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq restic

echo "== Scripts dans ${DEST}"
install -d -o root -g root -m 0755 "$DEST"
install -o root -g root -m 0750 "${ICI}/backup.sh" "${ICI}/restore-test.sh" "${ICI}/metriques.sh" "$DEST/"

echo "== Mot de passe du dépôt (jamais affiché)"
install -d -o root -g root -m 0700 /etc/kaiviro
if [ ! -s "$SECRET" ]; then
  umask 077
  head -c 48 /dev/urandom | base64 | tr -d '\n' > "$SECRET"
fi
chown root:root "$SECRET"
chmod 0400 "$SECRET"

cat > "${DEST}/.env" <<EOF
# Géré par KAIVIRO (install-sauvegardes.sh). Aucune valeur secrète ici : seulement des chemins.
RESTIC_REPOSITORY_LOCAL=${DEPOT}
RESTIC_REPOSITORY_OFFSITE=
RESTIC_PASSWORD_FILE=${SECRET}
KEEP_DAILY=7
KEEP_WEEKLY=4
KEEP_MONTHLY=6
RESTORE_WITNESS_FILES="/etc/prometheus/prometheus.yml /etc/default/prometheus-node-exporter"
KAIVIRO_STATE_DIR=/var/lib/kaiviro/backup-state
TEXTFILE_DIR=/var/lib/prometheus/node-exporter
EOF
chmod 0600 "${DEST}/.env"

echo "== Dépôt chiffré ${DEPOT}"
install -d -o root -g root -m 0700 "$(dirname "$DEPOT")"
if ! RESTIC_PASSWORD_FILE="$SECRET" restic -r "$DEPOT" cat config >/dev/null 2>&1; then
  RESTIC_PASSWORD_FILE="$SECRET" restic -r "$DEPOT" init
fi

echo "== Timers systemd"
cat > /etc/systemd/system/kaiviro-backup.service <<EOF
[Unit]
Description=KAIVIRO · sauvegarde restic de pi-config
After=local-fs.target

[Service]
Type=oneshot
ExecStart=${DEST}/backup.sh pi-config local
Nice=10
IOSchedulingClass=idle
EOF
cat > /etc/systemd/system/kaiviro-backup.timer <<'EOF'
[Unit]
Description=KAIVIRO · sauvegarde quotidienne

[Timer]
OnCalendar=*-*-* 03:30
RandomizedDelaySec=15min
Persistent=true

[Install]
WantedBy=timers.target
EOF
cat > /etc/systemd/system/kaiviro-restore-test.service <<EOF
[Unit]
Description=KAIVIRO · test de restauration de pi-config
After=kaiviro-backup.service

[Service]
Type=oneshot
ExecStart=${DEST}/restore-test.sh pi-config local
Nice=10
EOF
cat > /etc/systemd/system/kaiviro-restore-test.timer <<'EOF'
[Unit]
Description=KAIVIRO · test de restauration mensuel

[Timer]
OnCalendar=*-*-01 04:30
Persistent=true

[Install]
WantedBy=timers.target
EOF
systemctl daemon-reload
systemctl enable -q --now kaiviro-backup.timer kaiviro-restore-test.timer

echo "== Première sauvegarde et premier test de restauration"
systemctl start kaiviro-backup.service
systemctl start kaiviro-restore-test.service

echo "== Contrôles"
systemctl is-active kaiviro-backup.timer kaiviro-restore-test.timer
cat /var/lib/kaiviro/backup-state/latest-backup.json; echo
cat /var/lib/kaiviro/backup-state/latest-restore-test.json; echo
ls -l /var/lib/prometheus/node-exporter/kaiviro_*.prom
echo
echo "OK. Sauvegardes installées."
echo "À FAIRE MAINTENANT : copier le mot de passe du dépôt dans votre gestionnaire de mots de passe."
echo "  sudo cat ${SECRET}"
echo "Sans lui, les sauvegardes sont illisibles si la Pi est perdue."
