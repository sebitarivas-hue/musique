// Worker de compilation : le compilateur tourne hors du fil de l'interface et hors du fil audio.
import { compiler } from "./index.js?v=b48919e0af";
self.onmessage = e => {
  const { id, source, options } = e.data;
  try {
    const r = compiler(source, options);
    // on n'envoie ni l'arbre ni le graphe (lourds et inutiles à l'interface)
    const { ast, graphe, ...module } = r.module || {};
    postMessage({ id, ok: r.ok, diagnostics: r.diagnostics, source, module: r.module ? module : undefined, modules: r.modules });
  } catch (err) { postMessage({ id, ok: false, erreurInterne: String(err && err.stack || err) }); }
};
