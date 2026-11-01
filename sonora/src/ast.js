// Nœuds de l'AST : { type, debut, fin, ...champs }. Voir SPEC.md, partie 11.
export const noeud = (type, debut, fin, champs) => ({ type, debut, fin, ...champs });

// Sérialisation stable (pour les tests de référence) : sans les positions si demandé.
export function serialiser(ast, avecPositions = false) {
  return JSON.stringify(ast, (k, v) => (!avecPositions && (k === "debut" || k === "fin")) ? undefined : v, 2);
}
