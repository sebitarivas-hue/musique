// SONORA Pistes : séquenceur audio. Les sons sont importés (glisser-déposer, sélecteur de fichiers), enregistrés au micro, ou rendus depuis la Library.
// La lecture et l'export WAV construisent le même graphe Web Audio (construire) : ce que l'on entend est ce que l'on exporte.
import { COMMANDES, MENUS, commandePour, affichage } from "./commandes.js?v=0c2ed3b721";
import * as Ed from "./editions.js?v=0c2ed3b721";
import * as P from "./projet.js?v=0c2ed3b721";
import { Stockage } from "./stockage.js?v=0c2ed3b721";
import { creerBouton } from "./bouton.js?v=0c2ed3b721";
import * as MI from "./midi.js?v=0c2ed3b721";
import * as N from "./notes.js?v=0c2ed3b721";
import { Rouleau } from "./rouleau.js?v=0c2ed3b721";
import { PanneauPartition } from "./partition/panneau.js?v=0c2ed3b721";
import { separer, NOMS_PARTIES } from "./separation.js?v=0c2ed3b721";
import { separerStems, creerMoteurORT, modelesEnCache, NOMS_STEMS, STEMS, TAILLE_MODELES_MO, DUREE_MAX as DUREE_MAX_STEMS } from "./stems.js?v=0c2ed3b721";
import * as BM from "./batterie_midi.js?v=0c2ed3b721";
import { detecterTempo, etirerCanaux } from "./tempo.js?v=0c2ed3b721";
import { Clavier, brancher as brancherMidi } from "../studio/midi.js?v=0c2ed3b721";
import * as INS from "./instruments.js?v=0c2ed3b721";
import { lirePartition, depuisMusicXml } from "./musicxml.js?v=0c2ed3b721";
import * as OMR from "./omr.js?v=0c2ed3b721";
import { rendreSuiteEch } from "../harmonie/echantillons.js?v=0c2ed3b721";
import * as MO from "./moteurs.js?v=0c2ed3b721";
import { monterPanneaux } from "./panneaux.js?v=0c2ed3b721";
import { monterNotions } from "./notions.js?v=0c2ed3b721";
import { DEMOS } from "./demos.js?v=0c2ed3b721";
import * as B from "./bibliotheque.js?v=0c2ed3b721";
import { encoderWAV } from "../studio/wav.js?v=0c2ed3b721";
import { ENTREES } from "../library/catalogue.js?v=0c2ed3b721";
import { compiler } from "../src/index.js?v=0c2ed3b721";
import { rendre } from "../src/rendu.js?v=0c2ed3b721";

const $ = id => document.getElementById(id);
const points = (...a) => window.COURS_POINTS ? window.COURS_POINTS.gagner(...a) : (window.__pointsEnAttente = window.__pointsEnAttente || []).push(a); // points du cours (sonora/barre-cours.js)
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const etat = { projet: null, buffers: {}, ctx: null, lecture: false, enreg: false, tete: 0, debutCtx: 0, debutTete: 0, sources: [], arme: null, pxs: 60, metro: null };
// La sélection de clips : `choisi` est le clip principal (celui que les réglages de la barre visent), `choisis` tous les clips choisis. Écrire `etat.choisi = id` revient à choisir ce seul clip.
Object.defineProperty(etat, "choisi", { get() { return this._principal || null; }, set(v) { this._principal = v || null; this.choisis = new Set(v ? [v] : []); }, enumerable: true });
etat.choisi = null;
etat.basculerChoix = id => { if (etat.choisis.has(id)) { etat.choisis.delete(id); if (etat._principal === id) etat._principal = [...etat.choisis].pop() || null; } else { etat.choisis.add(id); etat._principal = id; } };
etat.choisirTout = ids => { etat.choisis = new Set(ids); etat._principal = ids.length ? ids[ids.length - 1] : null; };

window.PISTES = etat; window.PISTES_STOCKAGE = Stockage;
const badge = (t, c = "") => { const e = $("etat"); e.textContent = t; e.className = "etat " + c; };
const message = t => { $("message").textContent = t; };
const demosAppel = {}; const notions = monterNotions({ esc, demos: demosAppel, revenir: () => revenirAMonProjet(), retour: () => etat.retourDemo });   // les mots de Pistes : « ? » partout, panneau qu'on ferme pour revenir à la création
const fmtT = t => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, "0")}`;

function contexte() { if (!etat.ctx) etat.ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: "interactive" }); if (etat.ctx.state === "suspended") etat.ctx.resume(); return etat.ctx; }
// Un AudioBuffer pour chaque son (créé à partir des Float32Array rangés).
function bufferDe(ctx, id) {
  const d = etat.buffers[id]; if (!d) return null;
  if (d.cache && d.cache.ctx === ctx) return d.cache.buf;
  const buf = ctx.createBuffer(d.canaux.length, d.canaux[0].length, d.sr); d.canaux.forEach((c, i) => buf.copyToChannel(c, i));
  d.cache = { ctx, buf }; return buf;
}
// Réponse impulsionnelle de réverbération : un bruit stéréo qui décroît de 60 dB en `duree` secondes. Graine fixe : l'export est reproductible.
function reponseSalle(ctx, duree) {
  const n = Math.max(1, Math.round(duree * ctx.sampleRate)), ir = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const x = ir.getChannelData(c); let s = 12345 + c * 777; for (let i = 0; i < n; i++) { s = (s * 1664525 + 1013904223) >>> 0; x[i] = (s / 4294967296 * 2 - 1) * Math.pow(10, -3 * i / n); } }
  return ir;
}
// La réverbération est un programme Faust (faust/reverb.dsp, zita_rev1), compilé à l'avance en WebAssembly et joué par faustwasm (licence LGPL).
let FAUST = null, NREV = 0;
async function usineReverb() {
  if (!FAUST) FAUST = (async () => {
    const fw = await import("./faust/faustwasm.js?v=0c2ed3b721"), base = new URL("./faust/reverb/", import.meta.url);
    const json = await (await fetch(new URL("dsp-meta.json", base))).text(), module = await WebAssembly.compile(await (await fetch(new URL("dsp-module.wasm", base))).arrayBuffer());
    const adresses = {}; (function w(l) { for (const i of l) i.items ? w(i.items) : (adresses[i.shortname || i.label] = i.address); })(JSON.parse(json).ui);
    return { fw, fac: { module, json, soundfiles: {} }, adresses };
  })();
  return FAUST;
}
async function reverbFaust(ctx, duree, aigus) {
  const { fw, fac, adresses } = await usineReverb(), gen = new fw.FaustMonoDspGenerator();
  const n = await gen.createNode(ctx, "sonora-reverb-" + (++NREV), fac); if (!n) throw new Error("nœud Faust indisponible");
  n.setParamValue(adresses.duree, duree); n.setParamValue(adresses.aigus, aigus); return n;
}
// La chaîne d'une piste : clips -> bus -> [filtre] -> son direct + [écho] + [réverbération Faust] -> volume -> panoramique -> sortie.
async function chainePiste(ctx, pi, sortie) {
  const e = P.effetsDe(pi), bus = ctx.createGain(), vol = ctx.createGain(), veilles = []; vol.gain.value = pi.volume;
  let pre = bus;
  if (e.filtre.actif) { const f = ctx.createBiquadFilter(); f.type = e.filtre.type === "passe-haut" ? "highpass" : "lowpass"; f.frequency.value = e.filtre.frequence; f.Q.value = 0.707; bus.connect(f); pre = f; }
  pre.connect(vol);
  if (e.echo.actif) { const d = ctx.createDelay(2), fb = ctx.createGain(), w = ctx.createGain(); d.delayTime.value = e.echo.temps; fb.gain.value = e.echo.retour; w.gain.value = e.echo.melange; pre.connect(d); d.connect(fb); fb.connect(d); d.connect(w); w.connect(vol); }
  if (e.reverb.actif) {
    const w = ctx.createGain(); w.gain.value = e.reverb.melange; let rv = null;
    // Un délai maximum : si le navigateur (Safari en particulier) ne répond jamais à la création du nœud Faust, la lecture ne doit pas attendre pour toujours.
    try { rv = await Promise.race([reverbFaust(ctx, e.reverb.duree, e.reverb.aigus), new Promise((_, ko) => setTimeout(() => ko(new Error("délai dépassé")), 4000))]); etat.reverbMoteur = "faust"; }
    catch (err) { rv = ctx.createConvolver(); rv.buffer = reponseSalle(ctx, e.reverb.duree); etat.reverbMoteur = "secours"; message("La réverbération avancée n'a pas pu démarrer dans ce navigateur : une réverbération de secours la remplace."); }
    pre.connect(rv); rv.connect(w); w.connect(vol);
    // Une source muette reste branchée sur la réverbération : sans elle, le navigateur coupe l'entrée du nœud quand les clips s'arrêtent, et la queue de la réverbération disparaît.
    if (ctx.createConstantSource) { const veille = ctx.createConstantSource(); veille.offset.value = 0; veille.connect(rv); veille.start(); veilles.push(veille); }
  }
  // L'enveloppe de volume agit après les effets (elle coupe aussi leur queue) et avant le panoramique ; sans point, son gain reste 1.
  const env = ctx.createGain(); env.gain.value = 1; vol.connect(env);
  const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null; if (pan) { pan.pan.value = pi.pan; env.connect(pan); pan.connect(sortie); } else env.connect(sortie);
  return { bus, vol, env, pan, veilles };
}
// Programme l'enveloppe de volume de chaque piste, à partir de l'instant `depuis` du projet qui tombe à l'instant `debut` de l'horloge audio.
function appliquerEnveloppes(projet, chaines, depuis, debut) {
  for (const pi of P.pistesAudibles(projet)) {
    const ch = chaines[pi.id], pts = P.enveloppeDe(pi); if (!ch || !ch.env || !pts.length) continue;
    ch.env.gain.setValueAtTime(P.gainEnveloppe(pi, depuis), debut);
    for (const q of pts) if (q.t > depuis) ch.env.gain.linearRampToValueAtTime(q.v, debut + (q.t - depuis));
  }
  for (const pi of P.pistesAudibles(projet)) {   // la courbe de panoramique pilote le panoramique de la piste
    const ch = chaines[pi.id], pts = P.courbeDe(pi, "pan"); if (!ch || !ch.pan || !pts.length) continue;
    ch.pan.pan.setValueAtTime(P.valeurCourbe(pi, "pan", depuis), debut);
    for (const q of pts) if (q.t > depuis) ch.pan.pan.linearRampToValueAtTime(q.v, debut + (q.t - depuis));
  }
}
async function chainesProjet(ctx, projet, sortie) { const ch = {}; for (const pi of P.pistesAudibles(projet)) ch[pi.id] = await chainePiste(ctx, pi, sortie); return ch; }
// Les clips sont programmés sur les chaînes déjà prêtes : un gain par clip, avec des fondus de 5 ms.
function planifier(ctx, projet, depuis, debut, chaines) {
  const sources = [], f = 0.005;
  for (const e of P.planLecture(projet, depuis)) {
    const buf = bufferDe(ctx, e.son), ch = chaines[e.piste]; if (!buf || !ch) continue;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const g = ctx.createGain(), t0 = debut + e.quand, t1 = t0 + e.duree, gc = e.gainClip;
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(gc, t0 + Math.min(f, e.duree / 2)); g.gain.setValueAtTime(gc, Math.max(t0 + f, t1 - f)); g.gain.linearRampToValueAtTime(0, t1);
    src.connect(g); g.connect(ch.bus); src.start(t0, e.decalage, e.duree); sources.push(src);
  }
  return sources;
}

// ---------------------------------------------------------------- lecture
async function lire() {
  if (etat.lecture || etat.prepare) return arreter();
  const ctx = contexte(); etat.prepare = true; let chaines;
  // Safari ne fait avancer l'horloge audio que si le contexte tourne vraiment : on attend la reprise (appelée dans le geste de l'utilisateur) et on le dit si elle n'a pas lieu.
  try { await Promise.race([ctx.resume(), new Promise(ok => setTimeout(ok, 1500))]); } catch (_) {}
  if (ctx.state !== "running") { etat.prepare = false; message("Le navigateur n'a pas démarré le son. Clique à nouveau sur Lire ; sur Safari, vérifie que le site n'est pas coupé dans Réglages pour ce site, Lecture automatique."); return; }
  try { chaines = await chainesProjet(ctx, etat.projet, ctx.destination); } catch (e) { message("La lecture n'a pas pu démarrer : " + (e && e.message || e)); return; } finally { etat.prepare = false; }
  etat.debutCtx = ctx.currentTime + 0.06; etat.debutTete = etat.tete;
  etat.sources = planifier(ctx, etat.projet, etat.tete, etat.debutCtx, chaines); etat.chaines = chaines; appliquerEnveloppes(etat.projet, chaines, etat.tete, etat.debutCtx);
  if ($("metro").checked) etat.metro = metronome(ctx, etat.tete, etat.debutCtx);
  etat.lecture = true; $("b-lire").innerHTML = '<span class="ic ic-stop" aria-hidden="true"></span> Arrêter'; badge(etat.enreg ? "enregistrement" : "lecture", etat.enreg ? "erreur" : "marche");
}
// Modifier le projet PENDANT la lecture : la lecture continue. Les chaînes de pistes et les clips sont reprogrammés depuis l'endroit exact où l'on en est, et l'ancien son s'éteint en 12 ms à l'instant du remplacement
// (au lieu d'arrêter la lecture à chaque geste, comme avant : il fallait arrêter et relire pour entendre une modification).
let replanOccupe = false, replanEnAttente = false;
async function replanifierLecture() {
  if (!etat.lecture || etat.enreg || etat.notes || !etat.ctx) return;
  if (replanOccupe) { replanEnAttente = true; return; }
  replanOccupe = true; const ctx = etat.ctx;
  try {
    let chaines; try { chaines = await chainesProjet(ctx, etat.projet, ctx.destination); } catch (_) { arreter(); return; }
    if (!etat.lecture) { for (const ch of Object.values(chaines)) { try { ch.vol.disconnect(); (ch.veilles || []).forEach(v => v.stop()); } catch (_) {} } return; }
    const t0 = ctx.currentTime + 0.03, pos = etat.debutTete + t0 - etat.debutCtx, sources = planifier(ctx, etat.projet, pos, t0, chaines); appliquerEnveloppes(etat.projet, chaines, pos, t0);
    for (const s of etat.sources) { try { s.stop(t0 + 0.012); } catch (_) {} }
    const anciennes = etat.chaines || {};
    for (const ch of Object.values(anciennes)) { try { ch.vol.gain.cancelScheduledValues(t0); ch.vol.gain.setValueAtTime(ch.vol.gain.value, t0); ch.vol.gain.linearRampToValueAtTime(0.0001, t0 + 0.012); } catch (_) {} }
    setTimeout(() => { for (const ch of Object.values(anciennes)) { try { ch.vol.disconnect(); (ch.veilles || []).forEach(v => v.stop()); } catch (_) {} } }, 250);
    etat.sources = sources; etat.chaines = chaines; etat.debutCtx = t0; etat.debutTete = pos;
    if (etat.metro) { etat.metro.stop(); etat.metro = null; } if ($("metro").checked) etat.metro = metronome(ctx, pos, t0);
  } finally { replanOccupe = false; if (replanEnAttente) { replanEnAttente = false; replanifierLecture(); } }
}
// La session audio de Safari (iOS 16.4 et après) : le micro n'est accessible qu'en « play-and-record » ; ailleurs, la propriété n'existe pas.
function sessionAudio(type) { try { if (navigator.audioSession && navigator.audioSession.type !== type) navigator.audioSession.type = type; } catch (_) {} }
function arreter() {
  for (const s of etat.sources) { try { s.stop(); } catch (_) {} } etat.sources = [];
  for (const ch of Object.values(etat.chaines || {})) { try { ch.vol.disconnect(); (ch.veilles || []).forEach(v => v.stop()); } catch (_) {} } etat.chaines = null;
  if (etat.metro) { etat.metro.stop(); etat.metro = null; }
  if (etat.enreg) finirEnregistrement();
  if (etat.notes) finirNotes();
  etat.lecture = false; $("b-lire").innerHTML = '<span class="ic ic-play" aria-hidden="true"></span> Lire'; badge("prêt");
}
// Métronome : des clics programmés sur les temps (le premier temps de la mesure plus aigu). Il n'est jamais exporté.
function metronome(ctx, depuis, debut) {
  const p = etat.projet, dt = P.dureeTemps(p), osc = []; let k = Math.ceil(depuis / dt - 1e-9);
  const programmer = jusque => { for (; k * dt < jusque; k++) { const t = debut + k * dt - depuis; if (t < ctx.currentTime) continue; const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = k % p.temps === 0 ? 1600 : 1000; g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05); o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + 0.06); osc.push(o); } };
  programmer(depuis + 2); const m = setInterval(() => programmer(etat.tete + 2), 400);
  return { stop() { clearInterval(m); osc.forEach(o => { try { o.stop(); } catch (_) {} }); } };
}
function boucle() {
  requestAnimationFrame(boucle);
  if (etat.lecture && etat.ctx) { etat.tete = Math.max(0, etat.debutTete + etat.ctx.currentTime - etat.debutCtx); const fin = P.dureeTotale(etat.projet); if (!etat.enreg && !etat.notes && etat.tete > fin + 0.3 && fin > 0) { finEcoute(); arreter(); } }
  $("position").textContent = fmtT(etat.tete); $("curseur").style.left = (etat.tete * etat.pxs) + "px";
  if (etat.enreg && etat.capture) { majClipEnCours(); majNiveauMicro(); } if (etat.notes) majNotesEnCours();
}

// La lecture est allée jusqu'au bout du projet sans être arrêtée : les sons entendus en entier comptent.
// Un enregistrement rapporte quand on l'a réécouté en entier ; l'export rapporte si tout le projet a été écouté depuis le début (voir exporter).
function finEcoute() {
  const p = etat.projet, depuis = etat.debutTete, audibles = new Set(P.pistesAudibles(p).map(pi => pi.id));
  if (depuis <= 0.05) etat.toutEcoute = true;
  const entendus = new Set(p.pistes.filter(pi => audibles.has(pi.id)).flatMap(pi => pi.clips.filter(c => c.debut >= depuis - 0.01).map(c => c.son)));
  if ((etat.aReecouter || []).some(id => entendus.has(id))) { points("pistes:enreg", 10, "sonora"); etat.aReecouter = []; }
}

// ---------------------------------------------------------------- enregistrement au micro
// Deux voies en parallèle : un AudioWorklet qui recueille les échantillons bruts (précis, on compense la latence), et en filet de sécurité un MediaRecorder
// (compressé, mais disponible là où le worklet ne répond pas, par exemple certains Safari). Si le worklet ne donne rien, on prend l'enregistrement du MediaRecorder.
const CAPTEUR = MO.CAPTEUR; // le capteur est partagé avec SONORA Code (pistes/moteurs.js)
const MICRO_ERREURS = { NotAllowedError: "Micro refusé. Autorise-le : sur iPhone, Réglages, Safari (ou ton navigateur), Micro ; sur ordinateur, l'icône à gauche de la barre d'adresse.", SecurityError: "Micro refusé : la page doit être ouverte en https.", NotFoundError: "Aucun micro n'a été trouvé sur cet appareil.", NotReadableError: "Le micro est utilisé par une autre application. Ferme-la puis recommence.", OverconstrainedError: "Ce micro n'accepte pas les réglages demandés." };
const arretRecorder = rec => new Promise(ok => { if (!rec || rec.state === "inactive") return ok(); rec.addEventListener("stop", () => ok(), { once: true }); try { rec.stop(); } catch (_) { ok(); } });
function abandonnerCapture(texte) {
  const c = etat.capture; etat.enreg = false; etat.capture = null; document.querySelectorAll(".clip.enreg-en-cours").forEach(x => x.remove()); $("b-enreg").setAttribute("aria-pressed", "false"); $("vu-micro").hidden = true;
  if (c) { try { c.src.disconnect(); if (c.noeud) c.noeud.disconnect(); c.muet && c.muet.disconnect(); } catch (_) {} try { c.rec && c.rec.state !== "inactive" && c.rec.stop(); } catch (_) {} c.flux.getTracks().forEach(t => t.stop()); }
  if (texte) message(texte);
}
// Les pistes qui enregistrent : la piste choisie, ou, en mode « plusieurs pistes », toutes les pistes armées, dans l'ordre du projet.
const estArmee = pi => pistesArmees().some(x => x.id === pi.id);
function pistesArmees() {
  const ids = new Set(etat.multi ? (etat.armees || []) : []); ids.add(etat.arme);
  const L = etat.projet.pistes.filter(pi => ids.has(pi.id)); return L.length ? L : etat.projet.pistes.slice(0, 1);
}
// Les entrées audio : le choix est rangé dans le navigateur ; les noms des micros n'apparaissent qu'après une première autorisation.
async function listerEntrees() {
  const sel = $("entree-audio"); if (!sel || !navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
  let L = []; try { L = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === "audioinput"); } catch (_) {}
  let choisie = ""; try { choisie = localStorage.getItem("pistes:entree") || ""; } catch (_) {}
  const sans = L.length && L.every(d => !d.label);
  sel.innerHTML = `<option value="">Entrée par défaut${sans ? " (les noms apparaissent après la première autorisation)" : ""}</option>` + L.filter(d => d.deviceId && d.deviceId !== "default").map((d, i) => `<option value="${esc(d.deviceId)}">${esc(d.label || "Entrée " + (i + 1))}</option>`).join("");
  sel.value = [...sel.options].some(o => o.value === choisie) ? choisie : "";
}
async function enregistrer() {
  if (etat.enreg) return arreter();
  if (etat.demarrageEnreg) return; etat.demarrageEnreg = true;
  try {
    const armees = pistesArmees(), piste = armees[0]; if (!piste) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { message("Ce navigateur ne donne pas accès au micro (il faut une page en https et un navigateur récent)."); return; }
    const ctx = contexte(); let flux;
    sessionAudio("play-and-record");   // iPhone et iPad : une session « lecture seule » refuse le micro (« AudioSession category is not compatible with audio capture »)
    const entree = $("entree-audio") && $("entree-audio").value; try { flux = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, ...(armees.length > 1 ? { channelCount: { ideal: armees.length } } : {}), ...(entree ? { deviceId: { exact: entree } } : {}) } }); listerEntrees(); }
    catch (e1) { if (e1 && e1.name === "OverconstrainedError") { try { flux = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (e2) { e1 = e2; } } if (!flux) { message(MICRO_ERREURS[e1 && e1.name] || "Micro indisponible : " + (e1 && (e1.message || e1.name) || e1)); return; } }
    if (ctx.state !== "running") { try { await Promise.race([ctx.resume(), new Promise(ok => setTimeout(ok, 1500))]); } catch (_) {} }
    const src = ctx.createMediaStreamSource(flux), analyseur = ctx.createAnalyser(); analyseur.fftSize = 1024; src.connect(analyseur);
    const morceaux = []; let noeud = null, muet = null;
    try {
      if (!ctx.audioWorklet) throw new Error("pas d'AudioWorklet");
      if (!etat.capteurPret) { const url = URL.createObjectURL(new Blob([CAPTEUR], { type: "text/javascript" })); await ctx.audioWorklet.addModule(url); etat.capteurPret = true; }
      noeud = new AudioWorkletNode(ctx, "sonora-capteur", { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1], channelCountMode: "max" }); muet = ctx.createGain(); muet.gain.value = 0; noeud.port.onmessage = ev => morceaux.push(ev.data); src.connect(noeud).connect(muet).connect(ctx.destination);
    } catch (e) { noeud = null; etat.voieMicro = "recorder"; }
    let rec = null; const blocs = [];
    try { if (typeof MediaRecorder !== "undefined") { rec = new MediaRecorder(flux); rec.ondataavailable = ev => { if (ev.data && ev.data.size) blocs.push(ev.data); }; rec.start(250); } } catch (_) { rec = null; }
    if (!noeud && !rec) { try { src.disconnect(); } catch (_) {} flux.getTracks().forEach(t => t.stop()); message("L'enregistrement n'est pas possible dans ce navigateur (ni AudioWorklet ni MediaRecorder)."); return; }
    etat.capture = { flux, src, noeud, muet, morceaux, rec, blocs, analyseur, piste: piste.id, pistes: armees.map(x => x.id), debut: etat.tete, sr: ctx.sampleRate, pic: 0, t0: ctx.currentTime };
    etat.capture.picOnde = 0; etat.enreg = true; majClipEnCours(); $("b-enreg").setAttribute("aria-pressed", "true"); $("vu-micro").hidden = false; message(armees.length > 1 ? `Enregistrement sur ${armees.length} pistes (« ${armees.map(x => x.nom).join(" », « ")} »), un canal de l'entrée par piste… Appuie sur Enregistrer ou Arrêter pour finir.` : `Enregistrement sur « ${piste.nom} »… Appuie sur Enregistrer ou Arrêter pour finir.`);
    if (!etat.lecture) await lire(); else badge("enregistrement", "erreur");
    if (!etat.lecture) { abandonnerCapture(/^Enregistrement sur/.test(document.getElementById("message").textContent) ? "La lecture n'a pas démarré : l'enregistrement est annulé. Appuie à nouveau sur Enregistrer." : null); return; }
    const verif = etat.capture; setTimeout(() => { if (etat.capture !== verif) return; const recu = verif.morceaux.length || verif.blocs.length; if (!recu) message("Le micro ne transmet encore rien. Parle ou tape dans tes mains : si la barre de niveau ne bouge pas, vérifie l'autorisation du micro et que rien d'autre ne l'utilise."); else if (verif.pic < 0.002) message("Le micro est ouvert mais ne capte aucun son : vérifie le micro choisi et son volume dans les réglages de l'appareil."); }, 2200);
    ctx.addEventListener("statechange", function gardien() { if (etat.capture !== verif) { ctx.removeEventListener("statechange", gardien); return; } if (ctx.state === "interrupted" || ctx.state === "suspended") { message("Le son a été interrompu par le système (appel, Siri, autre application). L'enregistrement est arrêté et gardé."); arreter(); } });
  } finally { etat.demarrageEnreg = false; }
}
function majNiveauMicro() {
  const c = etat.capture, vu = $("vu-micro"); if (!c || !c.analyseur) return; const b = new Float32Array(c.analyseur.fftSize); c.analyseur.getFloatTimeDomainData(b); let m = 0; for (const v of b) m = Math.max(m, Math.abs(v)); c.pic = Math.max(c.pic, m);
  vu.firstElementChild.style.width = Math.min(100, Math.round(Math.sqrt(m) * 100)) + "%"; vu.setAttribute("aria-valuenow", String(Math.round(m * 100)));
}
// La prise en direct (retour de Sébastien du 05/11/2026) : dès qu'on appuie sur Enregistrer, un clip s'ouvre dans la piste, au curseur, et la forme de l'onde s'y dessine au fil de la prise.
// Le clip posé à la fin est exactement là où il a commencé. Les pics sont gardés par colonne (une colonne = un pixel de la piste), sans relire tout l'audio à chaque image.
function pointsEnCours(c) {
  const sr = c.sr, colEch = sr / etat.pxs; c.cols = c.cols || c.pistes.map(() => []); c.lus = c.lus || 0; c.nEch = c.nEch || 0;
  if (c.morceaux.length) {
    for (; c.lus < c.morceaux.length; c.lus++) { const bloc = c.morceaux[c.lus], n = bloc[0].length;
      c.pistes.forEach((_, i) => { const x = bloc[Math.min(i, bloc.length - 1)], cols = c.cols[i]; for (let j = 0; j < n; j++) { const k = Math.floor((c.nEch + j) / colEch), v = Math.abs(x[j]); if (!(cols[k] >= v)) cols[k] = v; if (v > c.picOnde) c.picOnde = v; } });
      c.nEch += n; }
  } else if (c.analyseur) {   // enregistreur de secours : pas d'échantillons, on dessine le niveau du micro image par image
    const b = new Float32Array(c.analyseur.fftSize); c.analyseur.getFloatTimeDomainData(b); let m = 0; for (const v of b) m = Math.max(m, Math.abs(v)); const k = Math.floor((etat.ctx.currentTime - c.t0) * etat.pxs);
    c.cols.forEach(cols => { if (!(cols[k] >= m)) cols[k] = m; }); if (m > c.picOnde) c.picOnde = m;
  }
  return c.morceaux.length ? c.nEch / sr : Math.max(0, etat.ctx.currentTime - c.t0);
}
function majClipEnCours() {
  const c = etat.capture; c.picOnde = c.picOnde || 0; const dur = pointsEnCours(c);
  c.pistes.forEach((id, i) => {
    const voie = document.querySelector(`.voie[data-piste="${id}"]`); if (!voie) return; let el = voie.querySelector(".clip.enreg-en-cours");
    if (!el) { el = document.createElement("div"); el.className = "clip enreg-en-cours"; el.innerHTML = `<div class="nom-clip"><span class="point-rec" aria-hidden="true"></span> enregistrement <span class="duree-rec"></span></div><canvas aria-label="Forme de l'onde en cours d'enregistrement" role="img"></canvas>`; voie.appendChild(el); }
    el.style.left = c.debut * etat.pxs + "px"; el.style.width = Math.max(6, dur * etat.pxs) + "px"; el.querySelector(".duree-rec").textContent = dur.toFixed(1).replace(".", ",") + " s";
    const cv = el.querySelector("canvas"), cols = c.cols[i] || [], n = Math.min(8192, Math.max(1, Math.ceil(dur * etat.pxs))), h = 80; if (cv.width !== n) cv.width = n; if (cv.height !== h) cv.height = h;
    const g = cv.getContext("2d"), pas = Math.max(1, Math.ceil(cols.length / n)), ech = Math.max(0.2, c.picOnde); g.clearRect(0, 0, n, h); g.fillStyle = "#d1361f";
    for (let x = 0; x < n; x++) { let m = 0; for (let k = x * pas; k < (x + 1) * pas && k < cols.length; k++) if (cols[k] > m) m = cols[k]; const a = Math.max(1, Math.min(1, m / ech) * (h / 2 - 2)); g.fillRect(x, h / 2 - a, 1, 2 * a); }
  });
  suivreCurseur();
}
// Les notes jouées, dessinées au fur et à mesure dans la piste : un petit rectangle par note, plus haut quand la note est plus aiguë.
function majNotesEnCours() {
  const r = etat.notes; if (!r) return; const voie = document.querySelector(`.voie[data-piste="${etat.notesPiste}"]`); if (!voie) return; const maintenant = dateProjet(), depart = etat.notesDebut ?? 0; let el = voie.querySelector(".clip.enreg-notes");
  if (!el) { el = document.createElement("div"); el.className = "clip enreg-en-cours enreg-notes"; el.innerHTML = `<div class="nom-clip"><span class="point-rec" aria-hidden="true"></span> notes <span class="duree-rec"></span></div><canvas aria-label="Les notes jouées" role="img"></canvas>`; voie.appendChild(el); }
  const dur = Math.max(0, maintenant - depart); el.style.left = depart * etat.pxs + "px"; el.style.width = Math.max(6, dur * etat.pxs) + "px"; el.querySelector(".duree-rec").textContent = dur.toFixed(1).replace(".", ",") + " s";
  const cv = el.querySelector("canvas"), n = Math.min(8192, Math.max(1, Math.ceil(dur * etat.pxs))), h = 80; if (cv.width !== n) cv.width = n; if (cv.height !== h) cv.height = h; const g = cv.getContext("2d"); g.clearRect(0, 0, n, h); g.fillStyle = "#d1361f";
  for (const nt of r.notes) { const x = (nt.t - depart) * etat.pxs, w = Math.max(3, ((nt.fin ?? maintenant) - nt.t) * etat.pxs), y = (1 - Math.max(0, Math.min(1, (nt.note - 36) / 60))) * (h - 8); g.fillRect(Math.round(x * n / Math.max(1, dur * etat.pxs)), y, Math.max(2, w * n / Math.max(1, dur * etat.pxs)), 6); }
  suivreCurseur();
}
// Pendant une prise, la piste défile avec le curseur : on voit toujours ce qui s'enregistre.
function suivreCurseur() {
  const d = $("defile"); if (!d) return; const x = etat.tete * etat.pxs;
  if (x > d.scrollLeft + d.clientWidth - 60 || x < d.scrollLeft) d.scrollLeft = Math.max(0, x - d.clientWidth * 0.25);
}
async function finirEnregistrement() {
  const c = etat.capture; etat.enreg = false; etat.capture = null; document.querySelectorAll(".clip.enreg-en-cours").forEach(x => x.remove()); $("b-enreg").setAttribute("aria-pressed", "false"); $("vu-micro").hidden = true;
  try { c.src.disconnect(); if (c.noeud) c.noeud.disconnect(); if (c.muet) c.muet.disconnect(); } catch (_) {}
  sessionAudio("auto"); await arretRecorder(c.rec); c.flux.getTracks().forEach(t => t.stop());
  let canaux = P.assemblerCanaux(c.morceaux), sr = c.sr, voie = "worklet";
  if (!canaux.length || canaux[0].length < c.sr * 0.05) {
    canaux = [];
    if (c.blocs.length) { try { const buf = await etat.ctx.decodeAudioData(await new Blob(c.blocs).arrayBuffer()); canaux = [buf.getChannelData(0).slice()]; sr = buf.sampleRate; voie = "recorder"; } catch (e) { message("L'enregistrement a été capté mais n'a pas pu être lu par ce navigateur : " + (e && e.message || e)); afficher(); return; } }
  }
  if (!canaux.length || canaux[0].length < sr * 0.05) { message("Enregistrement trop court ou vide : rien n'est gardé. Si le micro ne capte rien, regarde la barre de niveau pendant que tu parles."); afficher(); return; }
  // compensation de la latence de sortie (voie worklet seulement) : la piste d'accompagnement est entendue en retard, donc ce que l'on joue arrive en retard d'autant
  const lat = voie === "worklet" ? Math.min(0.3, (etat.ctx.baseLatency || 0) + (etat.ctx.outputLatency || 0)) : 0, coupe = Math.round(lat * sr);
  const k = Math.min(canaux.length, c.pistes.length), num = Object.values(etat.projet.sons).filter(x => /^Enregistrement \d+$/.test(x.nom)).length + 1, ids = [];
  for (let i = 0; i < k; i++) {
    const x = canaux[i], y = coupe && coupe < x.length / 2 ? x.slice(coupe) : x;
    const id = ajouterAudio(k > 1 ? `Enregistrement ${num + i}` : `Enregistrement ${num}`, [y], sr); ids.push(id); P.placerClip(etat.projet, P.pisteLibre(etat.projet, c.pistes[i], c.debut, y.length / sr), id, c.debut);
  }
  const dur = canaux[0].length / sr - coupe / sr, d = dur.toFixed(1).replace(".", ",");
  const reste = c.pistes.length > k ? ` Cette entrée n'a que ${k} canal${k > 1 ? "ux" : ""} : seule${k > 1 ? "s" : ""} la première${k > 1 ? "s" : ""} piste${k > 1 ? "s" : ""} armée${k > 1 ? "s ont" : " a"} enregistré (${c.pistes.length} armées).` : "";
  message(`Enregistré : ${d} s sur ${k > 1 ? k + " pistes, un canal par piste" : "la piste"}.${voie === "worklet" ? ` Latence compensée : ${Math.round(lat * 1000)} ms.` : " Ton navigateur a utilisé l'enregistreur de secours (un seul canal, sans compensation de latence) : décale le clip à la main si besoin."}${reste}`);
  etat.dernierEnreg = { duree: dur, latence: lat, voie, canaux: canaux.length, pistes: c.pistes.length, enregistres: k }; etat.aReecouter = (etat.aReecouter || []).concat(ids); changer();
}

