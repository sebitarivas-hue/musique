// Optimisation du graphe. Passes, dans l'ordre :
//   1. disparition des signaux récursifs en cours de définition (`ref`), remplacés par leur définition ;
//   2. simplifications sûres (x+0, x-0, x*1, x/1, --x) ;
//   3. mise en commun des calculs identiques (CSE) ;
//   4. suppression des nœuds que ni la sortie ni un retard n'utilisent ;
//   5. renumérotation compacte.
// Le pliage des constantes a lieu à la construction du graphe (Graphe.op). Le résultat numérique ne change pas.
import { Graphe } from "./graphe.js?v=4d8a66197a";

// g : graphe d'un module ; racines : ids de sortie. Ne modifie pas g.
export function optimiser(g, racines, options = {}) {
  const niveau = options.niveau ?? 2; // 0 : seulement la disparition des signaux récursifs ; 2 : toutes les passes
  const src = g.noeuds, avant = src.length;

  // 1. copie sans `ref`
  const resoudre = id => { let n = src[id]; while (n.op === "ref") { id = n.args[0]; n = src[id]; } return id; };
  const out = new Graphe(); out.accord = g.accord;
  const corresp = new Map();
  const copier = id => {
    id = resoudre(id);
    if (corresp.has(id)) return corresp.get(id);
    const n = src[id];
    if (n.op === "const") { const c = out.cst(n.val); corresp.set(id, c); return c; }
    const nid = out.noeuds.length;
    out.noeuds.push({ ...n, id: nid, args: [] });
    corresp.set(id, nid); // réservé avant les arguments : les entrées tardives peuvent revenir ici
    out.noeuds[nid].args = n.args.map(copier);
    return nid;
  };
  const racines1 = racines.map(copier);

  // 2 et 3. simplifications et CSE, répétées jusqu'à stabilité
  const n = out.noeuds;
  const rep = n.map(x => x.id);
  const r = id => { while (rep[id] !== id) id = rep[id]; return id; };
  const cle = x => JSON.stringify([x.op, x.fn ?? null, x.val ?? null, x.nom ?? null, x.idx ?? null, x.args.map(r), x.consts ?? null, x.r]);
  for (let tour = 0; tour < (niveau >= 1 ? 6 : 0); tour++) {
    let change = false; const vus = new Map();
    for (const x of n) {
      if (rep[x.id] !== x.id) continue;
      const a = x.args.map(r);
      const cst = i => n[r(i)].op === "const" ? n[r(i)].val : undefined;
      let alias = null;
      if (x.op === "add") { if (cst(a[1]) === 0) alias = a[0]; else if (cst(a[0]) === 0) alias = a[1]; }
      else if (x.op === "sub") { if (cst(a[1]) === 0) alias = a[0]; }
      else if (x.op === "mul") { if (cst(a[1]) === 1) alias = a[0]; else if (cst(a[0]) === 1) alias = a[1]; }
      else if (x.op === "div") { if (cst(a[1]) === 1) alias = a[0]; }
      else if (x.op === "neg" && n[a[0]].op === "neg") alias = r(n[a[0]].args[0]);
      if (alias !== null && alias !== x.id && n[alias].r === x.r) { rep[x.id] = alias; change = true; continue; }
      const k = cle(x);
      if (vus.has(k)) { rep[x.id] = vus.get(k); change = true; } else vus.set(k, x.id);
    }
    if (!change) break;
  }

  // 4. nœuds atteignables depuis les racines (les entrées tardives comptent : le retard doit être alimenté)
  const vivant = new Set(), pile = niveau >= 2 ? racines1.map(r) : n.map(x => x.id);
  while (pile.length) { const id = pile.pop(); if (vivant.has(id)) continue; vivant.add(id); n[id].args.forEach(a => pile.push(r(a))); }

  // 5. renumérotation
  const g2 = new Graphe(); g2.accord = out.accord;
  const nouv = new Map();
  for (const x of n) if (vivant.has(x.id)) { nouv.set(x.id, g2.noeuds.length); g2.noeuds.push({ ...x, id: g2.noeuds.length }); }
  for (const x of g2.noeuds) x.args = x.args.map(a => nouv.get(r(a)));
  return { graphe: g2, racines: racines1.map(a => nouv.get(r(a))), stats: { avant, apres: g2.noeuds.length } };
}
