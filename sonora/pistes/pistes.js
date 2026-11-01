// SONORA Pistes : séquenceur audio. Les sons sont importés (glisser-déposer, sélecteur de fichiers), enregistrés au micro, ou rendus depuis la Library.
// La lecture et l'export WAV construisent le même graphe Web Audio (construire) : ce que l'on entend est ce que l'on exporte.
import * as P from "./projet.js";
import { Stockage } from "./stockage.js";
import { encoderWAV } from "../studio/wav.js";
import { ENTREES } from "../library/catalogue.js";
import { compiler } from "../src/index.js";
import { rendre } from "../src/rendu.js";

const $ = id => document.getElementById(id);
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
// La chaîne d'une piste : clips -> bus -> [filtre] -> son direct + [écho] + [réverbération] -> volume -> panoramique -> sortie.
function chainePiste(ctx, pi, sortie) {
  const e = P.effetsDe(pi), bus = ctx.createGain(), vol = ctx.createGain(); vol.gain.value = pi.volume;
  let pre = bus;
  if (e.filtre.actif) { const f = ctx.createBiquadFilter(); f.type = e.filtre.type === "passe-haut" ? "highpass" : "lowpass"; f.frequency.value = e.filtre.frequence; f.Q.value = 0.707; bus.connect(f); pre = f; }
  pre.connect(vol);
  if (e.echo.actif) { const d = ctx.createDelay(2), fb = ctx.createGain(), w = ctx.createGain(); d.delayTime.value = e.echo.temps; fb.gain.value = e.echo.retour; w.gain.value = e.echo.melange; pre.connect(d); d.connect(fb); fb.connect(d); d.connect(w); w.connect(vol); }
  if (e.reverb.actif) { const cv = ctx.createConvolver(), w = ctx.createGain(); cv.buffer = reponseSalle(ctx, e.reverb.duree); w.gain.value = e.reverb.melange; pre.connect(cv); cv.connect(w); w.connect(vol); }
  const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null; if (pan) { pan.pan.value = pi.pan; vol.connect(pan); pan.connect(sortie); } else vol.connect(sortie);
  return { bus, vol, pan };
}
// Le graphe complet : un gain par clip (fondus de 5 ms), puis la chaîne de sa piste. Renvoie les sources (pour les arrêter) et les chaînes (pour régler en direct).
function construire(ctx, projet, depuis, debut, sortie) {
  const sources = [], chaines = {}, f = 0.005;
  for (const pi of P.pistesAudibles(projet)) chaines[pi.id] = chainePiste(ctx, pi, sortie);
  for (const e of P.planLecture(projet, depuis)) {
    const buf = bufferDe(ctx, e.son), ch = chaines[e.piste]; if (!buf || !ch) continue;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const g = ctx.createGain(), t0 = debut + e.quand, t1 = t0 + e.duree, gc = e.gainClip;
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(gc, t0 + Math.min(f, e.duree / 2)); g.gain.setValueAtTime(gc, Math.max(t0 + f, t1 - f)); g.gain.linearRampToValueAtTime(0, t1);
    src.connect(g); g.connect(ch.bus); src.start(t0, e.decalage, e.duree); sources.push(src);
  }
  sources.chaines = chaines; return sources;
}

// ---------------------------------------------------------------- lecture
function lire() {
  if (etat.lecture) return arreter();
  const ctx = contexte(); etat.debutCtx = ctx.currentTime + 0.06; etat.debutTete = etat.tete;
  etat.sources = construire(ctx, etat.projet, etat.tete, etat.debutCtx, ctx.destination); etat.chaines = etat.sources.chaines;
  if ($("metro").checked) etat.metro = metronome(ctx, etat.tete, etat.debutCtx);
  etat.lecture = true; $("b-lire").innerHTML = "&#9632; Arrêter"; badge(etat.enreg ? "enregistrement" : "lecture", etat.enreg ? "erreur" : "marche");
}
function arreter() {
  for (const s of etat.sources) { try { s.stop(); } catch (_) {} } etat.sources = [];
  if (etat.metro) { etat.metro.stop(); etat.metro = null; }
  if (etat.enreg) finirEnregistrement();
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
  if (etat.lecture && etat.ctx) { etat.tete = Math.max(0, etat.debutTete + etat.ctx.currentTime - etat.debutCtx); const fin = P.dureeTotale(etat.projet); if (!etat.enreg && etat.tete > fin + 0.3 && fin > 0) { arreter(); } }
  $("position").textContent = fmtT(etat.tete); $("curseur").style.left = (etat.tete * etat.pxs) + "px";
  if (etat.enreg && etat.capture) majClipEnCours();
}

