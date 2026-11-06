// SONORA Science : fiches d'expériences. Le programme de chaque fiche est du SONORA ; l'écoute passe par le moteur (AudioWorklet),
// la mesure par le même noyau rendu hors ligne ; tous les chiffres affichés sont calculés sur ces signaux.
import { Moteur, ErreurMoteur } from "../src/moteur.js?v=60187a4d33";
import { formater, vers, depuis } from "../studio/reglages-commun.js?v=60187a4d33";
import { dessinerOscillo, dessinerSpectre } from "../studio/visuels.js?v=60187a4d33";
import { EXPERIENCES, parId, fmt, SR } from "./experiences.js?v=60187a4d33";
import { EXEMPLES } from "../studio/exemples.js?v=60187a4d33";
import { preparer, valeursDefaut, mesurer, mesurerLibre, rendreCanaux } from "./executeur.js?v=60187a4d33";
import { dessinerSignal, dessinerSpectreStatique, dessinerSpectrogramme, dessinerCourbe, dessinerEscalier } from "./visus.js?v=60187a4d33";
import { Escalier } from "./psychophysique.js?v=60187a4d33";
import { heros, etatBouton } from "../studio/heros.js?v=60187a4d33";
import * as A from "./analyse.js?v=60187a4d33";
import { TIMBRES, programmeTimbre, INTERVALLES, SYSTEMES, NOMS_ATLAS, tirerVariantes, ordreJuste, noteDe } from "./microtonalite.js?v=60187a4d33";

const $ = id => document.getElementById(id);
const points = (...a) => window.COURS_POINTS ? window.COURS_POINTS.gagner(...a) : (window.__pointsEnAttente = window.__pointsEnAttente || []).push(a); // points du cours (sonora/barre-cours.js)
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const etat = { exp: null, module: null, valeurs: {}, moteur: null, marche: false, tampon: null, sr: 44100, controles: {} };
window.SCIENCE = etat;
const badge = (t, c = "") => { const e = $("etat"); e.textContent = t; e.className = "etat " + c; };
const modules = {};
const moduleDe = exp => (modules[exp.id] ||= preparer(exp.programme));
const moduleTimbre = id => (modules["timbre:" + id] ||= preparer(programmeTimbre(id)));
const optionsTimbres = (sel = "orgue") => Object.entries(TIMBRES).map(([id, t]) => `<option value="${id}"${id === sel ? " selected" : ""}>${esc(t.nom)}</option>`).join("");

