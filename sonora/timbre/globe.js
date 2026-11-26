// Le globe des quiz de l'Atlas (17/11/2026, demande de Sébastien : « une carte du monde, et à chaque fois un voyage, comme si on était en avion,
// d'une question à l'autre, un truc super chiadé »). Une Terre de nuit en 3D ; après chaque réponse, un petit avion vole en arc jusqu'au lieu de la musique,
// la caméra le suit, l'escale s'allume. On part d'Ablon-sur-Seine, la ville du collège.
// Les continents viennent de terres.json (Natural Earth, domaine public ; outils/monde/terres_globe.py). Three.js (licence MIT) est dans vendor/.
import * as T from "./vendor/three.module.min.js?v=23c89978c2";

const R = 10, DEG = Math.PI / 180, ABLON = [2.42, 48.72];
const vers = (lon, lat, r = R) => new T.Vector3(r * Math.cos(lat * DEG) * Math.sin(lon * DEG), r * Math.sin(lat * DEG), r * Math.cos(lat * DEG) * Math.cos(lon * DEG));
export const km = (a, b) => { const p1 = a[1] * DEG, p2 = b[1] * DEG, dp = p2 - p1, dl = (b[0] - a[0]) * DEG, h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2; return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h))); };

// La carte de la Terre, dessinée une fois sur une toile (projection équirectangulaire) : océan, méridiens, continents, et les lumières des musiques.
function carteTerre(terres, lumieres, frontieres) {
  const W = 2048, H = 1024, c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d");
  const fond = g.createLinearGradient(0, 0, 0, H); fond.addColorStop(0, "#0a1d48"); fond.addColorStop(.5, "#0d2a62"); fond.addColorStop(1, "#0a1d48"); g.fillStyle = fond; g.fillRect(0, 0, W, H);
  const X = lon => (lon + 180) / 360 * W, Y = lat => (90 - lat) / 180 * H;
  g.strokeStyle = "rgba(120,170,255,.13)"; g.lineWidth = 1;
  for (let lo = -180; lo <= 180; lo += 15) { g.beginPath(); g.moveTo(X(lo), 0); g.lineTo(X(lo), H); g.stroke(); }
  for (let la = -75; la <= 75; la += 15) { g.beginPath(); g.moveTo(0, Y(la)); g.lineTo(W, Y(la)); g.stroke(); }
  const trace = () => { g.beginPath(); terres.forEach(p => { p.forEach(([lo, la], i) => { const x = X(lo), y = Y(la); if (i && Math.abs(lo - p[i - 1][0]) > 180) g.moveTo(x, y); else if (i) g.lineTo(x, y); else g.moveTo(x, y); }); g.closePath(); }); };
  trace(); g.fillStyle = "#1f6f62"; g.fill("evenodd");
  g.strokeStyle = "rgba(170,255,220,.38)"; g.lineWidth = 1.1; g.setLineDash([4, 3]);   // les frontières des pays
  (frontieres || []).forEach(l => { g.beginPath(); l.forEach(([lo, la], i) => { const x = X(lo), y = Y(la); if (i && Math.abs(lo - l[i - 1][0]) > 180) g.moveTo(x, y); else if (i) g.lineTo(x, y); else g.moveTo(x, y); }); g.stroke(); });
  g.setLineDash([]);
  g.save(); g.shadowColor = "#7dffd0"; g.shadowBlur = 10; g.strokeStyle = "rgba(160,255,214,.85)"; g.lineWidth = 1.6; trace(); g.stroke(); g.restore();
  lumieres.forEach(([lo, la]) => { const x = X(lo), y = Y(la), r = g.createRadialGradient(x, y, 0, x, y, 3.5); r.addColorStop(0, "rgba(255,240,190,1)"); r.addColorStop(.4, "rgba(255,214,120,.8)"); r.addColorStop(1, "rgba(255,200,90,0)"); g.fillStyle = r; g.fillRect(x - 4, y - 4, 8, 8); });
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; return t;
}

