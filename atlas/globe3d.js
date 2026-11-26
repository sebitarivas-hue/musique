// Le globe de l'Atlas (17/11/2026, demande de Sébastien : « au lieu d'être une carte, un globe 3D », avec des fiches qui s'ouvrent en fenêtres à droite).
// Ce module ne dessine que le globe : la Terre, les points des musiques, la caméra et le vol d'une musique à l'autre.
// Les fenêtres, les filtres et la recherche sont dans la page de l'Atlas (gabarit.html), qui appelle cette API.
// Les continents viennent de sonora/timbre/terres.json (Natural Earth, domaine public). Three.js (licence MIT) est dans sonora/timbre/vendor/.
import * as T from "../sonora/timbre/vendor/three.module.min.js?v=d76f27378a";

const R = 10, DEG = Math.PI / 180, DMIN = R * 1.18, DMAX = R * 4.2;
const vers = (lon, lat, r = R) => new T.Vector3(r * Math.cos(lat * DEG) * Math.sin(lon * DEG), r * Math.sin(lat * DEG), r * Math.cos(lat * DEG) * Math.cos(lon * DEG));
const borne = (x, a, b) => Math.max(a, Math.min(b, x));
const lisse = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

function carteTerre(terres, frontieres) {
  const W = 2048, H = 1024, c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d");
  const fond = g.createLinearGradient(0, 0, 0, H); fond.addColorStop(0, "#0a1d48"); fond.addColorStop(.5, "#0d2a62"); fond.addColorStop(1, "#0a1d48"); g.fillStyle = fond; g.fillRect(0, 0, W, H);
  const X = lon => (lon + 180) / 360 * W, Y = lat => (90 - lat) / 180 * H;
  g.strokeStyle = "rgba(120,170,255,.13)"; g.lineWidth = 1;
  for (let lo = -180; lo <= 180; lo += 15) { g.beginPath(); g.moveTo(X(lo), 0); g.lineTo(X(lo), H); g.stroke(); }
  for (let la = -75; la <= 75; la += 15) { g.beginPath(); g.moveTo(0, Y(la)); g.lineTo(W, Y(la)); g.stroke(); }
  const ligne = (p, ferme) => { p.forEach(([lo, la], i) => { const x = X(lo), y = Y(la); if (i && Math.abs(lo - p[i - 1][0]) > 180) g.moveTo(x, y); else if (i) g.lineTo(x, y); else g.moveTo(x, y); }); if (ferme) g.closePath(); };
  const trace = () => { g.beginPath(); terres.forEach(p => ligne(p, true)); };
  trace(); g.fillStyle = "#1f6f62"; g.fill("evenodd");
  g.strokeStyle = "rgba(170,255,220,.38)"; g.lineWidth = 1.1; g.setLineDash([4, 3]);
  (frontieres || []).forEach(l => { g.beginPath(); ligne(l, false); g.stroke(); });
  g.setLineDash([]);
  g.save(); g.shadowColor = "#7dffd0"; g.shadowBlur = 10; g.strokeStyle = "rgba(160,255,214,.85)"; g.lineWidth = 1.6; trace(); g.stroke(); g.restore();
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; return t;
}

function halo() {
  const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d"), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(.3, "rgba(255,255,255,.5)"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  return new T.CanvasTexture(c);
}

// Un arc de grand cercle, qui monte d'autant plus haut que le voyage est long.
function arc(a, b) {
  const va = vers(a[0], a[1], 1), vb = vers(b[0], b[1], 1), ang = va.angleTo(vb), haut = .25 + 2.2 * ang / Math.PI;
  return t => { const s = Math.sin(ang) < 1e-4 ? va.clone() : va.clone().multiplyScalar(Math.sin((1 - t) * ang) / Math.sin(ang)).add(vb.clone().multiplyScalar(Math.sin(t * ang) / Math.sin(ang)));
    return s.normalize().multiplyScalar(R + .1 + haut * Math.sin(Math.PI * t)); };
}

/* zone : l'élément qui contient le canvas (sa taille fixe celle du globe).
   options : { terres, frontieres, pays, auToucher(ids), auSurvol(id | null, x, y) }
   Rend null si WebGL n'est pas disponible : la page garde alors la carte à plat. */