// ---------------------------------------------------------------- MIDI : jouer un instrument de la Library, enregistrer les notes, les rendre en clip
// Le son en direct vient du moteur temps réel (le même que le Studio) ; le clip, lui, est rendu hors ligne par le noyau SONORA avec les dates des notes :
// ce qu'on entend en jouant est ce qui est mis sur la piste. Les notes ne sont pas gardées comme des notes : le clip est de l'audio, comme les autres.
const midi = etat.midi = { ouvert: false, octave: 4, catalogue: INS.catalogue(), courant: null, inst: null, sampleur: null, chargement: null, clavier: null, enfoncees: new Map(), acces: null };
const entreeJeu = () => midi.catalogue.find(x => x.id === $("midi-instrument").value) || midi.catalogue.find(x => x.id === "ech:clavier") || midi.catalogue[0];
const hauteurMidi = note => MI.frequenceGamme(note, $("midi-gamme").value || "egal");
const dateProjet = () => Math.max(0, etat.lecture && etat.ctx ? etat.debutTete + etat.ctx.currentTime - etat.debutCtx : etat.tete); // la lecture démarre 60 ms après la commande : une note jouée avant n'a pas de date négative
// Charge l'instrument choisi (enregistrements de la banque, ou synthèse rendue une fois) et le branche sur le clavier. Les notes jouées pendant le chargement sont ignorées, et on le dit.
async function moteurMidi() {
  const ctx = contexte(), e = entreeJeu(); if (!midi.sampleur) midi.sampleur = new INS.Sampleur(ctx, ctx.destination);
  if (midi.courant === e.id && midi.inst) return midi.sampleur;
  if (midi.chargement && midi.chargement.id === e.id) return midi.chargement.p;
  const p = (async () => { $("midi-etat").textContent = `Chargement de « ${e.nom} »…`;
    try { const inst = await INS.charger(e, ctx); if (entreeJeu().id !== e.id) return midi.sampleur;   /* l'élève a choisi un autre instrument entre-temps : on ne remplace pas son choix */ midi.inst = inst; midi.courant = e.id; midi.entree = e; midi.sampleur.utiliser(inst); $("midi-etat").textContent = `${e.nom} : prêt. ` + (midi.claviers && midi.claviers.length ? `Clavier MIDI branché : ${midi.claviers.join(", ")}.` : "Joue au clavier de l'ordinateur, à l'écran ou avec un clavier MIDI."); return midi.sampleur; }
    catch (err) { midi.inst = null; midi.courant = null; $("midi-etat").textContent = `« ${e.nom} » n'a pas pu être chargé : ${err && err.message || err}. Choisis un autre instrument.`; throw err; }
    finally { if (midi.chargement && midi.chargement.id === e.id) midi.chargement = null; } })();
  midi.chargement = { id: e.id, p }; return p;
}
async function noteMidi(note, vitesse, actif) {
  const t = dateProjet();
  if (actif) { if (midi.enfoncees.has(note)) return; midi.enfoncees.set(note, true); } else { if (!midi.enfoncees.has(note)) return; midi.enfoncees.delete(note); }
  document.querySelectorAll(`#midi-clavier [data-note="${note}"]`).forEach(b => b.classList.toggle("jouee", actif));
  if (etat.notes) { if (actif) etat.notes.noteOn(note, hauteurMidi(note), vitesse, t); else etat.notes.noteOff(note, t); }
  try { const m = await moteurMidi(); if (!midi.enfoncees.has(note) && actif) return; if (actif) m.noteOn(note, hauteurMidi(note), vitesse); else m.noteOff(note); }
  catch (e) { /* le message est déjà affiché par moteurMidi */ }
}
midi.clavier = new Clavier({ noteOn: (n, h, v) => noteMidi(n, v, true), noteOff: n => noteMidi(n, 1, false) });
// Les pièces de la batterie en pavés : une ligne de pavés colorés, chacun avec son nom et sa lettre au clavier (au lieu d'un clavier de piano où huit noms se chevauchent).
const PAVES = [[49, "#FFC53D"], [51, "#D8E043"], [46, "#8BD450"], [42, "#3FC79A"], [56, "#35BFD3"], [70, "#4C9BF5"], [39, "#7A7CF0"], [37, "#A86CF0"], [41, "#D766D8"], [38, "#F26BA3"], [36, "#FF6B57"]];
function dessinerPaves(z) {
  z.innerHTML = ""; z.classList.add("pads"); const lettres = Object.entries(MI.TOUCHES).reduce((o, [k, v]) => { o[12 * (midi.octave + 1) + v] = k.toUpperCase(); return o; }, {});
  for (const [n, couleur] of PAVES) {
    const b = document.createElement("button"); b.type = "button"; b.className = "pad" + (n === 36 ? " pad-large" : ""); b.dataset.note = n; b.style.setProperty("--c", couleur); const nom = BM.NOMS_LIGNES[n];
    b.setAttribute("aria-label", nom); b.innerHTML = `<i>${lettres[n] || ""}</i><b>${esc(nom)}</b>`;
    b.addEventListener("pointerdown", e => { e.preventDefault(); b.setPointerCapture(e.pointerId); noteMidi(n, 0.8, true); }); const fin = () => noteMidi(n, 1, false); b.addEventListener("pointerup", fin); b.addEventListener("pointercancel", fin); b.addEventListener("lostpointercapture", fin);
    b.addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && !e.repeat) { e.preventDefault(); noteMidi(n, 0.8, true); } }); b.addEventListener("keyup", e => { if (e.key === "Enter" || e.key === " ") noteMidi(n, 1, false); });
    z.appendChild(b);
  }
  $("midi-oct").textContent = midi.octave;
}
function dessinerClavierMidi() {
  const z = $("midi-clavier"); if (BM.estBatterie($("midi-instrument").value)) { dessinerPaves(z); return; } z.classList.remove("pads"); z.innerHTML = ""; const base = 12 * (midi.octave + 1), blanches = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16], noires = { 1: 0, 3: 1, 6: 3, 8: 4, 10: 5, 13: 7, 15: 8 };
  const touches = Object.entries(MI.TOUCHES).reduce((o, [k, v]) => { o[v] = k.toUpperCase(); return o; }, {});
  const batt = BM.estBatterie($("midi-instrument").value);   // une batterie : chaque touche porte le nom de sa pièce
  const bouton = (off, noire) => { const n = base + off, b = document.createElement("button"); b.type = "button"; b.className = "touche " + (noire ? "noire" : "blanche"); b.dataset.note = n; b.setAttribute("aria-label", batt ? (BM.NOMS_LIGNES[BM.ligneDe(n)] || MI.nomNote(n)) : MI.nomNote(n)); b.innerHTML = `<span>${touches[off] || ""}</span>` + (batt && BM.PIECE_DE_NOTE[n] ? `<small>${esc((BM.NOMS_LIGNES[BM.ligneDe(n)] || "").replace("Charleston ", "Charl. ").replace("Cymbale ", "").replace("Grosse caisse", "Grosse c.").replace("Caisse claire", "Claire"))}</small>` : "");
    b.addEventListener("pointerdown", e => { e.preventDefault(); b.setPointerCapture(e.pointerId); noteMidi(n, 0.8, true); }); const fin = () => noteMidi(n, 1, false); b.addEventListener("pointerup", fin); b.addEventListener("pointercancel", fin); b.addEventListener("lostpointercapture", fin);
    b.addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && !e.repeat) { e.preventDefault(); noteMidi(n, 0.8, true); } }); b.addEventListener("keyup", e => { if (e.key === "Enter" || e.key === " ") noteMidi(n, 1, false); }); return b; };
  blanches.forEach(off => z.appendChild(bouton(off, false)));
  Object.entries(noires).forEach(([off, i]) => { const b = bouton(+off, true); b.style.left = `calc(${(i + 1) * 10}% - 3%)`; z.appendChild(b); }); // une noire à cheval sur deux blanches
  $("midi-oct").textContent = midi.octave;
}
function basculerMidi(ouvrir) {
  midi.ouvert = ouvrir === undefined ? !midi.ouvert : ouvrir; $("midi").hidden = !midi.ouvert; $("b-midi").setAttribute("aria-expanded", String(midi.ouvert));
  if (midi.ouvert) { const g = $("midi-gamme"); if (!g.options.length) { g.innerHTML = Object.entries(MI.GAMMES).map(([k, v]) => `<option value="${k}">${esc(v.nom)}</option>`).join(""); g.onchange = () => { $("midi-etat").textContent = g.value === "egal" ? "Tempérament égal : une touche, un demi-ton." : `Gamme choisie : chaque touche est un degré (le do central est le degré 0), l'octave revient tous les ${MI.GAMMES[g.value].cents.length} degrés.`; }; } const sel = $("midi-instrument"); if (!sel.options.length) { sel.innerHTML = INS.GROUPES.map(g => `<optgroup label="${esc(g)}">${midi.catalogue.filter(x => x.groupe === g).map(x => `<option value="${esc(x.id)}">${esc(x.nom)}</option>`).join("")}</optgroup>`).join(""); try { const m = localStorage.getItem("sonora:pistes:instrument"); if (m && midi.catalogue.some(x => x.id === m)) sel.value = m; else sel.value = "ech:clavier"; } catch (_) { sel.value = "ech:clavier"; } moteurMidi().catch(() => {}); } dessinerClavierMidi(); $("midi").scrollIntoView({ block: "nearest" }); }
  else { midi.clavier.toutCouper(); midi.enfoncees.clear(); if (etat.notes) arreter(); }
}
$("b-midi").onclick = () => basculerMidi(); $("midi-fermer").onclick = () => basculerMidi(false);
$("midi-oct-moins").onclick = () => { midi.octave = Math.max(0, midi.octave - 1); dessinerClavierMidi(); }; $("midi-oct-plus").onclick = () => { midi.octave = Math.min(8, midi.octave + 1); dessinerClavierMidi(); };
$("midi-instrument").onchange = () => { try { localStorage.setItem("sonora:pistes:instrument", $("midi-instrument").value); } catch (_) {} if (midi.sampleur) midi.sampleur.toutCouper(); if (BM.estBatterie($("midi-instrument").value)) midi.octave = 2;   /* les notes de batterie commencent au do 2 (36) */ dessinerClavierMidi(); moteurMidi().catch(() => {}); };
$("b-midi-brancher").onclick = async () => {
  if (!navigator.requestMIDIAccess) { $("midi-etat").textContent = "Ce navigateur ne sait pas lire un clavier MIDI (Chrome, Edge ou Opera sur ordinateur et Android le savent ; Safari non). Utilise le clavier de l'ordinateur."; return; }
  try { midi.acces = await navigator.requestMIDIAccess({ sysex: false }); const noms = brancherMidi(midi.acces, midi.clavier);
    midi.claviers = noms; $("midi-etat").textContent = noms.length ? `Clavier MIDI branché : ${noms.join(", ")}.` : "Aucun clavier MIDI détecté. Branche-le, puis appuie à nouveau sur ce bouton."; }
  catch (e) { $("midi-etat").textContent = "L'accès au MIDI a été refusé : " + (e && e.message || e); }
};
// Le clavier de l'ordinateur : pris avant les raccourcis du séquenceur tant que le panneau est ouvert et la case cochée.
document.addEventListener("keydown", e => {
  if (!midi.ouvert || !$("midi-ordi").checked || e.ctrlKey || e.metaKey || e.altKey) return; const t = e.target; if (t && (t.tagName === "INPUT" && t.type !== "checkbox" || t.tagName === "SELECT" || t.tagName === "TEXTAREA")) return;
  const k = e.key.toLowerCase(); if (k === "z" || k === "x") { e.preventDefault(); e.stopPropagation(); if (!e.repeat) { midi.octave = Math.max(0, Math.min(8, midi.octave + (k === "x" ? 1 : -1))); dessinerClavierMidi(); } return; }
  const n = MI.noteDeTouche(k, midi.octave); if (n === null) return; e.preventDefault(); e.stopPropagation(); if (!e.repeat) { midi.touches = midi.touches || new Map(); midi.touches.set(k, n); noteMidi(n, 0.8, true); }
}, true);
document.addEventListener("keyup", e => { const k = e.key.toLowerCase(); if (midi.touches && midi.touches.has(k)) { noteMidi(midi.touches.get(k), 1, false); midi.touches.delete(k); } }, true);
$("b-notes").onclick = async () => {
  if (etat.notes) return arreter();
  const piste = pistesArmees()[0]; if (!piste) return;
  try { await moteurMidi(); } catch (e) { return; }
  // Le curseur est le repère : la prise commence au curseur, et le clip sera posé exactement là, même si la première note vient plus tard.
  etat.notes = new MI.EnregistreurNotes(); etat.notesPiste = piste.id; etat.notesInstrument = midi.inst; etat.notesEntree = midi.entree; etat.notesDebut = etat.lecture ? dateProjet() : etat.tete;
  $("b-notes").setAttribute("aria-pressed", "true"); if (!etat.lecture) await lire(); if (!etat.lecture) { etat.notes = null; $("b-notes").setAttribute("aria-pressed", "false"); return; }
  badge("enregistrement des notes", "erreur"); $("midi-etat").textContent = `Enregistrement des notes sur « ${piste.nom} » avec ${etat.notesEntree.nom}, depuis le curseur. Joue ; appuie à nouveau sur le bouton pour finir.`;
};
// ---------------------------------------------------------------- clips de notes : des notes en temps (notes.js), jouées par un instrument, dont l'audio est refait quand le tempo ou les notes changent
const SR_MIDI = 44100;
// L'audio d'un clip de notes à un tempo donné (synchrone : l'instrument est déjà chargé). Une queue d'une seconde après la fin du clip laisse mourir la dernière note ; le clip, lui, s'arrête à sa durée.
function audioDeNotes(s, inst, tempo) {
  const sec = 60 / tempo, c = rendreSuiteEch(N.evenementsDeNotes(s.midi.notes, tempo), inst.tampons, { instrument: inst.instrument, sr: SR_MIDI, duree: s.midi.temps * sec + 1, relache: inst.relache, niveau: inst.niveau, reverb: 0, strum: 0, variation: false });
  return c.slice(0, 2).map(x => Float32Array.from(x));
}
const rangerAudio = (id, canaux) => { etat.buffers[id] = { canaux, sr: SR_MIDI }; Stockage.ecrireSon(id, { canaux, sr: SR_MIDI }).catch(e => { message("Le son n'a pas pu être rangé dans le navigateur : " + e.message); alerteEcriture(e); }); };
// Refait l'audio d'un son MIDI avec son instrument, au tempo du projet.
async function rendreMidiSon(id) {
  const s = etat.projet.sons[id]; if (!P.estMidi(s)) return false;
  const cat = INS.catalogue(), e = cat.find(x => x.id === s.midi.instrument) || cat.find(x => x.id === "ech:clavier");
  let inst; try { inst = await INS.charger(e, contexte()); } catch (err) { message(`« ${e.nom} » n'a pas pu être chargé : ces notes gardent leur ancien son.`); return false; }
  const tempo = etat.projet.tempo, canaux = audioDeNotes(s, inst, tempo);
  s.midi.rendu = tempo; P.majSonMidi(etat.projet, id, { canaux, sr: SR_MIDI, duree: s.midi.temps * 60 / tempo }); rangerAudio(id, canaux); return true;
}
// Un rythme de la Bibliothèque ou un motif du séquenceur à pas, refait à ce tempo.
async function refaireSource(id) {
  const s = etat.projet.sons[id]; if (!P.estSource(s)) return false; const tempo = etat.projet.tempo, src = s.source; let r = null;
  try {
    if (src.type === "etire") { const o = etat.buffers[src.origine]; if (!o) return false; const ratio = src.bpm / tempo, c = etirerCanaux(o.canaux, ratio, o.sr); r = { canaux: c, sr: o.sr }; }
    else if (src.type === "boucle") { const el = B.elements().find(e => e.id === src.el); if (!el) return false; r = B.fabriquer(el, { tempo, sr: 44100 }); }
    else r = B.rendreGrille(src.grille, { pas: src.pas, tempo, swing: src.swing, kit: src.kit, mesures: src.mesures, sr: 44100, nom: s.nom });
  } catch (err) { message("Un rythme n'a pas pu être refait à ce tempo : " + (err && err.message || err)); return false; }
  if (!r) return false; src.rendu = tempo; P.majSonMidi(etat.projet, id, { canaux: r.canaux.length, sr: r.sr, duree: r.canaux[0].length / r.sr }); etat.buffers[id] = { canaux: r.canaux, sr: r.sr }; Stockage.ecrireSon(id, { canaux: r.canaux, sr: r.sr }).catch(alerteEcriture); return true;
}
// Tous les sons MIDI dont l'audio n'est pas à ce tempo (annuler, ouvrir un projet, changer le tempo) ou manque : on les refait, puis on redessine.
let majMidiEnCours = null;
async function remettreAJourMidi() {
  const faire = Object.keys(etat.projet.sons).filter(id => { const s = etat.projet.sons[id]; return (P.estMidi(s) && (s.midi.rendu !== etat.projet.tempo || !etat.buffers[id])) || (P.estSource(s) && (s.source.rendu !== etat.projet.tempo || !etat.buffers[id])); });
  if (!faire.length) return; const p = majMidiEnCours = Promise.all(faire.map(id => P.estSource(etat.projet.sons[id]) ? refaireSource(id) : rendreMidiSon(id))).then(() => { if (majMidiEnCours === p) { majMidiEnCours = null; afficher(); planifierRangement(250); if (etat.lecture) replanifierLecture(); } }); await p;
}
function finirNotes() {
  const r = etat.notes, inst = etat.notesInstrument, e = etat.notesEntree; etat.notes = null; $("b-notes").setAttribute("aria-pressed", "false"); r.fermer(dateProjet()); document.querySelectorAll(".clip.enreg-notes").forEach(x => x.remove());
  if (r.vide) { message("Aucune note jouée : rien n'est gardé."); return; }
  try {
    const p = etat.projet, sec = 60 / p.tempo, calage = +$("midi-calage").value || 0;
    let depart = etat.notesDebut ?? r.debut(); if (calage) depart = Math.max(0, Math.floor(depart / sec + 1e-6) * sec);   // calé : le clip commence sur un temps, et ses notes sur la grille
    const notes = N.notesEnTemps(r.notes, depart, p.tempo, calage), temps = N.dureeEnTemps(notes, p.temps), duree = temps * sec;
    const num = Object.values(p.sons).filter(x => x.nom.startsWith("Notes ")).length + 1, id = P.ajouterSon(p, { nom: `Notes ${num} (${e.nom})`, duree, sr: SR_MIDI, canaux: 2, midi: { notes, instrument: e.id, temps, rendu: p.tempo } });
    rangerAudio(id, audioDeNotes(p.sons[id], inst, p.tempo)); P.placerClip(p, P.pisteLibre(p, etat.notesPiste, depart, duree), id, depart);
    const n = r.notes.length, cal = calage ? (calage === 1 ? ", calée sur le temps" : calage === 0.5 ? ", calée sur la croche" : ", calée sur la double croche") : "";
    message(`${n} note${n > 1 ? "s" : ""} jouée${n > 1 ? "s" : ""} avec ${e.nom}${cal} : clip de ${temps} temps (${duree.toFixed(1).replace(".", ",")} s). Les notes suivent le tempo : change-le, elles restent sur les mêmes temps.`);
    etat.dernierMidi = { notes: n, duree, debut: depart, instrument: e.id, temps, detail: r.notes.map(x => ({ note: x.note, t: x.t, fin: x.fin })) }; etat.aReecouter = (etat.aReecouter || []).concat(id); changer();
  } catch (err) { message("Les notes n'ont pas pu être rendues : " + (err && err.message || err)); }
}

