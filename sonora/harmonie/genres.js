// L'accompagnement par genre d'Harmonie : on choisit un genre (rap boom bap, trap, pop, rock, reggae, blues, bossa nova, house, valse), et les accords de la progression sont joués
// avec une batterie, une basse et une façon de jouer les accords qui ressemblent à ce genre, au bon tempo. Chaque genre a trois variations (le beat de base, une variante, un roulement
// toutes les quatre mesures) et renvoie à son entrée de l'Atlas des musiques. Sans DOM, sans hasard : testé dans Node.
import { rendreSuite } from "./son.js?v=8514c8ba45";
import { rendreBatterie } from "./batterie.js?v=8514c8ba45";
import { rendreSuiteEch } from "./echantillons.js?v=8514c8ba45";

// Instruments enregistrés de l'accompagnement (la basse électrique de outils/banque_basses.py). Tant qu'ils ne sont pas chargés, la basse de synthèse du genre joue à leur place.
const REELS = {};
export const reelPret = nom => !!REELS[nom];
export const mettreReel = (nom, tampons) => { REELS[nom] = tampons; };

// Une mesure de seize pas (douze pour la valse). Batterie : une chaîne par pièce (« x » coup, « o » coup doux). Basse : [pas de départ, durée en pas, degré] (r fondamentale, q quinte, o octave).
// Accords : [pas, durée en pas, numéro de la note de l'accord (facultatif : toutes les notes sinon)].
export const GENRES = {
  boombap: { nom: "Rap : boom bap", tempo: 90, plage: [80, 100], swing: 0.14, kit: "reel", basse: "basse808", accords: "pianoElec", atlas: "boom-bap",
    texte: "La grosse caisse et la caisse claire se répondent, un charleston bat les croches, le tempo est lent : la base du rap des années 1990.",
    variations: [
      { nom: "Le beat de base", batterie: { kick: "x.....x...x.....", snare: "....x.......x...", hatc: "x.x.x.x.x.x.x.x." }, basse: [[0, 5, "r"], [6, 3, "r"], [10, 5, "r"]], accords: [[0, 6], [6, 2], [10, 5]] },
      { nom: "Variante, caisse claire fantôme", batterie: { kick: "x..x..x...x.....", snare: "....x.......x..o", hatc: "x.o.x.o.x.o.x.o." }, basse: [[0, 3, "r"], [3, 3, "r"], [6, 3, "r"], [10, 5, "r"]], accords: [[0, 4], [6, 4], [10, 5]] },
      { nom: "Avec roulement", batterie: { kick: "x.....x...x.....", snare: "....x.......x...", hatc: "x.x.x.x.x.x.x.x." }, basse: [[0, 5, "r"], [6, 3, "r"], [10, 5, "r"]], accords: [[0, 6], [6, 2], [10, 5]], roulement: { snare: "....x.......xxxx", kick: "x.....x...x....." } }] },
  trap: { nom: "Rap : trap", tempo: 140, plage: [130, 150], swing: 0, kit: "808", basse: "basse808", accords: "nappe", atlas: "trap",
    texte: "Un tempo rapide mais une caisse claire seulement au troisième temps, des charlestons en doubles croches et une basse 808 très longue.",
    variations: [
      { nom: "Le beat de base", batterie: { kick: "x......x..x.....", snare: "........x.......", hatc: "xxxxxxxxxxxxxxxx", hato: "..............x." }, basse: [[0, 7, "r"], [7, 3, "r"], [10, 6, "r"]], accords: [[0, 16]] },
      { nom: "Variante, cloches", batterie: { kick: "x.....x...x.....", snare: "........x.......", hatc: "x.xxx.xxx.xxx.xx", hato: "......x.......x." }, basse: [[0, 6, "r"], [6, 4, "r"], [10, 6, "r"]], accords: [[0, 2, 3], [2, 2, 2], [4, 2, 1], [6, 2, 3], [8, 2, 2], [10, 2, 1], [12, 2, 3], [14, 2, 2]] },
      { nom: "Avec roulement", batterie: { kick: "x......x..x.....", snare: "........x.......", hatc: "xxxxxxxxxxxxxxxx", hato: "..............x." }, basse: [[0, 7, "r"], [7, 3, "r"], [10, 6, "r"]], accords: [[0, 16]], roulement: { hatc: "xxxxxxxxxxxxxxxx", snare: "........x.x.xxxx" } }] },
  pop: { nom: "Pop", reelle: "basse", tempo: 108, plage: [96, 124], swing: 0, kit: "reel", basse: "sub", accords: "piano", atlas: "pop",
    texte: "Une grosse caisse et une caisse claire bien en place, une basse qui bat les croches, des accords joués à chaque temps : le rythme de beaucoup de chansons d'aujourd'hui.",
    variations: [
      { nom: "Le beat de base", batterie: { kick: "x.......x.x.....", snare: "....x.......x...", hatc: "x.x.x.x.x.x.x.x." }, basse: [[0, 2, "r"], [2, 2, "r"], [4, 2, "r"], [6, 2, "o"], [8, 2, "r"], [10, 2, "r"], [12, 2, "r"], [14, 2, "q"]], accords: [[0, 3], [4, 3], [8, 3], [12, 3]] },
      { nom: "Variante, accords syncopés", batterie: { kick: "x..x....x..x....", snare: "....x.......x...", hatc: "x.x.x.x.x.x.x.x.", shaker: ".x.x.x.x.x.x.x.x" }, basse: [[0, 3, "r"], [3, 3, "r"], [8, 3, "r"], [11, 3, "q"]], accords: [[0, 2], [3, 2], [6, 2], [10, 2], [13, 2]] },
      { nom: "Avec roulement", batterie: { kick: "x.......x.x.....", snare: "....x.......x...", hatc: "x.x.x.x.x.x.x.x." }, basse: [[0, 2, "r"], [2, 2, "r"], [4, 2, "r"], [6, 2, "o"], [8, 2, "r"], [10, 2, "r"], [12, 2, "r"], [14, 2, "q"]], accords: [[0, 3], [4, 3], [8, 3], [12, 3]], roulement: { snare: "....x.....x.xxxx", tom: "............x..." } }] },
  rock: { nom: "Rock", reelle: "basse", tempo: 120, plage: [100, 140], swing: 0, kit: "reel", basse: "sub", accords: "guitare", atlas: "rock-roll",
    texte: "La grosse caisse sur les temps 1 et 3, la caisse claire sur les temps 2 et 4, un charleston qui bat les croches, une basse qui suit : le rock de base.",
    variations: [
      { nom: "Le beat de base", batterie: { kick: "x.......x.x.....", snare: "....x.......x...", hatc: "x.x.x.x.x.x.x.x." }, basse: [[0, 2, "r"], [2, 2, "r"], [4, 2, "r"], [6, 2, "r"], [8, 2, "r"], [10, 2, "r"], [12, 2, "r"], [14, 2, "r"]], accords: [[0, 4], [4, 4], [8, 4], [12, 4]] },
      { nom: "Variante, charleston ouvert", batterie: { kick: "x.......x.x.....", snare: "....x.......x...", hato: "x...x...x...x..." }, basse: [[0, 4, "r"], [4, 4, "r"], [8, 4, "r"], [12, 4, "q"]], accords: [[0, 8], [8, 8]] },
      { nom: "Avec roulement", batterie: { kick: "x.......x.x.....", snare: "....x.......x...", hatc: "x.x.x.x.x.x.x.x." }, basse: [[0, 2, "r"], [2, 2, "r"], [4, 2, "r"], [6, 2, "r"], [8, 2, "r"], [10, 2, "r"], [12, 2, "r"], [14, 2, "r"]], accords: [[0, 4], [4, 4], [8, 4], [12, 4]], roulement: { snare: "....x...x.x.xxxx", tom: "............x.x." } }] },
  reggae: { nom: "Reggae", reelle: "basse", tempo: 76, plage: [66, 86], swing: 0, kit: "reel", basse: "sub", accords: "orgueRock", atlas: "reggae",
    texte: "Le premier temps reste vide : tout le poids tombe sur le troisième, avec la grosse caisse et le rimshot ensemble. Les accords claquent sur les contretemps.",
    variations: [
      { nom: "One drop", batterie: { kick: "........x.......", rim: "........x.......", hatc: "x.x.x.x.x.x.x.x." }, basse: [[2, 5, "r"], [8, 6, "r"]], accords: [[2, 1], [6, 1], [10, 1], [14, 1]] },
      { nom: "Variante, rockers", batterie: { kick: "x...x...x...x...", rim: "....x.......x...", hatc: "x.x.x.x.x.x.x.x." }, basse: [[0, 3, "r"], [4, 3, "r"], [8, 3, "r"], [12, 3, "q"]], accords: [[2, 1], [6, 1], [10, 1], [14, 1]] },
      { nom: "Avec roulement", batterie: { kick: "........x.......", rim: "........x.......", hatc: "x.x.x.x.x.x.x.x." }, basse: [[2, 5, "r"], [8, 6, "r"]], accords: [[2, 1], [6, 1], [10, 1], [14, 1]], roulement: { tom: "........xxxx....", rim: "........x......." } }] },
  blues: { nom: "Blues shuffle", reelle: "basse", tempo: 100, plage: [80, 120], swing: 0.33, kit: "reel", basse: "sub", accords: "orgueRock", atlas: "blues",
    texte: "Les croches sont inégales, longue puis brève, comme balancées : c'est le shuffle. La basse suit la fondamentale, puis la quinte.",
    variations: [
      { nom: "Shuffle de base", batterie: { kick: "x.......x.......", snare: "....x.......x...", hatc: "x.x.x.x.x.x.x.x." }, basse: [[0, 2, "r"], [2, 2, "r"], [4, 2, "q"], [6, 2, "q"], [8, 2, "r"], [10, 2, "r"], [12, 2, "q"], [14, 2, "q"]], accords: [[0, 3], [4, 3], [8, 3], [12, 3]] },
      { nom: "Variante, accords sur le contretemps", batterie: { kick: "x.......x.......", snare: "....x.......x...", hatc: "x.x.x.x.x.x.x.x." }, basse: [[0, 4, "r"], [4, 4, "q"], [8, 4, "r"], [12, 4, "q"]], accords: [[2, 2], [6, 2], [10, 2], [14, 2]] },
      { nom: "Avec roulement", batterie: { kick: "x.......x.......", snare: "....x.......x...", hatc: "x.x.x.x.x.x.x.x." }, basse: [[0, 2, "r"], [2, 2, "r"], [4, 2, "q"], [6, 2, "q"], [8, 2, "r"], [10, 2, "r"], [12, 2, "q"], [14, 2, "q"]], accords: [[0, 3], [4, 3], [8, 3], [12, 3]], roulement: { snare: "....x...x.x.xxxx" } }] },
  bossa: { nom: "Bossa nova", reelle: "basse", tempo: 128, plage: [110, 150], swing: 0, kit: "reel", basse: "sub", accords: "guitare", atlas: "bossa-nova",
    texte: "Une clave légère de cinq coups sur seize pas, une basse qui alterne fondamentale et quinte, des accords de guitare doux placés entre les temps.",
    variations: [
      { nom: "Le balancement de base", batterie: { rim: "x..x..x...x..x..", kick: "x.....x.x.....x.", hatc: "o.o.o.o.o.o.o.o." }, basse: [[0, 6, "r"], [6, 4, "q"], [8, 6, "r"], [14, 2, "q"]], accords: [[3, 3], [6, 3], [10, 3], [13, 3]] },
      { nom: "Variante, accords plus ouverts", batterie: { rim: "x..x..x...x..x..", kick: "x.......x.......", hatc: "o.o.o.o.o.o.o.o." }, basse: [[0, 8, "r"], [8, 8, "q"]], accords: [[3, 5], [10, 5]] },
      { nom: "Avec roulement", batterie: { rim: "x..x..x...x..x..", kick: "x.....x.x.....x.", hatc: "o.o.o.o.o.o.o.o." }, basse: [[0, 6, "r"], [6, 4, "q"], [8, 6, "r"], [14, 2, "q"]], accords: [[3, 3], [6, 3], [10, 3], [13, 3]], roulement: { tom: "............xxxx", rim: "x..x..x...x..x.." } }] },
  house: { nom: "House", tempo: 124, plage: [118, 130], swing: 0, kit: "909", basse: "sub", accords: "stab", atlas: "house",
    texte: "La grosse caisse sur chaque temps, un clap sur les temps 2 et 4, un charleston ouvert sur les contretemps, des accords brefs entre les coups : la house.",
    variations: [
      { nom: "Quatre temps au sol", batterie: { kick: "x...x...x...x...", clap: "....x.......x...", hato: "..x...x...x...x.", hatc: "x.x.x.x.x.x.x.x." }, basse: [[2, 2, "r"], [6, 2, "r"], [10, 2, "r"], [14, 2, "r"]], accords: [[2, 2], [6, 2], [10, 3], [14, 2]] },
      { nom: "Variante, accords en rebond", batterie: { kick: "x...x...x...x...", clap: "....x.......x...", hato: "..x...x...x...x.", shaker: "xxxxxxxxxxxxxxxx" }, basse: [[3, 2, "r"], [7, 2, "r"], [11, 2, "r"], [15, 1, "q"]], accords: [[3, 1], [6, 1], [11, 1], [14, 1]] },
      { nom: "Avec roulement", batterie: { kick: "x...x...x...x...", clap: "....x.......x...", hato: "..x...x...x...x.", hatc: "x.x.x.x.x.x.x.x." }, basse: [[2, 2, "r"], [6, 2, "r"], [10, 2, "r"], [14, 2, "r"]], accords: [[2, 2], [6, 2], [10, 3], [14, 2]], roulement: { clap: "....x...x.x.xxxx", kick: "x...x...x...x..." } }] },
  valse: { nom: "Valse", reelle: "basse", tempo: 120, plage: [100, 150], swing: 0, pas: 12, kit: "reel", basse: "sub", accords: "piano", atlas: null,
    texte: "Trois temps par mesure : un coup grave, puis deux coups légers. On compte « un, deux, trois ».",
    variations: [
      { nom: "Un, deux, trois", batterie: { kick: "x...........", rim: "....x...x..." }, basse: [[0, 4, "r"]], accords: [[4, 3], [8, 3]] },
      { nom: "Variante, accords arpégés", batterie: { kick: "x...........", rim: "....o...o..." }, basse: [[0, 4, "r"]], accords: [[4, 2, 1], [6, 2, 2], [8, 2, 3], [10, 2, 2]] },
      { nom: "Avec roulement", batterie: { kick: "x...........", rim: "....x...x..." }, basse: [[0, 4, "r"]], accords: [[4, 3], [8, 3]], roulement: { rim: "....x.x.xxxx", tom: "........x..." } }] },
};
export const LISTE_GENRES = Object.entries(GENRES).map(([id, g]) => [id, g.nom]);

