// SONORA Studio : l'interface de programmation. Elle ne calcule aucun son : elle compile (Worker), envoie au moteur (AudioWorklet),
// et affiche ce que le moteur renvoie.
import { Moteur, ErreurMoteur, compilerDansWorker } from "../src/moteur.js?v=6405336182";
import { compiler, MODULES, MATHS } from "../src/index.js?v=6405336182";
import { MOTS } from "../src/lexeur.js?v=6405336182";
import { Editeur, inserer } from "./editeur.js?v=6405336182";
import { formater, vers, depuis } from "./reglages-commun.js?v=6405336182";
import { EXEMPLES } from "./exemples.js?v=6405336182";
import { Projets } from "./projets.js?v=6405336182";
import { installerCreation } from "./creation.js?v=6405336182";
import { dessinerOscillo, dessinerSpectre, picHz } from "./visuels.js?v=6405336182";
import { construireGraphe, dessinerGraphe } from "./graphe-visuel.js?v=6405336182";

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const etat = { module: null, moteur: null, marche: false, valeurs: {}, projet: { id: null, titre: "Sans titre" }, tampon: null, sr: 44100, automatisation: null, touches: new Map(), source: null, exempleId: null };
window.STUDIO = etat; // lu par les tests

// ---------------------------------------------------------------- console
function journal(classe, html) {
  const c = $("console"), l = document.createElement("div"); l.className = "l " + classe; l.innerHTML = html; c.appendChild(l);
  while (c.children.length > 200) c.removeChild(c.firstChild);
  c.scrollTop = c.scrollHeight; return l;
}
function afficherDiagnostics(res) {
  for (const d of res.diagnostics) {
    const l = journal(d.gravite === "erreur" ? "err" : "av", `${d.gravite === "erreur" ? "Erreur" : "Avertissement"} ${d.code}, <a href="#" data-ligne="${d.ligne}" data-col="${d.colonne}">ligne ${d.ligne}, colonne ${d.colonne}</a> : ${esc(d.message)}`);
    const extrait = res.source.split("\n")[d.ligne - 1] || "";
    let pre = `${String(d.ligne).padStart(4)} | ${extrait}\n     | ${" ".repeat(d.colonne - 1)}${"^".repeat(Math.max(1, Math.min(d.fin - d.debut, extrait.length - d.colonne + 1)))}`;
    if (d.detail) pre += "\n" + d.detail; if (d.suggestion) pre += "\nSuggestion : " + d.suggestion;
    const p = document.createElement("pre"); p.textContent = pre; l.appendChild(p);
    l.querySelector("a").onclick = e => { e.preventDefault(); ed.allerA(d.ligne, d.colonne); };
  }
}
function etatBadge(txt, classe = "") { if (etat.audioIndispo && !etat.marche) { txt = "audio indisponible"; classe = "erreur"; } const e = $("etat"); e.textContent = txt; e.className = "etat " + classe; }

