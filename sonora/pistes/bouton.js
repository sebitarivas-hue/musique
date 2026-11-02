// Bouton rotatif de SONORA Pistes (comme les manettes d'une console). Il se règle :
//   à la souris ou au doigt : en glissant vers le haut ou la droite (plus), vers le bas ou la gauche (moins) ; Maj ralentit,
//   à la molette, au clavier (flèches, Page précédente et suivante, Début, Fin), et un double clic (ou double toucher) le remet à sa valeur de départ.
// Il porte le rôle « slider » : un lecteur d'écran annonce son nom, sa valeur et ses bornes.
const NS = "http://www.w3.org/2000/svg", A0 = -135, A1 = 135, R = 19;
const pt = a => { const r = (a - 90) * Math.PI / 180; return [24 + R * Math.cos(r), 24 + R * Math.sin(r)]; };
const arc = (a, b) => { if (Math.abs(b - a) < 0.5) return ""; const [x0, y0] = pt(a), [x1, y1] = pt(b); return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${R} ${R} 0 ${Math.abs(b - a) > 180 ? 1 : 0} ${b > a ? 1 : 0} ${x1.toFixed(2)} ${y1.toFixed(2)}`; };
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function creerBouton({ libelle, nom = libelle, min, max, valeur, def = valeur, pas = 0, log = false, bipolaire = false, format = v => String(v), onInput, onChange, classe = "", classeValeur = "", donnee = "", taille = 46 }) {
  const el = document.createElement("div"); el.className = "rot " + classe; el.tabIndex = 0; el.setAttribute("role", "slider"); el.setAttribute("aria-label", nom); if (donnee) el.dataset.fx = donnee;
  el.style.setProperty("--taille", taille + "px");
  el.innerHTML = `<svg class="rot-svg" viewBox="0 0 48 48" aria-hidden="true" focusable="false"><path class="rot-piste" d="${arc(A0, A1)}"/><path class="rot-val" d=""/><line class="rot-aig" x1="24" y1="24" x2="24" y2="9"/><circle class="rot-cap" cx="24" cy="24" r="12"/></svg><span class="rot-lib">${esc(libelle)}</span><output class="rot-sortie ${classeValeur}"></output>`;
  const val = el.querySelector(".rot-val"), aig = el.querySelector(".rot-aig"), sortie = el.querySelector(".rot-sortie");
  const versT = v => log ? Math.log(v / min) / Math.log(max / min) : (v - min) / (max - min), depuisT = t => log ? min * Math.pow(max / min, t) : min + t * (max - min);
  const borne = v => Math.min(max, Math.max(min, v)), cale = v => { v = borne(v); if (pas && !log) v = borne(Math.round((v - min) / pas) * pas + min); return +v.toFixed(6); };
  let v = cale(valeur);
  function dessiner() {
    const t = versT(v), a = A0 + t * (A1 - A0), a0 = bipolaire ? (A0 + A1) / 2 : A0;
    val.setAttribute("d", arc(Math.min(a0, a), Math.max(a0, a))); aig.setAttribute("transform", `rotate(${a} 24 24)`);
    sortie.textContent = format(v); el.setAttribute("aria-valuemin", String(min)); el.setAttribute("aria-valuemax", String(max)); el.setAttribute("aria-valuenow", String(+v.toFixed(4))); el.setAttribute("aria-valuetext", format(v));
  }
  let fin = null; const fini = () => { clearTimeout(fin); fin = setTimeout(() => onChange && onChange(v), 180); };
  function regler(x, { emettre = true, final = false } = {}) { const n = cale(x); if (n === v && emettre) { if (final) fini(); return v; } v = n; dessiner(); if (emettre && onInput) onInput(v); if (final) fini(); return v; }
  function deplacer(dt, fin2) { regler(depuisT(Math.min(1, Math.max(0, versT(v) + dt))), { final: fin2 }); }
  el.regler = (x, o) => regler(x, { final: true, ...o }); el.valeur = () => v; el.defaut = () => def; el.remettre = () => regler(def, { final: true });
  el.addEventListener("pointerdown", e => {
    if (e.button) return; e.preventDefault(); el.focus({ preventScroll: true }); el.setPointerCapture(e.pointerId); el.classList.add("actif");
    let x0 = e.clientX, y0 = e.clientY;
    el.onpointermove = m => { const fin = m.shiftKey ? 700 : 170, dt = ((m.clientX - x0) - (m.clientY - y0)) / fin; x0 = m.clientX; y0 = m.clientY; if (dt) deplacer(dt, false); };
    el.onpointerup = el.onpointercancel = () => { el.onpointermove = el.onpointerup = el.onpointercancel = null; el.classList.remove("actif"); fini(); };
  });
  el.addEventListener("dblclick", e => { e.preventDefault(); el.remettre(); });
  el.addEventListener("wheel", e => { e.preventDefault(); deplacer((e.deltaY < 0 ? 1 : -1) * (e.shiftKey ? 0.005 : 0.03), true); }, { passive: false });
  el.addEventListener("keydown", e => {
    const petit = e.shiftKey ? 0.1 : 1, k = e.key; let fait = true;
    if (k === "ArrowUp" || k === "ArrowRight") { if (pas && !log) regler(v + pas * petit, { final: true }); else deplacer(0.02 * petit, true); }
    else if (k === "ArrowDown" || k === "ArrowLeft") { if (pas && !log) regler(v - pas * petit, { final: true }); else deplacer(-0.02 * petit, true); }
    else if (k === "PageUp") deplacer(0.1, true); else if (k === "PageDown") deplacer(-0.1, true);
    else if (k === "Home") regler(min, { final: true }); else if (k === "End") regler(max, { final: true });
    else if (k === "Delete" || k === "Backspace") el.remettre(); else fait = false;
    if (fait) { e.preventDefault(); e.stopPropagation(); }
  });
  dessiner(); return el;
}
