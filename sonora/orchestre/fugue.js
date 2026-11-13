// SONORA Orchestre, espace 05 : construire une fugue. Le sujet et le contre-sujet s'écrivent sur une portée, avec un clavier de couleurs ; les voix entrent l'une après l'autre (sujet, réponse à la quinte, sujet à l'octave, réponse),
// chacune avec l'instrument choisi, et le contre-sujet accompagne l'entrée suivante. Les sons sont ceux de la banque du site.
import { parId, nomNote } from "./donnees.js?v=7f779f809a";
import { POOL, etiquette } from "./timbres_logique.js?v=7f779f809a";
import { PAS, SECTIONS, SUJET_EXEMPLE, VOIX_PAR_DEFAUT, caler, exposition, fugueComplete, frottements, evenementsVoix } from "./fugue_logique.js?v=7f779f809a";
import { htmlGlossaire } from "./fugue_glossaire.js?v=7f779f809a";
import { rendreMelodie, sommer, lire, arreter, message, contexte, jouer } from "./audio.js?v=7f779f809a";
import { htmlPortee, lierPortee } from "./portee.js?v=7f779f809a";

const $ = id => document.getElementById(id), CLE = "sonora.orchestre.fugue";
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const etat = { sujet: SUJET_EXEMPLE.slice(), contre: new Array(PAS).fill(null), n: 3, bpm: 90, voix: VOIX_PAR_DEFAUT.slice(), sections: { divertissement: true, strette: true, pedale: true, conclusion: true }, joue: false, anim: 0 };
const COULEURS_VOIX = ["#FF6B57", "#FFC53D", "#3FC79A", "#4C9BF5"];   // une couleur par voix (et non par famille) : deux bois qui se répondent restent distincts
const INSTRUMENTS_FUGUE = POOL.filter(i => i.id !== "timbales");   // des instruments qui chantent une ligne
const trouver = id => parId(id);

function sauver() { try { localStorage.setItem(CLE, JSON.stringify({ sujet: etat.sujet, contre: etat.contre, n: etat.n, bpm: etat.bpm, voix: etat.voix, sections: etat.sections })); } catch (e) {} }
function charger() { try { const s = JSON.parse(localStorage.getItem(CLE)); if (s && s.sections && typeof s.sections === "object") for (const k of Object.keys(etat.sections)) if (typeof s.sections[k] === "boolean") etat.sections[k] = s.sections[k]; if (s && Array.isArray(s.sujet) && s.sujet.length === PAS && Array.isArray(s.contre) && s.contre.length === PAS) { etat.sujet = s.sujet; etat.contre = s.contre; if (s.n >= 2 && s.n <= 4) etat.n = s.n; if (s.bpm >= 50 && s.bpm <= 140) etat.bpm = s.bpm; if (Array.isArray(s.voix) && s.voix.length === 4 && s.voix.every(v => INSTRUMENTS_FUGUE.some(i => i.id === v))) etat.voix = s.voix; } } catch (e) {} }

// ---------------------------------------------------------------- les deux portées (le sujet et le contre-sujet)
const portees = {};
function apercu(m) {   // la note posée s'entend avec l'instrument de la première voix, ramenée dans sa zone
  const inst = parId(etat.voix[0]); if (!inst) return; const c = caler([m], inst); jouer(inst, [m + c.decalage]);
}
function brancherPortee(cle) {
  portees[cle] = lierPortee($("fugue-corps"), cle, { get: () => etat[cle], set: (i, m) => { etat[cle][i] = m; changer(); }, apercu });
}