// ---------------------------------------------------------------- éditeur, aide, autocomplétion
const SNIPPET = (nom, spec) => `${nom}(${spec.params.map(p => p.nom + ": ").join(", ")})`;
const AIDE_MOTS = {
  reglage: "Déclare un paramètre réglable : <code>reglage frequence : Hz = 440 Hz dans 20 Hz .. 20 kHz courbe log</code>. Le Studio en fait un curseur.",
  soit: "Donne un nom à une valeur : <code>soit onde = sinus(frequence)</code>. Une valeur nommée ne change pas ; <code>soit rec</code> permet une rétroaction.",
  rec: "<code>soit rec y = ...</code> : un signal qui se réutilise lui-même. La boucle doit passer par un retard (<code>retarde</code>, <code>z1</code>).",
  sortie: "Le signal que le module envoie aux enceintes. Un nombre sans unité : un volume, pas une fréquence.",
  instrument: "Un module qui produit du son. <code>instrument Nom { ... }</code>.", effet: "Un module qui transforme un signal reçu par <code>entree x : Audio</code>.",
  entree: "<code>entree x : Audio</code> (un son reçu) ou <code>entree notes : Evenement&lt;Note&gt;</code> (les notes jouées au clavier).",
  voix: "Le bloc d'une voix de l'instrument polyphonique : <code>voix (n : Note) { ... sortie = ... }</code>. <code>voix.somme</code> est la somme de toutes les voix.",
  polyphonie: "<code>polyphonie 8 voix vol(plus_ancienne)</code> : nombre de voix et règle quand elles sont toutes prises.",
  automation: "<code>automation nom sur reglage { 0 s : 200 Hz  2 s : 4 kHz courbe exp  boucle }</code> : un réglage qui bouge tout seul.",
  si: "<code>si condition alors a sinon b</code> : choisit entre deux valeurs. Les deux sont calculées.", dans: "Intervalle d'un réglage : <code>dans 20 Hz .. 20 kHz</code>.",
  const: "Une constante globale : <code>const accord : Hz = 432 Hz</code>.", fonction: "Une fonction de l'utilisateur : <code>fonction f(x : Audio) : Audio { rend ... }</code>.",
};
function aideMot(mot) {
  const a = $("aide"); if (!mot) return;
  if (MODULES[mot]) {
    const s = MODULES[mot];
    a.innerHTML = `<div class="sig">${esc(mot)}(${s.params.map(p => `${p.nom}: ${p.t}`).join(", ")})</div><p>${esc(s.doc)}</p><table><tr><th>paramètre</th><th>type</th><th>défaut</th></tr>${s.params.map(p => `<tr><td>${esc(p.nom)}</td><td>${esc(p.t)}${p.rmax === "k" ? " (contrôle)" : ""}</td><td>${p.defaut === undefined ? "obligatoire" : esc(String(p.defaut))}</td></tr>`).join("")}</table><p class="petit">Famille : ${esc(s.famille)}. ${s.impl ? "Disponible." : `Pas encore disponible : prévu à la phase ${s.phase} du plan.`}</p>`;
  } else if (MATHS[mot]) a.innerHTML = `<div class="sig">${esc(mot)}(…)</div><p>Fonction mathématique à ${MATHS[mot].arite} argument${MATHS[mot].arite > 1 ? "s" : ""}.</p>`;
  else if (AIDE_MOTS[mot]) a.innerHTML = `<div class="sig">${esc(mot)}</div><p>${AIDE_MOTS[mot]}</p>`;
  else if (etat.module && etat.module.reglages.find(r => r.nom === mot)) {
    const r = etat.module.reglages.find(x => x.nom === mot);
    a.innerHTML = `<div class="sig">reglage ${esc(r.nom)}</div><p>${esc(r.doc || r.etiquette)}</p><p class="petit">Unité : ${esc(r.unite || "aucune")}. Valeur de départ : ${esc(formater(r.defaut, r))}. ${r.min !== null ? `De ${esc(formater(r.min, r))} à ${esc(formater(r.max, r))}, courbe ${esc(r.courbe)}.` : ""}</p>`;
  }
}
function candidats() {
  const c = [];
  for (const m of MOTS) c.push({ mot: m, type: "mot", detail: "" });
  for (const [n, s] of Object.entries(MODULES)) { const sn = SNIPPET(n, s); c.push({ mot: n, type: s.impl ? "module" : "bientôt", detail: s.params.map(p => p.nom).join(", "), insere: sn, curseur: n.length + 1 }); }
  for (const n of Object.keys(MATHS)) c.push({ mot: n, type: "math", detail: "", insere: n + "()", curseur: n.length + 1 });
  for (const n of ["Hz", "s", "Ratio", "Reel", "Entier", "dB", "Phase", "Audio", "Controle", "Booleen", "Porte", "Texte", "Note"]) c.push({ mot: n, type: "type", detail: "" });
  for (const n of ["hauteur", "vitesse", "porte", "somme"]) c.push({ mot: n, type: "champ", detail: "d'une note" });
  const src = ed.valeur; const vus = new Set();
  for (const m of src.matchAll(/\b(?:reglage|soit(?:\s+rec)?|entree)\s+([\p{L}_][\p{L}\p{N}_]*)/gu)) if (!vus.has(m[1])) { vus.add(m[1]); c.push({ mot: m[1], type: "nom", detail: "dans ce programme" }); }
  return c;
}
let minuteur = null;
const ed = new Editeur($("editeur"), {
  candidats,
  onChange: () => { etat.exempleId = etat.exempleId; brouillon(); clearTimeout(minuteur); minuteur = setTimeout(verifierEnDirect, 350); },
  onCurseur: aideMot,
  onRemplace: avant => { Projets.precedents.empiler(avant, ($("p-titre") || {}).value); majRetour(); },   // le code qu'on remplace est mis de côté : « Revenir au code d'avant »
});

// vérification en direct, sans bruit dans la console : marque l'éditeur et dessine le graphe
function verifierEnDirect() {
  const src = ed.valeur, r = compiler(src, { generer: false });
  ed.marquer(r.diagnostics);
  const n = r.diagnostics.filter(d => d.gravite === "erreur").length, w = r.diagnostics.length - n;
  const d = $("diag"); d.textContent = n ? `${n} erreur${n > 1 ? "s" : ""}` : w ? `${w} avertissement${w > 1 ? "s" : ""}` : src.trim() ? "aucune erreur" : ""; d.className = "diag" + (n ? " err" : "");
  if (r.ast && r.ast.declarations) { try { etat.graphe = construireGraphe(r.ast, src); if (!$("graphe").hidden) dessinerGraphe($("graphe"), etat.graphe, l => { basculerMode("code"); ed.allerA(l); }); } catch (e) { console.error(e); } }
  return r;
}

// ---------------------------------------------------------------- réglages
window.STUDIO_MAP = { vers, depuis };

