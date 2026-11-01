// SONORA Library : catalogue d'instruments et d'effets, recherche, écoute, mesure, ouverture dans le Studio, enregistrement dans les projets.
import { Moteur, ErreurMoteur } from "../src/moteur.js";
import { MODULES } from "../src/index.js";
import { Editeur } from "../studio/editeur.js";
import { Projets } from "../studio/projets.js";
import { encoder } from "../studio/partage.js";
import { ENTREES } from "./catalogue.js";
import { profil, modulesEmployes, accordDeTest, bruitDeTest } from "./profil.js";
import { trouver } from "./recherche.js";
import { preparer } from "../science/executeur.js";

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const etat = { courant: null, moteur: null, marche: false, vue: "catalogue", filtres: { requete: "", type: "", niveau: "", module: "" } };
window.LIBRARY = etat;
const badge = (t, c = "") => { const e = $("etat"); e.textContent = t; e.className = "etat " + c; };
const memo = new Map(); const modulesDe = e => memo.get(e.id) || (memo.set(e.id, modulesEmployes(e.code)), memo.get(e.id));
const par = id => ENTREES.find(e => e.id === id);
function panneau(p) { $("sciences").dataset.actif = p; document.querySelectorAll("#onglets-mobiles button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.p === p))); }
document.querySelectorAll("#onglets-mobiles button").forEach(b => b.onclick = () => panneau(b.dataset.p));

// ---------------------------------------------------------------- catalogue
function remplirModules() { const s = $("f-module"), tous = [...new Set(ENTREES.flatMap(modulesDe))].sort(); for (const m of tous) { const o = document.createElement("option"); o.value = m; o.textContent = m; s.appendChild(o); } }
function afficherListe() {
  const f = etat.filtres, res = trouver(ENTREES, f, modulesDe); etat.resultats = res.map(e => e.id);
  $("compte").textContent = `${res.length} programme${res.length > 1 ? "s" : ""} sur ${ENTREES.length}`;
  $("resultats").innerHTML = res.length ? res.map(e => `<li><button type="button" data-id="${esc(e.id)}" aria-current="${etat.courant === e.id}"><b>${esc(e.titre)}</b><span class="meta">${e.type === "effet" ? "effet" : "instrument"} · ${esc(e.niveau)}</span></button></li>`).join("") : `<li class="petit">Rien ne correspond. Essaie un mot plus court, ou retire un filtre.</li>`;
  $("resultats").querySelectorAll("button").forEach(b => b.onclick = () => { location.hash = "#" + b.dataset.id; });
}
for (const [id, cle] of [["q", "requete"], ["f-type", "type"], ["f-niveau", "niveau"], ["f-module", "module"]]) $(id).addEventListener("input", () => { etat.filtres[cle] = $(id).value; afficherListe(); });
function vue(v) {
  etat.vue = v; for (const x of ["catalogue", "modules", "projets"]) $("v-" + x).hidden = x !== v;
  document.querySelectorAll("#vues button").forEach(b => b.setAttribute("aria-selected", String(b.dataset.v === v)));
  if (v === "modules") listeModules(); if (v === "projets") listeProjets();
}
document.querySelectorAll("#vues button").forEach(b => b.onclick = () => vue(b.dataset.v));

function listeModules() {
  const noms = Object.keys(MODULES).filter(n => !n.startsWith("lib_")).sort((a, b) => MODULES[a].famille.localeCompare(MODULES[b].famille, "fr") || a.localeCompare(b));
  $("liste-modules").innerHTML = noms.map(n => { const m = MODULES[n], n_ex = ENTREES.filter(e => modulesDe(e).includes(n)).length; return `<li><button type="button" data-module="${n}"><b>${n}</b><span class="meta">${esc(m.famille)} · ${m.impl ? `${n_ex} programme${n_ex > 1 ? "s" : ""}` : "pas encore disponible"}</span></button></li>`; }).join("");
  $("liste-modules").querySelectorAll("button").forEach(b => b.onclick = () => ficheModule(b.dataset.module));
}
function ficheModule(n) {
  arreter(); etat.courant = null; const m = MODULES[n], ex = ENTREES.filter(e => modulesDe(e).includes(n));
  panneau("fiche");
  $("fiche").innerHTML = `<span class="etiq-domaine">${esc(m.famille)}</span><h1>${esc(n)}</h1><section class="mod-fiche"><p>${esc(m.doc)}</p>
    <table class="mesures"><thead><tr><th>Paramètre</th><th>Type</th><th>Défaut</th></tr></thead><tbody>${m.params.map(p => `<tr><td>${esc(p.nom)}</td><td>${esc(p.t)}${p.rmax === "k" ? " (contrôle)" : ""}</td><td>${p.defaut === undefined ? "obligatoire" : esc(String(p.defaut))}</td></tr>`).join("")}</tbody></table>
    <p class="petit">${m.impl ? "Disponible." : "Pas encore disponible : le compilateur le vérifie mais refuse de le jouer (E801)."}${m.compose ? " Écrit en SONORA dans la bibliothèque du langage." : ""}</p></section>
    <h2>Où il est employé</h2>${ex.length ? `<ul class="liste-cat">${ex.map(e => `<li><button type="button" data-id="${esc(e.id)}"><b>${esc(e.titre)}</b><span class="meta">${e.type} · ${esc(e.niveau)}</span></button></li>`).join("")}</ul>` : `<p class="petit">Aucun programme du catalogue ne l'emploie encore.</p>`}`;
  $("fiche").querySelectorAll("button[data-id]").forEach(b => b.onclick = () => { vue("catalogue"); location.hash = "#" + b.dataset.id; });
}
function listeProjets() {
  const l = Projets.liste(); $("liste-projets").innerHTML = l.length ? l.map(p => `<li><button type="button" data-p="${esc(p.id)}"><b>${esc(p.titre)}</b><span class="meta">modifié le ${new Date(p.maj).toLocaleDateString("fr-FR")}</span></button></li>`).join("") : `<li class="petit">Aucun projet pour l'instant. Enregistre un programme du catalogue, ou un projet depuis le Studio.</li>`;
  $("liste-projets").querySelectorAll("button").forEach(b => b.onclick = () => ficheProjet(b.dataset.p));
}
function ficheProjet(id) {
  arreter(); const p = Projets.trouver(id); if (!p) return; etat.courant = null; panneau("fiche");
  $("fiche").innerHTML = `<span class="etiq-domaine">Mon projet</span><h1>${esc(p.titre)}</h1><div class="actions-prog"><button type="button" class="principal" id="b-p-studio">Ouvrir dans le Studio</button><button type="button" id="b-p-suppr">Supprimer</button></div><div class="zone-code" id="zone-code"></div><p class="petit">Le projet reste dans ce navigateur.</p>`;
  const ed = new Editeur($("zone-code"), {}); ed.valeur = p.source; ed.ta.readOnly = true; ed.ta.setAttribute("aria-label", "Code du projet, en lecture seule");
  $("b-p-studio").onclick = () => versStudio(p.source, p.titre, null);
  $("b-p-suppr").onclick = () => { if (confirm(`Supprimer « ${p.titre} » ?`)) { Projets.supprimer(id); listeProjets(); $("fiche").innerHTML = `<p class="petit">Projet supprimé.</p>`; } };
}

// ---------------------------------------------------------------- écoute
async function ecouter(e, bouton, msg) {
  if (etat.marche) return arreter();
  let module; try { module = preparer(e.code); } catch (er) { msg.textContent = "Ce programme ne se compile pas : " + String(er.message).split(" | ")[0]; return; }
  msg.textContent = "";
  try {
    const d = Moteur.diagnostic(); if (!d.ok) throw new ErreurMoteur(d.code, d.raison);
    etat.moteur = etat.moteur || new Moteur(); await etat.moteur.demarrer(); await etat.moteur.charger(module);
    if (module.voix) etat.moteur.accord([[48, 220, 0.8], [49, 277.18, 0.8], [50, 329.63, 0.8]]);
    if (module.entrees.some(x => x.genre === "audio")) { const ctx = etat.moteur.ctx, n = ctx.sampleRate * 2, buf = ctx.createBuffer(1, n, ctx.sampleRate); buf.getChannelData(0).set(bruitDeTest(n)); const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.connect(etat.moteur.noeud); s.start(); etat.source = s; }
    etat.marche = true; etat.bouton = bouton; bouton.textContent = "Arrêter"; badge("en écoute", "marche");
  } catch (er) { msg.textContent = er instanceof ErreurMoteur ? er.message : String(er && er.message || er); badge("erreur", "erreur"); }
}
async function arreter() {
  if (etat.source) { try { etat.source.stop(); etat.source.disconnect(); } catch (_) {} etat.source = null; }
  if (etat.moteur && etat.marche) await etat.moteur.arreter(); etat.marche = false; if (etat.bouton) etat.bouton.textContent = "Écouter"; badge("prêt");
}
function versStudio(source, titre, exemple) {
  try { localStorage.setItem("sonora:brouillon", JSON.stringify({ source, titre, exemple, projet: null })); } catch (_) {}
  location.href = "../studio/index.html";
}

// ---------------------------------------------------------------- fiche d'un programme
const f1 = (x, d = 1) => x.toFixed(d).replace(".", ",").replace(/^-0(,0+)?$/, "0$1");
function tableProfil(p, e) {
  const m = p.mesures, l = [];
  l.push(["Niveau de crête", f1(m.crete) + " dB", p.type === "effet" ? "sur un bruit blanc de 0,3 d'amplitude" : p.voix ? "sur un accord de trois notes" : ""]);
  l.push(["Niveau efficace", f1(m.rms) + " dB", ""]);
  if (m.gain !== null) l.push(["Niveau de sortie par rapport à l'entrée", (m.gain > 0 ? "+" : "") + f1(m.gain) + " dB", "mesuré sur le bruit de test"]);
  if (p.type === "instrument" && m.f0) l.push(["Hauteur détectée", f1(m.f0, 0) + " Hz", ""]);
  l.push(["Centroïde spectral (brillance)", f1(m.centroide, 0) + " Hz", "autour du moment le plus fort"]);
  if (m.attaque !== null) l.push(["Montée de l'enveloppe (10 % à 90 %)", f1(m.attaque, 0) + " ms", ""]);
  l.push(["Réglages", String(p.reglages), p.canaux > 1 ? `${p.canaux} canaux de sortie` : "1 canal de sortie"]);
  return `<table class="mesures profil"><thead><tr><th>Grandeur</th><th>Valeur</th><th>Condition</th></tr></thead><tbody>${l.map(([a, b, c]) => `<tr><td>${esc(a)}</td><td class="n">${esc(b)}</td><td>${esc(c)}</td></tr>`).join("")}</tbody></table>`;
}
function ouvrir(id) {
  const e = par(id); if (!e) return; arreter(); etat.courant = e.id; afficherListe(); panneau("fiche"); window.scrollTo(0, 0); document.title = e.titre + " · SONORA Library";
  const mods = modulesDe(e);
  $("fiche").innerHTML = `<span class="etiq-domaine">${esc(e.origine === "Studio" ? "Exemple du Studio" : "Library")}</span><h1>${esc(e.titre)}</h1>
  <div class="badges"><span class="badge type">${e.type === "effet" ? "effet" : "instrument"}</span><span class="badge">${esc(e.niveau)}</span>${mods.map(m => `<button type="button" class="badge" data-module="${m}" title="Voir les programmes qui emploient ${m}">${m}</button>`).join("")}</div>
  <p class="explication">${esc(e.texte)}</p>
  <div class="actions-prog"><button type="button" class="principal" id="b-ecouter">Écouter</button><button type="button" id="b-studio">Ouvrir dans le Studio</button><button type="button" id="b-enreg">Enregistrer dans mes projets</button><button type="button" id="b-copier">Copier le code</button><button type="button" id="b-lien">Copier un lien de partage</button></div>
  <p class="petit" id="msg" role="status">${e.type === "effet" ? "Cet effet reçoit un bruit blanc pour l'écoute. Dans le Studio tu choisiras une autre source." : e.voix === false ? "" : ""}</p>
  <h2>Le programme</h2><div class="zone-code" id="zone-code"></div>
  <h2>Ce que mesure le son produit</h2><div id="profil"><p class="petit">Calcul sur le signal rendu…</p></div>`;
  const ed = new Editeur($("zone-code"), {}); ed.valeur = e.code; ed.ta.readOnly = true; ed.ta.setAttribute("aria-label", "Code de " + e.titre + ", en lecture seule");
  $("b-ecouter").onclick = () => ecouter(e, $("b-ecouter"), $("msg"));
  $("b-studio").onclick = () => versStudio(e.code, e.titre, e.origine === "Studio" ? e.id : null);
  $("b-enreg").onclick = () => { const p = Projets.enregistrer({ titre: e.titre, source: e.code, reglages: {} }); $("msg").textContent = p ? `Enregistré dans tes projets sous « ${e.titre} ». Tu le retrouveras dans le Studio et dans l'onglet Mes projets.` : "Le navigateur refuse d'enregistrer (stockage plein ou bloqué)."; etat.dernierProjet = p && p.id; };
  $("b-copier").onclick = async () => { try { await navigator.clipboard.writeText(e.code); $("msg").textContent = "Code copié."; } catch (_) { $("msg").textContent = "Copie refusée par le navigateur : sélectionne le code et copie-le à la main."; } };
  $("b-lien").onclick = async () => { const lien = location.origin + location.pathname.replace(/library\/[^/]*$/, "studio/index.html") + "#p=" + await encoder({ source: e.code, titre: e.titre }); etat.dernierLien = lien; try { await navigator.clipboard.writeText(lien); $("msg").textContent = `Lien copié (${lien.length} caractères) : il ouvre ce programme dans le Studio.`; } catch (_) { $("msg").textContent = "Copie refusée par le navigateur. Lien : " + lien; } };
  $("fiche").querySelectorAll("button[data-module]").forEach(b => b.onclick = () => { vue("catalogue"); $("f-module").value = b.dataset.module; etat.filtres.module = b.dataset.module; afficherListe(); panneau("liste"); });
  setTimeout(() => { if (etat.courant !== e.id) return; const p = profil(e.code); etat.profil = p; $("profil").innerHTML = p.ok ? tableProfil(p, e) : `<p class="bilan non">${esc(p.erreur)}</p>`; }, 20);
}

remplirModules(); afficherListe();
const depart = () => { const h = location.hash.slice(1); if (h && par(h)) { vue("catalogue"); ouvrir(h); } else if (!h) { $("fiche").innerHTML = `<span class="etiq-domaine">Library</span><h1>Instruments et effets prêts à l'emploi</h1><p class="explication">${ENTREES.length} programmes SONORA complets. Chaque fiche permet de l'écouter, de lire son code, de voir ce que mesure son signal, puis de l'ouvrir dans le Studio ou de l'enregistrer dans tes projets.</p><p class="petit">Choisis un programme dans la liste, ou cherche un mot : un instrument, un filtre, un module du langage.</p>`; } };
window.addEventListener("hashchange", depart); depart();
document.addEventListener("visibilitychange", () => { if (document.hidden && etat.marche) arreter(); });
window.LIBRARY_PRET = true;
