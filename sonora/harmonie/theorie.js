// Théorie de l'harmonie pour le jeu d'harmonie de SONORA : notes bien orthographiées, gammes et modes, accords sur chaque degré, chiffres romains,
// progressions connues, conduite des voix. Sans DOM : testé dans Node. Tout est en tempérament égal (la4 = 440 Hz).

export const LETTRES = ["do", "ré", "mi", "fa", "sol", "la", "si"];
const NATURELS = [0, 2, 4, 5, 7, 9, 11];             // demi-tons de do à chaque lettre
const ALTER = { "-2": "𝄫", "-1": "♭", "0": "", "1": "♯", "2": "𝄪" };
export const nomNote = (lettre, alt) => LETTRES[lettre] + ALTER[alt];
export const classe = (lettre, alt) => ((NATURELS[lettre] + alt) % 12 + 12) % 12;
export const frequence = midi => 440 * Math.pow(2, (midi - 69) / 12);

// Les toniques proposées : une orthographe usuelle pour chaque hauteur.
export const TONIQUES = [[0, 0], [0, 1], [1, -1], [1, 0], [2, -1], [2, 0], [3, 0], [3, 1], [4, 0], [5, -1], [5, 0], [6, -1], [6, 0]].map(([l, a]) => ({ lettre: l, alt: a, nom: nomNote(l, a), classe: classe(l, a) }));

// Modes et gammes : intervalles en demi-tons depuis la tonique. Les gammes à sept notes ont une lettre par degré (orthographe exacte) ;
// les autres sont orthographiées au plus proche.
export const MODES = {
  ionien: { nom: "Majeur (ionien)", pas: [0, 2, 4, 5, 7, 9, 11], famille: "Modes de l'échelle majeure", texte: "La gamme majeure. Lumineuse, stable : la plupart des chansons et des musiques classiques tonales." },
  dorien: { nom: "Dorien", pas: [0, 2, 3, 5, 7, 9, 10], famille: "Modes de l'échelle majeure", texte: "Mineur avec une sixte majeure : moins sombre que l'éolien. Fréquent dans les musiques traditionnelles, le jazz modal, le rock." },
  phrygien: { nom: "Phrygien", pas: [0, 1, 3, 5, 7, 8, 10], famille: "Modes de l'échelle majeure", texte: "Mineur avec une seconde mineure : le demi-ton au-dessus de la tonique lui donne sa couleur sombre et tendue." },
  lydien: { nom: "Lydien", pas: [0, 2, 4, 6, 7, 9, 11], famille: "Modes de l'échelle majeure", texte: "Majeur avec une quarte augmentée : une couleur lumineuse et suspendue, très employée dans les musiques de film." },
  mixolydien: { nom: "Mixolydien", pas: [0, 2, 4, 5, 7, 9, 10], famille: "Modes de l'échelle majeure", texte: "Majeur avec une septième mineure : la couleur du blues, du rock et de nombreuses musiques populaires." },
  eolien: { nom: "Mineur naturel (éolien)", pas: [0, 2, 3, 5, 7, 8, 10], famille: "Modes de l'échelle majeure", texte: "La gamme mineure naturelle, sans note sensible." },
  locrien: { nom: "Locrien", pas: [0, 1, 3, 5, 6, 8, 10], famille: "Modes de l'échelle majeure", texte: "Le seul mode dont la quinte est diminuée : instable, rarement pris comme tonalité." },
  mineurHarmonique: { nom: "Mineur harmonique", pas: [0, 2, 3, 5, 7, 8, 11], famille: "Mineurs", texte: "Le mineur avec une note sensible (septième haussée) : il donne un accord de dominante majeur et une seconde augmentée entre les degrés 6 et 7." },
  mineurMelodique: { nom: "Mineur mélodique (ascendant)", pas: [0, 2, 3, 5, 7, 9, 11], famille: "Mineurs", texte: "Le mineur avec sixte et septième haussées, tel qu'on le monte dans la tradition classique." },
  phrygienDominant: { nom: "Phrygien dominant", pas: [0, 1, 4, 5, 7, 8, 10], famille: "Mineurs", texte: "Cinquième mode du mineur harmonique. Seconde mineure et tierce majeure : on l'entend dans le flamenco ; il évoque le maqam hijaz, joué ici sans ses quarts de ton." },
  pentaMajeure: { nom: "Pentatonique majeure", pas: [0, 2, 4, 7, 9], famille: "Autres échelles", texte: "Cinq notes sans demi-ton. On la trouve dans de nombreuses traditions du monde, de l'Asie de l'Est à l'Afrique de l'Ouest et à l'Écosse." },
  pentaMineure: { nom: "Pentatonique mineure", pas: [0, 3, 5, 7, 10], famille: "Autres échelles", texte: "Cinq notes : le socle des improvisations de blues et de rock." },
  blues: { nom: "Gamme blues", pas: [0, 3, 5, 6, 7, 10], famille: "Autres échelles", texte: "La pentatonique mineure avec une quinte diminuée, la « blue note »." },
  parTons: { nom: "Gamme par tons", pas: [0, 2, 4, 6, 8, 10], famille: "Autres échelles", texte: "Six notes à un ton d'écart : aucun repère de tonique. Debussy l'emploie souvent." },
  octatonique: { nom: "Octatonique (demi-ton, ton)", pas: [0, 1, 3, 4, 6, 7, 9, 10], famille: "Autres échelles", texte: "Huit notes alternant demi-ton et ton : le deuxième mode à transpositions limitées de Messiaen, aussi employé par Stravinsky." },
};

