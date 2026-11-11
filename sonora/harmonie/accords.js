// Le vocabulaire des accords : tous les types courants, de la triade au treizième de jazz, l'accord de Tristan et les sixtes augmentées.
// Chaque type est décrit par ses intervalles (nombre diatonique, demi-tons) : l'orthographe des notes en découle (un Fa♯ et un Sol♭ ne s'écrivent pas pareil).
// Sans DOM : testé dans Node.
import { LETTRES, nomNote, classe, frequence } from "./theorie.js?v=bae1304164";
const NATURELS = [0, 2, 4, 5, 7, 9, 11];
// [nombre, demitons] au-dessus de la fondamentale ; 9, 11 et 13 sont écrits à l'octave supérieure (demi-tons > 12).
const T = (id, nom, symbole, famille, iv, extra = {}) => ({ id, nom, symbole, famille, iv, ...extra });
export const TYPES = [
  T("maj", "majeur", "", "Triades", [[1, 0], [3, 4], [5, 7]]), T("min", "mineur", "m", "Triades", [[1, 0], [3, 3], [5, 7]]), T("dim", "diminué", "dim", "Triades", [[1, 0], [3, 3], [5, 6]]), T("aug", "augmenté", "aug", "Triades", [[1, 0], [3, 4], [5, 8]]),
  T("sus2", "suspendu 2", "sus2", "Triades", [[1, 0], [2, 2], [5, 7]]), T("sus4", "suspendu 4", "sus4", "Triades", [[1, 0], [4, 5], [5, 7]]),
  T("6", "sixte ajoutée", "6", "Sixtes", [[1, 0], [3, 4], [5, 7], [6, 9]]), T("m6", "mineur sixte", "m6", "Sixtes", [[1, 0], [3, 3], [5, 7], [6, 9]]),
  T("7", "septième de dominante", "7", "Septièmes", [[1, 0], [3, 4], [5, 7], [7, 10]]), T("maj7", "majeur septième", "maj7", "Septièmes", [[1, 0], [3, 4], [5, 7], [7, 11]]), T("m7", "mineur septième", "m7", "Septièmes", [[1, 0], [3, 3], [5, 7], [7, 10]]),
  T("m7b5", "demi-diminué", "m7♭5", "Septièmes", [[1, 0], [3, 3], [5, 6], [7, 10]]), T("dim7", "diminué septième", "dim7", "Septièmes", [[1, 0], [3, 3], [5, 6], [7, 9]]), T("mmaj7", "mineur majeur septième", "m(maj7)", "Septièmes", [[1, 0], [3, 3], [5, 7], [7, 11]]),
  T("augmaj7", "augmenté majeur septième", "aug(maj7)", "Septièmes", [[1, 0], [3, 4], [5, 8], [7, 11]]), T("7#5", "septième quinte augmentée", "7♯5", "Septièmes", [[1, 0], [3, 4], [5, 8], [7, 10]]), T("7b5", "septième quinte diminuée", "7♭5", "Septièmes", [[1, 0], [3, 4], [5, 6], [7, 10]]),
  T("7sus4", "septième suspendu 4", "7sus4", "Septièmes", [[1, 0], [4, 5], [5, 7], [7, 10]]),
  T("9", "neuvième de dominante", "9", "Neuvièmes", [[1, 0], [3, 4], [5, 7], [7, 10], [9, 14]]), T("maj9", "majeur neuvième", "maj9", "Neuvièmes", [[1, 0], [3, 4], [5, 7], [7, 11], [9, 14]]), T("m9", "mineur neuvième", "m9", "Neuvièmes", [[1, 0], [3, 3], [5, 7], [7, 10], [9, 14]]),
  T("7b9", "septième neuvième bémol", "7♭9", "Neuvièmes", [[1, 0], [3, 4], [5, 7], [7, 10], [9, 13]]), T("7#9", "septième neuvième dièse (accord de Hendrix)", "7♯9", "Neuvièmes", [[1, 0], [3, 4], [5, 7], [7, 10], [9, 15]]), T("69", "six-neuf", "6/9", "Neuvièmes", [[1, 0], [3, 4], [5, 7], [6, 9], [9, 14]]),
  T("11", "onzième de dominante", "11", "Onzièmes", [[1, 0], [3, 4], [5, 7], [7, 10], [9, 14], [11, 17]]), T("m11", "mineur onzième", "m11", "Onzièmes", [[1, 0], [3, 3], [5, 7], [7, 10], [9, 14], [11, 17]]), T("7#11", "septième onzième dièse", "7♯11", "Onzièmes", [[1, 0], [3, 4], [5, 7], [7, 10], [11, 18]]), T("maj7#11", "majeur septième onzième dièse", "maj7♯11", "Onzièmes", [[1, 0], [3, 4], [5, 7], [7, 11], [11, 18]]),
  T("13", "treizième de dominante", "13", "Treizièmes", [[1, 0], [3, 4], [7, 10], [9, 14], [13, 21]]), T("m13", "mineur treizième", "m13", "Treizièmes", [[1, 0], [3, 3], [7, 10], [9, 14], [13, 21]]), T("7b13", "septième treizième bémol", "7♭13", "Treizièmes", [[1, 0], [3, 4], [7, 10], [9, 14], [13, 20]]), T("maj13", "majeur treizième", "maj13", "Treizièmes", [[1, 0], [3, 4], [7, 11], [9, 14], [13, 21]]),
  T("alt", "dominante altérée", "7alt", "Jazz", [[1, 0], [3, 4], [7, 10], [9, 13], [9, 15], [13, 20]], { note: "septième avec neuvième bémol ou dièse et treizième bémol : la couleur des dominantes du jazz" }),
  T("tristan", "accord de Tristan", "Tristan", "Chromatiques", [[1, 0], [4, 6], [6, 10], [9, 15]], { note: "Fa, Si, Ré♯, Sol♯ : le premier accord de Tristan et Isolde de Wagner (1859), sur la fondamentale Fa. Même ensemble de notes qu'un demi-diminué, mais écrit et entendu comme une tension qui ne se résout pas là où on l'attend." }),
  T("it6", "sixte augmentée italienne", "It+6", "Chromatiques", [[1, 0], [3, 4], [6, 10]], { note: "à bâtir sur le sixième degré abaissé : sixte augmentée, tonique, quarte augmentée ; elle se résout sur la dominante" }),
  T("de6", "sixte augmentée allemande", "All+6", "Chromatiques", [[1, 0], [3, 4], [5, 7], [6, 10]], { note: "à bâtir sur le sixième degré abaissé ; la quinte la rend semblable à une septième de dominante" }),
  T("fr6", "sixte augmentée française", "Fr+6", "Chromatiques", [[1, 0], [3, 4], [4, 6], [6, 10]], { note: "à bâtir sur le sixième degré abaissé ; elle contient la quarte augmentée et la seconde, symétrique" }),
];
export const TYPE = Object.fromEntries(TYPES.map(t => [t.id, t]));
export const FAMILLES_TYPES = [...new Set(TYPES.map(t => t.famille))];

