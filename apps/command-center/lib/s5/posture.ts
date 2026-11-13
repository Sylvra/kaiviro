/**
 * S5 · Posture de sécurité de la Pi, publiée par install-posture.sh (lecture seule) et lue via Prometheus.
 * Fonctions pures, testées dans posture.test.ts.
 * Règles : RASPBERRY_PI_ADMIN_CENTER (§2 aucun port d'administration exposé, §4.3 SSH par clé uniquement).
 */
import type { Etat } from "../types";
import type { Echantillon } from "./mapping";

export const REQUETES_POSTURE = {
  motDePasse: "kaiviro_ssh_password_auth",
  interactif: "kaiviro_ssh_kbd_interactive_auth",
  root: "kaiviro_ssh_root_login",
  exposes: "kaiviro_listen_exposed",
  regles: "kaiviro_firewall_rules",
  politiqueDrop: "kaiviro_firewall_input_drop",
  majAuto: "kaiviro_unattended_upgrades",
  releve: "kaiviro_posture_last_run_timestamp_seconds",
  majSecurite: 'sum(apt_upgrades_pending{origin=~"(?i).*security.*"})',
} as const;

export interface Controle {
  id: string;
  titre: string;
  etat: Etat;
  constat: string;
  reference: string;
}

type Reponses = Record<keyof typeof REQUETES_POSTURE, Echantillon[] | null>;

const num = (v: Echantillon[] | null): number | null => {
  const s = v?.[0]?.value[1];
  if (s === undefined) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

const inconnu = (id: string, titre: string, reference: string): Controle => ({ id, titre, etat: "inconnu", constat: "Non relevé", reference });

/** Relevé plus vieux que 2 h : la posture n'est plus considérée comme mesurée. */
export const FRAICHEUR_SECONDES = 2 * 3600;

/** Ne dépend pas du relevé de posture : vient du collecteur apt de Node Exporter. */
function controleMajSecurite(r: Reponses): Controle {
  const n = num(r.majSecurite);
  if (n === null) return inconnu("maj-securite", "Mises à jour de sécurité", "Debian security");
  return n === 0
    ? { id: "maj-securite", titre: "Mises à jour de sécurité", etat: "ok", constat: "Aucune en attente", reference: "Debian security" }
    : { id: "maj-securite", titre: "Mises à jour de sécurité", etat: "attention", constat: `${n} paquet${n > 1 ? "s" : ""} en attente`, reference: "Debian security" };
}

export function versControles(r: Reponses, maintenant: number): Controle[] {
  const releve = num(r.releve);
  const frais = releve !== null && maintenant - releve <= FRAICHEUR_SECONDES;
  const resultat: Controle[] = [
    {
      id: "releve",
      titre: "Relevé de posture",
      etat: releve === null ? "inconnu" : frais ? "ok" : "alerte",
      constat: releve === null ? "Jamais relevé (install-posture.sh non lancé)" : frais ? "Relevé de moins de 2 h" : "Relevé trop ancien",
      reference: "kaiviro-posture.timer",
    },
  ];

  if (!frais) {
    return [
      ...resultat,
      inconnu("ssh-auth", "Connexion SSH", "ADMIN_CENTER §4.3"),
      inconnu("ssh-root", "Connexion root", "ADMIN_CENTER §4.3"),
      inconnu("ports", "Ports visibles hors tailnet", "ADMIN_CENTER §2"),
      inconnu("pare-feu", "Pare-feu nftables", "SECURITY_BASELINE"),
      inconnu("maj-auto", "Mises à jour automatiques", "SECURITY_BASELINE"),
      controleMajSecurite(r),
    ];
  }

  const mdp = num(r.motDePasse);
  const kbd = num(r.interactif);
  resultat.push(
    mdp === null || kbd === null
      ? inconnu("ssh-auth", "Connexion SSH", "ADMIN_CENTER §4.3")
      : mdp === 1 || kbd === 1
        ? { id: "ssh-auth", titre: "Connexion SSH", etat: "alerte", constat: "Mots de passe acceptés (clé SSH seule attendue)", reference: "ADMIN_CENTER §4.3" }
        : { id: "ssh-auth", titre: "Connexion SSH", etat: "ok", constat: "Clé SSH uniquement", reference: "ADMIN_CENTER §4.3" },
  );

  const mode = r.root?.[0]?.metric.mode;
  resultat.push(
    !mode || mode === "inconnu"
      ? inconnu("ssh-root", "Connexion root", "ADMIN_CENTER §4.3")
      : mode === "no"
        ? { id: "ssh-root", titre: "Connexion root", etat: "ok", constat: "Interdite", reference: "ADMIN_CENTER §4.3" }
        : mode === "yes"
          ? { id: "ssh-root", titre: "Connexion root", etat: "alerte", constat: "Autorisée, y compris par mot de passe", reference: "ADMIN_CENTER §4.3" }
          : { id: "ssh-root", titre: "Connexion root", etat: "attention", constat: `Autorisée par clé (${mode})`, reference: "ADMIN_CENTER §4.3" },
  );

  const ports = (r.exposes ?? []).map((e) => `${e.metric.port} (${e.metric.process ?? "inconnu"})`);
  resultat.push(
    r.exposes === null
      ? inconnu("ports", "Ports visibles hors tailnet", "ADMIN_CENTER §2")
      : ports.length === 0
        ? { id: "ports", titre: "Ports visibles hors tailnet", etat: "ok", constat: "Aucun : tout passe par Tailscale", reference: "ADMIN_CENTER §2" }
        : {
            id: "ports",
            titre: "Ports visibles hors tailnet",
            etat: "attention",
            constat: `${ports.length} en écoute sur le réseau local : ${ports.join(", ")}. ${num(r.politiqueDrop) === 1 ? "Entrée filtrée par nftables : l’accès réel dépend des règles, non analysées ici." : "Aucun filtrage d’entrée par défaut."} Exposition à Internet non vérifiable depuis la Pi.`,
            reference: "ADMIN_CENTER §2",
          },
  );

  const regles = num(r.regles);
  const drop = num(r.politiqueDrop);
  resultat.push(
    regles === null
      ? inconnu("pare-feu", "Pare-feu nftables", "SECURITY_BASELINE")
      : regles > 0 && drop === 1
        ? { id: "pare-feu", titre: "Pare-feu nftables", etat: "ok", constat: `${regles} règles, entrée bloquée par défaut`, reference: "SECURITY_BASELINE" }
        : {
            id: "pare-feu",
            titre: "Pare-feu nftables",
            etat: "attention",
            constat: regles === 0 ? "Aucune règle chargée" : `${regles} règles, entrée ouverte par défaut`,
            reference: "SECURITY_BASELINE",
          },
  );

  const auto = num(r.majAuto);
  resultat.push(
    auto === null
      ? inconnu("maj-auto", "Mises à jour automatiques", "SECURITY_BASELINE")
      : auto === 1
        ? { id: "maj-auto", titre: "Mises à jour automatiques", etat: "ok", constat: "unattended-upgrades installé", reference: "SECURITY_BASELINE" }
        : { id: "maj-auto", titre: "Mises à jour automatiques", etat: "attention", constat: "unattended-upgrades absent", reference: "SECURITY_BASELINE" },
  );

  return [...resultat, controleMajSecurite(r)];
}
