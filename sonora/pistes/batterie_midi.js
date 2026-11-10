// La batterie en MIDI : les notes de batterie de la norme General MIDI (36 grosse caisse, 38 caisse claire, 42 charleston fermé...) jouent les pièces des kits de SONORA.
// Un clip de batterie est donc un clip de notes comme les autres : on l'enregistre au clavier, on le change dans le rouleau, il suit le tempo, il s'exporte en fichier MIDI
// (les notes de batterie de General MIDI sont comprises par tous les logiciels). Sans DOM : testé dans Node.
import { son, KITS, kitPret, chargerKit } from "../harmonie/batterie.js?v=d9c6f78dfe";

// La pièce du kit que joue chaque note. Les notes qui n'ont pas de pièce propre (les autres toms, les autres cymbales) jouent la plus proche.
export const PIECE_DE_NOTE = {
  35: "kick", 36: "kick", 37: "rim", 38: "snare", 39: "clap", 40: "snare", 41: "tom", 42: "hatc", 43: "tom", 44: "hatc", 45: "tom", 46: "hato", 47: "tom", 48: "tom",
  49: "crash", 50: "tom", 51: "ride", 52: "crash", 53: "ride", 54: "shaker", 55: "crash", 56: "cow", 57: "crash", 58: "shaker", 59: "ride", 70: "shaker",
};
// Les lignes du rouleau de batterie, de haut en bas : une note canonique par pièce (celle que l'on pose, et que l'on retrouve à l'export).
export const LIGNES = [49, 51, 46, 42, 56, 70, 39, 38, 37, 41, 36];
export const NOMS_LIGNES = { 49: "Cymbale crash", 51: "Cymbale ride", 46: "Charleston ouvert", 42: "Charleston fermé", 56: "Cloche", 70: "Shaker", 39: "Clap", 38: "Caisse claire", 37: "Rimshot", 41: "Tom", 36: "Grosse caisse" };
export const NOTES_BATTERIE = Object.keys(PIECE_DE_NOTE).map(Number);
export const estBatterie = idInstrument => typeof idInstrument === "string" && idInstrument.startsWith("batt:");
export const kitDe = idInstrument => estBatterie(idInstrument) ? idInstrument.slice(5) : null;
export const nomDeKit = kit => KITS[kit] || kit;
// La ligne du rouleau où tombe une note quelconque.
const LIGNE_DE_PIECE = { crash: 49, ride: 51, hato: 46, hatc: 42, cow: 56, shaker: 70, clap: 39, snare: 38, rim: 37, tom: 41, kick: 36 };
export const ligneDe = n => LIGNE_DE_PIECE[PIECE_DE_NOTE[n]] ?? (n < 36 ? 36 : n > 59 ? 49 : 41);

const hz = m => 440 * Math.pow(2, (m - 69) / 12);
// Les tampons d'un kit, dans la forme de tous les instruments enregistrés de Pistes : { f, canal, sr, off, ponctuel }. La fréquence du tampon est celle de sa note : la note jouée retombe exactement
// dessus, sans transposition. `ponctuel` : la pièce sonne en entier, quelle que soit la durée de la note. Plusieurs prises (variantes) alternent pour un jeu moins mécanique : voir `prise`.
export function tamponsBatterie(kit, sr = 44100) {
  return NOTES_BATTERIE.map(n => ({ f: hz(n), canal: Float32Array.from(son(PIECE_DE_NOTE[n], kit, sr, "x", 0)), sr, off: 0, ponctuel: true, note: n }));
}
// Le chargement : la vraie batterie (enregistrée) se charge par le réseau ; les autres kits sont calculés.
export async function tamponsBatterieAsync(kit, sr = 44100) {
  if (kit === "reel" && !kitPret("reel")) { try { await chargerKit(); } catch (_) { /* sans enregistrement : la batterie douce calculée joue à la place */ } }
  return tamponsBatterie(kit, sr);
}
// Les instruments de batterie proposés dans Pistes : [identifiant, nom].
export const INSTRUMENTS_BATTERIE = [["batt:reel", "Vraie batterie"], ["batt:909", "Boîte à rythmes sèche"], ["batt:808", "Boîte à rythmes grave"], ["batt:acoustique", "Batterie douce"]];