// Gamme orthographiée : [{ lettre, alt, nom, classe, midi }] à partir d'une tonique et d'un octave de départ (do4 = 60).
export function gamme(tonique, mode, octave = 4) {
  const m = MODES[mode]; if (!m) throw new Error("mode inconnu : " + mode);
  const base = 12 * (octave + 1) + tonique.classe, out = [];
  m.pas.forEach((p, i) => {
    let lettre, alt;
    if (m.pas.length === 7) { lettre = (tonique.lettre + i) % 7; alt = ((tonique.classe + p) - NATURELS[lettre] + 120) % 12; if (alt > 6) alt -= 12; }
    else { const cible = (tonique.classe + p) % 12, choix = []; for (let l = 0; l < 7; l++) for (const a of [0, -1, 1]) if (classe(l, a) === cible) choix.push([l, a]); [lettre, alt] = choix.sort((x, y) => Math.abs(x[1]) - Math.abs(y[1]) || (tonique.alt < 0 ? x[1] - y[1] : y[1] - x[1]))[0]; }
    out.push({ lettre, alt, nom: nomNote(lettre, alt), classe: classe(lettre, alt), midi: base + p });
  });
  return out;
}

// Qualité d'un accord à partir de ses intervalles (en demi-tons au-dessus de la fondamentale).
const QUALITES = [
  { cle: "0,4,7", nom: "majeur", symbole: "", romain: r => r }, { cle: "0,3,7", nom: "mineur", symbole: "m", romain: r => r.toLowerCase() },
  { cle: "0,3,6", nom: "diminué", symbole: "dim", romain: r => r.toLowerCase() + "°" }, { cle: "0,4,8", nom: "augmenté", symbole: "aug", romain: r => r + "+" },
  { cle: "0,4,7,10", nom: "septième de dominante", symbole: "7", romain: r => r + "7" }, { cle: "0,4,7,11", nom: "majeur septième", symbole: "maj7", romain: r => r + "maj7" },
  { cle: "0,3,7,10", nom: "mineur septième", symbole: "m7", romain: r => r.toLowerCase() + "7" }, { cle: "0,3,6,10", nom: "demi-diminué", symbole: "m7♭5", romain: r => r.toLowerCase() + "ø7" },
  { cle: "0,3,6,9", nom: "diminué septième", symbole: "dim7", romain: r => r.toLowerCase() + "°7" }, { cle: "0,3,7,11", nom: "mineur majeur septième", symbole: "m(maj7)", romain: r => r.toLowerCase() + "(maj7)" },
  { cle: "0,4,8,11", nom: "augmenté majeur septième", symbole: "aug(maj7)", romain: r => r + "+maj7" },
];
export const QUALITE = Object.fromEntries(QUALITES.map(q => [q.nom, q]));
// Qualité d'un ensemble de hauteurs, quel que soit le renversement : on essaie chaque note comme fondamentale. Renvoie la qualité et l'indice de la fondamentale.
export function qualite(intervalles) {
  const cl = [...new Set(intervalles.map(x => ((x % 12) + 12) % 12))];
  for (let r = 0; r < cl.length; r++) { const k = cl.map(x => (x - cl[r] + 12) % 12).sort((a, b) => a - b).join(","), q = QUALITES.find(z => z.cle === k); if (q) return { ...q, fondamentale: cl[r] }; }
  return null;
}
const ROMAINS = ["I", "II", "III", "IV", "V", "VI", "VII"];

