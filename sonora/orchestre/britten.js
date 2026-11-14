// SONORA Orchestre, espace 02 : écouter Britten. Un guide d'écoute : l'œuvre est protégée, aucun enregistrement n'est fourni ici. On écoute ailleurs (en classe, en bibliothèque, sur une plateforme autorisée)
// et ce guide indique, section après section, qui joue, avec le timbre de l'instrument enregistré dans la banque du site et un jeu pour remettre les entrées de la fugue dans l'ordre.
import { FAMILLES, parId } from "./donnees.js?v=069e00adf6";
import { liensEcoute } from "./ecoutes.js?v=069e00adf6";
import { htmlGlossaire } from "./fugue_glossaire.js?v=069e00adf6";
import { RECHERCHE_OEUVRE, RECHERCHE_PURCELL, rechercheSection, OEUVRE, CONTEXTE, EFFECTIF, THEME, VARIATIONS, FUGUE, parcoursOeuvre, melangeFugue, trous, banqueDeMots, CARACTERES, NOMS_EXPOSITION, ATTENDU, verifierTableau } from "./britten_logique.js?v=069e00adf6";
import { alea } from "./timbres_logique.js?v=069e00adf6";
import { registresDe_ } from "./audio_aide.js?v=069e00adf6";
import { jouer, message } from "./audio.js?v=069e00adf6";

const $ = id => document.getElementById(id), CLE = "sonora.orchestre.britten";
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const PARCOURS = parcoursOeuvre(), etat = { pos: 0, reconnues: {}, notes: {}, jeu: null, trous: [], verifTrous: false, tableau: [{}, {}, {}, {}, {}, {}], verifTableau: false };
let visuelDe = null;

function lire() { try { const s = JSON.parse(localStorage.getItem(CLE)); if (s && s.reconnues) etat.reconnues = s.reconnues; if (s && s.notes) etat.notes = s.notes; } catch (e) {} }
function sauver() { try { localStorage.setItem(CLE, JSON.stringify({ reconnues: etat.reconnues, notes: etat.notes })); } catch (e) {} }
const nbReconnues = () => PARCOURS.filter(s => etat.reconnues[s.cle]).length;

function vignettes(ids, t) { return ids.slice(0, 6).map(id => '<span class="vig">' + visuelDe(id, t, parId(id).nom) + "</span>").join(""); }
function entendre(ids) { const inst = parId(ids[0]); const r = registresDe_(inst); if (r) jouer(inst, [r[1]]); else message("pas d'enregistrement pour cet instrument"); }

