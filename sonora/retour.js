// Lien de retour des pages SONORA : ramène là où l'on était avant d'entrer (espace élèves ou espace enseignant).
// L'origine est retenue pour la session ; sans origine connue, le lien mène au choix élève ou enseignant.
(function () {
  const CLE = "sonora:origine"; let origine = null;
  try { origine = sessionStorage.getItem(CLE); } catch (_) {}
  try { if (document.referrer) { const u = new URL(document.referrer); if (u.origin === location.origin && !u.pathname.includes("/sonora/")) { origine = u.href; try { sessionStorage.setItem(CLE, origine); } catch (_) {} } } } catch (_) {}
  const a = document.querySelector("a.retour"); if (a && origine) a.href = origine;
})();

// Diagnostic : si un morceau de la page ne peut pas s'exécuter sur un appareil (navigateur trop ancien, fichier non chargé), une bande le dit
// au lieu de laisser une page muette. Elle donne la cause exacte, qu'on peut montrer ou photographier.
(function () {
  let n = 0;
  function bande(texte) {
    if (n++ > 2 || document.getElementById("sonora-erreur")) return;
    const d = document.createElement("div"); d.id = "sonora-erreur"; d.setAttribute("role", "alert");
    d.style.cssText = "position:fixed;left:0;right:0;bottom:0;z-index:99999;background:#FF5638;color:#11110F;font:600 13px/1.45 ui-monospace,Menlo,monospace;padding:10px 14px;display:flex;gap:12px;align-items:flex-start;border-top:2px solid #11110F";
    const t = document.createElement("span"); t.style.flex = "1"; t.textContent = "Une partie de cette page n'a pas pu s'exécuter sur cet appareil : " + texte + ". Mets ton navigateur à jour, ou montre ce message à ton professeur.";
    const b = document.createElement("button"); b.type = "button"; b.textContent = "Fermer"; b.style.cssText = "font:700 12px ui-monospace,Menlo,monospace;padding:6px 10px;background:#11110F;color:#D6FF00;border:0;border-radius:0;cursor:pointer"; b.onclick = () => d.remove();
    d.append(t, b); (document.body || document.documentElement).appendChild(d);
  }
  const court = u => String(u || "").split("/").slice(-2).join("/");
  window.addEventListener("error", e => {
    const c = e.target;
    if (c && c !== window && (c.tagName === "SCRIPT" || (c.tagName === "LINK" && /stylesheet/i.test(c.rel)))) { bande("fichier non chargé (" + court(c.src || c.href) + ")"); return; }
    const m = String(e.message || ""); if (!m || /ResizeObserver|^Script error\.?$/.test(m)) return;
    bande(m.slice(0, 160) + (e.filename ? " (" + court(e.filename) + (e.lineno ? ":" + e.lineno : "") + ")" : ""));
  }, true);
})();
