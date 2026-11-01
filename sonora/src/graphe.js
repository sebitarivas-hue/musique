// Graphe de signal (représentation intermédiaire) : un tableau de nœuds en affectation unique.
// nœud : { id, op, args:[ids], r:'c'|'k'|'a', ...extra }
// ops : const, ech (durée en échantillons), param, entree, note_champ, voix_somme, ref (signal récursif en cours de définition),
//       opérations pures (add sub mul div mod pow neg non lt le gt ge eq ne et ou sel et les fonctions mathématiques 'fn'),
//       prim (module de la bibliothèque), canal (un canal d'un module multicanal).

export const RANG = { c: 0, k: 1, a: 2 };
export const rmax = (...rs) => rs.reduce((m, r) => (RANG[r] > RANG[m] ? r : m), "c");

export const SR_NOMINAL = 48000;

export function evalOp(op, fn, v, accord = 440) {
  const [a, b, c] = v;
  switch (op) {
    case "add": return a + b; case "sub": return a - b; case "mul": return a * b;
    case "div": return b === 0 ? NaN : a / b; case "mod": return b === 0 ? NaN : a % b; case "pow": return Math.pow(a, b);
    case "neg": return -a; case "non": return a !== 0 ? 0 : 1;
    case "lt": return a < b ? 1 : 0; case "le": return a <= b ? 1 : 0; case "gt": return a > b ? 1 : 0; case "ge": return a >= b ? 1 : 0;
    case "eq": return a === b ? 1 : 0; case "ne": return a !== b ? 1 : 0;
    case "et": return a !== 0 && b !== 0 ? 1 : 0; case "ou": return a !== 0 || b !== 0 ? 1 : 0;
    case "sel": return a !== 0 ? b : c;
    case "fn":
      switch (fn) {
        case "abs": return Math.abs(a); case "signe": return Math.sign(a); case "min": return Math.min(a, b); case "max": return Math.max(a, b);
        case "clamp": return Math.min(Math.max(a, b), c); case "mix": return a + (b - a) * c;
        case "sin": return Math.sin(a); case "cos": return Math.cos(a); case "tan": return Math.tan(a); case "tanh": return Math.tanh(a);
        case "exp": return Math.exp(a); case "log": return Math.log(a); case "log2": return Math.log2(a); case "sqrt": return Math.sqrt(a);
        case "floor": return Math.floor(a); case "arrondi": return Math.round(a);
        case "lin": return Math.pow(10, a / 20); case "db": return 20 * Math.log10(a);
        case "periode": case "frequence": return 1 / a;
        case "midi": return accord * Math.pow(2, (a - 69) / 12); case "note_de": return 69 + 12 * Math.log2(a / accord);
        case "transpose": return a * Math.pow(2, b / 12);
      }
  }
  throw new Error("opération inconnue : " + op + " " + fn);
}

export class Graphe {
  constructor() { this.noeuds = []; this.accord = 440; this.memo = new Map(); }
  add(op, args, r, extra = {}) { const id = this.noeuds.length; this.noeuds.push({ id, op, args, r, ...extra }); return id; }
  cst(v) {
    const cle = Object.is(v, -0) ? "-0" : String(v);
    if (this.memo.has(cle)) return this.memo.get(cle);
    const id = this.add("const", [], "c", { val: v }); this.memo.set(cle, id); return id;
  }
  estConst(id) { return this.noeuds[id].op === "const"; }
  val(id) { return this.noeuds[id].val; }
  // Crée une opération pure, en la calculant tout de suite si tous ses arguments sont connus à la compilation.
  op(op, args, r, fn) {
    const ns = args.map(i => this.noeuds[i]);
    if (ns.every(n => n.op === "const")) {
      const v = evalOp(op, fn, ns.map(n => n.val), this.accord);
      if (Number.isFinite(v)) return this.cst(v);
    }
    const srdep = ns.some(n => n.srdep);
    return this.add(op, args, r, { fn, ...(srdep ? { srdep: true } : {}) });
  }
}

// Valeur d'un nœud calculable à la compilation (les durées en échantillons sont comptées à 48 kHz, pour l'affichage seulement).
export function valeurNominale(g, id, memo = new Map()) {
  if (memo.has(id)) return memo.get(id);
  const n = g.noeuds[id]; let v;
  if (n.op === "const") v = n.val;
  else if (n.op === "ech") v = n.val / SR_NOMINAL;
  else if (["add", "sub", "mul", "div", "mod", "pow", "neg", "non", "lt", "le", "gt", "ge", "eq", "ne", "et", "ou", "sel", "fn"].includes(n.op)) v = evalOp(n.op, n.fn, n.args.map(a => valeurNominale(g, a, memo)), g.accord);
  else v = NaN;
  memo.set(id, v); return v;
}

// Les entrées « tardives » : le signal d'un retard n'est lu qu'à la fin de l'échantillon, il ne crée pas de dépendance immédiate.
export const tardive = (n, i) => n.op === "prim" && n.retard && i === 0;

// Cherche les boucles sans retard. Renvoie les nœuds `ref` pris dans un cycle.
export function trouverCycles(g, racines) {
  const etat = new Map(), pris = new Set();
  const pile = [];
  const visite = id => {
    if (etat.get(id) === 2) return;
    if (etat.get(id) === 1) { const k = pile.indexOf(id); for (const x of pile.slice(k)) if (g.noeuds[x].op === "ref") pris.add(x); return; }
    etat.set(id, 1); pile.push(id);
    const n = g.noeuds[id];
    n.args.forEach((a, i) => { if (!tardive(n, i)) visite(a); });
    pile.pop(); etat.set(id, 2);
  };
  racines.forEach(visite);
  // les signaux tardifs doivent eux aussi être sans boucle immédiate
  g.noeuds.forEach(n => n.args.forEach((a, i) => { if (tardive(n, i)) visite(a); }));
  return pris;
}
