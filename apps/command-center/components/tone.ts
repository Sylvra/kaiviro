import type { Tone } from "@/lib/data/ops";
import type { Owner } from "@/lib/data/plan";

export const TONE: Record<Tone, { bg: string; ink: string; dot: string }> = {
  mint: { bg: "bg-mint-bg", ink: "text-mint-ink", dot: "bg-mint-dot" },
  lavender: { bg: "bg-lav-bg", ink: "text-lav-ink", dot: "bg-lav-dot" },
  coral: { bg: "bg-coral-bg", ink: "text-coral-ink", dot: "bg-coral-dot" },
  amber: { bg: "bg-amber-bg", ink: "text-amber-ink", dot: "bg-amber-dot" },
  sky: { bg: "bg-sky-bg", ink: "text-sky-ink", dot: "bg-sky-dot" },
  red: { bg: "bg-red-bg", ink: "text-red-ink", dot: "bg-red-dot" },
  neutral: { bg: "bg-neutral-bg", ink: "text-neutral-ink", dot: "bg-neutral-dot" },
};

export const OWNER_TONE: Record<Owner, Tone> = { A: "mint", B: "lavender", C: "coral", H: "amber" };
export const OWNER_LABEL: Record<Owner, string> = { A: "Mission A", B: "Mission B", C: "Commun", H: "Humains" };
export const OWNER_INITIALS: Record<Owner, string> = { A: "JB", B: "B", C: "2", H: "H" };
