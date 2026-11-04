// Moteurs de synthèse extérieurs, utilisés par SONORA Pistes : Faust (compilé dans le navigateur, rendu hors ligne, donc exact et rapide)
// et Csound (WebAssembly, joué en temps réel puis capté). Rien n'est envoyé nulle part : tout se calcule dans la page.
// Les fichiers lourds ne sont chargés qu'au premier usage : le compilateur Faust (environ 6 Mo, déjà servi pour le laboratoire Faust du site) et Csound (environ 5 Mo).

// ---------------------------------------------------------------- Faust
let FAUST = null, NFAUST = 0;
export async function chargerFaust() {
  if (!FAUST) FAUST = (async () => {
    const fw = await import("./faust/faustwasm.js?v=be46a1af21"), racine = new URL("../../faust/compilateur/", import.meta.url).href; // le dossier du compilateur du site, à la racine
    const mod = await fw.instantiateFaustModuleFromFile(racine + "libfaust-wasm.js"), lib = new fw.LibFaust(mod);
    return { fw, comp: new fw.FaustCompiler(lib), version: lib.version() };
  })().catch(e => { FAUST = null; throw e; });
  return FAUST;
}
// Les messages du compilateur, avec une explication en français devant.
export function erreurFaust(m) {
  m = String(m || "").replace(/^Error:\s*/, "").replace(/pistes\d*:(\d+)\s*:\s*ERROR\s*:\s*/g, "Ligne $1 : ").trim();
  const aides = [[/syntax error/i, "Erreur d'écriture : un point-virgule oublié, une parenthèse ou une virgule en trop ?"], [/undefined symbol\s*:\s*(\S+)/i, "Nom inconnu. Vérifie l'orthographe, ou la ligne import(\"stdfaust.lib\"); en haut."],
    [/inputs? and outputs?|sequential composition|split composition|merge composition|parallel/i, "Les fils ne se branchent pas : le nombre de sorties d'un bloc ne correspond pas au nombre d'entrées du suivant."], [/process/i, "Le programme doit définir process = ... ;"]];
  const a = aides.find(([r]) => r.test(m)); return (a ? a[1] + "\n" : "") + m.split("\n").slice(0, 4).join("\n");
}
export async function compilerFaust(code) {
  const C = await chargerFaust(), gen = new C.fw.FaustMonoDspGenerator();
  try { await gen.compile(C.comp, "pistes" + (++NFAUST), code, "-I libraries/ -ftz 2"); } catch (e) { throw new Error(erreurFaust(e && e.message || e)); }
  if (!gen.factory) throw new Error(erreurFaust(C.comp.getErrorMessage()));
  return { gen, meta: JSON.parse(gen.factory.json), version: C.version };
}
// Les réglages du programme (curseurs, boutons, cases) : [{ adresse, nom, min, max, init, pas, type }]
export function parametresFaust(meta) {
  const L = []; (function marche(items) { for (const it of items || []) { if (it.items) marche(it.items); else if (["hslider", "vslider", "nentry"].includes(it.type)) L.push({ adresse: it.address, nom: it.label, min: +it.min, max: +it.max, init: +it.init, pas: +it.step || 0, type: it.type }); else if (["button", "checkbox"].includes(it.type)) L.push({ adresse: it.address, nom: it.label, min: 0, max: 1, init: 0, pas: 1, type: it.type }); } })(meta.ui); return L;
}
// Rend `secondes` de son. `entrees` : tableaux Float32Array pour un programme qui a des entrées (un effet). `valeurs` : { adresse: valeur }.
export async function rendreFaust(gen, meta, { sr = 44100, secondes = 2, entrees = [], valeurs = {} } = {}) {
  const n = Math.max(128, Math.ceil(secondes * sr)), proc = await gen.createOfflineProcessor(sr, 128);
  for (const [a, v] of Object.entries(valeurs)) proc.setParamValue(a, v);
  const e = []; for (let i = 0; i < (meta.inputs || 0); i++) { const x = entrees[Math.min(i, entrees.length - 1)] || new Float32Array(n), y = new Float32Array(n); y.set(x.subarray(0, n)); e.push(y); }
  const sortie = proc.render(e.length ? e : undefined, n); return { canaux: sortie.map(c => Float32Array.from(c)), sr };
}

