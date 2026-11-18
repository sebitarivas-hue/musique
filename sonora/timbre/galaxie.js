// La galaxie de l'élève, en 3D : un soleil (son niveau et ses points), des planètes qui sont les contenus du site, chacune avec un anneau
// qui se remplit à mesure qu'on avance, et la Terre, qui mène à l'Atlas. Un geste sur une planète la choisit ; glisser fait tourner la galaxie.
// Les étiquettes sont de vrais boutons HTML posés au-dessus du canevas (clavier, lecteur d'écran). Three.js (licence MIT) est dans vendor/.
// Les continents de la Terre viennent de terres.json (Natural Earth, domaine public).
import * as T from "./vendor/three.module.min.js?v=5d6bbba4e3";

const alea = graine => { let s = graine >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; };
const hash = t => { let h = 7; for (const c of String(t)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
const clair = (hex, k) => { const c = new T.Color(hex); c.offsetHSL(0, 0, k); return c; };

// Une surface de planète : des bandes et des taches de la couleur du contenu (le dessin ne dit rien d'autre que « un autre monde »).
function surface(couleur, graine) {
  const W = 512, H = 256, cv = document.createElement("canvas"); cv.width = W; cv.height = H; const g = cv.getContext("2d"), r = alea(graine), c = new T.Color(couleur);
  const css = (k, a = 1) => { const x = c.clone().offsetHSL(0, 0, k); return `rgba(${Math.round(x.r * 255)},${Math.round(x.g * 255)},${Math.round(x.b * 255)},${a})`; };
  g.fillStyle = css(0); g.fillRect(0, 0, W, H);
  for (let i = 0; i < 16; i++) { const y = r() * H, h = 6 + r() * 34; g.fillStyle = css((r() - .5) * .3, .5); g.fillRect(0, y, W, h); }
  for (let i = 0; i < 90; i++) { g.fillStyle = css((r() - .5) * .4, .22); g.beginPath(); g.ellipse(r() * W, r() * H, 8 + r() * 46, 3 + r() * 14, 0, 0, 7); g.fill(); }
  const t = new T.CanvasTexture(cv); t.colorSpace = T.SRGBColorSpace; return t;
}

// La Terre : océan, vrais continents (terres.json), calotte et nuages.
async function terre() {
  const W = 1024, H = 512, cv = document.createElement("canvas"); cv.width = W; cv.height = H; const g = cv.getContext("2d");
  const mer = g.createLinearGradient(0, 0, 0, H); mer.addColorStop(0, "#1b4fa8"); mer.addColorStop(.5, "#1f6fe0"); mer.addColorStop(1, "#1b4fa8"); g.fillStyle = mer; g.fillRect(0, 0, W, H);
  let polys = []; try { polys = await (await fetch(new URL("terres.json", import.meta.url))).json(); } catch (_) {}
  const xy = ([lo, la]) => [(lo + 180) / 360 * W, (90 - la) / 180 * H];
  g.fillStyle = "#3f9b4a"; g.strokeStyle = "#2c7a3a"; g.lineWidth = 1.2;
  for (const anneau of polys) { g.beginPath(); anneau.forEach((p, i) => { const [x, y] = xy(p); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); g.fill(); g.stroke(); }  // terres.json : une liste d'anneaux [longitude, latitude]
  g.fillStyle = "rgba(255,255,255,.85)"; g.fillRect(0, 0, W, 14); g.fillRect(0, H - 26, W, 26);
  const nu = alea(11); g.fillStyle = "rgba(255,255,255,.14)"; for (let i = 0; i < 70; i++) { g.beginPath(); g.ellipse(nu() * W, nu() * H, 20 + nu() * 70, 4 + nu() * 12, 0, 0, 7); g.fill(); }
  const t = new T.CanvasTexture(cv); t.colorSpace = T.SRGBColorSpace; return t;
}

const lueur = (couleur, taille) => { const cv = document.createElement("canvas"); cv.width = cv.height = 128; const g = cv.getContext("2d"), r = g.createRadialGradient(64, 64, 4, 64, 64, 64), c = new T.Color(couleur);
  const rgb = `${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)}`; r.addColorStop(0, `rgba(${rgb},.9)`); r.addColorStop(.35, `rgba(${rgb},.28)`); r.addColorStop(1, `rgba(${rgb},0)`); g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  const s = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(cv), transparent: true, blending: T.AdditiveBlending, depthWrite: false })); s.scale.set(taille, taille, 1); return s; };

