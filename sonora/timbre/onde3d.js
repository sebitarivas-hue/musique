// L'écran des outils (labo, studio Faust) en 3D : le spectre du son devient un paysage qui s'éloigne dans la profondeur,
// l'onde du moment brille au premier plan. Même couleur que la salle de jeux : vert citron sur fond sombre.
import * as T from "./vendor/three.module.min.js?v=eb924f2079";
const LIGNES = 44, PTS = 96;
export function monterOnde3d(cv2d) {
  const hote = cv2d.parentElement; if (!hote || cv2d.__onde3d) return null;
  let rendu; const cv = document.createElement("canvas"); cv.className = "onde3d labo-onde"; cv.setAttribute("aria-hidden", "true");
  try { rendu = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true }); } catch (_) { return null; }
  cv2d.__onde3d = true; cv2d.after(cv); cv2d.classList.add("onde3d-sous");
  rendu.setClearColor(0, 0); rendu.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  const scene = new T.Scene(), cam = new T.PerspectiveCamera(42, 2, .1, 60);
  const L = 10, Z = 7;
  const lignes = [], histo = [];
  for (let i = 0; i < LIGNES; i++) {
    const g = new T.BufferGeometry(); g.setAttribute("position", new T.BufferAttribute(new Float32Array(PTS * 3), 3));
    const k = 1 - i / LIGNES, m = new T.LineBasicMaterial({ color: new T.Color().setHSL(.24 + (1 - k) * .1, .9, .35 + .3 * k), transparent: true, opacity: .12 + .85 * k * k, blending: T.AdditiveBlending, depthWrite: false });
    const l = new T.Line(g, m); scene.add(l); lignes.push(l); histo.push(new Float32Array(PTS));
  }
  // le sol : une grille fine qui donne l'échelle
  const sol = new T.GridHelper(L * 1.4, 28, 0x3a5a12, 0x1a2a0a); sol.position.set(0, -.02, -Z / 2 + .6); sol.scale.z = Z / L / 1.4 * 1.6; scene.add(sol);
  const front = new T.Line(new T.BufferGeometry().setAttribute("position", new T.BufferAttribute(new Float32Array(PTS * 3), 3)), new T.LineBasicMaterial({ color: 0xe8ff9a, blending: T.AdditiveBlending, transparent: true }));
  scene.add(front);
  const halo = new T.Mesh(new T.PlaneGeometry(L * 1.6, 3), new T.MeshBasicMaterial({ color: 0xb8f54a, transparent: true, opacity: .07, blending: T.AdditiveBlending, depthWrite: false })); halo.rotation.x = -Math.PI / 2; halo.position.set(0, -.03, -Z / 2); scene.add(halo);
  let px = 0, py = 0, tx = 0, ty = 0, raf = 0, vivant = true, dernier = 0, calme = 0;
  hote.addEventListener("pointermove", e => { const r = cv.getBoundingClientRect(); tx = ((e.clientX - r.left) / r.width - .5) * 2; ty = ((e.clientY - r.top) / r.height - .5) * 2; });
  const taille = () => { const r = hote.getBoundingClientRect(), w = Math.max(200, cv2d.clientWidth || r.width), h = Math.max(60, cv2d.clientHeight || 100); rendu.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
  const ro = new ResizeObserver(taille); ro.observe(cv); taille();
  let t0 = performance.now();
  function pousser(temps, spectre) {
    // une nouvelle rangée au premier plan, les autres reculent
    const r = histo.pop(); const n = spectre ? spectre.length * .5 : 0;
    for (let k = 0; k < PTS; k++) { const u = k / (PTS - 1); const idx = spectre ? Math.floor(Math.pow(u, 1.8) * n) : 0; const e = spectre ? spectre[idx] / 255 : 0; const centre = 1 - Math.abs(u - .5) * 1.1; r[k] = e * centre; }
    histo.unshift(r);
  }
  function image(tm) {
    const s = (tm - t0) / 1000;
    px += (tx - px) * .06; py += (ty - py) * .06;
    cam.position.set(px * 1.6 + Math.sin(s * .25) * .5, 2.1 - py * .5, 4.6); cam.lookAt(px * .3, .5, -Z / 2 + .8);
    for (let i = 0; i < LIGNES; i++) {
      const a = lignes[i].geometry.attributes.position, z = -i * (Z / LIGNES), h = histo[i];
      for (let k = 0; k < PTS; k++) a.setXYZ(k, (k / (PTS - 1) - .5) * L, h[k] * 2.6 * (1 - i / LIGNES * .35), z);
      a.needsUpdate = true;
    }
    rendu.render(scene, cam);
  }
  function boucle(tm) { raf = 0; if (!vivant) return; if (!document.body.contains(cv)) { vivant = false; try { rendu.dispose(); ro.disconnect(); } catch (_) {} return; }
    if (!document.hidden && tm - dernier > 30) { dernier = tm; image(tm); } raf = requestAnimationFrame(boucle); }
  raf = requestAnimationFrame(boucle);
  /* Le site du labo appelle donner() à chaque image avec l'onde (temps) et le spectre (octets). */
  return { donner(onde, spectre) {
    pousser(0, spectre);
    const a = front.geometry.attributes.position, nz = onde.length / 2; let z = 0; for (let k = 1; k < nz; k++) if (onde[k - 1] < 0 && onde[k] >= 0) { z = k; break; }
    for (let k = 0; k < PTS; k++) a.setXYZ(k, (k / (PTS - 1) - .5) * L, .12 + onde[Math.min(onde.length - 1, z + Math.floor(k * 4))] * 1.6, .25); a.needsUpdate = true;
  }, arreter() { vivant = false; cancelAnimationFrame(raf); try { rendu.dispose(); ro.disconnect(); } catch (_) {} cv.remove(); cv2d.classList.remove("onde3d-sous"); cv2d.__onde3d = false; } };
}
