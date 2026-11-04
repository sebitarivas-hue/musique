// SONORA Pistes : séquenceur audio. Les sons sont importés (glisser-déposer, sélecteur de fichiers), enregistrés au micro, ou rendus depuis la Library.
// La lecture et l'export WAV construisent le même graphe Web Audio (construire) : ce que l'on entend est ce que l'on exporte.
import { COMMANDES, MENUS, commandePour, affichage } from "./commandes.js?v=09b9602da1";
import * as Ed from "./editions.js?v=09b9602da1";
import * as P from "./projet.js?v=09b9602da1";
import { Stockage } from "./stockage.js?v=09b9602da1";
import { creerBouton } from "./bouton.js?v=09b9602da1";
import * as MI from "./midi.js?v=09b9602da1";
import { Clavier, brancher as brancherMidi } from "../studio/midi.js?v=09b9602da1";
import { Moteur, ErreurMoteur } from "../src/moteur.js?v=09b9602da1";
import * as MO from "./moteurs.js?v=09b9602da1";
import { encoderWAV } from "../studio/wav.js?v=09b9602da1";
import { ENTREES } from "../library/catalogue.js?v=09b9602da1";
import { compiler } from "../src/index.js?v=09b9602da1";
import { rendre } from "../src/rendu.js?v=09b9602da1";

