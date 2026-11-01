// MIDI : traduction des messages d'un clavier en événements pour le moteur. Sans DOM : testé dans Node.
export const frequenceMidi = (n, accord = 440) => accord * Math.pow(2, (n - 69) / 12);
// Renvoie null (message ignoré) ou { type: "note-on"|"note-off"|"pedale"|"molette"|"controle", ... }.
export function traduire(octets, accord = 440) {
  if (!octets || octets.length < 2) return null;
  const s = octets[0] & 0xf0, canal = octets[0] & 0x0f, a = octets[1] & 0x7f, b = (octets[2] ?? 0) & 0x7f;
  if (s === 0x90 && b > 0) return { type: "note-on", canal, note: a, hauteur: frequenceMidi(a, accord), vitesse: b / 127 };
  if (s === 0x80 || (s === 0x90 && b === 0)) return { type: "note-off", canal, note: a };
  if (s === 0xb0 && a === 64) return { type: "pedale", canal, actif: b >= 64 };
  if (s === 0xb0) return { type: "controle", canal, numero: a, valeur: b / 127 };
  if (s === 0xe0) return { type: "molette", canal, valeur: (((b << 7) | a) - 8192) / 8192 };
  return null;
}
// Pédale de maintien : tant qu'elle est enfoncée, les relâchements sont retardés jusqu'à son relâchement.
export class Clavier {
  constructor(sortie, accord = 440) { this.sortie = sortie; this.accord = accord; this.pedale = false; this.tenues = new Set(); this.maintenues = new Set(); }
  recevoir(octets) {
    const m = traduire(octets, this.accord); if (!m) return null;
    if (m.type === "note-on") { this.maintenues.delete(m.note); this.tenues.add(m.note); this.sortie.noteOn(m.note, m.hauteur, m.vitesse); }
    else if (m.type === "note-off") { this.tenues.delete(m.note); if (this.pedale) this.maintenues.add(m.note); else this.sortie.noteOff(m.note); }
    else if (m.type === "pedale") { this.pedale = m.actif; if (!m.actif) { for (const n of this.maintenues) this.sortie.noteOff(n); this.maintenues.clear(); } }
    else if (m.type === "controle" && this.sortie.controle) this.sortie.controle(m.numero, m.valeur);
    return m;
  }
  toutCouper() { for (const n of [...this.tenues, ...this.maintenues]) this.sortie.noteOff(n); this.tenues.clear(); this.maintenues.clear(); this.pedale = false; }
}
// Branche toutes les entrées MIDI disponibles. acces : résultat de navigator.requestMIDIAccess().
export function brancher(acces, clavier) {
  const ecouteur = e => clavier.recevoir(e.data);
  const noms = []; for (const entree of acces.inputs.values()) { entree.onmidimessage = ecouteur; noms.push(entree.name || "entrée MIDI"); }
  acces.onstatechange = () => { for (const entree of acces.inputs.values()) if (!entree.onmidimessage) entree.onmidimessage = ecouteur; };
  return noms;
}