// Les douze fondamentales chromatiques avec leur orthographe habituelle.
export const RACINES = [[0, 0], [0, 1], [1, -1], [1, 0], [2, -1], [2, 0], [3, 0], [3, 1], [4, 0], [5, -1], [5, 0], [6, -1], [6, 0]].map(([l, a]) => ({ lettre: l, alt: a, classe: classe(l, a), nom: nomNote(l, a) }));
export const racinePar = nom => RACINES.find(r => r.nom === nom);

// Orthographe d'une note au-dessus d'une fondamentale : on choisit la lettre par le nombre diatonique, l'altération par les demi-tons.
function ecrire(racine, nombre, demitons) {
  const lettre = (racine.lettre + (nombre - 1)) % 7, cible = ((racine.classe + demitons) % 12 + 12) % 12; let alt = cible - NATURELS[lettre]; alt = ((alt % 12) + 12) % 12; if (alt > 6) alt -= 12;
  return { lettre, alt, nom: nomNote(lettre, alt), classe: cible };
}
export const symboleAccord = (racine, type) => racine.nom.charAt(0).toUpperCase() + racine.nom.slice(1) + TYPE[type].symbole;
// Construit l'accord : notes écrites et hauteurs (midi) à partir de la fondamentale placée à `octave`. `inversion` renverse l'accord (0 = état fondamental).
export function construire(racine, typeId, { octave = 3, inversion = 0 } = {}) {
  const t = TYPE[typeId]; if (!t) throw new Error("type d'accord inconnu : " + typeId);
  const base = 12 * (octave + 1) + racine.classe; let notes = t.iv.map(([n, d]) => ({ ...ecrire(racine, n, d), midi: base + d, nombre: n, demitons: d }));
  for (let k = 0; k < Math.min(inversion, notes.length - 1); k++) { const n = notes.shift(); notes.push({ ...n, midi: n.midi + 12 }); }
  const nom = symboleAccord(racine, typeId);
  return { racine, type: typeId, symbole: TYPE[typeId].symbole, nom, nomLong: nom + " : " + t.nom, notes, classes: notes.map(n => n.classe), inversion };
}
// Reconnaît le type d'accord d'un ensemble de classes de hauteurs, sans tenir compte du renversement : pratique pour nommer une grille entrée à la main.
export function reconnaitre(classes) {
  const cl = [...new Set(classes.map(x => ((x % 12) + 12) % 12))].sort((a, b) => a - b), trouves = [];
  for (const r of cl) { const k = cl.map(x => (x - r + 12) % 12).sort((a, b) => a - b).join(","); for (const t of TYPES) { if (t.famille === "Chromatiques") continue; const kt = [...new Set(t.iv.map(([, d]) => d % 12))].sort((a, b) => a - b).join(","); if (kt === k) trouves.push({ fondamentale: r, type: t.id }); } }
  return trouves;
}
