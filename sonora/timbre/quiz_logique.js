// Les quiz de l'Atlas : la logique pure (questions tirées au hasard, testée dans Node). Les données viennent de quiz_atlas.json, écrit par outils/atlas/construire.py :
// seulement ce qui est sûr et écrit (lieux et dates des genres et traditions, lexique, étapes des trajets, fiches d'écoute des musiques du cours). Jamais les filiations.
export const MANCHES = { lieux: 10, ordre: 6, mots: 10, cours: 10, trajets: 10 };
export const melanger = (l, rnd) => { const a = l.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const tirer = (l, n, rnd, cle = x => x) => { const vus = new Set(), r = []; for (const x of melanger(l, rnd)) { const k = cle(x); if (!vus.has(k)) { vus.add(k); r.push(x); } if (r.length === n) break; } return r; };
// Une question à choix : le texte, les choix mélangés, l'indice de la bonne réponse, l'entrée de l'Atlas pour en savoir plus.
function choix(juste, faux, rnd) { const c = melanger([juste, ...faux], rnd); return { choix: c, bonne: c.indexOf(juste) }; }

export function questionsLieux(Q, niveau, rnd, n = MANCHES.lieux) {
  const zones = Q.zones;
  if (niveau === 1) return tirer(Q.lieux, n, rnd, x => x[0]).map(([id, nom, z, , d]) => ({ id, type: "D'où vient cette musique ?", titre: nom, texte: d, ...choix(z, tirer(zones.filter(x => x !== z), 3, rnd), rnd) }));
  const precis = Q.lieux.filter(x => x[3] && !zones.includes(x[3]) && !/international|monde/i.test(x[3])), regions = [...new Set(precis.map(x => x[3]))];
  return tirer(precis, n, rnd, x => x[0]).map(([id, nom, z, r, d]) => {
    const loin = x => x !== r && !x.includes(r) && !r.includes(x);   // jamais « Brésil » contre « Nord-est du Brésil »
    const memeZone = [...new Set(precis.filter(x => x[2] === z && loin(x[3])).map(x => x[3]))], autres = regions.filter(loin);
    const faux = tirer(memeZone.length >= 3 ? memeZone : [...memeZone, ...autres], 3, rnd);
    return { id, type: "D'où vient cette musique ?", titre: nom, texte: d, ...choix(r, faux, rnd) };
  });
}

// Remets dans l'ordre : quatre musiques datées, assez éloignées dans le temps pour qu'on puisse les ranger (50 ans au niveau 1, 15 au niveau 2).
export function questionsOrdre(Q, niveau, rnd, n = MANCHES.ordre) {
  const ecart = niveau === 1 ? 50 : 15, r = [];
  for (let essai = 0; r.length < n && essai < 400; essai++) {
    const g = [];
    for (const x of melanger(Q.ordre, rnd)) { if (g.every(y => Math.abs(y[2] - x[2]) >= ecart && y[1] !== x[1])) g.push(x); if (g.length === 4) break; }
    if (g.length === 4) r.push({ type: "Remets dans l'ordre", titre: "Du plus ancien au plus récent", texte: "Touche les quatre musiques dans l'ordre où elles sont nées.", items: melanger(g, rnd), ordre: g.slice().sort((a, b) => a[2] - b[2]).map(x => x[0]) });
  }
  return r;
}

export function questionsMots(Q, niveau, rnd, n = MANCHES.mots) {
  return tirer(Q.mots, n, rnd, x => x[0]).map(([t, d]) => {
    const faux = tirer(Q.mots.filter(x => x[0] !== t), 3, rnd);
    return niveau === 1 ? { type: "Le mot juste", titre: d, texte: "Quel mot correspond à cette définition ?", ...choix(t, faux.map(x => x[0]), rnd) }
      : { type: "Le mot juste", titre: t, texte: "Quelle est la bonne définition ?", ...choix(d, faux.map(x => x[1]), rnd) };
  });
}

// Les musiques du cours (l'ancienne carte du monde du site) : on lit la description, on retrouve la musique ; ensuite, sa question d'écoute et ses écoutes.
export function questionsCours(Q, niveau, rnd, n = MANCHES.cours) {
  return tirer(Q.cours, n, rnd, x => x[1]).map(([id, nom, lieu, texte, question, ecoutes]) => {
    const faux = tirer(Q.cours.filter(x => x[1] !== nom), niveau === 1 ? 3 : 5, rnd).map(x => x[1]);
    return { id, type: "Les musiques du cours", titre: niveau === 1 ? lieu : "Quelle musique ?", texte, ...choix(nom, faux, rnd), question, ecoutes };
  });
}

// Le fil du trajet : une étape d'un trajet de l'Atlas, décrite sans son nom ; on retrouve la musique parmi les autres étapes du même trajet.
export function questionsTrajets(Q, niveau, rnd, n = MANCHES.trajets) {
  const r = [];
  for (const [, titre, etapes] of melanger(Q.trajets, rnd)) {
    const [id, nom, texte] = etapes[Math.floor(rnd() * etapes.length)], faux = tirer(etapes.filter(x => x[1] !== nom).map(x => x[1]), niveau === 1 ? 3 : 5, rnd);
    if (faux.length >= 3) r.push({ id, type: "Le fil du trajet : " + titre, titre: "Quelle étape ?", texte, ...choix(nom, faux, rnd) });
    if (r.length === n) break;
  }
  return r;
}

export const CREER = { lieux: questionsLieux, ordre: questionsOrdre, mots: questionsMots, cours: questionsCours, trajets: questionsTrajets };
export const etoiles = (bonnes, total) => bonnes >= Math.ceil(total * .9) ? 3 : bonnes >= Math.ceil(total * .75) ? 2 : bonnes >= Math.ceil(total * .5) ? 1 : 0;
