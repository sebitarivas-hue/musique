// Le « Son pro » de SONORA Pistes : une chaîne de mixage et de mastering sur la sortie du projet.
// Pourquoi : un rendu brut de notes enregistrées sonne 1985 (mesuré le 14/11/2026 : niveau moyen de -27 dB pour -14 à -10 dans une production actuelle, aucune compression,
// image presque mono, aucune salle). Les réglages d'un morceau actuel sont ici : tonalité, chaleur, salle, largeur stéréo, compression de liant, limiteur.
// Tout est fait de nœuds Web Audio : la lecture et l'export WAV (OfflineAudioContext) passent par la même chaîne, donc « ce qu'on entend est ce qu'on exporte ».
// Aucun hasard (la salle est faite d'un bruit à graine fixe) : le même projet sonne toujours pareil.

// Un générateur pseudo-aléatoire à graine fixe.
function graine(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// La réponse de la salle : une plaque douce, 1,7 s, avec un petit retard au départ et des aigus qui s'éteignent plus vite que les graves.
export function reponseSalle(ctx, duree = 1.7, predelai = 0.018) {
  const sr = ctx.sampleRate, n = Math.round(duree * sr), d0 = Math.round(predelai * sr), b = ctx.createBuffer(2, n, sr);
  for (let c = 0; c < 2; c++) {
    const x = b.getChannelData(c), rnd = graine(c ? 20241114 : 14112026); let lp = 0;
    for (let i = d0; i < n; i++) {
      const t = (i - d0) / sr, env = Math.pow(10, -3 * t / duree);                    // -60 dB à la fin de `duree`
      const k = 0.55 - 0.45 * Math.min(1, t / (duree * 0.8));                         // le filtre se ferme avec le temps : les aigus meurent d'abord
      lp += k * ((rnd() * 2 - 1) - lp); x[i] = lp * env * (i - d0 < sr * 0.004 ? (i - d0) / (sr * 0.004) : 1);
    }
  }
  // normalisation : la salle ne change pas le niveau, elle ajoute de l'air
  let e = 0; for (let c = 0; c < 2; c++) { const x = b.getChannelData(c); for (let i = 0; i < n; i++) e += x[i] * x[i]; } const g = 1 / Math.sqrt(e / 2);
  for (let c = 0; c < 2; c++) { const x = b.getChannelData(c); for (let i = 0; i < n; i++) x[i] *= g * 0.02; }
  return b;
}
const courbeSaturation = (k = 2.2, n = 2048) => { const c = new Float32Array(n), m = Math.tanh(k); for (let i = 0; i < n; i++) { const x = i * 2 / (n - 1) - 1; c[i] = Math.tanh(k * x) / m; } return c; };

export const REGLAGES = { avant: 2.6, salle: 0.16, chaleur: 0.4, largeur: 2.6, seuil: -20, rapport: 3.4, apres: 1.4, plafond: 0.89 };

// Crée la chaîne. Renvoie { entree, sortie } : on branche les pistes sur `entree` ; `sortie` est déjà reliée à ctx.destination.
export function creerMaster(ctx, reglages = {}) {
  const R = { ...REGLAGES, ...reglages };
  const gain = v => { const g = ctx.createGain(); g.gain.value = v; return g; };
  const filtre = (type, f, q, g) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q != null) b.Q.value = q; if (g != null) b.gain.value = g; return b; };
  const entree = gain(R.avant);
  // 1. la tonalité : on retire le très grave inutile, on creuse un peu le bas-médium boueux, on ajoute du corps, de la présence et de l'air
  const hp = filtre("highpass", 28, 0.707), bas = filtre("lowshelf", 95, null, 2.2), boue = filtre("peaking", 330, 1.0, -2.2), presence = filtre("peaking", 3200, 0.8, 1.6), air = filtre("highshelf", 9500, null, 3.2);
  entree.connect(hp); hp.connect(bas); bas.connect(boue); boue.connect(presence); presence.connect(air);
  // 2. la chaleur : une saturation douce en parallèle (harmoniques, impression de volume), 4 fois suréchantillonnée
  const sec = gain(1 - R.chaleur * 0.5), sat = ctx.createWaveShaper(); sat.curve = courbeSaturation(2.4); sat.oversample = "4x"; const mixSat = gain(R.chaleur * 0.55 + 0.45), somme = gain(1);
  air.connect(sec); sec.connect(somme); air.connect(sat); sat.connect(mixSat); mixSat.connect(somme);
  // 3. la salle : un envoi vers une plaque, retour dans le mix
  const conv = ctx.createConvolver(); conv.buffer = reponseSalle(ctx); const envoi = gain(R.salle * 3.2), retour = gain(1);
  somme.connect(envoi); envoi.connect(conv); conv.connect(retour);
  const bus = gain(1); somme.connect(bus); retour.connect(bus);
  // 4. la largeur : milieu/côtés ; on élargit les côtés au-dessus de 180 Hz seulement (la basse reste au centre)
  const sep = ctx.createChannelSplitter(2), fus = ctx.createChannelMerger(2); bus.connect(sep);
  const milieu = gain(1), cote = gain(1), l1 = gain(0.5), r1 = gain(0.5), l2 = gain(0.5), r2 = gain(-0.5);
  sep.connect(l1, 0); sep.connect(r1, 1); l1.connect(milieu); r1.connect(milieu); sep.connect(l2, 0); sep.connect(r2, 1); l2.connect(cote); r2.connect(cote);
  const coteBas = filtre("lowpass", 180, 0.707), coteHaut = filtre("highpass", 180, 0.707), coteLarge = gain(R.largeur), coteSomme = gain(1);
  cote.connect(coteBas); cote.connect(coteHaut); coteHaut.connect(coteLarge); coteLarge.connect(coteSomme); coteBas.connect(coteSomme);
  const sortieL = gain(1), sortieR = gain(1), moinsCote = gain(-1);
  milieu.connect(sortieL); coteSomme.connect(sortieL); milieu.connect(sortieR); coteSomme.connect(moinsCote); moinsCote.connect(sortieR); sortieL.connect(fus, 0, 0); sortieR.connect(fus, 0, 1);
  // 5. la compression de liant, puis le gain de rattrapage
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = R.seuil; comp.knee.value = 10; comp.ratio.value = R.rapport; comp.attack.value = 0.012; comp.release.value = 0.2;
  const rattrapage = gain(R.apres); fus.connect(comp); comp.connect(rattrapage);
  // 6. le limiteur : rien ne dépasse -1 dBFS
  const lim = ctx.createDynamicsCompressor(); lim.threshold.value = -4; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.001; lim.release.value = 0.07;
  const plafond = gain(R.plafond); rattrapage.connect(lim); lim.connect(plafond); plafond.connect(ctx.destination);
  return { entree, sortie: plafond, comp, lim };
}
