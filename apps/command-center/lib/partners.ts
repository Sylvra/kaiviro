import { z } from "zod";

/**
 * CRM Partenaires (CRM_SPEC §5.4). Données minimisées : nom, rôle, contact professionnel.
 * Stockage CC-M1 : fichier local ignoré par Git (lib/sources/partners-store.ts), en attendant S8 (Supabase).
 */
export type PartnerType = "garage" | "obd" | "beta";
export type PartnerStage = 0 | 1 | 2 | 3;

export const PARTNER_STAGES = ["À contacter", "En discussion", "Partenaire actif", "En pause"] as const;
export const PARTNER_TYPES: Record<PartnerType, string> = { garage: "Garage testeur", obd: "Fournisseur OBD", beta: "Bêta-testeur" };
export const PARTNER_OWNERS = ["Johan", "Collègue"] as const;
export const CONSENTS = ["À recueillir", "Recueilli", "Non requis"] as const;
const REF_PREFIX: Record<PartnerType, string> = { garage: "G", obd: "O", beta: "T" };

export interface Partner {
  id: string;
  ref: string;
  type: PartnerType;
  /** organisation ou personne */
  name: string;
  role: string;
  /** contact professionnel uniquement */
  contact: string;
  stage: PartnerStage;
  next: string;
  owner: (typeof PARTNER_OWNERS)[number];
  gear: string;
  consent: (typeof CONSENTS)[number];
  note: string;
  createdAt: string;
  updatedAt: string;
}

const text = (max: number) => z.string().trim().max(max);

// Champs modifiables, sans valeur par défaut (sinon une modification vide paraîtrait valide).
const fields = {
  name: z.string().trim().min(2).max(120),
  role: text(80),
  contact: text(160),
  stage: z.number().int().min(0).max(3),
  next: text(200),
  owner: z.enum(PARTNER_OWNERS),
  gear: text(120),
  consent: z.enum(CONSENTS),
  note: text(2000),
};

export const PartnerInput = z.object({
  type: z.enum(["garage", "obd", "beta"]),
  name: fields.name,
  role: fields.role.default(""),
  contact: fields.contact.default(""),
  stage: fields.stage.default(0),
  next: fields.next.default(""),
  owner: fields.owner.default("Johan"),
  gear: fields.gear.default(""),
  consent: fields.consent.default("À recueillir"),
  note: fields.note.default(""),
});
export type PartnerInput = z.infer<typeof PartnerInput>;

/** Modification partielle : le type (donc la référence) ne change pas ; les clés inconnues sont ignorées. */
export const PartnerPatch = z.object(fields).partial().refine((p) => Object.keys(p).length > 0, "Aucune modification");
export type PartnerPatch = z.infer<typeof PartnerPatch>;

/** Prochaine référence libre par type : G-01, O-02, T-03… (jamais réutilisée après suppression du plus grand numéro). */
export function nextRef(list: Pick<Partner, "ref">[], type: PartnerType): string {
  const prefix = REF_PREFIX[type];
  const max = list.reduce((m, p) => {
    const r = new RegExp(`^${prefix}-(\\d+)$`).exec(p.ref);
    return r ? Math.max(m, Number(r[1])) : m;
  }, 0);
  return `${prefix}-${String(max + 1).padStart(2, "0")}`;
}
