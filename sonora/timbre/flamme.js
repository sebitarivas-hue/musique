// La flamme de la série, en 3D : trois flammes vernies emboîtées (vert, jaune, cœur blanc) qui vacillent, des étincelles qui montent, et une lueur.
// Grise et immobile tant qu'on n'a pas joué aujourd'hui. Sert de héros à la page Jouer du site. Three.js (licence MIT) est dans vendor/.
import * as T from "./vendor/three.module.min.js?v=c19f85b976";

// Un profil de goutte effilée (rayon selon la hauteur), tourné autour de l'axe : une flamme.
function profil(h, r) { const p = []; for (let i = 0; i <= 32; i++) { const t = i / 32, y = t * h, rr = r * Math.pow(Math.sin(Math.PI * Math.min(1, Math.pow(t, .5) * .98)), .9) * Math.pow(1 - t, .35); p.push(new T.Vector2(Math.max(.001, rr), y)); } return p; }

export function monterFlamme(canvas, { allumee = true } = {}) {
  let rendu; try { rendu = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" }); } catch (_) { return null; }
  const reduit = matchMedia("(prefers-reduced-motion: reduce)").matches, scene = new T.Scene(), cam = new T.PerspectiveCamera(32, 1, .1, 100);
  rendu.outputColorSpace = T.SRGBColorSpace; rendu.setClearColor(0x000000, 0); cam.position.set(0, 2.2, 9.5); cam.lookAt(0, 1.75, 0);
  scene.add(new T.HemisphereLight(0xeaffd0, 0x1a2a0a, 1.4)); const cle = new T.DirectionalLight(0xffffff, 2.2); cle.position.set(3, 5, 6); scene.add(cle);
  const contre = new T.PointLight(0xa8ff3a, 30, 12); contre.position.set(-2.5, 3, -2); scene.add(contre);
  const couches = [
    { h: 3.9, r: 1.35, c: 0x5fc21a, e: 0x2a6a06 }, { h: 2.8, r: .98, c: 0xc8ff3d, e: 0x6aa010 }, { h: 1.75, r: .6, c: 0xfffbe0, e: 0xfff2a0 },
  ].map((k, i) => { const g = new T.LatheGeometry(profil(k.h, k.r), 40); const m = new T.MeshPhysicalMaterial({ color: k.c, emissive: k.e, emissiveIntensity: i === 2 ? 1.2 : .45, roughness: .28, clearcoat: 1, clearcoatRoughness: .15, transparent: i > 0, opacity: i === 0 ? .9 : i === 1 ? .92 : 1, depthWrite: i === 2 });
    const base = g.attributes.position.array.slice(), ang = new Float32Array(base.length / 3); for (let q = 0; q < ang.length; q++) ang[q] = Math.atan2(base[q * 3 + 2], base[q * 3]);
    const mesh = new T.Mesh(g, m); mesh.position.set(0, .05 + i * .04, i * .16); mesh.userData = { base, ang, h: k.h, ph: i * 1.7, c0: new T.Color(k.c), e0: new T.Color(k.e) }; scene.add(mesh); return mesh; });
  // des étincelles qui montent
  const N = 26, pos = new Float32Array(N * 3), vit = []; for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - .5) * 3; pos[i * 3 + 1] = Math.random() * 4.5; pos[i * 3 + 2] = (Math.random() - .5) * 1.5; vit.push(.6 + Math.random() * 1.2); }
  const pg = new T.BufferGeometry(); pg.setAttribute("position", new T.BufferAttribute(pos, 3));
  const etincelles = new T.Points(pg, new T.PointsMaterial({ color: 0xc8ff3d, size: .09, transparent: true, opacity: .9, blending: T.AdditiveBlending, depthWrite: false })); scene.add(etincelles);
  const GRIS = new T.Color(0x5a5f55), GRIS_E = new T.Color(0x111310); let on = allumee, t0 = performance.now(), raf = 0, dernier = t0;
  function taille() { const w = canvas.clientWidth || 260, h = canvas.clientHeight || 260; rendu.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); rendu.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
  taille(); addEventListener("resize", taille);
  function image(t) {
    const s = (t - t0) / 1000, dt = Math.min(.05, (t - dernier) / 1000); dernier = t; const vif = on ? 1 : 0;
    couches.forEach((m, i) => { const u = m.userData, p = m.geometry.attributes.position, b = u.base;
      for (let k = 0; k < p.count; k++) { const y = b[k * 3 + 1], f = y / u.h, w = vif * f * f * (.3 + .1 * i), lang = 1 + (.2 + .55 * f * f) * Math.sin(u.ang[k] * 3 + s * 2.4 + u.ph + f * 2.2) * (on ? 1 : .35) + vif * .05 * Math.sin(s * 9 + y * 3 + u.ph);
        p.array[k * 3] = b[k * 3] * lang + Math.sin(s * 3.1 + u.ph + y * 1.4) * w; p.array[k * 3 + 1] = y * (1 + vif * .06 * Math.sin(s * 6.3 + u.ph + u.ang[k])); p.array[k * 3 + 2] = b[k * 3 + 2] * lang + Math.cos(s * 2.7 + u.ph + y * 1.2) * w * .5; }
      p.needsUpdate = true; m.geometry.computeVertexNormals(); m.rotation.y = s * (.5 + i * .2) * vif;
      m.material.color.copy(on ? u.c0 : GRIS); m.material.emissive.copy(on ? u.e0 : GRIS_E); });
    etincelles.visible = on; const P = pg.attributes.position; for (let i = 0; i < N; i++) { P.array[i * 3 + 1] += vit[i] * dt; P.array[i * 3] += Math.sin(s * 2 + i) * dt * .3; if (P.array[i * 3 + 1] > 4.6) { P.array[i * 3 + 1] = .3; P.array[i * 3] = (Math.random() - .5) * 2.4; } } P.needsUpdate = true;
    contre.intensity = on ? 26 + Math.sin(s * 7) * 6 : 0; scene.rotation.y = Math.sin(s * .6) * .25; scene.position.y = Math.sin(s * 1.4) * .08;
    rendu.render(scene, cam);
  }
  function boucle(t) { raf = 0; if (!document.body.contains(canvas)) return arreter(); if (!document.hidden) image(t); if (!reduit) raf = requestAnimationFrame(boucle); }
  function arreter() { cancelAnimationFrame(raf); removeEventListener("resize", taille); rendu.dispose(); }
  raf = requestAnimationFrame(boucle); if (reduit) image(performance.now());
  return { allumer(v) { on = !!v; if (reduit) image(performance.now()); }, arreter };
}
