#!/usr/bin/env python3
"""Validation des contrats admin (OpenAPI) et ops (JSON Schema).

Propriétaire : mission A. Lancé par .github/workflows/docs-checks.yml.

Contrôles :
1. Chaque schéma ops est du JSON valide et un JSON Schema 2020-12 valide.
2. Des exemples synthétiques (aucune donnée réelle) sont valides, des contre-exemples invalides.
3. openapi.yaml est un document OpenAPI 3.1 valide, références relatives comprises.
4. Chaque $ref relatif de l'OpenAPI pointe vers un fichier existant.

Sans les bibliothèques (jsonschema, openapi-spec-validator), les contrôles 1 (partie méta), 2 et 3
sont signalés SKIP, sauf avec --strict où leur absence est une erreur.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SCHEMAS = ROOT / "packages" / "schemas" / "ops"
OPENAPI = ROOT / "packages" / "api-contracts" / "admin" / "openapi.yaml"

STRICT = "--strict" in sys.argv
errors: list[str] = []


def report(status: str, msg: str) -> None:
    print(f"[{status}] {msg}")
    if status == "FAIL":
        errors.append(msg)


def skip(msg: str) -> None:
    report("FAIL" if STRICT else "SKIP", msg)


FRESH_LIVE = {"source": "S6", "fetched_at": "2026-11-05T02:05:00Z", "freshness": "live", "demo": False}
FRESH_UNKNOWN = {"source": "S5", "fetched_at": None, "freshness": "unknown", "demo": False,
                 "unknown_reason": "never_measured"}

# (schéma, instance, doit_être_valide, description) — valeurs synthétiques uniquement.
EXAMPLES = [
    ("freshness", FRESH_LIVE, True, "fraîcheur live"),
    ("freshness", FRESH_UNKNOWN, True, "fraîcheur inconnue avec raison"),
    ("freshness", {"source": "S5", "fetched_at": None, "freshness": "unknown", "demo": False}, False,
     "inconnu sans raison refusé"),
    ("metric", {"name": "pi_temperature_celsius", "value": None, "unit": "celsius",
                "provenance": FRESH_UNKNOWN}, True, "métrique inconnue = null"),
    ("service-health", {"service": "pi", "status": "unknown", "checked_at": None,
                        "provenance": FRESH_UNKNOWN}, True, "santé inconnue"),
    ("service-health", {"service": "pi", "status": "green", "checked_at": None,
                        "provenance": FRESH_UNKNOWN}, False, "statut hors liste refusé"),
    ("backup-run", {"id": "bk-20261105T020000Z-pi-config-local", "kind": "backup", "scope": "pi-config",
                    "started_at": "2026-11-05T02:00:00Z", "finished_at": "2026-11-05T02:04:00Z",
                    "result": "succeeded", "repository": "local", "snapshot_id": "0a1b2c3d",
                    "bytes_added": None, "files_total": None, "error": None, "restore_verified": None},
     True, "état écrit par backup.sh"),
    ("backup-run", {"id": "rt-20261105T030000Z-pi-config-local", "kind": "restore_test", "scope": "pi-config",
                    "started_at": "2026-11-05T03:00:00Z", "finished_at": "2026-11-05T03:02:00Z",
                    "result": "partial", "repository": "local", "snapshot_id": None, "bytes_added": None,
                    "files_total": None, "error": "aucun fichier témoin configuré", "restore_verified": False},
     True, "état écrit par restore-test.sh"),
    ("audit-event", {"id": "00000000-0000-4000-8000-000000000001", "at": "2026-11-05T09:30:00Z",
                     "actor": {"type": "admin", "id": "admin-1", "role": "owner"}, "action": "partner.delete",
                     "level": 3, "resource": {"type": "partner", "id": "p-1"}, "outcome": "requested",
                     "correlation_id": "c-1"}, False, "N3 sans motif refusé"),
    ("incident", {"id": "INC-2026-001", "title": "Pi injoignable", "severity": "SEV2", "status": "closed",
                  "service": "pi", "detected_at": "2026-11-05T09:00:00Z",
                  "owner_admin_id": "00000000-0000-4000-8000-000000000002"}, False,
     "SEV2 clos sans post-mortem refusé"),
    ("deployment", {"component": "backend", "environment": "staging", "version": "0.1.0",
                    "commit": "0" * 40, "released_at": "2026-11-05T10:00:00Z", "status": "succeeded"},
     True, "événement de release"),
]


def load_schemas() -> dict[str, dict]:
    out = {}
    for path in sorted(SCHEMAS.glob("*.schema.json")):
        try:
            out[path.name.removesuffix(".schema.json")] = json.loads(path.read_text(encoding="utf-8"))
            report("OK", f"JSON valide : {path.relative_to(ROOT)}")
        except json.JSONDecodeError as exc:
            report("FAIL", f"JSON invalide : {path.relative_to(ROOT)} ({exc})")
    return out


def check_schemas(schemas: dict[str, dict]) -> None:
    try:
        from jsonschema import Draft202012Validator, FormatChecker
        from referencing import Registry, Resource
    except ImportError:
        skip("jsonschema absent : méta-validation et exemples non exécutés")
        return
    # Les schémas n'ont pas de $id : on leur attribue l'URI de leur fichier pour résoudre les $ref relatifs.
    registry = Registry()
    for name, schema in schemas.items():
        schema["$id"] = (SCHEMAS / f"{name}.schema.json").resolve().as_uri()
        registry = registry.with_resource(schema["$id"], Resource.from_contents(schema))
    for name, schema in schemas.items():
        try:
            Draft202012Validator.check_schema(schema)
            report("OK", f"JSON Schema 2020-12 valide : {name}")
        except Exception as exc:  # noqa: BLE001
            report("FAIL", f"JSON Schema invalide : {name} ({exc})")
    for name, instance, should_pass, desc in EXAMPLES:
        validator = Draft202012Validator(schemas[name], registry=registry, format_checker=FormatChecker())
        errs = list(validator.iter_errors(instance))
        if bool(errs) == should_pass:
            detail = errs[0].message if errs else "accepté à tort"
            report("FAIL", f"exemple {name} « {desc} » : {detail}")
        else:
            report("OK", f"exemple {name} « {desc} »")


def collect_refs(node, acc: set[str]) -> None:
    if isinstance(node, dict):
        ref = node.get("$ref")
        if isinstance(ref, str) and not ref.startswith("#"):
            acc.add(ref.split("#", 1)[0])
        for value in node.values():
            collect_refs(value, acc)
    elif isinstance(node, list):
        for value in node:
            collect_refs(value, acc)


def check_openapi() -> None:
    try:
        import yaml
    except ImportError:
        skip("PyYAML absent : OpenAPI non vérifié")
        return
    try:
        spec = yaml.safe_load(OPENAPI.read_text(encoding="utf-8"))
        report("OK", f"YAML valide : {OPENAPI.relative_to(ROOT)}")
    except yaml.YAMLError as exc:
        report("FAIL", f"YAML invalide : {OPENAPI.relative_to(ROOT)} ({exc})")
        return
    if not str(spec.get("openapi", "")).startswith("3.1"):
        report("FAIL", "openapi doit être 3.1.x")
    refs: set[str] = set()
    collect_refs(spec, refs)
    for ref in sorted(refs):
        target = (OPENAPI.parent / ref).resolve()
        report("OK" if target.is_file() else "FAIL", f"$ref externe {ref}")
    for path, item in (spec.get("paths") or {}).items():
        for method, op in item.items():
            if method in {"get", "post", "patch", "put", "delete"}:
                if "x-kaiviro-min-role" not in op or "x-kaiviro-level" not in op:
                    report("FAIL", f"{method.upper()} {path} : rôle ou niveau manquant")
    try:
        from openapi_spec_validator import validate
    except ImportError:
        skip("openapi-spec-validator absent : validation OpenAPI complète non exécutée")
        return
    try:
        validate(spec, base_uri=OPENAPI.resolve().as_uri())
        report("OK", "OpenAPI 3.1 valide (références résolues)")
    except Exception as exc:  # noqa: BLE001
        report("FAIL", f"OpenAPI invalide : {exc}")


def main() -> int:
    schemas = load_schemas()
    check_schemas(schemas)
    check_openapi()
    print(f"\n{len(errors)} erreur(s)")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
