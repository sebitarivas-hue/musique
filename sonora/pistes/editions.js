// Éditions de sons pour SONORA Pistes : chaque fonction renvoie un NOUVEAU son { canaux, sr } et ne modifie jamais l'original (on peut toujours annuler).
// Sans DOM : testé dans Node.
import { reglablesVoix } from "./voix.js?v=4898d7d9e1";
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

// ---------------------------------------------------------------- effets réglables (filtre, égaliseur, écho, compresseur, transposition) : calcul pur, sans DOM
// Filtres du cahier de recettes d'Audio EQ (R. Bristow-Johnson) : un filtre numérique du second degré, appliqué voie par voie.
export function coefficients(type, freq, sr, q = 0.707, gainDb = 0) {
  const f = Math.max(10, Math.min(freq, sr * 0.49)), w = 2 * Math.PI * f / sr, cs = Math.cos(w), sn = Math.sin(w), al = sn / (2 * q), A = Math.pow(10, gainDb / 40), r = 2 * Math.sqrt(A) * al; let b0, b1, b2, a0, a1, a2;
  if (type === "passe-bas") { b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = b0; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; }
  else if (type === "passe-haut") { b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = b0; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; }
  else if (type === "passe-bande") { b0 = al; b1 = 0; b2 = -al; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; }
  else if (type === "coupe-bande") { b0 = 1; b1 = -2 * cs; b2 = 1; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; }
  else if (type === "pic") { b0 = 1 + al * A; b1 = -2 * cs; b2 = 1 - al * A; a0 = 1 + al / A; a1 = -2 * cs; a2 = 1 - al / A; }
  else if (type === "etagere-graves") { b0 = A * ((A + 1) - (A - 1) * cs + r); b1 = 2 * A * ((A - 1) - (A + 1) * cs); b2 = A * ((A + 1) - (A - 1) * cs - r); a0 = (A + 1) + (A - 1) * cs + r; a1 = -2 * ((A - 1) + (A + 1) * cs); a2 = (A + 1) + (A - 1) * cs - r; }
  else if (type === "etagere-aigus") { b0 = A * ((A + 1) + (A - 1) * cs + r); b1 = -2 * A * ((A - 1) + (A + 1) * cs); b2 = A * ((A + 1) + (A - 1) * cs - r); a0 = (A + 1) - (A - 1) * cs + r; a1 = 2 * ((A - 1) - (A + 1) * cs); a2 = (A + 1) - (A - 1) * cs - r; }
  else throw new Error("type de filtre inconnu : " + type);
  return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
}
function biquadCanal(x, [b0, b1, b2, a1, a2]) { const y = new Float32Array(x.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0; for (let i = 0; i < x.length; i++) { const v = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v; } return y; }
export function filtrer(c, type, freq, q = 0.707, gainDb = 0) { const k = coefficients(type, freq, c.sr, q, gainDb); return { canaux: c.canaux.map(x => biquadCanal(x, k)), sr: c.sr }; }
export function egaliseur(c, { graves = 0, mediums = 0, aigus = 0 } = {}) {
  let r = c; if (graves) r = filtrer(r, "etagere-graves", 200, 0.707, graves); if (mediums) r = filtrer(r, "pic", 1000, 0.7, mediums); if (aigus) r = filtrer(r, "etagere-aigus", 4000, 0.707, aigus); return r === c ? { canaux: copie(c), sr: c.sr } : r;
}
// Écho : y = x + mélange × d, avec d[n] = x[n - D] + retour × d[n - D]. La durée s'allonge pour laisser mourir les répétitions (6 secondes au plus).
export function echo(c, { delai = 0.3, retour = 0.4, melange = 0.5 } = {}) {
  const D = Math.max(1, Math.round(delai * c.sr)), n = c.canaux[0].length, k = retour > 0 && melange > 0 ? Math.ceil(Math.log(0.001 / melange) / Math.log(retour)) : 0, queue = Math.min(Math.round(6 * c.sr), D * (Math.max(0, k) + 1)), N = n + queue;
  return { canaux: c.canaux.map(x => { const y = new Float32Array(N), d = new Float32Array(N); for (let i = 0; i < N; i++) { const e = i < n ? x[i] : 0; if (i >= D) d[i] = (i - D < n ? x[i - D] : 0) + retour * d[i - D]; y[i] = e + melange * d[i]; } return y; }), sr: c.sr };
}
// Compresseur : réduit l'écart entre les passages forts et faibles. Au-dessus du seuil, chaque `rapport` décibels d'entrée ne donnent plus qu'un décibel de sortie.
export function compresseur(c, { seuil = -20, rapport = 4, attaque = 0.01, relache = 0.15, gainAuto = false } = {}) {
  const n = c.canaux[0].length, sr = c.sr, ca = Math.exp(-1 / (Math.max(1e-4, attaque) * sr)), cr = Math.exp(-1 / (Math.max(1e-3, relache) * sr)), mk = gainAuto ? Math.pow(10, (-seuil * (1 - 1 / rapport) * 0.5) / 20) : 1, env = new Float32Array(n); let e = 0;
  for (let i = 0; i < n; i++) { let m = 0; for (const x of c.canaux) m = Math.max(m, Math.abs(x[i])); e = m > e ? ca * e + (1 - ca) * m : cr * e + (1 - cr) * m; const db = 20 * Math.log10(Math.max(e, 1e-9)), sur = db - seuil; env[i] = sur > 0 ? Math.pow(10, -(sur * (1 - 1 / rapport)) / 20) * mk : mk; }
  return { canaux: c.canaux.map(x => { const y = new Float32Array(n); for (let i = 0; i < n; i++) y[i] = x[i] * env[i]; return y; }), sr };
}
// Étirement sans changer la hauteur (WSOLA) : on superpose des grains, en choisissant à chaque fois le point de lecture qui prolonge le mieux le grain précédent. `facteur` 2 : deux fois plus long.
export function etirer(c, facteur) {
  if (!(facteur > 0.25 && facteur < 4)) throw new Error("facteur d'étirement hors limites");
  const N = Math.pow(2, Math.round(Math.log2(0.046 * c.sr))), hs = N / 2, ha = hs / facteur, delta = N / 4, fen = Float32Array.from({ length: N }, (_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N));
  return { canaux: c.canaux.map(x => {
    const n = x.length, L = Math.max(1, Math.round(n * facteur)), y = new Float32Array(L + N), w = new Float32Array(L + N), lire = i => (i >= 0 && i < n ? x[i] : 0); let prec = 0;
    for (let k = 0; k * hs < L; k++) {
      const nominal = Math.round(k * ha); let s = nominal;
      if (k > 0) { let meilleur = -Infinity; const cible = prec + hs; for (let t = Math.max(0, nominal - delta); t <= Math.min(n - 1, nominal + delta); t += 2) { let p = 0; for (let i = 0; i < N / 2; i += 4) p += lire(t + i) * lire(cible + i); if (p > meilleur) { meilleur = p; s = t; } } }
      prec = s; for (let i = 0; i < N; i++) { y[k * hs + i] += lire(s + i) * fen[i]; w[k * hs + i] += fen[i]; }
    }
    const r = new Float32Array(L); for (let i = 0; i < L; i++) r[i] = w[i] > 1e-3 ? y[i] / w[i] : 0; return r; }), sr: c.sr };
}
// Transposer sans changer la durée : on accélère ou ralentit la lecture (la hauteur change, la durée aussi), puis on rend la durée d'origine par étirement.
export function transposer(c, demitons) {
  if (!demitons) return { canaux: copie(c), sr: c.sr }; const r = Math.pow(2, demitons / 12); return etirer(vitesse(c, r), r);
}
const LOG = (v, a, b) => a * Math.pow(b / a, v);   // v de 0 à 1 vers une échelle logarithmique
// Les effets à régler : chaque paramètre a un libellé, des bornes et une unité ; la fenêtre de réglage est construite à partir de cette table.
export const REGLABLES = {
  "reglage-filtre": { nom: "Filtre", etiquette: "filtre", texte: "Un filtre garde certaines fréquences et en retire d'autres. Passe-bas : il garde les graves (son sourd). Passe-haut : il garde les aigus (son mince). Passe-bande : il ne garde qu'une zone. Coupe-bande : il retire une zone.",
    params: [{ id: "type", libelle: "Type", choix: [["passe-bas", "Passe-bas"], ["passe-haut", "Passe-haut"], ["passe-bande", "Passe-bande"], ["coupe-bande", "Coupe-bande"]], def: "passe-bas" }, { id: "freq", libelle: "Fréquence de coupure", min: 40, max: 12000, log: true, def: 1000, unite: "Hz" }, { id: "q", libelle: "Résonance", min: 0.3, max: 10, pas: 0.1, def: 0.7 }],
    f: (c, v) => filtrer(c, v.type, v.freq, v.q) },
  "reglage-egaliseur": { nom: "Égaliseur", etiquette: "égaliseur", texte: "L'égaliseur relève ou baisse trois zones : les graves (sous 200 Hz), les médiums (autour de 1 000 Hz) et les aigus (au-dessus de 4 000 Hz).",
    params: [{ id: "graves", libelle: "Graves", min: -18, max: 18, pas: 0.5, def: 0, unite: "dB" }, { id: "mediums", libelle: "Médiums", min: -18, max: 18, pas: 0.5, def: 0, unite: "dB" }, { id: "aigus", libelle: "Aigus", min: -18, max: 18, pas: 0.5, def: 0, unite: "dB" }],
    f: (c, v) => egaliseur(c, v) },
  "reglage-echo": { nom: "Écho", etiquette: "écho", texte: "Un écho répète le son avec un retard. Le retour dit combien de fois il se répète ; le mélange, combien on l'entend par rapport au son d'origine.",
    params: [{ id: "delai", libelle: "Retard", min: 0.05, max: 1.5, pas: 0.01, def: 0.3, unite: "s" }, { id: "retour", libelle: "Retour", min: 0, max: 0.9, pas: 0.01, def: 0.4 }, { id: "melange", libelle: "Mélange", min: 0, max: 1, pas: 0.01, def: 0.5 }],
    f: (c, v) => echo(c, v) },
  "reglage-compresseur": { nom: "Compresseur", etiquette: "compresseur", texte: "Le compresseur baisse le volume quand le son dépasse le seuil, pour rapprocher les passages forts des passages faibles. Un rapport de 4 : quatre décibels au-dessus du seuil n'en donnent plus qu'un.",
    params: [{ id: "seuil", libelle: "Seuil", min: -60, max: 0, pas: 1, def: -20, unite: "dB" }, { id: "rapport", libelle: "Rapport", min: 1, max: 20, pas: 0.5, def: 4 }, { id: "attaque", libelle: "Attaque", min: 0.001, max: 0.2, log: true, def: 0.01, unite: "s" }, { id: "relache", libelle: "Relâchement", min: 0.02, max: 1, log: true, def: 0.15, unite: "s" }, { id: "gainAuto", libelle: "Remonter le volume après compression", case: true, def: true }],
    f: (c, v) => compresseur(c, v) },
  "reglage-transposer": { nom: "Transposer sans changer la durée", etiquette: "transposé", texte: "Monte ou descend le son de quelques demi-tons sans l'accélérer ni le ralentir (douze demi-tons : une octave). À l'inverse, « Vitesse » change la hauteur et la durée ensemble, comme un disque.",
    params: [{ id: "demitons", libelle: "Demi-tons", min: -12, max: 12, pas: 1, def: 3 }], f: (c, v) => transposer(c, v.demitons) },
  "reglage-fondu": { nom: "Fondu", etiquette: "fondu", texte: "Le volume monte au début, descend à la fin, sur la durée que tu choisis.",
    params: [{ id: "entree", libelle: "Fondu d'entrée", min: 0, max: 5, pas: 0.05, def: 0.5, unite: "s" }, { id: "sortie", libelle: "Fondu de sortie", min: 0, max: 5, pas: 0.05, def: 0.5, unite: "s" }], f: (c, v) => fondu(c, v) },
  "reglage-gain": { nom: "Gain", etiquette: "gain", texte: "Monte ou baisse le volume du clip. Six décibels de plus : deux fois la hauteur de l'onde.",
    params: [{ id: "db", libelle: "Gain", min: -24, max: 24, pas: 0.5, def: 6, unite: "dB" }], f: (c, v) => amplifier(c, v.db) },
};
Object.assign(REGLABLES, reglablesVoix(transposer));   // vocoder, chuchotement, voix de robot, double voix, harmonies (voix.js)
export const valeurLog = (p, t) => LOG(t, p.min, p.max);          // curseur 0 à 1 vers valeur
export const positionLog = (p, v) => Math.log(v / p.min) / Math.log(p.max / p.min);