function halo() {
  const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d"), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(.3, "rgba(255,255,255,.5)"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  return new T.CanvasTexture(c);
}

// Un petit avion de ligne en formes simples : fuselage, nez, ailes, dérive. Il pointe vers -Z.
function avion() {
  const g = new T.Group(), blanc = new T.MeshPhongMaterial({ color: 0xf5f7ff, emissive: 0x334466, shininess: 60 }), jaune = new T.MeshPhongMaterial({ color: 0xffd23f, emissive: 0x664400 });
  const corps = new T.Mesh(new T.CylinderGeometry(.09, .07, .9, 12), blanc); corps.rotation.x = Math.PI / 2; g.add(corps);
  const nez = new T.Mesh(new T.ConeGeometry(.09, .22, 12), blanc); nez.rotation.x = -Math.PI / 2; nez.position.z = -.56; g.add(nez);
  const ailes = new T.Mesh(new T.BoxGeometry(1.05, .025, .22), jaune); ailes.position.z = -.04; g.add(ailes);
  const stab = new T.Mesh(new T.BoxGeometry(.38, .02, .1), jaune); stab.position.z = .38; g.add(stab);
  const derive = new T.Mesh(new T.BoxGeometry(.02, .2, .14), jaune); derive.position.set(0, .1, .38); g.add(derive);
  g.scale.setScalar(.42); return g;
}

