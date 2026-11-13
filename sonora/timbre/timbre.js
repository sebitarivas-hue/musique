// TIMBRE : l'interface du jeu. La logique (questions, points, étoiles) est dans jeu_logique.js ; les sons sont de vrais enregistrements de la banque du site.
import { UNIVERS, TOUS, parUnivers, NOM_JEU } from "./univers.js?v=0c2ed3b721";
import { NIVEAUX, MANCHES, creerQuestions, alea, points, etoilesDe, niveauOuvert, graineDuJour } from "./jeu_logique.js?v=0c2ed3b721";
import { preparer, mixer } from "../harmonie/echantillons.js?v=0c2ed3b721";

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const ETOILE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2.5 2.9 6.2 6.7.8-5 4.6 1.4 6.7L12 17.4l-6 3.4 1.4-6.7-5-4.6 6.7-.8z"/></svg>';
const CADENAS = '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
const FLAMME = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22c-4.2 0-7-2.8-7-6.6 0-3.6 2.8-5.6 3.9-9.4 2.8 1.7 3.7 4.3 3.7 6 1-.9 1.6-2.2 1.7-3.6 2.4 1.9 4.7 4.7 4.7 7.5 0 3.7-2.8 6.1-7 6.1z"/></svg>';
const jourLocal = (d = new Date()) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");

/* ---------- Ce qui est gardé sur l'appareil (rien n'est envoyé) ---------- */
const CLE = "timbre.jeu";
const lire = () => { let j = {}; try { j = JSON.parse(localStorage.getItem(CLE) || "{}") || {}; } catch (_) {} return Object.assign({ etoiles: {}, meilleur: {}, defi: {}, parties: 0, serieMax: 0 }, j); };
const ecrire = j => { try { localStorage.setItem(CLE, JSON.stringify(j)); } catch (_) {} };

/* ---------- Le son ---------- */
let ctx = null, analyseur = null, source = null, jeton = 0; const cache = new Map();
function contexte() {
  if (!ctx) { const AC = window.AudioContext || window.webkitAudioContext; ctx = new AC(); analyseur = ctx.createAnalyser(); analyseur.fftSize = 128; analyseur.smoothingTimeConstant = .72; analyseur.connect(ctx.destination); }
  if (ctx.state === "suspended") ctx.resume(); return ctx;
}
async function tampon(banque, midi, duree = 1.9) {
  const cle = banque + ":" + midi; if (cache.has(cle)) return cache.get(cle);
  const c = contexte(), t = await preparer(banque, c); if (!t) return null;
  const lr = mixer([{ t: 0, duree, notes: [midi], vitesse: .8 }], t, { sr: c.sampleRate, instrument: banque, duree: duree + .9 });
  const b = c.createBuffer(2, lr[0].length, c.sampleRate); b.copyToChannel(lr[0], 0); b.copyToChannel(lr[1], 1); cache.set(cle, b); return b;
}
function arreter() { jeton++; if (source) { try { source.stop(); } catch (_) {} source = null; } }
function jouerTampon(buf, vol = 1, visu = true) {
  return new Promise(ok => {
    if (!buf) return ok(false);
    const c = contexte(), mon = visu ? ++jeton : jeton, s = c.createBufferSource(), g = c.createGain(); g.gain.value = vol; s.buffer = buf; s.connect(g); g.connect(visu ? analyseur : c.destination);
    if (visu) { if (source) { try { source.stop(); } catch (_) {} } source = s; }
    s.onended = () => { if (visu && source === s) source = null; ok(mon === jeton || !visu); }; s.start();
  });
}
const petitSon = async (banque, notes, vol = .7) => { try { for (const [i, n] of notes.entries()) setTimeout(async () => jouerTampon(await tampon(banque, n, .8), vol, false), i * 110); } catch (_) {} };

/* ---------- L'état de la partie ---------- */
const S = { ecran: "menu", univers: null, niveau: null, defi: false, pool: [], qs: [], i: 0, score: 0, serie: 0, bonnes: 0, reps: [], etat: "", fin: 0, total: 0, raf: 0, cache: new Map() };
const parId = id => S.pool.find(x => x.id === id) || TOUS.find(x => x.id === id);

function montrer(nom) {
  S.ecran = nom; for (const e of ["menu", "niveaux", "partie", "fin"]) $("ecran-" + e).hidden = e !== nom;
  $("verdict").hidden = true; window.scrollTo(0, 0); if (nom !== "partie") $("jeu").focus({ preventScroll: true });
}

