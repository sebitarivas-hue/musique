// TIMBRE : la salle de jeux de l'oreille. Six jeux, de vrais enregistrements de la banque du site, des questions tirées au hasard à chaque partie
// (deux élèves côte à côte n'ont jamais la même série). La logique pure est dans jeu_logique.js, testée dans Node.
import { UNIVERS, TOUS, parUnivers } from "./univers.js?v=1ec6804efe";
import { NIVEAUX, MANCHES, creerQuestions, points, etoilesDe, niveauOuvert, creerIntrus, creerHautBas, ajouterMemoire, creerPaires, survieParams, niveauJoueur, titreJoueur } from "./jeu_logique.js?v=1ec6804efe";
import { preparer, mixer } from "../harmonie/echantillons.js?v=1ec6804efe";
import { monter } from "./scene.js?v=1ec6804efe";

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const rnd = Math.random, pioche = l => l[Math.floor(rnd() * l.length)], pause = ms => new Promise(r => setTimeout(r, ms));
const inst = id => TOUS.find(x => x.id === id);
const ETOILE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2.5 2.9 6.2 6.7.8-5 4.6 1.4 6.7L12 17.4l-6 3.4 1.4-6.7-5-4.6 6.7-.8z"/></svg>';
const COEUR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-8-5.2-8-11a4.6 4.6 0 0 1 8-3 4.6 4.6 0 0 1 8 3c0 5.800-8 11-8 11z"/></svg>';
const CADENAS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
const HP = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l6 5V4L8 9z"/><path d="M17 8.500a5 5 0 0 1 0 7" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>';
const FL_HAUT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20V5M5 11l7-7 7 7"/></svg>', FL_BAS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v15M5 13l7 7 7-7"/></svg>';