// ---------------------------------------------------------------- trouver le tempo d'un enregistrement et le caler sur la grille
const tt = { analyse: null, clip: null };
function fermerTempoTrouve() { $("tempo-trouve").hidden = true; tt.analyse = null; tt.clip = null; }
$("b-tempo-trouver").onclick = () => {
  const r = etat.choisi && P.trouverClip(etat.projet, etat.choisi); if (!r) return; const d = etat.buffers[r.clip.son]; if (!d) { message("Le son de ce clip n'est pas chargé."); return; }
  const a0 = Math.floor(r.clip.decalage * d.sr), a1 = Math.min(d.canaux[0].length, a0 + Math.floor(Math.min(r.clip.duree, 60) * d.sr)), mono = new Float32Array(a1 - a0);
  for (const c of d.canaux) for (let i = 0; i < mono.length; i++) mono[i] += (c[a0 + i] || 0) / d.canaux.length;
  const a = detecterTempo(mono, d.sr); $("tempo-trouve").hidden = false; tt.clip = r.clip.id;
  if (!a) { tt.analyse = null; $("tt-texte").textContent = "Je n'ai pas trouvé de pulsation régulière dans ce son. Il faut au moins trois secondes avec des attaques nettes : une batterie, des claquements de mains, une guitare rythmique."; $("tt-caler").hidden = true; $("tt-projet").hidden = true; return; }
  tt.analyse = { bpm: a.bpm, decalage: r.clip.decalage + a.decalage, confiance: a.confiance }; const sec = 60 / a.bpm, p = etat.projet;
  const fiable = a.confiance >= 0.6 ? "c'est net" : a.confiance >= 0.3 ? "assez sûr" : "peu sûr : vérifie en écoutant";
  $("tt-texte").textContent = `Ce son bat à environ ${String(a.bpm).replace(".", ",")} par minute (${fiable}). Son premier temps tombe à ${(a.decalage).toFixed(2).replace(".", ",")} s du début du clip. Le projet est à ${p.tempo} par minute.`;
  $("tt-caler").hidden = false; $("tt-projet").hidden = false; const meme = Math.abs(a.bpm - p.tempo) < 0.5;
  $("tt-caler").textContent = meme ? "Caler sur la grille" : `Le jouer à ${p.tempo} par minute`; $("tt-projet").textContent = `Mettre le projet à ${Math.round(a.bpm)} par minute`; $("tt-projet").hidden = meme;
};
$("tt-fermer").onclick = fermerTempoTrouve;
$("tt-projet").onclick = () => { if (!tt.analyse) return; $("tempo").value = Math.round(tt.analyse.bpm); $("tempo").dispatchEvent(new Event("change")); fermerTempoTrouve(); };
$("tt-caler").onclick = async () => {
  if (!tt.analyse || !tt.clip) return; const p = etat.projet, r = P.calerClip(p, tt.clip, tt.analyse); if (!r) { message("Ce clip suit déjà le tempo du projet."); return; }
  changer(); if (r.ratio !== 1) await remettreAJourMidi(); fermerTempoTrouve();
  message(r.ratio === 1 ? `Calé : le premier temps de ce son tombe maintenant sur un temps de la grille.` : `Ce son est joué à ${p.tempo} par minute, sans changer de hauteur, et son premier temps tombe sur un temps de la grille. Change le tempo du projet : il suivra.`);
};

// ---------------------------------------------------------------- le rouleau : voir et changer les notes d'un clip de notes
const rl = { son: null, minuteur: null, samp: null, lecture: null, onglet: "roll" };
const rouleau = new Rouleau($("rl-corps"), {
  change: (notes, temps) => { const s = etat.projet.sons[rl.son]; if (!P.estMidi(s)) return; s.midi.notes = notes; s.midi.temps = temps; changer(); majRouleauBarre(); clearTimeout(rl.minuteur); rl.minuteur = setTimeout(() => rendreMidiSon(rl.son).then(() => { afficher(); planifierRangement(250); }), 350); },
  ecouter: (n, v) => ecouterNote(n, v),
  selection: () => { majRouleauBarre(); majVitesseBarre(); },
  zoom: z => { $("rl-zoom").textContent = Math.round(z * 100) + " %"; },
});
// La partition du clip (onglet « Partition ») : le texte façon LilyPond écrit les notes, le piano roll les voit, et inversement.
const panneauPartition = new PanneauPartition($("partition"), {
  ecouter: (n, v) => ecouterNote(n, v), message, annuler: () => annuler(),
  appliquer: ({ notes, temps, partition }) => { const s = etat.projet.sons[rl.son]; if (!P.estMidi(s)) return; s.midi.notes = notes; s.midi.temps = temps; s.midi.partition = partition; changer(); majRouleauBarre(); clearTimeout(rl.minuteur); rl.minuteur = setTimeout(() => rendreMidiSon(rl.son).then(() => { afficher(); planifierRangement(250); }), 350); },
  memoriser: partition => { const s = etat.projet.sons[rl.son]; if (!P.estMidi(s)) return; s.midi.partition = partition; changer(); },
});
window.PISTES_PARTITION = panneauPartition;
function afficherOnglet(nom) {
  const s = etat.projet.sons[rl.son], batt = !!(s && P.estMidi(s) && BM.estBatterie(s.midi.instrument)); if (batt) nom = "roll"; rl.onglet = nom; const p = nom === "partition";
  $("rouleau").classList.toggle("mode-partition", p); $("partition").hidden = !p; $("rl-corps").hidden = p;
  $("rl-onglet-roll").setAttribute("aria-selected", String(!p)); $("rl-onglet-partition").setAttribute("aria-selected", String(p)); $("rl-onglet-partition").disabled = batt; $("rl-onglet-partition").dataset.tip = batt ? "La partition n'est pas disponible pour une batterie (une ligne par pièce) : utilise le piano roll." : "Les notes en partition (clé, armure, nuances), avec un texte façon LilyPond pour composer en écrivant";
  if (p && s) panneauPartition.ouvrir({ notes: s.midi.notes, temps: s.midi.temps, parMesure: etat.projet.temps, partition: s.midi.partition || null, tempo: etat.projet.tempo }); else panneauPartition.fermer();
}
$("rl-onglet-roll").onclick = () => { if (rl.son) { rl.onglet = "roll"; ouvrirRouleau(rl.son); } };
$("rl-onglet-partition").onclick = () => { if (rl.son) { rl.onglet = "partition"; ouvrirRouleau(rl.son); } };
function majVitesseBarre() { const g = rouleau.choisies, v = Math.round((g.length ? g.reduce((s, x) => s + x.v, 0) / g.length : rouleau.vitesse) * 100); $("rl-vitesse").value = v; $("rl-vitesse-val").textContent = v; }
$("rl-vitesse").oninput = e => { $("rl-vitesse-val").textContent = e.target.value; rouleau.reglerVitesse(+e.target.value / 100); };
function majRouleauBarre() { const s = etat.projet.sons[rl.son]; if (!P.estMidi(s)) return; $("rl-mesures").textContent = (s.midi.temps / etat.projet.temps) + (s.midi.temps / etat.projet.temps > 1 ? " mesures" : " mesure"); const nb = rouleau.choix.size; $("rl-suppr").disabled = nb === 0; $("rl-copier").disabled = nb === 0; $("rl-dupliquer").disabled = nb === 0; $("rl-suppr").lastChild.textContent = nb > 1 ? ` Supprimer les ${nb} notes` : " Supprimer la note"; $("rl-octave-moins").disabled = $("rl-octave-plus").disabled = !!rouleau.lignes; $("rl-moins").disabled = s.midi.temps <= etat.projet.temps; }
async function ecouterNote(n, v) {
  const s = etat.projet.sons[rl.son]; if (!P.estMidi(s)) return; const cat = INS.catalogue(), e = cat.find(x => x.id === s.midi.instrument) || cat.find(x => x.id === "ech:clavier"); const ctx = contexte();
  try { const inst = await INS.charger(e, ctx); if (!rl.samp) rl.samp = new INS.Sampleur(ctx, ctx.destination); if (rl.samp.inst !== inst) rl.samp.utiliser(inst); rl.samp.noteOn(n, 440 * Math.pow(2, (n - 69) / 12), v); setTimeout(() => rl.samp.noteOff(n), 380); } catch (_) {}
}
function ouvrirRouleau(sonId) {
  const s = etat.projet.sons[sonId]; if (!P.estMidi(s)) { message("Ce clip n'est pas un clip de notes : il n'a pas de notes à modifier. Enregistre des notes avec « Jouer un instrument »."); return; }
  rl.son = sonId; $("rouleau").hidden = false; $("rl-titre").textContent = `Notes de « ${s.nom} »`; rouleau.grille = +$("rl-grille").value; const batt = BM.estBatterie(s.midi.instrument);   // une batterie : une ligne par pièce, avec son nom, au lieu du clavier de piano
  rouleau.ouvrir({ notes: s.midi.notes, temps: s.midi.temps, parMesure: etat.projet.temps, nom: s.nom, ...(batt ? { lignes: BM.LIGNES, ligneDe: BM.ligneDe, nomLigne: n => BM.NOMS_LIGNES[n] || n } : {}) }); majRouleauBarre(); majVitesseBarre(); rouleau.reglerGamme($("rl-tonique").value, $("rl-mode").value); remplirInstrumentsRouleau(s); $("rl-zoom").textContent = Math.round(rouleau.zoom * 100) + " %"; afficherOnglet(rl.onglet); $("rouleau").scrollIntoView({ block: "nearest" });
}
// Le choix de l'instrument du clip : changer l'instrument refait l'audio ; passer d'un instrument à une batterie (ou l'inverse) change aussi les lignes du piano roll.
function remplirInstrumentsRouleau(s) {
  const sel = $("rl-instrument"); if (!sel.options.length) sel.innerHTML = INS.GROUPES.map(g => `<optgroup label="${esc(g)}">${INS.catalogue().filter(x => x.groupe === g).map(x => `<option value="${esc(x.id)}">${esc(x.nom)}</option>`).join("")}</optgroup>`).join("");
  sel.value = s.midi.instrument; if (sel.value !== s.midi.instrument) sel.value = "ech:clavier";
}
$("rl-instrument").onchange = e => {
  const s = etat.projet.sons[rl.son]; if (!P.estMidi(s)) return; const avant = BM.estBatterie(s.midi.instrument); s.midi.instrument = e.target.value; s.midi.rendu = -1; rl.samp = null; changer();
  if (BM.estBatterie(s.midi.instrument) !== avant) ouvrirRouleau(rl.son); remettreAJourMidi();
};
// Après Annuler ou Rétablir, le piano roll ouvert relit les notes du projet.
function rafraichirRouleau() { if (!rl.son) return; if (P.estMidi(etat.projet.sons[rl.son])) ouvrirRouleau(rl.son); else { $("rouleau").hidden = true; rl.son = null; } }
function fermerRouleau() { arreterEcouteRouleau(); panneauPartition.fermer(); clearTimeout(rl.minuteur); const id = rl.son; $("rouleau").hidden = true; rl.son = null; if (rl.lecture) { try { rl.lecture.stop(); } catch (_) {} rl.lecture = null; } if (id && P.estMidi(etat.projet.sons[id]) && etat.projet.sons[id].midi.rendu !== etat.projet.tempo) remettreAJourMidi(); }
$("rl-fin").onclick = fermerRouleau; $("rl-suppr").onclick = () => rouleau.supprimer(); $("rl-vider").onclick = () => rouleau.effacer();
$("rl-grille").onchange = e => rouleau.reglerGrille(+e.target.value);
$("rl-caler").onclick = () => { const g = +$("rl-grille").value || 0.25, s = etat.projet.sons[rl.son]; if (!P.estMidi(s)) return; rouleau.caler(g); };
$("rl-plus").onclick = () => { const s = etat.projet.sons[rl.son]; if (P.estMidi(s)) rouleau.longueur(s.midi.temps + etat.projet.temps); };
$("rl-moins").onclick = () => { const s = etat.projet.sons[rl.son]; if (P.estMidi(s)) rouleau.longueur(s.midi.temps - etat.projet.temps); };
function arreterEcouteRouleau() { cancelAnimationFrame(rl.anim); if (rl.lecture) { const l = rl.lecture; rl.lecture = null; try { l.onended = null; l.stop(); } catch (_) {} } $("rl-ecouter").lastChild.textContent = " Écouter"; rouleau.suivre(null); panneauPartition.suivre(null); }
// « Écouter » joue le clip depuis le repère de la règle (le début s'il n'a pas bougé) ; un trait suit la lecture sur le piano roll.
$("rl-ecouter").onclick = async () => {
  if (rl.lecture) { arreterEcouteRouleau(); return; }
  clearTimeout(rl.minuteur); await rendreMidiSon(rl.son); const d = etat.buffers[rl.son]; if (!d) return; const ctx = contexte(), b = ctx.createBuffer(d.canaux.length, d.canaux[0].length, d.sr); d.canaux.forEach((c, i) => b.copyToChannel(c, i));
  const s = etat.projet.sons[rl.son], sec = 60 / etat.projet.tempo, depart = Math.min(rouleau.curseur, s.midi.temps) * sec, src = ctx.createBufferSource(); src.buffer = b; src.connect(ctx.destination);
  src.onended = () => { if (rl.lecture === src) arreterEcouteRouleau(); }; rl.lecture = src; src.start(0, depart); $("rl-ecouter").lastChild.textContent = " Arrêter"; const t0 = ctx.currentTime - depart;
  const suivre = () => { if (rl.lecture !== src) return; const t = (ctx.currentTime - t0) / sec; if (t >= s.midi.temps) { rouleau.suivre(null); panneauPartition.suivre(null); return; } rouleau.suivre(t); panneauPartition.suivre(t); rl.anim = requestAnimationFrame(suivre); }; suivre();
};
$("rl-zoom-plus").onclick = () => rouleau.reglerZoom(rouleau.zoom * 1.25); $("rl-zoom-moins").onclick = () => rouleau.reglerZoom(rouleau.zoom / 1.25);
$("rl-octave-plus").onclick = () => rouleau.transposer(12); $("rl-octave-moins").onclick = () => rouleau.transposer(-12);
$("rl-tout").onclick = () => rouleau.toutChoisir(); $("rl-copier").onclick = () => rouleau.copier(); $("rl-coller").onclick = () => { if (!rouleau.coller()) message("Rien à coller : choisis des notes puis copie-les."); }; $("rl-dupliquer").onclick = () => rouleau.dupliquer();
$("rl-tonique").onchange = $("rl-mode").onchange = () => rouleau.reglerGamme($("rl-tonique").value, $("rl-mode").value);
// Un clip de notes vide, posé au curseur sur la piste choisie, avec l'instrument du clavier : on écrit les notes dans le piano roll au lieu de les jouer.
$("b-clip-notes").onclick = async () => {
  const p = etat.projet, sec = 60 / p.tempo, temps = 2 * p.temps, instrument = (midi.catalogue.find(x => x.id === $("midi-instrument").value) || { id: "ech:clavier" }).id;
  const num = Object.values(p.sons).filter(x => x.nom.startsWith("Notes ")).length + 1;
  const id = P.ajouterSon(p, { nom: `Notes ${num}`, duree: temps * sec, sr: SR_MIDI, canaux: 2, midi: { notes: [], instrument, temps, rendu: -1 } });
  P.placerClip(p, P.pisteLibre(p, pisteActive().id, etat.tete, temps * sec), id, etat.tete); changer(); await remettreAJourMidi();
  const r = Object.values(p.pistes).flatMap(pi => pi.clips).find(c => c.son === id); if (r) etat.choisi = r.id; afficher(); ouvrirRouleau(id); message(rl.onglet === "partition" ? "Clip de notes vide : glisse une note de la palette sur la portée, tu l'entends en la posant." : "Clip de notes vide : clique dans la grille pour poser une note, glisse-la pour la déplacer.");
};
$("b-modifier-notes").onclick = () => { const r = etat.choisi && P.trouverClip(etat.projet, etat.choisi); if (r) { rl.onglet = "roll"; ouvrirRouleau(r.clip.son); } };
$("b-partition").onclick = () => { const r = etat.choisi && P.trouverClip(etat.projet, etat.choisi); if (!r) return; const s = etat.projet.sons[r.clip.son]; if (P.estMidi(s) && BM.estBatterie(s.midi.instrument)) { message("La partition n'est pas disponible pour une batterie (une ligne par pièce) : utilise le piano roll."); return; } rl.onglet = "partition"; ouvrirRouleau(r.clip.son); };
document.addEventListener("dblclick", e => { const c = e.target.closest && e.target.closest(".clip[data-clip]"); if (!c) return; const r = P.trouverClip(etat.projet, c.dataset.clip); if (r && P.estMidi(etat.projet.sons[r.clip.son])) { etat.choisi = r.clip.id; ouvrirRouleau(r.clip.son); } });
// MIDI : export et import de fichiers standard
function telechargerOctets(octets, nom, type) { const u = URL.createObjectURL(new Blob([octets], { type })), a = document.createElement("a"); a.href = u; a.download = nom; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); }
$("b-export-midi").onclick = () => {
  const pistes = P.notesDesPistes(etat.projet); if (!pistes.length) { message("Il n'y a pas de clip de notes à exporter. Enregistre des notes avec « Jouer un instrument » : les clips audio n'ont pas de notes."); return; }
  const nom = (etat.projet.titre || "projet").replace(/[^\w\u00C0-\u017F -]+/g, "").trim().replace(/\s+/g, "-") || "projet"; telechargerOctets(N.versMidi({ tempo: etat.projet.tempo, temps: etat.projet.temps, pistes }), nom + ".mid", "audio/midi");
  const n = pistes.reduce((s, x) => s + x.notes.length, 0); message(`Fichier MIDI écrit : ${n} note${n > 1 ? "s" : ""} sur ${pistes.length} piste${pistes.length > 1 ? "s" : ""}, à ${etat.projet.tempo} par minute.`);
};
// Un PDF ou une image de partition passe par le service de lecture (outils/serveur_omr) ; le reste est lu sur place.
async function lireOuReconnaitre(octets) {
  if (!OMR.estImage(octets)) return lirePartition(octets);
  const svc = await OMR.trouverService(); if (!svc) throw new Error(OMR.AIDE);
  if (!svc.local && !confirm("Ce fichier va être envoyé au service de lecture de partitions de la classe, qui ne le garde pas. Continuer ?")) throw new Error("Envoi annulé : rien n'a quitté ton ordinateur.");
  const noms = prompt("Les instruments, du haut vers le bas de la page, séparés par des virgules (par exemple : Violon I, Violon II, Alto, Violoncelle). Laisse vide si tu ne sais pas.", ""); if (noms === null) throw new Error("Lecture annulée.");
  message("Lecture de la partition en cours : compte une trentaine de secondes par page. Ne ferme pas la page.");
  const r = await OMR.lireParService(octets, { url: svc.url, instruments: noms }), m = depuisMusicXml(r.musicxml);
  const dout = r.rapport.filter(x => x.trim()); m.avertissements = [...(dout.length > 8 ? [...dout.slice(0, 8), `... et ${dout.length - 8} autres lignes.`] : dout), ...m.avertissements];
  return m;
}
$("fichier-midi").onchange = async e => {
  const f = e.target.files[0]; e.target.value = ""; if (!f) return; let m;
  try { m = await lireOuReconnaitre(new Uint8Array(await f.arrayBuffer())); } catch (err) { message(err.message || "Ce fichier n'a pas pu être lu."); return; }
  if (!m.pistes.length) { message("Ce fichier ne contient aucune note."); return; }
  if (m.titre && etat.projet.pistes.every(x => x.clips.length === 0) && (!etat.projet.titre || /^Sans titre/.test(etat.projet.titre))) etat.projet.titre = m.titre.slice(0, 80);
  const p = etat.projet, vide = p.pistes.every(x => x.clips.length === 0); if (vide && m.tempo >= 20 && m.tempo <= 300) { p.tempo = Math.round(m.tempo); $("tempo").value = p.tempo; }
  const sec = 60 / p.tempo, ids = [];
  for (const [i, x] of m.pistes.slice(0, 16).entries()) {
    const temps = N.dureeEnTemps(x.notes, p.temps), id = P.ajouterSon(p, { nom: `${x.nom} (MIDI)`, duree: temps * sec, sr: SR_MIDI, canaux: 2, midi: { notes: x.notes, instrument: x.instrument || "ech:clavier", temps, rendu: -1 } }), piste = vide && i < p.pistes.length ? p.pistes[i].id : P.pisteLibre(p, p.pistes[0].id, 0, temps * sec);
    P.placerClip(p, piste, id, 0); ids.push(id);
  }
  changer(); await remettreAJourMidi();
  const sup = m.pistes.length > 16 ? ` Seules les 16 premières pistes sont reprises (${m.pistes.length} dans le fichier).` : "", av = m.avertissements && m.avertissements.length ? " " + m.avertissements.join(" ") : "";
  message(`${Math.min(16, m.pistes.length)} piste${m.pistes.length > 1 ? "s" : ""} de notes importée${m.pistes.length > 1 ? "s" : ""}, à ${p.tempo} par minute, chacune avec le timbre de son instrument. Double-clique un clip pour voir et changer ses notes.${sup}${av}`);
};

