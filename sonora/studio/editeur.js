// Éditeur de code SONORA : une zone de texte transparente au-dessus d'un calque coloré. Aucune dépendance.
// Coloration syntaxique, numéros de ligne, soulignement des erreurs, autocomplétion, mot sous le curseur (pour l'aide contextuelle).
import { MOTS } from "../src/lexeur.js?v=d86f43e9c8";
import { MODULES, MATHS } from "../src/index.js?v=d86f43e9c8";

const RE = /(\/\/[^\n]*)|(\/\*[\s\S]*?(?:\*\/|$))|("(?:[^"\\\n]|\\.)*"?)|(\b\d[\d_]*(?:\.\d+)?(?:[eE][+-]?\d+)?(?:[ \t]?(?:kHz|Hz|ms|ech|dB|tour|rad|deg|dt|ct|bpm|s)\b|%)?)|(\b(?:do|re|mi|fa|sol|la|si)[#b]?-?\d\b)|([\p{L}_][\p{L}\p{N}_]*)|(->|[=<>!]=|\.\.|[+\-*/%^<>(){}\[\],:.=])/gu;
const echapper = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const TYPES = new Set(["Hz", "s", "Ratio", "Reel", "Entier", "dB", "Phase", "Intervalle", "BPM", "Audio", "Controle", "Booleen", "Porte", "Texte", "Note", "Evenement"]);

export function classe(mot) {
  if (MOTS.has(mot)) return "kw";
  if (MODULES[mot]) return "mdl";
  if (MATHS[mot]) return "fn";
  if (TYPES.has(mot)) return "ty";
  return "";
}

// marques : [{ debut, fin, classe }] ; rend le HTML du calque coloré
export function rendreHTML(src, marques = []) {
  const jetons = []; let m; RE.lastIndex = 0;
  while ((m = RE.exec(src))) {
    const t = m[1] ? (m[1].startsWith("///") ? "doc" : "com") : m[2] ? "com" : m[3] ? "str" : m[4] ? "num" : m[5] ? "note" : m[6] ? classe(m[6]) : "op";
    jetons.push([m.index, m.index + m[0].length, t]);
  }
  const bornes = new Set([0, src.length]);
  for (const j of jetons) { bornes.add(j[0]); bornes.add(j[1]); }
  for (const x of marques) { bornes.add(Math.max(0, x.debut)); bornes.add(Math.min(src.length, Math.max(x.fin, x.debut + 1))); }
  const pts = [...bornes].sort((a, b) => a - b);
  let h = "", ji = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1]; if (a === b) continue;
    while (ji < jetons.length && jetons[ji][1] <= a) ji++;
    const tok = ji < jetons.length && jetons[ji][0] <= a ? jetons[ji][2] : "";
    const mq = marques.filter(x => a >= x.debut && a < Math.max(x.fin, x.debut + 1)).map(x => x.classe).join(" ");
    const cl = [tok, mq].filter(Boolean).join(" ");
    h += cl ? `<span class="${cl}">${echapper(src.slice(a, b))}</span>` : echapper(src.slice(a, b));
  }
  return h + "\n";
}

// Remplace v[debut, fin) par texte en gardant l'historique d'annulation (Ctrl+Z) quand le navigateur le permet.
function inserer(ta, debut, fin, texte, curseur) {
  ta.focus(); ta.setSelectionRange(debut, fin);
  let ok = false; try { ok = document.execCommand("insertText", false, texte); } catch (_) {}
  if (!ok || ta.value.slice(debut, debut + texte.length) !== texte) { const v = ta.value; ta.value = v.slice(0, debut) + texte + v.slice(fin); }
  const p = debut + (curseur !== undefined ? curseur : texte.length); ta.setSelectionRange(p, p);
}
export { inserer };

