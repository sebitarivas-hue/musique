// SONORA Orchestre, espace 04 « Comprendre les variations » : des transformations d'un thème (sans DOM, testées dans Node).
// Le thème est celui de l'élève (espace 05) ou le sujet d'exemple écrit pour ce cours ; le Rondeau de Purcell s'ajoutera quand une partition libre sera déposée dans le dépôt.
// Une mélodie : une liste de { m, t, d } : hauteur MIDI, début et durée en temps. Les silences sont des trous.
import { SUJET_EXEMPLE } from "./fugue_logique.js?v=d86f43e9c8";
export { SUJET_EXEMPLE };

export const melodie = notes => { const r = []; notes.forEach((m, t) => { if (m !== null && m !== undefined) r.push({ m, t, d: 1 }); }); return r; };
const par = (mel, f) => mel.map(n => ({ m: f(n.m), t: n.t, d: n.d }));
export const transposer = (mel, d) => par(mel, m => m + d);
export function renverser(mel) { if (!mel.length) return []; const axe = mel[0].m; return par(mel, m => axe - (m - axe)); }                 // miroir : ce qui montait descend, autour de la première note
export function retrograde(mel) { if (!mel.length) return []; const fin = Math.max.apply(null, mel.map(n => n.t + n.d)); return mel.map(n => ({ m: n.m, t: fin - n.t - n.d, d: n.d })).sort((a, b) => a.t - b.t); }
export function mineur(mel) { if (!mel.length) return []; const ton = ((mel[0].m % 12) + 12) % 12; return par(mel, m => { const deg = (((m - ton) % 12) + 12) % 12; return [4, 9, 11].indexOf(deg) >= 0 ? m - 1 : m; }); }   // mi, la, si abaissés d'un demi-ton
export const augmenter = mel => mel.map(n => ({ m: n.m, t: n.t * 2, d: n.d * 2 }));
export const diminuer = mel => mel.map(n => ({ m: n.m, t: n.t / 2, d: n.d / 2 }));
export function ornementer(mel) { const r = []; mel.forEach(n => { r.push({ m: n.m + 2, t: n.t, d: 0.25 }); r.push({ m: n.m, t: n.t + 0.25, d: n.d - 0.25 }); }); return r; }   // une petite note voisine, au-dessus, avant chaque note
export const dureeTemps = mel => (mel.length ? Math.max.apply(null, mel.map(n => n.t + n.d)) : 0);

export const TRANSFORMATIONS = [
  { id: "quinte", nom: "Plus haut, à la quinte", texte: "Tout le thème monte de sept demi-tons. La forme ne change pas, seule la hauteur : c'est la réponse d'une fugue.", instrument: "flutes", f: m => transposer(m, 7) },
  { id: "octave", nom: "À l'octave grave", texte: "Le même dessin, une octave plus bas : le thème prend un poids différent.", instrument: "violoncelles", f: m => transposer(m, -12) },
  { id: "renverse", nom: "Renversement", texte: "Chaque intervalle est retourné : ce qui montait descend, et inversement, comme dans un miroir.", instrument: "hautbois", f: renverser },
  { id: "retro", nom: "Rétrograde", texte: "Le thème est lu de la fin vers le début, comme un écrit à l'envers.", instrument: "clarinettes", f: retrograde },
  { id: "mineur", nom: "Mode mineur", texte: "Les notes mi, la et si sont abaissées d'un demi-ton : le même thème prend une couleur plus sombre.", instrument: "cors", f: mineur },
  { id: "augmentation", nom: "Augmentation", texte: "Toutes les notes durent deux fois plus longtemps : le thème s'étire, majestueux.", instrument: "trombones", f: augmenter },
  { id: "diminution", nom: "Diminution", texte: "Toutes les notes vont deux fois plus vite : le thème devient vif, presque une course.", instrument: "violons1", f: diminuer },
  { id: "ornement", nom: "Ornementé", texte: "Une petite note voisine précède chaque note du thème, comme une broderie.", instrument: "harpe", f: ornementer },
];
// Le thème joué par une famille, une famille après l'autre, à la manière de l'ouverture du Guide de l'orchestre : un instrument représentant chaque famille.
export const FAMILLES_THEME = [{ famille: "cordes", instrument: "violons1" }, { famille: "bois", instrument: "flutes" }, { famille: "cuivres", instrument: "trompettes" }, { famille: "percussions", instrument: "xylophone" }];
// Des événements audio (secondes) pour une mélodie, replacée par octaves dans la zone de l'instrument (voir fugue_logique.caler).
export function evenements(mel, bpm, decalage) { const dt = 60 / bpm; return mel.map(n => ({ t: n.t * dt, duree: Math.max(0.12, n.d * dt * 0.92), notes: [n.m + (decalage || 0)], vitesse: 0.8 })); }
