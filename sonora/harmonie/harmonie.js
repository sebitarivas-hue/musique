// SONORA Harmonie : explorer les gammes et les modes, jouer les progressions, s'exercer l'oreille, composer une grille.
// Les sons sont rendus par des instruments SONORA (son.js) puis joués d'un bloc : le rythme est exact, et l'export WAV est le même son.
import * as H from "./theorie.js";
import { rendreSuite, evenementsProgression, INSTRUMENTS } from "./son.js";
import { heros, etatBouton } from "../studio/heros.js";
import { encoderWAV } from "../studio/wav.js";
import { dessinerOscillo } from "../studio/visuels.js";
import * as P from "../pistes/projet.js";
import { Stockage } from "../pistes/stockage.js";

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const SR = 44100;
const etat = { vue: "explorer", ctx: null, source: null, analyseur: null, tonique: 0, mode: "ionien", sons: 3, prog: H.PROGRESSIONS[0].id, tonP: 0, tempo: 90, style: "plaque", instrument: "piano", lecture: false, compo: [], tonC: 0, modeC: "ionien", jeu: null };
window.HARMONIE = etat;
const badge = (t, c = "") => { const e = $("etat"); e.textContent = t; e.className = "etat " + c; };
const lire = (k, d) => { try { const v = localStorage.getItem("sonora:harmonie:" + k); return v === null ? d : JSON.parse(v); } catch (_) { return d; } };
const garder = (k, v) => { try { localStorage.setItem("sonora:harmonie:" + k, JSON.stringify(v)); } catch (_) {} };

// ---------------------------------------------------------------- jouer un son rendu
function contexte() { if (!etat.ctx) { etat.ctx = new (window.AudioContext || window.webkitAudioContext)(); etat.analyseur = etat.ctx.createAnalyser(); etat.analyseur.fftSize = 2048; etat.analyseur.connect(etat.ctx.destination); } if (etat.ctx.state === "suspended") etat.ctx.resume(); return etat.ctx; }
function stop() { if (etat.source) { try { etat.source.stop(); } catch (_) {} etat.source = null; } etat.lecture = false; etat.suivi = null; document.querySelectorAll(".jouer-pseudo").forEach(b => etatBouton(b, false)); document.querySelectorAll(".carte-acc.actif").forEach(c => c.classList.remove("actif")); badge("prêt"); }
function jouerCanaux(canaux, { boucle = false, suivi = null, bouton = null } = {}) {
  stop(); const ctx = contexte(), buf = ctx.createBuffer(canaux.length, canaux[0].length, SR); canaux.forEach((c, i) => buf.copyToChannel(c, i));
  const s = ctx.createBufferSource(); s.buffer = buf; s.loop = boucle; s.connect(etat.analyseur); const t0 = ctx.currentTime + 0.03; s.start(t0);
  s.onended = () => { if (etat.source === s) stop(); };
  etat.source = s; etat.lecture = true; etat.suivi = suivi ? { ...suivi, t0, duree: buf.duration } : null; if (bouton) etatBouton(bouton, true); badge("en écoute", "marche");
  etat.dernierRendu = { duree: buf.duration, canaux: canaux.length };
}
const jouerNotes = (notes, { arpege = false, duree = 1.6 } = {}) => jouerCanaux(rendreSuite(arpege ? notes.map((m, i) => ({ t: i * 0.32, duree: 0.3, notes: [m] })) : [{ t: 0, duree, notes }], { instrument: etat.instrument }));
function boucle() {
  requestAnimationFrame(boucle);
  const cv = document.querySelector(".vue-h:not([hidden]) .scene-onde"); if (cv) { let x = null; if (etat.lecture && etat.analyseur) { x = new Float32Array(etat.analyseur.fftSize); etat.analyseur.getFloatTimeDomainData(x); } dessinerOscillo(cv, x); }
  if (etat.suivi && etat.ctx) { const t = (etat.ctx.currentTime - etat.suivi.t0) % etat.suivi.duree, i = Math.max(0, Math.floor(t / etat.suivi.mesure)); if (i !== etat.suivi.i) { etat.suivi.i = i; document.querySelectorAll(etat.suivi.selecteur).forEach((c, k) => c.classList.toggle("actif", k === i)); etat.accordCourant = i; } }
}