function envoyer(nom, v) { etat.valeurs[nom] = v; if (etat.marche && etat.moteur) etat.moteur.regler(nom, v); }
function construireReglages(m, valeursInitiales = {}) {
  const z = $("reglages"); z.innerHTML = ""; etat.valeurs = {}; etat.controles = {};
  if (!m.reglages.length) { z.innerHTML = `<p class="petit">Ce programme n'a pas de réglage. Ajoute une ligne <code>reglage ...</code>.</p>`; return; }
  for (const r of m.reglages) {
    const v0 = valeursInitiales[r.nom] !== undefined ? valeursInitiales[r.nom] : r.defaut; etat.valeurs[r.nom] = v0;
    const div = document.createElement("div"); div.className = "reglage"; const id = "r-" + r.nom;
    div.innerHTML = `<label for="${id}"><span>${esc(r.etiquette)}</span><output id="${id}-v" for="${id}">${esc(formater(v0, r))}</output></label>` + (r.doc ? `<p class="doc">${esc(r.doc)}</p>` : "");
    let ctl;
    if (r.choix) { ctl = document.createElement("select"); r.choix.forEach((c, i) => { const o = document.createElement("option"); o.value = i; o.textContent = c; ctl.appendChild(o); }); ctl.value = Math.round(v0); ctl.onchange = () => { sortie(+ctl.value); }; }
    else if (r.booleen) { ctl = document.createElement("input"); ctl.type = "checkbox"; ctl.checked = !!v0; ctl.onchange = () => sortie(ctl.checked ? 1 : 0); }
    else if (r.min !== null) { ctl = document.createElement("input"); ctl.type = "range"; ctl.min = 0; ctl.max = 1000; ctl.step = 1; ctl.value = Math.round(depuis(v0, r) * 1000); ctl.oninput = () => sortie(vers(ctl.value / 1000, r)); ctl.setAttribute("aria-valuetext", formater(v0, r)); }
    else { ctl = document.createElement("input"); ctl.type = "number"; ctl.value = v0; ctl.step = "any"; ctl.oninput = () => { if (ctl.value !== "") sortie(+ctl.value); }; }
    ctl.id = id; ctl.dataset.reglage = r.nom; div.insertBefore(ctl, div.querySelector(".doc"));
    function sortie(v) { if (etat.automatisation) etat.automatisation.suspendues.add(r.nom); div.classList.remove("auto"); $(id + "-v").textContent = formater(v, r); if (ctl.type === "range") ctl.setAttribute("aria-valuetext", formater(v, r)); envoyer(r.nom, v); }
    etat.controles[r.nom] = { ctl, div, r, mettre(v) { $(id + "-v").textContent = formater(v, r); if (ctl.type === "range") ctl.value = Math.round(depuis(v, r) * 1000); else if (ctl.type === "checkbox") ctl.checked = !!v; else ctl.value = r.choix ? Math.round(v) : v; } };
    z.appendChild(div);
  }
}

// ---------------------------------------------------------------- automations (jouées ici : le moteur ne les connaît pas encore)
const courbe = { lin: t => t, exp: t => t * t * t, log: t => t };
function valeurAuto(a, t) {
  const p = a.points, fin = p[p.length - 1].temps;
  if (a.boucle && fin > 0) t = t % fin; else if (t >= fin) return p[p.length - 1].valeur;
  let i = 0; while (i < p.length - 1 && p[i + 1].temps <= t) i++;
  const A = p[i], B = p[Math.min(i + 1, p.length - 1)]; if (B.temps === A.temps) return B.valeur;
  const u = (t - A.temps) / (B.temps - A.temps);
  if (B.courbe === "log" && A.valeur > 0 && B.valeur > 0) return A.valeur * Math.pow(B.valeur / A.valeur, u);
  return A.valeur + (B.valeur - A.valeur) * (courbe[B.courbe] || courbe.lin)(u);
}
function demarrerAutomations(m) {
  arreterAutomations(); if (!m.automations || !m.automations.length) return;
  const t0 = performance.now(), suspendues = new Set();
  const id = setInterval(() => {
    const t = (performance.now() - t0) / 1000;
    for (const a of m.automations) { if (suspendues.has(a.cible)) continue; const v = valeurAuto(a, t), c = etat.controles[a.cible]; if (!c) continue; c.mettre(v); c.div.classList.add("auto"); envoyer(a.cible, v); }
  }, 30);
  etat.automatisation = { id, suspendues };
}
function arreterAutomations() { if (etat.automatisation) { clearInterval(etat.automatisation.id); etat.automatisation = null; } for (const c of Object.values(etat.controles || {})) c.div.classList.remove("auto"); }

