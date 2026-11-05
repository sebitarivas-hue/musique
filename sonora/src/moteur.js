// Moteur audio SONORA côté interface : contexte audio, AudioWorklet, messages, polyphonie, arrêt, reprise, erreurs.
// La compilation se fait dans un Worker (ou, à défaut, sur le fil principal) ; le fil audio ne reçoit que du code déjà généré.

export class ErreurMoteur extends Error { constructor(code, message) { super(message); this.code = code; } }

export class Moteur {
  // Vérifie ce dont le moteur a besoin ; renvoie { ok, raison } sans rien démarrer.
  static diagnostic(portee = globalThis) {
    if (!portee.AudioContext && !portee.webkitAudioContext) return { ok: false, code: "audio-indisponible", raison: "Ce navigateur ne sait pas produire de son (Web Audio absent)." };
    if (!portee.AudioWorkletNode) return { ok: false, code: "audioworklet-indisponible", raison: "Ce navigateur est trop ancien pour SONORA : il lui manque AudioWorklet. Essaie une version récente de Chrome, Firefox ou Safari." };
    return { ok: true };
  }

  constructor(options = {}) {
    this.urlProcesseur = options.urlProcesseur || new URL("./processeur.js?v=6a91c57f22", import.meta.url);
    this.ctx = null; this.noeud = null; this.charge = null;
    this.noms = []; this.valeurs = new Map(); // dernières valeurs de réglage connues, rejouées après un changement de programme
    this.ecouteurs = {};
    this.analyseActive = false;
    this.acks = new Map(); this.numeroLot = 0;
  }

  on(evenement, f) { (this.ecouteurs[evenement] ||= []).push(f); return this; }
  emet(evenement, donnees) { (this.ecouteurs[evenement] || []).forEach(f => { try { f(donnees); } catch (e) { console.error(e); } }); }
  get etat() { return this.ctx ? this.ctx.state : "ferme"; }
  get sampleRate() { return this.ctx ? this.ctx.sampleRate : 0; }
  // Latence de sortie estimée en secondes : un bloc de calcul (128 échantillons) plus ce que le navigateur annonce.
  get latence() { if (!this.ctx) return 0; return 128 / this.ctx.sampleRate + (this.ctx.baseLatency || 0) + (this.ctx.outputLatency || 0); }

