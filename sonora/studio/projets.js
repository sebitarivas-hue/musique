// Projets du Studio : stockés dans le navigateur (localStorage), exportables en fichier, importables. Rien ne quitte l'appareil.
const CLE = "sonora:projets", CLE_BROUILLON = "sonora:brouillon", CLE_CORB = "sonora:corbeille", CLE_PREC = "sonora:precedents", JOURS = 30 * 864e5;
const lire = (cle, defaut) => { try { const v = localStorage.getItem(cle); return v ? JSON.parse(v) : defaut; } catch (_) { return defaut; } };
const ecrire = (cle, v) => { try { localStorage.setItem(cle, JSON.stringify(v)); return true; } catch (_) { return false; } };
const id = () => "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export const Projets = {
  liste() { return lire(CLE, []).sort((a, b) => b.maj - a.maj); },
  trouver(i) { return lire(CLE, []).find(p => p.id === i) || null; },
  enregistrer({ id: i, titre, source, reglages }) {
    const tous = lire(CLE, []); const maintenant = Date.now();
    let p = i && tous.find(x => x.id === i);
    if (p) Object.assign(p, { titre, source, reglages, maj: maintenant }); else { p = { id: id(), titre, source, reglages, maj: maintenant }; tous.push(p); }
    return ecrire(CLE, tous) ? p : null;
  },
  dupliquer(i) { const p = this.trouver(i); if (!p) return null; return this.enregistrer({ titre: p.titre + " (copie)", source: p.source, reglages: p.reglages }); },
  // Revenir en arrière (consigne de Sébastien, 04/11/2026) : un projet supprimé va à la corbeille trente jours ; le code remplacé (exemple, projet, nouveau, fichier) est gardé aux vingt derniers.
  supprimer(i) { const p = this.trouver(i); if (p) { const C = lire(CLE_CORB, []).filter(x => x.id !== i); C.unshift({ ...p, supprime: Date.now() }); ecrire(CLE_CORB, C.slice(0, 30)); } ecrire(CLE, lire(CLE, []).filter(p => p.id !== i)); },
  corbeille(maintenant = Date.now()) { return lire(CLE_CORB, []).filter(p => maintenant - p.supprime < JOURS); },
  retablir(i) { const C = lire(CLE_CORB, []), p = C.find(x => x.id === i); if (!p) return null; const q = { ...p }; delete q.supprime; q.maj = Date.now(); ecrire(CLE_CORB, C.filter(x => x.id !== i)); const tous = lire(CLE, []).filter(x => x.id !== q.id); tous.push(q); return ecrire(CLE, tous) ? q : null; },
  precedents: {
    liste: () => lire(CLE_PREC, []),
    empiler(texte, titre) { const L = lire(CLE_PREC, []); if (!String(texte).trim() || (L[0] && L[0].texte === texte)) return; L.unshift({ texte: String(texte), titre: String(titre || "").slice(0, 80), t: Date.now() }); ecrire(CLE_PREC, L.slice(0, 20)); },
    depiler() { const L = lire(CLE_PREC, []), x = L.shift(); ecrire(CLE_PREC, L); return x || null; },
  },
  brouillon: { lire: () => lire(CLE_BROUILLON, null), ecrire: v => ecrire(CLE_BROUILLON, v) },
  // format de fichier : JSON documenté (version, titre, source, reglages)
  exporterJSON(p) { return JSON.stringify({ format: "sonora-projet", version: 1, titre: p.titre, source: p.source, reglages: p.reglages || {} }, null, 2); },
  importerJSON(texte) {
    let o; try { o = JSON.parse(texte); } catch (_) { throw new Error("Ce fichier n'est pas un projet SONORA : le JSON est illisible."); }
    if (!o || o.format !== "sonora-projet" || typeof o.source !== "string") throw new Error("Ce fichier n'est pas un projet SONORA (format attendu : sonora-projet).");
    return { titre: String(o.titre || "Projet importé").slice(0, 80), source: o.source, reglages: o.reglages && typeof o.reglages === "object" ? o.reglages : {} };
  },
};