// (Le panneau « Faust, Csound et Pure Data » a déménagé dans SONORA Code, qui envoie le son vers Pistes : décision de Sébastien, 09/11/2026.)

// ---------------------------------------------------------------- historique : annuler et rétablir
// On range une copie du projet à chaque changement. Les sons sont immuables (un effet crée un nouveau son), donc revenir en arrière ne perd jamais d'audio.
const histo = { pile: [], refaire: [], snap: null };
function empiler() { const nouveau = JSON.stringify(etat.projet); if (histo.snap === null) { histo.snap = nouveau; return; } if (nouveau !== histo.snap) { histo.pile.push(histo.snap); if (histo.pile.length > 100) histo.pile.shift(); histo.refaire = []; histo.snap = nouveau; } }
function restaurer(texte) { histo.snap = texte; etat.projet = P.verifierProjet(JSON.parse(texte)); setTimeout(() => remettreAJourMidi(), 0); if (etat.choisi && !P.trouverClip(etat.projet, etat.choisi)) etat.choisi = null; if (!P.trouverPiste(etat.projet, etat.arme)) etat.arme = etat.projet.pistes[0] && etat.projet.pistes[0].id; if (etat.lecture && !etat.enreg) arreter(); afficher(); clearTimeout(minuteur); minuteur = setTimeout(() => Stockage.ecrireProjet(etat.projet).catch(() => {}), 250); }
function annuler() { if (!histo.pile.length) { message("Rien à annuler."); return; } histo.refaire.push(histo.snap); restaurer(histo.pile.pop()); rafraichirRouleau(); message("Annulé."); }
function retablir() { if (!histo.refaire.length) { message("Rien à rétablir."); return; } histo.pile.push(histo.snap); restaurer(histo.refaire.pop()); rafraichirRouleau(); message("Rétabli."); }
window.PISTES_HISTO = histo;
// ---------------------------------------------------------------- effets sur le clip choisi : ils créent un nouveau son, l'original reste intact
function appliquerEffet(id) {
  const r = etat.choisi && P.trouverClip(etat.projet, etat.choisi); if (!r) { message("Choisis d'abord un clip : clique dessus."); return; }
  if (r.clip.boucle) { message("Cet effet s'applique à un seul passage du son : raccourcis le clip bouclé à un motif (bord droit, au milieu), applique l'effet, puis reboucle."); return; }
  const c = r.clip, src = etat.buffers[c.son]; if (!src) { message("Le son de ce clip n'est pas chargé."); return; }
  const e = Ed.EFFETS[id], res = e.f(Ed.extrait(src, c.decalage, c.duree)), nom = `${etat.projet.sons[c.son].nom} (${e.etiquette})`.slice(0, 80);
  remplacerClip(c, res, nom, e.nom);
}
function remplacerClip(c, res, nom, effet) { const sid = ajouterAudio(nom, res.canaux, res.sr); c.son = sid; c.decalage = 0; c.duree = Ed.duree(res); delete c.boucle; changer(); message(`${effet} appliqué au clip : nouveau son « ${nom} ». Ctrl+Z pour annuler.`); }
// Fenêtre de réglage : construite à partir de Ed.REGLABLES (libellés, bornes, unités). L'aperçu joue les 6 premières secondes du clip ; Appliquer crée un nouveau son, l'original reste intact.
function ouvrirReglage(id) {
  const r = etat.choisi && P.trouverClip(etat.projet, etat.choisi); if (!r) { message("Choisis d'abord un clip : clique dessus."); return; }
  if (r.clip.boucle) { message("Cet effet s'applique à un seul passage du son : raccourcis le clip bouclé à un motif (bord droit, au milieu), applique l'effet, puis reboucle."); return; }
  const c = r.clip, src = etat.buffers[c.son], spec = Ed.REGLABLES[id]; if (!src) { message("Le son de ce clip n'est pas chargé."); return; }
  fermerMenus(); document.getElementById("reglage")?.remove(); const el = document.createElement("div"); el.id = "reglage"; el.className = "aide-clavier"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", spec.nom);
  const champ = p => { const u = p.unite ? ` ${p.unite}` : "";
    if (p.choix) return `<label class="rg-p"><span>${esc(p.libelle)}</span><select data-p="${p.id}">${p.choix.map(([k, n]) => `<option value="${k}"${k === p.def ? " selected" : ""}>${esc(n)}</option>`).join("")}</select></label>`;
    if (p.case) return `<label class="rg-p rg-case"><input type="checkbox" data-p="${p.id}"${p.def ? " checked" : ""}><span>${esc(p.libelle)}</span></label>`;
    const max = (p.unite === "s" && (p.id === "entree" || p.id === "sortie")) ? Math.max(p.min, Math.min(p.max, c.duree)) : p.max;
    return p.log ? `<label class="rg-p"><span>${esc(p.libelle)} <output data-o="${p.id}"></output></span><input type="range" data-p="${p.id}" data-log="1" min="0" max="1000" step="1" value="${Math.round(1000 * Ed.positionLog(p, p.def))}"></label>`
      : `<label class="rg-p"><span>${esc(p.libelle)} <output data-o="${p.id}"></output></span><input type="range" data-p="${p.id}" min="${p.min}" max="${max}" step="${p.pas}" value="${Math.min(p.def, max)}"></label>`; };
  el.innerHTML = `<div class="ac-boite rg-boite"><div class="ac-haut"><b>${esc(spec.nom)}</b><button type="button" class="ac-fermer">Fermer</button></div><div class="rg-corps"><p class="rg-texte">${esc(spec.texte)}</p>${spec.params.map(champ).join("")}<p class="rg-etat" role="status" aria-live="polite"></p><div class="rg-actions"><button type="button" id="rg-apercu">Écouter l'aperçu</button><button type="button" id="rg-appliquer" class="principal">Appliquer au clip</button></div></div></div>`;
  document.body.appendChild(el);
  const valeurs = () => { const v = {}; el.querySelectorAll("[data-p]").forEach(i => { const p = spec.params.find(q => q.id === i.dataset.p); v[p.id] = i.type === "checkbox" ? i.checked : p.choix ? i.value : i.dataset.log ? Ed.valeurLog(p, +i.value / 1000) : +i.value; }); return v; };
  const texte = (p, x) => (Math.abs(x) >= 100 || p.unite === "Hz" ? Math.round(x) : Math.abs(x) >= 10 ? x.toFixed(1) : x.toFixed(2)).toString().replace(".", ",") + (p.unite ? " " + p.unite : "");
  const montrer = () => { const v = valeurs(); el.querySelectorAll("output[data-o]").forEach(o => { const p = spec.params.find(q => q.id === o.dataset.o); o.textContent = texte(p, v[p.id]); }); }; montrer(); el.addEventListener("input", montrer);
  let source = null; const taire = () => { if (source) { try { source.stop(); } catch (_) {} source = null; } };
  const fin = () => { taire(); el.remove(); document.removeEventListener("keydown", cl, true); }, cl = e => { if (e.key === "Escape") { e.stopPropagation(); e.preventDefault(); fin(); } };
  document.addEventListener("keydown", cl, true); el.querySelector(".ac-fermer").onclick = fin; el.addEventListener("click", e => { if (e.target === el) fin(); });
  const etatTxt = el.querySelector(".rg-etat");
  el.querySelector("#rg-apercu").onclick = () => { taire(); try { const res = spec.f(Ed.extrait(src, c.decalage, Math.min(c.duree, 6)), valeurs()), ctx = contexte(), buf = ctx.createBuffer(res.canaux.length, res.canaux[0].length, res.sr); res.canaux.forEach((x, i) => buf.copyToChannel(x, i)); source = ctx.createBufferSource(); source.buffer = buf; source.connect(ctx.destination); source.start(); etat.apercu = { effet: id, duree: buf.duration }; etatTxt.textContent = `Aperçu : ${buf.duration.toFixed(1).replace(".", ",")} s.`; } catch (e) { etatTxt.textContent = "Aperçu impossible : " + e.message; } };
  el.querySelector("#rg-appliquer").onclick = () => { try { const res = spec.f(Ed.extrait(src, c.decalage, c.duree), valeurs()), nom = `${etat.projet.sons[c.son].nom} (${spec.etiquette})`.slice(0, 80); fin(); remplacerClip(c, res, nom, spec.nom); } catch (e) { etatTxt.textContent = "Impossible d'appliquer : " + e.message; } };
  el.querySelector("[data-p]").focus();
}
// ---------------------------------------------------------------- sons
function ajouterAudio(nom, canaux, sr, source) {
  const id = P.ajouterSon(etat.projet, { nom, duree: canaux[0].length / sr, sr, canaux: canaux.length, source });
  etat.buffers[id] = { canaux, sr }; Stockage.ecrireSon(id, { canaux, sr }).catch(e => { message("Le son n'a pas pu être rangé dans le navigateur : " + e.message); alerteEcriture(e); }); return id;
}
async function decoder(fichier) {
  const ctx = contexte(), donnees = await fichier.arrayBuffer();
  const buf = await new Promise((ok, ko) => { const r = ctx.decodeAudioData(donnees, ok, ko); if (r && r.then) r.then(ok, ko); });
  const canaux = []; for (let c = 0; c < Math.min(2, buf.numberOfChannels); c++) canaux.push(buf.getChannelData(c).slice(0));
  return { canaux, sr: buf.sampleRate };
}
async function importer(fichiers, pisteId, debut) {
  let t = debut, n = 0;
  for (const f of [...fichiers]) {
    if (f.size > 60 * 1024 * 1024) { message(`${f.name} : trop gros (60 Mo au plus).`); continue; }
    try { const { canaux, sr } = await decoder(f); const id = ajouterAudio(f.name.replace(/\.[^.]+$/, ""), canaux, sr); P.placerClip(etat.projet, P.pisteLibre(etat.projet, pisteId, t, canaux[0].length / sr), id, t); t += canaux[0].length / sr; n++; }
    catch (e) { message(`${f.name} : ce fichier n'est pas un son que le navigateur sait lire.`); }
  }
  if (n) { message(`${n} son${n > 1 ? "s" : ""} ajouté${n > 1 ? "s" : ""}.`); changer(); }
}
function sonSonora(idEntree) {
  const e = ENTREES.find(x => x.id === idEntree); if (!e) return;
  const r = compiler(e.code); if (!r.ok || !r.module || !r.module.code) { message("Ce programme ne se compile pas."); return; }
  const m = r.module, sr = 44100, n = sr * 4, o = { sr, n };
  if (m.voix) o.notes = [{ a: 0, on: 1, hauteur: 220, vitesse: 0.9 }, { a: 0, on: 2, hauteur: 277.18, vitesse: 0.9 }, { a: 0, on: 3, hauteur: 329.63, vitesse: 0.9 }, { a: sr * 2.5, off: 1 }, { a: sr * 2.5, off: 2 }, { a: sr * 2.5, off: 3 }];
  if (m.entrees.some(x => x.genre === "audio")) { const x = new Float32Array(n); x[0] = 0.9; x[sr] = 0.9; x[sr * 2] = 0.9; o.entrees = [x]; }
  const sortie = rendre(m, o), pi = P.trouverPiste(etat.projet, etat.arme) || etat.projet.pistes[0];
  const id = ajouterAudio(e.titre, sortie.canaux.slice(0, 2), sr), t0 = P.aimanter(etat.projet, etat.tete, +$("aimant").value); P.placerClip(etat.projet, P.pisteLibre(etat.projet, pi.id, t0, 4), id, t0);
  message(`« ${e.titre} » ajouté : 4 s rendues par SONORA.`); changer();
}

