// Dimensions physiques et unités. Une dimension est un vecteur d'exposants :
//   T temps, P phase (en tours), L niveau logarithmique (dB), I intervalle logarithmique (demi-tons).
// Après vérification, toutes les quantités sont des flottants dans les unités de base : s, Hz, tour, dB, demi-ton.

export const ZERO = Object.freeze({ T: 0, P: 0, L: 0, I: 0 });
export const dim = o => Object.freeze({ ...ZERO, ...o });
export const D_TEMPS = dim({ T: 1 }), D_FREQ = dim({ T: -1 }), D_PHASE = dim({ P: 1 }), D_NIVEAU = dim({ L: 1 }), D_INTERVALLE = dim({ I: 1 });

export const egal = (a, b) => a.T === b.T && a.P === b.P && a.L === b.L && a.I === b.I;
export const estZero = a => egal(a, ZERO);
export const mul = (a, b) => dim({ T: a.T + b.T, P: a.P + b.P, L: a.L + b.L, I: a.I + b.I });
export const div = (a, b) => dim({ T: a.T - b.T, P: a.P - b.P, L: a.L - b.L, I: a.I - b.I });
export const puissance = (a, k) => dim({ T: a.T * k, P: a.P * k, L: a.L * k, I: a.I * k });
// Une dimension n'a un sens physique que si les exposants logarithmiques valent 0 ou 1.
export const sensPhysique = a => a.L >= 0 && a.L <= 1 && a.I >= 0 && a.I <= 1 && !(a.L && a.I);

export function nom(d) {
  if (estZero(d)) return "sans unité";
  if (egal(d, D_FREQ)) return "une fréquence (Hz)";
  if (egal(d, D_TEMPS)) return "une durée (s)";
  if (egal(d, D_PHASE)) return "une phase (tour)";
  if (egal(d, D_NIVEAU)) return "un niveau (dB)";
  if (egal(d, D_INTERVALLE)) return "un intervalle (demi-tons)";
  const p = [];
  if (d.T) p.push(`s^${d.T}`); if (d.P) p.push(`tour^${d.P}`); if (d.L) p.push(`dB^${d.L}`); if (d.I) p.push(`dt^${d.I}`);
  return p.join(" ");
}

const DOUBLE_PI = 2 * Math.PI;
// unité : dimension, facteur vers l'unité de base
export const UNITES = {
  s: { d: D_TEMPS, f: 1 }, ms: { d: D_TEMPS, f: 0.001 }, ech: { d: D_TEMPS, f: 1, ech: true },
  Hz: { d: D_FREQ, f: 1 }, kHz: { d: D_FREQ, f: 1000 }, bpm: { d: D_FREQ, f: 1 / 60 },
  dB: { d: D_NIVEAU, f: 1 },
  tour: { d: D_PHASE, f: 1 }, rad: { d: D_PHASE, f: 1 / DOUBLE_PI }, deg: { d: D_PHASE, f: 1 / 360 },
  dt: { d: D_INTERVALLE, f: 1 }, ct: { d: D_INTERVALLE, f: 0.01 },
  "%": { d: ZERO, f: 0.01 },
};

// Les notes : do re mi fa sol la si, avec # ou b, et l'octave (la4 = 440 Hz au diapason de référence).
const CLASSES = { do: 0, re: 2, mi: 4, fa: 5, sol: 7, la: 9, si: 11 };
export function frequenceNote(nomNote, accord = 440) {
  const m = /^(do|re|mi|fa|sol|la|si)(#|b)?(-?\d)$/.exec(nomNote);
  if (!m) return null;
  const midi = 12 * (Number(m[3]) + 1) + CLASSES[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0);
  return accord * Math.pow(2, (midi - 69) / 12);
}
