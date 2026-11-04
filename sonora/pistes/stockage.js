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
const nouvelId = () => "j" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const resume = p => { let clips = 0, fin = 0; for (const pi of p.pistes || []) for (const c of pi.clips || []) { clips++; fin = Math.max(fin, c.debut + c.duree); } return { id: p.id, titre: p.titre || "Sans titre", pistes: (p.pistes || []).length, clips, duree: fin, tempo: p.tempo, date: Date.now() }; };
export const Stockage = {
  async lireProjet() { const db = await ouvrir(); return tx(db, "projets", "readonly", s => s.get("courant")); },
  // Le projet courant est écrit sous « courant » (comme avant) et aussi sous « p:<id> » : c'est ce qui permet d'en garder plusieurs. La liste « liste » en garde le résumé.
  async ecrireProjet(p) {
    if (!p.id) p.id = nouvelId(); const copie = JSON.parse(JSON.stringify(p)), db = await ouvrir();
    await tx(db, "projets", "readwrite", s => { s.put(copie, "courant"); s.put(copie, "p:" + p.id); });
    const liste = await tx(db, "projets", "readonly", s => s.get("liste")), L = (liste || []).filter(x => x.id !== p.id); L.unshift(resume(copie)); await tx(db, "projets", "readwrite", s => s.put(L, "liste"));
  },
  // La liste des projets, du plus récent au plus ancien. Un ancien projet (écrit avant « Mes projets ») y est ajouté la première fois.
  async listerProjets() {
    const db = await ouvrir(); let L = await tx(db, "projets", "readonly", s => s.get("liste")) || [];
    const c = await tx(db, "projets", "readonly", s => s.get("courant")); if (c && c.id && !L.some(x => x.id === c.id)) { await this.ecrireProjet(c); L = await tx(db, "projets", "readonly", s => s.get("liste")) || []; }
    return L;
  },
  async lireProjetId(id) { const db = await ouvrir(); return tx(db, "projets", "readonly", s => s.get("p:" + id)); },
  // Ouvrir un projet : il devient le projet courant. Celui qu'on quittait est déjà rangé (la sauvegarde est continue).
  async choisirProjet(id) { const p = await this.lireProjetId(id); if (!p) throw new Error("projet introuvable"); const db = await ouvrir(); await tx(db, "projets", "readwrite", s => s.put(p, "courant")); return p; },
  // Supprimer un projet et, parmi ses sons, ceux qu'aucun autre projet n'utilise.
  async supprimerProjet(id) {
    const db = await ouvrir(), p = await this.lireProjetId(id), L = (await tx(db, "projets", "readonly", s => s.get("liste")) || []).filter(x => x.id !== id), autres = new Set();
    for (const x of L) { const q = await this.lireProjetId(x.id); for (const k of Object.keys((q && q.sons) || {})) autres.add(k); }
    await tx(db, "projets", "readwrite", s => { s.delete("p:" + id); s.put(L, "liste"); });
    const cour = await tx(db, "projets", "readonly", s => s.get("courant")); if (cour && cour.id === id) await tx(db, "projets", "readwrite", s => s.delete("courant"));  // sinon la liste le remettrait
    const perdus = Object.keys((p && p.sons) || {}).filter(k => !autres.has(k)); for (const k of perdus) await this.effacerSon(k).catch(() => {});
    return perdus.length;
  },
  async lireSon(id) { const db = await ouvrir(); return tx(db, "sons", "readonly", s => s.get(id)); },
  async ecrireSon(id, donnees) { const db = await ouvrir(); return tx(db, "sons", "readwrite", s => s.put(donnees, id)); },
  async effacerSon(id) { const db = await ouvrir(); return tx(db, "sons", "readwrite", s => s.delete(id)); },
  async toutEffacer() { const db = await ouvrir(); await tx(db, "sons", "readwrite", s => s.clear()); return tx(db, "projets", "readwrite", s => s.clear()); },
};
