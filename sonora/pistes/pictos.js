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
// Le saxophone alto : bec, bocal, corps en J, pavillon relevé, clés.
function sax() {
  const corps = t("M16 6c3 0 6 2 9 6", 4.200) + t("M25 12c3 9 4 20 3 30-1 8-5 12-11 11-5-1-6-6-4-9", 5.600) + p("M7 41 24 36l4 14-12 5z") + p("M5 43c1-2 3-3 5-3l2 6c-2 1-5 1-7-3z")
    + [[28.500, 22], [29, 29], [29, 36]].map(([x, y]) => c(x, y, 1.700, C)).join("") + r(13, 2, 8, 5, F, 1.600);
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


// ---- La série complète : une silhouette par instrument (même langage : forme pleine, détails en creux).
const pc = (d, w = 2) => `<path d="${d}" fill="${F}" stroke="${C}" stroke-width="${w}" stroke-linejoin="round"/>`;
const el = (cx, cy, rx, ry, fill = F, rot = 0) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}"${rot ? ` transform="rotate(${rot} ${cx} ${cy})"` : ""}/>`;
const ligne = (x1, y1, x2, y2, w, col = F) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>`;
const cercle = (cx, cy, rr, w, col = F) => `<circle cx="${cx}" cy="${cy}" r="${rr}" fill="none" stroke="${col}" stroke-width="${w}"/>`;

// Le piano à queue, vu de côté : caisse galbée, couvercle ouvert, pieds, pédale.
function queue() {
  return svg(p("M4 36c0-6 4-8 10-8h22c10 0 20-4 24-14l2 6c-1 10-6 20-18 24H4z") + p("M6 30 38 8c4-3 10-3 14 0L22 28z") + r(7, 44, 4.200, 16, F, 1.500) + r(34, 44, 4.200, 16, F, 1.500) + r(52, 40, 4.200, 20, F, 1.500)
    + r(10, 36, 26, 4, C, 1) + [14, 18, 22, 26, 30].map(x => r(x, 36, 1.300, 4, F)).join("") + r(44, 58, 14, 3, F, 1.500));
}
// Les tuyaux d'un orgue : sept tuyaux de hauteurs inégales, bouches en creux, sur un buffet.
function orgue() {
  const h = [30, 40, 48, 54, 48, 40, 30]; let corps = r(2, 54, 60, 8, F, 2);
  h.forEach((hh, i) => { const x = 3 + i * 8.5; corps += r(x, 54 - hh, 7, hh, F, 3.500) + r(x + 1.300, 54 - hh * 0.5, 4.400, 3.800, C, 1) + `<path d="M${x + 1.300} ${54 - hh * 0.5 + 3.800}h4.400v1.500h-4.400z" fill="${F}"/>`; });
  return svg(corps);
}
function harpe() {
  let corps = t("M16 10C32 2 48 14 52 30", 5) + r(13, 8, 5, 50, F, 2) + r(7, 55, 46, 6, F, 2.500) + t("M52 30 46 56", 5);
  [[23, 9.500], [29.500, 9], [36, 11], [42.500, 16], [48, 24]].forEach(([x, y]) => { corps += ligne(x, y + 3, x - (x > 40 ? (x - 40) * 0.1 : 0), 55, 1.700); });
  return svg(corps);
}
// La guitare électrique : deux cornes, trois micros, chevalet, manche court, tête à six chevilles.
function guitareElec() {
  const corps = r(29.800, 5, 4.400, 26, F) + r(27.600, 0.500, 8.800, 8, F, 2)
    + p("M32 24c-4-4.500-10-4-11.500.500-.800 2.400.500 4.500.300 6.500-3.600 2.200-5.800 5.400-5.800 9.600 0 8 7.500 13 17 13s17-5 17-13c0-4.200-2.200-7.400-5.800-9.600-.200-2 1.100-4.100.300-6.500C42 20 36 19.500 32 24z")
    + [[36, 33], [41, 33], [46, 33]].map(([y]) => "").join("") + r(26, 33.500, 12, 2.600, C, 1.200) + r(26, 39, 12, 2.600, C, 1.200) + r(25.500, 48, 13, 2.200, C, 1.100) + c(41.500, 47, 1.500, C) + c(22.500, 47, 1.500, C)
    + [[29.200, 2.500], [29.200, 5.500], [34.800, 2.500], [34.800, 5.500], [29.200, 8.300], [34.800, 8.300]].map(([x, y]) => c(x, y, .8, C)).join("");
  return svg(g("rotate(38 32 31)", corps));
}
// Le violoncelle : corps large, ouïes, chevalet, pique, archet.
function violoncelle() {
  const corps = r(29.500, 6, 4, 18, F, 1) + c(31.500, 5, 4) + r(27, 1.500, 9, 1.700, F, .85)
    + p("M31.500 20c-6 0-10.500 3.200-10.500 8 0 2.600 1.500 4.300 3.600 5.300-3 1.400-5 4-5 7.200 0 8.200 5 14.500 11.900 14.500S43.400 48.700 43.400 40.500c0-3.200-2-5.800-5-7.200 2.100-1 3.600-2.700 3.600-5.300 0-4.800-4.500-8-10.500-8z")
    + t("M26.500 34c-1.600 2.800-1.600 5.600 0 8.200", 1.800, C) + t("M36.500 34c1.600 2.800 1.600 5.600 0 8.200", 1.800, C) + r(27.500, 38.500, 8, 1.800, C, .9) + p("M29 47h5l-.9 5h-3.200z", C) + ligne(31.500, 56, 31.500, 62, 2.200);
  return svg(corps + t("M54 4 49.500 52", 2.200) + r(46.800, 50, 5.600, 4.500, F, 1.300));
}
// Hautbois, clarinette : long tube, clés, pavillon évasé.
function clarinette() {
  const corps = r(24.500, 4, 5.600, 4, F, 2) + r(23.700, 8, 7.200, 40, F, 3) + p("M22 46h10.600l4 12H18z") + [14, 21, 28, 35].map(y => c(27.300, y, 2, C)).join("") + [17.500, 24.500, 31.500].map(y => r(23, y, 8.600, 1.200, C)).join("") + r(30, 38, 4.500, 2, F, 1);
  return svg(g("rotate(24 32 32)", corps));
}
// Le basson : bocal, tube plié en deux, pavillon vers le haut.
function basson() {
  return svg(t("M20 8c-6-3-8-6-6-7", 2.800) + t("M20 6v44a9 9 0 0 0 18 0V16", 6) + p("M31 16h14l-3-10h-8z") + [14, 22, 30, 38].map(y => c(20, y, 2, C)).join("") + c(38, 44, 1.700, C) + r(36.800, 22, 2.600, 12, C, 1));
}
function cor() {
  return svg(cercle(26, 38, 20, 5.200) + cercle(26, 38, 9.500, 4.200) + p("M44 30c6-1 12-8 19-16v44c-7-8-13-15-19-18z") + t("M12 16 6 8", 3.600) + ligne(26, 18, 26, 8, 3) + r(22.500, 4, 7, 3.600, F, 1.800) + r(40, 36, 6, 4, F, 1));
}
function trombone() {
  return svg(t("M18 24h36", 3.800) + t("M18 38h36", 3.800) + t("M54 24c8 4 8 10 0 14", 3.800) + p("M17 20.500 3 6v46L17 41.500z") + r(40, 20, 3.200, 22, F, 1.200) + r(28, 20, 3.200, 22, F, 1.200));
}
function tuba() {
  return svg(p("M24 26 6 4h44L36 26z") + r(24, 24, 12, 8, F, 2) + cercle(30, 46, 14, 6.600) + r(46, 18, 4.600, 24, F, 2.300) + r(54, 18, 4.600, 24, F, 2.300) + ligne(44, 14, 60, 14, 2.800) + t("M44 46h-6", 4) + t("M49 42v8", 3));
}
// Le chœur : deux silhouettes de chanteurs, l'une devant l'autre.
function choeur() {
  return svg(c(42, 20, 8.200) + p("M26 56c0-15 7-22 16-22s16 7 16 22z") + pc("M4 58c0-16 7-23 16-23s16 7 16 23z", 2.600) + `<circle cx="20" cy="22" r="8.200" fill="${F}" stroke="${C}" stroke-width="2.600"/>` + el(20, 24, 2.200, 3, C));
}
// Marimba, xylophone, glockenspiel : lames de longueurs décroissantes et deux maillets.
function lames() {
  let corps = ""; for (let i = 0; i < 6; i++) corps += r(3 + i * 9.800, 24 + i * 2.600, 8.200, 34 - i * 5.200, F, 2) + c(7.100 + i * 9.800, 28.500 + i * 2.600, 1.300, C) + c(7.100 + i * 9.800, 52 - i * 2.600, 1.300, C);
  return svg(corps + ligne(12, 8, 30, 22, 2.800) + c(10, 6, 4.600) + ligne(52, 8, 36, 22, 2.800) + c(54, 6, 4.600));
}
// Le vibraphone : lames au-dessus, tubes résonateurs dessous.
function vibra() {
  let corps = "";
  for (let i = 0; i < 6; i++) { const x = 3 + i * 9.800; corps += r(x, 22, 8.200, 8, F, 2) + r(x + 1.200, 33, 5.800, 24 - Math.abs(i - 2.500) * 2.600 - 2, F, 2.900); }
  return svg(corps + ligne(14, 6, 28, 18, 2.800) + c(12, 4, 4.200) + ligne(50, 6, 36, 18, 2.800) + c(52, 4, 4.200));
}
function kalimba() {
  let corps = r(8, 24, 48, 36, F, 9) + c(32, 44, 6, C) + r(8, 28, 48, 2.400, C);
  [0, 1, 2, 3, 4, 5, 6].forEach(i => { corps += r(13.500 + i * 6, 4 + Math.abs(i - 3) * 3.500, 3.200, 26 - Math.abs(i - 3) * 3.500, F, 1.600); });
  return svg(corps);
}
function cloche() {
  return svg(r(29, 2, 6, 7, F, 2) + p("M32 8c-4 0-7 3-7 7-8 3-12 11-12 21 0 8-3 12-8 16h54c-5-4-8-8-8-16 0-10-4-18-12-21 0-4-3-7-7-7z") + c(32, 56, 5.200) + r(15, 41, 34, 1.600, C));
}
function steelpan() {
  let corps = el(32, 34, 28, 22) + `<ellipse cx="32" cy="34" rx="24.500" ry="18.500" fill="none" stroke="${C}" stroke-width="1.600"/>` + el(32, 34, 6, 4.200, C);
  for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2 - Math.PI / 2; corps += el(32 + Math.cos(a) * 15.500, 34 + Math.sin(a) * 11, 4.800, 3.300, C); }
  return svg(corps + r(8, 54, 48, 5, F, 2.500));
}
function djembe() {
  return svg(p("M8 12c0-4 11-6 24-6s24 2 24 6c0 12-8 14-8 24 0 8 6 14 8 22H8c2-8 8-14 8-22 0-10-8-12-8-24z") + el(32, 12, 21, 4.600, C) + el(32, 12, 17.500, 3.200)
    + [18, 25, 32, 39].map((y, i) => t(`M${14 + i * 0.7} ${y}l6 5 6-5 6 5 6-5 6 5 6-5`, 1.600, C)).join("") + r(14, 50, 36, 2.200, C));
}
function timbale() {
  return svg(p("M5 26h54c0 20-12 32-27 32S5 46 5 26z") + el(32, 26, 27, 7) + el(32, 26, 23.500, 4.800, C) + r(26, 56, 12, 5, F, 2) + ligne(10, 4, 26, 22, 2.600) + c(8.500, 2.800, 3.600) + ligne(54, 4, 38, 22, 2.600) + c(55.500, 2.800, 3.600));
}
function bongo() {
  const un = x => p(`M${x} 18h22c0 12-4 16-2 26l1 14H${x + 1}l1-14c2-10-2-14-2-26z`) + el(x + 11, 18, 11, 3.800) + el(x + 11, 18, 8.500, 2.200, C);
  return svg(un(4) + un(38) + r(26, 24, 12, 5, F, 2));
}
function blocBois() {
  return svg(r(4, 22, 56, 28, F, 6) + r(12, 32, 40, 4.600, C, 2.300) + el(32, 28, 22, 1.600, C) + ligne(56, 4, 40, 20, 3) + c(57.500, 3.500, 3.800));
}
function triangle() {
  return svg(t("M32 8 9 50h46z", 4.600) + ligne(32, 2, 32, 8, 2.400) + ligne(52, 8, 44, 26, 2.600) + c(53, 6, 3));
}
function tambourin() {
  let corps = c(32, 32, 29) + c(32, 32, 20.500, C) + cercle(32, 32, 18.500, 2.200);
  for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; corps += `<rect x="${(32 + Math.cos(a) * 24.700 - 1.800).toFixed(2)}" y="${(32 + Math.sin(a) * 24.700 - 4.500).toFixed(2)}" width="3.600" height="9" rx="1.800" fill="${C}" transform="rotate(${(a * 180 / Math.PI + 90).toFixed(1)} ${(32 + Math.cos(a) * 24.700).toFixed(2)} ${(32 + Math.sin(a) * 24.700).toFixed(2)})"/>`; }
  return svg(corps + c(32, 32, 4) + [0, 1, 2].map(i => c(32 + Math.cos(i * 2.094 + .5) * 10, 32 + Math.sin(i * 2.094 + .5) * 10, 1.600)).join(""));
}
function cymbale() {
  return svg(el(32, 22, 29, 8.500, F, -8) + el(32, 21, 6, 2.400, C, -8) + r(30, 28, 4, 30, F, 1.500) + r(18, 56, 28, 4, F, 2) + el(32, 20, 24, 5, "none"));
}
function gong() {
  return svg(t("M6 60V6h52v54", 4.400) + ligne(24, 6, 24, 16, 1.800) + ligne(40, 6, 40, 16, 1.800) + c(32, 36, 19) + cercle(32, 36, 13, 1.600, C) + c(32, 36, 6, C) + c(32, 36, 3));
}
function bol() {
  return svg(p("M4 26h56c0 14-11 24-28 24S4 40 4 26z") + el(32, 26, 28, 5, C) + el(32, 26, 28, 5, "none") + r(18, 50, 28, 6, F, 3) + ligne(54, 4, 40, 20, 3) + c(55.500, 3, 3.800) + cercle(32, 26, 25, 1.200, F));
}
// Les boîtes à rythmes : huit pastilles et deux boutons.
function boite() {
  let corps = r(3, 10, 58, 44, F, 6) + c(12, 18, 2.600, C) + c(20, 18, 2.600, C) + r(38, 15.500, 17, 5, C, 2.500);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) corps += r(8 + i * 13.300, 27 + j * 13, 10.300, 10, C, 2);
  return svg(corps);
}
function synthe() {
  let corps = r(2, 10, 60, 44, F, 5) + [0, 1, 2, 3].map(i => c(10 + i * 7, 18, 2.400, C)).join("") + r(38, 15, 20, 6, C, 1.500) + r(5, 29, 54, 21, C, 2);
  for (let i = 0; i < 9; i++) corps += r(5.300 + i * 6, 29, .8, 21, F);
  for (const k of [1, 2, 4, 5, 7, 8]) corps += r(5 + k * 6 - 1.800, 29, 3.600, 12.500, F, .8);
  return svg(corps);
}
function nappe() {
  return svg([14, 32, 50].map((y, i) => t(`M3 ${y}c5-9 8-9 13 0s8 9 13 0 8-9 13 0 8 9 13 0 8-9 7-5`, 4.600)).join(""));
}
function enceinte() {
  return svg(r(9, 3, 46, 58, F, 7) + c(32, 40, 16, C) + c(32, 40, 9.500) + c(32, 40, 3.600, C) + c(32, 15, 4.600, C));
}
function laser() { return svg(p("M38 1 11 36h15l-6 27 33-41H30z")); }
function sirene() {
  return svg(c(32, 52, 6.500) + t("M18 41c8-8 20-8 28 0", 4.800) + t("M10 31c12-12 32-12 44 0", 4.800) + t("M4 21C18 7 46 7 60 21", 4.800));
}
function vent() {
  return svg(t("M4 20h34a9 9 0 1 0-9-9", 4.800) + t("M4 33h46a9 9 0 1 1-9 9", 4.800) + t("M4 46h22a7 7 0 1 1-7 7", 4.800));
}
function montee() { return svg(p("M32 2 56 30H40v10H24V30H8z") + r(24, 45, 16, 5, F, 2) + r(24, 54, 16, 5, F, 2)); }
function impact() {
  let d = ""; for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2, rr = i % 2 ? 15 : 31; d += (i ? "L" : "M") + (32 + Math.cos(a) * rr).toFixed(1) + " " + (32 + Math.sin(a) * rr).toFixed(1); }
  return svg(p(d + "Z") + c(32, 32, 7, C));
}
function goutte() { return svg(p("M32 2c9 15 20 25 20 38a20 20 0 0 1-40 0C12 27 23 17 32 2z") + t("M22 42a10 10 0 0 0 8 10", 3.800, C)); }
function blip() {
  const m = ["00100000100", "00010001000", "00111111100", "01101110110", "11111111111", "10111111101", "10100000101", "00011011000"]; let corps = "";
  m.forEach((row, y) => [...row].forEach((v, x) => { if (v === "1") corps += r(4 + x * 5, 12 + y * 5, 5.200, 5.200); }));
  return svg(corps);
}
function tonnerre() {
  return svg(c(20, 26, 13) + c(36, 20, 15) + c(50, 28, 11) + r(14, 26, 44, 13, F, 6) + p("M36 28 22 50h10l-4 14 18-24H34z", C) + p("M37 31 25 49h9l-3 11 14-18h-9z"));
}
// L'harmonica / le piano électrique : on garde le clavier. La harpe celtique, elle, a son dessin.

export const PICTOS_SERIE = { queue: queue(), orgue: orgue(), harpe: harpe(), guitareElec: guitareElec(), violoncelle: violoncelle(), clarinette: clarinette(), basson: basson(), cor: cor(), trombone: trombone(), tuba: tuba(), choeur: choeur(), lames: lames(), vibra: vibra(), kalimba: kalimba(), cloche: cloche(), steelpan: steelpan(), djembe: djembe(), timbale: timbale(), bongo: bongo(), blocBois: blocBois(), triangle: triangle(), tambourin: tambourin(), cymbale: cymbale(), gong: gong(), bol: bol(), boite: boite(), synthe: synthe(), nappe: nappe(), enceinte: enceinte(), laser: laser(), sirene: sirene(), vent: vent(), montee: montee(), impact: impact(), goutte: goutte(), blip: blip(), tonnerre: tonnerre() };

export const PICTOS = { piano: piano(), guitare: guitare(), basse: basse(), violon: violon(), flute: flute(), trompette: trompette(), sax: sax(), batterie: batterie(), voix: voix(), onde: onde(), note: note(), ...PICTOS_SERIE };
