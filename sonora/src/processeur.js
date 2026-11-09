// Processeur audio SONORA : tourne dans l'AudioWorklet (fil audio). Il ne compile jamais : il reçoit du code déjà généré
// par le compilateur, en fabrique des noyaux au moment du chargement (hors du chemin de calcul), puis ne fait que calculer.
// Messages reçus : charger, regler, note-on, note-off, tout-couper, arreter, analyse, lot (plusieurs messages appliqués ensemble, avec accusé de réception).
// Messages envoyés : pret, charge, ack, etat (tous les ~1 s), analyse (tampons pour l'oscilloscope et la FFT), erreur, arrete.
import { Polyphonie } from "./voix.js?v=81a5598e39";

const BLOC_MAX = 512;
const FONDU_PROGRAMME = 0.02, FONDU_ARRET = 0.03; // secondes

const fabrique = (code, sr) => new Function(code)()(sr);

class Programme {
  constructor(msg, sr) {
    this.maitre = fabrique(msg.maitre, sr);
    this.canaux = this.maitre.canaux;
    this.voix = null;
    if (msg.voix) {
      this.voix = { instances: Array.from({ length: msg.voix.nbVoix }, () => fabrique(msg.voix.code, sr)), canaux: msg.voix.canaux };
      this.poly = new Polyphonie(msg.voix.nbVoix, msg.voix.vol);
      this.tmp = Array.from({ length: msg.voix.canaux }, () => new Float32Array(BLOC_MAX));
      this.somme = Array.from({ length: msg.voix.canaux }, () => new Float32Array(BLOC_MAX));
    }
  }
  regler(i, v) { this.maitre.regler(i, v); if (this.voix) for (const x of this.voix.instances) x.regler(i, v); }
  appliquer() { this.maitre.appliquer(); if (this.voix) for (const x of this.voix.instances) x.appliquer(); }
  noteOn(id, h, v) { if (this.voix) this.poly.noteOn(id, h, v); }
  noteOff(id) { if (this.voix) this.poly.noteOff(id); }
  toutCouper() { if (this.voix) this.poly.toutCouper(); }
  get actives() { return this.voix ? this.poly.actives : 0; }
  get incidents() { return this.maitre.incidents + (this.voix ? this.voix.instances.reduce((s, x) => s + x.incidents, 0) : 0); }
  get ecretages() { return this.maitre.ecretages; }
  // sorties : tableau de Float32Array de n échantillons au moins (canaux du maître)
  rendre(sorties, n, entrees) {
    if (!this.voix) { this.maitre.traiter(sorties, n, entrees); return; }
    const nv = this.voix.canaux;
    for (let c = 0; c < nv; c++) this.somme[c].fill(0, 0, n);
    const poly = this.poly;
    for (let i = 0; i < poly.voix.length; i++) {
      const v = poly.voix[i];
      if (!v.actif) continue;
      const k = this.voix.instances[i];
      k.noter(v.hauteur, v.vitesse, v.porte, v.id);
      k.traiter(this.tmp, n);
      let niv = 0;
      for (let c = 0; c < nv; c++) { const t = this.tmp[c], s = this.somme[c]; for (let j = 0; j < n; j++) { const x = t[j]; s[j] += x; const a = x < 0 ? -x : x; if (a > niv) niv = a; } }
      poly.finBloc(i, niv);
    }
    this.maitre.traiter(sorties, n, entrees, this.somme);
  }
}

