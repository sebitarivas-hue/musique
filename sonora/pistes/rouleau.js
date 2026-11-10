// Le piano roll de SONORA Pistes : on voit les notes d'un clip MIDI (hauteur en hauteur, temps en largeur) et on les change à la main.
// Clic dans le vide : une note. Clic sur une note : on la choisit ; glisser dans le vide : un cadre qui choisit plusieurs notes (Maj ou Ctrl : en ajouter).
// Les notes choisies se déplacent ensemble ; on tire le bord droit pour les allonger, le bord gauche pour les raccourcir par le début. Les barres du bas règlent la vitesse de chaque note.
// Clavier (le piano roll ayant le focus) : flèches (un pas de grille, un demi-ton), Maj+haut/bas (une octave), + et - (durée), Suppr, Ctrl+A, Ctrl+C, Ctrl+X, Ctrl+V, Ctrl+D, Échap.
// Tout ce que fait le rouleau passe par des rappels : il ne connaît ni le projet, ni l'audio. Testé dans Chromium (tests/pistes.test.mjs).
import { nettoyerNotes } from "./notes.js?v=9fd2d5915c";

const SVG = "http://www.w3.org/2000/svg", H_RANGEE = 22, PX_BASE = 56, W_CLAVIER = 54, H_REGLE = 20, H_VEL = 56, NOIRES = new Set([1, 3, 6, 8, 10]);
const NOMS = ["do", "do♯", "ré", "ré♯", "mi", "fa", "fa♯", "sol", "sol♯", "la", "la♯", "si"];
export const nomHauteur = n => `${NOMS[((n % 12) + 12) % 12]}${Math.floor(n / 12) - 1}`;
// Les gammes que le rouleau sait éclairer : les degrés en demi-tons depuis la tonique.
export const GAMMES = { aucune: null, majeur: [0, 2, 4, 5, 7, 9, 11], mineur: [0, 2, 3, 5, 7, 8, 10], dorien: [0, 2, 3, 5, 7, 9, 10], mixolydien: [0, 2, 4, 5, 7, 9, 10], "pentatonique majeure": [0, 2, 4, 7, 9], "pentatonique mineure": [0, 3, 5, 7, 10], blues: [0, 3, 5, 6, 7, 10] };
// Une couleur par note, les mêmes que dans le Composer d'Harmonie.
const COULEURS = ["#FF6B57", "#FF8A3D", "#FFC53D", "#D8E043", "#8BD450", "#3FC79A", "#35BFD3", "#4C9BF5", "#7A7CF0", "#A86CF0", "#D766D8", "#F26BA3"];
const el = (nom, at = {}, enfants = []) => { const e = document.createElementNS(SVG, nom); for (const [k, v] of Object.entries(at)) e.setAttribute(k, v); for (const c of enfants) e.append(c); return e; };
const div = (classe, enfants = []) => { const d = document.createElement("div"); d.className = classe; for (const c of enfants) d.append(c); return d; };
const virg = x => (Math.round(x * 100) / 100).toString().replace(".", ",");
const borne = (x, a, b) => Math.max(a, Math.min(b, x));
let PRESSE = null;   // le presse-papiers des notes, partagé entre les clips : on copie dans l'un, on colle dans l'autre

