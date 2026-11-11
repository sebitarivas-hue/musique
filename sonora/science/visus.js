// Dessins de SONORA Science : signal, spectre, spectrogramme, enveloppe, courbes. Tout est tracé à partir des mesures, aucune image n'est préparée.
import * as A from "./analyse.js?v=bae1304164";

function pret(cv) {
  const r = cv.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1), w = Math.max(10, Math.round(r.width * d)), h = Math.max(10, Math.round(r.height * d));
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  const c = cv.getContext("2d"); c.setTransform(1, 0, 0, 1, 0, 0); return { c, w, h, d };
}
const NOIR = "#11110F", ACIDE = "#D6FF00", PAPIER = "#F0EFE8", ROUGE = "#FF5638", BLEU = "#8FA0FF";
const fond = (c, w, h) => { c.fillStyle = NOIR; c.fillRect(0, 0, w, h); };
const texte = (c, d) => { c.fillStyle = "rgba(240,239,232,.65)"; c.font = `${10 * d}px monospace`; };

// signal dans le temps : x (Float32Array), sr, fenêtre de `duree` secondes à partir de `debut` ; deuxième canal en bleu s'il existe
export function dessinerSignal(cv, canaux, sr, { duree = 0.03, debut = 0.5 } = {}) {
  const { c, w, h, d } = pret(cv); fond(c, w, h); texte(c, d);
  c.strokeStyle = "rgba(240,239,232,.18)"; c.lineWidth = d; c.beginPath(); c.moveTo(0, h / 2); c.lineTo(w, h / 2); c.stroke();
  const a = Math.round(debut * sr), n = Math.min(Math.round(duree * sr), canaux[0].length - a - 1); if (n < 2) return;
  const cr = Math.max(0.05, ...canaux.map(x => A.crete(x, a, a + n)));
  canaux.forEach((x, k) => { c.strokeStyle = k ? BLEU : ACIDE; c.lineWidth = 2 * d; c.beginPath(); for (let i = 0; i < n; i++) { const px = i / (n - 1) * w, py = h / 2 - x[a + i] / (cr * 1.1) * (h / 2 - 8 * d); i ? c.lineTo(px, py) : c.moveTo(px, py); } c.stroke(); });
  c.fillText(`${(duree * 1000).toFixed(0)} ms`, w - 48 * d, h - 4 * d); c.fillText(`±${cr.toFixed(2)}`, 4 * d, 12 * d);
}
// spectre d'amplitude en dB, axe de fréquence logarithmique
export function dessinerSpectreStatique(cv, x, sr, { debut = 0.5 } = {}) {
  const { c, w, h, d } = pret(cv); fond(c, w, h); texte(c, d); const n = 16384, a = Math.min(Math.round(debut * sr), Math.max(0, x.length - n)), m = A.spectre(x, a, n);
  const fmin = 20, fmax = Math.min(20000, sr / 2), X = f => Math.log(f / fmin) / Math.log(fmax / fmin) * w, Y = db => h - Math.max(0, Math.min(1, (db + 100) / 100)) * (h - 14 * d);
  c.strokeStyle = "rgba(240,239,232,.18)"; c.lineWidth = d;
  for (const f of [100, 1000, 10000]) { c.beginPath(); c.moveTo(X(f), 0); c.lineTo(X(f), h); c.stroke(); c.fillText(f >= 1000 ? f / 1000 + " kHz" : f + " Hz", X(f) + 3 * d, h - 3 * d); }
  for (const db of [-20, -40, -60, -80]) { c.beginPath(); c.moveTo(0, Y(db)); c.lineTo(w, Y(db)); c.stroke(); c.fillText(db + " dB", 3 * d, Y(db) - 2 * d); }
  const bin = sr / n; c.strokeStyle = ACIDE; c.lineWidth = 2 * d; c.beginPath(); let p = true;
  for (let px = 0; px < w; px += d) { const f0 = fmin * Math.pow(fmax / fmin, px / w), f1 = fmin * Math.pow(fmax / fmin, (px + d) / w); let mx = 1e-9; for (let k = Math.max(1, Math.floor(f0 / bin)); k <= Math.max(Math.ceil(f1 / bin), 1) && k < m.length; k++) mx = Math.max(mx, m[k]); const py = Y(A.versDB(mx)); p ? c.moveTo(px, py) : c.lineTo(px, py); p = false; }
  c.stroke();
}
// spectrogramme : temps en abscisse, fréquence en ordonnée (échelle linéaire jusqu'à fmax), niveau en couleur
export function dessinerSpectrogramme(cv, sp, { fmax = 8000, db0 = -90 } = {}) {
  const { c, w, h, d } = pret(cv); fond(c, w, h); const T = sp.trames.length, K = Math.min(sp.trames[0].length - 1, Math.floor(fmax / (sp.sr / sp.n))); if (!T || K < 2) return;
  const img = c.createImageData(w, h);
  for (let y = 0; y < h; y++) { const k = Math.min(K, Math.round((1 - y / (h - 1)) * K)); for (let x = 0; x < w; x++) { const t = Math.min(T - 1, Math.floor(x / w * T)), v = Math.max(0, Math.min(1, (sp.trames[t][k] - db0) / -db0)), i = (y * w + x) * 4;
    const g = Math.pow(v, 1.6); img.data[i] = Math.round(17 + g * (214 - 17)); img.data[i + 1] = Math.round(17 + g * (255 - 17)); img.data[i + 2] = Math.round(15 + (g > 0.7 ? (g - 0.7) / 0.3 * 200 : 0)); img.data[i + 3] = 255; } }
  c.putImageData(img, 0, 0); texte(c, d); const dur = T * sp.pas / sp.sr;
  for (const f of [1000, 2000, 4000, 8000].filter(f => f < fmax)) { const y = h - f / fmax * h; c.fillText(f / 1000 + " kHz", 3 * d, y - 2 * d); c.strokeStyle = "rgba(240,239,232,.25)"; c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
  c.fillText(dur.toFixed(1) + " s", w - 36 * d, h - 4 * d);
}
// courbe y(x) quelconque : xs, ys ; options : logx, xmin, xmax, ymin, ymax, repères verticaux
export function dessinerCourbe(cv, xs, ys, { logx = false, xmin = xs[0], xmax = xs[xs.length - 1], ymin = Math.min(...ys), ymax = Math.max(...ys), reperes = [], etiquetteX = "", etiquetteY = "", modele = null } = {}) {
  const { c, w, h, d } = pret(cv); fond(c, w, h); texte(c, d);
  const X = x => (logx ? Math.log(x / xmin) / Math.log(xmax / xmin) : (x - xmin) / (xmax - xmin)) * (w - 16 * d) + 8 * d, Y = y => h - 14 * d - (y - ymin) / (ymax - ymin || 1) * (h - 24 * d);
  c.strokeStyle = "rgba(240,239,232,.18)"; c.lineWidth = d; for (let i = 0; i <= 4; i++) { const y = ymin + (ymax - ymin) * i / 4; c.beginPath(); c.moveTo(0, Y(y)); c.lineTo(w, Y(y)); c.stroke(); c.fillText(y.toFixed(Math.abs(ymax - ymin) > 20 ? 0 : 2), 3 * d, Y(y) - 2 * d); }
  for (const r of reperes) { c.strokeStyle = ROUGE; c.beginPath(); c.moveTo(X(r.x), 0); c.lineTo(X(r.x), h); c.stroke(); c.fillStyle = ROUGE; c.fillText(r.t, X(r.x) + 3 * d, 12 * d); texte(c, d); }
  if (modele) { c.strokeStyle = BLEU; c.lineWidth = 2 * d; c.setLineDash([6 * d, 4 * d]); c.beginPath(); modele.forEach(([x, y], i) => { const px = X(x), py = Y(Math.max(ymin, Math.min(ymax, y))); i ? c.lineTo(px, py) : c.moveTo(px, py); }); c.stroke(); c.setLineDash([]); }
  c.strokeStyle = ACIDE; c.lineWidth = 2 * d; c.beginPath(); xs.forEach((x, i) => { if (x < xmin || x > xmax) return; const px = X(x), py = Y(Math.max(ymin, Math.min(ymax, ys[i]))); i ? c.lineTo(px, py) : c.moveTo(px, py); }); c.stroke();
  c.fillStyle = "rgba(240,239,232,.65)"; c.fillText(etiquetteX, w - (etiquetteX.length * 6 + 8) * d, h - 3 * d); if (etiquetteY) c.fillText(etiquetteY, 36 * d, 12 * d);
}
// points reliés (escalier de l'auditeur, valeurs en échelle logarithmique en ordonnée)
export function dessinerEscalier(cv, essais, inversions) {
  const { c, w, h, d } = pret(cv); fond(c, w, h); texte(c, d); if (!essais.length) return;
  const ys = essais.map(e => Math.log(e.delta)), lo = Math.min(...ys) - 0.2, hi = Math.max(...ys) + 0.2, X = i => 10 * d + i / Math.max(1, essais.length - 1) * (w - 20 * d), Y = y => h - 14 * d - (y - lo) / (hi - lo) * (h - 24 * d);
  c.strokeStyle = ACIDE; c.lineWidth = 2 * d; c.beginPath(); essais.forEach((e, i) => { i ? c.lineTo(X(i), Y(Math.log(e.delta))) : c.moveTo(X(i), Y(Math.log(e.delta))); }); c.stroke();
  essais.forEach((e, i) => { c.fillStyle = e.juste ? ACIDE : ROUGE; c.beginPath(); c.arc(X(i), Y(Math.log(e.delta)), 3.5 * d, 0, 7); c.fill(); });
  for (const v of [100, 50, 20, 10, 5, 2, 1]) if (Math.log(v) > lo && Math.log(v) < hi) { c.strokeStyle = "rgba(240,239,232,.18)"; c.beginPath(); c.moveTo(0, Y(Math.log(v))); c.lineTo(w, Y(Math.log(v))); c.stroke(); c.fillStyle = "rgba(240,239,232,.65)"; c.fillText(v + " cents", 3 * d, Y(Math.log(v)) - 2 * d); }
}