// ---------------------------------------------------------------- Csound
let CSOUND = null;
export async function chargerCsound() { if (!CSOUND) CSOUND = import("./csound/csound.js?v=be46a1af21").catch(e => { CSOUND = null; throw e; }); return CSOUND; }
// L'en-tête (sr, ksmps, nchnls, 0dbfs) est fixé par SONORA, d'après l'horloge audio de la page ; les mêmes lignes écrites par l'utilisateur sont retirées pour éviter un conflit.
export function orchestreComplet(orc, sr) {
  const propre = String(orc).split("\n").filter(l => !/^\s*(sr|kr|ksmps|nchnls|nchnls_i|0dbfs)\s*=/.test(l)).join("\n");
  return `sr = ${sr}\nksmps = 128\nnchnls = 2\n0dbfs = 1\n${propre}\n`;
}
// Joue l'orchestre et la partition (une ligne i par note) dans le contexte audio donné, et renvoie le nœud d'où sort le son avec une fonction pour tout arrêter.
export async function lancerCsound(ctx, orc, partition) {
  const { Csound } = await chargerCsound(), cs = await Csound({ audioContext: ctx, autoConnect: false, useSAB: false }), messages = [];
  cs.on("message", m => messages.push(String(m)));
  await cs.setOption("-odac"); const r = await cs.compileOrc(orchestreComplet(orc, ctx.sampleRate));
  if (r !== 0) { try { await cs.destroy(); } catch (_) {} throw new Error("Csound n'a pas compilé l'orchestre. " + messages.filter(m => /error|erreur|syntax|undefined/i.test(m)).slice(0, 3).join(" ").slice(0, 300)); }
  await cs.start(); const noeud = await cs.getNode();
  for (const ligne of String(partition || "").split("\n").map(l => l.trim()).filter(l => /^[ife]/.test(l))) await cs.inputMessage(ligne);
  return { noeud, messages, arreter: async () => { try { await cs.stop(); } catch (_) {} try { await cs.destroy(); } catch (_) {} } };
}
// ---------------------------------------------------------------- Pure Data (WebPd, en version alpha : une partie seulement des objets de Pure Data)
let PD = null;
export async function chargerPd() { if (!PD) PD = import("./pd/webpd.js?v=be46a1af21").catch(e => { PD = null; throw e; }); return PD; }
// Les messages de WebPd en français : l'objet inconnu est le cas le plus courant.
export function erreurPd(e) {
  const m = (Array.isArray(e) ? e : [e]).map(x => String(x && x.message || x)).join("\n"), inconnus = m.match(/unknown object types?\s+(.+)/i);
  if (inconnus) return `Un objet de ton patch n'est pas géré par WebPd : « ${inconnus[1].trim().slice(0, 120)} ». WebPd ne connaît qu'une partie des objets de Pure Data : osc~, phasor~, noise~, lop~, hip~, vcf~, line~, delwrite~, metro, mtof, expr...`;
  return m.split("\n").slice(0, 3).join("\n").slice(0, 400);
}
export async function compilerPatchPd(texte, sr = 44100) {
  const { compilerPd } = await chargerPd(), r = await compilerPd(texte, sr);
  if (!r.js) throw new Error(erreurPd(r.erreurs)); return { js: r.js, entrees: /(^|[\s;])adc~(\s|;|$)/.test(texte), avertissements: r.avertissements };
}
// Rend `secondes` de son par blocs de 128 échantillons, comme le ferait Pure Data. `entree` : Float32Array pour un patch qui a un adc~ (un effet).
export function rendrePd(js, { sr = 44100, secondes = 2, entree = null } = {}) {
  const moteur = new Function(js + "\nreturn exports")(), B = 128, n = Math.ceil(secondes * sr), s = [new Float32Array(n), new Float32Array(n)]; moteur.initialize(sr, B);
  for (let i = 0; i < n; i += B) { const e = [new Float32Array(B), new Float32Array(B)], o = [new Float32Array(B), new Float32Array(B)]; if (entree) for (let k = 0; k < B && i + k < n; k++) e[0][k] = e[1][k] = entree[i + k] || 0; moteur.dspLoop(e, o); for (let c = 0; c < 2; c++) s[c].set(o[c].subarray(0, Math.min(B, n - i)), i); }
  return { canaux: s, sr };
}
const pd = lignes => lignes.join("\n") + "\n";