export class Editeur {
  // zone : élément qui contiendra l'éditeur ; options : { onChange, candidats: () => [{ mot, type, detail }] }
  constructor(zone, options = {}) {
    this.options = options; this.marques = []; this.lignesErreur = new Map();
    zone.innerHTML = `<div class="ed-gouttiere" aria-hidden="true"></div><div class="ed-corps"><pre class="ed-calque" aria-hidden="true"></pre><textarea class="ed-texte" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" aria-label="Programme SONORA" aria-multiline="true"></textarea><ul class="ed-auto" role="listbox" hidden></ul></div>`;
    this.gout = zone.querySelector(".ed-gouttiere"); this.calque = zone.querySelector(".ed-calque"); this.ta = zone.querySelector(".ed-texte"); this.auto = zone.querySelector(".ed-auto"); this.corps = zone.querySelector(".ed-corps");
    this.ta.addEventListener("input", () => { this.maj(); this.proposer(); this.options.onChange && this.options.onChange(this.valeur); });
    this.ta.addEventListener("scroll", () => this.defiler());
    this.ta.addEventListener("keydown", e => this.touche(e));
    this.ta.addEventListener("click", () => { this.fermerAuto(); this.options.onCurseur && this.options.onCurseur(this.motSousCurseur()); });
    this.ta.addEventListener("keyup", e => { if (!["ArrowDown", "ArrowUp", "Enter", "Tab", "Escape"].includes(e.key) || this.auto.hidden) this.options.onCurseur && this.options.onCurseur(this.motSousCurseur()); });
    this.ta.addEventListener("blur", () => setTimeout(() => this.fermerAuto(), 120));
    this.indice = 0; this.maj();
  }
  get valeur() { return this.ta.value; }
  set valeur(v) { if (this.options.onRemplace && !this._silence && this.ta.value !== v) this.options.onRemplace(this.ta.value); this.ta.value = v; this.marques = []; this.lignesErreur.clear(); this.maj(); this.fermerAuto(); }
  focus() { this.ta.focus(); }

  maj() {
    const src = this.ta.value;
    this.calque.innerHTML = rendreHTML(src, this.marques);
    const n = src.split("\n").length;
    this.gout.innerHTML = Array.from({ length: n }, (_, i) => `<div class="${this.lignesErreur.has(i + 1) ? "err" : ""}" ${this.lignesErreur.has(i + 1) ? `title="${echapper(this.lignesErreur.get(i + 1))}"` : ""}>${i + 1}</div>`).join("");
    this.defiler();
  }
  defiler() { this.calque.scrollTop = this.ta.scrollTop; this.calque.scrollLeft = this.ta.scrollLeft; this.gout.scrollTop = this.ta.scrollTop; }

  // diagnostics : [{ debut, fin, ligne, gravite, message }]
  marquer(diagnostics) {
    this.marques = diagnostics.map(d => ({ debut: d.debut, fin: d.fin, classe: d.gravite === "erreur" ? "erreur" : "avert" }));
    this.lignesErreur = new Map(diagnostics.map(d => [d.ligne, d.message]));
    this.maj();
  }
  allerA(ligne, colonne = 1) {
    const lignes = this.ta.value.split("\n"); let p = 0;
    for (let i = 0; i < ligne - 1 && i < lignes.length; i++) p += lignes[i].length + 1;
    p += colonne - 1; this.ta.focus(); this.ta.setSelectionRange(p, p);
    const h = parseFloat(getComputedStyle(this.ta).lineHeight) || 22; this.ta.scrollTop = Math.max(0, (ligne - 3) * h);
  }

  motSousCurseur() {
    const v = this.ta.value, p = this.ta.selectionStart; let a = p, b = p;
    const estMot = c => /[\p{L}\p{N}_]/u.test(c || "");
    while (a > 0 && estMot(v[a - 1])) a--; while (b < v.length && estMot(v[b])) b++;
    return v.slice(a, b);
  }