export function monterGalaxie(canvas, conteneur, donnees, { onChoix = () => {}, choisi = null } = {}) {
  let rendu; try { rendu = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" }); } catch (_) { return null; }
  const reduit = matchMedia("(prefers-reduced-motion: reduce)").matches, scene = new T.Scene(), cam = new T.PerspectiveCamera(42, 1, .1, 200), monde = new T.Group(); scene.add(monde);
  rendu.outputColorSpace = T.SRGBColorSpace; rendu.setClearColor(0x000000, 0);
  scene.add(new T.AmbientLight(0x6a7a8a, .9));
  // le soleil : sa taille grandit avec le niveau
  const niv = donnees.soleil.niveau, rs = 1.1 + .07 * niv, soleil = new T.Mesh(new T.SphereGeometry(rs, 48, 32), new T.MeshBasicMaterial({ color: 0xffe066 }));
  const sCorps = new T.Mesh(new T.SphereGeometry(rs * 1.02, 48, 32), new T.MeshBasicMaterial({ map: surface("#ffcf33", 3), transparent: true, opacity: .55 })); soleil.add(sCorps); monde.add(soleil);
  const halo = lueur(0xffd23f, rs * 7.5); monde.add(halo); const halo2 = lueur(0xb8f54a, rs * 12); halo2.material.opacity = .45; monde.add(halo2);
  const lumiere = new T.PointLight(0xfff0c0, 90, 60, 1.6); monde.add(lumiere);
  // les étoiles du fond
  const N = 900, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), r0 = alea(5); for (let i = 0; i < N; i++) { const u = r0() * 2 - 1, a = r0() * 6.283, rr = 40 + r0() * 50, s = Math.sqrt(1 - u * u); pos.set([rr * s * Math.cos(a), rr * u, rr * s * Math.sin(a)], i * 3); const k = .6 + r0() * .4, t = r0(); col.set([k * (.8 + .2 * t), k, k * (.9 + .1 * (1 - t))], i * 3); }
  const bg = new T.BufferGeometry(); bg.setAttribute("position", new T.BufferAttribute(pos, 3)); bg.setAttribute("color", new T.BufferAttribute(col, 3));
  const etoiles = new T.Points(bg, new T.PointsMaterial({ size: .22, vertexColors: true, transparent: true, opacity: .9, depthWrite: false, blending: T.AdditiveBlending })); scene.add(etoiles);
  // les planètes
  const P = [], hits = [], liste = donnees.planetes.slice(), ie = liste.findIndex(p => p.terre); if (ie > 2) liste.splice(2, 0, liste.splice(ie, 1)[0]);  // la Terre sur la troisième orbite : toujours bien en vue
  liste.forEach((d, i) => {
    const orbite = 3 + i * .82, estTerre = !!d.terre, a0 = estTerre ? Math.PI / 2 - .3 : i * 2.399963 + .6, rayon = estTerre ? 1.2 : .52 + .34 * d.progres, grp = new T.Group();
    const trace = new T.Mesh(new T.RingGeometry(orbite - .012, orbite + .012, 160), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .09, side: T.DoubleSide })); trace.rotation.x = -Math.PI / 2; monde.add(trace);
    const gris = new T.Color(0x6b6f66), c0 = new T.Color(d.couleur), coul = gris.clone().lerp(c0, .35 + .65 * Math.min(1, d.progres * 3));
    const mat = new T.MeshStandardMaterial({ color: estTerre ? 0xffffff : coul, map: estTerre ? null : surface(d.couleur, hash(d.id)), roughness: .85, metalness: 0, emissive: estTerre ? 0x0a1a3a : c0, emissiveIntensity: estTerre ? .5 : .06 + .3 * d.progres });
    const corps = new T.Mesh(new T.SphereGeometry(rayon, 40, 28), mat); grp.add(corps);
    if (estTerre) terre().then(t => { mat.map = t; mat.needsUpdate = true; });
    if (estTerre) { const nu = new T.Mesh(new T.SphereGeometry(rayon * 1.03, 32, 24), new T.MeshBasicMaterial({ color: 0x9ed0ff, transparent: true, opacity: .16, depthWrite: false })); grp.add(nu); grp.userData.atmo = nu; }
    const aura = lueur(d.couleur, rayon * (estTerre ? 5.2 : 4)); aura.material.opacity = .25 + .6 * d.progres; grp.add(aura);
    // l'anneau : un cercle pâle (tout le chemin) et un arc vif (ce qui est fait)
    const anneau = new T.Group(), Ri = rayon * 1.45, Re = rayon * 1.62;
    anneau.add(new T.Mesh(new T.RingGeometry(Ri, Re, 72), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .14, side: T.DoubleSide })));
    if (d.progres > 0) { const arc = new T.Mesh(new T.RingGeometry(Ri - .01, Re + .01, 72, 1, Math.PI / 2, Math.min(.9999, d.progres) * Math.PI * 2), new T.MeshBasicMaterial({ color: 0xb8f54a, side: T.DoubleSide, transparent: true, opacity: .95 })); anneau.add(arc); anneau.userData.arc = arc; }
    anneau.rotation.x = Math.PI / 2 - .5; anneau.rotation.y = .25; grp.add(anneau);
    const toucher = new T.Mesh(new T.SphereGeometry(rayon * 2.1, 12, 8), new T.MeshBasicMaterial({ visible: false })); toucher.userData.id = d.id; grp.add(toucher); hits.push(toucher);
    monde.add(grp);
    const bouton = document.createElement("button"); bouton.type = "button"; bouton.className = "gal-etiquette" + (estTerre ? " terre" : ""); bouton.dataset.id = d.id; bouton.style.setProperty("--k", d.couleur);
    bouton.innerHTML = `<b></b><span></span>`; bouton.querySelector("b").textContent = d.nom; bouton.querySelector("span").textContent = Math.round(d.progres * 100) + " %"; bouton.setAttribute("aria-label", `${d.nom}, ${Math.round(d.progres * 100)} pour cent`);
    bouton.onclick = () => choisir(d.id); conteneur.appendChild(bouton);
    P.push({ d, grp, corps, anneau, aura, orbite, a: a0, vit: reduit ? 0 : estTerre ? 0 : .05 / Math.sqrt(orbite / 3) * (i % 2 ? 1 : .9), rayon, bouton });
  });
  let pauseJusqua = 0, focus = null, yaw = .3, pitch = .9, zoom = 1, cible = { yaw, pitch, zoom }, glisse = null, raf = 0, t0 = performance.now(), dernier = t0, vu = new T.Vector3();
  function taille() { const w = canvas.clientWidth || 320, h = canvas.clientHeight || 320; rendu.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); rendu.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
  taille(); addEventListener("resize", taille);
  function choisir(id) { focus = id; P.forEach(p => p.bouton.setAttribute("aria-pressed", String(p.d.id === id))); const p = P.find(x => x.d.id === id); if (p) onChoix(id); if (reduit) image(performance.now()); }
  // glisser : tourner ; molette ou pincement : zoomer ; toucher une planète : la choisir
  const ray = new T.Raycaster(), ptr = new T.Vector2(); let depart = null;
  const pause = () => { pauseJusqua = performance.now() + 2500; };
  conteneur.parentElement.addEventListener("pointermove", pause); conteneur.parentElement.addEventListener("pointerdown", pause); conteneur.addEventListener("focusin", pause);
  canvas.addEventListener("pointerdown", e => { glisse = { x: e.clientX, y: e.clientY, yaw: cible.yaw, pitch: cible.pitch }; depart = { x: e.clientX, y: e.clientY, t: performance.now() }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener("pointermove", e => { if (!glisse) return; cible.yaw = glisse.yaw - (e.clientX - glisse.x) / 220; cible.pitch = Math.max(.15, Math.min(1.35, glisse.pitch + (e.clientY - glisse.y) / 260)); if (reduit) image(performance.now()); });
  canvas.addEventListener("pointerup", e => { const court = depart && Math.hypot(e.clientX - depart.x, e.clientY - depart.y) < 8 && performance.now() - depart.t < 500; glisse = null;
    if (court) { const r = canvas.getBoundingClientRect(); ptr.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ptr, cam); const h = ray.intersectObjects(hits, false)[0]; if (h) choisir(h.object.userData.id); } });
  canvas.addEventListener("wheel", e => { e.preventDefault(); cible.zoom = Math.max(.55, Math.min(1.6, cible.zoom * (e.deltaY > 0 ? 1.08 : .93))); if (reduit) image(performance.now()); }, { passive: false });
  function image(t) {
    const dt = Math.min(.05, (t - dernier) / 1000); dernier = t; const s = (t - t0) / 1000;
    yaw += (cible.yaw - yaw) * .12; pitch += (cible.pitch - pitch) * .12; zoom += (cible.zoom - zoom) * .12; if (!glisse && !reduit && !focus) cible.yaw += dt * .02;
    const R = 23 / zoom, w = canvas.clientWidth || 320; cam.position.set(Math.sin(yaw) * Math.cos(pitch) * R, Math.sin(pitch) * R, Math.cos(yaw) * Math.cos(pitch) * R * (w < 500 ? 1.3 : 1)); cam.lookAt(0, 0, 0);
    soleil.rotation.y = s * .1; halo.material.opacity = .85 + .1 * Math.sin(s * 1.7);
    const enPause = t < pauseJusqua || !!glisse;  // les orbites s'arrêtent tant que le doigt ou la souris est sur la scène : une étiquette est facile à toucher
    P.forEach(p => { if (!enPause) p.a += p.vit * dt; p.grp.position.set(Math.cos(p.a) * p.orbite, 0, Math.sin(p.a) * p.orbite); p.corps.rotation.y += dt * .25; const sel = focus === p.d.id;
      p.anneau.rotation.z = sel ? s * .6 : 0; p.grp.scale.setScalar(sel ? 1.28 : 1); p.aura.material.opacity = (.25 + .6 * p.d.progres) * (sel ? 1.5 : 1); });
    // les étiquettes suivent les planètes
    const W2 = canvas.clientWidth, H2 = canvas.clientHeight;
    P.forEach(p => { p.grp.getWorldPosition(vu); vu.y -= p.rayon * 1.9; vu.project(cam); const x = (vu.x * .5 + .5) * W2, y = (-vu.y * .5 + .5) * H2; p.bouton.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, 0)`; p.bouton.style.opacity = vu.z < 1 ? 1 : 0; });
    etoiles.rotation.y = s * .004; rendu.render(scene, cam);
  }
  function boucle(t) { raf = 0; if (!document.body.contains(canvas)) return arreter(); if (!document.hidden) image(t); if (!reduit) raf = requestAnimationFrame(boucle); }
  function arreter() { cancelAnimationFrame(raf); removeEventListener("resize", taille); rendu.dispose(); }
  raf = requestAnimationFrame(boucle); if (reduit) image(performance.now());
  if (choisi) setTimeout(() => choisir(choisi), 0);
  return { choisir, arreter };
}