// ---------------------------------------------------------------- enregistrement au micro
const CAPTEUR = `class Capteur extends AudioWorkletProcessor { process(e) { const c = e[0]; if (c && c[0]) this.port.postMessage(c[0].slice(0)); return true; } } registerProcessor("sonora-capteur", Capteur);`;
async function enregistrer() {
  if (etat.enreg) return arreter();
  const piste = P.trouverPiste(etat.projet, etat.arme) || etat.projet.pistes[0]; if (!piste) return;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { message("Ce navigateur ne donne pas accès au micro."); return; }
  const ctx = contexte();
  let flux; try { flux = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } }); }
  catch (e) { message("Micro refusé : " + (e && e.message || e) + ". Autorise-le dans la barre d'adresse du navigateur."); return; }
  try { if (!etat.capteurPret) { const url = URL.createObjectURL(new Blob([CAPTEUR], { type: "text/javascript" })); await ctx.audioWorklet.addModule(url); etat.capteurPret = true; } }
  catch (e) { flux.getTracks().forEach(t => t.stop()); message("L'enregistrement n'est pas possible dans ce navigateur."); return; }
  const src = ctx.createMediaStreamSource(flux), noeud = new AudioWorkletNode(ctx, "sonora-capteur"), muet = ctx.createGain(); muet.gain.value = 0;
  const morceaux = []; noeud.port.onmessage = e => morceaux.push(e.data); src.connect(noeud).connect(muet).connect(ctx.destination);
  etat.capture = { flux, src, noeud, muet, morceaux, piste: piste.id, debut: etat.tete, sr: ctx.sampleRate };
  etat.enreg = true; $("b-enreg").setAttribute("aria-pressed", "true"); message(`Enregistrement sur « ${piste.nom} »… Appuie sur Enregistrer ou Arrêter pour finir.`);
  if (!etat.lecture) lire(); else badge("enregistrement", "erreur");
}
function majClipEnCours() { const c = etat.capture, n = c.morceaux.reduce((s, m) => s + m.length, 0); let el = document.querySelector(".clip.enreg-en-cours"); const voie = document.querySelector(`.voie[data-piste="${c.piste}"]`); if (!voie) return; if (!el) { el = document.createElement("div"); el.className = "clip enreg-en-cours"; el.innerHTML = `<div class="nom-clip">enregistrement</div>`; voie.appendChild(el); } el.style.left = c.debut * etat.pxs + "px"; el.style.width = Math.max(4, n / c.sr * etat.pxs) + "px"; }
function finirEnregistrement() {
  const c = etat.capture; etat.enreg = false; etat.capture = null; $("b-enreg").setAttribute("aria-pressed", "false");
  try { c.src.disconnect(); c.noeud.disconnect(); c.muet.disconnect(); } catch (_) {} c.flux.getTracks().forEach(t => t.stop());
  const n = c.morceaux.reduce((s, m) => s + m.length, 0); if (n < c.sr * 0.05) { message("Enregistrement trop court : rien n'est gardé."); afficher(); return; }
  const x = new Float32Array(n); let o = 0; for (const m of c.morceaux) { x.set(m, o); o += m.length; }
  // compensation de la latence de sortie : la piste d'accompagnement est entendue en retard, donc ce que l'on joue arrive en retard d'autant
  const lat = Math.min(0.3, (etat.ctx.baseLatency || 0) + (etat.ctx.outputLatency || 0)), coupe = Math.round(lat * c.sr);
  const y = coupe && coupe < n / 2 ? x.slice(coupe) : x;
  const num = Object.values(etat.projet.sons).filter(s => /^Enregistrement/.test(s.nom)).length + 1;
  const id = ajouterAudio(`Enregistrement ${num}`, [y], c.sr); P.placerClip(etat.projet, P.pisteLibre(etat.projet, c.piste, c.debut, y.length / c.sr), id, c.debut);
  message(`Enregistré : ${(y.length / c.sr).toFixed(1).replace(".", ",")} s sur la piste. Latence compensée : ${Math.round(lat * 1000)} ms.`); etat.dernierEnreg = { duree: y.length / c.sr, latence: lat }; changer();
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
  $("entetes").innerHTML = `<div class="ent-regle"></div>` + p.pistes.map(pi => { const fx = P.effetsDe(pi), nfx = ["filtre", "echo", "reverb"].filter(k => fx[k].actif).length; return `<div class="entete${etat.arme === pi.id ? " armee" : ""}" data-piste="${pi.id}">
    <input type="text" value="${esc(pi.nom)}" aria-label="Nom de la piste" maxlength="30">
    <div class="ent-b"><button type="button" class="b-arme" aria-pressed="${etat.arme === pi.id}" title="Enregistrer sur cette piste">&#9679; Rec</button><button type="button" class="b-muet" aria-pressed="${pi.muet}" title="Muet">M</button><button type="button" class="b-solo" aria-pressed="${pi.solo}" title="Solo">S</button><button type="button" class="b-fx" aria-pressed="${etat.fx === pi.id}" title="Effets de la piste">Effets${nfx ? " " + nfx : ""}</button></div>
    <label class="ent-r">Volume<input type="range" class="r-vol" min="0" max="1.5" step="0.01" value="${pi.volume}" aria-label="Volume de ${esc(pi.nom)}"><output class="o-vol">${Math.round(pi.volume * 100)} %</output></label>
    <label class="ent-r">G<input type="range" class="r-pan" min="-1" max="1" step="0.01" value="${pi.pan}" aria-label="Panoramique de ${esc(pi.nom)}">D</label></div>`; }).join("");
  const grille = `background-size: ${P.dureeTemps(p) * etat.pxs}px 100%`;
  $("voies").innerHTML = p.pistes.map(pi => `<div class="voie" data-piste="${pi.id}" style="${grille}" aria-label="Piste ${esc(pi.nom)}">${pi.clips.map(c => `<div class="clip${etat.choisi === c.id ? " choisi" : ""}" data-clip="${c.id}" style="left:${c.debut * etat.pxs}px;width:${Math.max(4, c.duree * etat.pxs)}px" tabindex="0" aria-label="${esc((p.sons[c.son] || {}).nom || "son")}, à ${c.debut.toFixed(2)} s"><div class="nom-clip">${esc((p.sons[c.son] || {}).nom || "son")}</div><canvas></canvas></div>`).join("")}</div>`).join("");
  for (const el of document.querySelectorAll(".clip[data-clip]")) { const r2 = P.trouverClip(p, el.dataset.clip); dessinerOnde(el.querySelector("canvas"), p.sons[r2.clip.son], r2.clip); }
  brancherEntetes(); brancherVoies(); majSelection(); afficherEffets();
}
function majSelection() {
  const r = etat.choisi && P.trouverClip(etat.projet, etat.choisi); $("selection").hidden = !r; if (!r) return;
  $("sel-nom").textContent = (etat.projet.sons[r.clip.son] || {}).nom || "son"; $("sel-gain").value = r.clip.gain;
}
let minuteur = null;
const ranger = () => { clearTimeout(minuteur); minuteur = setTimeout(() => Stockage.ecrireProjet(etat.projet).catch(() => {}), 300); };
function changer() { afficher(); clearTimeout(minuteur); minuteur = setTimeout(() => Stockage.ecrireProjet(etat.projet).catch(e => message("Le projet n'a pas pu être rangé : " + e.message)), 250); if (etat.lecture && !etat.enreg) { arreter(); } }

