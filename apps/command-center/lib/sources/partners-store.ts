import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { nextRef, type Partner, type PartnerInput, type PartnerPatch } from "@/lib/partners";

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

export function createPartner(input: PartnerInput): Promise<Partner> {
  return serial(async () => {
    const { partners } = await readPartners();
    const now = new Date().toISOString();
    const p: Partner = { ...input, stage: input.stage as Partner["stage"], id: randomUUID(), ref: nextRef(partners, input.type), createdAt: now, updatedAt: now };
    await save([...partners, p]);
    return p;
  });
}

export function updatePartner(id: string, patch: PartnerPatch): Promise<Partner | null> {
  return serial(async () => {
    const { partners } = await readPartners();
    const i = partners.findIndex((p) => p.id === id);
    if (i < 0) return null;
    const p = { ...partners[i]!, ...patch, updatedAt: new Date().toISOString() } as Partner;
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
