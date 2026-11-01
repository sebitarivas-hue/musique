// Recherche et filtres du catalogue. Sans DOM : testé dans Node.
export const normaliser = t => String(t).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
// Tous les mots de la requête doivent se retrouver (dans le titre, le texte, les mots-clés, les modules ou l'identifiant). Un mot de moins de 2 lettres est ignoré.
export function trouver(entrees, { requete = "", type = "", niveau = "", module = "" } = {}, modulesDe = () => []) {
  const mots = normaliser(requete).split(/[^a-z0-9_]+/).filter(m => m.length >= 2);
  const res = entrees.filter(e => {
    if (type && e.type !== type) return false;
    if (niveau && e.niveau !== niveau) return false;
    if (module && !modulesDe(e).includes(module)) return false;
    if (!mots.length) return true;
    const foin = normaliser([e.titre, e.texte, ...(e.mots || []), ...modulesDe(e), e.id].join(" "));
    return mots.every(m => foin.includes(m));
  });
  // pertinence : un mot trouvé dans le titre passe devant ; ensuite l'ordre alphabétique
  const score = e => mots.reduce((s, m) => s + (normaliser(e.titre).includes(m) ? 2 : 0) + ((e.mots || []).some(k => normaliser(k).includes(m)) ? 1 : 0), 0);
  return res.sort((a, b) => score(b) - score(a) || a.titre.localeCompare(b.titre, "fr"));
}
