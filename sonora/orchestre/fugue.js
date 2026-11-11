// SONORA Orchestre, espace 05 : construire une fugue. Le sujet et le contre-sujet se dessinent sur une grille ; les voix entrent l'une après l'autre (sujet, réponse à la quinte, sujet à l'octave, réponse),
// chacune avec l'instrument choisi, et le contre-sujet accompagne l'entrée suivante. Les sons sont ceux de la banque du site.
import { parId, nomNote } from "./donnees.js?v=38029b7b21";
import { POOL, etiquette } from "./timbres_logique.js?v=38029b7b21";
import { PAS, DEGRES, SUJET_EXEMPLE, VOIX_PAR_DEFAUT, exposition, dureeTemps, frottements, evenementsVoix } from "./fugue_logique.js?v=38029b7b21";
import { rendreMelodie, sommer, lire, arreter, message, contexte } from "./audio.js?v=38029b7b21";

const $ = id => document.getElementById(id), CLE = "sonora.orchestre.fugue";
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const etat = { sujet: SUJET_EXEMPLE.slice(), contre: new Array(PAS).fill(null), n: 3, bpm: 90, voix: VOIX_PAR_DEFAUT.slice(), joue: false, anim: 0 };
const COULEURS_VOIX = ["#FF6B57", "#FFC53D", "#3FC79A", "#4C9BF5"];   // une couleur par voix (et non par famille) : deux bois qui se répondent restent distincts
const INSTRUMENTS_FUGUE = POOL.filter(i => i.id !== "timbales");   // des instruments qui chantent une ligne
const trouver = id => parId(id);

function sauver() { try { localStorage.setItem(CLE, JSON.stringify({ sujet: etat.sujet, contre: etat.contre, n: etat.n, bpm: etat.bpm, voix: etat.voix })); } catch (e) {} }
function charger() { try { const s = JSON.parse(localStorage.getItem(CLE)); if (s && Array.isArray(s.sujet) && s.sujet.length === PAS && Array.isArray(s.contre) && s.contre.length === PAS) { etat.sujet = s.sujet; etat.contre = s.contre; if (s.n >= 2 && s.n <= 4) etat.n = s.n; if (s.bpm >= 50 && s.bpm <= 140) etat.bpm = s.bpm; if (Array.isArray(s.voix) && s.voix.length === 4 && s.voix.every(v => INSTRUMENTS_FUGUE.some(i => i.id === v))) etat.voix = s.voix; } } catch (e) {} }

// ---------------------------------------------------------------- les deux grilles
function grille(cle, titre, aide) {
  let h = '<div class="bloc-grille"><h3>' + esc(titre) + '</h3><p class="legende">' + esc(aide) + '</p><div class="grille" role="grid" aria-label="' + esc(titre) + '" data-g="' + cle + '">';
  DEGRES.forEach((m, r) => { h += '<div class="g-ligne" role="row"><span class="g-nom" aria-hidden="true">' + nomNote(m) + "</span>"; for (let c = 0; c < PAS; c++) h += '<button type="button" role="gridcell" class="cell' + (m % 12 === 0 ? " do" : "") + '" data-r="' + r + '" data-c="' + c + '" tabindex="' + (r === 0 && c === 0 ? 0 : -1) + '" aria-pressed="false" aria-label="' + nomNote(m) + ", temps " + (c + 1) + '"></button>'; h += "</div>"; });
  return h + '<div class="g-ligne g-temps" aria-hidden="true"><span class="g-nom"></span>' + Array.from({ length: PAS }, (_, c) => "<span>" + (c + 1) + "</span>").join("") + "</div></div></div>";
}
function dessinerGrille(cle) {
  const g = document.querySelector('.grille[data-g="' + cle + '"]'), notes = etat[cle]; if (!g) return;
  g.querySelectorAll(".cell").forEach(b => { const on = notes[+b.dataset.c] === DEGRES[+b.dataset.r]; b.setAttribute("aria-pressed", String(on)); });
}
function brancherGrille(cle) {
  const g = document.querySelector('.grille[data-g="' + cle + '"]');
  g.addEventListener("click", e => { const b = e.target.closest(".cell"); if (!b) return; const c = +b.dataset.c, m = DEGRES[+b.dataset.r]; etat[cle][c] = etat[cle][c] === m ? null : m; dessinerGrille(cle); changer(); });
  g.addEventListener("keydown", e => {
    const b = e.target.closest(".cell"); if (!b) return; let r = +b.dataset.r, c = +b.dataset.c;
    if (e.key === "ArrowRight") c = Math.min(PAS - 1, c + 1); else if (e.key === "ArrowLeft") c = Math.max(0, c - 1); else if (e.key === "ArrowDown") r = Math.min(DEGRES.length - 1, r + 1); else if (e.key === "ArrowUp") r = Math.max(0, r - 1); else return;
    e.preventDefault(); const n = g.querySelector('.cell[data-r="' + r + '"][data-c="' + c + '"]'); b.tabIndex = -1; n.tabIndex = 0; n.focus();
  });
}

