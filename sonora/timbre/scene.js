// Le monde de TIMBRE : un petit décor en 3D, la nuit. Une île avec une place de pierre, des falaises, des montagnes au loin, de l'eau, des maisons éclairées,
// et six grandes lanternes qui flottent : une par jeu. Le décor vit (lanternes qui montent, lucioles, étoiles), suit le doigt ou la souris, et réagit au son.
// Tout est fabriqué ici en formes simples (aucune image, aucun modèle à télécharger). Three.js (licence MIT) est dans vendor/.
import * as T from "./vendor/three.module.min.js?v=d86f43e9c8";

const alea = g => () => { g |= 0; g = g + 0x6D2B79F5 | 0; let t = Math.imul(g ^ g >>> 15, 1 | g); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

// Une texture de halo (disque flou), dessinée une fois : elle sert aux lueurs des lanternes, des fenêtres et des lucioles.
function halo() {
  const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d"), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(.25, "rgba(255,255,255,.55)"); gr.addColorStop(.6, "rgba(255,255,255,.12)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
}
// Le ciel : un dégradé du bleu nuit au violet de l'horizon, sur une grande sphère vue de l'intérieur.
function ciel() {
  const c = document.createElement("canvas"); c.width = 4; c.height = 256; const g = c.getContext("2d"), gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, "#04051a"); gr.addColorStop(.45, "#0a1140"); gr.addColorStop(.72, "#2a2f8f"); gr.addColorStop(.86, "#6a4fd0"); gr.addColorStop(1, "#1a2a6a");
  g.fillStyle = gr; g.fillRect(0, 0, 4, 256); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace;
  return new T.Mesh(new T.SphereGeometry(400, 24, 16), new T.MeshBasicMaterial({ map: t, side: T.BackSide, fog: false }));
}
// Un rocher : un polyèdre dont les sommets sont bousculés, à facettes (un même sommet garde le même décalage : pas de fentes).
function rocher(r, rnd, couleur, etire = 1) {
  const g = new T.IcosahedronGeometry(r, 0), p = g.attributes.position, vu = {};
  for (let i = 0; i < p.count; i++) { const cle = [p.getX(i), p.getY(i), p.getZ(i)].map(v => v.toFixed(2)).join(), k = vu[cle] || (vu[cle] = 1 + (rnd() - .5) * .45); p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * etire, p.getZ(i) * k); }
  g.computeVertexNormals(); return new T.Mesh(g, new T.MeshPhongMaterial({ color: couleur, flatShading: true, shininess: 4 }));
}