class ProcesseurSonora extends AudioWorkletProcessor {
  constructor() {
    super();
    this.prog = null; this.ancien = null;
    this.fondu = 0; this.fonduTotal = 1;
    this.arret = 0; this.arretTotal = 1;
    this.mixA = [new Float32Array(BLOC_MAX), new Float32Array(BLOC_MAX)];
    this.mixB = [new Float32Array(BLOC_MAX), new Float32Array(BLOC_MAX)];
    this.anneau = new Float32Array(2048); this.ecriture = 0; this.depuisAnalyse = 0; this.analyse = false;
    this.depuisEtat = 0;
    this.port.onmessage = e => this.recevoir(e.data);
    this.port.postMessage({ type: "pret", sampleRate });
  }
  recevoir(m) {
    try {
      switch (m.type) {
        case "charger": {
          const nouveau = new Programme(m, sampleRate);
          m.reglages.forEach((v, i) => nouveau.regler(i, v)); nouveau.appliquer();
          if (this.prog) { this.ancien = this.prog; this.fondu = this.fonduTotal = Math.max(1, Math.round(FONDU_PROGRAMME * sampleRate)); }
          this.prog = nouveau; this.arret = 0;
          this.port.postMessage({ type: "charge", canaux: nouveau.canaux, voix: nouveau.voix ? nouveau.voix.instances.length : 0 });
          break;
        }
        case "regler": if (this.prog) this.prog.regler(m.i, m.v); break;
        case "note-on": if (this.prog) this.prog.noteOn(m.id, m.hauteur, m.vitesse); break;
        case "note-off": if (this.prog) this.prog.noteOff(m.id); break;
        case "tout-couper": if (this.prog) this.prog.toutCouper(); break;
        case "arreter": if (this.prog) this.arret = this.arretTotal = Math.max(1, Math.round(FONDU_ARRET * sampleRate)); else this.port.postMessage({ type: "arrete" }); break;
        case "analyse": this.analyse = !!m.actif; break;
        case "lot": for (const x of m.messages) this.recevoir(x); this.port.postMessage({ type: "ack", id: m.id }); break;
      }
    } catch (e) { this.prog = null; this.ancien = null; this.port.postMessage({ type: "erreur", message: String(e && e.message || e) }); }
  }
  process(entrees, sorties) {
    const out = sorties[0], n = out[0].length;
    if (!this.prog) return true;
    if (n > BLOC_MAX) { this.prog = null; this.port.postMessage({ type: "erreur", message: `Bloc audio de ${n} échantillons : le moteur accepte ${BLOC_MAX} au plus.` }); return true; }
    try {
      const prog = this.prog, A = this.mixA, B = this.mixB, ent = entrees && entrees[0] && entrees[0].length ? entrees[0] : undefined;
      prog.rendre(A, n, ent);
      const lN = A[0], rN = prog.canaux > 1 ? A[1] : A[0];
      let lB = null, rB = null;
      if (this.ancien) { this.ancien.rendre(B, n, ent); lB = B[0]; rB = this.ancien.canaux > 1 ? B[1] : B[0]; }
      const o0 = out[0], o1 = out.length > 1 ? out[1] : null;
      let fini = false;
      for (let j = 0; j < n; j++) {
        let l = lN[j], r = rN[j];
        if (lB) {
          const t = this.fondu > 0 ? 1 - this.fondu / this.fonduTotal : 1;
          l = lB[j] * (1 - t) + l * t; r = rB[j] * (1 - t) + r * t;
          if (this.fondu > 0) this.fondu--;
        }
        if (this.arret > 0) { const g = this.arret / this.arretTotal; l *= g; r *= g; if (--this.arret === 0) fini = true; }
        else if (fini) { l = 0; r = 0; } // le fondu s'est terminé dans ce bloc : le reste du bloc est silencieux
        o0[j] = l; if (o1) o1[j] = r;
      }
      if (lB && this.fondu <= 0) this.ancien = null;
      if (fini) { this.prog = null; this.ancien = null; this.arretTotal = 1; this.port.postMessage({ type: "arrete" }); return true; }
      if (this.analyse) {
        for (let j = 0; j < n; j++) { this.anneau[this.ecriture] = o0[j]; this.ecriture = (this.ecriture + 1) % 2048; }
        this.depuisAnalyse += n;
        if (this.depuisAnalyse >= 1024) {
          this.depuisAnalyse = 0;
          const c = new Float32Array(2048); for (let j = 0; j < 2048; j++) c[j] = this.anneau[(this.ecriture + j) % 2048];
          this.port.postMessage({ type: "analyse", tampon: c, sampleRate }, [c.buffer]);
        }
      }
      this.depuisEtat += n;
      if (this.depuisEtat >= sampleRate) { this.depuisEtat = 0; this.port.postMessage({ type: "etat", incidents: prog.incidents, ecretages: prog.ecretages, voix: prog.actives }); }
    } catch (e) { this.prog = null; this.ancien = null; this.port.postMessage({ type: "erreur", message: String(e && e.message || e) }); }
    return true;
  }
}
registerProcessor("sonora-processeur", ProcesseurSonora);
