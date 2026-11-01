// Fonctions de mesure de SONORA Science : tout ce que le laboratoire affiche est calculé ici, à partir des échantillons produits par le moteur.
// Fonctions pures, sans DOM, testées sur des signaux dont le résultat est connu (tests/analyse.test.js).

const PUISSANCE2 = n => 1 << Math.ceil(Math.log2(Math.max(2, n)));

export function fft(re, im) { // en place, longueur puissance de 2
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let b = n >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
  for (let len = 2; len <= n; len <<= 1) {
    const a = -2 * Math.PI / len, wr = Math.cos(a), wi = Math.sin(a);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const u = i + k, v = i + k + len / 2, tr = re[v] * cr - im[v] * ci, ti = re[v] * ci + im[v] * cr;
        re[v] = re[u] - tr; im[v] = im[u] - ti; re[u] += tr; im[u] += ti;
        const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
      }
    }
  }
}

// Spectre d'amplitude : une sinusoïde d'amplitude A donne un pic de hauteur A (fenêtre de Hann, corrigée).
export function spectre(x, debut = 0, n = 8192) {
  n = PUISSANCE2(n); const re = new Float64Array(n), im = new Float64Array(n);
  for (let i = 0; i < n; i++) re[i] = (x[debut + i] || 0) * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (n - 1)));
  fft(re, im);
  const m = new Float64Array(n / 2 + 1);
  for (let i = 0; i <= n / 2; i++) m[i] = 2 * Math.hypot(re[i], im[i]) / (n * 0.5);
  return m;
}
export const versDB = a => 20 * Math.log10(Math.max(1e-12, a));

// Pics du spectre : [{ f, a, db }] triés par amplitude décroissante, fréquence affinée par interpolation parabolique.
export function pics(mag, sr, n, { seuilDB = -60, max = 20, minBin = 2 } = {}) {
  const res = [], pic = Math.max(...mag);
  for (let k = Math.max(1, minBin); k < mag.length - 1; k++) {
    if (mag[k] > mag[k - 1] && mag[k] >= mag[k + 1] && versDB(mag[k] / pic) > seuilDB) {
      const a = Math.log(mag[k - 1] + 1e-15), b = Math.log(mag[k] + 1e-15), c = Math.log(mag[k + 1] + 1e-15), d = a - 2 * b + c, dl = Math.abs(d) > 1e-12 ? 0.5 * (a - c) / d : 0;
      // amplitude par conservation de l'énergie sur les cinq raies du lobe principal (exacte pour une sinusoïde isolée, fenêtre de Hann)
      let e = 0; for (let j = -2; j <= 2; j++) e += (mag[k + j] || 0) ** 2;
      res.push({ f: (k + dl) * sr / n, a: Math.sqrt(2 / 3 * e), bin: k });
    }
  }
  res.sort((p, q) => q.a - p.a); return res.slice(0, max).map(p => ({ ...p, db: versDB(p.a) }));
}

export const rms = (x, a = 0, b = x.length) => { let s = 0; for (let i = a; i < b; i++) s += x[i] * x[i]; return Math.sqrt(s / Math.max(1, b - a)); };
export const crete = (x, a = 0, b = x.length) => { let m = 0; for (let i = a; i < b; i++) m = Math.max(m, Math.abs(x[i])); return m; };

// Fréquence fondamentale par autocorrélation normalisée (avec interpolation) : { f0, periode, nettete }
export function fondamentale(x, sr, { fmin = 40, fmax = 2000, debut = 0, duree = 0.2 } = {}) {
  const n = Math.min(x.length - debut, Math.round(duree * sr)), lagMax = Math.min(n - 2, Math.floor(sr / fmin)), lagMin = Math.max(2, Math.floor(sr / fmax));
  let moy = 0; for (let i = 0; i < n; i++) moy += x[debut + i]; moy /= n;
  const ac = new Float64Array(lagMax + 2); let e0 = 0;
  for (let i = 0; i < n; i++) { const v = x[debut + i] - moy; e0 += v * v; }
  if (e0 < 1e-12) return { f0: null, periode: null, nettete: 0 };
  for (let lag = 0; lag <= lagMax + 1; lag++) { let s = 0; for (let i = 0; i + lag < n; i++) s += (x[debut + i] - moy) * (x[debut + i + lag] - moy); ac[lag] = s / e0 * n / (n - lag); }
  // on saute la descente initiale de l'autocorrélation (elle est forte aux petits retards) : la recherche commence après le premier passage sous zéro
  let l0 = 1; while (l0 < lagMax && ac[l0] > 0) l0++; l0 = Math.max(l0, lagMin);
  let k = l0; for (let lag = l0; lag <= lagMax; lag++) if (ac[lag] > ac[k]) k = lag;
  // préfère le premier pic presque aussi net (évite l'octave inférieure)
  for (let lag = l0; lag < k; lag++) if (ac[lag] > ac[lag - 1] && ac[lag] >= ac[lag + 1] && ac[lag] > 0.93 * ac[k]) { k = lag; break; }
  const y0 = ac[k - 1], y1 = ac[k], y2 = ac[k + 1], d = y0 - 2 * y1 + y2, kf = k + (Math.abs(d) > 1e-12 ? 0.5 * (y0 - y2) / d : 0);
  return { f0: sr / kf, periode: kf / sr, nettete: y1 };
}