export function monter(canvas, { couleurs = ["#7c5cff", "#ff3d7f", "#0ea5e9", "#b8f400", "#ff8a00", "#12b76a"], calme = false } = {}) {
  let rendu; try { rendu = new T.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "low-power" }); } catch (_) { return null; }
  const reduit = matchMedia("(prefers-reduced-motion: reduce)").matches, rnd = alea(7), scene = new T.Scene(), cam = new T.PerspectiveCamera(50, 1, .1, 900), H = halo();
  rendu.outputColorSpace = T.SRGBColorSpace; scene.fog = new T.Fog(0x1a2466, 60, 260); scene.add(ciel());
  scene.add(new T.HemisphereLight(0x8fa6ff, 0x1a1430, 1.15)); const lune = new T.DirectionalLight(0xa9c4ff, 1.5); lune.position.set(-40, 60, -30); scene.add(lune);
  const feu = new T.PointLight(0xffb060, 260, 70, 1.6); feu.position.set(0, 5, 2); scene.add(feu);
  const lueur = (couleur, taille, opacite = .9) => { const s = new T.Sprite(new T.SpriteMaterial({ map: H, color: couleur, transparent: true, opacity: opacite, blending: T.AdditiveBlending, depthWrite: false, fog: false })); s.scale.set(taille, taille, 1); return s; };

  // L'eau, l'île et la place de pierre
  const eau = new T.Mesh(new T.CircleGeometry(380, 48), new T.MeshPhongMaterial({ color: 0x15409a, emissive: 0x0b2a78, shininess: 90, specular: 0x9fd4ff, flatShading: true })); eau.rotation.x = -Math.PI / 2; eau.position.y = -1.2; scene.add(eau);
  const ile = new T.Mesh(new T.CylinderGeometry(24, 30, 5, 14, 1), new T.MeshPhongMaterial({ color: 0x3f7a3a, flatShading: true, shininess: 2 })); ile.position.y = -2.4; scene.add(ile);
  const place = new T.Mesh(new T.CylinderGeometry(9.5, 10, .7, 28), new T.MeshPhongMaterial({ color: 0xe9d9b0, emissive: 0x4a3a18, flatShading: true })); place.position.y = .3; scene.add(place);
  for (let k = 0; k < 3; k++) { const a = new T.Mesh(new T.TorusGeometry(2.6 + k * 2.6, .09, 6, 40), new T.MeshBasicMaterial({ color: 0xb49a66 })); a.rotation.x = Math.PI / 2; a.position.y = .68; scene.add(a); }
  const bord = new T.Mesh(new T.TorusGeometry(10.1, .5, 6, 22), new T.MeshPhongMaterial({ color: 0x7c7f95, flatShading: true })); bord.rotation.x = Math.PI / 2; bord.position.y = .3; scene.add(bord);

  // Les falaises qui encadrent, les rochers, les montagnes au loin
  for (const [x, z, r, h] of [[-27, 6, 11, 3.4], [-33, -8, 13, 3], [28, 4, 11, 3.6], [34, -10, 14, 3.2], [-20, 18, 6, 1.6], [22, 18, 6, 1.5]]) { const m = rocher(r, rnd, 0x6a4b3a, h); m.position.set(x, r * h * .28, z); scene.add(m); const herbe = rocher(r * .7, rnd, 0x3f7a3a, .35); herbe.position.set(x, r * h * .72, z); scene.add(herbe); }
  for (let i = 0; i < 16; i++) { const a = rnd() * 6.28, d = 12 + rnd() * 12, m = rocher(.6 + rnd() * 1.4, rnd, 0x6f7388); m.position.set(Math.cos(a) * d, .2, Math.sin(a) * d); scene.add(m); }
  for (const [x, z, r, h, c] of [[-70, -150, 34, 60, 0x4a5fc4], [10, -180, 46, 86, 0x6f86e8], [80, -150, 36, 58, 0x4a5fc4], [-140, -130, 30, 44, 0x38489e], [150, -120, 30, 46, 0x38489e]]) {
    const m = new T.Mesh(new T.ConeGeometry(r, h, 6), new T.MeshPhongMaterial({ color: c, flatShading: true, shininess: 2 })); m.position.set(x, h / 2 - 2, z); m.rotation.y = rnd() * 3; scene.add(m);
    const neige = new T.Mesh(new T.ConeGeometry(r * .38, h * .38, 6), new T.MeshPhongMaterial({ color: 0xdfeaff, emissive: 0x4a66c8, flatShading: true })); neige.position.set(x, h * .81 - 2, z); neige.rotation.y = m.rotation.y; scene.add(neige); }

  // Les maisons aux fenêtres éclairées, les cristaux, les lampes
  const maison = (x, z, s, rot) => { const g = new T.Group(), bois = new T.MeshPhongMaterial({ color: 0x8a5a34, flatShading: true }), toit = new T.MeshPhongMaterial({ color: 0x5b3a66, flatShading: true });
    const c = new T.Mesh(new T.BoxGeometry(3, 2.2, 2.6), bois); c.position.y = 1.1; g.add(c); const t = new T.Mesh(new T.ConeGeometry(2.5, 1.6, 4), toit); t.position.y = 3; t.rotation.y = Math.PI / 4; g.add(t);
    for (const dx of [-.75, .75]) { const f = new T.Mesh(new T.PlaneGeometry(.7, .8), new T.MeshBasicMaterial({ color: 0xffd27a })); f.position.set(dx, 1.2, 1.31); g.add(f); } const l = lueur(0xffb860, 5, .55); l.position.set(0, 1.3, 1.6); g.add(l);
    g.position.set(x, .1, z); g.scale.setScalar(s); g.rotation.y = rot; scene.add(g); };
  maison(-15, -6, 1.2, .5); maison(16, -8, 1.35, -.5); maison(18, 6, 1, -1.1); maison(-18, 7, .9, 1);
  const cristaux = []; for (const [x, z, c] of [[-12, 9, 0xff5fd0], [-13.5, 10, 0xb06bff], [13, 11, 0x38d0ff], [-9, -13, 0x38d0ff], [10, -13, 0xff5fd0]]) { const m = new T.Mesh(new T.ConeGeometry(.7, 3, 5), new T.MeshBasicMaterial({ color: c })); m.position.set(x, 1.4, z); m.rotation.z = (rnd() - .5) * .5; scene.add(m); const l = lueur(c, 7, .5); l.position.set(x, 1.6, z); scene.add(l); cristaux.push(l); }

  // Les étoiles, les planètes, les lucioles
  { const n = 500, p = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const a = rnd() * 6.28, e = .08 + rnd() * 1.3, r = 360; p[i * 3] = Math.cos(a) * Math.cos(e) * r; p[i * 3 + 1] = Math.sin(e) * r; p[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r; }
    const g = new T.BufferGeometry(); g.setAttribute("position", new T.BufferAttribute(p, 3)); scene.add(new T.Points(g, new T.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: .85, fog: false }))); }
  const planete = new T.Mesh(new T.SphereGeometry(16, 14, 10), new T.MeshPhongMaterial({ color: 0x3f6fe0, emissive: 0x12256e, flatShading: true, fog: false })); planete.position.set(90, 110, -230); scene.add(planete);
  const anneau = new T.Mesh(new T.TorusGeometry(25, 1.6, 4, 40), new T.MeshBasicMaterial({ color: 0x9fb6ff, transparent: true, opacity: .6, fog: false })); anneau.position.copy(planete.position); anneau.rotation.set(1.25, .3, 0); scene.add(anneau);
  const lune2 = new T.Mesh(new T.SphereGeometry(7, 12, 8), new T.MeshBasicMaterial({ color: 0xcfd9ff, fog: false })); lune2.position.set(-110, 150, -240); scene.add(lune2); const hl = lueur(0x9fb6ff, 70, .45); hl.position.copy(lune2.position); scene.add(hl);
  const NL = 60, lp = new Float32Array(NL * 3), lph = []; for (let i = 0; i < NL; i++) { lp[i * 3] = (rnd() - .5) * 50; lp[i * 3 + 1] = 1 + rnd() * 9; lp[i * 3 + 2] = (rnd() - .5) * 40; lph.push(rnd() * 6.28); }
  const lg = new T.BufferGeometry(); lg.setAttribute("position", new T.BufferAttribute(lp, 3)); const lucioles = new T.Points(lg, new T.PointsMaterial({ map: H, color: 0xfff2a8, size: .9, transparent: true, blending: T.AdditiveBlending, depthWrite: false })); scene.add(lucioles);

  // Les six lanternes des jeux (en arc au-dessus de la place) et de petites lanternes qui montent au loin
  const lanternes = couleurs.map((c, i) => { const g = new T.Group(), col = new T.Color(c);
    const b = new T.Mesh(new T.SphereGeometry(2.4, 14, 10), new T.MeshPhongMaterial({ color: col, emissive: col.clone().multiplyScalar(.62), shininess: 60, specular: 0xffffff })); b.scale.set(1, 1.18, 1); g.add(b);
    for (let q = 0; q < 6; q++) { const f = new T.Mesh(new T.TorusGeometry(2.42, .05, 4, 20, Math.PI), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .35 })); f.rotation.set(0, q * Math.PI / 6, Math.PI / 2); f.scale.set(1.18, 1, 1); g.add(f); }
    const bas = new T.Mesh(new T.ConeGeometry(1.3, 1.6, 10, 1, true), new T.MeshBasicMaterial({ color: col.clone().multiplyScalar(.7), side: T.DoubleSide })); bas.position.y = -2.9; bas.rotation.x = Math.PI; g.add(bas);
    const nacelle = new T.Mesh(new T.BoxGeometry(.8, .6, .8), new T.MeshPhongMaterial({ color: 0x8a5a34, flatShading: true })); nacelle.position.y = -4.4; g.add(nacelle);
    const l = lueur(col, 16, .75); g.add(l); const a = (i - 2.5) * .42; g.userData = { x: Math.sin(a) * 19, y: 12 + Math.cos(i * 1.7) * 2.2, z: -6 - Math.cos(a) * 9, ph: i * 1.3, l, k: 1, cible: 1 }; g.position.set(g.userData.x, g.userData.y, g.userData.z); scene.add(g); return g; });
  const petites = []; for (let i = 0; i < 14; i++) { const c = [0xff7ad9, 0xffb060, 0xff5f9e][i % 3], s = lueur(c, 5 + rnd() * 6, .8); s.position.set((rnd() - .5) * 220, 10 + rnd() * 80, -60 - rnd() * 150); s.userData = { v: .6 + rnd() * 1.4, x: s.position.x, ph: rnd() * 6 }; scene.add(s); petites.push(s); }

  // La caméra : elle regarde la place, se balance doucement, suit le doigt, et se tourne vers la lanterne choisie.
  const etat = { cx: 0, cy: 0, vx: 0, vy: 0, lacet: 0, cibleLacet: 0, niveau: 0, sombre: 0, fete: 0, large: 1 };
  function taille() { const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight; rendu.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5)); rendu.setSize(w, h, false); cam.aspect = w / h; etat.large = w / h; cam.fov = w / h < .8 ? 72 : 52; cam.updateProjectionMatrix(); }
  taille(); addEventListener("resize", taille);
  const bouge = (x, y) => { etat.cx = (x / innerWidth - .5) * 2; etat.cy = (y / innerHeight - .5) * 2; };
  addEventListener("pointermove", e => bouge(e.clientX, e.clientY), { passive: true });
  addEventListener("deviceorientation", e => { if (e.gamma == null) return; etat.cx = Math.max(-1, Math.min(1, e.gamma / 30)); etat.cy = Math.max(-1, Math.min(1, (e.beta - 45) / 40)); }, { passive: true });


  /* ---------- Le plateau : pendant une partie, la caméra descend sur la place et le jeu se joue en objets 3D ----------
     timbre.js garde de vrais boutons (clavier, lecteurs d'écran, tests) et les pose sur les objets grâce à ancres() : on touche l'objet, c'est le bouton qui répond. */
  const plateau = new T.Group(); scene.add(plateau);
  const J = { on: false, k: 0, source: true, pieces: new Map(), eclats: [], couleur: new T.Color("#7c5cff") };
  const matPierre = new T.MeshPhongMaterial({ color: 0x8f93ad, emissive: 0x15182e, flatShading: true });
  const toile = (w, h, f) => { const c = document.createElement("canvas"); c.width = w; c.height = h; f(c.getContext("2d"), w, h); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; return t; };
  const arrondi = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  // Une carte blanche aux coins arrondis, avec la photo de l'instrument (chargée ensuite) ou son initiale.
  function texturePhoto(url, lettre, couleur) {
    const t = toile(256, 256, (g, w, h) => { g.fillStyle = "#fff"; arrondi(g, 6, 6, w - 12, h - 12, 34); g.fill(); g.lineWidth = 12; g.strokeStyle = couleur; g.stroke(); if (!url) { g.fillStyle = couleur; g.font = "900 150px Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(lettre || "?", w / 2, h / 2 + 8); } });
    if (url) { const im = new Image(); im.onload = () => { const g = t.image.getContext("2d"), m = 34, k = Math.min((256 - 2 * m) / im.width, (256 - 2 * m) / im.height), w = im.width * k, h = im.height * k; g.drawImage(im, (256 - w) / 2, (256 - h) / 2, w, h); t.needsUpdate = true; relance(); }; im.src = url; }
    return t;
  }
  const textureHP = couleur => toile(256, 320, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#1b2470"); gr.addColorStop(1, "#0a0f45"); g.fillStyle = gr; arrondi(g, 6, 6, w - 12, h - 12, 30); g.fill(); g.lineWidth = 10; g.strokeStyle = couleur; g.stroke();
    g.fillStyle = "#fff"; g.beginPath(); g.moveTo(80, 130); g.lineTo(110, 130); g.lineTo(150, 95); g.lineTo(150, 225); g.lineTo(110, 190); g.lineTo(80, 190); g.closePath(); g.fill(); g.strokeStyle = "#fff"; g.lineWidth = 10; g.lineCap = "round"; g.beginPath(); g.arc(150, 160, 38, -.9, .9); g.stroke(); g.beginPath(); g.arc(150, 160, 62, -.8, .8); g.stroke(); });
  const textureDos = couleur => toile(256, 320, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, "#ffffff"); gr.addColorStop(.12, couleur); gr.addColorStop(1, "#140c3a"); g.fillStyle = gr; arrondi(g, 6, 6, w - 12, h - 12, 30); g.fill();
    g.strokeStyle = "rgba(255,255,255,.55)"; g.lineWidth = 8; arrondi(g, 26, 26, w - 52, h - 52, 20); g.stroke(); g.fillStyle = "rgba(255,255,255,.92)"; g.font = "900 120px Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("?", w / 2, h / 2 + 6); });

  // La source du son : un cœur lumineux et trois anneaux, au fond de la place. Il enfle avec le son réellement joué.
  const source = new T.Group(), coeurMat = new T.MeshPhongMaterial({ color: 0xffffff, emissive: 0x7c5cff, emissiveIntensity: 1.1, flatShading: true, shininess: 80 });
  const coeur = new T.Mesh(new T.IcosahedronGeometry(1.25, 1), coeurMat); source.add(coeur); const aura = lueur(0x7c5cff, 8, .9); source.add(aura);
  const anneaux = [0, 1, 2].map(i => { const a = new T.Mesh(new T.TorusGeometry(2 + i * .65, .07, 6, 56), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .55, fog: false })); a.rotation.set(Math.PI / 2 + i * .55, i * .9, 0); source.add(a); return a; });
  source.visible = false; plateau.add(source);

  // Où poser n objets sur la place : une grille qui suit la forme de l'écran.
  function disposer(n, forme) {
    const portrait = etat.large < .8, carte = forme === "carte", note = forme === "note";
    if (note) return [new T.Vector3(-3, 3, 1.5), new T.Vector3(3, 3, 1.5)];
    const cols = carte ? (portrait ? 3 : 6) : portrait ? (n <= 2 ? n : n === 3 ? 3 : 2) : (n <= 4 ? n : 3), rows = Math.ceil(n / cols);
    const sx = carte ? (portrait ? 3.4 : 3.5) : portrait ? (n === 3 ? 3.9 : 5.6) : (n >= 4 ? 4.4 : 5), sz = carte ? (portrait ? 3.9 : 4.4) : portrait ? 5.2 : 4.6;
    return Array.from({ length: n }, (_, i) => { const r = Math.floor(i / cols), c = i % cols, nc = Math.min(cols, n - r * cols); return new T.Vector3((c - (nc - 1) / 2) * sx, .7, (r - (rows - 1) / 2) * sz + (carte ? 1.2 : 2.2)); });
  }
  // Les objets : socle et carte photo (réponses), tambour (l'intrus), cristal (mémoire), carte à retourner (paires), boule (plus haut, plus bas).
  function fabriquer(d, pos) {
    const g = new T.Group(), col = new T.Color(d.couleur || "#7c5cff"), u = { id: d.id, forme: d.forme, base: pos.clone(), etat: "normal", t: 0, mats: [], haut: 2, flip: 0, lueur: null, vis: null, y: 0 };
    const mat = (o = {}) => { const m = new T.MeshPhongMaterial(Object.assign({ color: col, emissive: col.clone().multiplyScalar(.35), flatShading: true, shininess: 40 }, o)); m.userData.e0 = m.emissive.clone(); u.mats.push(m); return m; };
    if (d.forme === "totem") {
      const socle = new T.Mesh(new T.CylinderGeometry(1.25, 1.5, .8, 10), matPierre); socle.position.y = .4; g.add(socle);
      const bague = new T.Mesh(new T.TorusGeometry(1.32, .1, 6, 28), new T.MeshBasicMaterial({ color: col })); bague.rotation.x = Math.PI / 2; bague.position.y = .82; g.add(bague);
      const vis = new T.Group(); vis.position.y = 2.5; g.add(vis); u.vis = vis;
      if (d.image) { const cadre = new T.Mesh(new T.BoxGeometry(3.2, 3.2, .3), mat()); vis.add(cadre); const face = new T.Mesh(new T.PlaneGeometry(2.9, 2.9), new T.MeshBasicMaterial({ map: texturePhoto(d.image, "", "#" + col.getHexString()) })); face.position.z = .17; vis.add(face); u.billboard = true; }
      else { const c = new T.Mesh(new T.OctahedronGeometry(1.4, 0), mat({ shininess: 90 })); c.scale.set(1, 1.35, 1); vis.add(c); u.tourne = true; }
      u.haut = 2.5;
    } else if (d.forme === "tambour") {
      const fut = new T.Mesh(new T.CylinderGeometry(1.6, 1.45, 1.5, 16), mat()); fut.position.y = .75; g.add(fut);
      const peau = new T.Mesh(new T.CylinderGeometry(1.62, 1.62, .1, 24), new T.MeshPhongMaterial({ color: 0xf3e3c0, emissive: 0x3a2c10 })); peau.position.y = 1.52; g.add(peau);
      for (let k = 0; k < 2; k++) { const c = new T.Mesh(new T.TorusGeometry(1.58 - k * .1, .07, 6, 30), new T.MeshBasicMaterial({ color: 0xffd23f })); c.rotation.x = Math.PI / 2; c.position.y = k ? .15 : 1.45; g.add(c); }
      u.haut = 1.1;
    } else if (d.forme === "cristal") {
      const socle = new T.Mesh(new T.CylinderGeometry(1.4, 1.7, .6, 8), matPierre); socle.position.y = .3; g.add(socle);
      const c = new T.Mesh(new T.OctahedronGeometry(1.35, 0), mat({ shininess: 100, emissive: col.clone().multiplyScalar(.18) })); c.scale.set(1, 1.5, 1); c.position.y = 2.4; g.add(c); u.vis = c; u.tourne = true; u.haut = 2.2;
    } else if (d.forme === "carte") {
      const dos = new T.MeshBasicMaterial({ map: textureDos("#" + col.getHexString()) }), face = new T.MeshBasicMaterial({ map: textureHP("#" + col.getHexString()) }), bord = new T.MeshPhongMaterial({ color: 0xffffff, emissive: 0x333355 });
      const c = new T.Mesh(new T.BoxGeometry(2.6, .16, 3.2), [bord, bord, dos, face, bord, bord]); c.rotation.y = 0; const pivot = new T.Group(); pivot.position.y = .2; pivot.add(c); g.add(pivot); u.vis = pivot; u.matFace = face; u.couleur = "#" + col.getHexString(); u.haut = .3;
    } else if (d.forme === "note") {
      const b = new T.Mesh(new T.IcosahedronGeometry(1.1, 2), mat({ shininess: 90 })); g.add(b); u.vis = b; u.haut = 0;
    }
    const l = lueur(col, d.forme === "carte" ? 6 : 7, .0); l.position.y = u.haut; g.add(l); u.lueur = l;
    g.position.copy(pos); g.userData = u; plateau.add(g); return g;
  }
  function vider() { for (const g of J.pieces.values()) { plateau.remove(g); g.traverse(o => { if (o.geometry) o.geometry.dispose(); }); } J.pieces.clear(); }
  // Un éclat de particules en 3D : la bonne réponse explose de lumière.
  function eclat(pos, couleur, n = 70) {
    const p = new Float32Array(n * 3), v = []; for (let i = 0; i < n; i++) { p[i * 3] = pos.x; p[i * 3 + 1] = pos.y; p[i * 3 + 2] = pos.z; const a = Math.random() * 6.28, b = Math.random() * 1.4 + .2, f = 6 + Math.random() * 9; v.push([Math.cos(a) * Math.cos(b) * f, Math.sin(b) * f + 3, Math.sin(a) * Math.cos(b) * f]); }
    const g = new T.BufferGeometry(); g.setAttribute("position", new T.BufferAttribute(p, 3));
    const pts = new T.Points(g, new T.PointsMaterial({ map: H, color: new T.Color(couleur), size: 1.1, transparent: true, blending: T.AdditiveBlending, depthWrite: false })); scene.add(pts); J.eclats.push({ pts, v, vie: 1 }); relance();
  }
  const VERT = new T.Color(0x2bd47d), ROUGE = new T.Color(0xff4d5e), BLANC = new T.Color(0xffffff);
  const camMonde = new T.Vector3(), viseMonde = new T.Vector3(), camJeu = new T.Vector3(), viseJeu = new T.Vector3(), vise = new T.Vector3(), proj = new T.Vector3();
  function poserCameraJeu() { const portrait = etat.large < .8; if (portrait) { camJeu.set(0, 21, 12.5); viseJeu.set(0, 0, .2); } else { camJeu.set(0, 14.5, 17); viseJeu.set(0, 1.2, .6); } }
  function animerPlateau(s, dt) {
    place.material.emissive.setHex(0x4a3a18).multiplyScalar(1 - .75 * J.k); place.material.color.setHex(0xe9d9b0).multiplyScalar(1 - .45 * J.k);
    J.k = reduit ? (J.on ? 1 : 0) : Math.max(0, Math.min(1, J.k + (J.on ? 1 : -1) * dt / .9));   // 0,9 s pour descendre sur la place, quelle que soit la vitesse de l'appareil
    source.visible = J.k > .05 && J.source; const lv = etat.niveau; if (etat.large < .8) source.position.set(0, 4.6 + Math.sin(s * 1.2) * .25, -6.5); else source.position.set(0, 3.6 + Math.sin(s * 1.2) * .25, -3.6); coeur.scale.setScalar(1 + lv * .7); coeur.rotation.y = s * .6; coeur.rotation.x = s * .3;
    coeurMat.emissive.copy(J.couleur); coeurMat.emissiveIntensity = .9 + lv * 1.6; aura.material.color.copy(J.couleur); aura.scale.setScalar(8 + lv * 10); anneaux.forEach((a, i) => { a.rotation.z = s * (.3 + i * .2); a.scale.setScalar(1 + lv * (.25 + i * .12)); a.material.opacity = .25 + lv * .6; });
    for (const g of J.pieces.values()) { const u = g.userData, age = s - u.t; let y = 0, sx = 0, k = 1, glow = 0, e = null;
      if (u.etat === "joue") { k = 1.22 + Math.sin(s * 14) * .04; glow = 1; e = BLANC; } else if (u.etat === "ok") { y = Math.min(1.4, age * 4); k = 1.15; glow = 1; e = VERT; } else if (u.etat === "ko") { sx = Math.sin(age * 40) * Math.max(0, .5 - age) * .9; glow = .8; e = ROUGE; }
      else if (u.etat === "fondu" || u.etat === "attente") { k = u.etat === "fondu" ? .82 : .92; } else if (u.etat === "trouve") { glow = .6; e = VERT; }
      if (u.forme === "carte") { const vise = u.etat === "vue" || u.etat === "trouve" || u.etat === "joue" ? Math.PI : 0; u.flip += (vise - u.flip) * (reduit ? 1 : .18); u.vis.rotation.z = u.flip; y += Math.sin(u.flip) * 1.4; if (u.etat === "joue") k = 1.06; }
      if (u.forme === "note") { y += u.y; }
      g.position.set(u.base.x + sx, u.base.y + y + (u.forme === "carte" || u.forme === "note" ? 0 : Math.sin(s * 1.6 + u.base.x) * .08), u.base.z); g.scale.setScalar(k);
      if (u.vis && u.tourne) u.vis.rotation.y = s * .8; if (u.billboard) u.vis.quaternion.copy(cam.quaternion);
      for (const m of u.mats) { m.emissive.copy(e ? m.userData.e0.clone().lerp(e, .85) : m.userData.e0); if (u.etat === "fondu" || u.etat === "attente") m.emissive.multiplyScalar(.35); }
      u.lueur.material.opacity += ((glow ? .55 + .35 * glow : 0) - u.lueur.material.opacity) * .2; if (e) u.lueur.material.color.copy(e); }
    for (let i = J.eclats.length - 1; i >= 0; i--) { const E = J.eclats[i], P = E.pts.geometry.attributes.position; E.vie -= dt * .9; E.v.forEach((v, k) => { v[1] -= 14 * dt; P.array[k * 3] += v[0] * dt; P.array[k * 3 + 1] += v[1] * dt; P.array[k * 3 + 2] += v[2] * dt; }); P.needsUpdate = true; E.pts.material.opacity = Math.max(0, E.vie);
      if (E.vie <= 0) { scene.remove(E.pts); E.pts.geometry.dispose(); E.pts.material.dispose(); J.eclats.splice(i, 1); } }
  }

  let t0 = performance.now(), actif = true, raf = 0, dernier = 0;
  function image(t) {
    const s = (t - t0) / 1000, dt = Math.min(.05, (t - dernier) / 1000 || .016); dernier = t;
    etat.vx += (etat.cx - etat.vx) * .05; etat.vy += (etat.cy - etat.vy) * .05; etat.lacet += (etat.cibleLacet - etat.lacet) * .06; etat.niveau *= .9; etat.fete *= .96;
    const portrait = etat.large < .8, d = portrait ? 44 : 38, a = etat.lacet + etat.vx * .16 + Math.sin(s * .12) * .05;
    camMonde.set(Math.sin(a) * d, (portrait ? 13 : 10) - etat.vy * 2.4 + Math.sin(s * .3) * .5, Math.cos(a) * d); viseMonde.set(Math.sin(etat.lacet) * -6, portrait ? 9 : 7, -8);
    animerPlateau(s, dt); poserCameraJeu(); const m = J.k * J.k * (3 - 2 * J.k);
    cam.position.copy(camMonde).lerp(camJeu, m); vise.copy(viseMonde).lerp(viseJeu, m); cam.lookAt(vise);
    lanternes.forEach((g, i) => { const u = g.userData; u.k += (u.cible - u.k) * .08; g.position.set(u.x + Math.sin(s * .4 + u.ph) * .8, u.y + Math.sin(s * .7 + u.ph) * .9 + etat.fete * (3 + i % 3) + J.k * 9, u.z); g.rotation.y = Math.sin(s * .5 + u.ph) * .3; g.scale.setScalar(u.k * (1 + etat.niveau * .25)); u.l.material.opacity = .45 + .4 * (u.k - .7) + etat.niveau * .5; });
    petites.forEach(p => { p.position.y += p.userData.v * dt * (1 + etat.fete * 4); p.position.x = p.userData.x + Math.sin(s * .2 + p.userData.ph) * 6; if (p.position.y > 130) p.position.y = 4; });
    const P = lg.attributes.position; for (let i = 0; i < NL; i++) { P.array[i * 3 + 1] += Math.sin(s * 1.3 + lph[i]) * .012; P.array[i * 3] += Math.cos(s * .7 + lph[i]) * .01; } P.needsUpdate = true; lucioles.material.opacity = .65 + Math.sin(s * 2) * .25;
    feu.intensity = (240 + Math.sin(s * 7) * 16) * (1 - .65 * J.k) + etat.niveau * 500; cristaux.forEach((c, i) => c.material.opacity = .4 + Math.sin(s * 1.5 + i) * .15 + etat.niveau * .4); anneau.rotation.z = s * .05;
    rendu.render(scene, cam);
  }
  function boucle(t) { raf = 0; if (!actif || document.hidden) return; image(t); if ((!reduit && !calme) || J.eclats.length || (J.k > 0 && J.k < 1)) raf = requestAnimationFrame(boucle); }
  const relance = () => { if (!raf) raf = requestAnimationFrame(boucle); }; document.addEventListener("visibilitychange", relance); relance();
  return {
    choisir(i) { lanternes.forEach((g, k) => g.userData.cible = i == null ? 1 : k === i ? 1.45 : .78); etat.cibleLacet = i == null ? 0 : -(i - 2.5) * .11; relance(); },
    son(n) { etat.niveau = Math.max(etat.niveau, Math.min(1, n)); }, fete() { etat.fete = 1; relance(); }, redessiner: relance,
    pause(v) { actif = !v; if (actif) relance(); },
    /* Le plateau de jeu */
    jeu(on, couleur) { J.on = !!on; if (couleur) J.couleur.set(couleur); if (!on) vider(); relance(); },
    pieces(defs, avecSource = true) { J.source = !!avecSource; vider(); const P = disposer(defs.length, defs[0] && defs[0].forme); defs.forEach((d, i) => J.pieces.set(d.id, fabriquer(d, P[i]))); relance(); },
    piece(id, e) { const g = J.pieces.get(id); if (!g) return; if (g.userData.etat !== e) { g.userData.etat = e; g.userData.t = (performance.now() - t0) / 1000; } relance(); },
    toutes(e) { for (const id of J.pieces.keys()) this.piece(id, e); },
    image(id, url, lettre) { const g = J.pieces.get(id); if (!g || !g.userData.matFace) return; g.userData.matFace.map = texturePhoto(url, lettre, g.userData.couleur); g.userData.matFace.needsUpdate = true; relance(); },
    hauteur(id, y) { const g = J.pieces.get(id); if (g) { g.userData.y = y; relance(); } },
    eclat(id, couleur) { const g = J.pieces.get(id); if (g) { eclat(new T.Vector3(g.userData.base.x, g.userData.base.y + g.userData.haut, g.userData.base.z), couleur || "#2bd47d"); } },
    /* Où sont les objets à l'écran (pour y poser les boutons) : centre et taille, à partir de leur position de repos. Vide tant que la caméra n'est pas arrivée. */
    ancres() { const o = {}; if (J.k < 1) return o; cam.updateMatrixWorld(); const r = canvas.getBoundingClientRect(), dans = v => { v.project(cam); return [(v.x + 1) / 2 * r.width + r.left, (1 - v.y) / 2 * r.height + r.top]; };
      for (const [id, g] of J.pieces) { const u = g.userData, c = u.base.clone(); c.y += u.forme === "note" ? 0 : u.haut * .62; const [x, y] = dans(proj.copy(c)); const [x2] = dans(proj.copy(c).add(new T.Vector3(u.forme === "carte" ? 1.3 : 1.5, 0, 0))); o[id] = { x, y, s: Math.abs(x2 - x) * 2 }; }
      if (J.source) { const [sx, sy] = dans(proj.copy(source.position)), [sx2] = dans(proj.copy(source.position).add(new T.Vector3(2, 0, 0))); o.source = { x: sx, y: sy, s: Math.abs(sx2 - sx) * 2 }; } return o; },
    arreter() { actif = false; cancelAnimationFrame(raf); removeEventListener("resize", taille); rendu.dispose(); },
  };
}
