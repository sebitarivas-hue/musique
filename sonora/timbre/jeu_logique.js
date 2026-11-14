// TIMBRE : la logique du jeu, sans DOM (testée dans Node) : niveaux, questions, points, étoiles.
import { alea } from "../orchestre/timbres_logique.js?v=508eaef1fd";
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

/* ---------- Les autres jeux : tout est tiré au hasard à chaque partie, deux élèves côte à côte n'ont jamais la même série ---------- */
const pioche = (liste, rnd) => liste[Math.floor(rnd() * liste.length)];
// Une note que les deux instruments savent jouer, au milieu de leurs zones (sinon la note commune).
export function notePartagee(a, b, rnd) {
  const lo = Math.max(a.echant[0] + 1, b.echant[0] + 1, 48), hi = Math.min(a.echant[1] - 1, b.echant[1] - 1, 76);
  return lo <= hi ? lo + Math.floor(rnd() * (hi - lo + 1)) : NOTE_COMMUNE;
}
// L'intrus : trois sons sur la même note, deux du même instrument, un d'un autre. difficulte de 0 à 1 : au-dessus de 0,5 l'intrus est de la même famille.
export function creerIntrus(pool, difficulte, rnd) {
  const base = pool.filter(i => peut(i, NOTE_COMMUNE)), a = pioche(base, rnd), autres = base.filter(i => i.id !== a.id);
  const proches = autres.filter(i => i.groupe === a.groupe), loin = autres.filter(i => i.groupe !== a.groupe);
  const b = pioche(difficulte > .5 && proches.length ? proches : loin.length ? loin : autres, rnd);
  return { majorite: a.id, intrus: b.id, note: notePartagee(a, b, rnd), position: Math.floor(rnd() * 3) };
}
// Plus haut, plus bas : l'écart rétrécit avec la série (de 7 demi-tons à 1).
export function creerHautBas(inst, serie, rnd) {
  const ecart = Math.max(1, 7 - Math.floor(serie / 2)), dir = rnd() < .5 ? -1 : 1;
  const lo = Math.max(inst.echant[0] + ecart + 1, 48), hi = Math.min(inst.echant[1] - ecart - 1, 79), a = lo <= hi ? lo + Math.floor(rnd() * (hi - lo + 1)) : NOTE_COMMUNE;
  return { a, b: a + dir * ecart, haut: dir > 0, ecart };
}
// Mémoire : la suite gagne un élément par tour, jamais trois fois le même à la suite.
export function ajouterMemoire(seq, rnd, n = 4) { let x; do { x = Math.floor(rnd() * n); } while (seq.length >= 2 && seq[seq.length - 1] === x && seq[seq.length - 2] === x); return seq.concat(x); }
// Paires : nb instruments, chacun deux fois, cartes mélangées. Tous jouent la même note : seul le timbre distingue les cartes.
export function creerPaires(pool, nb, rnd) {
  const insts = melanger(pool.filter(i => peut(i, NOTE_COMMUNE)), rnd).slice(0, nb);
  return melanger(insts.concat(insts).map(i => i.id), rnd);
}
// Survie : plus on avance, plus il y a de choix et moins il y a de temps.
export const survieParams = n => ({ choix: Math.min(6, 4 + Math.floor(n / 6)), secondes: Math.max(5, 12 - Math.floor(n / 3)), note: "variee", proches: n >= 10 });
// Le niveau du joueur dans TIMBRE (gardé sur l'appareil) : il faut de plus en plus de points pour monter.
export function niveauJoueur(xp) { const n = Math.floor(Math.sqrt(Math.max(0, xp) / 120)) + 1, bas = 120 * (n - 1) ** 2, haut = 120 * n ** 2; return { n, bas, haut, part: (xp - bas) / (haut - bas) }; }
const TITRES = ["Oreille curieuse", "Oreille attentive", "Oreille fine", "Oreille experte", "Oreille d'or", "Oreille absolue"];
export const titreJoueur = n => TITRES[Math.min(TITRES.length - 1, Math.floor((n - 1) / 3))];
