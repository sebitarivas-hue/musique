// SONORA Orchestre, espace 05 « Construire une fugue » : la logique (sans DOM, testée dans Node).
// Aucune mélodie existante n'est reprise : le sujet et le contre-sujet sont ceux de l'élève (le sujet d'exemple est écrit pour ce cours).
// Exposition à 2, 3 ou 4 voix : chaque voix entre à son tour, d'abord avec le sujet (ou la réponse, le sujet transposé à la quinte), puis elle joue le contre-sujet pendant l'entrée de la voix suivante.
import { jouables } from "./donnees.js?v=a6bd026c2d";

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
// Les événements audio d'une voix, en secondes : une note par temps, tenue presque tout le temps.
export function evenementsVoix(voix, bpm) {
  const dt = 60 / bpm, ev = [];
  for (const p of voix.parties) p.notes.forEach((m, k) => { if (m !== null) ev.push({ t: (p.debut + k) * dt, duree: dt * 0.92, notes: [m], vitesse: 0.8 }); });
  return ev;
}