// ---------------------------------------------------------------- affichage
function dessinerOnde(cv, son, clip) {
  const d = etat.buffers[clip.son]; const w = cv.width = Math.max(4, Math.round(clip.duree * etat.pxs)), h = cv.height = 58, g = cv.getContext("2d");
  g.clearRect(0, 0, w, h); if (!d) return; const x = d.canaux[0], B = clip.boucle ? P.longueurMotif(etat.projet, clip) : 0, pas = Math.max(1, d.sr / etat.pxs);
  g.fillStyle = "#11110F"; for (let i = 0; i < w; i++) { let mn = 0, mx = 0; const ti = B ? (i / etat.pxs) % B : i / etat.pxs, s = Math.floor((clip.decalage + ti) * d.sr), e2 = Math.min(x.length, s + Math.ceil(pas)); for (let j = s; j < e2; j++) { if (x[j] < mn) mn = x[j]; if (x[j] > mx) mx = x[j]; } const y0 = h / 2 - mx * h / 2 * 0.95, y1 = h / 2 - mn * h / 2 * 0.95; g.fillRect(i, y0, 1, Math.max(1, y1 - y0)); }
  if (B) { g.fillStyle = "rgba(17,17,15,.55)"; for (let k = 1; k * B * etat.pxs < w; k++) g.fillRect(Math.round(k * B * etat.pxs), 0, 2, h); }   // un trait à chaque répétition du motif
}
function afficher() {
  majAnnuler(); const p = etat.projet, largeur = Math.max(30, P.dureeTotale(p) + 16) * etat.pxs;
  $("tempo").value = p.tempo;
  // règle : une marque par mesure
  const dm = P.dureeMesure(p); let r = ""; for (let m = 0; m * dm * etat.pxs < largeur; m++) r += `<span style="left:${m * dm * etat.pxs}px">${m + 1}</span>`;
  $("regle").innerHTML = r; $("regle").style.width = largeur + "px"; $("voies").style.width = largeur + "px";
  $("entetes").innerHTML = `<div class="ent-regle"></div>` + p.pistes.map(pi => { const nfx = P.rackDe(pi).length; return `<div class="entete${estArmee(pi) ? " armee" : ""}" data-piste="${pi.id}">
    <input type="text" value="${esc(pi.nom)}" aria-label="Nom de la piste" maxlength="30">
    <div class="ent-b"><button type="button" class="b-arme" aria-pressed="${estArmee(pi)}" title="Enregistrer sur cette piste">Rec</button><button type="button" class="b-muet" aria-pressed="${pi.muet}" title="Muet">M</button><button type="button" class="b-solo" aria-pressed="${pi.solo}" title="Solo">S</button><button type="button" class="b-fx" aria-pressed="${etat.fx === pi.id}" title="Effets de la piste">Effets${nfx ? " " + nfx : ""}</button><button type="button" class="b-env" aria-pressed="${etat.env === pi.id}" title="Courbes : dessiner sur la piste comment le volume et le panoramique changent au fil du temps"><span class="ic ic-courbe" aria-hidden="true"></span> Courbes${P.courbeDe(pi, "volume").length + P.courbeDe(pi, "pan").length ? " <i>" + (P.courbeDe(pi, "volume").length + P.courbeDe(pi, "pan").length) + "</i>" : ""}</button><button type="button" class="b-plus" aria-label="Plus de réglages pour ${esc(pi.nom)} : volume, panoramique, effets, enveloppe" title="Volume, panoramique, effets, enveloppe">&hellip;</button></div>
    <input type="range" class="vol-h" min="0" max="1.5" step="0.01" value="${pi.volume}" aria-label="Volume de ${esc(pi.nom)}" title="Volume de la piste">
    <div class="ent-k"></div></div>`; }).join("");
  const grille = `background-size: ${P.dureeTemps(p) * etat.pxs}px 100%`;
  $("voies").innerHTML = p.pistes.map(pi => `<div class="voie" data-piste="${pi.id}" style="${grille}" aria-label="Piste ${esc(pi.nom)}">${pi.clips.map(c => `<div class="clip${etat.choisis.has(c.id) ? " choisi" : ""}${c.boucle ? " boucle" : ""}" data-clip="${c.id}" style="left:${c.debut * etat.pxs}px;width:${Math.max(4, c.duree * etat.pxs)}px" tabindex="0" aria-label="${esc((p.sons[c.son] || {}).nom || "son")}, à ${c.debut.toFixed(2)} s${c.boucle ? ", bouclé" : ""}"><div class="nom-clip">${c.boucle ? "↻ " : ""}${esc((p.sons[c.son] || {}).nom || "son")}</div><canvas></canvas><span class="poi poi-g" aria-hidden="true"></span><span class="poi poi-d" aria-hidden="true"></span><span class="poi poi-boucle" aria-hidden="true">↻</span></div>`).join("")}</div>`).join("");
  for (const el of document.querySelectorAll(".clip[data-clip]")) { const r2 = P.trouverClip(p, el.dataset.clip); dessinerOnde(el.querySelector("canvas"), p.sons[r2.clip.son], r2.clip); }
  brancherEntetes(); brancherVoies(); dessinerEnveloppes(); majAuto(); majSelection(); afficherEffets(); majDebut();
}
// ---------------------------------------------------------------- les courbes d'une piste (volume et panoramique) : un calque SVG sur la piste, éditable sur la piste choisie (bouton Courbes)
// Un clic sur un point le choisit, un clic dans le vide en pose un nouveau, on glisse pour déplacer. La barre « Courbes » (#auto) dit ce qu'on édite et propose Supprimer le point,
// Effacer la courbe et Terminé. « Voir les courbes » les montre ou les cache sur les pistes qu'on n'édite pas ; le son, lui, les suit toujours.
const SVGNS = "http://www.w3.org/2000/svg", pcEnv = v => Math.round(v * 100) + " %", virg = n => n.toFixed(2).replace(".", ",");
const ETIQ_VALEUR = (k, v) => k === "pan" ? (Math.abs(v) < 0.005 ? "au centre" : Math.round(Math.abs(v) * 100) + " % à " + (v < 0 ? "gauche" : "droite")) : "volume " + pcEnv(v);
const RAYON_PRISE = 18;   // un clic à moins de 18 pixels d'un point le prend, au lieu d'en poser un autre
function dessinerEnveloppes() {
  const p = etat.projet;
  for (const voie of document.querySelectorAll(".voie")) {
    const pi = P.trouverPiste(p, voie.dataset.piste), edite = etat.env === pi.id, k = etat.courbe || "volume", C = P.COURBES[k], autre = k === "volume" ? "pan" : "volume";
    const ptsActive = P.courbeDe(pi, k), ptsAutre = P.courbeDe(pi, autre);
    if (!edite && etat.voirCourbes === false) continue; if (!ptsActive.length && !ptsAutre.length && !edite) continue;
    const W = parseFloat(voie.parentElement.style.width) || voie.scrollWidth, H = voie.clientHeight || 168, X = t => t * etat.pxs, Yde = (kk, v) => { const c = P.COURBES[kk]; return (1 - (v - c.min) / (c.max - c.min)) * (H - 8) + 4; }, Y = v => Yde(k, v);
    const svg = document.createElementNS(SVGNS, "svg"); svg.setAttribute("class", "env" + (edite ? " env-edit" : "") + " courbe-" + k); svg.setAttribute("width", W); svg.setAttribute("height", H); svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("role", "group"); svg.setAttribute("aria-label", `Courbes de ${pi.nom} : volume ${P.courbeDe(pi, "volume").length} point${P.courbeDe(pi, "volume").length > 1 ? "s" : ""}, panoramique ${P.courbeDe(pi, "pan").length} point${P.courbeDe(pi, "pan").length > 1 ? "s" : ""}`);
    const el = (nom, at) => { const e = document.createElementNS(SVGNS, nom); for (const [a, v] of Object.entries(at)) e.setAttribute(a, v); return e; };
    const trace = (L, kk) => L.length ? [`0,${Yde(kk, L[0].v)}`, ...L.map(q => `${X(q.t)},${Yde(kk, q.v)}`), `${W},${Yde(kk, L[L.length - 1].v)}`].join(" ") : "";
    if (edite) {   // repères de lecture : la valeur « neutre » (volume 100 %, panoramique au centre) et les extrêmes
      svg.appendChild(el("line", { class: "env-un", x1: 0, x2: W, y1: Y(C.def), y2: Y(C.def) }));
      const rep = k === "pan" ? [[1, "droite"], [0, "centre"], [-1, "gauche"]] : [[1.5, "150 %"], [1, "100 %"], [0.5, "50 %"], [0, "0"]];
      for (const [v, t] of rep) { const tx = el("text", { class: "env-rep", x: 6, y: Y(v) + (v === C.max ? 14 : v === C.min ? -4 : -4) }); tx.textContent = t; svg.appendChild(tx); }
    } else svg.appendChild(el("line", { class: "env-un", x1: 0, x2: W, y1: Y(C.def), y2: Y(C.def) }));
    if (ptsAutre.length) svg.appendChild(el("polyline", { class: "env-l env-autre courbe-" + autre, points: trace(ptsAutre, autre) }));
    const ligne = el("polyline", { class: "env-l courbe-" + k, points: trace(ptsActive, k) }); svg.appendChild(ligne);
    if (!edite) { voie.appendChild(svg); continue; }
    const grille = () => P.dureeTemps(p) * (+$("aimant").value || 0.25), caler = t => P.aimanter(p, t, +$("aimant").value);
    const pos = ev => { const r = svg.getBoundingClientRect(), y = Math.min(H - 4, Math.max(4, ev.clientY - r.top)); return [Math_max0(caler((ev.clientX - r.left) / etat.pxs)), C.min + (C.max - C.min) * (1 - (y - 4) / (H - 8))]; };
    const Math_max0 = t => Math.max(0, t);
    const pts = () => P.courbeDe(pi, k), brut = () => pi[C.cle];
    const sel = () => etat.pointSel && etat.pointSel.piste === pi.id && etat.pointSel.k === k ? etat.pointSel : null;
    const poignees = [], bulle = el("g", { class: "env-bulle" }), bulleFond = el("rect", { rx: 4, height: 22 }), bulleTxt = el("text", {}); bulle.append(bulleFond, bulleTxt);
    const poignee = i => {   // une poignée par place dans la liste triée : elle montre toujours le point qui est à cette place
      const c = el("circle", { class: "env-p", r: 9, tabindex: 0, role: "slider", "aria-valuemin": C.min * 100, "aria-valuemax": C.max * 100 }), Q = () => brut()[i];
      const maj = () => { const q = Q(); if (!q) return; c.setAttribute("cx", X(q.t)); c.setAttribute("cy", Y(q.v)); c.setAttribute("aria-valuenow", Math.round(q.v * 100)); const t = `Point ${i + 1} sur ${brut().length}, à ${virg(q.t)} s, ${ETIQ_VALEUR(k, q.v)}`; c.setAttribute("aria-valuetext", t); c.setAttribute("aria-label", t); c.classList.toggle("choisi", !!(sel() && sel().i === i)); }; maj(); c._maj = maj;
      c.addEventListener("focus", () => { etat.pointSel = { piste: pi.id, k, i }; majBulle(); majAuto(); poignees.forEach(h => h._maj()); });
      c.addEventListener("keydown", ev => { const kk = ev.key; let fait = true, q = Q(); if (!q) return;
        if (kk === "ArrowLeft") P.deplacerPoint(pi, k, q, q.t - grille(), q.v); else if (kk === "ArrowRight") P.deplacerPoint(pi, k, q, q.t + grille(), q.v);
        else if (kk === "ArrowUp") P.deplacerPoint(pi, k, q, q.t, q.v + (k === "pan" ? 0.1 : 0.05)); else if (kk === "ArrowDown") P.deplacerPoint(pi, k, q, q.t, q.v - (k === "pan" ? 0.1 : 0.05));
        else if (kk === "Delete" || kk === "Backspace") { P.supprimerPoint(pi, k, q); etat.pointSel = null; ev.preventDefault(); ev.stopPropagation(); changer(); return; } else fait = false;
        if (fait) { ev.preventDefault(); ev.stopPropagation(); etat.pointSel = { piste: pi.id, k, i: brut().indexOf(q) }; ligne.setAttribute("points", trace(pts(), k)); poignees.forEach(h => h._maj()); majBulle(); clearTimeout(c._t); c._t = setTimeout(changer, 400); } });
      return c;
    };
    function majBulle() {   // une étiquette près du point choisi : où il est et ce qu'il règle
      const s = sel(), q = s && brut()[s.i]; if (!q) { bulle.setAttribute("visibility", "hidden"); return; }
      const t = `${virg(q.t)} s, ${ETIQ_VALEUR(k, q.v)}`; bulleTxt.textContent = t; const w = t.length * 7 + 16, x = Math.min(W - w - 4, Math.max(4, X(q.t) - w / 2)), y = Y(q.v) < 44 ? Y(q.v) + 16 : Y(q.v) - 36;
      bulleFond.setAttribute("x", x); bulleFond.setAttribute("y", y); bulleFond.setAttribute("width", w); bulleTxt.setAttribute("x", x + 8); bulleTxt.setAttribute("y", y + 15); bulle.setAttribute("visibility", "visible");
    }
    (brut() || []).forEach((q, i) => { const h = poignee(i); poignees.push(h); svg.appendChild(h); }); svg.appendChild(bulle); majBulle();
    // un clic : le point le plus proche (à moins de RAYON_PRISE pixels) est pris, sinon un nouveau point est posé là ; on glisse tout de suite. La page ne se redessine qu'au relâchement.
    svg.addEventListener("pointerdown", ev => {
      ev.preventDefault(); ev.stopPropagation(); const r = svg.getBoundingClientRect(), cx = ev.clientX - r.left, cy = ev.clientY - r.top; let i = -1, d = RAYON_PRISE, neuf = false;
      brut().forEach((q, j) => { const dd = Math.hypot(X(q.t) - cx, Y(q.v) - cy); if (dd <= d) { d = dd; i = j; } });
      let q;
      if (i >= 0) q = brut()[i]; else { const [t, v] = pos(ev); q = P.ajouterPoint(pi, k, t, v); neuf = true; const h = poignee(brut().length - 1); poignees.push(h); svg.insertBefore(h, bulle); }
      const toutMaj = () => { etat.pointSel = { piste: pi.id, k, i: brut().indexOf(q) }; ligne.setAttribute("points", trace(pts(), k)); poignees.forEach(h => h._maj()); majBulle(); majAuto(); };
      toutMaj(); svg.setPointerCapture(ev.pointerId); let bouge = false;
      const suit = m => { const [t, v] = pos(m); bouge = true; P.deplacerPoint(pi, k, q, t, v); toutMaj(); };
      const fin = () => { svg.removeEventListener("pointermove", suit); svg.removeEventListener("pointerup", fin); svg.removeEventListener("pointercancel", fin); if (bouge || neuf) changer(); };
      svg.addEventListener("pointermove", suit); svg.addEventListener("pointerup", fin); svg.addEventListener("pointercancel", fin);
    });
    voie.appendChild(svg);
  }
}
// La barre « Courbes » : qui on édite, quelle courbe, le point choisi, et les gestes qui servent (supprimer, effacer, terminer).
function majAuto() {
  const barre = $("auto"), pi = etat.env && P.trouverPiste(etat.projet, etat.env); barre.hidden = !pi; if (!pi) return;
  const k = etat.courbe || "volume", C = P.COURBES[k], n = P.courbeDe(pi, k).length, s = etat.pointSel && etat.pointSel.piste === pi.id && etat.pointSel.k === k ? etat.pointSel : null, q = s && pi[C.cle] && pi[C.cle][s.i];
  $("auto-titre").textContent = `Courbes de « ${pi.nom} »`;
  for (const kk of ["volume", "pan"]) $("auto-" + kk).setAttribute("aria-pressed", String(kk === k));
  $("auto-voir").checked = etat.voirCourbes !== false; $("auto-sup").disabled = !q; $("auto-vider").disabled = !n;
  $("auto-aide").textContent = q ? `Point choisi : ${virg(q.t)} s, ${ETIQ_VALEUR(k, q.v)}. Glisse-le pour le déplacer, ou « Supprimer le point ».`
    : n ? `${k === "pan" ? "Panoramique" : "Volume"} : ${n} point${n > 1 ? "s" : ""}. Clique un point pour le choisir, ou clique dans le vide pour en poser un autre.` : `${k === "pan" ? "Panoramique" : "Volume"} : aucun point. Clique sur la piste pour poser le premier : la courbe fait bouger ${k === "pan" ? "le son de gauche à droite" : "le volume au fil du temps"}.`;
}
// « Par où commencer ? » : visible tant que le projet n'a aucun clip et qu'on n'enregistre rien ; chaque carte ouvre le bon outil.
function majDebut() { const vide = etat.projet.pistes.every(p => p.clips.length === 0) && !etat.enreg && !etat.notes; $("debut").hidden = !vide; }
$("debut").onclick = e => { const b = e.target.closest("[data-go]"); if (!b) return; const go = b.dataset.go;
  if (go === "instrument") { if ($("midi").hidden) $("b-midi").click(); $("midi").scrollIntoView({ block: "nearest" }); }
  else if (go === "rythme") { if ($("biblio").hidden) $("b-biblio").click(); const t = $("biblio-onglets").querySelector("[data-fam=rythmes]"); if (t) t.click(); $("biblio").scrollIntoView({ block: "nearest" }); }
  else if (go === "partition") { rl.onglet = "partition"; $("b-clip-notes").click(); }
  else if (go === "pas") { if ($("pas").hidden) $("b-pas").click(); $("pas").scrollIntoView({ block: "nearest" }); }
  else if (go === "importer-partition") $("fichier-midi").click();
  else if (go === "voix") $("b-enreg").click(); else if (go === "importer") $("fichiers").click(); };
$("auto-volume").onclick = () => { etat.courbe = "volume"; etat.pointSel = null; afficher(); };
$("auto-pan").onclick = () => { etat.courbe = "pan"; etat.pointSel = null; afficher(); };
$("auto-voir").onchange = e => { etat.voirCourbes = e.target.checked; afficher(); };
$("auto-fin").onclick = () => { etat.env = null; etat.pointSel = null; afficher(); };
$("auto-sup").onclick = () => { const pi = P.trouverPiste(etat.projet, etat.env), k = etat.courbe || "volume", s = etat.pointSel, q = pi && s && pi[P.COURBES[k].cle][s.i]; if (!q) return; P.supprimerPoint(pi, k, q); etat.pointSel = null; changer(); };
$("auto-vider").onclick = () => { const pi = P.trouverPiste(etat.projet, etat.env); if (!pi) return; P.viderCourbe(pi, etat.courbe || "volume"); etat.pointSel = null; changer(); };
function majSelection() {
  const r = etat.choisi && P.trouverClip(etat.projet, etat.choisi); $("selection").hidden = !r; if (!r) return;
  $("sel-nom").textContent = (etat.projet.sons[r.clip.son] || {}).nom || "son"; $("sel-gain").value = r.clip.gain; $("b-modifier-notes").hidden = !P.estMidi(etat.projet.sons[r.clip.son]); $("b-partition").hidden = !P.estMidi(etat.projet.sons[r.clip.son]); $("b-tempo-trouver").hidden = P.suitLeTempo(etat.projet.sons[r.clip.son]);
}
let minuteur = null;
// ---------------------------------------------------------------- Téléphone : les réglages avancés d'une piste (volume, panoramique, effets, enveloppe) s'ouvrent dans une feuille du bas
let feuille = null;
function ouvrirFeuille(pi) {
  feuille = pi.id; $("feuille-titre").textContent = "Réglages : " + pi.nom; $("f-vol").value = pi.volume; $("f-pan").value = pi.pan; majFeuille(pi);
  $("feuille-piste").hidden = false; $("f-vol").focus();
}
const fmtVol = v => Math.round(v * 100) + " %", fmtPan = v => Math.abs(v) < 0.005 ? "centre" : Math.round(Math.abs(v) * 100) + (v < 0 ? " G" : " D");
const majFeuille = pi => { $("f-vol-o").textContent = fmtVol(pi.volume); $("f-pan-o").textContent = fmtPan(pi.pan); };
function fermerFeuille() { const piste = !$("feuille-piste").hidden; let ouverte = false; for (const f of document.querySelectorAll(".feuille")) if (!f.hidden) { f.hidden = true; ouverte = true; } if (!ouverte) return; feuille = null; if (piste) afficher(); }
$("feuille-fermer").onclick = fermerFeuille; $("fa-fermer").onclick = fermerFeuille; $("fr-fermer").onclick = fermerFeuille;
const ouvrirFeuilleBas = id => { fermerFeuille(); $(id).hidden = false; const f = $(id).querySelector("button, input, select"); if (f) f.focus({ preventScroll: true }); };
$("b-ajouter-m").onclick = () => ouvrirFeuilleBas("feuille-ajouter"); $("b-reglages-m").onclick = () => ouvrirFeuilleBas("feuille-reglages");
// Un geste choisi dans « + Ajouter » ferme la feuille et amène le panneau ouvert à l'écran ; un fichier choisi la ferme aussi.
$("fa-corps").addEventListener("click", e => { const b = e.target.closest("button"); if (!b || b.classList.contains("notion")) return; const cible = b.getAttribute("aria-controls"); setTimeout(() => { fermerFeuille(); if (cible && $(cible) && !$(cible).hidden) $(cible).scrollIntoView({ block: "start" }); }, 0); });
$("fichiers").addEventListener("change", () => setTimeout(fermerFeuille, 0));
$("fr-corps").addEventListener("click", e => { const b = e.target.closest("#b-export, #b-nouveau"); if (b) setTimeout(fermerFeuille, 0); });

// ---------------------------------------------------------------- Téléphone : on DÉPLACE les vrais boutons (pas des copies) dans les feuilles du bas ; sur grand écran, tout revient à sa place.
const lieux = [], mobile = matchMedia("(max-width: 700px)");
function deplacer(el, cible) { if (!el) return; if (!lieux.some(x => x.el === el)) { const note = document.createComment("lieu"); el.parentNode.insertBefore(note, el); lieux.push({ el, note }); } cible.appendChild(el); }
const avecAide = el => { const n = el.nextElementSibling; return n && n.classList.contains("notion") ? [el, n] : [el]; };
const groupe = (cible, classe, ...enfants) => { const g = document.createElement("div"); g.className = classe; cible.appendChild(g); for (const e of enfants) deplacer(e, g); return g; };
function deplacerPourTelephone() {
  const A = $("fa-corps"), R = $("fr-corps");
  if (mobile.matches) {
    A.replaceChildren(); R.replaceChildren();
    for (const id of ["fichiers", "fichier-midi"]) deplacer($(id).closest("label"), A);
    for (const id of ["b-biblio", "b-pas", "b-midi", "b-piste"]) deplacer($(id), A);
    const son = groupe(A, "tuile-son"); deplacer($("choix-sonora").closest("label"), son); deplacer($("b-ajout-sonora"), son);
    for (const id of ["tempo", "aimant", "metro", "multi", "entree-audio"]) for (const e of avecAide($(id).closest("label"))) deplacer(e, R);
    const z = document.createElement("div"); z.className = "rl-groupe"; z.innerHTML = "<span>Zoom de la règle</span>"; R.appendChild(z); deplacer($("b-zoom-moins"), z); deplacer($("b-zoom-plus"), z);
    deplacer($("b-debut"), R); deplacer($("b-export"), R); deplacer($("b-export-midi"), R); deplacer($("b-nouveau"), R);
  } else { fermerFeuille(); for (const { el, note } of lieux) if (note.parentNode) note.parentNode.insertBefore(el, note); }
}
(mobile.addEventListener ? mobile.addEventListener("change", deplacerPourTelephone) : mobile.addListener(deplacerPourTelephone)); deplacerPourTelephone();
$("f-vol").oninput = e => { const pi = P.trouverPiste(etat.projet, feuille); if (!pi) return; pi.volume = +e.target.value; const ch = etat.lecture && etat.chaines && etat.chaines[pi.id]; if (ch) ch.vol.gain.setTargetAtTime(pi.volume, etat.ctx.currentTime, 0.02); majFeuille(pi); ranger(); };
$("f-pan").oninput = e => { const pi = P.trouverPiste(etat.projet, feuille); if (!pi) return; pi.pan = +e.target.value; const ch = etat.lecture && etat.chaines && etat.chaines[pi.id]; if (ch && ch.pan) ch.pan.pan.setTargetAtTime(pi.pan, etat.ctx.currentTime, 0.02); majFeuille(pi); ranger(); };
const viaEntete = classe => { const id = feuille; fermerFeuille(); const b = document.querySelector(`.entete[data-piste="${id}"] .${classe}`); if (b) b.click(); };
$("b-piste-m").onclick = () => $("b-piste").click();
$("f-fx").onclick = () => viaEntete("b-fx"); $("f-env").onclick = () => viaEntete("b-env");
document.addEventListener("keydown", e => { if (e.key === "Escape") fermerFeuille(); });

// ---------------------------------------------------------------- Démonstrations : Pistes fait l'exemple lui-même (demos.js). Le projet de l'élève est mis de côté dans « Mes projets ».
async function commencerDemo(titre, tempo) {
  if (etat.lecture) arreter();
  for (const [x, b] of [["biblio", "b-biblio"], ["pas", "b-pas"], ["midi", "b-midi"], ["projets", "b-projets"]]) { const z = $(x); if (z && !z.hidden) { z.hidden = true; $(b).setAttribute("aria-expanded", "false"); } }
  if (window.PISTES_PANNEAUX && window.PISTES_PANNEAUX.S.boucle) $("pas-ecouter").click();
  const vide = etat.projet.pistes.every(p => p.clips.length === 0), enDemo = /^Démo : /.test(etat.projet.titre || "");
  if (!vide && !enDemo && !etat.retourDemo) { await sauverMaintenant(); etat.retourDemo = { id: etat.projet.id, titre: etat.projet.titre || "Sans titre" }; }
  const p = P.nouveauProjet({ titre, tempo }); if (enDemo || vide) p.id = etat.projet.id;
  etat.fx = null; etat.env = null; $("metro").checked = false; await Stockage.ecrireProjet(p).catch(alerteEcriture); await chargerProjet(p); $("tempo").value = tempo;
}
const demoApi = {
  commencer: commencerDemo,
  piste(i, nom) { const L = etat.projet.pistes; while (L.length <= i) L.push(P.nouvellePiste("Piste " + (L.length + 1))); if (nom) L[i].nom = nom; return L[i]; },
  poser(i, elId, td, { note, duree = 1.5, fin } = {}) { const el = B.elements().find(e => e.id === elId); if (!el) throw new Error("son inconnu : " + elId); const r = B.fabriquer(el, { tempo: etat.projet.tempo, note, duree, sr: 44100 }), id = ajouterAudio(r.nom, r.canaux, r.sr);
    return P.placerClip(etat.projet, demoApi.piste(i).id, id, td * 60 / etat.projet.tempo, fin ? { duree: fin } : {}); },
  rythme(i, id, td) { return demoApi.poser(i, id, td); },
  note(i, id, note, td, duree) { return demoApi.poser(i, id, td, { note, duree }); },
  melodie(i, id, notes, td, pas) { const s = pas * 60 / etat.projet.tempo; notes.forEach((n, k) => demoApi.poser(i, id, td + k * pas, { note: n, duree: s * 1.1, fin: s * 1.5 })); },
  regler(i, r) { Object.assign(demoApi.piste(i), r); },
  effet(i, nom, reg) { const pi = demoApi.piste(i); P.ajouterEffet(pi, nom); Object.assign(pi.effets[nom], reg, { actif: true }); },
  enveloppe(i, pts) { const pi = demoApi.piste(i); pi.enveloppe = []; for (const [t, v] of pts) P.ajouterPointEnv(pi, t, v); },
  ouvrirEffets(i) { etat.fx = demoApi.piste(i).id; }, montrerEnveloppe(i) { etat.env = demoApi.piste(i).id; },
  metronome(oui) { $("metro").checked = !!oui; }, zoom(n) { for (let k = 0; k < n; k++) $("b-zoom-plus").click(); },
  async lire() { changer(); await lire(); },
  async motif(g) { await window.PISTES_PANNEAUX.motif(g); }, async bibliotheque(q) { await window.PISTES_PANNEAUX.bibliotheque(q); },
};
for (const id of Object.keys(DEMOS)) demosAppel[id] = async () => { const message = await DEMOS[id].faire(demoApi); return { message, retour: etat.retourDemo && etat.retourDemo.titre }; };
async function revenirAMonProjet() {
  const r = etat.retourDemo; if (!r) return false; if (etat.lecture) arreter(); await sauverMaintenant();
  try { await chargerProjet(await Stockage.choisirProjet(r.id)); etat.retourDemo = null; message("Ton projet « " + r.titre + " » est de retour."); return true; } catch (e) { message("Je n'ai pas retrouvé ton projet : " + e.message); return false; }
}