// ---------------------------------------------------------------- clavier
const NOTES = [["Do", 0], ["Do#", 1], ["Ré", 2], ["Ré#", 3], ["Mi", 4], ["Fa", 5], ["Fa#", 6], ["Sol", 7], ["Sol#", 8], ["La", 9], ["La#", 10], ["Si", 11]];
const TOUCHES = "awsxdcrfvtgbyhnuj,ik;ol:p!".split(""); // ordre : blanches et noires de deux octaves, agencées par construire()
const frequence = midi => 440 * Math.pow(2, (midi - 69) / 12);
function construireClavier() {
  const k = $("clavier"); k.innerHTML = ""; const debut = 48; // do 3
  const blancs = []; for (let m = debut; m < debut + 24; m++) if (![1, 3, 6, 8, 10].includes(m % 12)) blancs.push(m);
  const rangeeBlanche = "qsdfghjklm", rangeeNoire = "zeuiop"; // clavier AZERTY : ligne du milieu = blanches
  const ordreBlanches = "qsdfghjklmù*".split(""); const ordreNoires = { 1: "z", 3: "e", 6: "t", 8: "y", 10: "u", 13: "o", 15: "p" };
  const dispo = new Map();
  blancs.forEach((m, i) => { const b = document.createElement("button"); b.type = "button"; b.className = "blanche"; b.dataset.midi = m; b.textContent = NOTES[m % 12][0] + (m % 12 === 0 ? Math.floor(m / 12) - 1 : ""); b.setAttribute("aria-label", "note " + b.textContent); k.appendChild(b); if (i < ordreBlanches.length) dispo.set(ordreBlanches[i], m); });
  const w = 100 / blancs.length;
  blancs.forEach((m, i) => { const nxt = m + 1; if ([1, 3, 6, 8, 10].includes(nxt % 12) && i < blancs.length - 1) { const b = document.createElement("button"); b.type = "button"; b.className = "noire"; b.dataset.midi = nxt; b.style.left = (i + 1) * w + "%"; b.setAttribute("aria-label", "note " + NOTES[nxt % 12][0]); k.appendChild(b); const touche = ordreNoire(i); if (touche) dispo.set(touche, nxt); } });
  function ordreNoire(i) { return ["z", "e", null, "t", "y", "u", null, "o", "p"][i] || null; }
  etat.dispo = dispo;
  const jouer = (el, on) => { const m = +el.dataset.midi; if (on) { if (etat.touches.has(m)) return; etat.touches.set(m, el); el.classList.add("on"); if (etat.moteur && etat.marche) etat.moteur.noteOn(m, frequence(m), 0.8); } else if (etat.touches.has(m)) { etat.touches.delete(m); el.classList.remove("on"); if (etat.moteur) etat.moteur.noteOff(m); } };
  k.querySelectorAll("button").forEach(b => { b.addEventListener("pointerdown", e => { e.preventDefault(); b.setPointerCapture(e.pointerId); jouer(b, true); }); b.addEventListener("pointerup", () => jouer(b, false)); b.addEventListener("pointercancel", () => jouer(b, false)); b.addEventListener("lostpointercapture", () => jouer(b, false)); });
  etat.jouerTouche = jouer;
}
const clavierActif = () => !$("clavier-zone").hidden;
function toucheClavier(e, on) {
  if (!clavierActif() || e.ctrlKey || e.metaKey || e.altKey) return;
  const t = e.target; if (t && (t.tagName === "TEXTAREA" || t.tagName === "INPUT" || t.tagName === "SELECT")) return;
  const m = etat.dispo && etat.dispo.get(e.key.toLowerCase()); if (m === undefined) return;
  const el = $("clavier").querySelector(`[data-midi="${m}"]`); if (el) { e.preventDefault(); etat.jouerTouche(el, on); }
}
document.addEventListener("keydown", e => { if (!e.repeat) toucheClavier(e, true); });
document.addEventListener("keyup", e => toucheClavier(e, false));
function toutRelacher() { for (const [m, el] of etat.touches) { el.classList.remove("on"); if (etat.moteur) etat.moteur.noteOff(m); } etat.touches.clear(); }

// ---------------------------------------------------------------- source de test (effets)
async function brancherSource() {
  debrancherSource(); const m = etat.module; if (!m || !etat.moteur || !m.entrees.some(e => e.genre === "audio")) return;
  const choix = $("source-test").value, ctx = etat.moteur.ctx, noeud = etat.moteur.noeud; if (choix === "aucune" || !ctx || !noeud) return;
  let src;
  if (choix === "sinus") { src = ctx.createOscillator(); src.frequency.value = 220; const g = ctx.createGain(); g.gain.value = 0.4; src.connect(g); src.start(); src.stop2 = () => src.stop(); src.sortie = g; }
  else if (choix === "micro") {
    try { try { if (navigator.audioSession) navigator.audioSession.type = "play-and-record"; } catch (_) {} const flux = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } }); const s = ctx.createMediaStreamSource(flux); s.stop2 = () => flux.getTracks().forEach(t => t.stop()); src = s; src.sortie = s; }
    catch (e) { journal("av", "Micro indisponible : " + esc(e && e.message || e) + ". Choisis une autre source."); return; }
  } else {
    const n = ctx.sampleRate, buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
    if (choix === "bruit") { let s = 12345; for (let i = 0; i < n; i++) { s = (s * 1664525 + 1013904223) >>> 0; d[i] = (s / 4294967296 * 2 - 1) * 0.4; } } else { d[0] = 0.9; d[Math.floor(n / 2)] = 0.6; }
    src = ctx.createBufferSource(); src.buffer = buf; src.loop = true; src.start(); src.stop2 = () => src.stop(); src.sortie = src;
  }
  src.sortie.connect(noeud); etat.source = src;
}
function debrancherSource() { const s = etat.source; if (!s) return; try { s.sortie.disconnect(); s.stop2 && s.stop2(); } catch (_) {} etat.source = null; }
$("source-test").onchange = () => { if (etat.marche) brancherSource(); };

