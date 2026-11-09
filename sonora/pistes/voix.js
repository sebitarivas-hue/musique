// Effets de voix de SONORA Pistes : vocoder, chuchotement, voix de robot, double voix, harmonies. Calcul hors ligne, chaque fonction renvoie un NOUVEAU son { canaux, sr }.
// Ce que ce n'est PAS : de la correction de justesse (« autotune »). Elle demande de suivre la hauteur de la voix trame par trame puis de la déplacer sans abîmer le timbre : ce n'est pas fait ici.
// Sans DOM, sans dépendance : testé dans Node. (L'harmoniseur reçoit la fonction de transposition de editions.js pour ne pas créer de dépendance circulaire.)

const mono = c => { const n = c.canaux[0].length, m = new Float32Array(n); for (const x of c.canaux) for (let i = 0; i < n; i++) m[i] += x[i] / c.canaux.length; return m; };
const vers = (c, m) => ({ canaux: c.canaux.map(() => Float32Array.from(m)), sr: c.sr });
const rms = x => { let s = 0; for (let i = 0; i < x.length; i++) s += x[i] * x[i]; return Math.sqrt(s / Math.max(1, x.length)); };
const crete = x => { let m = 0; for (let i = 0; i < x.length; i++) m = Math.max(m, Math.abs(x[i])); return m; };
// Filtre du second ordre (formules d'Audio EQ Cookbook) : « passe-bande » (gain 1 au centre) ou « passe-haut ». Renvoie une fonction qui filtre un échantillon, avec sa mémoire.
function biquad(type, fc, q, sr) {
  const w = 2 * Math.PI * Math.min(fc, sr * 0.45) / sr, cs = Math.cos(w), al = Math.sin(w) / (2 * q), a0 = 1 + al; let b0, b1, b2;
  if (type === "passe-bande") { b0 = al; b1 = 0; b2 = -al; } else { b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = b0; }
  b0 /= a0; b1 /= a0; b2 /= a0; const a1 = -2 * cs / a0, a2 = (1 - al) / a0; let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  return x => { const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; return y; };
}
const hauteur = note => 440 * Math.pow(2, (note - 69) / 12);

// ---------------------------------------------------------------- vocoder
// Le vocoder mesure, bande de fréquences par bande, le volume de la voix (l'enveloppe), et le pose sur un autre son, la porteuse (une note de synthèse, un accord, un souffle).
// La voix « parle » alors avec la porteuse : l'articulation de la voix, la hauteur de la porteuse. Un souffle à la place de la note donne un chuchotement.
const ACCORDS = { aucun: [0], majeur: [0, 4, 7], mineur: [0, 3, 7], quinte: [0, 7, 12] };
export const PORTEUSES = ["scie", "carre", "bruit"];
function polyblep(t, dt) { if (t < dt) { const x = t / dt; return x + x - x * x - 1; } if (t > 1 - dt) { const x = (t - 1) / dt; return x * x + x + x + 1; } return 0; }
function porteuse(n, sr, type, note, accord) {
  const out = new Float32Array(n);
  if (type === "bruit") { let g = 12345; for (let i = 0; i < n; i++) { g = (g * 1664525 + 1013904223) >>> 0; out[i] = g / 2147483648 - 1; } return out; }
  const voix = (ACCORDS[accord] || ACCORDS.aucun).map(d => hauteur(note + d)), phase = voix.map(() => 0);
  for (let v = 0; v < voix.length; v++) {
    const dt = voix[v] / sr; let ph = 0;
    for (let i = 0; i < n; i++) {
      let s = 2 * ph - 1 - polyblep(ph, dt);   // scie limitée en bande
      if (type === "carre") { const p2 = (ph + 0.5) % 1; s = s - (2 * p2 - 1 - polyblep(p2, dt)); }   // carré = scie moins scie décalée d'une demi-période
      out[i] += s / voix.length; ph += dt; if (ph >= 1) ph -= 1;
    }
  }
  return out;
}
export function vocoder(c, { bandes = 16, porteuse: type = "scie", note = 48, accord = "aucun", reactivite = 0.5, consonnes = 0.5, melange = 1 } = {}) {
  const sr = c.sr, x = mono(c), n = x.length, B = Math.max(4, Math.min(32, Math.round(bandes))), f0 = 100, f1 = Math.min(8000, sr * 0.4), r = Math.pow(f1 / f0, 1 / (B - 1)), q = Math.sqrt(r) / (r - 1);
  const car = porteuse(n, sr, PORTEUSES.includes(type) ? type : "scie", note, accord), sortie = new Float32Array(n);
  const attaque = Math.exp(-1 / (0.003 * sr)), relache = Math.exp(-1 / ((0.06 - 0.05 * Math.max(0, Math.min(1, reactivite))) * sr));
  const env = new Float32Array(n);
  for (let b = 0; b < B; b++) {
    const fc = f0 * Math.pow(r, b), m1 = biquad("passe-bande", fc, q, sr), m2 = biquad("passe-bande", fc, q, sr), c1 = biquad("passe-bande", fc, q, sr), c2 = biquad("passe-bande", fc, q, sr); let e = 0;
    for (let i = 0; i < n; i++) { const a = Math.abs(m2(m1(x[i]))); e = a > e ? attaque * e + (1 - attaque) * a : relache * e + (1 - relache) * a; env[i] = e; }
    // Les deux filtres de la voix retardent l'enveloppe de 2Q/(π·fc) secondes (21 ms pour la bande de 100 Hz) : le calcul est hors ligne, on la lit donc en avance de ce retard, pour que le vocoder ne traîne pas derrière la voix.
    const avance = Math.round(2 * q / (Math.PI * fc) * sr);
    for (let i = 0; i < n; i++) sortie[i] += c2(c1(car[i])) * env[Math.min(n - 1, i + avance)];
  }
  // les consonnes (s, ch, f) sont du bruit aigu que les bandes rendent mal : on ajoute la voix filtrée au-dessus de 5 kHz
  if (consonnes > 0) { const h1 = biquad("passe-haut", 5000, 0.707, sr), h2 = biquad("passe-haut", 5000, 0.707, sr), g = Math.max(0, Math.min(1, consonnes)); for (let i = 0; i < n; i++) sortie[i] += g * 1.5 * h2(h1(x[i])); }
  // même niveau que la voix d'origine, sans dépasser 0 dB
  const ref = rms(x), cur = rms(sortie); let k = cur > 1e-9 ? ref / cur : 0; const p = crete(sortie) * k; if (p > 0.98) k *= 0.98 / p;
  const m = Math.max(0, Math.min(1, melange)), res = new Float32Array(n); for (let i = 0; i < n; i++) res[i] = m * sortie[i] * k + (1 - m) * x[i];
  return vers(c, res);
}
export const chuchoter = (c, { bandes = 20, melange = 1 } = {}) => vocoder(c, { bandes, porteuse: "bruit", reactivite: 0.8, consonnes: 0.3, melange });

