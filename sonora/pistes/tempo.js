// Trouver le tempo d'un son et le caler sur la grille du projet. Sans DOM : testé dans Node.
// detecterTempo : le tempo (battements par minute) et la place du premier temps d'un enregistrement (une boucle de batterie, un morceau...).
// etirer : rallonge ou raccourcit un son sans changer sa hauteur (méthode WSOLA : on recolle de petits morceaux bien alignés), pour qu'un son à 96 par minute joue à 120.

const SAUT = 512;   // la taille d'une image d'analyse : 512 échantillons à 44,1 kHz, soit 11,6 ms

// La « force des attaques » : à chaque image, de combien l'énergie du son monte (en échelle logarithmique, donc une note douce compte autant qu'une note forte).
function attaques(x, sr) {
  const saut = Math.round(SAUT * sr / 44100), n = Math.floor(x.length / saut), e = new Float32Array(n);
  let prev = 0; const a = new Float32Array(n);
  // l'énergie de la différence première du signal (qui enlève les graves) : les attaques, les claquements, les consonnes
  for (let i = 0; i < n; i++) { let s = 0; const d = i * saut; for (let j = 1; j < saut; j++) { const v = x[d + j] - x[d + j - 1]; s += v * v; } e[i] = Math.log(1 + 1000 * s / saut); }
  for (let i = 1; i < n; i++) { const v = e[i] - e[i - 1]; a[i] = v > 0 ? v : 0; }
  // on retire la moyenne glissante (une seconde) : ce qui compte, c'est ce qui dépasse
  const m = Math.max(3, Math.round(sr / saut)), out = new Float32Array(n); let somme = 0;
  for (let i = 0; i < n; i++) { somme += a[i]; if (i >= 2 * m) somme -= a[i - 2 * m]; const c = i - m, lo = Math.max(0, c - m), hi = Math.min(n - 1, c + m); if (c >= 0) { let s2 = 0; for (let j = lo; j <= hi; j++) s2 += a[j]; out[c] = Math.max(0, a[c] - 0.8 * s2 / (hi - lo + 1)); } }
  for (let i = Math.max(0, n - m); i < n; i++) { const lo = Math.max(0, i - m), hi = n - 1; let s2 = 0; for (let j = lo; j <= hi; j++) s2 += a[j]; out[i] = Math.max(0, a[i] - 0.8 * s2 / (hi - lo + 1)); }
  return { env: out, saut, n };
}

// Résultat : { bpm, confiance (0 à 1), decalage (seconde du premier temps), duree } ou null si le son est trop court, trop silencieux ou sans pulsation.
export function detecterTempo(x, sr = 44100, { min = 60, max = 190 } = {}) {
  if (!x || x.length < 3 * sr) return null; const { env, saut, n } = attaques(x, sr);
  let tot = 0; for (let i = 0; i < n; i++) tot += env[i]; if (tot / n < 0.06) return null;   // des attaques trop faibles : du silence, du souffle, un bruit constant (une boucle de batterie en donne plus de 0,15)
  const hop = saut / sr, acDe = e => lag => { let s = 0; const L = Math.round(lag); for (let i = 0; i + L < n; i++) s += e[i] * e[i + L]; return s / Math.max(1, n - L); }, ac = acDe(env);
  // le meilleur score qu'atteindrait un signal sans rythme : les mêmes images, mélangées par paquets de quatre (même niveau, même répartition, plus de pulsation)
  const melange = (() => { const p = Math.floor(n / 4), ordre = Array.from({ length: p }, (_, i) => i); let g = 987654321; for (let i = p - 1; i > 0; i--) { g = (g * 1103515245 + 12345) & 0x7fffffff; const j = g % (i + 1); [ordre[i], ordre[j]] = [ordre[j], ordre[i]]; } const e = new Float32Array(n); ordre.forEach((o, i) => { for (let k = 0; k < 4; k++) e[i * 4 + k] = env[o * 4 + k]; }); return e; })();
  const scoreMax = (a, R) => { let m = 0; for (let b = min; b <= max; b += 0.5) { const lag = 60 / b / hop; if (lag < 3) continue; m = Math.max(m, (a(lag) + 0.6 * a(2 * lag) + 0.35 * a(4 * lag)) / R); } return m; };
  const R0 = ac(0) || 1;
  // pour chaque tempo possible : la ressemblance du signal avec lui-même décalé d'une, deux, quatre périodes (un tempo bien trouvé se retrouve aux multiples), et un léger penchant pour les tempos usuels
  const candidats = []; for (let b = min; b <= max; b += 0.5) { const lag = 60 / b / hop; if (lag < 3) continue;
    const l1 = ac(lag), l2 = ac(2 * lag), l4 = ac(4 * lag), prior = Math.exp(-Math.pow(Math.log2(b / 115), 2) / (2 * 0.7 * 0.7));
    candidats.push({ b, s: (l1 + 0.6 * l2 + 0.35 * l4) / R0 * (0.55 + 0.45 * prior), brut: (l1 + 0.6 * l2 + 0.35 * l4) / R0 }); }
  candidats.sort((p, q) => q.s - p.s); const m = candidats.reduce((s, c) => s + c.s, 0) / candidats.length;
  let best = candidats[0]; if (!best || best.s <= 0) return null;
  // affinage : le maximum local à 0,05 près, par interpolation autour du meilleur
  let b0 = best.b, sc = -1; for (let b = best.b - 0.75; b <= best.b + 0.75; b += 0.05) { const lag = 60 / b / hop, s = ac(lag) + 0.6 * ac(2 * lag) + 0.35 * ac(4 * lag); if (s > sc) { sc = s; b0 = b; } }
  // la place du premier temps : le décalage qui, tous les temps, tombe le plus souvent sur une attaque
  const P = 60 / b0 / hop; let meilleur = 0, o0 = 0; for (let o = 0; o < P; o += 0.25) { let s = 0; for (let t = o; t < n - 1; t += P) { const i = Math.round(t); s += env[i] + 0.5 * (env[i - 1] || 0) + 0.5 * (env[i + 1] || 0); } if (s > meilleur) { meilleur = s; o0 = o; } }
  const Rm = acDe(melange)(0) || 1, base = scoreMax(acDe(melange), Rm), confiance = Math.max(0, Math.min(1, ((best.brut - base) / (best.brut || 1)) * 3));   // ce que le rythme apporte de plus que le hasard
  return { bpm: Math.round(b0 * 10) / 10, confiance, regularite: best.brut, decalage: o0 * hop, duree: x.length / sr };
}

