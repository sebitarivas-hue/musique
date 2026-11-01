// Rangement local du projet de pistes : IndexedDB (le projet, et l'audio de chaque son en Float32Array). Rien ne quitte l'appareil.
const BASE = "sonora-pistes", VERSION = 1;
// Safari peut laisser indexedDB.open sans réponse (réglages de confidentialité, mise à jour du système) : sans délai maximum, la page
// attendrait pour toujours et resterait vide. Passé ce délai, l'ouverture échoue et Pistes démarre avec un projet neuf, sans rangement.
export const DELAIS = { ouverture: 3500 };
function ouvrir() {
  return new Promise((ok, ko) => {
    if (!("indexedDB" in globalThis)) { ko(new Error("Ce navigateur ne permet pas de ranger des sons.")); return; }
    const minuteur = setTimeout(() => ko(new Error("Le rangement du navigateur ne répond pas.")), DELAIS.ouverture);
    const ok2 = v => { clearTimeout(minuteur); ok(v); }, ko2 = e => { clearTimeout(minuteur); ko(e); };
    let r; try { r = indexedDB.open(BASE, VERSION); } catch (e) { ko2(e); return; }
    r.onblocked = () => ko2(new Error("Le rangement du navigateur est bloqué par un autre onglet."));
    r.onupgradeneeded = () => { const db = r.result; if (!db.objectStoreNames.contains("projets")) db.createObjectStore("projets"); if (!db.objectStoreNames.contains("sons")) db.createObjectStore("sons"); };
    r.onsuccess = () => ok2(r.result); r.onerror = () => ko2(r.error);
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
