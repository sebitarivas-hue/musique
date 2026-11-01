// Projets du Studio : stockés dans le navigateur (localStorage), exportables en fichier, importables. Rien ne quitte l'appareil.
const CLE = "sonora:projets", CLE_BROUILLON = "sonora:brouillon";
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
  supprimer(i) { ecrire(CLE, lire(CLE, []).filter(p => p.id !== i)); },
  brouillon: { lire: () => lire(CLE_BROUILLON, null), ecrire: v => ecrire(CLE_BROUILLON, v) },
  // format de fichier : JSON documenté (version, titre, source, reglages)
  exporterJSON(p) { return JSON.stringify({ format: "sonora-projet", version: 1, titre: p.titre, source: p.source, reglages: p.reglages || {} }, null, 2); },
  importerJSON(texte) {
    let o; try { o = JSON.parse(texte); } catch (_) { throw new Error("Ce fichier n'est pas un projet SONORA : le JSON est illisible."); }
    if (!o || o.format !== "sonora-projet" || typeof o.source !== "string") throw new Error("Ce fichier n'est pas un projet SONORA (format attendu : sonora-projet).");
    return { titre: String(o.titre || "Projet importé").slice(0, 80), source: o.source, reglages: o.reglages && typeof o.reglages === "object" ? o.reglages : {} };
  },
};