// ---------------------------------------------------------------- Zéro perte (consigne de Sébastien, 04/11/2026 : un élève ne doit jamais perdre une heure de travail)
// 1. Le projet est écrit peu après chaque changement, ET tout de suite quand la page se ferme ou passe en arrière-plan.
// 2. Une écriture qui échoue ne passe jamais en silence : un bandeau dit que le travail n'est pas gardé et propose de le télécharger.
// 3. Si le même projet est ouvert dans deux onglets, les deux le disent. 4. Les cinq dernières versions sont gardées (stockage.js, versionner).
const alerte = { type: "" };
function alerter(type, texte, permanent) { alerte.type = permanent ? "permanent" : type; $("alerte-texte").textContent = texte; $("alerte-rangement").hidden = false; }
const apaiser = type => { if (alerte.type === type) { alerte.type = ""; $("alerte-rangement").hidden = true; } };
const alerteEcriture = e => alerter("ecriture", "Ton travail n'est pas gardé : le navigateur refuse de l'enregistrer" + (e && e.message ? " (" + e.message + ")" : "") + ". Télécharge ton projet maintenant pour ne rien perdre.");
let attente = false;
async function sauverMaintenant() { clearTimeout(minuteur); attente = false; try { await Stockage.ecrireProjet(etat.projet); apaiser("ecriture"); Stockage.versionner(etat.projet).catch(() => {}); } catch (e) { alerteEcriture(e); } }
const planifierRangement = d => { attente = true; clearTimeout(minuteur); minuteur = setTimeout(sauverMaintenant, d); };
const vider = () => { if (attente) sauverMaintenant(); };
window.addEventListener("pagehide", vider); window.addEventListener("beforeunload", vider); document.addEventListener("visibilitychange", () => { if (document.hidden) vider(); });
$("alerte-fermer").onclick = () => { $("alerte-rangement").hidden = true; }; $("alerte-fichier").onclick = () => { exporterFichierProjet(etat.projet).catch(e => message("Le téléchargement n'a pas marché : " + e.message)); };
const MOI = Math.random().toString(36).slice(2), canal = "BroadcastChannel" in window ? new BroadcastChannel("sonora-pistes") : null;
const TEXTE_ONGLETS = "Ce projet est aussi ouvert dans un autre onglet. Garde un seul onglet ouvert : le dernier qui enregistre écrase l'autre.";
const annoncerProjet = () => { if (canal) canal.postMessage({ t: "ouvert", id: etat.projet.id, de: MOI }); };
if (canal) canal.onmessage = e => { const m = e.data || {}; if (m.de === MOI || !etat.projet || m.id !== etat.projet.id) return; if (m.t === "ouvert") canal.postMessage({ t: "present", id: m.id, de: MOI }); alerter("onglets", TEXTE_ONGLETS); };
const ranger = () => planifierRangement(300);
function changer() { etat.toutEcoute = false; empiler(); afficher(); planifierRangement(250); if (etat.lecture && !etat.enreg && !etat.notes) { replanifierLecture(); } }

function brancherEntetes() {
  for (const el of document.querySelectorAll(".entete")) {
    const pi = P.trouverPiste(etat.projet, el.dataset.piste);
    el.querySelector("input[type=text]").onchange = e => { pi.nom = e.target.value.slice(0, 30) || pi.nom; changer(); };
    el.querySelector(".b-arme").onclick = () => {
      if (etat.multi) { etat.armees = etat.armees || []; if (etat.armees.includes(pi.id) && etat.arme !== pi.id) etat.armees = etat.armees.filter(x => x !== pi.id); else if (etat.armees.includes(pi.id)) { if (etat.armees.length > 1) { etat.armees = etat.armees.filter(x => x !== pi.id); etat.arme = etat.armees[0]; } } else { etat.armees.push(pi.id); etat.arme = pi.id; } }
      else etat.arme = pi.id;
      afficher(); };
    el.querySelector(".b-muet").onclick = () => { pi.muet = !pi.muet; changer(); };
    el.querySelector(".b-solo").onclick = () => { pi.solo = !pi.solo; changer(); };
    const k = el.querySelector(".ent-k"), enChaine = () => etat.lecture && etat.chaines && etat.chaines[pi.id];
    k.appendChild(creerBouton({ libelle: "Volume", nom: `Volume de ${pi.nom}`, min: 0, max: 1.5, valeur: pi.volume, def: 0.8, pas: 0.01, classe: "r-vol", classeValeur: "o-vol", taille: 38, format: v => Math.round(v * 100) + " %",
      onInput: v => { pi.volume = v; const ch = enChaine(); if (ch) ch.vol.gain.setTargetAtTime(v, etat.ctx.currentTime, 0.02); ranger(); } }));
    k.appendChild(creerBouton({ libelle: "Pan", nom: `Panoramique de ${pi.nom} (gauche à droite)`, min: -1, max: 1, valeur: pi.pan, def: 0, pas: 0.01, bipolaire: true, classe: "r-pan", classeValeur: "o-pan", taille: 38, format: v => Math.abs(v) < 0.005 ? "centre" : Math.round(Math.abs(v) * 100) + (v < 0 ? " G" : " D"),
      onInput: v => { pi.pan = v; const ch = enChaine(); if (ch && ch.pan) ch.pan.pan.setTargetAtTime(v, etat.ctx.currentTime, 0.02); ranger(); } }));
    // Tablette : un curseur de volume horizontal dans l'en-tête (le bouton rond y est caché) ; il agit comme le bouton, et la page ne se redessine pas pendant qu'on le glisse.
    el.querySelector(".vol-h").oninput = e => { const v = +e.target.value; pi.volume = v; const ch = enChaine(); if (ch) ch.vol.gain.setTargetAtTime(v, etat.ctx.currentTime, 0.02); ranger(); };
    el.querySelector(".b-plus").onclick = () => ouvrirFeuille(pi);
    el.querySelector(".b-env").onclick = () => { etat.env = etat.env === pi.id ? null : pi.id; etat.pointSel = null; afficher(); if (etat.env) $("ligne").scrollIntoView({ block: "start" }); };
    el.querySelector(".b-fx").onclick = () => { etat.fx = etat.fx === pi.id ? null : pi.id; afficher(); if (etat.fx) $("effets").scrollIntoView({ block: "nearest", behavior: "smooth" }); };
  }
}
function tempsDe(ev) { const r = $("voies").getBoundingClientRect(); return Math.max(0, (ev.clientX - r.left) / etat.pxs); }
function brancherVoies() {
  for (const v of document.querySelectorAll(".voie")) {
    v.ondragover = e => { e.preventDefault(); v.classList.add("survol"); }; v.ondragleave = () => v.classList.remove("survol");
    v.ondrop = e => { e.preventDefault(); v.classList.remove("survol"); const f = e.dataTransfer && e.dataTransfer.files; if (f && f.length) importer(f, v.dataset.piste, P.aimanter(etat.projet, tempsDe(e), +$("aimant").value)); };
    // Un clic dans le vide place le curseur ; glisser dessine un cadre qui choisit les clips touchés (Maj : les ajouter à la sélection).
    v.onpointerdown = e => {
      if (e.target !== v) return; const zone = $("voies"), z = zone.getBoundingClientRect(), x0 = e.clientX, y0 = e.clientY, ajout = e.shiftKey || e.ctrlKey || e.metaKey; let cadre = null; v.setPointerCapture(e.pointerId);
      v.onpointermove = m => {
        if (!cadre && Math.hypot(m.clientX - x0, m.clientY - y0) < 5) return; if (!cadre) { cadre = document.createElement("div"); cadre.className = "lasso"; zone.appendChild(cadre); }
        const a = Math.min(x0, m.clientX), b = Math.max(x0, m.clientX), c = Math.min(y0, m.clientY), d = Math.max(y0, m.clientY); Object.assign(cadre.style, { left: a - z.left + "px", top: c - z.top + "px", width: b - a + "px", height: d - c + "px" });
      };
      v.onpointerup = m => {
        v.onpointermove = null; v.onpointerup = null; v.onpointercancel = null;
        if (!cadre) { etat.choisi = null; etat.tete = P.aimanter(etat.projet, tempsDe(e), +$("aimant").value); if (etat.lecture) { arreter(); } afficher(); return; }
        const q = cadre.getBoundingClientRect(); cadre.remove(); const touches = [...document.querySelectorAll(".clip[data-clip]")].filter(c => { const r = c.getBoundingClientRect(); return r.left < q.right && r.right > q.left && r.top < q.bottom && r.bottom > q.top; }).map(c => c.dataset.clip);
        etat.choisirTout(ajout ? [...new Set([...etat.choisis, ...touches])] : touches); surligner(); majSelection(); message(touches.length ? `${etat.choisis.size} clip${etat.choisis.size > 1 ? "s" : ""} choisi${etat.choisis.size > 1 ? "s" : ""}.` : "Aucun clip dans le cadre.");
      };
      v.onpointercancel = () => { v.onpointermove = null; v.onpointerup = null; v.onpointercancel = null; document.querySelectorAll(".lasso").forEach(x => x.remove()); };
    };
  }
  for (const el of document.querySelectorAll(".clip[data-clip]")) {
    el.onpointermove = m => { if (!m.buttons) el.dataset.zone = zoneClip(el, m); };
    el.onpointerdown = e => {
      e.preventDefault(); el.setPointerCapture(e.pointerId); const id = el.dataset.clip, p = etat.projet, plus = e.shiftKey || e.ctrlKey || e.metaKey, libre = e.shiftKey;   // Maj ou Ctrl : ajouter à la sélection (sans bouger) ; Maj + glisser : déplacer sans aimant ; Alt + glisser : copier
      const zone0 = zoneClip(el, e), copie = e.altKey && zone0 === "deplacer", dedans = etat.choisis.has(id);
      if (plus && !dedans) { etat.basculerChoix(id); surligner(); majSelection(); }
      const zone = zone0, groupe = etat.choisis.has(id) && etat.choisis.size > 1 && zone === "deplacer";
      if (!plus) { if (!groupe) etat.choisi = id; else etat._principal = id; }
      surligner(); majSelection();
      const r = P.trouverClip(p, id), x0 = e.clientX, y0 = e.clientY, d0 = r.clip.debut, dur0 = r.clip.duree, dec0 = r.clip.decalage, son = p.sons[r.clip.son], bloque = zone === "rogner-debut" && r.clip.boucle;
      const ids = [...etat.choisis], els = ids.map(i => document.querySelector(`.clip[data-clip="${i}"]`)), debuts = ids.map(i => P.trouverClip(p, i).clip.debut); let bouge = false;
      const grille = () => libre ? 0 : +$("aimant").value, fin = () => { el.onpointermove = ev => { if (!ev.buttons) el.dataset.zone = zoneClip(el, ev); }; el.onpointerup = null; el.onpointercancel = null; };
      el.dataset.zone = copie ? "copier" : zone;
      el.onpointermove = m => {
        const dx = (m.clientX - x0) / etat.pxs; if (Math.hypot(m.clientX - x0, m.clientY - y0) > 3) bouge = true; if (!bouge || bloque) return;
        if (zone === "deplacer") { const delta = P.aimanter(p, d0 + dx, grille()) - d0; els.forEach((e2, k) => { if (e2) { e2.style.left = Math.max(0, debuts[k] + delta) * etat.pxs + "px"; e2.style.opacity = copie ? ".6" : ""; } }); }
        else if (zone === "rogner-debut") { const nd = Math.max(d0 - dec0, Math.min(P.aimanter(p, d0 + dx, grille()), d0 + dur0 - 0.01)); el.style.left = nd * etat.pxs + "px"; el.style.width = Math.max(4, (d0 + dur0 - nd) * etat.pxs) + "px"; }
        else { let f = Math.max(d0 + 0.01, P.aimanter(p, d0 + dur0 + dx, grille())); if (zone === "rogner-fin" && !r.clip.boucle) f = Math.min(f, d0 + son.duree - dec0); el.style.width = Math.max(4, (f - d0) * etat.pxs) + "px"; }
      };
      el.onpointercancel = () => { fin(); afficher(); };
      el.onpointerup = m => {
        fin(); const dx = (m.clientX - x0) / etat.pxs;
        if (!bouge) {
          if (plus && dedans) { etat.basculerChoix(id); surligner(); majSelection(); }   // Maj/Ctrl + clic sur un clip déjà choisi : le retirer
          else if (!plus && groupe) { etat.choisi = id; afficher(); } else if (bloque) message("Un clip bouclé garde son début : tire son bord droit pour le raccourcir ou le rallonger.");
          return;
        }
        if (bloque) { afficher(); return; }
        if (zone === "deplacer") {
          const delta = P.aimanter(p, d0 + dx, grille()) - d0, voie = document.elementsFromPoint(m.clientX, m.clientY).find(x => x.classList && x.classList.contains("voie")), L = p.pistes;
          const depuis = L.findIndex(pi => pi.clips.some(c => c.id === id)), vers = voie ? L.findIndex(pi => pi.id === voie.dataset.piste) : depuis, dp = vers - depuis;   // de combien de pistes le groupe descend (ou monte)
          if (copie) {   // Alt : on laisse les originaux, on dépose des copies
            const pr = P.copierClips(p, ids), cible = L[Math.max(0, Math.min(L.length - 1, pr.i0 + dp))].id, rr = P.collerClips(p, pr, cible, Math.max(0, pr.t0 + delta)); rangerSonsCopies(rr.sons); etat.choisirTout(rr.ids); message(`${rr.ids.length} copie${rr.ids.length > 1 ? "s" : ""} déposée${rr.ids.length > 1 ? "s" : ""}.`);
          } else {
            const place = ids.map((i, k) => [i, debuts[k], L.findIndex(pi => pi.clips.some(c => c.id === i))]);
            for (const [i, d, ip] of place) P.deplacerClip(p, i, d + delta, dp ? L[Math.max(0, Math.min(L.length - 1, ip + dp))].id : undefined);
          }
        } else if (zone === "rogner-debut") P.rognerDebut(p, id, P.aimanter(p, d0 + dx, grille()));
        else if (zone === "rogner-fin") P.rognerClip(p, id, P.aimanter(p, d0 + dur0 + dx, grille()) - d0);
        else { const t = P.aimanter(p, d0 + dur0 + dx, grille()) - d0; P.boucler(p, id, t); if (r.clip.boucle) message("Clip bouclé : le motif se répète. Tire le bord droit du milieu pour le raccourcir."); }
        changer();
      };
    };
  }
}
// Où est la souris sur un clip ? Le bord droit : en haut, boucler ; plus bas, raccourcir ou rallonger. Le bord gauche : raccourcir par le début. Ailleurs : déplacer.
function zoneClip(el, m) {
  const b = el.getBoundingClientRect(), x = m.clientX - b.left, y = m.clientY - b.top, tactile = m.pointerType === "touch", ez = Math.max(5, Math.min(tactile ? 22 : 11, b.width / 3));
  if (x >= b.width - ez) return y < b.height * 0.34 ? "boucler" : "rogner-fin"; if (x < ez) return "rogner-debut"; return "deplacer";
}
const surligner = () => document.querySelectorAll(".clip[data-clip]").forEach(c => c.classList.toggle("choisi", etat.choisis.has(c.dataset.clip)));
const clipsChoisis = () => [...etat.choisis].filter(i => P.trouverClip(etat.projet, i));


// ---------------------------------------------------------------- effets d'une piste : un rack d'appareils, chacun avec son interrupteur, sa croix, ses boutons et son schéma
const pc = v => Math.round(v * 100) + " %", sec = v => (+v).toFixed(2).replace(".", ",") + " s", hzf = v => (v >= 1000 ? (v / 1000).toFixed(1).replace(".", ",") + " kHz" : Math.round(v) + " Hz");
const NOMS_FX = { filtre: "Filtre", echo: "Écho", reverb: "Réverbération" };
const SCHEMAS_FX = { filtre: "Courbe de réponse du filtre : le niveau laissé passer, pour chaque fréquence.", echo: "Les répétitions : une barre par écho, de plus en plus petite.", reverb: "Décroissance de la réverbération : le niveau en décibels au cours du temps." };
// Schémas calculés à partir des réglages (la réponse du filtre est celle d'un filtre de Butterworth du second ordre, comme celui du moteur audio ; le schéma de l'écho est la suite des amplitudes du moteur ; celui de la réverbération représente la définition de la durée, 60 dB de perte).
function schemaFx(cv, k, e) {
  const d = devicePixelRatio || 1, r = cv.getBoundingClientRect(), w = cv.width = Math.max(40, Math.round((r.width || 220) * d)), h = cv.height = Math.max(30, Math.round((r.height || 70) * d)), g = cv.getContext("2d");
  g.fillStyle = "#11110F"; g.fillRect(0, 0, w, h); g.strokeStyle = "rgba(240,239,232,.18)"; g.lineWidth = d; g.fillStyle = "rgba(240,239,232,.6)"; g.font = `${9 * d}px monospace`;
  const L = P.LIMITES_EFFETS; g.strokeStyle = "#D6FF00"; g.lineWidth = 2 * d;
  if (k === "filtre") {
    const f0 = 20, f1 = 20000, fc = e.filtre.frequence, haut = e.filtre.type === "passe-haut", y = db => h - 4 * d - (db + 40) / 43 * (h - 10 * d);
    for (const db of [0, -20, -40]) { g.beginPath(); g.moveTo(0, y(db)); g.lineTo(w, y(db)); g.strokeStyle = "rgba(240,239,232,.18)"; g.lineWidth = d; g.stroke(); g.fillText(db + " dB", 3 * d, y(db) - 2 * d); }
    g.strokeStyle = "#D6FF00"; g.lineWidth = 2 * d; g.beginPath();
    for (let i = 0; i <= w; i += 2) { const f = f0 * Math.pow(f1 / f0, i / w), x = f / fc, m = haut ? x * x / Math.sqrt(1 + x ** 4) : 1 / Math.sqrt(1 + x ** 4), db = Math.max(-40, 20 * Math.log10(Math.max(m, 1e-6))); i ? g.lineTo(i, y(db)) : g.moveTo(i, y(db)); } g.stroke();
    const xc = Math.log(fc / f0) / Math.log(f1 / f0) * w; g.strokeStyle = "#FF5638"; g.lineWidth = d; g.beginPath(); g.moveTo(xc, 0); g.lineTo(xc, h); g.stroke(); g.fillStyle = "#FF5638"; g.fillText(hzf(fc), Math.min(w - 48 * d, xc + 3 * d), 10 * d);
  } else if (k === "echo") {
    const t = e.echo.temps, ret = e.echo.retour, mel = e.echo.melange, taps = [{ t: 0, a: 1, direct: true }]; for (let i = 1; i <= 8; i++) { const a = mel * Math.pow(ret, i - 1); if (a < 0.02) break; taps.push({ t: i * t, a }); }
    const tmax = Math.max(1.2, taps[taps.length - 1].t * 1.08); g.fillStyle = "rgba(240,239,232,.6)"; g.fillText("0 s", 3 * d, h - 3 * d); g.fillText(sec(tmax), w - 40 * d, h - 3 * d);
    for (const tp of taps) { const x = 6 * d + tp.t / tmax * (w - 14 * d), hh = Math.min(1, tp.a) * (h - 18 * d); g.fillStyle = tp.direct ? "#F0EFE8" : "#D6FF00"; g.fillRect(x - 2 * d, h - 12 * d - hh, 4 * d, hh); }
  } else {
    const T = e.reverb.duree, tmax = Math.max(T * 1.1, 1), y = db => 6 * d + (-db) / 66 * (h - 18 * d); g.strokeStyle = "rgba(240,239,232,.18)"; g.lineWidth = d;
    for (const db of [0, -30, -60]) { g.beginPath(); g.moveTo(0, y(db)); g.lineTo(w, y(db)); g.stroke(); g.fillStyle = "rgba(240,239,232,.6)"; g.fillText(db + " dB", 3 * d, y(db) + (db === 0 ? 11 : -2) * d); }
    g.strokeStyle = "#D6FF00"; g.lineWidth = 2 * d; g.beginPath(); g.moveTo(6 * d, y(0)); g.lineTo(6 * d + T / tmax * (w - 12 * d), y(-60)); g.stroke(); g.fillStyle = "#FF5638"; g.fillText(sec(T), Math.min(w - 40 * d, 6 * d + T / tmax * (w - 12 * d)), y(-60) - 4 * d);
    g.fillStyle = "rgba(240,239,232,.6)"; g.fillText("aigus amortis dès " + hzf(e.reverb.aigus), 6 * d, h - 3 * d);
  }
}
const REGLAGES_FX = {
  filtre: [["frequence", "Coupure", "frequence", true, 0, hzf, 1500]],
  echo: [["temps", "Temps", "temps", false, 0.01, sec, 0.35], ["retour", "Retour", "retour", false, 0.01, pc, 0.4], ["melange", "Mélange", "melange", false, 0.01, pc, 0.35]],
  reverb: [["duree", "Durée", "duree", false, 0.1, sec, 2], ["aigus", "Aigus", "aigus", true, 0, hzf, 6000], ["melange", "Mélange", "melange", false, 0.01, pc, 0.3]],
};
function afficherEffets() {
  const z = $("effets"), pi = etat.fx && P.trouverPiste(etat.projet, etat.fx); z.hidden = !pi; if (!pi) return;
  const e = P.effetsDe(pi), rack = P.rackDe(pi), L = P.LIMITES_EFFETS, manque = P.EFFETS_ORDRE.filter(k => !rack.includes(k));
  const relancer = () => { if (etat.lecture) replanifierLecture(); };
  z.innerHTML = `<div class="fx-haut"><h2>Effets de la piste « ${esc(pi.nom)} »</h2><button type="button" class="notion" data-notion="effets" aria-label="Comprendre : les effets">?</button>
    <label class="fx-ajout"><span class="sr-seul">Ajouter un effet</span><select id="fx-ajouter" aria-label="Ajouter un effet"><option value="">+ Ajouter un effet</option>${manque.map(k => `<option value="${k}">${NOMS_FX[k]}</option>`).join("")}</select></label>
    <button type="button" class="croix-b" id="fx-fermer" aria-label="Fermer les effets"><span class="croix" aria-hidden="true"></span></button></div>
    <p class="petit">Les effets s'appliquent à toute la piste, dans l'ordre filtre, puis écho et réverbération ajoutés au son direct. Ils sont aussi dans le WAV exporté. L'interrupteur éteint un effet sans perdre ses réglages ; la croix le retire du rack. Double clic sur un bouton : valeur de départ.</p>
    <div class="fx-rack" id="fx-rack">${rack.length ? "" : `<p class="fx-vide">Aucun effet sur cette piste. Choisis-en un avec « Ajouter un effet ».</p>`}</div>`;
  const zone = z.querySelector("#fx-rack");
  for (const k of rack) {
    const art = document.createElement("article"); art.className = "fx-device" + (e[k].actif ? "" : " eteint"); art.dataset.effet = k;
    art.innerHTML = `<header><label class="fx-power" title="${e[k].actif ? "Éteindre" : "Allumer"} ${NOMS_FX[k].toLowerCase()}"><input type="checkbox" data-actif="${k}"${e[k].actif ? " checked" : ""} aria-label="${NOMS_FX[k]} : allumé"><span class="fx-led" aria-hidden="true"></span></label><h3>${NOMS_FX[k]}</h3><button type="button" class="notion" data-notion="${k}" aria-label="Comprendre : ${NOMS_FX[k].toLowerCase()}">?</button><button type="button" class="croix-b" data-retirer="${k}" aria-label="Retirer ${esc(NOMS_FX[k].toLowerCase())} de la piste"><span class="croix" aria-hidden="true"></span></button></header>
      <canvas class="fx-viz" role="img" aria-label="${esc(SCHEMAS_FX[k])}"></canvas>${k === "filtre" ? `<label class="fx-type">Type <select data-fx="filtre.type"><option value="passe-bas"${e.filtre.type === "passe-bas" ? " selected" : ""}>passe-bas (enlève les aigus)</option><option value="passe-haut"${e.filtre.type === "passe-haut" ? " selected" : ""}>passe-haut (enlève les graves)</option></select></label>` : ""}
      <div class="fx-boutons"></div>${k === "echo" ? `<p class="fx-dist" id="fx-distance">Avec ${sec(e.echo.temps)}, la paroi serait à environ ${Math.round(P.distanceEcho(e.echo.temps))} m.</p>` : ""}
      <details class="fx-ex"><summary>À quoi ça sert ?</summary><p>${esc(P.EXPLICATIONS[k])}</p></details>`;
    const zb = art.querySelector(".fx-boutons"), cv = art.querySelector("canvas");
    for (const [cle, lib, lim, log, pas, fmt, def] of REGLAGES_FX[k]) {
      zb.appendChild(creerBouton({ libelle: lib, nom: `${NOMS_FX[k]}, ${lib.toLowerCase()}`, min: L[lim][0], max: L[lim][1], valeur: e[k][cle], def, pas, log, format: fmt, donnee: `${k}.${cle}`, taille: 52,
        onInput: v => { pi.effets = P.effetsDe(pi); pi.effets[k][cle] = k === "filtre" && cle === "frequence" ? Math.round(v) : v; schemaFx(cv, k, P.effetsDe(pi)); if (k === "echo" && cle === "temps") art.querySelector("#fx-distance").textContent = `Avec ${sec(v)}, la paroi serait à environ ${Math.round(P.distanceEcho(v))} m.`; ranger(); }, onChange: relancer }));
    }
    zone.appendChild(art); requestAnimationFrame(() => schemaFx(cv, k, P.effetsDe(pi)));
  }
  z.querySelector("#fx-ajouter").onchange = ev => { if (P.ajouterEffet(pi, ev.target.value)) { message(`${NOMS_FX[ev.target.value]} ajouté à la piste « ${pi.nom} ».`); changer(); } };
  z.querySelector("#fx-fermer").onclick = () => { etat.fx = null; afficher(); };
  z.querySelectorAll("[data-actif]").forEach(x => x.onchange = () => { P.interrupteurEffet(pi, x.dataset.actif, x.checked); changer(); });
  z.querySelectorAll("[data-retirer]").forEach(x => x.onclick = () => { P.retirerEffet(pi, x.dataset.retirer); message(`${NOMS_FX[x.dataset.retirer]} retiré de la piste « ${pi.nom} » (Ctrl+Z pour l'annuler).`); changer(); });
  z.querySelectorAll("select[data-fx]").forEach(x => x.onchange = () => { pi.effets = P.effetsDe(pi); const [k2, c2] = x.dataset.fx.split("."); pi.effets[k2][c2] = x.value; changer(); });
}

