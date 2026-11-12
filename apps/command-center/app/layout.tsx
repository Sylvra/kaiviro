import type { Metadata } from "next";
import { Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { SCRIPT_THEME } from "@/components/ThemeToggle";
import { chargerTableau } from "@/lib/donnees";

// Polices sous licence SIL OFL, auto-hébergées par next/font au build (aucune requête vers Google à l'exécution).
const hanken = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-hanken", display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });

export const metadata: Metadata = {
  title: { default: "KAIVIRO NEXUS", template: "%s · NEXUS" },
  description: "Plateforme d’opérations KAIVIRO : projet, infrastructure, administration.",
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { taches } = await chargerTableau();
  return (
    <html lang="fr" className={`${hanken.variable} ${jetbrains.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_THEME }} />
      </head>
      <body className="min-h-dvh bg-canvas text-ink">
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2"
        >
          Aller au contenu
        </a>
        <div className="flex min-h-dvh flex-col lg:flex-row">
          <Sidebar taches={taches.map(({ id, titre }) => ({ id, titre }))} />
          <div id="contenu" className="flex min-w-0 flex-1 flex-col border-line bg-main lg:border-l">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