export const EXEMPLES = {
  faust: [
    ["Un son pur (réglable)", `import("stdfaust.lib");\nfreq = hslider("freq", 440, 100, 2000, 1);\nvol = hslider("volume", 0.3, 0, 1, 0.01);\nprocess = os.osc(freq) * vol <: _, _;`],
    ["Un vibrato", `import("stdfaust.lib");\nfreq = hslider("freq", 330, 100, 1000, 1);\nvitesse = hslider("vitesse du vibrato (Hz)", 5, 0.5, 12, 0.1);\nprofondeur = hslider("profondeur", 0.02, 0, 0.1, 0.001);\nprocess = os.osc(freq * (1 + profondeur * os.osc(vitesse))) * 0.3 <: _, _;`],
    ["Un écho (effet : il lui faut un clip)", `import("stdfaust.lib");\ntemps = hslider("temps (s)", 0.3, 0.05, 1, 0.01);\nretour = hslider("retour", 0.5, 0, 0.9, 0.01);\nmel = hslider("mélange", 0.5, 0, 1, 0.01);\necho = + ~ (de.delay(96000, int(temps * ma.SR)) * retour);\nprocess = _ <: (_, (echo * mel)) :> _ <: _, _;`],
    ["Un filtre résonant (effet : il lui faut un clip)", `import("stdfaust.lib");\nfc = hslider("coupure (Hz)", 800, 100, 6000, 1);\nq = hslider("résonance", 3, 0.5, 12, 0.1);\nprocess = fi.resonlp(fc, q, 1) <: _, _;`],
  ],
  pd: [
    ["Un son pur", pd(["#N canvas 0 50 450 300 12;", "#X obj 30 30 osc~ 440;", "#X obj 30 70 *~ 0.3;", "#X obj 30 110 dac~;", "#X connect 0 0 1 0;", "#X connect 1 0 2 0;", "#X connect 1 0 2 1;"])],
    ["Deux sons presque identiques (des battements)", pd(["#N canvas 0 50 450 300 12;", "#X obj 30 30 osc~ 440;", "#X obj 130 30 osc~ 443;", "#X obj 30 70 +~;", "#X obj 30 100 *~ 0.15;", "#X obj 30 130 dac~;", "#X connect 0 0 2 0;", "#X connect 1 0 2 1;", "#X connect 2 0 3 0;", "#X connect 3 0 4 0;", "#X connect 3 0 4 1;"])],
    ["Une note qui revient deux fois par seconde", pd(["#N canvas 0 50 450 300 12;", "#X obj 20 20 phasor~ 2;", "#X obj 20 50 -~ 1;", "#X obj 20 80 *~ -1;", "#X obj 20 110 *~;", "#X obj 120 110 osc~ 330;", "#X obj 20 140 *~;", "#X obj 20 170 *~ 0.4;", "#X obj 20 200 dac~;", "#X connect 0 0 1 0;", "#X connect 1 0 2 0;", "#X connect 2 0 3 0;", "#X connect 2 0 3 1;", "#X connect 3 0 5 0;", "#X connect 4 0 5 1;", "#X connect 5 0 6 0;", "#X connect 6 0 7 0;", "#X connect 6 0 7 1;"])],
    ["Un filtre passe-bas (effet : il lui faut un clip)", pd(["#N canvas 0 50 450 300 12;", "#X obj 30 30 adc~;", "#X obj 30 70 lop~ 800;", "#X obj 30 110 dac~;", "#X connect 0 0 1 0;", "#X connect 1 0 2 0;", "#X connect 1 0 2 1;"])],
  ],
  csound: [
    ["Une note simple", `instr 1\n  kenv linseg 0, 0.02, 1, p3 - 0.1, 1, 0.08, 0\n  a1 oscili 0.5 * kenv, p4\n  outs a1, a1\nendin`, `i1 0 1.5 440`],
    ["Un accord", `instr 1\n  kenv linseg 0, 0.05, 1, p3 - 0.3, 0.8, 0.25, 0\n  a1 oscili 0.25 * kenv, p4\n  a2 oscili 0.12 * kenv, p4 * 2\n  outs a1 + a2, a1 + a2\nendin`, `i1 0 2 261.63\ni1 0 2 329.63\ni1 0 2 392`],
    ["Synthèse FM", `instr 1\n  kenv linseg 0, 0.01, 1, p3 - 0.01, 0\n  a1 foscili 0.4 * kenv, p4, 1, 2.5, 3 * kenv, 1\n  outs a1, a1\nendin`, `f1 0 16384 10 1\ni1 0 2 220`],
  ],
};
