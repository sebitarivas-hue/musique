// La bibliothèque de sons et de rythmes de Pistes : de quoi remplir un projet sans rien importer. Trois familles :
//   Batterie   chaque pièce (grosse caisse, caisse claire, clap, charlestons, rimshot, tom, cloche, shaker) dans chacun des trois jeux de sons : 27 coups ;
//   Rythmes    les trois variations de chacun des neuf genres d'Harmonie, et des rythmes du monde (clave, tresillo, habanera, cloche à douze pas, aksak, teental, pieds grecs),
//              joués à deux mesures, au tempo du projet ;
//   Sons       les neuf sons de synthèse d'Harmonie (basse 808, sous-basse, lead, nappe, piano électrique, pincé, orgue rock, cloches, stab) sur la note et la durée de son choix.
// Tout est fabriqué à la demande, sans fichier ni réseau, et reproductible. Sans DOM : testé dans Node.
import { son as pieceBatterie, rendreBatterie, SONS_BATTERIE, KITS } from "../harmonie/batterie.js?v=0639c5e8d0";
import { GENRES } from "../harmonie/genres.js?v=0639c5e8d0";
import { SONS_SYNTHESE } from "../harmonie/sons_synthese.js?v=0639c5e8d0";
import { rendreSuite } from "../harmonie/son.js?v=0639c5e8d0";

export const NOMS_PIECES = { kick: "Grosse caisse", snare: "Caisse claire", clap: "Clap", hatc: "Charleston fermé", hato: "Charleston ouvert", rim: "Rimshot", tom: "Tom", cow: "Cloche", shaker: "Shaker" };
// Des rythmes du monde, sur seize pas (huit, neuf ou douze quand le rythme l'exige). Les mêmes que ceux de l'atelier sonore du cours.
export const RYTHMES_MONDE = [
  { id: "clave-son", nom: "Clave son 3-2", bpm: 100, pas: 16, kit: "909", grille: { cow: "x..x..x...x.x..." } },
  { id: "clave-rumba", nom: "Clave rumba", bpm: 100, pas: 16, kit: "909", grille: { cow: "x..x...x..x.x..." } },
  { id: "tresillo", nom: "Tresillo (3 + 3 + 2)", bpm: 100, pas: 16, kit: "909", grille: { kick: "x..x..x.x..x..x." } },
  { id: "habanera", nom: "Habanera", bpm: 96, pas: 8, kit: "909", grille: { kick: "x..xx.x." } },
  { id: "bembe", nom: "Cloche à douze pas (bembé)", bpm: 120, pas: 12, kit: "909", grille: { cow: "x.x.xx.x.x.x" } },
  { id: "aksak", nom: "Aksak (2 + 2 + 2 + 3)", bpm: 130, pas: 9, kit: "909", grille: { kick: "x.x.x.x.." } },
  { id: "teental", nom: "Teental (16 temps, Inde du Nord)", bpm: 60, pas: 16, kit: "909", grille: { tom: "x...x...x...x...", clap: "x...x.......x..." } },
  { id: "iambe", nom: "Iambe : brève, longue", bpm: 100, pas: 12, kit: "909", grille: { rim: "x.....x.....", tom: "..x.....x..." } },
  { id: "dactyle", nom: "Dactyle : longue, brève, brève", bpm: 100, pas: 16, kit: "909", grille: { tom: "x.......x.......", rim: "....x.x.....x.x." } },
];
export const CATEGORIES = [["batterie", "Batterie"], ["rythmes", "Rythmes"], ["sons", "Sons"]];
export const NOTES = Array.from({ length: 49 }, (_, i) => 24 + i);   // do1 à do5
export const NOM_NOTE = m => ["do", "do♯", "ré", "ré♯", "mi", "fa", "fa♯", "sol", "sol♯", "la", "la♯", "si"][m % 12] + (Math.floor(m / 12) - 1);

