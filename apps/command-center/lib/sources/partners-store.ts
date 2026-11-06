import "server-only";
import { randomUUID } from "node:crypto";
import { copyFile, mkdir, readFile, readdir, rename, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { PARTNER_STAGES, StoredPartners, diffEvents, nextRef, type InteractionInput, type Partner, type PartnerEvent, type PartnerInput, type PartnerPatch } from "@/lib/partners";

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

/** Dossier des instantanés : PARTNERS_BACKUP_DIR (autre disque possible) ou data/backups à côté du fichier. */
export const backupsDir = () => process.env.PARTNERS_BACKUP_DIR?.trim() || path.join(path.dirname(partnersFile()), "backups");
export const MAX_BACKUPS = 30;
const BACKUP_NAME = /^partners-\d{8}-\d{6}-\d{3}\.json$/;

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace("T", "-").replace(".", "-").slice(0, 19);

/** Copie l'état actuel dans le dossier des instantanés, puis ne garde que les MAX_BACKUPS plus récents. */
async function snapshot() {
  const file = partnersFile();
  const dir = backupsDir();
  await mkdir(dir, { recursive: true });
  try {
    await copyFile(file, path.join(dir, `partners-${stamp(new Date())}.json`));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return; // rien à sauvegarder avant la première écriture
    throw e;
  }
  const names = (await readdir(dir)).filter((n) => BACKUP_NAME.test(n)).sort();
  await Promise.all(names.slice(0, Math.max(0, names.length - MAX_BACKUPS)).map((n) => unlink(path.join(dir, n))));
}

/** Écriture atomique (fichier temporaire puis renommage), précédée d'un instantané de l'état actuel. */
async function save(partners: Partner[]) {
  const file = partnersFile();
  await mkdir(path.dirname(file), { recursive: true });
  await snapshot();
  const tmp = `${file}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify({ version: 1, partners } satisfies FileShape, null, 2), "utf8");
  await rename(tmp, file);
}

export interface BackupInfo { name: string; at: string; count: number | null; size: number }

/** Instantanés, du plus récent au plus ancien. count = null si le fichier est illisible. */
export async function listBackups(): Promise<BackupInfo[]> {
  const dir = backupsDir();
  let names: string[];
  try {
    names = (await readdir(dir)).filter((n) => BACKUP_NAME.test(n)).sort().reverse();
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw e;
  }
  return Promise.all(names.map(async (name) => {
    const full = path.join(dir, name);
    const [raw, st] = await Promise.all([readFile(full, "utf8").catch(() => ""), stat(full)]);
    const parsed = StoredPartners.safeParse((() => { try { return JSON.parse(raw); } catch { return null; } })());
    const m = /^partners-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})-(\d{3})/.exec(name)!;
    return { name, at: `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}.${m[7]}Z`, count: parsed.success ? parsed.data.partners.length : null, size: st.size };
  }));
}

/** Contenu brut d'un instantané (nom vérifié : aucun chemin accepté). */
export async function readBackup(name: string): Promise<string | null> {
  if (!BACKUP_NAME.test(name)) return null;
  return readFile(path.join(backupsDir(), name), "utf8").catch(() => null);
}

export type ReplaceResult = { ok: true; count: number } | { ok: false; reason: string };

/** Remplace toutes les fiches par un contenu validé. L'état actuel est d'abord sauvegardé (save → snapshot). */
function replaceAll(data: unknown): Promise<ReplaceResult> {
  const parsed = StoredPartners.safeParse(data);
  if (!parsed.success) return Promise.resolve({ ok: false, reason: parsed.error.issues.map((i) => `${i.path.join(".")} : ${i.message}`).slice(0, 3).join(" · ") });
  return serial(async () => {
    await save(parsed.data.partners as Partner[]);
    return { ok: true as const, count: parsed.data.partners.length };
  });
}

export async function restoreBackup(name: string): Promise<ReplaceResult> {
  const raw = await readBackup(name);
  if (raw === null) return { ok: false, reason: "Sauvegarde introuvable." };
  try { return await replaceAll(JSON.parse(raw)); } catch { return { ok: false, reason: "Sauvegarde illisible." }; }
}

/** Import d'un fichier exporté ({ partners: [...] }) : remplace tout, après validation. */
export const importPartners = (data: unknown) => replaceAll(data);

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
