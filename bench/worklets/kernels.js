// Noyaux de calcul du banc d'essai SONORA : un seul AudioWorkletProcessor, plusieurs types de charge, tous écrits de la même façon (boucle JavaScript sur des Float64Array),
// pour que les durées soient comparables entre elles. Ce ne sont pas des instruments : ce sont des charges représentatives de chaque famille de synthèse.
// Mesure faite à l'intérieur du worklet : performance.now() n'y existe pas (vérifié dans Chromium 153), on additionne donc Date.now() (résolution 1 ms) sur chaque appel,
// ce qui donne une durée moyenne exacte sur une fenêtre d'une seconde (l'erreur d'arrondi se moyenne), jamais une durée par bloc.
const TWO_PI = 2 * Math.PI;
const FFT_N = 1024;

function fft(re, im, inverse) {            // FFT radix 2 en place, volontairement simple et non optimisée : c'est une charge de référence, pas une bibliothèque
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = TWO_PI / len * (inverse ? -1 : 1), wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) { let cr = 1, ci = 0; for (let k = 0; k < len / 2; k++) {
      const ur = re[i + k], ui = im[i + k], vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci, vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
      re[i + k] = ur + vr; im[i + k] = ui + vi; re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi; const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t; } }
  }
}

class Noyau extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const o = options.processorOptions || {};
    this.kind = o.kind; this.n = o.kind === "sonde" ? 1 : Math.max(1, o.n | 0); this.vol = o.volume ?? 0.02; this.quantum = o.quantum || 128; this.rapportMs = 1000;
    this.appels = 0; this.occupe = 0; this.fenetreDebut = Date.now(); this.fenetreAppels = 0; this.fenetreOccupe = 0; this.dernierAppelFrame = -1; this.manques = 0;
    this.ph = new Float64Array(this.n * 8); this.fr = new Float64Array(this.n * 8);
    for (let i = 0; i < this.n * 8; i++) this.fr[i] = (55 * Math.pow(2, ((i * 7) % 60) / 12)) / sampleRate;
    this.y = new Float64Array(this.n * 4);
    if (this.kind === "wavetable") { this.table = new Float64Array(2048); for (let i = 0; i < 2048; i++) this.table[i] = Math.sin(TWO_PI * i / 2048) + 0.5 * Math.sin(TWO_PI * 3 * i / 2048) + 0.25 * Math.sin(TWO_PI * 5 * i / 2048); }
    if (this.kind === "granular") { this.buf = new Float64Array(sampleRate); for (let i = 0; i < this.buf.length; i++) this.buf[i] = Math.sin(TWO_PI * 220 * i / sampleRate) * Math.exp(-i / sampleRate * 3); this.g = Array.from({ length: this.n * 8 }, () => ({ pos: 0, len: 0, dep: 0, vit: 1 })); this.graine = 12345; }
    if (this.kind === "pluck") { this.lignes = Array.from({ length: this.n }, (_, i) => { const L = Math.max(2, Math.floor(sampleRate / (110 * Math.pow(2, (i % 24) / 12)))); const t = new Float64Array(L); let s = 7 + i; for (let k = 0; k < L; k++) { s = (s * 16807) % 2147483647; t[k] = s / 2147483647 * 2 - 1; } return { t, p: 0, L, m: 0 }; }); }
    if (this.kind === "spectral") { this.re = new Float64Array(FFT_N); this.im = new Float64Array(FFT_N); this.fen = new Float64Array(FFT_N).map((_, i) => 0.5 - 0.5 * Math.cos(TWO_PI * i / FFT_N)); this.entree = new Float64Array(FFT_N * 2); this.ei = 0; this.sortieTampon = new Float64Array(FFT_N * 2); this.hop = FFT_N / 4; this.depuis = 0; this.si = 0; }
    this.port.onmessage = e => { if (e.data === "stop") this.fini = true; };
  }

  process(entrees, sorties) {
    const t0 = Date.now();
    const out = sorties[0], n = out[0].length, nc = out.length, ch0 = out[0];
    if (this.dernierAppelFrame >= 0 && currentFrame - this.dernierAppelFrame > n) this.manques += Math.round((currentFrame - this.dernierAppelFrame) / n) - 1;   // des blocs n'ont pas été demandés : le fil audio a été retardé
    this.dernierAppelFrame = currentFrame;
    ch0.fill(0);
    const N = this.n, ph = this.ph, fr = this.fr, y = this.y, k = this.kind;
    if (k === "sinus") { for (let v = 0; v < N; v++) { let p = ph[v]; const f = fr[v]; for (let s = 0; s < n; s++) { ch0[s] += Math.sin(TWO_PI * p); p += f; if (p >= 1) p -= 1; } ph[v] = p; } }
    else if (k === "osc4") { for (let v = 0; v < N; v++) for (let o = 0; o < 4; o++) { const idx = v * 4 + o; let p = ph[idx]; const f = fr[idx]; for (let s = 0; s < n; s++) { ch0[s] += Math.sin(TWO_PI * p); p += f; if (p >= 1) p -= 1; } ph[idx] = p; } }
    else if (k === "filtre") { for (let v = 0; v < N; v++) { let p = ph[v], z = y[v]; const f = fr[v]; for (let s = 0; s < n; s++) { const x = 2 * p - 1; p += f; if (p >= 1) p -= 1; z += 0.12 * (x - z); ch0[s] += z; } ph[v] = p; y[v] = z; } }
    else if (k === "fm") { for (let v = 0; v < N; v++) { let pc = ph[v * 2], pm = ph[v * 2 + 1]; const fc = fr[v * 2], fm = fc * 2; for (let s = 0; s < n; s++) { ch0[s] += Math.sin(TWO_PI * pc + 3 * Math.sin(TWO_PI * pm)); pc += fc; pm += fm; if (pc >= 1) pc -= 1; if (pm >= 1) pm -= 1; } ph[v * 2] = pc; ph[v * 2 + 1] = pm; } }
    else if (k === "additive") { for (let v = 0; v < N; v++) for (let h = 1; h <= 16; h++) { const idx = (v * 8 + (h % 8)); let p = (ph[idx] * h) % 1; const f = fr[v * 8] * h, a = 1 / h; for (let s = 0; s < n; s++) { ch0[s] += a * Math.sin(TWO_PI * p); p += f; if (p >= 1) p -= 1; } if (h === 1) ph[v * 8] = p; } }
    else if (k === "wavetable") { const T = this.table; for (let v = 0; v < N; v++) { let p = ph[v]; const f = fr[v]; for (let s = 0; s < n; s++) { const x = p * 2048, i = x | 0, a = x - i; ch0[s] += T[i] * (1 - a) + T[(i + 1) & 2047] * a; p += f; if (p >= 1) p -= 1; } ph[v] = p; } }
    else if (k === "granular") { const B = this.buf, L = B.length; for (let g = 0; g < N * 8; g++) { const G = this.g[g]; for (let s = 0; s < n; s++) { if (G.dep >= G.len) { this.graine = (this.graine * 1103515245 + 12345) & 0x7fffffff; G.pos = (this.graine / 0x7fffffff) * (L - 8000); G.len = 1500 + (this.graine % 3000); G.dep = 0; G.vit = 0.5 + (this.graine % 100) / 50; } const w = 0.5 - 0.5 * Math.cos(TWO_PI * G.dep / G.len); const i = (G.pos + G.dep * G.vit) | 0; ch0[s] += B[i % L] * w * 0.125; G.dep++; } } }
    else if (k === "pluck") { for (let v = 0; v < N; v++) { const Q = this.lignes[v], t = Q.t, L = Q.L; let p = Q.p, m = Q.m; for (let s = 0; s < n; s++) { const nx = (p + 1) % L, x = 0.5 * (t[p] + t[nx]) * 0.996; ch0[s] += t[p]; t[p] = x; p = nx; } Q.p = p; if (++Q.m > 400) { Q.m = 0; let q = 7 + v; for (let kk = 0; kk < L; kk++) { q = (q * 16807) % 2147483647; t[kk] = q / 2147483647 * 2 - 1; } } } }
    else if (k === "spectral") { for (let v = 0; v < Math.max(1, N); v++) { for (let s = 0; s < n; s++) { this.entree[this.ei] = (s * 0.0123 + v) % 2 - 1; this.ei = (this.ei + 1) % this.entree.length; this.depuis++;
          if (this.depuis >= this.hop) { this.depuis = 0; for (let i = 0; i < FFT_N; i++) { this.re[i] = this.entree[(this.ei - FFT_N + i + this.entree.length) % this.entree.length] * this.fen[i]; this.im[i] = 0; } fft(this.re, this.im, false);
            for (let i = 0; i < FFT_N; i++) { const m = Math.hypot(this.re[i], this.im[i]) * 0.9; this.re[i] = m; this.im[i] = 0; } fft(this.re, this.im, true); for (let i = 0; i < FFT_N; i++) this.sortieTampon[(this.si + i) % this.sortieTampon.length] += this.re[i] / FFT_N * this.fen[i]; }
          ch0[s] += this.sortieTampon[this.si % this.sortieTampon.length]; this.sortieTampon[this.si % this.sortieTampon.length] = 0; this.si++; } } }
    else if (k === "brule") { let x = 0; for (let i = 0; i < N * 20000; i++) x += Math.sin(i); ch0[0] += x * 1e-12; }
    else if (k === "sonde") { /* ne calcule rien : sert seulement à détecter un fil audio retardé (blocs manqués) */ }
    const g = this.vol / (k === "sinus" || k === "osc4" || k === "filtre" || k === "fm" || k === "additive" || k === "wavetable" || k === "pluck" ? Math.sqrt(N) : Math.max(1, Math.sqrt(N)));
    for (let s = 0; s < n; s++) ch0[s] *= g;
    for (let c = 1; c < nc; c++) out[c].set(ch0);
    const t1 = Date.now(); this.appels++; this.fenetreAppels++; this.fenetreOccupe += t1 - t0;
    if (t1 - this.fenetreDebut >= this.rapportMs) {
      this.port.postMessage({ type: "fenetre", appels: this.fenetreAppels, occupe_ms: this.fenetreOccupe, mur_ms: t1 - this.fenetreDebut, frame: currentFrame, appelsTotal: this.appels, blocsManques: this.manques, quantum: n });
      this.fenetreDebut = t1; this.fenetreAppels = 0; this.fenetreOccupe = 0;
    }
    return !this.fini;
  }
}
registerProcessor("bench-noyau", Noyau);
