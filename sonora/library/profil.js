// Profil d'un programme de la Library : type, modules employés, et mesures faites sur le son réellement produit.
// Sans DOM : tourne dans Node (tests) comme dans la page. Rien n'est écrit à la main : chaque chiffre vient d'un rendu.
// Un instrument est mesuré avec un accord de trois notes tenu 1,2 s ; un effet reçoit un bruit blanc d'amplitude 0,3 (le même à chaque fois).
import { compiler, MODULES } from "../src/index.js?v=3360acc99c";
import { rendre } from "../src/rendu.js?v=3360acc99c";
import * as A from "../science/analyse.js?v=3360acc99c";

const SR = 44100, NOMS = Object.keys(MODULES).filter(n => !n.startsWith("lib_"));
export function modulesEmployes(code) {
  const sans = code.replace(/\/\/[^\n]*/g, ""); // les commentaires ne comptent pas
  return NOMS.filter(n => new RegExp("\\b" + n + "\\s*\\(").test(sans)).sort();
}
export const accordDeTest = () => [{ a: 0, on: 1, hauteur: 220, vitesse: 0.9 }, { a: 0, on: 2, hauteur: 277.18, vitesse: 0.9 }, { a: 0, on: 3, hauteur: 329.63, vitesse: 0.9 }, { a: Math.round(SR * 1.2), off: 1 }, { a: Math.round(SR * 1.2), off: 2 }, { a: Math.round(SR * 1.2), off: 3 }];
export function bruitDeTest(n, amplitude = 0.3) { const x = new Float32Array(n); let s = 12345; for (let i = 0; i < n; i++) { s = (s * 1664525 + 1013904223) >>> 0; x[i] = (s / 4294967296 * 2 - 1) * amplitude; } return x; }

// Source d'essai identifiable pour un effet : quatre notes (la, do dièse, mi, do dièse), 0,5 s chacune, un son presque pur
// (fondamentale plus deux harmoniques faibles) pour que ce que l'effet ajoute se voie et s'entende. Un bruit blanc ne le permet pas :
// saturer un bruit donne un bruit. Les effets qui demandent du bruit (encoche, flanger) le disent dans leur texte.
export const NOTES_DE_TEST = [220, 277.18, 329.63, 277.18];
export function melodieDeTest(n, sr = SR, amplitude = 0.3) {
  const x = new Float32Array(n), lg = Math.round(0.5 * sr);
  for (let i = 0; i < n; i++) {
    const k = Math.floor(i / lg) % NOTES_DE_TEST.length, t = (i % lg) / sr, f = NOTES_DE_TEST[k];
    const env = Math.min(1, t / 0.01) * (0.55 + 0.45 * Math.exp(-t * 5)) * Math.min(1, (lg - (i % lg)) / (0.02 * sr));
    x[i] = amplitude * env * (Math.sin(2 * Math.PI * f * t) + 0.25 * Math.sin(4 * Math.PI * f * t) + 0.1 * Math.sin(6 * Math.PI * f * t)) / 1.35;
  }
  return x;
}
export const sourceDe = e => e && e.type !== "instrument" && /\bsur (du|le) bruit/i.test(e.texte || "") ? "bruit" : "melodie";

// Renvoie { ok, erreur?, type, voix, canaux, reglages, modules, mesures: { crete, rms, f0, centroide, attaque, gain, incidents, ecretages } }
export function profil(code, { secondes = 3, source = "bruit", transpose = 1 } = {}) {
  const r = compiler(code);
  if (!r.ok || !r.module || !r.module.code) return { ok: false, erreur: r.diagnostics.filter(d => d.gravite === "erreur").map(d => `${d.code} ligne ${d.ligne} : ${d.message}`).join(" | ") || "ne se compile pas" };
  const m = r.module, effet = m.entrees.some(e => e.genre === "audio"), n = Math.round(secondes * SR), opts = { sr: SR, n };
  const entree = effet ? (source === "melodie" ? melodieDeTest(n) : bruitDeTest(n)) : null;
  if (effet) opts.entrees = [entree]; else if (m.voix) opts.notes = accordDeTest();
  const o = rendre(m, opts), x = o.canaux[0];
  const { env, fe } = A.enveloppe(x, SR, 10), mx = Math.max(...env), ipic = env.indexOf(mx);
  // le spectre est pris autour du moment le plus fort, pas à une date fixe : un charleston de 70 ms n'a plus rien à dire à 0,15 s
  const nf = 16384, debut = Math.max(0, Math.min(Math.round(ipic / fe * SR) - 2048, n - nf)), mag = A.spectre(x, debut, nf);
  const f = effet ? null : A.fondamentale(x, SR, { fmin: 40, fmax: 2000, debut: Math.round(0.1 * SR), duree: 0.25 }).f0;
  let a10 = -1, a90 = -1;
  for (let i = 0; i < env.length; i++) { if (a10 < 0 && env[i] >= 0.1 * mx) a10 = i; if (a90 < 0 && env[i] >= 0.9 * mx) { a90 = i; break; } }
  const crete = Math.max(...o.canaux.map(c => A.crete(c)));
  // effet sur la mélodie d'essai : le son reste-t-il identifiable (même hauteur, même netteté), et quelles harmoniques l'effet ajoute-t-il ?
  let ident = null;
  if (effet && source === "melodie") {
    const d = Math.round(0.62 * SR), nf_ = 8192, f0e = NOTES_DE_TEST[1] * transpose, mg = A.spectre(x, d, nf_), fs = A.fondamentale(x, SR, { fmin: 100, fmax: 800, debut: d, duree: 0.25 });
    const hs = A.harmoniques(x, SR, f0e, 8, { debut: d, n: nf_ }), he = A.harmoniques(entree, SR, f0e, 8, { debut: d, n: nf_ }), fort = Math.max(...mg), nouv = a => Math.sqrt(a.slice(3).reduce((s, v) => s + v * v, 0)) / Math.max(1e-12, a[0]);
    // identifiable : la note jouée (277 Hz) reste l'un des pics dominants (à moins de 20 dB du plus fort) et rien ne la noie
    ident = { f0Entree: f0e, f0Sortie: fs.f0, nettete: fs.nettete, fondamentale: A.versDB(hs[0] / fort), conserve: hs[0] >= 0.1 * fort,
      // énergie des harmoniques 4 à 8, que la mélodie d'essai ne contient pas, par rapport à la fondamentale : ce que l'effet a ajouté
      harmoniquesAjoutees: A.versDB(nouv(hs)), harmoniquesAvant: A.versDB(nouv(he)) };
  }
  return { ok: true, source: effet ? source : null, identite: ident, type: effet ? "effet" : "instrument", voix: !!m.voix, canaux: o.canaux.length, reglages: m.reglages.length, modules: modulesEmployes(code),
    mesures: { crete: A.versDB(crete), rms: A.versDB(A.rms(x)), f0: f, centroide: A.centroide(mag, SR, nf), attaque: a10 >= 0 && a90 >= a10 ? (a90 - a10) * 1000 / fe : null,
      gain: effet ? A.versDB(A.rms(x) / A.rms(entree)) : null, incidents: o.incidents || 0, ecretages: o.ecretages || 0 } };
}
