// SONORA Orchestre, espace 03 : reconnaître les timbres. Un test à l'aveugle (famille ou instrument, éventuellement tous sur la même note) et une comparaison de deux timbres sur la même note.
import { FAMILLES, INSTRUMENTS, parId, nomNote } from "./donnees.js?v=38029b7b21";
import { POOL, etiquette, NOTE_COMMUNE, alea, creerQuestions, noteCommune, libelleChoix } from "./timbres_logique.js?v=38029b7b21";
import { rendre, lire, arreter, message } from "./audio.js?v=38029b7b21";

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const N = 10, CLE = "sonora.orchestre.timbres";
const reglage = { mode: "instrument", memeNote: false };
let rnd = null, serie = null, courante = null;

function lireScores() { try { return JSON.parse(localStorage.getItem(CLE)) || {}; } catch (e) { return {}; } }
function ecrireScore(cle, v) { try { const s = lireScores(); if (!(s[cle] >= v)) { s[cle] = v; localStorage.setItem(CLE, JSON.stringify(s)); } return s[cle]; } catch (e) { return v; } }
const cleScore = () => reglage.mode + (reglage.memeNote ? "-memenote" : "");

function accueil() {
  const best = lireScores(), m = reglage;
  $("quiz").innerHTML = '<h3>Test à l\'aveugle</h3><p>Tu entends une note, tu dis qui joue. ' + N + ' questions, un son à la fois.</p>'
    + '<fieldset><legend>Que faut-il trouver ?</legend><div class="choix-rg"><button type="button" data-r="mode" data-v="famille" aria-pressed="' + (m.mode === "famille") + '">La famille</button><button type="button" data-r="mode" data-v="instrument" aria-pressed="' + (m.mode === "instrument") + '">L\'instrument</button></div></fieldset>'
    + '<fieldset><legend>À quelle hauteur ?</legend><div class="choix-rg"><button type="button" data-r="memeNote" data-v="0" aria-pressed="' + (!m.memeNote) + '">Notes variées</button><button type="button" data-r="memeNote" data-v="1" aria-pressed="' + m.memeNote + '">Même note pour tous (' + nomNote(NOTE_COMMUNE) + ')</button></div></fieldset>'
    + '<p class="legende">' + (m.memeNote ? "Plus difficile : plus d'indice de hauteur, seul le timbre compte." : "Une note grave trahit souvent un instrument grave : c'est un indice, pas le timbre.") + "</p>"
    + '<div class="actions-fiche"><button type="button" class="principal" id="commencer">Commencer</button>' + (best[cleScore()] !== undefined ? '<span class="record">Meilleur score : ' + best[cleScore()] + " sur " + N + "</span>" : "") + "</div>";
  $("quiz").querySelectorAll("[data-r]").forEach(b => { b.onclick = () => { if (b.dataset.r === "mode") m.mode = b.dataset.v; else m.memeNote = b.dataset.v === "1"; accueil(); }; });
  $("commencer").onclick = demarrer;
}
function demarrer() {
  const g = parseInt(new URLSearchParams(location.search).get("graine"), 10); rnd = alea(Number.isFinite(g) ? g : Date.now());
  serie = { questions: creerQuestions(N, reglage, rnd), rang: 0, score: 0, erreurs: [] }; question();
}
async function question() {
  const q = serie.questions[serie.rang]; courante = { q, buf: null, repondu: false };
  const inst = parId(q.id);
  $("quiz").innerHTML = '<p class="rang">Question ' + (serie.rang + 1) + " sur " + serie.questions.length + '</p><h3>' + (reglage.mode === "famille" ? "De quelle famille est cet instrument ?" : "Quel instrument entends-tu ?") + '</h3>'
    + '<div class="actions-fiche"><button type="button" class="principal" id="ecouter" disabled>Chargement du son…</button></div>'
    + '<div class="reponses" id="reponses" role="group" aria-label="Réponses">' + q.choix.map(c => '<button type="button" data-c="' + c + '" disabled' + (reglage.mode === "famille" ? ' style="--c:' + FAMILLES[c].couleur + '"' : "") + ">" + esc(libelleChoix(q, c)) + "</button>").join("") + '</div><div id="verdict" role="status" aria-live="polite"></div>';
  const buf = await rendre(inst, [q.note]); if (courante.q !== q) return;
  if (!buf) { $("ecouter").textContent = "Sons indisponibles ici"; return; }
  courante.buf = buf; const e = $("ecouter"); e.disabled = false; e.textContent = "Écouter"; e.onclick = () => { arreter(); lire([{ buf }]); e.textContent = "Réécouter"; };
  $("reponses").querySelectorAll("button").forEach(b => { b.disabled = false; b.onclick = () => repondre(b.dataset.c); });
  message("prêt");
}
function repondre(c) {
  if (!courante || courante.repondu) return; courante.repondu = true; const q = courante.q, inst = parId(q.id), juste = c === q.bonne;
  if (juste) serie.score++; else serie.erreurs.push({ id: q.id, pris: c });
  $("reponses").querySelectorAll("button").forEach(b => { b.disabled = true; if (b.dataset.c === q.bonne) b.classList.add("juste"); else if (b.dataset.c === c) b.classList.add("faux"); });
  const f = FAMILLES[inst.fam];
  $("verdict").innerHTML = '<p class="' + (juste ? "bravo" : "rate") + '">' + (juste ? "Juste." : "Pas tout à fait.") + " C'était : " + esc(etiquette(inst)) + " (" + esc(f.court.toLowerCase()) + ", " + esc(inst.mode) + ", " + nomNote(q.note) + ").</p>"
    + '<div class="actions-fiche"><button type="button" class="principal" id="suite">' + (serie.rang + 1 < serie.questions.length ? "Question suivante" : "Voir mon score") + "</button></div>";
  $("suite").focus(); $("suite").onclick = () => { serie.rang++; if (serie.rang < serie.questions.length) question(); else fin(); };
}
function fin() {
  courante = null; arreter(); const n = serie.questions.length, meilleur = ecrireScore(cleScore(), serie.score);
  const conf = serie.erreurs.map(e => { const i = parId(e.id); return "<li>" + esc(etiquette(i)) + " pris pour " + esc(libelleChoix({ bonne: e.pris }, e.pris)) + ' : <a href="#' + i.id + '" data-voir="' + i.id + '">revoir la fiche</a></li>'; }).join("");
  $("quiz").innerHTML = '<h3>Score : ' + serie.score + " sur " + n + '</h3><p>' + (serie.score >= n * 0.8 ? "Tes oreilles sont bien entraînées." : serie.score >= n * 0.5 ? "C'est un bon début : réécoute les fiches des instruments confondus." : "Le timbre s'apprend : compare deux instruments plus bas, puis recommence.") + " Meilleur score : " + meilleur + " sur " + n + ".</p>"
    + (conf ? "<p><span class=\"nb\">À revoir</span></p><ul class=\"conf\">" + conf + "</ul>" : "<p>Aucune confusion.</p>") + '<div class="actions-fiche"><button type="button" class="principal" id="encore">Recommencer</button><button type="button" id="regler">Changer les réglages</button></div>';
  $("encore").onclick = demarrer; $("regler").onclick = accueil; message("prêt");
}

