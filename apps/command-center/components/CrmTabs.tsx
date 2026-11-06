"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { cx } from "./ui";

const TABS = [
  { href: "/crm/apercu", label: "Vue d’ensemble", dot: "bg-ink" },
  { href: "/crm/tableau", label: "Tableau", dot: "bg-coral-dot" },
  { href: "/crm/planning", label: "Planning", dot: "bg-amber-dot" },
  { href: "/crm/equipe", label: "Équipe", dot: "bg-mint-dot" },
  { href: "/crm/partenaires", label: "Partenaires", dot: "bg-sky-dot" },
  { href: "/crm/decisions", label: "Décisions", dot: "bg-lav-dot" },
];

export function CrmTabs({ decisionsOpen }: { decisionsOpen: number }) {
  const path = usePathname() ?? "";
  return (
    <nav aria-label="Vues du CRM" className="flex flex-wrap gap-x-6 border-b border-line-soft">
      {TABS.map((t) => {
        const on = path.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} aria-current={on ? "page" : undefined} className={cx("relative inline-flex h-[42px] items-center gap-2 px-0.5 text-[13px] transition-colors", on ? "font-semibold text-ink" : "font-medium text-ink-3 hover:text-ink")}>
            <span aria-hidden className={cx("size-[7px] rounded-[2px]", on ? t.dot : "bg-[#d9d3ca]")} />
            {t.label}
            {t.href.endsWith("decisions") && decisionsOpen > 0 && (
              <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-coral-dot px-1 text-[11px] font-semibold text-white">{decisionsOpen}</span>
            )}
            {on && <motion.span layoutId="crm-tab" className="absolute -inset-x-1 -bottom-px h-[2.5px] rounded bg-ink" transition={{ type: "spring", stiffness: 520, damping: 36 }} />}
          </Link>
        );
      })}
    </nav>
  );
}