export function monterGlobe(canvas, terres, lumieres, { frontieres = [], pays = [] } = {}) {
  let rendu; try { rendu = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" }); } catch (_) { return null; }
  const reduit = matchMedia("(prefers-reduced-motion: reduce)").matches, scene = new T.Scene(), cam = new T.PerspectiveCamera(42, 1, .1, 400), H = halo();
  rendu.outputColorSpace = T.SRGBColorSpace; rendu.setClearColor(0x000000, 0);
  scene.add(new T.AmbientLight(0x6f86c8, .9)); const soleil = new T.DirectionalLight(0xfff1d6, 1.6); scene.add(soleil);
  const terre = new T.Mesh(new T.SphereGeometry(R, 96, 64), new T.MeshPhongMaterial({ map: carteTerre(terres, lumieres, frontieres), shininess: 18, specular: 0x24406e })); scene.add(terre);
  // La sphère de three.js pose la longitude L de la carte en (cos L, -sin L) ; vers() place L en (sin L, cos L) : un quart de tour les accorde.
  // Sans lui, tout était décalé de 90 degrés (retour du 17/11/2026 : la réponse « Afrique du Sud » emmenait l'avion en Argentine).
  terre.rotation.y = -Math.PI / 2;
  // L'atmosphère : une lueur bleue au bord du globe (effet de Fresnel).
  scene.add(new T.Mesh(new T.SphereGeometry(R * 1.12, 64, 48), new T.ShaderMaterial({ side: T.BackSide, transparent: true, blending: T.AdditiveBlending, depthWrite: false,
    vertexShader: "varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: "varying vec3 vN; void main(){ float i = pow(0.72 - dot(vN, vec3(0.0, 0.0, 1.0)), 3.0); gl_FragColor = vec4(0.32, 0.68, 1.0, 1.0) * i; }" })));
  // Les étoiles
  const ep = []; for (let i = 0; i < 1600; i++) { const v = new T.Vector3().randomDirection().multiplyScalar(160 + Math.random() * 80); ep.push(v.x, v.y, v.z); }
  const eg = new T.BufferGeometry(); eg.setAttribute("position", new T.Float32BufferAttribute(ep, 3)); scene.add(new T.Points(eg, new T.PointsMaterial({ color: 0xcfd8ff, size: .7, sizeAttenuation: true, transparent: true, opacity: .8 })));

  // Les noms des pays : des étiquettes toujours droites, posées sur leur pays ; seulement sur la face tournée vers nous, les petits pays seulement de près.
  const noms = pays.map(([nom, lon, lat, rang]) => {
    const c = document.createElement("canvas"), g = c.getContext("2d"), px = rang === 1 ? 46 : rang === 2 ? 38 : 30, police = `${rang === 1 ? 800 : 700} ${px}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    g.font = police; const tx = rang === 1 ? nom.toUpperCase() : nom, w = Math.ceil(g.measureText(tx).width) + 24; c.width = w; c.height = px + 18;
    g.font = police; g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round"; g.lineWidth = 6; g.strokeStyle = "rgba(4,10,30,.85)"; g.strokeText(tx, w / 2, c.height / 2);
    g.fillStyle = rang === 1 ? "#f3fff9" : rang === 2 ? "#d8f7ea" : "#bfe9d8"; g.fillText(tx, w / 2, c.height / 2);
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.minFilter = T.LinearFilter;
    const s = new T.Sprite(new T.SpriteMaterial({ map: t, transparent: true, depthWrite: false, depthTest: false, opacity: 0 })), h = rang === 1 ? .42 : rang === 2 ? .3 : .22;
    s.scale.set(h * c.width / c.height, h, 1); s.position.copy(vers(lon, lat, R + .06)); s.userData = { rang, n: s.position.clone().normalize(), ratio: c.width / c.height, h }; s.renderOrder = 2; scene.add(s); return s;
  }).sort((a, b) => a.userData.rang - b.userData.rang);
  const plane = avion(); scene.add(plane);
  const lueur = new T.Sprite(new T.SpriteMaterial({ map: H, color: 0xffd23f, transparent: true, blending: T.AdditiveBlending, depthWrite: false })); lueur.scale.setScalar(.5); scene.add(lueur);
  const traces = new T.Group(); scene.add(traces); const escales = new T.Group(); scene.add(escales);
  const ICI = { pos: ABLON.slice(), vol: null, file: [], total: 0, nb: 0, cible: null, survol: 0, etiquette: null, offset: 0 };

  function borne(lonlat, couleur) {
    const n = vers(lonlat[0], lonlat[1], 1), g = new T.Group(), c = new T.Color(couleur);
    const anneau = new T.Mesh(new T.RingGeometry(.16, .24, 32), new T.MeshBasicMaterial({ color: c, transparent: true, opacity: .9, side: T.DoubleSide, depthWrite: false }));
    const faisceau = new T.Mesh(new T.CylinderGeometry(.02, .06, 1.6, 8, 1, true), new T.MeshBasicMaterial({ color: c, transparent: true, opacity: .55, blending: T.AdditiveBlending, depthWrite: false }));
    faisceau.position.y = .8; anneau.rotation.x = -Math.PI / 2; g.add(anneau, faisceau);
    const s = new T.Sprite(new T.SpriteMaterial({ map: H, color: c, transparent: true, blending: T.AdditiveBlending, depthWrite: false })); s.scale.setScalar(.8); s.position.y = .05; g.add(s);
    g.position.copy(n.clone().multiplyScalar(R + .01)); g.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), n); g.userData.t0 = performance.now(); escales.add(g); return g;
  }
  borne(ABLON, "#ffd23f");

  // Un arc de grand cercle, qui monte d'autant plus haut que le voyage est long.
  function arc(a, b) {
    const va = vers(a[0], a[1], 1), vb = vers(b[0], b[1], 1), ang = va.angleTo(vb), haut = .35 + 2.6 * ang / Math.PI;
    return t => { const s = Math.sin(ang) < 1e-4 ? va.clone() : va.clone().multiplyScalar(Math.sin((1 - t) * ang) / Math.sin(ang)).add(vb.clone().multiplyScalar(Math.sin(t * ang) / Math.sin(ang)));
      return s.normalize().multiplyScalar(R + .15 + haut * Math.sin(Math.PI * t)); };
  }

  // Voler jusqu'à un lieu : renvoie une promesse tenue à l'arrivée. Les vols demandés pendant un vol attendent leur tour.
  function voler(lonlat, etiquette, couleur = "#35e0ff") {
    return new Promise(ok => { ICI.file.push({ lonlat, etiquette, couleur, ok }); if (!ICI.vol) suivant(); });
  }
  function suivant() {
    const v = ICI.file.shift(); if (!v) { ICI.vol = null; return; }
    ICI.etiquette = null; if (window.GLOBE_ESCALE) window.GLOBE_ESCALE(null);
    const d = km(ICI.pos, v.lonlat), f = arc(ICI.pos, v.lonlat), duree = reduit ? 1 : 1700 + Math.min(3200, d * .22);
    const pts = []; for (let i = 0; i <= 64; i++) pts.push(f(i / 64));
    const ligne = new T.Line(new T.BufferGeometry().setFromPoints(pts), new T.LineBasicMaterial({ color: new T.Color(v.couleur), transparent: true, opacity: .85, blending: T.AdditiveBlending }));
    ligne.geometry.setDrawRange(0, 0); traces.add(ligne);
    ICI.vol = { ...v, f, t0: performance.now(), duree, ligne, d };
  }
  function arriver() {
    const v = ICI.vol; ICI.pos = v.lonlat.slice(); ICI.total += v.d; ICI.nb++; v.ligne.geometry.setDrawRange(0, 65); borne(v.lonlat, v.couleur);
    ICI.etiquette = v.etiquette ? { lonlat: v.lonlat, html: v.etiquette, t0: performance.now() } : null; ICI.survol = performance.now();
    if (window.GLOBE_ESCALE) window.GLOBE_ESCALE(ICI.etiquette); v.ok(); suivant();
  }
  function remettre() {
    ICI.file.length = 0; if (ICI.vol) ICI.vol.ok(); ICI.vol = null; ICI.pos = ABLON.slice(); ICI.total = 0; ICI.nb = 0; ICI.etiquette = null;
    traces.clear(); escales.clear(); borne(ABLON, "#ffd23f"); if (window.GLOBE_ESCALE) window.GLOBE_ESCALE(null);
  }

  const camPos = new T.Vector3(), camVise = new T.Vector3(), tmp = new T.Vector3();
  camPos.copy(vers(ABLON[0] - 25, ABLON[1] - 18, R * 3.2)); camVise.set(0, 0, 0);
  let vue = "survol";   // « survol » au-dessus de l'escale, « vol » derrière l'avion, « tout » le voyage entier
  function taille() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight; rendu.setPixelRatio(Math.min(2, devicePixelRatio || 1)); rendu.setSize(w, h, false);
    cam.aspect = w / h; if (w > 900) cam.setViewOffset(w, h, -w * .2, 0, w, h); else if (cam.view) cam.clearViewOffset(); cam.updateProjectionMatrix();
  }
  addEventListener("resize", taille); taille();
  let arret = false, dernier = performance.now();
  function image(now) {
    if (arret) return; requestAnimationFrame(image); const dt = Math.min(.05, (now - dernier) / 1000); dernier = now;
    const v = ICI.vol; let ici, devant;
    if (v) {
      const t = Math.min(1, (now - v.t0) / v.duree), e = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      ici = v.f(e); devant = v.f(Math.min(1, e + .02)); v.ligne.geometry.setDrawRange(0, Math.max(2, Math.floor(e * 64) + 1));
      // la caméra se place derrière et au-dessus de l'avion, et prend de la hauteur au milieu des longs vols
      const recul = v.f(Math.max(0, e - .1)), haut = 1.45 + .55 * Math.sin(Math.PI * e) * Math.min(1, v.d / 6000);
      tmp.copy(recul).normalize().multiplyScalar(R * haut + 1.5); camPos.lerp(tmp, reduit ? 1 : 1 - Math.pow(.02, dt)); camVise.lerp(ici, reduit ? 1 : 1 - Math.pow(.001, dt));
      if (t >= 1) arriver();
    } else {
      ici = vers(ICI.pos[0], ICI.pos[1], R + .15); devant = vers(ICI.pos[0] + .5, ICI.pos[1], R + .15);
      const a = (now - ICI.survol) / 9000, n = ici.clone().normalize();
      const est = new T.Vector3(0, 1, 0).cross(n).normalize(), nord = n.clone().cross(est).normalize();
      tmp.copy(n).multiplyScalar(R * (vue === "tout" ? 3.4 : 1.75)).add(est.multiplyScalar(Math.sin(a) * 3)).add(nord.multiplyScalar(-2.5 + Math.cos(a) * 1.2));
      camPos.lerp(tmp, reduit ? 1 : 1 - Math.pow(.15, dt)); camVise.lerp(vue === "tout" ? new T.Vector3() : ici.clone().multiplyScalar(.85), reduit ? 1 : 1 - Math.pow(.05, dt));
    }
    plane.position.copy(ici); plane.up.copy(ici).normalize(); plane.lookAt(devant); plane.rotateY(Math.PI); lueur.position.copy(ici);
    cam.position.copy(camPos); cam.up.set(0, 1, 0); cam.lookAt(camVise);
    soleil.position.copy(cam.position).add(new T.Vector3(8, 10, 4));
    escales.children.forEach(g => { const k = Math.min(1, (now - g.userData.t0) / 600); g.scale.setScalar(.2 + .8 * k + .08 * Math.sin(now / 300)); });
    const loin = cam.position.length(), dc = cam.position.clone().normalize();
    // Les noms : seulement sur la face visible, les petits pays seulement de près, et jamais deux noms l'un sur l'autre (les grands pays d'abord).
    const Wc = canvas.clientWidth || innerWidth, Hc = canvas.clientHeight || innerHeight, k = Hc / (2 * Math.tan(cam.fov * DEG / 2)), pris = [];
    noms.forEach(s => { const u = s.userData, face = Math.max(0, Math.min(1, (u.n.dot(dc) - .5) / .25)), pres = u.rang === 1 ? 1 : Math.max(0, Math.min(1, ((u.rang === 2 ? 36 : 26) - loin) / 6));
      let cible = face * pres;
      if (cible > .05) { const p = s.position.clone().project(cam), x = (p.x + 1) / 2 * Wc, y = (1 - p.y) / 2 * Hc, hp = u.h * k / cam.position.distanceTo(s.position), wp = hp * u.ratio, r = [x - wp / 2 - 4, y - hp / 2 - 2, x + wp / 2 + 4, y + hp / 2 + 2];
        if (pris.some(q => r[0] < q[2] && r[2] > q[0] && r[1] < q[3] && r[3] > q[1])) cible = 0; else pris.push(r); }
      s.material.opacity += (cible - s.material.opacity) * (reduit ? 1 : Math.min(1, dt * 8)); s.visible = s.material.opacity > .02; });
    rendu.render(scene, cam);
    if (window.GLOBE_ETIQUETTE && ICI.etiquette) { const p = vers(ICI.etiquette.lonlat[0], ICI.etiquette.lonlat[1], R + 1.7).project(cam); window.GLOBE_ETIQUETTE((p.x + 1) / 2, (1 - p.y) / 2, p.z < 1); }
  }
  requestAnimationFrame(image);
  document.addEventListener("visibilitychange", () => { if (document.hidden) arret = true; else if (arret) { arret = false; dernier = performance.now(); requestAnimationFrame(image); } });
  return {
    voler, remettre, km,
    /* Contrôle : la longitude et la latitude de la carte qui se trouvent sous un point donné (doivent redonner le point lui-même). */
    controle(lon, lat) { const v = terre.worldToLocal(vers(lon, lat)), phi = Math.atan2(v.z, -v.x), u = ((phi / (2 * Math.PI)) % 1 + 1) % 1, theta = Math.acos(v.y / v.length());
      return [Math.round((u * 360 - 180) * 10) / 10, Math.round((90 - theta / DEG) * 10) / 10]; },
    vue: x => { vue = x; ICI.survol = performance.now(); },
    get escales() { return ICI.nb; }, get total() { return ICI.total; }, get enVol() { return !!ICI.vol; },
  };
}