/* ---------- Le menu ---------- */
const bilanUnivers = (j, u) => [1, 2, 3].reduce((a, n) => a + (j.etoiles[`${u.id}:${n}`] || 0), 0);
function menu() {
  const j = lire(), auj = jourLocal(), dj = j.defi[auj];
  $("univers").innerHTML = UNIVERS.map(u => { const e = bilanUnivers(j, u);
    return `<button type="button" class="tuile" data-u="${u.id}" style="--a:${u.couleurs[0]};--b:${u.couleurs[1]}"><span class="nom">${esc(u.nom)}</span><span class="etoiles-u"><b>&#9733;</b> ${e} / 9</span><span class="sous">${esc(u.sous)}</span><span class="pics" aria-hidden="true">${Array.from({ length: 9 }, (_, k) => `<i class="${k < e ? "on" : ""}"></i>`).join("")}</span></button>`; }).join("");
  $("defi").innerHTML = `<span class="nom">Défi du ${new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}</span><span class="sous">${dj ? `Ton meilleur score aujourd'hui : ${dj}` : "Tous les univers, dix sons, niveau Oreille fine"}</span><span class="go">${dj ? "Rejouer" : "Jouer"}</span>`;
  const tot = Object.values(j.etoiles).reduce((a, b) => a + b, 0);
  $("stats").textContent = j.parties ? `${j.parties} partie${j.parties > 1 ? "s" : ""} jouée${j.parties > 1 ? "s" : ""}, ${tot} étoile${tot > 1 ? "s" : ""} sur ${UNIVERS.length * 9}, meilleure série : ${j.serieMax}` : "";
  montrer("menu");
}

