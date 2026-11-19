// La galaxie de l'élève, en vraie 3D : un soleil qui rayonne et éclaire, des planètes en relief dont la face nuit est sombre, une atmosphère lumineuse sur leur bord,
// des lunes qui apparaissent à mesure qu'on avance, un anneau de progression, un chemin d'orbite qui se remplit, une ceinture d'astéroïdes, des nébuleuses au loin et
// la Terre avec ses vrais continents, qui mène à l'Atlas. La caméra vole : entrée en spirale, dérive lente, parallaxe au toucher et à l'inclinaison du téléphone,
// et un plongeon vers la planète choisie. Les étiquettes sont de vrais boutons HTML posés sur le canevas (clavier, lecteur d'écran). Three.js (licence MIT) est dans vendor/.
// Les continents de la Terre viennent de terres.json (Natural Earth, domaine public).
import * as T from "./vendor/three.module.min.js?v=8cd1732532";

const alea = graine => { let s = graine >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; };
const hash = t => { let h = 7; for (const c of String(t)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
const bornes = (x, a, b) => Math.max(a, Math.min(b, x));

// Une surface de planète : bandes et taches de la couleur du contenu ; la même image, en gris, sert de relief.
function surface(couleur, graine, relief = false) {
  const W = 512, H = 256, cv = document.createElement("canvas"); cv.width = W; cv.height = H; const g = cv.getContext("2d"), r = alea(graine), c = new T.Color(couleur);
  const css = (k, a = 1) => { const x = c.clone().offsetHSL(0, 0, k), v = Math.round((.5 + k) * 255); return relief ? `rgba(${v},${v},${v},${a})` : `rgba(${Math.round(x.r * 255)},${Math.round(x.g * 255)},${Math.round(x.b * 255)},${a})`; };
  g.fillStyle = css(0); g.fillRect(0, 0, W, H);
  for (let i = 0; i < 18; i++) { const y = r() * H, h = 6 + r() * 34; g.fillStyle = css((r() - .5) * .34, .55); g.fillRect(0, y, W, h); }
  for (let i = 0; i < 110; i++) { g.fillStyle = css((r() - .5) * .5, .26); g.beginPath(); g.ellipse(r() * W, r() * H, 8 + r() * 46, 3 + r() * 14, 0, 0, 7); g.fill(); }
  const t = new T.CanvasTexture(cv); if (!relief) t.colorSpace = T.SRGBColorSpace; return t;
}

// La Terre : océan, vrais continents (terres.json), glaces ; les nuages sont une couche à part.
async function terre() {
  const W = 1024, H = 512, cv = document.createElement("canvas"); cv.width = W; cv.height = H; const g = cv.getContext("2d");
  const mer = g.createLinearGradient(0, 0, 0, H); mer.addColorStop(0, "#1b4fa8"); mer.addColorStop(.5, "#1f72e6"); mer.addColorStop(1, "#1b4fa8"); g.fillStyle = mer; g.fillRect(0, 0, W, H);
  let anneaux = []; try { anneaux = await (await fetch(new URL("terres.json", import.meta.url))).json(); } catch (_) {}
  const xy = ([lo, la]) => [(lo + 180) / 360 * W, (90 - la) / 180 * H];
  g.fillStyle = "#43a24e"; g.strokeStyle = "#2c7a3a"; g.lineWidth = 1.2;
  for (const an of anneaux) { g.beginPath(); an.forEach((p, i) => { const [x, y] = xy(p); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); g.fill(); g.stroke(); }  // terres.json : une liste d'anneaux [longitude, latitude]
  g.fillStyle = "rgba(255,255,255,.88)"; g.fillRect(0, 0, W, 14); g.fillRect(0, H - 26, W, 26);
  const t = new T.CanvasTexture(cv); t.colorSpace = T.SRGBColorSpace; return t;
}
function nuages() {
  const W = 512, H = 256, cv = document.createElement("canvas"); cv.width = W; cv.height = H; const g = cv.getContext("2d"), r = alea(11);
  for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(255,255,255,${.1 + r() * .22})`; g.beginPath(); g.ellipse(r() * W, r() * H, 16 + r() * 60, 3 + r() * 11, 0, 0, 7); g.fill(); }
  return new T.CanvasTexture(cv);
}

const lueur = (couleur, taille, force = .9) => { const cv = document.createElement("canvas"); cv.width = cv.height = 128; const g = cv.getContext("2d"), r = g.createRadialGradient(64, 64, 2, 64, 64, 64), c = new T.Color(couleur);
  const rgb = `${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)}`; r.addColorStop(0, `rgba(${rgb},${force})`); r.addColorStop(.35, `rgba(${rgb},${force * .3})`); r.addColorStop(1, `rgba(${rgb},0)`); g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  const s = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(cv), transparent: true, blending: T.AdditiveBlending, depthWrite: false })); s.scale.set(taille, taille, 1); return s; };

// L'atmosphère : une coque dont l'éclat monte vers le bord de la planète (effet de Fresnel).
const atmosphere = (couleur, rayon, force = 1.1) => new T.Mesh(new T.SphereGeometry(rayon, 40, 28), new T.ShaderMaterial({ uniforms: { c: { value: new T.Color(couleur) }, k: { value: force } }, transparent: true, depthWrite: false, blending: T.AdditiveBlending,
  vertexShader: "varying vec3 N; varying vec3 V; void main(){ N = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); V = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }",
  fragmentShader: "uniform vec3 c; uniform float k; varying vec3 N; varying vec3 V; void main(){ float f = pow(1.0 - max(dot(N, V), 0.0), 2.4); gl_FragColor = vec4(c, f * k); }" }));

export function monterGalaxie(canvas, conteneur, donnees, { onChoix = () => {}, onRetour = () => {} } = {}) {
  let rendu; try { rendu = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" }); } catch (_) { return null; }
  const reduit = matchMedia("(prefers-reduced-motion: reduce)").matches, scene = new T.Scene(), cam = new T.PerspectiveCamera(52, 1, .1, 400), monde = new T.Group(); scene.add(monde);
  rendu.outputColorSpace = T.SRGBColorSpace; rendu.setClearColor(0x000000, 0); scene.fog = new T.FogExp2(0x03060a, .0085);
  scene.add(new T.AmbientLight(0x5a6a80, .55)); scene.add(new T.HemisphereLight(0x9fb8ff, 0x20140a, .25));

  // --- le soleil : un cœur qui tourne, des couronnes, des rayons ---
  const niv = donnees.soleil.niveau, rs = 1.15 + .07 * niv, soleil = new T.Group();
  const coeur = new T.Mesh(new T.SphereGeometry(rs, 56, 40), new T.MeshBasicMaterial({ map: surface("#ffb52e", 3), color: 0xfff0b0 })); soleil.add(coeur);
  const peau = new T.Mesh(new T.SphereGeometry(rs * 1.04, 56, 40), new T.MeshBasicMaterial({ map: surface("#ffe27a", 9), transparent: true, opacity: .5, blending: T.AdditiveBlending, depthWrite: false })); soleil.add(peau);
  soleil.add(atmosphere(0xffc23a, rs * 1.28, 1.6)); monde.add(soleil);
  const halos = [lueur(0xffd23f, rs * 6.5), lueur(0xff9a1f, rs * 11, .5), lueur(0xb8f54a, rs * 17, .22)]; halos.forEach(h => monde.add(h));
  const rayons = new T.Group(); for (let i = 0; i < 12; i++) { const m = new T.Mesh(new T.PlaneGeometry(rs * (.16 + (i % 3) * .06), rs * (6 + (i % 4) * 1.4)), new T.MeshBasicMaterial({ color: 0xffd34a, transparent: true, opacity: .1 + (i % 3) * .03, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide })); m.rotation.z = i / 12 * Math.PI * 2; m.position.z = .01 * i; rayons.add(m); } monde.add(rayons);
  monde.add(new T.PointLight(0xfff0d0, 520, 0, 1.25));

  // --- le fond : trois couches d'étoiles à des profondeurs différentes, des nébuleuses ---
  const rond = (() => { const c = document.createElement("canvas"); c.width = c.height = 32; const g = c.getContext("2d"), r = g.createRadialGradient(16, 16, 1, 16, 16, 15); r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(0, 0, 32, 32); return new T.CanvasTexture(c); })();
  const couchesEtoiles = [[700, 120, .5], [500, 70, .8], [260, 40, 1.3]].map(([n, rr, taille], k) => { const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), r = alea(5 + k * 17);
    for (let i = 0; i < n; i++) { const u = r() * 2 - 1, a = r() * 6.283, d = rr * (.8 + r() * .4), s = Math.sqrt(1 - u * u); pos.set([d * s * Math.cos(a), d * u, d * s * Math.sin(a)], i * 3); const q = .55 + r() * .45, w = r(); col.set([q * (.8 + .2 * w), q, q * (.9 + .1 * (1 - w))], i * 3); }
    const g = new T.BufferGeometry(); g.setAttribute("position", new T.BufferAttribute(pos, 3)); g.setAttribute("color", new T.BufferAttribute(col, 3));
    const e = new T.Points(g, new T.PointsMaterial({ size: taille * 1.6, map: rond, vertexColors: true, transparent: true, opacity: .95, depthWrite: false, blending: T.AdditiveBlending, fog: false, sizeAttenuation: true })); scene.add(e); return e; });
  [[0x3a5bd9, -70, 18, -90, 90], [0xc23fd0, 80, -22, -110, 110], [0x1fb98a, -20, 40, -130, 120], [0xff7a3a, 40, 28, -95, 70]].forEach(([c, x, y, z, s]) => { const n = lueur(c, s, .3); n.position.set(x, y, z); n.material.fog = false; scene.add(n); });

  // --- la ceinture d'astéroïdes, entre la sixième et la septième orbite ---
  const nPl = donnees.planetes.length, orbiteDe = i => 3.4 + i * .72, rb = orbiteDe(Math.min(6, nPl)) - .36, ceinture = new T.Group();
  { const g = new T.IcosahedronGeometry(.07, 0), mat = new T.MeshStandardMaterial({ color: 0x8a8f99, roughness: .95 }), cnt = 260, im = new T.InstancedMesh(g, mat, cnt), r = alea(41), d = new T.Object3D();
    for (let i = 0; i < cnt; i++) { const a = r() * 6.283, rr = rb + (r() - .5) * .34; d.position.set(Math.cos(a) * rr, (r() - .5) * .22, Math.sin(a) * rr); d.rotation.set(r() * 6, r() * 6, 0); d.scale.setScalar(.5 + r() * 1.5); d.updateMatrix(); im.setMatrixAt(i, d.matrix); } ceinture.add(im); monde.add(ceinture); }

  // --- les planètes ---
  const P = [], hits = [], liste = donnees.planetes.slice(), ie = liste.findIndex(p => p.terre); if (ie > 2) liste.splice(2, 0, liste.splice(ie, 1)[0]);  // la Terre sur la troisième orbite : toujours bien en vue
  const orbiteMax = orbiteDe(liste.length - 1);
  liste.forEach((d, i) => {
    const orbite = orbiteDe(i), estTerre = !!d.terre, a0 = estTerre ? Math.PI / 2 - .3 : i * 2.399963 + .6, rayon = estTerre ? 1.25 : .55 + .38 * d.progres, grp = new T.Group(), c0 = new T.Color(d.couleur);
    // le chemin de l'orbite : pâle en entier, vif jusqu'à l'avancement
    const trace = new T.Mesh(new T.RingGeometry(orbite - .014, orbite + .014, 180), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .09, side: T.DoubleSide, depthWrite: false })); trace.rotation.x = -Math.PI / 2; monde.add(trace);
    if (d.progres > 0) { const av = new T.Mesh(new T.RingGeometry(orbite - .035, orbite + .035, 180, 1, 0, Math.min(.9999, d.progres) * Math.PI * 2), new T.MeshBasicMaterial({ color: c0, transparent: true, opacity: .85, side: T.DoubleSide, blending: T.AdditiveBlending, depthWrite: false })); av.rotation.x = -Math.PI / 2; monde.add(av); }
    const terne = new T.Color(0x6b6f66).lerp(c0, .38 + .62 * Math.min(1, d.progres * 3)), carte = estTerre ? null : surface(d.couleur, hash(d.id));
    const mat = new T.MeshStandardMaterial({ color: estTerre ? 0xffffff : terne, map: carte, bumpMap: estTerre ? null : surface(d.couleur, hash(d.id), true), bumpScale: 1.6, roughness: .82, metalness: .02, emissive: c0, emissiveIntensity: estTerre ? .04 : .03 + .16 * d.progres });
    const corps = new T.Mesh(new T.SphereGeometry(rayon, 56, 40), mat); corps.rotation.z = .25 + (i % 3) * .1; grp.add(corps);
    let nu = null; if (estTerre) { terre().then(t => { mat.map = t; mat.needsUpdate = true; }); nu = new T.Mesh(new T.SphereGeometry(rayon * 1.025, 40, 28), new T.MeshStandardMaterial({ map: nuages(), transparent: true, opacity: .7, depthWrite: false, roughness: 1 })); grp.add(nu); }
    grp.add(atmosphere(d.couleur, rayon * (estTerre ? 1.2 : 1.16), estTerre ? 1.5 : .6 + .9 * d.progres));
    const aura = lueur(d.couleur, rayon * (estTerre ? 5 : 3.6), .35); aura.material.opacity = .25 + .6 * d.progres; aura.material.fog = false; grp.add(aura);
    // l'anneau de progression, incliné comme celui de Saturne
    const anneau = new T.Group(), Ri = rayon * 1.5, Re = rayon * 1.68;
    anneau.add(new T.Mesh(new T.RingGeometry(Ri, Re, 72), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .13, side: T.DoubleSide, depthWrite: false })));
    if (d.progres > 0) anneau.add(new T.Mesh(new T.RingGeometry(Ri - .012, Re + .012, 72, 1, Math.PI / 2, Math.min(.9999, d.progres) * Math.PI * 2), new T.MeshBasicMaterial({ color: 0xb8f54a, side: T.DoubleSide, transparent: true, opacity: .96 })));
    anneau.rotation.x = Math.PI / 2 - .5; anneau.rotation.y = .25; grp.add(anneau);
    // les lunes : une de plus à chaque cinquième de chemin (la Terre garde la sienne)
    const nl = estTerre ? 1 : Math.min(5, Math.floor(d.progres * 5.2)), lunes = [];
    for (let m = 0; m < nl; m++) { const lune = new T.Mesh(new T.SphereGeometry(rayon * (.16 + (m % 2) * .04), 16, 12), new T.MeshStandardMaterial({ color: new T.Color(d.couleur).lerp(new T.Color(0xdddddd), .6), roughness: .9 })); lunes.push({ lune, r: rayon * (2.05 + m * .42), a: m * 1.7, v: .55 - m * .06, inc: .25 + m * .2 }); grp.add(lune); }
    const toucher = new T.Mesh(new T.SphereGeometry(rayon * 2.2, 12, 8), new T.MeshBasicMaterial({ visible: false })); toucher.userData.id = d.id; grp.add(toucher); hits.push(toucher);
    monde.add(grp);
    const bouton = document.createElement("button"); bouton.type = "button"; bouton.className = "gal-etiquette" + (estTerre ? " terre" : ""); bouton.dataset.id = d.id; bouton.style.setProperty("--k", d.couleur);
    bouton.innerHTML = `<b></b><span></span>`; bouton.querySelector("b").textContent = d.court || d.nom; bouton.querySelector("span").textContent = Math.round(d.progres * 100) + " %"; bouton.setAttribute("aria-label", `${d.nom}, ${Math.round(d.progres * 100)} pour cent`);
    bouton.onclick = () => choisir(d.id); conteneur.appendChild(bouton);
    P.push({ d, grp, corps, nu, anneau, aura, lunes, orbite, a: a0, vit: reduit ? 0 : estTerre ? .012 : .05 / Math.sqrt(orbite / 3.4) * (i % 2 ? 1 : .9), rayon, bouton });
  });

  // --- la caméra : on vole autour de la cible ---
  const vu = new T.Vector3(), cibleT = new T.Vector3(); let decal = 0, focus = null, pauseJusqua = 0, raf = 0, glisse = null, depart = null;
  let D0 = 7 + 1.05 * orbiteMax; const etat = { yaw: .3, pitch: .7, dist: D0 * 2.4, tx: 0, ty: 0, tz: 0 }, but = { yaw: .3, pitch: .7, dist: D0, tx: 0, ty: 0, tz: 0, zoom: 1 }, para = { x: 0, y: 0 };
  let t0 = performance.now(), dernier = t0; if (reduit) Object.assign(etat, but);
  function taille() { const w = canvas.clientWidth || 320, h = canvas.clientHeight || 320; rendu.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); rendu.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
    D0 = Math.max(7 + 1.05 * orbiteMax, orbiteMax * .78 / (Math.tan(26 * Math.PI / 180) * Math.min(1, cam.aspect))); if (!focus) but.dist = D0 / but.zoom; if (reduit) image(performance.now()); }  // tout le système tient dans l'écran, même en portrait
  taille(); addEventListener("resize", taille); const suivi = typeof ResizeObserver === "function" ? new ResizeObserver(taille) : null; if (suivi) suivi.observe(canvas);
  const pause = () => { pauseJusqua = performance.now() + 2500; };
  function choisir(id) { focus = id; P.forEach(p => p.bouton.setAttribute("aria-pressed", String(p.d.id === id))); const p = P.find(x => x.d.id === id); if (p) but.dist = p.rayon * 6.5 + 3.2; onChoix(id); if (reduit) image(performance.now()); }
  function retour() { const etait = focus; focus = null; P.forEach(p => p.bouton.setAttribute("aria-pressed", "false")); but.dist = D0 / but.zoom; if (etait) onRetour(); if (reduit) image(performance.now()); }
  // glisser : tourner ; molette ou pincement : zoomer ; toucher une planète : plonger vers elle ; toucher le vide : revenir
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
    if (!enPause && !reduit && !focus) but.yaw += dt * .035;                               // dérive lente quand personne ne touche
    const k = reduit ? 1 : 1 - Math.pow(.0009, dt);                                       // lissage indépendant du nombre d'images par seconde
    for (const q of ["yaw", "pitch", "dist", "tx", "ty", "tz"]) etat[q] += (but[q] - etat[q]) * k * (q === "dist" ? .8 : 1);
    // la cible suit la planète choisie
    const p0 = focus && P.find(x => x.d.id === focus); if (p0) { p0.grp.getWorldPosition(cibleT); but.tx = cibleT.x; but.ty = cibleT.y; but.tz = cibleT.z; } else { but.tx = but.ty = but.tz = 0; }
    const yaw = etat.yaw + para.x * .1, pitch = bornes(etat.pitch + para.y * .06, .05, 1.45), D = etat.dist * (1 + (enPause ? 0 : .012 * Math.sin(s * .5)));
    cam.position.set(etat.tx + Math.sin(yaw) * Math.cos(pitch) * D, etat.ty + Math.sin(pitch) * D + (reduit || enPause ? 0 : Math.sin(s * .4) * .25), etat.tz + Math.cos(yaw) * Math.cos(pitch) * D); cam.lookAt(etat.tx, etat.ty, etat.tz);
    coeur.rotation.y = s * .06; peau.rotation.y = -s * .09; peau.rotation.x = s * .02; rayons.quaternion.copy(cam.quaternion); rayons.rotateZ(s * .03);
    halos[0].material.opacity = .9 + .1 * Math.sin(s * 1.9); halos[1].material.opacity = .85 + .15 * Math.sin(s * 1.1 + 1);
    ceinture.rotation.y = s * .01;
    P.forEach(p => { if (!enPause) p.a += p.vit * dt; p.grp.position.set(Math.cos(p.a) * p.orbite, 0, Math.sin(p.a) * p.orbite); p.corps.rotation.y += dt * (.2 + p.d.progres * .15); if (p.nu) p.nu.rotation.y += dt * .3;
      const sel = focus === p.d.id; p.anneau.rotation.z = sel ? s * .5 : 0; p.grp.scale.setScalar(sel ? 1.12 : 1); p.aura.material.opacity = (.25 + .6 * p.d.progres) * (sel ? 1.6 : 1);
      p.lunes.forEach(m => { m.a += m.v * dt * 1.4; m.lune.position.set(Math.cos(m.a) * m.r, Math.sin(m.a * .7) * m.r * Math.sin(m.inc) * .5, Math.sin(m.a) * m.r); }); });
    // les étiquettes suivent les planètes, plus petites et plus pâles quand elles sont loin
    const W2 = canvas.clientWidth, H2 = canvas.clientHeight;
    P.forEach(p => { p.grp.getWorldPosition(vu); const dist = vu.distanceTo(cam.position); vu.y -= p.rayon * 1.8; vu.project(cam); const x = (vu.x * .5 + .5) * W2, y = (-vu.y * .5 + .5) * H2, ech = bornes(D0 * .85 / dist, .72, 1.25);
      p.bouton.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, 0) scale(${ech.toFixed(2)})`; p.bouton.style.opacity = vu.z < 1 ? String(bornes(1.15 - (dist - D0 * .5) / (D0 * 1.3), .35, 1)) : "0"; p.bouton.style.zIndex = String(Math.round(1000 - dist * 10)); });
    decal += ((focus ? H2 * .2 : 0) - decal) * k; if (Math.abs(decal) > .5) cam.setViewOffset(W2, H2, 0, decal, W2, H2); else cam.clearViewOffset();  // la planète choisie monte : la fenêtre prend le bas de la scène
    couchesEtoiles.forEach((e, q) => { e.rotation.y = s * .002 * (q + 1); }); rendu.render(scene, cam);
  }
  function boucle(tm) { raf = 0; if (!document.body.contains(canvas)) return arreter(); if (!document.hidden) image(tm); if (!reduit) raf = requestAnimationFrame(boucle); }
  function arreter() { cancelAnimationFrame(raf); removeEventListener("resize", taille); if (suivi) suivi.disconnect(); rendu.dispose(); }
  raf = requestAnimationFrame(boucle); if (reduit) image(performance.now());
  return { choisir, retour, arreter };
}