export class Rouleau {
  // rappels : { change(notes, temps) : les notes ou la longueur ont changé ; ecouter(n, v) : faire entendre une hauteur ; selection(notes) : la sélection a changé ; curseur(t) : le repère de départ a bougé }
  constructor(racine, rappels = {}) {
    this.racine = racine; this.r = rappels; this.notes = []; this.choix = new Set(); this.principal = null; this.temps = 4; this.parMesure = 4; this.grille = 0.5; this.vitesse = 0.8; this.bas = 48; this.haut = 84; this.duree = 1;
    this.zoom = 1; this.curseur = 0; this.gamme = null; this.tonique = 0; this.tete = null;
  }
  // lignes : (batterie) la liste des notes affichées de haut en bas, une ligne par pièce ; ligneDe(n) : la ligne d'une note ; nomLigne(n) : le nom de la ligne.
  ouvrir({ notes, temps, parMesure = 4, nom = "", lignes = null, ligneDe = null, nomLigne = null }) {
    this.lignes = lignes; this.ligneDe = ligneDe || (n => n); this.nomLigne = nomLigne;
    this.notes = nettoyerNotes(notes); this.temps = temps; this.parMesure = parMesure; this.choix = new Set(); this.principal = null; this.nom = nom; this.premiere = true; this.corps = null; this.curseur = 0; this.tete = null;
    const ns = this.notes.map(x => x.n), mi = ns.length ? Math.min(...ns) : 60, ma = ns.length ? Math.max(...ns) : 60;
    this.bas = Math.max(0, Math.min(mi - 5, 48)); this.haut = Math.min(127, Math.max(ma + 5, 84)); if (this.haut - this.bas < 24) this.haut = Math.min(127, this.bas + 24);
    if (lignes) { this.bas = Math.min(...lignes); this.haut = Math.max(...lignes); }
    this.dessiner(); return this;
  }
  get px() { return PX_BASE * this.zoom; }
  get pas() { return this.grille || 0.25; }
  // Compatibilité : l'indice de la note principale, -1 s'il n'y en a pas.
  get sel() { return this.principal ? this.notes.indexOf(this.principal) : -1; }
  set sel(v) { if (v < 0) { this.choix.clear(); this.principal = null; } }
  get choisies() { return this.notes.filter(x => this.choix.has(x)); }
  couleur(n) { return COULEURS[(this.lignes ? this.rang(n) * 5 + 2 : n) % 12]; }
  get nbRangs() { return this.lignes ? this.lignes.length : this.haut - this.bas + 1; }
  rang(n) { return this.lignes ? Math.max(0, this.lignes.indexOf(this.ligneDe(n))) : this.haut - n; }
  noteDeRang(r) { return this.lignes ? this.lignes[Math.max(0, Math.min(this.lignes.length - 1, r))] : this.haut - r; }
  _caler(t) { return this.grille ? Math.round(t / this.grille) * this.grille : t; }
  // Les notes gardent leur identité (la sélection en dépend) : on borne et on trie sur place.
  _normaliser() {
    for (const x of this.notes) { x.t = Math.max(0, x.t); x.d = Math.max(1 / 64, x.d); x.n = borne(Math.round(x.n), 0, 127); x.v = borne(Number.isFinite(x.v) ? x.v : 0.8, 0.05, 1); }
    this.notes.sort((a, b) => a.t - b.t || a.n - b.n);
  }
  _emettre(clavier = false) { this._normaliser(); if (this.r.change) this.r.change(nettoyerNotes(this.notes), this.temps, { clavier }); }
  _annoncer() { if (this.r.selection) this.r.selection(this.choisies); }
  _fixer(liste, principal) { this.choix = new Set(liste); this.principal = principal ?? liste[liste.length - 1] ?? null; }
  _redessiner(garderFocus = true) { this.dessiner(); this._annoncer(); if (garderFocus && this.svg) this.svg.focus({ preventScroll: true }); }

