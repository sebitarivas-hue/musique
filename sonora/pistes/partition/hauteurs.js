// Hauteurs de la partition : une note écrite est { l, a, o } (lettre 0..6 = do ré mi fa sol la si, altération -2..2, octave : do central = octave 4, comme LilyPond c').
// Sans DOM : testé dans Node (tests/partition.test.js).

export const NOMS_LETTRES = "cdefgab";
const BASE = [0, 2, 4, 5, 7, 9, 11];                // demi-tons de chaque lettre au-dessus du do
const QUINTE_LETTRE = [0, 2, 4, -1, 1, 3, 5];       // place de chaque lettre sur la ligne des quintes (fa = -1, do = 0, sol = 1 ...)

export const midiDe = p => 12 * (p.o + 1) + BASE[p.l] + p.a;
export const quinteDe = p => QUINTE_LETTRE[p.l] + 7 * p.a;
export const memeNote = (a, b) => a.l === b.l && a.a === b.a && a.o === b.o;
// Numéro diatonique (do4 = 28) : sert à placer la note sur la portée.
export const diatonique = p => 7 * p.o + p.l;

// Écrit un numéro MIDI avec l'orthographe de la tonalité : on choisit, parmi les notations possibles, celle qui reste dans une fenêtre de 12 quintes autour de l'armure
// (en do majeur : do♯ ré♭ mi♭ fa♯ la♭ si♭ ; en ré majeur : do♯ ré♯ ...). `quintes` : nombre de dièses de l'armure (négatif pour des bémols).
export function ecrireMidi(midi, quintes = 0) {
  const pc = ((midi % 12) + 12) % 12, q0 = (7 * pc) % 12, bas = quintes - 4, q = q0 + 12 * Math.ceil((bas - q0) / 12);
  const a = Math.floor((q + 1) / 7), pos = q - 7 * a, l = QUINTE_LETTRE.indexOf(pos), o = Math.round((midi - BASE[l] - a) / 12 - 1);
  return { l, a, o };
}

// Les armures : nombre de dièses (+) ou de bémols (-) de chaque tonique majeure ; le mode décale (la mineur = do majeur : 0).
const DECALAGE_MODE = { major: 0, ionian: 0, minor: -3, aeolian: -3, dorian: -2, phrygian: -4, lydian: 1, mixolydian: -1, locrian: -5 };
export const MODES = Object.keys(DECALAGE_MODE);
export const quintesArmure = (tonique, mode = "major") => quinteDe({ ...tonique, o: 4 }) + (DECALAGE_MODE[mode] ?? 0);
// Nom VexFlow de l'armure (la tonalité majeure qui a les mêmes altérations).
const MAJEURES = { "-7": "Cb", "-6": "Gb", "-5": "Db", "-4": "Ab", "-3": "Eb", "-2": "Bb", "-1": "F", 0: "C", 1: "G", 2: "D", 3: "A", 4: "E", 5: "B", 6: "F#", 7: "C#" };
export const nomArmureVexflow = q => MAJEURES[Math.max(-7, Math.min(7, q))];
// Les altérations de l'armure : { lettre: alt } pour chaque lettre (0..6).
export function alterationsArmure(q) {
  const out = {}; const dieses = [3, 0, 4, 1, 5, 2, 6], bemols = [6, 2, 5, 1, 4, 0, 3];   // fa do sol ré la mi si ; si mi la ré sol do fa
  if (q > 0) for (let i = 0; i < Math.min(7, q); i++) out[dieses[i]] = 1; else for (let i = 0; i < Math.min(7, -q); i++) out[bemols[i]] = -1;
  return out;
}
const FR = ["do", "ré", "mi", "fa", "sol", "la", "si"], ALT_FR = { "-2": "♭♭", "-1": "♭", 0: "", 1: "♯", 2: "𝄪" };
export const nomFrancais = p => FR[p.l] + ALT_FR[p.a];
export const nomTonalite = (q, mode = "major") => {
  // tonique à partir des quintes : on retrouve la lettre et l'altération de la tonique majeure, puis on la décale pour le mode
  const maj = q - (DECALAGE_MODE[mode] ?? 0), a = Math.floor((maj + 1) / 7), l = QUINTE_LETTRE.indexOf(maj - 7 * a);
  return `${FR[l]}${ALT_FR[a]} ${mode === "minor" || mode === "aeolian" ? "mineur" : mode === "major" || mode === "ionian" ? "majeur" : mode}`;
};

// Les nuances et leur vitesse MIDI (mf = 0,8 : la vitesse par défaut de Pistes).
export const NUANCES = ["ppp", "pp", "p", "mp", "mf", "f", "ff", "fff"];
export const VITESSE_NUANCE = { ppp: 0.2, pp: 0.32, p: 0.45, mp: 0.6, mf: 0.8, f: 0.9, ff: 0.96, fff: 1, sf: 0.95, sfz: 0.95, fp: 0.9, rfz: 0.95 };
export const nuanceDeVitesse = v => { let m = "mf", d = 9; for (const n of NUANCES) { const e = Math.abs(VITESSE_NUANCE[n] - v); if (e < d) { d = e; m = n; } } return m; };