// ---------------------------------------------------------------- explorer
const optionsToniques = (sel) => H.TONIQUES.map((t, i) => `<option value="${i}"${i === sel ? " selected" : ""}>${t.nom}</option>`).join("");
const optionsModes = (sel, heptaSeul) => { const fam = {}; for (const [k, m] of Object.entries(H.MODES)) if (!heptaSeul || m.pas.length === 7) (fam[m.famille] ||= []).push([k, m]); return Object.entries(fam).map(([f, l]) => `<optgroup label="${esc(f)}">${l.map(([k, m]) => `<option value="${k}"${k === sel ? " selected" : ""}>${esc(m.nom)}</option>`).join("")}</optgroup>`).join(""); };
const optionsInstr = sel => Object.entries(INSTRUMENTS).map(([k, i]) => `<option value="${k}"${k === sel ? " selected" : ""}>${esc(i.nom)}</option>`).join("");
const NOMS_CLAVIER = ["do", "do♯", "ré", "mi♭", "mi", "fa", "fa♯", "sol", "la♭", "la", "si♭", "si"];
function clavierHtml(g) {
  const dans = new Map(g.map(n => [n.midi, n.nom])), blancs = [], noirs = [];
  for (let m = 60; m < 84; m++) { const noire = [1, 3, 6, 8, 10].includes(m % 12), nom = dans.get(m) || dans.get(m - 12) && null, est = dans.has(m) || dans.has(m - 12) || dans.has(m + 12), etiquette = dans.get(m) || dans.get(m - 12) || (noire ? "" : NOMS_CLAVIER[m % 12]), cls = (est ? " dans" : "") + ((m - g[0].midi) % 12 === 0 ? " tonique" : "");
    (noire ? noirs : blancs).push({ m, html: `class="${noire ? "no" : "bl"}${cls}" data-midi="${m}" role="button" tabindex="0" aria-label="${esc(etiquette || NOMS_CLAVIER[m % 12])}${est ? ", dans la gamme" : ""}"`, etiquette: est ? etiquette : (noire ? "" : NOMS_CLAVIER[m % 12]) }); }
  const w = 100 / blancs.length; let i = 0; const pos = new Map(); blancs.forEach((b, k) => pos.set(b.m, k));
  return `<div class="clavier-h" id="clavier-h">${blancs.map(b => `<div ${b.html}>${esc(b.etiquette)}</div>`).join("")}${noirs.map(n => `<div ${n.html} style="left:calc(${(pos.get(n.m - 1) + 1) * w}% - 2.1%)">${esc(n.etiquette)}</div>`).join("")}</div>`;
}
function vueExplorer() {
  const t = H.TONIQUES[etat.tonique], m = H.MODES[etat.mode], g = H.gamme(t, etat.mode, 4), hepta = g.length === 7;
  $("v-explorer").innerHTML = heros({ etiquette: "Explorer", titre: `${t.nom} ${m.nom.toLowerCase()}`, texte: g.map(n => n.nom).join("  "), bouton: "b-gamme", libelle: "Écouter la gamme", aide: "Puis touche les notes du clavier, ou un accord plus bas." })
    + `<div class="rang-h"><label>Tonique<select id="ex-ton">${optionsToniques(etat.tonique)}</select></label><label>Mode ou gamme<select id="ex-mode">${optionsModes(etat.mode)}</select></label><label>Instrument<select id="ex-instr">${optionsInstr(etat.instrument)}</select></label>${hepta ? `<label>Accords<select id="ex-sons"><option value="3"${etat.sons === 3 ? " selected" : ""}>à trois sons</option><option value="4"${etat.sons === 4 ? " selected" : ""}>de septième</option></select></label>` : ""}</div>
    <p class="texte-mode" id="texte-mode">${esc(m.texte)}</p>${clavierHtml(g)}`
    + (hepta ? `<h2>Les accords de la gamme</h2><div class="accords" id="acc-ex">${g.map((_, d) => { const a = H.accordDegre(H.gamme(t, etat.mode, 3), d, etat.sons); return `<button type="button" class="carte-acc" data-d="${d}"><span class="rom">${esc(a.romain)}</span><span class="nm">${esc(a.nom)}</span><span class="ql">${esc(a.qualite)}</span></button>`; }).join("")}</div>`
      : `<p class="petit">Cette échelle n'a pas sept notes : on n'y bâtit pas d'accords degré par degré. Écoute-la, et compare-la avec les modes.</p>`);
  $("b-gamme").dataset.libelle = "Écouter la gamme"; $("b-gamme").onclick = () => etat.lecture ? stop() : jouerCanaux(rendreSuite([...g, { midi: g[0].midi + 12 }].map((n, i) => ({ t: i * 0.3, duree: 0.28, notes: [n.midi] })), { instrument: etat.instrument }), { bouton: $("b-gamme") });
  $("ex-ton").onchange = e => { etat.tonique = +e.target.value; garder("tonique", etat.tonique); vueExplorer(); };
  $("ex-mode").onchange = e => { etat.mode = e.target.value; garder("mode", etat.mode); vueExplorer(); };
  $("ex-instr").onchange = e => { etat.instrument = e.target.value; garder("instrument", etat.instrument); };
  if ($("ex-sons")) $("ex-sons").onchange = e => { etat.sons = +e.target.value; vueExplorer(); };
  $("clavier-h").querySelectorAll("[data-midi]").forEach(k => { const j = () => { jouerNotes([+k.dataset.midi], { duree: 0.9 }); k.classList.add("joue"); setTimeout(() => k.classList.remove("joue"), 250); }; k.onclick = j; k.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); j(); } }; });
  document.querySelectorAll("#acc-ex .carte-acc").forEach(c => c.onclick = () => { const a = H.accordDegre(H.gamme(t, etat.mode, 3), +c.dataset.d, etat.sons), v = H.voicing([a])[0]; jouerNotes([v.basse, ...v.voix]); document.querySelectorAll("#acc-ex .carte-acc").forEach(x => x.classList.toggle("actif", x === c)); etat.dernierAccord = a; });
}

