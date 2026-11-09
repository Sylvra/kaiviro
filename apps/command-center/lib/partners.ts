import { z } from "zod";

/**
 * CRM Partenaires (CRM_SPEC §5.4). Données minimisées : nom, rôle, contact professionnel.
 * Stockage CC-M1 : fichier local ignoré par Git (lib/sources/partners-store.ts), en attendant S8 (Supabase).
 */
export type PartnerType = "garage" | "obd" | "beta";
export type PartnerStage = 0 | 1 | 2 | 3 | 4;

/** Étapes du pipeline (CRM_SPEC §5.4) ; « Clos » ouvre le délai de conservation (§5.8). */
export const PARTNER_STAGES = ["À contacter", "En discussion", "Partenaire actif", "En pause", "Clos"] as const;
export const PARTNER_TYPES: Record<PartnerType, string> = { garage: "Garage testeur", obd: "Fournisseur OBD", beta: "Bêta-testeur" };
export const PARTNER_OWNERS = ["Johan", "Collègue"] as const;
export const CONSENTS = ["À recueillir", "Recueilli", "Non requis", "Retiré"] as const;
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
  stage: z.number().int().min(0).max(4),
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

/** Fichier complet (stockage, sauvegarde, import) : validé avant tout remplacement. */
export const StoredPartners = z.object({
  version: z.literal(1).optional(),
  partners: z.array(z.object({
    id: z.string().min(1).max(64),
    ref: z.string().regex(/^[GOT]-\d{2,}$/),
    type: z.enum(["garage", "obd", "beta"]),
    ...fields,
    due: fields.due.optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    events: z.array(z.object({ id: z.string(), at: z.string(), kind: z.enum(["created", "stage", "due", "edit", "appel", "email", "rdv", "note"]), text: z.string().max(1000) })).optional(),
  })).refine((l) => new Set(l.map((p) => p.id)).size === l.length, "Identifiants en double")
    .refine((l) => new Set(l.map((p) => p.ref)).size === l.length, "Références en double"),
});

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

// ---------- Contrat API (packages/api-contracts/admin/openapi.yaml, schéma Partner) ----------
// Le stockage local garde le format interne (export, sauvegardes, import). L'API parle le format du contrat.

export const STAGE_API = ["to_contact", "in_discussion", "active", "paused", "closed"] as const;
export type ApiStage = (typeof STAGE_API)[number];
type Consent = (typeof CONSENTS)[number];
export const TYPE_API = { garage: "garage", obd: "obd_supplier", beta: "beta_tester" } as const satisfies Record<PartnerType, string>;
export type ApiPartnerType = (typeof TYPE_API)[PartnerType];
export const CONSENT_API = { "À recueillir": "pending", Recueilli: "granted", "Non requis": "not_required", Retiré: "withdrawn" } as const satisfies Record<Consent, string>;
export type ApiConsent = (typeof CONSENT_API)[Consent];
const invert = <K extends string, V extends string>(o: Record<K, V>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [v, k])) as Record<V, K>;
const TYPE_FROM_API = invert<PartnerType, ApiPartnerType>(TYPE_API);
const CONSENT_FROM_API = invert<Consent, ApiConsent>(CONSENT_API);

export interface ApiPartner {
  id: string;
  ref: string;
  type: ApiPartnerType;
  name: string;
  role: string;
  contact: string;
  stage: ApiStage;
  next_action: string;
  due_on: string | null;
  owner_name: string;
  owner_admin_id: string | null;
  equipment: string;
  consent_status: ApiConsent;
  notes: string;
  created_at: string;
  updated_at: string;
  events: PartnerEvent[];
}

export function partnerToApi(p: Partner): ApiPartner {
  return {
    id: p.id, ref: p.ref, type: TYPE_API[p.type], name: p.name, role: p.role, contact: p.contact,
    stage: STAGE_API[p.stage], next_action: p.next, due_on: p.due || null, owner_name: p.owner, owner_admin_id: null,
    equipment: p.gear, consent_status: CONSENT_API[p.consent], notes: p.note, created_at: p.createdAt, updated_at: p.updatedAt, events: p.events ?? [],
  };
}

