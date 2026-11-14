// SONORA Orchestre, espace 05 « Construire une fugue » : la logique (sans DOM, testée dans Node).
// Aucune mélodie existante n'est reprise : le sujet et le contre-sujet sont ceux de l'élève (le sujet d'exemple est écrit pour ce cours).
// Exposition à 2, 3 ou 4 voix : chaque voix entre à son tour, d'abord avec le sujet (ou la réponse, le sujet transposé à la quinte), puis elle joue le contre-sujet pendant l'entrée de la voix suivante.
import { jouables } from "./donnees.js?v=d86f43e9c8";

export const PAS = 8;                                   // temps du sujet
export const DEGRES = [72, 71, 69, 67, 65, 64, 62, 60, 59, 57];   // les lignes de la grille, de l'aigu au grave : do5 à la3, gamme de do majeur
export const SUJET_EXEMPLE = [60, 64, 67, 64, 65, 62, 60, null];  // écrit pour ce cours : do mi sol mi fa ré do, puis un silence
export const CONTRE_EXEMPLE = [null, null, null, null, null, null, null, null];
// Transposition de chaque voix par rapport au sujet écrit : sujet, réponse à la quinte, sujet à l'octave grave, réponse à la quinte grave.
export const TRANSPOSITIONS = [0, 7, -12, -5];
export const ROLES = ["Sujet", "Réponse", "Sujet", "Réponse"];
export const VOIX_PAR_DEFAUT = ["flutes", "hautbois", "violoncelles", "bassons"];
export const DISSONANCES = [1, 2, 6, 10, 11];            // intervalles (en demi-tons, modulo octave) qui frottent : secondes, tritons, septièmes

// Ramène une liste de hauteurs, par octaves entières, au plus près de la zone jouable de l'instrument (les intervalles entre notes ne changent pas).
export function caler(notes, inst) {
  const z = jouables(inst), vues = notes.filter(m => m !== null); if (!z || !vues.length) return { decalage: 0, dedans: !!z };
  const moy = vues.reduce((a, b) => a + b, 0) / vues.length, milieu = (z[0] + z[1]) / 2; let d = Math.round((milieu - moy) / 12) * 12;
  const ok = dd => vues.every(m => m + dd >= z[0] && m + dd <= z[1]);
  if (!ok(d)) for (const essai of [d - 12, d + 12, d - 24, d + 24]) if (ok(essai)) { d = essai; break; }
  return { decalage: d, dedans: ok(d) };
}

const transposer = (notes, d) => notes.map(m => (m === null ? null : m + d));
// L'exposition : une liste de voix { role, instrument, entree (temps), parties: [{ debut, notes, nom }] }. n : nombre de voix (2 à 4) ; instruments : identifiants.
export function exposition(sujet, contre, n, instruments, trouver) {
  const voix = [];
  for (let k = 0; k < n; k++) {
    const inst = trouver(instruments[k]), base = TRANSPOSITIONS[k], s = transposer(sujet, base), c = transposer(contre, base);
    const cal = caler(s.concat(c), inst), parties = [{ debut: k * PAS, notes: transposer(s, cal.decalage), nom: ROLES[k] }];
    if (k + 1 < n && c.some(m => m !== null)) parties.push({ debut: (k + 1) * PAS, notes: transposer(c, cal.decalage), nom: "Contre-sujet" });
    voix.push({ role: ROLES[k], instrument: instruments[k], entree: k * PAS, parties, decalage: cal.decalage, dedans: cal.dedans });
  }
  return voix;
}
export const dureeTemps = n => n * PAS + 1;

