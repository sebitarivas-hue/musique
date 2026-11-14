// Le panneau « Partition » de SONORA Pistes : la partition gravée d'un clip de notes, et à côté son texte façon LilyPond. On écrit le texte, la partition se dessine et les notes du clip suivent ;
// on change les notes dans le piano roll, la partition suit. Le panneau ne connaît ni le projet ni l'audio : tout passe par des rappels (comme le piano roll).
// rappels : { ecouter(n, v), message(t), appliquer({ notes, temps, partition }) : le texte a changé les notes, memoriser(partition) : seul le texte a changé }
import { lire, ecrire, ErreurLily } from "./lily.js?v=069e00adf6";
import { depuisNotes, versNotes, devinerTonalite, longueurMesure, unitesValeur } from "./modele.js?v=069e00adf6";
import { chargerVexflow, graver } from "./gravure.js?v=069e00adf6";
import { nomTonalite, alterationsArmure, midiDe, nomFrancais } from "./hauteurs.js?v=069e00adf6";

const BASE = new URL("../", import.meta.url);
const TONALITES = [0, 1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6, -6, 7, -7];
const div = (c, t = "") => { const d = document.createElement("div"); d.className = c; if (t) d.textContent = t; return d; };

// Une empreinte des notes : si elle n'a pas changé depuis que le texte a été écrit, le texte (avec ses soufflets, liaisons, commentaires) est encore celui des notes.
export function signatureNotes(notes) {
  let h = 2166136261; const s = (notes || []).map(x => `${Math.round(x.t * 1000)},${Math.round(x.d * 1000)},${x.n},${Math.round((x.v ?? 0.8) * 100)}`).join(";");
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return `${(h >>> 0).toString(36)}:${(notes || []).length}`;
}

const INSERTIONS = [
  ["Nuances", [["\\pp", "pianissimo  \\pp"], ["\\p", "piano  \\p"], ["\\mp", "mezzo piano  \\mp"], ["\\mf", "mezzo forte  \\mf"], ["\\f", "forte  \\f"], ["\\ff", "fortissimo  \\ff"]]],
  ["Soufflets", [["\\<", "crescendo  \\<"], ["\\>", "decrescendo  \\>"], ["\\!", "fin du soufflet  \\!"]]],
  ["Articulations", [["-.", "staccato  -."], ["->", "accent  ->"], ["--", "tenuto  --"], ["\\fermata", "point d'orgue  \\fermata"]]],
  ["Liaisons", [["~", "prolongation  ~"], ["(", "début de liaison  ("], [")", "fin de liaison  )"]]],
  ["Écriture", [[" r4 ", "silence  r4"], [" <c e g>4 ", "accord  <c e g>4"], [" \\tuplet 3/2 { c8 d e } ", "triolet"], ["\\repeat volta 2 { c4 d e f }", "reprise"]]],
  ["Réglages", [["\\clef treble ", "clé de sol"], ["\\clef bass ", "clé de fa"], ["\\key d \\major ", "armure  \\key d \\major"], ["\\time 3/4 ", "chiffrage  \\time 3/4"], ["\\tempo 4 = 100 ", "tempo  \\tempo 4 = 100"], ["\\partial 4 ", "anacrouse  \\partial 4"]]],
];