  dessiner() {
    const WC = this.lignes ? 118 : W_CLAVIER, PX = this.px, W = Math.max(1, this.temps * PX), H = this.nbRangs * H_RANGEE, sy = this.corps ? this.corps.scrollTop : 0, sx = this.defil ? this.defil.scrollLeft : 0, avait = !!this.svg && document.activeElement === this.svg; this.racine.replaceChildren();
    const clavier = el("svg", { class: "rl-clavier", width: WC, height: H, role: "presentation" }), svg = el("svg", { class: "rl-notes", width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: "group", "aria-label": `Notes de ${this.nom || "ce clip"} : ${this.notes.length} note${this.notes.length > 1 ? "s" : ""}` });
    const Y = n => this.rang(n) * H_RANGEE, pcs = this.gamme ? new Set(this.gamme.map(d => (d + this.tonique) % 12)) : null;
    for (let rg = 0; rg < this.nbRangs; rg++) {
      const n = this.noteDeRang(rg), noire = this.lignes ? rg % 2 === 1 : NOIRES.has(n % 12), y = rg * H_RANGEE, dans = pcs && !this.lignes && pcs.has(n % 12), tonique = dans && n % 12 === this.tonique;
      svg.append(el("rect", { x: 0, y, width: W, height: H_RANGEE, class: (noire ? "rl-rang rl-noire" : "rl-rang") + (dans ? " rl-dans" : "") + (tonique ? " rl-tonique" : "") }));
      clavier.append(el("rect", { x: 0, y, width: WC, height: H_RANGEE, class: noire ? "rl-touche rl-tn" : "rl-touche rl-tb", "data-n": n }));
      if (this.lignes) { const t = el("text", { x: WC - 6, y: y + H_RANGEE - 6, class: noire ? "rl-nom rl-nom-clair" : "rl-nom", "text-anchor": "end" }); t.textContent = this.nomLigne ? this.nomLigne(n) : nomHauteur(n); clavier.append(t); }
      else if (n % 12 === 0 || n === this.haut || n === this.bas || tonique) { const t = el("text", { x: WC - 6, y: y + H_RANGEE - 6, class: "rl-nom", "text-anchor": "end" }); t.textContent = nomHauteur(n); clavier.append(t); }
    }
    const sub = this.grille || 1, nb = Math.round(this.temps / sub);
    for (let i = 0; i <= nb; i++) { const t = i * sub, mes = Math.abs(t / this.parMesure - Math.round(t / this.parMesure)) < 1e-9, temps = Math.abs(t - Math.round(t)) < 1e-9; svg.append(el("line", { x1: t * PX, x2: t * PX, y1: 0, y2: H, class: mes ? "rl-mesure" : temps ? "rl-temps" : "rl-sub" })); }
    this.gNotes = el("g"); svg.append(this.gNotes); this.svg = svg; this.clavier = clavier; this.notesEl = new Map();
    this.notes.forEach(x => this._dessinerNote(x, Y));
    this.teteNotes = el("line", { class: "rl-tete", y1: 0, y2: H, x1: 0, x2: 0, visibility: "hidden" }); this.reperNotes = el("line", { class: "rl-repere", y1: 0, y2: H, x1: this.curseur * PX, x2: this.curseur * PX }); svg.append(this.reperNotes, this.teteNotes);
    svg.addEventListener("pointerdown", e => this._appui(e)); svg.setAttribute("tabindex", "0"); svg.addEventListener("keydown", e => this._touche(e));
    clavier.addEventListener("pointerdown", e => { const n = +(e.target.dataset && e.target.dataset.n); if (Number.isFinite(n) && this.r.ecouter) this.r.ecouter(n, 0.8); });
    const defil = div("rl-defil", [svg]); this.defil = defil; defil.addEventListener("wheel", e => { if (e.ctrlKey || e.metaKey) { e.preventDefault(); this.reglerZoom(this.zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15)); } }, { passive: false });
    const corps = div("rl-corps", [clavier, defil]);
    // la règle (mesures et temps) au-dessus, les barres de vitesse au-dessous : elles suivent le défilement du piano roll
    const regle = this._dessinerRegle(WC, W, PX), vel = this._dessinerVitesses(WC, W, PX, Y);
    defil.addEventListener("scroll", () => { regle.scrollLeft = defil.scrollLeft; vel.scrollLeft = defil.scrollLeft; });
    this.racine.append(regle.parentElement, corps, vel.parentElement);
    this.corps = corps; this.regle = regle; this.vel = vel;
    if (this.premiere) { const ns = this.notes.map(x => x.n), milieu = this.lignes ? 0 : ns.length ? (Y(Math.max(...ns)) + Y(Math.min(...ns))) / 2 : Y(66); corps.scrollTop = Math.max(0, milieu - 150); this.premiere = false; } else { corps.scrollTop = sy; defil.scrollLeft = sx; regle.scrollLeft = sx; vel.scrollLeft = sx; }
    if (avait) svg.focus({ preventScroll: true });
  }
  _dessinerNote(x, Y = n => this.rang(n) * H_RANGEE) {
    const PX = this.px, nom = this.lignes && this.nomLigne ? this.nomLigne(this.ligneDe(x.n)) : nomHauteur(x.n);
    const r = el("rect", { x: x.t * PX + 0.5, y: Y(x.n) + 1, width: Math.max(6, x.d * PX - 1), height: H_RANGEE - 2, rx: 5, class: "rl-note" + (this.choix.has(x) ? " rl-choisie" : ""), fill: this.couleur(x.n), "fill-opacity": 0.55 + 0.45 * x.v, role: "button", "aria-label": `${nom}, au temps ${virg(x.t + 1)}, ${virg(x.d)} temps, vitesse ${Math.round(x.v * 100)}` });
    r._note = x; this.gNotes.append(r); this.notesEl.set(x, r); return r;
  }
  _majNote(x) {
    const r = this.notesEl.get(x); if (!r) return; const PX = this.px, nom = this.lignes && this.nomLigne ? this.nomLigne(this.ligneDe(x.n)) : nomHauteur(x.n);
    r.setAttribute("x", x.t * PX + 0.5); r.setAttribute("y", this.rang(x.n) * H_RANGEE + 1); r.setAttribute("width", Math.max(6, x.d * PX - 1)); r.setAttribute("fill", this.couleur(x.n)); r.setAttribute("aria-label", `${nom}, au temps ${virg(x.t + 1)}, ${virg(x.d)} temps, vitesse ${Math.round(x.v * 100)}`);
  }
  _dessinerRegle(WC, W, PX) {
    const svg = el("svg", { class: "rl-regle-svg", width: W, height: H_REGLE, role: "presentation" });
    svg.append(el("rect", { x: 0, y: 0, width: W, height: H_REGLE, class: "rl-regle-fond" }));
    for (let t = 0; t <= this.temps + 1e-9; t++) { const mes = Math.abs(t / this.parMesure - Math.round(t / this.parMesure)) < 1e-9; svg.append(el("line", { x1: t * PX, x2: t * PX, y1: mes ? 0 : H_REGLE - 6, y2: H_REGLE, class: mes ? "rl-regle-mesure" : "rl-regle-temps" })); if (mes && t < this.temps) { const tx = el("text", { x: t * PX + 4, y: 13, class: "rl-regle-num" }); tx.textContent = Math.round(t / this.parMesure) + 1; svg.append(tx); } }
    this.reperRegle = el("polygon", { class: "rl-repere-pointe", points: `${this.curseur * PX - 5},0 ${this.curseur * PX + 5},0 ${this.curseur * PX},9` }); this.teteRegle = el("line", { class: "rl-tete", x1: 0, x2: 0, y1: 0, y2: H_REGLE, visibility: "hidden" }); svg.append(this.reperRegle, this.teteRegle);
    svg.addEventListener("pointerdown", e => { const b = svg.getBoundingClientRect(); this.placerCurseur(Math.max(0, (e.clientX - b.left) / this.px)); });
    const zone = div("rl-regle", [svg]), ligne = div("rl-ligne rl-ligne-regle", [div("rl-cale", []), zone]); ligne.firstChild.style.width = WC + "px"; ligne.firstChild.textContent = "mesure"; return zone;
  }
  _dessinerVitesses(WC, W, PX, Y) {
    const svg = el("svg", { class: "rl-vel-svg", width: W, height: H_VEL, role: "group", "aria-label": "Vitesse de chaque note : tire une barre vers le haut ou vers le bas" }), haut = H_VEL - 6;
    svg.append(el("rect", { x: 0, y: 0, width: W, height: H_VEL, class: "rl-vel-fond" })); for (const f of [0.25, 0.5, 0.75]) svg.append(el("line", { x1: 0, x2: W, y1: 3 + haut * (1 - f), y2: 3 + haut * (1 - f), class: "rl-vel-repere" }));
    this.barres = new Map();
    for (const x of this.notes) { const l = Math.max(5, Math.min(x.d * PX - 1, 12)), h = x.v * haut, b = el("rect", { x: x.t * PX + 1, y: 3 + haut - h, width: l, height: h, rx: 2, class: "rl-vel" + (this.choix.has(x) ? " rl-vel-choisie" : ""), fill: this.couleur(x.n), "data-vel": 1 }); b._note = x; svg.append(b); this.barres.set(x, b); }
    svg.addEventListener("pointerdown", e => this._appuiVitesse(e, svg, haut));
    const zone = div("rl-vel-zone", [svg]), ligne = div("rl-ligne rl-ligne-vel", [div("rl-cale", []), zone]); ligne.firstChild.style.width = WC + "px"; ligne.firstChild.textContent = "vitesse"; return zone;
  }
  _majBarre(x) { const b = this.barres && this.barres.get(x); if (!b) return; const haut = H_VEL - 6, h = x.v * haut; b.setAttribute("y", 3 + haut - h); b.setAttribute("height", h); const r = this.notesEl.get(x); if (r) r.setAttribute("fill-opacity", 0.55 + 0.45 * x.v); }
  _appuiVitesse(e, svg, haut) {
    const cible = e.target._note; if (!cible) return; e.preventDefault(); svg.setPointerCapture(e.pointerId);
    if (!this.choix.has(cible)) this._fixer([cible], cible); const groupe = this.choisies, v0 = new Map(groupe.map(x => [x, x.v])), b = svg.getBoundingClientRect(), vDe = ev => borne(1 - (ev.clientY - b.top - 3) / haut, 0.05, 1), depart = vDe(e);
    this.vitesse = cible.v; this._surligner(); this._annoncer();
    const suit = m => { const dv = vDe(m) - depart; for (const x of groupe) { x.v = borne(v0.get(x) + dv, 0.05, 1); this._majBarre(x); } this.vitesse = cible.v; if (this.r.selection) this.r.selection(this.choisies); };
    const fin = () => { svg.removeEventListener("pointermove", suit); svg.removeEventListener("pointerup", fin); svg.removeEventListener("pointercancel", fin); this._emettre(); };
    svg.addEventListener("pointermove", suit); svg.addEventListener("pointerup", fin); svg.addEventListener("pointercancel", fin); suit(e);
  }
  _surligner() { for (const [x, r] of this.notesEl) r.classList.toggle("rl-choisie", this.choix.has(x)); if (this.barres) for (const [x, b] of this.barres) b.classList.toggle("rl-vel-choisie", this.choix.has(x)); }
  _point(e) { const b = this.svg.getBoundingClientRect(), rg = Math.max(0, Math.min(this.nbRangs - 1, Math.floor((e.clientY - b.top) / H_RANGEE))); return { t: (e.clientX - b.left) / this.px, n: this.noteDeRang(rg), r: rg }; }

  _appui(e) {
    e.preventDefault(); this.svg.focus({ preventScroll: true }); const p = this._point(e), cible = e.target.closest && e.target.closest(".rl-note"), plus = e.shiftKey || e.ctrlKey || e.metaKey;
    if (!cible) { this._appuiVide(e, p, plus); return; }
    const x = cible._note;
    if (plus) { if (this.choix.has(x)) { this.choix.delete(x); if (this.principal === x) this.principal = [...this.choix].pop() || null; } else { this.choix.add(x); this.principal = x; } this._surligner(); this._annoncer(); return; }
    const etait = this.choix.has(x) && this.choix.size > 1; if (!this.choix.has(x)) this._fixer([x], x); else this.principal = x; this._surligner(); this._annoncer(); this.vitesse = x.v;
    const largeur = x.d * this.px, bordD = p.t > x.t + x.d - Math.min(0.3, x.d / 2) && largeur > 14, bordG = !bordD && p.t < x.t + Math.min(0.3, x.d / 3) && largeur > 26, mode = bordD ? "allonger" : bordG ? "debut" : "deplacer";
    if (this.r.ecouter && mode === "deplacer") this.r.ecouter(x.n, x.v);
    const groupe = this.choisies, dep = new Map(groupe.map(g => [g, { t: g.t, d: g.d, r: this.rang(g.n) }])), tMin = Math.min(...groupe.map(g => g.t)), fin0 = Math.max(...groupe.map(g => g.t + g.d)), rMin = Math.min(...groupe.map(g => dep.get(g).r)), rMax = Math.max(...groupe.map(g => dep.get(g).r));
    let bouge = false, dernierR = p.r;
    const suit = m => {
      const q = this._point(m), dt = q.t - p.t; bouge = true;
      if (mode === "allonger") { const dd = this._caler(x.d + dt) - x.d; for (const g of groupe) g.d = Math.max(this.pas, Math.min(this.temps - g.t, dep.get(g).d + dd)); }
      else if (mode === "debut") { const dd = this._caler(x.t + dt) - x.t; for (const g of groupe) { const o = dep.get(g), nt = borne(o.t + dd, 0, o.t + o.d - this.pas); g.t = nt; g.d = o.d - (nt - o.t); } }
      else {
        const dd = borne(this._caler(dep.get(x).t + dt) - dep.get(x).t, -tMin, this.temps - fin0), dr = borne(q.r - p.r, -rMin, this.nbRangs - 1 - rMax);
        for (const g of groupe) { const o = dep.get(g); g.t = o.t + dd; g.n = this.noteDeRang(o.r + dr); }
        if (q.r !== dernierR) { dernierR = q.r; if (this.r.ecouter) this.r.ecouter(x.n, x.v); }
      }
      for (const g of groupe) { this._majNote(g); this._majBarre(g); const b = this.barres && this.barres.get(g); if (b) { b.setAttribute("x", g.t * this.px + 1); b.setAttribute("fill", this.couleur(g.n)); } }
    };
    const fini = () => {
      this.svg.removeEventListener("pointermove", suit); this.svg.removeEventListener("pointerup", fini); this.svg.removeEventListener("pointercancel", fini);
      if (!bouge) { if (etait) { this._fixer([x], x); this._surligner(); this._annoncer(); } return; }
      if (mode !== "debut") this.duree = x.d; this._emettre(); this._redessiner();
    };
    this.svg.setPointerCapture(e.pointerId); this.svg.addEventListener("pointermove", suit); this.svg.addEventListener("pointerup", fini); this.svg.addEventListener("pointercancel", fini);
  }
  // Le vide : un clic y pose une note ; glisser dessine un cadre qui choisit les notes touchées. Au doigt, le vide sert aussi à faire défiler : la note n'est posée que sur un simple appui.
  _appuiVide(e, p, plus) {
    const x0 = e.clientX, y0 = e.clientY, t0 = Date.now(), tactile = e.pointerType === "touch", b = this.svg.getBoundingClientRect(); let cadre = null;
    const suit = m => {
      if (tactile) return; if (!cadre && Math.hypot(m.clientX - x0, m.clientY - y0) < 5) return;
      if (!cadre) { cadre = el("rect", { class: "rl-lasso" }); this.svg.append(cadre); this.svg.setPointerCapture(e.pointerId); }
      const a = Math.min(x0, m.clientX) - b.left, c = Math.min(y0, m.clientY) - b.top; cadre.setAttribute("x", a); cadre.setAttribute("y", c); cadre.setAttribute("width", Math.abs(m.clientX - x0)); cadre.setAttribute("height", Math.abs(m.clientY - y0));
    };
    const fin = u => {
      this.svg.removeEventListener("pointermove", suit); this.svg.removeEventListener("pointerup", fin); this.svg.removeEventListener("pointercancel", ann);
      if (cadre) {
        const q = cadre.getBoundingClientRect(); cadre.remove(); const touchees = this.notes.filter(x => { const r = this.notesEl.get(x).getBoundingClientRect(); return r.left < q.right && r.right > q.left && r.top < q.bottom && r.bottom > q.top; });
        this._fixer(plus ? [...new Set([...this.choix, ...touchees])] : touchees); this._surligner(); this._annoncer(); return;
      }
      if (tactile && (Math.hypot(u.clientX - x0, u.clientY - y0) >= 8 || Date.now() - t0 >= 500)) return;
      this._poser(this._point(u), plus);
    }, ann = () => { this.svg.removeEventListener("pointermove", suit); this.svg.removeEventListener("pointerup", fin); this.svg.removeEventListener("pointercancel", ann); if (cadre) cadre.remove(); };
    this.svg.addEventListener("pointermove", suit); this.svg.addEventListener("pointerup", fin); this.svg.addEventListener("pointercancel", ann);
  }
  _poser(p, plus) {
    if (p.n < this.bas || p.n > this.haut) return; const t = Math.max(0, Math.min(this.temps - this.pas, this._caler(p.t - (this.grille ? this.grille / 2 : 0))));
    const x = { t, d: Math.min(this.duree, this.temps - t), n: p.n, v: this.vitesse }; this.notes.push(x); if (this.r.ecouter) this.r.ecouter(x.n, x.v);
    this._fixer(plus ? [...this.choix, x] : [x], x); this._emettre(); this._redessiner();
  }

  // ---- édition de la sélection : tout agit sur les notes choisies, ou sur toutes s'il n'y en a aucune (là où cela a un sens)
  supprimer() { const g = this.choisies; if (!g.length) return false; this.notes = this.notes.filter(x => !this.choix.has(x)); this._fixer([]); this._emettre(); this._redessiner(); return true; }
  effacer() { if (!this.notes.length) return false; this.notes = []; this._fixer([]); this._emettre(); this._redessiner(); return true; }
  toutChoisir() { this._fixer(this.notes); this._surligner(); this._annoncer(); }
  deselectionner() { this._fixer([]); this._surligner(); this._annoncer(); }
  copier() { const g = this.choisies; if (!g.length) return false; const t0 = Math.min(...g.map(x => x.t)); PRESSE = { notes: g.map(x => ({ ...x, t: x.t - t0 })), span: Math.max(...g.map(x => x.t + x.d)) - t0 }; return true; }
  couper() { if (!this.copier()) return false; return this.supprimer(); }
  // Colle au repère (la flèche de la règle) ; le repère passe à la fin du collage pour enchaîner. Le clip s'allonge si les notes dépassent.
  coller() {
    if (!PRESSE || !PRESSE.notes.length) return false; const t0 = this._caler(this.curseur), neuves = PRESSE.notes.map(x => ({ ...x, t: t0 + x.t }));
    const fin = Math.max(...neuves.map(x => x.t + x.d)); if (fin > this.temps) this.temps = Math.ceil(fin / this.parMesure - 1e-9) * this.parMesure;
    this.notes.push(...neuves); this._fixer(neuves); this.curseur = t0 + PRESSE.span; if (this.r.curseur) this.r.curseur(this.curseur); this._emettre(); this._redessiner(); return true;
  }
  dupliquer() { const g = this.choisies; if (!g.length || !this.copier()) return false; this.curseur = Math.max(...g.map(x => x.t + x.d)); return this.coller(); }
  deplacer(dt, dn) {
    const g = this.choisies; if (!g.length) return false; const tMin = Math.min(...g.map(x => x.t)), fin = Math.max(...g.map(x => x.t + x.d)), dt2 = borne(dt, -tMin, Math.max(0, this.temps - fin));
    const rangs = g.map(x => this.rang(x.n)), dr = borne(-dn, -Math.min(...rangs), this.nbRangs - 1 - Math.max(...rangs)); g.forEach((x, i) => { x.t += dt2; x.n = this.noteDeRang(rangs[i] + dr); }); return true;
  }
  transposer(demi) { const g = this.choisies.length ? this.choisies : this.notes; if (!g.length || this.lignes) return false; const lo = Math.min(...g.map(x => x.n)), hi = Math.max(...g.map(x => x.n)), d = borne(demi, this.bas - lo, this.haut - hi); if (!d) return false; for (const x of g) x.n += d; this._emettre(); this._redessiner(); return true; }
  caler(g) { const L = this.choisies.length ? this.choisies : this.notes; if (!L.length) return false; for (const x of L) { x.t = Math.round(x.t / g) * g; x.d = Math.max(g, Math.round(x.d / g) * g); } this._emettre(); this._redessiner(); return true; }
  _touche(e) {
    const ctrl = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
    if (ctrl && k === "a") { e.preventDefault(); e.stopPropagation(); this.toutChoisir(); return; } if (ctrl && k === "c") { e.preventDefault(); e.stopPropagation(); this.copier(); return; } if (ctrl && k === "x") { e.preventDefault(); e.stopPropagation(); this.couper(); return; }
    if (ctrl && k === "v") { e.preventDefault(); e.stopPropagation(); this.coller(); return; } if (ctrl && k === "d") { e.preventDefault(); e.stopPropagation(); this.dupliquer(); return; } if (e.key === "Escape" && this.choix.size) { e.preventDefault(); e.stopPropagation(); e.stopPropagation(); this.deselectionner(); return; }
    const g = this.choisies; if (!g.length) return; let fait = true, ecoute = false;
    if (e.key === "ArrowLeft") this.deplacer(-this.pas, 0); else if (e.key === "ArrowRight") this.deplacer(this.pas, 0);
    else if (e.key === "ArrowUp") { this.deplacer(0, e.shiftKey ? 12 : 1); ecoute = true; } else if (e.key === "ArrowDown") { this.deplacer(0, e.shiftKey ? -12 : -1); ecoute = true; }
    else if (e.key === "+" || e.key === "=") for (const x of g) x.d = Math.min(this.temps - x.t, x.d + this.pas); else if (e.key === "-") for (const x of g) x.d = Math.max(this.pas, x.d - this.pas);
    else if (e.key === "Delete" || e.key === "Backspace") { this.supprimer(); e.preventDefault(); e.stopPropagation(); return; } else fait = false;
    if (!fait) return; e.preventDefault(); e.stopPropagation(); if (ecoute && this.r.ecouter && this.principal) this.r.ecouter(this.principal.n, this.principal.v);
    this._emettre(true); this._redessiner();
  }
  // Longueur du clip en temps (au moins ce que les notes demandent).
  longueur(temps) { const fin = Math.max(0, ...this.notes.map(x => x.t + x.d)); this.temps = Math.max(this.parMesure, Math.max(temps, Math.ceil(fin - 1e-9))); this._emettre(); this._redessiner(false); }
  reglerGrille(g) { this.grille = +g; this.dessiner(); }
  reglerZoom(z) { const a = this.zoom; this.zoom = borne(z, 0.4, 4); if (this.zoom === a) return; const centre = this.defil ? (this.defil.scrollLeft + this.defil.clientWidth / 2) / this.px : 0; const av = this.px; this.dessiner(); if (this.defil) { const sx = Math.max(0, centre * this.px - this.defil.clientWidth / 2); this.defil.scrollLeft = sx; this.regle.scrollLeft = sx; this.vel.scrollLeft = sx; } void av; if (this.r.zoom) this.r.zoom(this.zoom); }
  // Éclaire les notes d'une gamme (tonique : 0 = do ... 11 = si ; mode : une clé de GAMMES).
  reglerGamme(tonique, mode) { this.tonique = +tonique || 0; this.gamme = GAMMES[mode] || null; this.dessiner(); }
  // Vitesse (force) de 0,05 à 1 : celle des notes choisies, et celle des notes que l'on posera ensuite.
  reglerVitesse(v) {
    this.vitesse = borne(v, 0.05, 1); const g = this.choisies; if (!g.length) return; for (const x of g) { x.v = this.vitesse; this._majBarre(x); }
    this._emettre();
  }
  // Le repère de départ (la flèche de la règle) : où l'on colle, d'où l'on écoute.
  placerCurseur(t) { this.curseur = Math.max(0, Math.min(this.temps, this._caler(t))); const PX = this.px, x = this.curseur * PX; this.reperNotes.setAttribute("x1", x); this.reperNotes.setAttribute("x2", x); this.reperRegle.setAttribute("points", `${x - 5},0 ${x + 5},0 ${x},9`); if (this.r.curseur) this.r.curseur(this.curseur); }
  // La tête de lecture : un trait qui avance pendant « Écouter » (t en temps depuis le début du clip ; null la cache). Le piano roll défile pour la garder en vue.
  suivre(t) {
    const visible = t !== null && t !== undefined, x = visible ? t * this.px : 0;
    for (const l of [this.teteNotes, this.teteRegle]) if (l) { l.setAttribute("x1", x); l.setAttribute("x2", x); l.setAttribute("visibility", visible ? "visible" : "hidden"); }
    if (visible && this.defil) { const d = this.defil; if (x < d.scrollLeft || x > d.scrollLeft + d.clientWidth - 20) d.scrollLeft = Math.max(0, x - 40); }
  }
}
