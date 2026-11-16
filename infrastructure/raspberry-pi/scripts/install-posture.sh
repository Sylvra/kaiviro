#!/usr/bin/env bash
# KAIVIRO · posture de sécurité de la Pi, en lecture seule (NEXUS, page Security & Audit).
# À lancer par un humain, sur la Pi :   sudo bash install-posture.sh
#
# Installe /opt/kaiviro/posture/posture.sh et un timer horaire. Le script OBSERVE seulement :
# il ne modifie ni SSH, ni le pare-feu, ni les paquets. Il écrit des métriques pour Node Exporter
# (collecteur textfile), lues par NEXUS via Prometheus. Aucune valeur secrète n'est publiée.
set -euo pipefail

[ "$(id -u)" -eq 0 ] || { echo "Lancer avec sudo." >&2; exit 1; }

DEST=/opt/kaiviro/posture
install -d -o root -g root -m 0755 "$DEST"

cat > "${DEST}/posture.sh" <<'SCRIPT'
#!/usr/bin/env bash
# KAIVIRO · relevé de posture, lecture seule. Lancé par kaiviro-posture.timer.
set -euo pipefail
SORTIE=/var/lib/prometheus/node-exporter/kaiviro_posture.prom
TMP="$(mktemp "${SORTIE}.XXXXXX")"

valeur_sshd() { sshd -T 2>/dev/null | awk -v k="$1" '$1==k {print $2; exit}'; }
oui() { [ "$1" = "yes" ] && echo 1 || echo 0; }

mdp="$(valeur_sshd passwordauthentication)"
root_login="$(valeur_sshd permitrootlogin)"
cle="$(valeur_sshd pubkeyauthentication)"
kbd="$(valeur_sshd kbdinteractiveauthentication)"

{
  echo "# HELP kaiviro_ssh_password_auth 1 si SSH accepte les mots de passe (sshd -T)."
  echo "# TYPE kaiviro_ssh_password_auth gauge"
  echo "kaiviro_ssh_password_auth $(oui "${mdp:-unknown}")"
  echo "# HELP kaiviro_ssh_kbd_interactive_auth 1 si SSH accepte l'authentification interactive."
  echo "# TYPE kaiviro_ssh_kbd_interactive_auth gauge"
  echo "kaiviro_ssh_kbd_interactive_auth $(oui "${kbd:-unknown}")"
  echo "# HELP kaiviro_ssh_pubkey_auth 1 si SSH accepte les clés publiques."
  echo "# TYPE kaiviro_ssh_pubkey_auth gauge"
  echo "kaiviro_ssh_pubkey_auth $(oui "${cle:-unknown}")"
  echo "# HELP kaiviro_ssh_root_login Mode PermitRootLogin effectif."
  echo "# TYPE kaiviro_ssh_root_login gauge"
  echo "kaiviro_ssh_root_login{mode=\"${root_login:-inconnu}\"} 1"

  # Ports TCP en écoute hors boucle locale et hors tailnet : visibles depuis le réseau local.
  echo "# HELP kaiviro_listen_exposed Port TCP en écoute sur une adresse non locale et hors tailnet."
  echo "# TYPE kaiviro_listen_exposed gauge"
  ss -ltnpH | while read -r _ _ _ local _ proc; do
    case "$local" in
      127.*|\[::1\]*|*%tailscale0:*|100.*|\[fd7a:*) continue ;;
    esac
    port="${local##*:}"
    nom="$(printf '%s' "$proc" | sed -n 's/.*(("\([^"]*\)".*/\1/p')"
    echo "kaiviro_listen_exposed{port=\"${port}\",process=\"${nom:-inconnu}\"} 1"
  done | sort -u

  regles="$(nft list ruleset 2>/dev/null | grep -cE '(accept|drop|reject)' || true)"
  politique="$(nft list ruleset 2>/dev/null | grep -E 'hook input' | grep -c 'policy drop' || true)"
  echo "# HELP kaiviro_firewall_rules Règles nftables (accept, drop, reject) chargées."
  echo "# TYPE kaiviro_firewall_rules gauge"
  echo "kaiviro_firewall_rules ${regles:-0}"
  echo "# HELP kaiviro_firewall_input_drop 1 si une chaîne d'entrée a la politique drop."
  echo "# TYPE kaiviro_firewall_input_drop gauge"
  echo "kaiviro_firewall_input_drop $([ "${politique:-0}" -gt 0 ] && echo 1 || echo 0)"

  echo "# HELP kaiviro_unattended_upgrades 1 si unattended-upgrades est installé."
  echo "# TYPE kaiviro_unattended_upgrades gauge"
  echo "kaiviro_unattended_upgrades $(dpkg -s unattended-upgrades >/dev/null 2>&1 && echo 1 || echo 0)"

  echo "# HELP kaiviro_posture_last_run_timestamp_seconds Dernier relevé de posture."
  echo "# TYPE kaiviro_posture_last_run_timestamp_seconds gauge"
  echo "kaiviro_posture_last_run_timestamp_seconds $(date +%s)"
} > "$TMP"
chmod 0644 "$TMP"
mv "$TMP" "$SORTIE"
SCRIPT
chmod 0750 "${DEST}/posture.sh"

cat > /etc/systemd/system/kaiviro-posture.service <<EOF
[Unit]
Description=KAIVIRO · relevé de posture de sécurité (lecture seule)

[Service]
Type=oneshot
ExecStart=${DEST}/posture.sh
Nice=10
EOF
cat > /etc/systemd/system/kaiviro-posture.timer <<'EOF'
[Unit]
Description=KAIVIRO · relevé de posture toutes les heures

[Timer]
OnBootSec=2min
OnUnitActiveSec=1h
Persistent=true

[Install]
WantedBy=timers.target
EOF
systemctl daemon-reload
systemctl enable -q --now kaiviro-posture.timer
systemctl start kaiviro-posture.service

echo "== Relevé"
grep -v '^#' /var/lib/prometheus/node-exporter/kaiviro_posture.prom
echo "OK. Posture publiée, relevée toutes les heures. Rien n'a été modifié dans la configuration de sécurité."
