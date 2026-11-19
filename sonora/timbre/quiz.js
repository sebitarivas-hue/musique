// Les quiz de l'Atlas, dans la salle de jeux : cinq jeux sur ce qu'on apprend en classe, tirés au hasard à chaque partie.
// Les points du cours suivent les règles du site : une étoile gagnée rapporte une seule fois (jamais « une fois par jour »), rien pour une simple visite.
import { CREER, MANCHES, etoiles } from "./quiz_logique.js?v=31c8eac6cd";
import { monterGlobe } from "./globe.js?v=20261117c";

const $ = id => document.getElementById(id), esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const rnd = Math.random, ATLAS = "../../atlas/index.html#e/";
const ETOILE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2.5 2.9 6.2 6.7.8-5 4.6 1.4 6.7L12 17.4l-6 3.4 1.4-6.7-5-4.6 6.7-.8z"/></svg>';
const JEUX = [
  { id: "cours", nom: "Les musiques du cours", pitch: "Une description, une musique du cours à retrouver, puis sa question d'écoute.", k: "#12a07a" },
  { id: "lieux", nom: "D'où vient cette musique ?", pitch: "Niveau 1 : le continent. Niveau 2 : le pays ou la région.", k: "#35e0ff" },
  { id: "ordre", nom: "Remets dans l'ordre", pitch: "Quatre musiques à ranger de la plus ancienne à la plus récente.", k: "#ff8a00" },
  { id: "mots", nom: "Le mot juste", pitch: "Devenu un jeu de TIMBRE : une définition, quatre mots en cristaux, trois vies et le chrono.", k: "#ffd23f", timbre: true },
  { id: "trajets", nom: "Le fil du trajet", pitch: "Une étape d'un trajet de l'Atlas : retrouve de quelle musique il s'agit.", k: "#9b6bff" },
];
const CLE = "timbre.quiz", lire = () => { try { return JSON.parse(localStorage.getItem(CLE) || "{}") || {}; } catch (_) { return {}; } }, ecrire = j => { try { localStorage.setItem(CLE, JSON.stringify(j)); } catch (_) {} };
const etoilesHtml = n => `<span class="qa-et" aria-label="${n} étoile${n > 1 ? "s" : ""} sur 3">${[1, 2, 3].map(i => `<i class="${i <= n ? "on" : ""}">${ETOILE}</i>`).join("")}</span>`;
const ESPACE = (() => { try { return localStorage.getItem("cours:espace") || ""; } catch (_) { return ""; } })(), RACINE = location.href.split(/\/sonora\//)[0] + "/";
$("vers-jouer").href = RACINE + (ESPACE === "prof" ? "index.html" : ESPACE === "eleves" ? "eleves/index.html" : "choix.html") + (ESPACE ? "#jouer" : "");
let Q = null, P = null, G = null;
/* Le globe : il démarre quand les continents sont chargés ; sans WebGL, le quiz reste tel quel, sans globe. */
function demarrerGlobe() {
  const lire = f => fetch(f).then(r => r.json()).catch(() => []);
  return Promise.all([lire("terres.json?v=20261117c"), lire("frontieres.json?v=20261117c"), lire("pays.json?v=20261117c")]).then(([terres, frontieres, pays]) => {
    G = monterGlobe($("globe"), terres, Object.values(Q.geo || {}), { frontieres, pays });
    if (!G) { $("globe").remove(); return; }
    document.body.classList.add("globe-on"); window.GLOBE = G;
    const e = $("escale");
    window.GLOBE_ESCALE = x => { if (!x) { e.hidden = true; return; } e.innerHTML = x.html; e.hidden = false; };
    window.GLOBE_ETIQUETTE = (x, y, visible) => { const r = $("globe").getBoundingClientRect(); e.style.left = (r.left + x * r.width) + "px"; e.style.top = Math.max(r.top + 40, r.top + y * r.height) + "px"; e.style.opacity = visible ? 1 : 0; };
  }).catch(() => {});
}
const lieu = id => Q && Q.geo && Q.geo[id];
function voyage(cibles) {   // [[id, nom, sous-titre]] : l'avion vole d'une escale à l'autre, dans l'ordre
  if (!G || !P) return;
  cibles.forEach(([id, nom, sous]) => { const g = lieu(id); if (g) G.voler(g, `<small>${esc(sous || "Escale")}</small><b>${esc(nom)}</b>`, P.g.k); });
}

function accueil() {
  const j = lire(); document.documentElement.style.setProperty("--c", "#ffd23f"); $("jeu").classList.remove("en-partie"); document.body.classList.remove("partie"); dispatchEvent(new Event("resize")); if (G) { G.remettre(); G.vue("tout"); }
  $("jeu").innerHTML = `<h1>Quiz de <span>l'Atlas</span></h1><p class="chapo">Quatre jeux sur ce qu'on apprend en classe : les musiques du cours, les lieux, les dates, les trajets. Le mot juste est devenu un jeu de TIMBRE. Tu décolles d'Ablon-sur-Seine : à chaque réponse, l'avion t'emmène là où la musique est née. Les questions sont tirées au hasard : ton voisin n'a pas les mêmes.</p>
  <div class="qa-jeux">${JEUX.map(g => { if (g.timbre) return `<a class="qa-jeu" style="--k:${g.k}" href="index.html#mots"><b>${esc(g.nom)}</b><span>${esc(g.pitch)}</span><span class="qa-niv"><span class="qa-btn" style="margin:6px 0 0">Jouer dans TIMBRE &#8250;</span></span></a>`; const e1 = j[g.id + ":1"] || 0, e2 = j[g.id + ":2"] || 0; return `<div class="qa-jeu" style="--k:${g.k}"><b>${esc(g.nom)}</b><span>${esc(g.pitch)}</span>
    <div class="qa-niv"><button type="button" data-jeu="${g.id}" data-niv="1">Niveau 1 ${etoilesHtml(e1)}</button><button type="button" data-jeu="${g.id}" data-niv="2" ${e1 >= 2 ? "" : "disabled title=\"Deux étoiles au niveau 1 pour ouvrir le niveau 2\""}>Niveau 2 ${etoilesHtml(e2)}</button></div></div>`; }).join("")}</div>
  <p class="chapo" style="margin-top:18px">Toutes les réponses viennent de l'Atlas des musiques : après chaque question, un lien ouvre la fiche pour en savoir plus.</p>`;
  $("jeu").querySelectorAll("[data-jeu]").forEach(b => b.onclick = () => lancer(b.dataset.jeu, +b.dataset.niv));
  try { history.replaceState(null, "", "#"); } catch (_) {}
}

function lancer(jeu, niv) {
  const g = JEUX.find(x => x.id === jeu); document.documentElement.style.setProperty("--c", g.k);
  P = { jeu, niv, g, qs: CREER[jeu](Q, niv, rnd), i: 0, bonnes: 0, retenir: [] }; if (G) { G.remettre(); G.vue("survol"); } $("jeu").classList.add("en-partie"); document.body.classList.add("partie"); dispatchEvent(new Event("resize")); question();
  try { history.replaceState(null, "", `#${jeu}-${niv}`); } catch (_) {}
}

function question() {
  const q = P.qs[P.i], total = P.qs.length;
  if (!q) return fin();
  const tete = `<div class="qa-hud"><span>${esc(P.g.nom)}, niveau ${P.niv}</span><span>${P.i + 1} / ${total}</span></div><div class="qa-barre"><i style="width:${(P.i / total) * 100}%"></i></div>
    <div class="qa-q"><div class="qa-type">${esc(q.type)}</div><h2>${esc(q.titre)}</h2><p>${esc(q.texte)}</p></div>`;
  if (P.jeu === "ordre") {
    const pris = [];
    $("jeu").innerHTML = tete + `<div class="qa-rep">${q.items.map(([id, nom]) => `<button type="button" data-id="${esc(id)}">${esc(nom)}</button>`).join("")}</div><div id="retour"></div>`;
    $("jeu").querySelectorAll(".qa-rep button").forEach(b => b.onclick = () => {
      if (b.disabled) return; pris.push(b.dataset.id); b.disabled = true; b.insertAdjacentHTML("afterbegin", `<span class="qa-rang">${pris.length}</span>`);
      if (pris.length === 4) { const ok = pris.every((id, k) => id === q.ordre[k]);
        $("jeu").querySelectorAll(".qa-rep button").forEach(x => { const r = q.ordre.indexOf(x.dataset.id); x.classList.add(pris.indexOf(x.dataset.id) === r ? "ok" : "ko"); });
        const bon = q.ordre.map(id => q.items.find(x => x[0] === id)).map(([id, nom, a]) => `<a href="${ATLAS + encodeURIComponent(id)}" target="_blank" rel="noopener">${esc(nom)}</a> (${a < 0 ? -a + " av. J.-C." : a})`).join(", ");
        repondu(ok, `Le bon ordre : ${bon}.`); voyage(q.ordre.map(id => q.items.find(x => x[0] === id)).map(([id, nom, a]) => [id, nom, a < 0 ? -a + " av. J.-C." : String(a)])); } });
    return;
  }
  $("jeu").innerHTML = tete + `<div class="qa-rep">${q.choix.map((c, k) => `<button type="button" data-k="${k}">${esc(c)}</button>`).join("")}</div><div id="retour"></div>`;
  $("jeu").querySelectorAll(".qa-rep button").forEach(b => b.onclick = () => {
    const k = +b.dataset.k, ok = k === q.bonne; $("jeu").querySelectorAll(".qa-rep button").forEach((x, i) => { x.disabled = true; if (i === q.bonne) x.classList.add("ok"); else if (i === k) x.classList.add("ko"); });
    const juste = q.choix[q.bonne], lien = q.id ? ` <a href="${ATLAS + encodeURIComponent(q.id)}" target="_blank" rel="noopener">Voir la fiche dans l'Atlas</a>` : "";
    let plus = `La réponse : ${esc(juste)}.${lien}`;
    if (P.jeu === "cours") plus += `<p><span class="qa-type">Question d'écoute</span> ${esc(q.question)}</p><p class="qa-ecoute">${q.ecoutes.map(([t, r]) => `<a href="https://www.youtube.com/results?search_query=${encodeURIComponent(r)}" target="_blank" rel="noopener">${esc(t)}</a>`).join("")}</p>`;
    repondu(ok, plus, P.jeu === "mots" ? `${P.niv === 1 ? juste : q.titre} : ${P.niv === 1 ? q.titre : juste}` : null);
    if (q.id) voyage([[q.id, P.jeu === "lieux" ? q.titre : juste, P.jeu === "lieux" ? juste : P.jeu === "cours" && P.niv === 1 ? q.titre : (ok ? "Bonne réponse" : "La réponse")]]);
  });
}

function repondu(ok, html, aRetenir) {
  if (ok) P.bonnes++; else if (aRetenir) P.retenir.push(aRetenir);
  $("retour").innerHTML = `<div class="qa-retour ${ok ? "ok" : "ko"}"><p class="qa-type">${ok ? "Bravo !" : "Pas tout à fait."}</p><p>${html}</p><button type="button" class="qa-btn" id="suite">${P.i + 1 < P.qs.length ? "Question suivante" : "Voir mon score"} &#8250;</button></div>`;
  $("suite").onclick = () => { P.i++; question(); }; $("suite").focus({ preventScroll: true }); $("retour").scrollIntoView({ block: "nearest", behavior: "smooth" });
}

function fin() {
  const total = P.qs.length, e = etoiles(P.bonnes, total), j = lire(), cle = `${P.jeu}:${P.niv}`;
  if (e > (j[cle] || 0)) { j[cle] = e; ecrire(j); }
  const CP = window.COURS_POINTS; if (CP) { for (let t = 1; t <= e; t++) CP.gagner(`quiz:${cle}:${t}`, 10 * t, "timbre"); if (CP.partie) CP.partie("atlas", e); }
  const ouvre = P.niv === 1 && e >= 2, vg = G && G.escales ? `<p class="qa-voyage"><span>Ton voyage</span><span>${G.escales} escale${G.escales > 1 ? "s" : ""}</span><span>${Math.round(G.total).toLocaleString("fr-FR")} km</span></p>` : "";
  if (G) G.vue("tout");
  $("jeu").innerHTML = `<div class="qa-fin"><div class="qa-type">${esc(P.g.nom)}, niveau ${P.niv}</div><div class="qa-score">${P.bonnes} / ${total}</div>${etoilesHtml(e)}${vg}
    <p>${e === 3 ? "Parfait, ou presque." : e === 2 ? "Bien joué." : e === 1 ? "C'est un début : rejoue pour gagner une étoile de plus." : "Rejoue : les questions changent à chaque partie."}${ouvre ? " Le niveau 2 est ouvert." : ""}</p>
    ${P.retenir.length ? `<h2>À retenir</h2><ul>${P.retenir.slice(0, 6).map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
    <button type="button" class="qa-btn" id="rejouer">Rejouer</button>${ouvre ? `<button type="button" class="qa-btn" id="niv2">Niveau 2</button>` : ""}<button type="button" class="qa-btn clair" id="accueil">Tous les quiz</button></div>`;
  $("rejouer").onclick = () => lancer(P.jeu, P.niv); if (ouvre) $("niv2").onclick = () => lancer(P.jeu, 2); $("accueil").onclick = accueil;
}

fetch("quiz_atlas.json?v=20261117c").then(r => r.json()).then(d => { Q = d; demarrerGlobe(); const m = /^#(\w+)-([12])$/.exec(location.hash); if (m && m[1] === "mots") { location.replace("index.html#mots"); return; } if (m && CREER[m[1]] && (m[2] === "1" || (lire()[m[1] + ":1"] || 0) >= 2)) lancer(m[1], +m[2]); else accueil(); })
  .catch(() => { $("jeu").innerHTML = `<p class="chapo">Les quiz n'ont pas pu se charger. Recharge la page.</p>`; });
