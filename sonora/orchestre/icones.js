// SONORA Orchestre : les dessins d'instruments, tracés pour ce cours (formes simples en SVG, aucune image à demander ni licence à gérer).
// Chaque dessin tient dans un carré de 100 sur 100, instrument debout, pavillon ou tête en haut. Couleurs : bois des cordes, noir et argent des bois, laiton des cuivres, peau et métal des percussions.
const ENC = "#11110F", BOIS = "#C9702F", BOIS2 = "#8E4A1B", NOIR = "#2B2723", ARGENT = "#E3E6EB", OR = "#E8B53A", OR2 = "#B8841A", PEAU = "#FBF8EC", BRONZE = "#C98A3A", ROUGE = "#A8381F";
const S = ' stroke="' + ENC + '" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"';
const P = (d, f, w) => '<path d="' + d + '" fill="' + f + '"' + S.replace('2.4', w || '2.4') + "/>";
const L = (x1, y1, x2, y2, w, c) => '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + (c || ENC) + '" stroke-width="' + (w || 1.6) + '" stroke-linecap="round"/>';
const C = (cx, cy, r, f, w) => '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + f + '"' + (w === 0 ? "" : S.replace("2.4", w || "1.8")) + "/>";
const E = (cx, cy, rx, ry, f, w) => '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="' + f + '"' + S.replace("2.4", w || "1.8") + "/>";
const R = (x, y, w, h, f, rx) => '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + (rx || 0) + '" fill="' + f + '"' + S.replace("2.4", "1.8") + "/>";
// un tube de laiton : contour sombre, puis laiton
const T = (d, ep) => '<path d="' + d + '" fill="none" stroke="' + ENC + '" stroke-width="' + ((ep || 4.4) + 3.2) + '" stroke-linecap="round" stroke-linejoin="round"/><path d="' + d + '" fill="none" stroke="' + OR + '" stroke-width="' + (ep || 4.4) + '" stroke-linecap="round" stroke-linejoin="round"/>';
const G = (c, t) => "<g" + (t ? ' transform="' + t + '"' : "") + ">" + c + "</g>";