// Accord bâti par tierces sur le degré d (0 à 6) d'une gamme à sept notes : triade (3 sons) ou accord de septième (4 sons).
export function accordDegre(g, d, sons = 3) {
  if (g.length !== 7) throw new Error("accords par degré : gamme à sept notes seulement");
  const notes = []; for (let k = 0; k < sons; k++) { const i = d + 2 * k; notes.push({ ...g[i % 7], midi: g[i % 7].midi + 12 * Math.floor(i / 7) }); }
  const q = qualite(notes.map(n => n.midi - notes[0].midi));
  return { degre: d, notes, qualite: q ? q.nom : "autre", romain: q ? q.romain(ROMAINS[d]) : ROMAINS[d] + "?", nom: notes[0].nom.charAt(0).toUpperCase() + notes[0].nom.slice(1) + (q ? (q.symbole ? " " + q.symbole : "") : " ?"), nomLong: notes[0].nom.charAt(0).toUpperCase() + notes[0].nom.slice(1) + " " + (q ? q.nom : "") };
}

// Progressions connues. Les degrés sont 1 à 7 ; mode : celui de l'harmonisation. Aucune mélodie n'est donnée, seulement les enchaînements d'accords.
export const PROGRESSIONS = [
  { id: "cadence-parfaite", famille: "Classique", nom: "Cadence parfaite", degres: [4, 5, 1], mode: "ionien", texte: "Sous-dominante, dominante, tonique : la fin de phrase la plus conclusive de la musique tonale." },
  { id: "cadence-plagale", famille: "Classique", nom: "Cadence plagale", degres: [1, 4, 1], mode: "ionien", texte: "Sous-dominante puis tonique : la cadence de l'« amen » des cantiques." },
  { id: "demi-cadence", famille: "Classique", nom: "Demi-cadence", degres: [1, 4, 5], mode: "ionien", texte: "La phrase s'arrête sur la dominante : une virgule, une question qui attend la suite." },
  { id: "cadence-rompue", famille: "Classique", nom: "Cadence rompue", degres: [4, 5, 6], mode: "ionien", texte: "On attend la tonique après la dominante, et c'est le sixième degré qui arrive : une surprise." },
  { id: "pachelbel", famille: "Classique", nom: "Canon de Pachelbel", degres: [1, 5, 6, 3, 4, 1, 4, 5], mode: "ionien", texte: "La basse obstinée du Canon en ré de Johann Pachelbel (fin du XVIIe siècle), reprise par d'innombrables chansons." },
  { id: "folia", famille: "Classique", nom: "La Folia", degres: [1, 5, 1, 7, 3, 7, 1, 5], mode: "eolien", texte: "Grille de danse ibérique variée par Corelli, Vivaldi et bien d'autres aux XVIIe et XVIIIe siècles. Ici en mineur naturel ; la tradition hausse souvent la sensible pour la dominante." },
  { id: "cercle", famille: "Classique", nom: "Marche par quintes", degres: [1, 4, 7, 3, 6, 2, 5, 1], mode: "ionien", texte: "Chaque fondamentale descend d'une quinte (ou monte d'une quarte) : la marche harmonique baroque par excellence." },
  { id: "axe-pop", famille: "Pop", nom: "I, V, vi, IV", degres: [1, 5, 6, 4], mode: "ionien", texte: "La grille de centaines de chansons pop depuis les années 1960, par exemple Let It Be des Beatles." },
  { id: "doo-wop", famille: "Pop", nom: "I, vi, IV, V (années 1950)", degres: [1, 6, 4, 5], mode: "ionien", texte: "La grille des ballades des années 1950, celle de Stand by Me de Ben E. King." },
  { id: "rock", famille: "Pop", nom: "I, IV, V", degres: [1, 4, 1, 5], mode: "ionien", texte: "Trois accords : le rock'n'roll, la country, le folk." },
  { id: "pop-mineur", famille: "Pop", nom: "vi, IV, I, V", degres: [6, 4, 1, 5], mode: "ionien", texte: "La même grille que I, V, vi, IV, commencée sur le mineur : plus mélancolique." },
  { id: "blues", famille: "Blues et jazz", nom: "Blues de douze mesures", degres: [1, 1, 1, 1, 4, 4, 1, 1, 5, 4, 1, 5], mode: "ionien", accordMixolydien: true, sons: 4, texte: "La forme du blues : douze mesures, trois accords de septième de dominante." },
  { id: "ii-v-i", famille: "Blues et jazz", nom: "ii, V, I", degres: [2, 5, 1, 1], mode: "ionien", sons: 4, texte: "L'enchaînement de base du jazz, en accords de septième." },
  { id: "andalouse", famille: "Musiques du monde", nom: "Cadence andalouse", degres: [1, 7, 6, 5], mode: "mineurHarmonique", texte: "Quatre accords qui descendent vers la dominante majeure : le flamenco, et des chansons comme Hit the Road Jack. Les accords VII et VI sont pris dans le mineur naturel, la dominante dans le mineur harmonique.", emprunts: { 7: "eolien", 6: "eolien" } },
  { id: "dorien-i-iv", famille: "Musiques du monde", nom: "Aller-retour dorien i, IV", degres: [1, 4, 1, 4], mode: "dorien", texte: "Un accord mineur et un accord majeur sur le quatrième degré : la couleur du mode dorien, dans des musiques traditionnelles comme dans le rock latin." },
  { id: "mixo-bvii", famille: "Musiques du monde", nom: "I, ♭VII, IV, I (mixolydien)", degres: [1, 7, 4, 1], mode: "mixolydien", texte: "L'accord majeur sur la septième abaissée donne la couleur mixolydienne, fréquente dans les musiques celtiques et le rock." },
];