function brancherEntetes() {
  for (const el of document.querySelectorAll(".entete")) {
    const pi = P.trouverPiste(etat.projet, el.dataset.piste);
    el.querySelector("input[type=text]").onchange = e => { pi.nom = e.target.value.slice(0, 30) || pi.nom; changer(); };
    el.querySelector(".b-arme").onclick = () => { etat.arme = pi.id; afficher(); };
    el.querySelector(".b-muet").onclick = () => { pi.muet = !pi.muet; changer(); };
    el.querySelector(".b-solo").onclick = () => { pi.solo = !pi.solo; changer(); };
    el.querySelector(".r-vol").oninput = e => { pi.volume = +e.target.value; el.querySelector(".o-vol").textContent = Math.round(pi.volume * 100) + " %"; const ch = etat.lecture && etat.chaines && etat.chaines[pi.id]; if (ch) ch.vol.gain.setTargetAtTime(pi.volume, etat.ctx.currentTime, 0.02); ranger(); };
    el.querySelector(".r-pan").oninput = e => { pi.pan = +e.target.value; const ch = etat.lecture && etat.chaines && etat.chaines[pi.id]; if (ch && ch.pan) ch.pan.pan.setTargetAtTime(pi.pan, etat.ctx.currentTime, 0.02); ranger(); };
    el.querySelector(".b-fx").onclick = () => { etat.fx = etat.fx === pi.id ? null : pi.id; afficher(); if (etat.fx) $("effets").scrollIntoView({ block: "nearest" }); };
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


// ---------------------------------------------------------------- effets d'une piste, avec leur explication
const curseur = (cle, lib, val, min, max, pas, fmt) => `<label class="fx-r">${lib}<input type="range" data-fx="${cle}" min="${min}" max="${max}" step="${pas}" value="${val}"><output data-o="${cle}">${fmt(val)}</output></label>`;
const pc = v => Math.round(v * 100) + " %", sec = v => (+v).toFixed(2).replace(".", ",") + " s", hzf = v => (v >= 1000 ? (v / 1000).toFixed(1).replace(".", ",") + " kHz" : Math.round(v) + " Hz");
function afficherEffets() {
  const z = $("effets"), pi = etat.fx && P.trouverPiste(etat.projet, etat.fx); z.hidden = !pi; if (!pi) return;
  const e = P.effetsDe(pi), L = P.LIMITES_EFFETS;
  z.innerHTML = `<h2>Effets de la piste « ${esc(pi.nom)} »</h2><p class="petit">Ils s'appliquent à toute la piste, dans l'ordre : filtre, puis écho et réverbération ajoutés au son direct. Ils sont aussi dans le WAV exporté.</p>
  <div class="fx-grille">
   <fieldset><legend><label><input type="checkbox" data-actif="filtre"${e.filtre.actif ? " checked" : ""}> Filtre</label></legend>
    <label class="fx-r">Type<select data-fx="filtre.type"><option value="passe-bas"${e.filtre.type === "passe-bas" ? " selected" : ""}>passe-bas (enlève les aigus)</option><option value="passe-haut"${e.filtre.type === "passe-haut" ? " selected" : ""}>passe-haut (enlève les graves)</option></select></label>
    <label class="fx-r">Coupure<input type="range" data-fxlog="filtre.frequence" min="0" max="1000" step="1" value="${Math.round(1000 * Math.log(e.filtre.frequence / L.frequence[0]) / Math.log(L.frequence[1] / L.frequence[0]))}" aria-label="Fréquence de coupure"><output data-o="filtre.frequence">${hzf(e.filtre.frequence)}</output></label><p class="fx-ex">${esc(P.EXPLICATIONS.filtre)}</p></fieldset>
   <fieldset><legend><label><input type="checkbox" data-actif="echo"${e.echo.actif ? " checked" : ""}> Écho</label></legend>
    ${curseur("echo.temps", "Temps", e.echo.temps, L.temps[0], L.temps[1], 0.01, sec)}${curseur("echo.retour", "Retour", e.echo.retour, L.retour[0], L.retour[1], 0.01, pc)}${curseur("echo.melange", "Mélange", e.echo.melange, L.melange[0], L.melange[1], 0.01, pc)}
    <p class="fx-ex">${esc(P.EXPLICATIONS.echo)} <span id="fx-distance">Avec ${sec(e.echo.temps)}, la paroi serait à environ ${Math.round(P.distanceEcho(e.echo.temps))} m.</span></p></fieldset>
   <fieldset><legend><label><input type="checkbox" data-actif="reverb"${e.reverb.actif ? " checked" : ""}> Réverbération</label></legend>
    ${curseur("reverb.duree", "Durée", e.reverb.duree, L.duree[0], L.duree[1], 0.1, sec)}${curseur("reverb.melange", "Mélange", e.reverb.melange, L.melange[0], L.melange[1], 0.01, pc)}<p class="fx-ex">${esc(P.EXPLICATIONS.reverb)}</p></fieldset>
  </div>`;
  const regler = (chemin, v) => { const [k, c] = chemin.split("."); pi.effets = P.effetsDe(pi); pi.effets[k][c] = v; };
  z.querySelectorAll("[data-actif]").forEach(x => x.onchange = () => { pi.effets = P.effetsDe(pi); pi.effets[x.dataset.actif].actif = x.checked; changer(); });
  z.querySelectorAll("input[data-fxlog]").forEach(x => { x.oninput = () => { const v = Math.round(L.frequence[0] * Math.pow(L.frequence[1] / L.frequence[0], +x.value / 1000)); regler("filtre.frequence", v); z.querySelector('[data-o="filtre.frequence"]').textContent = hzf(v); ranger(); }; x.onchange = () => { if (etat.lecture) { arreter(); lire(); } }; });
  z.querySelectorAll("select[data-fx]").forEach(x => x.onchange = () => { regler(x.dataset.fx, x.value); changer(); });
  z.querySelectorAll("input[data-fx]").forEach(x => { x.oninput = () => { const v = +x.value, fmt = /frequence/.test(x.dataset.fx) ? hzf : /temps|duree/.test(x.dataset.fx) ? sec : pc; regler(x.dataset.fx, v); z.querySelector(`[data-o="${x.dataset.fx}"]`).textContent = fmt(v); if (x.dataset.fx === "echo.temps") $("fx-distance").textContent = `Avec ${sec(v)}, la paroi serait à environ ${Math.round(P.distanceEcho(v))} m.`; ranger(); }; x.onchange = () => { if (etat.lecture) { arreter(); lire(); } }; });
}

// ---------------------------------------------------------------- export
async function exporter() {
  const p = etat.projet, duree = P.dureeTotale(p); if (!duree) { message("Rien à exporter : ajoute d'abord un son."); return; }
  const queue = Math.max(0.05, ...p.pistes.map(pi => { const e = P.effetsDe(pi); return Math.max(e.reverb.actif ? e.reverb.duree : 0, e.echo.actif ? Math.min(6, e.echo.temps * Math.ceil(Math.log(0.001) / Math.log(Math.max(0.01, e.echo.retour)))) : 0); }));
  const sr = 44100, ctx = new OfflineAudioContext(2, Math.ceil((duree + queue) * sr), sr), t0 = performance.now();
  construire(ctx, p, 0, 0, ctx.destination); const buf = await ctx.startRendering(), canaux = [buf.getChannelData(0), buf.getChannelData(1)];
  const w = encoderWAV(canaux, sr, 16); etat.dernierExport = { octets: w.octets.length, ecretes: w.ecretes, duree };
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([w.octets], { type: "audio/wav" })); a.download = (p.titre || "pistes").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9_-]+/g, "-") + ".wav"; document.body.appendChild(a); a.click(); a.remove();
  message(`WAV exporté : ${duree.toFixed(1).replace(".", ",")} s, stéréo, 16 bits, calculé en ${Math.round(performance.now() - t0)} ms.${w.ecretes ? ` Attention : ${w.ecretes} échantillons dépassent 0 dB, baisse des volumes.` : ""}`);
}