export function partnerFromApi(a: ApiPartner): Partner {
  return {
    id: a.id, ref: a.ref, type: TYPE_FROM_API[a.type], name: a.name, role: a.role, contact: a.contact,
    stage: STAGE_API.indexOf(a.stage) as PartnerStage, next: a.next_action, due: a.due_on ?? "", owner: a.owner_name as Partner["owner"],
    gear: a.equipment, consent: CONSENT_FROM_API[a.consent_status], note: a.notes, createdAt: a.created_at, updatedAt: a.updated_at, events: a.events,
  };
}

const same = (v: unknown) => v;
const lookup = (table: Record<string, unknown>) => (v: unknown) => (typeof v === "string" && v in table ? table[v] : v);

/** Champs du contrat → champs internes. Une valeur inconnue passe telle quelle : la validation zod la refuse ensuite. */
const BODY_FROM_API: Record<string, [string, (v: unknown) => unknown]> = {
  type: ["type", lookup(TYPE_FROM_API)],
  name: ["name", same],
  role: ["role", same],
  contact: ["contact", same],
  stage: ["stage", (v) => { const i = STAGE_API.indexOf(v as ApiStage); return i >= 0 ? i : v; }],
  next_action: ["next", same],
  due_on: ["due", (v) => v ?? ""],
  owner_name: ["owner", same],
  equipment: ["gear", same],
  consent_status: ["consent", lookup(CONSENT_FROM_API)],
  notes: ["note", same],
};

/** Corps de requête (création ou modification) au format du contrat → champs internes. Les autres clés sont ignorées. */
export function partnerBodyFromApi(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    const m = BODY_FROM_API[k];
    if (m) out[m[0]] = m[1](v);
  }
  return out;
}

const BODY_TO_API: Record<string, [string, (v: unknown) => unknown]> = {
  type: ["type", lookup(TYPE_API)],
  stage: ["stage", (v) => (typeof v === "number" ? STAGE_API[v] ?? v : v)],
  next: ["next_action", same],
  due: ["due_on", (v) => (v === "" ? null : v)],
  owner: ["owner_name", same],
  gear: ["equipment", same],
  consent: ["consent_status", lookup(CONSENT_API)],
  note: ["notes", same],
};

/** Inverse, pour le navigateur : champs internes → contrat. Les clés hors fiche (reason, confirm, kind…) sont conservées. */
export function partnerBodyToApi(body: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(body).map(([k, v]) => (BODY_TO_API[k] ? [BODY_TO_API[k][0], BODY_TO_API[k][1](v)] : [k, v])));
}

// ---------- Conservation (CRM_SPEC §5.8, durées proposées, à valider par les humains) ----------

export interface RetentionAlert { id: string; ref: string; name: string; reason: string; due: string; overdue: boolean }

function addYears(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() + n);
  return d.toISOString().slice(0, 10);
}

/** Date (AAAA-MM-JJ) du dernier événement qui correspond, sinon la date de repli. */
function lastEventDay(p: Partner, match: (e: PartnerEvent) => boolean, fallback: string): string {
  return ([...(p.events ?? [])].reverse().find(match)?.at ?? fallback).slice(0, 10);
}

/**
 * Fiches à supprimer ou anonymiser dans les `horizonDays` prochains jours (ou déjà en retard).
 * N'efface rien : la suppression reste une action N3 d'un humain.
 */
export function retentionAlerts(partners: Partner[], today: string, horizonDays = 14): RetentionAlert[] {
  const out: RetentionAlert[] = [];
  for (const p of partners) {
    let due: string | null = null;
    let reason = "";
    if (p.stage === 4) {
      due = addYears(lastEventDay(p, (e) => e.kind === "stage" && e.text.endsWith(`→ ${PARTNER_STAGES[4]}`), p.updatedAt), 3);
      reason = "Relation close : supprimer ou anonymiser 3 ans après la clôture";
    } else if (p.type === "beta" && p.consent === "Retiré") {
      due = addDays(lastEventDay(p, (e) => e.kind === "edit" && e.text.includes("consentement"), p.updatedAt), 30);
      reason = "Consentement retiré : supprimer sous 30 jours";
    } else if (p.type === "beta" && p.consent === "À recueillir") {
      due = addDays(p.createdAt.slice(0, 10), 30);
      reason = "Consentement non recueilli : supprimer 30 jours après la création";
    }
    if (due && due <= addDays(today, horizonDays)) out.push({ id: p.id, ref: p.ref, name: p.name, reason, due, overdue: due <= today });
  }
  return out.sort((a, b) => a.due.localeCompare(b.due));
}