// La liste des éléments, rangés par famille. Chacun : { id, famille, nom, type: "coup" | "boucle" | "note", ... }.
export function elements() {
  const L = [];
  for (const kit of Object.keys(KITS)) for (const p of SONS_BATTERIE) L.push({ id: `bat:${kit}:${p}`, famille: "batterie", nom: `${NOMS_PIECES[p]}, ${KITS[kit].toLowerCase()}`, type: "coup", kit, piece: p });
  for (const [g, G] of Object.entries(GENRES)) G.variations.forEach((V, i) => L.push({ id: `ryt:${g}:${i}`, famille: "rythmes", nom: `${G.nom}, ${V.nom.toLowerCase()}`, type: "boucle", tempo: G.tempo, genre: g, variation: i, atlas: G.atlas }));
  for (const R of RYTHMES_MONDE) L.push({ id: `ryt:monde:${R.id}`, famille: "rythmes", nom: R.nom, type: "boucle", tempo: R.bpm, monde: R.id });
  for (const [k, S] of Object.entries(SONS_SYNTHESE)) L.push({ id: `syn:${k}`, famille: "sons", nom: S.nom, type: "note", instrument: k, note: ["basse808", "sub"].includes(k) ? 36 : k === "lead" ? 67 : k === "cloches" ? 72 : 60 });
  return L;
}
const mono = x => [x];
// Gain, puis un plafond : plusieurs pièces qui tombent ensemble ne doivent pas dépasser 0,95.
const niveau = (x, g) => { let m = 0; for (let i = 0; i < x.length; i++) { x[i] *= g; m = Math.max(m, Math.abs(x[i])); } if (m > 0.95) { const k = 0.95 / m; for (let i = 0; i < x.length; i++) x[i] *= k; } return x; };

// Fabrique l'audio d'un élément : { nom, canaux: [Float32Array, ...], sr }. options : tempo (boucles), note et duree (sons de synthèse), sr.
export function fabriquer(el, { tempo, note, duree = 1.5, sr = 44100 } = {}) {
  if (el.type === "coup") { const x = Float32Array.from(pieceBatterie(el.piece, el.kit, sr)); return { nom: el.nom, canaux: mono(niveau(x, 0.85)), sr }; }
  if (el.type === "boucle") {
    const R = el.monde ? RYTHMES_MONDE.find(r => r.id === el.monde) : null, G = el.genre ? GENRES[el.genre] : null, V = G ? G.variations[el.variation] : null, bpm = tempo || (R ? R.bpm : G.tempo);
    const x = rendreBatterie(R ? R.grille : V.batterie, { bpm, swing: G ? G.swing : 0, mesures: 2, pas: R ? R.pas : (G.pas || 16), kit: R ? R.kit : G.kit, sr, parMesure: V && V.roulement ? m => (m === 1 ? { ...V.batterie, ...V.roulement } : null) : null });
    return { nom: `${el.nom}, ${Math.round(bpm)} par minute`, canaux: mono(niveau(x, 0.8)), sr };
  }
  const m = note ?? el.note, c = rendreSuite([{ t: 0.02, duree, notes: [m], vitesse: 0.85 }], { instrument: el.instrument, sr, duree: duree + 1.3 });
  return { nom: `${el.nom}, ${NOM_NOTE(m)}`, canaux: c.slice(0, 2).map(x => Float32Array.from(x)), sr };
}

// ---------------------------------------------------------------- le séquenceur à pas : une grille de pièces de batterie, qu'on remplit puis qu'on transforme en clip
export const PAS_LONGUEURS = [8, 12, 16, 24, 32];
export function grilleVide(pas = 16) { return Object.fromEntries(SONS_BATTERIE.map(p => [p, ".".repeat(pas)])); }
// Redimensionne une grille (coupe ou complète avec des silences).
export function redimensionner(grille, pas) { return Object.fromEntries(Object.entries(grille).map(([p, c]) => [p, c.slice(0, pas).padEnd(pas, ".")])); }
// Fait passer un pas d'un état à l'autre : silence, coup, coup doux.
export function basculer(grille, piece, i) { const c = grille[piece]; if (!c || i < 0 || i >= c.length) return grille; const n = c[i] === "." ? "x" : c[i] === "x" ? "o" : "."; grille[piece] = c.slice(0, i) + n + c.slice(i + 1); return grille; }
export const nombreCoups = grille => Object.values(grille).reduce((s, c) => s + [...c].filter(x => x !== ".").length, 0);
// Charge dans une grille les motifs d'un élément « boucle » (pour le modifier ensuite).
export function grilleDe(el) { const R = el.monde ? RYTHMES_MONDE.find(r => r.id === el.monde) : null, G = el.genre ? GENRES[el.genre] : null; const g = R ? R.grille : G.variations[el.variation].batterie, pas = R ? R.pas : (G.pas || 16);
  return { grille: redimensionner({ ...grilleVide(pas), ...g }, pas), pas, kit: R ? R.kit : G.kit, swing: G ? G.swing : 0, tempo: R ? R.bpm : G.tempo }; }
// Rend une grille en audio : `mesures` mesures de `pas` pas, au tempo du projet. { nom, canaux, sr } ou null si la grille est vide.
export function rendreGrille(grille, { pas = 16, tempo = 100, swing = 0, kit = "909", mesures = 2, sr = 44100, nom = "Motif" } = {}) {
  if (!nombreCoups(grille)) return null; const x = rendreBatterie(grille, { bpm: tempo, swing, mesures, pas, kit, sr }); return { nom, canaux: mono(niveau(x, 0.8)), sr };
}
