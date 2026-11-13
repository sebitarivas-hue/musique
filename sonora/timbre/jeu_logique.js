// TIMBRE : la logique du jeu, sans DOM (testée dans Node) : niveaux, questions, points, étoiles.
import { alea } from "../orchestre/timbres_logique.js?v=0c2ed3b721";
export { alea };

export const MANCHES = 10;
// Trois niveaux : on ajoute des choix, on retire du temps, puis on retire l'indice de hauteur (la même note pour tous : seul le timbre compte).
export const NIVEAUX = [
  { n: 1, nom: "Échauffement", choix: 4, secondes: 20, note: "variee", proches: false, texte: "Quatre choix, vingt secondes. Les instruments sont très différents." },
  { n: 2, nom: "Oreille fine", choix: 5, secondes: 15, note: "variee", proches: false, texte: "Cinq choix, quinze secondes, toutes les familles mélangées." },
  { n: 3, nom: "Expert", choix: 6, secondes: 10, note: "commune", proches: true, texte: "Six choix, dix secondes, la même note pour tous : seul le timbre te renseigne." },
];
export const NOTE_COMMUNE = 60;
const peut = (i, m) => m >= i.echant[0] && m <= i.echant[1];

export function melanger(liste, rnd) { const a = liste.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// Une note jouable par l'instrument, au milieu de sa zone enregistrée (jamais aux extrêmes, où la transposition s'entend).
export function noteDe(inst, niveau, rnd) {
  if (niveau.note === "commune") { if (peut(inst, NOTE_COMMUNE)) return NOTE_COMMUNE; return Math.max(inst.echant[0], Math.min(inst.echant[1], NOTE_COMMUNE)); }
  const lo = Math.max(inst.echant[0] + 2, 40), hi = Math.min(inst.echant[1] - 2, 84), a = Math.min(lo, hi), b = Math.max(lo, hi);
  return a + Math.floor(rnd() * (b - a + 1));
}

// Les instruments entre lesquels on choisit. Niveau 1 : des familles différentes ; niveau 3 : des instruments qui se ressemblent.
export function choixPour(juste, pool, niveau, rnd) {
  const n = Math.min(niveau.choix, pool.length), autres = pool.filter(i => i.id !== juste.id);
  const memeGroupe = melanger(autres.filter(i => i.groupe === juste.groupe), rnd), autreGroupe = melanger(autres.filter(i => i.groupe !== juste.groupe), rnd);
  const ordre = niveau.proches ? memeGroupe.concat(autreGroupe) : autreGroupe.concat(memeGroupe);
  return melanger([juste].concat(ordre.slice(0, n - 1)), rnd);
}

export function creerQuestions(pool, niveau, rnd, nb = MANCHES) {
  // Au niveau 3, seuls les instruments qui savent jouer la note commune sont interrogés.
  const cibles = niveau.note === "commune" ? pool.filter(i => peut(i, NOTE_COMMUNE)) : pool, base = cibles.length ? cibles : pool;
  let file = [], derniere = null; const qs = [];
  while (qs.length < nb) {
    if (!file.length) file = melanger(base, rnd);
    let i = file.shift(); if (i.id === derniere && file.length) { file.push(i); i = file.shift(); }
    derniere = i.id; qs.push({ id: i.id, note: noteDe(i, niveau, rnd), choix: choixPour(i, pool, niveau, rnd).map(c => c.id) });
  }
  return qs;
}

// Points d'une réponse : 100 pour une bonne réponse, jusqu'à 100 de bonus de rapidité, jusqu'à 50 de bonus de série (10 par bonne réponse d'affilée à partir de la deuxième).
export function points({ juste, restant, total, serie }) {
  if (!juste) return 0;
  return 100 + Math.round(100 * Math.max(0, Math.min(restant, total)) / total) + Math.min(50, 10 * Math.max(0, serie - 1));
}
// Étoiles : les mêmes seuils que la ludothèque du site (9 ou 10 sur 10 : trois ; 8 sur 10 : deux ; 5 sur 10 : une).
export const etoilesDe = (bonnes, manches = MANCHES) => bonnes >= manches - 1 ? 3 : bonnes >= Math.ceil(manches * .75) ? 2 : bonnes >= Math.ceil(manches * .5) ? 1 : 0;
export const niveauOuvert = (etoiles, univers, n) => n === 1 || (etoiles[`${univers}:${n - 1}`] || 0) >= 2;

// Le défi du jour : la même série pour toute la classe le même jour (la graine est la date), tous les univers mélangés. On compare les scores à voix haute.
export const graineDuJour = (d = new Date()) => { const s = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`; return parseInt(s, 10); };
