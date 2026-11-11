// SONORA Orchestre, espace 03 « Reconnaître les timbres » : la logique des questions et de la comparaison (sans DOM, testée dans Node).
// Seuls les instruments enregistrés dans la banque du site sont interrogés : on ne fait jamais deviner un son qui n'existe pas. Les seconds violons ont le même son que les premiers : une seule entrée, « Violons ».
import { INSTRUMENTS, FAMILLES, ORDRE_FAMILLES, jouables } from "./donnees.js?v=38029b7b21";

export const POOL = INSTRUMENTS.filter(i => i.banque && i.id !== "violons2");
export const etiquette = i => (i.id === "violons1" ? "Violons" : i.nom);
export const NOTE_COMMUNE = 60;   // do4 : la note que presque tous les instruments peuvent jouer
export const peutJouer = (i, m) => { const z = jouables(i); return !!z && m >= z[0] && m <= z[1]; };

// Générateur pseudo-aléatoire à graine (mulberry32) : un test peut rejouer exactement la même série ; sans graine, une série différente chaque fois.
export function alea(graine) { let a = (graine >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export function melanger(liste, rnd) { const l = liste.slice(); for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const x = l[i]; l[i] = l[j]; l[j] = x; } return l; }

// Une note au hasard dans la partie centrale de la zone jouable (les extrêmes sonnent moins bien et trahissent l'instrument).
export function noteAleatoire(inst, rnd) { const z = jouables(inst), cote = Math.round((z[1] - z[0]) * 0.2); return z[0] + cote + Math.floor(rnd() * (z[1] - z[0] - 2 * cote + 1)); }

// Une note que les deux instruments peuvent jouer, la plus proche de do4 ; null s'il n'y en a pas.
export function noteCommune(a, b) {
  const za = jouables(a), zb = jouables(b); if (!za || !zb) return null;
  const lo = Math.max(za[0], zb[0]), hi = Math.min(za[1], zb[1]); if (lo > hi) return null;
  return Math.max(lo, Math.min(hi, NOTE_COMMUNE));
}

// n questions sans répétition. options : { mode: "famille" | "instrument", memeNote: bool }. Une question : { id, note, choix, bonne }.
// En mode « instrument », les trois mauvaises réponses viennent d'abord de la même famille : distinguer deux bois est plus fin que distinguer un bois d'un cuivre.
export function creerQuestions(n, options, rnd) {
  const mode = options.mode === "famille" ? "famille" : "instrument", reserve = options.memeNote ? POOL.filter(i => peutJouer(i, NOTE_COMMUNE)) : POOL;
  const tirage = melanger(reserve, rnd).slice(0, Math.min(n, reserve.length));
  return tirage.map(inst => {
    const note = options.memeNote ? NOTE_COMMUNE : noteAleatoire(inst, rnd);
    if (mode === "famille") return { id: inst.id, note, choix: ORDRE_FAMILLES.slice(), bonne: inst.fam };
    const memeFam = melanger(reserve.filter(i => i.id !== inst.id && i.fam === inst.fam), rnd), autres = melanger(reserve.filter(i => i.id !== inst.id && i.fam !== inst.fam), rnd);
    const faux = memeFam.concat(autres).slice(0, 3).map(i => i.id);
    return { id: inst.id, note, choix: melanger([inst.id].concat(faux), rnd), bonne: inst.id };
  });
}
export const reponseJuste = (q, r) => q.bonne === r;
export const libelleChoix = (q, c) => (FAMILLES[c] ? FAMILLES[c].court : etiquette(INSTRUMENTS.find(i => i.id === c)));
