// Le rouleau de notes de SONORA Pistes : on voit les notes d'un clip MIDI (hauteur en hauteur, temps en largeur) et on les change à la main.
// Clic dans le vide : une note. Clic sur une note : on la choisit ; on la glisse pour la déplacer, on tire son bord droit pour l'allonger ; Suppr l'enlève.
// Les flèches déplacent la note choisie (gauche et droite d'un pas de grille, haut et bas d'un demi-ton), + et - la rallongent ou la raccourcissent.
// Tout ce que fait le rouleau passe par des rappels : il ne connaît ni le projet, ni l'audio. Testé dans Chromium (tests/pistes.test.mjs).
import { nettoyerNotes } from "./notes.js?v=db87d6f996";

const SVG = "http://www.w3.org/2000/svg", H_RANGEE = 22, PX_TEMPS = 56, W_CLAVIER = 54, NOIRES = new Set([1, 3, 6, 8, 10]);
const NOMS = ["do", "do♯", "ré", "ré♯", "mi", "fa", "fa♯", "sol", "sol♯", "la", "la♯", "si"];
export const nomHauteur = n => `${NOMS[((n % 12) + 12) % 12]}${Math.floor(n / 12) - 1}`;
// Une couleur par note, les mêmes que dans le Composer d'Harmonie.
const COULEURS = ["#FF6B57", "#FF8A3D", "#FFC53D", "#D8E043", "#8BD450", "#3FC79A", "#35BFD3", "#4C9BF5", "#7A7CF0", "#A86CF0", "#D766D8", "#F26BA3"];
const el = (nom, at = {}, enfants = []) => { const e = document.createElementNS(SVG, nom); for (const [k, v] of Object.entries(at)) e.setAttribute(k, v); for (const c of enfants) e.append(c); return e; };
const virg = x => (Math.round(x * 100) / 100).toString().replace(".", ",");

