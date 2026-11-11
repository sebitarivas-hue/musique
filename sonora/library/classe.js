// Catalogue de la classe : des élèves proposent un programme, le professeur le relit et l'accepte, et il rejoint la Library.
// Aucun serveur, aucun compte : la proposition est un petit fichier que l'élève remet au professeur par le moyen habituel de la classe,
// et le catalogue publié est un fichier (classe.json) que seul le professeur ajoute au dépôt du site.
// Sans DOM : testé dans Node. Tout ce qui vient d'un fichier est traité comme non fiable : types vérifiés, longueurs bornées, caractères de contrôle retirés.
import { compiler } from "../src/index.js?v=bae1304164";
import { profil } from "./profil.js?v=bae1304164";

export const FORMAT_PROPOSITION = "sonora-proposition", FORMAT_CLASSE = "sonora-classe", VERSION = 1;
export const LIMITES = { titre: 60, texte: 300, pseudo: 20, mots: 5, mot: 20, code: 20000, fichier: 100000, propositions: 60 };
const NIVEAUX = ["Découverte", "Programmation", "Recherche"];
const nettoyer = (t, max) => String(t ?? "").replace(/[\u0000-\u0008\u000b-\u001f\u007f​-‏‪-‮⁦-⁩]/g, "").replace(/\s*\n\s*/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
export const hash = t => { let h = 0x811c9dc5; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36).padStart(7, "0"); };
export const slug = t => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30) || "programme";
export const idClasse = (titre, code) => `classe-${slug(titre)}-${hash(code)}`;