  // ---- autocomplétion ----
  prefixe() {
    const v = this.ta.value, p = this.ta.selectionStart; let a = p;
    while (a > 0 && /[\p{L}\p{N}_]/u.test(v[a - 1])) a--;
    return { texte: v.slice(a, p), debut: a, fin: p };
  }
  proposer(force = false) {
    const pre = this.prefixe();
    if (pre.texte.length < 1 && !force) return this.fermerAuto();
    if (/^\d/.test(pre.texte)) return this.fermerAuto();
    const c = (this.options.candidats ? this.options.candidats() : []).filter(x => x.mot.startsWith(pre.texte) && x.mot !== pre.texte);
    c.sort((a, b) => a.mot.length - b.mot.length || a.mot.localeCompare(b.mot));
    this.liste = c.slice(0, 8); this.pre = pre;
    if (!this.liste.length) return this.fermerAuto();
    this.indice = 0; this.dessinerAuto();
  }
  dessinerAuto() {
    this.auto.innerHTML = this.liste.map((x, i) => `<li role="option" aria-selected="${i === this.indice}" data-i="${i}" class="${i === this.indice ? "sel" : ""}"><b>${echapper(x.mot)}</b><span class="t">${echapper(x.type)}</span><span class="d">${echapper(x.detail || "")}</span></li>`).join("");
    const coord = this.coordonnees(this.pre.debut);
    this.auto.style.left = Math.min(coord.x, Math.max(0, this.corps.clientWidth - 280)) + "px"; this.auto.style.top = coord.y + "px"; this.auto.hidden = false;
    this.auto.querySelectorAll("li").forEach(li => li.onmousedown = e => { e.preventDefault(); this.indice = +li.dataset.i; this.accepter(); });
  }
  fermerAuto() { this.auto.hidden = true; this.liste = []; }
  accepter() {
    const x = this.liste[this.indice]; if (!x) return;
    const insere = x.insere || x.mot, pre = this.pre; this.fermerAuto();
    inserer(this.ta, pre.debut, pre.fin, insere, x.curseur); this.maj(); this.options.onChange && this.options.onChange(this.valeur);
  }
  coordonnees(position) {
    const cs = getComputedStyle(this.ta), h = parseFloat(cs.lineHeight) || 22;
    if (!this._largeur) { const c = document.createElement("canvas").getContext("2d"); c.font = `${cs.fontSize} ${cs.fontFamily}`; this._largeur = c.measureText("M").width; }
    const avant = this.ta.value.slice(0, position).split("\n"); const ligne = avant.length - 1, col = avant[avant.length - 1].length;
    return { x: parseFloat(cs.paddingLeft) + col * this._largeur - this.ta.scrollLeft, y: parseFloat(cs.paddingTop) + (ligne + 1) * h - this.ta.scrollTop };
  }
  touche(e) {
    if (!this.auto.hidden) {
      if (e.key === "ArrowDown") { e.preventDefault(); this.indice = (this.indice + 1) % this.liste.length; this.dessinerAuto(); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); this.indice = (this.indice + this.liste.length - 1) % this.liste.length; this.dessinerAuto(); return; }
      if (e.key === "Tab" || e.key === "Enter") { e.preventDefault(); this.accepter(); return; }
      if (e.key === "Escape") { e.preventDefault(); this.fermerAuto(); return; }
    }
    if (e.key === " " && e.ctrlKey) { e.preventDefault(); this.proposer(true); return; }
    if (e.key === "Tab" && !e.shiftKey) { // indentation de quatre espaces
      e.preventDefault(); inserer(this.ta, this.ta.selectionStart, this.ta.selectionEnd, "    "); this.maj(); this.options.onChange && this.options.onChange(this.valeur); return;
    }
    if (e.key === "Enter") { // conserve l'indentation de la ligne
      const a = this.ta.selectionStart, v = this.ta.value, debut = v.lastIndexOf("\n", a - 1) + 1, m = /^[ \t]*/.exec(v.slice(debut, a))[0];
      const plus = /\{\s*$/.test(v.slice(debut, a)) ? "    " : "";
      e.preventDefault(); inserer(this.ta, a, this.ta.selectionEnd, "\n" + m + plus);
      this.maj(); this.options.onChange && this.options.onChange(this.valeur);
    }
  }
}