  // À appeler depuis un geste de l'utilisateur (clic) : les navigateurs interdisent de démarrer le son autrement.
  async demarrer(options = {}) {
    if (this.ctx) { await this.reprendre(); return this; }
    const d = Moteur.diagnostic();
    if (!d.ok && !options.contexte) throw new ErreurMoteur(d.code, d.raison);
    try {
      this.ctx = options.contexte || new (globalThis.AudioContext || globalThis.webkitAudioContext)({ latencyHint: options.latence ?? "interactive", ...(options.sampleRate ? { sampleRate: options.sampleRate } : {}) });
      await this.ctx.audioWorklet.addModule(this.urlProcesseur);
    } catch (e) { this.ctx = null; throw new ErreurMoteur("demarrage", "Le moteur audio n'a pas pu démarrer : " + (e && e.message || e)); }
    this.noeud = new AudioWorkletNode(this.ctx, "sonora-processeur", { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2] });
    this.noeud.port.onmessage = e => this.recevoir(e.data);
    this.noeud.onprocessorerror = () => this.emet("erreur", { code: "processeur", message: "Le processeur audio s'est arrêté sur une erreur." });
    this.noeud.connect(this.ctx.destination);
    this.ctx.onstatechange = () => this.emet("etat-contexte", this.ctx.state);
    if (this.ctx.state === "suspended" && !options.contexte) await this.ctx.resume();
    if (this.analyseActive) this.noeud.port.postMessage({ type: "analyse", actif: true });
    return this;
  }

  recevoir(m) {
    if (m.type === "erreur") this.emet("erreur", { code: "execution", message: m.message });
    else if (m.type === "etat") this.emet("etat", m);
    else if (m.type === "analyse") this.emet("analyse", m);
    else if (m.type === "charge") { this.chargeInfo = m; this.emet("charge", m); }
    else if (m.type === "arrete") { this.emet("arrete", m); if (this.ctx && this.ctx.suspend && !this.ctx.startRendering) this.ctx.suspend().catch(() => {}); }
    else if (m.type === "ack") { const f = this.acks.get(m.id); if (f) { this.acks.delete(m.id); f(); } }
    else if (m.type === "pret") this.emet("pret", m);
  }

  // module : le résultat de compiler(...).module, avec ses noyaux. Les réglages déjà réglés sont conservés quand le nom existe encore.
  async charger(module, { attendre = false } = {}) {
    if (!this.noeud) throw new ErreurMoteur("non-demarre", "Le moteur n'est pas démarré : appelle demarrer() depuis un clic.");
    if (!module || !module.code) throw new ErreurMoteur("non-compile", "Ce module n'a pas été généré : corrige d'abord les erreurs de compilation.");
    this.noms = module.reglages.map(r => r.nom);
    const reglages = module.reglages.map(r => this.valeurs.has(r.nom) ? this.valeurs.get(r.nom) : r.defaut);
    this.charge = module;
    const attente = attendre ? new Promise(ok => { const f = () => { this.ecouteurs.charge = (this.ecouteurs.charge || []).filter(x => x !== f); ok(); }; this.on("charge", f); }) : null;
    this.noeud.port.postMessage({ type: "charger", maitre: module.code, voix: module.voix ? { code: module.voix.code, nbVoix: module.voix.nbVoix, vol: module.voix.vol, canaux: module.voix.canaux } : null, reglages });
    if (this.ctx.state === "suspended" && !this.ctx.startRendering) await this.reprendre();
    if (attente) await attente;
  }

  regler(nom, valeur) {
    this.valeurs.set(nom, valeur);
    const i = this.noms.indexOf(nom);
    if (i < 0) return false;
    this.noeud.port.postMessage({ type: "regler", i, v: valeur });
    return true;
  }
  // Plusieurs messages appliqués ensemble, au même bloc audio. Résolu quand le processeur a répondu.
  lot(messages) {
    const id = ++this.numeroLot;
    return new Promise(ok => { this.acks.set(id, ok); this.noeud.port.postMessage({ type: "lot", id, messages }); });
  }
  // Un accord : toutes les notes démarrent dans le même bloc. notes : [[id, hauteur, vitesse], ...]
  accord(notes) { return this.lot(notes.map(([id, hauteur, vitesse = 1]) => ({ type: "note-on", id, hauteur, vitesse }))); }
  noteOn(id, hauteur, vitesse = 1) { this.noeud.port.postMessage({ type: "note-on", id, hauteur, vitesse }); }
  noteOff(id) { this.noeud.port.postMessage({ type: "note-off", id }); }
  toutCouper() { this.noeud.port.postMessage({ type: "tout-couper" }); }
  activerAnalyse(actif = true) { this.analyseActive = actif; if (this.noeud) this.noeud.port.postMessage({ type: "analyse", actif }); }

  // Arrêt avec un fondu de 30 ms, puis le contexte est suspendu (le processeur prévient quand le fondu est fini).
  arreter() {
    if (!this.noeud) return Promise.resolve();
    return new Promise(ok => { const f = () => { this.ecouteurs.arrete = (this.ecouteurs.arrete || []).filter(x => x !== f); ok(); }; this.on("arrete", f); this.noeud.port.postMessage({ type: "arreter" }); });
  }
  async reprendre() { if (this.ctx && this.ctx.state !== "running" && this.ctx.resume) await this.ctx.resume(); }
  async fermer() {
    if (!this.ctx) return;
    try { this.noeud.disconnect(); this.noeud.port.close(); } catch (_) {}
    try { if (this.ctx.close) await this.ctx.close(); } catch (_) {}
    this.ctx = null; this.noeud = null;
  }
}

// Compile dans un Worker de module ; si le navigateur ne le permet pas, compile sur le fil principal.
export function compilerDansWorker(source, options = {}, urls = {}) {
  const urlWorker = urls.worker || new URL("./worker-compilation.js?v=6a91c57f22", import.meta.url);
  const direct = async () => { const { compiler } = await import("./index.js?v=6a91c57f22"); const r = compiler(source, options); const { ast, graphe, ...module } = r.module || {}; return { ok: r.ok, diagnostics: r.diagnostics, source, module: r.module ? module : undefined, modules: r.modules, via: "principal" }; };
  if (typeof Worker === "undefined") return direct();
  return new Promise(ok => {
    let w;
    try { w = new Worker(urlWorker, { type: "module" }); } catch (_) { ok(direct()); return; }
    const delai = setTimeout(() => { w.terminate(); ok(direct()); }, urls.delai ?? 5000);
    w.onmessage = e => { clearTimeout(delai); w.terminate(); ok({ ...e.data, via: "worker" }); };
    w.onerror = () => { clearTimeout(delai); w.terminate(); ok(direct()); };
    w.postMessage({ id: 1, source, options });
  });
}