export function monterGlobe(canvas, zone, { terres, frontieres = [], pays = [], auToucher = () => {}, auSurvol = () => {}, obstacles = () => null, ralenti = () => false }) {
  let rendu; try { rendu = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" }); } catch (_) { return null; }
  if (!rendu.getContext()) return null;
  const reduit = matchMedia("(prefers-reduced-motion: reduce)").matches, scene = new T.Scene(), cam = new T.PerspectiveCamera(40, 1, .1, 400), H = halo();
  rendu.outputColorSpace = T.SRGBColorSpace; rendu.setClearColor(0x000000, 0);
  scene.add(new T.AmbientLight(0x6f86c8, 1.1)); const soleil = new T.DirectionalLight(0xfff1d6, 1.4); scene.add(soleil);
  const terre = new T.Mesh(new T.SphereGeometry(R, 96, 64), new T.MeshPhongMaterial({ map: carteTerre(terres, frontieres), shininess: 18, specular: 0x24406e })); scene.add(terre);
  terre.rotation.y = -Math.PI / 2;   // même quart de tour que le globe du quiz : la sphère de three.js et vers() n'ont pas la même origine de longitude
  scene.add(new T.Mesh(new T.SphereGeometry(R * 1.12, 64, 48), new T.ShaderMaterial({ side: T.BackSide, transparent: true, blending: T.AdditiveBlending, depthWrite: false,
    vertexShader: "varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: "varying vec3 vN; void main(){ float i = pow(0.72 - dot(vN, vec3(0.0, 0.0, 1.0)), 3.0); gl_FragColor = vec4(0.32, 0.68, 1.0, 1.0) * i; }" })));
  const ep = []; for (let i = 0; i < 1400; i++) { const v = new T.Vector3().randomDirection().multiplyScalar(160 + Math.random() * 80); ep.push(v.x, v.y, v.z); }
  const eg = new T.BufferGeometry(); eg.setAttribute("position", new T.Float32BufferAttribute(ep, 3)); scene.add(new T.Points(eg, new T.PointsMaterial({ color: 0xcfd8ff, size: .7, sizeAttenuation: true, transparent: true, opacity: .8 })));

  // Les noms des pays : droits, sur la face tournée vers nous ; les petits pays seulement de près.
  const noms = pays.map(([nom, lon, lat, rang]) => {
    const c = document.createElement("canvas"), g = c.getContext("2d"), px = rang === 1 ? 46 : rang === 2 ? 38 : 30, police = `${rang === 1 ? 800 : 700} ${px}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    g.font = police; const tx = rang === 1 ? nom.toUpperCase() : nom, w = Math.ceil(g.measureText(tx).width) + 24; c.width = w; c.height = px + 18;
    g.font = police; g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round"; g.lineWidth = 6; g.strokeStyle = "rgba(4,10,30,.85)"; g.strokeText(tx, w / 2, c.height / 2);
    g.fillStyle = rang === 1 ? "#f3fff9" : rang === 2 ? "#d8f7ea" : "#bfe9d8"; g.fillText(tx, w / 2, c.height / 2);
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.minFilter = T.LinearFilter;
    const s = new T.Sprite(new T.SpriteMaterial({ map: t, transparent: true, depthWrite: false, depthTest: false, opacity: 0 })), h = rang === 1 ? .42 : rang === 2 ? .3 : .22;
    s.scale.set(h * c.width / c.height, h, 1); s.position.copy(vers(lon, lat, R + .06)); s.userData = { rang, n: s.position.clone().normalize() }; s.renderOrder = 2; scene.add(s); return s;
  });

  // Les musiques : un point par entrée, rond, à la couleur de sa famille, caché sur la face de derrière.
  const matPts = new T.ShaderMaterial({ transparent: true, depthWrite: false,
    uniforms: { dpr: { value: 1 }, horizon: { value: .3 }, echelle: { value: 1 } },
    vertexShader: "attribute vec3 couleur; attribute float taille; attribute float classe; uniform float dpr; uniform float horizon; uniform float echelle; varying vec3 vC; varying float vA; varying float vK;" +
      "void main(){ vC = couleur; vK = classe; float f = dot(normalize(position), normalize(cameraPosition)); vA = smoothstep(horizon - .015, horizon + .05, f); gl_PointSize = taille * dpr * echelle * vA; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: "varying vec3 vC; varying float vA; varying float vK; void main(){ if (vA < .02) discard; float d = length(gl_PointCoord - .5); if (d > .5) discard; float bord = smoothstep(.33, .41, d); gl_FragColor = vec4(mix(vC, vK > .5 ? vec3(.84, 1.0, 0.0) : vec3(1.0), bord), 1.0); }" });
  const calqueNoms = document.createElement("div"); calqueNoms.className = "g-noms"; calqueNoms.setAttribute("aria-hidden", "true"); zone.appendChild(calqueNoms); let dernierNoms = 0, nomsVides = true;
  let pts = null, liste = [], pos3 = [];
  const choisie = new T.Group(); scene.add(choisie);
  function majPoints(L) {   // L : [{ id, lon, lat, c }]
    if (pts) { scene.remove(pts); pts.geometry.dispose(); }
    liste = L; pos3 = L.map(p => vers(p.lon, p.lat, R + .02));
    const g = new T.BufferGeometry(), P = new Float32Array(L.length * 3), C = new Float32Array(L.length * 3), S = new Float32Array(L.length), K = new Float32Array(L.length), col = new T.Color();
    L.forEach((p, i) => { P.set([pos3[i].x, pos3[i].y, pos3[i].z], i * 3); col.set(p.c); C.set([col.r, col.g, col.b], i * 3); S[i] = p.cours ? 12 : 8; K[i] = p.cours ? 1 : 0; });
    g.setAttribute("position", new T.BufferAttribute(P, 3)); g.setAttribute("couleur", new T.BufferAttribute(C, 3)); g.setAttribute("taille", new T.BufferAttribute(S, 1)); g.setAttribute("classe", new T.BufferAttribute(K, 1));
    pts = new T.Points(g, matPts); pts.frustumCulled = false; pts.renderOrder = 3; scene.add(pts);
  }

  // La musique choisie : un anneau et un faisceau qui pulsent.
  function marquer(lonlat, couleur) {
    choisie.clear(); if (!lonlat) return;
    const n = vers(lonlat[0], lonlat[1], 1), c = new T.Color(couleur), g = new T.Group();
    const anneau = new T.Mesh(new T.RingGeometry(.2, .3, 40), new T.MeshBasicMaterial({ color: c, transparent: true, opacity: .95, side: T.DoubleSide, depthWrite: false }));
    const faisceau = new T.Mesh(new T.CylinderGeometry(.02, .07, 2, 8, 1, true), new T.MeshBasicMaterial({ color: c, transparent: true, opacity: .55, blending: T.AdditiveBlending, depthWrite: false }));
    faisceau.position.y = 1; anneau.rotation.x = -Math.PI / 2; g.add(anneau, faisceau);
    const s = new T.Sprite(new T.SpriteMaterial({ map: H, color: c, transparent: true, blending: T.AdditiveBlending, depthWrite: false })); s.scale.setScalar(1); s.position.y = .06; g.add(s);
    g.position.copy(n.clone().multiplyScalar(R + .03)); g.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), n); g.userData = { t0: performance.now(), anneau }; choisie.add(g);
  }

  // Le trait lumineux d'une musique à l'autre : il se dessine pendant le vol de la caméra, puis s'efface.
  const traits = new T.Group(); scene.add(traits); let trait = null;
  const lueur = new T.Sprite(new T.SpriteMaterial({ map: H, color: 0xd6ff00, transparent: true, blending: T.AdditiveBlending, depthWrite: false, opacity: 0 })); lueur.scale.setScalar(.7); scene.add(lueur);

  // La caméra : on tourne autour de la Terre en visant un point (lon, lat) à une distance.
  const V = { lon: 8, lat: 22, dist: R * 3.1 }, but = { ...V };
  let vol = null, inertie = [0, 0], dernierGeste = performance.now() - 99999, auto = !reduit, decal = [0, 0], decalBut = [0, 0], sale = true;
  function aller(lon, lat, dist, de) {   // un vol de la caméra, par le chemin le plus court
    let dl = lon - V.lon; while (dl > 180) dl -= 360; while (dl < -180) dl += 360;
    const ang = Math.hypot(dl * Math.cos(V.lat * DEG), lat - V.lat);
    vol = { l0: V.lon, la0: V.lat, d0: V.dist, dl, lat, dist: dist ?? V.dist, t0: performance.now(), duree: reduit ? 1 : 700 + Math.min(1500, ang * 20), hop: borne(ang / 120, 0, 1) };
    if (de && !reduit) { const f = arc(de, [lon, lat]); trait && traits.remove(trait); const P = []; for (let i = 0; i <= 48; i++) P.push(f(i / 48));
      trait = new T.Line(new T.BufferGeometry().setFromPoints(P), new T.LineBasicMaterial({ color: 0xd6ff00, transparent: true, opacity: .9, blending: T.AdditiveBlending })); trait.geometry.setDrawRange(0, 0); trait.userData = { f, t0: vol.t0, duree: vol.duree }; traits.add(trait); }
    inertie = [0, 0]; auto = false; sale = true;
  }
  function taille() {
    const w = zone.clientWidth || 600, h = zone.clientHeight || 500; rendu.setPixelRatio(Math.min(2, devicePixelRatio || 1)); rendu.setSize(w, h, false);
    matPts.uniforms.dpr.value = rendu.getPixelRatio(); matPts.uniforms.echelle.value = w < 520 ? 1.25 : 1; cam.aspect = w / h; majDecal(true); sale = true;
  }
  function majDecal(force) {
    const w = zone.clientWidth || 600, h = zone.clientHeight || 500;
    if (!force) { decal[0] += (decalBut[0] - decal[0]) * .14; decal[1] += (decalBut[1] - decal[1]) * .14; if (Math.abs(decalBut[0] - decal[0]) < .5 && Math.abs(decalBut[1] - decal[1]) < .5) { decal[0] = decalBut[0]; decal[1] = decalBut[1]; } }
    else { decal[0] = decalBut[0]; decal[1] = decalBut[1]; }
    if (decal[0] || decal[1]) cam.setViewOffset(w, h, decal[0], decal[1], w, h); else if (cam.view) cam.clearViewOffset(); cam.updateProjectionMatrix();
  }
  const ro = typeof ResizeObserver === "function" ? new ResizeObserver(taille) : null; if (ro) ro.observe(zone); addEventListener("resize", taille); taille();

  // Gestes : glisser pour tourner (avec un peu d'élan), molette et pincement pour zoomer, toucher pour choisir.
  const ptr = new Map(); let dep = 0, pince = 0, survolOk = 0;
  const px = (cx, cy) => { const r = canvas.getBoundingClientRect(); return [cx - r.left, cy - r.top]; };
  const degParPx = () => borne((V.dist - R) / (R * 2.1), .02, 1.2) * .27;
  const v3 = new T.Vector3(), cd = new T.Vector3();
  function trouver(x, y, rayon) {   // les musiques proches d'un point de l'écran, sur la face visible
    const w = canvas.clientWidth, h = canvas.clientHeight, out = []; cam.updateMatrixWorld(); const camN = cd.copy(camPos()).normalize(), hz = R / camPos().length() + .03;
    for (let i = 0; i < pos3.length; i++) { const p = pos3[i]; if (p.clone().normalize().dot(camN) < hz) continue; v3.copy(p).project(cam); const sx = (v3.x + 1) / 2 * w, sy = (1 - v3.y) / 2 * h, d = Math.hypot(sx - x, sy - y); if (d <= rayon) out.push([d, i, sx, sy]); }
    return out.sort((a, b) => a[0] - b[0]);
  }
  const camPos = () => cam.position;
  canvas.addEventListener("pointerdown", e => { canvas.setPointerCapture(e.pointerId); ptr.set(e.pointerId, [e.clientX, e.clientY]); dep = 0; vol = null; inertie = [0, 0]; auto = false; dernierGeste = performance.now(); if (ptr.size === 2) { const [a, b] = [...ptr.values()]; pince = Math.hypot(a[0] - b[0], a[1] - b[1]); } auSurvol(null); });
  canvas.addEventListener("pointermove", e => {
    if (!ptr.has(e.pointerId)) { if (e.pointerType === "mouse") { const now = performance.now(); if (now - survolOk < 40) return; survolOk = now; const [x, y] = px(e.clientX, e.clientY), r = trouver(x, y, 11); canvas.style.cursor = r.length ? "pointer" : "grab"; auSurvol(r.length ? liste[r[0][1]].id : null, r.length ? r[0][2] : 0, r.length ? r[0][3] : 0, r.length); } return; }
    const avant = ptr.get(e.pointerId); ptr.set(e.pointerId, [e.clientX, e.clientY]);
    if (ptr.size === 2) { const [a, b] = [...ptr.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pince > 0) { V.dist = borne(V.dist * pince / d, DMIN, DMAX); but.dist = V.dist; } pince = d; dep = 99; sale = true; return; }
    const dx = e.clientX - avant[0], dy = e.clientY - avant[1]; dep += Math.abs(dx) + Math.abs(dy);
    if (dep > 4) { const k = degParPx(); V.lon -= dx * k; V.lat = borne(V.lat + dy * k, -85, 85); inertie = [-dx * k, dy * k]; canvas.style.cursor = "grabbing"; sale = true; }
  });
  const fin = e => {
    const etait = ptr.size; ptr.delete(e.pointerId); if (ptr.size < 2) pince = 0; canvas.style.cursor = "grab"; dernierGeste = performance.now();
    if (ptr.size === 0 && dep <= 4 && etait === 1 && e.type === "pointerup") toucher(...px(e.clientX, e.clientY), e.pointerType === "mouse" ? 12 : 22);
    if (dep <= 4) inertie = [0, 0];
  };
  canvas.addEventListener("pointerup", fin); canvas.addEventListener("pointercancel", fin);
  canvas.addEventListener("wheel", e => { e.preventDefault(); dernierGeste = performance.now(); vol = null; auto = false; V.dist = borne(V.dist * Math.exp(e.deltaY * (e.ctrlKey ? .012 : .0016)), DMIN, DMAX); but.dist = V.dist; sale = true; }, { passive: false });
  canvas.addEventListener("dblclick", e => { const [x, y] = px(e.clientX, e.clientY), r = trouver(x, y, 16); if (!r.length) zoomer(.6); });
  function toucher(x, y, rayon) {
    const r = trouver(x, y, rayon); if (!r.length) return;
    // Plusieurs points presque confondus : de loin on s'approche d'eux ; de près, on propose la liste.
    const proches = r.filter(q => q[0] <= r[0][0] + 14), ids = proches.map(q => liste[q[1]].id);
    if (ids.length > 1 && V.dist > R * 1.55) { const c = proches.reduce((s, q) => [s[0] + liste[q[1]].lon, s[1] + liste[q[1]].lat], [0, 0]).map(v => v / proches.length); aller(c[0], c[1], Math.max(R * 1.45, V.dist * .5)); return; }
    auToucher(ids);
  }
  function zoomer(f) { aller(V.lon, V.lat, borne(V.dist * f, DMIN, DMAX)); }

  let arret = false, dernier = performance.now();
  function image(now) {
    if (arret) return; if (!canvas.isConnected) { detruire(); return; } requestAnimationFrame(image);
    if (document.hidden) return;
    const dt = Math.min(.05, (now - dernier) / 1000); dernier = now;
    if (vol) {
      const u = Math.min(1, (now - vol.t0) / vol.duree), e = lisse(u);
      V.lon = vol.l0 + vol.dl * e; V.lat = vol.la0 + (vol.lat - vol.la0) * e; V.dist = vol.d0 + (vol.dist - vol.d0) * e + Math.sin(Math.PI * u) * R * .35 * vol.hop; sale = true;
      if (trait) { const nb = Math.max(2, Math.floor(e * 48) + 1); trait.geometry.setDrawRange(0, nb); const p = trait.userData.f(e); lueur.position.copy(p); lueur.material.opacity = 1; }
      if (u >= 1) { V.lon = vol.l0 + vol.dl; V.lat = vol.lat; V.dist = vol.dist; vol = null; dernierGeste = now; if (trait) trait.userData.fin = now; }
    } else if (inertie[0] || inertie[1]) { V.lon += inertie[0]; V.lat = borne(V.lat + inertie[1], -85, 85); inertie[0] *= .92; inertie[1] *= .92; if (Math.abs(inertie[0]) + Math.abs(inertie[1]) < .01) inertie = [0, 0]; sale = true; }
    else if (!reduit && now - dernierGeste > 2200) { V.lon += dt * (ralenti() ? 0.9 : 2.6); sale = true; }   // le globe ne s'arrête jamais : il dérive doucement, plus doucement quand une fenêtre est ouverte
    if (trait && trait.userData.fin) { const a = 1 - (now - trait.userData.fin) / 1400; if (a <= 0) { traits.remove(trait); trait.geometry.dispose(); trait = null; lueur.material.opacity = 0; } else { trait.material.opacity = .9 * a; lueur.material.opacity = a; } sale = true; }
    V.lon = ((V.lon + 540) % 360) - 180;
    if (decal[0] !== decalBut[0] || decal[1] !== decalBut[1]) { majDecal(false); sale = true; }
    if (choisie.children.length) { const g = choisie.children[0], t = ((now - g.userData.t0) % 1800) / 1800; g.userData.anneau.scale.setScalar(1 + t * 1.6); g.userData.anneau.material.opacity = .95 * (1 - t); sale = true; }
    apercu(now);
    if (!sale) return; sale = false;
    cam.position.copy(vers(V.lon, V.lat, V.dist)); cam.up.set(0, 1, 0); cam.lookAt(0, 0, 0); soleil.position.copy(cam.position).add(new T.Vector3(8, 10, 4));
    matPts.uniforms.horizon.value = R / V.dist + .03;
    const camN = cam.position.clone().normalize();
    noms.forEach(s => { const { rang, n } = s.userData, f = n.dot(camN), vu = rang === 1 ? V.dist < R * 3.6 : rang === 2 ? V.dist < R * 2.5 : V.dist < R * 1.7;
      s.material.opacity += ((vu && f > .3 ? Math.min(1, (f - .3) * 4) : 0) - s.material.opacity) * .3; s.visible = s.material.opacity > .02; });
    rendu.render(scene, cam); noms2(now);
  }
  // Les noms des musiques, de près : les plus reliées d'abord (celles du cours en tête), sans se chevaucher ni passer sous les fenêtres.
  function noms2(now) {
    if (V.dist > R * 1.95) { if (!nomsVides) { calqueNoms.innerHTML = ""; nomsVides = true; } return; }
    if (now - dernierNoms < 90) { sale = true; return; } dernierNoms = now;
    const w = canvas.clientWidth, h = canvas.clientHeight, camN = cam.position.clone().normalize(), hz = R / cam.position.length() + .05, obs = obstacles(), pris = [], out = [], cand = [];
    for (let i = 0; i < pos3.length; i++) { const p = pos3[i]; if (p.clone().normalize().dot(camN) < hz) continue; v3.copy(p).project(cam); const sx = (v3.x + 1) / 2 * w, sy = (1 - v3.y) / 2 * h; if (sx < 4 || sx > w - 4 || sy < 14 || sy > h - 4) continue; cand.push([i, sx, sy]); }
    cand.sort((a, b) => (liste[b[0]].cours ? 1e6 : 0) + liste[b[0]].w - (liste[a[0]].cours ? 1e6 : 0) - liste[a[0]].w);
    for (const [i, sx, sy] of cand) { if (out.length >= 42) break; const n = liste[i].n, bw = n.length * 6.3 + 8, b = [sx + 8, sy - 8, bw, 16];
      if (obs && b[0] + b[2] > obs.left && b[0] < obs.right && b[1] + b[3] > obs.top && b[1] < obs.bottom) continue;
      if (pris.some(q => b[0] < q[0] + q[2] && b[0] + b[2] > q[0] && b[1] < q[1] + q[3] && b[1] + b[3] > q[1])) continue; pris.push(b);
      out.push(`<span${liste[i].cours ? ' class="cours"' : ""} style="left:${b[0].toFixed(0)}px;top:${b[1].toFixed(0)}px">${n.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</span>`); }
    calqueNoms.innerHTML = out.join(""); nomsVides = !out.length;
  }
  // De temps en temps (toutes les douze à vingt secondes), une petite fiche s'ouvre sur une musique, pour donner envie de toucher. Une seule à la fois, jamais pendant un geste ou un vol.
  const carte = document.createElement("div"); carte.className = "g-apercu-zone"; carte.setAttribute("aria-hidden", "true"); zone.appendChild(carte);
  const pt = document.createElement("i"); pt.className = "g-apercu-pt"; const fic = document.createElement("button"); fic.type = "button"; fic.className = "g-apercu"; fic.tabIndex = -1; carte.append(pt, fic);
  let ap = null, prochain = performance.now() + 7000; const recents = [];
  const cacher = () => { ap = null; carte.classList.remove("on"); prochain = performance.now() + 12000 + Math.random() * 8000; };
  fic.onclick = () => { if (ap) { const id = liste[ap.i].id; cacher(); auToucher([id]); } };
  fic.onpointerenter = () => { if (ap) ap.fin = Infinity; }; fic.onpointerleave = () => { if (ap) ap.fin = performance.now() + 2500; };
  function apercu(now) {
    if (reduit || !pts) return;
    const w = canvas.clientWidth, h = canvas.clientHeight, camN = cam.position.clone().normalize(), hz = R / cam.position.length();
    if (ap) {
      const p = pos3[ap.i]; v3.copy(p).project(cam); const sx = (v3.x + 1) / 2 * w, sy = (1 - v3.y) / 2 * h;
      if (p.clone().normalize().dot(camN) < hz + .1 || ptr.size || vol || now > ap.fin) { cacher(); return; }
      const gauche = sx + 230 > (obstacles() ? obstacles().left : w - 8);
      carte.style.setProperty("--x", sx.toFixed(0) + "px"); carte.style.setProperty("--y", sy.toFixed(0) + "px"); carte.classList.toggle("gauche", gauche); return;
    }
    if (now < prochain || ptr.size || vol || document.hidden || V.dist > R * 3.7 || !liste.length) return;
    const obs = obstacles(), cand = [];
    for (let i = 0; i < pos3.length; i++) { const p = pos3[i]; if (p.clone().normalize().dot(camN) < hz + .25 || recents.includes(liste[i].id)) continue; v3.copy(p).project(cam); const sx = (v3.x + 1) / 2 * w, sy = (1 - v3.y) / 2 * h;
      if (sx < 90 || sx > w - 90 || sy < 50 || sy > h - 50 || (obs && sx > obs.left - 40 && sy > obs.top - 40 && sy < obs.bottom + 40 && sx < obs.right)) continue; cand.push(i); }
    if (!cand.length) { prochain = now + 4000; return; }
    const cours = cand.filter(i => liste[i].cours), pool = (cours.length && Math.random() < .55 ? cours : cand.sort((a, b) => liste[b].w - liste[a].w).slice(0, 40)), i = pool[Math.floor(Math.random() * pool.length)];
    recents.push(liste[i].id); if (recents.length > 12) recents.shift();
    fic.style.setProperty("--c", liste[i].c); fic.innerHTML = ""; const a = document.createElement("small"), b = document.createElement("span"), c = document.createElement("em"); a.textContent = liste[i].r || ""; b.textContent = liste[i].n; c.textContent = "Ouvrir"; fic.append(a, b, c);
    ap = { i, fin: now + 6500 }; carte.classList.add("on");
  }
  requestAnimationFrame(image);
  function detruire() { arret = true; calqueNoms.remove(); carte.remove(); if (ro) ro.disconnect(); removeEventListener("resize", taille); try { rendu.dispose(); rendu.forceContextLoss(); } catch (_) {} }

  return {
    majPoints,
    // Voler jusqu'à une musique : la caméra la centre ; si on vient d'une autre, un trait lumineux relie les deux.
    voler(lonlat, { de = null, dist = null, couleur = "#D6FF00" } = {}) { marquer(lonlat, couleur); aller(lonlat[0], lonlat[1], dist ?? Math.min(V.dist, R * 2.3), de); },
    marquer, zoomer, detruire,
    tout() { aller(V.lon, 20, R * 3.1); },
    cadrer(lon, lat, dist) { aller(lon, lat, borne(dist, DMIN, DMAX)); },
    decaler(x, y) { decalBut = [x, y]; sale = true; },
    redessiner() { sale = true; },
    ecran(lon, lat) { cam.updateMatrixWorld(); const q = vers(lon, lat, R + .02).project(cam); return [(q.x + 1) / 2 * canvas.clientWidth, (1 - q.y) / 2 * canvas.clientHeight]; },   // où se trouve ce lieu à l'écran (pour les tests)
    apercuMaintenant() { if (ap) cacher(); prochain = 0; },
    pos: () => ({ ...V }),
  };
}
