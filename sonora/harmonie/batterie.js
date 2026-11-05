// Une batterie fabriquée en JavaScript, sans fichier ni réseau : chaque son est calculé (balayage de hauteur, bruit filtré, enveloppes) et gardé en mémoire.
// Elle sert à l'accompagnement d'Harmonie (genres.js). Aucun hasard : le bruit vient d'une suite fixe, donc le même accord sonne toujours pareil.
// Trois jeux de sons : « 909 » (sec, électronique), « 808 » (grave et long, rap et trap), « acoustique » (rock, reggae, blues).

const SR_DEFAUT = 44100;
export const SONS_BATTERIE = ["kick", "snare", "clap", "hatc", "hato", "rim", "tom", "cow", "shaker", "ride", "crash"];
export const KITS = { "909": "Boîte à rythmes sèche", "808": "Boîte à rythmes grave", acoustique: "Batterie douce", reel: "Vraie batterie" };
// « reel » : une vraie batterie enregistrée (Big Rusty Drums, Karoryfer Samples, CC0 ; voir outils/banque_batterie.py), avec des coups forts, moyens et doux et plusieurs alternances de chaque coup.
// Tant que les enregistrements ne sont pas chargés (ou dans Node), « reel » joue la batterie douce calculée.

// Bruit blanc déterministe (suite congruentielle), entre -1 et 1.
function bruit(n, graine) { const x = new Float32Array(n); let s = graine >>> 0; for (let i = 0; i < n; i++) { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; x[i] = s / 2147483648 - 1; } return x; }
// Passe-haut et passe-bas d'ordre un.
function passeHaut(x, fc, sr) { const a = 1 / (1 + 2 * Math.PI * fc / sr), y = new Float32Array(x.length); let py = 0, px = 0; for (let i = 0; i < x.length; i++) { py = a * (py + x[i] - px); px = x[i]; y[i] = py; } return y; }
function passeBas(x, fc, sr) { const a = 1 - Math.exp(-2 * Math.PI * fc / sr), y = new Float32Array(x.length); let p = 0; for (let i = 0; i < x.length; i++) { p += a * (x[i] - p); y[i] = p; } return y; }
const env = (t, tau) => Math.exp(-t / tau);

function grosseCaisse(kit, sr) {
  const duree = kit === "808" ? 0.9 : kit === "acoustique" ? 0.38 : 0.45, n = Math.round(duree * sr), y = new Float32Array(n);
  const f0 = kit === "808" ? 125 : kit === "acoustique" ? 110 : 165, f1 = kit === "808" ? 43 : kit === "acoustique" ? 58 : 52, tp = kit === "808" ? 0.055 : kit === "acoustique" ? 0.035 : 0.028, ta = kit === "808" ? 0.42 : kit === "acoustique" ? 0.11 : 0.15;
  let ph = 0; for (let i = 0; i < n; i++) { const t = i / sr, f = f1 + (f0 - f1) * env(t, tp); ph += 2 * Math.PI * f / sr; let v = Math.sin(ph) * env(t, ta); if (kit === "808") v = Math.tanh(1.6 * v); y[i] = v; }
  const clic = bruit(Math.round(0.004 * sr), 11); for (let i = 0; i < clic.length; i++) y[i] += clic[i] * (kit === "acoustique" ? 0.35 : 0.25) * (1 - i / clic.length);
  return y;
}
function caisseClaire(kit, sr) {
  const duree = kit === "808" ? 0.32 : 0.3, n = Math.round(duree * sr), y = new Float32Array(n), b = passeHaut(bruit(n, 23), kit === "acoustique" ? 1400 : 1800, sr);
  const fc = kit === "acoustique" ? 190 : 185, tb = kit === "acoustique" ? 0.1 : kit === "808" ? 0.15 : 0.12; let ph = 0;
  for (let i = 0; i < n; i++) { const t = i / sr; ph += 2 * Math.PI * (fc + 45 * env(t, 0.02)) / sr; y[i] = Math.sin(ph) * env(t, 0.07) * 0.55 + b[i] * env(t, tb) * (kit === "acoustique" ? 0.7 : 0.85); }
  return kit === "acoustique" ? passeBas(y, 9000, sr) : y;
}
function frappeMains(kit, sr) {
  const n = Math.round(0.35 * sr), y = new Float32Array(n), b = passeHaut(passeBas(bruit(n, 37), 4500, sr), 900, sr);
  for (let i = 0; i < n; i++) { const t = i / sr; let e = 0; for (const d of [0, 0.011, 0.022, 0.033]) if (t >= d) e = Math.max(e, env(t - d, 0.009)); y[i] = b[i] * (e + 0.7 * env(t, kit === "808" ? 0.14 : 0.1)); }
  return y;
}
function charleston(ouvert, kit, sr) {
  const n = Math.round((ouvert ? 0.45 : 0.1) * sr), b = passeHaut(bruit(n, ouvert ? 53 : 47), 7000, sr), y = new Float32Array(n), tau = ouvert ? 0.16 : 0.022;
  for (let i = 0; i < n; i++) y[i] = b[i] * env(i / sr, tau) * (kit === "acoustique" ? 0.5 : 0.6);
  return y;
}
function rimshot(sr) { const n = Math.round(0.07 * sr), y = new Float32Array(n), b = bruit(n, 61); for (let i = 0; i < n; i++) { const t = i / sr; y[i] = (Math.sin(2 * Math.PI * 1750 * t) * 0.6 + Math.sin(2 * Math.PI * 480 * t) * 0.4) * env(t, 0.011) + b[i] * env(t, 0.003) * 0.4; } return y; }
function tom(kit, sr) { const n = Math.round(0.5 * sr), y = new Float32Array(n); let ph = 0; for (let i = 0; i < n; i++) { const t = i / sr; ph += 2 * Math.PI * (118 + 60 * env(t, 0.05)) / sr; y[i] = Math.sin(ph) * env(t, kit === "808" ? 0.3 : 0.2); } return y; }
function cloche(sr) { const n = Math.round(0.4 * sr), y = new Float32Array(n); for (let i = 0; i < n; i++) { const t = i / sr, c = (Math.sin(2 * Math.PI * 540 * t) >= 0 ? 1 : -1) * 0.5 + (Math.sin(2 * Math.PI * 800 * t) >= 0 ? 1 : -1) * 0.5; y[i] = c * (env(t, 0.012) * 0.7 + env(t, 0.16) * 0.3); } return passeBas(passeHaut(y, 400, sr), 5200, sr); }
function maracas(sr) { const n = Math.round(0.12 * sr), b = passeHaut(bruit(n, 71), 5000, sr), y = new Float32Array(n); for (let i = 0; i < n; i++) { const t = i / sr; y[i] = b[i] * Math.min(1, t / 0.008) * env(t, 0.04) * 0.55; } return y; }

