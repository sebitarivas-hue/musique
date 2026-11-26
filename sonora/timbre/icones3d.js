// Des icônes en 3D, vernies comme de la pâte à modeler : une scène, un seul moteur de rendu, une photo par icône (image PNG transparente), gardée pour la session.
// Sert à la page Jouer du site (jeux, chiffres) et à TIMBRE. Three.js (licence MIT) et son éclairage d'ambiance RoomEnvironment sont dans vendor/.
import * as T from "./vendor/three.module.min.js?v=b455aa0d78";
import { RoomEnvironment } from "./vendor/RoomEnvironment.js?v=b455aa0d78";

const VERSION = "ico3d-4";
const vernis = (c, o = {}) => new T.MeshPhysicalMaterial(Object.assign({ color: new T.Color(c), roughness: .36, metalness: 0, clearcoat: 1, clearcoatRoughness: .12, envMapIntensity: .55 }, o));
// Un rectangle aux coins arrondis, extrudé avec un biseau : la brique de base, toute ronde.
function brique(w, h, p, r, c, o) { const s = new T.Shape(), x = -w / 2, y = -h / 2; r = Math.min(r, w / 2, h / 2);
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const g = new T.ExtrudeGeometry(s, { depth: p, bevelEnabled: true, bevelThickness: Math.min(.14, p * .45), bevelSize: Math.min(.12, r * .7), bevelSegments: 6, curveSegments: 10 }); g.center(); return new T.Mesh(g, vernis(c, o)); }
function forme(points, p, c, courbe) { const s = new T.Shape(); points.forEach(([x, y], i) => i ? s.lineTo(x, y) : s.moveTo(x, y)); const g = new T.ExtrudeGeometry(s, { depth: p, bevelEnabled: true, bevelThickness: .14, bevelSize: .1, bevelSegments: 6, curveSegments: 12 }); g.center(); return new T.Mesh(g, vernis(c)); }
const boule = (r, c) => new T.Mesh(new T.SphereGeometry(r, 32, 20), vernis(c));
const etoile = (n, R, r) => Array.from({ length: n * 2 }, (_, i) => { const a = Math.PI / 2 + i * Math.PI / n, k = i % 2 ? r : R; return [Math.cos(a) * k, Math.sin(a) * k]; });