const $ = id => document.getElementById(id);
const points = (...a) => window.COURS_POINTS ? window.COURS_POINTS.gagner(...a) : (window.__pointsEnAttente = window.__pointsEnAttente || []).push(a); // points du cours (sonora/barre-cours.js)
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const etat = { projet: null, buffers: {}, ctx: null, lecture: false, enreg: false, tete: 0, debutCtx: 0, debutTete: 0, sources: [], choisi: null, arme: null, pxs: 60, metro: null };
window.PISTES = etat;
const badge = (t, c = "") => { const e = $("etat"); e.textContent = t; e.className = "etat " + c; };
const message = t => { $("message").textContent = t; };
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
    const fw = await import("./faust/faustwasm.js?v=09b9602da1"), base = new URL("./faust/reverb/", import.meta.url);
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
    catch (err) { rv = ctx.createConvolver(); rv.buffer = reponseSalle(ctx, e.reverb.duree); etat.reverbMoteur = "secours"; message("La réverbération Faust n'a pas pu démarrer dans ce navigateur : une réverbération de secours la remplace."); }
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
  etat.lecture = true; $("b-lire").innerHTML = "&#9632; Arrêter"; badge(etat.enreg ? "enregistrement" : "lecture", etat.enreg ? "erreur" : "marche");
}
function arreter() {
  for (const s of etat.sources) { try { s.stop(); } catch (_) {} } etat.sources = [];
  for (const ch of Object.values(etat.chaines || {})) { try { ch.vol.disconnect(); (ch.veilles || []).forEach(v => v.stop()); } catch (_) {} } etat.chaines = null;
  if (etat.metro) { etat.metro.stop(); etat.metro = null; }
  if (etat.enreg) finirEnregistrement();
  if (etat.notes) finirNotes();
  etat.lecture = false; $("b-lire").innerHTML = "&#9654; Lire"; badge("prêt");
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
  if (etat.enreg && etat.capture) { majClipEnCours(); majNiveauMicro(); }
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
const CAPTEUR = `class Capteur extends AudioWorkletProcessor { process(e) { const c = e[0]; if (c && c.length && c[0]) this.port.postMessage(c.map(x => x.slice(0))); return true; } } registerProcessor("sonora-capteur", Capteur);`;
const MICRO_ERREURS = { NotAllowedError: "Micro refusé. Autorise-le : sur iPhone, Réglages, Safari (ou ton navigateur), Micro ; sur ordinateur, l'icône à gauche de la barre d'adresse.", SecurityError: "Micro refusé : la page doit être ouverte en https.", NotFoundError: "Aucun micro n'a été trouvé sur cet appareil.", NotReadableError: "Le micro est utilisé par une autre application. Ferme-la puis recommence.", OverconstrainedError: "Ce micro n'accepte pas les réglages demandés." };
const arretRecorder = rec => new Promise(ok => { if (!rec || rec.state === "inactive") return ok(); rec.addEventListener("stop", () => ok(), { once: true }); try { rec.stop(); } catch (_) { ok(); } });
function abandonnerCapture(texte) {
  const c = etat.capture; etat.enreg = false; etat.capture = null; $("b-enreg").setAttribute("aria-pressed", "false"); $("vu-micro").hidden = true;
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
    etat.enreg = true; $("b-enreg").setAttribute("aria-pressed", "true"); $("vu-micro").hidden = false; message(armees.length > 1 ? `Enregistrement sur ${armees.length} pistes (« ${armees.map(x => x.nom).join(" », « ")} »), un canal de l'entrée par piste… Appuie sur Enregistrer ou Arrêter pour finir.` : `Enregistrement sur « ${piste.nom} »… Appuie sur Enregistrer ou Arrêter pour finir.`);
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
function majClipEnCours() {
  const c = etat.capture, n = c.morceaux.length ? P.assemblerCanaux(c.morceaux)[0].length : 0, dur = n ? n / c.sr : Math.max(0, etat.ctx.currentTime - c.t0);
  for (const id of c.pistes) {
    const voie = document.querySelector(`.voie[data-piste="${id}"]`); if (!voie) continue; let el = voie.querySelector(".clip.enreg-en-cours");
    if (!el) { el = document.createElement("div"); el.className = "clip enreg-en-cours"; el.innerHTML = `<div class="nom-clip">enregistrement</div>`; voie.appendChild(el); }
    el.style.left = c.debut * etat.pxs + "px"; el.style.width = Math.max(4, dur * etat.pxs) + "px";
  }
}
async function finirEnregistrement() {
  const c = etat.capture; etat.enreg = false; etat.capture = null; $("b-enreg").setAttribute("aria-pressed", "false"); $("vu-micro").hidden = true;
  try { c.src.disconnect(); if (c.noeud) c.noeud.disconnect(); if (c.muet) c.muet.disconnect(); } catch (_) {}
  await arretRecorder(c.rec); c.flux.getTracks().forEach(t => t.stop());
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
const midi = etat.midi = { ouvert: false, octave: 4, instruments: null, courant: null, module: null, moteur: null, clavier: null, enfoncees: new Map(), acces: null };
function listeInstruments() {
  if (midi.instruments) return midi.instruments; midi.instruments = [];
  for (const e of ENTREES) { if (e.type !== "instrument") continue; try { const r = compiler(e.code); if (r.ok && r.module && r.module.voix) midi.instruments.push({ id: e.id, titre: e.titre, module: r.module }); } catch (_) {} }
  return midi.instruments;
}
const hauteurMidi = note => MI.frequenceGamme(note, $("midi-gamme").value || "egal");
const dateProjet = () => Math.max(0, etat.lecture && etat.ctx ? etat.debutTete + etat.ctx.currentTime - etat.debutCtx : etat.tete); // la lecture démarre 60 ms après la commande : une note jouée avant n'a pas de date négative
async function moteurMidi() {
  const inst = listeInstruments().find(x => x.id === $("midi-instrument").value) || listeInstruments()[0]; if (!inst) throw new Error("Aucun instrument polyphonique dans la Library.");
  if (!midi.moteur) { const d = Moteur.diagnostic(); if (!d.ok) throw new ErreurMoteur(d.code, d.raison); midi.moteur = new Moteur(); await midi.moteur.demarrer(); }
  if (midi.courant !== inst.id) { midi.courant = inst.id; midi.module = inst.module; await midi.moteur.charger(inst.module); }
  return midi.moteur;
}
async function noteMidi(note, vitesse, actif) {
  const t = dateProjet();
  if (actif) { if (midi.enfoncees.has(note)) return; midi.enfoncees.set(note, true); } else { if (!midi.enfoncees.has(note)) return; midi.enfoncees.delete(note); }
  document.querySelectorAll(`#midi-clavier [data-note="${note}"]`).forEach(b => b.classList.toggle("jouee", actif));
  if (etat.notes) { if (actif) etat.notes.noteOn(note, hauteurMidi(note), vitesse, t); else etat.notes.noteOff(note, t); }
  try { const m = await moteurMidi(); if (actif) m.noteOn(note, hauteurMidi(note), vitesse); else m.noteOff(note); }
  catch (e) { $("midi-etat").textContent = e instanceof ErreurMoteur ? e.message : "Le son en direct n'a pas pu démarrer : " + (e && e.message || e); }
}
midi.clavier = new Clavier({ noteOn: (n, h, v) => noteMidi(n, v, true), noteOff: n => noteMidi(n, 1, false) });
function dessinerClavierMidi() {
  const z = $("midi-clavier"); z.innerHTML = ""; const base = 12 * (midi.octave + 1), blanches = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16], noires = { 1: 0, 3: 1, 6: 3, 8: 4, 10: 5, 13: 7, 15: 8 };
  const touches = Object.entries(MI.TOUCHES).reduce((o, [k, v]) => { o[v] = k.toUpperCase(); return o; }, {});
  const bouton = (off, noire) => { const n = base + off, b = document.createElement("button"); b.type = "button"; b.className = "touche " + (noire ? "noire" : "blanche"); b.dataset.note = n; b.setAttribute("aria-label", MI.nomNote(n)); b.innerHTML = `<span>${touches[off] || ""}</span>`;
    b.addEventListener("pointerdown", e => { e.preventDefault(); b.setPointerCapture(e.pointerId); noteMidi(n, 0.8, true); }); const fin = () => noteMidi(n, 1, false); b.addEventListener("pointerup", fin); b.addEventListener("pointercancel", fin); b.addEventListener("lostpointercapture", fin);
    b.addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && !e.repeat) { e.preventDefault(); noteMidi(n, 0.8, true); } }); b.addEventListener("keyup", e => { if (e.key === "Enter" || e.key === " ") noteMidi(n, 1, false); }); return b; };
  blanches.forEach(off => z.appendChild(bouton(off, false)));
  Object.entries(noires).forEach(([off, i]) => { const b = bouton(+off, true); b.style.left = `calc(${(i + 1) * 10}% - 3%)`; z.appendChild(b); }); // une noire à cheval sur deux blanches
  $("midi-oct").textContent = midi.octave;
}
function basculerMidi(ouvrir) {
  midi.ouvert = ouvrir === undefined ? !midi.ouvert : ouvrir; $("midi").hidden = !midi.ouvert; $("b-midi").setAttribute("aria-expanded", String(midi.ouvert));
  if (midi.ouvert) { const g = $("midi-gamme"); if (!g.options.length) { g.innerHTML = Object.entries(MI.GAMMES).map(([k, v]) => `<option value="${k}">${esc(v.nom)}</option>`).join(""); g.onchange = () => { $("midi-etat").textContent = g.value === "egal" ? "Tempérament égal : une touche, un demi-ton." : `Gamme choisie : chaque touche est un degré (le do central est le degré 0), l'octave revient tous les ${MI.GAMMES[g.value].cents.length} degrés.`; }; } const sel = $("midi-instrument"); if (!sel.options.length) sel.innerHTML = listeInstruments().map(i => `<option value="${esc(i.id)}">${esc(i.titre)}</option>`).join(""); dessinerClavierMidi(); $("midi").scrollIntoView({ block: "nearest" }); }
  else { midi.clavier.toutCouper(); midi.enfoncees.clear(); if (etat.notes) arreter(); }
}
$("b-midi").onclick = () => basculerMidi(); $("midi-fermer").onclick = () => basculerMidi(false);
$("midi-oct-moins").onclick = () => { midi.octave = Math.max(0, midi.octave - 1); dessinerClavierMidi(); }; $("midi-oct-plus").onclick = () => { midi.octave = Math.min(8, midi.octave + 1); dessinerClavierMidi(); };
$("midi-instrument").onchange = () => { if (midi.moteur) moteurMidi().catch(() => {}); };
$("b-midi-brancher").onclick = async () => {
  if (!navigator.requestMIDIAccess) { $("midi-etat").textContent = "Ce navigateur ne sait pas lire un clavier MIDI (Chrome, Edge ou Opera sur ordinateur et Android le savent ; Safari non). Utilise le clavier de l'ordinateur."; return; }
  try { midi.acces = await navigator.requestMIDIAccess({ sysex: false }); const noms = brancherMidi(midi.acces, midi.clavier);
    $("midi-etat").textContent = noms.length ? `Clavier MIDI branché : ${noms.join(", ")}.` : "Aucun clavier MIDI détecté. Branche-le, puis appuie à nouveau sur ce bouton."; }
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
  try { await moteurMidi(); } catch (e) { $("midi-etat").textContent = e instanceof ErreurMoteur ? e.message : "Le son en direct n'a pas pu démarrer : " + (e && e.message || e); return; }
  const piste = pistesArmees()[0]; etat.notes = new MI.EnregistreurNotes(); etat.notesPiste = piste.id; etat.notesInstrument = listeInstruments().find(x => x.id === midi.courant);
  $("b-notes").setAttribute("aria-pressed", "true"); if (!etat.lecture) await lire(); if (!etat.lecture) { etat.notes = null; $("b-notes").setAttribute("aria-pressed", "false"); return; }
  badge("enregistrement des notes", "erreur"); $("midi-etat").textContent = `Enregistrement des notes sur « ${piste.nom} » avec ${etat.notesInstrument.titre}. Joue ; appuie à nouveau sur le bouton pour finir.`;
};
function finirNotes() {
  const r = etat.notes, inst = etat.notesInstrument; etat.notes = null; $("b-notes").setAttribute("aria-pressed", "false"); r.fermer(dateProjet());
  if (r.vide) { message("Aucune note jouée : rien n'est gardé."); return; }
  try {
    const s = MI.rendreNotes(inst.module, r.notes, { sr: 44100 }), num = Object.values(etat.projet.sons).filter(x => x.nom.startsWith("Notes ")).length + 1;
    const id = ajouterAudio(`Notes ${num} (${inst.titre})`, s.canaux, s.sr); P.placerClip(etat.projet, P.pisteLibre(etat.projet, etat.notesPiste, s.debut, s.duree), id, s.debut);
    message(`${r.notes.length} note${r.notes.length > 1 ? "s" : ""} rendue${r.notes.length > 1 ? "s" : ""} avec ${inst.titre} : clip de ${s.duree.toFixed(1).replace(".", ",")} s sur la piste.`); etat.dernierMidi = { notes: r.notes.length, duree: s.duree, debut: s.debut, instrument: inst.id, detail: r.notes.map(n => ({ note: n.note, t: n.t, fin: n.fin })) }; etat.aReecouter = (etat.aReecouter || []).concat(id); changer();
  } catch (e) { message("Les notes n'ont pas pu être rendues : " + (e && e.message || e)); }
}