// Accords d'une progression dans une tonalité (tonique donnée), en triades ou en accords de septième.
export function accordsProgression(prog, tonique, sons) {
  const n = sons || prog.sons || 3;
  return prog.degres.map(d => {
    const mode = (prog.emprunts && prog.emprunts[d]) || prog.mode, g = gamme(tonique, mode, 3);
    // blues : chaque accord est une septième de dominante bâtie sur sa propre fondamentale (premier degré de son mixolydien)
    if (prog.accordMixolydien) { const r = g[d - 1], t = { lettre: r.lettre, alt: r.alt, nom: r.nom, classe: r.classe }, a = accordDegre(gamme(t, "mixolydien", 3), 0, n); return { ...a, degre: d - 1, romain: ["I", "II", "III", "IV", "V", "VI", "VII"][d - 1] + "7" }; }
    return accordDegre(g, d - 1, n);
  });
}

// Conduite des voix : chaque accord est joué dans le renversement le plus proche du précédent (somme des déplacements la plus petite),
// dans la zone do3 à sol5 ; la basse joue la fondamentale à l'octave inférieure.
export function voicing(accords, { bas = 52, haut = 79 } = {}) {
  let prec = null; const out = [];
  for (const a of accords) {
    const classes = a.notes.map(n => ((n.midi % 12) + 12) % 12), candidats = [];
    for (let r = 0; r < classes.length; r++) for (let oct = 3; oct <= 5; oct++) {
      const v = []; let m = 12 * (oct + 1) + classes[r]; v.push(m);
      for (let k = 1; k < classes.length; k++) { let x = 12 * (oct + 1) + classes[(r + k) % classes.length]; while (x <= v[v.length - 1]) x += 12; v.push(x); }
      if (v[0] >= bas && v[v.length - 1] <= haut) candidats.push(v);
    }
    const cout = v => prec ? v.reduce((s, x, i) => s + Math.abs(x - (prec[i] ?? prec[prec.length - 1])), 0) : Math.abs(v[0] - 60);
    const choix = candidats.sort((x, y) => cout(x) - cout(y))[0] || a.notes.map(n => n.midi);
    const basse = 12 * 3 + classes[0]; out.push({ voix: choix, basse: basse < 40 ? basse + 12 : basse, accord: a }); prec = choix;
  }
  return out;
}

// Questions du jeu d'oreille. hasard : fonction qui renvoie un nombre dans [0, 1[ (graine fixée dans les tests).
const tirer = (l, h) => l[Math.floor(h() * l.length)];
export function questionAccord(niveau, h = Math.random) {
  const types = niveau >= 2 ? ["majeur", "mineur", "diminué", "augmenté", "septième de dominante", "majeur septième", "mineur septième"] : ["majeur", "mineur", ...(niveau >= 1 ? ["diminué", "augmenté"] : [])];
  const bonne = tirer(types, h), q = QUALITE[bonne], fond = 52 + Math.floor(h() * 12), notes = q.cle.split(",").map(x => fond + +x);
  return { genre: "accord", bonne, choix: types, notes };
}
export function questionCadence(h = Math.random) {
  const ids = ["cadence-parfaite", "cadence-plagale", "demi-cadence", "cadence-rompue"], bonne = tirer(ids, h), prog = PROGRESSIONS.find(p => p.id === bonne), ton = tirer(TONIQUES, h);
  return { genre: "cadence", bonne, choix: ids, accords: accordsProgression(prog, ton), tonique: ton.nom };
}
export function questionMode(niveau, h = Math.random) {
  const ids = niveau >= 1 ? ["ionien", "dorien", "phrygien", "lydien", "mixolydien", "eolien"] : ["ionien", "eolien", "dorien"], bonne = tirer(ids, h);
  const g = gamme(TONIQUES[0], bonne, 4); return { genre: "mode", bonne, choix: ids, notes: [...g.map(n => n.midi), g[0].midi + 12] };
}
