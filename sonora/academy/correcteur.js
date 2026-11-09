// Correcteur des exercices de l'Academy. Sans DOM : compile le programme de l'élève, le rend hors ligne, mesure le signal, et juge chaque critère.
// Un critère est jugé sur le son produit, pas sur la forme du code (sauf les critères de type « source »). Deux écritures différentes qui donnent le même son passent toutes les deux.
import { preparer, mesurerLibre, valeursDefaut } from "../science/executeur.js?v=06afd88475";
import * as A from "../science/analyse.js?v=06afd88475";

const dB = A.versDB;
const f1 = (x, d = 1) => (Math.round(x * 10 ** d) / 10 ** d).toString().replace(".", ",");

// Chaque type renvoie { ok, detail } : detail dit ce qui a été mesuré, pour que l'élève sache de combien il est passé à côté.
const TYPES = {
  source: (c, ctx) => { const ok = new RegExp(c.motif).test(ctx.code); return { ok, detail: ok ? "présent dans le code" : "absent du code" }; },
  voix: (c, ctx) => { const ok = !!ctx.module.voix; return { ok, detail: ok ? "l'instrument a une voix" : "pas de bloc voix" }; },
  reglage: (c, ctx) => { const ok = ctx.module.reglages.some(r => r.nom === c.nom); return { ok, detail: ok ? `réglage « ${c.nom} » trouvé` : `pas de réglage « ${c.nom} »` }; },
  f0: (c, ctx) => { const m = ctx.mesure().f0; if (!m) return { ok: false, detail: "aucune hauteur nette mesurée" }; const e = Math.abs(m - c.cible) / c.cible; return { ok: e <= (c.tol ?? 0.02), detail: `mesuré ${f1(m)} Hz, attendu ${f1(c.cible)} Hz` }; },
  rms: (c, ctx) => { const v = dB(ctx.mesure().rms); return { ok: v >= c.min && v <= c.max, detail: `niveau efficace ${f1(v)} dB, attendu entre ${c.min} et ${c.max} dB` }; },
  crete: (c, ctx) => { const v = dB(ctx.mesure().crete); return { ok: v >= c.min && v <= c.max, detail: `niveau de crête ${f1(v)} dB, attendu entre ${c.min} et ${c.max} dB` }; },
  harm: (c, ctx) => { const m = ctx.mesure(); if (!m.f0 || !m.harm.length) return { ok: false, detail: "pas de fondamentale mesurée" }; const v = dB(Math.max(m.harm[c.n - 1] || 0, 1e-9) / m.harm[0]); return { ok: v >= c.min && v <= c.max, detail: `harmonique ${c.n} à ${f1(v)} dB de la fondamentale, attendu entre ${c.min} et ${c.max} dB` }; },
  centroide: (c, ctx) => { const v = ctx.mesure().centroide; return { ok: v >= c.min && v <= c.max, detail: `centroïde ${f1(v, 0)} Hz, attendu entre ${c.min} et ${c.max} Hz` }; },
  pic: (c, ctx) => { const p = ctx.mesure().pics[0]; if (!p) return { ok: false, detail: "aucun pic dans le spectre" }; return { ok: Math.abs(p.f - c.cible) / c.cible <= (c.tol ?? 0.05), detail: `pic le plus fort à ${f1(p.f, 0)} Hz, attendu ${f1(c.cible, 0)} Hz` }; },
  battement: (c, ctx) => { const m = ctx.mesure(), r = A.frequenceEnveloppe(m.env, m.fe); if (!r || r.force < (c.force ?? 0.1)) return { ok: false, detail: "le volume ne pulse pas" }; return { ok: Math.abs(r.f - c.cible) <= (c.tol ?? 0.4), detail: `le volume pulse ${f1(r.f)} fois par seconde, attendu ${f1(c.cible)}` }; },
  attaque: (c, ctx) => { const v = ctx.mesure().attaque; if (v === null) return { ok: false, detail: "pas d'attaque mesurable" }; return { ok: v >= c.min && v <= c.max, detail: `montée en ${f1(v, 0)} ms, attendu entre ${c.min} et ${c.max} ms` }; },
};

// Renvoie { compile: bool, erreur?, resultats: [{texte, ok, detail}], reussi }
export function verifier(code, criteres) {
  let module;
  try { module = preparer(code); }
  catch (e) { const msg = String(e.message).replace(/^Le programme de l'expérience ne se compile pas : /, ""); return { compile: false, erreur: msg.split(" | ")[0], resultats: [], reussi: false }; }
  let cache = null; const ctx = { code, module, mesure: () => cache || (cache = mesurerLibre(module, valeursDefaut(module), { secondes: 4 })) };
  const resultats = criteres.map(c => { const f = TYPES[c.type]; if (!f) throw new Error("critère inconnu : " + c.type);
    try { return { texte: c.texte, ...f(c, ctx) }; } catch (e) { return { texte: c.texte, ok: false, detail: "mesure impossible : " + e.message }; } });
  return { compile: true, resultats, reussi: resultats.every(r => r.ok) };
}
