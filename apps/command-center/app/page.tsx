import Link from "next/link";
import { Activity } from "@/components/charts/Activity";
import { BurnUp } from "@/components/charts/BurnUp";
import { Icon } from "@/components/Icon";
import { Topbar } from "@/components/Topbar";
import { Bloc, BoutonInactif, Point, Source } from "@/components/ui";
import { ETAT } from "@/lib/etats";
import { aTraiter, activite, missions, plan, sante } from "@/lib/data/exemple";

const SEGMENTS = [
  { cle: "termine", label: "Terminée", fond: "var(--accent)" },
  { cle: "revue", label: "En revue", fond: "var(--accent-2)" },
  { cle: "cours", label: "En cours", fond: "var(--accent-3)" },
  { cle: "afaire", label: "À faire", fond: "var(--todo-fill)", anneau: true },
] as const;

export default function Overview() {
  const fait = plan.termine.at(-1)!;
  const prevuJour = plan.prevu[plan.jourCourant - 1]!;
  const retards = missions.reduce((s, m) => s + m.retard, 0);
  const mesures = sante.filter((s) => s.etat !== "inconnu").length;
  const totalActivite = activite.nombres.reduce((s, n) => s + n, 0);

  return (
    <>
      <Topbar
        miettes={[{ label: "Workspace" }, { label: "Overview" }]}
        actions={
          <>
            <BoutonInactif raison="Agence virtuelle 3D : phase NX-4">Agence 3D</BoutonInactif>
            <BoutonInactif primaire raison="Création indisponible : API d’administration non déployée">
              <Icon nom="plus" taille={13} epaisseur={2.4} />
              Nouveau
            </BoutonInactif>
          </>
        }
      />

      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-6 px-5 pb-12 pt-8 sm:px-9">
        <div className="fade-up flex flex-col gap-1.5">
          <p className="m-0 text-[13px] text-muted">
            J{plan.jourCourant} sur {plan.duree} · {plan.jalon}
          </p>
          <h1 className="m-0 text-[30px] font-bold leading-tight tracking-[-0.025em]">
            M0 avance, <span className="text-muted">mais {retards} tâches ont passé leur fenêtre.</span>
          </h1>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <Bloc
            id="avancement"
            className="fade-up xl:col-span-2"
            titre={
              <span className="flex flex-col gap-0.5">
                Avancement M0
                <span className="flex items-baseline gap-2">
                  <b className="text-[30px] font-bold tracking-[-0.03em]">{fait}</b>
                  <span className="text-sm font-normal text-muted">
                    terminées sur {plan.total} · {prevuJour} prévues à J{plan.jourCourant}
                  </span>
                </span>
              </span>
            }
            action={
              <span className="flex gap-3.5 text-xs text-ink-2">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-0.5 w-4 rounded bg-accent" />
                  Terminées
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-4 border-t-2 border-dashed border-faint" />
                  Prévu
                </span>
              </span>
            }
          >
            <BurnUp prevu={plan.prevu} termine={plan.termine} total={plan.total} jourCourant={plan.jourCourant} />
            <div className="flex flex-wrap justify-between gap-2 text-xs text-muted">
              <span>
                Jalons :{" "}
                {plan.jalons.map((j, i) => (
                  <span key={j.libelle}>
                    {i > 0 && " · "}
                    {j.libelle === plan.jalon ? (
                      <b className="font-semibold text-ink">
                        {j.libelle} {j.fenetre}
                      </b>
                    ) : (
                      `${j.libelle} ${j.fenetre}`
                    )}
                  </span>
                ))}
              </span>
              <Source p={plan.provenance} />
            </div>
          </Bloc>

          <section aria-labelledby="a-traiter" className="card fade-up flex flex-col gap-1.5 px-2.5 pb-2.5 pt-[18px]">
            <div className="flex items-baseline justify-between px-3 pb-1">
              <h2 id="a-traiter" className="m-0 text-[15px] font-semibold">
                À traiter
              </h2>
              <span className="text-xs text-muted">{aTraiter.length} sujets</span>
            </div>
            <ol className="m-0 flex list-none flex-col p-0">
              {aTraiter.map((t) => {
                const contenu = (
                  <>
                    <span className="mt-[5px]">
                      <Point etat={t.etat} taille={8} carre />
                    </span>
                    <span className="flex min-w-0 flex-col gap-px">
                      <span className="text-sm font-semibold tracking-[-0.005em]">
                        <span className="sr-only">{ETAT[t.etat].label} : </span>
                        {t.titre}
                      </span>
                      <span className="truncate text-xs text-muted">{t.detail}</span>
                    </span>
                    {t.href && (
                      <span className="ml-auto mt-0.5 text-faint">
                        <Icon nom="chevronR" taille={14} />
                      </span>
                    )}
                  </>
                );
                const cls = "flex items-start gap-2.5 rounded-[10px] px-3 py-2.5";
                return (
                  <li key={t.titre}>
                    {t.href ? (
                      <Link href={t.href} className={`${cls} row-link`}>
                        {contenu}
                      </Link>
                    ) : (
                      <div className={cls}>{contenu}</div>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          <Bloc id="missions" titre="Par mission" className="fade-up" action={<span className="text-xs text-muted">terminées / total</span>}>
            <ul className="m-0 flex list-none flex-col gap-3.5 p-0">
              {missions.map((m) => {
                const total = m.termine + m.revue + m.cours + m.afaire;
                return (
                  <li key={m.nom} className="flex flex-col gap-1.5">
                    <span className="flex justify-between text-[13px]">
                      <span className="font-semibold">{m.nom}</span>
                      <span className="text-ink-2">
                        <b className="font-semibold text-ink">{m.termine}</b> / {total}
                        {m.retard > 0 && <span className="text-crit-ink"> · {m.retard} en retard</span>}
                      </span>
                    </span>
                    <span
                      role="img"
                      aria-label={`${m.nom} : ${m.termine} terminées, ${m.revue} en revue, ${m.cours} en cours, ${m.afaire} à faire`}
                      className="flex h-2.5 gap-0.5"
                    >
                      {SEGMENTS.filter((s) => m[s.cle] > 0).map((s) => (
                        <span
                          key={s.cle}
                          className="rounded-[3px]"
                          style={{
                            flex: m[s.cle],
                            background: s.fond,
                            boxShadow: "anneau" in s ? "inset 0 0 0 1px var(--line-strong)" : undefined,
                          }}
                        />
                      ))}
                    </span>
                  </li>
                );
              })}
            </ul>
            <div className="flex flex-wrap gap-3 text-[11px] text-ink-2">
              {SEGMENTS.map((s) => (
                <span key={s.cle} className="inline-flex items-center gap-1.5">
                  <span
                    className="size-2 rounded-[2px]"
                    style={{ background: s.fond, boxShadow: "anneau" in s ? "inset 0 0 0 1px var(--line-strong)" : undefined }}
                  />
                  {s.label}
                </span>
              ))}
            </div>
          </Bloc>

          <Bloc
            id="activite"
            titre="Activité, 14 jours"
            className="fade-up"
            action={
              <span className="text-xs text-muted">
                <b className="font-semibold text-ink">{totalActivite}</b> événements
              </span>
            }
          >
            <Activity jours={activite.jours} nombres={activite.nombres} indexJ1={activite.indexJ1} />
            <Source p={activite.provenance} />
          </Bloc>

          <Bloc
            id="infrastructure"
            titre="Infrastructure"
            className="fade-up md:col-span-2 xl:col-span-1"
            action={
              <Link href="/infrastructure/carte" className="link text-xs">
                Carte
              </Link>
            }
          >
            <div role="img" aria-label={`${mesures} source mesurée, ${sante.length - mesures} sans mesure`} className="flex h-2.5 gap-0.5">
              <span className="rounded-[3px]" style={{ flex: mesures, background: "var(--ok)" }} />
              <span className="hatch rounded-[3px]" style={{ flex: sante.length - mesures }} />
            </div>
            <ul className="m-0 -mt-1 flex list-none flex-col p-0">
              {sante.map((s) => (
                <li key={s.nom} className="flex items-center gap-2.5 border-b border-grid py-[7px] text-[13px] last:border-0">
                  <Point etat={s.etat} />
                  <span className="flex-1">{s.nom}</span>
                  <span className="text-xs font-medium" style={{ color: ETAT[s.etat].ink }}>
                    {s.libelle}
                  </span>
                </li>
              ))}
            </ul>
            <span className="text-xs text-muted">
              {mesures} source mesurée sur {sante.length} · exemple · rien n’est supposé sain
            </span>
          </Bloc>
        </div>
      </div>
    </>
  );
}