// Rallonge (ratio > 1) ou raccourcit (ratio < 1) un son, sans changer sa hauteur. x : un canal ; `reference` : un canal sur lequel chercher les bons raccords (les autres canaux suivent les mêmes raccords).
export function etirer(x, ratio, sr = 44100, reference = x) {
  if (Math.abs(ratio - 1) < 1e-3) return Float32Array.from(x);
  const fen = Math.round(0.05 * sr) & ~1, sortie = fen / 2, entree = sortie / ratio, tol = Math.round(0.014 * sr), dec = 8;
  const n = Math.round(x.length * ratio), y = new Float32Array(n + fen), norm = new Float32Array(n + fen), h = new Float32Array(fen); for (let i = 0; i < fen; i++) h[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * (i + 0.5) / fen);
  const r = new Float32Array(Math.ceil(reference.length / dec)); for (let i = 0; i < r.length; i++) r[i] = reference[i * dec] || 0;
  const bon = (cible, ideal) => {   // le décalage qui ressemble le plus à la suite naturelle du morceau précédent
    let m = -Infinity, d0 = 0; const longueur = Math.floor(sortie / dec);
    for (let d = -tol; d <= tol; d += dec) { const p = ideal + d; if (p < 0 || p + fen >= x.length) continue; let s = 0, e = 1e-9; const a = Math.floor(p / dec), c = Math.floor(cible / dec);
      for (let j = 0; j < longueur; j++) { const u = r[a + j] || 0, v = r[c + j] || 0; s += u * v; e += u * u; } const q = s / Math.sqrt(e); if (q > m) { m = q; d0 = d; } }
    return d0;
  };
  let suiv = 0;   // où commence la suite naturelle du morceau précédent (dans x)
  for (let k = 0; ; k++) {
    const o = k * sortie; if (o >= n) break; const ideal = Math.round(k * entree); let p = ideal;
    if (k > 0) p = ideal + bon(suiv, ideal); p = Math.max(0, Math.min(x.length - fen - 1, p));
    for (let i = 0; i < fen && o + i < y.length; i++) { const v = x[p + i] || 0; y[o + i] += v * h[i]; norm[o + i] += h[i]; }
    suiv = p + sortie;
  }
  const out = new Float32Array(n); for (let i = 0; i < n; i++) out[i] = norm[i] > 1e-6 ? y[i] / norm[i] : 0; return out;
}
// Étire plusieurs canaux avec les mêmes raccords (la stéréo reste stéréo).
export function etirerCanaux(canaux, ratio, sr = 44100) {
  if (canaux.length === 1) return [etirer(canaux[0], ratio, sr)];
  const mono = new Float32Array(canaux[0].length); for (const c of canaux) for (let i = 0; i < mono.length; i++) mono[i] += (c[i] || 0) / canaux.length;
  return canaux.map(c => etirer(c, ratio, sr, mono));
}
