// Micro-intervalles et tempéraments : timbres riches pour les expériences d'écoute, intervalles de différents systèmes d'accord, tirages aléatoires.
// Sans DOM : testé dans Node. Les rapports sont ceux de la théorie ; les cents sont calculés (1200 * log2 du rapport), jamais recopiés.
export const cents = (n, d) => 1200 * Math.log2(n / d);

// Chaque timbre est un programme SONORA complet. Aucune dérive de hauteur (pas de vibrato) : on compare des écarts de quelques cents.
const PREAMBULE = `reglage ecart : Reel = 0 dans -1200 .. 1200 etiquette "Écart (cents)"
    reglage base : Reel = 440 dans 100 .. 2000 etiquette "Note de base (Hz)"
    soit f = 1 Hz * base * 2 ^ (ecart / 1200)`;
export const TIMBRES = {
  pur: { nom: "Son pur", desc: "Une sinusoïde : le son le plus nu, celui où l'écart de hauteur est le plus difficile à entendre.", corps: `sortie = sinus(f) * 0.25` },
  orgue: { nom: "Orgue", desc: "Cinq harmoniques stables : une hauteur très nette.", corps: `sortie = (sinus(f) + sinus(2 * f) * 0.55 + sinus(3 * f) * 0.35 + sinus(4 * f) * 0.22 + sinus(6 * f) * 0.12) * 0.13` },
  corde: { nom: "Corde pincée", desc: "Des harmoniques qui s'éteignent à des vitesses différentes : les aigus meurent les premiers.", corps: `soit h1 = sinus(f) * ar(0.003 s, 1.6 s)
    soit h2 = sinus(2 * f) * ar(0.003 s, 1.1 s) * 0.6
    soit h3 = sinus(3 * f) * ar(0.003 s, 0.8 s) * 0.4
    soit h4 = sinus(4 * f) * ar(0.003 s, 0.55 s) * 0.28
    soit h5 = sinus(5 * f) * ar(0.003 s, 0.4 s) * 0.18
    sortie = (h1 + h2 + h3 + h4 + h5) * 0.22` },
  cloche: { nom: "Cloche (modulation de fréquence)", desc: "Une fréquence en module une autre : des partiels qui ne sont pas des multiples de la hauteur, comme dans une vraie cloche.", corps: `soit indice = ar(0.002 s, 0.9 s) * 2.5
    sortie = sinus(f + sinus(f * 1.4) * f * indice) * ar(0.002 s, 1.4 s) * 0.28` },
  voix: { nom: "Voix (voyelle a)", desc: "Une dent de scie dont on renforce deux zones de fréquences, comme le font la bouche et la gorge.", corps: `soit source = dent(f)
    sortie = (passe_bas(source, 4000 Hz) * 0.35 + pic(source, 800 Hz, 6, 14 dB) * 0.18 + pic(source, 1150 Hz, 8, 10 dB) * 0.12) * 0.4` },
  cuivre: { nom: "Cuivre", desc: "Une dent de scie adoucie qui s'ouvre : des harmoniques nombreux, un son brillant.", corps: `soit ouverture = 1400 Hz + ar(0.05 s, 0.5 s) * 2200 Hz
    sortie = passe_bas(dent(f), ouverture, 1.1) * 0.22` },
};
export const programmeTimbre = id => `/// ${TIMBRES[id].nom} : ${TIMBRES[id].desc}\ninstrument Timbre {\n    ${PREAMBULE}\n    ${TIMBRES[id].corps}\n}\n`;

// Les intervalles : (rapport entier ou cents directs) pour chaque système d'accord.
const R = (n, d) => cents(n, d);
export const INTERVALLES = [
  { id: "quinte", nom: "Quinte", systemes: [["Tempérament égal (12 par octave)", 700, "tous les pianos accordés à l'égal"], ["Juste, rapport 3:2", R(3, 2), "la quinte pure : les deux sons battent le moins possible"], ["Mésotonique (quarte de comma)", 696.578, "quinte rétrécie pour que les tierces soient pures, usage des claviers anciens"]] },
  { id: "tierce-majeure", nom: "Tierce majeure", systemes: [["Tempérament égal", 400, ""], ["Juste, rapport 5:4", R(5, 4), "la tierce pure, plus basse de 14 cents que la tierce égale"], ["Pythagoricienne, rapport 81:64", R(81, 64), "construite par quintes superposées : plus haute, plus tendue"]] },
  { id: "tierce-mineure", nom: "Tierce mineure", systemes: [["Tempérament égal", 300, ""], ["Juste, rapport 6:5", R(6, 5), "plus haute de 16 cents que la tierce égale"], ["Pythagoricienne, rapport 32:27", R(32, 27), "plus basse de 6 cents que la tierce égale"]] },
  { id: "tierce-neutre", nom: "Tierce neutre", systemes: [["Quart de ton (24 par octave)", 350, "entre tierce mineure et majeure égales"], ["Rapport 11:9", R(11, 9), "proche de 350 cents : valeur de la théorie ; la pratique varie selon les régions et les interprètes"]] },
  { id: "quarte", nom: "Quarte", systemes: [["Tempérament égal", 500, ""], ["Juste, rapport 4:3", R(4, 3), "la quarte pure"]] },
  { id: "septieme", nom: "Septième", systemes: [["Tempérament égal (septième mineure)", 1000, ""], ["Rapport 7:4 (septième naturelle)", R(7, 4), "née de la série des harmoniques : 32 cents sous la septième égale"], ["Juste, rapport 9:5", R(9, 5), ""], ["Pythagoricienne, rapport 16:9", R(16, 9), ""]] },
];
export const intervalle = id => INTERVALLES.find(i => i.id === id);