function cymbale(crash, sr) {
  const n = Math.round((crash ? 1.6 : 1.2) * sr), b = passeHaut(bruit(n, crash ? 83 : 89), crash ? 3000 : 5000, sr), y = new Float32Array(n), tau = crash ? 0.5 : 0.3;
  for (let i = 0; i < n; i++) { const t = i / sr; y[i] = b[i] * env(t, tau) * 0.6 + (crash ? 0 : Math.sin(2 * Math.PI * 3300 * t) * env(t, 0.12) * 0.25); }
  return y;
}

const CACHE = new Map();
// Le son d'une pièce de batterie, pour un jeu de sons et une fréquence d'échantillonnage. Renvoie un Float32Array, calculé une fois.
export function son(nom, kit = "909", sr = SR_DEFAUT, couche = "x", variante = 0) {
  if (kit === "reel") {
    const K = REEL.reel, P = K && K.pieces[nom];
    if (P) { const L = P[couche] && P[couche].length ? P[couche] : P.x || Object.values(P)[0], x = L[variante % L.length], cl = `reel|${nom}|${couche}|${variante % L.length}|${sr}`; if (!REPOSE.has(cl)) REPOSE.set(cl, reechantillonner(x, K.sr, sr)); return REPOSE.get(cl); }
    kit = "acoustique";   // pas (encore) d'enregistrement : la batterie douce calculée
  }
  const cle = `${nom}|${kit}|${sr}`; if (CACHE.has(cle)) return CACHE.get(cle);
  const x = nom === "kick" ? grosseCaisse(kit, sr) : nom === "snare" ? caisseClaire(kit, sr) : nom === "clap" ? frappeMains(kit, sr) : nom === "hatc" ? charleston(false, kit, sr) : nom === "hato" ? charleston(true, kit, sr)
    : nom === "rim" ? rimshot(sr) : nom === "tom" ? tom(kit, sr) : nom === "cow" ? cloche(sr) : nom === "shaker" ? maracas(sr) : nom === "ride" ? cymbale(false, sr) : nom === "crash" ? cymbale(true, sr) : null;
  if (!x) throw new Error("pièce de batterie inconnue : " + nom);
  let m = 0; for (const v of x) m = Math.max(m, Math.abs(v)); if (m > 0) for (let i = 0; i < x.length; i++) x[i] /= m;   // chaque pièce est ramenée à une crête de 1 : le mixage règle ensuite les niveaux
  CACHE.set(cle, x); return x;
}