/* ---------- Les six jeux ---------- */
const G = (d) => `<svg class="glyphe" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const MODES = [
  { id: "quiz", nom: "Qui joue ?", pitch: "Reconnais l'instrument avant la fin du temps.", k: "#7c5cff", g: G('<path d="M22 60V48a28 28 0 0 1 56 0v12"/><rect x="14" y="56" width="16" height="26" rx="7" fill="currentColor"/><rect x="70" y="56" width="16" height="26" rx="7" fill="currentColor"/>') },
  { id: "survie", nom: "Survie", pitch: "Trois vies. Le temps raccourcit. Jusqu'où iras-tu ?", k: "#ff3d7f", g: G('<path d="M50 84S18 64 18 40a17 17 0 0 1 32-9 17 17 0 0 1 32 9c0 24-32 44-32 44z" fill="currentColor"/>') },
  { id: "intrus", nom: "L'intrus", pitch: "Trois sons. Un seul n'est pas le même instrument.", k: "#0ea5e9", g: G('<circle cx="24" cy="62" r="13" fill="currentColor"/><circle cx="50" cy="62" r="13" fill="currentColor"/><rect x="66" y="28" width="24" height="24" rx="6" transform="rotate(12 78 40)"/>') },
  { id: "hautbas", nom: "Plus haut, plus bas", pitch: "45 secondes. La deuxième note monte ou descend ?", k: "#b8f400", tx: "#0c1400", g: G('<path d="M30 78V26M14 42l16-16 16 16M70 22v52M54 58l16 16 16-16"/>') },
  { id: "memoire", nom: "Mémoire", pitch: "Écoute la suite, rejoue-la. Elle s'allonge à chaque tour.", k: "#ff8a00", g: G('<rect x="16" y="16" width="30" height="30" rx="9" fill="currentColor"/><rect x="54" y="16" width="30" height="30" rx="9"/><rect x="16" y="54" width="30" height="30" rx="9"/><rect x="54" y="54" width="30" height="30" rx="9" fill="currentColor"/>') },
  { id: "paires", nom: "Paires", pitch: "Retrouve les deux cartes qui cachent le même instrument.", k: "#12b76a", g: G('<rect x="14" y="26" width="36" height="50" rx="8" transform="rotate(-8 32 51)" fill="currentColor"/><rect x="50" y="24" width="36" height="50" rx="8" transform="rotate(8 68 49)"/>') },
];
const mode = id => MODES.find(m => m.id === id);

/* ---------- Ce qui est gardé sur l'appareil (rien n'est envoyé) ---------- */
const CLE = "timbre.jeu";
const lire = () => { let j = {}; try { j = JSON.parse(localStorage.getItem(CLE) || "{}") || {}; } catch (_) {} return Object.assign({ etoiles: {}, meilleur: {}, vus: {}, parties: 0, xp: 0 }, j); };
const ecrire = j => { try { localStorage.setItem(CLE, JSON.stringify(j)); } catch (_) {} };
const noterVu = id => { const j = lire(); j.vus[id] = (j.vus[id] || 0) + 1; ecrire(j); };
const MAITRISE = 5;   // reconnu cinq fois : l'instrument est acquis dans la collection

/* ---------- Le son ---------- */
let ctx = null, analyseur = null, source = null, jeton = 0; const cache = new Map();
function contexte() {
  if (!ctx) { const AC = window.AudioContext || window.webkitAudioContext; ctx = new AC(); analyseur = ctx.createAnalyser(); analyseur.fftSize = 128; analyseur.smoothingTimeConstant = .7; analyseur.connect(ctx.destination); }
  if (ctx.state === "suspended") ctx.resume(); return ctx;
}
async function tampon(banque, midi, duree = 1.9) {
  const cle = banque + ":" + midi + ":" + duree; if (cache.has(cle)) return cache.get(cle);
  const c = contexte(), t = await preparer(banque, c); if (!t) return null;
  const lr = mixer([{ t: 0, duree, notes: [midi], vitesse: .8 }], t, { sr: c.sampleRate, instrument: banque, duree: duree + .8 });
  const b = c.createBuffer(2, lr[0].length, c.sampleRate); b.copyToChannel(lr[0], 0); b.copyToChannel(lr[1], 1); cache.set(cle, b); return b;
}
function arreter() { jeton++; if (source) { try { source.stop(); } catch (_) {} source = null; } }
// seul : coupe le son précédent (une question à la fois). Sinon le son se superpose (touches de Mémoire, petits sons de réussite).
function jouer(buf, { vol = 1, seul = true } = {}) {
  return new Promise(ok => {
    if (!buf) return ok(false);
    const c = contexte(), s = c.createBufferSource(), g = c.createGain(); g.gain.value = vol; s.buffer = buf; s.connect(g); g.connect(analyseur);
    let mon = jeton; if (seul) { if (source) { try { source.stop(); } catch (_) {} } mon = ++jeton; source = s; }
    s.onended = () => { if (source === s) source = null; ok(!seul || mon === jeton); }; s.start();
  });
}
const petitSon = (banque, notes, vol = .6) => notes.forEach((n, i) => setTimeout(async () => { try { jouer(await tampon(banque, n, .7), { vol, seul: false }); } catch (_) {} }, i * 100));
const sonJuste = serie => petitSon("glockenspiel", serie > 2 ? [79, 84, 88] : [84, 91]), sonFaux = () => petitSon("timbale", [43], .9);

/* ---------- Les effets : étincelles, points qui s'envolent, vibration ---------- */
const FX = (() => {
  const cv = $("fx"), g = cv.getContext("2d"), P = []; let actif = false; const reduit = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const taille = () => { const d = Math.min(2, devicePixelRatio || 1); cv.width = innerWidth * d; cv.height = innerHeight * d; g.setTransform(d, 0, 0, d, 0, 0); }; taille(); addEventListener("resize", taille);
  function boucle() { g.clearRect(0, 0, innerWidth, innerHeight);
    for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; p.vy += .22; p.x += p.vx; p.y += p.vy; p.v -= p.u; if (p.v <= 0) { P.splice(i, 1); continue; } g.globalAlpha = Math.min(1, p.v * 1.6); g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, p.r * p.v + 1, 0, 6.3); g.fill(); }
    g.globalAlpha = 1; if (P.length) requestAnimationFrame(boucle); else actif = false; }
  return { eclat(x, y, couleurs, n = 26, force = 7) { if (reduit || TROISD && App.ecran === "partie") return; for (let i = 0; i < n; i++) { const a = rnd() * 6.3, f = force * (.4 + rnd()); P.push({ x, y, vx: Math.cos(a) * f, vy: Math.sin(a) * f - 3, r: 3 + rnd() * 5, v: 1, u: .014 + rnd() * .02, c: pioche(couleurs) }); } if (!actif) { actif = true; requestAnimationFrame(boucle); } },
    pluie(couleurs) { for (let i = 0; i < 6; i++) setTimeout(() => this.eclat(innerWidth * (.15 + rnd() * .7), innerHeight * (.2 + rnd() * .3), couleurs, 22, 9), i * 160); } };
})();
const centre = el => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
function flottant(txt, el) { const [x, y] = centre(el), f = document.createElement("div"); f.className = "flottant"; f.textContent = txt; f.style.left = x + "px"; f.style.top = y + "px"; f.style.transform = "translate(-50%, 0)"; document.body.appendChild(f); setTimeout(() => f.remove(), 950); }
const vibrer = m => { try { if (navigator.vibrate) navigator.vibrate(m); } catch (_) {} };
function secouer() { const z = $("zone"); z.classList.remove("secoue"); void z.offsetWidth; z.classList.add("secoue"); vibrer([40, 40, 40]); }
const COULEURS_FETE = ["#ffc400", "#ff3d7f", "#22d3ee", "#b8f400", "#fff"];

/* ---------- Le monde en 3D, derrière tout (sans WebGL, le fond reste un dégradé de nuit) ---------- */
const Monde = monter($("monde"), { couleurs: MODES.map(m => m.k) }) || { choisir() {}, son() {}, fete() {}, redessiner() {} };
if (!Monde.arreter) document.body.classList.add("sans-3d");
const TROISD = !!Monde.ancres; if (TROISD) document.body.classList.add("trois-d");
/* Le jeu en 3D : chaque bouton de la partie porte data-ancre, l'identifiant de son objet sur la place. Les boutons restent de vrais boutons (clavier, lecteurs d'écran),
   transparents et posés exactement sur leur objet ; un observateur recopie leurs états (joue, juste, faux, retourné, trouvé) sur l'objet 3D. Sans WebGL, le jeu reste à plat. */
const ETATS = [["ok", "ok"], ["ko", "ko"], ["trouvee", "trouve"], ["joue", "joue"], ["vue", "vue"], ["fondu", "fondu"], ["attente", "attente"]];
let OBS = null;
function troisD(defs, avecSource = false) {
  if (!TROISD) return; Monde.pieces(defs, avecSource); const info = Object.fromEntries(defs.map(d => [d.id, d])); if (OBS) OBS.disconnect();
  const maj = el => { const id = el.dataset.ancre, d = info[id]; if (!d) return; const e = (ETATS.find(([c]) => el.classList.contains(c)) || [0, "normal"])[1];
    if (el._e !== e) { if ((e === "ok" || e === "trouve") && el._e !== "ok" && el._e !== "trouve") Monde.eclat(id, e === "ok" ? "#2bd47d" : "#ffd23f"); if (e === "trouve" && d.revele) Monde.image(id, d.revele.url, d.revele.lettre); el._e = e; Monde.piece(id, e); }
    if (d.forme === "note") { const m = /translateY\((-?[\d.]+)px\)/.exec(el.style.transform || ""); Monde.hauteur(id, m ? -parseFloat(m[1]) / 9 : 0); } };
  OBS = new MutationObserver(ms => ms.forEach(m => m.target.dataset && m.target.dataset.ancre && maj(m.target)));
  document.querySelectorAll("#zone [data-ancre]").forEach(el => { el._e = null; maj(el); OBS.observe(el, { attributes: true, attributeFilter: ["class", "style"] }); });
  ancrer();
}
// Pose chaque bouton sur son objet, à chaque image. Les objets ne bougent plus une fois la caméra arrivée : les boutons restent immobiles.
function ancrer() {
  cancelAnimationFrame(App.raf3d); if (!TROISD) return;
  const tic = () => { if (App.ecran !== "partie") return; const A = Monde.ancres();
    document.querySelectorAll("[data-ancre]").forEach(el => { const a = A[el.dataset.ancre]; if (!a) { el.style.visibility = "hidden"; return; } const t = Math.round(Math.max(64, Math.min(220, a.s))), x = Math.round(a.x - t / 2), y = Math.round(a.y - t / 2);
      if (el._x !== x || el._y !== y || el._t !== t) { el._x = x; el._y = y; el._t = t; el.style.left = x + "px"; el.style.top = y + "px"; el.style.width = el.style.height = t + "px"; } el.style.visibility = ""; });
    App.raf3d = requestAnimationFrame(tic); };
  tic();
}
const couleurDe = id => parUnivers(TOUS.find(t => t.id === id).univers).couleurs[0], photoUrl = i => i.photo ? "../orchestre/photos/" + i.photo : null;

/* ---------- L'application ---------- */
const App = { ecran: "accueil", id: 0, mode: null, etat: "", q: null, score: 0, relance: null, st: null };
const vivant = moi => moi === App.id && App.ecran === "partie";
function montrer(nom) {
  App.ecran = nom; for (const e of ["accueil", "niveaux", "partie", "fin", "collection"]) $("ecran-" + e).hidden = e !== nom;
  $("verdict").hidden = true; window.scrollTo(0, 0); if (nom !== "partie") $("jeu").focus({ preventScroll: true });
}
const teinte = k => document.documentElement.style.setProperty("--c", k);
/* Retour et points du cours : « ‹ Jouer » ramène à l'accueil Jouer du site (pas au hasard dans le cours), et en mode Jouer les points du cours restent affichés. */
const ESPACE = (() => { try { return localStorage.getItem("cours:espace") || ""; } catch (_) { return ""; } })(), RACINE = location.href.split(/\/sonora\//)[0] + "/";
const HUB = RACINE + (ESPACE === "prof" ? "index.html" : ESPACE === "eleves" ? "eleves/index.html" : "choix.html") + (ESPACE ? "#jouer" : "");
const FLAMME = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22c-4.2 0-7-2.8-7-6.6 0-3.6 2.8-5.6 3.9-9.4 2.8 1.700 3.7 4.3 3.7 6 1-.9 1.6-2.2 1.7-3.6 2.4 1.9 4.7 4.7 4.7 7.5 0 3.7-2.8 6.1-7 6.1z"/></svg>';
function ptsCours() {
  const el = $("pts-cours"); let j = null, mode = ""; try { j = JSON.parse(localStorage.getItem("jeu") || "null"); mode = localStorage.getItem("mode"); } catch (_) {}
  if (ESPACE !== "eleves" || mode !== "jouer" || !j) { el.hidden = true; return; }
  const jl = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"), dj = j.dj || {}, d = new Date(); let n = 0; const auj = !!(dj[jl(d)] || {}).p;
  if (!auj) d.setDate(d.getDate() - 1); while ((dj[jl(d)] || {}).p) { n++; d.setDate(d.getDate() - 1); }
  el.hidden = false; el.href = HUB.replace("#jouer", "#parcours"); el.setAttribute("aria-label", `Mes points du cours : ${j.xp || 0} XP, ${n} jour${n > 1 ? "s" : ""} de suite`);
  el.innerHTML = `<span class="f${auj ? " on" : ""}">${FLAMME}<b>${n}</b></span><span class="x"><b>${j.xp || 0}</b> XP</span>`;
}
function majJoueur() {
  ptsCours();
  const j = lire(), n = niveauJoueur(j.xp), C = 2 * Math.PI * 15;
  $("joueur").innerHTML = `<span class="anneau"><svg viewBox="0 0 36 36" aria-hidden="true"><circle class="f" cx="18" cy="18" r="15"/><circle class="v" cx="18" cy="18" r="15" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - n.part)).toFixed(1)}"/></svg><b>${n.n}</b></span><span>${esc(titreJoueur(n.n))}</span>`;
  $("joueur").setAttribute("aria-label", `Niveau ${n.n}, ${titreJoueur(n.n)}. Voir ma collection`);
}