// Les systèmes d'accord dans le monde : des repères, pas des définitions. Chaque tradition a ses variantes ; les valeurs données sont celles de la théorie ou d'une idéalisation.
export const SYSTEMES = [
  { id: "egal", nom: "Tempérament égal à douze", ou: "Musique occidentale, pianos, claviers, la plupart des musiques populaires amplifiées", texte: "L'octave est coupée en douze demi-tons égaux de 100 cents. Aucun intervalle sauf l'octave n'est pur, mais on peut jouer dans toutes les tonalités.", atlas: ["western-classical", "pop"] },
  { id: "juste", nom: "Intonation juste et pythagoricienne", ou: "Théorie de l'Antiquité, polyphonies chantées, instruments sans frettes", texte: "Les intervalles sont fixés par des rapports simples (3:2, 5:4, 4:3). Les voix et les cordes non frettées peuvent s'y ajuster.", atlas: ["western-classical", "georgian-polyphony"] },
  { id: "quarts", nom: "Quarts de ton et maqâm", ou: "Monde arabe, Turquie, Iran", texte: "Dans le maqâm, certains degrés se placent entre les demi-tons : on les décrit souvent comme des quarts de ton (24 par octave), mais la valeur d'un degré varie selon le maqâm, la région et l'interprète. Les théories turque et persane découpent l'octave autrement.", atlas: ["maqam", "persian-music", "turkish-music"] },
  { id: "gamelan", nom: "Slendro et pélog", ou: "Java, Bali", texte: "Le slendro a cinq notes par octave, à peu près équidistantes ; le pélog en a sept, inégalement espacées. Chaque gamelan est accordé pour lui-même : deux gamelans n'ont pas les mêmes hauteurs, et les instruments d'un même jeu sont accordés ensemble, pas sur un diapason commun.", atlas: ["gamelan"] },
  { id: "shruti", nom: "Les shruti et les ragas", ou: "Inde du Nord et du Sud", texte: "La théorie parle de vingt-deux shruti dans l'octave. En pratique, un raga fixe la manière de poser chaque note et de glisser de l'une à l'autre : l'intonation fait partie de l'identité du raga.", atlas: ["hindustani", "carnatic"] },
  { id: "blues", nom: "La note bleue", ou: "Blues, jazz, gospel", texte: "La tierce et la septième du blues flottent entre le mineur et le majeur. Les chanteurs et les guitaristes les infléchissent, ce que le clavier tempéré ne peut pas faire.", atlas: ["blues", "jazz", "gospel"] },
  { id: "harmoniques", nom: "La série des harmoniques", ou: "Chant diphonique, didgeridoo, cor naturel", texte: "Certaines musiques jouent directement avec les harmoniques naturels d'un son : leurs hauteurs ne sont pas celles du clavier (le septième harmonique est 32 cents sous la septième égale).", atlas: ["khoomei", "didgeridoo"] },
];

// Tirage de variantes autour d'un modèle : n versions dont l'écart à la valeur théorique est tiré au hasard dans [-max, +max] cents, deux à deux distinctes d'au moins `pas` cents.
export function tirerVariantes(modele, n = 5, max = 10, pas = 1.5, hasard = Math.random) {
  const ecarts = [];
  for (let essai = 0; ecarts.length < n && essai < 500; essai++) { const e = Math.round((hasard() * 2 - 1) * max * 10) / 10; if (ecarts.every(x => Math.abs(x - e) >= pas)) ecarts.push(e); }
  if (ecarts.length < n) throw new Error("tirage impossible : trop de variantes pour l'étendue demandée");
  return ecarts.map((e, i) => ({ rang: i, ecart: e, cents: modele + e }));
}
// Classement exact des versions du plus bas au plus haut.
export const ordreJuste = variantes => [...variantes].sort((a, b) => a.ecart - b.ecart).map(v => v.rang);
export function noteDe(base, cents) { return base * Math.pow(2, cents / 1200); }

// Noms des entrées de l'Atlas citées ci-dessus (les liens sont vérifiés par le test contre les données de l'Atlas).
export const NOMS_ATLAS = { "western-classical": "Tradition classique occidentale", pop: "Pop", "georgian-polyphony": "Polyphonie géorgienne", maqam: "Maqam", "persian-music": "Musique persane", "turkish-music": "Musique turque", gamelan: "Gamelan",
  hindustani: "Musique classique hindoustanie", carnatic: "Musique carnatique", blues: "Blues", jazz: "Jazz", gospel: "Gospel", khoomei: "Chant diphonique", didgeridoo: "Didgeridoo" };
