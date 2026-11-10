// Exécution d'une expérience : compile le programme SONORA, le rend hors ligne avec les réglages demandés (le même noyau que le moteur temps réel),
// puis mesure le signal obtenu. Sans DOM : tourne dans Node (tests) comme dans le navigateur.
import { compiler } from "../src/index.js?v=9fd2d5915c";
import { rendre } from "../src/rendu.js?v=9fd2d5915c";
import { SR } from "./experiences.js?v=9fd2d5915c";
import * as A from "./analyse.js?v=9fd2d5915c";

export function preparer(programme) {
  const r = compiler(programme);
  if (!r.ok || !r.module || !r.module.code) throw new Error("Le programme de l'expérience ne se compile pas : " + r.diagnostics.map(d => `${d.code} ligne ${d.ligne} ${d.message}`).join(" | "));
  return r.module;
}
export const valeursDefaut = module => Object.fromEntries(module.reglages.map(r => [r.nom, r.defaut]));

export function rendreCanaux(module, valeurs, secondes, options = {}) {
  return rendre(module, { sr: SR, secondes, reglages: valeurs, ...options }).canaux;
}

// Mesure une expérience standard : renvoie { lignes, vues, serie, interpretation, ok, canaux }
export function mesurer(exp, module, valeurs) {
  const canaux = rendreCanaux(module, valeurs, exp.duree, exp.notes ? { notes: exp.notes(valeurs) } : {});  // exp.notes : une note tenue pour les instruments à voix
  const ctx = { canaux, sr: SR, valeurs, module, refaire: idx => rendreCanaux(module, { ...valeurs, intervalle: idx }, exp.duree)[0] };
  const res = exp.mesurer(ctx);
  res.interpretation = exp.interpreter(res, valeurs);
  const verdicts = res.lignes.filter(l => l.ok !== undefined);
  res.ok = verdicts.every(l => l.ok); res.canaux = canaux;
  return res;
}

// Mesure libre d'un programme quelconque (l'analyseur) : notes éventuelles pour les instruments à voix
export function mesurerLibre(module, valeurs, { secondes = 4, notes } = {}) {
  const opts = module.voix ? { notes: notes || [{ a: 0, on: 1, hauteur: 220, vitesse: 0.9 }, { a: 0, on: 2, hauteur: 277.18, vitesse: 0.9 }, { a: 0, on: 3, hauteur: 329.63, vitesse: 0.9 }, { a: Math.round(secondes * 0.6 * SR), off: 1 }, { a: Math.round(secondes * 0.6 * SR), off: 2 }, { a: Math.round(secondes * 0.6 * SR), off: 3 }] } : {};
  let entrees; if (module.entrees.some(e => e.genre === "audio")) { const n = Math.round(secondes * SR); const x = new Float32Array(n); for (let i = 0; i < n; i += Math.round(SR / 2)) x[i] = 0.8; entrees = [x]; opts.entrees = entrees; }
  const canaux = rendreCanaux(module, valeurs, secondes, opts), x = canaux[0], sr = SR;
  const f = A.fondamentale(x, sr, { fmin: 40, fmax: 2000, debut: Math.round(0.1 * sr), duree: 0.25 });
  const n = 16384, debut = Math.round(0.15 * sr), mag = A.spectre(x, debut, n), top = A.pics(mag, sr, n, { seuilDB: -50, max: 12 });
  const { env, fe } = A.enveloppe(x, sr, 10), mx = Math.max(...env), fenetres = Array.from(env).filter(v => v > mx * 0.003).sort((a, b) => a - b);
  const q = p => fenetres.length ? fenetres[Math.min(fenetres.length - 1, Math.floor(p * fenetres.length))] : 0;
  let a10 = -1, a90 = -1; for (let i = 0; i < env.length; i++) { if (a10 < 0 && env[i] >= 0.1 * mx) a10 = i; if (a90 < 0 && env[i] >= 0.9 * mx) { a90 = i; break; } }
  const harm = f.f0 ? A.harmoniques(x, sr, f.f0, 6, { debut, n }) : [];
  return { canaux, sr, f0: f.f0, pics: top, centroide: A.centroide(mag, sr, n), rms: A.rms(x), crete: A.crete(x), env, fe, harm,
    plage: fenetres.length ? A.versDB(q(0.95) / Math.max(1e-9, q(0.05))) : 0, attaque: a10 >= 0 && a90 >= a10 ? (a90 - a10) * 1000 / fe : null, spectrogramme: A.spectrogramme(x, sr, 2048, 1024, 320), spectre: mag, n };
}