// Enveloppe : niveau efficace par fenêtres successives ; renvoie { env, fe } (fe : cadence de l'enveloppe en Hz)
export function enveloppe(x, sr, fenetreMs = 5) {
  const w = Math.max(1, Math.round(fenetreMs * sr / 1000)), n = Math.floor(x.length / w), env = new Float64Array(n);
  for (let i = 0; i < n; i++) env[i] = rms(x, i * w, (i + 1) * w);
  return { env, fe: sr / w };
}
// Fréquence dominante des variations de l'enveloppe (battements, trémolo) : { f, force } ou null
export function frequenceEnveloppe(env, fe, { fmin = 0.3, fmax = 40 } = {}) {
  const n = PUISSANCE2(env.length), re = new Float64Array(n), im = new Float64Array(n); let moy = 0; for (const v of env) moy += v; moy /= env.length;
  for (let i = 0; i < env.length; i++) re[i] = (env[i] - moy) * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (env.length - 1)));
  fft(re, im); let k = -1, m = 0;
  for (let i = 1; i < n / 2; i++) { const f = i * fe / n; if (f < fmin || f > fmax) continue; const a = Math.hypot(re[i], im[i]); if (a > m) { m = a; k = i; } }
  if (k < 0 || m < 1e-9) return null;
  const a = Math.hypot(re[k - 1], im[k - 1]), c = Math.hypot(re[k + 1], im[k + 1]), d = a - 2 * m + c, dl = Math.abs(d) > 1e-12 ? 0.5 * (a - c) / d : 0;
  return { f: (k + dl) * fe / n, force: m / (moy * env.length * 0.5 || 1) };
}

export function centroide(mag, sr, n) { let s = 0, t = 0; for (let k = 1; k < mag.length; k++) { const f = k * sr / n; s += f * mag[k]; t += mag[k]; } return t ? s / t : 0; }

// Amplitudes des harmoniques k = 1..nb d'une fondamentale f0 : tableau d'amplitudes linéaires
export function harmoniques(x, sr, f0, nb = 8, { debut = 0, n = 16384 } = {}) {
  const mag = spectre(x, debut, n), bin = sr / PUISSANCE2(n), out = [];
  for (let k = 1; k <= nb; k++) { const f = k * f0; if (f > sr / 2 - bin) { out.push(0); continue; } const b = Math.round(f / bin); let m = 0; for (let j = b - 2; j <= b + 2; j++) m = Math.max(m, mag[j] || 0); out.push(m); }
  return out;
}

// Spectre de puissance moyen (méthode de Welch) en dB : { db, bin, n } ; adapté aux bruits
export function welch(x, sr, n = 4096, debut = 0) {
  const re = new Float64Array(n), im = new Float64Array(n), acc = new Float64Array(n / 2 + 1), hop = n / 2; let nb = 0;
  for (let d = debut; d + n <= x.length; d += hop) {
    for (let i = 0; i < n; i++) { re[i] = x[d + i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (n - 1))); im[i] = 0; }
    fft(re, im); for (let i = 0; i <= n / 2; i++) acc[i] += re[i] * re[i] + im[i] * im[i]; nb++;
  }
  const db = new Float64Array(acc.length); for (let i = 0; i < acc.length; i++) db[i] = 10 * Math.log10(acc[i] / Math.max(1, nb) + 1e-18);
  return { db, bin: sr / n, n, fenetre: "hann" };
}
// Largeur à -3 dB autour d'un pic du spectre moyen : { f0, largeur, bas, haut }
export function largeur3dB(sp, autour) {
  const lisse = new Float64Array(sp.db.length); // lissage léger pour dompter les fluctuations du bruit
  for (let i = 0; i < lisse.length; i++) { let s = 0, c = 0; for (let j = -2; j <= 2; j++) if (sp.db[i + j] !== undefined) { s += Math.pow(10, sp.db[i + j] / 10); c++; } lisse[i] = 10 * Math.log10(s / c); }
  let k = Math.max(1, Math.round(autour * 0.6 / sp.bin)); const kmax = Math.min(lisse.length - 2, Math.round(autour * 1.6 / sp.bin));
  for (let i = k; i <= kmax; i++) if (lisse[i] > lisse[k]) k = i;
  const cible = lisse[k] - 3.01; let a = k, b = k; while (a > 1 && lisse[a] > cible) a--; while (b < lisse.length - 2 && lisse[b] > cible) b++;
  const inter = (i, j) => i + (cible - lisse[i]) / (lisse[j] - lisse[i]) * (j - i);
  const bas = inter(a, a + 1) * sp.bin, haut = inter(b, b - 1) * sp.bin;
  return { f0: k * sp.bin, centre: Math.sqrt(bas * haut), largeur: haut - bas, bas, haut };
}