export class PanneauPartition {
  constructor(racine, rappels = {}) {
    this.racine = racine; this.r = rappels; this.$ = id => racine.querySelector("#" + id);
    this.reg = { cle: "treble", quintes: 0, mode: "major", chiffrage: [4, 4], langue: "neerlandais" };
    this.texte = ""; this.modele = null; this.genere = true; this.sigNotes = ""; this.parMesure = 4; this.notes = []; this.echelle = 1.15; this.res = null; this.minuteur = null; this.actif = false; this.erreur = null; this.avant = null; this.tempoProjet = null; this.temps = 4; this.choix = null; this.session = null;
    this.outil = { mode: "note", val: "q", pts: false, alt: null, gomme: false, actif: false };
    this._monter(); this._monterPalette(); this._monterScore();
  }
  _monter() {
    const $ = this.$;
    const sel = $("pt-tonalite"); sel.innerHTML = ""; const groupes = { "Sans altération": [], "Dièses": [], "Bémols": [] };
    for (const q of TONALITES) for (const mode of ["major", "minor"]) { const o = document.createElement("option"); o.value = `${q}:${mode}`; o.textContent = `${nomTonalite(q, mode)} (${q === 0 ? "aucune altération" : q > 0 ? q + " ♯" : -q + " ♭"})`; groupes[q === 0 ? "Sans altération" : q > 0 ? "Dièses" : "Bémols"].push(o); }
    for (const [g, os] of Object.entries(groupes)) { const og = document.createElement("optgroup"); og.label = g; og.append(...os); sel.append(og); }
    const ins = $("pt-inserer"); ins.innerHTML = '<option value="">Insérer…</option>'; INSERTIONS.forEach(([g, liste], i) => { const og = document.createElement("optgroup"); og.label = g; for (const [t, l] of liste) { const o = document.createElement("option"); o.value = t; o.textContent = l; og.append(o); } ins.append(og); });
    ins.onchange = () => { if (ins.value) this.inserer(ins.value); ins.value = ""; };
    $("pt-texte").addEventListener("input", () => { this.genere = false; this._planifier(); });
    for (const ev of ["click", "keyup"]) $("pt-texte").addEventListener(ev, () => this._surCurseurTexte());
    $("pt-cle").onchange = () => this._changerReglage("cle"); $("pt-tonalite").onchange = () => this._changerReglage("tonalite"); $("pt-chiffrage").onchange = () => this._changerReglage("chiffrage"); $("pt-langue").onchange = () => this._changerReglage("langue");
    $("pt-reecrire").onclick = () => this.reecrireDepuisNotes(); $("pt-deviner").onclick = () => { const t = devinerTonalite(this.notes); this.reg.quintes = t.quintes; this.reg.mode = t.mode; this.reecrireDepuisNotes(`Tonalité devinée d'après les notes : ${nomTonalite(t.quintes, t.mode)}. Le texte est réécrit.`); };
    $("pt-zoom-moins").onclick = () => { this._echelleChoisie = true; this.echelle = Math.max(0.7, this.echelle / 1.15); this._dessiner(); }; $("pt-zoom-plus").onclick = () => { this._echelleChoisie = true; this.echelle = Math.min(2.2, this.echelle * 1.15); this._dessiner(); };
    $("pt-ly").onclick = () => this.telecharger();
    $("pt-retour").onclick = () => { if (this.avant === null) return; const t = this.avant; this.avant = null; $("pt-retour").hidden = true; this.$("pt-texte").value = t; this.genere = false; this._compiler(true); };
    $("pt-erreur-va").onclick = () => { if (!this.erreur) return; const ta = $("pt-texte"); ta.focus(); ta.setSelectionRange(this.erreur.debut, Math.min(ta.value.length, this.erreur.fin)); };
    let tl = 0; if (typeof ResizeObserver !== "undefined") new ResizeObserver(() => { if (!this.actif || !this.modele) return; const l = this.$("pt-score").clientWidth; if (Math.abs(l - tl) > 40) { tl = l; clearTimeout(this._rz); this._rz = setTimeout(() => this._dessiner(), 120); } }).observe($("pt-score"));
  }

  // ---- ouverture : notes du clip, partition mémorisée (réglages, texte, empreinte), mesure du projet
  async ouvrir({ notes, temps, parMesure = 4, partition = null, tempo = null }) {
    this.actif = true; this.notes = (notes || []).map(x => ({ ...x })); this.temps = temps || parMesure; this.tempsApplique = this.temps; this.choix = null; this.outil.actif = false; this.outil.gomme = false; this.outil.alt = null; this._majPalette(); this.parMesure = parMesure; this.tempoProjet = tempo; this.erreur = null; this.avant = null; this.$("pt-retour").hidden = true;
    const sig = signatureNotes(this.notes), m = partition || {};
    this.reg = {
      cle: m.cle || this._cleParDefaut(), quintes: Number.isFinite(m.quintes) ? m.quintes : null, mode: m.mode || "major", chiffrage: Array.isArray(m.chiffrage) && m.chiffrage.length === 2 ? m.chiffrage : [parMesure, 4], langue: m.langue || "neerlandais",
    };
    if (this.reg.quintes === null) { const t = devinerTonalite(this.notes); this.reg.quintes = t.quintes; this.reg.mode = t.mode; }
    this.sigNotes = sig;
    if (m.texte && m.signature === sig) { this.texte = m.texte; this.genere = false; }
    else { this.texte = this._ecrireDepuis(this.notes, temps); this.genere = true; }
    this.$("pt-texte").value = this.texte; this._majSelects();
    if (!this._echelleChoisie) this.echelle = this.$("pt-score").clientWidth >= 640 ? 1.45 : 1.15;   // grande sur écran large : les notes sont plus faciles à viser
    await this._compiler(false);
  }
  fermer() { this.actif = false; clearTimeout(this.minuteur); this.suivre(null); }
  _cleParDefaut() { const ns = this.notes.map(x => x.n); if (!ns.length) return "treble"; const mi = Math.min(...ns), ma = Math.max(...ns); if (mi < 55 && ma > 66) return "piano"; return (ns.reduce((a, b) => a + b, 0) / ns.length) < 55 ? "bass" : "treble"; }
  _ecrireDepuis(notes, temps) {
    const p = depuisNotes(notes, { chiffrage: this.reg.chiffrage, quintes: this.reg.quintes, mode: this.reg.mode, cle: this.reg.cle, temps, tempo: this.tempoProjet ? { val: "q", pts: 0, bpm: Math.round(this.tempoProjet) } : null });
    return ecrire(p, { langue: this.reg.langue });
  }