// ---------------------------------------------------------------- voix de robot : modulation en anneau (la voix multipliée par une sinusoïde grave)
export function robot(c, { frequence = 50, melange = 0.8 } = {}) {
  const sr = c.sr, m = Math.max(0, Math.min(1, melange));
  return { canaux: c.canaux.map(x => { const y = new Float32Array(x.length); for (let i = 0; i < x.length; i++) y[i] = (1 - m) * x[i] + m * x[i] * Math.sin(2 * Math.PI * frequence * i / sr); return y; }), sr };
}

// ---------------------------------------------------------------- double voix : la voix, plus une copie légèrement en retard dont le retard bouge un peu (comme deux chanteurs qui ne sont jamais tout à fait ensemble)
export function doubler(c, { retard = 0.022, profondeur = 0.003, vitesse = 0.6, melange = 0.6 } = {}) {
  const sr = c.sr, m = Math.max(0, Math.min(1, melange));
  return { canaux: c.canaux.map((x, ch) => { const n = x.length, y = new Float32Array(n); for (let i = 0; i < n; i++) {
    const d = (retard + profondeur * Math.sin(2 * Math.PI * vitesse * i / sr + ch * 1.7)) * sr, p = i - d, k = Math.floor(p), f = p - k, v = k >= 0 && k + 1 < n ? x[k] * (1 - f) + x[k + 1] * f : 0; y[i] = x[i] + m * v; }
    const pic = crete(y), pe = crete(x); if (pic > pe && pic > 0) for (let i = 0; i < n; i++) y[i] *= Math.max(pe, 0.01) / pic; return y; }), sr };
}

// ---------------------------------------------------------------- harmonies : la voix, plus deux copies transposées (sans changer la durée), pour faire un accord avec soi-même
export function harmoniser(c, { voix1 = 4, voix2 = 7, melange = 0.6 } = {}, transposer) {
  const n = c.canaux[0].length, m = Math.max(0, Math.min(1, melange)), a = voix1 ? transposer(c, voix1) : null, b = voix2 ? transposer(c, voix2) : null;
  return { canaux: c.canaux.map((x, ch) => { const y = Float32Array.from(x); for (const t of [a, b]) if (t) { const z = t.canaux[Math.min(ch, t.canaux.length - 1)]; for (let i = 0; i < n && i < z.length; i++) y[i] += m * 0.7 * z[i]; }
    const pic = crete(y), pe = crete(x); if (pic > Math.max(pe, 0.5)) for (let i = 0; i < n; i++) y[i] *= Math.max(pe, 0.5) / pic; return y; }), sr: c.sr };
}