// ---------------------------------------------------------------- progressions
function rendreProgression(prog, t) { const acc = H.accordsProgression(prog, t), v = H.voicing(acc), r = evenementsProgression(v, { tempo: etat.tempo, style: etat.style }); return { acc, r, canaux: rendreSuite(r.evenements, { instrument: etat.instrument, duree: r.duree, boucle: true }) }; }
function vueProgressions() {
  const prog = H.PROGRESSIONS.find(p => p.id === etat.prog), t = H.TONIQUES[etat.tonP], acc = H.accordsProgression(prog, t);
  const fams = [...new Set(H.PROGRESSIONS.map(p => p.famille))];
  $("v-progressions").innerHTML = heros({ etiquette: prog.famille, titre: prog.nom, texte: prog.texte, bouton: "b-prog", libelle: "Écouter en boucle", aide: "Les accords s'allument au fil de la musique. Change la tonalité, le tempo ou le style : tout est recalculé." })
    + `<div class="accords" id="acc-prog">${acc.map(a => `<div class="carte-acc"><span class="rom">${esc(a.romain)}</span><span class="nm">${esc(a.nom)}</span><span class="ql">${esc(a.qualite)}</span></div>`).join("")}</div>
    <div class="rang-h"><label>Tonalité<select id="pr-ton">${optionsToniques(etat.tonP)}</select></label><label>Tempo<input type="number" id="pr-tempo" min="40" max="200" value="${etat.tempo}"></label>
    <label>Style<select id="pr-style">${[["plaque", "Accords plaqués"], ["arpege", "Arpèges"], ["pop", "Pop (basse et accords)"], ["valse", "Valse (trois temps)"]].map(([k, n]) => `<option value="${k}"${k === etat.style ? " selected" : ""}>${n}</option>`).join("")}</select></label>
    <label>Instrument<select id="pr-instr">${optionsInstr(etat.instrument)}</select></label><button type="button" id="b-pr-wav">Exporter en WAV</button><button type="button" id="b-pr-pistes">Ajouter à mes Pistes</button></div><p class="petit" id="msg-prog" role="status"></p>
    <h2>Toutes les progressions</h2><div class="liste-prog">${fams.map(f => `<p class="fam">${esc(f)}</p>${H.PROGRESSIONS.filter(p => p.famille === f).map(p => `<button type="button" data-prog="${p.id}" aria-pressed="${p.id === etat.prog}"><b>${esc(p.nom)}</b><br><span class="petit">${esc(H.accordsProgression(p, H.TONIQUES[0]).map(a => a.romain).join(", "))}</span></button>`).join("")}`).join("")}</div>`;
  $("b-prog").dataset.libelle = "Écouter en boucle";
  $("b-prog").onclick = () => { if (etat.lecture) return stop(); const x = rendreProgression(prog, t); jouerCanaux(x.canaux, { boucle: true, bouton: $("b-prog"), suivi: { mesure: x.r.mesure, selecteur: "#acc-prog .carte-acc", i: -1 } }); };
  const relancer = () => { const jouait = etat.lecture; vueProgressions(); if (jouait) $("b-prog").click(); };
  $("pr-ton").onchange = e => { etat.tonP = +e.target.value; relancer(); }; $("pr-tempo").onchange = e => { etat.tempo = Math.max(40, Math.min(200, +e.target.value || 90)); relancer(); };
  $("pr-style").onchange = e => { etat.style = e.target.value; relancer(); }; $("pr-instr").onchange = e => { etat.instrument = e.target.value; garder("instrument", etat.instrument); relancer(); };
  document.querySelectorAll("[data-prog]").forEach(b => b.onclick = () => { stop(); etat.prog = b.dataset.prog; vueProgressions(); window.scrollTo(0, 0); });
  $("b-pr-wav").onclick = () => { const x = rendreProgression(prog, t); telecharger(x.canaux, `${prog.id}-${t.nom}`); $("msg-prog").textContent = `WAV exporté : ${x.acc.length} mesures, ${x.r.duree.toFixed(1).replace(".", ",")} s.`; };
  $("b-pr-pistes").onclick = () => versPistes(rendreProgression(prog, t).canaux, `${prog.nom} en ${t.nom}`, $("msg-prog"));
}
function telecharger(canaux, nom) { const w = encoderWAV(canaux, SR, 16), a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([w.octets], { type: "audio/wav" })); a.download = nom.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9_-]+/g, "-") + ".wav"; document.body.appendChild(a); a.click(); a.remove(); etat.dernierExport = { octets: w.octets.length, duree: canaux[0].length / SR }; }
async function versPistes(canaux, nom, zone) {
  try {
    let p = null; try { const lu = await Stockage.lireProjet(); if (lu) p = P.verifierProjet(lu); } catch (_) { p = null; }
    p = p || P.nouveauProjet(); const id = P.ajouterSon(p, { nom, duree: canaux[0].length / SR, sr: SR, canaux: canaux.length }); await Stockage.ecrireSon(id, { canaux, sr: SR });
    const debut = P.dureeTotale(p), piste = P.pisteLibre(p, p.pistes[0].id, debut, canaux[0].length / SR); P.placerClip(p, piste, id, debut); await Stockage.ecrireProjet(p);
    zone.innerHTML = `Ajouté à tes Pistes, à ${debut.toFixed(1).replace(".", ",")} s. <a href="../pistes/index.html">Ouvrir les Pistes</a>`; etat.versPistes = { id, debut };
  } catch (e) { zone.textContent = "Impossible d'ajouter aux Pistes : " + e.message; }
}