function ecranNiveaux(id) {
  const u = parUnivers(id), j = lire(); S.univers = u; document.documentElement.style.setProperty("--glow", u.couleurs[1]);
  $("titre-niveaux").textContent = u.nom; $("sous-univers").textContent = u.sous + " : " + u.instruments.length + " instruments enregistrés.";
  $("niveaux").innerHTML = NIVEAUX.map(n => { const ouv = niveauOuvert(j.etoiles, u.id, n.n), e = j.etoiles[`${u.id}:${n.n}`] || 0, m = j.meilleur[`${u.id}:${n.n}`];
    return `<button type="button" class="tuile" data-n="${n.n}" style="--a:${u.couleurs[0]};--b:${u.couleurs[1]}"${ouv ? "" : ' disabled aria-label="Niveau ' + n.n + ' verrouillé : deux étoiles au niveau précédent"'}><span class="num">${ouv ? n.n : CADENAS}</span><span class="nom">${esc(n.nom)}</span><span class="ets" aria-label="${e} étoile${e > 1 ? "s" : ""} sur 3">${[1, 2, 3].map(t => `<span class="${t <= e ? "on" : ""}">&#9733;</span>`).join("")}${m ? `<span class="rec">record ${m}</span>` : ""}</span><span class="sous">${ouv ? esc(n.texte) : "Deux étoiles au niveau précédent pour l'ouvrir."}</span></button>`; }).join("");
  $("liste-instruments").innerHTML = u.instruments.map(i => `<li><b>${esc(i.nom)}.</b> ${esc(i.fait)}</li>`).join("");
  montrer("niveaux");
}

/* ---------- Une partie ---------- */
async function commencer(univers, niv, defi) {
  arreter(); contexte();
  S.defi = !!defi; S.univers = univers; S.niveau = niv; S.pool = defi ? TOUS : univers.instruments;
  S.qs = creerQuestions(S.pool, niv, alea(defi ? graineDuJour() : Date.now() + Math.floor(Math.random() * 1e6)));
  S.i = 0; S.score = 0; S.serie = 0; S.bonnes = 0; S.reps = []; S.total = niv.secondes;
  document.documentElement.style.setProperty("--glow", (univers ? univers.couleurs[1] : "#ff9d3a"));
  $("score").textContent = "0"; majSerie(false); montrer("partie"); $("question").textContent = "Les instruments se préparent…"; $("reponses").innerHTML = ""; $("ecouter").disabled = true;
  $("chrono-barre").style.width = "100%"; $("chrono-nb").textContent = "";
  await Promise.all([tampon("glockenspiel", 84), tampon("timbale", 43)]);   // les petits sons de réussite et d'erreur
  prechauffer(); await question();
}
// Prépare les sons des questions suivantes pendant qu'on joue (le premier est attendu, les autres arrivent en tâche de fond).
async function prechauffer() { for (const q of S.qs) { const inst = parId(q.id); try { await tampon(inst.banque, q.note); } catch (_) {} } }

function majSerie(monte) {
  const e = $("serie"); e.className = "serie" + (S.serie ? "" : " vide"); e.innerHTML = `${FLAMME}<span>x${S.serie}</span>`;
  e.setAttribute("aria-label", S.serie ? `Série de ${S.serie} bonne${S.serie > 1 ? "s" : ""} réponse${S.serie > 1 ? "s" : ""}` : "Pas de série");
  if (monte) { void e.offsetWidth; e.classList.add("monte"); }
}

async function question() {
  const q = S.qs[S.i], inst = parId(q.id); S.etat = "ecoute"; $("verdict").hidden = true; $("ecran-partie").classList.remove("repondu");
  $("rang").textContent = `Son ${S.i + 1} sur ${S.qs.length}`; $("question").textContent = "Quel instrument entends-tu ?";
  const photo = i => i.photo ? `<img src="../orchestre/photos/${esc(i.photo)}" alt="" loading="lazy">` : "";
  $("reponses").className = "reponses"; $("reponses").innerHTML = q.choix.map((id, k) => { const c = parId(id), u = TOUS.find(x => x.id === id).univers, col = parUnivers(u).couleurs;
    return `<button type="button" class="rep attente${c.photo ? "" : " sans-photo"}" data-id="${id}" disabled style="--a:${col[0]};--b:${col[1]}" aria-keyshortcuts="${k + 1}">${photo(c)}<span>${esc(c.nom)}</span></button>`; }).join("");
  $("ecouter").disabled = true; $("ecouter-t").textContent = "Écoute…";
  const buf = await tampon(inst.banque, q.note); if (S.ecran !== "partie") return;
  demarrerChrono(); jouerPuis(buf);
}
async function jouerPuis(buf) {
  const ok = await jouerTampon(buf); if (!ok || S.etat === "verdict" || S.ecran !== "partie") return;
  S.etat = "attente"; $("ecouter").disabled = false; $("ecouter-t").textContent = "Réécouter";
  $("reponses").querySelectorAll(".rep").forEach(b => { b.disabled = false; b.classList.remove("attente"); });
}
async function reecouter() {
  if (S.etat !== "attente") return; const q = S.qs[S.i], inst = parId(q.id); $("ecouter").disabled = true; $("ecouter-t").textContent = "Écoute…";
  await jouerTampon(await tampon(inst.banque, q.note)); if (S.etat === "attente") { $("ecouter").disabled = false; $("ecouter-t").textContent = "Réécouter"; }
}

/* Le chrono : il court dès que le son part, et s'arrête quand on répond. Onglet caché : il attend. */
function demarrerChrono() {
  cancelAnimationFrame(S.raf); S.fin = performance.now() + S.total * 1000; let cache = null;
  document.onvisibilitychange = () => { if (document.hidden) cache = performance.now(); else if (cache) { S.fin += performance.now() - cache; cache = null; } };
  const tic = () => {
    if (S.etat === "verdict" || S.ecran !== "partie") return;
    const rest = cache ? (S.fin - cache) / 1000 : (S.fin - performance.now()) / 1000;
    $("chrono-barre").style.width = Math.max(0, rest / S.total * 100) + "%"; $("chrono-nb").textContent = Math.max(0, Math.ceil(rest)) + " s"; $("jeu").querySelector(".chrono").classList.toggle("court", rest <= 5);
    if (rest <= 0) { repondre(null); return; } S.raf = requestAnimationFrame(tic);
  };
  tic();
}
const tempsRestant = () => Math.max(0, (S.fin - performance.now()) / 1000);

function repondre(id) {
  if (S.etat === "verdict") return; const attendait = S.etat === "attente"; if (id !== null && !attendait) return;
  S.etat = "verdict"; cancelAnimationFrame(S.raf); arreter();
  const q = S.qs[S.i], inst = parId(q.id), juste = id === q.id, rest = tempsRestant();
  S.serie = juste ? S.serie + 1 : 0; const p = points({ juste, restant: rest, total: S.total, serie: S.serie }); S.score += p; if (juste) S.bonnes++;
  const j = lire(); if (S.serie > j.serieMax) { j.serieMax = S.serie; ecrire(j); }
  S.reps.push({ id: q.id, choisi: id, juste, p });
  $("score").textContent = S.score; majSerie(juste && S.serie > 1);
  $("reponses").querySelectorAll(".rep").forEach(b => { b.disabled = true; b.classList.remove("attente"); if (b.dataset.id === q.id) b.classList.add("ok"); else if (b.dataset.id === id) b.classList.add("ko"); else b.classList.add("fondu"); });
  if (juste) petitSon("glockenspiel", S.serie > 2 ? [79, 84, 88] : [84, 91], .6); else petitSon("timbale", [43], .9);
  $("ecran-partie").classList.add("repondu"); const v = $("verdict"); v.className = "verdict " + (juste ? "ok" : "ko"); v.hidden = false;
  const dernier = S.i === S.qs.length - 1;
  v.innerHTML = `<div>` + (juste ? `<h4>Bien joué !</h4><span class="pts">+${p} points${S.serie > 1 ? `, série x${S.serie}` : ""}</span><p>${esc(inst.nom)}. ${esc(inst.fait)}</p>`
    : `<h4>${id === null ? "Temps écoulé" : "Raté"}</h4><p>C'était : ${esc(inst.nom)}. ${esc(inst.fait)}</p>`) + `<button type="button" class="btn ${juste ? "jaune" : "cyan"}" id="suite">${dernier ? "Voir mon score" : "Continuer"}</button></div>`;
  $("suite").onclick = suivante; $("suite").focus({ preventScroll: true });
  clearTimeout(S.auto); if (juste) S.auto = setTimeout(() => { if (S.etat === "verdict" && S.ecran === "partie" && S.qs[S.i] === q) suivante(); }, dernier ? 2200 : 1700);
}
function suivante() { clearTimeout(S.auto); if (S.etat !== "verdict") return; if (S.i < S.qs.length - 1) { S.i++; question(); } else finir(); }

/* ---------- La fin : étoiles, points, ce qu'il faut retenir ---------- */
function finir() {
  arreter(); const j = lire(), et = S.defi ? 0 : etoilesDe(S.bonnes, S.qs.length), cle = S.defi ? null : `${S.univers.id}:${S.niveau.n}`;
  j.parties++; let record = false, xp = 0;
  if (S.defi) { const auj = jourLocal(); if (S.score > (j.defi[auj] || 0)) { j.defi[auj] = S.score; record = true; } for (const k of Object.keys(j.defi).sort().slice(0, -30)) delete j.defi[k]; }
  else { if (et > (j.etoiles[cle] || 0)) j.etoiles[cle] = et; if (S.score > (j.meilleur[cle] || 0)) { j.meilleur[cle] = S.score; record = true; } }
  ecrire(j);
  // Le cours : dix points par étoile gagnée, une seule fois par univers et par niveau (jamais plus en rejouant), et la partie compte pour la flamme du jour. Seulement en mode Jouer, dans l'espace élève.
  const CP = window.COURS_POINTS;
  if (CP) { if (!S.defi) for (let t = 1; t <= et; t++) if (CP.gagner(`timbre:${cle}:${t}`, 10 * t, "timbre")) xp += 10 * t; if (CP.partie) CP.partie("instruments", S.defi ? 0 : et); }
  $("titre-fin").textContent = S.defi ? "Défi terminé" : et === 3 ? "Parfait !" : et === 2 ? "Bien joué" : et === 1 ? "Pas mal" : "Encore un essai";
  $("etoiles-fin").innerHTML = S.defi ? "" : [1, 2, 3].map(t => ETOILE.replace("<svg", `<svg class="${t <= et ? "on" : "off"}" style="--d:${.25 + t * .3}s"`)).join("");
  $("etoiles-fin").setAttribute("aria-label", `${et} étoile${et > 1 ? "s" : ""} sur 3`);
  $("fin-score").textContent = S.score; $("fin-detail").innerHTML = `<b>${S.bonnes} sur ${S.qs.length}</b> bonnes réponses${record ? ", <b>nouveau record</b>" : ""}.` + (S.defi ? " Dis ton score à la classe." : et < 2 && !S.defi && S.niveau.n < 3 ? " Deux étoiles ouvrent le niveau suivant." : "");
  const x = $("fin-xp"); x.hidden = !xp; if (xp) x.textContent = `+${xp} XP pour ton parcours`;
  const nivSuivant = !S.defi && S.niveau.n < 3 && niveauOuvert(j.etoiles, S.univers.id, S.niveau.n + 1);
  $("fin-actions").innerHTML = `<button type="button" class="btn jaune" id="rejouer">Rejouer</button>${nivSuivant ? '<button type="button" class="btn cyan" id="niv-suivant">Niveau suivant</button>' : ""}<button type="button" class="btn ghost" id="vers-menu">${S.defi ? "Menu" : "Les niveaux"}</button>`;
  $("rejouer").onclick = () => commencer(S.univers, S.niveau, S.defi); if (nivSuivant) $("niv-suivant").onclick = () => commencer(S.univers, NIVEAUX[S.niveau.n], false);
  $("vers-menu").onclick = () => S.defi ? menu() : ecranNiveaux(S.univers.id);
  const rates = [...new Map(S.reps.filter(r => !r.juste).map(r => [r.id, r])).values()];
  $("fin-retenir").innerHTML = rates.length ? `<h3>À retenir</h3>` + rates.map(r => { const i = parId(r.id), col = parUnivers(TOUS.find(t => t.id === r.id).univers).couleurs; return `<div class="retenir">${i.photo ? `<img src="../orchestre/photos/${esc(i.photo)}" alt="">` : `<div class="ph" style="--a:${col[0]};--b:${col[1]}"></div>`}<div><b>${esc(i.nom)}</b><span>${esc(i.fait)}</span></div></div>`; }).join("") : `<h3>Sans faute</h3><p class="petit">Tu as reconnu tous les instruments.</p>`;
  montrer("fin"); $("titre-fin").setAttribute("tabindex", "-1");
}

/* ---------- Le dessin du son : des barres qui suivent ce qui sort vraiment du haut-parleur ---------- */
(function onde() {
  const cv = $("onde"), g = cv.getContext("2d"), W = cv.width, H = cv.height, N = 40, lisse = new Float32Array(N); let t = 0;
  const reduit = matchMedia("(prefers-reduced-motion: reduce)").matches;
  function dessiner() {
    requestAnimationFrame(dessiner); if (S.ecran !== "partie") return; g.clearRect(0, 0, W, H); t += .03;
    let data = null; if (analyseur && source) { data = new Uint8Array(analyseur.frequencyBinCount); analyseur.getByteFrequencyData(data); }
    const col = getComputedStyle(document.documentElement).getPropertyValue("--glow").trim() || "#9b6bff", w = W / N;
    for (let i = 0; i < N; i++) {
      const cible = data ? (data[Math.min(data.length - 1, Math.floor(Math.pow(i / N, 1.5) * data.length * .8))] / 255) : (reduit ? .08 : .06 + .05 * (1 + Math.sin(t + i * .5)) / 2);
      lisse[i] += (cible - lisse[i]) * .35; const h = Math.max(6, lisse[i] * H * .95), x = i * w + w * .18, bw = w * .64, y = (H - h) / 2;
      const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, "#35e0ff"); gr.addColorStop(1, col); g.fillStyle = gr; g.shadowColor = col; g.shadowBlur = data ? 14 : 4;
      g.beginPath(); g.roundRect ? g.roundRect(x, y, bw, h, bw / 2) : g.rect(x, y, bw, h); g.fill();
    }
  }
  dessiner();
})();

/* ---------- Les commandes ---------- */
$("univers").onclick = e => { const b = e.target.closest("[data-u]"); if (b) ecranNiveaux(b.dataset.u); };
$("niveaux").onclick = e => { const b = e.target.closest("[data-n]"); if (b && !b.disabled) commencer(S.univers, NIVEAUX[+b.dataset.n - 1], false); };
$("defi").onclick = () => commencer(null, NIVEAUX[1], true);
document.querySelector("[data-menu]").onclick = menu;
$("reponses").onclick = e => { const b = e.target.closest(".rep"); if (b && !b.disabled) repondre(b.dataset.id); };
$("ecouter").onclick = reecouter;
$("quitter").onclick = () => { cancelAnimationFrame(S.raf); clearTimeout(S.auto); arreter(); S.etat = "verdict"; if (S.defi) menu(); else ecranNiveaux(S.univers.id); };
document.addEventListener("keydown", e => {
  if (S.ecran !== "partie" || e.ctrlKey || e.metaKey || e.altKey) return;
  if (/^[1-6]$/.test(e.key) && S.etat === "attente") { const b = $("reponses").querySelectorAll(".rep")[+e.key - 1]; if (b) repondre(b.dataset.id); }
  else if ((e.key === " " || e.key === "r") && S.etat === "attente" && document.activeElement.tagName !== "BUTTON") { e.preventDefault(); reecouter(); }
  else if (e.key === "Escape") $("quitter").click();
});
window.TIMBRE = { S, menu, commencer, repondre, etoilesDe, lire, NOM_JEU, MANCHES };
menu();
