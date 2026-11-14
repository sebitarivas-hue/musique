// SONORA Orchestre : une portée pour écrire un sujet, à la place d'une grille de boîte à rythmes. On voit des notes sur cinq lignes, on les pose en touchant le clavier de couleurs ou la portée elle-même,
// et au clavier de l'ordinateur on les monte ou les descend d'un degré. Huit temps, une noire par temps ; une case peut rester vide (un silence). Les hauteurs sont les notes de do majeur, de la3 à do5.
// Sans état à lui : le tableau des notes est tenu par l'appelant (get / set), la portée ne fait que l'afficher et le modifier.
import { nomNote } from "./donnees.js?v=090ca757ad";
import { DEGRES, PAS } from "./fugue_logique.js?v=090ca757ad";

// La couleur de chaque note (comme les lames colorées d'un jeu de carillon d'école) : elle aide à retrouver une note d'un coup d'œil, sur le clavier comme sur la portée.
export const COULEUR_NOTE = { 0: "#E63946", 2: "#F4A261", 4: "#F2D043", 5: "#52B788", 7: "#3FA7D6", 9: "#7B6CF6", 11: "#D45BA6" };
const couleur = m => COULEUR_NOTE[((m % 12) + 12) % 12];
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const LETTRES = { 0: 0, 2: 1, 4: 2, 5: 3, 7: 4, 9: 5, 11: 6 };   // classe de hauteur -> rang de la lettre (do = 0, ré = 1, ..., si = 6)
// Position sur la portée : 0 = la ligne du bas (mi4), +1 par demi-intervalle (ligne puis espace). do4 est à -2, do5 à +5, la3 à -4.
export const positionDe = m => (Math.floor(m / 12) - 1 - 4) * 7 + LETTRES[((m % 12) + 12) % 12] - 2;
export const noteA = p => DEGRES.find(m => positionDe(m) === p);
export const POSITIONS = DEGRES.map(positionDe);   // de la plus aiguë (+5) à la plus grave (-4)

const L = 660, X0 = 78, LARG = 70, Y0 = 134, U = 6, H = 204;   // dessin : largeur, premier temps, largeur d'un temps, ligne du bas, demi-intervalle, hauteur
const yDe = p => Y0 - p * U, xDe = i => X0 + i * LARG + LARG / 2;

export function htmlPortee(cle, titre, aide) {
  return '<div class="bloc-portee" data-g="' + cle + '"><h3>' + esc(titre) + '</h3><p class="legende">' + esc(aide) + '</p>'
    + '<div class="portee" data-g="' + cle + '" tabindex="0" role="application" aria-label="' + esc(titre) + ' : flèches gauche et droite pour changer de temps, haut et bas pour monter ou descendre la note, Entrée pour l\'écouter, Suppr pour effacer, la touche S pour un silence"></div>'
    + '<div class="clavier-p" data-g="' + cle + '" role="group" aria-label="Notes à poser">' + DEGRES.slice().reverse().map(m => '<button type="button" class="p-touche" data-m="' + m + '" style="--n:' + couleur(m) + '"><span class="p-nom">' + nomNote(m) + "</span></button>").join("") + "</div>"
    + '<div class="actions-fiche p-actions" data-g="' + cle + '"><button type="button" data-a="prec" aria-label="Temps précédent">&#8249; Temps</button><button type="button" data-a="suiv" aria-label="Temps suivant">Temps &#8250;</button><button type="button" data-a="silence">Silence</button><button type="button" data-a="effacer">Effacer</button></div>'
    + '<p class="p-etat" data-g="' + cle + '" role="status" aria-live="polite"></p></div>';
}

