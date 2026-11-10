// SONORA Academy : leçons, exercices corrigés sur le son produit. La progression reste dans le navigateur (aucun compte, rien n'est envoyé).
import { Moteur, ErreurMoteur } from "../src/moteur.js?v=336655a455";
import { Editeur } from "../studio/editeur.js?v=336655a455";
import { UNITES, LECONS, parId } from "./parcours.js?v=336655a455";
import { verifier } from "./correcteur.js?v=336655a455";
import { preparer } from "../science/executeur.js?v=336655a455";
import { heros, etatBouton } from "../studio/heros.js?v=336655a455";
import { dessinerOscillo } from "../studio/visuels.js?v=336655a455";

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const md = s => esc(s).replace(/`([^`]+)`/g, "<code>$1</code>");
const CLE = "sonora:academie";
const lire = () => { try { return JSON.parse(localStorage.getItem(CLE) || "{}"); } catch (_) { return {}; } };
const ecrire = v => { try { localStorage.setItem(CLE, JSON.stringify(v)); } catch (_) {} };
const etat = { lecon: null, moteur: null, marche: false, ed: null, essais: 0, dernier: null };
window.ACADEMIE = etat;
const badge = (t, c = "") => { const e = $("etat"); e.textContent = t; e.className = "etat " + c; };

const points = (...a) => window.COURS_POINTS ? window.COURS_POINTS.gagner(...a) : (window.__pointsEnAttente = window.__pointsEnAttente || []).push(a); // points du cours (sonora/barre-cours.js)
function progression() { const p = lire(); const n = LECONS.filter(l => p[l.id] && p[l.id].reussi).length; $("progres").textContent = `${n} leçon${n > 1 ? "s" : ""} réussie${n > 1 ? "s" : ""} sur ${LECONS.length}`; return p; }
function liste() {
  const p = progression(), z = $("nav-exp"); z.innerHTML = "";
  for (const u of UNITES) { const g = document.createElement("div"); g.innerHTML = `<div class="groupe-nav">${esc(u.titre)}</div><ul></ul>`; const ul = g.querySelector("ul");
    for (const l of LECONS.filter(x => x.unite === u.id)) { const li = document.createElement("li"); const fait = p[l.id] && p[l.id].reussi; li.innerHTML = `<button type="button" data-id="${l.id}" class="${fait ? "fait" : ""}">${esc(l.titre)}${fait ? '<span class="sr-seul"> (réussie)</span>' : ""}</button>`; li.querySelector("button").onclick = () => { location.hash = "#" + l.id; }; ul.appendChild(li); }
    z.appendChild(g); }
  $("avis-limites").textContent = "Un exercice est jugé sur le son produit : plusieurs écritures différentes peuvent réussir. La correction mesure 4 secondes de signal rendu hors ligne.";
}
function panneau(p) { $("sciences").dataset.actif = p; document.querySelectorAll("#onglets-mobiles button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.p === p))); }
document.querySelectorAll("#onglets-mobiles button").forEach(b => b.onclick = () => panneau(b.dataset.p));
$("b-effacer").onclick = () => { if (confirm("Effacer toute ta progression dans ce navigateur ?")) { try { localStorage.removeItem(CLE); } catch (_) {} liste(); ouvrir(etat.lecon.id); } };

// ---- écoute
async function ecouter(code, bouton, msg) {
  if (etat.marche) return arreter(bouton);
  let module; try { module = preparer(code); } catch (e) { msg.textContent = "Le programme ne se compile pas : " + String(e.message).split(" | ")[0].replace(/^Le programme de l'expérience ne se compile pas : /, ""); return; }
  msg.textContent = "";
  try {
    const d = Moteur.diagnostic(); if (!d.ok) throw new ErreurMoteur(d.code, d.raison);
    if (!etat.moteur) etat.moteur = new Moteur().on("analyse", a => { etat.tampon = a.tampon; }); await etat.moteur.demarrer(); etat.moteur.activerAnalyse(true); await etat.moteur.charger(module);
    if (module.voix) etat.moteur.accord([[48, 220, 0.8], [49, 277.18, 0.8], [50, 329.63, 0.8]]);
    if (module.entrees.some(e => e.genre === "audio")) { const ctx = etat.moteur.ctx, n = ctx.sampleRate, buf = ctx.createBuffer(1, n, ctx.sampleRate), x = buf.getChannelData(0); x[0] = 0.9; x[Math.floor(n / 2)] = 0.6; const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.connect(etat.moteur.noeud); s.start(); etat.source = s; }
    etat.marche = true; etat.bouton = bouton; etat.ecoutePropre = bouton && bouton.id === "b-ecouter" ? performance.now() : 0; etatBouton(bouton, true); badge("en écoute", "marche");
  } catch (e) { msg.textContent = e instanceof ErreurMoteur ? e.message : String(e && e.message || e); badge("erreur", "erreur"); }
}
// Plus longue écoute de son propre programme (bouton Écouter de l'exercice, pas l'exemple), en secondes, pour la leçon ouverte.
const ecoutePropre = () => Math.max(etat.ecoutePropreMax || 0, etat.marche && etat.ecoutePropre ? (performance.now() - etat.ecoutePropre) / 1000 : 0);
async function arreter(bouton) {
  etat.ecoutePropreMax = ecoutePropre(); etat.ecoutePropre = 0;
  if (etat.source) { try { etat.source.stop(); etat.source.disconnect(); } catch (_) {} etat.source = null; }
  if (etat.moteur && etat.marche) await etat.moteur.arreter(); etat.marche = false;
  const b = bouton || etat.bouton; if (b) etatBouton(b, false); badge("prêt");
}

// ---- leçon
function ouvrir(id) {
  const l = parId(id) || LECONS[0]; arreter(); etat.ecoutePropreMax = 0; etat.lecon = l; etat.essais = 0; etat.dernier = null;
  document.querySelectorAll("#nav-exp button").forEach(b => b.setAttribute("aria-current", String(b.dataset.id === l.id)));
  document.title = l.titre + ", SONORA Apprendre"; panneau("fiche"); window.scrollTo(0, 0);
  const i = LECONS.indexOf(l), u = UNITES.find(x => x.id === l.unite), p = lire()[l.id], ex = l.exercice;
  $("fiche").innerHTML = heros({ etiquette: `${u.titre}, ${l.duree}`, titre: l.titre, texte: l.objectif, bouton: "b-ecouter-ex", libelle: "Écouter l'exemple", aide: "C'est l'exemple de la leçon. Lis le cours, puis fais l'exercice plus bas." }) + `<p class="petit" id="msg-ex"></p>
  <section class="cours"><h2>Le cours</h2>${l.cours.map(c => `<p>${md(c)}</p>`).join("")}</section>
  <section><h2>Le programme de l'exemple</h2><div class="bloc-exp"><div class="zone-code court" id="zone-exemple"></div><div class="commandes"><button type="button" id="b-copier">Copier dans l'exercice</button><button type="button" id="b-studio-ex">Ouvrir dans le Studio</button></div></div></section>
  <section><h2>L'exercice</h2><div class="consigne" id="consigne">${md(ex.consigne)}</div><div class="bloc-exp"><div class="zone-code" id="zone-ex"></div>
    <div class="commandes"><button type="button" class="principal" id="b-verifier">Vérifier</button><button type="button" id="b-ecouter">Écouter</button><button type="button" id="b-indice">Un indice</button><button type="button" id="b-solution" disabled title="Disponible après un premier essai">Voir une solution</button><button type="button" id="b-raz">Recommencer</button></div>
    <p class="petit" id="msg-ex2"></p><div id="indice" hidden class="consigne"></div><div id="resultat" aria-live="polite"></div></div>
    <details class="solution" id="det-solution" hidden><summary>Une solution</summary><pre id="code-solution"></pre></details></section>
  <nav class="nav-lecon">${i > 0 ? `<button type="button" id="b-prec">Leçon précédente</button>` : ""}${i < LECONS.length - 1 ? `<button type="button" class="principal" id="b-suiv">Leçon suivante</button>` : ""}</nav>`;
  const ro = new Editeur($("zone-exemple"), {}); ro.valeur = l.exemple; ro.ta.readOnly = true; ro.ta.setAttribute("aria-label", "Code de l'exemple, en lecture seule");
  const ed = new Editeur($("zone-ex"), { onChange: () => { $("resultat").innerHTML = ""; } }); ed.valeur = ex.depart; ed.ta.setAttribute("aria-label", "Ton code pour l'exercice"); etat.ed = ed;
  if (p && p.reussi) $("resultat").innerHTML = `<p class="verdict-global ok">Déjà réussi. Tu peux le refaire autrement.</p>`;
  $("b-ecouter-ex").dataset.libelle = "Écouter l'exemple"; $("b-ecouter-ex").onclick = () => ecouter(l.exemple, $("b-ecouter-ex"), $("msg-ex"));
  $("b-copier").onclick = () => { ed.valeur = l.exemple; ed.maj && ed.maj(); $("resultat").innerHTML = ""; };
  $("b-studio-ex").onclick = () => { try { localStorage.setItem("sonora:brouillon", JSON.stringify({ source: l.exemple, titre: l.titre, exemple: null, projet: null })); } catch (_) {} try { localStorage.setItem("sonora:mode", "programmation"); } catch (_) {} location.href = "../studio/index.html"; };
  $("b-ecouter").onclick = () => ecouter(ed.valeur, $("b-ecouter"), $("msg-ex2"));
  $("b-verifier").onclick = () => corriger(l);
  $("b-indice").onclick = () => { const z = $("indice"); z.hidden = false; z.textContent = "Indice : " + ex.indice; };
  $("b-solution").onclick = () => { $("det-solution").hidden = false; $("code-solution").textContent = ex.solution; $("det-solution").open = true; };
  $("b-raz").onclick = () => { ed.valeur = ex.depart; ed.maj && ed.maj(); $("resultat").innerHTML = ""; };
  if ($("b-prec")) $("b-prec").onclick = () => { location.hash = "#" + LECONS[i - 1].id; };
  if ($("b-suiv")) $("b-suiv").onclick = () => { location.hash = "#" + LECONS[i + 1].id; };
}
function corriger(l) {
  const z = $("resultat"); z.innerHTML = `<p class="petit">Mesure sur le son produit…</p>`; badge("calcul");
  setTimeout(() => {
    const t0 = performance.now(), r = verifier(etat.ed.valeur, l.exercice.criteres); etat.essais++; etat.dernier = r; $("b-solution").disabled = false; $("b-solution").removeAttribute("title");
    if (!r.compile) z.innerHTML = `<div class="erreur-comp" role="alert">Le programme ne se compile pas.\n${esc(r.erreur)}</div>`;
    else {
      const bons = r.resultats.filter(x => x.ok).length;
      z.innerHTML = `<ul class="criteres">${r.resultats.map(x => `<li class="${x.ok ? "ok" : "non"}"><span aria-hidden="true">${x.ok ? "✓" : "✗"}</span><span>${esc(x.texte)}<span class="sr-seul">${x.ok ? " : réussi" : " : à corriger"}</span></span><span class="detail">${esc(x.detail)}</span></li>`).join("")}</ul>
      <p class="verdict-global ${r.reussi ? "ok" : "non"}" id="verdict">${r.reussi ? "Exercice réussi." : `${bons} critère${bons > 1 ? "s" : ""} sur ${r.resultats.length}.`}</p><p class="petit">Mesuré en ${(performance.now() - t0).toFixed(0)} ms sur 4 s de signal.</p>`;
      if (r.reussi) { if (ecoutePropre() >= 4) points("academy:" + l.id, 10, "sonora"); else if (window.COURS_POINTS && !window.COURS_POINTS.deja("academy:" + l.id)) z.insertAdjacentHTML("beforeend", `<p class="petit">Pour gagner les points : écoute ton son au moins 4 secondes avec « Écouter », puis vérifie à nouveau.</p>`); const p = lire(); p[l.id] = { reussi: true, essais: (p[l.id]?.essais || 0) + etat.essais, date: Date.now() }; ecrire(p); liste(); document.querySelectorAll("#nav-exp button").forEach(b => b.setAttribute("aria-current", String(b.dataset.id === l.id))); }
    }
    badge("prêt");
  }, 30);
}

liste();
const depart = () => ouvrir((location.hash || "#" + LECONS[0].id).slice(1));
window.addEventListener("hashchange", depart); depart();
document.addEventListener("visibilitychange", () => { if (document.hidden && etat.marche) arreter(); });
(function boucle(t) { requestAnimationFrame(boucle); const c = document.getElementById("heros-onde"); if (c) dessinerOscillo(c, etat.marche ? etat.tampon : null); })(0);
window.ACADEMIE_PRET = true;