const FABRIQUES = {
  casque(c) { const g = new T.Group(), arc = new T.Mesh(new T.TorusGeometry(1.05, .17, 20, 60, Math.PI), vernis(c)); arc.position.y = .1; g.add(arc);
    for (const x of [-1.05, 1.05]) { const e = brique(.62, 1, .5, .3, c); e.position.set(x, -.25, 0); g.add(e); const m = brique(.42, .72, .2, .2, "#20124d"); m.position.set(x * .86, -.25, .2); g.add(m); }
    [["#35e0ff", .55], ["#ffd23f", .9], ["#ff4d8d", .65]].forEach(([k, h], i) => { const b = brique(.2, h, .2, .1, k); b.position.set((i - 1) * .32, -.3, .1); g.add(b); }); return g; },
  coeur(c) { const s = new T.Shape(); s.moveTo(0, -1); s.bezierCurveTo(-.2, -.75, -1.2, -.2, -1.2, .35); s.bezierCurveTo(-1.2, .95, -.45, 1.15, 0, .6); s.bezierCurveTo(.45, 1.15, 1.2, .95, 1.2, .35); s.bezierCurveTo(1.2, -.2, .2, -.75, 0, -1);
    const g = new T.ExtrudeGeometry(s, { depth: .45, bevelEnabled: true, bevelThickness: .22, bevelSize: .18, bevelSegments: 8, curveSegments: 24 }); g.center(); return new T.Mesh(g, vernis(c)); },
  intrus(c) { const g = new T.Group(); const a = boule(.5, c), b = boule(.5, c), k = brique(.85, .85, .6, .22, "#ffd23f"); a.position.set(-.95, -.3, 0); b.position.set(0, -.3, 0); k.position.set(1.05, .45, .1); k.rotation.set(.3, -.4, .35); g.add(a, b, k); return g; },
  hautbas(c) { const g = new T.Group(), fl = [[0, 1], [.75, .15], [.28, .15], [.28, -1], [-.28, -1], [-.28, .15], [-.75, .15]], h = forme(fl, .35, "#35e0ff"), b = forme(fl, .35, "#9b6bff"); h.position.set(-.6, .2, 0); b.rotation.z = Math.PI; b.position.set(.6, -.2, 0); g.add(h, b); return g; },
  memoire() { const g = new T.Group(); [["#35e0ff", -1, 1], ["#ff4d8d", 1, 1], ["#b8f400", -1, -1], ["#ff8a00", 1, -1]].forEach(([k, x, y]) => { const b = brique(.92, .92, .45, .28, k); b.position.set(x * .52, y * .52, 0); g.add(b); }); return g; },
  paires(c) { const g = new T.Group(), a = brique(1.2, 1.6, .18, .2, "#ffffff"), b = brique(1.2, 1.6, .18, .2, c); a.position.set(-.38, 0, -.1); a.rotation.z = .22; b.position.set(.42, -.05, .15); b.rotation.z = -.18; const q = boule(.2, "#ffffff"); q.position.set(.44, -.05, .35); g.add(a, b, q); return g; },
  eclair(c) { return forme([[.25, 1.2], [-.65, -.1], [-.05, -.1], [-.3, -1.2], [.7, .2], [.08, .2], [.25, 1.2]], .4, c); },
  barres(c) { const g = new T.Group(); [.7, 1.25, 1.8].forEach((h, i) => { const b = brique(.55, h, .5, .22, c); b.position.set((i - 1) * .72, h / 2 - .9, 0); g.add(b); }); return g; },
  etoile(c) { return forme(etoile(5, 1.15, .5), .4, c); },
  flamme(c) { const p = []; for (let i = 0; i <= 24; i++) { const t = i / 24; p.push(new T.Vector2(Math.max(.001, .95 * Math.sin(Math.PI * Math.min(1, Math.sqrt(t) * .98)) * Math.pow(1 - t, .35)), t * 2.4 - 1.2)); }
    const g = new T.Group(), a = new T.Mesh(new T.LatheGeometry(p, 40), vernis(c)), b = new T.Mesh(new T.LatheGeometry(p, 40), vernis("#fff3a8", { emissive: new T.Color("#ffd23f"), emissiveIntensity: .35 })); b.scale.setScalar(.55); b.position.set(0, -.5, .35); g.add(a, b); return g; },
  chemin(c) { const g = new T.Group(), pts = [new T.Vector3(-1.1, -.9, 0), new T.Vector3(-.2, -.2, .2), new T.Vector3(.1, .3, 0), new T.Vector3(1, 1, 0)];
    g.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 40, .1, 10), vernis("#ffffff"))); pts.forEach((p, i) => { if (i === 2) return; const b = boule(i === 3 ? .42 : .3, i === 3 ? "#ffd23f" : c); b.position.copy(p); g.add(b); }); return g; },
  de(c) { const g = new T.Group(); g.add(brique(1.7, 1.7, 1.2, .38, c)); [[-.42, .42], [.42, .42], [0, 0], [-.42, -.42], [.42, -.42]].forEach(([x, y]) => { const b = boule(.15, "#ffffff"); b.position.set(x, y, .78); g.add(b); }); g.rotation.set(.35, -.45, 0); return g; },
  harmonie() { const g = new T.Group(); ["#47e6c1", "#12b76a", "#0e8f6a"].forEach((k, i) => { const b = brique(2, .5, .5, .24, k); b.position.set((i - 1) * .15, (1 - i) * .62, 0); g.add(b); }); return g; },
  orchestre(c) { const g = new T.Group(); [1.15, .72].forEach((r, i) => { const a = new T.Mesh(new T.TorusGeometry(r, .14, 16, 50, Math.PI), vernis(i ? "#ffd23f" : c)); a.position.y = -.5; g.add(a); }); const b = boule(.28, "#ffffff"); b.position.y = -.5; g.add(b); return g; },
  // Les outils du Labo (16/11/2026) : le diapason de l'atelier, la loupe des découvertes, les pistes, l'onde du studio, l'écran de la science, les livres, le code.
  diapason(c) { const g = new T.Group(); [-.42, .42].forEach(x => { const b = brique(.3, 1.7, .4, .14, c); b.position.set(x, .35, 0); g.add(b); }); const u = new T.Mesh(new T.TorusGeometry(.42, .15, 16, 40, Math.PI), vernis(c)); u.rotation.z = Math.PI; u.position.y = -.5; g.add(u);
    const t = brique(.26, .8, .3, .12, "#ffffff"); t.position.y = -1.25; g.add(t); const b = boule(.24, "#ffd23f"); b.position.y = -1.7; g.add(b); return g; },
  loupe(c) { const g = new T.Group(), r = new T.Mesh(new T.TorusGeometry(.7, .17, 20, 60), vernis(c)); r.position.set(-.25, .3, 0); const v = new T.Mesh(new T.CylinderGeometry(.62, .62, .08, 40), vernis("#bff4ff", { transparent: true, opacity: .55 }));
    v.rotation.x = Math.PI / 2; v.position.copy(r.position); const m = brique(.32, 1.15, .32, .15, "#ffd23f"); m.rotation.z = .78; m.position.set(.62, -.62, 0); g.add(r, v, m); return g; },
  pistes(c) { const g = new T.Group(); [[1, [[-.6, 1.1, c], [.75, .9, "#ffd23f"]]], [0, [[-.85, .7, "#35e0ff"], [.3, 1.4, c]]], [-1, [[-.3, 1.6, "#ff4d8d"], [.95, .5, "#ffffff"]]]].forEach(([y, L]) => L.forEach(([x, w, k]) => { const b = brique(w, .5, .4, .2, k); b.position.set(x, y * .68, 0); g.add(b); })); return g; },
  studio(c) { const g = new T.Group(), pts = Array.from({ length: 41 }, (_, i) => { const x = -1.3 + i * 2.6 / 40; return new T.Vector3(x, Math.sin(x * 2.6) * .55, 0); });
    g.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 80, .17, 12), vernis(c))); [pts[0], pts[40]].forEach(p => { const b = boule(.24, "#ffffff"); b.position.copy(p); g.add(b); }); return g; },
  science(c) { const g = new T.Group(), e = brique(2.3, 1.7, .45, .3, "#20124d"); g.add(e); const pts = Array.from({ length: 31 }, (_, i) => { const x = -.85 + i * 1.7 / 30; return new T.Vector3(x, Math.sin(x * 5) * .35 * Math.exp(-Math.abs(x)), .3); });
    g.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 60, .07, 8), vernis(c, { emissive: new T.Color(c), emissiveIntensity: .45 }))); [-.6, .6].forEach(x => { const b = boule(.16, "#ffd23f"); b.position.set(x, -1.05, .1); g.add(b); }); return g; },
  livres(c) { const g = new T.Group(); [[.9, c], [1.25, "#ffd23f"], [1.05, "#35e0ff"], [1.4, "#ff4d8d"]].forEach(([h, k], i) => { const b = brique(.42, h, .9, .1, k); b.position.set((i - 1.5) * .48, h / 2 - .7, 0); if (i === 3) { b.rotation.z = -.28; b.position.x += .12; } g.add(b); }); return g; },
  code(c) { const g = new T.Group(), ch = [[.45, 1], [-.35, 0], [.45, -1], [.15, -1], [-.65, 0], [.15, 1]], a = forme(ch, .4, c), b = forme(ch, .4, c); a.position.x = -.85; b.rotation.y = Math.PI; b.position.x = .85;
    const s = brique(.26, 1.9, .36, .12, "#ffd23f"); s.rotation.z = -.35; g.add(a, b, s); return g; },
  son(c) { const g = new T.Group(); [.6, 1.4, .95, 1.8, .7].forEach((h, i) => { const b = brique(.32, h, .4, .16, i % 2 ? c : "#ffffff"); b.position.set((i - 2) * .45, 0, 0); g.add(b); }); return g; },
};