// Branche une portée déjà insérée dans la page. get() renvoie le tableau de PAS notes (null = silence), set(i, m) pose une note ou un silence, apercu(m) fait entendre une note.
export function lierPortee(racine, cle, { get, set, apercu }) {
  const zone = racine.querySelector('.portee[data-g="' + cle + '"]'), clav = racine.querySelector('.clavier-p[data-g="' + cle + '"]'), act = racine.querySelector('.p-actions[data-g="' + cle + '"]'), etatTxt = racine.querySelector('.p-etat[data-g="' + cle + '"]');
  let sel = 0;
  const dire = () => { const m = get()[sel]; etatTxt.textContent = "Temps " + (sel + 1) + " : " + (m === null || m === undefined ? "silence" : nomNote(m)) + "."; };
  function dessiner() {
    const notes = get(), dernier = notes.reduce((d, m, i) => (m !== null && m !== undefined ? i : d), -1); let s = '<svg viewBox="0 0 ' + L + " " + H + '" class="svg-portee" aria-hidden="true">';
    for (let i = 0; i < PAS; i++) s += '<rect class="p-fente' + (i === sel ? " sel" : "") + '" data-i="' + i + '" x="' + (X0 + i * LARG) + '" y="14" width="' + LARG + '" height="' + (H - 26) + '"/>' + '<text class="p-num" x="' + xDe(i) + '" y="' + (H - 6) + '">' + (i + 1) + "</text>";
    for (let k = 0; k < 5; k++) s += '<line class="p-ligne" x1="22" x2="' + (L - 8) + '" y1="' + yDe(k * 2) + '" y2="' + yDe(k * 2) + '"/>';
    s += '<line class="p-mesure" x1="' + X0 + '" x2="' + X0 + '" y1="' + yDe(8) + '" y2="' + yDe(0) + '"/><line class="p-mesure" x1="' + (L - 8) + '" x2="' + (L - 8) + '" y1="' + yDe(8) + '" y2="' + yDe(0) + '"/>';
    s += '<text class="p-cle" x="30" y="' + (yDe(2) + 14) + '">&#119070;</text>';
    notes.forEach((m, i) => {
      const x = xDe(i);
      if (m === null || m === undefined) {   // un silence seulement s'il précède une note ; après la dernière note, une case vide n'est qu'un repère
        if (i < dernier) s += '<path class="p-silence" d="M' + (x - 4) + " " + (yDe(7)) + " l8 8 l-8 8 l8 8 q-6 2 -2 7" + '"/>'; else s += '<circle class="p-vide" cx="' + x + '" cy="' + yDe(4) + '" r="5"/>'; return;
      }
      const p = positionDe(m), y = yDe(p), bas = p < 4, c = couleur(m);
      for (let q = -2; q >= p && q >= -4; q -= 2) s += '<line class="p-supp" x1="' + (x - 13) + '" x2="' + (x + 13) + '" y1="' + yDe(q) + '" y2="' + yDe(q) + '"/>';
      s += '<line class="p-hampe" x1="' + (bas ? x + 7 : x - 7) + '" x2="' + (bas ? x + 7 : x - 7) + '" y1="' + y + '" y2="' + (bas ? y - 36 : y + 36) + '"/>'
        + '<ellipse class="p-note" data-i="' + i + '" data-m="' + m + '" cx="' + x + '" cy="' + y + '" rx="8.5" ry="6.3" transform="rotate(-18 ' + x + " " + y + ')" style="fill:' + c + '"/>'
        + '<text class="p-lib" x="' + x + '" y="' + (yDe(-6) + 10) + '">' + nomNote(m) + "</text>";
    });
    zone.innerHTML = s + "</svg>";
    clav.querySelectorAll(".p-touche").forEach(b => b.classList.toggle("actif", get()[sel] === +b.dataset.m)); dire();
  }
  const choisirTemps = i => { sel = Math.max(0, Math.min(PAS - 1, i)); dessiner(); };
  const poser = (i, m, avancer) => { set(i, m); if (m !== null) apercu(m); sel = avancer ? Math.min(PAS - 1, i + 1) : i; dessiner(); };
  zone.addEventListener("click", e => {
    const r = zone.querySelector("svg").getBoundingClientRect(), x = (e.clientX - r.left) / r.width * L, y = (e.clientY - r.top) / r.height * H, i = Math.floor((x - X0) / LARG);
    if (i < 0 || i >= PAS) return; const p = Math.round((Y0 - y) / U);
    if (p > Math.max.apply(null, POSITIONS) + 1 || p < Math.min.apply(null, POSITIONS) - 1) { choisirTemps(i); return; }   // au-delà de la portée : on choisit seulement le temps
    const m = noteA(Math.max(Math.min.apply(null, POSITIONS), Math.min(Math.max.apply(null, POSITIONS), p))); if (get()[i] === m) { poser(i, null, false); return; } poser(i, m, false);
  });
  clav.addEventListener("click", e => { const b = e.target.closest(".p-touche"); if (!b) return; poser(sel, +b.dataset.m, true); });
  act.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; const a = b.dataset.a;
    if (a === "prec") choisirTemps(sel - 1); else if (a === "suiv") choisirTemps(sel + 1); else if (a === "silence") poser(sel, null, true); else if (a === "effacer") poser(sel, null, false); });
  zone.addEventListener("keydown", e => {
    const m = get()[sel], k = e.key;
    if (k === "ArrowRight") { e.preventDefault(); choisirTemps(sel + 1); } else if (k === "ArrowLeft") { e.preventDefault(); choisirTemps(sel - 1); }
    else if (k === "ArrowUp" || k === "ArrowDown") { e.preventDefault(); const p = m === null || m === undefined ? (k === "ArrowUp" ? 0 : 0) : positionDe(m) + (k === "ArrowUp" ? 1 : -1), q = Math.max(Math.min.apply(null, POSITIONS), Math.min(Math.max.apply(null, POSITIONS), p)); poser(sel, noteA(q), false); }
    else if (k === "Enter" || k === " ") { e.preventDefault(); if (m !== null && m !== undefined) apercu(m); }
    else if (k === "Delete" || k === "Backspace") { e.preventDefault(); poser(sel, null, false); } else if (k === "s" || k === "S" || k === "0") { e.preventDefault(); poser(sel, null, true); }
  });
  dessiner();
  return { dessiner, selection: () => sel };
}
