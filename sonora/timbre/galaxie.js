// La galaxie de l'élève : le système solaire, en vraie 3D. Treize corps (huit planètes et cinq planètes naines) sont les contenus du site ; la Terre mène à l'Atlas.
// Chaque corps est peint en procédural d'après le vrai : bandes et Grande Tache rouge de Jupiter, anneaux de Saturne, calottes et poussière de Mars, cratères de Mercure,
// nuages de Vénus, Terre aux vrais continents (terres.json, Natural Earth, domaine public), glaces d'Uranus et de Neptune, cœur de Pluton... avec leurs lunes, leur
// inclinaison d'axe et leur propre orbite elliptique inclinée autour du soleil (excentricité et inclinaison d'après les vraies, les distances sont resserrées).
// Le soleil remplace la flamme : éteint tant qu'on n'a pas joué aujourd'hui, de plus en plus brillant au fil des parties, remis à zéro à minuit (donnees.soleil.eclat, de 0 à 1).
// La caméra vole, plonge vers la planète touchée ; les étiquettes sont de vrais boutons HTML (clavier, lecteur d'écran). Three.js (licence MIT) est dans vendor/.
import * as T from "./vendor/three.module.min.js?v=5b2cd7bf62";

const alea = graine => { let s = graine >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; };
const bornes = (x, a, b) => Math.max(a, Math.min(b, x));
const RAD = Math.PI / 180, mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const palette = (stops, t) => { t = bornes(t, 0, 1); for (let i = 1; i < stops.length; i++) if (t <= stops[i][0]) return mixc(stops[i - 1][1], stops[i][1], (t - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0] || 1)); return stops[stops.length - 1][1]; };

// ---------- un bruit 3D (valeur, interpolé) : les textures se recollent sans couture autour de la sphère ----------
function bruit(graine) {
  const r = alea(graine), P = new Uint8Array(512); for (let i = 0; i < 256; i++) P[i] = i; for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [P[i], P[j]] = [P[j], P[i]]; } for (let i = 0; i < 256; i++) P[i + 256] = P[i];
  const h = (x, y, z) => P[P[P[x & 255] + (y & 255)] + (z & 255)] / 255, l = (a, b, t) => a + (b - a) * (t * t * (3 - 2 * t));
  const n = (x, y, z) => { const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), fx = x - ix, fy = y - iy, fz = z - iz;
    return l(l(l(h(ix, iy, iz), h(ix + 1, iy, iz), fx), l(h(ix, iy + 1, iz), h(ix + 1, iy + 1, iz), fx), fy), l(l(h(ix, iy, iz + 1), h(ix + 1, iy, iz + 1), fx), l(h(ix, iy + 1, iz + 1), h(ix + 1, iy + 1, iz + 1), fx), fy), fz); };
  return { n, f: (x, y, z, oct = 4) => { let s = 0, a = .5, f = 1, t = 0; for (let i = 0; i < oct; i++) { s += a * n(x * f, y * f, z * f); t += a; a *= .5; f *= 2.03; } return s / t; } };
}
// Un peintre de sphère : fn(x, y, z, lat, lon) -> [r, g, b, hauteur] ; rend la carte de couleur et la carte de relief.
function peindre(W, H, fn) {
  const cv = document.createElement("canvas"), bv = document.createElement("canvas"); cv.width = bv.width = W; cv.height = bv.height = H; const g = cv.getContext("2d"), gb = bv.getContext("2d"), im = g.createImageData(W, H), ib = gb.createImageData(W, H);
  for (let y = 0; y < H; y++) { const lat = (.5 - (y + .5) / H) * Math.PI, cl = Math.cos(lat), sl = Math.sin(lat);
    for (let x = 0; x < W; x++) { const lon = (x + .5) / W * Math.PI * 2, c = fn(cl * Math.cos(lon), sl, cl * Math.sin(lon), lat, lon), i = (y * W + x) * 4; im.data[i] = c[0]; im.data[i + 1] = c[1]; im.data[i + 2] = c[2]; im.data[i + 3] = 255; ib.data[i] = ib.data[i + 1] = ib.data[i + 2] = bornes(c[3] * 255, 0, 255); ib.data[i + 3] = 255; } }
  g.putImageData(im, 0, 0); gb.putImageData(ib, 0, 0); return { cv, bv, g, gb };
}
// Des cratères (anneau clair, creux sombre) posés sur la carte de couleur et de relief.
function crateres(p, n, graine, rmin, rmax, noir = .35) {
  const r = alea(graine), W = p.cv.width, H = p.cv.height;
  for (let i = 0; i < n; i++) { const x = r() * W, y = H * (.1 + r() * .8), R = rmin + Math.pow(r(), 2.2) * (rmax - rmin), larg = Math.min(3, 1 / Math.max(.3, Math.cos((y / H - .5) * Math.PI)));
    for (const dx of [0, -W, W]) { const X = x + dx, gr = p.g.createRadialGradient(X, y, R * .2, X, y, R * 1.15); gr.addColorStop(0, `rgba(20,16,14,${noir})`); gr.addColorStop(.75, `rgba(20,16,14,${noir * .35})`); gr.addColorStop(.88, "rgba(255,245,225,.32)"); gr.addColorStop(1, "rgba(255,245,225,0)");
      p.g.save(); p.g.translate(X, y); p.g.scale(larg, 1); p.g.translate(-X, -y); p.g.fillStyle = gr; p.g.beginPath(); p.g.arc(X, y, R * 1.15, 0, 7); p.g.fill(); p.g.restore();
      const gh = p.gb.createRadialGradient(X, y, R * .1, X, y, R * 1.1); gh.addColorStop(0, "rgba(20,20,20,.9)"); gh.addColorStop(.8, "rgba(120,120,120,.5)"); gh.addColorStop(.9, "rgba(255,255,255,.9)"); gh.addColorStop(1, "rgba(128,128,128,0)"); p.gb.fillStyle = gh; p.gb.beginPath(); p.gb.arc(X, y, R * 1.1, 0, 7); p.gb.fill(); } }
}
const diffLon = (a, b) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };

// ---------- la peinture de chaque corps ----------
const PEINTURE = {
  mercure: (W, H) => { const N = bruit(11); const p = peindre(W, H, (x, y, z) => { const a = N.f(x * 3, y * 3, z * 3, 5), b = N.f(x * 12, y * 12, z * 12, 3), t = .45 * a + .3 * b + .25, c = mixc([96, 90, 86], [168, 160, 150], t); return [c[0], c[1], c[2], .35 + .5 * a]; }); crateres(p, 220, 5, 3, 26); return p; },
  venus: (W, H) => { const N = bruit(23); return peindre(W, H, (x, y, z, lat) => { const w = N.f(x * 2 + 5, y * 3, z * 2, 3) * 1.6, t = N.f(x * 2.5 + w, y * 3.5 + w * .6, z * 2.5 - w, 5), band = .5 + .5 * Math.sin(lat * 9 + w * 2), c = mixc(mixc([214, 168, 92], [244, 224, 160], t), [238, 196, 120], band * .35); return [c[0], c[1], c[2], .5 + .2 * t]; }); },
  mars: (W, H) => { const N = bruit(31); const p = peindre(W, H, (x, y, z, lat) => { const a = N.f(x * 2.2, y * 2.2, z * 2.2, 5), b = N.f(x * 7, y * 7, z * 7, 3), mer = a > .55 ? (a - .55) * 3 : 0;
      let c = mixc(mixc([188, 98, 52], [226, 150, 92], b), [96, 52, 36], bornes(mer * 1.4, 0, 1)); const pol = Math.abs(lat) - 1.28; if (pol > 0 || (Math.abs(lat) > 1.15 && b > .62)) c = mixc(c, [244, 244, 246], bornes(pol * 14 + .5, 0, 1)); return [c[0], c[1], c[2], .4 + .45 * a]; });
    p.g.strokeStyle = "rgba(70,34,24,.55)"; p.g.lineWidth = 3; p.g.beginPath(); p.g.moveTo(W * .2, H * .54); p.g.bezierCurveTo(W * .24, H * .55, W * .28, H * .53, W * .33, H * .56); p.g.stroke(); crateres(p, 60, 8, 3, 18, .25); return p; },
  jupiter: (W, H) => { const N = bruit(41), B = [[0, [236, 222, 190]], [.22, [204, 150, 104]], [.4, [244, 232, 205]], [.58, [168, 112, 78]], [.78, [232, 206, 168]], [1, [196, 138, 96]]];
    return peindre(W, H, (x, y, z, lat, lon) => { const w = N.f(x * 1.4, y * 6, z * 1.4, 3) * .09, yy = y + w, s = .5 + .5 * Math.sin(yy * 21) * .55 + .5 * .35 * Math.sin(yy * 47 + 1.3), tur = N.f(x * 7, y * 38, z * 7, 4);
      let c = palette(B, bornes(s + (tur - .5) * .5, 0, 1)); const d = Math.hypot(diffLon(lon, 1.1) * Math.cos(lat) / .3, (lat + .39) / .12); if (d < 1.55) { const k = bornes(1.55 - d, 0, 1), sw = N.f(x * 14, y * 14, z * 14, 3); c = mixc(c, d < .9 ? mixc([186, 66, 40], [224, 120, 78], sw) : [150, 96, 66], bornes(k * 1.3, 0, 1)); }
      return [c[0], c[1], c[2], .5 + .3 * tur]; }); },
  saturne: (W, H) => { const N = bruit(53), B = [[0, [238, 214, 160]], [.3, [214, 182, 122]], [.55, [240, 224, 178]], [.8, [206, 170, 112]], [1, [232, 208, 154]]];
    return peindre(W, H, (x, y, z) => { const s = .5 + .5 * Math.sin(y * 17 + N.f(x * 2, y * 8, z * 2, 3) * 2.2), c = palette(B, bornes(s + (N.f(x * 6, y * 26, z * 6, 3) - .5) * .25, 0, 1)); return [c[0], c[1], c[2], .5]; }); },
  uranus: (W, H) => { const N = bruit(61); return peindre(W, H, (x, y, z, lat) => { const s = .5 + .5 * Math.sin(lat * 13 + N.f(x * 2, y * 5, z * 2, 2)), c = mixc([158, 224, 230], [196, 240, 242], s * .5 + N.f(x * 4, y * 9, z * 4, 3) * .35), pol = Math.max(0, Math.abs(lat) - 1.2); return [c[0] * (1 - pol * .5), c[1] * (1 - pol * .35), c[2] * (1 - pol * .25), .5]; }); },
  neptune: (W, H) => { const N = bruit(71); return peindre(W, H, (x, y, z, lat, lon) => { const s = .5 + .5 * Math.sin(lat * 15 + N.f(x * 2, y * 6, z * 2, 3) * 2), base = mixc([38, 78, 214], [70, 124, 236], s * .6 + N.f(x * 5, y * 14, z * 5, 3) * .35), cirr = N.f(x * 5, y * 30, z * 5, 4); let c = cirr > .66 ? mixc(base, [236, 242, 255], (cirr - .66) * 4) : base;
      const d = Math.hypot(diffLon(lon, 2.2) * Math.cos(lat) / .3, (lat + .35) / .13); if (d < 1) c = mixc(c, [18, 36, 120], .8 * (1 - d)); return [c[0], c[1], c[2], .5]; }); },
  pluton: (W, H) => { const N = bruit(83); const p = peindre(W, H, (x, y, z, lat, lon) => { const a = N.f(x * 3, y * 3, z * 3, 5), c0 = mixc([112, 76, 56], [204, 172, 140], a),
      d1 = Math.hypot(diffLon(lon, 3.2) * Math.cos(lat) / .5, (lat - .1) / .34), d2 = Math.hypot(diffLon(lon, 3.9) * Math.cos(lat) / .46, (lat - .22) / .3), d3 = Math.hypot(diffLon(lon, 3.55) * Math.cos(lat) / .5, (lat + .12) / .3), coeur = Math.min(d1, d2, d3) < 1;  // le cœur de Tombaugh
      const c = coeur ? mixc(c0, [244, 232, 214], .85) : c0; return [c[0], c[1], c[2], .45 + .3 * a]; }); crateres(p, 40, 14, 3, 14, .22); return p; },
  ceres: (W, H) => { const N = bruit(91); const p = peindre(W, H, (x, y, z) => { const a = N.f(x * 3, y * 3, z * 3, 5), c = mixc([84, 80, 76], [140, 134, 126], a); return [c[0], c[1], c[2], .4 + .4 * a]; }); crateres(p, 160, 17, 3, 22); p.g.fillStyle = "rgba(255,255,250,.95)"; p.g.beginPath(); p.g.arc(W * .32, H * .5, 6, 0, 7); p.g.fill(); p.g.beginPath(); p.g.arc(W * .325, H * .52, 3, 0, 7); p.g.fill(); return p; },
  eris: (W, H) => { const N = bruit(97); return peindre(W, H, (x, y, z) => { const a = N.f(x * 4, y * 4, z * 4, 4), c = mixc([206, 208, 214], [244, 244, 248], a); return [c[0], c[1], c[2], .5 + .2 * a]; }); },
  makemake: (W, H) => { const N = bruit(101); const p = peindre(W, H, (x, y, z) => { const a = N.f(x * 3, y * 3, z * 3, 5), b = N.f(x * 9, y * 9, z * 9, 3), c = mixc(mixc([150, 84, 58], [196, 128, 92], a), [234, 226, 214], b > .66 ? (b - .66) * 3 : 0); return [c[0], c[1], c[2], .45 + .3 * a]; }); crateres(p, 30, 19, 3, 12, .2); return p; },
  haumea: (W, H) => { const N = bruit(107); return peindre(W, H, (x, y, z, lat, lon) => { const a = N.f(x * 4, y * 4, z * 4, 4), c0 = mixc([214, 216, 222], [244, 246, 250], a), d = Math.hypot(diffLon(lon, 2.6) * Math.cos(lat) / .4, (lat - .1) / .28), c = d < 1 ? mixc(c0, [150, 70, 58], .8 * (1 - d)) : c0; return [c[0], c[1], c[2], .5]; }); },
  lune: (W, H) => { const N = bruit(113); const p = peindre(W, H, (x, y, z) => { const a = N.f(x * 3, y * 3, z * 3, 5), c = mixc([92, 90, 88], [190, 188, 184], a); return [c[0], c[1], c[2], .4 + .4 * a]; }); crateres(p, 90, 29, 2, 16); return p; },
};
// La Terre : les vrais continents (terres.json) colorés par la latitude et le bruit, les océans, les glaces, les lumières de la nuit ; les nuages à part.
async function peindreTerre(W, H) {
  let anneaux = []; try { anneaux = await (await fetch(new URL("terres.json", import.meta.url))).json(); } catch (_) {}
  const m = document.createElement("canvas"); m.width = W; m.height = H; const gm = m.getContext("2d"); gm.fillStyle = "#000"; gm.fillRect(0, 0, W, H); gm.fillStyle = "#fff"; const xy = ([lo, la]) => [(lo + 180) / 360 * W, (90 - la) / 180 * H];  // terres.json : une liste d'anneaux [longitude, latitude]
  for (const an of anneaux) { gm.beginPath(); an.forEach((q, i) => { const [x, y] = xy(q); i ? gm.lineTo(x, y) : gm.moveTo(x, y); }); gm.closePath(); gm.fill(); }
  const masque = gm.getImageData(0, 0, W, H).data, N = bruit(5), lum = document.createElement("canvas"); lum.width = W; lum.height = H; const gl = lum.getContext("2d"), r = alea(3);
  const p = peindre(W, H, (x, y, z, lat) => { const px = Math.floor(((Math.atan2(z, x) + 2 * Math.PI) % (2 * Math.PI)) / (2 * Math.PI) * W), py = Math.min(H - 1, Math.floor((.5 - lat / Math.PI) * H)), terre = masque[(py * W + px % W) * 4] > 128, n = N.f(x * 4, y * 4, z * 4, 5), al = Math.abs(lat) / (Math.PI / 2);
    if (!terre) { const prof = N.f(x * 2, y * 2, z * 2, 3), c = mixc([14, 42, 112], [30, 98, 190], prof * .8 + .15); return al > .88 ? [236, 242, 248, .3] : [c[0], c[1], c[2], .3]; }
    const sec = Math.exp(-Math.pow((al - .3) / .12, 2)) * .9 + (n > .6 ? .3 : 0), c = mixc(mixc([52, 118, 52], [108, 140, 62], n), [200, 172, 112], bornes(sec, 0, 1)), mont = n > .66 ? mixc(c, [150, 140, 130], bornes((n - .66) * 6, 0, 1)) : c; return al > .85 ? [238, 242, 246, .6] : [mont[0], mont[1], mont[2], .35 + .6 * n]; });
  for (let i = 0; i < 2600; i++) { const x = Math.floor(r() * W), y = Math.floor(H * (.18 + r() * .55)); if (masque[(y * W + x) * 4] > 128) { gl.fillStyle = `rgba(255,${190 + Math.floor(r() * 50)},110,${.5 + r() * .5})`; gl.fillRect(x, y, 1 + (r() > .8 ? 1 : 0), 1); } }
  p.lumieres = lum; return p;
}
function peindreNuages(W, H) { const N = bruit(131), p = peindre(W, H, (x, y, z) => { const w = N.f(x * 2, y * 2, z * 2, 3) * 1.2, t = N.f(x * 3 + w, y * 4, z * 3 - w, 5); return [255, 255, 255, bornes((t - .46) * 3.2, 0, 1)]; });
  const g = p.cv.getContext("2d"), im = g.getImageData(0, 0, W, H), bi = p.bv.getContext("2d").getImageData(0, 0, W, H); for (let i = 0; i < im.data.length; i += 4) im.data[i + 3] = bi.data[i]; g.putImageData(im, 0, 0); return p.cv; }