// ---------------------------------------------------------------- Faust et Csound : un programme rendu en clip (voir moteurs.js)
const mot = etat.moteurs = { ouvert: false, langage: "faust", compile: null, valeurs: {}, occupe: false };
const motDire = t => { $("mot-etat").textContent = t; };
function motExemple(i) {
  const ex = MO.EXEMPLES[mot.langage][i]; if (!ex) return; $("mot-code").value = ex[1]; $("mot-score").value = ex[2] || ""; mot.compile = null; $("mot-params").innerHTML = ""; motDire(`Exemple « ${ex[0]} » chargé.`);
}
function motLangage(l) {
  mot.langage = l; mot.compile = null; document.querySelectorAll(".chip-m").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.mot === l)));
  $("mot-ex").innerHTML = MO.EXEMPLES[l].map((e, i) => `<option value="${i}">${esc(e[0])}</option>`).join(""); $("mot-score-zone").hidden = l !== "csound"; $("mot-code-lib").textContent = l === "faust" ? "Programme Faust" : l === "pd" ? "Patch Pure Data (texte .pd, tu peux coller le contenu d'un fichier)" : "Orchestre Csound (SONORA fixe sr, ksmps, nchnls et 0dbfs)";
  $("b-mot-compiler").hidden = l === "csound"; $("mot-params").hidden = l !== "faust"; motExemple(0);
}
function basculerMoteurs(ouvrir) {
  mot.ouvert = ouvrir === undefined ? !mot.ouvert : ouvrir; $("moteurs").hidden = !mot.ouvert; $("b-moteurs").setAttribute("aria-expanded", String(mot.ouvert));
  if (mot.ouvert) { if (!$("mot-ex").options.length) motLangage(mot.langage); $("moteurs").scrollIntoView({ block: "nearest" }); }
}
$("b-moteurs").onclick = () => basculerMoteurs(); $("mot-fermer").onclick = () => basculerMoteurs(false);
document.querySelectorAll(".chip-m").forEach(b => b.onclick = () => motLangage(b.dataset.mot)); $("mot-ex").onchange = e => motExemple(+e.target.value);
$("mot-code").oninput = () => { mot.compile = null; };
async function motCompilerPd() {
  motDire(mot.chargePd ? "Compilation…" : "Chargement du compilateur Pure Data (environ 400 Ko, une seule fois)…");
  const c = await MO.compilerPatchPd($("mot-code").value, 44100); mot.chargePd = true; mot.compilePd = c;
  motDire(`Compilé (WebPd) : ${c.entrees ? "patch à entrée (adc~) : il transforme le clip choisi." : "patch sans entrée : il fabrique un son."}${c.avertissements && c.avertissements.length ? "\nAvertissements : " + c.avertissements.slice(0, 2).join(" ; ") : ""}`); return c;
}
async function motRendrePd() {
  const c = await motCompilerPd(), secondes = Math.max(1, Math.min(30, +$("mot-duree").value || 3)), piste = pistesArmees()[0];
  let entree = null, sr = 44100, debut = etat.tete, longueur = secondes, clip = null;
  if (c.entrees) { clip = etat.choisi && P.trouverClip(etat.projet, etat.choisi); if (!clip) { motDire("Ce patch a une entrée (adc~) : choisis d'abord un clip (clique dessus), il sera transformé. Le clip d'origine est gardé."); return; }
    const d = etat.buffers[clip.clip.son]; sr = d.sr; const a = Math.floor(clip.clip.decalage * sr), n = Math.floor(clip.clip.duree * sr); entree = d.canaux[0].subarray(a, a + n); debut = clip.clip.debut; longueur = clip.clip.duree + Math.min(secondes, 2); }
  motDire("Rendu…"); const r = MO.rendrePd(c.js, { sr, secondes: longueur, entree });
  const pic = r.canaux.reduce((m, x) => { for (let i = 0; i < x.length; i += 7) m = Math.max(m, Math.abs(x[i])); return m; }, 0);
  if (!(pic > 1e-4)) { motDire("Le patch ne produit aucun son (silence). Vérifie qu'il y a un dac~ relié à un signal, et que les objets sont ceux que WebPd connaît."); return; }
  const num = Object.values(etat.projet.sons).filter(x => x.nom.startsWith("Pure Data ")).length + 1, p = motPlacer(`Pure Data ${num}${clip ? " (effet)" : ""}`, r.canaux, sr, debut, clip ? clip.piste.id : piste.id);
  motDire(`Pure Data : clip de ${p.duree.toFixed(1).replace(".", ",")} s sur la piste${pic > 1 ? ". Attention : le signal dépasse 0 dB, baisse le volume dans ton patch." : "."}`); etat.dernierMoteur = { langage: "pd", duree: p.duree, pic, entrees: c.entrees }; etat.aReecouter = (etat.aReecouter || []).concat(p.id); changer();
}
async function motCompiler() {
  motDire(MO.chargerFaust && !mot.charge ? "Chargement du compilateur Faust (environ 6 Mo, une seule fois)…" : "Compilation…");
  const c = await MO.compilerFaust($("mot-code").value); mot.charge = true; mot.compile = c; mot.valeurs = {};
  const z = $("mot-params"); z.innerHTML = ""; for (const q of MO.parametresFaust(c.meta)) {
    mot.valeurs[q.adresse] = q.init; z.appendChild(creerBouton({ libelle: q.nom, nom: q.nom, min: q.min, max: q.max, valeur: q.init, def: q.init, pas: q.type === "nentry" || q.pas < 1 ? q.pas : 0, log: false, taille: 48, donnee: "faust:" + q.adresse, format: v => (Math.abs(v) >= 100 ? String(Math.round(v)) : String(Math.round(v * 100) / 100).replace(".", ",")), onInput: v => { mot.valeurs[q.adresse] = v; } }));
  }
  motDire(`Compilé (Faust ${c.version}) : ${c.meta.inputs} entrée${c.meta.inputs > 1 ? "s" : ""}, ${c.meta.outputs} sortie${c.meta.outputs > 1 ? "s" : ""}${c.meta.inputs ? ". Programme à entrée : il transforme le clip choisi." : ". Programme sans entrée : il fabrique un son."}`); return c;
}
$("b-mot-compiler").onclick = async () => { if (mot.occupe) return; mot.occupe = true; try { if (mot.langage === "pd") await motCompilerPd(); else await motCompiler(); } catch (e) { motDire(e.message); } finally { mot.occupe = false; } };
function motPlacer(nom, canaux, sr, debut, pisteId) {
  const id = ajouterAudio(nom, canaux, sr), duree = canaux[0].length / sr; P.placerClip(etat.projet, P.pisteLibre(etat.projet, pisteId, debut, duree), id, debut); return { id, duree };
}
async function motRendreFaust() {
  const c = mot.compile || await motCompiler(), secondes = Math.max(1, Math.min(30, +$("mot-duree").value || 3)), piste = pistesArmees()[0];
  let entrees = [], sr = 44100, debut = etat.tete, longueur = secondes, clip = null;
  if (c.meta.inputs) {
    clip = etat.choisi && P.trouverClip(etat.projet, etat.choisi); if (!clip) { motDire("Ce programme a une entrée : choisis d'abord un clip (clique dessus), il sera transformé. Le clip d'origine est gardé."); return; }
    const d = etat.buffers[clip.clip.son]; sr = d.sr; const a = Math.floor(clip.clip.decalage * sr), n = Math.floor(clip.clip.duree * sr); entrees = d.canaux.map(x => x.subarray(a, a + n)); debut = clip.clip.debut; longueur = clip.clip.duree + Math.min(secondes, 4); // une queue pour un écho ou une résonance
  }
  motDire("Rendu…"); const r = await MO.rendreFaust(c.gen, c.meta, { sr, secondes: longueur, entrees, valeurs: mot.valeurs });
  const pic = r.canaux.reduce((m, x) => { for (let i = 0; i < x.length; i += 7) m = Math.max(m, Math.abs(x[i])); return m; }, 0);
  if (!(pic > 1e-4)) { motDire("Le programme ne produit aucun son (silence). Vérifie les réglages, ou qu'il y a bien un signal en sortie."); return; }
  const num = Object.values(etat.projet.sons).filter(x => x.nom.startsWith("Faust ")).length + 1, canaux = r.canaux.length > 2 ? r.canaux.slice(0, 2) : r.canaux;
  const p = motPlacer(`Faust ${num}${clip ? " (effet)" : ""}`, canaux, sr, debut, clip ? clip.piste.id : piste.id);
  motDire(`Faust : clip de ${p.duree.toFixed(1).replace(".", ",")} s sur la piste${pic > 1 ? ". Attention : le signal dépasse 0 dB, baisse le volume dans ton programme." : "."}`); etat.dernierMoteur = { langage: "faust", duree: p.duree, pic, entrees: c.meta.inputs, valeurs: { ...mot.valeurs } }; etat.aReecouter = (etat.aReecouter || []).concat(p.id); changer();
}
async function motRendreCsound() {
  const secondes = Math.max(1, Math.min(30, +$("mot-duree").value || 3)), piste = pistesArmees()[0], ctx = contexte();
  if (ctx.state !== "running") { try { await Promise.race([ctx.resume(), new Promise(ok => setTimeout(ok, 1500))]); } catch (_) {} }
  motDire("Chargement de Csound (environ 5 Mo, une seule fois)…"); let moteur = null, capteur = null, muet = null;
  try {
    if (!etat.capteurPret) { const url = URL.createObjectURL(new Blob([CAPTEUR], { type: "text/javascript" })); await ctx.audioWorklet.addModule(url); etat.capteurPret = true; }
    const morceaux = []; capteur = new AudioWorkletNode(ctx, "sonora-capteur", { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1], channelCountMode: "max" }); muet = ctx.createGain(); muet.gain.value = 0; capteur.port.onmessage = ev => morceaux.push(ev.data); capteur.connect(muet).connect(ctx.destination);
    moteur = await MO.lancerCsound(ctx, $("mot-code").value, $("mot-score").value); moteur.noeud.connect(capteur); moteur.noeud.connect(ctx.destination);
    motDire(`Csound joue et s'enregistre : ${secondes} s… (tu l'entends)`); await new Promise(ok => setTimeout(ok, secondes * 1000 + 250));
    try { moteur.noeud.disconnect(); } catch (_) {} await moteur.arreter(); moteur = null; try { capteur.disconnect(); muet.disconnect(); } catch (_) {}
    const canaux = P.assemblerCanaux(morceaux).slice(0, 2), n = canaux[0] ? canaux[0].length : 0, pic = canaux.reduce((m, x) => { for (let i = 0; i < x.length; i += 7) m = Math.max(m, Math.abs(x[i])); return m; }, 0);
    if (!n || !(pic > 1e-4)) { motDire("Csound n'a produit aucun son (silence). Vérifie la partition : une ligne comme « i1 0 2 440 », et que l'orchestre sort du son avec outs."); return; }
    const num = Object.values(etat.projet.sons).filter(x => x.nom.startsWith("Csound ")).length + 1, p = motPlacer(`Csound ${num}`, canaux, ctx.sampleRate, etat.tete, piste.id);
    motDire(`Csound : clip de ${p.duree.toFixed(1).replace(".", ",")} s sur la piste.`); etat.dernierMoteur = { langage: "csound", duree: p.duree, pic }; etat.aReecouter = (etat.aReecouter || []).concat(p.id); changer();
  } finally { if (moteur) { try { moteur.noeud.disconnect(); } catch (_) {} await moteur.arreter(); } }
}
$("b-mot-rendre").onclick = async () => {
  if (mot.occupe) return; mot.occupe = true; $("b-mot-rendre").disabled = true;
  try { if (mot.langage === "faust") await motRendreFaust(); else if (mot.langage === "pd") await motRendrePd(); else await motRendreCsound(); }
  catch (e) { motDire((e && e.message || String(e)).slice(0, 600)); }
  finally { mot.occupe = false; $("b-mot-rendre").disabled = false; }
};