// ---------------------------------------------------------------- jeu d'oreille
const JEUX = { accord: { titre: "Quel accord ?", texte: "Écoute l'accord, puis dis sa couleur.", niveaux: ["Majeur ou mineur", "Avec diminué et augmenté", "Avec les septièmes"] }, cadence: { titre: "Quelle cadence ?", texte: "Trois accords : comment la phrase finit-elle ?" }, mode: { titre: "Quel mode ?", texte: "Une gamme montante sur do : laquelle est-ce ?", niveaux: ["Majeur, mineur, dorien", "Les six modes usuels"] } };
const LIBELLES = { "cadence-parfaite": "Parfaite (V, I)", "cadence-plagale": "Plagale (IV, I)", "demi-cadence": "Demi-cadence (sur V)", "cadence-rompue": "Rompue (V, vi)" };
const libelle = (g, x) => g === "cadence" ? LIBELLES[x] : g === "mode" ? H.MODES[x].nom : x;
function vueJeu() {
  const j = etat.jeu;
  if (!j) {
    $("v-jeu").innerHTML = `<h1 class="titre-h">Jeu d'oreille</h1><p class="petit">Dix questions par partie. Tu peux réécouter autant que tu veux. Ton meilleur score reste dans ce navigateur.</p><div class="liste-prog">${Object.entries(JEUX).map(([k, x]) => (x.niveaux || [null]).map((n, i) => `<button type="button" data-jeu="${k}" data-niv="${i}"><b>${esc(x.titre)}</b><br><span class="petit">${esc(n || x.texte)}</span><br><span class="petit">Meilleur score : ${lire(`record:${k}:${i}`, 0)} sur 10</span></button>`).join("")).join("")}</div>`;
    document.querySelectorAll("[data-jeu]").forEach(b => b.onclick = () => { etat.jeu = { genre: b.dataset.jeu, niveau: +b.dataset.niv, n: 0, score: 0, serie: 0, question: null, repondu: false }; nouvelleQuestion(); vueJeu(); jouerQuestion(); });
    return;
  }
  const q = j.question, fin = j.n >= 10 && j.repondu;
  $("v-jeu").innerHTML = `<div class="jeu-zone"><p class="scene-etiq" style="display:inline-block">${esc(JEUX[j.genre].titre)}</p><p class="score" id="score">Question ${Math.min(j.n, 10)} sur 10, score ${j.score}${j.serie > 1 ? `, ${j.serie} justes de suite` : ""}</p>
    <button type="button" id="b-jeu-ecoute" class="scene-jouer jouer-pseudo" aria-pressed="false">Écouter</button><canvas class="scene-onde" style="margin:10px auto"></canvas>
    <div class="choix-jeu" id="choix-jeu">${q.choix.map(c => `<button type="button" data-rep="${esc(c)}">${esc(libelle(q.genre, c))}</button>`).join("")}</div>
    <p class="retour-jeu" id="retour-jeu" role="status" aria-live="polite"></p>
    <div class="choix-jeu">${j.repondu && !fin ? `<button type="button" id="b-suivante" class="principal">Question suivante</button>` : ""}${fin ? `<button type="button" id="b-rejouer" class="principal">Rejouer</button>` : ""}<button type="button" id="b-quitter">Changer de jeu</button></div></div>`;
  $("b-jeu-ecoute").onclick = () => etat.lecture ? stop() : jouerQuestion();
  document.querySelectorAll("#choix-jeu [data-rep]").forEach(b => b.onclick = () => repondre(b.dataset.rep));
  if ($("b-suivante")) $("b-suivante").onclick = () => { nouvelleQuestion(); vueJeu(); jouerQuestion(); };
  if ($("b-rejouer")) $("b-rejouer").onclick = () => { etat.jeu = { ...j, n: 0, score: 0, serie: 0, repondu: false }; nouvelleQuestion(); vueJeu(); jouerQuestion(); };
  $("b-quitter").onclick = () => { stop(); etat.jeu = null; vueJeu(); };
  if (j.repondu) { marquer(); $("retour-jeu").textContent = j.retour; }
}
function nouvelleQuestion() { const j = etat.jeu; j.n++; j.repondu = false; j.question = j.genre === "accord" ? H.questionAccord(j.niveau) : j.genre === "cadence" ? H.questionCadence() : H.questionMode(j.niveau); }
function jouerQuestion() {
  const q = etat.jeu.question;
  if (q.genre === "accord") jouerNotes(q.notes, { duree: 1.8 });
  else if (q.genre === "mode") jouerCanaux(rendreSuite(q.notes.map((m, i) => ({ t: i * 0.33, duree: 0.31, notes: [m] })), { instrument: etat.instrument }));
  else { const v = H.voicing(q.accords), r = evenementsProgression(v, { tempo: 100, style: "plaque" }); jouerCanaux(rendreSuite(r.evenements, { instrument: etat.instrument })); }
  const b = $("b-jeu-ecoute"); if (b) etatBouton(b, true);
}
const EXPLIC = { majeur: "tierce majeure puis tierce mineure", mineur: "tierce mineure puis tierce majeure", "diminué": "deux tierces mineures", "augmenté": "deux tierces majeures", "septième de dominante": "accord majeur et septième mineure", "majeur septième": "accord majeur et septième majeure", "mineur septième": "accord mineur et septième mineure" };
function repondre(rep) {
  const j = etat.jeu; if (j.repondu) return; const q = j.question, juste = rep === q.bonne; j.repondu = true; j.reponse = rep;
  if (juste) { j.score++; j.serie++; } else j.serie = 0;
  j.retour = (juste ? "Juste. " : `Non : c'était ${libelle(q.genre, q.bonne)}. `) + (q.genre === "accord" ? `Un accord ${q.bonne} : ${EXPLIC[q.bonne]}.` : q.genre === "cadence" ? `En ${q.tonique} : ${q.accords.map(a => a.nom).join(", ")}.` : H.MODES[q.bonne].texte);
  if (j.n >= 10) { const k = `record:${j.genre}:${j.niveau}`; if (j.score > lire(k, 0)) garder(k, j.score); j.retour += ` Partie finie : ${j.score} sur 10.`; }
  etat.journalJeu = (etat.journalJeu || []).concat([{ bonne: q.bonne, rep, juste }]); vueJeu();
}
function marquer() { const j = etat.jeu; document.querySelectorAll("#choix-jeu [data-rep]").forEach(b => { b.disabled = true; if (b.dataset.rep === j.question.bonne) b.classList.add("juste"); else if (b.dataset.rep === j.reponse) b.classList.add("faux"); }); }

