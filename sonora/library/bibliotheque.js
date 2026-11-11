// SONORA Library : catalogue d'instruments et d'effets, recherche, écoute, mesure, ouverture dans le Studio, enregistrement dans les projets.
import { Moteur, ErreurMoteur } from "../src/moteur.js?v=4898d7d9e1";
import { MODULES } from "../src/index.js?v=4898d7d9e1";
import { Editeur } from "../studio/editeur.js?v=4898d7d9e1";
import { Projets } from "../studio/projets.js?v=4898d7d9e1";
import { encoder } from "../studio/partage.js?v=4898d7d9e1";
import { ENTREES } from "./catalogue.js?v=4898d7d9e1";
import { profil, modulesEmployes, accordDeTest, bruitDeTest, melodieDeTest, sourceDe } from "./profil.js?v=4898d7d9e1";
import { trouver } from "./recherche.js?v=4898d7d9e1";
import { preparer } from "../science/executeur.js?v=4898d7d9e1";
import { heros, etatBouton } from "../studio/heros.js?v=4898d7d9e1";
import { dessinerOscillo } from "../studio/visuels.js?v=4898d7d9e1";
import { lireProposition, lireClasse, construireClasse, sérialiser, valider, FORMAT_CLASSE, LIMITES } from "./classe.js?v=4898d7d9e1";

