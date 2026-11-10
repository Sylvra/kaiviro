/** Géométrie SVG pure, sans dépendance. Toutes les fonctions sont testées (charts.test.ts). */

export interface Cadre {
  largeur: number;
  hauteur: number;
  gauche: number;
  droite: number;
  haut: number;
  bas: number;
}

export function echelle(d0: number, d1: number, r0: number, r1: number) {
  const span = d1 - d0 || 1;
  return (v: number) => r0 + ((v - d0) / span) * (r1 - r0);
}

const arrondi = (n: number) => Math.round(n * 10) / 10;

/** Points « x,y » d'une série posée sur un cadre ; max donne le haut de l'axe. */
export function points(valeurs: number[], cadre: Cadre, max: number, nbPas = valeurs.length): [number, number][] {
  const x = echelle(0, Math.max(nbPas - 1, 1), cadre.gauche, cadre.largeur - cadre.droite);
  const y = echelle(0, max, cadre.hauteur - cadre.bas, cadre.haut);
  return valeurs.map((v, i) => [arrondi(x(i)), arrondi(y(v))]);
}

export function polyligne(pts: [number, number][]): string {
  return pts.map(([x, y]) => `${x},${y}`).join(" ");
}

/** Aire fermée sous une série, jusqu'à la ligne de base. */
export function aire(pts: [number, number][], base: number): string {
  if (pts.length === 0) return "";
  const [x0] = pts[0]!;
  const [xn] = pts[pts.length - 1]!;
  return `M${x0} ${base} ${pts.map(([x, y]) => `L${x} ${y}`).join(" ")} L${xn} ${base} Z`;
}

/** Index de la colonne la plus proche d'une abscisse, borné à [0, n - 1]. */
export function indexProche(x: number, cadre: Cadre, n: number): number {
  if (n <= 1) return 0;
  const pas = (cadre.largeur - cadre.gauche - cadre.droite) / (n - 1);
  const i = Math.round((x - cadre.gauche) / pas);
  return Math.min(n - 1, Math.max(0, i));
}

/** Graduations régulières de 0 à max. */
export function graduations(max: number, nb: number): number[] {
  return Array.from({ length: nb + 1 }, (_, i) => Math.round((max / nb) * i));
}