// ---------------------------------------------------------------- navigation
function remplirListe() {
  const z = $("nav-exp"); z.innerHTML = "";
  for (const dom of ["Acoustique", "Psychoacoustique", "Analyse"]) {
    const g = document.createElement("div"); g.innerHTML = `<div class="groupe-nav">${dom}</div><ul></ul>`; const ul = g.querySelector("ul");
    for (const e of EXPERIENCES.filter(x => x.domaine === dom)) { const li = document.createElement("li"); li.innerHTML = `<button type="button" data-id="${e.id}">${esc(e.titre)}${e.type === "auditeur" ? '<span class="tag">à l\'écoute</span>' : ""}</button>`; li.querySelector("button").onclick = () => { location.hash = "#" + e.id; }; ul.appendChild(li); }
    z.appendChild(g);
  }
  $("avis-limites").textContent = "Couvert : un générateur de sons purs, fréquence, période, amplitude, phase, interférences, battements, harmoniques, résonance, propagation, réflexion, consonance, localisation, une illusion, deux mesures à l'écoute, un analyseur. Pas encore couvert : diffraction, absorption, bandes critiques, courbes d'égale sonie.";
}
function basculerPanneau(p) { $("sciences").dataset.actif = p; document.querySelectorAll("#onglets-mobiles button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.p === p))); }
document.querySelectorAll("#onglets-mobiles button").forEach(b => b.onclick = () => basculerPanneau(b.dataset.p));

// ---------------------------------------------------------------- contrôles générés depuis les réglages du programme
function construireControles(zone, module, onChange, seulement) {
  zone.innerHTML = ""; etat.controles = {};
  for (const r of module.reglages) {
    if (seulement && !seulement.includes(r.nom)) continue;
    const v0 = etat.valeurs[r.nom] !== undefined ? etat.valeurs[r.nom] : r.defaut; etat.valeurs[r.nom] = v0;
    const div = document.createElement("div"); div.className = "reglage"; const id = "x-" + r.nom;
    div.innerHTML = `<label for="${id}"><span>${esc(r.etiquette)}</span><output id="${id}-v" for="${id}">${esc(formater(v0, r))}</output></label>`;
    let ctl;
    if (r.choix) { ctl = document.createElement("select"); r.choix.forEach((c, i) => { const o = document.createElement("option"); o.value = i; o.textContent = c; ctl.appendChild(o); }); ctl.value = Math.round(v0); ctl.onchange = () => sortie(+ctl.value); }
    else if (r.booleen) { ctl = document.createElement("input"); ctl.type = "checkbox"; ctl.checked = !!v0; ctl.onchange = () => sortie(ctl.checked ? 1 : 0); }
    else if (r.min !== null) { ctl = document.createElement("input"); ctl.type = "range"; ctl.min = 0; ctl.max = 1000; ctl.step = 1; ctl.value = Math.round(depuis(v0, r) * 1000); ctl.oninput = () => sortie(vers(ctl.value / 1000, r)); ctl.setAttribute("aria-valuetext", formater(v0, r)); }
    else { ctl = document.createElement("input"); ctl.type = "number"; ctl.value = v0; ctl.step = "any"; ctl.oninput = () => { if (ctl.value !== "") sortie(+ctl.value); }; }
    ctl.id = id; ctl.dataset.reglage = r.nom; div.appendChild(ctl);
    function sortie(v) { etat.valeurs[r.nom] = v; $(id + "-v").textContent = formater(v, r); if (ctl.type === "range") ctl.setAttribute("aria-valuetext", formater(v, r)); if (etat.marche && etat.moteur) etat.moteur.regler(r.nom, v); onChange && onChange(r.nom, v); }
    etat.controles[r.nom] = { ctl, r, mettre(v) { etat.valeurs[r.nom] = v; $(id + "-v").textContent = formater(v, r); if (ctl.type === "range") ctl.value = Math.round(depuis(v, r) * 1000); else if (ctl.type === "checkbox") ctl.checked = !!v; else ctl.value = r.choix ? Math.round(v) : v; } };
    zone.appendChild(div);
  }
}

// ---------------------------------------------------------------- écoute en direct
async function demarrerMoteur() {
  if (etat.moteur) { await etat.moteur.demarrer(); return etat.moteur; }
  const d = Moteur.diagnostic(); if (!d.ok) throw new ErreurMoteur(d.code, d.raison);
  etat.moteur = new Moteur().on("analyse", a => { etat.tampon = a.tampon; etat.sr = a.sampleRate; }).on("erreur", e => badge("erreur moteur : " + e.message, "erreur"));
  await etat.moteur.demarrer(); etat.moteur.activerAnalyse(true); return etat.moteur;
}
async function ecouter(module, { accord } = {}) {
  try {
    const m = await demarrerMoteur(); await m.charger(module); for (const [n, v] of Object.entries(etat.valeurs)) m.regler(n, v);
    etat.marche = true; etat.ecouteDebut = performance.now(); badge("en écoute", "marche"); if ($("b-ecouter")) etatBouton($("b-ecouter"), true);
    if (module.voix && etat.exp && etat.exp.cycle) {  // une note qui s'enfonce puis se relève, en boucle : on entend les quatre étapes de l'enveloppe à chaque tour
      const { tenue, pause } = etat.exp.cycle; let on = false; clearTimeout(etat.cycleT);
      const bascule = () => { if (!etat.marche) return; on = !on; if (on) m.noteOn(1, 220, 0.9); else m.noteOff(1); etat.cycleT = setTimeout(bascule, (on ? tenue : pause) * 1000); }; bascule();
    } else if (module.voix) { m.accord(accord || [[48, 220, 0.8], [49, 277.18, 0.8], [50, 329.63, 0.8]]); }
  } catch (e) { badge("erreur", "erreur"); const z = $("msg-exp"); if (z) z.textContent = e instanceof ErreurMoteur ? e.message : String(e && e.message || e); }
}
// Temps d'écoute sans interruption de l'expérience ouverte (en secondes) : la plus longue écoute, ou celle en cours.
const ecouteDe = id => Math.max((etat.ecoutes || {})[id] || 0, etat.marche && etat.ecouteDebut && etat.exp && etat.exp.id === id ? (performance.now() - etat.ecouteDebut) / 1000 : 0);
async function arreterEcoute() { clearTimeout(etat.cycleT); if (etat.marche && etat.ecouteDebut && etat.exp) { etat.ecoutes = etat.ecoutes || {}; etat.ecoutes[etat.exp.id] = ecouteDe(etat.exp.id); } etat.ecouteDebut = 0; if (etat.arretGen) { etat.arretGen(); etat.arretGen = null; } if (!etat.moteur || !etat.marche) return; etat.marche = false; await etat.moteur.arreter(); badge("prêt"); if ($("b-ecouter")) etatBouton($("b-ecouter"), false); }
let dernier = 0;
(function boucle(t) { requestAnimationFrame(boucle); if (t - dernier < 33) return; dernier = t; const o = $("live-oscillo"), s = $("live-spectre"); if (!o || !s) return; const x = etat.marche ? etat.tampon : null; dessinerOscillo(o, x); dessinerSpectre(s, x, etat.sr); const h = $("heros-onde"); if (h) dessinerOscillo(h, x); })(0);

// ---------------------------------------------------------------- fiche d'une expérience
const ligneHTML = l => {
  const dig = l.d ?? 2, v = x => fmt(x, dig);
  const verdict = l.info && l.ok === undefined ? '<span class="verdict info">à lire</span>' : l.ok === undefined ? '<span class="verdict info">-</span>' : l.ok ? '<span class="verdict ok">confirmé</span>' : '<span class="verdict non">écart</span>';
  return `<tr><td>${esc(l.nom)}</td><td class="n">${v(l.mesure)}${l.unite ? " " + esc(l.unite) : ""}</td><td class="n">${l.theorie === null || l.theorie === undefined ? (l.attendu ? esc(l.attendu) : "") : v(l.theorie) + (l.unite ? " " + esc(l.unite) : "")}</td><td class="n">${l.ecart !== undefined ? (l.ecart >= 0 ? "+" : "") + v(l.ecart) : ""}</td><td>${verdict}</td></tr>`;
};
function tableau(res) {
  const verdicts = res.lignes.filter(l => l.ok !== undefined), bons = verdicts.filter(l => l.ok).length;
  return `<table class="mesures"><thead><tr><th>Grandeur</th><th>Mesure sur le signal</th><th>Théorie</th><th>Écart</th><th>Verdict</th></tr></thead><tbody>${res.lignes.map(ligneHTML).join("")}</tbody></table>` +
    (verdicts.length ? `<p class="bilan ${bons === verdicts.length ? "ok" : "non"}" id="bilan">${bons} mesure${bons > 1 ? "s" : ""} sur ${verdicts.length} confirme${bons > 1 ? "nt" : ""} la théorie${bons < verdicts.length ? " : regarde les écarts" : ""}.</p>` : "");
}
const FIGURES = { oscillo: ["fig-oscillo", "Signal dans le temps (30 ms)"], spectre: ["fig-spectre", "Spectre d'amplitude"], spectrogramme: ["fig-spectro", "Spectrogramme : le contenu en fréquence au fil du temps"], enveloppe: ["fig-env", "Enveloppe : niveau efficace par tranches de 5 ms"], welch: ["fig-welch", "Spectre moyen du bruit (en dB)"] };
function dessinerVues(res) {
  const c = res.canaux, sr = SR; for (const v of res.vues || []) { const cv = $(FIGURES[v][0]); if (!cv) continue;
    if (v === "oscillo") dessinerSignal(cv, c, sr, { duree: 0.03, debut: Math.min(0.5, (c[0].length / sr) / 3) });
    else if (v === "spectre") dessinerSpectreStatique(cv, c[0], sr, { debut: Math.min(0.5, (c[0].length / sr) / 3) });
    else if (v === "spectrogramme") dessinerSpectrogramme(cv, res.serie.sp, { fmax: 4000 });
    else if (v === "enveloppe") { const e = res.serie.env, fe = res.serie.fe; dessinerCourbe(cv, Array.from(e, (_, i) => i / fe), Array.from(e), { xmin: 0, xmax: e.length / fe, ymin: 0, ymax: Math.max(...e) * 1.1, etiquetteX: "temps (s)", etiquetteY: "niveau efficace" }); }
    else if (v === "welch") { const sp = res.serie.sp, xs = [], ys = []; for (let k = 2; k < sp.db.length; k++) { xs.push(k * sp.bin); ys.push(sp.db[k]); } const top = Math.max(...ys), mod = res.serie.modele; const c0 = res.lignes[0].theorie;
      dessinerCourbe(cv, xs, ys, { logx: true, xmin: Math.max(50, c0 * 0.15), xmax: Math.min(sr / 2, c0 * 6), ymin: top - 50, ymax: top + 3, etiquetteX: "fréquence (Hz)", etiquetteY: "dB", reperes: mod ? [{ x: mod.f0, t: `f0 = ${fmt(mod.f0, 0)} Hz` }] : [], modele: mod ? xs.map(f => [f, 10 * Math.log10(A.reponseBandePassante(f, mod.f0, mod.q, sr) + 1e-12) + (ys.reduce((a, b) => a + b, 0) / ys.length - ys.reduce((a, b, i) => a + 10 * Math.log10(A.reponseBandePassante(xs[i], mod.f0, mod.q, sr) + 1e-12), 0) / ys.length)]) : null }); }
  }
}
function ouvrirDansStudio(exp, programme) {
  try { localStorage.setItem("sonora:brouillon", JSON.stringify({ source: programme, titre: exp.titre, exemple: null, projet: null })); } catch (_) {}
  try { localStorage.setItem("sonora:mode", "programmation"); } catch (_) {} location.href = "../studio/index.html";
}
const bloc = (titre, html, cls = "") => `<section class="${cls}"><h2>${titre}</h2>${html}</section>`;
function entete(exp) { return `<span class="etiq-domaine">${esc(exp.domaine)}</span><h1>${esc(exp.titre)}</h1>` + bloc("La question", `<p class="question">${esc(exp.question)}</p>`) + bloc("L'idée", exp.explication.map(p => `<p>${esc(p)}</p>`).join(""), "explication"); }
const pied = (exp, programme) => bloc("Pour aller plus loin", `<p>${esc(exp.approfondissement)}</p>`) + `<details class="prog"><summary>Le programme SONORA de cette expérience</summary><pre id="code-exp">${esc(programme)}</pre><button type="button" id="b-studio">Ouvrir dans le Studio pour le modifier</button></details>`;

function ouvrir(id) {
  const exp = parId(id) || EXPERIENCES[0]; arreterEcoute(); if (etat.arretLecture) { etat.arretLecture(); etat.arretLecture = null; } etat.exp = exp; etat.valeurs = {}; etat.resultat = null;
  document.querySelectorAll("#nav-exp button").forEach(b => b.setAttribute("aria-current", String(b.dataset.id === exp.id)));
  document.title = exp.titre + ", SONORA Science"; basculerPanneau("fiche"); window.scrollTo(0, 0);
  if (exp.type === "auditeur") return exp.id === "masquage" ? ficheMasquage(exp) : exp.id === "microtonalite" ? ficheMicro(exp) : ficheSeuil(exp);
  if (exp.type === "analyseur") return ficheAnalyseur(exp);
  if (exp.type === "generateur") return ficheGenerateur(exp);
  const m = moduleDe(exp); etat.module = m;
  $("fiche").innerHTML = heros({ etiquette: exp.domaine, titre: exp.titre, texte: exp.question, aide: "Puis change les réglages juste en dessous : tu entends la différence, et tu la vois." })
    + bloc("L'expérience", `<div class="bloc-exp"><div class="reglages-exp" id="reglages-exp"></div><div class="commandes"><button type="button" class="principal" id="b-mesurer">Mesurer sur le signal</button></div><p class="petit" id="msg-exp"></p>
    <div class="vues"><figure><canvas id="live-oscillo" role="img" aria-label="Oscilloscope en direct"></canvas><figcaption>Oscilloscope en direct</figcaption></figure><figure><canvas id="live-spectre" role="img" aria-label="Spectre en direct"></canvas><figcaption>Spectre en direct</figcaption></figure></div></div>`)
    + `<div id="resultats"></div>` + bloc("L'idée", exp.explication.map(p => `<p>${esc(p)}</p>`).join(""), "explication") + pied(exp, exp.programme);
  construireControles($("reglages-exp"), m);
  $("b-ecouter").onclick = () => etat.marche ? arreterEcoute() : ecouter(m);
  $("b-mesurer").onclick = () => lancerMesure(exp, m);
  $("b-studio").onclick = () => ouvrirDansStudio(exp, exp.programme);
}
function lancerMesure(exp, m) {
  const z = $("resultats"); z.innerHTML = `<p class="petit" id="calcul">Calcul sur le signal produit…</p>`; badge("calcul");
  setTimeout(() => {
    try {
      const t0 = performance.now(), res = mesurer(exp, m, { ...etat.valeurs }), ms = performance.now() - t0; etat.resultat = res; if (etat.arretLecture) etat.arretLecture(); etat.arretLecture = window.COURS_POINTS ? window.COURS_POINTS.lecture($("fiche"), "science:" + exp.id, 5, "sonora", { condition: () => ecouteDe(exp.id) >= 4 }) : null; // points : écouté au moins 4 s, mesuré, puis lu jusqu'au bout
      z.innerHTML = bloc("Ce que dit le signal", tableau(res) + `<p class="petit">Mesures faites sur ${exp.duree} s de signal rendu par le noyau SONORA (${ms.toFixed(0)} ms de calcul), avec les réglages ci-dessus.</p>`) +
        bloc("Les mesures en images", `<div class="vues">${(res.vues || []).map(v => `<figure><canvas id="${FIGURES[v][0]}" role="img" aria-label="${esc(FIGURES[v][1])}"></canvas><figcaption>${esc(FIGURES[v][1])}</figcaption></figure>`).join("")}</div>`) +
        bloc("Interprétation", `<p class="interpretation" id="interpretation">${esc(res.interpretation)}</p>`);
      dessinerVues(res); badge("mesuré");
    } catch (e) { z.innerHTML = `<p class="bilan non">La mesure a échoué : ${esc(e.message)}</p>`; badge("erreur", "erreur"); console.error(e); }
  }, 30);
}

// ---------------------------------------------------------------- analyseur libre
function sourcesAnalyseur() {
  const l = EXEMPLES.map(e => ({ id: e.id, titre: e.titre, code: e.code }));
  try { const b = JSON.parse(localStorage.getItem("sonora:brouillon") || "null"); if (b && b.source) l.unshift({ id: "brouillon", titre: "Mon programme du Studio : " + (b.titre || "sans titre"), code: b.source }); } catch (_) {}
  return l;
}
function ficheAnalyseur(exp) {
  const sources = sourcesAnalyseur();
  $("fiche").innerHTML = entete(exp) + bloc("L'expérience", `<div class="bloc-exp"><label class="champ">Programme à analyser<select id="choix-prog" aria-label="Programme à analyser">${sources.map(s => `<option value="${esc(s.id)}">${esc(s.titre)}</option>`).join("")}</select></label><div class="reglages-exp" id="reglages-exp"></div><p class="petit" id="msg-exp"></p>
    <div class="commandes"><button type="button" class="principal" id="b-ecouter">Écouter</button><button type="button" id="b-mesurer">Analyser (4 secondes)</button></div>
    <div class="vues"><figure><canvas id="live-oscillo" role="img" aria-label="Oscilloscope en direct"></canvas><figcaption>Oscilloscope en direct</figcaption></figure><figure><canvas id="live-spectre" role="img" aria-label="Spectre en direct"></canvas><figcaption>Spectre en direct</figcaption></figure></div></div>`)
    + `<div id="resultats"></div>` + pied(exp, "");
  let module = null, source = null;
  const choisir = () => {
    arreterEcoute(); const s = sources.find(x => x.id === $("choix-prog").value); source = s; etat.valeurs = {};
    try { module = preparer(s.code); etat.module = module; construireControles($("reglages-exp"), module); $("msg-exp").textContent = module.voix ? "Instrument à voix : l'analyse joue un accord de trois notes (la, do dièse, mi) tenu 2,4 s." : ""; $("code-exp").textContent = s.code; }
    catch (e) { module = null; $("reglages-exp").innerHTML = ""; $("msg-exp").textContent = "Ce programme ne peut pas être analysé : " + e.message.split("\n")[0]; }
  };
  $("choix-prog").onchange = choisir; choisir();
  $("b-ecouter").onclick = () => { if (!module) return; etat.marche ? arreterEcoute() : ecouter(module); };
  $("b-studio").onclick = () => ouvrirDansStudio(exp, source.code);
  $("b-mesurer").onclick = () => {
    if (!module) return; const z = $("resultats"); z.innerHTML = `<p class="petit">Calcul sur le signal produit…</p>`; badge("calcul");
    setTimeout(() => { try {
      const a = mesurerLibre(module, { ...etat.valeurs }, { secondes: 4 }); etat.resultat = a;
      const L = (nom, v, u, d) => ({ nom, mesure: v, unite: u, d, info: true });
      const lignes = [L("Fréquence fondamentale", a.f0, "Hz", 1), L("Centroïde spectral (brillance)", a.centroide, "Hz", 0), L("Pics du spectre (les cinq plus forts)", a.pics.slice(0, 5).length, "", 0),
        L("Niveau efficace (RMS)", A.versDB(a.rms), "dB", 1), L("Niveau de crête", A.versDB(a.crete), "dB", 1), L("Facteur de crête (crête / efficace)", A.versDB(a.crete / Math.max(a.rms, 1e-9)), "dB", 1), L("Plage dynamique (entre les 5 % et les 95 % des niveaux de l'enveloppe)", a.plage, "dB", 1), L("Temps de montée de l'enveloppe (10 % à 90 % du maximum)", a.attaque, "ms", 0)];
      if (a.harm.length) a.harm.slice(1).forEach((h, i) => lignes.push(L(`Harmonique ${i + 2}, relatif à la fondamentale`, A.versDB(h / a.harm[0]), "dB", 1)));
      const res = { lignes, vues: ["oscillo", "spectre", "spectrogramme", "enveloppe"], canaux: a.canaux, serie: { sp: a.spectrogramme, env: a.env, fe: a.fe } };
      const pics = a.pics.slice(0, 5).map(p => `${fmt(p.f, 0)} Hz (${fmt(p.db, 0)} dB)`).join(", ");
      const interp = `${a.f0 ? `Fondamentale à ${fmt(a.f0, 1)} Hz, centroïde à ${fmt(a.centroide, 0)} Hz (${fmt(a.centroide / a.f0, 1)} fois la fondamentale : ${a.centroide / a.f0 < 1.6 ? "un son plutôt pur ou sombre" : a.centroide / a.f0 < 3.5 ? "un son de brillance moyenne" : "un son riche en aigus"}).` : "Pas de hauteur nette : signal bruité ou polyphonique."} Pics les plus forts : ${pics || "aucun"}. Niveau efficace ${fmt(A.versDB(a.rms), 1)} dB, crête ${fmt(A.versDB(a.crete), 1)} dB. ${a.attaque !== null ? `L'enveloppe monte en ${fmt(a.attaque, 0)} ms : ${a.attaque < 15 ? "attaque brève, percussive" : a.attaque < 80 ? "attaque moyenne" : "attaque lente"}.` : ""} Plage dynamique de l'enveloppe : ${fmt(a.plage, 1)} dB.`;
      z.innerHTML = bloc("Ce que dit le signal", tableau(res)) + bloc("Les mesures en images", `<div class="vues">${res.vues.map(v => `<figure><canvas id="${FIGURES[v][0]}" role="img" aria-label="${esc(FIGURES[v][1])}"></canvas><figcaption>${esc(FIGURES[v][1])}</figcaption></figure>`).join("")}</div>`) + bloc("Interprétation", `<p class="interpretation" id="interpretation">${esc(interp)}</p>`);
      dessinerVues(res); badge("mesuré");
    } catch (e) { z.innerHTML = `<p class="bilan non">L'analyse a échoué : ${esc(e.message)}</p>`; badge("erreur", "erreur"); console.error(e); } }, 30);
  };
}

// ---------------------------------------------------------------- expérience à l'écoute : masquage
function ficheMasquage(exp) {
  const m = moduleDe(exp); etat.module = m; etat.mas = { etape: 1, avec: null, sans: null };
  const rendre = () => {
    const s = etat.mas; const e = s.etape;
    $("fiche").innerHTML = entete(exp) + bloc("L'expérience", `<div class="bloc-exp"><div class="consigne"><b>Mets un casque ou des enceintes, dans un endroit calme.</b> Règle le volume de ton appareil à un niveau confortable, puis ne le touche plus. Appuie sur Écouter.<ol><li>Étape 1 : un bruit est présent. Baisse le curseur jusqu'à ne plus entendre le son pur à 1 kHz (un « bip » continu), puis remonte-le un peu jusqu'à l'entendre à peine.</li><li>Étape 2 : le bruit est coupé. Même consigne.</li></ol></div>
      <p class="progression" id="progression">${e <= 2 ? `Étape ${e} sur 2 : ${e === 1 ? "avec le bruit" : "sans le bruit"}` : "Mesure terminée"}</p>
      <div class="reglages-exp" id="reglages-exp"></div><div class="commandes"><button type="button" class="principal" id="b-ecouter">Écouter</button><button type="button" id="b-valider" ${e > 2 ? "disabled" : ""}>Je l'entends à peine : valider ce niveau</button><button type="button" id="b-recommencer">Recommencer</button></div><p class="petit" id="msg-exp"></p></div>`) + `<div id="resultats"></div>` + pied(exp, exp.programme);
    etat.valeurs = { niveau: -30, masque: e === 1 ? 1 : 0 }; if (s.avec !== null) etat.valeurs.niveau = s.avec;
    construireControles($("reglages-exp"), m, null, ["niveau"]); etat.valeurs.masque = e === 1 ? 1 : 0;
    $("b-ecouter").onclick = () => etat.marche ? arreterEcoute() : ecouter(m); $("b-studio").onclick = () => ouvrirDansStudio(exp, exp.programme);
    $("b-recommencer").onclick = () => { arreterEcoute(); etat.mas = { etape: 1, avec: null, sans: null }; rendre(); };
    $("b-valider").onclick = async () => { const niv = etat.valeurs.niveau;
      if (s.etape === 1) { s.avec = niv; s.etape = 2; await arreterEcoute(); rendre(); }
      else { s.sans = niv; s.etape = 3; await arreterEcoute(); rendre(); } };
    if (e > 2) calculerMasquage(exp, m, s);
  };
  rendre();
}
function calculerMasquage(exp, m, s) {
  const dur = 3, tonSeul = rendreCanaux(m, { niveau: s.avec, masque: 0 }, dur)[0], bruitSeul = rendreCanaux(m, { niveau: -90, masque: 1 }, dur)[0];
  const n = 16384, p = A.pics(A.spectre(tonSeul, 8192, n), SR, n)[0], tonDB = A.versDB(p.a);
  const sp = A.welch(bruitSeul, SR, 8192, 4096), bande = 132; let tout = 0, dedans = 0; for (let k = 1; k < sp.db.length; k++) { const pw = Math.pow(10, sp.db[k] / 10), f = k * sp.bin; tout += pw; if (Math.abs(f - 1000) <= bande / 2) dedans += pw; }
  const pBruit = Math.pow(A.rms(bruitSeul, 4096), 2) * dedans / tout, pTon = p.a * p.a / 2, rsb = 10 * Math.log10(pTon / pBruit);
  const effet = s.avec - s.sans;
  const lignes = [{ nom: "Niveau du son pur à ton seuil, avec le bruit", mesure: s.avec, unite: "dB", d: 1, info: true }, { nom: "Niveau du son pur à ton seuil, sans le bruit", mesure: s.sans, unite: "dB", d: 1, info: true },
    { nom: "Effet de masque : de combien il a fallu monter le son", mesure: effet, unite: "dB", d: 1, info: true }, { nom: "Niveau du son pur mesuré dans le signal, avec le bruit (pic du spectre)", mesure: tonDB, unite: "dB", d: 1, info: true },
    { nom: "Rapport son pur / bruit dans une bande de 132 Hz autour de 1 kHz, à ton seuil", mesure: rsb, unite: "dB", d: 1, info: true }];
  const interp = `Avec le bruit, tu as besoin d'un son pur ${fmt(Math.abs(effet), 1)} dB ${effet >= 0 ? "plus fort" : "plus faible"} que sans le bruit pour l'entendre à peine. À ton seuil, dans la bande de 132 Hz autour de 1 kHz, le son pur est à ${fmt(rsb, 1)} dB du bruit : ${rsb < 0 ? "en dessous du bruit, et tu l'entends encore parce que l'oreille filtre le bruit dans une bande étroite" : "au-dessus du bruit"}. Seule la différence entre tes deux seuils a un sens : les niveaux absolus dépendent du volume de ton appareil. Ce résultat vient d'une seule mesure, faite par une seule personne : refais-la plusieurs fois pour voir sa dispersion.`;
  etat.resultat = { lignes, interpretation: interp, effet }; points("science:masquage", 10, "sonora");
  try { const k = "sonora:science:resultats", l = JSON.parse(localStorage.getItem(k) || "[]"); l.push({ id: exp.id, date: Date.now(), avec: s.avec, sans: s.sans, effet, rsb }); localStorage.setItem(k, JSON.stringify(l.slice(-50))); } catch (_) {}
  $("resultats").innerHTML = bloc("Ton résultat", `<div class="resultat-aud">${tableau({ lignes })}</div>`) + bloc("Interprétation", `<p class="interpretation" id="interpretation">${esc(interp)}</p>`);
}

// ---------------------------------------------------------------- expérience à l'écoute : plus petit écart de hauteur
function ficheSeuil(exp) {
  let m = moduleDe(exp); etat.module = m; etat.timbreSeuil = "orgue"; let esca = null, ctxAudio = null, enCours = false;
  $("fiche").innerHTML = entete(exp) + bloc("L'expérience", `<div class="bloc-exp"><div class="consigne"><b>Casque ou enceintes, endroit calme, volume confortable.</b> À chaque essai tu entends deux sons à la suite. Dis lequel est le plus aigu. Les écarts deviennent de plus en plus petits quand tu réussis. Environ 40 essais, 4 minutes.</div>
    <label class="champ-timbre">Timbre des sons <select id="s-timbre">${optionsTimbres("orgue")}</select></label><p class="progression" id="progression">Prêt.</p><div class="commandes"><button type="button" class="principal" id="b-debut">Commencer</button><button type="button" id="b-rejouer" disabled>Réécouter les deux sons</button></div>
    <div class="gros-boutons"><button type="button" id="r-premier" disabled>Le premier est plus aigu</button><button type="button" id="r-second" disabled>Le second est plus aigu</button></div><p class="petit" id="msg-exp"></p></div>` ) + `<div id="resultats"></div>` + pied(exp, exp.programme);
  $("b-studio").onclick = () => ouvrirDansStudio(exp, exp.programme);
  $("s-timbre").onchange = ev => { etat.timbreSeuil = ev.target.value; m = moduleTimbre(ev.target.value); etat.module = m; };
  const ton = cents => { const x = rendreCanaux(m, { ecart: cents, base: 1000 }, 0.4)[0], n = x.length, y = new Float32Array(n), f = Math.round(0.012 * SR); for (let i = 0; i < n; i++) y[i] = x[i] * Math.min(1, i / f, (n - 1 - i) / f); return y; }; // fondu de 12 ms : pas de claquement
  function jouer(e) {
    ctxAudio = ctxAudio || new (window.AudioContext || window.webkitAudioContext)(); if (ctxAudio.state === "suspended") ctxAudio.resume();
    const a = ton(e.premier), b = ton(e.second), gap = Math.round(0.3 * SR), buf = ctxAudio.createBuffer(1, a.length + gap + b.length, SR), d = buf.getChannelData(0); d.set(a, 0); d.set(b, a.length + gap);
    const src = ctxAudio.createBufferSource(); src.buffer = buf; src.connect(ctxAudio.destination); src.start();
  }
  function essai() {
    const dir = Math.random() < 0.5 ? 1 : -1, e = { delta: esca.delta, premier: 0, second: 0 }; const hautPremier = Math.random() < 0.5; e.premier = hautPremier ? esca.delta : 0; e.second = hautPremier ? 0 : esca.delta; e.bonne = hautPremier ? "premier" : "second";
    etat.essai = e; jouer(e); $("progression").textContent = `Essai ${esca.essais.length + 1}, écart ${fmt(esca.delta, 1)} cents. Inversions : ${esca.inversions.length} sur ${esca.inversionsFin}.`;
    for (const id of ["r-premier", "r-second", "b-rejouer"]) $(id).disabled = false;
  }
  const repondre = choix => {
    if (!etat.essai) return; const juste = choix === etat.essai.bonne; etat.essai = null; for (const id of ["r-premier", "r-second", "b-rejouer"]) $(id).disabled = true;
    esca.repondre(juste); if (esca.fini) return terminer(); setTimeout(essai, 500);
  };
  $("r-premier").onclick = () => repondre("premier"); $("r-second").onclick = () => repondre("second");
  $("b-rejouer").onclick = () => etat.essai && jouer(etat.essai);
  $("b-debut").onclick = () => { esca = new Escalier({ depart: 40, max: 100, min: 0.5 }); etat.escalier = esca; $("b-debut").disabled = true; $("resultats").innerHTML = ""; essai(); };
  function terminer() {
    $("b-debut").disabled = false; $("b-debut").textContent = "Recommencer"; $("progression").textContent = "Mesure terminée.";
    const s = esca.seuil, tot = esca.essais.length, ok = esca.essais.filter(x => x.juste).length;
    const lignes = [{ nom: "Seuil de discrimination estimé (moyenne géométrique des dernières inversions)", mesure: s, unite: "cents", d: 1, info: true }, { nom: "Écart de fréquence correspondant à 1 kHz", mesure: s === null ? null : 1000 * (Math.pow(2, s / 1200) - 1), unite: "Hz", d: 2, info: true },
      { nom: "Part d'un demi-ton", mesure: s === null ? null : s / 100, unite: "demi-ton", d: 3, info: true }, { nom: "Essais, réponses justes", mesure: tot, unite: `dont ${ok} justes`, d: 0, info: true }, { nom: "Inversions de l'escalier", mesure: esca.inversions.length, unite: "", d: 0, info: true }];
    const interp = s === null ? "L'escalier n'a pas assez d'inversions pour estimer un seuil : refais la mesure en répondant à chaque essai." : `Ton seuil est d'environ ${fmt(s, 1)} cents, soit ${fmt(1000 * (Math.pow(2, s / 1200) - 1), 1)} Hz à 1 kHz et ${fmt(s / 100, 2)} de demi-ton. Procédure : après deux réponses justes de suite l'écart diminue, après une erreur il augmente ; elle converge vers l'écart que tu distingues environ sept fois sur dix. Cette valeur vient de ${tot} essais d'une seule séance : elle varie d'une séance à l'autre et dépend de ton attention, de l'entraînement et de ton matériel. Compare avec d'autres personnes ou avec toi-même après entraînement.`;
    etat.resultat = { lignes, interpretation: interp, seuil: s }; points("science:seuil-hauteur", 10, "sonora");
    try { const k = "sonora:science:resultats", l = JSON.parse(localStorage.getItem(k) || "[]"); l.push({ id: exp.id, date: Date.now(), seuil: s, essais: tot }); localStorage.setItem(k, JSON.stringify(l.slice(-50))); } catch (_) {}
    $("resultats").innerHTML = bloc("Ton résultat", `<div class="resultat-aud">${tableau({ lignes })}</div>`) + bloc("L'escalier", `<div class="vues"><figure><canvas id="fig-escalier" role="img" aria-label="Escalier : écart en cents à chaque essai"></canvas><figcaption>Écart à chaque essai (points verts : réponse juste, rouges : erreur)</figcaption></figure></div>`) + bloc("Interprétation", `<p class="interpretation" id="interpretation">${esc(interp)}</p>`);
    dessinerEscalier($("fig-escalier"), esca.essais, esca.inversions);
  }
}



// ---------------------------------------------------------------- générateur de sons purs (Web Audio direct, en continu)
const NOTES = ["do", "do dièse", "ré", "ré dièse", "mi", "fa", "fa dièse", "sol", "sol dièse", "la", "la dièse", "si"];
function noteProche(f) { const n = Math.round(12 * Math.log2(f / 440)) + 69, hz = 440 * Math.pow(2, (n - 69) / 12), cents = 1200 * Math.log2(f / hz); return { nom: NOTES[((n % 12) + 12) % 12] + " " + (Math.floor(n / 12) - 1), cents }; }
function ficheGenerateur(exp) {
  const g = etat.gen = { ctx: null, osc: null, gain: null, an: null, forme: "sine", f: 440, vol: 0.1, marche: false, raf: 0 };
  const h = new URLSearchParams(location.hash.split("?")[1] || "").get("f"); if (h && +h >= 20 && +h <= 20000) g.f = +h;
  $("fiche").innerHTML = heros({ etiquette: exp.domaine, titre: exp.titre, texte: exp.question, aide: "Règle la fréquence, puis appuie sur Jouer. Garde un volume bas au départ." })
    + bloc("Le générateur", `<div class="bloc-exp"><div class="rang-champs"><label class="champ-timbre">Fréquence en Hz <input id="g-f" type="number" min="20" max="20000" step="any" value="${g.f}" inputmode="decimal"></label>
    <label class="champ-timbre">Forme d'onde <select id="g-forme"><option value="sine">Sinus</option><option value="square">Carré</option><option value="sawtooth">Dent de scie</option><option value="triangle">Triangle</option></select></label></div>
    <label class="reglage"><span>Fréquence (échelle logarithmique)</span><input id="g-fl" type="range" min="0" max="1000" value="0" aria-label="Fréquence, curseur"></label>
    <div class="commandes"><button type="button" id="g-moins">-1 Hz</button><button type="button" id="g-plus">+1 Hz</button><button type="button" id="g-div">÷ 2</button><button type="button" id="g-mul">× 2</button><button type="button" id="g-440">440 Hz</button></div>
    <label class="reglage"><span>Volume (départ bas)</span><input id="g-vol" type="range" min="0" max="100" value="10" aria-label="Volume"></label>
    <p class="progression" id="g-info" aria-live="polite"></p>
    <div class="commandes"><button type="button" class="principal" id="g-jouer">Jouer</button><button type="button" id="g-lien">Copier le lien de ce réglage</button></div><p class="petit" id="msg-exp"></p>
    <div class="vues"><figure><canvas id="g-oscillo" role="img" aria-label="Oscilloscope en direct"></canvas><figcaption>Oscilloscope en direct</figcaption></figure></div></div>`)
    + bloc("L'idée", exp.explication.map(p => `<p>${esc(p)}</p>`).join(""), "explication") + pied(exp, exp.programme);
  $("b-studio").onclick = () => ouvrirDansStudio(exp, exp.programme);
  const fl = $("g-fl"), min = Math.log(20), max = Math.log(20000), versSlider = f => Math.round(1000 * (Math.log(f) - min) / (max - min)), depuisSlider = v => Math.exp(min + (max - min) * v / 1000);
  const virgule = v => String(Math.round(v * 100) / 100).replace(".", ",");
  function maj(source) {
    g.f = Math.min(20000, Math.max(20, g.f)); if (source !== "champ") $("g-f").value = Math.round(g.f * 100) / 100; if (source !== "slider") fl.value = versSlider(g.f);
    const n = noteProche(g.f), c = Math.round(n.cents), longueur = 343 / g.f;
    $("g-info").textContent = `${virgule(g.f)} Hz, période ${virgule(1000 / g.f)} ms, longueur d'onde ${longueur >= 1 ? virgule(longueur) + " m" : virgule(longueur * 100) + " cm"}. Note la plus proche : ${n.nom}${Math.abs(c) < 1 ? "" : ` (${c > 0 ? "+" : ""}${c} cents)`}.`;
    if (g.osc) g.osc.frequency.setTargetAtTime(g.f, g.ctx.currentTime, 0.02);
  }
  $("g-f").oninput = ev => { const v = parseFloat(String(ev.target.value).replace(",", ".")); if (v >= 20 && v <= 20000) { g.f = v; maj("champ"); } };
  fl.oninput = () => { g.f = depuisSlider(+fl.value); maj("slider"); };
  $("g-moins").onclick = () => { g.f -= 1; maj(); }; $("g-plus").onclick = () => { g.f += 1; maj(); }; $("g-div").onclick = () => { g.f /= 2; maj(); }; $("g-mul").onclick = () => { g.f *= 2; maj(); }; $("g-440").onclick = () => { g.f = 440; maj(); };
  $("g-forme").onchange = ev => { g.forme = ev.target.value; if (g.osc) g.osc.type = g.forme; };
  const reglerVolume = () => { g.vol = Math.pow(+$("g-vol").value / 100, 2) * 0.5; if (g.gain) g.gain.gain.setTargetAtTime(g.vol, g.ctx.currentTime, 0.03); }; $("g-vol").oninput = reglerVolume; reglerVolume();
  $("g-lien").onclick = async () => { const u = location.origin + location.pathname + "#generateur-sons?f=" + (Math.round(g.f * 100) / 100); try { await navigator.clipboard.writeText(u); $("msg-exp").textContent = "Lien copié."; } catch (_) { $("msg-exp").textContent = u; } };
  function arret() { g.marche = false; cancelAnimationFrame(g.raf); if (g.gain) { g.gain.gain.setTargetAtTime(0, g.ctx.currentTime, 0.02); const o = g.osc; setTimeout(() => { try { o.stop(); o.disconnect(); } catch (_) {} }, 120); } g.osc = null; $("g-jouer").textContent = "Jouer"; badge("prêt"); }
  function dessiner() {
    const c = $("g-oscillo"); if (!c || !g.marche) return; const r = c.getBoundingClientRect(), d = devicePixelRatio || 1; c.width = Math.max(10, r.width * d); c.height = Math.max(10, r.height * d);
    const x = c.getContext("2d"), buf = new Float32Array(g.an.fftSize); g.an.getFloatTimeDomainData(buf); x.fillStyle = "#11110F"; x.fillRect(0, 0, c.width, c.height); x.strokeStyle = "#D6FF00"; x.lineWidth = 2 * d; x.beginPath();
    let dep = 0; for (let i = 1; i < buf.length / 2; i++) if (buf[i - 1] < 0 && buf[i] >= 0) { dep = i; break; }
    const nb = Math.min(buf.length - dep, Math.max(64, Math.round(3 * g.ctx.sampleRate / g.f))); const ech = c.height / 2 / (g.vol > 0 ? Math.max(g.vol, 0.02) * 1.1 : 1);
    for (let i = 0; i < nb; i++) { const px = i / nb * c.width, py = c.height / 2 - buf[dep + i] * ech; i ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke(); g.raf = requestAnimationFrame(dessiner);
  }
  $("g-jouer").onclick = async () => {
    if (g.marche) return arret();
    g.ctx = g.ctx || new (window.AudioContext || window.webkitAudioContext)(); if (g.ctx.state === "suspended") await g.ctx.resume();
    g.osc = g.ctx.createOscillator(); g.osc.type = g.forme; g.osc.frequency.value = g.f; g.gain = g.ctx.createGain(); g.gain.gain.value = 0; g.an = g.ctx.createAnalyser(); g.an.fftSize = 4096;
    g.osc.connect(g.gain); g.gain.connect(g.an); g.an.connect(g.ctx.destination); g.osc.start(); g.gain.gain.setTargetAtTime(g.vol, g.ctx.currentTime, 0.03);
    g.marche = true; $("g-jouer").textContent = "Arrêter"; badge("son en cours", "ok"); g.raf = requestAnimationFrame(dessiner);
  };
  etat.arretGen = () => { if (g.marche) arret(); };
  maj();
}

// ---------------------------------------------------------------- micro-intervalles et tempéraments (interactif)
function ficheMicro(exp) {
  const mi = etat.micro = { timbre: "orgue", base: 261.63, variantes: [], modele: null, ctx: null };
  const lien = id => `../../atlas/index.html#e/${id}`;
  const c1 = v => v.toFixed(1).replace(".", ","), fc = c => (c >= 0 ? "+" : "") + c1(c);
  const optionsModeles = INTERVALLES.flatMap((it, i) => it.systemes.map(([nom], j) => `<option value="${i}.${j}">${esc(it.nom)}, ${esc(nom.split(",")[0].toLowerCase())}</option>`)).join("");
  const lignes = INTERVALLES.map((it, i) => it.systemes.map(([nom, c, note], j) => `<tr><td>${j === 0 ? esc(it.nom) : ""}</td><td>${esc(nom)}</td><td class="n">${c1(c)}</td><td class="n">${fc(c - it.systemes[0][1])}</td><td class="actions-lig"><button type="button" data-lecture="${i}.${j}" data-mode="suite">Deux notes</button><button type="button" data-lecture="${i}.${j}" data-mode="accord">Ensemble</button></td><td>${esc(note)}</td></tr>`).join("")).join("");
  $("fiche").innerHTML = entete(exp)
    + bloc("Ton instrument", `<div class="bloc-exp"><div class="rang-champs"><label class="champ-timbre">Timbre <select id="m-timbre">${optionsTimbres("orgue")}</select></label><label class="champ-timbre">Note de base <select id="m-base"><option value="261.63">do (261,6 Hz)</option><option value="293.66">ré (293,7 Hz)</option><option value="329.63">mi (329,6 Hz)</option><option value="392">sol (392 Hz)</option><option value="440">la (440 Hz)</option></select></label></div><p class="petit" id="m-desc">${esc(TIMBRES.orgue.desc)}</p></div>`)
    + bloc("Écouter les intervalles", `<p>Chaque ligne joue la même note de base, puis le même intervalle placé selon un système d'accord. Joue « Ensemble » pour entendre les battements quand l'intervalle n'est pas pur. La colonne « Écart » compare au tempérament égal, en cents.</p><div class="tableau-defile"><table class="mesures" id="m-table"><thead><tr><th>Intervalle</th><th>Système d'accord</th><th>Cents</th><th>Écart</th><th>Écouter</th><th>Remarque</th></tr></thead><tbody>${lignes}</tbody></table></div>`)
    + bloc("L'éventail : du plus bas au plus haut", `<p>Choisis un modèle. Cinq versions sont tirées au hasard, chacune écartée de moins de 10 cents de la valeur théorique. Écoute-les, range-les, puis vérifie.</p><div class="commandes"><label class="champ-timbre">Modèle <select id="e-modele">${optionsModeles}</select></label><button type="button" class="principal" id="e-nouveau">Nouveau tirage</button><button type="button" id="e-ref">Écouter le modèle exact</button></div>
      <div id="e-zone" class="eventail"></div><div class="commandes"><button type="button" id="e-verif" disabled>Vérifier mon classement</button></div><div id="e-res" aria-live="polite"></div>`)
    + bloc("Les systèmes d'accord dans le monde", `<div class="cartes-systemes">${SYSTEMES.map(sy => `<article class="systeme"><h3>${esc(sy.nom)}</h3><p class="ou">${esc(sy.ou)}</p><p>${esc(sy.texte)}</p><p class="liens-atlas">Dans l'Atlas : ${sy.atlas.map(a => `<a href="${lien(a)}">${esc(NOMS_ATLAS[a])}</a>`).join(", ")}</p></article>`).join("")}</div>`) + pied(exp, programmeTimbre("cloche"));
  $("b-studio").onclick = () => ouvrirDansStudio(exp, programmeTimbre(mi.timbre));
  const ctx = () => (mi.ctx ||= new (window.AudioContext || window.webkitAudioContext)()), nom = ([i, j]) => INTERVALLES[i].systemes[j];
  const rendre = (centsNote, sec = 0.7) => { const x = rendreCanaux(moduleTimbre(mi.timbre), { ecart: centsNote, base: mi.base }, sec)[0], n = x.length, y = new Float32Array(n), f = Math.round(0.012 * SR); for (let i = 0; i < n; i++) y[i] = x[i] * Math.min(1, i / f, (n - 1 - i) / f); return y; };
  function jouer(parties, mode) { const c = ctx(); if (c.state === "suspended") c.resume(); const gap = Math.round(0.18 * SR), total = mode === "accord" ? parties[0].length : parties.reduce((s, p) => s + p.length + gap, 0), buf = c.createBuffer(1, total, SR), d = buf.getChannelData(0);
    if (mode === "accord") parties.forEach(p => { for (let i = 0; i < p.length; i++) d[i] += p[i] * 0.7; }); else { let o = 0; for (const p of parties) { d.set(p, o); o += p.length + gap; } }
    const src = c.createBufferSource(); src.buffer = buf; src.connect(c.destination); src.start(); return buf.duration; }
  const jouerIntervalle = (cents, mode) => jouer([rendre(0), rendre(cents)], mode);
  $("m-timbre").onchange = ev => { mi.timbre = ev.target.value; $("m-desc").textContent = TIMBRES[mi.timbre].desc; };
  $("m-base").onchange = ev => { mi.base = +ev.target.value; };
  $("m-table").onclick = ev => { const b = ev.target.closest("button[data-lecture]"); if (!b) return; jouerIntervalle(nom(b.dataset.lecture.split(".").map(Number))[1], b.dataset.mode); };
  const modele = () => { const [i, j] = $("e-modele").value.split(".").map(Number); return nom([i, j]); };
  function tirer() {
    const [nm, c] = modele(); mi.modele = c; mi.entendues = new Set(); mi.variantes = tirerVariantes(c, 5, 10); mi.rangs = {}; $("e-res").innerHTML = ""; $("e-verif").disabled = true;
    $("e-zone").innerHTML = mi.variantes.map((v, k) => `<div class="e-version"><button type="button" class="e-v" data-k="${k}" aria-label="Écouter la version ${"ABCDE"[k]}">Version ${"ABCDE"[k]}</button><label>Rang <select class="e-rang" data-k="${k}"><option value="">?</option>${[1, 2, 3, 4, 5].map(r => `<option value="${r}">${r}${r === 1 ? " (le plus bas)" : r === 5 ? " (le plus haut)" : ""}</option>`).join("")}</select></label></div>`).join("");
    $("e-zone").querySelectorAll(".e-v").forEach(b => b.onclick = () => { const k = +b.dataset.k, v = mi.variantes[k], lot = mi.variantes, d = jouerIntervalle(v.cents, "suite"); setTimeout(() => { if (mi.variantes === lot) mi.entendues.add(k); }, d * 1000); }); // entendue : seulement une fois le son fini
    $("e-zone").querySelectorAll(".e-rang").forEach(s => s.onchange = () => { mi.rangs[s.dataset.k] = s.value ? +s.value : null; const vals = Object.values(mi.rangs).filter(Boolean); $("e-verif").disabled = !(vals.length === 5 && new Set(vals).size === 5); });
  }
  $("e-nouveau").onclick = tirer; tirer(); $("e-modele").onchange = tirer;
  $("e-ref").onclick = () => jouerIntervalle(modele()[1], "suite");
  $("e-verif").onclick = () => {
    const ordre = ordreJuste(mi.variantes), vrai = {}; ordre.forEach((k, pos) => { vrai[k] = pos + 1; });
    const justes = mi.variantes.filter(v => mi.rangs[v.rang] === vrai[v.rang]).length;
    $("e-res").innerHTML = `<table class="mesures"><thead><tr><th>Version</th><th>Écart réel à la valeur théorique</th><th>Ton rang</th><th>Rang juste</th></tr></thead><tbody>${mi.variantes.map(v => `<tr><td>${"ABCDE"[v.rang]}</td><td class="n">${fc(v.ecart)} cents</td><td class="n">${mi.rangs[v.rang]}</td><td class="n">${vrai[v.rang]} ${mi.rangs[v.rang] === vrai[v.rang] ? "✓" : ""}</td></tr>`).join("")}</tbody></table><p>${justes} versions sur 5 bien placées. Les versions voisines diffèrent d'au moins 1,5 cent ; sous 5 cents d'écart, beaucoup d'auditeurs hésitent. Recommence avec un autre timbre pour comparer.</p>`;
    if (mi.entendues.size === 5) points("science:microtonalite", 10, "sonora"); else $("e-res").insertAdjacentHTML("beforeend", `<p class="petit">Pas de points cette fois : il faut écouter les cinq versions jusqu'au bout avant de vérifier.</p>`); etat.microResultat = { justes, ecarts: mi.variantes.map(v => v.ecart), rangs: { ...mi.rangs } };
  };
}
// ---------------------------------------------------------------- démarrage
remplirListe();
// Sur téléphone, sans expérience demandée dans l'adresse, on ouvre d'abord sur le menu des expériences : c'est lui qu'on cherche en arrivant.
const depart = () => { const h = location.hash; ouvrir((h || "#" + EXPERIENCES[0].id).slice(1).split("?")[0]); if (!h && !etat.menuVu && matchMedia("(max-width: 900px)").matches) basculerPanneau("liste"); etat.menuVu = true; };
window.addEventListener("hashchange", depart); depart();
document.addEventListener("visibilitychange", () => { if (document.hidden && (etat.marche || etat.arretGen)) arreterEcoute(); });
window.SCIENCE_PRET = true;