// ---------------------------------------------------------------- la partition en rouleau : une couleur par voix, les frottements marqués dessous
function rouleau(voix, total, fr) {
  const tout = []; voix.forEach(v => v.parties.forEach(p => p.notes.forEach(m => { if (m !== null) tout.push(m); })));
  if (!tout.length) return '<p class="legende">Dessine un sujet sur la grille : la fugue apparaîtra ici.</p>';
  const lo = Math.min.apply(null, tout) - 2, hi = Math.max.apply(null, tout) + 2, W = 1000, H = Math.max(160, (hi - lo + 1) * 7 + 26), X0 = 8, dx = (W - X0 - 8) / total, y = m => 8 + (hi - m) * ((H - 26) / (hi - lo + 1));
  let s = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Rouleau de la fugue : ' + voix.length + ' voix qui entrent l\'une après l\'autre">';
  for (let t = 0; t <= total; t += PAS) s += '<line class="mesure" x1="' + (X0 + t * dx).toFixed(1) + '" x2="' + (X0 + t * dx).toFixed(1) + '" y1="0" y2="' + (H - 18) + '"/>';
  fr.frottes.forEach(t => { s += '<rect class="frotte" x="' + (X0 + t * dx).toFixed(1) + '" y="' + (H - 16) + '" width="' + dx.toFixed(1) + '" height="10"/>'; });
  voix.forEach((v, i) => { const c = COULEURS_VOIX[i]; v.parties.forEach(p => p.notes.forEach((m, k) => { if (m !== null) s += '<rect class="note' + (p.nom === "Contre-sujet" ? " contre" : "") + '" style="--c:' + c + '" x="' + (X0 + (p.debut + k) * dx + 1).toFixed(1) + '" y="' + y(m).toFixed(1) + '" width="' + (dx - 2).toFixed(1) + '" height="' + (((H - 26) / (hi - lo + 1)) - 1).toFixed(1) + '"><title>' + esc(etiquette(parId(v.instrument)) + ", " + p.nom + ", " + nomNote(m)) + "</title></rect>"; })); });
  return s + '<line id="tete" x1="' + X0 + '" x2="' + X0 + '" y1="0" y2="' + (H - 18) + '" visibility="hidden"/></svg>';
}
const geom = { X0: 8, W: 1000 };

function construire() { return exposition(etat.sujet, etat.contre, etat.n, etat.voix, trouver); }
function changer() {
  sauver(); const voix = construire(), total = dureeTemps(etat.n), fr = frottements(voix, total);
  $("rouleau").innerHTML = rouleau(voix, total, fr); geom.total = total;
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
function ecouterFugue() { const v = construire(); if (!v.some(x => x.parties[0].notes.some(m => m !== null))) { message("dessine d'abord un sujet"); return; } return jouerVoix(v, dureeTemps(etat.n)); }

// ---------------------------------------------------------------- la page
export function monterFugue() {
  charger();
  $("fugue-corps").innerHTML = '<div class="grilles">' + grille("sujet", "1. Le sujet", "Une note par temps : touche une case pour poser ou enlever une note. Le sujet est la phrase qui ouvre la fugue.") + grille("contre", "2. Le contre-sujet", "Facultatif. Il accompagne l'entrée suivante : choisis des notes qui vont bien avec le sujet.") + "</div>"
    + '<div class="reglages-fugue"><fieldset><legend>Nombre de voix</legend><div class="choix-rg" id="nb-voix">' + [2, 3, 4].map(n => '<button type="button" data-n="' + n + '" aria-pressed="false">' + n + " voix</button>").join("") + '</div></fieldset>'
    + '<fieldset><legend>Tempo : <output id="bpm-val"></output> pulsations par minute</legend><input type="range" id="bpm" min="50" max="140" step="5" aria-label="Tempo"></fieldset></div>'
    + '<div class="choix-voix" id="choix-voix"></div>'
    + '<div class="actions-fiche"><button type="button" class="principal" id="f-fugue">Écouter la fugue</button><button type="button" id="f-sujet">Écouter le sujet seul</button><button type="button" id="f-stop">Arrêter</button><button type="button" id="f-exemple">Sujet d\'exemple</button><button type="button" id="f-vider">Tout effacer</button></div>'
    + '<h3>La fugue</h3><ol class="noms-voix" id="noms-voix"></ol><div class="rouleau" id="rouleau"></div><div id="verdict-fugue" role="status" aria-live="polite"></div>';
  brancherGrille("sujet"); brancherGrille("contre"); dessinerGrille("sujet"); dessinerGrille("contre");
  const nbv = () => $("nb-voix").querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(+b.dataset.n === etat.n)));
  const selects = () => { $("choix-voix").innerHTML = Array.from({ length: etat.n }, (_, k) => '<label>Voix ' + (k + 1) + " (" + ["sujet", "réponse", "sujet grave", "réponse grave"][k] + ')<select data-k="' + k + '">' + INSTRUMENTS_FUGUE.map(i => '<option value="' + i.id + '"' + (i.id === etat.voix[k] ? " selected" : "") + ">" + esc(etiquette(i)) + "</option>").join("") + "</select></label>").join(""); };
  $("nb-voix").onclick = e => { const b = e.target.closest("button"); if (!b) return; etat.n = +b.dataset.n; nbv(); selects(); changer(); };
  $("choix-voix").addEventListener("change", e => { etat.voix[+e.target.dataset.k] = e.target.value; changer(); });
  const bpm = $("bpm"); bpm.value = etat.bpm; $("bpm-val").textContent = etat.bpm; bpm.oninput = () => { etat.bpm = +bpm.value; $("bpm-val").textContent = etat.bpm; sauver(); };
  $("f-fugue").onclick = ecouterFugue; $("f-sujet").onclick = ecouterSujet; $("f-stop").onclick = () => { arreter(); cancelAnimationFrame(etat.anim); const t = $("tete"); if (t) t.setAttribute("visibility", "hidden"); message("prêt"); };
  $("f-exemple").onclick = () => { etat.sujet = SUJET_EXEMPLE.slice(); dessinerGrille("sujet"); changer(); };
  $("f-vider").onclick = () => { etat.sujet = new Array(PAS).fill(null); etat.contre = new Array(PAS).fill(null); dessinerGrille("sujet"); dessinerGrille("contre"); changer(); };
  nbv(); selects(); changer(); window.ORCHESTRE_FUGUE = etat;
}
