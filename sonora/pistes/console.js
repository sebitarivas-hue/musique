// La console de mixage de SONORA Pistes : une voie par piste (fader, panoramique, muet, solo, effets, vumètre), et la voie maître.
// Elle lit et écrit le même projet que la vue pistes et la vue blocs : rien n'est doublé. Les vumètres lisent les analyseurs des chaînes de lecture (pistes.js).
import * as B from "./blocs.js?v=e50346137a";
import { pictoDe } from "./blocs-ui.js?v=e50346137a";

// Des couleurs fluo sur fond noir : le jaune acide reste la signature du site, les voies prennent les autres.
export const COULEURS = ["#D6FF00", "#19E3FF", "#FF2BD6", "#FF8A1F", "#2BFF88", "#9B6BFF", "#3D7BFF", "#FF3D5A"];
export const couleurDeVoie = i => COULEURS[((i % COULEURS.length) + COULEURS.length) % COULEURS.length];
export const dB = g => g <= 0.0001 ? -Infinity : 20 * Math.log10(g);
export const texteDB = g => { const x = dB(g); return x === -Infinity ? "−∞" : (x > 0 ? "+" : x < 0 ? "−" : "") + Math.abs(x).toFixed(1).replace(".0", ""); };
export const texteDePan = p => Math.abs(p) < 0.02 ? "C" : (p < 0 ? "G" : "D") + Math.round(Math.abs(p) * 100);
// La position d'une valeur de niveau (en dB, de −60 à +6) sur la hauteur d'un vumètre, de 0 à 1.
export const hauteurVU = x => x === -Infinity ? 0 : Math.max(0, Math.min(1, (x + 60) / 66));
const SLOTS = [["filtre", "Filtre"], ["echo", "Écho"], ["reverb", "Salle"]];