function carte() {
  const s = PARCOURS[etat.pos], fam = s.famille ? FAMILLES[s.famille] : null, quoi = s.partie === "theme" ? "Le thème" : s.partie === "variations" ? "Les variations" : "La fugue";
  let h = '<div class="carte-etape" style="--c:' + (fam ? fam.couleur : "var(--acide)") + ";--p:" + (fam ? fam.pale : "#F4F3EC") + '"><span class="etq">' + quoi + " " + (etat.pos + 1) + " / " + PARCOURS.length + "</span><h3>" + esc(s.titre) + "</h3>";
  if (s.ids.length) h += '<div class="vignettes">' + vignettes(s.ids, 70) + "</div>"; else h += '<p class="legende">Tous les instruments jouent.</p>';
  if (s.caractere) h += '<p class="carac"><span class="etq">Caractère</span> ' + esc(s.caractere) + "</p>";
  if (s.partie === "theme") h += "<p>" + (s.cle === "t-tutti" ? "Le thème de Purcell est d'abord exposé par tout l'orchestre." : s.cle === "t-tutti2" ? "Pour finir, tout l'orchestre rejoue le thème." : "Le même thème, repris par " + esc(s.titre.replace("Thème : ", "")) + " : écoute comme la couleur change sans que la mélodie change.") + "</p>";
  if (s.partie === "variations") h += "<p>Le thème est transformé, joué par " + esc(VARIATIONS.find(v => "v-" + v.lettre === s.cle).nom.toLowerCase()) + ". Repère le timbre, puis ce qui change par rapport au thème.</p>";
  if (s.partie === "fugue") h += '<div class="fugue-britten"><h4>La fugue de Britten, en trois temps</h4><ol>'
    + "<li><b class=\"nb\">Le sujet</b> Le sujet de la fugue est une mélodie nouvelle, écrite par Britten : ce n'est pas le thème de Purcell. Il est d'abord confié à un seul instrument, le piccolo.</li>"
    + "<li><b class=\"nb\">L'exposition</b> Puis chaque instrument ou groupe entre à son tour avec ce même sujet, famille après famille : les bois, les cordes avec la harpe, les cuivres, enfin les percussions. Chaque entrée s'ajoute aux précédentes : l'orchestre se remplit voix après voix, comme dans une fugue à quinze voix.</li>"
    + "<li><b class=\"nb\">Les deux thèmes ensemble</b> Pour finir, le thème de Purcell revient aux cuivres, et il se superpose au sujet de la fugue, que les autres instruments continuent de jouer. On entend donc deux thèmes à la fois, avec deux orchestrations différentes : les cuivres d'un côté, le reste de l'orchestre de l'autre.</li></ol>"
    + '<p class="legende">Ce déroulement est celui que l\'on décrit couramment ; à vérifier avec la partition. Tu peux construire toi-même une fugue complète, avec divertissement, strette, pédale et conclusion, dans l\'étape 05.</p>' + htmlGlossaire(false) + "</div>";
  h += '<p class="ecoute-section"><span class="etq">Écouter cette section</span> ' + liensEcoute(rechercheSection(s), s.titre) + "</p>";
  if (s.ids.length) h += '<div class="rangee"><button type="button" data-entendre="' + s.ids[0] + '">Entendre ' + esc(parId(s.ids[0]).nom.toLowerCase()) + '</button></div>';
  const nt = etat.notes[s.cle] || {};
  h += '<div class="ma-desc"><h4>Ma description personnelle</h4><div class="cercles">' + [["pense", "Ça me fait penser à…"], ["gout", "Ça me donne le goût de…"], ["sens", "Ça me fait sentir…"]].map(x => '<label class="cercle">' + x[1] + '<textarea data-note="' + x[0] + '" rows="3" maxlength="300">' + esc(nt[x[0]] || "") + "</textarea></label>").join("") + "</div></div>";
  h += '<label class="reco"><input type="checkbox" id="reco"' + (etat.reconnues[s.cle] ? " checked" : "") + "> Je l'ai reconnue à l'écoute</label>";
  h += '<div class="nav-instr"><button type="button" id="b-prec"' + (etat.pos === 0 ? " disabled" : "") + '>&#8249; Section précédente</button><button type="button" class="principal" id="b-suiv"' + (etat.pos === PARCOURS.length - 1 ? " disabled" : "") + ">Section suivante &#8250;</button></div></div>";
  return h;
}
function frise() {
  return '<ol class="frise">' + PARCOURS.map((s, i) => '<li><button type="button" data-pos="' + i + '" aria-current="' + (i === etat.pos) + '" class="' + (etat.reconnues[s.cle] ? "fait" : "") + '" style="--c:' + (s.famille ? FAMILLES[s.famille].couleur : "var(--acide)") + '" aria-label="' + esc(s.titre + (etat.reconnues[s.cle] ? ", reconnue" : "")) + '"><span>' + (s.partie === "variations" ? s.cle.slice(2) : s.partie === "theme" ? "T" + (i + 1) : "F") + "</span></button></li>").join("") + "</ol>";
}
function ordre() {
  const j = etat.jeu; if (!j) return '<div class="jeu-ordre"><h3>Jeu : remets les entrées de la fugue dans l\'ordre</h3><p>Dans la fugue, les instruments entrent un à un. Touche-les dans l\'ordre où ils entrent.</p><div class="actions-fiche"><button type="button" class="principal" id="j-demarrer">Commencer</button></div></div>';
  const fini = j.suivant >= FUGUE.length;
  return '<div class="jeu-ordre"><h3>Jeu : remets les entrées de la fugue dans l\'ordre</h3><p id="j-etat" role="status" aria-live="polite">' + (fini ? "Bravo, " + j.erreurs + (j.erreurs > 1 ? " erreurs" : " erreur") + " : l'ordre est juste." : "Entrée n° " + (j.suivant + 1) + " sur " + FUGUE.length + ". " + (j.erreurs ? j.erreurs + (j.erreurs > 1 ? " erreurs." : " erreur.") : "")) + '</p><div class="puces">'
    + j.liste.map(f => '<button type="button" data-f="' + f.id + '"' + (j.faits.indexOf(f.id) >= 0 ? " disabled class=\"pris\"" : "") + ">" + (j.faits.indexOf(f.id) >= 0 ? (j.faits.indexOf(f.id) + 1) + ". " : "") + esc(f.nom) + "</button>").join("") + '</div><div class="actions-fiche"><button type="button" id="j-refaire">Recommencer</button></div></div>';
}
function effectif() {
  return '<div class="effectif-oeuvre"><h3>Qui joue dans l\'œuvre ?</h3><ul class="chips">' + EFFECTIF.map(e => '<li><span class="vig petit">' + visuelDe(e.ids[0], 46, "") + "</span><span><span class=\"nb\">" + esc(e.nom) + "</span> " + esc(e.n) + "</span></li>").join("") + "</ul></div>";
}
function exercices() {
  const t = trous(), banque = banqueDeMots(); let h = '<div class="exercices"><h3>Exercice 1 : les mots de l\'œuvre</h3><p>Complète le texte avec les mots proposés.</p><p class="texte-trous">';
  t.segments.forEach((seg, i) => { h += esc(seg); if (i < t.reponses.length) { const rep = etat.trous[i] || "", ok = etat.verifTrous ? rep === t.reponses[i] : null; h += '<select data-trou="' + i + '" aria-label="Mot ' + (i + 1) + '"' + (ok === true ? ' class="juste"' : ok === false ? ' class="faux"' : "") + '><option value=""></option>' + banque.map(m => '<option' + (m === rep ? " selected" : "") + ">" + esc(m) + "</option>").join("") + "</select>"; } });
  h += '</p><div class="actions-fiche"><button type="button" class="principal" id="v-trous">Vérifier</button></div>' + (etat.verifTrous ? "<p class=\"bilan\" role=\"status\">" + t.reponses.filter((r, i) => etat.trous[i] === r).length + " bonnes réponses sur " + t.reponses.length + ".</p>" : "");
  const res = etat.verifTableau ? verifierTableau(etat.tableau) : null;
  h += "<h3>Exercice 2 : l'exposition du thème</h3><p>Le thème est joué six fois de suite. Complète chaque exposition : quelle famille, et quel caractère ?</p><div class=\"defile\"><table class=\"tableau-th\"><thead><tr><th></th>" + THEME.map((_, i) => "<th>" + (i + 1) + "</th>").join("") + "</tr></thead><tbody>";
  h += "<tr><th scope=\"row\">Famille</th>" + THEME.map((_, i) => '<td><select data-tf="' + i + '"' + (res ? (res[i].famille ? ' class="juste"' : ' class="faux"') : "") + '><option value=""></option>' + NOMS_EXPOSITION.map(n => "<option" + (etat.tableau[i].famille === n ? " selected" : "") + ">" + n + "</option>").join("") + "</select></td>").join("") + "</tr>";
  h += "<tr><th scope=\"row\">Caractère</th>" + THEME.map((_, i) => '<td><select data-tc="' + i + '"' + (res ? (res[i].caractere ? ' class="juste"' : ' class="faux"') : "") + '><option value=""></option>' + CARACTERES.map(n => "<option" + (etat.tableau[i].caractere === n ? " selected" : "") + ">" + n + "</option>").join("") + "</select></td>").join("") + "</tr></tbody></table></div>";
  return h + '<div class="actions-fiche"><button type="button" class="principal" id="v-tableau">Vérifier</button></div>' + (res ? "<p class=\"bilan\" role=\"status\">" + res.filter(r => r.famille).length + " familles et " + res.filter(r => r.caractere).length + " caractères justes, sur " + ATTENDU.length + " chacun.</p>" : "") + "</div>";
}
// Quand on change une réponse, la correction affichée (vert, rouge, bilan) n'est plus valable : on l'efface.
function effacer(sel) { document.querySelectorAll(sel).forEach(s => s.classList.remove("juste", "faux")); const ex = document.querySelector(sel.indexOf("trou") >= 0 ? ".texte-trous + .actions-fiche + .bilan" : ".exercices > .actions-fiche:last-of-type + .bilan"); if (ex) ex.remove(); }
function dessiner() {
  const el = $("britten-corps");
  const large = !window.matchMedia("(max-width: 700px)").matches;
  el.innerHTML = '<div class="entete-oeuvre"><div class="ecouter-oeuvre"><h3>Écouter l\'œuvre</h3><ul class="liens-ecoute"><li><span class="etq">Œuvre</span> Britten, Le Guide de l\'orchestre ' + liensEcoute(RECHERCHE_OEUVRE, "Britten, Le Guide de l\'orchestre") + '</li><li><span class="etq">Thème</span> Purcell, Rondeau d\'Abdelazer ' + liensEcoute(RECHERCHE_PURCELL, "Purcell, Rondeau d\'Abdelazer") + '</li></ul>'
    + '<p class="rate-doux">Aucun enregistrement n\'est copié ici : l\'œuvre est protégée. Chaque écoute a deux liens, Spotify et YouTube, qui s\'ouvrent dans un nouvel onglet. Passe à la section suivante à chaque changement. Les instruments sont donnés d\'après la structure de l\'œuvre, à vérifier avec la partition.</p></div>'
    + '<details class="contexte-det"' + (large ? " open" : "") + "><summary>L'œuvre et son contexte</summary><p>" + esc(OEUVRE.compositeur + ", " + OEUVRE.titre + " (" + OEUVRE.original + "), " + OEUVRE.opus + ", composé en " + OEUVRE.annee + " et créé en " + OEUVRE.creation + ". " + OEUVRE.soustitre + ". Le thème est " + OEUVRE.theme + ".") + "</p>"
    + '<ul class="contexte">' + CONTEXTE.map(c => "<li>" + esc(c) + "</li>").join("") + "</ul></details>"
    + '<p class="progres" role="status">' + nbReconnues() + " sections reconnues sur " + PARCOURS.length + ".</p></div>" + frise() + carte() + effectif() + ordre() + exercices();
  el.querySelectorAll("[data-pos]").forEach(b => { b.onclick = () => { etat.pos = +b.dataset.pos; dessiner(); }; });
  el.querySelectorAll("[data-entendre]").forEach(b => { b.onclick = () => entendre([b.dataset.entendre]); });
  el.querySelectorAll("[data-note]").forEach(a => { a.oninput = () => { const k = PARCOURS[etat.pos].cle; etat.notes[k] = etat.notes[k] || {}; etat.notes[k][a.dataset.note] = a.value; sauver(); }; });
  $("reco").onchange = e => { const s = PARCOURS[etat.pos]; if (e.target.checked) etat.reconnues[s.cle] = 1; else delete etat.reconnues[s.cle]; sauver(); dessiner(); $("reco").focus(); };
  $("b-prec").onclick = () => { if (etat.pos > 0) { etat.pos--; dessiner(); } }; $("b-suiv").onclick = () => { if (etat.pos < PARCOURS.length - 1) { etat.pos++; dessiner(); } };
  el.querySelectorAll("[data-trou]").forEach(s => { s.onchange = () => { etat.trous[+s.dataset.trou] = s.value; etat.verifTrous = false; effacer("[data-trou]"); }; });
  el.querySelectorAll("[data-tf]").forEach(s => { s.onchange = () => { etat.tableau[+s.dataset.tf].famille = s.value; etat.verifTableau = false; effacer("[data-tf], [data-tc]"); }; });
  el.querySelectorAll("[data-tc]").forEach(s => { s.onchange = () => { etat.tableau[+s.dataset.tc].caractere = s.value; etat.verifTableau = false; effacer("[data-tf], [data-tc]"); }; });
  $("v-trous").onclick = () => { etat.verifTrous = true; dessiner(); $("v-trous").focus(); }; $("v-tableau").onclick = () => { etat.verifTableau = true; dessiner(); $("v-tableau").focus(); };
  const d = $("j-demarrer") || $("j-refaire"); if (d) d.onclick = () => { const g = parseInt(new URLSearchParams(location.search).get("graine"), 10); etat.jeu = { liste: melangeFugue(alea(Number.isFinite(g) ? g : Date.now())), suivant: 0, faits: [], erreurs: 0 }; dessiner(); };
  el.querySelectorAll("[data-f]").forEach(b => { b.onclick = () => { const j = etat.jeu; if (b.dataset.f === FUGUE[j.suivant].id) { j.faits.push(b.dataset.f); j.suivant++; } else j.erreurs++; dessiner(); }; });
}
export function monterBritten(visuel) { visuelDe = visuel; lire(); dessiner(); window.ORCHESTRE_BRITTEN = etat; }