// ---------------------------------------------------------------- la partition en rouleau : une couleur par voix, les frottements marqués dessous
function rouleau(voix, total, fr, sections) {
  const tout = []; voix.forEach(v => v.parties.forEach(p => p.notes.forEach(m => { if (m !== null) tout.push(m); })));
  if (!tout.length) return '<p class="legende">Écris un sujet sur la portée : la fugue apparaîtra ici.</p>';
  const lo = Math.min.apply(null, tout) - 2, hi = Math.max.apply(null, tout) + 2, W = 1000, T = 26, H = Math.max(180, (hi - lo + 1) * 7 + 26 + T), X0 = 8, dx = (W - X0 - 8) / total, h = (H - 26 - T) / (hi - lo + 1), y = m => T + 8 + (hi - m) * h;
  let s = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Rouleau de la fugue : ' + voix.length + ' voix, ' + sections.length + ' sections">';
  sections.forEach((sc, i) => { const x = X0 + sc.debut * dx, l = (sc.fin - sc.debut) * dx; s += '<rect class="sec-bande s' + (i % 2) + '" x="' + x.toFixed(1) + '" y="0" width="' + l.toFixed(1) + '" height="' + (H - 18) + '"/><text class="sec-nom" x="' + (x + 6).toFixed(1) + '" y="17">' + esc(sc.nom) + "</text>"; });
  fr.frottes.forEach(t => { s += '<rect class="frotte" x="' + (X0 + t * dx).toFixed(1) + '" y="' + (H - 16) + '" width="' + dx.toFixed(1) + '" height="10"/>'; });
  voix.forEach((v, i) => { const c = COULEURS_VOIX[i]; v.parties.forEach(p => p.notes.forEach((m, k) => { if (m !== null) s += '<rect class="note' + (p.nom === "Contre-sujet" ? " contre" : p.tenue ? " tenue" : "") + '" style="--c:' + c + '" x="' + (X0 + (p.debut + k) * dx + 1).toFixed(1) + '" y="' + y(m).toFixed(1) + '" width="' + (dx - 2).toFixed(1) + '" height="' + Math.max(3, h - 1).toFixed(1) + '"><title>' + esc(etiquette(parId(v.instrument)) + ", " + p.nom + ", " + nomNote(m)) + "</title></rect>"; })); });
  return s + '<line id="tete" x1="' + X0 + '" x2="' + X0 + '" y1="0" y2="' + (H - 18) + '" visibility="hidden"/></svg>';
}
const geom = { X0: 8, W: 1000 };

function construire() { return fugueComplete(etat.sujet, etat.contre, etat.n, etat.voix, trouver, etat.sections); }
function changer() {
  sauver(); const f = construire(), voix = f.voix, total = f.total, fr = frottements(voix, total);
  $("rouleau").innerHTML = rouleau(voix, total, fr, f.sections); geom.total = total;
  $("plan-fugue").innerHTML = f.sections.map(s => "<li><b class=\"sec-pl\">" + esc(s.nom) + "</b> <span class=\"sec-d\">" + (s.fin - s.debut) + " temps</span> " + esc(SECTIONS.find(x => x.id === s.id).texte) + "</li>").join("");
  const hors = voix.filter(v => !v.dedans).map(v => etiquette(parId(v.instrument)));
  $("verdict-fugue").innerHTML = (fr.simultanes ? "<p>" + (fr.frottes.length ? fr.frottes.length + " temps sur " + fr.simultanes + " où deux voix frottent (seconde, septième ou triton)." : "Aucun frottement : toutes les voix qui sonnent ensemble s'accordent.") + ' Ce n\'est pas une faute : une dissonance bien placée donne du mouvement. Écoute-les, repérées en rouge sous le rouleau.</p>' : "<p>Une seule voix sonne à la fois : ajoute un contre-sujet pour entendre la superposition.</p>")
    + (hors.length ? '<p class="rate">Hors de la zone enregistrée : ' + esc(hors.join(", ")) + ". Change d'instrument pour cette voix.</p>" : "");
  $("noms-voix").innerHTML = voix.map((v, i) => '<li style="--c:' + COULEURS_VOIX[i] + '">' + esc(v.role) + " : " + esc(etiquette(parId(v.instrument))) + "</li>").join("");
}

// ---------------------------------------------------------------- lecture
async function jouerVoix(voix, total) {
  arreter(); cancelAnimationFrame(etat.anim); message("chargement des instruments…"); const dt = 60 / etat.bpm, duree = total * dt + 1;
  const lr = await Promise.all(voix.map(v => rendreMelodie(parId(v.instrument), evenementsVoix(v, etat.bpm), duree)));
  if (lr.every(x => !x)) { message("les sons ne sont pas disponibles ici"); return; }
  const buf = sommer(lr, duree), t0 = lire([{ buf }], () => { cancelAnimationFrame(etat.anim); const t = $("tete"); if (t) t.setAttribute("visibility", "hidden"); message("prêt"); });
  message("la fugue joue"); const tete = $("tete"), c = contexte();
  const boucle = () => { const tete = $("tete"); if (!tete) return; const b = (c.currentTime - t0) / dt; if (b >= 0 && b <= total) { const x = geom.X0 + b * ((geom.W - geom.X0 - 8) / total); tete.setAttribute("x1", x); tete.setAttribute("x2", x); tete.setAttribute("visibility", "visible"); } etat.anim = requestAnimationFrame(boucle); };
  if (tete) boucle();
}
function ecouterSujet() { const v = exposition(etat.sujet, etat.contre, 1, [etat.voix[0]], trouver); return jouerVoix(v, PAS + 1); }
function ecouterFugue() { const f = construire(); if (!f.voix.some(x => x.parties[0].notes.some(m => m !== null))) { message("dessine d'abord un sujet"); return; } return jouerVoix(f.voix, f.total); }

