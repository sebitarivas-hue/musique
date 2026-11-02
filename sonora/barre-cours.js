// Barre commune aux pages hors du site du cours (SONORA, Atlas) : revenir à la page d'où l'on vient, à son cours, à son parcours et à ses points.
// Le site du cours note à chaque page son adresse complète et son titre (clé « cours:origine », dans la session et dans le navigateur).
// On ne s'appuie pas sur la page précédente transmise par le navigateur : elle perd tout ce qui suit le « # », donc l'endroit exact du cours.
// Sans origine connue (adresse tapée à la main, nouvel appareil), le retour mène au choix enseignant ou élève, comme avant.
(function () {
  "use strict";
  const lire = (stock, k) => { try { const v = stock.getItem(k); return v ? JSON.parse(v) : null; } catch (_) { return null; } };
  const racine = location.href.split(/\/(?:sonora|atlas)\//)[0] + "/";
  const memeSite = u => { try { return new URL(u).origin === location.origin; } catch (_) { return false; } };
  let origine = lire(sessionStorage, "cours:origine") || lire(localStorage, "cours:origine");
  if (origine && !memeSite(origine.u)) origine = null;
  // repli : la page précédente transmise par le navigateur, si elle est du site et hors de SONORA et de l'Atlas (sans le « # », donc moins précise)
  if (!origine) { try { const r = document.referrer && new URL(document.referrer); if (r && r.origin === location.origin && !/\/(sonora|atlas)\//.test(r.pathname)) { origine = { u: r.href, t: "", espace: /\/eleves\//.test(r.pathname) ? "eleves" : "prof" }; sessionStorage.setItem("cours:origine", JSON.stringify(origine)); } } catch (_) {} }
  const espace = (origine && origine.espace) || (() => { try { return localStorage.getItem("cours:espace"); } catch (_) { return null; } })();
  const base = espace === "prof" ? racine + "index.html" : espace === "eleves" ? racine + "eleves/index.html" : null;
  const dernier = lire(localStorage, "cours:dernier");
  const coursU = dernier && memeSite(dernier.u) && (!espace || dernier.espace === espace) ? dernier.u : base ? base + "#cours" : racine + "choix.html";
  const retourU = origine ? origine.u : racine + "choix.html";
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const titre = origine && origine.t ? origine.t.replace(/\s+/g, " ").trim().slice(0, 48) : "";

  // la flèche des pages SONORA et le lien de l'Atlas mènent au même endroit que « Retour »
  document.querySelectorAll("a.retour").forEach(a => { a.href = retourU; if (titre) a.setAttribute("aria-label", "Retour : " + titre); });

  let xp = null; if (espace === "eleves") { const j = lire(localStorage, "jeu"); if (j && typeof j.xp === "number") xp = j.xp; }
  const rub = [["semaine", "Semaine"], ["cours", "Cours"], ["ecouter", "Écouter"], ["jouer", "Jouer"], ["labo", "Labo"]];
  const nav = document.createElement("nav"); nav.className = "barre-cours"; nav.setAttribute("aria-label", "Revenir au cours");
  nav.innerHTML = `<a class="bc-retour" href="${esc(retourU)}"><span class="bc-fl" aria-hidden="true"></span>${titre ? `<span class="bc-pre">Retour :</span><span class="bc-t">${esc(titre)}</span>` : "Choisir son espace"}</a>`
    + (base ? `<a class="bc-b" href="${esc(coursU)}">Mon cours</a>` : "")
    + (espace === "eleves" ? `<a class="bc-b" href="${esc(base)}#parcours">Mon parcours${xp !== null ? ` <span class="bc-xp">${xp} XP</span>` : ""}</a>` : "")
    + (base ? `<span class="bc-rub">${rub.map(([h, t]) => `<a href="${esc(base)}#${h}">${t}</a>`).join("")}</span>` : "");
  const css = document.createElement("style");
  css.textContent = `.barre-cours{display:flex;align-items:center;gap:6px;padding:5px 10px;background:#11110F;color:#F0EFE8;border-bottom:1px solid #3A3A35;overflow-x:auto;scrollbar-width:none;font:600 13px/1.2 "Instrument Sans","Helvetica Neue",Arial,sans-serif;position:relative;z-index:40}
.barre-cours::-webkit-scrollbar{display:none}.barre-cours a{color:#F0EFE8;text-decoration:none;white-space:nowrap;display:inline-flex;align-items:center;gap:6px;min-height:34px;padding:4px 10px;border:1.5px solid transparent}
.barre-cours a:hover,.barre-cours a:focus-visible{border-color:#D6FF00;outline:none}.barre-cours a{flex:0 0 auto}.barre-cours .bc-retour{background:#D6FF00;color:#11110F;max-width:min(62vw,380px)}.barre-cours .bc-t{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.barre-cours .bc-pre{font-weight:500}.barre-cours .bc-fl{display:inline-block;width:8px;height:8px;border-left:2.5px solid currentColor;border-bottom:2.5px solid currentColor;transform:rotate(45deg);margin:0 4px 1px 2px}
.barre-cours .bc-b{border-color:#F0EFE8}.barre-cours .bc-xp{background:#D6FF00;color:#11110F;padding:1px 6px;font:700 11px monospace}
.barre-cours .bc-rub{display:flex;gap:2px;margin-left:auto;padding-left:8px;border-left:1px solid #3A3A35}.barre-cours .bc-rub a{font-weight:500;text-transform:uppercase;letter-spacing:.06em;font-size:11px}
@media (max-width:700px){.barre-cours .bc-rub{margin-left:0}.barre-cours .bc-pre{display:none}.barre-cours .bc-retour{max-width:46vw}}`;
  document.head.appendChild(css); document.body.insertBefore(nav, document.body.firstChild);
  window.BARRE_COURS = { retour: retourU, cours: coursU, espace, xp };

  // Points : les mêmes que ceux du site du cours (clé « jeu » du navigateur, même règle : des points une seule fois par action).
  // Seul l'espace élève en gagne, comme sur le site. Les badges sont recalculés par le site au prochain point gagné là-bas.
  // Barème des outils (le site donne 5 à 20 points par action) :
  //   Atlas : 1 par fiche lue, 3 par mode d'exploration ouvert la première fois, 5 par parcours ouvert ;
  //   SONORA : Academy 10 par exercice réussi ; Science 5 par expérience mesurée, 10 par mesure à l'écoute terminée, 3 pour le générateur ;
  //   Library 2 par instrument écouté ; Studio 5 au premier son ; Pistes 3 au premier son ajouté, 10 au premier enregistrement, 10 au premier export, 3 par effet ;
  //   Harmonie 3 par partie finie (une fois par jeu et niveau), 10 pour 7 bonnes réponses sur 10 ou plus (une fois par jeu et niveau).
  let toastT = 0;
  function annoncer(x) {
    let t = document.getElementById("bc-toast");
    if (!t) { t = document.createElement("div"); t.id = "bc-toast"; t.setAttribute("role", "status"); t.setAttribute("aria-live", "polite"); t.style.cssText = "position:fixed;right:14px;bottom:14px;z-index:9999;background:#D6FF00;color:#11110F;border:2px solid #11110F;font:700 14px monospace;padding:8px 12px;box-shadow:4px 4px 0 #11110F;transition:opacity .3s"; document.body.appendChild(t); }
    t.textContent = `+${x} XP`; t.style.opacity = "1"; clearTimeout(toastT); toastT = setTimeout(() => { t.style.opacity = "0"; }, 1600);
  }
  function gagner(cle, points, compteur) {
    if (espace !== "eleves") return false;
    const j = Object.assign({ xp: 0, faits: {}, badges: {}, c: {}, pays: {}, jours: [], serie: 0 }, lire(localStorage, "jeu") || {}); j.faits = j.faits || {}; j.c = j.c || {};
    if (cle && j.faits[cle]) return false;
    if (cle) j.faits[cle] = 1; if (compteur) j.c[compteur] = (j.c[compteur] || 0) + 1; j.xp = (j.xp || 0) + (points || 0);
    try { localStorage.setItem("jeu", JSON.stringify(j)); } catch (_) { return false; }
    const puce = nav.querySelector(".bc-xp"); if (puce) puce.textContent = j.xp + " XP"; else { const mp = [...nav.querySelectorAll("a")].find(a => /Mon parcours/.test(a.textContent)); if (mp) mp.insertAdjacentHTML("beforeend", ` <span class="bc-xp">${j.xp} XP</span>`); }
    window.BARRE_COURS.xp = j.xp; if (points) annoncer(points); return true;
  }
  window.COURS_POINTS = { gagner };
  // les points demandés avant le chargement de ce fichier (l'Atlas rend sa première page avant)
  (window.__pointsEnAttente || []).forEach(a => gagner(...a)); window.__pointsEnAttente = [];
})();