/* ---------- L'accueil : les six jeux d'un coup d'œil. On en touche un : sa lanterne s'approche, son panneau s'ouvre, on joue. ---------- */
function selectionner(id, lancer) {
  const m = mode(id) || MODES[0], i = MODES.indexOf(m), j = lire(), etq = Object.values(j.etoiles).reduce((a, b) => a + b, 0);
  if (lancer && App.choisi === m.id) { contexte(); return LANCER[m.id](); }
  App.choisi = m.id; teinte(m.k); Monde.choisir(i);
  [...$("affiches").children].forEach(a => a.setAttribute("aria-pressed", String(a.dataset.mode === m.id)));
  $("selection").style.setProperty("--k", m.k);
  $("selection").innerHTML = `<div class="sel-t"><span class="num">Jeu ${i + 1} sur ${MODES.length}</span><h2>${esc(m.nom)}</h2><p>${esc(m.pitch)}</p></div>
    <div class="sel-b"><span class="rec">${m.id === "quiz" ? `<b>${etq} / ${UNIVERS.length * 9}</b>étoiles` : j.meilleur[m.id] ? `<b>${j.meilleur[m.id]}</b>ton record` : `<b>Nouveau</b>à essayer`}</span><button type="button" class="btn" id="lancer">Jouer</button></div>`;
  $("lancer").onclick = () => { contexte(); LANCER[m.id](); };
}
function accueil(vers) {
  arreter(); App.id++; Monde.jeu && Monde.jeu(false); document.body.classList.remove("en-jeu");
  $("affiches").innerHTML = MODES.map(m => `<button type="button" class="affiche" role="listitem" data-mode="${m.id}" aria-pressed="false" style="--k:${m.k};--ktx:${m.tx || "#fff"}">${m.g}<b>${esc(m.nom)}</b></button>`).join("");
  majJoueur(); montrer("accueil"); App.choisi = null; selectionner(mode(vers) ? vers : (App.mode && App.mode.id) || "quiz");
}

