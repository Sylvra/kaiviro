"use client";

import { useEffect, useState } from "react";
import { Icon } from "./Icon";

type Theme = "light" | "dark";
const CLE = "nexus-theme";

/** Script exécuté avant le rendu pour éviter un flash de thème. Choix enregistré, sinon préférence système. */
export const SCRIPT_THEME = `(function(){try{var t=localStorage.getItem("${CLE}");if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme="light"}})()`;

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  }, []);

  function basculer() {
    const suivant: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = suivant;
    try {
      localStorage.setItem(CLE, suivant);
    } catch {
      /* stockage indisponible : le choix vaut pour la session */
    }
    setTheme(suivant);
  }

  const sombre = theme === "dark";
  return (
    <button
      type="button"
      onClick={basculer}
      className="btn w-8 justify-center px-0"
      aria-label={sombre ? "Passer en thème clair" : "Passer en thème sombre"}
      title={sombre ? "Thème clair" : "Thème sombre"}
    >
      <Icon nom={sombre ? "sun" : "moon"} taille={15} />
    </button>
  );
}