// ---------------------------------------------------------------- compilation et exécution
async function compilerPuis(executer) {
  const src = ed.valeur, t0 = performance.now();
  const res = await compilerDansWorker(src, {});
  const ms = performance.now() - t0;
  ed.marquer(res.diagnostics);
  if (!res.ok) {
    afficherDiagnostics(res); etatBadge("erreur", "erreur"); etat.dernier = res;
    const n = res.diagnostics.filter(d => d.gravite === "erreur").length; journal("err", `Compilation refusée : ${n} erreur${n > 1 ? "s" : ""}. Le programme précédent continue de jouer.`);
    return null;
  }
  afficherDiagnostics(res); // avertissements éventuels
  const m = res.module; etat.module = m; etat.dernier = res;
  construireReglages(m, etat.valeursRestaurees || {}); etat.valeursRestaurees = null;
  $("clavier-zone").hidden = !m.voix; if (etat.afficherCreation) etat.afficherCreation(m); $("source-zone").hidden = !m.entrees.some(e => e.genre === "audio");
  if (m.voix) construireClavier();
  if (etat.mode === "decouverte") majScene();
  journal("ok", `Compilé en ${ms.toFixed(0)} ms (${res.via === "worker" ? "dans un Worker" : "sur le fil principal"}) : ${esc(m.nom)}, ${m.reglages.length} réglage${m.reglages.length > 1 ? "s" : ""}, ${m.canaux} canal${m.canaux > 1 ? "ux" : ""}${m.voix ? `, ${m.voix.nbVoix} voix` : ""}, ${m.stats ? m.stats.apres : "?"} nœuds après optimisation.`);
  if (!executer) { etatBadge(etat.marche ? "en marche" : "compilé", etat.marche ? "marche" : ""); if (etat.marche) await chargerDansMoteur(m); return m; }
  return m;
}
async function chargerDansMoteur(m) {
  await etat.moteur.charger(m);
  for (const [nom, v] of Object.entries(etat.valeurs)) etat.moteur.regler(nom, v);
  demarrerAutomations(m); await brancherSource();
}
async function executer() {
  try {
    if (!etat.moteur) {
      const d = Moteur.diagnostic(); if (!d.ok) { journal("err", esc(d.raison)); etatBadge("audio indisponible", "erreur"); return; }
      etat.moteur = new Moteur()
        .on("analyse", a => { etat.tampon = a.tampon; etat.sr = a.sampleRate; })
        .on("erreur", e => { journal("err", "Moteur : " + esc(e.message)); etatBadge("erreur moteur", "erreur"); })
        .on("etat", e => { if (e.incidents) journal("av", `Moteur : ${e.incidents} incident${e.incidents > 1 ? "s" : ""} de calcul (division par zéro, valeur non finie), ramenés à zéro.`); })
        .on("etat-contexte", s => { if (s === "interrupted") { journal("av", "Le navigateur a interrompu le son (appel, verrouillage). Appuie sur Exécuter pour reprendre."); etatBadge("interrompu", "erreur"); } });
    }
    await etat.moteur.demarrer(); etat.moteur.activerAnalyse(true);
    const m = await compilerPuis(true); if (!m) return;
    etat.marche = true; majBoutonScene(); await chargerDansMoteur(m);
    $("b-arreter").disabled = false; etatBadge("en marche", "marche");
    journal("info", `Son à ${etat.moteur.sampleRate} Hz, latence estimée ${(etat.moteur.latence * 1000).toFixed(0)} ms.`);
  } catch (e) { journal("err", esc(e instanceof ErreurMoteur ? e.message : String(e && e.message || e))); etatBadge("erreur", "erreur"); }
}
async function arreter() {
  if (!etat.moteur || !etat.marche) return;
  toutRelacher(); if (etat.arreterSequence) etat.arreterSequence(); arreterAutomations(); debrancherSource(); etat.marche = false; majBoutonScene(); $("b-arreter").disabled = true;
  await etat.moteur.arreter(); etatBadge("arrêté"); journal("info", "Arrêté.");
}
async function reinitialiser() {
  if (!etat.module) return;
  for (const c of Object.values(etat.controles)) { c.mettre(c.r.defaut); etat.valeurs[c.r.nom] = c.r.defaut; }
  if (etat.marche) { await etat.moteur.charger(etat.module); for (const [n, v] of Object.entries(etat.valeurs)) etat.moteur.regler(n, v); demarrerAutomations(etat.module); }
  journal("info", "Réglages remis à leur valeur de départ.");
}
$("b-executer").onclick = executer; $("b-arreter").onclick = arreter; $("b-compiler").onclick = () => compilerPuis(false); $("b-reset").onclick = reinitialiser;
document.addEventListener("keydown", e => { if (e.ctrlKey && e.key === "Enter") { e.preventDefault(); executer(); } else if (e.ctrlKey && e.key === ".") { e.preventDefault(); arreter(); } });
document.addEventListener("visibilitychange", () => { /* le moteur gère la suspension du contexte ; on prévient seulement */ if (document.hidden && etat.marche) journal("info", "Onglet en arrière-plan : le navigateur peut ralentir le son."); });

// ---------------------------------------------------------------- visualisations
let dernierDessin = 0;
function boucleDessin(t) {
  requestAnimationFrame(boucleDessin);
  if (t - dernierDessin < 30) return; dernierDessin = t;
  const x = etat.marche ? etat.tampon : null;
  dessinerOscillo($("oscillo"), x); dessinerSpectre($("spectre"), x, etat.sr);
  if (etat.mode === "decouverte") { dessinerOscillo($("scene-onde"), x); if ($("b-scene").getAttribute("aria-pressed") !== String(!!etat.marche)) majBoutonScene(); }
  if (x) {
    let mx = 0; for (let i = 0; i < x.length; i++) mx = Math.max(mx, Math.abs(x[i]));
    const p = picHz(x, etat.sr); $("m-pic").textContent = "pic : " + (p ? (p >= 1000 ? (p / 1000).toFixed(2) + " kHz" : p.toFixed(1) + " Hz") : "-");
    $("m-niv").textContent = "crête : " + (mx > 0 ? (20 * Math.log10(mx)).toFixed(1) + " dB" : "-inf"); $("m-sr").textContent = etat.sr + " Hz";
  }
}
requestAnimationFrame(boucleDessin);