// Retard de b par rapport à a, en secondes, par intercorrélation (interpolée) ; positif si b est en retard
export function retard(a, b, sr, maxS = 0.05) {
  const n = Math.min(a.length, b.length), L = Math.round(maxS * sr); let meilleur = 0, k0 = 0; const c = new Float64Array(2 * L + 1);
  for (let lag = -L; lag <= L; lag++) { let s = 0; for (let i = Math.max(0, -lag); i < n - Math.max(0, lag); i++) s += a[i] * b[i + lag]; c[lag + L] = s; if (s > meilleur) { meilleur = s; k0 = lag; } }
  const i = k0 + L; if (i <= 0 || i >= c.length - 1) return k0 / sr;
  const y0 = c[i - 1], y1 = c[i], y2 = c[i + 1], d = y0 - 2 * y1 + y2;
  return (k0 + (Math.abs(d) > 1e-12 ? 0.5 * (y0 - y2) / d : 0)) / sr;
}

export function spectrogramme(x, sr, n = 1024, hop = 256, maxTrames = 400) {
  const re = new Float64Array(n), im = new Float64Array(n), trames = []; const pas = Math.max(hop, Math.floor((x.length - n) / maxTrames));
  for (let d = 0; d + n <= x.length; d += pas) {
    for (let i = 0; i < n; i++) { re[i] = x[d + i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (n - 1))); im[i] = 0; }
    fft(re, im); const t = new Float32Array(n / 2 + 1); for (let i = 0; i <= n / 2; i++) t[i] = versDB(2 * Math.hypot(re[i], im[i]) / (n * 0.5)); trames.push(t);
  }
  return { trames, n, sr, pas };
}

// Rugosité (dissonance sensorielle) d'un ensemble de partiels, d'après le modèle de Plomp et Levelt simplifié par Sethares (1993).
// partiels : [{ f, a }] ; renvoie un nombre sans unité, plus grand quand l'oreille perçoit plus de battements rugueux.
export function rugosite(partiels) {
  const dstar = 0.24, s1 = 0.0207, s2 = 18.96, b1 = 3.51, b2 = 5.75; let d = 0;
  for (let i = 0; i < partiels.length; i++) for (let j = i + 1; j < partiels.length; j++) {
    const p = partiels[i], q = partiels[j], fmin = Math.min(p.f, q.f), s = dstar / (s1 * fmin + s2), df = Math.abs(q.f - p.f);
    d += Math.min(p.a, q.a) * (Math.exp(-b1 * s * df) - Math.exp(-b2 * s * df));
  }
  return d;
}
// Les partiels harmoniques (amplitude 1/k, comme une dent de scie) d'un ensemble de hauteurs
export const partielsHarmoniques = (freqs, nb = 6) => freqs.flatMap(f => Array.from({ length: nb }, (_, k) => ({ f: f * (k + 1), a: 1 / (k + 1) })));

export const vitesseSon = tempC => 331.3 + 0.606 * tempC; // m/s, approximation courante dans l'air sec