// Les notes qui sonnent à chaque temps : [{ voix, m }]
export function sonnantes(voix, temps) {
  const r = []; voix.forEach((v, i) => { for (const p of v.parties) { const k = temps - p.debut; if (k >= 0 && k < p.notes.length && p.notes[k] !== null) r.push({ voix: i, m: p.notes[k] }); } }); return r;
}
// Les temps où deux voix frottent (seconde, septième, triton). Un indicateur pour écouter, pas une règle d'écriture.
export function frottements(voix, total) {
  const liste = [], simultanes = []; let comptes = 0;
  for (let t = 0; t < total; t++) {
    const s = sonnantes(voix, t); if (s.length < 2) continue; comptes++; let f = false;
    for (let a = 0; a < s.length; a++) for (let b = a + 1; b < s.length; b++) if (DISSONANCES.indexOf(Math.abs(s[a].m - s[b].m) % 12) >= 0) f = true;
    simultanes.push(t); if (f) liste.push(t);
  }
  return { frottes: liste, simultanes: comptes };
}
// Les événements audio d'une voix, en secondes : une note par temps, tenue presque tout le temps. Une partie marquée `tenue` (une pédale) fusionne les temps identiques consécutifs en une seule note longue.
export function evenementsVoix(voix, bpm) {
  const dt = 60 / bpm, ev = [];
  for (const p of voix.parties) {
    if (p.tenue) { let k = 0; while (k < p.notes.length) { const m = p.notes[k]; let j = k; while (j + 1 < p.notes.length && p.notes[j + 1] === m) j++; if (m !== null) ev.push({ t: (p.debut + k) * dt, duree: dt * (j - k + 1) * 0.97, notes: [m], vitesse: 0.75 }); k = j + 1; } continue; }
    p.notes.forEach((m, k) => { if (m !== null) ev.push({ t: (p.debut + k) * dt, duree: dt * 0.92, notes: [m], vitesse: 0.8 }); });
  }
  return ev;
}

