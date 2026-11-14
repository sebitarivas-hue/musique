import { Polyphonie } from "./voix.js?v=508eaef1fd";

// Rendu hors ligne : exécute un noyau compilé sans AudioWorklet. Sert aux tests numériques et à l'export WAV.
export function instancier(module, sr) {
  if (!module || !module.code) throw new Error("Ce module n'a pas été généré : il y a des erreurs ou des modules pas encore disponibles.");
  // eslint-disable-next-line no-new-func
  return new Function(module.code)()(sr);
}

// options : { sr, n (échantillons) ou secondes, bloc (128), reglages: { nom: valeur en unités de base }, plan: [{ a: échantillon, reglages: {...} }], entrees: [Float32Array] }
function noyauDe(code, sr) { return new Function(code)()(sr); }

// Rendu hors ligne d'un module polyphonique : options.notes = [{ a: échantillon, on|off: id, hauteur, vitesse }]
function rendrePoly(module, options) {
  const sr = options.sr ?? 44100, n = options.n ?? Math.round((options.secondes ?? 1) * sr), bloc = options.bloc ?? 128;
  const maitre = noyauDe(module.code, sr);
  const instances = Array.from({ length: module.voix.nbVoix }, () => noyauDe(module.voix.code, sr));
  const poly = new Polyphonie(module.voix.nbVoix, module.voix.vol);
  const indice = Object.fromEntries(module.reglages.map((r, i) => [r.nom, i]));
  const regle = o => { for (const [k, v] of Object.entries(o || {})) { if (!(k in indice)) throw new Error("réglage inconnu : " + k); maitre.regler(indice[k], v); instances.forEach(x => x.regler(indice[k], v)); } };
  regle(options.reglages); maitre.appliquer(); instances.forEach(x => x.appliquer());
  const plan = [...(options.plan || [])].sort((a, b) => a.a - b.a), notes = [...(options.notes || [])].sort((a, b) => a.a - b.a);
  const sorties = Array.from({ length: maitre.canaux }, () => new Float32Array(n));
  const nv = module.voix.canaux, tmp = Array.from({ length: nv }, () => new Float32Array(bloc)), somme = Array.from({ length: nv }, () => new Float32Array(bloc));
  let pos = 0, p = 0, q = 0, maxVoix = 0;
  while (pos < n) {
    while (p < plan.length && plan[p].a <= pos) regle(plan[p++].reglages);
    while (q < notes.length && notes[q].a <= pos) { const e = notes[q++]; if (e.on !== undefined) poly.noteOn(e.on, e.hauteur, e.vitesse ?? 1); else poly.noteOff(e.off); }
    const m = Math.min(bloc, n - pos);
    for (const s of somme) s.fill(0, 0, m);
    poly.voix.forEach((v, i) => {
      if (!v.actif) return;
      instances[i].noter(v.hauteur, v.vitesse, v.porte, v.id);
      instances[i].traiter(tmp.map(t => t.subarray(0, m)), m);
      let niv = 0;
      for (let c = 0; c < nv; c++) for (let k = 0; k < m; k++) { somme[c][k] += tmp[c][k]; niv = Math.max(niv, Math.abs(tmp[c][k])); }
      poly.finBloc(i, niv);
    });
    maxVoix = Math.max(maxVoix, poly.actives);
    maitre.traiter(sorties.map(s => s.subarray(pos, pos + m)), m, undefined, somme.map(s => s.subarray(0, m)));
    pos += m;
  }
  return { canaux: sorties, sr, incidents: maitre.incidents + instances.reduce((s, x) => s + x.incidents, 0), ecretages: maitre.ecretages, voixMax: maxVoix, poly };
}

export function rendre(module, options = {}) {
  if (module && module.voix) return rendrePoly(module, options);
  const sr = options.sr ?? 44100;
  const n = options.n ?? Math.round((options.secondes ?? 1) * sr);
  const bloc = options.bloc ?? 128;
  const noyau = instancier(module, sr);
  const indice = Object.fromEntries(module.reglages.map((r, i) => [r.nom, i]));
  const regle = o => { for (const [k, v] of Object.entries(o || {})) { if (!(k in indice)) throw new Error("réglage inconnu : " + k); noyau.regler(indice[k], v); } };
  regle(options.reglages); noyau.appliquer();
  const plan = [...(options.plan || [])].sort((a, b) => a.a - b.a);
  const sorties = Array.from({ length: noyau.canaux }, () => new Float32Array(n));
  let pos = 0, p = 0;
  while (pos < n) {
    while (p < plan.length && plan[p].a <= pos) regle(plan[p++].reglages);
    const m = Math.min(bloc, n - pos);
    const vues = sorties.map(s => s.subarray(pos, pos + m));
    const ent = options.entrees ? options.entrees.map(e => e.subarray(pos, pos + m)) : undefined;
    noyau.traiter(vues, m, ent);
    pos += m;
  }
  return { canaux: sorties, sr, incidents: noyau.incidents, ecretages: noyau.ecretages };
}
