// Rangement local du projet de pistes : IndexedDB (le projet, et l'audio de chaque son en Float32Array). Rien ne quitte l'appareil.
const BASE = "sonora-pistes", VERSION = 1;
function ouvrir() {
  return new Promise((ok, ko) => {
    if (!("indexedDB" in self)) { ko(new Error("Ce navigateur ne permet pas de ranger des sons.")); return; }
    const r = indexedDB.open(BASE, VERSION);
    r.onupgradeneeded = () => { const db = r.result; if (!db.objectStoreNames.contains("projets")) db.createObjectStore("projets"); if (!db.objectStoreNames.contains("sons")) db.createObjectStore("sons"); };
    r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error);
  });
}
const tx = (db, magasin, mode, f) => new Promise((ok, ko) => { const t = db.transaction(magasin, mode), s = t.objectStore(magasin), r = f(s); t.oncomplete = () => ok(r && r.result); t.onerror = () => ko(t.error); t.onabort = () => ko(t.error); });
export const Stockage = {
  async lireProjet() { const db = await ouvrir(); return tx(db, "projets", "readonly", s => s.get("courant")); },
  async ecrireProjet(p) { const db = await ouvrir(); return tx(db, "projets", "readwrite", s => s.put(JSON.parse(JSON.stringify(p)), "courant")); },
  async lireSon(id) { const db = await ouvrir(); return tx(db, "sons", "readonly", s => s.get(id)); },
  async ecrireSon(id, donnees) { const db = await ouvrir(); return tx(db, "sons", "readwrite", s => s.put(donnees, id)); },
  async effacerSon(id) { const db = await ouvrir(); return tx(db, "sons", "readwrite", s => s.delete(id)); },
  async toutEffacer() { const db = await ouvrir(); await tx(db, "sons", "readwrite", s => s.clear()); return tx(db, "projets", "readwrite", s => s.clear()); },
};