// Les anneaux de Saturne : C, B (le plus clair), division de Cassini, A, division d'Encke ; ceux d'Uranus et de Hauméa sont fins et sombres.
function textureAnneaux(sat) { const W = 1024, cv = document.createElement("canvas"); cv.width = W; cv.height = 4; const g = cv.getContext("2d"), r = alea(9);
  const bande = (a, b, col, al) => { g.fillStyle = `rgba(${col},${al})`; g.fillRect(a * W, 0, (b - a) * W, 4); };
  if (sat) { bande(0, .1, "150,130,100", .18); bande(.1, .3, "170,150,118", .5); bande(.3, .62, "236,220,184", .92); bande(.62, .67, "120,104,80", .06); bande(.67, .93, "214,196,160", .72); bande(.8, .81, "120,104,80", .1); bande(.94, 1, "200,184,150", .15); for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(${r() > .5 ? "255,246,220" : "90,76,58"},${.05 + r() * .12})`; g.fillRect(r() * W, 0, 1 + r() * 4, 4); } }
  else { bande(.2, .24, "170,176,184", .5); bande(.5, .54, "150,156,168", .35); bande(.8, .84, "190,196,204", .55); }
  const t = new T.CanvasTexture(cv); t.colorSpace = T.SRGBColorSpace; return t; }

// ---------- les corps : rayon, axe, rotation, orbite (inclinaison et excentricité d'après les vraies), lunes, atmosphère ----------
// r : rayon à l'écran (les tailles relatives sont gardées, comprimées) ; tilt : inclinaison de l'axe (degrés) ; per : durée relative de rotation ; ua : distance réelle (sert à la vitesse)
const CORPS = {
  mercure: { r: .34, tilt: 2, per: 6, inc: 12, e: .2, peri: 29, node: 48, ua: .39, atmo: null, lunes: [] },
  venus: { r: .55, tilt: 177, per: 12, inc: 4, e: .02, peri: 55, node: 76, ua: .72, atmo: [0xf2d58a, 1.1], lunes: [] },
  atlas: { r: .66, tilt: 23, per: 1, inc: 3, e: .04, peri: 102, node: 0, ua: 1, atmo: [0x5aa6ff, 1.6], lunes: [{ r: 1.5, t: .27, v: .9, inc: 5, c: 0xdddddd }] },
  mars: { r: .42, tilt: 25, per: 1.03, inc: 5, e: .09, peri: 286, node: 49, ua: 1.52, atmo: [0xd98a5a, .5], lunes: [{ r: 1.4, t: .1, v: 1.8, inc: 2, c: 0x9a8f86 }, { r: 1.8, t: .08, v: 1.1, inc: 8, c: 0xa89c92 }] },
  ceres: { r: .26, tilt: 4, per: .4, inc: 11, e: .08, peri: 73, node: 80, ua: 2.77, atmo: null, lunes: [] },
  jupiter: { r: 1.25, tilt: 3, per: .41, inc: 3, e: .05, peri: 274, node: 100, ua: 5.2, atmo: [0xe7c8a0, .45], lunes: [{ r: 1.35, t: .09, v: 1.6, inc: 3, c: 0xe8c64a }, { r: 1.5, t: .085, v: 1.15, inc: 4, c: 0xd9cdb8 }, { r: 1.7, t: .12, v: .85, inc: 2, c: 0x9a8d7d }, { r: 1.95, t: .11, v: .6, inc: 6, c: 0x5d5148 }] },
  saturne: { r: 1.0, tilt: 27, per: .45, inc: 5, e: .06, peri: 339, node: 113, ua: 9.58, atmo: [0xf0dc9a, .4], anneaux: [1.35, 2.35, 1], lunes: [{ r: 2.7, t: .14, v: .7, inc: 12, c: 0xd9a05a }] },
  uranus: { r: .74, tilt: 98, per: .72, inc: 2, e: .05, peri: 96, node: 74, ua: 19.2, atmo: [0x9fe8ee, .8], anneaux: [1.5, 1.8, 0], lunes: [{ r: 2, t: .1, v: .7, inc: 3, c: 0xb8bcc2 }] },
  neptune: { r: .72, tilt: 28, per: .67, inc: 4, e: .01, peri: 273, node: 132, ua: 30.1, atmo: [0x3c6cf0, 1], lunes: [{ r: 2, t: .13, v: -.8, inc: 25, c: 0xe3d4c8 }] },
  pluton: { r: .3, tilt: 120, per: 6, inc: 22, e: .18, peri: 113, node: 110, ua: 39.5, atmo: [0x9cb4ff, .35], lunes: [{ r: 1.9, t: .45, v: 1.2, inc: 0, c: 0x9a948c }] },
  haumea: { r: .3, tilt: 20, per: .17, inc: 26, e: .15, peri: 239, node: 122, ua: 43, atmo: null, elong: [1.5, 1, .75], anneaux: [1.5, 1.75, 0], lunes: [{ r: 2.1, t: .2, v: 1.4, inc: 4, c: 0xdcdce0 }] },
  makemake: { r: .27, tilt: 29, per: .9, inc: 29, e: .16, peri: 296, node: 79, ua: 45.8, atmo: null, lunes: [] },
  eris: { r: .3, tilt: 78, per: 1.1, inc: 40, e: .17, peri: 151, node: 36, ua: 68, atmo: null, lunes: [{ r: 1.8, t: .2, v: .8, inc: 10, c: 0x706c68 }] },
};
const BASE = { mercure: 0x8a8580, venus: 0xe6c88a, atlas: 0x2f6fd0, mars: 0xb86a3a, ceres: 0x7a7772, jupiter: 0xcfa57a, saturne: 0xe0c690, uranus: 0x9fe0e6, neptune: 0x3f6ae0, pluton: 0xb59a80, haumea: 0xe2e4ea, makemake: 0xb4784f, eris: 0xd8dae0 };
// Quel contenu du site est quel corps (treize contenus, treize corps)
const ATTRIBUTION = { atlas: "atlas", cours: "jupiter", oeuvres: "saturne", quiz: "mars", rythme: "mercure", ecoute: "venus", instruments: "uranus", theorie: "neptune", creation: "pluton", timbre: "ceres", labo: "eris", harmonie: "makemake", orchestre: "haumea" };
const ORDRE = ["mercure", "venus", "atlas", "mars", "ceres", "jupiter", "saturne", "uranus", "neptune", "pluton", "haumea", "makemake", "eris"];  // l'ordre réel de distance au soleil

const lueur = (couleur, taille, force = .9) => { const cv = document.createElement("canvas"); cv.width = cv.height = 128; const g = cv.getContext("2d"), r = g.createRadialGradient(64, 64, 2, 64, 64, 64), c = new T.Color(couleur);
  const rgb = `${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)}`; r.addColorStop(0, `rgba(${rgb},${force})`); r.addColorStop(.35, `rgba(${rgb},${force * .3})`); r.addColorStop(1, `rgba(${rgb},0)`); g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  const s = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(cv), transparent: true, blending: T.AdditiveBlending, depthWrite: false })); s.scale.set(taille, taille, 1); return s; };
// L'atmosphère : une coque dont l'éclat monte vers le bord (Fresnel).
const atmosphere = (couleur, rayon, force) => new T.Mesh(new T.SphereGeometry(rayon, 48, 32), new T.ShaderMaterial({ uniforms: { c: { value: new T.Color(couleur) }, k: { value: force } }, transparent: true, depthWrite: false, blending: T.AdditiveBlending,
  vertexShader: "varying vec3 N; varying vec3 V; void main(){ N = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); V = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }",
  fragmentShader: "uniform vec3 c; uniform float k; varying vec3 N; varying vec3 V; void main(){ float f = pow(1.0 - max(dot(N, V), 0.0), 2.6); gl_FragColor = vec4(c, f * k); }" }));
const tex = (cv, couleur = true) => { const t = new T.CanvasTexture(cv); if (couleur) t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; return t; };
const attendre = () => new Promise(ok => setTimeout(ok, 16));

export function monterGalaxie(canvas, conteneur, donnees, { onChoix = () => {}, onRetour = () => {} } = {}) {
  let rendu; try { rendu = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" }); } catch (_) { return null; }
  const reduit = matchMedia("(prefers-reduced-motion: reduce)").matches, scene = new T.Scene(), cam = new T.PerspectiveCamera(52, 1, .1, 500), monde = new T.Group(); scene.add(monde);
  rendu.outputColorSpace = T.SRGBColorSpace; rendu.setClearColor(0x000000, 0); rendu.toneMapping = T.ACESFilmicToneMapping; rendu.toneMappingExposure = 1.05; scene.fog = new T.FogExp2(0x03060a, .005);
  scene.add(new T.AmbientLight(0x6f7c96, 1.05)); scene.add(new T.HemisphereLight(0xa8c0ff, 0x2a1a10, .45));

  // ---------- le soleil : éteint, braise, flamboyant selon l'éclat du jour ----------
  const niv = donnees.soleil.niveau, rs = 1.2 + .04 * niv, soleil = new T.Group(); let eclat = bornes(donnees.soleil.eclat || 0, 0, 1);
  const NS = bruit(7), gran = peindre(512, 256, (x, y, z) => { const a = NS.f(x * 5, y * 5, z * 5, 5), b = NS.f(x * 14, y * 14, z * 14, 3), tache = NS.f(x * 2.2 + 9, y * 2.2, z * 2.2, 3) > .72 ? .55 : 1, c = mixc([255, 168, 40], [255, 236, 150], a * .7 + b * .3); return [c[0] * tache, c[1] * tache, c[2] * tache, a]; });
  const matSol = new T.MeshBasicMaterial({ map: tex(gran.cv), toneMapped: false }), coeur = new T.Mesh(new T.SphereGeometry(rs, 64, 48), matSol); soleil.add(coeur);
  const matPeau = new T.MeshBasicMaterial({ map: tex(gran.cv), transparent: true, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }), peau = new T.Mesh(new T.SphereGeometry(rs * 1.03, 64, 48), matPeau); soleil.add(peau);
  const couronne = atmosphere(0xffb53a, rs * 1.3, 1.6); soleil.add(couronne); monde.add(soleil);
  const halos = [lueur(0xffd23f, rs * 7), lueur(0xff9a1f, rs * 12, .5), lueur(0xff7a2a, rs * 19, .2)]; halos.forEach(h => monde.add(h));
  const rayons = new T.Group(); for (let i = 0; i < 14; i++) { const m = new T.Mesh(new T.PlaneGeometry(rs * (.14 + (i % 3) * .06), rs * (6 + (i % 4) * 1.5)), new T.MeshBasicMaterial({ color: 0xffd34a, transparent: true, opacity: .1, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide })); m.rotation.z = i / 14 * Math.PI * 2; rayons.add(m); } monde.add(rayons);
  const lumiere = new T.PointLight(0xfff0d0, 10, 0, 1); monde.add(lumiere);
  const sombre = [34, 22, 18], braise = [140, 42, 12], feu = [255, 150, 30], jaune = [255, 214, 80], blanc = [255, 246, 200];
  function regler(e) { eclat = bornes(e, 0, 1); const c = palette([[0, sombre], [.3, braise], [.6, feu], [.85, jaune], [1, blanc]], eclat);
    matSol.color.setRGB(c[0] / 255, c[1] / 255, c[2] / 255); matPeau.color.setRGB(c[0] / 255, c[1] / 255, c[2] / 255); matPeau.opacity = .15 + .6 * eclat; couronne.material.uniforms.k.value = .05 + 2.1 * eclat;
    halos.forEach((h, i) => { h.userData.base = .04 + [.9, .55, .25][i] * eclat * eclat; h.material.opacity = h.userData.base; }); rayons.children.forEach((m, i) => { m.material.opacity = .012 + (.09 + (i % 3) * .02) * eclat * eclat; });
    lumiere.intensity = 5 + 16 * eclat; }
  regler(eclat);

  // ---------- le fond : étoiles en trois couches, nébuleuses, ceinture d'astéroïdes, ceinture de Kuiper ----------
  const rond = (() => { const c = document.createElement("canvas"); c.width = c.height = 32; const g = c.getContext("2d"), r = g.createRadialGradient(16, 16, 1, 16, 16, 15); r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(0, 0, 32, 32); return new T.CanvasTexture(c); })();
  const couchesEtoiles = [[900, 160, .5], [600, 100, .8], [300, 60, 1.3]].map(([n, rr, taille], k) => { const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), r = alea(5 + k * 17);
    for (let i = 0; i < n; i++) { const u = r() * 2 - 1, a = r() * 6.283, d = rr * (.8 + r() * .4), s = Math.sqrt(1 - u * u); pos.set([d * s * Math.cos(a), d * u, d * s * Math.sin(a)], i * 3); const q = .55 + r() * .45, w = r(); col.set([q * (.8 + .2 * w), q, q * (.9 + .1 * (1 - w))], i * 3); }
    const g = new T.BufferGeometry(); g.setAttribute("position", new T.BufferAttribute(pos, 3)); g.setAttribute("color", new T.BufferAttribute(col, 3));
    const e = new T.Points(g, new T.PointsMaterial({ size: taille * 1.6, map: rond, vertexColors: true, transparent: true, opacity: .95, depthWrite: false, blending: T.AdditiveBlending, fog: false })); scene.add(e); return e; });
  [[0x3a5bd9, -90, 24, -120, 120], [0xc23fd0, 100, -26, -140, 140], [0x1fb98a, -30, 50, -170, 150], [0xff7a3a, 60, 34, -125, 90]].forEach(([c, x, y, z, s]) => { const n = lueur(c, s, .26); n.position.set(x, y, z); n.material.fog = false; scene.add(n); });

  // ---------- les orbites : une par corps, chacune dans son plan incliné, elliptique, le soleil au foyer ----------
  const liste = donnees.planetes.map(d => ({ d, corps: ATTRIBUTION[d.id] || "mercure" })).sort((a, b) => ORDRE.indexOf(a.corps) - ORDRE.indexOf(b.corps)), P = [], hits = [];
  const demiAxe = i => 4 + i * 1.3, ecc = k => Math.min(.17, CORPS[k].e * .8), aph = Math.max(...liste.map((x, i) => demiAxe(i) * (1 + ecc(x.corps))));
  const ceinture = (a, largeur, n, taille, couleur, graine, haut) => { const g = new T.IcosahedronGeometry(taille, 0), im = new T.InstancedMesh(g, new T.MeshStandardMaterial({ color: couleur, roughness: .95 }), n), r = alea(graine), o = new T.Object3D();
    for (let i = 0; i < n; i++) { const an = r() * 6.283, rr = a + (r() - .5) * largeur; o.position.set(Math.cos(an) * rr, (r() - .5) * haut, Math.sin(an) * rr); o.rotation.set(r() * 6, r() * 6, 0); o.scale.setScalar(.5 + r() * 1.5); o.updateMatrix(); im.setMatrixAt(i, o.matrix); } const gr = new T.Group(); gr.add(im); monde.add(gr); return gr; };
  const iCeres = liste.findIndex(x => x.corps === "ceres"), belt = iCeres >= 0 ? ceinture(demiAxe(iCeres), .9, 380, .06, 0x8a8f99, 41, .3) : null, kuiper = ceinture(aph + 1.2, 1.6, 300, .05, 0x7e8ea8, 43, .8);

  liste.forEach(({ d, corps }, i) => {
    const K = CORPS[corps], a = demiAxe(i), e = ecc(corps), b = a * Math.sqrt(1 - e * e), c0 = new T.Color(d.couleur), estTerre = corps === "atlas";
    // les plans d'orbite : nœud, inclinaison, périhélie
    const noeud = new T.Group(); noeud.rotation.y = K.node * RAD; const incl = new T.Group(); incl.rotation.x = Math.min(24, K.inc * 1.6) * RAD; noeud.add(incl); const peri = new T.Group(); peri.rotation.y = K.peri * RAD * .5; incl.add(peri); monde.add(noeud);
    const pt = E => new T.Vector3(a * (Math.cos(E) - e), 0, b * Math.sin(E));
    peri.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(Array.from({ length: 220 }, (_, k) => pt(k / 220 * Math.PI * 2)), true), 440, .013, 4, true), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .13, depthWrite: false })));
    if (d.progres > 0) { const n = Math.max(6, Math.round(d.progres * 220)); peri.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(Array.from({ length: n + 1 }, (_, k) => pt(k / 220 * Math.PI * 2))), n * 2, .028, 5, false), new T.MeshBasicMaterial({ color: c0, transparent: true, opacity: .9, blending: T.AdditiveBlending, depthWrite: false }))); }
    // le corps
    const grp = new T.Group(), rayon = K.r * (estTerre ? 1.6 : 1.45), tilt = new T.Group(); tilt.rotation.z = K.tilt * RAD; grp.add(tilt);
    const mat = new T.MeshStandardMaterial({ color: BASE[corps] || 0xaaaaaa, roughness: estTerre ? .62 : .88, metalness: 0, bumpScale: estTerre ? 1.1 : 2.2 }), corpsMesh = new T.Mesh(new T.SphereGeometry(rayon, 64, 48), mat); if (K.elong) corpsMesh.scale.set(...K.elong); tilt.add(corpsMesh);
    let nuages = null; if (estTerre) { nuages = new T.Mesh(new T.SphereGeometry(rayon * 1.02, 48, 32), new T.MeshStandardMaterial({ transparent: true, opacity: .85, depthWrite: false, roughness: 1 })); tilt.add(nuages); }
    if (K.atmo) tilt.add(atmosphere(K.atmo[0], rayon * 1.13, K.atmo[1]));
    if (K.anneaux) { const [ri, re, sat] = K.anneaux, g = new T.RingGeometry(rayon * ri, rayon * re, 128, 1), uv = g.attributes.uv, pos = g.attributes.position; for (let q = 0; q < uv.count; q++) { const x = pos.getX(q), y = pos.getY(q); uv.setXY(q, (Math.hypot(x, y) / rayon - ri) / (re - ri), .5); }
      const an = new T.Mesh(g, new T.MeshBasicMaterial({ map: textureAnneaux(!!sat), transparent: true, side: T.DoubleSide, depthWrite: false })); an.rotation.x = Math.PI / 2; tilt.add(an); }
    const aura = lueur(d.couleur, rayon * 3.4, .2); aura.material.fog = false; grp.add(aura);
    // les lunes : réelles pour chaque corps
    const lunes = (K.lunes || []).map((m, q) => { const lune = new T.Mesh(new T.SphereGeometry(rayon * m.t, 24, 16), new T.MeshStandardMaterial({ color: m.c || 0xffffff, roughness: .95, bumpScale: 1.5 })); grp.add(lune); return { lune, m, a: q * 2.1, mat: lune.material }; });
    const toucher = new T.Mesh(new T.SphereGeometry(Math.max(rayon * 2.4, .8), 12, 8), new T.MeshBasicMaterial({ visible: false })); toucher.userData.id = d.id; grp.add(toucher); hits.push(toucher);
    peri.add(grp);
    const bouton = document.createElement("button"); bouton.type = "button"; bouton.className = "gal-etiquette" + (estTerre ? " terre" : ""); bouton.dataset.id = d.id; bouton.style.setProperty("--k", d.couleur);
    bouton.innerHTML = `<b></b><span></span>`; bouton.querySelector("b").textContent = d.court || d.nom; bouton.querySelector("span").textContent = Math.round(d.progres * 100) + " %"; bouton.setAttribute("aria-label", `${d.nom}, ${Math.round(d.progres * 100)} pour cent`);
    bouton.onclick = () => choisir(d.id); conteneur.appendChild(bouton);
    const vit = reduit ? 0 : .09 * Math.pow(Math.max(K.ua, .5), -.62);          // plus lent à mesure qu'on s'éloigne (Kepler, adouci)
    P.push({ d, K, corps, grp, corpsMesh, nuages, lunes, mat, a, e, b, M: i * 2.399963 + .6, vit, rayon, bouton, rotation: reduit ? 0 : .5 / Math.max(K.per, .15), aura, estTerre, tilt });
  });

  // ---------- les textures, peintes l'une après l'autre sans bloquer l'écran ----------
  (async () => { let lunePt = null; for (const p of P) { await attendre(); if (fini || !document.body.contains(canvas)) break; try {
      if (p.estTerre) { const te = await peindreTerre(1024, 512); p.mat.map = tex(te.cv); p.mat.bumpMap = tex(te.bv, false); p.mat.emissiveMap = tex(te.lumieres); p.mat.emissive = new T.Color(0xffc070); p.mat.emissiveIntensity = .55; p.mat.color.set(0xffffff); p.mat.needsUpdate = true; p.nuages.material.map = tex(peindreNuages(512, 256)); p.nuages.material.needsUpdate = true; }
      else { const w = p.corps === "jupiter" || p.corps === "saturne" || p.corps === "venus" ? 768 : 512, pt = PEINTURE[p.corps](w, w / 2); p.mat.map = tex(pt.cv); p.mat.bumpMap = tex(pt.bv, false); p.mat.color.set(0xffffff); p.mat.needsUpdate = true; }
      if (p.lunes.length) { lunePt = lunePt || tex(PEINTURE.lune(256, 128).cv); p.lunes.forEach(l => { l.mat.map = lunePt; l.mat.needsUpdate = true; }); }
    } catch (_) {} } })();

  // ---------- la navette : elle vole jusqu'à la planète touchée et se pose sur sa face visible ; elle redécolle quand on en sort ----------
  const _pw = new T.Vector3(), _l = new T.Vector3(), _p0 = new T.Vector3(), _p1 = new T.Vector3(), _o = new T.Object3D();
  const navette = (() => {
    const g = new T.Group(), blanc = new T.MeshStandardMaterial({ color: 0xf1f3f7, roughness: .45, metalness: .1 }), gris = new T.MeshStandardMaterial({ color: 0xcfd5de, roughness: .5, side: T.DoubleSide }), noir = new T.MeshStandardMaterial({ color: 0x23262f, roughness: .6 }),
      vitre = new T.MeshStandardMaterial({ color: 0x4aa8ff, roughness: .15, metalness: .5, emissive: 0x0b3a77, emissiveIntensity: .8 }), rouge = new T.MeshStandardMaterial({ color: 0xff4d3d, roughness: .5 });
    const tri = (pts, mat) => { const geo = new T.BufferGeometry(); geo.setAttribute("position", new T.BufferAttribute(new Float32Array(pts.flat()), 3)); geo.computeVertexNormals(); return new T.Mesh(geo, mat); };
    const fus = new T.Mesh(new T.CylinderGeometry(.075, .095, .9, 14), blanc); fus.rotation.x = Math.PI / 2; g.add(fus);
    const nez = new T.Mesh(new T.ConeGeometry(.075, .34, 14), noir); nez.rotation.x = Math.PI / 2; nez.position.z = .62; g.add(nez);
    const cab = new T.Mesh(new T.SphereGeometry(.06, 12, 8), vitre); cab.scale.set(1, .7, 1.6); cab.position.set(0, .07, .34); g.add(cab);
    g.add(tri([[-.07, 0, .26], [-.62, -.02, -.4], [-.07, 0, -.4]], gris), tri([[.07, 0, .26], [.07, 0, -.4], [.62, -.02, -.4]], gris));
    g.add(tri([[0, .08, -.08], [0, .42, -.44], [0, .08, -.44]], blanc)); const bande = new T.Mesh(new T.BoxGeometry(.012, .05, .3), rouge); bande.position.set(0, .3, -.3); g.add(bande);
    const flammes = []; for (const [x, y] of [[0, .02], [-.05, -.04], [.05, -.04]]) { const mot = new T.Mesh(new T.CylinderGeometry(.03, .04, .12, 8), noir); mot.rotation.x = Math.PI / 2; mot.position.set(x, y, -.5); g.add(mot);
      const fl = new T.Mesh(new T.ConeGeometry(.035, .4, 8), new T.MeshBasicMaterial({ color: 0xffa640, transparent: true, opacity: .9, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false })); fl.rotation.x = -Math.PI / 2; fl.position.set(x, y, -.72); g.add(fl); flammes.push(fl); }
    const halo = lueur(0xffa040, 1.1, .9); halo.position.z = -.8; halo.material.fog = false; g.add(halo);
    const balise = lueur(0xff3a3a, .35, 1); balise.position.set(0, .46, -.44); balise.material.fog = false; g.add(balise);
    g.visible = false; scene.add(g); return { g, flammes, halo, balise };
  })();
  const nav = { etat: "cache", t: 0, dur: 2.8, cible: null, start: new T.Vector3(), n: new T.Vector3(), side: new T.Vector3(), qFin: new T.Quaternion() };
  const doux = x => { x = bornes(x, 0, 1); return x * x * (3 - 2 * x); };
  function navAller(p) {
    if (nav.cible === p && nav.etat !== "cache" && nav.etat !== "decolle") return;
    p.grp.getWorldPosition(_pw); const y = but.yaw, c = but.pitch, R = p.rayon;
    nav.n.set(Math.sin(y) * Math.cos(c), Math.sin(c) + .3, Math.cos(y) * Math.cos(c)).normalize(); nav.side.set(Math.cos(y), 0, -Math.sin(y));
    if (nav.etat === "cache") nav.start.copy(_pw).addScaledVector(nav.n, R * 7).addScaledVector(nav.side, -R * 6).add(_l.set(0, R * 1.5, 0)); else nav.start.copy(navette.g.position);
    const yy = nav.n.clone(), z = nav.side.clone().addScaledVector(yy, -nav.side.dot(yy)).normalize(); nav.qFin.setFromRotationMatrix(new T.Matrix4().makeBasis(new T.Vector3().crossVectors(yy, z), yy, z));
    nav.cible = p; nav.t = reduit ? nav.dur : 0; nav.dur = 2.8; nav.etat = "approche"; navette.g.visible = true;
  }
  function navPartir() { if (nav.etat === "cache" || nav.etat === "decolle") return; nav.start.copy(navette.g.position); nav.t = 0; nav.dur = 1.4; nav.etat = reduit ? "cache" : "decolle"; if (reduit) navette.g.visible = false; }
  function navImage(dt, s) {
    if (nav.etat === "cache") return; const p = nav.cible, g = navette.g; nav.t += dt; p.grp.getWorldPosition(_pw); const R = p.rayon, taille = bornes(R * .5, .3, .75);
    const chemin = (e, sortie) => { sortie.lerpVectors(nav.start, _l.copy(_pw).addScaledVector(nav.n, R * 1.14), e); const arc = Math.sin(Math.PI * e); sortie.addScaledVector(nav.side, arc * R * 2.4 * (1 - e * .3)); sortie.y += arc * R * 1.2; return sortie; };
    if (nav.etat === "approche") {
      const u = bornes(nav.t / nav.dur, 0, 1), e = doux(u); chemin(e, _p0); chemin(Math.min(1, e + .03), _p1); g.position.copy(_p0);
      if (_p1.distanceToSquared(_p0) > 1e-8) { _o.position.copy(_p0); _o.lookAt(_p1); g.quaternion.copy(_o.quaternion).slerp(nav.qFin, doux((e - .7) / .3)); } else g.quaternion.copy(nav.qFin);
      g.scale.setScalar(taille * (1 + 1.4 * (1 - e) * (1 - e))); const vol = u < 1; navette.flammes.forEach((f, i) => { f.visible = vol; f.scale.set(1, 1 + .35 * Math.sin(s * 38 + i * 2), 1); }); navette.halo.visible = vol;
      if (u >= 1) nav.etat = "pose";
    } else if (nav.etat === "pose") {
      g.position.copy(_pw).addScaledVector(nav.n, R * 1.14); g.quaternion.copy(nav.qFin);   // la planète choisie grossit de 10 % : la navette se pose sur sa surface agrandie g.scale.setScalar(taille); navette.flammes.forEach(f => { f.visible = false; }); navette.halo.visible = false;
    } else {   // décollage : elle s'élève, penche le nez vers le large et rapetisse
      const u = bornes(nav.t / nav.dur, 0, 1), e = u * u; _p0.copy(nav.start).addScaledVector(nav.n, R * 7 * e).addScaledVector(nav.side, R * 2.2 * e); g.position.copy(_p0);
      _p1.copy(nav.n).addScaledVector(nav.side, .5 + e).add(_p0); _o.position.copy(_p0); _o.lookAt(_p1); g.quaternion.slerp(_o.quaternion, .15); g.scale.setScalar(taille * (1 - .8 * u));
      navette.flammes.forEach((f, i) => { f.visible = true; f.scale.set(1, 1.3 + .4 * Math.sin(s * 38 + i * 2), 1); }); navette.halo.visible = true;
      if (u >= 1) { nav.etat = "cache"; g.visible = false; }
    }
    navette.balise.material.opacity = .25 + .75 * Math.max(0, Math.sin(s * 5));
  }

  // ---------- la caméra : on vole autour de la cible ----------
  const vu = new T.Vector3(), cibleT = new T.Vector3(); let decal = 0, focus = null, pauseJusqua = 0, raf = 0, glisse = null, depart = null, D0 = 6 + .9 * aph;
  const etat = { yaw: .3, pitch: .62, dist: D0 * 2.4, tx: 0, ty: 0, tz: 0 }, but = { yaw: .3, pitch: .62, dist: D0, tx: 0, ty: 0, tz: 0, zoom: 1 }, para = { x: 0, y: 0 };
  let t0 = performance.now(), dernier = t0; if (reduit) Object.assign(etat, but);
  function taille() { const w = canvas.clientWidth || 320, h = canvas.clientHeight || 320; rendu.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); rendu.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
    D0 = Math.max(6 + .9 * aph, aph * .68 / (Math.tan(26 * RAD) * Math.min(1, cam.aspect))); if (!focus) but.dist = D0 / but.zoom; if (reduit) image(performance.now()); }  // tout le système tient dans l'écran, même en portrait
  taille(); addEventListener("resize", taille); const suivi = typeof ResizeObserver === "function" ? new ResizeObserver(taille) : null; if (suivi) suivi.observe(canvas);
  const pause = () => { pauseJusqua = performance.now() + 2500; };
  function choisir(id) { focus = id; P.forEach(p => p.bouton.setAttribute("aria-pressed", String(p.d.id === id))); const p = P.find(x => x.d.id === id); if (p) { but.dist = p.rayon * 6 + 3; navAller(p); } onChoix(id); if (reduit) image(performance.now()); }
  function retour() { const etait = focus; focus = null; navPartir(); P.forEach(p => p.bouton.setAttribute("aria-pressed", "false")); but.dist = D0 / but.zoom; if (etait) onRetour(); if (reduit) image(performance.now()); }
  const ray = new T.Raycaster(), ptr = new T.Vector2();
  conteneur.parentElement.addEventListener("pointermove", e => { pause(); const r = canvas.getBoundingClientRect(); para.x = ((e.clientX - r.left) / r.width - .5) * 2; para.y = ((e.clientY - r.top) / r.height - .5) * 2; });
  conteneur.parentElement.addEventListener("pointerdown", pause); conteneur.addEventListener("focusin", pause);
  canvas.addEventListener("pointerdown", e => { glisse = { x: e.clientX, y: e.clientY, yaw: but.yaw, pitch: but.pitch }; depart = { x: e.clientX, y: e.clientY, t: performance.now() }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener("pointermove", e => { if (!glisse) return; but.yaw = glisse.yaw - (e.clientX - glisse.x) / 200; but.pitch = bornes(glisse.pitch + (e.clientY - glisse.y) / 260, .08, 1.4); if (reduit) image(performance.now()); });
  canvas.addEventListener("pointerup", e => { const court = depart && Math.hypot(e.clientX - depart.x, e.clientY - depart.y) < 8 && performance.now() - depart.t < 500; glisse = null;
    if (court) { const r = canvas.getBoundingClientRect(); ptr.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ptr, cam); const h = ray.intersectObjects(hits, false)[0]; if (h) choisir(h.object.userData.id); else if (focus) retour(); } });
  canvas.addEventListener("wheel", e => { e.preventDefault(); but.zoom = bornes(but.zoom * (e.deltaY > 0 ? .92 : 1.08), .5, 2.2); if (!focus) but.dist = D0 / but.zoom; if (reduit) image(performance.now()); }, { passive: false });
  addEventListener("deviceorientation", e => { if (e.gamma == null) return; para.x = bornes(e.gamma / 35, -1, 1); para.y = bornes((e.beta - 45) / 35, -1, 1); }, { passive: true });

  function image(tms) {
    const dt = Math.min(.05, (tms - dernier) / 1000); dernier = tms; const s = (tms - t0) / 1000, enPause = tms < pauseJusqua || !!glisse;
    if (!enPause && !reduit && !focus) but.yaw += dt * .03;
    const k = reduit ? 1 : 1 - Math.pow(.0009, dt);
    for (const q of ["yaw", "pitch", "dist", "tx", "ty", "tz"]) etat[q] += (but[q] - etat[q]) * k * (q === "dist" ? .8 : 1);
    const p0 = focus && P.find(x => x.d.id === focus); if (p0) { p0.grp.getWorldPosition(cibleT); but.tx = cibleT.x; but.ty = cibleT.y; but.tz = cibleT.z; } else { but.tx = but.ty = but.tz = 0; }
    const yaw = etat.yaw + para.x * .1, pitch = bornes(etat.pitch + para.y * .06, .05, 1.45), D = etat.dist * (1 + (enPause ? 0 : .012 * Math.sin(s * .5)));
    cam.position.set(etat.tx + Math.sin(yaw) * Math.cos(pitch) * D, etat.ty + Math.sin(pitch) * D + (reduit || enPause ? 0 : Math.sin(s * .4) * .25), etat.tz + Math.cos(yaw) * Math.cos(pitch) * D); cam.lookAt(etat.tx, etat.ty, etat.tz);
    coeur.rotation.y = s * .05; peau.rotation.y = -s * .08; rayons.quaternion.copy(cam.quaternion); rayons.rotateZ(s * .03);
    if (eclat > .05) halos[0].material.opacity = halos[0].userData.base * (.93 + .07 * Math.sin(s * 1.9));
    navImage(dt, s);
    if (belt) belt.rotation.y = s * .012; kuiper.rotation.y = s * .004;
    P.forEach(p => { if (!enPause) p.M += p.vit * dt; let E = p.M; for (let q = 0; q < 4; q++) E = p.M + p.e * Math.sin(E); p.grp.position.set(p.a * (Math.cos(E) - p.e), 0, p.b * Math.sin(E));   // plus vite au plus près du soleil
      p.corpsMesh.rotation.y += dt * p.rotation; if (p.nuages) p.nuages.rotation.y += dt * p.rotation * 1.25;
      const sel = focus === p.d.id; p.grp.scale.setScalar(sel ? 1.1 : 1); p.aura.material.opacity = (.12 + .3 * p.d.progres) * (sel ? 1.8 : 1);
      p.lunes.forEach(l => { l.a += l.m.v * dt * .9; const R = p.rayon * l.m.r * 1.5; l.lune.position.set(Math.cos(l.a) * R, Math.sin(l.a) * R * Math.sin(l.m.inc * RAD), Math.sin(l.a) * R * Math.cos(l.m.inc * RAD)); }); });
    const W2 = canvas.clientWidth, H2 = canvas.clientHeight;
    P.forEach(p => { p.grp.getWorldPosition(vu); const dist = vu.distanceTo(cam.position); vu.y -= p.rayon * 1.7; vu.project(cam); const x = (vu.x * .5 + .5) * W2, y = (-vu.y * .5 + .5) * H2, ech = bornes(D0 * .85 / dist, .72, 1.25);
      p.bouton.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, 0) scale(${ech.toFixed(2)})`; p.bouton.style.opacity = vu.z < 1 ? String(bornes(1.15 - (dist - D0 * .5) / (D0 * 1.3), .35, 1)) : "0"; p.bouton.style.zIndex = String(Math.round(1000 - dist * 10)); });
    decal += ((focus ? H2 * .2 : 0) - decal) * k; if (Math.abs(decal) > .5) cam.setViewOffset(W2, H2, 0, decal, W2, H2); else cam.clearViewOffset();
    couchesEtoiles.forEach((e, q) => { e.rotation.y = s * .002 * (q + 1); }); rendu.render(scene, cam);
  }
  let fini = false;
  function boucle(tm) { raf = 0; if (!document.body.contains(canvas)) return arreter(); if (!document.hidden) image(tm); if (!reduit) raf = requestAnimationFrame(boucle); }
  function arreter() { fini = true; cancelAnimationFrame(raf); removeEventListener("resize", taille); if (suivi) suivi.disconnect(); rendu.dispose(); }
  raf = requestAnimationFrame(boucle); if (reduit) image(performance.now());
  return { choisir, retour, arreter, eclat: v => { regler(v); if (reduit) image(performance.now()); } };
}