// Un pseudonyme ou un prénom : jamais de contact ni de nom de famille reconnaissable à ces signes (@, adresse web, longue suite de chiffres).
export function verifierPseudo(p) {
  if (!p) return null;
  if (/[@]|https?:|www\.|\.(com|fr|net|org)\b/i.test(p)) return "Un pseudonyme ne contient ni adresse ni lien.";
  if (/\d{4,}/.test(p)) return "Un pseudonyme ne contient pas de longue suite de chiffres (numéro de téléphone, date de naissance).";
  if (!/^[\p{L}\p{N} '\-_.]+$/u.test(p)) return "Un pseudonyme ne contient que des lettres, des chiffres, des espaces, l'apostrophe, le tiret et le point.";
  return null;
}

// Fabrique une proposition à remettre au professeur. Renvoie { ok, erreurs, avertissements, proposition?, profil? }.
export function creerProposition({ titre, texte = "", pseudo = "", mots = [], code }) {
  const p = { format: FORMAT_PROPOSITION, version: VERSION, titre: nettoyer(titre, LIMITES.titre), texte: nettoyer(texte, LIMITES.texte), pseudo: nettoyer(pseudo, LIMITES.pseudo),
    mots: (Array.isArray(mots) ? mots : String(mots).split(/[,;]/)).map(m => nettoyer(m, LIMITES.mot)).filter(Boolean).slice(0, LIMITES.mots), code: String(code ?? "").replace(/\r\n?/g, "\n") };
  const v = valider(p); return { ...v, proposition: v.ok ? p : null };
}

// Valide une proposition lue dans un fichier. Renvoie { ok, erreurs[], avertissements[], entree, profil }. `ok` est faux s'il y a une erreur ; les avertissements laissent le choix au professeur.
export function valider(o, { ids = new Set() } = {}) {
  const erreurs = [], avertissements = [];
  if (!o || typeof o !== "object" || Array.isArray(o)) return { ok: false, erreurs: ["Ce fichier n'est pas une proposition SONORA."], avertissements, entree: null, profil: null };
  if (o.format !== FORMAT_PROPOSITION) erreurs.push("Ce fichier n'est pas une proposition SONORA (format attendu : " + FORMAT_PROPOSITION + ").");
  else if (o.version !== VERSION) erreurs.push("Cette proposition vient d'une autre version de SONORA.");
  for (const [k, t] of [["titre", "string"], ["code", "string"]]) if (typeof o[k] !== t) erreurs.push(`Le champ « ${k} » manque ou n'est pas un texte.`);
  for (const k of ["texte", "pseudo"]) if (o[k] !== undefined && typeof o[k] !== "string") erreurs.push(`Le champ « ${k} » doit être un texte.`);
  if (o.mots !== undefined && !(Array.isArray(o.mots) && o.mots.every(m => typeof m === "string"))) erreurs.push("Le champ « mots » doit être une liste de mots.");
  if (erreurs.length) return { ok: false, erreurs, avertissements, entree: null, profil: null };
  const titre = nettoyer(o.titre, LIMITES.titre + 1), texte = nettoyer(o.texte, LIMITES.texte + 1), pseudo = nettoyer(o.pseudo, LIMITES.pseudo + 1);
  if (!titre) erreurs.push("Le titre est vide."); else if (titre.length > LIMITES.titre) erreurs.push(`Le titre dépasse ${LIMITES.titre} caractères.`);
  if (texte.length > LIMITES.texte) erreurs.push(`La description dépasse ${LIMITES.texte} caractères.`); if (!texte) avertissements.push("Pas de description : le professeur voudra sûrement en ajouter une.");
  const ep = pseudo.length > LIMITES.pseudo ? `Le pseudonyme dépasse ${LIMITES.pseudo} caractères.` : verifierPseudo(pseudo); if (ep) erreurs.push(ep);
  const mots = (o.mots || []).map(m => nettoyer(m, LIMITES.mot + 1)).filter(Boolean); if (mots.length > LIMITES.mots) erreurs.push(`Au plus ${LIMITES.mots} mots-clés.`); if (mots.some(m => m.length > LIMITES.mot)) erreurs.push(`Un mot-clé dépasse ${LIMITES.mot} caractères.`);
  const code = o.code.replace(/\r\n?/g, "\n"); if (code.length > LIMITES.code) erreurs.push(`Le programme dépasse ${LIMITES.code} caractères.`); if (!code.trim()) erreurs.push("Le programme est vide.");
  if (erreurs.length) return { ok: false, erreurs, avertissements, entree: null, profil: null };
  const p = profil(code);
  if (!p.ok) return { ok: false, erreurs: ["Le programme ne se compile pas : " + p.erreur], avertissements, entree: null, profil: null };
  const m = p.mesures;
  if (m.incidents) avertissements.push(`Le calcul a produit ${m.incidents} valeur${m.incidents > 1 ? "s" : ""} impossible${m.incidents > 1 ? "s" : ""} (division par zéro, valeur infinie) : à corriger.`);
  if (m.ecretages || m.crete > -1) avertissements.push(`Le son est trop fort (crête à ${m.crete.toFixed(1).replace(".", ",")} dB) : le limiteur de sortie intervient. Baisse le volume.`);
  if (m.rms < -45) avertissements.push(`Le son est presque inaudible (niveau efficace ${m.rms.toFixed(1).replace(".", ",")} dB).`);
  const id = idClasse(titre, code); if (ids.has(id)) avertissements.push("Ce programme est déjà dans le catalogue de la classe.");
  const entree = { id, titre, texte, code, mots, niveau: "Découverte", pseudo, type: p.type };
  return { ok: true, erreurs, avertissements, entree, profil: p };
}

// Lit un fichier JSON de proposition (texte brut).
export function lireProposition(texte, options) {
  if (typeof texte !== "string" || texte.length > LIMITES.fichier) return { ok: false, erreurs: ["Ce fichier est trop gros pour une proposition."], avertissements: [], entree: null, profil: null };
  let o; try { o = JSON.parse(texte); } catch (_) { return { ok: false, erreurs: ["Ce fichier n'est pas un JSON lisible."], avertissements: [], entree: null, profil: null }; }
  return valider(o, options);
}

// Catalogue publié : un fichier classe.json que le professeur ajoute au dépôt.
export function construireClasse(entrees) {
  return { format: FORMAT_CLASSE, version: VERSION, entrees: entrees.map(e => ({ id: e.id, titre: nettoyer(e.titre, LIMITES.titre), texte: nettoyer(e.texte, LIMITES.texte), code: e.code, mots: (e.mots || []).slice(0, LIMITES.mots), niveau: NIVEAUX.includes(e.niveau) ? e.niveau : "Découverte", pseudo: nettoyer(e.pseudo, LIMITES.pseudo) })) };
}
export const sérialiser = classe => JSON.stringify(classe, null, 1) + "\n";

// Lit classe.json au chargement de la Library : schéma et compilation vérifiés, pas de rendu (rapide). Les entrées invalides sont écartées et comptées.
export function lireClasse(o) {
  const res = { entrees: [], ecartees: 0, erreur: null };
  if (!o || o.format !== FORMAT_CLASSE || o.version !== VERSION || !Array.isArray(o.entrees)) { res.erreur = "Le catalogue de la classe n'a pas le format attendu."; return res; }
  const vus = new Set();
  for (const e of o.entrees.slice(0, 500)) {
    try {
      if (!e || typeof e.titre !== "string" || typeof e.code !== "string" || e.code.length > LIMITES.code || typeof e.id !== "string" || !/^classe-[a-z0-9-]+$/.test(e.id) || vus.has(e.id)) throw 0;
      const pseudo = nettoyer(e.pseudo, LIMITES.pseudo); if (verifierPseudo(pseudo)) throw 0;
      const r = compiler(e.code, { generer: false }); if (!r.ok) throw 0;
      vus.add(e.id);
      res.entrees.push({ id: e.id, titre: nettoyer(e.titre, LIMITES.titre), texte: nettoyer(e.texte, LIMITES.texte), code: e.code.replace(/\r\n?/g, "\n"), niveau: NIVEAUX.includes(e.niveau) ? e.niveau : "Découverte",
        mots: (Array.isArray(e.mots) ? e.mots : []).filter(m => typeof m === "string").map(m => nettoyer(m, LIMITES.mot)).filter(Boolean).slice(0, LIMITES.mots), pseudo, origine: "Classe", type: /(^|\n)\s*effet\s/.test(e.code) ? "effet" : "instrument" });
    } catch (_) { res.ecartees++; }
  }
  return res;
}