const ramener = (m, bas, haut) => { while (m > haut) m -= 12; while (m < bas) m += 12; return m; };
const INTERVALLE = { r: 0, q: 7, o: 12 };

// Les accords d'une progression, joués avec le genre choisi. voicings : [{ basse, voix: [midi] }] (une mesure chacun). Renvoie les deux voies, et de quoi suivre la lecture
// (un événement par mesure, comme evenementsProgression de son.js) : { canaux, evenements, mesure, duree }.
export function rendreGenre(voicings, genreId, { tempo, variation = 0, instrument, sr = 44100, boucle = true } = {}) {
  const G = GENRES[genreId]; if (!G) throw new Error("genre inconnu : " + genreId);
  const V = G.variations[((variation % G.variations.length) + G.variations.length) % G.variations.length], bpm = tempo || G.tempo, pas = G.pas || 16, dur = 60 / bpm / 4, mesure = pas * dur, mesures = voicings.length, total = mesures * mesure;
  const decalage = i => (i % 2 ? (G.swing || 0) * dur : 0);
  // batterie : à la fin de chaque groupe de quatre mesures, et à la dernière mesure de la boucle, le roulement remplace le beat si la variation en a un
  const batt = rendreBatterie(V.batterie, { bpm, swing: G.swing || 0, mesures, pas, kit: G.kit, sr, parMesure: V.roulement ? m => (mesures > 1 && ((m + 1) % 4 === 0 || m === mesures - 1) ? { ...V.batterie, ...V.roulement } : null) : null });
  const basse = [], accords = [];
  voicings.forEach((v, m) => {
    const t0 = m * mesure, grave = ramener(v.basse, 28, 46);
    for (const [p, d, deg] of V.basse) basse.push({ t: t0 + p * dur + decalage(p), duree: d * dur * 0.94, notes: [ramener(grave + (INTERVALLE[deg] || 0), 28, 52)], vitesse: 0.85 });
    const notes = [...v.voix].sort((a, b) => a - b);
    for (const [p, d, n] of V.accords) accords.push({ t: t0 + p * dur + decalage(p), duree: d * dur * 0.94, notes: n === undefined ? notes : [notes[(n - 1 + notes.length) % notes.length] + (n > 2 ? 12 : 0)], vitesse: p % 4 === 0 ? 0.8 : 0.65 });
  });
  const inst = instrument || G.accords;
  const b = G.reelle && REELS[G.reelle] ? rendreSuiteEch(basse, REELS[G.reelle], { instrument: G.reelle, sr, duree: total, boucle, etale: 0, reverb: 0, relache: 0.16, niveau: 1.4 }) : rendreSuite(basse, { instrument: G.basse, sr, duree: total, boucle }), a = rendreSuite(accords, { instrument: inst, sr, duree: total, boucle });
  const n = Math.min(batt.length, b[0].length, a[0].length), L = new Float32Array(n), R = new Float32Array(n);
  const bg = b[0], bd = b[1] || b[0], ag = a[0], ad = a[1] || a[0];  // certains instruments sont mono
  // un écrêtage doux (tanh) plutôt qu'un gain global : un roulement bruyant ne baisse pas le niveau du reste de la boucle
  const doux = x => 0.92 * Math.tanh(x / 0.92);
  for (let i = 0; i < n; i++) { const d = batt[i] * 0.72; L[i] = doux(d + bg[i] * 1.0 + ag[i] * 0.95); R[i] = doux(d + bd[i] * 1.0 + ad[i] * 0.95); }
  return { canaux: [L, R], evenements: voicings.map((v, m) => ({ t: m * mesure, duree: mesure * 0.96, notes: [v.basse, ...v.voix], vitesse: 0.75 })), mesure, duree: total };
}
