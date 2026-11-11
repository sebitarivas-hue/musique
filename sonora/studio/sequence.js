// Séquences : motifs euclidiens, arpèges, plan de notes exact pour le rendu hors ligne, et planificateur pour le jeu en direct. Sans DOM : testé dans Node.
import { frequenceMidi } from "./midi.js?v=f8d06958f4";

// Rythme euclidien (Bjorklund) : k impulsions réparties le plus régulièrement possible sur n pas. Renvoie un tableau de 0 et 1.
export function euclide(k, n, rotation = 0) {
  k = Math.max(0, Math.min(Math.round(k), Math.round(n))); n = Math.round(n);
  if (n <= 0) return [];
  if (k === 0) return Array(n).fill(0);
  let a = Array.from({ length: k }, () => [1]), b = Array.from({ length: n - k }, () => [0]);
  while (b.length > 1) {
    const m = Math.min(a.length, b.length), nouv = [];
    for (let i = 0; i < m; i++) nouv.push(a[i].concat(b[i]));
    const reste = a.length > b.length ? a.slice(m) : b.slice(m);
    a = nouv; b = reste;
  }
  const p = a.concat(b).flat(), r = ((rotation % n) + n) % n;
  return r ? p.slice(n - r).concat(p.slice(0, n - r)) : p; // la rotation retarde le motif de r pas
}

// Arpège : suite de `longueur` notes tirée de la liste, selon le mode.
export function arpege(notes, mode = "montant", longueur = 8, graine = 1) {
  if (!notes.length) return [];
  const tri = [...notes].sort((x, y) => x - y); let suite = [];
  if (mode === "montant") suite = tri;
  else if (mode === "descendant") suite = [...tri].reverse();
  else if (mode === "aller-retour") suite = tri.length < 3 ? tri : tri.concat(tri.slice(1, -1).reverse());
  else if (mode === "hasard") { let s = graine | 0 || 1; return Array.from({ length: longueur }, () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return tri[(s >>> 0) % tri.length]; }); }
  else throw new Error("mode d'arpège inconnu : " + mode);
  return Array.from({ length: longueur }, (_, i) => suite[i % suite.length]);
}

// Un motif est un tableau de pas : null (silence) ou { note: numéro MIDI, vitesse: 0..1 }. Construit un motif depuis un rythme et des hauteurs.
export function motifDepuis(rythme, hauteurs, vitesse = 0.8, accents = 0) {
  let j = 0; return rythme.map((x, i) => x ? { note: hauteurs[j++ % hauteurs.length], vitesse: accents && i % accents === 0 ? Math.min(1, vitesse + 0.15) : vitesse } : null);
}

// Durée d'un pas : une double croche (un quart de temps). Le swing retarde les pas impairs d'une fraction du pas (0 à 0,5).
export const dureePas = tempo => 60 / tempo / 4;
export function dateDuPas(i, tempo, swing = 0) { return (i + (i % 2 ? swing : 0)) * dureePas(tempo); }

// Plan exact pour le rendu hors ligne : notes { a, on, hauteur, vitesse } et { a, off }, en échantillons. `tours` : nombre de fois que le motif se répète.
export function planDeNotes(motif, { tempo = 120, sr = 44100, tours = 1, porte = 0.6, swing = 0, accord = 440 } = {}) {
  const notes = []; let id = 1;
  for (let t = 0; t < tours; t++) motif.forEach((p, i) => {
    if (!p) return; const d = dateDuPas(t * motif.length + i, tempo, swing), a = Math.round(d * sr), fin = Math.round((d + porte * dureePas(tempo)) * sr);
    notes.push({ a, on: id, hauteur: frequenceMidi(p.note, accord), vitesse: p.vitesse }, { a: Math.max(a + 1, fin), off: id }); id++;
  });
  notes.sort((x, y) => x.a - y.a || (x.off ? -1 : 1)); // à date égale, le relâchement passe avant l'attaque suivante
  return { notes, echantillons: Math.round(dateDuPas(tours * motif.length, tempo, 0) * sr) };
}

// Planificateur en direct : à chaque appel, renvoie les événements dont la date tombe dans [de, a[ (en secondes depuis le départ), en bouclant sur le motif.
export class Sequenceur {
  constructor(motif, { tempo = 120, porte = 0.6, swing = 0, accord = 440 } = {}) { this.motif = motif; this.tempo = tempo; this.porte = porte; this.swing = swing; this.accord = accord; this.id = 1; this.fins = []; this.suivant = 0; }
  regler(o) { Object.assign(this, o); }
  evenements(de, a) {
    const ev = [], n = this.motif.length; if (!n) return ev;
    const restantes = [];
    for (const f of this.fins) (f.t < a ? ev.push({ t: Math.max(f.t, de), type: "off", id: f.id }) : restantes.push(f)); this.fins = restantes;
    for (;;) {
      const t = dateDuPas(this.suivant, this.tempo, this.swing); if (t >= a) break;
      const p = this.motif[this.suivant % n]; this.suivant++;
      if (t < de || !p) continue;
      const id = this.id++; ev.push({ t, type: "on", id, hauteur: frequenceMidi(p.note, this.accord), vitesse: p.vitesse });
      const fin = t + this.porte * dureePas(this.tempo); if (fin < a) ev.push({ t: fin, type: "off", id }); else this.fins.push({ t: fin, id });
    }
    return ev.sort((x, y) => x.t - y.t || (x.type === "off" ? -1 : 1));
  }
  recommencer() { this.suivant = 0; this.fins = []; }
}
