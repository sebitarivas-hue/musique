// Recherche partout sur le site (cours, SONORA, Atlas) : un bouton toujours visible, la touche « / » ou Ctrl+K.
// L'index (recherche.json) est produit à chaque génération par outils/recherche.py ; il n'est chargé qu'au premier usage. Rien n'est envoyé nulle part.
(function () {
  "use strict";
  if (window.__RECHERCHE) return; window.__RECHERCHE = true;
  const dossier = document.currentScript && document.currentScript.src ? new URL(".", document.currentScript.src).href : null;   // l'index est rangé à côté du script
  const p = location.pathname, m = p.match(/^(.*?)\/(sonora|atlas|eleves|parents)\//), racine = location.origin + (m ? m[1] + "/" : p.replace(/[^/]*$/, ""));
  const lire = k => { try { return localStorage.getItem(k); } catch (_) { return null; } };
  const espace = () => /\/eleves\//.test(p) ? "eleves" : (window.BARRE_COURS && window.BARRE_COURS.espace) || lire("cours:espace") || "prof";
  const classe = () => lire("classe") || "";
  const I = { "6e": 0, "5e": 1, "4e": 2, "3e": 3 };
  const norm = t => String(t).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const ORDRE = ["Cours", "Fiche", "Jeu", "Laboratoire", "SONORA", "Atlas", "Monde", "Chorale", "Tutoriel"];
  const NOMS = { Cours: "Dans le cours", Fiche: "Fiches de notions", Jeu: "Jeux", Laboratoire: "Laboratoire de programmation", SONORA: "SONORA, les outils du son", Atlas: "Atlas des musiques", Monde: "Musiques du monde", Chorale: "Chorale", Tutoriel: "Vidéos tutoriels" };
  let INDEX = null, charge = null, ouvert = false, choix = -1, liens = [];
  const adresse = a => a.charAt(0) === "#" ? racine + (espace() === "eleves" ? "eleves/" : "") + "index.html" + a : racine + a;
  const charger = () => charge || (charge = fetch((dossier || racine) + "recherche.json").then(r => r.json()).then(j => { INDEX = j.e; return INDEX; }).catch(e => { charge = null; throw e; }));
  const permis = x => { if (!x[5]) return true; if (espace() !== "eleves") return true; const c = classe(); if (!(c in I)) return true; return I[c] >= I[x[5]]; };
  const pourEleve = x => !(espace() === "eleves" && x[1] === "Cours" && /^#(seq|seance)-/.test(x[2]) && classe() in I && x[5] && x[5] !== classe());

  function chercher(q) {
    const n = norm(q), mots = n.split(" ").filter(t => t.length > 1); if (!mots.length) return [];
    const res = [];
    for (const x of INDEX) {
      if (!permis(x) || !pourEleve(x)) continue;
      const titre = norm(x[0]), texte = x[3]; let s = 0, tous = true;
      for (const t of mots) { const ti = titre.indexOf(t), te = texte.indexOf(t); if (ti < 0 && te < 0) { tous = false; break; } s += ti >= 0 ? (ti === 0 || titre.charAt(ti - 1) === " " ? 12 : 8) : 2; }
      if (!tous) continue;
      if (mots.length > 1 && texte.indexOf(n) >= 0) s += 15; if (titre.indexOf(n) >= 0) s += 25; if (x[1] === "Tutoriel") s += 1;
      res.push([s, x]);
    }
    return res.sort((a, b) => b[0] - a[0]);
  }

  const css = document.createElement("style");
  css.textContent = `#rch-b{position:fixed;top:10px;right:10px;z-index:9000;display:inline-flex;align-items:center;gap:7px;min-height:40px;padding:0 13px;border:2px solid #11110F;border-radius:22px;background:#D6FF00;color:#11110F;font:700 14px/1 "Instrument Sans","Helvetica Neue",Arial,sans-serif;cursor:pointer;box-shadow:0 2px 0 #11110F}
#rch-b svg{width:18px;height:18px}.entete #rch-b{position:static;margin-left:8px;align-self:center;min-height:36px;box-shadow:none;border-color:#D6FF00}#rch-b:focus-visible,#rch-b:hover{outline:3px solid #11110F;outline-offset:2px}.barre-cours #rch-b{position:static;min-height:34px;box-shadow:none;margin-left:auto;flex:0 0 auto;border-radius:0;border-width:1.5px;border-color:#D6FF00}
.barre-cours #rch-b + .bc-rub{margin-left:0}@media (max-width:560px){#rch-b .rch-t{display:none}#rch-b{width:42px;padding:0;justify-content:center}}
#rch-f{position:fixed;inset:0;z-index:9500;background:rgba(17,17,15,.72);display:none;align-items:flex-start;justify-content:center;padding:4vh 10px 10px}#rch-f.on{display:flex}
#rch-bo{width:min(720px,100%);max-height:92vh;display:flex;flex-direction:column;background:#FAFAF5;color:#11110F;border:2px solid #11110F;border-radius:14px;overflow:hidden;font:16px/1.4 "Instrument Sans","Helvetica Neue",Arial,sans-serif}
#rch-h{display:flex;gap:8px;padding:12px;border-bottom:2px solid #11110F;background:#fff}#rch-q{flex:1;min-width:0;height:46px;padding:0 14px;border:2px solid #11110F;border-radius:10px;font:inherit;font-size:17px;background:#fff;color:#11110F}
#rch-x{min-width:46px;height:46px;border:2px solid #11110F;border-radius:10px;background:#D6FF00;color:#11110F;font:700 15px inherit;cursor:pointer}#rch-r{overflow:auto;padding:6px 12px 14px;-webkit-overflow-scrolling:touch}
#rch-r h3{margin:14px 0 6px;font:700 12px/1 "Instrument Sans",Arial,sans-serif;letter-spacing:.09em;text-transform:uppercase;color:#4a4a44}#rch-r a{display:block;padding:9px 11px;margin:3px 0;border:1.5px solid #D9D8CE;border-radius:9px;background:#fff;color:#11110F;text-decoration:none}
#rch-r a:hover,#rch-r a.sel,#rch-r a:focus-visible{border-color:#11110F;background:#F3F9C8;outline:none}#rch-r a b{display:block;font-size:15px}#rch-r a span{display:block;font-size:13px;color:#4a4a44;margin-top:2px}
#rch-r .rch-plus{border-style:dashed;text-align:center;font-size:13px;cursor:pointer;background:transparent}#rch-r .rch-vide{padding:18px 6px;color:#4a4a44}#rch-pied{padding:8px 14px;border-top:1px solid #D9D8CE;font-size:12px;color:#4a4a44;background:#fff}`;
  document.head.appendChild(css);

  const bouton = document.createElement("button"); bouton.type = "button"; bouton.id = "rch-b"; bouton.setAttribute("aria-label", "Rechercher sur le site"); bouton.setAttribute("title", "Rechercher (touche /)");
  bouton.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/></svg><span class="rch-t">Rechercher</span>`;
  // Le bouton : dans l'en-tête du site du cours (qui le dessine lui-même), dans la barre des pages SONORA, sinon en haut à droite.
  const place = () => { const bc = document.querySelector(".barre-cours"); if (bc) { const r = bc.querySelector(".bc-rub"); bc.insertBefore(bouton, r || null); } else if (!document.getElementById("entete") && !document.getElementById("rch-b")) document.body.appendChild(bouton); };
  const fen = document.createElement("div"); fen.id = "rch-f"; fen.setAttribute("role", "dialog"); fen.setAttribute("aria-modal", "true"); fen.setAttribute("aria-label", "Recherche");
  fen.innerHTML = `<div id="rch-bo"><div id="rch-h"><input id="rch-q" type="search" placeholder="Chercher : bruit blanc, fugue, Csound, gamelan…" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Chercher sur tout le site"><button type="button" id="rch-x" aria-label="Fermer la recherche">Fermer</button></div><div id="rch-r" aria-live="polite"></div><div id="rch-pied">Cours, fiches, jeux, laboratoire, SONORA, Atlas, musiques du monde et vidéos. Touche / pour chercher, Échap pour fermer.</div></div>`;
  const q = () => fen.querySelector("#rch-q"), zone = () => fen.querySelector("#rch-r");

  function afficher(txt) {
    const z = zone(); liens = []; choix = -1;
    if (!txt.trim()) { z.innerHTML = `<p class="rch-vide">Écris un mot : le site cherche dans tous les cours, fiches, jeux, ateliers, outils SONORA, musiques du monde et tutoriels.</p>`; return; }
    if (!INDEX) { z.innerHTML = `<p class="rch-vide">Chargement de l'index…</p>`; return; }
    const R = chercher(txt); if (!R.length) { z.innerHTML = `<p class="rch-vide">Rien pour « ${esc(txt)} ». Essaie un mot plus court, ou sans accord.</p>`; return; }
    const par = {}; R.forEach(([s, x]) => (par[x[1]] = par[x[1]] || []).push(x));
    z.innerHTML = `<p class="rch-vide" style="padding:8px 2px 0">${R.length} résultat${R.length > 1 ? "s" : ""} pour « ${esc(txt.trim())} »</p>` + ORDRE.filter(g => par[g]).map(g => {
      const L = par[g], sh = L.slice(0, 5), reste = L.slice(5);
      const carte = x => `<a href="${esc(adresse(x[2]))}" data-adr="${esc(x[2])}"><b>${esc(x[0])}</b>${x[4] ? `<span>${esc(x[4])}</span>` : ""}</a>`;
      return `<section><h3>${NOMS[g] || g} (${L.length})</h3>${sh.map(carte).join("")}${reste.length ? `<a class="rch-plus" href="#" data-plus="${g}">Voir les ${reste.length} autres</a><div hidden data-reste="${g}">${reste.map(carte).join("")}</div>` : ""}</section>`; }).join("");
    liens = [...z.querySelectorAll("a[data-adr]")];
  }
  function ouvrir() {
    if (ouvert) return; ouvert = true; if (!fen.parentNode) { document.body.appendChild(fen); }
    fen.classList.add("on"); q().focus(); afficher(q().value);
    charger().then(() => { if (ouvert) afficher(q().value); }).catch(() => { zone().innerHTML = `<p class="rch-vide">La recherche n'a pas pu charger son index. Vérifie la connexion, puis réessaie.</p>`; });
  }
  function fermer() { ouvert = false; fen.classList.remove("on"); try { const b = document.getElementById("rch-b"); if (b) b.focus(); } catch (_) {} }
  function aller(a) {
    const url = adresse(a.getAttribute("data-adr")), cible = new URL(url), ici = location.pathname === cible.pathname && location.origin === cible.origin;
    fermer(); if (ici) { location.hash = cible.hash; if (cible.hash === location.hash) window.dispatchEvent(new HashChangeEvent("hashchange")); } else location.href = url;
  }
  function init() {
    place(); document.addEventListener("click", e => { if (e.target.closest && e.target.closest("#rch-b")) { e.preventDefault(); ouvrir(); } });
    fen.addEventListener("click", e => { if (e.target === fen || e.target.id === "rch-x") { fermer(); return; } const pl = e.target.closest("[data-plus]"); if (pl) { e.preventDefault(); const r = fen.querySelector(`[data-reste="${pl.dataset.plus}"]`); r.hidden = false; pl.remove(); liens = [...zone().querySelectorAll("a[data-adr]")]; return; }
      const a = e.target.closest("a[data-adr]"); if (a) { e.preventDefault(); aller(a); } });
    fen.addEventListener("input", e => { if (e.target.id === "rch-q") afficher(e.target.value); });
    document.addEventListener("keydown", e => {
      const dans = /^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || "") || (document.activeElement && document.activeElement.isContentEditable);
      if (!ouvert && ((e.key === "/" && !dans && !e.ctrlKey && !e.metaKey && !e.altKey) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k"))) { e.preventDefault(); ouvrir(); return; }
      if (!ouvert) return;
      if (e.key === "Escape") { e.preventDefault(); fermer(); }
      else if (e.key === "ArrowDown" || e.key === "ArrowUp") { if (!liens.length) return; e.preventDefault(); choix = (choix + (e.key === "ArrowDown" ? 1 : -1) + liens.length) % liens.length; liens.forEach((l, i) => l.classList.toggle("sel", i === choix)); liens[choix].scrollIntoView({ block: "nearest" }); }
      else if (e.key === "Enter" && liens.length) { e.preventDefault(); aller(liens[choix >= 0 ? choix : 0]); } });
    document.addEventListener("focusin", e => { if (ouvert && !fen.contains(e.target) && !(e.target.closest && e.target.closest("#rch-b"))) q().focus(); });
  }
  if (document.body) init(); else document.addEventListener("DOMContentLoaded", init);
  window.RECHERCHE = { ouvrir, fermer, chercher: txt => charger().then(() => chercher(txt).map(r => r[1])) };
})();