  // ---- les réglages affichés suivent ce que dit le texte, et inversement
  _majSelects() {
    const $ = this.$, r = this.reg, opts = new Set([...$("pt-tonalite").options].map(o => o.value)), v = `${r.quintes}:${r.mode}`;
    if (!opts.has(v)) { const o = document.createElement("option"); o.value = v; o.textContent = `${nomTonalite(r.quintes, r.mode)}`; $("pt-tonalite").append(o); }
    $("pt-tonalite").value = v;
    $("pt-cle").value = r.cle === "piano" ? "piano" : r.cle === "bass" ? "bass" : r.cle === "treble" ? "treble" : (["alto", "tenor"].includes(r.cle) ? r.cle : "treble");
    const ch = $("pt-chiffrage"); ch.innerHTML = ""; const lst = new Set(["2/4", "3/4", "4/4", "5/4", "2/2", "3/8", "6/8", "9/8", "12/8"]); for (const d of [2, 4, 8]) { const n = this.parMesure * d / 4; if (Number.isInteger(n) && n >= 2) lst.add(`${n}/${d}`); } lst.add(`${r.chiffrage[0]}/${r.chiffrage[1]}`);
    const val = s => { const [n, d] = s.split("/").map(Number); return n / d; };
    for (const t of [...lst].sort((x, y) => val(x) - val(y) || x.localeCompare(y))) { const o = document.createElement("option"); o.value = t; o.textContent = t; ch.append(o); } ch.value = `${r.chiffrage[0]}/${r.chiffrage[1]}`;
    $("pt-langue").value = r.langue;
  }
  _changerReglage(quoi) {
    const $ = this.$, r = this.reg;
    if (quoi === "cle") r.cle = $("pt-cle").value; if (quoi === "tonalite") { const [q, m] = $("pt-tonalite").value.split(":"); r.quintes = +q; r.mode = m; } if (quoi === "chiffrage") r.chiffrage = $("pt-chiffrage").value.split("/").map(Number); if (quoi === "langue") r.langue = $("pt-langue").value;
    const note = {
      cle: "La clé change : le texte est réécrit d'après les notes.", tonalite: "L'armure change : les notes sont réécrites avec les bonnes altérations.", chiffrage: "Le chiffrage change : les barres de mesure sont refaites.", langue: "Les noms des notes changent dans le texte.",
    }[quoi];
    if (this.genere || (quoi === "cle" && (r.cle === "piano" || this._modelePiano()))) { this.reecrireDepuisNotes(note); return; }
    // texte écrit à la main : on touche seulement à la ligne concernée, ou on réécrit d'après le modèle (la langue)
    if (!this.modele) { this.reecrireDepuisNotes(note); return; }
    const m = JSON.parse(JSON.stringify(this.modele)); m.meta.quintes = r.quintes; m.meta.mode = r.mode; m.meta.chiffrage = r.chiffrage.slice(); if (quoi === "cle") for (const p of m.portees) { p.cle = r.cle; p.evts = p.evts.filter(e => e.ctl !== "cle"); } m.meta.cle = r.cle === "piano" ? "treble" : r.cle;
    for (const p of m.portees) { p.evts = p.evts.filter(e => !(e.ctl === "armure" || e.ctl === "chiffrage")); }
    this._remplacerTexte(ecrire(m, { langue: r.langue }), `${note} (Tes notes gardent leur écriture ; pour tout réécrire, « Réécrire d'après le piano roll ».)`);
  }
  _modelePiano() { return !!(this.modele && this.modele.portees.length === 2); }
  _remplacerTexte(t, msg) { this.avant = this.$("pt-texte").value; this.$("pt-retour").hidden = false; this.$("pt-texte").value = t; this.genere = false; if (msg && this.r.message) this.r.message(msg); this._compiler(true); }
  reecrireDepuisNotes(msg) {
    const avant = this.$("pt-texte").value; if (!this.genere && avant.trim()) { this.avant = avant; this.$("pt-retour").hidden = false; }
    this.texte = this._ecrireDepuis(this.notes, null); this.genere = true; this.$("pt-texte").value = this.texte; this._majSelects();
    if (msg && this.r.message) this.r.message(msg); this._compiler(false);
  }
  inserer(t) { const ta = this.$("pt-texte"); ta.focus(); const a = ta.selectionStart ?? ta.value.length, b = ta.selectionEnd ?? a; ta.setRangeText(t, a, b, "end"); this.genere = false; ta.dispatchEvent(new Event("input", { bubbles: true })); }
  telecharger() {
    const t = this.$("pt-texte").value, blob = new Blob([`\\version "2.24.0"\n${t}`], { type: "text/plain;charset=utf-8" }), a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "partition.ly"; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1500);
    if (this.r.message) this.r.message("Fichier partition.ly enregistré : on peut l'ouvrir avec LilyPond ou avec Frescobaldi.");
  }

  // ---- compiler le texte, dessiner, et faire suivre les notes du clip
  _planifier() { clearTimeout(this.minuteur); this.minuteur = setTimeout(() => this._compiler(true), 280); }
  // nbTaches : nombre de compilations et de dessins en cours (les tests attendent qu'il retombe à 0)
  async _compiler(appliquer) { this.nbTaches = (this.nbTaches || 0) + 1; try { await this._compiler2(appliquer); } finally { this.nbTaches--; } }
  async _compiler2(appliquer) {
    const ta = this.$("pt-texte"), t = ta.value; this.texte = t;
    try {
      const { partition, titre } = lire(t, { quintes: this.reg.quintes, mode: this.reg.mode, chiffrage: this.reg.chiffrage, cle: this.reg.cle === "piano" ? "treble" : this.reg.cle });
      this.modele = partition; this.titre = titre || ""; this.erreur = null; this._montrerErreur(null); ta.removeAttribute("aria-invalid");
      const m = partition.meta; this.reg.quintes = m.quintes; this.reg.mode = m.mode; this.reg.chiffrage = m.chiffrage.slice(); this.reg.cle = partition.portees.length === 2 ? "piano" : partition.portees[0].cle; this._majSelects();
      if (appliquer) {
        const { notes: brutes, temps } = versNotes(partition, { parMesure: this.parMesure }), notes = this._garderVitesses(brutes, this.notes), sig = signatureNotes(notes), mem = { ...this.reg, chiffrage: this.reg.chiffrage.slice(), texte: t, signature: sig };
        this.temps = temps; if (sig !== this.sigNotes || temps !== this.tempsApplique) { this.sigNotes = sig; this.tempsApplique = temps; this.notes = notes; if (this.r.appliquer) this.r.appliquer({ notes, temps, partition: mem }); }
        else if (this.r.memoriser) this.r.memoriser(mem);
        if (m.chiffrage && longueurMesure(m.chiffrage) !== this.parMesure * 24 && this.r.message) this.r.message(`Le chiffrage ${m.chiffrage[0]}/${m.chiffrage[1]} ne tombe pas sur la mesure du projet (${this.parMesure} temps) : les barres du piano roll ne coïncideront pas avec celles de la partition.`);
      }
      await this._dessiner();
    } catch (e) {
      if (e instanceof ErreurLily) { this.erreur = e; this._montrerErreur(`Ligne ${e.ligne}, colonne ${e.colonne} : ${e.message}`); ta.setAttribute("aria-invalid", "true"); this.$("pt-score").classList.add("pt-ancien"); }
      else { this._montrerErreur(`La partition n'a pas pu être traitée : ${e && e.message || e}`); }
    }
  }
  _montrerErreur(t) { const e = this.$("pt-erreur"); e.hidden = !t; this.$("pt-erreur-texte").textContent = t || ""; if (!t) this.$("pt-score").classList.remove("pt-ancien"); }
  async _dessiner() {
    if (!this.modele || !this.actif) return;
    try { await chargerVexflow(BASE); } catch (e) { this._montrerErreur(e.message); return; }
    const sc = this.$("pt-score"), larg = Math.max(300, sc.clientWidth - 6);
    try {
      this.res = graver(sc, this.modele, { largeur: larg, echelle: this.echelle, titre: this.titre, onNote: info => this._surNote(info) });
      const c = div("pt-curseur"); c.hidden = true; sc.append(c); this.curseur = c; this.$("pt-score").classList.remove("pt-ancien");
      if (this.$("pt-texte") === document.activeElement) this._surCurseurTexte();
    } catch (e) { this._montrerErreur(`La partition n'a pas pu être dessinée : ${e && e.message || e}`); }
  }
  _surNote(info) {
    if (this._apresGlisser(info.ts)) return;
    if (this.outil.actif && this.outil.mode === "silence") return;   // un silence se pose sur la note : on ne la choisit pas
    const ouvert = this.$("pt-texte-det").open;
    if (info.midis && info.midis.length) { this.choix = { t: info.t, n: info.midis[0], u: info.u }; if (this.res) this.res.surlignerNote(info.t, info.midis[0]); }
    if (info.src && ouvert) { const ta = this.$("pt-texte"); ta.focus(); ta.setSelectionRange(info.src[0], info.src[1]); const l = ta.value.slice(0, info.src[0]).split("\n").length; ta.scrollTop = Math.max(0, (l - 3) * 20); if (this.res) this.res.surligner(info.src); }
    else this.$("pt-score").focus({ preventScroll: true });
    if (info.midis && info.midis.length && this.r.ecouter) for (const n of info.midis.slice(0, 4)) this.r.ecouter(n, 0.8);
  }
  _surCurseurTexte() { if (!this.res) return; const ta = this.$("pt-texte"); const a = ta.selectionStart; this.res.surligner([a, Math.max(a + 1, ta.selectionEnd)]); }

  // Où est le SVG dans la zone de défilement de la partition (les éléments SVG n'ont pas de offsetLeft : on le mesure).
  _decalageSvg() { const sc = this.$("pt-score"), sv = sc.querySelector("svg"); if (!sv) return { dx: 0, dy: 0 }; const rs = sv.getBoundingClientRect(), rc = sc.getBoundingClientRect(); return { dx: rs.left - rc.left + sc.scrollLeft, dy: rs.top - rc.top + sc.scrollTop }; }
  // ---- le curseur de lecture : t en temps (noires), null pour l'enlever
  suivre(t) {
    if (this.res && this.res.surlignerJouees) this.res.surlignerJouees(t === undefined ? null : t);
    if (!this.curseur) return; if (t === null || t === undefined || !this.res) { this.curseur.hidden = true; return; }
    const p = this.res.position(t); if (!p) { this.curseur.hidden = true; return; }
    this.curseur.hidden = false; const { dx, dy } = this._decalageSvg(); this.curseur.style.left = `${p.x + dx}px`; this.curseur.style.top = `${p.y0 + dy}px`; this.curseur.style.height = `${Math.max(10, p.y1 - p.y0)}px`;
    const sc = this.$("pt-score"), y = p.y0; if (y < sc.scrollTop || y > sc.scrollTop + sc.clientHeight - 60) sc.scrollTop = Math.max(0, y - 30);
  }

  // ================================================================ la palette : on glisse une note sur la portée, on l'entend, on la pose
  _monterPalette() {
    const VAL = [["w", "ronde", "", ""], ["h", "blanche", "", ""], ["q", "noire", "", ""], ["8", "croche", "", ""], ["16", "double croche", "", ""]], cont = this.$("pt-valeurs");
    cont.innerHTML = ""; this.boutonsValeur = [];
    for (const [v, nom, gn, gs] of VAL) {
      const b = document.createElement("button"); b.type = "button"; b.className = "pt-val"; b.dataset.val = v; b.dataset.tip = `${nom[0].toUpperCase()}${nom.slice(1)} : glisse-la sur la portée, ou choisis-la puis touche la portée`; b.setAttribute("aria-pressed", "false"); b.setAttribute("aria-label", nom);
      b.innerHTML = `<span class="pt-glyphe" aria-hidden="true"></span><span class="pt-nom">${nom}</span>`; b._gn = gn; b._gs = gs; cont.append(b); this.boutonsValeur.push(b);
      b.addEventListener("pointerdown", e => this._debutSession(e, { type: "palette", val: v }));
      b.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); this._choisirValeur(v); } });
    }
    const $ = this.$;
    $("pt-mode-note").onclick = () => { this.outil.mode = "note"; this.outil.gomme = false; this._majPalette(); }; $("pt-mode-silence").onclick = () => { this.outil.mode = "silence"; this.outil.gomme = false; this._majPalette(); };
    $("pt-point").onclick = () => { this.outil.pts = !this.outil.pts; this._majPalette(); };
    for (const [id, a] of [["pt-dieze", "#"], ["pt-bemol", "b"], ["pt-becarre", "n"]]) $(id).onclick = () => { this.outil.alt = this.outil.alt === a ? null : a; this._majPalette(); };
    $("pt-gomme").onclick = () => { this.outil.gomme = !this.outil.gomme; this.outil.actif = this.outil.gomme || this.outil.actif; this._majPalette(); };
    $("pt-annuler").onclick = () => { if (this.r.annuler) this.r.annuler(); };
    $("pt-mesure").onclick = () => { if (this.r.message) this.r.message("Une mesure vide est ajoutée à la fin du clip."); this._commit(this.notes, this.temps + this.parMesure); };
    this._majPalette();
  }
  _majPalette() {
    const o = this.outil, $ = this.$, sil = o.mode === "silence";
    $("pt-mode-note").setAttribute("aria-pressed", String(!sil)); $("pt-mode-silence").setAttribute("aria-pressed", String(sil));
    for (const b of this.boutonsValeur || []) { b.querySelector(".pt-glyphe").textContent = sil ? b._gs : b._gn; b.setAttribute("aria-pressed", String(o.actif && !o.gomme && o.val === b.dataset.val)); }
    $("pt-point").setAttribute("aria-pressed", String(o.pts)); $("pt-dieze").setAttribute("aria-pressed", String(o.alt === "#")); $("pt-bemol").setAttribute("aria-pressed", String(o.alt === "b")); $("pt-becarre").setAttribute("aria-pressed", String(o.alt === "n")); $("pt-gomme").setAttribute("aria-pressed", String(o.gomme));
    const sc = $("pt-score"); sc.classList.toggle("pt-outil-actif", o.actif && !o.gomme); sc.classList.toggle("pt-gomme-actif", o.gomme);
  }
  _choisirValeur(v) { const o = this.outil; if (o.actif && !o.gomme && o.val === v) { o.actif = false; } else { o.val = v; o.actif = true; o.gomme = false; } this._majPalette(); }
  _grille() { return Math.max(3, Math.min(unitesValeur(this.outil.val, 0) || 24, 24)); }
  _midiDe(diat, alt) { const l = ((diat % 7) + 7) % 7, o = Math.floor(diat / 7), base = alterationsArmure(this.reg.quintes)[l] || 0, a = alt === "#" ? 1 : alt === "b" ? -1 : alt === "n" ? 0 : base; return { midi: midiDe({ l, a, o }), nom: nomFrancais({ l, a, o }) }; }

  // ---- les gestes sur la partition : un glisser part de la palette ou d'une note posée ; un clic avec un outil choisi pose une note
  _monterScore() {
    const sc = this.$("pt-score");
    sc.addEventListener("pointerdown", e => { const g = e.target.closest && e.target.closest(".pt-note"); if (!g || e.button > 0) return; const info = { t: +g.getAttribute("data-t"), u: +g.getAttribute("data-u") || 0, midis: (g.getAttribute("data-midis") || "").split(",").filter(Boolean).map(Number) }; if (!info.midis.length) return; this._debutSession(e, { type: "note", info }); });
    sc.addEventListener("pointermove", e => { if (this.session || !this.outil.actif || this.outil.gomme) return; this._apercu(this._cibleSouris(e.clientX, e.clientY), true); });
    sc.addEventListener("pointerleave", () => { if (!this.session) this._cacherApercu(); });
    sc.addEventListener("click", e => {
      if (this._apresGlisser(e.timeStamp)) return; const g = e.target.closest && e.target.closest(".pt-note");
      if (g && this.outil.gomme) { const t = +g.getAttribute("data-t"), u = +g.getAttribute("data-u") || 0, midis = (g.getAttribute("data-midis") || "").split(",").filter(Boolean).map(Number); this._effacerItem({ t, u, midis }); return; }
      if (!this.outil.actif || this.outil.gomme || (g && this.outil.mode !== "silence")) return; const c = this._cibleSouris(e.clientX, e.clientY); if (c) this._poser(c, { val: this.outil.val, mode: this.outil.mode });
    });
    sc.addEventListener("keydown", e => {
      if (e.key === "Escape") { this.outil.actif = false; this.outil.gomme = false; this.choix = null; if (this.res) this.res.surlignerNote(null); this._majPalette(); this._cacherApercu(); return; }
      if (!this.choix) return;
      if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); this._effacerItem({ t: this.choix.t * 24, u: this.choix.u, midis: [this.choix.n] }); }
      else if (e.key === "ArrowUp" || e.key === "ArrowDown") { e.preventDefault(); this._transposerChoix((e.key === "ArrowUp" ? 1 : -1) * (e.shiftKey ? 12 : 1)); }
    });
  }
  _apresGlisser(ts) { return Number.isFinite(this._finDrag) && ts >= this._finDrag - 2 && ts - this._finDrag < 12; }
  _cibleSouris(cx, cy, grille = this._grille()) {
    const sv = this.$("pt-score").querySelector("svg"); if (!sv || !this.res) return null; const r = sv.getBoundingClientRect();
    if (cx < r.left - 6 || cx > r.right + 6 || cy < r.top - 6 || cy > r.bottom + 6) return null;
    const c = this.res.sonder(cx - r.left, cy - r.top, { grille }); return c;
  }
  _debutSession(e, spec) {
    if (e.button > 0) return; if (spec.type === "palette") e.preventDefault();
    this.session = { spec, x0: e.clientX, y0: e.clientY, actif: false, cible: null, dernierMidi: null, id: e.pointerId };
    const bouge = ev => this._glisser(ev), fin = ev => { window.removeEventListener("pointermove", bouge); window.removeEventListener("pointerup", fin); window.removeEventListener("pointercancel", fin); this._lacher(ev, ev.type === "pointercancel"); };
    window.addEventListener("pointermove", bouge); window.addEventListener("pointerup", fin); window.addEventListener("pointercancel", fin);
  }
  _glisser(e) {
    const s = this.session; if (!s) return;
    if (!s.actif) { if (Math.hypot(e.clientX - s.x0, e.clientY - s.y0) < 6) return; s.actif = true; if (s.spec.type === "palette") this._creerFantome(s.spec.val); this.$("pt-score").classList.add("pt-en-glisse"); }
    if (s.fantome) { s.fantome.style.left = `${e.clientX}px`; s.fantome.style.top = `${e.clientY}px`; }
    const val = s.spec.type === "palette" ? s.spec.val : null, grille = s.spec.type === "palette" ? Math.max(3, Math.min(unitesValeur(val, 0) || 24, 24)) : 12;
    s.cible = this._cibleSouris(e.clientX, e.clientY, grille); this._apercu(s.cible, s.spec.type === "palette" ? this.outil.mode === "note" : true);
  }
  _lacher(e, annule) {
    const s = this.session; this.session = null; if (!s) return; this._cacherApercu(); this.$("pt-score").classList.remove("pt-en-glisse"); if (s.fantome) s.fantome.remove();
    if (!s.actif) { if (s.spec.type === "palette" && !annule) this._choisirValeur(s.spec.val); return; }   // un simple clic sur la palette : l'outil est choisi
    this._finDrag = e.timeStamp;   // le clic qui suit la fin d'un glisser n'est pas un vrai clic
    if (annule || !s.cible) return;
    if (s.spec.type === "palette") { this.outil.val = s.spec.val; this._poser(s.cible, { val: s.spec.val, mode: this.outil.mode }); this._majPalette(); }
    else this._deplacer(s.spec.info, s.cible);
  }
  _creerFantome(val) {
    const b = this.boutonsValeur.find(x => x.dataset.val === val), f = document.createElement("div"); f.className = "pt-fantome"; f.textContent = this.outil.mode === "silence" ? b._gs : b._gn; document.body.append(f); this.session.fantome = f;
  }
  // l'aperçu : la tête de note au bon endroit, une barre à la hauteur de la portée, le nom de la note
  _apercu(c, avecTete) {
    const sc = this.$("pt-score"), sv = sc.querySelector("svg"); if (!sv) return; let ap = this.apercuEl;
    if (!c) { this._cacherApercu(); return; }
    if (!ap || !ap.isConnected) { ap = this.apercuEl = div("pt-apercu"); ap.innerHTML = '<span class="pt-ap-barre"></span><span class="pt-ap-tete"></span><span class="pt-ap-nom"></span>'; sc.append(ap); }
    const { dx, dy } = this._decalageSvg(), sil = this.session ? (this.session.spec.type === "palette" && this.outil.mode === "silence") : this.outil.mode === "silence" && this.outil.actif;
    ap.hidden = false; const barre = ap.querySelector(".pt-ap-barre"), tete = ap.querySelector(".pt-ap-tete"), nom = ap.querySelector(".pt-ap-nom");
    barre.style.left = `${c.x + dx}px`; barre.style.top = `${c.yPortee + dy}px`; barre.style.height = `${c.yPorteeBas - c.yPortee}px`;
    const m = this._midiDe(c.diat, this.outil.alt), r = c.esp * 0.62; tete.style.width = `${r * 2.3}px`; tete.style.height = `${r * 1.7}px`; tete.style.left = `${c.x + dx - r * 0.2}px`; tete.style.top = `${c.y + dy - r * 0.85}px`; tete.hidden = !!sil || !avecTete;
    nom.textContent = sil ? "" : m.nom; nom.style.left = `${c.x + dx + r * 2.4}px`; nom.style.top = `${c.y + dy - r * 1.9}px`; nom.hidden = !!sil || !avecTete;
    // le son, en direct : dès que la hauteur change
    if (!sil && avecTete && this.session && this.session.dernierMidi !== m.midi) { this.session.dernierMidi = m.midi; if (this.r.ecouter) this.r.ecouter(m.midi, 0.8); }
  }
  _cacherApercu() { if (this.apercuEl) this.apercuEl.hidden = true; }

  // ================================================================ modifier les notes du clip (en temps = noires), puis réécrire le texte et dessiner
  _garderVitesses(nouvelles, anciennes) {
    if (!anciennes || !anciennes.length) return nouvelles;
    return nouvelles.map(x => { const o = anciennes.find(y => y.n === x.n && Math.abs(y.t - x.t) < 1e-6 && Math.abs(y.d - x.d) < 1e-6); return o && Number.isFinite(o.v) ? { ...x, v: o.v } : x; });
  }
  async _commit(notes, temps = this.temps) {
    this.notes = notes.map(x => ({ ...x })); this.temps = temps; this.choix = null;
    this.texte = this._ecrireDepuis(this.notes, temps); this.genere = true; this.$("pt-texte").value = this.texte; this.erreur = null;
    await this._compiler(true);
  }
  // Poser une note (ou un silence) : celles qu'elle recouvre sont enlevées ou raccourcies ; au même départ, on fait un accord.
  _inserer(notes, x, silence) {
    const t = x.t, f = x.t + x.d, out = [];
    for (const e of notes) {
      const ef = e.t + e.d;
      if (!silence && Math.abs(e.t - t) < 1e-6) { out.push(e); continue; }                       // même départ : accord
      if (e.t < t - 1e-6 && ef > t + 1e-6) out.push({ ...e, d: t - e.t });                       // commence avant : raccourcie
      else if (e.t >= t - 1e-6 && e.t < f - 1e-6) { if (silence && ef > f + 1e-6) out.push({ ...e, t: f, d: ef - f }); }   // commence dedans : enlevée (le reste d'un silence reste)
      else out.push(e);
    }
    if (!silence) out.push({ t, d: x.d, n: x.n, v: x.v ?? 0.8 });
    return out.sort((a, b) => a.t - b.t || a.n - b.n);
  }
  _poser(c, spec) {
    const o = this.outil, sil = spec.mode === "silence"; let u = unitesValeur(spec.val, o.pts ? 1 : 0); if (!u) u = unitesValeur(spec.val, 0); if (!u) return;
    const t = c.tU / 24; let d = u / 24; if (t + d > this.temps + 1e-9) d = this.temps - t; if (d < 1 / 8 - 1e-9) return;
    const m = this._midiDe(c.diat, o.alt); if (!sil && this.r.ecouter && !this.session) this.r.ecouter(m.midi, 0.8);
    this.outil.alt = o.alt && !sil ? null : o.alt; this._majPalette();
    this._commit(this._inserer(this.notes, { t, d, n: m.midi }, sil));
  }
  _notesDe(info) { return this.notes.filter(n => info.midis.includes(n.n) && n.t * 24 < info.t + Math.max(info.u, 1) - 0.5 && (n.t + n.d) * 24 > info.t + 0.5); }
  _effacerItem(info) {
    const cibles = new Set(this._notesDe({ ...info, midis: info.midis || [info.n] })); if (!cibles.size) return;
    this._commit(this.notes.filter(n => !cibles.has(n)));
  }
  _deplacer(info, c) {
    const anc = this._notesDe(info); if (!anc.length) return; const m = this._midiDe(c.diat, this.outil.alt), dn = m.midi - info.midis[0], dt = (c.tU - info.t) / 24; if (!dn && Math.abs(dt) < 1e-6) return;
    let reste = this.notes.filter(n => !anc.includes(n));
    for (const e of anc) { const t = Math.max(0, e.t + dt); reste = this._inserer(reste, { t, d: Math.min(e.d, this.temps - t), n: Math.max(0, Math.min(127, e.n + dn)), v: e.v }, false); }
    this.outil.alt = null; this._majPalette(); if (dn && this.r.ecouter) this.r.ecouter(m.midi, 0.8); this._commit(reste);
  }
  _transposerChoix(demi) {
    const ch = this.choix; if (!ch) return; const info = { t: ch.t * 24, u: ch.u, midis: [ch.n] }; const anc = this._notesDe(info); if (!anc.length) return;
    const nouvelles = this.notes.map(n => anc.includes(n) ? { ...n, n: Math.max(0, Math.min(127, n.n + demi)) } : n); if (this.r.ecouter) this.r.ecouter(Math.max(0, Math.min(127, ch.n + demi)), 0.8);
    this._commit(nouvelles).then(() => { this.choix = { t: ch.t, n: ch.n + demi, u: ch.u }; if (this.res) this.res.surlignerNote(ch.t, ch.n + demi); });
  }
}
