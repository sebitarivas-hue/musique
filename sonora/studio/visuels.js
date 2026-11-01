// Visualisations du Studio : oscilloscope et analyseur de spectre, alimentés par les tampons que le moteur envoie (2048 échantillons).
const TAILLE = 2048;
const FENETRE = new Float32Array(TAILLE).map((_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (TAILLE - 1)));

// FFT (Cooley-Tukey) d'un tampon réel : renvoie les niveaux en dB de 0 à Nyquist.
export function spectreDB(x) {
  const n = TAILLE, re = new Float64Array(n), im = new Float64Array(n);
  for (let i = 0; i < n; i++) re[i] = (x[i] || 0) * FENETRE[i];
  for (let i = 1, j = 0; i < n; i++) { let b = n >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { const t = re[i]; re[i] = re[j]; re[j] = t; } }
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
  const m = new Float32Array(n / 2 + 1);
  for (let i = 0; i <= n / 2; i++) m[i] = 20 * Math.log10(Math.max(1e-9, 2 * Math.hypot(re[i], im[i]) / (n * 0.5)));
  return m;
}

function pret(cv) { // cadre le canvas sur sa taille affichée (écrans haute densité compris)
  const r = cv.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1), w = Math.max(10, Math.round(r.width * d)), h = Math.max(10, Math.round(r.height * d));
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  const c = cv.getContext("2d"); c.setTransform(1, 0, 0, 1, 0, 0); return { c, w, h, d };
}
const couleur = (nom, defaut) => getComputedStyle(document.documentElement).getPropertyValue(nom).trim() || defaut;

export function dessinerOscillo(cv, x) {
  const { c, w, h, d } = pret(cv); const noir = couleur("--noir", "#11110F"), acide = couleur("--acide", "#D6FF00");
  c.fillStyle = noir; c.fillRect(0, 0, w, h);
  c.strokeStyle = "rgba(240,239,232,.18)"; c.lineWidth = d; c.beginPath(); c.moveTo(0, h / 2); c.lineTo(w, h / 2); c.moveTo(0, h / 4); c.lineTo(w, h / 4); c.moveTo(0, 3 * h / 4); c.lineTo(w, 3 * h / 4); c.stroke();
  if (!x) return;
  // déclenchement : premier passage montant par zéro, pour une image stable
  let t0 = 0; for (let i = 1; i < TAILLE / 2; i++) if (x[i - 1] < 0 && x[i] >= 0) { t0 = i; break; }
  const n = TAILLE - t0 - 1, vu = Math.min(n, 1024);
  c.strokeStyle = acide; c.lineWidth = 2 * d; c.beginPath();
  for (let i = 0; i < vu; i++) { const px = i / (vu - 1) * w, py = h / 2 - x[t0 + i] * (h / 2 - 6 * d); i ? c.lineTo(px, py) : c.moveTo(px, py); }
  c.stroke();
  c.fillStyle = "rgba(240,239,232,.6)"; c.font = `${10 * d}px monospace`; c.fillText("+1", 4 * d, 12 * d); c.fillText("-1", 4 * d, h - 4 * d);
}

// Spectre en échelle logarithmique de 20 Hz à 20 kHz, niveau de -90 à 0 dB.
export function dessinerSpectre(cv, x, sr) {
  const { c, w, h, d } = pret(cv); const noir = couleur("--noir", "#11110F"), acide = couleur("--acide", "#D6FF00");
  c.fillStyle = noir; c.fillRect(0, 0, w, h);
  const fmin = 20, fmax = Math.min(20000, sr / 2), X = f => Math.log(f / fmin) / Math.log(fmax / fmin) * w, Y = db => h - Math.max(0, Math.min(1, (db + 90) / 90)) * (h - 14 * d);
  c.strokeStyle = "rgba(240,239,232,.18)"; c.lineWidth = d; c.fillStyle = "rgba(240,239,232,.6)"; c.font = `${10 * d}px monospace`;
  for (const f of [100, 1000, 10000]) { c.beginPath(); c.moveTo(X(f), 0); c.lineTo(X(f), h); c.stroke(); c.fillText(f >= 1000 ? f / 1000 + " kHz" : f + " Hz", X(f) + 3 * d, h - 3 * d); }
  for (const db of [-20, -40, -60]) { c.beginPath(); c.moveTo(0, Y(db)); c.lineTo(w, Y(db)); c.stroke(); c.fillText(db + " dB", 3 * d, Y(db) - 2 * d); }
  if (!x) return;
  const m = spectreDB(x), bin = sr / TAILLE;
  c.strokeStyle = acide; c.lineWidth = 2 * d; c.beginPath(); let premier = true;
  for (let px = 0; px < w; px += d) {
    const f0 = fmin * Math.pow(fmax / fmin, px / w), f1 = fmin * Math.pow(fmax / fmin, (px + d) / w);
    let a = Math.max(1, Math.floor(f0 / bin)), b = Math.max(a, Math.ceil(f1 / bin)), mx = -120; for (let k = a; k <= b && k < m.length; k++) mx = Math.max(mx, m[k]);
    premier ? c.moveTo(px, Y(mx)) : c.lineTo(px, Y(mx)); premier = false;
  }
  c.stroke();
}

// Fréquence du pic principal (pour l'affichage et pour les tests)
export function picHz(x, sr) {
  const m = spectreDB(x); let k = 1; for (let i = 2; i < m.length; i++) if (m[i] > m[k]) k = i;
  if (m[k] < -70) return null;
  const a = m[k - 1], b = m[k], c = m[k + 1] ?? b, den = a - 2 * b + c, dlt = Math.abs(den) > 1e-9 ? 0.5 * (a - c) / den : 0;
  return (k + dlt) * sr / TAILLE;
}
