// Logo « rayon en construction » : sept alvéoles plus ou moins remplies de
// miel, la dernière encore vide (une colonie qui grandit). À 16 px il devient
// une tache : le favicon en garde une version réduite à trois alvéoles.
// Source unique du composant LogoMark et de scripts/generate-icons.mjs, qui
// produit le favicon, l'icône Apple et les icônes du manifest
// (`npm run icons` après toute modification).

// Couleurs du miel, reprises de globals.css (honey, honey-dark), plus une
// teinte claire propre au logo.
export const logoColors = {
  honey: "#d99a2b",
  honeyDark: "#c0841c",
  honeyLight: "#ecc77a",
  cream: "#faf7f0",
} as const;

// Alvéole pleine (fill) ou vide (fill: null, contour seul).
export type LogoCell = { x: number; y: number; fill: string | null };

export type LogoShape = {
  // Rayon des alvéoles sur une grille de 64 × 64.
  radius: number;
  // Contour de la couleur de remplissage, qui arrondit les angles.
  fillStroke: number;
  // Épaisseur du contour d'une alvéole vide.
  outlineStroke: number;
  cells: LogoCell[];
};

const SIN_60 = Math.sqrt(3) / 2;

// Hexagone pointe en haut, centré en (x, y), de rayon r.
export function hexagonPath(x: number, y: number, r: number): string {
  const points = [];
  for (let i = 0; i < 6; i++) {
    const angle = ((-90 + i * 60) * Math.PI) / 180;
    const px = Math.round((x + r * Math.cos(angle)) * 100) / 100;
    const py = Math.round((y + r * Math.sin(angle)) * 100) / 100;
    points.push(`${px} ${py}`);
  }
  return `M${points.join(" ")}Z`;
}

function rayon(): LogoShape {
  const step = 19.6;
  const row = step * SIN_60;
  const { honey, honeyDark, honeyLight } = logoColors;
  return {
    radius: 9.2,
    fillStroke: 2.4,
    outlineStroke: 2.4,
    cells: [
      { x: 32, y: 32, fill: honeyDark },
      { x: 32 - step, y: 32, fill: honey },
      { x: 32 + step, y: 32, fill: honeyLight },
      { x: 32 - step / 2, y: 32 - row, fill: honey },
      { x: 32 + step / 2, y: 32 - row, fill: honey },
      { x: 32 - step / 2, y: 32 + row, fill: honeyLight },
      { x: 32 + step / 2, y: 32 + row, fill: null },
    ],
  };
}

// Trois alvéoles plus grandes et plus espacées, lisibles dans un onglet.
function rayonReduit(): LogoShape {
  const step = 33.9;
  const top = 32 - (step * SIN_60) / 2;
  return {
    radius: 13.5,
    fillStroke: 4,
    outlineStroke: 5,
    cells: [
      { x: 32 - step / 2, y: top, fill: logoColors.honeyDark },
      { x: 32 + step / 2, y: top, fill: logoColors.honey },
      { x: 32, y: top + step * SIN_60, fill: null },
    ],
  };
}

export const logoMark = rayon();
export const faviconMark = rayonReduit();

// Tracé d'une alvéole. Une alvéole vide est resserrée pour que le bord
// extérieur de son contour s'aligne sur celui des alvéoles pleines.
export function cellShape(shape: LogoShape, cell: LogoCell) {
  if (cell.fill) {
    return {
      d: hexagonPath(cell.x, cell.y, shape.radius),
      fill: cell.fill,
      stroke: cell.fill,
      strokeWidth: shape.fillStroke,
    };
  }
  const radius = shape.radius + (shape.fillStroke - shape.outlineStroke) / (2 * SIN_60);
  return {
    d: hexagonPath(cell.x, cell.y, radius),
    fill: "none",
    stroke: logoColors.honey,
    strokeWidth: shape.outlineStroke,
  };
}

// SVG autonome, sur fond transparent ou sur un fond plein avec une marge
// (en unités de la grille de 64) pour les icônes d'application.
export function logoSvg(
  shape: LogoShape,
  { background, padding = 0 }: { background?: string; padding?: number } = {},
): string {
  const size = 64 + 2 * padding;
  const box = `${-padding} ${-padding} ${size} ${size}`;
  const backdrop = background
    ? `<rect x="${-padding}" y="${-padding}" width="${size}" height="${size}" fill="${background}"/>`
    : "";
  const cells = shape.cells
    .map((cell) => {
      const { d, fill, stroke, strokeWidth } = cellShape(shape, cell);
      return `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linejoin="round"/>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}">${backdrop}${cells}</svg>\n`;
}