/* ---------- Qui joue ? : les univers et leurs niveaux ---------- */
function ecranNiveaux(uid) {
  document.body.classList.add("en-jeu"); Monde.choisir(0); Monde.jeu && Monde.jeu(false);
  const j = lire(), u = parUnivers(uid || App.univers || "orchestre"); App.univers = u.id; teinte(mode("quiz").k);
  $("onglets").innerHTML = UNIVERS.map(x => `<button type="button" role="tab" aria-selected="${x.id === u.id}" data-u="${x.id}">${esc(x.nom)}</button>`).join("");
  $("niveaux").innerHTML = NIVEAUX.map(n => { const ouv = niveauOuvert(j.etoiles, u.id, n.n), e = j.etoiles[`${u.id}:${n.n}`] || 0, m = j.meilleur[`quiz:${u.id}:${n.n}`];
    return `<button type="button" class="niveau" data-n="${n.n}"${ouv ? "" : " disabled"}><span class="n">${ouv ? n.n : CADENAS}</span><b>${esc(n.nom)}</b><span class="e" aria-label="${e} étoile${e > 1 ? "s" : ""} sur 3">${[1, 2, 3].map(t => `<span class="${t <= e ? "on" : ""}">&#9733;</span>`).join("")}${m ? `<small>record ${m}</small>` : ""}</span><span class="t">${ouv ? esc(n.texte) : "Deux étoiles au niveau précédent pour l'ouvrir."}</span></button>`; }).join("");
  montrer("niveaux");
}

/* ---------- La coque d'une partie : en-tête, chrono, zone ---------- */
function ouvrirPartie(m, info) {
  arreter(); contexte(); App.id++; App.mode = m; App.etat = "prepare"; App.score = 0; App.q = null; teinte(m.k); Monde.choisir(MODES.indexOf(m)); Monde.jeu && Monde.jeu(true, m.k); document.body.classList.add("en-jeu");
  $("hud-score").textContent = "0"; $("hud-info").textContent = info || m.nom; $("hud-vies").innerHTML = ""; $("chrono").className = "chrono"; $("chrono-barre").style.transform = "scaleX(1)";
  $("ecran-partie").classList.remove("repondu"); $("zone").innerHTML = `<p class="consigne">Les instruments se préparent…</p>`; montrer("partie"); return App.id;
}
function marquer(n, el) { if (!n) return; App.score += n; const s = $("hud-score"); s.textContent = App.score; s.classList.remove("bosse"); void s.offsetWidth; s.classList.add("bosse"); if (el) flottant("+" + n, el); }
const Chrono = { fin: 0, total: 1, raf: 0, cache: null, quand: null,
  lancer(sec, quand) { this.stop(); this.total = sec; this.fin = performance.now() + sec * 1000; this.quand = quand; const moi = App.id;
    const tic = () => { if (moi !== App.id || App.ecran !== "partie") return; const r = this.reste(); $("chrono-barre").style.transform = `scaleX(${Math.max(0, r / this.total)})`; $("chrono").classList.toggle("court", r <= Math.min(5, this.total / 3)); if (r <= 0) { const f = this.quand; this.quand = null; if (f) f(); return; } this.raf = requestAnimationFrame(tic); }; tic(); },
  reste() { return Math.max(0, (this.fin - (this.cache || performance.now())) / 1000); }, stop() { cancelAnimationFrame(this.raf); this.quand = null; }, ajouter(s) { this.fin += s * 1000; } };
document.addEventListener("visibilitychange", () => { if (document.hidden) Chrono.cache = performance.now(); else if (Chrono.cache) { Chrono.fin += performance.now() - Chrono.cache; Chrono.cache = null; } });
function verdict(ok, titre, corps, bouton, suite) {
  const v = $("verdict"); $("ecran-partie").classList.add("repondu"); v.className = "verdict " + (ok ? "ok" : "ko"); v.hidden = false;
  v.innerHTML = `<div><h4>${esc(titre)}</h4>${corps}<button type="button" class="btn plein" id="suite">${esc(bouton)}</button></div>`;
  const moi = App.id, aller = () => { clearTimeout(App.auto); if (moi !== App.id) return; v.hidden = true; $("ecran-partie").classList.remove("repondu"); suite(); };
  $("suite").onclick = aller; $("suite").focus({ preventScroll: true }); return aller;
}
const photoDe = i => i.photo ? `<img src="../orchestre/photos/${esc(i.photo)}" alt="">` : "";

/* ---------- Jeu 1 et jeu 2 : Qui joue ? et Survie ---------- */
function jeuQuiz({ survie, univers, niveau }) {
  const m = mode(survie ? "survie" : "quiz"), moi = ouvrirPartie(m, survie ? "Survie" : `${univers.nom}, ${niveau.nom}`), pool = survie ? TOUS : univers.instruments;
  const st = App.st = { n: 0, serie: 0, bonnes: 0, vies: 3, reps: [], qs: survie ? null : creerQuestions(pool, niveau, rnd), dernier: null, serieMax: 0 };
  App.relance = () => jeuQuiz({ survie, univers, niveau });
  const vies = () => { if (survie) $("hud-vies").innerHTML = [0, 1, 2].map(k => COEUR.replace("<svg", `<svg class="${k < st.vies ? "" : "perdue"}"`)).join(""); }; vies();
  async function question() {
    if (!vivant(moi)) return; const prm = survie ? survieParams(st.n) : niveau; let q;
    if (survie) { do { q = creerQuestions(pool, prm, rnd, 1)[0]; } while (q.id === st.dernier); } else q = st.qs[st.n];
    st.dernier = q.id; App.q = q; App.etat = "ecoute"; const i = inst(q.id);
    $("hud-info").textContent = survie ? `Son ${st.n + 1}` : `Son ${st.n + 1} sur ${st.qs.length}`;
    $("zone").innerHTML = `<p class="consigne">Qui joue ?</p><button type="button" class="orbe" id="orbe" data-ancre="source" disabled aria-label="Réécouter le son"><canvas id="orbe-cv" width="460" height="460"></canvas><span class="ico">${HP}</span></button>
      <div class="reponses" id="reponses" role="group" aria-label="Réponses">${q.choix.map((id, k) => { const c = inst(id); return `<button type="button" class="rep attente" data-id="${id}" data-ancre="${id}" disabled aria-keyshortcuts="${k + 1}">${photoDe(c)}<span>${esc(c.nom)}</span></button>`; }).join("")}</div>`;
    troisD(q.choix.map(id => { const c = inst(id); return { id, forme: "totem", couleur: couleurDe(id), image: photoUrl(c) }; }), true);
    $("orbe").onclick = async () => { if (App.etat !== "attente") return; $("orbe").disabled = true; await jouer(await tampon(i.banque, q.note)); if (vivant(moi) && App.etat === "attente") $("orbe").disabled = false; };
    $("reponses").onclick = e => { const b = e.target.closest(".rep"); if (b && !b.disabled) repondre(b.dataset.id, b); };
    const buf = await tampon(i.banque, q.note); if (!vivant(moi) || App.q !== q) return;
    Chrono.lancer(prm.secondes, () => repondre(null, null));
    const fini = await jouer(buf); if (!fini || !vivant(moi) || App.q !== q || App.etat !== "ecoute") return;
    App.etat = "attente"; $("orbe").disabled = false; $("reponses").querySelectorAll(".rep").forEach(b => { b.disabled = false; b.classList.remove("attente"); });
  }
  function repondre(id, bouton) {
    if (!vivant(moi) || App.etat === "verdict" || (id !== null && App.etat !== "attente")) return;
    const q = App.q, i = inst(q.id), juste = id === q.id, rest = Chrono.reste(), total = Chrono.total; App.etat = "verdict"; Chrono.stop(); arreter();
    st.serie = juste ? st.serie + 1 : 0; st.serieMax = Math.max(st.serieMax, st.serie); const p = points({ juste, restant: rest, total, serie: st.serie });
    st.reps.push({ id: q.id, juste }); $("reponses").querySelectorAll(".rep").forEach(b => { b.disabled = true; b.classList.remove("attente"); b.classList.add(b.dataset.id === q.id ? "ok" : b.dataset.id === id ? "ko" : "fondu"); });
    if (juste) { st.bonnes++; noterVu(q.id); sonJuste(st.serie); vibrer(18); marquer(p, bouton); FX.eclat(...centre(bouton), [m.k, "#fff", "#ffc400"], 20 + Math.min(30, st.serie * 5)); }
    else { sonFaux(); secouer(); if (survie) { st.vies--; vies(); } }
    st.n++; const finie = survie ? st.vies <= 0 : st.n >= st.qs.length, apres = () => finie ? fin() : question();
    if (juste && survie) { App.auto = setTimeout(() => { if (vivant(moi)) apres(); }, 650); return; }
    const aller = verdict(juste, juste ? "Bien joué !" : id === null ? "Temps écoulé" : "Raté", (juste ? `<span class="pts">+${p} points${st.serie > 1 ? `, série de ${st.serie}` : ""}</span>` : "") + `<p>${juste ? "" : "C'était : "}${esc(i.nom)}. ${esc(i.fait)}</p>`, finie ? "Voir mon score" : "Continuer", apres);
    if (juste) App.auto = setTimeout(aller, 1500);
  }
  function fin() {
    const et = survie ? null : etoilesDe(st.bonnes, st.qs.length);
    terminer({ cle: survie ? "survie" : `quiz:${univers.id}:${niveau.n}`, etoiles: et, cleEtoiles: survie ? null : `${univers.id}:${niveau.n}`,
      detail: survie ? `<b>${st.bonnes}</b> instrument${st.bonnes > 1 ? "s" : ""} reconnu${st.bonnes > 1 ? "s" : ""}, meilleure série : <b>${st.serieMax}</b>.` : `<b>${st.bonnes} sur ${st.qs.length}</b> bonnes réponses.` + (et < 2 && niveau.n < 3 ? " Deux étoiles ouvrent le niveau suivant." : ""),
      retenir: st.reps.filter(r => !r.juste).map(r => r.id), suivant: !survie && niveau.n < 3 ? () => jeuQuiz({ univers, niveau: NIVEAUX[niveau.n] }) : null, univers, niveau });
  }
  App.repondre = repondre; (async () => { await Promise.all([tampon("glockenspiel", 84, .7), tampon("timbale", 43, .7)]); question(); })();
}

/* ---------- Jeu 3 : L'intrus ---------- */
function jeuIntrus() {
  const m = mode("intrus"), moi = ouvrirPartie(m), st = App.st = { n: 0, serie: 0, bonnes: 0, reps: [], serieMax: 0 }; App.relance = jeuIntrus; let r, bufs;
  async function sequence() { App.etat = "ecoute"; const pads = [...$("zone").querySelectorAll(".pad")]; pads.forEach(p => p.disabled = true); $("rejouer-trio").disabled = true;
    for (let k = 0; k < 3; k++) { if (!vivant(moi)) return false; pads[k].classList.add("joue"); const ok = await jouer(bufs[k === r.position ? 1 : 0]); pads[k].classList.remove("joue"); if (!ok || !vivant(moi)) return false; await pause(140); }
    if (!vivant(moi) || App.etat !== "ecoute") return false; App.etat = "attente"; pads.forEach(p => p.disabled = false); $("rejouer-trio").disabled = false; return true; }
  async function manche() {
    if (!vivant(moi)) return; r = creerIntrus(TOUS, st.n / MANCHES, rnd); App.q = r; $("hud-info").textContent = `Manche ${st.n + 1} sur ${MANCHES}`;
    $("zone").innerHTML = `<p class="consigne">Lequel n'est pas comme les deux autres ?</p><p class="aide">Les trois jouent la même note.</p><div class="trio">${[1, 2, 3].map(k => `<button type="button" class="pad" data-k="${k - 1}" data-ancre="p${k - 1}" disabled aria-label="Son ${k}">${k}<small></small></button>`).join("")}</div><button type="button" class="btn sombre" id="rejouer-trio" disabled>Réécouter les trois</button>`;
    const a = inst(r.majorite), b = inst(r.intrus); bufs = await Promise.all([tampon(a.banque, r.note, 1.1), tampon(b.banque, r.note, 1.1)]); if (!vivant(moi) || App.q !== r) return;
    troisD([0, 1, 2].map(k => ({ id: "p" + k, forme: "tambour", couleur: m.k })));
    $("zone").querySelector(".trio").onclick = e => { const p = e.target.closest(".pad"); if (p && !p.disabled) repondre(+p.dataset.k, p); };
    $("rejouer-trio").onclick = () => { if (App.etat === "attente") sequence(); };
    if (await sequence()) Chrono.lancer(14, () => repondre(-1, null));
  }
  function repondre(k, pad) {
    if (!vivant(moi) || App.etat === "verdict" || (k >= 0 && App.etat !== "attente")) return; const juste = k === r.position, rest = Chrono.reste(); App.etat = "verdict"; Chrono.stop(); arreter();
    st.serie = juste ? st.serie + 1 : 0; st.serieMax = Math.max(st.serieMax, st.serie); const p = points({ juste, restant: rest, total: 14, serie: st.serie }), a = inst(r.majorite), b = inst(r.intrus);
    [...$("zone").querySelectorAll(".pad")].forEach((x, i) => { x.disabled = true; x.querySelector("small").textContent = i === r.position ? b.nom : a.nom; if (i === r.position) x.classList.add("ok"); else if (i === k) x.classList.add("ko"); });
    $("rejouer-trio").disabled = true; st.reps.push({ id: r.intrus, juste }); st.n++; const finie = st.n >= MANCHES, apres = () => finie ? fin() : manche();
    if (juste) { st.bonnes++; noterVu(r.intrus); sonJuste(st.serie); vibrer(18); marquer(p, pad); FX.eclat(...centre(pad), [m.k, "#fff", "#ffc400"]); App.auto = setTimeout(() => { if (vivant(moi)) apres(); }, 1100); }
    else { sonFaux(); secouer(); verdict(false, k < 0 ? "Temps écoulé" : "Raté", `<p>L'intrus était le son ${r.position + 1} : ${esc(b.nom)}. Les deux autres : ${esc(a.nom)}.</p>`, finie ? "Voir mon score" : "Continuer", apres); }
  }
  const fin = () => terminer({ cle: "intrus", detail: `<b>${st.bonnes} sur ${MANCHES}</b> intrus démasqués, meilleure série : <b>${st.serieMax}</b>.`, retenir: st.reps.filter(x => !x.juste).map(x => x.id) });
  App.repondre = repondre; (async () => { await Promise.all([tampon("glockenspiel", 84, .7), tampon("timbale", 43, .7)]); manche(); })();
}

/* ---------- Jeu 4 : Plus haut, plus bas (45 secondes) ---------- */
function jeuHautBas() {
  const m = mode("hautbas"), moi = ouvrirPartie(m, "45 secondes"), st = App.st = { serie: 0, bonnes: 0, total: 0, serieMax: 0, lance: false }; App.relance = jeuHautBas;
  const i = inst(pioche(["piano", "marimba", "vibraphone", "harpe", "guitare-folk", "flutes", "violons1"])); let r;
  $("zone").innerHTML = `<p class="consigne">La deuxième note est…</p><p class="aide">${esc(i.nom)}. Flèches du clavier ou glisse vers le haut ou le bas.</p><div class="duo-notes" aria-hidden="true"><i id="n1" data-ancre="n1"></i><i id="n2" data-ancre="n2" class="mystere"></i></div><p class="serie" id="serie-hb" aria-live="polite"></p>
    <div class="haut-bas"><button type="button" id="b-haut" disabled>${FL_HAUT}Plus haute</button><button type="button" id="b-bas" disabled>${FL_BAS}Plus basse</button></div>`;
  const B = { true: $("b-haut"), false: $("b-bas") }, actif = on => { B.true.disabled = B.false.disabled = !on; };
  troisD([{ id: "n1", forme: "note", couleur: "#35e0ff" }, { id: "n2", forme: "note", couleur: m.k }]);
  async function tour() {
    if (!vivant(moi)) return; App.etat = "ecoute"; actif(false); B.true.className = B.false.className = ""; r = creerHautBas(i, st.serie, rnd); App.q = r;
    const [a, b] = await Promise.all([tampon(i.banque, r.a, .42), tampon(i.banque, r.b, .42)]); if (!vivant(moi) || App.q !== r) return;
    if (!st.lance) { st.lance = true; Chrono.lancer(45, fin); }
    const n1 = $("n1"), n2 = $("n2"); n1.classList.add("joue"); n2.style.transform = ""; jouer(a); await pause(480); if (!vivant(moi) || App.q !== r) return;
    n1.classList.remove("joue"); n2.classList.add("joue"); jouer(b); App.etat = "attente"; actif(true); setTimeout(() => n2.classList.remove("joue"), 380);
  }
  function repondre(haut) {
    if (!vivant(moi) || App.etat !== "attente") return; App.etat = "verdict"; actif(false); const juste = haut === r.haut, bouton = B[haut]; st.total++;
    $("n2").style.transform = `translateY(${r.haut ? -26 : 26}px)`; bouton.classList.add(juste ? "ok" : "ko");
    if (juste) { st.serie++; st.bonnes++; st.serieMax = Math.max(st.serieMax, st.serie); marquer(50 + Math.min(50, 5 * st.serie), bouton); vibrer(15); if (st.serie % 5 === 0) FX.eclat(...centre(bouton), [m.k, "#fff"], 30); }
    else { st.serie = 0; Chrono.ajouter(-3); secouer(); sonFaux(); }
    $("serie-hb").textContent = st.serie > 1 ? `Série de ${st.serie}${r.ecart <= 2 ? ", écart minuscule" : ""}` : juste ? "" : "Trois secondes de moins";
    setTimeout(() => { if (vivant(moi)) tour(); }, juste ? 300 : 650);
  }
  function fin() { if (!vivant(moi)) return; terminer({ cle: "hautbas", detail: `<b>${st.bonnes}</b> bonne${st.bonnes > 1 ? "s" : ""} réponse${st.bonnes > 1 ? "s" : ""} sur ${st.total}, meilleure série : <b>${st.serieMax}</b>.` }); }
  B.true.onclick = () => repondre(true); B.false.onclick = () => repondre(false); App.repondre = repondre;
  let y0 = null; $("zone").ontouchstart = e => { y0 = e.touches[0].clientY; }; $("zone").ontouchend = e => { if (y0 === null) return; const d = e.changedTouches[0].clientY - y0; y0 = null; if (Math.abs(d) > 60 && !e.target.closest("button")) repondre(d < 0); };
  (async () => { await tampon("timbale", 43, .7); tour(); })();
}

/* ---------- Jeu 5 : Mémoire ---------- */
function jeuMemoire() {
  const m = mode("memoire"), moi = ouvrirPartie(m), st = App.st = { seq: [], pos: 0, tours: 0 }; App.relance = jeuMemoire; $("chrono").classList.add("sans");
  const i = inst(pioche(["marimba", "piano", "vibraphone", "kalimba", "harpe", "glockenspiel"])), NOTES = [60, 64, 67, 72], P = ["#22d3ee", "#ff3d7f", "#b8f400", "#ff8a00"]; let bufs;
  $("zone").innerHTML = `<div class="tour"><b id="tour-n">1</b><span id="tour-t">Écoute…</span></div><div class="simon" id="simon">${P.map((c, k) => `<button type="button" data-k="${k}" data-ancre="s${k}" style="--p:${c}" disabled aria-label="Touche ${k + 1}"></button>`).join("")}</div><p class="aide">${esc(i.nom)}. La suite gagne une note à chaque tour.</p>`;
  const pads = [...$("simon").children], actif = on => pads.forEach(p => p.disabled = !on); troisD(P.map((c, k) => ({ id: "s" + k, forme: "cristal", couleur: c })));
  const allumer = (k, ms) => { pads[k].classList.add("joue"); jouer(bufs[k], { seul: false }); setTimeout(() => pads[k].classList.remove("joue"), ms); };
  async function tour() {
    if (!vivant(moi)) return; App.etat = "ecoute"; actif(false); st.seq = ajouterMemoire(st.seq, rnd); st.pos = 0; App.q = st.seq; $("tour-n").textContent = st.seq.length; $("tour-t").textContent = "Écoute…";
    const pas = Math.max(280, 600 - st.seq.length * 22); await pause(500);
    for (const k of st.seq) { if (!vivant(moi)) return; allumer(k, pas * .7); await pause(pas); }
    if (!vivant(moi)) return; App.etat = "attente"; $("tour-t").textContent = "À toi"; actif(true);
  }
  function toucher(k) {
    if (!vivant(moi) || App.etat !== "attente") return; allumer(k, 220);
    if (k !== st.seq[st.pos]) { App.etat = "verdict"; actif(false); sonFaux(); secouer(); pads[st.seq[st.pos]].classList.add("joue"); $("tour-t").textContent = "Ce n'était pas celle-là";
      setTimeout(() => { if (vivant(moi)) terminer({ cle: "memoire", detail: `Tu as retenu une suite de <b>${st.tours}</b> note${st.tours > 1 ? "s" : ""}.` }); }, 1300); return; }
    st.pos++; vibrer(10);
    if (st.pos === st.seq.length) { App.etat = "ecoute"; actif(false); st.tours = st.seq.length; marquer(100 + 10 * st.seq.length, $("tour-n")); $("tour-t").textContent = "Bien !"; if (st.tours % 4 === 0) FX.eclat(...centre($("simon")), P, 36); setTimeout(() => { if (vivant(moi)) tour(); }, 650); }
  }
  $("simon").onclick = e => { const b = e.target.closest("button"); if (b && !b.disabled) toucher(+b.dataset.k); }; App.repondre = toucher;
  (async () => { bufs = await Promise.all(NOTES.map(n => tampon(i.banque, n, .45))); await tampon("timbale", 43, .7); tour(); })();
}

/* ---------- Jeu 6 : Paires ---------- */
function jeuPaires() {
  const m = mode("paires"), moi = ouvrirPartie(m, "Coups : 0"), deck = creerPaires(TOUS, 6, rnd), st = App.st = { deck, ouvertes: [], trouvees: 0, coups: 0, t0: 0, verrou: true }; App.relance = jeuPaires; $("chrono").classList.add("sans"); App.q = deck;
  $("zone").innerHTML = `<p class="consigne">Retrouve les paires à l'oreille</p><div class="paires" id="paires">${deck.map((id, k) => `<button type="button" class="carte-p" data-k="${k}" data-ancre="c${k}" aria-label="Carte ${k + 1}"><span class="dos">${HP}</span><span class="face">${HP}</span></button>`).join("")}</div>`;
  const cartes = [...$("paires").children], bufs = {};
  troisD(deck.map((id, k) => { const i = inst(id); return { id: "c" + k, forme: "carte", couleur: m.k, revele: { url: photoUrl(i), lettre: i.nom[0] } }; }));
  async function toucher(k) {
    if (!vivant(moi) || st.verrou || st.ouvertes.includes(k) || cartes[k].classList.contains("trouvee")) return; if (!st.t0) st.t0 = performance.now();
    cartes[k].classList.add("vue", "joue"); jouer(bufs[deck[k]]); setTimeout(() => cartes[k].classList.remove("joue"), 600); st.ouvertes.push(k); if (st.ouvertes.length < 2) return;
    st.verrou = true; st.coups++; $("hud-info").textContent = "Coups : " + st.coups; const [a, b] = st.ouvertes; await pause(700); if (!vivant(moi)) return;
    if (deck[a] === deck[b]) { const i = inst(deck[a]); for (const x of [a, b]) { cartes[x].classList.add("trouvee"); cartes[x].classList.remove("vue"); cartes[x].querySelector(".face").innerHTML = `${photoDe(i)}<span>${esc(i.nom)}</span>`; cartes[x].setAttribute("aria-label", i.nom + ", paire trouvée"); cartes[x].dataset.nom = i.nom; }
      st.trouvees++; noterVu(i.id); sonJuste(st.trouvees); vibrer(18); marquer(150, cartes[b]); FX.eclat(...centre(cartes[b]), [m.k, "#fff", "#ffc400"]);
      if (st.trouvees === 6) { const s = Math.round((performance.now() - st.t0) / 1000), bonus = Math.max(0, 700 - st.coups * 30 - s * 3); marquer(bonus, null); setTimeout(() => { if (vivant(moi)) terminer({ cle: "paires", detail: `Six paires en <b>${st.coups}</b> coups et ${s} secondes.` }); }, 900); return; } }
    else { await pause(350); if (!vivant(moi)) return; cartes[a].classList.remove("vue"); cartes[b].classList.remove("vue"); }
    st.ouvertes = []; st.verrou = false;
  }
  $("paires").onclick = e => { const c = e.target.closest(".carte-p"); if (c) toucher(+c.dataset.k); }; App.repondre = toucher;
  (async () => { for (const id of new Set(deck)) bufs[id] = await tampon(inst(id).banque, 60, 1.1); await tampon("glockenspiel", 84, .7); if (vivant(moi)) { st.verrou = false; App.etat = "attente"; } })();
}
const LANCER = { quiz: () => ecranNiveaux(), survie: () => jeuQuiz({ survie: true }), intrus: jeuIntrus, hautbas: jeuHautBas, memoire: jeuMemoire, paires: jeuPaires };

/* ---------- La fin : score, record, étoiles, niveau du joueur ---------- */
function terminer({ cle, etoiles = null, cleEtoiles = null, detail, retenir = [], suivant = null, univers = null, niveau = null }) {
  Chrono.stop(); arreter(); clearTimeout(App.auto); if (OBS) OBS.disconnect(); Monde.jeu && Monde.jeu(false); const m = App.mode, score = App.score, j = lire(), avant = niveauJoueur(j.xp); App.id++;
  const record = score > (j.meilleur[cle] || 0) && score > 0; if (record) j.meilleur[cle] = score; if (m.id !== "quiz" && score > (j.meilleur[m.id] || 0)) j.meilleur[m.id] = score;
  if (cleEtoiles && etoiles > (j.etoiles[cleEtoiles] || 0)) j.etoiles[cleEtoiles] = etoiles;
  const gain = Math.max(5, Math.round(score / 10)); j.xp += gain; j.parties++; ecrire(j); const apres = niveauJoueur(j.xp), monte = apres.n > avant.n;
  // Le cours : dix points par étoile de « Qui joue ? », une seule fois par univers et par niveau (jamais plus en rejouant). Toute partie finie compte pour la flamme du jour.
  const CP = window.COURS_POINTS; if (CP) { if (cleEtoiles) for (let t = 1; t <= etoiles; t++) CP.gagner(`timbre:${cleEtoiles}:${t}`, 10 * t, "timbre"); if (CP.partie) CP.partie("instruments", etoiles || 0); }
  $("fin-mode").textContent = m.nom + (univers ? `, ${univers.nom}, ${niveau.nom}` : "");
  $("t-fin").textContent = record ? "Nouveau record !" : etoiles === 3 ? "Parfait !" : etoiles === 0 ? "Encore un essai" : "Bien joué";
  $("etoiles-fin").innerHTML = etoiles === null ? "" : [1, 2, 3].map(t => ETOILE.replace("<svg", `<svg class="${t <= etoiles ? "on" : ""}" style="--d:${.2 + t * .25}s"`)).join(""); $("etoiles-fin").hidden = etoiles === null;
  if (etoiles !== null) $("etoiles-fin").setAttribute("aria-label", `${etoiles} étoile${etoiles > 1 ? "s" : ""} sur 3`);
  $("fin-detail").innerHTML = detail + (record ? "" : j.meilleur[cle] ? ` Ton record : <b>${j.meilleur[cle]}</b>.` : "");
  $("fin-niveau").className = "fin-niveau" + (monte ? " monte" : ""); $("fin-niveau").innerHTML = `<div class="l"><b>${monte ? `Niveau ${apres.n} atteint : ${esc(titreJoueur(apres.n))}` : `Niveau ${apres.n}, ${esc(titreJoueur(apres.n))}`}</b><span>+${gain}</span></div><div class="b"><i style="width:${monte ? 0 : Math.round(avant.part * 100)}%"></i></div>`;
  $("fin-actions").innerHTML = `<button type="button" class="btn plein" id="rejouer">Rejouer</button>${suivant && niveauOuvert(j.etoiles, univers.id, niveau.n + 1) ? '<button type="button" class="btn plein sombre" id="niv-suivant">Niveau suivant</button>' : ""}<button type="button" class="btn plein sombre" id="autre">Un autre jeu</button>`;
  $("rejouer").onclick = () => App.relance(); if ($("niv-suivant")) $("niv-suivant").onclick = suivant; $("autre").onclick = () => accueil(m.id);
  const rates = [...new Set(retenir)].map(inst);
  $("fin-retenir").innerHTML = rates.length ? `<h3>À retenir</h3>` + rates.map(i => `<div class="retenir">${i.photo ? photoDe(i) : '<div class="ph"></div>'}<div><b>${esc(i.nom)}</b><span>${esc(i.fait)}</span></div></div>`).join("") : "";
  montrer("fin"); majJoueur();
  // Le score défile, la barre de niveau avance, et un record ou un niveau gagné déclenche la fête.
  const t0 = performance.now(), el = $("fin-score"), compte = t => { const u = Math.min(1, (t - t0) / 900); el.textContent = Math.round(score * (1 - Math.pow(1 - u, 3))); if (u < 1 && App.ecran === "fin") requestAnimationFrame(compte); else el.textContent = score; }; requestAnimationFrame(compte);
  setTimeout(() => { const b = $("fin-niveau").querySelector("i"); if (b) b.style.width = Math.round(apres.part * 100) + "%"; }, 60);
  if (record || monte || etoiles === 3) { Monde.fete(); FX.pluie(COULEURS_FETE); vibrer([30, 60, 30]); petitSon("glockenspiel", [72, 76, 79, 84, 88], .5); }
}

/* ---------- La collection : chaque instrument reconnu y entre ; reconnu cinq fois, il est acquis ---------- */
function collection() {
  teinte("#ffc400"); document.body.classList.add("en-jeu"); const j = lire(), n = TOUS.filter(i => j.vus[i.id]).length, ma = TOUS.filter(i => (j.vus[i.id] || 0) >= MAITRISE).length;
  $("collection-bilan").textContent = `${n} instrument${n > 1 ? "s" : ""} sur ${TOUS.length}, dont ${ma} acquis. Reconnais un instrument dans un jeu pour le faire entrer ici ; cinq fois, et il est acquis.`;
  $("collection").innerHTML = UNIVERS.map(u => u.instruments.map(i => { const v = j.vus[i.id] || 0;
    return v ? `<div class="fiche${v >= MAITRISE ? " maitre" : ""}"><div class="im"${i.photo ? ` style="background-image:url(../orchestre/photos/${esc(i.photo)})"` : ""}>${i.photo ? "" : esc(i.nom[0])}</div><b>${esc(i.nom)}</b><div class="j" role="img" aria-label="Reconnu ${v} fois"><i style="width:${Math.min(100, v / MAITRISE * 100)}%"></i></div><p>${esc(i.fait)}</p></div>`
      : `<div class="fiche fermee"><div class="im">?</div><b>À découvrir</b><p>${esc(u.nom)}</p></div>`; }).join("")).join("");
  montrer("collection");
}

/* ---------- L'orbe : le son dessiné en cercle, à partir de ce qui sort vraiment du haut-parleur ---------- */
(function orbe() {
  const N = 56, lisse = new Float32Array(N), reduit = matchMedia("(prefers-reduced-motion: reduce)").matches; let t = 0;
  (function dessiner() {
    requestAnimationFrame(dessiner); const cv = document.getElementById("orbe-cv"); if (!cv || App.ecran !== "partie") return; const g = cv.getContext("2d"), W = cv.width, R = W * .27, C = W / 2; g.clearRect(0, 0, W, W); t += .02;
    let data = null; if (analyseur && source) { data = new Uint8Array(analyseur.frequencyBinCount); analyseur.getByteFrequencyData(data); }
    const col = getComputedStyle(document.documentElement).getPropertyValue("--c").trim() || "#7c5cff"; let moy = 0;
    for (let i = 0; i < N; i++) { const k = i < N / 2 ? i : N - 1 - i, cible = data ? data[Math.min(data.length - 1, Math.floor(Math.pow(k / (N / 2), 1.4) * data.length * .7))] / 255 : (reduit ? .1 : .1 + .06 * Math.sin(t * 2 + i * .45)); lisse[i] += (cible - lisse[i]) * .3; moy += lisse[i]; }
    moy /= N; if (data) Monde.son(moy * 1.6); const rc = R * (.86 + moy * .5), gr = g.createRadialGradient(C, C - rc * .3, rc * .1, C, C, rc); gr.addColorStop(0, "#fff"); gr.addColorStop(.25, col); gr.addColorStop(1, "rgba(0,0,0,.55)");
    g.shadowColor = col; g.shadowBlur = 40 + moy * 120; g.fillStyle = gr; g.beginPath(); g.arc(C, C, rc, 0, 6.3); g.fill(); g.shadowBlur = 0; g.lineCap = "round"; g.lineWidth = W * .016;
    for (let i = 0; i < N; i++) { const a = i / N * 6.283 - 1.571, r0 = R * 1.22, r1 = r0 + 6 + lisse[i] * W * .2; g.strokeStyle = i % 2 ? col : "#fff"; g.globalAlpha = .35 + lisse[i] * .65; g.beginPath(); g.moveTo(C + Math.cos(a) * r0, C + Math.sin(a) * r0); g.lineTo(C + Math.cos(a) * r1, C + Math.sin(a) * r1); g.stroke(); }
    g.globalAlpha = 1;
  })();
})();

/* ---------- Les commandes ---------- */
$("affiches").onclick = e => { const a = e.target.closest("[data-mode]"); if (a) selectionner(a.dataset.mode, true); };
$("onglets").onclick = e => { const b = e.target.closest("[data-u]"); if (b) ecranNiveaux(b.dataset.u); };
$("niveaux").onclick = e => { const b = e.target.closest("[data-n]"); if (b && !b.disabled) jeuQuiz({ univers: parUnivers(App.univers), niveau: NIVEAUX[+b.dataset.n - 1] }); };
document.querySelectorAll("[data-accueil]").forEach(b => b.onclick = () => accueil(App.mode && App.mode.id));
$("joueur").onclick = collection;
$("quitter").onclick = () => { Chrono.stop(); clearTimeout(App.auto); arreter(); const m = App.mode; App.id++; if (m && m.id === "quiz") ecranNiveaux(); else accueil(m && m.id); };
document.addEventListener("keydown", e => {
  if (App.ecran !== "partie" || e.ctrlKey || e.metaKey || e.altKey) return; const m = App.mode.id;
  if (e.key === "Escape") return $("quitter").click();
  if ((m === "quiz" || m === "survie") && /^[1-6]$/.test(e.key) && App.etat === "attente") { const b = document.querySelectorAll("#reponses .rep")[+e.key - 1]; if (b) b.click(); }
  else if (m === "intrus" && /^[1-3]$/.test(e.key) && App.etat === "attente") document.querySelectorAll(".pad")[+e.key - 1].click();
  else if (m === "hautbas" && (e.key === "ArrowUp" || e.key === "ArrowDown")) { e.preventDefault(); App.repondre(e.key === "ArrowUp"); }
  else if (m === "memoire" && /^[1-4]$/.test(e.key)) App.repondre(+e.key - 1);
});
$("vers-jouer").href = HUB;
window.TIMBRE = { App, MODES, lire, accueil, Chrono, inst };
accueil((location.hash || "").slice(1));