function cordeFrottee(k, extra) {   // violon (k = 0,8), alto (0,9), violoncelle (1), contrebasse (1,06) : même silhouette, tailles différentes
  const corps = "M50 40 C63 40 69 49 65 58 C61 64 63 69 70 76 C77 85 70 98 50 98 C30 98 23 85 30 76 C37 69 39 64 35 58 C31 49 37 40 50 40 Z";
  let s = L(50, 9, 50, 44, 5.4, ENC) + C(50, 8, 4.4, BOIS2, 1.8) + P(corps, BOIS, 2.4);
  s += P("M41 68 C39 73 40 78 43 81", "none", 1.6) + P("M59 68 C61 73 60 78 57 81", "none", 1.6) + L(43, 74, 57, 74, 2.2) + L(50, 14, 50, 88, 0.8, "#f3e7c6");
  return G(s + (extra || ""), "translate(50 50) scale(" + k + ") translate(-50 -52)");
}
const archet = L(14, 94, 18, 20, 1.6) ;
function harpe() {
  let s = P("M22 96 L22 26 C22 10 56 4 78 14 L62 96 Z", BOIS, 2.4);
  for (let i = 0; i < 9; i++) { const x = 30 + i * 3.6, top = 14 + i * 0.4 + 6 - Math.sin(i / 8 * Math.PI) * 3, bas = 94 - i * 0.2; s += L(x, top + 8 + i * 0.6, x - i * 0.15 + 2, bas - 6 - (8 - i) * 1.4, 1, i % 3 === 0 ? ROUGE : "#f3e7c6"); }
  s += P("M22 96 L66 96 L66 99 L22 99 Z", BOIS2, 1.6) + C(18, 62, 2.6, OR, 1.4);
  return s;
}
function flute(court) {
  const y0 = court ? 30 : 8; let s = R(46, y0, 8, 92 - y0, ARGENT, 3) + E(50, y0 + 6, 6.6, 3, ARGENT, 1.6);
  for (let y = y0 + 20; y < 88; y += 11) s += C(50, y, 2.2, PEAU, 1.2);
  return s + L(54, y0 + 14, 60, y0 + 14, 1.4) + L(54, y0 + 40, 60, y0 + 40, 1.4);
}
function anche(type) {
  let s;
  if (type === "hautbois") s = L(50, 6, 50, 24, 2.2) + P("M46 24 L54 24 L56 78 L62 94 L38 94 L44 78 Z", NOIR, 2.2);
  else if (type === "cor") s = L(50, 6, 50, 24, 2.2) + P("M46 24 L54 24 L56 70 C70 70 70 94 50 94 C30 94 30 70 44 70 Z", NOIR, 2.2);
  else if (type === "clarinette") s = R(46, 8, 8, 8, NOIR, 2) + P("M46 16 L54 16 L55 76 L66 94 L34 94 L45 76 Z", NOIR, 2.2);
  else s = R(46, 6, 8, 8, NOIR, 2) + L(54, 10, 70, 16, 2.4) + P("M46 14 L54 14 L55 70 C58 80 70 82 76 74 L88 52 L96 56 L82 86 C70 100 44 98 42 84 L45 70 Z", NOIR, 2.2);   // clarinette basse : pavillon relevé
  const cles = type === "clarinette" || type === "basse" ? 5 : 4;
  for (let i = 0; i < cles; i++) s += C(50, 28 + i * 10, 2.2, ARGENT, 1);
  return s;
}
function basson() {
  return P("M30 94 L30 22 C30 12 40 10 44 10 L44 24 L44 94 Z", NOIR, 2.2) + P("M44 94 L66 94 L66 8 L56 8 L56 82 L44 82 Z", NOIR, 2.2) + L(44, 12, 24, 8, 2.4, ENC) + L(24, 8, 14, 3, 1.6) + L(30, 60, 66, 60, 0.0) + C(37, 30, 2.1, ARGENT, 1) + C(37, 44, 2.1, ARGENT, 1) + C(61, 30, 2.1, ARGENT, 1) + C(61, 44, 2.1, ARGENT, 1) + C(61, 58, 2.1, ARGENT, 1) + C(37, 70, 2.1, ARGENT, 1);
}
const cor = () => T("M50 22 C84 22 86 78 50 78 C22 78 22 40 50 40 C70 40 70 62 50 62", 4.6) + P("M50 22 L56 10 L96 6 L96 40 L56 36 Z", OR, 2.2) + C(34, 86, 3, OR2, 1.4);
function trompette() {
  return P("M36 4 L64 4 L58 30 L42 30 Z", OR, 2.2) + T("M44 30 L44 82 M56 30 L56 82 M44 82 C44 92 56 92 56 82") + [-2, 0, 2].map((k, i) => R(38 + i * 9, 44, 6, 12, OR2, 1.5) + L(41 + i * 9, 44, 41 + i * 9, 38, 2.4)).join("") + C(50, 94, 2.4, OR2, 1.2);
}
function trombone() {
  return P("M52 2 L96 12 L52 28 Z", OR, 2.2) + T("M40 24 L40 92 M56 24 L56 92") + T("M30 92 L66 92 M30 92 L30 62 M66 92 L66 40", 4) + R(26, 24, 34, 5, OR2, 1.5) + C(48, 96, 2, OR2, 1.1);
}
const tuba = () => T("M32 26 C8 40 8 86 36 90 C64 94 78 76 70 56 C64 42 46 48 50 62") + P("M20 26 L52 14 L68 20 L68 42 L24 40 Z", OR, 2.2) + [0, 1, 2].map(i => R(70 + i * 7, 38, 5, 12, OR2, 1.4) + L(72.5 + i * 7, 38, 72.5 + i * 7, 32, 2)).join("") + E(46, 30, 20, 7, OR, 1.6);
const timbale = () => L(28, 68, 18, 96, 2.4) + L(72, 68, 82, 96, 2.4) + L(50, 78, 50, 96, 2.4) + P("M10 50 C14 84 36 92 50 92 C64 92 86 84 90 50 Z", BRONZE, 2.2) + E(50, 50, 42, 11, PEAU, 2) + C(50, 94, 3, ROUGE, 1.2);
const caisseClaire = () => L(30, 70, 20, 96, 2.4) + L(70, 70, 80, 96, 2.4) + L(50, 70, 50, 96, 2.4) + R(16, 38, 68, 32, ARGENT, 2) + [26, 38, 50, 62, 74].map(x => L(x, 38, x, 70, 1.4)).join("") + E(50, 38, 34, 9, PEAU, 1.9) + L(8, 22, 34, 34, 2) + L(92, 22, 66, 34, 2);
const grosseCaisse = () => C(50, 50, 42, BOIS2, 2.2) + C(50, 50, 33, PEAU, 1.9) + [0, 1, 2, 3, 4, 5, 6, 7].map(i => { const a = i * Math.PI / 4; return C((50 + 38 * Math.cos(a)).toFixed(1), (50 + 38 * Math.sin(a)).toFixed(1), 2, ARGENT, 1); }).join("") + L(30, 94, 70, 94, 3);
const cymbales = () => E(50, 66, 42, 11, OR, 2) + C(50, 64, 4, OR2, 1.4) + E(50, 40, 42, 11, OR, 2) + C(50, 38, 4, OR2, 1.4) + L(50, 10, 50, 36, 1.6) + L(46, 6, 54, 6, 3);
const tamtam = () => L(10, 96, 10, 14, 3.2) + L(90, 96, 90, 14, 3.2) + L(10, 14, 90, 14, 3.2) + L(50, 14, 50, 26, 1.6) + C(50, 56, 34, BRONZE, 2.2) + C(50, 56, 24, "none", 1.4) + C(50, 56, 13, "none", 1.4) + C(50, 56, 5, OR2, 1.4);
function xylophone() {
  let s = L(8, 84, 34, 22, 3) + L(92, 84, 66, 22, 3); for (let i = 0; i < 9; i++) { const h = 62 - i * 4.6, x = 10 + i * 8.6; s += R(x, 82 - h, 7, h, BOIS, 1.5); } return s + L(8, 86, 92, 86, 2.6);
}
function cloches() {
  let s = L(8, 8, 92, 8, 3.4) + L(8, 8, 8, 96, 3) + L(92, 8, 92, 96, 3); for (let i = 0; i < 7; i++) { const h = 84 - i * 8, x = 17 + i * 10; s += L(x + 3, 8, x + 3, 14, 1.4) + R(x, 14, 6.4, h, ARGENT, 3); } return s;
}
function celesta() {
  let s = R(8, 30, 84, 56, BOIS, 3) + L(8, 30, 92, 30, 3.4) + L(8, 86, 92, 86, 3); for (let i = 0; i < 8; i++) { const x = 15 + i * 9.4, h = 30 - i * 1.4; s += R(x, 40, 6, h, ARGENT, 1.2); }
  for (let i = 0; i < 9; i++) s += R(12 + i * 8.6, 74, 7, 10, "#FFFFFF", 1); return s;
}
const triangle = () => P("M50 10 L90 86 L10 86 Z", "none", 4.2) + L(50, 2, 50, 10, 1.6) + L(80, 30, 96, 8, 3, ROUGE);
const tambourBasque = () => C(50, 50, 40, BOIS, 2.2) + C(50, 50, 32, PEAU, 1.8) + [0, 1, 2, 3, 4, 5, 6, 7].map(i => { const a = i * Math.PI / 4; return C((50 + 36 * Math.cos(a)).toFixed(1), (50 + 36 * Math.sin(a)).toFixed(1), 3.4, OR, 1.2); }).join("");
const castagnettes = () => L(50, 8, 36, 40, 1.6) + L(50, 8, 66, 40, 1.6) + E(34, 62, 22, 24, BOIS, 2) + E(68, 66, 20, 22, BOIS2, 2) + C(34, 62, 4, NOIR, 1) + C(68, 66, 4, NOIR, 1);
const blocsChinois = () => L(12, 24, 88, 24, 3.2) + [0, 1, 2, 3].map(i => E(22 + i * 19, 40, 9, 12 + i * 2, BOIS, 1.8)).join("") + L(50, 30, 38, 94, 2.4) + L(50, 30, 62, 94, 2.4) + L(50, 30, 50, 94, 2.4);
const fouet = () => P("M10 56 L70 36 L74 46 L16 66 Z", BOIS, 2) + P("M12 70 L74 50 L78 60 L18 80 Z", BOIS2, 2) + C(14, 63, 3, OR2, 1.2);