// ---------------------------------------------------------------- l'anatomie d'une fugue : exposition, divertissement, strette, pédale, conclusion
// Les sections s'enchaînent dans cet ordre ; seule l'exposition est obligatoire. Chaque section est calculée à partir du sujet (et du contre-sujet) de l'élève, avec les mêmes voix et les mêmes instruments.
export const SECTIONS = [
  { id: "exposition", nom: "Exposition", obligatoire: true, texte: "Chaque voix entre à son tour : la première avec le sujet, la deuxième avec la réponse (le sujet à la quinte), et ainsi de suite. Pendant qu'une voix entre, la précédente joue le contre-sujet. L'exposition finit quand toutes les voix sont entrées." },
  { id: "divertissement", nom: "Divertissement", texte: "Un passage de transition, sans entrée complète du sujet : on reprend le début du sujet en marche, un degré plus bas à chaque fois, de voix en voix. On s'éloigne du thème pour mieux le faire revenir." },
  { id: "strette", nom: "Strette", texte: "Les entrées du sujet se rapprochent : chaque voix entre avant que la précédente ait fini, comme si les voix se poursuivaient. La tension monte." },
  { id: "pedale", nom: "Pédale", texte: "La voix la plus grave tient une seule note longue, la dominante (sol), pendant que les autres voix reprennent le début du sujet au-dessus. On sent que la fin approche." },
  { id: "conclusion", nom: "Conclusion", texte: "Toutes les voix se rejoignent sur un accord final de do majeur, tenu ensemble." },
];
const GAMME = [0, 2, 4, 5, 7, 9, 11];
// Monter ou descendre d'un nombre de degrés de la gamme de do majeur (une note hors gamme est ramenée à la note de gamme en dessous).
export function transposerDiatonique(m, n) {
  const pc = ((m % 12) + 12) % 12; let i = 0; for (let k = 0; k < 7; k++) if (GAMME[k] <= pc) i = k;
  const oct = Math.floor(m / 12), j = i + n, o2 = oct + Math.floor(j / 7); return o2 * 12 + GAMME[((j % 7) + 7) % 7];
}
export const debutDuSujet = (sujet, n = 4) => sujet.filter(m => m !== null).slice(0, n);
// La note de la classe donnée (0 = do, 7 = sol) la plus proche du bas de la zone jouable de l'instrument (ou du milieu pour les autres).
export function noteDeClasse(inst, classe, partie = 0.35) {
  const z = jouables(inst); if (!z) return null; const cible = z[0] + (z[1] - z[0]) * partie; let r = null;
  for (let m = z[0]; m <= z[1]; m++) if (((m % 12) + 12) % 12 === classe && (r === null || Math.abs(m - cible) < Math.abs(r - cible))) r = m; return r;
}
// La fugue complète. options : { divertissement, strette, pedale, conclusion } (booléens). Renvoie { voix, sections: [{ id, nom, debut, fin }], total }.
// Chaque voix garde ses parties (une partie = des notes, une par temps, à partir d'un temps de départ) ; les sections s'ajoutent à la suite de l'exposition.
export function fugueComplete(sujet, contre, n, instruments, trouver, options = {}) {
  const voix = exposition(sujet, contre, n, instruments, trouver), sections = [{ id: "exposition", nom: "Exposition", debut: 0, fin: n * PAS }]; let t = n * PAS;
  const ctx = k => { const inst = trouver(instruments[k]); return { inst, base: TRANSPOSITIONS[k], deca: voix[k].decalage }; };
  const poser = (k, debut, notes, nom, tenue) => { voix[k].parties.push({ debut, notes, nom, tenue: !!tenue }); };
  const motif = debutDuSujet(sujet, 4), actif = (id) => options[id] !== false && motif.length > 0;   // par défaut toutes les sections sont proposées
  if (n >= 2 && actif("divertissement") && options.divertissement) {   // trois reprises du début du sujet, chacune un degré plus bas, passées de voix en voix
    for (let r = 0; r < 3; r++) { const k = r % Math.min(n, 3), c = ctx(k); poser(k, t + r * 4, transposer(motif.map(m => transposerDiatonique(m, -r)), c.base + c.deca), "Divertissement"); }
    sections.push({ id: "divertissement", nom: "Divertissement", debut: t, fin: t + 12 }); t += 12;
  }
  if (n >= 2 && options.strette && sujet.some(m => m !== null)) {   // le sujet entre toutes les demi-longueurs : les voix se chevauchent
    const pas = PAS / 2; for (let k = 0; k < n; k++) { const c = ctx(k); poser(k, t + k * pas, transposer(transposer(sujet, c.base), c.deca), k % 2 ? "Réponse" : "Sujet"); }
    const fin = t + (n - 1) * pas + PAS; sections.push({ id: "strette", nom: "Strette", debut: t, fin }); t = fin;
  }
  if (n >= 2 && options.pedale && motif.length) {   // la voix la plus grave tient sol ; les autres reprennent le début du sujet, deux fois
    const bas = n - 1, cb = ctx(bas), sol = noteDeClasse(cb.inst, 7, 0.1); if (sol !== null) poser(bas, t, new Array(8).fill(sol), "Pédale", true);
    for (let k = 0; k < n - 1; k++) { const c = ctx(k), m = transposer(motif, c.base + c.deca); poser(k, t, m.concat(m), "Début du sujet"); }
    sections.push({ id: "pedale", nom: "Pédale", debut: t, fin: t + 8 }); t += 8;
  }
  if (options.conclusion && (n >= 2)) {   // accord final de do majeur, tenu quatre temps ; la voix la plus grave prend la fondamentale
    const ordre = voix.map((v, k) => k).sort((a, b) => { const za = jouables(ctx(a).inst), zb = jouables(ctx(b).inst); return za[0] + za[1] - zb[0] - zb[1]; }), classes = [0, 7, 4, 0];
    ordre.forEach((k, rang) => { const m = noteDeClasse(ctx(k).inst, classes[rang % 4], 0.45); if (m !== null) poser(k, t, new Array(4).fill(m), "Accord final", true); });
    sections.push({ id: "conclusion", nom: "Conclusion", debut: t, fin: t + 4 }); t += 4;
  }
  return { voix, sections, total: t + 1 };
}
