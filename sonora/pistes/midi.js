// MIDI dans SONORA Pistes : jouer un instrument de la Library au clavier MIDI ou au clavier de l'ordinateur, enregistrer les notes, les rendre en clip audio sur une piste.
// Sans DOM : testé dans Node. Le rendu est celui du noyau SONORA (le même que l'export de Pistes et du Studio) : ce qu'on entend à l'écran est ce qui est mis sur la piste.
import { frequenceMidi } from "../studio/midi.js?v=56d45a54ec";
import { rendre } from "../src/rendu.js?v=56d45a54ec";

// Le clavier de l'ordinateur comme un petit clavier de piano : la rangée du milieu (Q S D F G H J K L M) pour les touches blanches, celle du dessus pour les noires.
// Z et X descendent ou montent d'une octave. La touche donne un écart en demi-tons depuis le do de l'octave courante.
export const TOUCHES = { q: 0, z2: null, s: 2, d: 4, f: 5, g: 7, h: 9, j: 11, k: 12, l: 14, m: 16, "2": 1, "3": 3, "5": 6, "6": 8, "7": 10, "9": 13, "0": 15 };
delete TOUCHES.z2;
export const noteDeTouche = (touche, octave) => (Object.prototype.hasOwnProperty.call(TOUCHES, touche) ? 12 * (octave + 1) + TOUCHES[touche] : null); // octave 4 : do du milieu = 60
export const NOMS_NOTES = ["do", "do dièse", "ré", "ré dièse", "mi", "fa", "fa dièse", "sol", "sol dièse", "la", "la dièse", "si"];
export const nomNote = n => `${NOMS_NOTES[((n % 12) + 12) % 12]} ${Math.floor(n / 12) - 1}`;

// Un enregistreur de notes : noteOn et noteOff avec la date en secondes (sur la ligne de temps du projet). Une note encore tenue est fermée à la fin de la prise.
export class EnregistreurNotes {
  constructor() { this.notes = []; this.ouvertes = new Map(); this.suite = 1; }
  noteOn(note, hauteur, vitesse, t) { if (this.ouvertes.has(note)) this.noteOff(note, t); const n = { id: this.suite++, note, hauteur, vitesse: vitesse ?? 1, t, fin: null }; this.notes.push(n); this.ouvertes.set(note, n); return n; }
  noteOff(note, t) { const n = this.ouvertes.get(note); if (!n) return null; n.fin = Math.max(t, n.t + 0.02); this.ouvertes.delete(note); return n; }
  fermer(t) { for (const n of [...this.ouvertes.keys()]) this.noteOff(n, t); }
  get vide() { return this.notes.length === 0; }
  debut() { return this.notes.length ? Math.min(...this.notes.map(n => n.t)) : 0; }
}

// Les notes en événements du moteur, dates en échantillons depuis `depart` (secondes). À date égale, un relâchement passe avant l'attaque suivante.
export function evenementsDe(notes, depart, sr) {
  const ev = []; for (const n of notes) { const a = Math.round((n.t - depart) * sr), f = Math.round(((n.fin ?? n.t + 0.3) - depart) * sr); ev.push({ a, on: n.id, hauteur: n.hauteur, vitesse: n.vitesse }, { a: Math.max(a + 1, f), off: n.id }); }
  return ev.sort((x, y) => x.a - y.a || (x.off !== undefined ? -1 : 1));
}
// Rend les notes jouées avec un module polyphonique : { canaux, sr, duree, debut } ; `queue` secondes de plus pour laisser mourir la dernière note.
export function rendreNotes(module, notes, { sr = 44100, queue = 1.5 } = {}) {
  if (!notes.length) throw new Error("Aucune note à rendre.");
  const debut = Math.min(...notes.map(n => n.t)), fin = Math.max(...notes.map(n => n.fin ?? n.t + 0.3)), n = Math.ceil((fin - debut + queue) * sr);
  const sortie = rendre(module, { sr, n, notes: evenementsDe(notes, debut, sr) });
  return { canaux: sortie.canaux.slice(0, 2), sr, duree: n / sr, debut };
}
// Les gammes du clavier. Avec une gamme à m degrés, chaque touche est un degré : la touche 60 est le degré 0 (le do central), 61 le degré 1, et ainsi de suite ; l'octave revient tous les m degrés.
// Les valeurs sont en cents (1200 par octave). Ce sont des modèles : une tradition n'a pas une seule intonation, et un gamelan a son propre accord.
export const GAMMES = {
  egal: { nom: "Tempérament égal (12 notes par octave)", cents: null },
  slendro: { nom: "Slendro approché : cinq pas égaux de 240 cents (chaque gamelan a son accord)", cents: [0, 240, 480, 720, 960] },
  juste: { nom: "Gamme majeure juste : sept degrés aux rapports simples (9/8, 5/4, 4/3, 3/2, 5/3, 15/8)", cents: [0, 203.91, 386.31, 498.04, 701.96, 884.36, 1088.27] },
  rast: { nom: "Rast approché en quarts de ton : le troisième et le septième degrés à 350 et 1050 cents", cents: [0, 200, 350, 500, 700, 900, 1050] },
};
export function frequenceGamme(note, gamme = "egal", accord = 440) {
  const g = GAMMES[gamme]; if (!g || !g.cents) return frequenceMidi(note, accord);
  const d = note - 60, m = g.cents.length, octave = Math.floor(d / m), i = ((d % m) + m) % m; return frequenceMidi(60, accord) * Math.pow(2, (g.cents[i] + 1200 * octave) / 1200);
}
export { frequenceMidi };
