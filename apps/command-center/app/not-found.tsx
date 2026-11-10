import Link from "next/link";
import { Topbar } from "@/components/Topbar";

export default function Introuvable() {
  return (
    <>
      <Topbar miettes={[{ label: "Introuvable" }]} />
      <div className="mx-auto flex max-w-md flex-col items-start gap-3 px-6 py-24">
        <p className="m-0 font-mono text-xs text-muted">404</p>
        <h1 className="m-0 text-[22px] font-bold tracking-[-0.02em]">Cette fiche n’existe pas.</h1>
        <p className="m-0 text-[13px] text-ink-2">L’objet a peut-être été renommé, ou il n’est pas encore saisi dans NEXUS.</p>
        <Link href="/" className="btn btn-primary mt-2">
          Retour à l’Overview
        </Link>
      </div>
    </>
  );
}
