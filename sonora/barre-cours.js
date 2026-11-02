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
})();
