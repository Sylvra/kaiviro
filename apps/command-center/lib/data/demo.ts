/**
 * Données de DÉMONSTRATION — CRM Partenaires.
 * Remplacées par S8 (Supabase, tables admin.partners / admin.partner_events) en CC-M1.
 * Tout écran qui les affiche porte le badge « Données de démonstration ».
 */
export type PartnerType = "garage" | "obd" | "beta";
export type PartnerStage = 0 | 1 | 2 | 3;

export const PARTNER_STAGES = ["À contacter", "En discussion", "Partenaire actif", "En pause"] as const;
export const PARTNER_TYPES: Record<PartnerType, string> = { garage: "Garage testeur", obd: "Fournisseur OBD", beta: "Bêta-testeur" };

export interface Partner {
  ref: string; type: PartnerType; name: string; stage: PartnerStage; next: string;
  owner: "Johan" | "Collègue"; gear: string; consent: "À recueillir" | "Recueilli" | "Non requis";
}

export const DEMO_PARTNERS: Partner[] = [
  { ref: "G-01", type: "garage", name: "Garage testeur n°1", stage: 0, next: "Premier contact : présenter le projet", owner: "Johan", gear: "Aucun prêt", consent: "À recueillir" },
  { ref: "O-01", type: "obd", name: "Fournisseur adaptateur A", stage: 0, next: "Demander fiche technique et firmware", owner: "Collègue", gear: "Adaptateur à commander", consent: "Non requis" },
  { ref: "O-02", type: "obd", name: "Fournisseur adaptateur B", stage: 1, next: "Comparer Bluetooth Classic et BLE", owner: "Collègue", gear: "1 adaptateur de test", consent: "Non requis" },
  { ref: "T-01", type: "beta", name: "Bêta-testeur 01", stage: 1, next: "Envoyer la note d’information", owner: "Johan", gear: "Véhicule personnel", consent: "À recueillir" },
  { ref: "G-02", type: "garage", name: "Garage testeur n°2", stage: 3, next: "Reprendre contact après M1", owner: "Johan", gear: "Aucun prêt", consent: "À recueillir" },
];
