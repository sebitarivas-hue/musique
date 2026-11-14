// Séparer un son en plusieurs parties, par des méthodes CLASSIQUES de traitement du signal. Ce n'est PAS l'intelligence artificielle des logiciels de « stems » :
// elle ne reconnaît ni une voix, ni une guitare. Elle sépare ce que la physique du son permet de séparer :
//   - la basse : tout ce qui est sous une fréquence de coupure (150 Hz par défaut ; filtre de pente 24 dB par octave sans décalage de phase), grosse caisse comprise ;
//   - les percussions et l'harmonique : sur le reste, le filtrage par médianes de Fitzgerald (2010). Dans un spectrogramme, un son tenu (voix, accord, nappe) trace une ligne HORIZONTALE,
//     un coup (caisse claire, charleston, claquement) trace une ligne VERTICALE. Une médiane le long du temps garde les lignes horizontales, une médiane le long des fréquences garde les verticales ;
//   - dans l'harmonique d'un son stéréo : le CENTRE (ce qui est pareil à gauche et à droite : très souvent la voix, mais aussi la basse et la grosse caisse mixées au centre) et les CÔTÉS (le reste : ambiances, guitares ouvertes).
// Les parties s'additionnent exactement pour redonner le son d'origine. Limites, dites aux élèves : une voix chantée mixée sur le côté, ou un instrument tenu au centre, tombe dans la mauvaise partie ;
// un coup de caisse claire a une queue tenue, qui peut passer dans l'harmonique ; la voix et la guitare qui jouent au centre restent mêlées. Sans modèle d'apprentissage, on ne fait pas mieux honnêtement.
// Sans DOM : testé dans Node.
import { fft } from "../science/analyse.js?v=69267e0c19";

const N = 2048, H = 512, NB = N / 2 + 1, W_TEMPS = 17, W_FREQ = 17;
const FEN = Float64Array.from({ length: N }, (_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N));   // Hann périodique : à 75 % de recouvrement, la somme des carrés fait 1,5
const pause = () => new Promise(ok => setTimeout(ok, 0));

// Filtre passe-bas du second ordre de Butterworth.
function passeBas(x, fc, sr) {
  const w = 2 * Math.PI * Math.min(fc, sr * 0.45) / sr, cs = Math.cos(w), al = Math.sin(w) / (2 * 0.7071067811865476), a0 = 1 + al, b0 = (1 - cs) / 2 / a0, b1 = (1 - cs) / a0, a1 = -2 * cs / a0, a2 = (1 - al) / a0;
  const y = new Float32Array(x.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) { const v = b0 * x[i] + b1 * x1 + b0 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v; }
  return y;
}
// Passe-bas SANS décalage de phase : on filtre dans un sens, puis dans l'autre (le calcul est hors ligne, donc permis). Le haut est alors « le son moins le grave » sans que le déphasage fasse revenir du grave dans le haut.
function passeBasZeroPhase(x, fc, sr) { const a = passeBas(x, fc, sr).reverse(); return passeBas(a, fc, sr).reverse(); }
// Médiane glissante sur une ligne de `len` valeurs lues par get(i), largeur `larg` (réduite aux bords) ; set(i, valeur). La fenêtre triée est tenue à jour sans tout retrier.
function medianeGlissante(len, larg, get, set, fen) {
  const demi = larg >> 1; let n = 0;
  const inserer = v => { let a = 0, b = n; while (a < b) { const m = (a + b) >> 1; if (fen[m] < v) a = m + 1; else b = m; } for (let j = n; j > a; j--) fen[j] = fen[j - 1]; fen[a] = v; n++; };
  const retirer = v => { let a = 0, b = n; while (a < b) { const m = (a + b) >> 1; if (fen[m] < v) a = m + 1; else b = m; } for (let j = a; j < n - 1; j++) fen[j] = fen[j + 1]; n--; };
  for (let i = 0; i <= Math.min(demi, len - 1); i++) inserer(get(i));
  for (let i = 0; i < len; i++) {
    set(i, fen[n >> 1]);
    const entre = i + demi + 1, sort = i - demi; if (entre < len) inserer(get(entre)); if (sort >= 0) retirer(get(sort));
  }
}
function spectreTrame(x, debut, re, im) { for (let i = 0; i < N; i++) { const k = debut + i; re[i] = k >= 0 && k < x.length ? x[k] * FEN[i] : 0; im[i] = 0; } fft(re, im); }
function ajouterTrame(re, im, sortie, debut) {   // transformée inverse par la méthode du conjugué : ifft(X) = conj(fft(conj(X))) / N
  for (let i = 0; i < N; i++) im[i] = -im[i]; fft(re, im);
  for (let i = 0; i < N; i++) { const k = debut + i; if (k >= 0 && k < sortie.length) sortie[k] += re[i] / N * FEN[i] / 1.5; }
}

