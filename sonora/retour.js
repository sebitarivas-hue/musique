// Diagnostic : si un morceau de la page ne peut pas s'exécuter sur un appareil (navigateur trop ancien, fichier non chargé), une bande le dit
// au lieu de laisser une page muette. Elle donne la cause exacte, qu'on peut montrer ou photographier.
(function () {
  let n = 0;
  function bande(texte) {
    if (n++ > 2 || document.getElementById("sonora-erreur")) return;
    const d = document.createElement("div"); d.id = "sonora-erreur"; d.setAttribute("role", "alert");
    d.style.cssText = "position:fixed;left:0;right:0;bottom:0;z-index:99999;background:#FF5638;color:#11110F;font:600 13px/1.45 ui-monospace,Menlo,monospace;padding:10px 14px;display:flex;gap:12px;align-items:flex-start;border-top:2px solid #11110F";
    const t = document.createElement("span"); t.style.flex = "1"; t.textContent = "Une partie de cette page n'a pas pu s'exécuter sur cet appareil : " + texte + ". Mets ton navigateur à jour, ou montre ce message à ton professeur. [" + (navigator.userAgent.match(/(Chrome|Edg|Firefox|Version|CriOS|FxiOS)\/[\d.]+/) || ["navigateur inconnu"])[0] + "]";
    const b = document.createElement("button"); b.type = "button"; b.textContent = "Fermer"; b.style.cssText = "font:700 12px ui-monospace,Menlo,monospace;padding:6px 10px;background:#11110F;color:#D6FF00;border:0;border-radius:0;cursor:pointer"; b.onclick = () => d.remove();
    d.append(t, b); (document.body || document.documentElement).appendChild(d);
  }
  const court = u => String(u || "").split("/").slice(-2).join("/");
  // Quand un module n'arrive pas à se charger, le navigateur ne dit pas lequel des dizaines de fichiers de la page est en cause.
  // La sonde les relit un à un (réseau, puis exécution, les dépendances d'abord) et donne le premier qui échoue et pourquoi.
  async function sonde(src) {
    const etat = new Map(), ordre = [];
    async function lire(u) {
      if (etat.has(u)) return; etat.set(u, "?");
      let t; try { const r = await fetch(u, { cache: "no-store" }); if (!r.ok) { etat.set(u, "HTTP " + r.status); return; } t = await r.text(); } catch (e) { etat.set(u, "réseau : " + String(e && e.message || e).slice(0, 60)); return; }
      const deps = []; for (const m of t.matchAll(/(?:^|[;\s}])(?:import|export)\s*(?:[^'";(]*?\sfrom\s*)?["'](\.{1,2}\/[^"']+\.js(?:\?[^"']*)?)["']/g)) { try { deps.push(new URL(m[1], u).href); } catch (_) {} }
      for (const d of deps) await lire(d);
      ordre.push(u); if (etat.get(u) === "?") etat.set(u, "ok");
    }
    try { await lire(src); } catch (e) { return "sonde : " + String(e && e.message || e).slice(0, 80); }
    const mal = [...etat].filter(([, v]) => v !== "ok"); if (mal.length) return mal.slice(0, 3).map(([u, v]) => court(u) + " (" + v + ")").join(" ; ");
    for (const u of ordre) { try { await import(u); } catch (e) { return court(u) + " : " + String(e && (e.name + " " + e.message) || e).slice(0, 140); } }
    return "";
  }
  window.addEventListener("error", e => {
    const c = e.target;
    if (c && c !== window && (c.tagName === "SCRIPT" || (c.tagName === "LINK" && /stylesheet/i.test(c.rel)))) {
      // Une page SONORA se compose de dizaines de fichiers : sur un réseau de téléphone, un seul qui n'arrive pas suffit à la laisser muette (retour du 16/11/2026, iPhone).
      // On recharge donc la page une seule fois, sans rien dire ; si le fichier manque encore, la bande donne la cause.
      try { const k = "sonora-reessai:" + location.pathname; if (!sessionStorage.getItem(k)) { sessionStorage.setItem(k, "1"); setTimeout(() => location.reload(), 600); return; } sessionStorage.removeItem(k); } catch (_) {}
      if (c.tagName === "SCRIPT" && c.type === "module" && c.src) { sonde(c.src).then(cause => bande("fichier non chargé (" + court(c.src) + ")" + (cause ? ", cause : " + cause : ""))); return; }
      bande("fichier non chargé (" + court(c.src || c.href) + ")"); return; }
    const m = String(e.message || ""); if (!m || /ResizeObserver|^Script error\.?$/.test(m)) return;
    // Erreurs qui ne viennent pas de la page : scripts injectés par le navigateur ou une extension (portefeuille de Brave : « window.ethereum »), évalués avec l'adresse de la page à la ligne 1.
    const f = String(e.filename || ""), page = location.href.split("#")[0];
    if (/ethereum|solana|metamask|webkit\.messageHandlers|__firefox__|-extension:/i.test(m + " " + f) || (f && f.split("#")[0] === page && (e.lineno || 0) <= 1)) return;
    bande(m.slice(0, 160) + (e.filename ? " (" + court(e.filename) + (e.lineno ? ":" + e.lineno : "") + ")" : ""));
  }, true);
})();