// ---------------------------------------------------------------- la page
export function monterFugue() {
  charger();
  $("fugue-corps").innerHTML = htmlGlossaire(false) + '<div class="grilles">' + htmlPortee("sujet", "1. Le sujet", "Une noire par temps. Touche une couleur du clavier pour poser une note sur le temps choisi, ou touche la portée à la hauteur voulue. Le sujet est la phrase qui ouvre la fugue.") + htmlPortee("contre", "2. Le contre-sujet", "Facultatif. Il accompagne l'entrée suivante : choisis des notes qui vont bien avec le sujet.") + "</div>"
    + '<div class="reglages-fugue"><fieldset><legend>Nombre de voix</legend><div class="choix-rg" id="nb-voix">' + [2, 3, 4].map(n => '<button type="button" data-n="' + n + '" aria-pressed="false">' + n + " voix</button>").join("") + '</div></fieldset>'
    + '<fieldset><legend>Tempo : <output id="bpm-val"></output> pulsations par minute</legend><input type="range" id="bpm" min="50" max="140" step="5" aria-label="Tempo"></fieldset></div>'
    + '<div class="choix-voix" id="choix-voix"></div>'
    + '<fieldset class="sections-fugue"><legend>Les sections de ta fugue</legend><p class="legende">Une vraie fugue ne s\'arrête pas à l\'exposition. Choisis les sections à ajouter, dans l\'ordre où elles s\'enchaînent.</p><div class="cases-sections">' + SECTIONS.map(s => '<label class="case-section"><input type="checkbox" data-sec="' + s.id + '"' + (s.obligatoire ? " checked disabled" : "") + "> <span>" + esc(s.nom) + "</span></label>").join("") + "</div></fieldset>"
    + '<div class="actions-fiche"><button type="button" class="principal" id="f-fugue">Écouter la fugue</button><button type="button" id="f-sujet">Écouter le sujet seul</button><button type="button" id="f-stop">Arrêter</button><button type="button" id="f-exemple">Sujet d\'exemple</button><button type="button" id="f-vider">Tout effacer</button></div>'
    + '<h3>La fugue</h3><ol class="noms-voix" id="noms-voix"></ol><div class="rouleau" id="rouleau"></div><ol class="plan-fugue" id="plan-fugue"></ol><div id="verdict-fugue" role="status" aria-live="polite"></div>';
  brancherPortee("sujet"); brancherPortee("contre");
  $("fugue-corps").querySelectorAll("[data-sec]").forEach(c => { if (!c.disabled) c.checked = etat.sections[c.dataset.sec] !== false; c.onchange = () => { etat.sections[c.dataset.sec] = c.checked; changer(); }; });
  const nbv = () => $("nb-voix").querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(+b.dataset.n === etat.n)));
  const selects = () => { $("choix-voix").innerHTML = Array.from({ length: etat.n }, (_, k) => '<label>Voix ' + (k + 1) + " (" + ["sujet", "réponse", "sujet grave", "réponse grave"][k] + ')<select data-k="' + k + '">' + INSTRUMENTS_FUGUE.map(i => '<option value="' + i.id + '"' + (i.id === etat.voix[k] ? " selected" : "") + ">" + esc(etiquette(i)) + "</option>").join("") + "</select></label>").join(""); };
  $("nb-voix").onclick = e => { const b = e.target.closest("button"); if (!b) return; etat.n = +b.dataset.n; nbv(); selects(); changer(); };
  $("choix-voix").addEventListener("change", e => { etat.voix[+e.target.dataset.k] = e.target.value; changer(); });
  const bpm = $("bpm"); bpm.value = etat.bpm; $("bpm-val").textContent = etat.bpm; bpm.oninput = () => { etat.bpm = +bpm.value; $("bpm-val").textContent = etat.bpm; sauver(); };
  $("f-fugue").onclick = ecouterFugue; $("f-sujet").onclick = ecouterSujet; $("f-stop").onclick = () => { arreter(); cancelAnimationFrame(etat.anim); const t = $("tete"); if (t) t.setAttribute("visibility", "hidden"); message("prêt"); };
  $("f-exemple").onclick = () => { etat.sujet = SUJET_EXEMPLE.slice(); portees.sujet.dessiner(); changer(); };
  $("f-vider").onclick = () => { etat.sujet = new Array(PAS).fill(null); etat.contre = new Array(PAS).fill(null); portees.sujet.dessiner(); portees.contre.dessiner(); changer(); };
  nbv(); selects(); changer(); window.ORCHESTRE_FUGUE = etat;
}
