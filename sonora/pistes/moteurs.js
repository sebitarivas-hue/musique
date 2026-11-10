// Moteurs de synthèse extérieurs, utilisés par SONORA Pistes : Faust (compilé dans le navigateur, rendu hors ligne, donc exact et rapide)
// et Csound (WebAssembly, joué en temps réel puis capté). Rien n'est envoyé nulle part : tout se calcule dans la page.
// Les fichiers lourds ne sont chargés qu'au premier usage : le compilateur Faust (environ 6 Mo, déjà servi pour le laboratoire Faust du site) et Csound (environ 5 Mo).

// ---------------------------------------------------------------- Faust
let FAUST = null, NFAUST = 0;
export async function chargerFaust() {
  if (!FAUST) FAUST = (async () => {
    const fw = await import("./faust/faustwasm.js?v=336655a455"), racine = new URL("../../faust/compilateur/", import.meta.url).href; // le dossier du compilateur du site, à la racine
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
// Les boutons et les cases du programme (button, checkbox) : [{ adresse, nom, type }]. Un rendu hors ligne n'a personne pour appuyer : on les tient à 1 pendant tout le rendu (un instrument à « gate » joue sa note).
export function commandesFaust(meta) {
  const L = []; (function marche(items) { for (const it of items || []) { if (it.items) marche(it.items); else if (["button", "checkbox"].includes(it.type)) L.push({ adresse: it.address, nom: it.label, type: it.type }); } })(meta && meta.ui);
  return L;
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
export async function chargerCsound() { if (!CSOUND) CSOUND = import("./csound/csound.js?v=336655a455").catch(e => { CSOUND = null; throw e; }); return CSOUND; }
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
export async function chargerPd() { if (!PD) PD = import("./pd/webpd.js?v=336655a455").catch(e => { PD = null; throw e; }); return PD; }
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

// ---------------------------------------------------------------- Plus d'exemples, classés par ce qu'on veut faire (relecture du 04/11/2026 : « le menu des exemples est inadapté, il manque une organisation par familles, par objectifs musicaux et par niveau »)
// Les quatre premiers exemples de Faust, les quatre de Pure Data et les trois de Csound gardent leur place (les adresses « exemple 0, 1, 2... » ne changent pas) ; les nouveaux viennent après.
EXEMPLES.faust.push(
  ["Du bruit rose, doux", `import("stdfaust.lib");\nvol = hslider("volume", 0.2, 0, 0.6, 0.01);\nprocess = no.pink_noise * vol <: _, _;`],
  ["Un trémolo (le volume qui tremble)", `import("stdfaust.lib");\nfreq = hslider("hauteur (Hz)", 330, 100, 1000, 1);\nvitesse = hslider("vitesse (Hz)", 6, 0.5, 15, 0.1);\nprofondeur = hslider("profondeur", 0.6, 0, 1, 0.01);\nprocess = os.osc(freq) * (1 - profondeur * (0.5 + 0.5 * os.osc(vitesse))) * 0.3 <: _, _;`],
  ["Deux sons presque identiques (des battements)", `import("stdfaust.lib");\nfreq = hslider("hauteur (Hz)", 440, 100, 1000, 1);\necart = hslider("écart (Hz)", 3, 0, 20, 0.1);\nprocess = (os.osc(freq) + os.osc(freq + ecart)) * 0.15 <: _, _;`],
  ["Une basse à dents de scie, filtrée", `import("stdfaust.lib");\nfreq = hslider("hauteur (Hz)", 55, 30, 200, 1);\nfc = hslider("coupure (Hz)", 400, 80, 3000, 1);\nq = hslider("résonance", 2, 0.5, 8, 0.1);\nprocess = os.sawtooth(freq) : fi.resonlp(fc, q, 1) * 0.3 <: _, _;`],
  ["Un son qui glisse, monte et redescend", `import("stdfaust.lib");\ncentre = hslider("hauteur centrale (Hz)", 220, 80, 800, 1);\nvitesse = hslider("vitesse (Hz)", 0.25, 0.05, 2, 0.01);\nampleur = hslider("ampleur (octaves)", 1, 0, 2, 0.05);\nprocess = os.osc(centre * pow(2, ampleur * os.osc(vitesse))) * 0.3 <: _, _;`],
  ["Une distorsion douce (effet : il lui faut un clip)", `import("stdfaust.lib");\ngain = hslider("gain", 3, 1, 10, 0.1);\nprocess = _ * gain : ef.cubicnl(0.5, 0) * 0.5 <: _, _;`],
  ["Un trémolo (effet : il lui faut un clip)", `import("stdfaust.lib");\nvitesse = hslider("vitesse (Hz)", 5, 0.5, 15, 0.1);\nprofondeur = hslider("profondeur", 0.7, 0, 1, 0.01);\nprocess = _ * (1 - profondeur * (0.5 + 0.5 * os.osc(vitesse))) <: _, _;`],
  ["Une réverbération (effet : il lui faut un clip)", `import("stdfaust.lib");\nduree = hslider("durée", 0.8, 0.3, 0.95, 0.01);\namorti = hslider("amorti", 0.5, 0, 1, 0.01);\nprocess = re.mono_freeverb(duree, duree, amorti, 23) <: _, _;`],
);
EXEMPLES.pd.push(
  ["Un trémolo (le volume qui tremble)", pd(["#N canvas 0 50 450 300 12;", "#X obj 30 30 osc~ 330;", "#X obj 160 30 osc~ 6;", "#X obj 160 60 *~ 0.5;", "#X obj 160 90 +~ 0.5;", "#X obj 30 130 *~;", "#X obj 30 160 *~ 0.3;", "#X obj 30 190 dac~;", "#X connect 0 0 4 0;", "#X connect 1 0 2 0;", "#X connect 2 0 3 0;", "#X connect 3 0 4 1;", "#X connect 4 0 5 0;", "#X connect 5 0 6 0;", "#X connect 5 0 6 1;"])],
  ["Du bruit filtré (un souffle)", pd(["#N canvas 0 50 450 300 12;", "#X obj 30 30 noise~;", "#X obj 30 70 lop~ 900;", "#X obj 30 110 *~ 0.5;", "#X obj 30 150 dac~;", "#X connect 0 0 1 0;", "#X connect 1 0 2 0;", "#X connect 2 0 3 0;", "#X connect 2 0 3 1;"])],
  ["Un son qui monte (glissando)", pd(["#N canvas 0 50 450 300 12;", "#X obj 30 20 loadbang;", "#X msg 30 50 200, 800 2000;", "#X obj 30 80 line~;", "#X obj 30 110 osc~;", "#X obj 30 140 *~ 0.3;", "#X obj 30 170 dac~;", "#X connect 0 0 1 0;", "#X connect 1 0 2 0;", "#X connect 2 0 3 0;", "#X connect 3 0 4 0;", "#X connect 4 0 5 0;", "#X connect 4 0 5 1;"])],
  ["Une modulation en anneau (effet : il lui faut un clip)", pd(["#N canvas 0 50 450 300 12;", "#X obj 30 30 adc~;", "#X obj 160 30 osc~ 300;", "#X obj 30 90 *~;", "#X obj 30 130 dac~;", "#X connect 0 0 2 0;", "#X connect 1 0 2 1;", "#X connect 2 0 3 0;", "#X connect 2 0 3 1;"])],
  ["Un écho (effet : il lui faut un clip)", pd(["#N canvas 0 50 450 300 12;", "#X obj 30 30 adc~;", "#X obj 30 70 delwrite~ ecart 1000;", "#X obj 180 70 delread~ ecart 300;", "#X obj 180 110 *~ 0.6;", "#X obj 30 160 dac~;", "#X connect 0 0 1 0;", "#X connect 0 0 4 0;", "#X connect 0 0 4 1;", "#X connect 2 0 3 0;", "#X connect 3 0 4 0;", "#X connect 3 0 4 1;"])],
);
EXEMPLES.csound.push(
  ["Une mélodie : la gamme de do", `instr 1\n  kenv linseg 0, 0.02, 1, p3 - 0.1, 1, 0.08, 0\n  a1 oscili 0.4 * kenv, p4\n  outs a1, a1\nendin`, ["261.63", "293.66", "329.63", "349.23", "392", "440", "493.88", "523.25"].map((f, i) => `i1 ${i * 0.5} 0.5 ${f}`).join("\n")],
  ["Un arpège qui monte et redescend", `instr 1\n  kenv linseg 0, 0.01, 1, p3 - 0.08, 0.7, 0.07, 0\n  a1 oscili 0.35 * kenv, p4\n  outs a1, a1\nendin`, [261.63, 329.63, 392, 523.25, 392, 329.63, 261.63].map((f, i) => `i1 ${i * 0.3} 0.35 ${f}`).join("\n")],
  ["Un son qui glisse", `instr 1\n  kenv linseg 0, 0.02, 1, p3 - 0.1, 1, 0.08, 0\n  kf linseg p4, p3, p4 * 2\n  a1 oscili 0.4 * kenv, kf\n  outs a1, a1\nendin`, `i1 0 2.5 220`],
  ["Une basse soustractive (dents de scie filtrées)", `instr 1\n  kenv linseg 0, 0.02, 1, p3 - 0.15, 0.8, 0.13, 0\n  a1 vco2 0.5, p4, 0\n  kc linseg 2500, p3, 300\n  a2 moogladder a1, kc, 0.4\n  outs a2 * kenv, a2 * kenv\nendin`, `i1 0 1 55\ni1 1 1 65.41\ni1 2 1 73.42`],
  ["Un son construit par harmoniques (synthèse additive)", `instr 1\n  kenv linseg 0, 0.05, 1, p3 - 0.3, 0.8, 0.25, 0\n  a1 oscili 0.30, p4\n  a2 oscili 0.15, p4 * 2\n  a3 oscili 0.10, p4 * 3\n  a4 oscili 0.07, p4 * 4\n  a5 oscili 0.05, p4 * 5\n  amix = (a1 + a2 + a3 + a4 + a5) * kenv\n  outs amix, amix\nendin`, `i1 0 3 196`],
);

// Pour chaque exemple : ce qu'on veut faire, le niveau, une phrase qui dit ce qu'on entend ou ce qu'on apprend, et s'il transforme un clip (effet). Même ordre que EXEMPLES.
export const BUTS = ["Créer un son", "Transformer un son", "Créer un instrument", "Créer une séquence"];
export const NIVEAUX = ["Découverte", "Programmation", "Recherche"];
export const CATALOGUE = {
  faust: [["Créer un son", "Découverte", "Une note pure : tu règles sa hauteur et son volume."], ["Créer un son", "Programmation", "La hauteur qui oscille légèrement : c'est le vibrato des voix et des violons."], ["Transformer un son", "Programmation", "Le clip revient plusieurs fois, de plus en plus faible."], ["Transformer un son", "Programmation", "Un filtre qui laisse passer les graves et fait ressortir une fréquence."],
    ["Créer un son", "Découverte", "Un souffle sans hauteur, plus doux que le bruit blanc."], ["Créer un son", "Découverte", "Le volume qui monte et descend vite : un son qui tremble."], ["Créer un son", "Découverte", "Deux notes très proches : on entend le volume battre."], ["Créer un instrument", "Programmation", "Une basse : une dent de scie dont tu règles la coupure du filtre."], ["Créer un son", "Programmation", "Une note qui glisse vers l'aigu puis revient, comme une sirène."],
    ["Transformer un son", "Découverte", "Le clip devient dur et brillant."], ["Transformer un son", "Découverte", "Le volume du clip tremble."], ["Transformer un son", "Programmation", "Le clip dans une salle : plus la durée est grande, plus la salle est vaste."]],
  pd: [["Créer un son", "Découverte", "Une note pure, avec deux boîtes reliées."], ["Créer un son", "Découverte", "Deux notes presque pareilles : le volume bat."], ["Créer une séquence", "Programmation", "Une note qui revient deux fois par seconde."], ["Transformer un son", "Découverte", "Le clip, sans les aigus."],
    ["Créer un son", "Découverte", "Le volume qui tremble, avec trois boîtes de plus."], ["Créer un son", "Découverte", "Un souffle : du bruit dont on retire les aigus."], ["Créer un son", "Programmation", "Une note qui monte : un message dit où aller et en combien de temps."], ["Transformer un son", "Programmation", "Le clip multiplié par une note : il devient métallique."], ["Transformer un son", "Programmation", "Le clip, puis son écho trois dixièmes de seconde plus tard."]],
  csound: [["Créer un son", "Découverte", "Une note simple : un instrument, une partition d'une ligne."], ["Créer un instrument", "Découverte", "Trois notes en même temps : un accord."], ["Créer un instrument", "Recherche", "La synthèse FM : une note qui en modifie une autre."],
    ["Créer une séquence", "Découverte", "Huit lignes de partition : la gamme de do."], ["Créer une séquence", "Découverte", "Sept notes, plus courtes : un arpège."], ["Créer un son", "Programmation", "La hauteur monte d'une octave pendant la note."], ["Créer un instrument", "Programmation", "Une basse : des dents de scie dont un filtre se ferme."], ["Créer un instrument", "Recherche", "Cinq harmoniques additionnées : c'est ainsi qu'on fabrique un timbre."]],
};

// ---------------------------------------------------------------- capture du son qui sort d'un nœud (micro, Csound, JavaScript) : le même capteur sert à Pistes et à SONORA Code
export const CAPTEUR = `class Capteur extends AudioWorkletProcessor { process(e) { const c = e[0]; if (c && c.length && c[0]) this.port.postMessage(c.map(x => x.slice(0))); return true; } } registerProcessor("sonora-capteur", Capteur);`;
const CAPTEURS = new WeakSet();
// Branche `source` sur un capteur muet et renvoie { morceaux, fin() } : fin() débranche et rend les morceaux reçus (à assembler avec projet.assemblerCanaux).
export async function ouvrirCapteur(ctx, source) {
  if (!CAPTEURS.has(ctx)) { const url = URL.createObjectURL(new Blob([CAPTEUR], { type: "text/javascript" })); await ctx.audioWorklet.addModule(url); CAPTEURS.add(ctx); }
  const morceaux = [], capteur = new AudioWorkletNode(ctx, "sonora-capteur", { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1], channelCountMode: "max" }), muet = ctx.createGain(); muet.gain.value = 0;
  capteur.port.onmessage = ev => morceaux.push(ev.data); capteur.connect(muet).connect(ctx.destination); source.connect(capteur);
  let fini = false; return { morceaux, fin() { if (!fini) { fini = true; try { source.disconnect(capteur); } catch (_) {} try { capteur.disconnect(); muet.disconnect(); } catch (_) {} } return morceaux; } };
}