// ---------------------------------------------------------------- historique : annuler et rétablir
// On range une copie du projet à chaque changement. Les sons sont immuables (un effet crée un nouveau son), donc revenir en arrière ne perd jamais d'audio.
const histo = { pile: [], refaire: [], snap: null };
function empiler() { const nouveau = JSON.stringify(etat.projet); if (histo.snap === null) { histo.snap = nouveau; return; } if (nouveau !== histo.snap) { histo.pile.push(histo.snap); if (histo.pile.length > 100) histo.pile.shift(); histo.refaire = []; histo.snap = nouveau; } }
function restaurer(texte) { histo.snap = texte; etat.projet = P.verifierProjet(JSON.parse(texte)); if (etat.choisi && !P.trouverClip(etat.projet, etat.choisi)) etat.choisi = null; if (!P.trouverPiste(etat.projet, etat.arme)) etat.arme = etat.projet.pistes[0] && etat.projet.pistes[0].id; if (etat.lecture && !etat.enreg) arreter(); afficher(); clearTimeout(minuteur); minuteur = setTimeout(() => Stockage.ecrireProjet(etat.projet).catch(() => {}), 250); }
function annuler() { if (!histo.pile.length) { message("Rien à annuler."); return; } histo.refaire.push(histo.snap); restaurer(histo.pile.pop()); message("Annulé."); }
function retablir() { if (!histo.refaire.length) { message("Rien à rétablir."); return; } histo.pile.push(histo.snap); restaurer(histo.refaire.pop()); message("Rétabli."); }
window.PISTES_HISTO = histo;
// ---------------------------------------------------------------- effets sur le clip choisi : ils créent un nouveau son, l'original reste intact
function appliquerEffet(id) {
  const r = etat.choisi && P.trouverClip(etat.projet, etat.choisi); if (!r) { message("Choisis d'abord un clip : clique dessus."); return; }
  const c = r.clip, src = etat.buffers[c.son]; if (!src) { message("Le son de ce clip n'est pas chargé."); return; }
  const e = Ed.EFFETS[id], res = e.f(Ed.extrait(src, c.decalage, c.duree)), nom = `${etat.projet.sons[c.son].nom} (${e.etiquette})`.slice(0, 80);
  remplacerClip(c, res, nom, e.nom);
}
function remplacerClip(c, res, nom, effet) { const sid = ajouterAudio(nom, res.canaux, res.sr); c.son = sid; c.decalage = 0; c.duree = Ed.duree(res); changer(); message(`${effet} appliqué au clip : nouveau son « ${nom} ». Ctrl+Z pour annuler.`); }
// Fenêtre de réglage : construite à partir de Ed.REGLABLES (libellés, bornes, unités). L'aperçu joue les 6 premières secondes du clip ; Appliquer crée un nouveau son, l'original reste intact.
function ouvrirReglage(id) {
  const r = etat.choisi && P.trouverClip(etat.projet, etat.choisi); if (!r) { message("Choisis d'abord un clip : clique dessus."); return; }
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
function ajouterAudio(nom, canaux, sr) {
  const id = P.ajouterSon(etat.projet, { nom, duree: canaux[0].length / sr, sr, canaux: canaux.length });
  etat.buffers[id] = { canaux, sr }; Stockage.ecrireSon(id, { canaux, sr }).catch(e => message("Le son n'a pas pu être rangé dans le navigateur : " + e.message)); return id;
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
  g.clearRect(0, 0, w, h); if (!d) return; const x = d.canaux[0], a = Math.floor(clip.decalage * d.sr), n = Math.floor(clip.duree * d.sr), pas = Math.max(1, n / w);
  g.fillStyle = "#11110F"; for (let i = 0; i < w; i++) { let mn = 0, mx = 0; const s = a + Math.floor(i * pas), e2 = Math.min(x.length, s + Math.ceil(pas)); for (let j = s; j < e2; j++) { if (x[j] < mn) mn = x[j]; if (x[j] > mx) mx = x[j]; } const y0 = h / 2 - mx * h / 2 * 0.95, y1 = h / 2 - mn * h / 2 * 0.95; g.fillRect(i, y0, 1, Math.max(1, y1 - y0)); }
}
function afficher() {
  const p = etat.projet, largeur = Math.max(30, P.dureeTotale(p) + 16) * etat.pxs;
  $("tempo").value = p.tempo;
  // règle : une marque par mesure
  const dm = P.dureeMesure(p); let r = ""; for (let m = 0; m * dm * etat.pxs < largeur; m++) r += `<span style="left:${m * dm * etat.pxs}px">${m + 1}</span>`;
  $("regle").innerHTML = r; $("regle").style.width = largeur + "px"; $("voies").style.width = largeur + "px";
  $("entetes").innerHTML = `<div class="ent-regle"></div>` + p.pistes.map(pi => { const nfx = P.rackDe(pi).length; return `<div class="entete${estArmee(pi) ? " armee" : ""}" data-piste="${pi.id}">
    <input type="text" value="${esc(pi.nom)}" aria-label="Nom de la piste" maxlength="30">
    <div class="ent-b"><button type="button" class="b-arme" aria-pressed="${estArmee(pi)}" title="Enregistrer sur cette piste">Rec</button><button type="button" class="b-muet" aria-pressed="${pi.muet}" title="Muet">M</button><button type="button" class="b-solo" aria-pressed="${pi.solo}" title="Solo">S</button><button type="button" class="b-fx" aria-pressed="${etat.fx === pi.id}" title="Effets de la piste">Effets${nfx ? " " + nfx : ""}</button><button type="button" class="b-env" aria-pressed="${etat.env === pi.id}" title="Enveloppe de volume : des points sur la piste pour faire monter et descendre le volume">Env${P.enveloppeDe(pi).length ? " " + P.enveloppeDe(pi).length : ""}</button></div>
    <div class="ent-k"></div></div>`; }).join("");
  const grille = `background-size: ${P.dureeTemps(p) * etat.pxs}px 100%`;
  $("voies").innerHTML = p.pistes.map(pi => `<div class="voie" data-piste="${pi.id}" style="${grille}" aria-label="Piste ${esc(pi.nom)}">${pi.clips.map(c => `<div class="clip${etat.choisi === c.id ? " choisi" : ""}" data-clip="${c.id}" style="left:${c.debut * etat.pxs}px;width:${Math.max(4, c.duree * etat.pxs)}px" tabindex="0" aria-label="${esc((p.sons[c.son] || {}).nom || "son")}, à ${c.debut.toFixed(2)} s"><div class="nom-clip">${esc((p.sons[c.son] || {}).nom || "son")}</div><canvas></canvas></div>`).join("")}</div>`).join("");
  for (const el of document.querySelectorAll(".clip[data-clip]")) { const r2 = P.trouverClip(p, el.dataset.clip); dessinerOnde(el.querySelector("canvas"), p.sons[r2.clip.son], r2.clip); }
  brancherEntetes(); brancherVoies(); dessinerEnveloppes(); majSelection(); afficherEffets();
}
// ---------------------------------------------------------------- enveloppe de volume : un calque SVG sur chaque piste qui a des points, éditable sur la piste choisie (bouton Env)
const SVGNS = "http://www.w3.org/2000/svg", pcEnv = v => Math.round(v * 100) + " %";
function dessinerEnveloppes() {
  const p = etat.projet;
  for (const voie of document.querySelectorAll(".voie")) {
    const pi = P.trouverPiste(p, voie.dataset.piste), pts = P.enveloppeDe(pi), edite = etat.env === pi.id; if (!pts.length && !edite) continue;
    const W = parseFloat(voie.parentElement.style.width) || voie.scrollWidth, H = voie.clientHeight || 168, X = t => t * etat.pxs, Y = v => (1 - v / P.ENV_MAX) * (H - 8) + 4;
    const svg = document.createElementNS(SVGNS, "svg"); svg.setAttribute("class", "env" + (edite ? " env-edit" : "")); svg.setAttribute("width", W); svg.setAttribute("height", H); svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("role", "group"); svg.setAttribute("aria-label", `Enveloppe de volume de ${pi.nom}, ${pts.length} point${pts.length > 1 ? "s" : ""}`);
    const un = document.createElementNS(SVGNS, "line"); un.setAttribute("class", "env-un"); un.setAttribute("x1", 0); un.setAttribute("x2", W); un.setAttribute("y1", Y(1)); un.setAttribute("y2", Y(1)); svg.appendChild(un);
    const ligne = document.createElementNS(SVGNS, "polyline"); ligne.setAttribute("class", "env-l"); svg.appendChild(ligne);
    const tracer = () => { const L = P.enveloppeDe(pi); ligne.setAttribute("points", L.length ? [`0,${Y(L[0].v)}`, ...L.map(q => `${X(q.t)},${Y(q.v)}`), `${W},${Y(L[L.length - 1].v)}`].join(" ") : ""); };
    tracer();
    if (edite) {
      const grille = () => P.dureeTemps(p) * (+$("aimant").value || 0.25), caler = t => P.aimanter(p, t, +$("aimant").value);
      const txt = q => `Point à ${q.t.toFixed(2).replace(".", ",")} s, volume ${pcEnv(q.v)}`;
      const poignee = q => {
        const c = document.createElementNS(SVGNS, "circle"); c.setAttribute("class", "env-p"); c.setAttribute("r", 7); c.setAttribute("tabindex", "0"); c.setAttribute("role", "slider"); c.setAttribute("aria-valuemin", "0"); c.setAttribute("aria-valuemax", "150");
        const maj = () => { c.setAttribute("cx", X(q.t)); c.setAttribute("cy", Y(q.v)); c.setAttribute("aria-valuenow", Math.round(q.v * 100)); c.setAttribute("aria-valuetext", txt(q)); c.setAttribute("aria-label", txt(q)); }; maj();
        const lire = ev => { const r = svg.getBoundingClientRect(); return [Math.max(0, caler((ev.clientX - r.left) / etat.pxs)), P.ENV_MAX * (1 - (Math.min(H - 4, Math.max(4, ev.clientY - r.top)) - 4) / (H - 8))]; };
        c.addEventListener("pointerdown", ev => { ev.preventDefault(); ev.stopPropagation(); c.setPointerCapture(ev.pointerId); c.focus({ preventScroll: true });
          c.onpointermove = m => { const [t, v] = lire(m); P.deplacerPointEnv(pi, q, t, v); maj(); tracer(); }; c.onpointerup = c.onpointercancel = () => { c.onpointermove = c.onpointerup = c.onpointercancel = null; changer(); }; });
        c.addEventListener("dblclick", ev => { ev.stopPropagation(); P.supprimerPointEnv(pi, q); changer(); });
        c.addEventListener("keydown", ev => { const k = ev.key; let fait = true;
          if (k === "ArrowLeft") P.deplacerPointEnv(pi, q, q.t - grille(), q.v); else if (k === "ArrowRight") P.deplacerPointEnv(pi, q, q.t + grille(), q.v);
          else if (k === "ArrowUp") P.deplacerPointEnv(pi, q, q.t, q.v + 0.05); else if (k === "ArrowDown") P.deplacerPointEnv(pi, q, q.t, q.v - 0.05);
          else if (k === "Delete" || k === "Backspace") { P.supprimerPointEnv(pi, q); ev.preventDefault(); ev.stopPropagation(); changer(); return; } else fait = false;
          if (fait) { ev.preventDefault(); ev.stopPropagation(); maj(); tracer(); clearTimeout(c._t); c._t = setTimeout(changer, 400); } });
        return c;
      };
      // un clic dans le vide pose un point, qu'on peut tout de suite glisser
      svg.addEventListener("pointerdown", ev => { if (ev.target !== svg) return; ev.preventDefault(); ev.stopPropagation(); const r = svg.getBoundingClientRect(), t = Math.max(0, caler((ev.clientX - r.left) / etat.pxs)), v = P.ENV_MAX * (1 - (Math.min(H - 4, Math.max(4, ev.clientY - r.top)) - 4) / (H - 8));
        P.ajouterPointEnv(pi, t, v); changer(); });
      pi.enveloppe = pts; // les poignées modifient directement les points rangés dans le projet
      for (const q of pts) svg.appendChild(poignee(q));
    }
    voie.appendChild(svg);
  }
}
function majSelection() {
  const r = etat.choisi && P.trouverClip(etat.projet, etat.choisi); $("selection").hidden = !r; if (!r) return;
  $("sel-nom").textContent = (etat.projet.sons[r.clip.son] || {}).nom || "son"; $("sel-gain").value = r.clip.gain;
}
let minuteur = null;
const ranger = () => { clearTimeout(minuteur); minuteur = setTimeout(() => Stockage.ecrireProjet(etat.projet).catch(() => {}), 300); };
function changer() { etat.toutEcoute = false; empiler(); afficher(); clearTimeout(minuteur); minuteur = setTimeout(() => Stockage.ecrireProjet(etat.projet).catch(e => message("Le projet n'a pas pu être rangé : " + e.message)), 250); if (etat.lecture && !etat.enreg && !etat.notes) { arreter(); } }

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
    el.querySelector(".b-env").onclick = () => { etat.env = etat.env === pi.id ? null : pi.id; if (etat.env) message("Enveloppe de volume : clique sur la piste pour poser un point, glisse-le pour monter ou descendre le volume. Double clic ou Suppr pour l'enlever. Les flèches déplacent un point au clavier."); afficher(); };
    el.querySelector(".b-fx").onclick = () => { etat.fx = etat.fx === pi.id ? null : pi.id; afficher(); if (etat.fx) $("effets").scrollIntoView({ block: "nearest", behavior: "smooth" }); };
  }
}
function tempsDe(ev) { const r = $("voies").getBoundingClientRect(); return Math.max(0, (ev.clientX - r.left) / etat.pxs); }
function brancherVoies() {
  for (const v of document.querySelectorAll(".voie")) {
    v.ondragover = e => { e.preventDefault(); v.classList.add("survol"); }; v.ondragleave = () => v.classList.remove("survol");
    v.ondrop = e => { e.preventDefault(); v.classList.remove("survol"); const f = e.dataTransfer && e.dataTransfer.files; if (f && f.length) importer(f, v.dataset.piste, P.aimanter(etat.projet, tempsDe(e), +$("aimant").value)); };
    v.onpointerdown = e => { if (e.target === v) { etat.choisi = null; etat.tete = P.aimanter(etat.projet, tempsDe(e), +$("aimant").value); if (etat.lecture) { arreter(); } afficher(); } };
  }
  for (const el of document.querySelectorAll(".clip[data-clip]")) {
    el.onpointerdown = e => {
      e.preventDefault(); el.setPointerCapture(e.pointerId); etat.choisi = el.dataset.clip; document.querySelectorAll(".clip").forEach(c => c.classList.toggle("choisi", c === el)); majSelection();
      const r = P.trouverClip(etat.projet, etat.choisi), x0 = e.clientX, d0 = r.clip.debut; let bouge = false;
      el.onpointermove = m => { const dx = (m.clientX - x0) / etat.pxs; if (Math.abs(m.clientX - x0) > 3) bouge = true; if (bouge) el.style.left = P.aimanter(etat.projet, d0 + dx, +$("aimant").value) * etat.pxs + "px"; };
      el.onpointerup = m => { el.onpointermove = null; el.onpointerup = null; if (!bouge) return; const sous = document.elementsFromPoint(m.clientX, m.clientY).find(x => x.classList && x.classList.contains("voie")); P.deplacerClip(etat.projet, etat.choisi, P.aimanter(etat.projet, d0 + (m.clientX - x0) / etat.pxs, +$("aimant").value), sous ? sous.dataset.piste : undefined); changer(); };
    };
  }
}


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
  const relancer = () => { if (etat.lecture) { arreter(); lire(); } };
  z.innerHTML = `<div class="fx-haut"><h2>Effets de la piste « ${esc(pi.nom)} »</h2>
    <label class="fx-ajout"><span class="sr-seul">Ajouter un effet</span><select id="fx-ajouter" aria-label="Ajouter un effet"><option value="">+ Ajouter un effet</option>${manque.map(k => `<option value="${k}">${NOMS_FX[k]}</option>`).join("")}</select></label>
    <button type="button" class="croix-b" id="fx-fermer" aria-label="Fermer les effets"><span class="croix" aria-hidden="true"></span></button></div>
    <p class="petit">Les effets s'appliquent à toute la piste, dans l'ordre filtre, puis écho et réverbération ajoutés au son direct. Ils sont aussi dans le WAV exporté. L'interrupteur éteint un effet sans perdre ses réglages ; la croix le retire du rack. Double clic sur un bouton : valeur de départ.</p>
    <div class="fx-rack" id="fx-rack">${rack.length ? "" : `<p class="fx-vide">Aucun effet sur cette piste. Choisis-en un avec « Ajouter un effet ».</p>`}</div>`;
  const zone = z.querySelector("#fx-rack");
  for (const k of rack) {
    const art = document.createElement("article"); art.className = "fx-device" + (e[k].actif ? "" : " eteint"); art.dataset.effet = k;
    art.innerHTML = `<header><label class="fx-power" title="${e[k].actif ? "Éteindre" : "Allumer"} ${NOMS_FX[k].toLowerCase()}"><input type="checkbox" data-actif="${k}"${e[k].actif ? " checked" : ""} aria-label="${NOMS_FX[k]} : allumé"><span class="fx-led" aria-hidden="true"></span></label><h3>${NOMS_FX[k]}</h3><button type="button" class="croix-b" data-retirer="${k}" aria-label="Retirer ${esc(NOMS_FX[k].toLowerCase())} de la piste"><span class="croix" aria-hidden="true"></span></button></header>
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
$("b-nouveau").onclick = async () => { if (!confirm("Commencer un nouveau projet ? L'ancien et ses sons seront effacés de ce navigateur.")) return; if (etat.lecture) arreter(); await Stockage.toutEffacer().catch(() => {}); etat.projet = P.nouveauProjet(); etat.buffers = {}; etat.tete = 0; etat.choisi = null; etat.arme = etat.projet.pistes[0].id; histo.pile = []; histo.refaire = []; histo.snap = JSON.stringify(etat.projet); changer(); message("Nouveau projet."); };
$("fichiers").onchange = e => { const pi = P.trouverPiste(etat.projet, etat.arme) || etat.projet.pistes[0]; importer(e.target.files, pi.id, P.aimanter(etat.projet, etat.tete, +$("aimant").value)).then(() => { e.target.value = ""; }); };
$("tempo").onchange = e => { etat.projet.tempo = Math.max(40, Math.min(240, +e.target.value || 100)); changer(); };
$("b-zoom-plus").onclick = () => { etat.pxs = Math.min(400, etat.pxs * 1.5); afficher(); }; $("b-zoom-moins").onclick = () => { etat.pxs = Math.max(10, etat.pxs / 1.5); afficher(); };
$("regle").onpointerdown = e => { const r = $("regle").getBoundingClientRect(); etat.tete = Math.max(0, (e.clientX - r.left) / etat.pxs); if (etat.lecture) { arreter(); lire(); } };
$("b-couper").onclick = () => { if (!etat.choisi) return; const n = P.couperClip(etat.projet, etat.choisi, etat.tete); if (!n) { message("Place le curseur rouge à l'intérieur du clip pour le couper."); return; } changer(); };
$("b-dupliquer").onclick = () => { if (!etat.choisi) return; etat.choisi = P.dupliquerClip(etat.projet, etat.choisi); changer(); };
$("b-supprimer").onclick = () => { if (!etat.choisi) return; P.supprimerClip(etat.projet, etat.choisi); etat.choisi = null; changer(); };
$("sel-gain").oninput = e => { const r = etat.choisi && P.trouverClip(etat.projet, etat.choisi); if (r) { r.clip.gain = +e.target.value; clearTimeout(minuteur); minuteur = setTimeout(() => Stockage.ecrireProjet(etat.projet), 300); } };
for (const e of ENTREES) { const o = document.createElement("option"); o.value = e.id; o.textContent = e.titre; $("choix-sonora").appendChild(o); }
$("b-ajout-sonora").onclick = () => { if ($("choix-sonora").value) sonSonora($("choix-sonora").value); };
// ---------------------------------------------------------------- commandes : menus, raccourcis, aide (la table est dans commandes.js)
const pisteActive = () => P.trouverPiste(etat.projet, etat.arme) || etat.projet.pistes[0];
const sansClip = () => { message("Choisis d'abord un clip : clique dessus."); };
const EXEC = {
  importer: () => $("fichiers").click(), exporter: () => $("b-export").click(), nouveau: () => $("b-nouveau").click(), annuler, refaire: retablir,
  couper: () => etat.choisi ? $("b-couper").click() : sansClip(), dupliquer: () => etat.choisi ? $("b-dupliquer").click() : sansClip(), supprimer: () => etat.choisi ? $("b-supprimer").click() : sansClip(),
  deselectionner: () => { etat.choisi = null; afficher(); },
  lire: () => lire(), debut: () => $("b-debut").click(), enregistrer: () => enregistrer(), metronome: () => { $("metro").checked = !$("metro").checked; message("Métronome " + ($("metro").checked ? "activé" : "coupé") + "."); },
  "piste-ajouter": () => $("b-piste").click(), midi: () => basculerMidi(), moteurs: () => basculerMoteurs(),
  "piste-haut": () => { const L = etat.projet.pistes, i = Math.max(0, L.findIndex(x => x.id === etat.arme) - 1); etat.arme = L[i].id; afficher(); }, "piste-bas": () => { const L = etat.projet.pistes, i = Math.min(L.length - 1, L.findIndex(x => x.id === etat.arme) + 1); etat.arme = L[i].id; afficher(); },
  "piste-muet": () => { const pi = pisteActive(); if (pi) { pi.muet = !pi.muet; changer(); } }, "piste-solo": () => { const pi = pisteActive(); if (pi) { pi.solo = !pi.solo; changer(); } },
  "zoom-plus": () => $("b-zoom-plus").click(), "zoom-moins": () => $("b-zoom-moins").click(), "zoom-tout": () => { etat.pxs = 60; afficher(); },
  "aide-raccourcis": () => ouvrirAide(),
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
}
function ouvrirMenu(b) { majMenus(); b.setAttribute("aria-expanded", "true"); b.parentElement.querySelector(".menu-l").hidden = false; }
function fermerMenus() { const a = document.activeElement; if (a && a.closest && a.closest("#barre-menus")) a.blur(); document.querySelectorAll("#barre-menus .menu-b").forEach(b => b.setAttribute("aria-expanded", "false")); document.querySelectorAll("#barre-menus .menu-l").forEach(l => { l.hidden = true; }); }
function majMenus() { document.querySelectorAll("#barre-menus [data-cmd]").forEach(b => { const id = b.dataset.cmd, c = COMMANDES.find(x => x.id === id); b.disabled = !!(ACTIF[id] && !ACTIF[id]()) || !!(c && c.clip && !etat.choisi); }); }
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && document.querySelector("#barre-menus .menu-l:not([hidden])")) { fermerMenus(); e.preventDefault(); return; }
  const t = e.target; if (t && (t.tagName === "INPUT" || t.tagName === "SELECT" || t.tagName === "TEXTAREA" || (document.querySelector("#barre-menus .menu-l:not([hidden])")))) return;
  if (document.getElementById("aide-clavier") || document.getElementById("reglage")) return;
  const c = commandePour(e); if (!c) return; e.preventDefault(); lancer(c.id);
});
document.addEventListener("visibilitychange", () => { if (document.hidden && etat.lecture) arreter(); });

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
  if (recus.length) { empiler(); Stockage.ecrireProjet(etat.projet).catch(() => {}); message(`Reçu du Studio : ${recus.map(n => "« " + n + " »").join(", ")}. Le son est placé au début d'une piste libre.`); }
}
async function demarrer() {
  let p = null;
  let rangement = true;
  try { const lu = await Stockage.lireProjet(); if (lu) p = P.verifierProjet(lu); } catch (_) { p = null; rangement = false; }
  if (p) { for (const id of Object.keys(p.sons)) { try { const d = await Stockage.lireSon(id); if (d) etat.buffers[id] = d; } catch (_) {} } const perdus = Object.keys(p.sons).filter(id => !etat.buffers[id]); if (perdus.length) message(`${perdus.length} son${perdus.length > 1 ? "s" : ""} n'ont pas été retrouvés dans ce navigateur.`); }
  if (!rangement) message("Le navigateur ne range pas le projet (stockage indisponible ou bloqué) : tu peux travailler, mais il ne sera pas conservé à la fermeture. Exporte en WAV pour garder ton travail.");
  etat.projet = p || P.nouveauProjet(); histo.snap = JSON.stringify(etat.projet); construireMenus(); majMenus(); etat.arme = etat.projet.pistes[0] && etat.projet.pistes[0].id;
  await recevoirDuStudio(); afficher(); requestAnimationFrame(boucle); window.PISTES_PRET = true;
}
demarrer();