// Les enregistrements : { kit: { piece: { couche: [Float32Array, ...] } } }, avec leur fréquence d'échantillonnage. Mémorisés une fois chargés ; dans Node, les tests les fournissent (mettreKit).
const REEL = {}, REPOSE = new Map();
export const kitPret = nom => !!REEL[nom];
export function mettreKit(nom, pieces, sr = 44100) { REEL[nom] = { pieces, sr }; CACHE.clear(); REPOSE.clear(); }
function reechantillonner(x, de, vers) {
  if (de === vers) return x; const n = Math.round(x.length * vers / de), y = new Float32Array(n), k = de / vers;
  for (let i = 0; i < n; i++) { const p = i * k, j = Math.floor(p), f = p - j; y[i] = (x[j] || 0) * (1 - f) + (x[j + 1] || 0) * f; } return y;
}
export function racineBatterie() { return new URL("../../faust/banque/batterie/", import.meta.url).href; }
// Charge les enregistrements de la batterie réelle (une seule fois). `ctx` : n'importe quel AudioContext (un OfflineAudioContext suffit : le décodage ne demande aucun geste).
let ENCOURS = null;
export function chargerKit(ctx = new OfflineAudioContext(1, 1, 44100), base = racineBatterie()) {
  if (REEL.reel) return Promise.resolve(true); if (ENCOURS) return ENCOURS;
  ENCOURS = fetch(base + "batterie.json").then(r => (r.ok ? r.json() : null)).then(async cat => {
    if (!cat) return false; const pieces = {}; let sr = 44100;
    await Promise.all(Object.entries(cat).map(async ([piece, couches]) => { pieces[piece] = {}; for (const [couche, noms] of Object.entries(couches)) pieces[piece][couche] = await Promise.all(noms.map(async nom => {
      const b = await new Promise((ok, ko) => { fetch(base + nom + ".mp3").then(r => r.arrayBuffer()).then(a => { const p = ctx.decodeAudioData(a, ok, ko); if (p && p.catch) p.catch(ko); }).catch(ko); }); sr = b.sampleRate; return b.getChannelData(0).slice(); })); }));
    mettreKit("reel", pieces, sr); return true; }).catch(() => false);
  return ENCOURS;
}

// Niveau relatif de chaque pièce dans le mélange.
const NIVEAU = { kick: 0.95, snare: 0.8, clap: 0.7, hatc: 0.42, hato: 0.42, rim: 0.6, tom: 0.75, cow: 0.4, shaker: 0.35, ride: 0.4, crash: 0.5 };

// Joue des grilles (une chaîne de 16 caractères par pièce, « x » coup normal, « o » coup doux, « . » silence) sur `mesures` mesures.
// grilles : [{ mesure, pistes: { kick: "x...", ... } }] ou un objet unique répété. Retourne un Float32Array mono de la durée voulue ; un coup qui dépasse la fin revient au début (boucle sans couture).
export function rendreBatterie(grille, { bpm = 100, swing = 0, mesures = 4, pas = 16, kit = "909", sr = SR_DEFAUT, parMesure = null, volumes = {} } = {}) {
  const dur = 60 / bpm / 4, n = Math.round(mesures * pas * dur * sr), y = new Float32Array(n), reel = kit === "reel" && kitPret("reel"), tour = {};
  // Le jeu humain de la batterie réelle, sans hasard (le même motif sonne toujours pareil) : chaque coup a un léger décalage (jusqu'à 6 ms) et un volume un peu différent, les coups de charleston qui tombent
  // entre les temps sont plus doux, et un même coup alterne entre plusieurs enregistrements pour ne pas sonner comme une mitrailleuse.
  const h = (m, i, p) => ((m * 131 + i * 31 + p.charCodeAt(0) * 17 + p.length * 7) % 97);
  for (let m = 0; m < mesures; m++) {
    const g = (parMesure && parMesure(m)) || grille;
    for (const [piece, motif] of Object.entries(g)) {
      if (!SONS_BATTERIE.includes(piece)) continue; const niv = (NIVEAU[piece] || 0.6) * (volumes[piece] ?? 1);
      for (let i = 0; i < pas; i++) { const c = motif[i % motif.length]; if (c !== "x" && c !== "o") continue;
        let couche = c === "o" ? "o" : "x"; if (reel && piece === "hatc" && c === "x") { const q = i % (pas === 12 ? 3 : 4); couche = q === 0 ? "x" : q === 2 || (pas === 12 && q === 1) ? "m" : "o"; }
        const s = reel ? son(piece, kit, sr, couche, tour[piece] = (tour[piece] ?? -1) + 1) : son(piece, kit, sr);
        const dt = reel ? (piece === "kick" ? (h(m, i, piece) % 7 - 3) : (h(m, i, piece) % 13 - 6)) / 1000 : 0, vh = reel ? 1 + ((h(m, i, piece + "v") % 9) - 4) / 100 : 1;
        const t = (m * pas + i) * dur + (i % 2 ? swing * dur : 0) + dt, d0 = Math.max(0, Math.round(t * sr)), v = niv * (reel ? (c === "o" ? 0.9 : 1) : (c === "o" ? 0.55 : 1)) * vh;
        for (let k = 0; k < s.length; k++) y[(d0 + k) % n] += s[k] * v; }
    }
  }
  return y;
}
