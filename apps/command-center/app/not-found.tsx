import Link from "next/link";
export default function NotFound() {
  return (
    <div className="grid flex-1 place-items-center p-10 text-center">
      <div className="flex flex-col items-center gap-3">
        <h1 className="text-2xl font-bold">Page introuvable</h1>
        <Link href="/crm/tableau" className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white">Retour au Command Center</Link>
      </div>
    </div>
  );
}
