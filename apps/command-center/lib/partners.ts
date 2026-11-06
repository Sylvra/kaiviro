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
  /** date de relance AAAA-MM-JJ, "" si aucune (absente des fiches créées avant les relances) */
  due?: string;
  owner: (typeof PARTNER_OWNERS)[number];
  gear: string;
  consent: (typeof CONSENTS)[number];
  note: string;
  createdAt: string;
  updatedAt: string;
  /** historique, du plus ancien au plus récent (absent des fiches créées avant l'historique) */
  events?: PartnerEvent[];
}

/** Événement d'historique (CRM_SPEC : admin.partner_events). Les modifications ne notent que les noms de champs. */
export type EventKind = "created" | "stage" | "due" | "edit" | "appel" | "email" | "rdv" | "note";
export interface PartnerEvent { id: string; at: string; kind: EventKind; text: string }

export const INTERACTIONS = { appel: "Appel", email: "E-mail", rdv: "Rendez-vous", note: "Note" } as const;
export const EVENT_LABEL: Record<EventKind, string> = { created: "Création", stage: "Étape", due: "Relance", edit: "Modification", ...INTERACTIONS };

export const InteractionInput = z.object({
  kind: z.enum(["appel", "email", "rdv", "note"]),
  text: z.string().trim().min(1).max(1000),
  /** jour de l'interaction, AAAA-MM-JJ ; par défaut maintenant */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
export type InteractionInput = z.infer<typeof InteractionInput>;

const FIELD_LABEL: Partial<Record<keyof Partner, string>> = {
  name: "nom", role: "rôle", contact: "contact", next: "prochaine action", owner: "responsable", gear: "matériel", consent: "consentement", note: "note",
};

const frDay = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" });

/** Événements automatiques entre deux versions d'une fiche (sans id ni date : ajoutés par le stockage). */
export function diffEvents(before: Partner, after: Partner): Omit<PartnerEvent, "id" | "at">[] {
  const out: Omit<PartnerEvent, "id" | "at">[] = [];
  if (before.stage !== after.stage) out.push({ kind: "stage", text: `${PARTNER_STAGES[before.stage]} → ${PARTNER_STAGES[after.stage]}` });
  const b = before.due ?? "", a = after.due ?? "";
  if (b !== a) out.push({ kind: "due", text: !a ? "Relance faite" : !b ? `Relance prévue le ${frDay(a)}` : `Relance reportée au ${frDay(a)}` });
  const changed = (Object.keys(FIELD_LABEL) as (keyof Partner)[]).filter((k) => (before[k] ?? "") !== (after[k] ?? ""));
  if (changed.length) out.push({ kind: "edit", text: `Champs modifiés : ${changed.map((k) => FIELD_LABEL[k]).join(", ")}` });
  return out;
}

const text = (max: number) => z.string().trim().max(max);

// Champs modifiables, sans valeur par défaut (sinon une modification vide paraîtrait valide).
const fields = {
  name: z.string().trim().min(2).max(120),
  role: text(80),
  contact: text(160),
  stage: z.number().int().min(0).max(3),
  next: text(200),
  due: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date de relance au format AAAA-MM-JJ").refine((d) => !Number.isNaN(Date.parse(d)), "Date de relance invalide")]),
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
  due: fields.due.default(""),
  owner: fields.owner.default("Johan"),
  gear: fields.gear.default(""),
  consent: fields.consent.default("À recueillir"),
  note: fields.note.default(""),
});
export type PartnerInput = z.infer<typeof PartnerInput>;

/** Modification partielle : le type (donc la référence) ne change pas ; les clés inconnues sont ignorées. */
export const PartnerPatch = z.object(fields).partial().refine((p) => Object.keys(p).length > 0, "Aucune modification");
export type PartnerPatch = z.infer<typeof PartnerPatch>;

export type DueState = "overdue" | "today" | "soon" | "later" | "none";

/** Position d'une relance par rapport à aujourd'hui (dates AAAA-MM-JJ). « soon » : dans les 7 jours. */
export function dueState(due: string | undefined, today: string): DueState {
  if (!due) return "none";
  if (due < today) return "overdue";
  if (due === today) return "today";
  return due <= addDays(today, 7) ? "soon" : "later";
}

export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Relances triées par date : en retard, aujourd'hui, 7 prochains jours. */
export function followUps(partners: Partner[], today: string) {
  const by = (s: DueState) => partners.filter((p) => dueState(p.due, today) === s).sort((a, b) => (a.due ?? "").localeCompare(b.due ?? ""));
  return { overdue: by("overdue"), today: by("today"), soon: by("soon") };
}

/** Prochaine référence libre par type : G-01, O-02, T-03… (jamais réutilisée après suppression du plus grand numéro). */
export function nextRef(list: Pick<Partner, "ref">[], type: PartnerType): string {
  const prefix = REF_PREFIX[type];
  const max = list.reduce((m, p) => {
    const r = new RegExp(`^${prefix}-(\\d+)$`).exec(p.ref);
    return r ? Math.max(m, Number(r[1])) : m;
  }, 0);
  return `${prefix}-${String(max + 1).padStart(2, "0")}`;
}
