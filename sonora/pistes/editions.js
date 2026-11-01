// Éditions de sons pour SONORA Pistes : chaque fonction renvoie un NOUVEAU son { canaux, sr } et ne modifie jamais l'original (on peut toujours annuler).
// Sans DOM : testé dans Node.
const copie = c => c.canaux.map(x => Float32Array.from(x));
export const duree = c => c.canaux[0].length / c.sr;
export const crete = c => { let m = 0; for (const x of c.canaux) for (let i = 0; i < x.length; i++) m = Math.max(m, Math.abs(x[i])); return m; };
export const extrait = (c, debut, d) => { const a = Math.max(0, Math.round(debut * c.sr)), b = Math.min(c.canaux[0].length, Math.round((debut + d) * c.sr)); return { canaux: c.canaux.map(x => x.slice(a, b)), sr: c.sr }; };
export const inverser = c => ({ canaux: copie(c).map(x => x.reverse()), sr: c.sr });
export function amplifier(c, db) { const g = Math.pow(10, db / 20); return { canaux: copie(c).map(x => { for (let i = 0; i < x.length; i++) x[i] *= g; return x; }), sr: c.sr }; }
// Normalise pour que la crête atteigne `cibleDb` (par défaut -1 dB) ; un son muet reste muet.
export function normaliser(c, cibleDb = -1) { const m = crete(c); return m < 1e-9 ? amplifier(c, 0) : amplifier(c, cibleDb - 20 * Math.log10(m)); }
// Fondu d'entrée et de sortie (secondes), en courbe linéaire.
export function fondu(c, { entree = 0, sortie = 0 } = {}) {
  return { canaux: copie(c).map(x => { const n = x.length, a = Math.min(n, Math.round(entree * c.sr)), b = Math.min(n, Math.round(sortie * c.sr)); for (let i = 0; i < a; i++) x[i] *= i / a; for (let i = 0; i < b; i++) x[n - 1 - i] *= i / b; return x; }), sr: c.sr };
}
// Change la vitesse de lecture : la durée est divisée par `facteur`, la hauteur multipliée par `facteur` (comme un disque). Interpolation linéaire.
export function vitesse(c, facteur) {
  if (!(facteur > 0.05 && facteur < 20)) throw new Error("facteur de vitesse hors limites");
  return { canaux: c.canaux.map(x => { const n = Math.max(1, Math.floor(x.length / facteur)), y = new Float32Array(n); for (let i = 0; i < n; i++) { const p = i * facteur, k = Math.floor(p), f = p - k; y[i] = x[k] * (1 - f) + (x[Math.min(k + 1, x.length - 1)]) * f; } return y; }), sr: c.sr };
}
export const EFFETS = {
  normaliser: { nom: "Normaliser", f: c => normaliser(c, -1), etiquette: "normalisé" }, inverser: { nom: "Inverser", f: inverser, etiquette: "inversé" },
  "gain-plus": { nom: "Gain +3 dB", f: c => amplifier(c, 3), etiquette: "+3 dB" }, "gain-moins": { nom: "Gain −3 dB", f: c => amplifier(c, -3), etiquette: "−3 dB" },
  "fondu-entree": { nom: "Fondu d'entrée", f: c => fondu(c, { entree: Math.min(1, duree(c) / 2) }), etiquette: "fondu d'entrée" }, "fondu-sortie": { nom: "Fondu de sortie", f: c => fondu(c, { sortie: Math.min(1, duree(c) / 2) }), etiquette: "fondu de sortie" },
  "vitesse-double": { nom: "Vitesse ×2 (une octave plus haut)", f: c => vitesse(c, 2), etiquette: "×2" }, "vitesse-moitie": { nom: "Vitesse ÷2 (une octave plus bas)", f: c => vitesse(c, 0.5), etiquette: "÷2" },
};
