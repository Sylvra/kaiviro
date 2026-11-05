#!/usr/bin/env bash
# KAIVIRO — contrôles de l'hôte d'administration (Raspberry Pi 5).
# Proposé par la mission A le 2026-11-05. À relire et exécuter par Johan.
# LECTURE SEULE : ce script ne modifie rien. Il affiche OK / ATTENTION / INCONNU.
# Usage : sudo ./check-host.sh [BIND_ADDR]
set -u

BIND_ADDR="${1:-10.77.0.1}"
fail=0

ok()   { printf '[OK]        %s\n' "$*"; }
warn() { printf '[ATTENTION] %s\n' "$*"; fail=1; }
unk()  { printf '[INCONNU]   %s\n' "$*"; }

# 1. Architecture 64 bits
arch="$(uname -m)"
[ "$arch" = "aarch64" ] && ok "architecture $arch" || warn "architecture $arch (attendu aarch64)"

# 2. Racine sur SSD NVMe
root_src="$(findmnt -n -o SOURCE / 2>/dev/null || true)"
case "$root_src" in
  /dev/nvme*) ok "racine sur $root_src" ;;
  "") unk "source de / introuvable" ;;
  *) warn "racine sur $root_src (attendu /dev/nvme*)" ;;
esac

# 3. SSH durci (configuration effective)
if command -v sshd >/dev/null 2>&1; then
  eff="$(sshd -T 2>/dev/null || true)"
  echo "$eff" | grep -qi '^passwordauthentication no' && ok "SSH : mot de passe refusé" || warn "SSH : mot de passe accepté ?"
  echo "$eff" | grep -qi '^permitrootlogin no' && ok "SSH : root refusé" || warn "SSH : root autorisé ?"
else
  unk "sshd absent"
fi

# 4. Pare-feu
if command -v nft >/dev/null 2>&1 && nft list ruleset 2>/dev/null | grep -q 'hook input.*policy drop'; then
  ok "nftables : politique d'entrée drop"
elif command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -q 'Status: active'; then
  ok "ufw actif"
else
  warn "aucun pare-feu actif détecté"
fi

# 5. Ports en écoute hors lo et VPN
listen="$(ss -H -tuln 2>/dev/null | awk '{print $5}' || true)"
bad="$(echo "$listen" | grep -Ev "^(127\.0\.0\.1|\[::1\]|${BIND_ADDR//./\\.}):" | grep -Ev '^$' || true)"
if [ -z "$bad" ]; then
  ok "écoute limitée à lo et ${BIND_ADDR}"
else
  warn "écoute hors lo/VPN (vérifier SSH LAN, UDP WireGuard) :"
  echo "$bad" | sed 's/^/              /'
fi

# 6. Ports Docker publiés
if command -v docker >/dev/null 2>&1; then
  pub="$(docker ps --format '{{.Names}} {{.Ports}}' 2>/dev/null | grep -E '0\.0\.0\.0|\[::\]|:::' || true)"
  [ -z "$pub" ] && ok "Docker : aucun port publié sur toutes les interfaces" || { warn "Docker : ports publiés sur toutes les interfaces :"; echo "$pub" | sed 's/^/              /'; }
else
  unk "docker absent (normal avant l'étape 0.7)"
fi

# 7. Throttling et température
if command -v vcgencmd >/dev/null 2>&1; then
  thr="$(vcgencmd get_throttled 2>/dev/null)"
  [ "$thr" = "throttled=0x0" ] && ok "$thr" || warn "$thr (voir documentation Raspberry Pi pour le détail des bits)"
  printf '[INFO]      %s\n' "$(vcgencmd measure_temp 2>/dev/null)"
else
  unk "vcgencmd absent"
fi

# 8. Dernière sauvegarde (état S6)
state="/var/lib/kaiviro/backup-state/latest-backup.json"
[ -f "$state" ] && printf '[INFO]      dernière sauvegarde : %s\n' "$(cat "$state")" || unk "aucun état de sauvegarde ($state)"

exit "$fail"