// Le masque de l'harmonique, pour toutes les trames : tableau trames × NB, valeurs de 0 à 1. mono : le signal sur lequel on le calcule.
async function masqueHarmonique(mono, rappel) {
  const n = mono.length, K = Math.ceil((n + N) / H) + 1, debut0 = -(N - H), re = new Float64Array(N), im = new Float64Array(N), mag = new Float32Array(K * NB);
  for (let k = 0; k < K; k++) {
    spectreTrame(mono, debut0 + k * H, re, im); for (let b = 0; b < NB; b++) mag[k * NB + b] = Math.hypot(re[b], im[b]);
    if (k % 150 === 0) { if (rappel) rappel(0.1 + 0.2 * k / K); await pause(); }
  }
  const harm = new Float32Array(K * NB), fen = new Float32Array(Math.max(W_TEMPS, W_FREQ) + 2);
  for (let b = 0; b < NB; b++) {   // le long du temps : garde les lignes horizontales (sons tenus)
    medianeGlissante(K, W_TEMPS, k => mag[k * NB + b], (k, v) => { harm[k * NB + b] = v; }, fen);
    if (b % 100 === 0) { if (rappel) rappel(0.3 + 0.2 * b / NB); await pause(); }
  }
  const ligne = new Float32Array(NB), perc = new Float32Array(NB);
  for (let k = 0; k < K; k++) {   // le long des fréquences : garde les lignes verticales (coups) ; puis le masque doux (Wiener, puissance 2)
    medianeGlissante(NB, W_FREQ, b => mag[k * NB + b], (b, v) => { perc[b] = v; }, fen);
    for (let b = 0; b < NB; b++) { const h = harm[k * NB + b], p = perc[b], hh = h * h, pp = p * p; ligne[b] = hh / (hh + pp + 1e-20); }
    harm.set(ligne, k * NB);
    if (k % 150 === 0) { if (rappel) rappel(0.5 + 0.2 * k / K); await pause(); }
  }
  return { masque: harm, K, debut0 };
}

// c : { canaux: [Float32Array, ...], sr }. Renvoie { basse, percussions, centre, cotes } (ou { basse, percussions, harmonique } pour un son mono) : chacun { canaux, sr }, de même durée que c.
// options : { coupure : fréquence de la basse en Hz (150), rappel(p) : avancement de 0 à 1 }.
export async function separer(c, { coupure = 150, rappel = null } = {}) {
  const sr = c.sr, n = c.canaux[0].length, nc = Math.min(2, c.canaux.length), entree = c.canaux.slice(0, nc);
  if (n > sr * 300) throw new Error("Ce clip dépasse cinq minutes : la séparation est limitée à 5 minutes (elle demande beaucoup de mémoire).");
  const basse = entree.map(x => passeBasZeroPhase(x, coupure, sr)), haut = entree.map((x, i) => Float32Array.from(x, (v, k) => v - basse[i][k]));
  if (rappel) rappel(0.05); await pause();
  const mono = new Float32Array(n); for (let i = 0; i < n; i++) { let s = 0; for (const h of haut) s += h[i]; mono[i] = s / nc; }
  const { masque, K, debut0 } = await masqueHarmonique(mono, rappel);
  const harm = haut.map(() => new Float32Array(n)), re = new Float64Array(N), im = new Float64Array(N);
  for (let ch = 0; ch < nc; ch++) {
    for (let k = 0; k < K; k++) {
      const d = debut0 + k * H; spectreTrame(haut[ch], d, re, im);
      for (let b = 0; b < NB; b++) { const m = masque[k * NB + b]; re[b] *= m; im[b] *= m; if (b > 0 && b < N / 2) { re[N - b] = re[b]; im[N - b] = -im[b]; } }   // le spectre reste symétrique : le signal reste réel
      ajouterTrame(re, im, harm[ch], d);
      if (k % 150 === 0) { if (rappel) rappel(0.7 + 0.28 * (ch * K + k) / (nc * K)); await pause(); }
    }
  }
  const perc = haut.map((h, ch) => Float32Array.from(h, (v, i) => v - harm[ch][i])), sortie = {};
  const hors = x => ({ canaux: x, sr });
  sortie.basse = hors(basse); sortie.percussions = hors(perc);
  if (nc === 2) {
    const centre = new Float32Array(n), g = harm[0], d = harm[1]; for (let i = 0; i < n; i++) centre[i] = (g[i] + d[i]) / 2;
    sortie.centre = hors([centre, Float32Array.from(centre)]); sortie.cotes = hors([Float32Array.from(g, (v, i) => v - centre[i]), Float32Array.from(d, (v, i) => v - centre[i])]);
  } else sortie.harmonique = hors(harm);
  if (rappel) rappel(1); return sortie;
}
export const NOMS_PARTIES = { basse: "Basse", percussions: "Percussions", centre: "Centre (voix probable)", cotes: "Côtés (ambiance)", harmonique: "Sons tenus" };