// ---------------------------------------------------------------- bibliothèque
function remplirExemples() {
  const z = $("v-exemples"); z.innerHTML = "";
  for (const niveau of ["Découverte", "Programmation", "Recherche"]) {
    const g = document.createElement("div"); g.innerHTML = `<div class="groupe">${niveau}</div><ul></ul>`; const ul = g.querySelector("ul");
    for (const e of EXEMPLES.filter(x => x.niveau === niveau)) { const li = document.createElement("li"); li.innerHTML = `<button type="button" class="carte-ex" data-id="${e.id}"><b>${esc(e.titre)}</b><span>${esc(e.texte)}</span></button>`; li.querySelector("button").onclick = () => ouvrirExemple(e.id); ul.appendChild(li); }
    z.appendChild(g);
  }
}
function ouvrirExemple(id) {
  const e = EXEMPLES.find(x => x.id === id); if (!e) return;
  if (etat.marche) arreter();
  etat.exempleId = id; etat.projet = { id: null, titre: e.titre }; $("p-titre").value = e.titre; ed.valeur = e.code; etat.valeursRestaurees = null;
  document.querySelectorAll(".carte-ex").forEach(b => b.setAttribute("aria-current", String(b.dataset.id === id)));
  verifierEnDirect(); compilerPuis(false); journal("info", `Exemple ouvert : ${esc(e.titre)}. Appuie sur Exécuter.`); brouillon();
  basculerPanneauMobile("centre");
}
function remplirModules() {
  const z = $("v-modules"); z.innerHTML = ""; const fam = {};
  for (const [n, s] of Object.entries(MODULES)) (fam[s.famille] || (fam[s.famille] = [])).push([n, s]);
  for (const [f, liste] of Object.entries(fam)) {
    const g = document.createElement("div"); g.innerHTML = `<div class="groupe">${esc(f)}</div><ul></ul>`; const ul = g.querySelector("ul");
    for (const [n, s] of liste) { const li = document.createElement("li"); li.className = "mod"; li.innerHTML = `<button type="button" data-mod="${n}" title="${esc(s.doc)}">${esc(n)}</button><span class="etiq ${s.impl ? "" : "non"}">${s.impl ? "prêt" : "bientôt"}</span>`; const b = li.querySelector("button");
      b.onclick = () => aideMot(n); b.ondblclick = () => insererModule(n, s); ul.appendChild(li); }
    z.appendChild(g);
  }
  const p = document.createElement("p"); p.className = "petit"; p.textContent = "Un clic affiche l'aide du module, un double clic l'insère dans le code. Les modules marqués « bientôt » sont vérifiés par le compilateur mais pas encore disponibles à l'écoute."; z.appendChild(p);
}
function insererModule(n, s) {
  const ta = ed.ta; inserer(ta, ta.selectionStart, ta.selectionEnd, SNIPPET(n, s), n.length + 1);
  ed.maj(); ed.focus(); brouillon(); verifierEnDirect();
}
document.querySelectorAll("#gauche .onglets button").forEach(b => b.onclick = () => {
  document.querySelectorAll("#gauche .onglets button").forEach(x => x.setAttribute("aria-selected", String(x === b)));
  for (const v of ["exemples", "modules", "projets"]) $("v-" + v).hidden = v !== b.dataset.t; if (b.dataset.t === "projets") remplirProjets();
});
function basculerMode(mode) {
  document.querySelectorAll("#centre .onglets [data-m]").forEach(x => x.setAttribute("aria-selected", String(x.dataset.m === mode)));
  $("editeur").hidden = mode !== "code"; $("graphe").hidden = mode !== "graphe";
  if (mode === "graphe") { verifierEnDirect(); dessinerGraphe($("graphe"), etat.graphe || { noeuds: [], liens: [] }, l => { basculerMode("code"); ed.allerA(l); }); }
}
document.querySelectorAll("#centre .onglets [data-m]").forEach(b => b.onclick = () => basculerMode(b.dataset.m));
function basculerPanneauMobile(p) { $("grille").dataset.actif = p; document.querySelectorAll("#onglets-mobiles button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.p === p))); }
document.querySelectorAll("#onglets-mobiles button").forEach(b => b.onclick = () => basculerPanneauMobile(b.dataset.p));

// ---------------------------------------------------------------- projets
function titreCourant() { return $("p-titre").value.trim() || "Sans titre"; }
function brouillon() { Projets.brouillon.ecrire({ source: ed.valeur, titre: titreCourant(), exemple: etat.exempleId, projet: etat.projet.id }); }
function remplirProjets() {
  const ul = $("p-liste"); ul.innerHTML = ""; const l = Projets.liste();
  if (!l.length) ul.innerHTML = `<li class="petit">Aucun projet enregistré.</li>`;
  for (const p of l) { const li = document.createElement("li"); if (p.id === etat.projet.id) li.className = "cur"; li.innerHTML = `<button type="button" data-id="${p.id}">${esc(p.titre)} <span class="petit">${new Date(p.maj).toLocaleDateString("fr-FR")}</span></button>`; li.querySelector("button").onclick = () => ouvrirProjet(p.id); ul.appendChild(li); }
}
function ouvrirProjet(id) {
  const p = Projets.trouver(id); if (!p) return; if (etat.marche) arreter();
  etat.projet = { id: p.id, titre: p.titre }; $("p-titre").value = p.titre; ed.valeur = p.source; etat.valeursRestaurees = p.reglages || {}; etat.exempleId = null;
  verifierEnDirect(); compilerPuis(false); journal("info", `Projet ouvert : ${esc(p.titre)}.`); remplirProjets();
}
function reglagesActuels() { return { ...etat.valeurs }; }
function majRetour() { const n = Projets.precedents.liste().length, b = $("p-retour"); if (b) { b.disabled = !n; b.textContent = n > 1 ? `\u21B6 Revenir au code d'avant (${n})` : "\u21B6 Revenir au code d'avant"; } const c = Projets.corbeille(), r = $("p-corbeille"); if (r) { r.hidden = !c.length; r.textContent = c.length ? `\u21B6 Rétablir « ${c[0].titre} »` : "Rétablir le dernier projet supprimé"; } }
$("p-retour").onclick = () => { const x = Projets.precedents.depiler(); if (!x) return; ed._silence = true; ed.valeur = x.texte; ed._silence = false; journal("ok", "Le code d'avant est revenu."); majRetour(); verifierEnDirect(); compilerPuis(false); };
$("p-corbeille").onclick = () => { const c = Projets.corbeille()[0]; if (!c) return; const p = Projets.retablir(c.id); if (p) { journal("ok", `Projet rétabli : ${esc(p.titre)}.`); remplirProjets(); } majRetour(); };
$("p-enreg").onclick = () => { const p = Projets.enregistrer({ id: etat.projet.id, titre: titreCourant(), source: ed.valeur, reglages: reglagesActuels() }); if (!p) { journal("err", "Impossible d'enregistrer : le stockage du navigateur est refusé ou plein. Exporte le projet en fichier."); return; } etat.projet = { id: p.id, titre: p.titre }; journal("ok", `Projet enregistré : ${esc(p.titre)}.`); remplirProjets(); };
$("p-dupl").onclick = () => { if (!etat.projet.id) { journal("av", "Enregistre d'abord le projet pour pouvoir le dupliquer."); return; } const p = Projets.dupliquer(etat.projet.id); if (p) { journal("ok", `Copie créée : ${esc(p.titre)}.`); remplirProjets(); } };
$("p-suppr").onclick = () => { if (!etat.projet.id) return; const t = etat.projet.titre; Projets.supprimer(etat.projet.id); etat.projet = { id: null, titre: titreCourant() }; journal("info", `« ${esc(t)} » est à la corbeille : tu peux le rétablir avec le bouton « Rétablir ».`); remplirProjets(); majRetour(); };
$("p-nouveau").onclick = () => { if (etat.marche) arreter(); etat.projet = { id: null, titre: "Sans titre" }; $("p-titre").value = "Sans titre"; ed.valeur = "instrument Nouveau {\n    reglage frequence : Hz = 440 Hz dans 20 Hz .. 20 kHz courbe log\n    sortie = sinus(frequence) * 0.2\n}\n"; etat.exempleId = null; verifierEnDirect(); compilerPuis(false); remplirProjets(); };
function telecharger(nom, texte, type) { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([texte], { type })); a.download = nom; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
const nomFichier = () => titreCourant().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "projet";
$("p-export").onclick = () => { telecharger(nomFichier() + ".sonora.json", Projets.exporterJSON({ titre: titreCourant(), source: ed.valeur, reglages: reglagesActuels() }), "application/json"); journal("ok", "Projet exporté."); };
$("p-export-sn").onclick = () => { telecharger(nomFichier() + ".sn", ed.valeur, "text/plain"); journal("ok", "Code exporté."); };
$("p-import").onchange = async e => {
  const f = e.target.files[0]; if (!f) return; e.target.value = "";
  try {
    const t = await f.text(); let p;
    if (/\.sn$/i.test(f.name) || !/^\s*\{/.test(t)) p = { titre: f.name.replace(/\.[^.]+$/, ""), source: t, reglages: {} }; else p = Projets.importerJSON(t);
    if (etat.marche) await arreter(); etat.projet = { id: null, titre: p.titre }; $("p-titre").value = p.titre; ed.valeur = p.source; etat.valeursRestaurees = p.reglages; etat.exempleId = null;
    verifierEnDirect(); await compilerPuis(false); journal("ok", `Importé : ${esc(p.titre)}.`);
  } catch (err) { journal("err", esc(err.message)); }
};

// ---------------------------------------------------------------- mode Découvrir ou Programmer
const NIVEAU_PHRASE = { "Découverte": "Pour découvrir", "Programmation": "Pour programmer", "Recherche": "Pour chercher" };
function lireMode() { try { return localStorage.getItem("sonora:mode") || "decouverte"; } catch (_) { return "decouverte"; } }
function appliquerMode(m) {
  etat.mode = m; document.body.dataset.mode = m; $("scene").hidden = m !== "decouverte";
  $("b-mode").textContent = m === "decouverte" ? "Programmer" : "Découvrir"; $("b-mode").setAttribute("aria-pressed", String(m !== "decouverte"));
  const ongletCentre = document.querySelector('#onglets-mobiles [data-p="centre"]'); if (ongletCentre) ongletCentre.textContent = m === "decouverte" ? "Écouter" : "Code";
  try { localStorage.setItem("sonora:mode", m); } catch (_) {}
  if (m === "decouverte") majScene(); else ed.maj && ed.maj();
}
function majScene() {
  const e = EXEMPLES.find(x => x.id === etat.exempleId), m = etat.module;
  $("scene-titre").textContent = e ? e.titre : ($("p-titre").value || "Mon programme");
  $("scene-texte").textContent = e ? e.texte : "Ton propre programme. Écoute-le, puis règle-le avec les curseurs.";
  $("scene-niveau").textContent = e ? NIVEAU_PHRASE[e.niveau] || e.niveau : "Mon programme";
  const voix = m && m.voix, effet = m && m.entrees.some(x => x.genre === "audio"), n = m ? m.reglages.length : 0;
  const ou = window.matchMedia("(max-width: 760px)").matches ? "dans l'onglet Réglages" : "à droite";
  $("scene-aide").textContent = voix ? `Puis joue des notes sur le clavier, ${ou} (ou avec les touches Q, S, D, F...).` : effet ? `C'est un effet : il transforme un son. Choisis ce qu'il reçoit dans « Source de test », ${ou}.` : n ? `Puis bouge ${n > 1 ? "les curseurs" : "le curseur"} ${ou} : le son change aussitôt.` : "Ce programme n'a pas de réglage : écoute-le, puis ouvre le programme pour le modifier.";
  majBoutonScene();
}
function majBoutonScene() { const on = !!etat.marche; $("b-scene").setAttribute("aria-pressed", String(on)); $("b-scene-t").textContent = on ? "Arrêter" : "Écouter"; $("b-scene").querySelector(".scene-icone").innerHTML = on ? "&#9632;" : "&#9654;"; }
$("b-mode").onclick = () => appliquerMode(etat.mode === "decouverte" ? "programmation" : "decouverte");
$("b-voir-code").onclick = () => { appliquerMode("programmation"); basculerPanneauMobile("centre"); ed.focus(); };
$("b-scene").onclick = async () => { if (etat.marche) await arreter(); else { await executer(); if (etat.marche && etat.module && etat.module.reglages.length && window.matchMedia("(max-width: 760px)").matches) { /* sur téléphone, les curseurs sont dans un autre onglet : on le dit, on ne bascule pas d'office */ } } majBoutonScene(); };

// ---------------------------------------------------------------- démarrage
remplirExemples(); remplirModules(); construireClavier();
const creation = installerCreation({ etat, $, journal, esc, executer, titreCourant, ed });
const lien = await creation.depuisLien();
const b = lien && lien.source ? { source: lien.source, titre: lien.titre || "Programme partagé", exemple: null, projet: null } : Projets.brouillon.lire();
if (b && b.source) { ed.valeur = b.source; $("p-titre").value = b.titre || "Sans titre"; etat.exempleId = b.exemple || null; if (b.projet) etat.projet = { id: b.projet, titre: b.titre }; }
else { ed.valeur = EXEMPLES[0].code; etat.exempleId = EXEMPLES[0].id; $("p-titre").value = EXEMPLES[0].titre; }
document.querySelectorAll(".carte-ex").forEach(x => x.setAttribute("aria-current", String(x.dataset.id === etat.exempleId)));
$("p-titre").oninput = brouillon;
verifierEnDirect(); compilerPuis(false);
journal("info", "SONORA Studio. Appuie sur Exécuter (Ctrl+Entrée) pour entendre le programme.");
if (lien && lien.source) journal("av", "Programme chargé depuis un lien de partage. Il a remplacé ton brouillon : lis-le avant de l'exécuter.");
else if (lien && lien.erreur) journal("err", esc(lien.erreur));
const d = Moteur.diagnostic(); if (!d.ok) { etat.audioIndispo = true; journal("err", esc(d.raison)); etatBadge("audio indisponible", "erreur"); $("b-executer").disabled = true; }
appliquerMode(lireMode());
majRetour();
// Téléphone, mode programmation : les trois gestes principaux (Exécuter, Arrêter, Compiler) dans une barre fixe en bas, à portée du pouce. Avant, ils étaient au bout d'une rangée qu'il fallait faire défiler (05/11/2026). La barre ne fait que déclencher les vrais boutons.
const barreS = document.createElement("div"); barreS.id = "barre-s"; barreS.className = "barre-s"; barreS.setAttribute("role", "toolbar"); barreS.setAttribute("aria-label", "Actions"); barreS.hidden = true;
barreS.innerHTML = [["b-executer", "principal"], ["b-arreter", ""], ["b-compiler", ""]].map(([id, c]) => `<button type="button" data-r="${id}"${c ? ` class="${c}"` : ""}>${$(id).textContent.trim()}</button>`).join(""); document.body.appendChild(barreS);
barreS.onclick = e => { const b = e.target.closest("button[data-r]"); if (b) { const r = $(b.dataset.r); if (r && !r.disabled) r.click(); } };
function majBarreS() { const oui = matchMedia("(max-width: 760px)").matches && document.body.dataset.mode === "programmation"; barreS.hidden = !oui; document.body.classList.toggle("avec-barre-s", oui); if (!oui) return; for (const b of barreS.children) { const r = $(b.dataset.r), t = r.textContent.trim(); if (b.textContent !== t) b.textContent = t; b.disabled = r.disabled; } }
setInterval(majBarreS, 250); addEventListener("resize", majBarreS);
window.STUDIO_PRET = true;
