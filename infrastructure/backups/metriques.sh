#!/usr/bin/env bash
# KAIVIRO — métriques de sauvegarde pour Node Exporter (collecteur textfile), lues par NEXUS via Prometheus (S6).
# Sourcé par backup.sh et restore-test.sh. Aucun secret : seulement des horodatages et des résultats.
#
# Fichier écrit : ${TEXTFILE_DIR}/kaiviro_<kind>_<scope>_<repository>.prom
#   kaiviro_backup_last_run_timestamp_seconds      dernière exécution, quel que soit le résultat
#   kaiviro_backup_last_success_timestamp_seconds  dernière exécution réussie (conservée en cas d'échec)
#   kaiviro_backup_last_result{result=...}         1 pour le résultat de la dernière exécution

TEXTFILE_DIR="${TEXTFILE_DIR:-/var/lib/prometheus/node-exporter}"

ecrire_metriques() {
  # $1 kind (backup|restore_test), $2 scope, $3 repository, $4 result (succeeded|failed|partial)
  local kind="$1" scope="$2" repo="$3" result="$4"
  local fichier="${TEXTFILE_DIR}/kaiviro_${kind}_${scope}_${repo}.prom"
  local labels="kind=\"${kind}\",scope=\"${scope}\",repository=\"${repo}\""
  local maintenant succes
  maintenant="$(date +%s)"
  succes=""
  if [ "$result" = succeeded ]; then
    succes="$maintenant"
  elif [ -f "$fichier" ]; then
    succes="$(sed -n 's/^kaiviro_backup_last_success_timestamp_seconds{[^}]*} \([0-9]*\)$/\1/p' "$fichier")"
  fi
  mkdir -p "$TEXTFILE_DIR"
  {
    echo "# HELP kaiviro_backup_last_run_timestamp_seconds Dernière exécution (sauvegarde ou test de restauration)."
    echo "# TYPE kaiviro_backup_last_run_timestamp_seconds gauge"
    echo "kaiviro_backup_last_run_timestamp_seconds{${labels}} ${maintenant}"
    echo "# HELP kaiviro_backup_last_result Résultat de la dernière exécution."
    echo "# TYPE kaiviro_backup_last_result gauge"
    echo "kaiviro_backup_last_result{${labels},result=\"${result}\"} 1"
    if [ -n "$succes" ]; then
      echo "# HELP kaiviro_backup_last_success_timestamp_seconds Dernière exécution réussie."
      echo "# TYPE kaiviro_backup_last_success_timestamp_seconds gauge"
      echo "kaiviro_backup_last_success_timestamp_seconds{${labels}} ${succes}"
    fi
  } > "${fichier}.tmp"
  # Renommage atomique : Node Exporter ne lit jamais un fichier à moitié écrit.
  chmod 0644 "${fichier}.tmp"
  mv "${fichier}.tmp" "$fichier"
}
