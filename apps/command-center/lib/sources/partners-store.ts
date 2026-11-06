import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { PARTNER_STAGES, diffEvents, nextRef, type InteractionInput, type Partner, type PartnerEvent, type PartnerInput, type PartnerPatch } from "@/lib/partners";

/**
 * Stockage local des partenaires : un fichier JSON sur le poste de l'administrateur, ignoré par Git.
 * Données personnelles minimisées (CRM_SPEC §5.4) : jamais commitées, jamais envoyées à GitHub.
 * Remplaçable par S8 (Supabase) sans changer l'API.
 */
interface FileShape { version: 1; partners: Partner[] }

export const partnersFile = () => process.env.PARTNERS_FILE?.trim() || path.join(process.cwd(), "data", "partners.json");

export async function readPartners(): Promise<{ partners: Partner[]; exists: boolean }> {
  try {
    const raw = JSON.parse(await readFile(partnersFile(), "utf8")) as FileShape;
    if (raw?.version !== 1 || !Array.isArray(raw.partners)) throw new Error("format inattendu");
    return { partners: raw.partners, exists: true };
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return { partners: [], exists: false };
    throw e;
  }
}

/** Écriture atomique (fichier temporaire puis renommage). */
async function save(partners: Partner[]) {
  const file = partnersFile();
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify({ version: 1, partners } satisfies FileShape, null, 2), "utf8");
  await rename(tmp, file);
}

// Les écritures passent l'une après l'autre : pas de perte si deux requêtes arrivent ensemble.
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(job: () => Promise<T>): Promise<T> {
  const run = queue.then(job, job);
  queue = run.catch(() => undefined);
  return run;
}

const event = (e: Omit<PartnerEvent, "id" | "at">, at: string): PartnerEvent => ({ id: randomUUID(), at, ...e });

export function createPartner(input: PartnerInput): Promise<Partner> {
  return serial(async () => {
    const { partners } = await readPartners();
    const now = new Date().toISOString();
    const p: Partner = {
      ...input, stage: input.stage as Partner["stage"], id: randomUUID(), ref: nextRef(partners, input.type), createdAt: now, updatedAt: now,
      events: [event({ kind: "created", text: `Fiche créée · ${PARTNER_STAGES[input.stage as Partner["stage"]]}` }, now)],
    };
    await save([...partners, p]);
    return p;
  });
}

/** Modifie une fiche et ajoute à son historique ce qui a changé (étape, relance, noms de champs). */
export function updatePartner(id: string, patch: PartnerPatch): Promise<Partner | null> {
  return serial(async () => {
    const { partners } = await readPartners();
    const i = partners.findIndex((p) => p.id === id);
    if (i < 0) return null;
    const before = partners[i]!;
    const now = new Date().toISOString();
    const next = { ...before, ...patch, updatedAt: now } as Partner;
    const added = diffEvents(before, next).map((e) => event(e, now));
    const p: Partner = { ...next, events: [...(before.events ?? []), ...added] };
    await save(partners.map((x, j) => (j === i ? p : x)));
    return p;
  });
}

/** Interaction saisie à la main (appel, e-mail, rendez-vous, note). Une date passée est datée à midi. */
export function addInteraction(id: string, input: InteractionInput): Promise<Partner | null> {
  return serial(async () => {
    const { partners } = await readPartners();
    const i = partners.findIndex((p) => p.id === id);
    if (i < 0) return null;
    const now = new Date().toISOString();
    const at = input.date && input.date !== now.slice(0, 10) ? `${input.date}T12:00:00.000Z` : now;
    const before = partners[i]!;
    const events = [...(before.events ?? []), event({ kind: input.kind, text: input.text }, at)].sort((a, b) => a.at.localeCompare(b.at));
    const p: Partner = { ...before, events, updatedAt: now };
    await save(partners.map((x, j) => (j === i ? p : x)));
    return p;
  });
}

export function deletePartner(id: string): Promise<boolean> {
  return serial(async () => {
    const { partners } = await readPartners();
    const rest = partners.filter((p) => p.id !== id);
    if (rest.length === partners.length) return false;
    await save(rest);
    return true;
  });
}
