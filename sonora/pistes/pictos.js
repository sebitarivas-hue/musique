// Les pictogrammes d'instruments du mode blocs : des silhouettes pleines (64 x 64), détails en creux, sur une tuile blanche arrondie.
// Tout est dessiné pour ce cours. La forme est en `currentColor`, les creux en `var(--tuile)` (la couleur de la tuile) : on change la couleur et le fond depuis la feuille de style.
// Sans DOM : on ne fabrique que du texte SVG.
const F = "currentColor", C = "var(--tuile, #fff)";
const svg = corps => `<svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true" focusable="false">${corps}</svg>`;
const r = (x, y, w, h, fill = F, rx = 0) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}"/>`;
const c = (cx, cy, rr, fill = F) => `<circle cx="${cx}" cy="${cy}" r="${rr}" fill="${fill}"/>`;
const p = (d, fill = F) => `<path d="${d}" fill="${fill}"/>`;
const t = (d, w, couleur = F) => `<path d="${d}" fill="none" stroke="${couleur}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const g = (tr, corps) => `<g transform="${tr}">${corps}</g>`;

// Le clavier : sept touches blanches, cinq noires.
function piano() {
  let corps = r(3, 13, 58, 38, F, 5), w = 52 / 7;
  for (let i = 0; i < 7; i++) corps += r(6 + i * w + .5, 16, w - 1, 32, C, 1.3);
  for (const k of [1, 2, 4, 5, 6]) corps += r(6 + k * w - 2.3, 16, 4.6, 19, F, 1.1);
  return svg(corps);
}
// La guitare acoustique, penchée : table en huit, rosace, chevalet, manche à frettes, tête à chevilles.
function guitare() {
  const corps = r(29.4, 8, 5.2, 24, F) + r(27.2, 1.5, 9.6, 9.5, F, 2.2)
    + p("M32 24c-6.200 0-10.400 3.600-10.400 8.200 0 3 1.600 4.700 3.700 6.200-3.200 1.600-5.400 4.200-5.400 7.800C19.900 52.600 24.800 58 32 58s12.100-5.400 12.100-11.800c0-3.600-2.200-6.200-5.400-7.800 2.100-1.500 3.700-3.200 3.700-6.200C42.400 27.600 38.200 24 32 24z")
    + c(32, 41, 4.800, C) + t("M32 41m-7.300 0a7.300 7.300 0 1 0 14.600 0a7.300 7.300 0 1 0-14.600 0", 1.100, C) + r(26.600, 50, 10.800, 2.600, C, 1.300)
    + [14, 18, 22, 26].map(y => `<line x1="29.400" y1="${y}" x2="34.600" y2="${y}" stroke="${C}" stroke-width="1"/>`).join("")
    + [[29.600, 4.500], [29.600, 8], [34.400, 4.500], [34.400, 8]].map(([x, y]) => c(x, y, 1.100, C)).join("");
  return svg(g("rotate(38 32 31)", corps));
}
// La basse électrique : deux cornes, deux micros, chevalet, très long manche, quatre chevilles.
function basse() {
  const corps = r(29.800, 5, 4.400, 32, F) + r(27.600, .5, 8.800, 8, F, 2)
    + p("M32 34c-3.500-3.800-8.700-3.400-10.800.4-1.200 2.300.2 4.800.2 7.600-3.400 2.100-5.200 5.600-5.200 9.600 0 5.800 6.200 8.900 15.800 8.900s15.800-3.100 15.800-8.900c0-4-1.800-7.500-5.200-9.600 0-2.800 1.400-5.300.2-7.600-2.100-3.800-7.300-4.200-10.800-.4z")
    + r(26, 42, 12, 2.800, C, 1.200) + r(26, 47, 12, 2.800, C, 1.200) + r(25.500, 53.500, 13, 2.200, C, 1.100)
    + [[29.200, 3], [29.200, 6], [34.800, 3], [34.800, 6]].map(([x, y]) => c(x, y, .95, C)).join("");
  return svg(g("rotate(38 32 31)", corps));
}
// Le violon : corps en huit, volute, touche, ouïes en f, chevalet et cordier, et son archet à côté.
function violon() {
  const corps = r(29.600, 9, 3.800, 15, F, 1) + c(31.500, 6.800, 3.800) + r(28.200, 2.800, 6.600, 1.700, F, .85)
    + p("M31.500 20.500c-5.200 0-9.200 3-9.200 7 0 2.600 1.500 4.300 3.400 5.200-2.700 1.300-4.500 3.700-4.500 6.600 0 7.100 4.300 13.200 10.300 13.200s10.300-6.100 10.300-13.200c0-2.900-1.800-5.300-4.500-6.600 1.900-.9 3.400-2.600 3.400-5.200 0-4-4-7-9.200-7z")
    + t("M26.700 34c-1.500 2.500-1.500 5 0 7.500", 1.700, C) + t("M36.300 34c1.500 2.500 1.500 5 0 7.500", 1.700, C) + r(27.700, 37.500, 7.600, 1.700, C, .8) + p("M29 45h5l-.9 4.500h-3.200z", C);
  const archet = t("M52.500 6 47 56", 2.300) + r(44.400, 53.500, 5.800, 4.600, F, 1.300);
  return svg(corps + archet);
}
// La flûte traversière : tube, embouchure, clés et leurs axes.
function flute() {
  const corps = r(1, 27.500, 62, 7.500, F, 3.700) + r(1, 25.800, 7.500, 11, F, 2.500) + c(5.200, 31.500, 1.700, C)
    + [15, 23, 31, 39, 47].map(x => c(x, 31.250, 2, C)).join("") + [19, 35, 51].map(x => r(x - 1, 22, 2, 5.600, F, 1)).join("") + c(58, 31.250, 1.300, C);
  return svg(g("rotate(-26 32 32)", corps));
}
// La trompette : pavillon, tube enroulé, trois pistons.
function trompette() {
  const corps = p("M44 23.500 61 14v36L44 40.500z") + t("M46 32H13c-5.500 0-8.500 3-8.500 7s3 7 8.500 7h22", 4.600) + t("M22 32v-8c0-3 1.700-5 5-5h11", 4)
    + [24, 32, 40].map(x => r(x - 2.600, 8, 5.200, 16, F, 2.400) + r(x - 3.800, 5.500, 7.600, 3.400, F, 1.700)).join("") + t("M4.500 39H1.500", 4.200);
  return svg(corps);
}
// La batterie de face : grosse caisse, deux toms, deux cymbales.
function batterie() {
  const corps = c(32, 42, 17.500) + t("M32 42m-12 0a12 12 0 1 0 24 0a12 12 0 1 0-24 0", 2.200, C) + c(32, 42, 2.400, C)
    + c(20.500, 20, 9) + t("M20.500 20m-5.700 0a5.700 5.700 0 1 0 11.400 0a5.700 5.700 0 1 0-11.400 0", 1.700, C)
    + c(43.500, 20, 9) + t("M43.500 20m-5.700 0a5.700 5.700 0 1 0 11.400 0a5.700 5.700 0 1 0-11.400 0", 1.700, C)
    + `<ellipse cx="8" cy="12" rx="7.500" ry="2.200" fill="${F}"/>` + `<ellipse cx="56" cy="12" rx="7.500" ry="2.200" fill="${F}"/>`
    + t("M8 14v20M56 14v20", 2.400) + r(4, 33.500, 8, 2.500, F, 1.200) + r(52, 33.500, 8, 2.500, F, 1.200);
  return svg(corps);
}
// Le micro : capsule à grille, étrier, pied.
function voix() {
  const corps = r(22.500, 4, 19, 29, F, 9.500) + [12, 17, 22, 27].map(y => `<line x1="23.500" y1="${y}" x2="40.500" y2="${y}" stroke="${C}" stroke-width="1.500"/>`).join("")
    + t("M14.500 27.500a17.500 17.500 0 0 0 35 0", 4.200) + r(29.900, 45, 4.200, 10, F, 1) + r(20.500, 54.500, 23, 4.500, F, 2.250);
  return svg(corps);
}
// Un son de synthèse : une onde, sur un petit synthétiseur.
function onde() {
  return svg(r(3, 12, 58, 40, F, 6) + t("M9 32c4-13 7-13 11 0s7 13 11 0 7-13 11 0 7 13 11 0", 4, C) + c(10.500, 19, 1.700, C) + c(17, 19, 1.700, C) + c(53.500, 19, 1.700, C));
}
// Un autre instrument : deux croches liées.
function note() {
  return svg(r(22.500, 11, 5, 36, F, 1) + r(43.500, 8, 5, 36, F, 1) + p("M22.500 10.500 48.500 5v9l-26 5.500z") + `<ellipse cx="18.500" cy="48" rx="8.300" ry="6.200" transform="rotate(-20 18.500 48)" fill="${F}"/><ellipse cx="39.500" cy="45" rx="8.300" ry="6.200" transform="rotate(-20 39.500 45)" fill="${F}"/>`);
}

export const PICTOS = { piano: piano(), guitare: guitare(), basse: basse(), violon: violon(), flute: flute(), trompette: trompette(), batterie: batterie(), voix: voix(), onde: onde(), note: note() };