// Les instruments de TIMBRE qui n'ont pas de photo libre (scène et monde) : même charte que le plan de l'orchestre (20/11/2026).
const ACIER = "#B9C2CF";
function guitare(type) {   // tête en haut, corps en bas : électrique pleine, folk à rosace, jazz à ouïes en f, basse plus longue
  const basse = type === "basse", elec = type === "elec" || basse, f = type === "folk";
  const corps = elec ? "M50 52 C62 46 72 52 70 64 C69 70 76 74 76 84 C76 96 62 98 50 96 C38 98 24 96 24 84 C24 74 31 70 30 64 C28 52 38 46 50 52 Z" : "M50 46 C64 46 70 54 66 62 C62 68 66 72 72 78 C78 88 70 98 50 98 C30 98 22 88 28 78 C34 72 38 68 34 62 C30 54 36 46 50 46 Z";
  let g = L(50, 4, 50, 58, basse ? 4.6 : 5.4, NOIR) + P("M44 3 L56 3 L55 14 L45 14 Z", elec ? NOIR : BOIS2, 1.8) + P(corps, elec ? (basse ? NOIR : ROUGE) : (f ? BOIS : BOIS2), 2.4);
  if (elec) g += R(42, 66, 16, 5, ARGENT, 1) + R(42, 76, 16, 5, ARGENT, 1) + R(40, 88, 20, 3.4, ARGENT, 1);
  else if (f) g += C(50, 72, 9, NOIR, 1.6) + R(40, 88, 20, 3.4, NOIR, 1);
  else g += P("M38 70 C36 74 37 80 40 83", "none", 2) + P("M62 70 C64 74 63 80 60 83", "none", 2) + R(40, 88, 20, 3.4, NOIR, 1);
  for (let i = 0; i < (basse ? 4 : 6); i++) g += L(basse ? 46.5 + i * 2.3 : 46 + i * 1.6, 12, basse ? 46.5 + i * 2.3 : 46 + i * 1.6, 90, 0.6, "#f3e7c6");
  return g;
}
const piano = () => R(10, 14, 80, 34, NOIR, 3) + R(14, 20, 72, 22, "#3a3631", 2) + R(8, 52, 84, 8, NOIR, 2) + R(10, 60, 80, 24, PEAU, 1.5) + [0, 1, 2, 3, 4, 5, 6, 7].map(i => L(20 + i * 10, 60, 20 + i * 10, 84, 1.2)).join("") + [0, 1, 3, 4, 6, 7].map(i => R(16 + i * 10, 60, 7, 14, NOIR, 1)).join("") + L(16, 84, 14, 98, 4) + L(84, 84, 86, 98, 4);
const clavecin = () => P("M10 44 C34 30 62 28 92 42 L92 62 L10 62 Z", BOIS2, 2.4) + R(10, 62, 82, 10, PEAU, 1.5) + [0, 1, 2, 3, 4, 5, 6, 7].map(i => L(20 + i * 9, 62, 20 + i * 9, 72, 1)).join("") + [1, 2, 4, 5, 7].map(i => R(16 + i * 9, 62, 5, 6, NOIR, 0.8)).join("") + L(16, 72, 14, 96, 4) + L(86, 72, 88, 96, 4) + L(24, 42, 80, 52, 1, "#f3e7c6");
function orgue() { let s = R(8, 74, 84, 20, BOIS2, 3); for (let i = 0; i < 9; i++) { const h = 62 - Math.abs(4 - i) * 6, x = 11 + i * 9; s += R(x, 74 - h, 7, h, ARGENT, 1.6) + E(x + 3.5, 74 - h + 7, 2, 2.6, NOIR, 0.8); } return s + R(14, 80, 72, 8, PEAU, 1) + [0, 1, 2, 3, 4, 5].map(i => L(26 + i * 10, 80, 26 + i * 10, 88, 1)).join(""); }
const djembe = () => E(50, 22, 28, 9, PEAU, 2.2) + P("M22 24 C22 46 38 52 38 70 L30 94 L70 94 L62 70 C62 52 78 46 78 24 C70 32 30 32 22 24 Z", BOIS, 2.4) + [0, 1, 2, 3, 4].map(i => L(26 + i * 12, 24, 40 + i * 5, 62, 1.2, ENC)).join("") + L(32, 76, 68, 76, 3.2, BOIS2) + L(34, 84, 66, 84, 3.2, BOIS2);
function kalimba() { let s = R(22, 8, 56, 86, BOIS, 12) + C(50, 70, 9, NOIR, 1.8) + L(24, 34, 76, 34, 3, ENC); for (let i = 0; i < 7; i++) { const h = 26 + (3 - Math.abs(3 - i)) * 5; s += R(27 + i * 7.3, 34 - h, 4.2, h + 2, ACIER, 1); } return s; }
const balafon = () => { let s = L(8, 20, 92, 20, 2.6); for (let i = 0; i < 8; i++) { const x = 11 + i * 10; s += C(x + 3.5, 66, 8 - i * 0.6, "#D8A64A", 1.6) + R(x, 22, 7, 38 - i * 2, BOIS, 1.5); } return s + L(8, 94, 92, 94, 2.4); };
const marimba = () => { let s = ""; for (let i = 0; i < 9; i++) { const x = 9 + i * 9, t = 56 - i * 3.6; s += R(x + 0.5, 46, 6.4, t, "#d9b88f", 3); } for (let i = 0; i < 9; i++) { const x = 9 + i * 9, h = 36 - i * 2; s += R(x, 32 - 0, 7.4, 18 - i * 0.2, BOIS, 1.5) ; } return L(6, 30, 94, 30, 2.4) + s + L(10, 96, 90, 96, 2.4); };
const vibraphone = () => { let s = ""; for (let i = 0; i < 9; i++) { const x = 9 + i * 9, t = 50 - i * 3; s += R(x + 0.5, 42, 6.4, t, "#d9dde3", 3) + R(x, 28, 7.4, 16, ARGENT, 1.5); } return L(6, 26, 94, 26, 2.4) + s + C(88, 90, 5, OR, 1.4) + L(10, 96, 84, 96, 2.4); };
const glockenspiel = () => { let s = P("M6 26 L94 26 L84 80 L16 80 Z", "none", 2.6); for (let i = 0; i < 9; i++) { const x = 18 + i * 7.6, h = 44 - i * 2.6; s += R(x, 80 - h - 4, 6, h, ARGENT, 1.4); } return s + L(22, 8, 40, 36, 2.4) + C(21, 7, 3.4, ROUGE, 1.4); };
const FABRIQUE = {
  violons1: () => cordeFrottee(0.9), violons2: () => cordeFrottee(0.9), altos: () => cordeFrottee(0.97), violoncelles: () => cordeFrottee(1.03, L(50, 94, 50, 100, 2.4)), contrebasses: () => cordeFrottee(1.07, L(50, 94, 50, 100, 2.4)),
  harpe, piccolo: () => flute(true), flutes: () => flute(false), hautbois: () => anche("hautbois"), corAnglais: () => anche("cor"), clarinettes: () => anche("clarinette"), clarinetteBasse: () => anche("basse"), bassons: basson,
  cors: cor, trompettes: trompette, trombones: trombone, tuba, timbales: timbale, caisseClaire, grosseCaisse, cymbales, tamTam: tamtam, xylophone, cloches, celesta, triangle, tambourBasque, castagnettes, blocsChinois, fouet
};
// Les dessins de TIMBRE (scène et monde) : ils ne sont pas dans le plan de l'orchestre, donc pas dans identifiants().
const SUPPLEMENT = {
  "guitare-elec": () => guitare("elec"), "guitare-jazz": () => guitare("jazz"), "guitare-folk": () => guitare("folk"), basse: () => guitare("basse"), piano, clavecin, orgue, djembe, kalimba, balafon, marimba, vibraphone, glockenspiel,
};
// Le dessin d'un instrument, à placer dans un <svg viewBox="0 0 100 100"> ou dans un groupe transformé.
export function dessin(id) { const f = FABRIQUE[id] || SUPPLEMENT[id]; return f ? f() : ""; }
export const identifiants = () => Object.keys(FABRIQUE);
export const identifiantsTimbre = () => Object.keys(SUPPLEMENT);
export const svgIcone = (id, taille, titre) => '<svg class="icone" viewBox="0 0 100 100" width="' + taille + '" height="' + taille + '" role="img" aria-label="' + (titre || id) + '">' + dessin(id) + "</svg>";