// ---------------------------------------------------------------- export
async function exporter() {
  const p = etat.projet, duree = P.dureeTotale(p); if (!duree) { message("Rien à exporter : ajoute d'abord un son."); return; }
  const queue = Math.max(0.05, ...p.pistes.map(pi => { const e = P.effetsDe(pi); return Math.max(e.reverb.actif ? e.reverb.duree : 0, e.echo.actif ? Math.min(6, e.echo.temps * Math.ceil(Math.log(0.001) / Math.log(Math.max(0.01, e.echo.retour)))) : 0); }));
  const sr = 44100, ctx = new OfflineAudioContext(2, Math.ceil((duree + queue) * sr), sr), t0 = performance.now();
  const chaines = await chainesProjet(ctx, p, ctx.destination); planifier(ctx, p, 0, 0, chaines); appliquerEnveloppes(p, chaines, 0, 0); const buf = await ctx.startRendering(), canaux = [buf.getChannelData(0), buf.getChannelData(1)];
  const w = encoderWAV(canaux, sr, 16); etat.dernierExport = { octets: w.octets.length, ecretes: w.ecretes, duree };
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([w.octets], { type: "audio/wav" })); a.download = (p.titre || "pistes").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9_-]+/g, "-") + ".wav"; document.body.appendChild(a); a.click(); a.remove();
  if (etat.toutEcoute && P.dureeTotale(p) >= 8 && p.pistes.reduce((n, pi) => n + pi.clips.length, 0) >= 2) points("pistes:export", 10, "sonora"); // points : tout le projet écouté du début à la fin, sans modification depuis
  message(`WAV exporté : ${duree.toFixed(1).replace(".", ",")} s, stéréo, 16 bits, calculé en ${Math.round(performance.now() - t0)} ms.${w.ecretes ? ` Attention : ${w.ecretes} échantillons dépassent 0 dB, baisse des volumes.` : ""}`);
}

// ---------------------------------------------------------------- commandes
$("b-lire").onclick = lire; $("b-debut").onclick = () => { if (etat.lecture) arreter(); etat.tete = 0; };
$("multi").onchange = e => { etat.multi = e.target.checked; etat.armees = etat.multi ? [etat.arme] : []; afficher(); message(etat.multi ? "Plusieurs pistes : clique sur Rec de chaque piste à enregistrer. Chaque piste armée reçoit un canal de l'entrée audio (une interface multicanal en donne plusieurs ; un micro seul n'en donne qu'un)." : "Une seule piste enregistre : la piste choisie."); };
$("entree-audio").onchange = e => { try { localStorage.setItem("pistes:entree", e.target.value); } catch (_) {} };
try { navigator.mediaDevices && navigator.mediaDevices.addEventListener("devicechange", listerEntrees); } catch (_) {}
listerEntrees();
$("b-enreg").onclick = enregistrer; $("b-export").onclick = exporter;
$("b-piste").onclick = () => { etat.projet.pistes.push(P.nouvellePiste(`Piste ${etat.projet.pistes.length + 1}`)); changer(); };
$("b-nouveau").onclick = () => nouveauProjet();
$("fichiers").onchange = e => { const pi = P.trouverPiste(etat.projet, etat.arme) || etat.projet.pistes[0]; importer(e.target.files, pi.id, P.aimanter(etat.projet, etat.tete, +$("aimant").value)).then(() => { e.target.value = ""; }); };
$("tempo").onchange = async e => {
  const p = etat.projet, v = Math.max(40, Math.min(240, +e.target.value || 100)); if (v === p.tempo) { $("tempo").value = v; return; }
  const r = P.changerTempo(p, v); $("tempo").value = p.tempo; changer();   // les clips de notes et les clips audio restent sur les mêmes temps de la grille ; les notes sont rejouées à la nouvelle vitesse
  if (r.sons.length) { await remettreAJourMidi(); message(`Tempo ${p.tempo} : les clips de notes et les rythmes de la Bibliothèque sont refaits à cette vitesse ; les enregistrements et les fichiers importés démarrent sur les mêmes temps mais gardent leur durée.`); }
};
$("b-annuler").onclick = () => annuler(); $("b-refaire").onclick = () => retablir();
$("b-zoom-plus").onclick = () => { etat.pxs = Math.min(400, etat.pxs * 1.5); afficher(); }; $("b-zoom-moins").onclick = () => { etat.pxs = Math.max(10, etat.pxs / 1.5); afficher(); };
$("regle").onpointerdown = e => { const r = $("regle").getBoundingClientRect(); etat.tete = Math.max(0, (e.clientX - r.left) / etat.pxs); if (etat.lecture) { arreter(); lire(); } };
$("b-couper").onclick = () => { const ids = clipsChoisis(); if (!ids.length) return; let n = 0; for (const id of ids) if (P.couperClip(etat.projet, id, etat.tete)) n++; if (!n) { message("Place le curseur rouge à l'intérieur du clip pour le couper."); return; } changer(); };
$("b-dupliquer").onclick = () => {
  const ids = clipsChoisis(); if (!ids.length) return; const avant = new Set(Object.keys(etat.projet.sons));
  if (ids.length === 1) { const orig = P.trouverClip(etat.projet, ids[0]); etat.choisi = P.dupliquerClip(etat.projet, ids[0]); for (const id of Object.keys(etat.projet.sons)) if (!avant.has(id) && orig && etat.buffers[orig.clip.son]) rangerAudio(id, etat.buffers[orig.clip.son].canaux); }   // un clip de notes copié a son propre son : on range une copie de l'audio
  else { const pr = P.copierClips(etat.projet, ids), r = P.collerClips(etat.projet, pr, etat.projet.pistes[pr.i0].id, pr.t0 + pr.span); rangerSonsCopies(r.sons); etat.choisirTout(r.ids); }
  changer(); };
$("b-supprimer").onclick = () => { const ids = clipsChoisis(); if (!ids.length) return; for (const id of ids) P.supprimerClip(etat.projet, id); etat.choisi = null; changer(); };
function rangerSonsCopies(sons) { for (const x of sons) if (etat.buffers[x.de]) rangerAudio(x.vers, etat.buffers[x.de].canaux); }
$("sel-gain").oninput = e => { const r = etat.choisi && P.trouverClip(etat.projet, etat.choisi); if (r) { r.clip.gain = +e.target.value; planifierRangement(300); } };
for (const e of ENTREES) { const o = document.createElement("option"); o.value = e.id; o.textContent = e.titre; $("choix-sonora").appendChild(o); }
$("b-ajout-sonora").onclick = () => { if ($("choix-sonora").value) sonSonora($("choix-sonora").value); };
// ---------------------------------------------------------------- commandes : menus, raccourcis, aide (la table est dans commandes.js)
// D'un pas, le clip retombe sur la grille ; d'une mesure, il garde son écart avec la grille.
function decaler(sens, mesure = false) {
  const ids = clipsChoisis(); if (!ids.length) return; const p = etat.projet, pas = mesure ? P.dureeMesure(p) : (+$("aimant").value ? P.dureeTemps(p) * +$("aimant").value : 0.05);
  for (const id of ids) { const c = P.trouverClip(p, id).clip; P.deplacerClip(p, id, Math.max(0, mesure ? c.debut + sens * pas : Math.round((c.debut + sens * pas) / pas) * pas)); } changer();
}
const pisteActive = () => P.trouverPiste(etat.projet, etat.arme) || etat.projet.pistes[0];
const sansClip = () => { message("Choisis d'abord un clip : clique dessus."); };
const EXEC = {
  importer: () => $("fichiers").click(), "importer-partition": () => $("fichier-midi").click(), exporter: () => $("b-export").click(), nouveau: () => $("b-nouveau").click(), annuler, refaire: retablir,
  couper: () => etat.choisi ? $("b-couper").click() : sansClip(), dupliquer: () => etat.choisi ? $("b-dupliquer").click() : sansClip(), supprimer: () => etat.choisi ? $("b-supprimer").click() : sansClip(),
  deselectionner: () => { etat.choisi = null; afficher(); },
  copier: () => { const ids = clipsChoisis(); if (!ids.length) return sansClip(); etat.presse = P.copierClips(etat.projet, ids); message(`${ids.length} clip${ids.length > 1 ? "s" : ""} copié${ids.length > 1 ? "s" : ""}. Place le curseur, puis Ctrl+V pour coller.`); },
  "presse-couper": () => { const ids = clipsChoisis(); if (!ids.length) return sansClip(); etat.presse = P.copierClips(etat.projet, ids); $("b-supprimer").click(); message(`${ids.length} clip${ids.length > 1 ? "s" : ""} coupé${ids.length > 1 ? "s" : ""} : Ctrl+V les recolle ailleurs.`); },
  coller: () => {
    if (!etat.presse) { message("Rien à coller : copie d'abord des clips (Ctrl+C)."); return; }
    const t = P.aimanter(etat.projet, etat.tete, +$("aimant").value), r = P.collerClips(etat.projet, etat.presse, pisteActive().id, t); if (!r.ids.length) { message("Ces clips n'existent plus dans le projet."); return; }
    rangerSonsCopies(r.sons); etat.choisirTout(r.ids); etat.tete = t + etat.presse.span; changer(); message(`${r.ids.length} clip${r.ids.length > 1 ? "s" : ""} collé${r.ids.length > 1 ? "s" : ""}. Le curseur est à leur fin : Ctrl+V à nouveau les colle à la suite.`); },
  "tout-choisir": () => { const ids = etat.projet.pistes.flatMap(pi => pi.clips.map(c => c.id)); etat.choisirTout(ids); surligner(); majSelection(); message(ids.length ? `${ids.length} clip${ids.length > 1 ? "s" : ""} choisi${ids.length > 1 ? "s" : ""}.` : "Il n'y a aucun clip."); },
  boucler: () => { const ids = clipsChoisis(); if (!ids.length) return sansClip(); for (const id of ids) { const c = P.trouverClip(etat.projet, id).clip; P.boucler(etat.projet, id, c.duree + (c.boucle ? P.longueurMotif(etat.projet, c) : c.duree)); } changer(); message("Une répétition de plus. Tire le bord droit du clip, en haut, pour boucler à la souris."); },
  "decaler-gauche": () => decaler(-1), "decaler-droite": () => decaler(1), "decaler-gauche-mesure": () => decaler(-1, true), "decaler-droite-mesure": () => decaler(1, true),
  "rogner-curseur": () => { const ids = clipsChoisis(); if (!ids.length) return sansClip(); let n = 0; for (const id of ids) { const c = P.trouverClip(etat.projet, id).clip; if (etat.tete > c.debut + 0.01 && etat.tete < c.debut + c.duree) { P.rognerClip(etat.projet, id, etat.tete - c.debut); n++; } } if (!n) { message("Place le curseur à l'intérieur du clip pour le raccourcir jusque-là."); return; } changer(); },
  lire: () => lire(), debut: () => $("b-debut").click(), enregistrer: () => enregistrer(), metronome: () => { $("metro").checked = !$("metro").checked; message("Métronome " + ($("metro").checked ? "activé" : "coupé") + "."); },
  "piste-ajouter": () => $("b-piste").click(), midi: () => basculerMidi(),
  "piste-haut": () => { const L = etat.projet.pistes, i = Math.max(0, L.findIndex(x => x.id === etat.arme) - 1); etat.arme = L[i].id; afficher(); }, "piste-bas": () => { const L = etat.projet.pistes, i = Math.min(L.length - 1, L.findIndex(x => x.id === etat.arme) + 1); etat.arme = L[i].id; afficher(); },
  "piste-muet": () => { const pi = pisteActive(); if (pi) { pi.muet = !pi.muet; changer(); } }, "piste-solo": () => { const pi = pisteActive(); if (pi) { pi.solo = !pi.solo; changer(); } },
  "zoom-plus": () => $("b-zoom-plus").click(), "zoom-moins": () => $("b-zoom-moins").click(), "zoom-tout": () => { etat.pxs = 60; afficher(); },
  "aide-raccourcis": () => ouvrirAide(),
  "aide-notions": () => notions.ouvrirListe(),
};
// Séparer en stems par intelligence artificielle (voir stems.js) : quatre réseaux de neurones (modèles Spleeter de Deezer, licence MIT), exécutés dans la page. Le premier usage télécharge les modèles (une quarantaine de Mo, depuis ce site) ;
// ils restent ensuite dans le navigateur. Aucun son ne quitte l'appareil. Chaque stem arrive sur une NOUVELLE piste ; l'original reste intact.
function dialogueSeparationIA(enCache, duree) {
  return new Promise(ok => {
    fermerMenus(); document.getElementById("dialogue-ia")?.remove(); const el = document.createElement("div"); el.id = "dialogue-ia"; el.className = "aide-clavier"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", "Séparer en stems par intelligence artificielle");
    const estim = Math.max(10, Math.round(duree * 0.4));
    el.innerHTML = `<div class="ac-boite rg-boite"><div class="ac-haut"><b>Séparer en stems par intelligence artificielle</b><button type="button" class="ac-fermer">Fermer</button></div><div class="rg-corps">
      <p class="rg-texte">Quatre réseaux de neurones séparent le clip en <b>voix</b>, <b>batterie</b>, <b>basse</b> et <b>autres instruments</b>. Chaque partie arrive sur une nouvelle piste ; le clip d'origine est gardé, et les quatre parties s'additionnent pour le redonner.</p>
      <p class="rg-texte">${enCache ? "Les modèles sont déjà dans ce navigateur." : `Au premier usage, <b>${TAILLE_MODELES_MO} Mo</b> de modèles sont téléchargés depuis ce site, une seule fois : ils restent ensuite dans le navigateur.`} <b>Rien n'est envoyé sur Internet</b> : le calcul se fait sur cet appareil.</p>
      <p class="rg-texte">Durée du calcul : environ ${estim} secondes pour ce clip sur un ordinateur récent, beaucoup plus sur un téléphone. Pendant ce temps la page reste utilisable. Limite : ${DUREE_MAX_STEMS / 60} minutes.</p>
      <p class="rg-texte">Ce que cette méthode ne fait pas : des parties parfaites. Les réseaux ont appris sur de la musique enregistrée avec voix chantée, batterie, basse et le reste ; sur une musique très différente (orchestre, instruments du monde, voix parlée), des morceaux d'une partie passent dans les autres. Les modèles sont ceux de Spleeter (Deezer, licence MIT).</p>
      <div class="rg-actions"><button type="button" id="sia-annuler">Annuler</button><button type="button" id="sia-ok" class="principal">${enCache ? "Séparer" : "Télécharger et séparer"}</button></div></div></div>`;
    document.body.appendChild(el); const fin = oui => { el.remove(); document.removeEventListener("keydown", cl, true); ok(oui); }, cl = e => { if (e.key === "Escape") { e.stopPropagation(); e.preventDefault(); fin(false); } };
    document.addEventListener("keydown", cl, true); el.querySelector(".ac-fermer").onclick = el.querySelector("#sia-annuler").onclick = () => fin(false); el.querySelector("#sia-ok").onclick = () => fin(true); el.addEventListener("click", e => { if (e.target === el) fin(false); }); el.querySelector("#sia-ok").focus();
  });
}
EXEC["separer-ia"] = async () => {
  const r = etat.choisi && P.trouverClip(etat.projet, etat.choisi); if (!r) { message("Choisis d'abord un clip : clique dessus."); return; }
  const c = r.clip, src = etat.buffers[c.son]; if (!src) { message("Le son de ce clip n'est pas chargé."); return; }
  if (c.boucle) { message("Un clip bouclé se sépare mal : raccourcis-le d'abord à un motif (bord droit, au milieu)."); return; }
  if (c.duree > DUREE_MAX_STEMS) { message(`Ce clip dure ${Math.round(c.duree)} secondes : la séparation par intelligence artificielle est limitée à ${DUREE_MAX_STEMS / 60} minutes. Coupe-le d'abord (S).`); return; }
  if (separationEnCours) { message("Une séparation est déjà en cours."); return; }
  const base = new URL("./modeles/", import.meta.url); let enCache = false; try { enCache = await modelesEnCache(base); } catch (_) { /* pas de cache : on dira qu'il faut télécharger */ }
  if (!(await dialogueSeparationIA(enCache, c.duree))) return;
  if (!P.trouverClip(etat.projet, c.id)) { message("Le clip a été supprimé : rien à séparer."); return; }
  separationEnCours = true; const nomClip = (etat.projet.sons[c.son] || {}).nom || "son"; let moteur = null;
  try {
    message("Préparation des modèles…");
    moteur = await creerMoteurORT(base, { rappel: (p, t) => message(`${t}.`) });
    const parties = await separerStems(Ed.extrait(src, c.decalage, c.duree), moteur, { rappel: (p, t) => message(`Séparation par intelligence artificielle : ${Math.round(p * 100)} %. ${t}.`) });
    const p = etat.projet; if (!P.trouverClip(p, c.id)) { message("Le clip a été supprimé pendant la séparation : rien n'est ajouté."); return; }
    for (const cle of STEMS) { const son = parties[cle], sid = ajouterAudio(`${nomClip.slice(0, 40)} : ${NOMS_STEMS[cle]}`, son.canaux, son.sr), piste = P.nouvellePiste(NOMS_STEMS[cle]); p.pistes.push(piste); P.placerClip(p, piste.id, sid, c.debut); }
    changer(); message("Séparé en voix, batterie, basse et autres instruments, chacun sur une nouvelle piste. Écoute-les un par un (S sur une piste : solo) ; coupe le clip d'origine avec M (muet) pour n'entendre que les quatre parties. Les parties ne sont pas parfaites : un peu de chaque instrument passe dans les autres.");
  } catch (e) { message(e && e.message ? e.message : "La séparation par intelligence artificielle a échoué."); }
  finally { if (moteur) { try { await moteur.fermer(); } catch (_) { /* déjà libéré */ } } separationEnCours = false; }
};
// Séparer le son (méthodes classiques, voir separation.js) : le clip choisi donne un clip par partie, chacun sur une NOUVELLE piste ; l'original reste intact.
let separationEnCours = false;
EXEC.separer = async () => {
  const r = etat.choisi && P.trouverClip(etat.projet, etat.choisi); if (!r) { message("Choisis d'abord un clip : clique dessus."); return; }
  const c = r.clip, src = etat.buffers[c.son]; if (!src) { message("Le son de ce clip n'est pas chargé."); return; }
  if (c.boucle) { message("Un clip bouclé se sépare mal : raccourcis-le d'abord à un motif (bord droit, au milieu)."); return; }
  if (separationEnCours) { message("Une séparation est déjà en cours."); return; } separationEnCours = true;
  const nomClip = (etat.projet.sons[c.son] || {}).nom || "son";
  try {
    message("Séparation en cours : 0 %. Cela prend un moment pour un clip long ; la page reste utilisable.");
    const parties = await separer(Ed.extrait(src, c.decalage, c.duree), { rappel: p => { message(`Séparation en cours : ${Math.round(p * 100)} %.`); } });
    const p = etat.projet; if (!P.trouverClip(p, c.id)) { message("Le clip a été supprimé pendant la séparation : rien n'est ajouté."); return; }
    for (const [cle, son] of Object.entries(parties)) {
      const nom = `${nomClip.slice(0, 40)} : ${NOMS_PARTIES[cle]}`, sid = ajouterAudio(nom, son.canaux, son.sr), piste = P.nouvellePiste(NOMS_PARTIES[cle]); p.pistes.push(piste); P.placerClip(p, piste.id, sid, c.debut);
    }
    changer(); message(`Séparé en ${Object.keys(parties).length} parties, chacune sur une nouvelle piste. Elles s'additionnent pour redonner le son d'origine : coupe le son d'origine avec M (muet) pour n'entendre que les parties. Méthode classique, pas d'intelligence artificielle : une voix et un instrument tenus au centre restent mêlés.`);
  } catch (e) { message(e && e.message ? e.message : "La séparation a échoué."); } finally { separationEnCours = false; }
};
for (const id of Object.keys(Ed.EFFETS)) EXEC[id] = () => appliquerEffet(id);
for (const id of Object.keys(Ed.REGLABLES)) EXEC[id] = () => ouvrirReglage(id);
const ACTIF = { annuler: () => histo.pile.length > 0, refaire: () => histo.refaire.length > 0 };
function lancer(id) { const f = EXEC[id]; if (f) f(); majMenus(); }
function ouvrirAide() {
  fermerMenus(); document.getElementById("aide-clavier")?.remove(); const el = document.createElement("div"); el.id = "aide-clavier"; el.className = "aide-clavier"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", "Raccourcis clavier");
  el.innerHTML = `<div class="ac-boite"><div class="ac-haut"><b>Raccourcis clavier</b><button type="button" class="ac-fermer">Fermer</button></div><div class="ac-corps">${MENUS.map(m => `<section><h3>${esc(m)}</h3><dl>${COMMANDES.filter(c => c.menu === m).map(c => `<div><dt>${esc(c.libelle)}</dt><dd>${c.touches.length ? c.touches.map(t => `<kbd>${esc(t)}</kbd>`).join(" ou ") : "<span class='petit'>menu</span>"}</dd></div>`).join("")}</dl></section>`).join("")}<p class="petit">Les raccourcis qui agissent sur un clip demandent d'abord de cliquer sur ce clip. Sur Mac, Ctrl se lit Cmd.</p></div></div>`;
  document.body.appendChild(el); const fin = () => { el.remove(); document.removeEventListener("keydown", cl, true); }, cl = e => { if (e.key === "Escape") { e.stopPropagation(); e.preventDefault(); fin(); } };
  document.addEventListener("keydown", cl, true); el.querySelector(".ac-fermer").onclick = fin; el.addEventListener("click", e => { if (e.target === el) fin(); }); el.querySelector(".ac-fermer").focus();
}
function construireMenus() {
  const nav = $("barre-menus"); if (!nav) return;
  nav.innerHTML = MENUS.map(m => `<div class="menu"><button type="button" class="menu-b" aria-haspopup="true" aria-expanded="false" data-menu="${esc(m)}">${esc(m)}</button><ul class="menu-l" role="menu" hidden>${COMMANDES.filter(c => c.menu === m).map(c => `<li role="none"><button type="button" role="menuitem" data-cmd="${c.id}"><span>${esc(c.libelle)}</span><kbd>${esc(affichage(c))}</kbd></button></li>`).join("")}</ul></div>`).join("");
  nav.addEventListener("click", e => { const it = e.target.closest("[data-cmd]"), b = e.target.closest(".menu-b"); if (it) { if (it.disabled) return; fermerMenus(); lancer(it.dataset.cmd); } else if (b) { const ouvert = b.getAttribute("aria-expanded") === "true"; fermerMenus(); if (!ouvert) ouvrirMenu(b); } });
  nav.addEventListener("keydown", e => { const b = document.activeElement; const items = () => [...nav.querySelectorAll('.menu-l:not([hidden]) [data-cmd]:not(:disabled)')];
    if (e.key === "Escape") { fermerMenus(); return; }
    if (b && b.classList.contains("menu-b")) { const bs = [...nav.querySelectorAll(".menu-b")], i = bs.indexOf(b); if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); const n = bs[(i + (e.key === "ArrowRight" ? 1 : bs.length - 1)) % bs.length], ouvert = b.getAttribute("aria-expanded") === "true"; fermerMenus(); n.focus(); if (ouvert) ouvrirMenu(n); } else if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") { e.preventDefault(); ouvrirMenu(b); const it = items()[0]; if (it) it.focus(); } }
    else if (b && b.dataset.cmd) { const L = items(), i = L.indexOf(b); if (e.key === "ArrowDown") { e.preventDefault(); L[(i + 1) % L.length].focus(); } else if (e.key === "ArrowUp") { e.preventDefault(); L[(i + L.length - 1) % L.length].focus(); } else if (e.key === "ArrowRight" || e.key === "ArrowLeft") { const bs = [...nav.querySelectorAll(".menu-b")], cur = b.closest(".menu").querySelector(".menu-b"), n = bs[(bs.indexOf(cur) + (e.key === "ArrowRight" ? 1 : bs.length - 1)) % bs.length]; e.preventDefault(); fermerMenus(); ouvrirMenu(n); const it = items()[0]; if (it) it.focus(); } } });
  document.addEventListener("click", e => { if (!e.target.closest("#barre-menus")) fermerMenus(); });
  // Téléphone : les menus s'ouvrent en une feuille (tout visible, rangé par thèmes) depuis le bouton de la barre d'outils, au lieu d'une rangée de sept mots minuscules.
  const sortirMenu = () => { document.body.classList.remove("menu-ouvert"); $("b-menu-m").setAttribute("aria-expanded", "false"); };
  // Sur téléphone, le menu est un accordéon : toucher le titre d'une section l'ouvre et ferme les autres (la première est ouverte d'emblée).
  nav.addEventListener("click", e => { const b = e.target.closest(".menu-b"); if (!b || !document.body.classList.contains("menu-ouvert")) return; e.stopPropagation(); const m = b.parentElement, ouvrir = !m.classList.contains("ouvert-m"); nav.querySelectorAll(".menu").forEach(x => x.classList.remove("ouvert-m")); if (ouvrir) m.classList.add("ouvert-m"); b.setAttribute("aria-expanded", String(ouvrir)); }, true);
  $("b-menu-m").onclick = e => { e.stopPropagation(); majMenus(); const o = document.body.classList.toggle("menu-ouvert"); $("b-menu-m").setAttribute("aria-expanded", String(o)); if (o && !nav.querySelector(".menu.ouvert-m")) { const m = nav.querySelector(".menu"); if (m) m.classList.add("ouvert-m"); } };
  nav.addEventListener("click", e => { if (e.target.closest("[data-cmd]")) setTimeout(sortirMenu, 0); }, true);
  $("b-menu-fermer").onclick = e => { e.stopPropagation(); sortirMenu(); };
  document.addEventListener("click", e => { if (document.body.classList.contains("menu-ouvert") && !e.target.closest("#barre-menus, #b-menu-m")) sortirMenu(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && document.body.classList.contains("menu-ouvert")) { sortirMenu(); e.stopImmediatePropagation(); } }, true);
}
function ouvrirMenu(b) { majMenus(); b.setAttribute("aria-expanded", "true"); b.parentElement.querySelector(".menu-l").hidden = false; }
function fermerMenus() { const a = document.activeElement; if (a && a.closest && a.closest("#barre-menus")) a.blur(); document.querySelectorAll("#barre-menus .menu-b").forEach(b => b.setAttribute("aria-expanded", "false")); document.querySelectorAll("#barre-menus .menu-l").forEach(l => { l.hidden = true; }); }
const majAnnuler = () => { const a = $("b-annuler"), r = $("b-refaire"); if (a) a.disabled = !histo.pile.length; if (r) r.disabled = !histo.refaire.length; };
function majMenus() { majAnnuler(); document.querySelectorAll("#barre-menus [data-cmd]").forEach(b => { const id = b.dataset.cmd, c = COMMANDES.find(x => x.id === id); b.disabled = !!(ACTIF[id] && !ACTIF[id]()) || !!(c && c.clip && !etat.choisi); }); }
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && document.querySelector("#barre-menus .menu-l:not([hidden])")) { fermerMenus(); e.preventDefault(); return; }
  if (e.target && e.target.closest && e.target.closest("#rouleau") && (/^(TEXTAREA|INPUT|SELECT)$/.test(e.target.tagName) || !(/^[zy]$/i.test(e.key) && (e.ctrlKey || e.metaKey)))) return;   // (dans le texte de la partition, Ctrl+Z défait le texte, pas le projet)   // dans le piano roll, le clavier est au piano roll (Ctrl+Z et Ctrl+Y restent Annuler et Rétablir)
  const t = e.target; if (t && (t.tagName === "INPUT" || t.tagName === "SELECT" || t.tagName === "TEXTAREA" || (document.querySelector("#barre-menus .menu-l:not([hidden])")))) return;
  if (document.getElementById("aide-clavier") || document.getElementById("reglage")) return;
  const c = commandePour(e); if (!c) return; if (/^decaler-/.test(c.id) && !etat.choisis.size) return;   // sans clip choisi, les flèches font défiler la page
  e.preventDefault(); lancer(c.id);
});
document.addEventListener("visibilitychange", () => { if (document.hidden && etat.lecture) arreter(); });


