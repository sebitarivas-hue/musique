// Corrélation pour la latence aller-retour réelle (haut-parleur vers micro) : le signal émis est une séquence à longueur maximale (MLS), dont l'autocorrélation est un pic net.
// Les fonctions sont sans DOM : elles sont testées dans Node (benchmarks/sonora/tests/loopback.test.mjs) avec un retard connu.
export function mls(ordre = 14) {   // registre à décalage 14 bits, polynôme x^14 + x^5 + x^3 + x + 1 (période 16383, vérifiée par test)
  const n = (1 << ordre) - 1, out = new Float32Array(n); let reg = 1; const taps = { 14: [14, 5, 3, 1] }[ordre]; if (!taps) throw new Error("seul l'ordre 14 est fourni : ses coefficients sont vérifiés par test (période 16383)");
  for (let i = 0; i < n; i++) { out[i] = (reg & 1) ? 1 : -1; let b = 0; for (const t of taps) b ^= (reg >> (t - 1)) & 1; reg = (reg >> 1) | (b << (ordre - 1)); } return out;
}
function fft(re, im, inv) { const n = re.length; for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
  for (let len = 2; len <= n; len <<= 1) { const a = 2 * Math.PI / len * (inv ? -1 : 1), wr = Math.cos(a), wi = Math.sin(a); for (let i = 0; i < n; i += len) { let cr = 1, ci = 0; for (let k = 0; k < len / 2; k++) { const u = i + k, v = i + k + len / 2, xr = re[v] * cr - im[v] * ci, xi = re[v] * ci + im[v] * cr; re[v] = re[u] - xr; im[v] = im[u] - xi; re[u] += xr; im[u] += xi; const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t; } } }
  if (inv) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; } }
// Renvoie { retard_echantillons, pic, rapport_pic_bruit } : position du maximum de la corrélation croisée entre le signal émis et le signal reçu.
export function correler(emis, recu) {
  let n = 1; while (n < emis.length + recu.length) n <<= 1;
  const ar = new Float64Array(n), ai = new Float64Array(n), br = new Float64Array(n), bi = new Float64Array(n); ar.set(recu); br.set(emis); fft(ar, ai, false); fft(br, bi, false);
  for (let i = 0; i < n; i++) { const r = ar[i] * br[i] + ai[i] * bi[i], im = ai[i] * br[i] - ar[i] * bi[i]; ar[i] = r; ai[i] = im; }   // recu * conj(emis)
  fft(ar, ai, true); let max = 0, pos = 0, somme = 0; const lim = recu.length; for (let i = 0; i < lim; i++) { const v = Math.abs(ar[i]); somme += v; if (v > max) { max = v; pos = i; } }
  const moyenne = somme / lim; return { retard_echantillons: pos, pic: max, rapport_pic_bruit: moyenne ? max / moyenne : null };
}