let R = null;
function moteur() {
  if (R) return R; const canvas = document.createElement("canvas"), rendu = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  rendu.setSize(256, 256, false); rendu.setPixelRatio(1); rendu.outputColorSpace = T.SRGBColorSpace; rendu.toneMapping = T.NoToneMapping; rendu.setClearColor(0, 0);
  const scene = new T.Scene(), pm = new T.PMREMGenerator(rendu); scene.environment = pm.fromScene(new RoomEnvironment(rendu), .04).texture;
  const cle = new T.DirectionalLight(0xffffff, 1.5); cle.position.set(2, 4, 5); const bord = new T.DirectionalLight(0xffffff, .7); bord.position.set(-4, 1, -2); scene.add(cle, bord, new T.HemisphereLight(0xffffff, 0x202040, .35));
  const cam = new T.PerspectiveCamera(30, 1, .1, 50); cam.position.set(0, .3, 7.2); cam.lookAt(0, 0, 0); R = { rendu, scene, cam, canvas }; return R;
}
// Une icône : l'objet est centré, mis à la même taille que les autres, vu de trois quarts.
function photographier(nom, couleur) {
  const { rendu, scene, cam, canvas } = moteur(), obj = FABRIQUES[nom](couleur || "#7c5cff"), box = new T.Box3().setFromObject(obj), taille = box.getSize(new T.Vector3()), k = 2.6 / Math.max(taille.x, taille.y, taille.z * .8);
  const pivot = new T.Group(); obj.position.sub(box.getCenter(new T.Vector3())); pivot.add(obj); pivot.scale.setScalar(k); pivot.rotation.set(.18, -.42, 0); scene.add(pivot);
  rendu.render(scene, cam); const url = canvas.toDataURL("image/png"); scene.remove(pivot); pivot.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); return url;
}
// liste : [[nom, couleur], ...]. Chaque icône est fabriquée à son tour (une par image, la page ne fige jamais) et remise à surIcone(clé, url) dès qu'elle est prête.
// Les icônes déjà faites dans la session arrivent tout de suite. Sans WebGL, rien n'arrive : les icônes dessinées restent.
export async function icones3d(liste, surIcone = () => {}) {
  const out = {}; let cache = {}; try { cache = JSON.parse(sessionStorage.getItem(VERSION) || "{}"); } catch (_) {}
  for (const [nom, couleur] of liste) { const cle = nom + ":" + (couleur || ""); if (!FABRIQUES[nom] || out[cle]) continue;
    if (!cache[cle]) { await new Promise(r => requestAnimationFrame(() => setTimeout(r, 0))); try { cache[cle] = photographier(nom, couleur); } catch (_) { return out; } }
    out[cle] = cache[cle]; surIcone(cle, cache[cle]); }
  try { sessionStorage.setItem(VERSION, JSON.stringify(cache)); } catch (_) {}
  return out;
}
export const NOMS = Object.keys(FABRIQUES);