try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); } catch (_) {}  // le navigateur est prié de ne pas effacer les projets
monterPanneaux({ $, esc, etat, P, ajouterAudio, changer, message });  // la bibliothèque et le séquenceur à pas

// ---------------------------------------------------------------- Mes projets : plusieurs projets gardés dans le navigateur
// Un projet qu'on quitte reste rangé avec ses sons ; « Nouveau projet » n'efface plus rien. La sauvegarde du projet ouvert est continue (changer, ranger).
async function chargerProjet(p) {
  if (etat.lecture) arreter();
  etat.projet = P.verifierProjet(p); etat.buffers = {};
  for (const id of Object.keys(etat.projet.sons)) { try { const d = await Stockage.lireSon(id); if (d) etat.buffers[id] = d; } catch (_) {} }
  const perdus = Object.keys(etat.projet.sons).filter(id => !etat.buffers[id]); if (perdus.length) message(`${perdus.length} son${perdus.length > 1 ? "s" : ""} de ce projet n'ont pas été retrouvés dans ce navigateur.`);
  etat.tete = 0; etat.choisi = null; etat.arme = etat.projet.pistes[0] && etat.projet.pistes[0].id; histo.pile = []; histo.refaire = []; histo.snap = JSON.stringify(etat.projet);
  $("titre-projet").value = etat.projet.titre || ""; afficher(); annoncerProjet(); remettreAJourMidi();
}
async function nouveauProjet() {
  await sauverMaintenant(); const n = (await Stockage.listerProjets().catch(() => [])).length + 1, p = P.nouveauProjet({ titre: `Projet ${n}` });
  await Stockage.ecrireProjet(p).catch(alerteEcriture); await chargerProjet(p); annoncerProjet(); message("Nouveau projet. L'autre est gardé dans « Mes projets »."); if (!$("projets").hidden) listerProjets();
}
const dateCourte = t => { try { return new Date(t).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); } catch (_) { return ""; } };
async function listerProjets() {
  listerCorbeille(); const ul = $("liste-projets"); let L = []; try { await Stockage.ecrireProjet(etat.projet); L = await Stockage.listerProjets(); } catch (e) { $("msg-projets").textContent = "Le navigateur ne range pas les projets : " + e.message; }
  ul.innerHTML = L.map(x => `<li data-id="${esc(x.id)}"${x.id === etat.projet.id ? ' class="courant" aria-current="true"' : ""}><input class="lp-titre" value="${esc(x.titre)}" maxlength="80" aria-label="Titre du projet"><span class="petit">${x.pistes} piste${x.pistes > 1 ? "s" : ""}, ${x.clips} clip${x.clips > 1 ? "s" : ""}, ${Math.round(x.duree)} s, tempo ${x.tempo}. ${esc(dateCourte(x.date))}</span>
    <span class="lp-act"><button type="button" data-a="ouvrir"${x.id === etat.projet.id ? " disabled" : ""}>${x.id === etat.projet.id ? "Ouvert" : "Ouvrir"}</button><button type="button" data-a="copier">Dupliquer</button><button type="button" data-a="fichier">Exporter</button><button type="button" data-a="supprimer">Supprimer</button></span></li>`).join("") || "<li>Aucun projet pour l'instant.</li>";
}
$("b-projets").onclick = () => { const ouvert = $("projets").hidden; $("projets").hidden = !ouvert; $("b-projets").setAttribute("aria-expanded", String(ouvert)); if (ouvert) listerProjets(); };
$("projets-fermer").onclick = () => { $("projets").hidden = true; $("b-projets").setAttribute("aria-expanded", "false"); $("b-projets").focus(); };
$("projets-nouveau").onclick = () => nouveauProjet();
$("titre-projet").onchange = e => { P.renommerProjet(etat.projet, e.target.value); e.target.value = etat.projet.titre; changer(); if (!$("projets").hidden) setTimeout(listerProjets, 400); };
$("liste-projets").onchange = async e => { const li = e.target.closest("li[data-id]"); if (!li || !e.target.classList.contains("lp-titre")) return; const id = li.dataset.id;
  if (id === etat.projet.id) { P.renommerProjet(etat.projet, e.target.value); $("titre-projet").value = etat.projet.titre; changer(); } else { const q = await Stockage.lireProjetId(id); if (q) { P.renommerProjet(q, e.target.value); await Stockage.ecrireProjet(q); await Stockage.ecrireProjet(etat.projet); } } listerProjets(); };
$("liste-projets").onclick = async e => { const b = e.target.closest("button[data-a]"), li = e.target.closest("li[data-id]"); if (!b || !li) return; const id = li.dataset.id, m = $("msg-projets");
  try {
    if (b.dataset.a === "ouvrir") { await Stockage.ecrireProjet(etat.projet); await chargerProjet(await Stockage.choisirProjet(id)); m.textContent = `« ${etat.projet.titre} » est ouvert.`; listerProjets(); }
    else if (b.dataset.a === "copier") { await Stockage.ecrireProjet(etat.projet); const q = await Stockage.lireProjetId(id); await Stockage.ecrireProjet(P.copierProjet(q)); m.textContent = "Projet dupliqué : la copie a ses propres pistes, et partage les sons."; listerProjets(); }
    else if (b.dataset.a === "fichier") { const q = id === etat.projet.id ? etat.projet : await Stockage.lireProjetId(id); await exporterFichierProjet(q); m.textContent = "Fichier de projet exporté."; }
    else if (b.dataset.a === "supprimer") {
      const q = await Stockage.lireProjetId(id), courant = id === etat.projet.id; await Stockage.mettreALaCorbeille(id);
      if (courant) { const reste = await Stockage.listerProjets(); if (reste.length) await chargerProjet(await Stockage.choisirProjet(reste[0].id)); else { const p = P.nouveauProjet(); await Stockage.ecrireProjet(p); await chargerProjet(p); } }
      m.textContent = `« ${q ? q.titre : "Le projet"} » est dans la corbeille, plus bas : tu peux le rétablir pendant trente jours.`; listerProjets();
    }
  } catch (err) { m.textContent = "Cela n'a pas pu se faire : " + err.message; }
};
async function listerCorbeille() {
  let C = []; try { C = await Stockage.listerCorbeille(); } catch (_) {} $("corbeille").hidden = !C.length;
  $("liste-corbeille").innerHTML = C.map(x => `<li data-id="${esc(x.id)}"><span class="lp-titre">${esc(x.titre)}</span><span class="petit">supprimé le ${esc(dateCourte(x.supprime))}</span><span class="lp-act"><button type="button" data-a="retablir">Rétablir</button><button type="button" data-a="effacer">Supprimer pour de bon</button></span></li>`).join("");
}
$("liste-corbeille").onclick = async e => { const b = e.target.closest("button[data-a]"), li = e.target.closest("li[data-id]"); if (!b || !li) return; const id = li.dataset.id, m = $("msg-projets"), titre = (li.querySelector(".lp-titre") || {}).textContent || "";
  try { if (b.dataset.a === "retablir") { await Stockage.retablirProjet(id); m.textContent = `« ${titre} » est rétabli : il est de retour dans la liste.`; }
    else if (b.dataset.a === "effacer") { if (!confirm(`Effacer « ${titre} » pour de bon, avec ses sons ? Cela ne pourra plus être annulé.`)) return; await Stockage.supprimerProjet(id); m.textContent = "Effacé pour de bon."; }
    listerProjets(); } catch (err) { m.textContent = "Cela n'a pas pu se faire : " + err.message; } };
// Un projet dans un fichier : le projet et l'audio de chaque son (entiers sur 16 bits, en base64). Pour le garder ailleurs ou le passer à un autre appareil.
const versBase64 = oct => { let s = ""; for (let i = 0; i < oct.length; i += 8192) s += String.fromCharCode.apply(null, oct.subarray(i, i + 8192)); return btoa(s); };
const depuisBase64 = t => { const s = atob(t), o = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) o[i] = s.charCodeAt(i); return o; };
async function exporterFichierProjet(p) {
  const sons = {}; for (const id of Object.keys(p.sons)) { const d = etat.buffers[id] && p.id === etat.projet.id ? etat.buffers[id] : await Stockage.lireSon(id); if (!d) continue;
    sons[id] = { sr: d.sr, canaux: d.canaux.map(c => { const i16 = new Int16Array(c.length); for (let i = 0; i < c.length; i++) i16[i] = Math.max(-32768, Math.min(32767, Math.round(c[i] * 32767))); return versBase64(new Uint8Array(i16.buffer)); }) }; }
  const blob = new Blob([JSON.stringify({ format: "sonora-pistes-fichier", version: 1, projet: p, sons })], { type: "application/json" }), a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = (p.titre || "projet").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9_-]+/g, "-") + ".sonora-pistes.json"; document.body.appendChild(a); a.click(); a.remove(); etat.dernierFichier = { octets: blob.size };
}
async function importerFichierProjet(fichier) {
  const m = $("msg-projets"); try {
    const o = JSON.parse(await fichier.text()); if (!o || o.format !== "sonora-pistes-fichier" || !o.projet) throw new Error("ce n'est pas un fichier de projet de Pistes");
    const p = P.copierProjet(P.verifierProjet(o.projet), o.projet.titre || "Projet importé"), table = {};
    // les sons reçoivent de nouveaux identifiants : un projet importé ne peut pas écraser le son d'un autre projet
    const sons = {}; for (const [id, s] of Object.entries(p.sons)) { const nid = "s" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); table[id] = nid; sons[nid] = { ...s, id: nid }; const d = (o.sons || {})[id];
      if (d) { const canaux = d.canaux.map(t => { const i16 = new Int16Array(depuisBase64(t).buffer.slice(0)), f = new Float32Array(i16.length); for (let i = 0; i < i16.length; i++) f[i] = i16[i] / 32767; return f; }); await Stockage.ecrireSon(nid, { canaux, sr: d.sr }); } }
    p.sons = sons; for (const pi of p.pistes) for (const c of pi.clips) c.son = table[c.son] || c.son;
    await Stockage.ecrireProjet(etat.projet); await Stockage.ecrireProjet(p); await chargerProjet(await Stockage.choisirProjet(p.id)); m.textContent = `« ${p.titre} » est importé et ouvert.`; listerProjets();
  } catch (err) { m.textContent = "Ce fichier n'a pas pu être ouvert : " + err.message; }
}
$("projets-importer").onclick = () => $("projets-fichier").click(); $("projets-fichier").onchange = e => { if (e.target.files[0]) importerFichierProjet(e.target.files[0]).then(() => { e.target.value = ""; }); };

// ---------------------------------------------------------------- démarrage : on reprend le projet rangé, avec ses sons
// Les sons envoyés par le Studio (bouton « Envoyer vers Pistes ») : ils attendent dans le rangement local, on les place sur une piste libre, au début.
async function recevoirDuStudio() {
  let L = []; try { L = JSON.parse(localStorage.getItem("pistes:arrivees") || "[]"); } catch (_) {} if (!L.length) return;
  const recus = [];
  for (const a of L) {
    try { const d = await Stockage.lireSon(a.id); if (!d || !d.canaux || !d.canaux.length) continue;
      const id = ajouterAudio(a.nom, d.canaux, d.sr), duree = d.canaux[0].length / d.sr; P.placerClip(etat.projet, P.pisteLibre(etat.projet, etat.arme || etat.projet.pistes[0].id, 0, duree), id, 0); recus.push(a.nom);
      Stockage.effacerSon(a.id).catch(() => {}); } catch (_) {}
  }
  try { localStorage.removeItem("pistes:arrivees"); } catch (_) {}
  if (recus.length) { empiler(); Stockage.ecrireProjet(etat.projet).catch(alerteEcriture); message(`Reçu du Studio : ${recus.map(n => "« " + n + " »").join(", ")}. Le son est placé au début d'une piste libre.`); }
}
async function demarrer() {
  let p = null;
  let rangement = true;
  try { const lu = await Stockage.lireProjet(); if (lu) p = P.verifierProjet(lu); } catch (_) { p = null; rangement = false; }
  if (p) { for (const id of Object.keys(p.sons)) { try { const d = await Stockage.lireSon(id); if (d) etat.buffers[id] = d; } catch (_) {} } const perdus = Object.keys(p.sons).filter(id => !etat.buffers[id]); if (perdus.length) message(`${perdus.length} son${perdus.length > 1 ? "s" : ""} n'ont pas été retrouvés dans ce navigateur.`); }
  if (!rangement) { message("Le navigateur ne range pas le projet (stockage indisponible ou bloqué) : tu peux travailler, mais il ne sera pas conservé à la fermeture. Exporte en WAV pour garder ton travail."); alerter("permanent", "Ce navigateur ne garde pas ton travail (stockage bloqué ou navigation privée) : il sera perdu à la fermeture. Télécharge ton projet régulièrement.", true); }
  else try { const est = navigator.storage && navigator.storage.estimate && await navigator.storage.estimate(); if (est && est.quota && est.usage / est.quota > 0.85) alerter("place", "Le navigateur est presque plein : ton prochain son risque de ne pas être gardé. Télécharge ton projet et supprime les projets que tu n'utilises plus."); } catch (_) {}
  etat.projet = p || P.nouveauProjet(); $("titre-projet").value = etat.projet.titre || ""; histo.snap = JSON.stringify(etat.projet); construireMenus(); majMenus(); etat.arme = etat.projet.pistes[0] && etat.projet.pistes[0].id;
  await recevoirDuStudio(); afficher(); annoncerProjet(); requestAnimationFrame(boucle); B.preparerBatterie().catch(() => {});   // la vraie batterie se charge en arrière-plan
// Deux niveaux : « l'essentiel » (par défaut) cache ce qui n'est pas utile pour un premier morceau (aimant, métronome, plusieurs pistes, entrée audio, menus, Faust...) ;
// « Tous les outils » montre tout. Le choix est gardé dans le navigateur. Sur téléphone, les outils avancés sont déjà rangés dans des feuilles.
const niveauSimple = () => { try { return localStorage.getItem("pistes-simple") !== "0"; } catch (_) { return true; } };
function appliquerNiveau() { const s = niveauSimple(); document.body.classList.toggle("simple", s); $("b-niveau").setAttribute("aria-pressed", String(!s)); $("b-niveau-t").textContent = s ? "Tous les outils" : "Seulement l'essentiel"; }
$("b-niveau").onclick = () => { try { localStorage.setItem("pistes-simple", niveauSimple() ? "0" : "1"); } catch (_) {} appliquerNiveau(); };
appliquerNiveau();
window.PISTES_PRET = true;
  if (location.hash === "#projets") $("b-projets").click();   // venu de « Mes projets » (accueil SONORA)
}
demarrer();
