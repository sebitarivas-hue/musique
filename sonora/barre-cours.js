// Barre commune aux pages hors du site du cours (SONORA, Atlas) : revenir à la page d'où l'on vient, à son cours, à son parcours et à ses points.
// Le site du cours note à chaque page son adresse complète et son titre (clé « cours:origine », dans la session et dans le navigateur).
// On ne s'appuie pas sur la page précédente transmise par le navigateur : elle perd tout ce qui suit le « # », donc l'endroit exact du cours.
// Sans origine connue (adresse tapée à la main, nouvel appareil), le retour mène au choix enseignant ou élève, comme avant.
(function () {
  "use strict";
  const lire = (stock, k) => { try { const v = stock.getItem(k); return v ? JSON.parse(v) : null; } catch (_) { return null; } };
  const racine = location.href.split(/\/(?:sonora|atlas)\//)[0] + "/";
  /* Fermeture de l'espace élève (même règle que fermeEleve() dans le site ; elle est copiée dans le navigateur à la première visite du site élève). */
  const ferme = () => { const F = lire(localStorage, "fermeture"); if (!F || window.TEST_SANS_FERMETURE) return false; const d = new Date(), j = d.getDay(); if (j === 0 || j === 6) return false;
    const p = n => String(n).padStart(2, "0"), iso = d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
    if (iso < F.saison[0] || iso > F.saison[1] || F.ouvert.some(a => iso >= a[0] && iso <= a[1])) return false; return d.getHours() >= F.debut || d.getHours() < F.fin; };
  const memeSite = u => { try { return new URL(u).origin === location.origin; } catch (_) { return false; } };
  let origine = lire(sessionStorage, "cours:origine") || lire(localStorage, "cours:origine");
  if (origine && !memeSite(origine.u)) origine = null;
  // repli : la page précédente transmise par le navigateur, si elle est du site et hors de SONORA et de l'Atlas (sans le « # », donc moins précise)
  if (!origine) { try { const r = document.referrer && new URL(document.referrer); if (r && r.origin === location.origin && !/\/(sonora|atlas)\//.test(r.pathname)) { origine = { u: r.href, t: "", espace: /\/eleves\//.test(r.pathname) ? "eleves" : "prof" }; sessionStorage.setItem("cours:origine", JSON.stringify(origine)); } } catch (_) {} }
  const espace = (origine && origine.espace) || (() => { try { return localStorage.getItem("cours:espace"); } catch (_) { return null; } })();
  if (espace === "eleves" && ferme()) { location.replace(racine + "eleves/index.html"); return; }
  const base = espace === "prof" ? racine + "index.html" : espace === "eleves" ? racine + "eleves/index.html" : null;
  // Chaque classe a ses outils (03/11/2026) : un élève dont la classe est plus petite que celle de l'outil est ramené au Labo. Le professeur et les adresses sans classe connue ne sont pas touchés.
  { const MIN = { science: "4e", studio: "4e", library: "5e", academy: "3e" }, I = { "6e": 0, "5e": 1, "4e": 2, "3e": 3 }, outil = (location.pathname.match(/\/sonora\/(science|studio|library|academy)\//) || [])[1];
    let classe = ""; try { classe = localStorage.getItem("classe") || ""; } catch (_) {}
    if (espace === "eleves" && outil && I[classe] !== undefined && I[classe] < I[MIN[outil]]) { location.replace(racine + "eleves/index.html#labo"); return; } }
  const dernier = lire(localStorage, "cours:dernier");
  const coursU = dernier && memeSite(dernier.u) && (!espace || dernier.espace === espace) ? dernier.u : base ? base + "#cours" : racine + "choix.html";
  const retourU = origine ? origine.u : racine + "choix.html";
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const titre = origine && origine.t ? origine.t.replace(/\s+/g, " ").trim().slice(0, 48) : "";

  // la flèche des pages SONORA et le lien de l'Atlas mènent au même endroit que « Retour »
  document.querySelectorAll("a.retour").forEach(a => { a.href = retourU; if (titre) a.setAttribute("aria-label", "Retour : " + titre); });

  // Deux modes (03/11/2026) : Réviser (calme, par défaut) et Jouer (points, badges). Hors du mode Jouer, aucun point n'est donné ni montré, dans SONORA comme sur le site du cours.
  const jeuOn = () => { try { return localStorage.getItem("mode") === "jouer" && localStorage.getItem("gamification") !== "non"; } catch (_) { return false; } };
  let xp = null; if (espace === "eleves" && jeuOn()) { const j = lire(localStorage, "jeu"); if (j && typeof j.xp === "number") xp = j.xp; }
  const rub = [["semaine", "Semaine"], ["cours", "Cours"], ["ecouter", "Écouter"], ["jouer", "Jouer"], ["labo", "Labo"]];
  const nav = document.createElement("nav"); nav.className = "barre-cours"; nav.setAttribute("aria-label", "Revenir au cours");
  nav.innerHTML = `<a class="bc-retour" href="${esc(retourU)}"><span class="bc-fl" aria-hidden="true"></span>${titre ? `<span class="bc-pre">Retour :</span><span class="bc-t">${esc(titre)}</span>` : "Choisir son espace"}</a>`
    + (base ? `<a class="bc-b" href="${esc(coursU)}">Mon cours</a>` : "")
    + (espace === "eleves" && jeuOn() ? `<a class="bc-b" href="${esc(base)}#parcours">Mon parcours${xp !== null ? ` <span class="bc-xp">${xp} XP</span>` : ""}</a>` : "")
    + (base ? `<span class="bc-rub">${rub.map(([h, t]) => `<a href="${esc(base)}#${h}">${t}</a>`).join("")}</span>` : "");
  const css = document.createElement("style");
  css.textContent = `.barre-cours{display:flex;align-items:center;gap:6px;padding:5px 10px;background:#11110F;color:#F0EFE8;border-bottom:1px solid #3A3A35;overflow-x:auto;scrollbar-width:none;font:600 13px/1.2 "Instrument Sans","Helvetica Neue",Arial,sans-serif;position:relative;z-index:40}
.barre-cours::-webkit-scrollbar{display:none}.barre-cours a{color:#F0EFE8;text-decoration:none;white-space:nowrap;display:inline-flex;align-items:center;gap:6px;min-height:34px;padding:4px 10px;border:1.5px solid transparent}
.barre-cours a:hover,.barre-cours a:focus-visible{border-color:#D6FF00;outline:none}.barre-cours a{flex:0 0 auto}.barre-cours .bc-retour{background:#D6FF00;color:#11110F;max-width:min(62vw,380px)}.barre-cours .bc-t{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.barre-cours .bc-pre{font-weight:500}.barre-cours .bc-fl{display:inline-block;width:8px;height:8px;border-left:2.5px solid currentColor;border-bottom:2.5px solid currentColor;transform:rotate(45deg);margin:0 4px 1px 2px}
.barre-cours .bc-b{border-color:#F0EFE8}.barre-cours .bc-xp{background:#D6FF00;color:#11110F;padding:1px 6px;font:700 11px monospace}
.barre-cours .bc-rub{display:flex;gap:2px;margin-left:auto;padding-left:8px;border-left:1px solid #3A3A35}.barre-cours .bc-rub a{font-weight:500;text-transform:uppercase;letter-spacing:.06em;font-size:11px}
@media (max-width:700px){.barre-cours .bc-rub{display:none}.barre-cours .bc-pre{display:none}.barre-cours .bc-retour{max-width:46vw}}`;
  document.head.appendChild(css); document.body.insertBefore(nav, document.body.firstChild);
  window.BARRE_COURS = { retour: retourU, cours: coursU, espace, xp };

  // Points : les mêmes que ceux du site du cours (clé « jeu » du navigateur, même règle : des points une seule fois par action).
  // Seul l'espace élève en gagne, comme sur le site. Les badges sont recalculés par le site au prochain point gagné là-bas.
  // RÈGLE DE SÉBASTIEN (02/11/2026) : « on ne peut pas gagner des XP si on n'a pas fait toute la page et si on n'a pas fini d'entendre un son. JAMAIS. »
  // Donc aucun point à l'ouverture d'une page, au clic sur un bouton ou au lancement d'un son. Les points viennent :
  //   d'une lecture complète (lecture() ci-dessous : la fin de la zone a été vue ET le temps passé, page visible, suffit pour lire son texte),
  //   d'une écoute menée jusqu'à la fin naturelle du son (jamais interrompue),
  //   ou d'une activité terminée et juste (exercice réussi, test d'écoute mené au bout, partie finie en ayant écouté chaque question).
  // Barème des outils :
  //   Atlas : 1 par fiche lue en entier ; 5 par parcours dont toutes les fiches ont été lues en entier ;
  //   Academy : 10 par exercice réussi, après avoir écouté son propre son au moins 4 secondes ;
  //   Science : 5 par expérience écoutée au moins 4 secondes, mesurée, puis lue jusqu'au bout ; 10 par test d'écoute terminé (seuil, masquage) ;
  //     10 pour l'éventail des micro-intervalles vérifié après avoir écouté les cinq versions jusqu'au bout ;
  //   Library : 2 par instrument écouté au moins 8 secondes sans interruption et dont la fiche a été lue jusqu'au bout ;
  //   Pistes : 10 quand un enregistrement a été réécouté en entier dans la lecture du projet ; 10 pour un export d'au moins deux sons et 8 secondes,
  //     après avoir écouté tout le projet du début à la fin sans le modifier ensuite ;
  //   Harmonie : 3 par partie finie et 10 pour 7 sur 10 ou plus (une fois par jeu et niveau), seulement si chaque question a été écoutée jusqu'au bout avant la réponse.
  let toastT = 0, cumul = 0;
  function annoncer(x) {
    let t = document.getElementById("bc-toast");
    if (!t) { t = document.createElement("div"); t.id = "bc-toast"; t.setAttribute("role", "status"); t.setAttribute("aria-live", "polite"); t.style.cssText = "position:fixed;right:14px;bottom:14px;z-index:9999;background:#D6FF00;color:#11110F;border:2px solid #11110F;font:700 14px monospace;padding:8px 12px;box-shadow:4px 4px 0 #11110F;transition:opacity .3s"; document.body.appendChild(t); }
    cumul += x; t.textContent = `+${cumul} XP`; t.style.opacity = "1"; clearTimeout(toastT); toastT = setTimeout(() => { t.style.opacity = "0"; cumul = 0; }, 2200); // les points gagnés ensemble s'additionnent
  }
  /* La seconde copie de l'XP (voir SAUV dans le site) : même base IndexedDB, même clé. */
  function miroir(j) { try { const r = indexedDB.open("musique-sauvegarde", 1); r.onupgradeneeded = () => r.result.createObjectStore("k"); r.onsuccess = () => { try { const d = r.result, t = d.transaction("k", "readwrite"); let classe = ""; try { classe = localStorage.getItem("classe") || ""; } catch (_) {} t.objectStore("k").put({ t: Date.now(), jeu: j, classe }, "jeu"); t.oncomplete = t.onerror = t.onabort = () => d.close(); } catch (_) {} }; } catch (_) {} }
  function gagner(cle, points, compteur) {
    if (espace !== "eleves" || !jeuOn()) return false;
    const j = Object.assign({ xp: 0, faits: {}, badges: {}, c: {}, pays: {}, jours: [], serie: 0 }, lire(localStorage, "jeu") || {}); j.faits = j.faits || {}; j.c = j.c || {};
    if (cle && j.faits[cle]) return false;
    if (cle) j.faits[cle] = 1; if (compteur) j.c[compteur] = (j.c[compteur] || 0) + 1; j.xp = (j.xp || 0) + (points || 0);
    try { localStorage.setItem("jeu", JSON.stringify(j)); } catch (_) { return false; }
    miroir(j);
    const puce = nav.querySelector(".bc-xp"); if (puce) puce.textContent = j.xp + " XP"; else { const mp = [...nav.querySelectorAll("a")].find(a => /Mon parcours/.test(a.textContent)); if (mp) mp.insertAdjacentHTML("beforeend", ` <span class="bc-xp">${j.xp} XP</span>`); }
    window.BARRE_COURS.xp = j.xp; if (points) annoncer(points); return true;
  }
  const deja = cle => { const j = lire(localStorage, "jeu"); return !!(j && j.faits && j.faits[cle]); };
  // Lecture complète d'une zone : la fin a été vue ET le temps passé sur la page (onglet visible) suffit pour lire son texte,
  // à 3,5 mots par seconde, au moins 15 secondes et au plus 4 minutes. condition() : une exigence de plus (une écoute, une mesure), vérifiée au moment de donner les points.
  // Renvoie une fonction qui annule la surveillance (à appeler quand la zone est remplacée).
  function lecture(el, cle, points, compteur, { condition = null, apres = null } = {}) {
    if (espace !== "eleves" || !jeuOn() || !el || deja(cle)) return () => {};
    const mots = (el.innerText || el.textContent || "").split(/\s+/).filter(Boolean).length, besoin = Math.min(240, Math.max(15, mots / 3.5)) * 1000;
    let vu = false, temps = 0, t0 = document.hidden ? 0 : performance.now(), fini = false;
    const fin = document.createElement("span"); fin.className = "bc-fin"; fin.setAttribute("aria-hidden", "true"); fin.style.cssText = "display:block;height:1px;width:1px"; el.appendChild(fin);
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { vu = true; verifier(); } }); io.observe(fin);
    const cumul = () => { if (t0) { const t = performance.now(); temps += t - t0; t0 = document.hidden ? 0 : t; } };
    const vis = () => { cumul(); t0 = document.hidden ? 0 : performance.now(); };
    document.addEventListener("visibilitychange", vis); const tic = setInterval(verifier, 1000);
    function arreter() { io.disconnect(); clearInterval(tic); document.removeEventListener("visibilitychange", vis); fin.remove(); }
    function verifier() { if (fini) return; cumul(); if (vu && temps >= besoin && (!condition || condition())) { fini = true; arreter(); gagner(cle, points, compteur); if (apres) apres(); } }
    return () => { if (!fini) { fini = true; arreter(); } };
  }
  window.COURS_POINTS = { gagner, lecture, deja };
  // les points demandés avant le chargement de ce fichier (l'Atlas rend sa première page avant)
  (window.__pointsEnAttente || []).forEach(a => gagner(...a)); window.__pointsEnAttente = [];
})();
