// Diagnostics : erreurs et avertissements localisés dans le source, avec suggestion éventuelle.

export class Diagnostics {
  constructor(source) {
    this.source = source;
    this.liste = [];
    this.debuts = [0];
    for (let i = 0; i < source.length; i++) if (source[i] === "\n") this.debuts.push(i + 1);
  }
  position(decalage) {
    let lo = 0, hi = this.debuts.length - 1;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (this.debuts[m] <= decalage) lo = m; else hi = m - 1; }
    return { ligne: lo + 1, colonne: decalage - this.debuts[lo] + 1 };
  }
  ajouter(code, gravite, message, debut, fin, extra = {}) {
    const d = { code, gravite, message, debut, fin: Math.max(fin ?? debut, debut), ...this.position(debut) };
    if (extra.suggestion) d.suggestion = extra.suggestion;
    if (extra.detail) d.detail = extra.detail;
    // deux diagnostics identiques au même endroit ne sont donnés qu'une fois
    if (!this.liste.some(x => x.code === code && x.debut === debut && x.message === message)) this.liste.push(d);
    return d;
  }
  erreur(code, message, debut, fin, extra) { return this.ajouter(code, "erreur", message, debut, fin, extra); }
  avertissement(code, message, debut, fin, extra) { return this.ajouter(code, "avertissement", message, debut, fin, extra); }
  get erreurs() { return this.liste.filter(d => d.gravite === "erreur"); }
  get ok() { return this.erreurs.length === 0; }
}

export function ligneDe(source, d) {
  const debut = source.lastIndexOf("\n", d.debut - 1) + 1;
  let fin = source.indexOf("\n", d.debut); if (fin < 0) fin = source.length;
  return { texte: source.slice(debut, fin), debut };
}

// Rendu texte : le message, la ligne fautive, un soulignement, la suggestion.
export function rendre(d, source) {
  const { texte, debut } = ligneDe(source, d);
  const col = d.debut - debut, long = Math.max(1, Math.min(d.fin - d.debut, texte.length - col));
  const num = String(d.ligne);
  const etiquette = d.gravite === "erreur" ? "Erreur" : "Avertissement";
  let s = `${etiquette} ${d.code} (ligne ${d.ligne}, colonne ${d.colonne}) : ${d.message}\n`;
  s += `  ${num} | ${texte}\n  ${" ".repeat(num.length)} | ${" ".repeat(col)}${"^".repeat(long)}\n`;
  if (d.detail) s += `${d.detail}\n`;
  if (d.suggestion) s += `Suggestion : ${d.suggestion}\n`;
  return s;
}

export function distance(a, b) {
  const m = a.length, n = b.length; if (Math.abs(m - n) > 3) return 99;
  const t = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) t[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++)
    t[i][j] = Math.min(t[i - 1][j] + 1, t[i][j - 1] + 1, t[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return t[m][n];
}

// Le nom connu le plus proche (distance d'édition au plus 2), ou null.
export function proche(nom, candidats) {
  let meilleur = null, d0 = 3;
  for (const c of candidats) { const d = distance(nom, c); if (d < d0) { d0 = d; meilleur = c; } }
  return meilleur;
}
