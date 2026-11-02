// SONORA Pistes : séquenceur audio. Les sons sont importés (glisser-déposer, sélecteur de fichiers), enregistrés au micro, ou rendus depuis la Library.
// La lecture et l'export WAV construisent le même graphe Web Audio (construire) : ce que l'on entend est ce que l'on exporte.
import { COMMANDES, MENUS, commandePour, affichage } from "./commandes.js";
import * as Ed from "./editions.js";
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
// La réverbération est un programme Faust (faust/reverb.dsp, zita_rev1), compilé à l'avance en WebAssembly et joué par faustwasm (licence LGPL).
let FAUST = null, NREV = 0;
async function usineReverb() {
  if (!FAUST) FAUST = (async () => {
    const fw = await import("./faust/faustwasm.js"), base = new URL("./faust/reverb/", import.meta.url);
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
  const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null; if (pan) { pan.pan.value = pi.pan; vol.connect(pan); pan.connect(sortie); } else vol.connect(sortie);
  return { bus, vol, pan, veilles };
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
  etat.sources = planifier(ctx, etat.projet, etat.tete, etat.debutCtx, chaines); etat.chaines = chaines;
  if ($("metro").checked) etat.metro = metronome(ctx, etat.tete, etat.debutCtx);
  etat.lecture = true; $("b-lire").innerHTML = "&#9632; Arrêter"; badge(etat.enreg ? "enregistrement" : "lecture", etat.enreg ? "erreur" : "marche");
}
function arreter() {
  for (const s of etat.sources) { try { s.stop(); } catch (_) {} } etat.sources = [];
  for (const ch of Object.values(etat.chaines || {})) { try { ch.vol.disconnect(); (ch.veilles || []).forEach(v => v.stop()); } catch (_) {} } etat.chaines = null;
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
function changer() { empiler(); afficher(); clearTimeout(minuteur); minuteur = setTimeout(() => Stockage.ecrireProjet(etat.projet).catch(e => message("Le projet n'a pas pu être rangé : " + e.message)), 250); if (etat.lecture && !etat.enreg) { arreter(); } }

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
    ${curseur("reverb.duree", "Durée", e.reverb.duree, L.duree[0], L.duree[1], 0.1, sec)}${curseur("reverb.aigus", "Aigus", e.reverb.aigus, L.aigus[0], L.aigus[1], 100, hzf)}${curseur("reverb.melange", "Mélange", e.reverb.melange, L.melange[0], L.melange[1], 0.01, pc)}<p class="fx-ex">${esc(P.EXPLICATIONS.reverb)}</p></fieldset>
  </div>`;
  const regler = (chemin, v) => { const [k, c] = chemin.split("."); pi.effets = P.effetsDe(pi); pi.effets[k][c] = v; };
  z.querySelectorAll("[data-actif]").forEach(x => x.onchange = () => { pi.effets = P.effetsDe(pi); pi.effets[x.dataset.actif].actif = x.checked; changer(); });
  z.querySelectorAll("input[data-fxlog]").forEach(x => { x.oninput = () => { const v = Math.round(L.frequence[0] * Math.pow(L.frequence[1] / L.frequence[0], +x.value / 1000)); regler("filtre.frequence", v); z.querySelector('[data-o="filtre.frequence"]').textContent = hzf(v); ranger(); }; x.onchange = () => { if (etat.lecture) { arreter(); lire(); } }; });
  z.querySelectorAll("select[data-fx]").forEach(x => x.onchange = () => { regler(x.dataset.fx, x.value); changer(); });
  z.querySelectorAll("input[data-fx]").forEach(x => { x.oninput = () => { const v = +x.value, fmt = /frequence|aigus/.test(x.dataset.fx) ? hzf : /temps|duree/.test(x.dataset.fx) ? sec : pc; regler(x.dataset.fx, v); z.querySelector(`[data-o="${x.dataset.fx}"]`).textContent = fmt(v); if (x.dataset.fx === "echo.temps") $("fx-distance").textContent = `Avec ${sec(v)}, la paroi serait à environ ${Math.round(P.distanceEcho(v))} m.`; ranger(); }; x.onchange = () => { if (etat.lecture) { arreter(); lire(); } }; });
}

// ---------------------------------------------------------------- export
async function exporter() {
  const p = etat.projet, duree = P.dureeTotale(p); if (!duree) { message("Rien à exporter : ajoute d'abord un son."); return; }
  const queue = Math.max(0.05, ...p.pistes.map(pi => { const e = P.effetsDe(pi); return Math.max(e.reverb.actif ? e.reverb.duree : 0, e.echo.actif ? Math.min(6, e.echo.temps * Math.ceil(Math.log(0.001) / Math.log(Math.max(0.01, e.echo.retour)))) : 0); }));
  const sr = 44100, ctx = new OfflineAudioContext(2, Math.ceil((duree + queue) * sr), sr), t0 = performance.now();
  const chaines = await chainesProjet(ctx, p, ctx.destination); planifier(ctx, p, 0, 0, chaines); const buf = await ctx.startRendering(), canaux = [buf.getChannelData(0), buf.getChannelData(1)];
  const w = encoderWAV(canaux, sr, 16); etat.dernierExport = { octets: w.octets.length, ecretes: w.ecretes, duree };
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([w.octets], { type: "audio/wav" })); a.download = (p.titre || "pistes").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9_-]+/g, "-") + ".wav"; document.body.appendChild(a); a.click(); a.remove();
  message(`WAV exporté : ${duree.toFixed(1).replace(".", ",")} s, stéréo, 16 bits, calculé en ${Math.round(performance.now() - t0)} ms.${w.ecretes ? ` Attention : ${w.ecretes} échantillons dépassent 0 dB, baisse des volumes.` : ""}`);
}

// ---------------------------------------------------------------- commandes
$("b-lire").onclick = lire; $("b-debut").onclick = () => { if (etat.lecture) arreter(); etat.tete = 0; };
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
  "piste-ajouter": () => $("b-piste").click(),
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
async function demarrer() {
  let p = null;
  let rangement = true;
  try { const lu = await Stockage.lireProjet(); if (lu) p = P.verifierProjet(lu); } catch (_) { p = null; rangement = false; }
  if (p) { for (const id of Object.keys(p.sons)) { try { const d = await Stockage.lireSon(id); if (d) etat.buffers[id] = d; } catch (_) {} } const perdus = Object.keys(p.sons).filter(id => !etat.buffers[id]); if (perdus.length) message(`${perdus.length} son${perdus.length > 1 ? "s" : ""} n'ont pas été retrouvés dans ce navigateur.`); }
  if (!rangement) message("Le navigateur ne range pas le projet (stockage indisponible ou bloqué) : tu peux travailler, mais il ne sera pas conservé à la fermeture. Exporte en WAV pour garder ton travail.");
  etat.projet = p || P.nouveauProjet(); histo.snap = JSON.stringify(etat.projet); construireMenus(); majMenus(); etat.arme = etat.projet.pistes[0] && etat.projet.pistes[0].id; afficher(); requestAnimationFrame(boucle); window.PISTES_PRET = true;
}
demarrer();