export class Rouleau {
  // rappels : { change(notes, temps) : les notes ou la longueur ont changé ; ecouter(n, v) : faire entendre une hauteur ; }
  constructor(racine, rappels = {}) { this.racine = racine; this.r = rappels; this.notes = []; this.sel = -1; this.temps = 4; this.parMesure = 4; this.grille = 0.5; this.vitesse = 0.8; this.bas = 48; this.haut = 84; this.duree = 1; }
  // lignes : (batterie) la liste des notes affichées de haut en bas, une ligne par pièce ; ligneDe(n) : la ligne d'une note ; nomLigne(n) : le nom de la ligne.
  ouvrir({ notes, temps, parMesure = 4, nom = "", lignes = null, ligneDe = null, nomLigne = null }) {
    this.lignes = lignes; this.ligneDe = ligneDe || (n => n); this.nomLigne = nomLigne;
    this.notes = nettoyerNotes(notes); this.temps = temps; this.parMesure = parMesure; this.sel = -1; this.nom = nom; this.premiere = true; this.corps = null;
    const ns = this.notes.map(x => x.n), mi = ns.length ? Math.min(...ns) : 60, ma = ns.length ? Math.max(...ns) : 60;
    this.bas = Math.max(0, Math.min(mi - 5, 48)); this.haut = Math.min(127, Math.max(ma + 5, 84)); if (this.haut - this.bas < 24) this.haut = Math.min(127, this.bas + 24);
    if (lignes) { this.bas = Math.min(...lignes); this.haut = Math.max(...lignes); }
    this.dessiner(); return this;
  }
  get pas() { return this.grille || 0.25; }
  couleur(n) { return COULEURS[(this.lignes ? this.rang(n) * 5 + 2 : n) % 12]; }
  get nbRangs() { return this.lignes ? this.lignes.length : this.haut - this.bas + 1; }
  rang(n) { return this.lignes ? Math.max(0, this.lignes.indexOf(this.ligneDe(n))) : this.haut - n; }
  noteDeRang(r) { return this.lignes ? this.lignes[Math.max(0, Math.min(this.lignes.length - 1, r))] : this.haut - r; }
  _caler(t) { return this.grille ? Math.round(t / this.grille) * this.grille : t; }
  _emettre(clavier = false) { this.notes = nettoyerNotes(this.notes); if (this.r.change) this.r.change(this.notes, this.temps, { clavier }); }
  dessiner() {
    const WC = this.lignes ? 118 : W_CLAVIER, W = this.temps * PX_TEMPS, H = this.nbRangs * H_RANGEE, sy = this.corps ? this.corps.scrollTop : 0, sx = this.defil ? this.defil.scrollLeft : 0, avait = !!this.svg && document.activeElement === this.svg; this.racine.replaceChildren();
    const clavier = el("svg", { class: "rl-clavier", width: WC, height: H, role: "presentation" }), svg = el("svg", { class: "rl-notes", width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: "group", "aria-label": `Notes de ${this.nom || "ce clip"} : ${this.notes.length} note${this.notes.length > 1 ? "s" : ""}` });
    const Y = n => this.rang(n) * H_RANGEE;
    for (let rg = 0; rg < this.nbRangs; rg++) {
      const n = this.noteDeRang(rg), noire = this.lignes ? rg % 2 === 1 : NOIRES.has(n % 12), y = rg * H_RANGEE;
      svg.append(el("rect", { x: 0, y, width: W, height: H_RANGEE, class: noire ? "rl-rang rl-noire" : "rl-rang" }));
      clavier.append(el("rect", { x: 0, y, width: WC, height: H_RANGEE, class: noire ? "rl-touche rl-tn" : "rl-touche rl-tb", "data-n": n }));
      if (this.lignes) { const t = el("text", { x: WC - 6, y: y + H_RANGEE - 6, class: noire ? "rl-nom rl-nom-clair" : "rl-nom", "text-anchor": "end" }); t.textContent = this.nomLigne ? this.nomLigne(n) : nomHauteur(n); clavier.append(t); }
      else if (n % 12 === 0 || n === this.haut || n === this.bas) { const t = el("text", { x: WC - 6, y: y + H_RANGEE - 6, class: "rl-nom", "text-anchor": "end" }); t.textContent = nomHauteur(n); clavier.append(t); }
    }
    const sub = this.grille || 1, nb = Math.round(this.temps / sub);
    for (let i = 0; i <= nb; i++) { const t = i * sub, mes = Math.abs(t / this.parMesure - Math.round(t / this.parMesure)) < 1e-9, temps = Math.abs(t - Math.round(t)) < 1e-9; svg.append(el("line", { x1: t * PX_TEMPS, x2: t * PX_TEMPS, y1: 0, y2: H, class: mes ? "rl-mesure" : temps ? "rl-temps" : "rl-sub" })); }
    this.gNotes = el("g"); svg.append(this.gNotes); this.svg = svg; this.clavier = clavier; this.notesEl = [];
    this.notes.forEach((x, i) => this._dessinerNote(x, i, Y));
    svg.addEventListener("pointerdown", e => this._appui(e)); svg.setAttribute("tabindex", "0"); svg.addEventListener("keydown", e => this._touche(e));
    clavier.addEventListener("pointerdown", e => { const n = +(e.target.dataset && e.target.dataset.n); if (Number.isFinite(n) && this.r.ecouter) this.r.ecouter(n, 0.8); });
    const defil = document.createElement("div"); defil.className = "rl-defil"; defil.append(svg); this.defil = defil;
    const corps = document.createElement("div"); corps.className = "rl-corps"; corps.append(clavier, defil); this.racine.append(corps);
    this.corps = corps; if (this.premiere) { const ns = this.notes.map(x => x.n), milieu = this.lignes ? 0 : ns.length ? (Y(Math.max(...ns)) + Y(Math.min(...ns))) / 2 : Y(66); corps.scrollTop = Math.max(0, milieu - 150); this.premiere = false; } else { corps.scrollTop = sy; defil.scrollLeft = sx; } if (avait) svg.focus({ preventScroll: true });
  }
  _dessinerNote(x, i, Y = n => this.rang(n) * H_RANGEE) {
    const r = el("rect", { x: x.t * PX_TEMPS + 0.5, y: Y(x.n) + 1, width: Math.max(6, x.d * PX_TEMPS - 1), height: H_RANGEE - 2, rx: 5, class: "rl-note" + (i === this.sel ? " rl-choisie" : ""), fill: this.couleur(x.n), "fill-opacity": 0.55 + 0.45 * x.v, "data-i": i, role: "button", "aria-label": `${this.lignes && this.nomLigne ? this.nomLigne(this.ligneDe(x.n)) : nomHauteur(x.n)}, au temps ${virg(x.t + 1)}, ${virg(x.d)} temps` });
    this.gNotes.append(r); this.notesEl[i] = r; return r;
  }
  _maj(i) { const x = this.notes[i], r = this.notesEl[i]; if (!x || !r) return; r.setAttribute("x", x.t * PX_TEMPS + 0.5); r.setAttribute("y", this.rang(x.n) * H_RANGEE + 1); r.setAttribute("width", Math.max(6, x.d * PX_TEMPS - 1)); r.setAttribute("aria-label", `${this.lignes && this.nomLigne ? this.nomLigne(this.ligneDe(x.n)) : nomHauteur(x.n)}, au temps ${virg(x.t + 1)}, ${virg(x.d)} temps`); }
  _choisir(i) { this.sel = i; this.notesEl.forEach((r, k) => r.classList.toggle("rl-choisie", k === i)); if (this.r.selection) this.r.selection(i >= 0 ? this.notes[i] : null); }
  _point(e) { const b = this.svg.getBoundingClientRect(), rg = Math.max(0, Math.min(this.nbRangs - 1, Math.floor((e.clientY - b.top) / H_RANGEE))); return { t: (e.clientX - b.left) / PX_TEMPS, n: this.noteDeRang(rg), r: rg }; }
  _appui(e) {
    e.preventDefault(); this.svg.focus({ preventScroll: true }); const p = this._point(e), cible = e.target.closest && e.target.closest("[data-i]");
    let i = cible ? +cible.dataset.i : -1, mode = "deplacer";
    if (i < 0 && e.pointerType === "touch") {   // au doigt, le vide sert aussi à faire défiler : la note n'est posée que sur un simple appui
      const x0 = e.clientX, y0 = e.clientY, t0 = Date.now(), fin = u => { this.svg.removeEventListener("pointerup", fin); this.svg.removeEventListener("pointercancel", ann); if (Math.hypot(u.clientX - x0, u.clientY - y0) < 8 && Date.now() - t0 < 500) this._poser(this._point(u)); }, ann = () => this.svg.removeEventListener("pointerup", fin);
      this.svg.addEventListener("pointerup", fin); this.svg.addEventListener("pointercancel", ann); return;
    }
    if (i < 0) {   // le vide : une nouvelle note, de la durée de la dernière
      const t = Math.max(0, Math.min(this.temps - this.pas, this._caler(p.t - (this.grille ? this.grille / 2 : 0)))); this.notes.push({ t, d: Math.min(this.duree, this.temps - t), n: p.n, v: this.vitesse }); i = this.notes.length - 1; this._dessinerNote(this.notes[i], i); mode = "neuf";
    } else if (p.t > this.notes[i].t + this.notes[i].d - Math.min(0.3, this.notes[i].d / 2) && this.notes[i].d * PX_TEMPS > 14) mode = "allonger";
    this._choisir(i); const x = this.notes[i], dep = { t: x.t, d: x.d, n: x.n, px: p.t, pn: p.n, r: this.rang(x.n), pr: p.r }; if (this.r.ecouter && mode !== "allonger") this.r.ecouter(x.n, x.v); let bouge = mode === "neuf";
    const suit = m => { const q = this._point(m); bouge = true;
      if (mode === "allonger") x.d = Math.max(this.pas, Math.min(this.temps - x.t, this._caler(dep.d + (q.t - dep.px)))); else { x.t = Math.max(0, Math.min(this.temps - x.d, this._caler(dep.t + (q.t - dep.px)))); const n = this.lignes ? this.noteDeRang(dep.r + (q.r - dep.pr)) : Math.max(this.bas, Math.min(this.haut, dep.n + (q.n - dep.pn))); if (n !== x.n) { x.n = n; if (this.r.ecouter) this.r.ecouter(n, x.v); } }
      this._maj(i); this.notesEl[i].setAttribute("fill", this.couleur(x.n)); };
    const fin = () => { this.svg.removeEventListener("pointermove", suit); this.svg.removeEventListener("pointerup", fin); this.svg.removeEventListener("pointercancel", fin);
      if (mode === "allonger" || mode === "deplacer") this.duree = x.d; if (bouge) { const ref = x; this.notes = nettoyerNotes(this.notes); this.sel = this.notes.findIndex(y => y.t === ref.t && y.n === ref.n); this._emettre(); this.dessiner(); if (this.sel >= 0) this._choisir(this.sel); } };
    this.svg.setPointerCapture(e.pointerId); this.svg.addEventListener("pointermove", suit); this.svg.addEventListener("pointerup", fin); this.svg.addEventListener("pointercancel", fin);
  }
  _poser(p) {
    if (p.n < this.bas || p.n > this.haut) return; const t = Math.max(0, Math.min(this.temps - this.pas, this._caler(p.t - (this.grille ? this.grille / 2 : 0))));
    const x = { t, d: Math.min(this.duree, this.temps - t), n: p.n, v: this.vitesse }; this.notes.push(x); if (this.r.ecouter) this.r.ecouter(x.n, x.v); this.notes = nettoyerNotes(this.notes); this.sel = this.notes.findIndex(y => y.t === x.t && y.n === x.n); this._emettre(); this.dessiner(); this._choisir(this.sel);
  }
  supprimer() { if (this.sel < 0) return false; this.notes.splice(this.sel, 1); this.sel = -1; this._emettre(); this.dessiner(); if (this.r.selection) this.r.selection(null); return true; }
  effacer() { if (!this.notes.length) return false; this.notes = []; this.sel = -1; this._emettre(); this.dessiner(); return true; }
  _touche(e) {
    const x = this.notes[this.sel]; if (!x) return; let fait = true;
    if (e.key === "ArrowLeft") x.t = Math.max(0, x.t - this.pas); else if (e.key === "ArrowRight") x.t = Math.min(this.temps - x.d, x.t + this.pas);
    else if (e.key === "ArrowUp") x.n = this.lignes ? this.noteDeRang(this.rang(x.n) - 1) : Math.min(this.haut, x.n + 1); else if (e.key === "ArrowDown") x.n = this.lignes ? this.noteDeRang(this.rang(x.n) + 1) : Math.max(this.bas, x.n - 1);
    else if (e.key === "+" || e.key === "=") x.d = Math.min(this.temps - x.t, x.d + this.pas); else if (e.key === "-") x.d = Math.max(this.pas, x.d - this.pas);
    else if (e.key === "Delete" || e.key === "Backspace") { this.supprimer(); e.preventDefault(); return; } else fait = false;
    if (!fait) return; e.preventDefault(); const ref = x; if (this.r.ecouter && (e.key === "ArrowUp" || e.key === "ArrowDown")) this.r.ecouter(x.n, x.v);
    this.notes = nettoyerNotes(this.notes); this.sel = this.notes.findIndex(y => y === ref || (y.t === ref.t && y.n === ref.n)); this._emettre(true); this.dessiner(); this._choisir(this.sel); this.svg.focus({ preventScroll: true });
  }
  // Longueur du clip en temps (au moins ce que les notes demandent).
  longueur(temps) { const fin = Math.max(0, ...this.notes.map(x => x.t + x.d)); this.temps = Math.max(this.parMesure, Math.max(temps, Math.ceil(fin - 1e-9))); this._emettre(); this.dessiner(); }
  reglerGrille(g) { this.grille = +g; this.dessiner(); }
}