// ---------------------------------------------------------------- composer
function vueComposer() {
  const t = H.TONIQUES[etat.tonC], g3 = H.gamme(t, etat.modeC, 3), choix = g3.map((_, d) => H.accordDegre(g3, d, etat.sons)), seq = etat.compo.map(d => choix[d]);
  $("v-composer").innerHTML = heros({ etiquette: "Composer", titre: seq.length ? seq.map(a => a.romain).join(" ") : "Ta grille", texte: seq.length ? seq.map(a => a.nom).join(", ") : "Touche les accords ci-dessous pour construire ta grille, mesure par mesure (16 au plus).", bouton: "b-compo", libelle: "Écouter en boucle" })
    + `<div class="rang-h"><label>Tonalité<select id="co-ton">${optionsToniques(etat.tonC)}</select></label><label>Mode<select id="co-mode">${optionsModes(etat.modeC, true)}</select></label><label>Accords<select id="co-sons"><option value="3"${etat.sons === 3 ? " selected" : ""}>à trois sons</option><option value="4"${etat.sons === 4 ? " selected" : ""}>de septième</option></select></label></div>
    <div class="accords" id="acc-choix">${choix.map((a, d) => `<button type="button" class="carte-acc" data-d="${d}"><span class="rom">${esc(a.romain)}</span><span class="nm">${esc(a.nom)}</span><span class="ql">${esc(a.qualite)}</span></button>`).join("")}</div>
    <h2>Ma grille</h2><div class="compo" id="compo" aria-live="polite">${seq.map(a => `<div class="carte-acc"><span class="rom">${esc(a.romain)}</span><span class="nm">${esc(a.nom)}</span></div>`).join("") || `<span class="petit">Vide pour l'instant.</span>`}</div>
    <div class="rang-h"><button type="button" id="b-retirer">Retirer le dernier</button><button type="button" id="b-vider">Tout effacer</button><button type="button" id="b-co-wav">Exporter en WAV</button><button type="button" id="b-co-pistes">Ajouter à mes Pistes</button></div><p class="petit" id="msg-compo" role="status"></p>`;
  const rendu = () => { const v = H.voicing(seq), r = evenementsProgression(v, { tempo: etat.tempo, style: etat.style }); return { r, canaux: rendreSuite(r.evenements, { instrument: etat.instrument, duree: r.duree, boucle: true }) }; };
  $("b-compo").dataset.libelle = "Écouter en boucle";
  $("b-compo").onclick = () => { if (etat.lecture) return stop(); if (!seq.length) { $("msg-compo").textContent = "Ajoute d'abord des accords."; return; } const x = rendu(); jouerCanaux(x.canaux, { boucle: true, bouton: $("b-compo"), suivi: { mesure: x.r.mesure, selecteur: "#compo .carte-acc", i: -1 } }); };
  document.querySelectorAll("#acc-choix .carte-acc").forEach(c => c.onclick = () => { if (etat.compo.length >= 16) return; etat.compo.push(+c.dataset.d); garder("compo", etat.compo); const a = choix[+c.dataset.d], v = H.voicing([a])[0]; jouerNotes([v.basse, ...v.voix], { duree: 1 }); vueComposer(); });
  $("co-ton").onchange = e => { etat.tonC = +e.target.value; vueComposer(); }; $("co-mode").onchange = e => { etat.modeC = e.target.value; vueComposer(); }; $("co-sons").onchange = e => { etat.sons = +e.target.value; vueComposer(); };
  $("b-retirer").onclick = () => { etat.compo.pop(); garder("compo", etat.compo); stop(); vueComposer(); }; $("b-vider").onclick = () => { etat.compo = []; garder("compo", etat.compo); stop(); vueComposer(); };
  $("b-co-wav").onclick = () => { if (!seq.length) return; const x = rendu(); telecharger(x.canaux, "ma-grille-" + t.nom); $("msg-compo").textContent = `WAV exporté : ${seq.length} mesures.`; };
  $("b-co-pistes").onclick = () => { if (!seq.length) return; versPistes(rendu().canaux, "Ma grille en " + t.nom, $("msg-compo")); };
}

// ---------------------------------------------------------------- onglets et démarrage
const VUES = { explorer: vueExplorer, progressions: vueProgressions, jeu: vueJeu, composer: vueComposer };
function vue(v) { stop(); etat.vue = v; for (const k of Object.keys(VUES)) $("v-" + k).hidden = k !== v; document.querySelectorAll("#onglets button").forEach(b => b.setAttribute("aria-selected", String(b.dataset.v === v))); VUES[v](); history.replaceState(null, "", "#" + v); }
document.querySelectorAll("#onglets button").forEach(b => b.onclick = () => vue(b.dataset.v));
document.addEventListener("visibilitychange", () => { if (document.hidden) stop(); });
etat.tonique = lire("tonique", 0); etat.mode = H.MODES[lire("mode", "ionien")] ? lire("mode", "ionien") : "ionien"; etat.instrument = INSTRUMENTS[lire("instrument", "piano")] ? lire("instrument", "piano") : "piano"; etat.compo = (lire("compo", []) || []).filter(d => Number.isInteger(d) && d >= 0 && d < 7).slice(0, 16);
vue(VUES[location.hash.slice(1)] ? location.hash.slice(1) : "explorer"); requestAnimationFrame(boucle);
window.HARMONIE_PRET = true;