const TOUS = [...ENTREES];
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const etat = { courant: null, moteur: null, marche: false, vue: "catalogue", filtres: { requete: "", type: "", niveau: "", module: "", origine: "" }, classe: { entrees: [], ecartees: 0, erreur: null } };
window.LIBRARY = etat;
const badge = (t, c = "") => { const e = $("etat"); e.textContent = t; e.className = "etat " + c; };
const memo = new Map(); const modulesDe = e => memo.get(e.id) || (memo.set(e.id, modulesEmployes(e.code)), memo.get(e.id));
const par = id => TOUS.find(e => e.id === id);
function panneau(p) { $("sciences").dataset.actif = p; document.querySelectorAll("#onglets-mobiles button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.p === p))); }
document.querySelectorAll("#onglets-mobiles button").forEach(b => b.onclick = () => panneau(b.dataset.p));

// ---------------------------------------------------------------- catalogue
function remplirModules() { const s = $("f-module"), tous = [...new Set(TOUS.flatMap(modulesDe))].sort(); for (const m of tous) { const o = document.createElement("option"); o.value = m; o.textContent = m; s.appendChild(o); } }
function afficherListe() {
  const f = etat.filtres, res = trouver(TOUS, f, modulesDe); etat.resultats = res.map(e => e.id);
  $("compte").textContent = `${res.length} programme${res.length > 1 ? "s" : ""} sur ${TOUS.length}`;
  $("resultats").innerHTML = res.length ? res.map(e => `<li><button type="button" data-id="${esc(e.id)}" aria-current="${etat.courant === e.id}"><b>${esc(e.titre)}</b><span class="meta">${e.type === "effet" ? "effet" : "instrument"}, ${esc(e.niveau)}${e.origine === "Classe" ? ", classe" : ""}</span></button></li>`).join("") : `<li class="petit">Rien ne correspond. Essaie un mot plus court, ou retire un filtre.</li>`;
  $("resultats").querySelectorAll("button").forEach(b => b.onclick = () => { location.hash = "#" + b.dataset.id; });
}
for (const [id, cle] of [["q", "requete"], ["f-type", "type"], ["f-niveau", "niveau"], ["f-module", "module"], ["f-origine", "origine"]]) $(id).addEventListener("input", () => { etat.filtres[cle] = $(id).value; afficherListe(); });
function vue(v) {
  etat.vue = v; for (const x of ["catalogue", "modules", "projets", "depot"]) $("v-" + x).hidden = x !== v;
  document.querySelectorAll("#vues button").forEach(b => b.setAttribute("aria-selected", String(b.dataset.v === v)));
  if (v === "modules") listeModules(); if (v === "projets") listeProjets(); if (v === "depot") afficherDepot();
}
document.querySelectorAll("#vues button").forEach(b => b.onclick = () => vue(b.dataset.v));

function listeModules() {
  const noms = Object.keys(MODULES).filter(n => !n.startsWith("lib_")).sort((a, b) => MODULES[a].famille.localeCompare(MODULES[b].famille, "fr") || a.localeCompare(b));
  $("liste-modules").innerHTML = noms.map(n => { const m = MODULES[n], n_ex = TOUS.filter(e => modulesDe(e).includes(n)).length; return `<li><button type="button" data-module="${n}"><b>${n}</b><span class="meta">${esc(m.famille)}, ${m.impl ? `${n_ex} programme${n_ex > 1 ? "s" : ""}` : "pas encore disponible"}</span></button></li>`; }).join("");
  $("liste-modules").querySelectorAll("button").forEach(b => b.onclick = () => ficheModule(b.dataset.module));
}
function ficheModule(n) {
  arreter(); etat.courant = null; const m = MODULES[n], ex = TOUS.filter(e => modulesDe(e).includes(n));
  panneau("fiche");
  $("fiche").innerHTML = `<span class="etiq-domaine">${esc(m.famille)}</span><h1>${esc(n)}</h1><section class="mod-fiche"><p>${esc(m.doc)}</p>
    <table class="mesures"><thead><tr><th>Paramètre</th><th>Type</th><th>Défaut</th></tr></thead><tbody>${m.params.map(p => `<tr><td>${esc(p.nom)}</td><td>${esc(p.t)}${p.rmax === "k" ? " (contrôle)" : ""}</td><td>${p.defaut === undefined ? "obligatoire" : esc(String(p.defaut))}</td></tr>`).join("")}</tbody></table>
    <p class="petit">${m.impl ? "Disponible." : "Pas encore disponible : le compilateur le vérifie mais refuse de le jouer (E801)."}${m.compose ? " Écrit en SONORA dans la bibliothèque du langage." : ""}</p></section>
    <h2>Où il est employé</h2>${ex.length ? `<ul class="liste-cat">${ex.map(e => `<li><button type="button" data-id="${esc(e.id)}"><b>${esc(e.titre)}</b><span class="meta">${e.type}, ${esc(e.niveau)}</span></button></li>`).join("")}</ul>` : `<p class="petit">Aucun programme du catalogue ne l'emploie encore.</p>`}`;
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
const points = (...a) => window.COURS_POINTS ? window.COURS_POINTS.gagner(...a) : (window.__pointsEnAttente = window.__pointsEnAttente || []).push(a); // points du cours (sonora/barre-cours.js)
async function ecouter(e, bouton, msg) {
  if (etat.marche) return arreter();
  let module; try { module = preparer(e.code); } catch (er) { msg.textContent = "Ce programme ne se compile pas : " + String(er.message).split(" | ")[0]; return; }
  msg.textContent = "";
  try {
    const d = Moteur.diagnostic(); if (!d.ok) throw new ErreurMoteur(d.code, d.raison);
    if (!etat.moteur) etat.moteur = new Moteur().on("analyse", a => { etat.tampon = a.tampon; }); await etat.moteur.demarrer(); etat.moteur.activerAnalyse(true); await etat.moteur.charger(module);
    if (module.voix) etat.moteur.accord([[48, 220, 0.8], [49, 277.18, 0.8], [50, 329.63, 0.8]]);
    if (module.entrees.some(x => x.genre === "audio")) brancherSource(e);
    etat.marche = true; etat.bouton = bouton; etatBouton(bouton, true); badge("en écoute", "marche"); if (e.id) { const jeton = etat.jetonEcoute = (etat.jetonEcoute || 0) + 1; setTimeout(() => { if (etat.marche && etat.jetonEcoute === jeton) (etat.ecoutees = etat.ecoutees || new Set()).add(e.id); }, 8000); } // écouté 8 s sans interruption
  } catch (er) { msg.textContent = er instanceof ErreurMoteur ? er.message : String(er && er.message || er); badge("erreur", "erreur"); }
}
async function arreter() {
  if (etat.source) { try { etat.source.stop(); etat.source.disconnect(); } catch (_) {} etat.source = null; }
  etat.jetonEcoute = (etat.jetonEcoute || 0) + 1; if (etat.moteur && etat.marche) await etat.moteur.arreter(); etat.marche = false; if (etat.bouton) etatBouton(etat.bouton, false); badge("prêt");
}
function versStudio(source, titre, exemple) {
  try { localStorage.setItem("sonora:brouillon", JSON.stringify({ source, titre, exemple, projet: null })); } catch (_) {}
  try { localStorage.setItem("sonora:mode", "programmation"); } catch (_) {} location.href = "../studio/index.html";
}

// Source d'essai d'un effet : une mélodie par défaut (on entend ce que l'effet fait à un son identifiable), du bruit pour les effets qui le demandent.
const sourceChoisie = e => etat.sources && etat.sources[e.id] || sourceDe(e);
function brancherSource(e) {
  if (etat.source) { try { etat.source.stop(); } catch (_) {} try { etat.source.disconnect(); } catch (_) {} etat.source = null; }
  const ctx = etat.moteur.ctx, n = ctx.sampleRate * 2, buf = ctx.createBuffer(1, n, ctx.sampleRate);
  buf.getChannelData(0).set(sourceChoisie(e) === "bruit" ? bruitDeTest(n) : melodieDeTest(n, ctx.sampleRate));
  const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.connect(etat.moteur.noeud); s.start(); etat.source = s;
}
// ---------------------------------------------------------------- fiche d'un programme
const f1 = (x, d = 1) => x.toFixed(d).replace(".", ",").replace(/^-0(,0+)?$/, "0$1");
function tableProfil(p, e) {
  const m = p.mesures, l = [];
  l.push(["Niveau de crête", f1(m.crete) + " dB", p.type === "effet" ? (p.source === "melodie" ? "sur la mélodie d'essai (quatre notes, 0,3 d'amplitude)" : "sur un bruit blanc de 0,3 d'amplitude") : p.voix ? "sur un accord de trois notes" : ""]);
  l.push(["Niveau efficace", f1(m.rms) + " dB", ""]);
  if (m.gain !== null) l.push(["Niveau de sortie par rapport à l'entrée", (m.gain > 0 ? "+" : "") + f1(m.gain) + " dB", p.source === "melodie" ? "mesuré sur la mélodie d'essai" : "mesuré sur le bruit de test"]);
  if (p.identite) { const i = p.identite; l.push(["La note reste identifiable", i.conserve ? "oui" : "non", "la fondamentale de 277 Hz reste un pic dominant"]); l.push(["Harmoniques 4 à 8 ajoutées", i.harmoniquesAjoutees < -80 ? "aucune" : f1(i.harmoniquesAjoutees, 0) + " dB", i.harmoniquesAjoutees < -80 ? "l'effet n'ajoute pas de harmoniques" : "sous la fondamentale ; la mélodie d'essai n'en contient pas"]); }
  if (p.type === "instrument" && m.f0) l.push(["Hauteur détectée", f1(m.f0, 0) + " Hz", ""]);
  l.push(["Centroïde spectral (brillance)", f1(m.centroide, 0) + " Hz", "autour du moment le plus fort"]);
  if (m.attaque !== null) l.push(["Montée de l'enveloppe (10 % à 90 %)", f1(m.attaque, 0) + " ms", ""]);
  l.push(["Réglages", String(p.reglages), p.canaux > 1 ? `${p.canaux} canaux de sortie` : "1 canal de sortie"]);
  return `<table class="mesures profil"><thead><tr><th>Grandeur</th><th>Valeur</th><th>Condition</th></tr></thead><tbody>${l.map(([a, b, c]) => `<tr><td>${esc(a)}</td><td class="n">${esc(b)}</td><td>${esc(c)}</td></tr>`).join("")}</tbody></table>`;
}
function ouvrir(id) {
  const e = par(id); if (!e) return; arreter(); etat.courant = e.id; afficherListe(); panneau("fiche"); window.scrollTo(0, 0); document.title = e.titre + ", SONORA Library";
  const mods = modulesDe(e);
  const origineTxt = e.origine === "Studio" ? "Exemple du Studio" : e.origine === "Classe" ? "Créé par la classe" + (e.pseudo ? " : " + e.pseudo : "") : "Library";
  const aideTxt = e.type === "effet" ? (sourceChoisie(e) === "bruit" ? "C'est un effet : pour l'écoute, il reçoit un bruit blanc, qui fait entendre ce qu'il enlève ou déplace." : "C'est un effet : pour l'écoute, il reçoit une mélodie de quatre notes, pour que tu entendes ce qu'il change à un son reconnaissable.") : /polyphonie/.test(e.code) ? "Tu entends un accord de trois notes. Dans le Studio, tu le joueras au clavier." : "Ouvre-le dans le Studio pour régler ses curseurs ou modifier son programme.";
  $("fiche").innerHTML = heros({ etiquette: origineTxt, titre: e.titre, texte: e.texte, aide: aideTxt }) + `
  <div class="badges"><span class="badge type">${e.type === "effet" ? "effet" : "instrument"}</span><span class="badge">${esc(e.niveau)}</span>${mods.map(m => `<button type="button" class="badge" data-module="${m}" title="Voir les programmes qui emploient ${m}">${m}</button>`).join("")}</div>
  ${e.type === "effet" ? `<label class="champ source-essai">Source d'essai <select id="src-essai"><option value="melodie"${sourceChoisie(e) === "melodie" ? " selected" : ""}>Mélodie de quatre notes</option><option value="bruit"${sourceChoisie(e) === "bruit" ? " selected" : ""}>Bruit blanc</option></select></label>` : ""}
  <div class="actions-prog"><button type="button" class="principal" id="b-studio">Ouvrir dans le Studio</button><button type="button" id="b-enreg">Enregistrer dans mes projets</button><button type="button" id="b-copier">Copier le code</button><button type="button" id="b-lien">Copier un lien de partage</button></div>
  <p class="petit" id="msg" role="status"></p>
  <h2>Le programme</h2><div class="zone-code" id="zone-code"></div>
  <h2>Ce que mesure le son produit</h2><div id="profil"><p class="petit">Calcul sur le signal rendu…</p></div>`;
  const ed = new Editeur($("zone-code"), {}); ed.valeur = e.code; ed.ta.readOnly = true; ed.ta.setAttribute("aria-label", "Code de " + e.titre + ", en lecture seule");
  $("b-ecouter").onclick = () => ecouter(e, $("b-ecouter"), $("msg"));
  if (etat.arretLecture) etat.arretLecture(); etat.arretLecture = window.COURS_POINTS ? window.COURS_POINTS.lecture($("fiche"), "library:" + e.id, 2, "sonora", { condition: () => !!(etat.ecoutees && etat.ecoutees.has(e.id)) }) : null; // points : écouté 8 s et fiche lue jusqu'au bout
  if ($("src-essai")) $("src-essai").onchange = ev => { (etat.sources = etat.sources || {})[e.id] = ev.target.value; if (etat.marche && etat.moteur) brancherSource(e); const p = profil(e.code, { source: ev.target.value, transpose: e.transpose || 1 }); etat.profil = p; $("profil").innerHTML = p.ok ? tableProfil(p, e) : `<p class="bilan non">${esc(p.erreur)}</p>`; };
  $("b-studio").onclick = () => versStudio(e.code, e.titre, e.origine === "Studio" ? e.id : null);
  $("b-enreg").onclick = () => { const p = Projets.enregistrer({ titre: e.titre, source: e.code, reglages: {} }); $("msg").textContent = p ? `Enregistré dans tes projets sous « ${e.titre} ». Tu le retrouveras dans le Studio et dans l'onglet Mes projets.` : "Le navigateur refuse d'enregistrer (stockage plein ou bloqué)."; etat.dernierProjet = p && p.id; };
  $("b-copier").onclick = async () => { try { await navigator.clipboard.writeText(e.code); $("msg").textContent = "Code copié."; } catch (_) { $("msg").textContent = "Copie refusée par le navigateur : sélectionne le code et copie-le à la main."; } };
  $("b-lien").onclick = async () => { const lien = location.origin + location.pathname.replace(/library\/[^/]*$/, "studio/index.html") + "#p=" + await encoder({ source: e.code, titre: e.titre }); etat.dernierLien = lien; try { await navigator.clipboard.writeText(lien); $("msg").textContent = `Lien copié (${lien.length} caractères) : il ouvre ce programme dans le Studio.`; } catch (_) { $("msg").textContent = "Copie refusée par le navigateur. Lien : " + lien; } };
  $("fiche").querySelectorAll("button[data-module]").forEach(b => b.onclick = () => { vue("catalogue"); $("f-module").value = b.dataset.module; etat.filtres.module = b.dataset.module; afficherListe(); panneau("liste"); });
  setTimeout(() => { if (etat.courant !== e.id) return; const p = profil(e.code, { source: e.type === "effet" ? sourceChoisie(e) : "bruit", transpose: e.transpose || 1 }); etat.profil = p; $("profil").innerHTML = p.ok ? tableProfil(p, e) : `<p class="bilan non">${esc(p.erreur)}</p>`; }, 20);
}

// ---------------------------------------------------------------- catalogue de la classe : chargement du fichier publié
async function chargerClasse() {
  try {
    const r = await fetch(new URL("classe.json", import.meta.url)); if (!r.ok) return;
    const c = lireClasse(await r.json()); etat.classe = c;
    const ids = new Set(TOUS.map(e => e.id)); for (const e of c.entrees) if (!ids.has(e.id)) TOUS.push(e); else etat.classe.ecartees++;
    if (c.erreur) console.warn(c.erreur);
  } catch (_) { /* pas de catalogue de classe : la Library fonctionne sans */ }
}

// ---------------------------------------------------------------- dépôt : le professeur relit les propositions et exporte classe.json
const CLE_DEPOT = "sonora:depot";
const lireDepot = () => { try { const d = JSON.parse(localStorage.getItem(CLE_DEPOT) || "null"); return d && Array.isArray(d.items) ? d.items : []; } catch (_) { return []; } };
const ecrireDepot = items => { try { localStorage.setItem(CLE_DEPOT, JSON.stringify({ items })); return true; } catch (_) { return false; } };
const telecharger = (nom, texte, type) => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([texte], { type })); a.download = nom; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); };
function depotAvecPublies() {
  const items = lireDepot(), ids = new Set(items.map(i => i.entree.id));
  for (const e of etat.classe.entrees) if (!ids.has(e.id)) items.push({ nom: "classe.json publié", entree: { id: e.id, titre: e.titre, texte: e.texte, code: e.code, mots: e.mots, niveau: e.niveau, pseudo: e.pseudo, type: e.type }, avertissements: [], accepte: true, publie: true });
  return items;
}
async function importer(fichiers) {
  const items = depotAvecPublies(), ids = new Set(items.map(i => i.entree.id)), rapport = [];
  for (const f of [...fichiers].slice(0, LIMITES.propositions)) {
    let texte; try { texte = await f.text(); } catch (_) { rapport.push(`${f.name} : illisible.`); continue; }
    if (texte.length > 5 * LIMITES.fichier) { rapport.push(`${f.name} : fichier trop gros.`); continue; }
    let o = null; try { o = JSON.parse(texte); } catch (_) {}
    if (o && o.format === FORMAT_CLASSE) { const c = lireClasse(o); let n = 0; for (const e of c.entrees) if (!ids.has(e.id)) { ids.add(e.id); items.push({ nom: f.name, entree: { id: e.id, titre: e.titre, texte: e.texte, code: e.code, mots: e.mots, niveau: e.niveau, pseudo: e.pseudo, type: e.type }, avertissements: [], accepte: true, publie: true }); n++; } rapport.push(`${f.name} : catalogue de classe, ${n} programme${n > 1 ? "s" : ""} ajouté${n > 1 ? "s" : ""}${c.ecartees ? `, ${c.ecartees} écarté${c.ecartees > 1 ? "s" : ""} (invalide)` : ""}.`); continue; }
    const v = lireProposition(texte, { ids });
    if (!v.ok) { rapport.push(`${f.name} : refusée. ${v.erreurs.join(" ")}`); continue; }
    if (ids.has(v.entree.id)) { rapport.push(`${f.name} : déjà dans le dépôt, ignorée.`); continue; }
    ids.add(v.entree.id); const m = v.profil.mesures;
    items.push({ nom: f.name, entree: v.entree, avertissements: v.avertissements, accepte: false, resume: { crete: m.crete, rms: m.rms }, publie: false }); rapport.push(`${f.name} : relue, à accepter ou non.`);
  }
  if (!ecrireDepot(items)) rapport.push("Le navigateur refuse d'enregistrer le dépôt (stockage plein ou bloqué).");
  $("d-etat").textContent = rapport.join(" "); etat.rapportDepot = rapport; afficherDepot();
}
function afficherDepot() {
  arreter(); etat.courant = null; panneau("fiche"); const items = depotAvecPublies(); etat.depot = items;
  const acceptes = items.filter(i => i.accepte).length;
  $("fiche").innerHTML = `<span class="etiq-domaine">Dépôt de la classe</span><h1>Relire et accepter</h1>
  <p class="explication">${items.length ? `${items.length} programme${items.length > 1 ? "s" : ""} dans le dépôt, ${acceptes} accepté${acceptes > 1 ? "s" : ""}. Seuls les programmes cochés partent dans classe.json.` : "Le dépôt est vide. Importe les fichiers de proposition remis par les élèves."}</p>
  <p class="petit">Les mesures disent si le programme compile et s'il sature. Elles ne disent rien du titre, de la description ni du pseudonyme : c'est toi qui relis.</p>
  <div id="d-liste">${items.map((it, i) => `<section class="depot-item" data-i="${i}" aria-label="${esc(it.entree.titre)}">
    <label class="d-acc-l"><input type="checkbox" class="d-acc" ${it.accepte ? "checked" : ""}> Accepter dans le catalogue de la classe${it.publie ? " (déjà publié)" : ""}</label>
    <label class="champ">Titre<input type="text" class="d-titre" maxlength="${LIMITES.titre}" value="${esc(it.entree.titre)}"></label>
    <label class="champ">Description<textarea class="d-texte" rows="2" maxlength="${LIMITES.texte}">${esc(it.entree.texte)}</textarea></label>
    <div class="rang"><label class="champ" style="flex:1">Pseudonyme<input type="text" class="d-pseudo" maxlength="${LIMITES.pseudo}" value="${esc(it.entree.pseudo)}"></label>
    <label class="champ" style="flex:1">Niveau<select class="d-niveau">${["Découverte", "Programmation", "Recherche"].map(n => `<option${n === it.entree.niveau ? " selected" : ""}>${n}</option>`).join("")}</select></label></div>
    <div class="badges"><span class="badge type">${esc(it.entree.type)}</span>${it.resume ? `<span class="badge">crête ${it.resume.crete.toFixed(1).replace(".", ",")} dB</span>` : ""}<span class="badge">${esc(it.nom)}</span></div>
    ${it.avertissements.length ? `<ul class="pr-av">${it.avertissements.map(a => `<li>${esc(a)}</li>`).join("")}</ul>` : ""}
    <details class="prog"><summary>Voir le programme</summary><pre>${esc(it.entree.code)}</pre></details>
    <div class="actions-prog"><button type="button" class="d-ecouter">Écouter</button><button type="button" class="d-retirer">Retirer du dépôt</button></div><p class="petit d-msg"></p></section>`).join("")}</div>`;
  $("fiche").querySelectorAll(".depot-item").forEach(sec => {
    const i = +sec.dataset.i, it = items[i], maj = () => { it.entree.titre = sec.querySelector(".d-titre").value; it.entree.texte = sec.querySelector(".d-texte").value; it.entree.pseudo = sec.querySelector(".d-pseudo").value; it.entree.niveau = sec.querySelector(".d-niveau").value; it.accepte = sec.querySelector(".d-acc").checked; ecrireDepot(items); };
    sec.querySelectorAll("input, textarea, select").forEach(c => c.addEventListener("input", maj)); sec.querySelector(".d-acc").addEventListener("change", () => { maj(); afficherDepotCompte(); });
    sec.querySelector(".d-ecouter").onclick = ev => ecouter({ ...it.entree }, ev.target, sec.querySelector(".d-msg"));
    sec.querySelector(".d-retirer").onclick = () => { items.splice(i, 1); ecrireDepot(items); if (it.publie) etat.classe.entrees = etat.classe.entrees.filter(e => e.id !== it.entree.id); afficherDepot(); };
  });
}
function afficherDepotCompte() { const n = etat.depot.filter(i => i.accepte).length; const p = $("fiche").querySelector(".explication"); if (p) p.textContent = `${etat.depot.length} programme${etat.depot.length > 1 ? "s" : ""} dans le dépôt, ${n} accepté${n > 1 ? "s" : ""}. Seuls les programmes cochés partent dans classe.json.`; }
$("d-fichiers").addEventListener("change", e => importer(e.target.files).then(() => { e.target.value = ""; }));
$("d-vider").onclick = () => { if (confirm("Vider tout le dépôt de ce navigateur ? Les programmes déjà publiés dans classe.json ne sont pas touchés.")) { ecrireDepot([]); etat.classe.entrees = []; etat.depot = []; $("d-etat").textContent = "Dépôt vidé."; afficherDepot(); } };
$("d-exporter").onclick = () => {
  const items = depotAvecPublies().filter(i => i.accepte), problemes = [];
  for (const it of items) { const e = it.entree; const r = valider({ format: "sonora-proposition", version: 1, titre: e.titre, texte: e.texte, pseudo: e.pseudo, mots: e.mots, code: e.code }); if (!r.ok) problemes.push(`« ${e.titre || "sans titre"} » : ${r.erreurs.join(" ")}`); }
  if (!items.length) { $("d-etat").textContent = "Rien n'est accepté : coche au moins un programme."; return; }
  if (problemes.length) { $("d-etat").textContent = "Export impossible. " + problemes.join(" "); etat.problemesExport = problemes; return; }
  const classe = construireClasse(items.map(i => i.entree)), texte = sérialiser(classe); etat.dernierExport = classe; telecharger("classe.json", texte, "application/json");
  $("d-etat").textContent = `classe.json exporté : ${classe.entrees.length} programme${classe.entrees.length > 1 ? "s" : ""}. Remplace le fichier sonora/library/classe.json du dépôt, puis régénère le site (python3 outils/site.py) et publie.`;
};

await chargerClasse();
remplirModules(); afficherListe();
const depart = () => { const h = location.hash.slice(1); if (h && par(h)) { vue("catalogue"); ouvrir(h); } else if (!h) { $("fiche").innerHTML = `<span class="etiq-domaine">Library</span><h1>Instruments et effets prêts à l'emploi</h1><p class="explication">${TOUS.length} programmes SONORA complets. Chaque fiche permet de l'écouter, de lire son code, de voir ce que mesure son signal, puis de l'ouvrir dans le Studio ou de l'enregistrer dans tes projets.</p><p class="petit">Choisis un programme dans la liste, ou cherche un mot : un instrument, un filtre, un module du langage.</p>`; } };
window.addEventListener("hashchange", depart); depart();
document.addEventListener("visibilitychange", () => { if (document.hidden && etat.marche) arreter(); });
(function boucle(t) { requestAnimationFrame(boucle); const c = document.getElementById("heros-onde"); if (c) dessinerOscillo(c, etat.marche ? etat.tampon : null); })(0);
window.LIBRARY_PRET = true;