export function creerConsole(d) {
  const { $, P, etat, esc, changer, ranger, message } = d;
  const v = { actif: false, crete: {}, creteMaitre: -Infinity };
  const racine = $("console"), tampon = new Float32Array(1024);

  function dessiner() {
    if (!v.actif || !etat.projet) return; const p = etat.projet;
    $("cs-voies").innerHTML = p.pistes.map((pi, i) => {
      const e = P.effetsDe(pi), inst = B.instrumentDePiste(p, pi.id), c = couleurDeVoie(i);
      return `<div class="cs-voie${pi.muet ? " cs-muette" : ""}" data-id="${pi.id}" style="--c:${c}">
        <div class="cs-tete"><i class="cs-num">${i + 1}</i><b title="${esc(pi.nom)}">${esc(pi.nom)}</b></div>
        <div class="cs-picto" aria-hidden="true">${pictoDe(inst)}</div>
        <div class="cs-fx" role="group" aria-label="Effets de ${esc(pi.nom)}">${SLOTS.map(([k, nom]) => `<button type="button" data-fx="${k}" aria-pressed="${e[k].actif}" title="${nom} : ${e[k].actif ? "allumé" : "éteint"}">${nom}</button>`).join("")}</div>
        <label class="cs-pan"><span>Pan</span><input type="range" class="cs-pan-r" min="-1" max="1" step="0.01" value="${pi.pan}" aria-label="Panoramique de ${esc(pi.nom)}"><output>${texteDePan(pi.pan)}</output></label>
        <div class="cs-ms"><button type="button" data-a="arme" aria-pressed="${etat.arme === pi.id}" title="Enregistrer sur cette voie">R</button><button type="button" data-a="muet" aria-pressed="${!!pi.muet}" title="Muet">M</button><button type="button" data-a="solo" aria-pressed="${!!pi.solo}" title="Solo">S</button></div>
        <div class="cs-fader"><div class="cs-vu" aria-hidden="true"><i class="cs-niv"></i><i class="cs-crete"></i></div><input type="range" class="cs-vol" min="0" max="1.5" step="0.01" value="${pi.volume}" aria-label="Volume de ${esc(pi.nom)}"></div>
        <output class="cs-db">${texteDB(pi.volume)}</output>
      </div>`;
    }).join("");
    $("cs-maitre").innerHTML = `<div class="cs-tete"><b>Maître</b></div>
      <button type="button" class="cs-pro" id="cs-pro" aria-pressed="${p.master === "pro"}" title="Son pro : niveau, tonalité, salle, largeur stéréo et compression d'un morceau actuel, comme à l'export">Son pro</button>
      <div class="cs-fader"><div class="cs-vu cs-vu-g" aria-hidden="true"><i class="cs-niv"></i><i class="cs-crete"></i></div><div class="cs-vu cs-vu-g" aria-hidden="true"><i class="cs-niv"></i><i class="cs-crete"></i></div></div>
      <output class="cs-db" id="cs-db-maitre">−∞</output>`;
  }

  // Les vumètres : à chaque image, le niveau de chaque chaîne de lecture (valeur efficace, en dB) et sa crête qui retombe lentement.
  function niveauDe(an) { an.getFloatTimeDomainData(tampon); let s = 0, c = 0; for (let k = 0; k < tampon.length; k++) { const a = Math.abs(tampon[k]); s += a * a; if (a > c) c = a; } return { rms: Math.sqrt(s / tampon.length), crete: c }; }
  function suivre() {
    if (!v.actif) return; let somme = 0, creteMax = 0;
    for (const voie of racine.querySelectorAll(".cs-voie")) {
      const ch = etat.lecture && etat.chaines && etat.chaines[voie.dataset.id], vu = voie.querySelector(".cs-vu");
      let x = -Infinity, cr = -Infinity;
      if (ch && ch.ana) { const n = niveauDe(ch.ana); x = dB(n.rms); cr = dB(n.crete); somme += n.rms * n.rms; creteMax = Math.max(creteMax, n.crete); }
      const prec = v.crete[voie.dataset.id] === undefined ? -Infinity : v.crete[voie.dataset.id]; v.crete[voie.dataset.id] = Math.max(cr, prec - 0.6);
      vu.style.setProperty("--n", hauteurVU(x).toFixed(3)); vu.style.setProperty("--k", hauteurVU(v.crete[voie.dataset.id]).toFixed(3)); vu.classList.toggle("cs-sature", cr > -1);
    }
    const mx = dB(Math.sqrt(somme)), cm = dB(creteMax); v.creteMaitre = Math.max(cm, v.creteMaitre - 0.6);
    for (const vu of racine.querySelectorAll(".cs-vu-g")) { vu.style.setProperty("--n", hauteurVU(mx).toFixed(3)); vu.style.setProperty("--k", hauteurVU(v.creteMaitre).toFixed(3)); vu.classList.toggle("cs-sature", cm > -1); }
    const o = $("cs-db-maitre"); if (o) o.textContent = v.creteMaitre === -Infinity || v.creteMaitre < -60 ? "−∞" : (v.creteMaitre > 0 ? "+" : "") + v.creteMaitre.toFixed(1).replace("-", "−");
  }

  const piste = el => P.trouverPiste(etat.projet, el.closest(".cs-voie").dataset.id);
  const chaine = pi => etat.lecture && etat.chaines && etat.chaines[pi.id];
  racine.addEventListener("input", e => {
    const voie = e.target.closest(".cs-voie"); if (!voie) return; const pi = piste(e.target); if (!pi) return; const ch = chaine(pi);
    if (e.target.classList.contains("cs-vol")) { pi.volume = +e.target.value; voie.querySelector(".cs-db").textContent = texteDB(pi.volume); if (ch) ch.vol.gain.setTargetAtTime(pi.volume, etat.ctx.currentTime, 0.02); ranger(); }
    else if (e.target.classList.contains("cs-pan-r")) { pi.pan = +e.target.value; voie.querySelector(".cs-pan output").textContent = texteDePan(pi.pan); if (ch && ch.pan) ch.pan.pan.setTargetAtTime(pi.pan, etat.ctx.currentTime, 0.02); ranger(); }
  });
  racine.addEventListener("dblclick", e => { if (e.target.classList.contains("cs-vol")) { const pi = piste(e.target); pi.volume = 0.8; e.target.value = 0.8; e.target.dispatchEvent(new Event("input", { bubbles: true })); } });
  racine.addEventListener("click", e => {
    if (e.target.closest("#cs-pro")) { etat.projet.master = etat.projet.master === "pro" ? "aucun" : "pro"; changer(); message(etat.projet.master === "pro" ? "Son pro activé." : "Son pro coupé."); return; }
    if (e.target.closest("#cs-fermer")) { montrer(false); return; }
    const voie = e.target.closest(".cs-voie"); if (!voie) return; const pi = piste(e.target);
    const fx = e.target.closest("[data-fx]"); if (fx) { const k = fx.dataset.fx; if (P.effetsDe(pi)[k].actif) { pi.effets = P.effetsDe(pi); pi.effets[k].actif = false; } else P.ajouterEffet(pi, k); changer(); return; }
    const a = e.target.closest("[data-a]"); if (!a) return;
    if (a.dataset.a === "muet") pi.muet = !pi.muet; else if (a.dataset.a === "solo") pi.solo = !pi.solo; else { etat.arme = etat.arme === pi.id ? null : pi.id; }
    changer();
  });

  function montrer(oui) {
    v.actif = !!oui; racine.hidden = !v.actif; document.body.classList.toggle("avec-console", v.actif);
    try { localStorage.setItem("sonora:pistes:console", v.actif ? "1" : "0"); } catch (_) { /* pas gardé */ }
    if (v.actif) dessiner();
  }
  return { montrer, basculer: () => montrer(!v.actif), afficher: dessiner, suivre, get actif() { return v.actif; } };
}