// Périodicité d'un spectre en dB (filtre en peigne) : écart des creux en Hz et contraste creux / crêtes en dB, par autocorrélation du spectre.
export function periodiciteSpectre(sp, fmin, fmax) {
  const a = Math.max(2, Math.round(fmin / sp.bin)), b = Math.min(sp.db.length - 3, Math.round(fmax / sp.bin)), n = b - a + 1;
  const s = new Float64Array(n); for (let i = 0; i < n; i++) { let t = 0; for (let j = -1; j <= 1; j++) t += Math.pow(10, sp.db[a + i + j] / 10); s[i] = 10 * Math.log10(t / 3); }
  const tri = Array.from(s).sort((x, y) => x - y), contraste = tri[Math.floor(n * 0.95)] - tri[Math.floor(n * 0.05)];
  let moy = 0; for (const v of s) moy += v; moy /= n; const c = new Float64Array(Math.floor(n / 2)); let e0 = 0; for (const v of s) e0 += (v - moy) ** 2;
  for (let lag = 0; lag < c.length; lag++) { let t = 0; for (let i = 0; i + lag < n; i++) t += (s[i] - moy) * (s[i + lag] - moy); c[lag] = t / e0; }
  let l0 = 1; while (l0 < c.length - 1 && c[l0] > 0) l0++;
  let k = l0; for (let lag = l0; lag < c.length - 1; lag++) if (c[lag] > c[k]) k = lag;
  for (let lag = l0 + 1; lag < k; lag++) if (c[lag] > c[lag - 1] && c[lag] >= c[lag + 1] && c[lag] > 0.8 * c[k]) { k = lag; break; }
  const y0 = c[k - 1], y1 = c[k], y2 = c[k + 1], d = y0 - 2 * y1 + y2, kf = k + (Math.abs(d) > 1e-12 ? 0.5 * (y0 - y2) / d : 0);
  return { pas: kf * sp.bin, contraste, nettete: y1 };
}

// Force g d'une réflexion retardée de tau, estimée sur le spectre moyen d'un bruit (renvoie { g, r } : r = g / (1 + g²) est la grandeur réellement mesurée ; g se déduit de r et devient imprécis près de 1) (|H|² = 1 + g² + 2 g cos(2 pi f tau)) :
// la composante du spectre à la période du peigne vaut 2 g, la moyenne 1 + g², donc r = g / (1 + g²). Robuste à la résolution (pas besoin de voir les creux).
export function profondeurPeigne(sp, fmin, fmax, tau) {
  const a = Math.max(2, Math.round(fmin / sp.bin)), b = Math.min(sp.db.length - 3, Math.round(fmax / sp.bin)), n = b - a + 1; let m = 0, cr = 0, ci = 0, sw = 0;
  for (let k = a; k <= b; k++) { const w = 0.5 - 0.5 * Math.cos(2 * Math.PI * (k - a) / (n - 1)), p = Math.pow(10, sp.db[k] / 10), ph = 2 * Math.PI * k * sp.bin * tau; m += w * p; cr += w * p * Math.cos(ph); ci += w * p * Math.sin(ph); sw += w; }
  // Le spectre de Welch est lissé par la fenêtre d'analyse : la composante du peigne est atténuée du facteur d'autocorrélation de la fenêtre de Hann au retard tau. On le corrige.
  const N = sp.fenetre === "hann" ? sp.n : 0, lag = Math.round(tau * sp.bin * (sp.n || 0)), hann = i => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1)); let rw = 1, e = 0; if (N) { rw = 0; for (let i = 0; i < N; i++) { e += hann(i) ** 2; if (i + lag < N) rw += hann(i) * hann(i + lag); } rw = Math.max(0.05, rw / e); }
  const r = Math.min(0.4999, Math.hypot(cr, ci) / m / rw); // (m0 g) / (m0 (1 + g²)) = g / (1 + g²), au plus 0,5 ; la fenêtre de Hann évite l'effet des bords
  return { g: (1 - Math.sqrt(1 - 4 * r * r)) / (2 * r), r };
}