// Les réglages proposés dans le menu Effets (même format que REGLABLES de editions.js).
export function reglablesVoix(transposer) {
  return {
    "reglage-vocoder": { nom: "Vocoder (voix de robot chantante)", etiquette: "vocoder", texte: "Le vocoder prend le volume de ta voix dans chaque zone de fréquences et le pose sur un autre son, la porteuse : une note de synthèse ou un accord. Ta voix articule les mots, la porteuse donne la hauteur : c'est la voix de robot chantante de Daft Punk ou de Kraftwerk. Plus il y a de bandes, plus les mots sont compréhensibles. Parle ou chante sur un seul ton pour un effet net.",
      params: [{ id: "porteuse", libelle: "Porteuse", choix: [["scie", "Scie (riche, cuivrée)"], ["carre", "Carré (creux, clarinette)"], ["bruit", "Souffle (chuchotement)"]], def: "scie" }, { id: "note", libelle: "Note de la porteuse (60 = do du milieu)", min: 24, max: 84, pas: 1, def: 48 },
        { id: "accord", libelle: "Accord", choix: [["aucun", "Une seule note"], ["majeur", "Accord majeur"], ["mineur", "Accord mineur"], ["quinte", "Quinte et octave"]], def: "aucun" },
        { id: "bandes", libelle: "Bandes de fréquences", min: 8, max: 32, pas: 1, def: 16 }, { id: "reactivite", libelle: "Réactivité (0 : doux, 1 : sec)", min: 0, max: 1, pas: 0.05, def: 0.5 }, { id: "consonnes", libelle: "Consonnes (s, ch, f)", min: 0, max: 1, pas: 0.05, def: 0.5 }, { id: "melange", libelle: "Mélange avec la voix d'origine", min: 0, max: 1, pas: 0.05, def: 1 }],
      f: (c, v) => vocoder(c, v) },
    "reglage-chuchotement": { nom: "Chuchotement", etiquette: "chuchoté", texte: "La voix sans la note : seul le souffle reste, modelé par les mots. Comme un murmure à l'oreille, ou la voix d'un fantôme.",
      params: [{ id: "bandes", libelle: "Bandes de fréquences", min: 8, max: 32, pas: 1, def: 20 }, { id: "melange", libelle: "Mélange avec la voix d'origine", min: 0, max: 1, pas: 0.05, def: 1 }], f: (c, v) => chuchoter(c, v) },
    "reglage-robot": { nom: "Voix de robot (modulation en anneau)", etiquette: "robot", texte: "La voix est multipliée par une onde grave : elle prend un grain métallique, comme les Daleks de la télévision. Plus la fréquence est basse, plus on entend un battement ; plus elle est haute, plus la voix devient métallique et inhumaine.",
      params: [{ id: "frequence", libelle: "Fréquence de l'onde", min: 10, max: 500, log: true, def: 50, unite: "Hz" }, { id: "melange", libelle: "Mélange", min: 0, max: 1, pas: 0.05, def: 0.8 }], f: (c, v) => robot(c, v) },
    "reglage-double-voix": { nom: "Double voix", etiquette: "double voix", texte: "Une copie de la voix, un tout petit peu en retard et dont le retard bouge, s'ajoute à la voix : on dirait deux chanteurs qui ne sont jamais tout à fait ensemble. Cela épaissit une voix seule.",
      params: [{ id: "retard", libelle: "Retard", min: 0.01, max: 0.06, pas: 0.001, def: 0.022, unite: "s" }, { id: "profondeur", libelle: "Instabilité", min: 0, max: 0.01, pas: 0.0005, def: 0.003, unite: "s" }, { id: "vitesse", libelle: "Vitesse de l'instabilité", min: 0.1, max: 3, pas: 0.1, def: 0.6, unite: "Hz" }, { id: "melange", libelle: "Mélange", min: 0, max: 1, pas: 0.05, def: 0.6 }], f: (c, v) => doubler(c, v) },
    "reglage-harmonies": { nom: "Harmonies (chanter en accord avec soi-même)", etiquette: "harmonies", texte: "Deux copies de la voix, montées de quelques demi-tons sans changer la durée, s'ajoutent à la voix. Quatre et sept demi-tons : un accord majeur (tierce et quinte). Trois et sept : un accord mineur. Le calcul prend quelques secondes.",
      params: [{ id: "voix1", libelle: "Première voix", min: -12, max: 12, pas: 1, def: 4, unite: "demi-tons" }, { id: "voix2", libelle: "Deuxième voix", min: -12, max: 12, pas: 1, def: 7, unite: "demi-tons" }, { id: "melange", libelle: "Niveau des voix ajoutées", min: 0, max: 1, pas: 0.05, def: 0.6 }], f: (c, v) => harmoniser(c, v, transposer) },
  };
}