// ---------------------------------------------------------------- commandes
$("b-lire").onclick = lire; $("b-debut").onclick = () => { if (etat.lecture) arreter(); etat.tete = 0; };
$("b-enreg").onclick = enregistrer; $("b-export").onclick = exporter;
$("b-piste").onclick = () => { etat.projet.pistes.push(P.nouvellePiste(`Piste ${etat.projet.pistes.length + 1}`)); changer(); };
$("b-nouveau").onclick = async () => { if (!confirm("Commencer un nouveau projet ? L'ancien et ses sons seront effacés de ce navigateur.")) return; if (etat.lecture) arreter(); await Stockage.toutEffacer().catch(() => {}); etat.projet = P.nouveauProjet(); etat.buffers = {}; etat.tete = 0; etat.choisi = null; etat.arme = etat.projet.pistes[0].id; changer(); message("Nouveau projet."); };
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
document.addEventListener("keydown", e => {
  const t = e.target; if (t && (t.tagName === "INPUT" || t.tagName === "SELECT" || t.tagName === "TEXTAREA")) return;
  if (e.key === " ") { e.preventDefault(); lire(); } else if (e.key === "r" || e.key === "R") enregistrer();
  else if ((e.key === "Delete" || e.key === "Backspace") && etat.choisi) { e.preventDefault(); $("b-supprimer").click(); } else if ((e.key === "s" || e.key === "S") && etat.choisi) $("b-couper").click(); else if ((e.key === "d" || e.key === "D") && etat.choisi) $("b-dupliquer").click();
});
document.addEventListener("visibilitychange", () => { if (document.hidden && etat.lecture) arreter(); });

// ---------------------------------------------------------------- démarrage : on reprend le projet rangé, avec ses sons
async function demarrer() {
  let p = null;
  try { const lu = await Stockage.lireProjet(); if (lu) p = P.verifierProjet(lu); } catch (_) { p = null; }
  if (p) { for (const id of Object.keys(p.sons)) { try { const d = await Stockage.lireSon(id); if (d) etat.buffers[id] = d; } catch (_) {} } const perdus = Object.keys(p.sons).filter(id => !etat.buffers[id]); if (perdus.length) message(`${perdus.length} son${perdus.length > 1 ? "s" : ""} n'ont pas été retrouvés dans ce navigateur.`); }
  etat.projet = p || P.nouveauProjet(); etat.arme = etat.projet.pistes[0] && etat.projet.pistes[0].id; afficher(); requestAnimationFrame(boucle); window.PISTES_PRET = true;
}
demarrer();
