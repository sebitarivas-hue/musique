// Analyse lexicale : le texte source devient une suite de jetons positionnés.
import { UNITES } from "./unites.js?v=4d8a66197a";

export const MOTS = new Set(["utilise", "comme", "const", "fonction", "rend", "instrument", "effet", "reglage", "entree", "sortie", "soit", "rec",
  "voix", "polyphonie", "automation", "boucle", "dans", "courbe", "lissage", "etiquette", "pas", "choix", "si", "alors", "sinon", "et", "ou", "non",
  "vrai", "faux", "table", "sur"]);

const NOTE = /(do|re|mi|fa|sol|la|si)(#|b)?(-?\d)(?![\p{L}\p{N}_])/uy;
const DEBUT_IDENT = /[\p{L}_]/u, SUITE_IDENT = /[\p{L}\p{N}_]/u, CHIFFRE = /[0-9]/;
const OPS2 = ["->", "==", "!=", "<=", ">=", ".."];
const OPS1 = "+-*/%^<>(){}[],:.=";

// jeton : { t, v, debut, fin } ; t vaut nombre, quantite, note, ident, mot, texte, op, doc ou fin
export function lexer(source, diags) {
  const jetons = [];
  let i = 0;
  const n = source.length;
  const ajoute = (t, v, debut, fin, extra) => jetons.push({ t, v, debut, fin, ...extra });

  while (i < n) {
    const c = source[i];
    if (c === " " || c === "\t" || c === "\r" || c === "\n") { i++; continue; }
    // commentaires
    if (c === "/" && source[i + 1] === "/") {
      const debut = i;
      let j = i; while (j < n && source[j] !== "\n") j++;
      if (source[i + 2] === "/") ajoute("doc", source.slice(i + 3, j).trim(), debut, j);
      i = j; continue;
    }
    if (c === "/" && source[i + 1] === "*") {
      const fin = source.indexOf("*/", i + 2);
      if (fin < 0) { diags.erreur("E004", "Commentaire de bloc jamais fermé : il manque `*/`.", i, i + 2, { suggestion: "ferme le commentaire avec */" }); return fin0(); }
      i = fin + 2; continue;
    }
    // texte
    if (c === '"') {
      let j = i + 1, s = "";
      while (j < n && source[j] !== '"' && source[j] !== "\n") { if (source[j] === "\\" && source[j + 1] === '"') { s += '"'; j += 2; } else s += source[j++]; }
      if (source[j] !== '"') { diags.erreur("E002", "Texte jamais fermé : il manque un guillemet.", i, j, { suggestion: 'termine le texte par "' }); i = j; continue; }
      ajoute("texte", s, i, j + 1); i = j + 1; continue;
    }
    // nombre, éventuellement suivi d'une unité
    if (CHIFFRE.test(c)) {
      const debut = i;
      let j = i;
      while (j < n && (CHIFFRE.test(source[j]) || (source[j] === "_" && CHIFFRE.test(source[j + 1] || "")))) j++;
      let reel = false;
      if (source[j] === "." && source[j + 1] !== ".") {
        if (CHIFFRE.test(source[j + 1] || "")) { reel = true; j++; while (j < n && (CHIFFRE.test(source[j]) || (source[j] === "_" && CHIFFRE.test(source[j + 1] || "")))) j++; }
        else { diags.erreur("E003", "Nombre mal formé : il manque des chiffres après la virgule.", debut, j + 1, { suggestion: `écris ${source.slice(debut, j)}.0 ou ${source.slice(debut, j)}` }); i = j + 1; continue; }
      }
      if ((source[j] === "e" || source[j] === "E") && /^[+-]?[0-9]/.test(source.slice(j + 1, j + 3))) {
        reel = true; j++; if (source[j] === "+" || source[j] === "-") j++; while (j < n && CHIFFRE.test(source[j])) j++;
      }
      const valeur = Number(source.slice(debut, j).split("_").join(""));
      // unité : collée au nombre (440Hz, 30%) ou après des espaces (440 Hz)
      let k = j;
      const collee = source[k] === "%" || (k < n && DEBUT_IDENT.test(source[k]));
      while (!collee && (source[k] === " " || source[k] === "\t")) k++;
      if (source[k] === "%" && k === j) { ajoute("quantite", valeur, debut, k + 1, { unite: "%" }); i = k + 1; continue; }
      if (k < n && DEBUT_IDENT.test(source[k])) {
        let m = k; while (m < n && SUITE_IDENT.test(source[m])) m++;
        const mot = source.slice(k, m);
        if (Object.prototype.hasOwnProperty.call(UNITES, mot)) { ajoute("quantite", valeur, debut, m, { unite: mot }); i = m; continue; }
        if (k === j) { diags.erreur("E413", `Unité inconnue : \`${mot}\`.`, k, m, { suggestion: "les unités connues sont s, ms, ech, Hz, kHz, bpm, dB, tour, rad, deg, dt, ct et %" }); i = m; continue; }
      }
      ajoute("nombre", valeur, debut, j, { entier: !reel }); i = j; continue;
    }
    // note de musique (la4, do#3, sib2)
    if (DEBUT_IDENT.test(c)) {
      NOTE.lastIndex = i;
      const m = NOTE.exec(source);
      if (m) { ajoute("note", m[0], i, i + m[0].length); i += m[0].length; continue; }
      let j = i; while (j < n && SUITE_IDENT.test(source[j])) j++;
      const mot = source.slice(i, j);
      ajoute(MOTS.has(mot) ? "mot" : "ident", mot, i, j); i = j; continue;
    }
    // opérateurs
    const deux = source.slice(i, i + 2);
    if (OPS2.includes(deux)) { ajoute("op", deux, i, i + 2); i += 2; continue; }
    if (OPS1.includes(c)) { ajoute("op", c, i, i + 1); i++; continue; }
    diags.erreur("E001", `Caractère inconnu : \`${c}\`.`, i, i + 1);
    i++;
  }
  return fin0();
  function fin0() { jetons.push({ t: "fin", v: "", debut: n, fin: n }); return jetons; }
}