// Réponse en puissance exacte du filtre passe-bande numérique (biquad de l'Audio EQ Cookbook, gain de crête 1) à la fréquence f
export function reponseBandePassante(f, f0, q, sr) {
  const w0 = 2 * Math.PI * f0 / sr, al = Math.sin(w0) / (2 * q), cw = Math.cos(w0), w = 2 * Math.PI * f / sr;
  const b0 = al, b2 = -al, a0 = 1 + al, a1 = -2 * cw, a2 = 1 - al;
  const nr = b0 + b2 * Math.cos(2 * w), ni = -b2 * Math.sin(2 * w), dr = a0 + a1 * Math.cos(w) + a2 * Math.cos(2 * w), di = -a1 * Math.sin(w) - a2 * Math.sin(2 * w);
  return (nr * nr + ni * ni) / (dr * dr + di * di);
}
// Largeur à -3 dB de ce filtre, calculée numériquement sur sa réponse exacte : { bas, haut, largeur }
export function largeurBandePassante(f0, q, sr) {
  const cible = 0.5; let bas = f0, haut = f0;
  while (bas > 1 && reponseBandePassante(bas, f0, q, sr) > cible) bas *= 0.9995;
  while (haut < sr / 2 - 1 && reponseBandePassante(haut, f0, q, sr) > cible) haut *= 1.0005;
  return { bas, haut, largeur: haut - bas };
}
// Ajuste cette réponse (f0, Q) au spectre moyen d'un bruit filtré par moindres carrés en dB : { f0, q, largeur, ecart }
export function ajusterResonance(sp, fmin, fmax, f0Depart) {
  const sr = sp.bin * sp.n, a = Math.max(2, Math.round(fmin / sp.bin)), b = Math.min(sp.db.length - 3, Math.round(fmax / sp.bin));
  const fs = [], ys = []; for (let k = a; k <= b; k += 2) { fs.push(k * sp.bin); ys.push(sp.db[k]); }
  const cout = (f0, q) => { let m = 0; const mod = fs.map(f => 10 * Math.log10(reponseBandePassante(f, f0, q, sr) + 1e-12)); for (let i = 0; i < fs.length; i++) m += ys[i] - mod[i]; m /= fs.length; let e = 0; for (let i = 0; i < fs.length; i++) { const d = ys[i] - mod[i] - m; e += d * d; } return e / fs.length; };
  let meilleur = { e: Infinity, f0: f0Depart, q: 2 };
  for (let i = -20; i <= 20; i++) for (let j = 0; j <= 40; j++) { const f0 = f0Depart * Math.exp(i / 20 * 0.4), q = 0.3 * Math.exp(j / 40 * Math.log(60 / 0.3)); const e = cout(f0, q); if (e < meilleur.e) meilleur = { e, f0, q }; }
  for (let pas = 1; pas <= 3; pas++) { const f0c = meilleur.f0, qc = meilleur.q, k = Math.pow(5, pas);
    for (let i = -10; i <= 10; i++) for (let j = -10; j <= 10; j++) { const f0 = f0c * Math.exp(i / 10 * 0.08 / k), q = qc * Math.exp(j / 10 * 0.25 / k), e = cout(f0, q); if (e < meilleur.e) meilleur = { e, f0, q }; } }
  return { f0: meilleur.f0, q: meilleur.q, largeur: largeurBandePassante(meilleur.f0, meilleur.q, sr).largeur, ecart: Math.sqrt(meilleur.e) };
}

// Suit un partiel d'une trame à la suivante (le pic le plus proche en hauteur de celui de la trame précédente) et renvoie sa pente moyenne
// en octaves par seconde, avec les segments suivis. Les sauts d'un partiel à un autre n'entrent pas dans la pente.
export function penteSuivie(spectro, { fmin = 60, tolOctave = 0.2, minTrames = 8 } = {}) {
  const { trames, n, sr, pas } = spectro, bin = sr / n, dt = pas / sr;
  const piste = t => { const out = []; let mx = -Infinity; for (let i = 2; i < t.length - 1; i++) if (i * bin >= fmin && t[i] > mx) mx = t[i];
    for (let i = 2; i < t.length - 1; i++) if (i * bin >= fmin && t[i] > t[i - 1] && t[i] >= t[i + 1] && t[i] > mx - 35) { const a = t[i - 1], b = t[i], c = t[i + 1], d = a - 2 * b + c, dl = Math.abs(d) > 1e-9 ? 0.5 * (a - c) / d : 0; out.push({ oct: Math.log2((i + dl) * bin), db: b }); }
    return out; };
  const segments = []; let cur = null;
  for (let j = 0; j < trames.length; j++) {
    const ps = piste(trames[j]); if (!ps.length) { cur = null; continue; }
    if (cur) { let best = null; for (const p of ps) if (!best || Math.abs(p.oct - cur.dernier) < Math.abs(best.oct - cur.dernier)) best = p; if (Math.abs(best.oct - cur.dernier) <= tolOctave) { cur.pts.push([j, best.oct]); cur.dernier = best.oct; continue; } }
    const dom = ps.reduce((a, b) => (b.db > a.db ? b : a)); cur = { pts: [[j, dom.oct]], dernier: dom.oct }; segments.push(cur);
  }
  let montee = 0, duree = 0; const utiles = segments.filter(s => s.pts.length >= minTrames);
  for (const s of utiles) { // régression linéaire de l'octave en fonction du temps, sur chaque segment
    const m = s.pts.length; let sx = 0, sy = 0, sxx = 0, sxy = 0; for (const [j, o] of s.pts) { const x = j * dt; sx += x; sy += o; sxx += x * x; sxy += x * o; }
    const pente = (m * sxy - sx * sy) / (m * sxx - sx * sx); montee += pente * (m - 1) * dt; duree += (m - 1) * dt;
  }
  return { pente: duree ? montee / duree : 0, segments: utiles.length, duree };
}
