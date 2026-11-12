#!/usr/bin/env bash
# KAIVIRO NEXUS · NX-2 : supervision minimale de la Raspberry Pi (étape 2 d'ADR-0010, sans Docker).
# À lancer par un humain, sur la Pi : sudo bash install-supervision.sh
#
# Installe deux paquets Debian officiels, sous licence Apache-2.0 :
#   - prometheus-node-exporter : métriques de l'hôte et état des services systemd ;
#   - prometheus : collecte toutes les 30 s, rétention 15 jours, données sur le SSD (/srv).
# Les deux écoutent sur 127.0.0.1 uniquement.
# Prometheus est publié sur le tailnet seulement, par « tailscale serve », en HTTPS, port 9090.
# Rien n'est exposé sur le réseau local ni sur Internet. Le script est idempotent.
set -euo pipefail

[ "$(id -u)" -eq 0 ] || { echo "Lancer avec sudo." >&2; exit 1; }

DONNEES=/srv/prometheus
UNITES='(ssh|tailscaled|valheim|valheim-app|prometheus|prometheus-node-exporter)\.service'

echo "== Paquets"
apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq prometheus-node-exporter prometheus

echo "== Node Exporter : 127.0.0.1:9100, collecteur systemd"
cat > /etc/default/prometheus-node-exporter <<EOF
# Géré par KAIVIRO (install-supervision.sh).
ARGS="--web.listen-address=127.0.0.1:9100 --collector.systemd --collector.systemd.unit-include=${UNITES}"
EOF

echo "== Prometheus : 127.0.0.1:9090, données dans ${DONNEES}"
install -d -o prometheus -g prometheus -m 0750 "$DONNEES"
cat > /etc/default/prometheus <<EOF
# Géré par KAIVIRO (install-supervision.sh).
ARGS="--web.listen-address=127.0.0.1:9090 --storage.tsdb.path=${DONNEES} --storage.tsdb.retention.time=15d"
EOF
cat > /etc/prometheus/prometheus.yml <<'EOF'
# Géré par KAIVIRO (install-supervision.sh). Seuils d'alerte : non définis, à fixer après observation.
global:
  scrape_interval: 30s
  evaluation_interval: 30s
  external_labels:
    site: kaiviro-admin-pi
scrape_configs:
  - job_name: prometheus
    static_configs:
      - targets: ["127.0.0.1:9090"]
  - job_name: node
    static_configs:
      - targets: ["127.0.0.1:9100"]
EOF
promtool check config /etc/prometheus/prometheus.yml

systemctl enable -q prometheus-node-exporter prometheus
systemctl restart prometheus-node-exporter prometheus

echo "== Publication sur le tailnet seulement"
tailscale serve --bg --https=9090 http://127.0.0.1:9090

echo "== Contrôles"
sleep 5
systemctl is-active prometheus-node-exporter prometheus
curl -fsS http://127.0.0.1:9090/-/ready
curl -fsS 'http://127.0.0.1:9090/api/v1/query?query=up' | head -c 300; echo
ss -ltnH | awk '{print $4}' | grep -E ':(9090|9100)$'
tailscale serve status
echo "OK. Supervision installée."
