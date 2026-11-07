/**
 * Journal d'activité : flux GitHub du dépôt (S1) + historique des partenaires (fichier local).
 * Chaque entrée garde sa source ; rien n'est inventé ni extrapolé.
 */
export type LogSource = "GitHub" | "Partenaires";

export interface LogEntry {
  id: string;
  at: string;
  source: LogSource;
  /** catégorie courte affichée en étiquette */
  kind: string;
  actor: string;
  text: string;
  url?: string;
}

/** Événement du flux /repos/{r}/events (champs utilisés seulement). */
export interface GhRepoEvent {
  id: string;
  type: string;
  created_at: string;
  actor: { login: string } | null;
  payload: {
    action?: string;
    ref?: string;
    ref_type?: string;
    size?: number;
    commits?: { message: string }[];
    issue?: { number: number; title: string; html_url: string; pull_request?: unknown };
    pull_request?: { number: number; title: string; html_url: string; merged?: boolean };
    comment?: { html_url: string };
    label?: { name: string };
  };
}

const ACTIONS: Record<string, string> = { opened: "ouverte", closed: "fermée", reopened: "rouverte", labeled: "étiquetée", unlabeled: "désétiquetée", edited: "modifiée" };

/** Convertit un événement GitHub en entrée de journal, ou null s'il n'apporte rien à suivre. */
export function mapRepoEvent(e: GhRepoEvent): LogEntry | null {
  const base = { id: `gh-${e.id}`, at: e.created_at, source: "GitHub" as const, actor: e.actor?.login ?? "inconnu" };
  const p = e.payload;
  switch (e.type) {
    case "PushEvent": {
      const branch = (p.ref ?? "").replace("refs/heads/", "");
      const n = p.size ?? p.commits?.length ?? 0;
      const first = p.commits?.[p.commits.length - 1]?.message.split("\n")[0];
      return { ...base, kind: "Push", text: `${n} commit${n > 1 ? "s" : ""} sur ${branch}${first ? ` · ${first}` : ""}` };
    }
    case "PullRequestEvent": {
      if (!p.pull_request) return null;
      const verb = p.action === "closed" && p.pull_request.merged ? "fusionnée" : ACTIONS[p.action ?? ""] ?? p.action;
      return { ...base, kind: "PR", text: `PR #${p.pull_request.number} ${verb} · ${p.pull_request.title}`, url: p.pull_request.html_url };
    }
    case "IssuesEvent": {
      if (!p.issue || !["opened", "closed", "reopened"].includes(p.action ?? "")) return null;
      return { ...base, kind: "Issue", text: `#${p.issue.number} ${ACTIONS[p.action!]} · ${p.issue.title}`, url: p.issue.html_url };
    }
    case "IssueCommentEvent": {
      if (!p.issue) return null;
      return { ...base, kind: "Commentaire", text: `Sur #${p.issue.number} · ${p.issue.title}`, url: p.comment?.html_url ?? p.issue.html_url };
    }
    case "CreateEvent":
      return p.ref_type === "branch" ? { ...base, kind: "Branche", text: `Branche créée · ${p.ref}` } : null;
    case "DeleteEvent":
      return p.ref_type === "branch" ? { ...base, kind: "Branche", text: `Branche supprimée · ${p.ref}` } : null;
    default:
      return null;
  }
}

/** Fusionne et trie du plus récent au plus ancien. */
export function mergeLog(lists: LogEntry[][], limit = 60): LogEntry[] {
  return lists.flat().sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}
