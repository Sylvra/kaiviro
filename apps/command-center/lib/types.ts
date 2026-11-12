/** Les quatre états, partout les mêmes. « inconnu » n'est jamais affiché comme sain. */
export type Etat = "ok" | "attention" | "alerte" | "inconnu";

/** Provenance d'une valeur affichée (principe NEXUS 3 : aucune donnée sans source). */
export interface Provenance {
  /** Identifiant de source du contrat (S1 GitHub, S5 Node Exporter…). */
  source: string;
  /** Libellé lisible de la source. */
  libelle: string;
  /** Vrai tant que la valeur vient de lib/data/exemple.ts et non d'un connecteur. */
  exemple: boolean;
}

export type StatutTache = "todo" | "doing" | "review" | "done";
export type Mission = "A" | "B" | "C";

export interface Relation {
  nom: string;
  type: "Tâche" | "Décision" | "Document" | "Nœud" | "Sauvegarde";
  etat: Etat | StatutTache;
  href?: string;
}

export interface EvenementChrono {
  texte: string;
  meta: string;
  etat: Etat | StatutTache;
}

export interface Tache {
  id: string;
  titre: string;
  statut: StatutTache;
  mission: Mission;
  fenetre: string;
  /** Jours restants avant la fin de fenêtre ; négatif : en retard. */
  echeanceJours: number;
  relations: Relation[];
  chemin?: string;
  assignees?: string;
  /** Page de la source (issue GitHub), si la tâche vient d'un connecteur. */
  lien?: string;
  chronologie: EvenementChrono[];
}

export interface Service {
  nom: string;
  role: string;
  etat: Etat;
  libelleEtat: string;
  action: string;
}

export interface Serie {
  libelle: string;
  unite: string;
  max: number;
  seuil: number;
  valeurs: number[];
}

export interface Noeud {
  id: string;
  nom: string;
  nature: string;
  etat: Etat;
  libelleEtat: string;
  provenance: Provenance;
  champs: { k: string; v: string }[];
  services: Service[];
  series: Serie[];
  relations: Relation[];
  chronologie: EvenementChrono[];
}

export interface NoeudCarte {
  id: string;
  nom: string;
  nature: string;
  libelleEtat: string;
  etat: Etat;
  candidat?: boolean;
  /** Position sur la carte de 1000 × 640. */
  x: number;
  y: number;
  href?: string;
}

export interface LienCarte {
  d: string;
  mesure: boolean;
}
