// Point d'entrée du compilateur SONORA. Aucune dépendance, aucune référence à l'interface : tourne dans un Worker, dans Node ou sur le fil principal.
import { Diagnostics, rendre as rendreDiagnostic } from "./diagnostics.js?v=e613fe7e37";
import { analyser } from "./analyseur.js?v=e613fe7e37";
import { analyserSemantique } from "./sema.js?v=e613fe7e37";
import { optimiser } from "./optimise.js?v=e613fe7e37";
import { verifierGenerable, genererNoyau } from "./gen_js.js?v=e613fe7e37";
import { MODULES, MATHS } from "./bibliotheque.js?v=e613fe7e37";

export { rendreDiagnostic, MODULES, MATHS };

// options : { module: nom du module à générer (le premier par défaut), optimiser: niveau 0, 1 ou 2 (2 par défaut), generer: false pour seulement vérifier }
export function compiler(source, options = {}) {
  const diags = new Diagnostics(source);
  const ast = analyser(source, diags);
  const resultat = (extra = {}) => ({ ok: diags.ok, diagnostics: diags.liste, ast, source, ...extra });
  // Après une erreur de syntaxe on s'arrête : l'analyse sémantique d'un arbre incomplet inventerait des erreurs.
  if (diags.erreurs.some(d => /^E[01]/.test(d.code))) return resultat();
  const modules = analyserSemantique(ast, diags);
  if (!ast.declarations.some(d => d.type === "Module")) diags.erreur("E206", "Le programme ne contient ni `instrument` ni `effet`.", 0, Math.min(source.length, 1), { suggestion: "écris un module : instrument Nom { ... sortie = ... }" });
  if (!diags.ok) return resultat({ modules: modules.map(m => resume(m)) });

  let cible = modules[0];
  if (options.module) { cible = modules.find(m => m.nom === options.module); if (!cible) { diags.erreur("E207", `Il n'y a pas de module \`${options.module}\` dans ce programme.`, 0, 1); return resultat(); } }
  const sortieModule = resume(cible);
  if (options.generer === false || !cible) return resultat({ modules: modules.map(m => resume(m)), module: sortieModule });

  const g = cible.graphe;
  if (!verifierGenerable(cible, g, diags)) return resultat({ modules: modules.map(m => resume(m)), module: sortieModule });
  const niveau = options.optimiser ?? 2;
  const maitre = optimiser(g, [...cible.sortie], { niveau });
  const genM = genererNoyau(cible, maitre.graphe, maitre.racines, diags, cible.voix ? "maitre" : "complet");
  if (!genM || !diags.ok) return resultat({ modules: modules.map(m => resume(m)), module: sortieModule });
  const module = { ...sortieModule, canaux: genM.canaux, code: genM.code, stats: maitre.stats, graphe: maitre.graphe };
  if (cible.voix) {
    const v = optimiser(g, [...cible.voix.sortie], { niveau });
    const genV = genererNoyau(cible, v.graphe, v.racines, diags, "voix");
    if (!genV || !diags.ok) return resultat({ modules: modules.map(m => resume(m)), module: sortieModule });
    module.voix = { code: genV.code, canaux: genV.canaux, nbVoix: cible.voix.nbVoix, vol: cible.voix.vol, stats: v.stats };
  }
  return resultat({ modules: modules.map(m => resume(m)), module });
}

function resume(m) {
  return { nom: m.nom, genre: m.genre, doc: m.doc, reglages: m.reglages, entrees: m.entrees, automations: m.automations, accord: m.accord };
}

// Texte lisible de tous les diagnostics.
export function rapport(res) { return res.diagnostics.map(d => rendreDiagnostic(d, res.source)).join("\n"); }