// ---------------------------------------------------------------- comparer deux timbres sur la même note
function comparaison() {
  const opt = sel => POOL.map(i => '<option value="' + i.id + '"' + (i.id === sel ? " selected" : "") + ">" + esc(etiquette(i)) + "</option>").join("");
  $("compare").innerHTML = '<h3>Comparer deux timbres</h3><p>Deux instruments jouent la même note, l\'un après l\'autre, puis ensemble. Écoute ce qui change : l\'attaque, la rondeur, la brillance.</p>'
    + '<div class="duo"><label>Premier instrument<select id="cmp-a">' + opt("hautbois") + '</select></label><label>Second instrument<select id="cmp-b">' + opt("clarinettes") + '</select></label></div>'
    + '<p id="cmp-note" class="legende" role="status"></p><div class="actions-fiche"><button type="button" class="principal" id="cmp-suite">Premier puis second</button><button type="button" id="cmp-ens">Ensemble</button><button type="button" id="cmp-stop">Arrêter</button></div><div id="cmp-texte" class="duo-texte"></div>';
  const maj = () => {
    const a = parId($("cmp-a").value), b = parId($("cmp-b").value), m = noteCommune(a, b), ok = m !== null;
    $("cmp-note").textContent = ok ? "Les deux jouent " + nomNote(m) + "." : "Ces deux instruments n'ont pas de note enregistrée en commun : choisis-en un autre.";
    $("cmp-suite").disabled = $("cmp-ens").disabled = !ok;
    $("cmp-texte").innerHTML = [a, b].map(i => '<div style="--c:' + FAMILLES[i.fam].couleur + '"><span class="nb">' + esc(etiquette(i)) + "</span> " + esc(FAMILLES[i.fam].court.toLowerCase()) + ", " + esc(i.mode) + ".<br>" + esc(i.texte) + "</div>").join("");
    return { a, b, m };
  };
  const jouer2 = async ensemble => {
    const { a, b, m } = maj(); if (m === null) return; message("chargement…");
    const [x, y] = await Promise.all([rendre(a, [m]), rendre(b, [m])]); if (!x || !y) { message("les sons ne sont pas disponibles ici"); return; }
    lire([{ buf: x, delai: 0 }, { buf: y, delai: ensemble ? 0 : 2.2 }], () => message("prêt")); message(nomNote(m));
  };
  $("cmp-a").onchange = $("cmp-b").onchange = maj; $("cmp-suite").onclick = () => jouer2(false); $("cmp-ens").onclick = () => jouer2(true); $("cmp-stop").onclick = () => { arreter(); message("prêt"); };
  maj();
}

export function monterTimbres() { accueil(); comparaison(); window.ORCHESTRE_TIMBRES_REPONSE = () => (courante ? courante.q.bonne : null); }
