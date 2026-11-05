// Analyse sémantique : résolution des noms, types, unités, cadences et connexions.
// Elle construit en même temps le graphe de signal (écart assumé par rapport au découpage de SPEC.md : sema et graphe
// sont fusionnés, car typer une expression et la placer dans le graphe sont le même parcours).

import { Graphe, RANG, rmax, valeurNominale, trouverCycles, SR_NOMINAL } from "./graphe.js?v=a44f89b8f6";
import { MODULES, MATHS } from "./bibliotheque.js?v=a44f89b8f6";
import * as U from "./unites.js?v=a44f89b8f6";
import { COMPOSITES } from "./prelude.js?v=a44f89b8f6";
import { analyser } from "./analyseur.js?v=a44f89b8f6";
import { Diagnostics, proche } from "./diagnostics.js?v=a44f89b8f6";

const { ZERO } = U;

// ---- types ----
const num = (d, r, n = 1, extra) => ({ b: "num", d, r, n, ...extra });
export const TYPES_SIMPLES = {
  Hz: () => num(U.D_FREQ, "c"), s: () => num(U.D_TEMPS, "c"), Ratio: () => num(ZERO, "c"), Reel: () => num(ZERO, "c"), Entier: () => num(ZERO, "c", 1, { entier: true }),
  dB: () => num(U.D_NIVEAU, "c"), Phase: () => num(U.D_PHASE, "c"), Intervalle: () => num(U.D_INTERVALLE, "c"), BPM: () => num(U.D_FREQ, "c"),
  Audio: () => num(ZERO, "a"), Controle: () => num(ZERO, "k"),
  Booleen: () => ({ b: "bool", d: ZERO, r: "c", n: 1 }), Porte: () => ({ b: "bool", d: ZERO, r: "k", n: 1, porte: true }),
  Texte: () => ({ b: "texte" }), Note: () => ({ b: "note" }), Table: () => ({ b: "table" }),
};

const nomType = t => t.b === "num" ? U.nom(t.d) : t.b === "bool" ? "un booléen" : t.b === "texte" ? "un texte" : t.b === "note" ? "une note" : t.b === "evt" ? "des événements" : t.b === "table" ? "une table" : t.b;
const ADJ = { c: "constant", k: "un contrôle", a: "un signal audio" };

export function resoudreType(t, diags) {
  if (t.nom === "Evenement") {
    if (t.arguments.length === 1 && t.arguments[0].nom === "Note") return { b: "evt", elem: "Note" };
    diags.erreur("E305", "Les événements disponibles sont `Evenement<Note>`.", t.debut, t.fin); return null;
  }
  const f = TYPES_SIMPLES[t.nom];
  if (!f) {
    const s = proche(t.nom, Object.keys(TYPES_SIMPLES));
    diags.erreur("E305", `Type inconnu : \`${t.nom}\`.`, t.debut, t.fin, s ? { suggestion: `vouliez-vous écrire ${s} ?` } : {});
    return null;
  }
  const ty = f();
  if (t.canaux) { if (ty.b !== "num" || t.canaux < 1 || t.canaux > 2) { diags.erreur("E512", "Un faisceau a un ou deux canaux dans cette version.", t.debut, t.fin); return null; } ty.n = t.canaux; }
  return ty;
}

class Env {
  constructor(parent) { this.parent = parent; this.vars = new Map(); }
  cherche(nom) { for (let e = this; e; e = e.parent) if (e.vars.has(nom)) return e.vars.get(nom); return null; }
  noms() { const s = new Set(); for (let e = this; e; e = e.parent) for (const k of e.vars.keys()) s.add(k); return [...s]; }
}

class Abandon extends Error {}

export function analyserSemantique(ast, diags) {
  const globaux = { env: new Env(null), fonctions: new Map(), tables: new Map(), modules: [], accord: 440 };
  const E = new Elaboration(diags, globaux);
  return E.programme(ast);
}

class Elaboration {
  constructor(diags, globaux) { this.diags = diags; this.G = globaux; this.pile = []; }

  err(code, msg, e, extra) { this.diags.erreur(code, msg, e.debut, e.fin, extra); throw new Abandon(msg); }
  avert(code, msg, e, extra) { this.diags.avertissement(code, msg, e.debut, e.fin, extra); }

  // ---------- programme ----------
  programme(ast) {
    const decls = ast.declarations;
    const accord = decls.find(d => d.type === "Constante" && d.nom === "accord");
    if (accord) this.constante(accord);
    for (const d of decls) {
      try {
        switch (d.type) {
          case "Utilise": break;
          case "Constante": if (d !== accord) this.constante(d); break;
          case "Table": this.table(d); break;
          case "Fonction": this.declareFonction(d); break;
        }
      } catch (e) { if (!(e instanceof Abandon)) throw e; }
    }
    const modules = [];
    for (const d of decls) {
      if (d.type !== "Module") continue;
      if (modules.some(m => m.nom === d.nom)) { this.diags.erreur("E202", `Le module \`${d.nom}\` est déjà défini.`, d.debutNom, d.finNom); continue; }
      try { modules.push(this.module(d)); } catch (e) { if (!(e instanceof Abandon)) throw e; }
    }
    return modules;
  }

  verifierNomLibre(nom, debut, fin, env) {
    if (env.vars.has(nom)) { this.diags.erreur("E202", `Le nom \`${nom}\` est déjà défini dans cette portée.`, debut, fin); throw new Abandon("doublon"); }
  }

  // Une constante globale ne contient que des valeurs connues à la compilation.
  constante(d) {
    const g = new Graphe(); g.accord = this.G.accord;
    const ctx = { g, env: this.G.env };
    this.verifierNomLibre(d.nom, d.debutNom, d.finNom, this.G.env);
    let v = this.ev(d.valeur, this.G.env, ctx);
    if (d.annotation) v = this.conforme(v, resoudreType(d.annotation, this.diags), d.valeur, "la constante `" + d.nom + "`");
    if (v.ty.b === "num" || v.ty.b === "bool") {
      const descr = v.ids.map(id => { const n = g.noeuds[id]; if (n.op === "const") return { v: n.val }; if (n.op === "ech") return { ech: n.val }; this.err("E317", "Une constante doit être calculable à la compilation.", d.valeur); });
      this.G.env.vars.set(d.nom, { constante: { ty: { ...v.ty, r: "c" }, descr }, used: true });
      if (d.nom === "accord") this.G.accord = descr[0].v;
    } else this.G.env.vars.set(d.nom, { val: v, used: true });
  }
  table(d) {
    this.verifierNomLibre(d.nom, d.debutNom, d.finNom, this.G.env);
    const g = new Graphe(); const vals = [];
    for (const e of d.valeurs) { const v = this.ev(e, this.G.env, { g, env: this.G.env }); if (v.ty.b !== "num" || !g.estConst(v.ids[0])) this.err("E306", "Les valeurs d'une table doivent être des nombres connus à la compilation.", e); vals.push(g.val(v.ids[0])); }
    if (vals.length > 65536) this.err("E702", "Une table ne dépasse pas 65 536 valeurs.", d);
    this.G.tables.set(d.nom, vals);
    this.G.env.vars.set(d.nom, { val: { ty: { b: "table" }, table: vals, nom: d.nom }, used: true });
  }
  declareFonction(d) {
    if (this.G.fonctions.has(d.nom)) { this.diags.erreur("E202", `La fonction \`${d.nom}\` est déjà définie.`, d.debutNom, d.finNom); return; }
    this.G.fonctions.set(d.nom, d);
  }

  materialiser(c, g) {
    const ids = c.descr.map(x => x.ech !== undefined ? g.add("ech", [], "c", { val: x.ech, srdep: true }) : g.cst(x.v));
    return { ty: c.ty, ids };
  }

  // ---------- conformité de type ----------
  conforme(v, ty, e, quoi) {
    if (!ty) return v;
    if (ty.b === "evt") { if (v.ty.b !== "evt") this.err("E301", `${quoi} attend des événements.`, e); return v; }
    if (ty.b !== v.ty.b && !(ty.b === "num" && v.ty.b === "num")) this.err("E301", `${quoi} attend ${nomType(ty)} mais reçoit ${nomType(v.ty)}.`, e);
    if (ty.b === "num") {
      if (!U.egal(ty.d, v.ty.d)) this.err("E301", `${quoi} attend ${nomType(ty)} mais reçoit ${nomType(v.ty)}.`, e);
      if (RANG[v.ty.r] > RANG[ty.r] && ty.r !== "c") this.err("E530", `${quoi} attend ${ADJ[ty.r]} mais reçoit ${ADJ[v.ty.r]}.`, e, ty.r === "k" && v.ty.r === "a" ? { suggestion: "utilise niveau(x) pour mesurer un signal audio" } : {});
      if (ty.n > 1 && v.ty.n !== ty.n) this.err("E512", `${quoi} attend ${ty.n} canaux mais reçoit ${v.ty.n}.`, e);
    }
    if (ty.b === "bool" && ty.porte && !v.ty.porte && v.ty.r !== "c") this.err("E301", `${quoi} attend une porte (note tenue ou non).`, e);
    return v;
  }

  // ---------- expressions ----------
  ev(e, env, ctx) {
    const g = ctx.g;
    switch (e.type) {
      case "Nombre": return { ty: num(ZERO, "c", 1, { entier: e.entier }), ids: [g.cst(e.valeur)] };
      case "Quantite": {
        const u = U.UNITES[e.unite];
        if (u.ech) return { ty: num(u.d, "c"), ids: [g.add("ech", [], "c", { val: e.valeur, srdep: true })] };
        return { ty: num(u.d, "c"), ids: [g.cst(e.valeur * u.f)] };
      }
      case "NoteLitterale": return { ty: num(U.D_FREQ, "c"), ids: [g.cst(U.frequenceNote(e.nom, this.G.accord))] };
      case "TexteLit": return { ty: { b: "texte" }, texte: e.valeur };
      case "BooleenLit": return { ty: { b: "bool", d: ZERO, r: "c", n: 1 }, ids: [g.cst(e.valeur ? 1 : 0)] };
      case "Ident": return this.ident(e, env, ctx);
      case "Faisceau": return this.faisceau(e, env, ctx);
      case "Unaire": return this.unaire(e, env, ctx);
      case "Binaire": return this.binaire(e, env, ctx);
      case "Condition": return this.condition(e, env, ctx);
      case "Appel": return this.appel(e, env, ctx, null);
      case "Flux": return this.flux(e, env, ctx);
      case "Acces": return this.acces(e, env, ctx);
      case "Indice": return this.indice(e, env, ctx);
    }
    this.err("E301", "Expression non reconnue.", e);
  }

  ident(e, env, ctx) {
    const b = env.cherche(e.nom);
    if (b) {
      b.used = true;
      if (b.constante) return this.materialiser(b.constante, ctx.g);
      return b.val;
    }
    if (MODULES[e.nom] || MATHS[e.nom] || this.G.fonctions.has(e.nom)) this.err("E322", `\`${e.nom}\` est une fonction : ajoute des parenthèses et ses arguments.`, e, { suggestion: `${e.nom}(...)` });
    const cand = [...env.noms(), ...Object.keys(MODULES), ...Object.keys(MATHS), ...this.G.fonctions.keys()];
    const s = proche(e.nom, cand);
    this.err("E201", `Nom inconnu : \`${e.nom}\`.`, e, s ? { suggestion: `vouliez-vous écrire ${s} ?` } : {});
  }

  faisceau(e, env, ctx) {
    const ids = []; let r = "c", d = null;
    for (const x of e.elements) {
      const v = this.ev(x, env, ctx);
      if (v.ty.b !== "num" || v.ty.n !== 1) this.err("E512", "Un faisceau ne contient que des signaux à un canal.", x);
      if (d && !U.egal(d, v.ty.d)) this.err("E410", "Les canaux d'un faisceau ont la même unité.", x);
      d = v.ty.d; r = rmax(r, v.ty.r); ids.push(v.ids[0]);
    }
    if (ids.length < 1 || ids.length > 2) this.err("E512", "Cette version accepte un ou deux canaux.", e);
    return { ty: num(d, r, ids.length), ids };
  }

  unaire(e, env, ctx) {
    const v = this.ev(e.operande, env, ctx);
    if (e.op === "-") {
      if (v.ty.b !== "num") this.err("E301", "Le signe moins s'applique à un nombre.", e.operande);
      return { ty: { ...v.ty, entier: v.ty.entier }, ids: v.ids.map(i => ctx.g.op("neg", [i], v.ty.r)) };
    }
    if (v.ty.b !== "bool") this.err("E301", "`non` s'applique à un booléen.", e.operande);
    return { ty: { ...v.ty }, ids: v.ids.map(i => ctx.g.op("non", [i], v.ty.r)) };
  }

  differenceDimensions(op, a, b, e) {
    const na = U.nom(a), nb = U.nom(b);
    const verbe = op === "+" ? "additionner" : op === "-" ? "soustraire" : "comparer";
    if ((a.L && U.estZero(b)) || (b.L && U.estZero(a))) this.err("E411", `On ne peut pas ${verbe} un niveau en dB et un rapport sans unité.`, e, { suggestion: "convertis avec lin(x) pour passer des dB à un rapport, ou db(x) pour l'inverse" });
    if ((a.I && U.egal(b, U.D_FREQ)) || (b.I && U.egal(a, U.D_FREQ))) this.err("E412", "On ne peut pas ajouter un intervalle (en demi-tons) à une fréquence avec `+`.", e, { suggestion: "écris transpose(f, 7 dt)" });
    const sug = (U.egal(a, U.D_FREQ) && U.egal(b, U.D_TEMPS)) ? "si tu voulais la période, écris periode(frequence)" : (U.egal(a, U.D_TEMPS) && U.egal(b, U.D_FREQ)) ? "si tu voulais la fréquence, écris frequence(duree)" : undefined;
    this.err("E410", `On ne peut pas ${verbe} ${na} et ${nb}.`, e, { detail: `La partie gauche est ${na}, la partie droite est ${nb}.`, ...(sug ? { suggestion: sug } : {}) });
  }

  binaire(e, env, ctx) {
    const g = ctx.g, op = e.op;
    const a = this.ev(e.gauche, env, ctx), b = this.ev(e.droite, env, ctx);
    if (op === "et" || op === "ou") {
      if (a.ty.b !== "bool" || b.ty.b !== "bool") this.err("E301", `\`${op}\` s'applique à des booléens.`, e);
      const n = this.canaux(a, b, e);
      return { ty: { b: "bool", d: ZERO, r: rmax(a.ty.r, b.ty.r), n, porte: a.ty.porte && b.ty.porte }, ids: this.parCanal(a, b, n, (x, y) => g.op(op, [x, y], rmax(a.ty.r, b.ty.r))) };
    }
    if (a.ty.b !== "num" || b.ty.b !== "num") this.err("E301", `L'opérateur \`${op}\` s'applique à des nombres, pas à ${a.ty.b !== "num" ? nomType(a.ty) : nomType(b.ty)}.`, e);
    const r = rmax(a.ty.r, b.ty.r), n = this.canaux(a, b, e);
    const OPS = { "+": "add", "-": "sub", "*": "mul", "/": "div", "%": "mod", "==": "eq", "!=": "ne", "<": "lt", "<=": "le", ">": "gt", ">=": "ge" };
    let d, bool = false;
    switch (op) {
      case "+": case "-": if (!U.egal(a.ty.d, b.ty.d)) this.differenceDimensions(op, a.ty.d, b.ty.d, e); d = a.ty.d; break;
      case "%": if (!U.egal(a.ty.d, b.ty.d)) this.differenceDimensions("comparer", a.ty.d, b.ty.d, e); d = a.ty.d; break;
      case "*": d = U.mul(a.ty.d, b.ty.d); break;
      case "/": d = U.div(a.ty.d, b.ty.d); if (b.ids.every(i => g.estConst(i) && g.val(i) === 0)) this.err("E315", "Division par zéro.", e.droite); break;
      case "^": {
        if (!U.estZero(b.ty.d)) this.err("E416", "L'exposant d'une puissance n'a pas d'unité.", e.droite);
        if (U.estZero(a.ty.d)) d = ZERO;
        else if (g.estConst(b.ids[0]) && Number.isInteger(g.val(b.ids[0]))) d = U.puissance(a.ty.d, g.val(b.ids[0]));
        else this.err("E416", `On ne peut élever ${U.nom(a.ty.d)} qu'à une puissance entière connue.`, e);
        break;
      }
      default: if (!U.egal(a.ty.d, b.ty.d)) this.differenceDimensions("comparer", a.ty.d, b.ty.d, e); d = ZERO; bool = true;
    }
    if (!U.sensPhysique(d)) this.err("E416", `Cette opération donne ${U.nom(d)}, qui n'a pas de sens physique.`, e, { suggestion: "pour les dB, additionne des niveaux ; pour un rapport, utilise lin()" });
    const nom = op === "^" ? "pow" : OPS[op];
    const ids = this.parCanal(a, b, n, (x, y) => g.op(nom, [x, y], r));
    const ty = bool ? { b: "bool", d: ZERO, r, n } : num(d, r, n, a.ty.entier && b.ty.entier && op !== "/" && op !== "^" ? { entier: true } : undefined);
    return { ty, ids };
  }
  canaux(a, b, e) { const n = Math.max(a.ty.n, b.ty.n); if (a.ty.n > 1 && b.ty.n > 1 && a.ty.n !== b.ty.n) this.err("E512", "Les deux membres n'ont pas le même nombre de canaux.", e); return n; }
  parCanal(a, b, n, f) { return Array.from({ length: n }, (_, c) => f(a.ids[c % a.ids.length], b.ids[c % b.ids.length])); }

  condition(e, env, ctx) {
    const g = ctx.g;
    const c = this.ev(e.si, env, ctx), a = this.ev(e.alors, env, ctx), b = this.ev(e.sinon, env, ctx);
    if (c.ty.b !== "bool" || c.ty.n !== 1) this.err("E301", "La condition de `si` doit être un booléen.", e.si);
    if (a.ty.b !== b.ty.b || (a.ty.b === "num" && !U.egal(a.ty.d, b.ty.d))) this.err("E410", `Les deux branches de \`si\` doivent avoir le même type : ${nomType(a.ty)} et ${nomType(b.ty)}.`, e);
    if (a.ty.b !== "num" && a.ty.b !== "bool") return a;
    if (g.estConst(c.ids[0])) return g.val(c.ids[0]) !== 0 ? a : b;
    const n = this.canaux(a, b, e), r = rmax(c.ty.r, a.ty.r, b.ty.r);
    const ids = Array.from({ length: n }, (_, k) => g.op("sel", [c.ids[0], a.ids[k % a.ids.length], b.ids[k % b.ids.length]], r));
    return { ty: { ...a.ty, r, n }, ids };
  }

  acces(e, env, ctx) {
    if (e.objet.type === "Ident" && e.objet.nom === "voix" && !env.cherche("voix")) {
      if (e.membre !== "somme") this.err("E314", `\`voix\` n'a pas de membre \`${e.membre}\`.`, e, { suggestion: "voix.somme" });
      if (!ctx.module.aVoix) this.err("E313", "`voix.somme` n'existe que dans un module qui a un bloc `voix`.", e);
      ctx.module.sommeUtilisee = true;
      const nc = ctx.module.voixCanaux || 1;
      return { ty: num(ZERO, "a", nc), ids: Array.from({ length: nc }, (_, c) => ctx.g.add("voix_somme", [], "a", { idx: c })) };
    }
    const o = this.ev(e.objet, env, ctx);
    if (o.ty.b === "note" && o.champs[e.membre]) return o.champs[e.membre];
    if (o.ty.b === "note") this.err("E314", `Une note a pour membres hauteur, vitesse, porte et id, pas \`${e.membre}\`.`, e);
    this.err("E314", `${nomType(o.ty)} n'a pas de membre \`${e.membre}\`.`, e);
  }

  indice(e, env, ctx) {
    const o = this.ev(e.objet, env, ctx), p = this.ev(e.position, env, ctx);
    if (p.ty.b !== "num" || !ctx.g.estConst(p.ids[0]) || !Number.isInteger(ctx.g.val(p.ids[0]))) this.err("E319", "L'indice doit être un entier connu à la compilation.", e.position);
    const i = ctx.g.val(p.ids[0]);
    if (o.ty.b === "table") { if (i < 0 || i >= o.table.length) this.err("E319", `Indice ${i} hors de la table (${o.table.length} valeurs).`, e.position); return { ty: num(ZERO, "c"), ids: [ctx.g.cst(o.table[i])] }; }
    if (o.ty.b === "num" && o.ty.n > 1) { if (i < 0 || i >= o.ty.n) this.err("E512", `Ce faisceau n'a pas de canal ${i}.`, e.position); return { ty: { ...o.ty, n: 1 }, ids: [o.ids[i]] }; }
    this.err("E301", `${nomType(o.ty)} n'a pas d'indice.`, e);
  }

  flux(e, env, ctx) {
    const src = this.ev(e.source, env, ctx);
    return this.appelNomme(e.cible.nom, e.cible.arguments || [], src, e.cible, e.source, env, ctx);
  }

  appel(e, env, ctx) {
    if (e.fonction.type !== "Ident") this.err("E318", "On ne peut appeler qu'une fonction par son nom.", e.fonction);
    return this.appelNomme(e.fonction.nom, e.arguments, null, e, null, env, ctx);
  }

  // Évalue les arguments, les lie aux paramètres et appelle une fonction de l'utilisateur, un module ou une fonction mathématique.
  // Un module composite de la bibliothèque est une fonction SONORA : on l'analyse une fois, puis il s'inline comme une fonction de l'utilisateur.
  installerComposite(nom) {
    const d = new Diagnostics(COMPOSITES[nom]), ast = analyser(COMPOSITES[nom], d);
    if (!d.ok || !ast.declarations[0] || ast.declarations[0].type !== "Fonction") throw new Error(`module composite \`${nom}\` invalide : ${d.liste.map(x => x.message).join(" | ")}`);
    this.G.fonctions.set(nom, ast.declarations[0]);
  }

  appelNomme(nom, argsAst, src, e, srcAst, env, ctx) {
    const args = argsAst.map(a => ({ nom: a.nom, val: this.ev(a.valeur, env, ctx), ast: a.valeur }));
    if (!this.G.fonctions.has(nom) && COMPOSITES[nom]) this.installerComposite(nom);
    if (this.G.fonctions.has(nom)) return this.appelUtilisateur(this.G.fonctions.get(nom), args, src, e, srcAst, ctx);
    if (MODULES[nom]) return this.appelModule(nom, MODULES[nom], args, src, e, srcAst, ctx);
    if (MATHS[nom]) { if (src) args.unshift({ val: src, ast: srcAst }); return this.appelMath(nom, MATHS[nom], args, e, ctx); }
    const cand = [...Object.keys(MODULES), ...Object.keys(MATHS), ...this.G.fonctions.keys()];
    const s = proche(nom, cand);
    this.err("E201", `Fonction inconnue : \`${nom}\`.`, { debut: e.debut, fin: e.debut + nom.length }, s ? { suggestion: `vouliez-vous écrire ${s} ?` } : {});
  }

  // Associe valeurs et paramètres : le signal de gauche d'un flux va sur `entree`, ou sur le premier paramètre audio.
  lier(params, args, src, nom, e, srcAst) {
    const lie = new Map();
    if (src) {
      const cible = params.find(p => p.nom === "entree") || params.find(p => p.t === "audio" || (p.annotation && p.annotation.nom === "Audio")) || params[0];
      if (!cible) this.err("E304", `\`${nom}\` ne prend aucune entrée : on ne peut pas y envoyer un signal avec \`->\`.`, e);
      lie.set(cible.nom, { val: src, ast: srcAst || e });
    }
    let pos = 0;
    for (const a of args) {
      if (a.nom) {
        const p = params.find(x => x.nom === a.nom);
        if (!p) { const s = proche(a.nom, params.map(x => x.nom)); this.err("E303", `\`${nom}\` n'a pas de paramètre \`${a.nom}\`.`, a.ast, { suggestion: s ? `vouliez-vous écrire ${s} ?` : `les paramètres sont : ${params.map(x => x.nom).join(", ")}` }); }
        if (lie.has(a.nom)) this.err("E319", `Le paramètre \`${a.nom}\` est donné deux fois.`, a.ast);
        lie.set(a.nom, a);
      } else {
        while (pos < params.length && lie.has(params[pos].nom)) pos++;
        if (pos >= params.length) this.err("E304", `\`${nom}\` prend ${params.length} paramètre(s) au plus.`, a.ast);
        lie.set(params[pos].nom, a); pos++;
      }
    }
    return lie;
  }

  appelModule(nom, spec, args, src, e, srcAst, ctx) {
    const g = ctx.g;
    const lie = this.lier(spec.params, args, src, nom, e, srcAst);
    const ids = [], consts = {}; const meme = [];
    let dGen = null;
    for (const p of spec.params) {
      let a = lie.get(p.nom);
      if (!a) {
        if (p.defaut === undefined) this.err("E302", `\`${nom}\` a besoin du paramètre \`${p.nom}\`.`, e, { suggestion: `ajoute ${p.nom}: ...` });
        if (p.t === "Texte") { consts[p.nom] = p.defaut; continue; }
        a = { val: { ty: num(this.dimDe(p.t), "c"), ids: [g.cst(p.defaut)] }, ast: e };
      }
      const v = a.val, q = `l'argument \`${p.nom}\` de \`${nom}\``, w = a.ast;
      switch (p.t) {
        case "Texte": if (v.ty.b !== "texte") this.err("E301", `${q} attend un texte entre guillemets.`, w); consts[p.nom] = v.texte; continue;
        case "table": if (v.ty.b !== "table") this.err("E301", `${q} attend une table (déclarée avec \`table\`).`, w); consts[p.nom] = v.table; continue;
        case "Porte": if (v.ty.b !== "bool" || (!v.ty.porte && v.ty.r !== "c")) this.err("E301", `${q} attend une porte : la note tenue, par exemple \`note.porte\`.`, w); ids.push(v.ids[0]); continue;
        case "Entier": if (v.ty.b !== "num" || !U.estZero(v.ty.d) || !g.estConst(v.ids[0])) this.err("E306", `${q} doit être un nombre entier connu à la compilation.`, w); consts[p.nom] = g.val(v.ids[0]); continue;
        case "num": if (v.ty.b !== "num") this.err("E301", `${q} attend un nombre.`, w); if (dGen && !U.egal(dGen, v.ty.d)) this.err("E410", `${q} n'a pas la même unité que le paramètre précédent.`, w); dGen = v.ty.d; break;
        default: {
          if (v.ty.b !== "num") this.err("E301", `${q} attend ${U.nom(this.dimDe(p.t))} mais reçoit ${nomType(v.ty)}.`, w);
          if (!U.egal(v.ty.d, this.dimDe(p.t))) this.err("E301", `${q} attend ${p.t === "audio" || p.t === "Ratio" ? "une valeur sans unité" : U.nom(this.dimDe(p.t))} mais reçoit ${U.nom(v.ty.d)}.`, w);
        }
      }
      if (v.ty.n > 1) this.err("E512", `${q} attend un seul canal.`, w);
      const rm = p.rmax || "a";
      if (RANG[v.ty.r] > RANG[rm]) this.err("E530", `${q} doit être ${ADJ[rm]}, mais reçoit ${ADJ[v.ty.r]}.`, w, v.ty.r === "a" && rm === "k" ? { suggestion: "utilise niveau(x) pour mesurer un signal audio" } : {});
      ids.push(v.ids[0]);
    }
    const ret = spec.ret;
    const d = spec.generique ? dGen : ret.d;
    const r = ret.r === "k" ? rmax("k", ...ids.map(i => g.noeuds[i].r === "c" ? "c" : "c")) : ret.r;
    const prim = g.add("prim", ids, r, { nom, consts, retard: !!spec.retard, srdep: ids.some(i => g.noeuds[i].srdep) || undefined, debut: e.debut, fin: e.fin, impl: spec.impl, phase: spec.phase });
    if (ret.n === 1) return { ty: num(d, r, 1), ids: [prim] };
    return { ty: num(d, r, ret.n), ids: Array.from({ length: ret.n }, (_, i) => g.add("canal", [prim], r, { idx: i })) };
  }
  dimDe(t) { return t === "Hz" ? U.D_FREQ : t === "s" ? U.D_TEMPS : t === "Phase" ? U.D_PHASE : t === "dB" ? U.D_NIVEAU : ZERO; }

  appelMath(nom, spec, args, e, ctx) {
    const g = ctx.g;
    if (args.some(a => a.nom)) this.err("E303", `\`${nom}\` s'écrit sans noms d'arguments.`, e);
    if (args.length !== spec.arite) this.err(args.length < spec.arite ? "E302" : "E304", `\`${nom}\` prend ${spec.arite} argument(s), ${args.length} donné(s).`, e);
    for (const a of args) if (a.val.ty.b !== "num") this.err("E301", `\`${nom}\` attend des nombres.`, a.ast);
    const vs = args.map(a => a.val);
    const n = Math.max(...vs.map(v => v.ty.n)), r = rmax(...vs.map(v => v.ty.r));
    const fn = spec.alias || nom;
    const ch = k => vs.map(v => v.ids[k % v.ids.length]);
    let d, ids;
    if (spec.transpose) {
      if (!U.egal(vs[0].ty.d, U.D_FREQ)) this.err("E301", "`transpose` attend une fréquence puis un intervalle.", args[0].ast);
      if (!U.egal(vs[1].ty.d, U.D_INTERVALLE)) this.err("E301", "`transpose` attend un intervalle (7 dt, 50 ct) en second argument.", args[1].ast);
      d = U.D_FREQ;
    } else if (spec.meme) {
      d = vs[0].ty.d; vs.forEach((v, i) => { if (!U.egal(v.ty.d, d)) this.err("E410", `Les arguments de \`${nom}\` doivent avoir la même unité : ${U.nom(d)} et ${U.nom(v.ty.d)}.`, args[i].ast); });
    } else if (spec.mixte) {
      if (!U.egal(vs[0].ty.d, vs[1].ty.d)) this.err("E410", "Les deux premiers arguments de `mix` ont la même unité.", args[1].ast);
      if (!U.estZero(vs[2].ty.d)) this.err("E301", "Le troisième argument de `mix` (la proportion) n'a pas d'unité.", args[2].ast);
      d = vs[0].ty.d;
    } else if (spec.trig) {
      const dd = vs[0].ty.d;
      if (!U.estZero(dd) && !U.egal(dd, U.D_PHASE)) this.err("E301", `\`${nom}\` attend un angle (tour, rad, deg) ou un nombre en radians, pas ${U.nom(dd)}.`, args[0].ast);
      d = ZERO;
    } else {
      spec.entree.forEach((di, i) => { if (di && !U.egal(vs[i].ty.d, di)) this.err("E301", `\`${nom}\` attend ${U.nom(di)} mais reçoit ${U.nom(vs[i].ty.d)}.`, args[i].ast); });
      d = spec.sortie || vs[0].ty.d;
    }
    ids = Array.from({ length: n }, (_, k) => {
      let a = ch(k);
      if (spec.trig && U.egal(vs[0].ty.d, U.D_PHASE)) a = [g.op("mul", [a[0], g.cst(2 * Math.PI)], r)];
      return g.op("fn", a, r, fn);
    });
    return { ty: num(d, r, n), ids };
  }

  appelUtilisateur(f, args, src, e, srcAst, ctx) {
    if (this.pile.includes(f.nom)) this.err("E316", `La fonction \`${f.nom}\` s'appelle elle-même : la récursion de fonction n'existe pas.`, e, { suggestion: "pour une rétroaction, utilise `soit rec` avec un retard" });
    const params = f.params.map(p => ({ nom: p.nom, annotation: p.annotation, defaut: p.defaut, t: p.annotation.nom === "Audio" ? "audio" : p.annotation.nom }));
    const lie = this.lier(params, args, src, f.nom, e, srcAst);
    const env = new Env(this.G.env);
    this.pile.push(f.nom);
    try {
      for (const p of f.params) {
        let a = lie.get(p.nom), v;
        const ty = resoudreType(p.annotation, this.diags);
        if (!a) {
          if (!p.defaut) this.err("E302", `\`${f.nom}\` a besoin du paramètre \`${p.nom}\`.`, e);
          v = this.ev(p.defaut, this.G.env, ctx);
        } else v = a.val;
        v = this.conforme(v, ty, a ? a.ast : e, `l'argument \`${p.nom}\` de \`${f.nom}\``);
        env.vars.set(p.nom, { val: v, used: true });
      }
      for (const i of f.corps) this.instruction(i, env, ctx, null);
      let r = this.ev(f.resultat, env, ctx);
      if (f.retour) r = this.conforme(r, resoudreType(f.retour, this.diags), f.resultat, `le résultat de \`${f.nom}\``);
      return r;
    } finally { this.pile.pop(); }
  }

  // ---------- instructions et modules ----------
  instruction(i, env, ctx, suivi) {
    const g = ctx.g;
    this.verifierNomLibre(i.nom, i.debutNom, i.finNom, env);
    const ty = i.annotation ? resoudreType(i.annotation, this.diags) : null;
    if (!i.rec) {
      let v = this.ev(i.valeur, env, ctx);
      if (ty) v = this.conforme(v, ty, i.valeur, `\`${i.nom}\``);
      const b = { val: v, used: false, debut: i.debutNom, fin: i.finNom, nom: i.nom };
      env.vars.set(i.nom, b); if (suivi) suivi.push(b);
      return;
    }
    const ass = ty || num(ZERO, "a");
    if (ass.b !== "num" || ass.n !== 1) this.err("E301", "Un signal récursif est un signal à un canal.", i);
    const ref = g.add("ref", [], "a", { nom: i.nom, debut: i.debutNom, fin: i.finNom });
    const b = { val: { ty: num(ass.d, "a", 1), ids: [ref] }, used: false, debut: i.debutNom, fin: i.finNom, nom: i.nom };
    env.vars.set(i.nom, b);
    const v = this.ev(i.valeur, env, ctx);
    if (v.ty.b !== "num" || v.ty.n !== 1 || !U.egal(v.ty.d, ass.d)) this.err("E301", `Le signal récursif \`${i.nom}\` doit être ${U.nom(ass.d)} à un canal.`, i.valeur);
    if (!b.used) this.err("E611", `\`soit rec ${i.nom}\` ne se référence jamais lui-même : enlève \`rec\`.`, { debut: i.debutNom, fin: i.finNom });
    g.noeuds[ref].args = [v.ids[0]];
    b.used = false; // les usages ultérieurs comptent à part
    if (suivi) suivi.push(b);
  }

  module(m) {
    const g = new Graphe(); g.accord = this.G.accord;
    const env = new Env(this.G.env);
    const info = { nom: m.nom, genre: m.genre, doc: m.doc, reglages: [], entrees: [], automations: [], sortie: null, voix: null, debut: m.debut, fin: m.fin };
    const mod = { aVoix: false, sommeUtilisee: false };
    const ctx = { g, env, module: mod };
    const soits = [];
    // paramètres de module : des constantes avec valeur par défaut
    for (const p of m.params) {
      try {
        if (!p.defaut) this.err("E302", `Le paramètre \`${p.nom}\` du module a besoin d'une valeur par défaut.`, p);
        const ty = resoudreType(p.annotation, this.diags);
        const v = this.conforme(this.ev(p.defaut, env, ctx), ty, p.defaut, `le paramètre \`${p.nom}\``);
        env.vars.set(p.nom, { val: v, used: true });
      } catch (e) { if (!(e instanceof Abandon)) throw e; }
    }
    const sorties = []; let aPoly = null;
    const aVoix = m.membres.some(x => x.type === "VoixBloc");
    mod.aVoix = aVoix;
    for (const x of m.membres) {
      try {
        switch (x.type) {
          case "Reglage": this.reglage(x, env, ctx, info); break;
          case "Entree": this.entree(x, env, ctx, info); break;
          case "Instruction": this.instruction(x, env, ctx, soits); break;
          case "Polyphonie": aPoly = x; if (x.nbVoix < 1 || x.nbVoix > 32) this.err("E701", "Le nombre de voix va de 1 à 32.", x); break;
          case "VoixBloc": this.voixBloc(x, env, ctx, info, soits); break;
          case "Automation": this.automation(x, env, ctx, info); break;
          case "Sortie": {
            const slot = { x, v: null }; sorties.push(slot); // compté avant l'évaluation : une expression fausse ne doit pas faire croire à une sortie absente
            const v = this.ev(x.valeur, env, ctx);
            if (v.ty.b !== "num" || !U.estZero(v.ty.d)) this.err("E301", `La sortie doit être un signal sans unité, pas ${nomType(v.ty)}.`, x.valeur, v.ty.b === "num" ? { suggestion: "multiplie par un rapport (par exemple un réglage de volume), pas par une durée ou une fréquence" } : {});
            if (v.ty.n > 2) this.err("E512", "Deux canaux au plus.", x.valeur);
            slot.v = v; break;
          }
        }
      } catch (e) { if (!(e instanceof Abandon)) throw e; }
    }
    // cohérence du module
    if (sorties.length === 0) this.diags.erreur("E203", `Le module \`${m.nom}\` n'a pas de \`sortie\`.`, m.debutNom, m.finNom, { suggestion: "ajoute une ligne : sortie = ..." });
    if (sorties.length > 1) this.diags.erreur("E204", `Le module \`${m.nom}\` a plusieurs \`sortie\`.`, sorties[1].x.debut, sorties[1].x.fin);
    if (m.genre === "effet" && !info.entrees.some(en => en.genre === "audio")) this.diags.erreur("E205", `L'effet \`${m.nom}\` a besoin d'au moins une entrée audio.`, m.debutNom, m.finNom, { suggestion: "ajoute : entree source : Audio" });
    if (aVoix && !aPoly) this.diags.erreur("E311", "Un bloc `voix` demande une ligne `polyphonie N voix`.", m.debutNom, m.finNom);
    if (aPoly && !aVoix) this.diags.erreur("E310", "`polyphonie` demande un bloc `voix (n : Note) { ... }`.", aPoly.debut, aPoly.fin);
    if (aVoix && !info.entrees.some(en => en.genre === "evenement")) this.diags.erreur("E312", "Un instrument à voix a besoin d'une entrée `Evenement<Note>`.", m.debutNom, m.finNom, { suggestion: "ajoute : entree notes : Evenement<Note>" });
    if (aPoly && info.voix) { info.voix.nbVoix = aPoly.nbVoix; info.voix.vol = aPoly.vol || "plus_ancienne"; }
    if (sorties.length && sorties[0].v) info.sortie = sorties[0].v.ids;
    // boucles sans retard
    const racines = [...(info.sortie || []), ...(info.voix ? info.voix.sortie : [])];
    const pris = trouverCycles(g, racines);
    for (const id of pris) { const n = g.noeuds[id]; this.diags.erreur("E610", `Boucle sans retard : \`${n.nom}\` dépend de lui-même immédiatement.`, n.debut, n.fin, { suggestion: "fais passer la rétroaction par retarde(...) ou z1(...)" }); }
    for (const b of soits) if (!b.used) this.diags.avertissement("W701", `\`${b.nom}\` est défini mais jamais utilisé.`, b.debut, b.fin);
    info.graphe = g; info.accord = this.G.accord;
    return info;
  }

  reglage(m, env, ctx, info) {
    const g = ctx.g;
    this.verifierNomLibre(m.nom, m.debutNom, m.finNom, env);
    const ty = resoudreType(m.annotation, this.diags);
    if (!ty) throw new Abandon("type");
    if (ty.b !== "num" && !(ty.b === "bool" && !ty.porte)) this.err("E305", `Un réglage est un nombre, une quantité ou un booléen, pas ${nomType(ty)}.`, m.annotation);
    const cst = (x, quoi, attendu) => {
      const v = this.ev(x, env, ctx);
      if ((v.ty.b !== "num" && v.ty.b !== "bool") || v.ty.n !== 1 || !g.estConst(v.ids[0]) && !g.noeuds[v.ids[0]].srdep) this.err("E306", `${quoi} doit être connu à la compilation.`, x);
      if (attendu && v.ty.b === "num" && !U.egal(v.ty.d, attendu)) this.err("E301", `${quoi} doit être ${U.nom(attendu)} mais est ${U.nom(v.ty.d)}.`, x);
      return valeurNominale(g, v.ids[0]);
    };
    let min = null, max = null, defaut = null;
    if (ty.b === "num") {
      if (m.intervalle) { min = cst(m.intervalle[0], "le début de l'intervalle", ty.d); max = cst(m.intervalle[1], "la fin de l'intervalle", ty.d); if (!(min < max)) this.err("E308", "Le début de l'intervalle doit être inférieur à la fin.", m.intervalle[0]); }
      if (m.defaut) defaut = cst(m.defaut, "la valeur par défaut", ty.d);
      else if (min !== null) defaut = min;
      else this.err("E307", `Le réglage \`${m.nom}\` n'a ni valeur par défaut ni intervalle.`, m, { suggestion: `ajoute : = valeur` });
      if (min !== null && (defaut < min - 1e-12 || defaut > max + 1e-12)) this.err("E414", `La valeur par défaut est hors de l'intervalle du réglage \`${m.nom}\`.`, m.defaut || m, { suggestion: `choisis une valeur entre ${min} et ${max}` });
      if (m.courbe && m.courbe !== "lin" && (min === null || min <= 0)) this.err("E308", `La courbe ${m.courbe} demande un intervalle strictement positif.`, m);
    } else defaut = m.defaut ? cst(m.defaut, "la valeur par défaut", ZERO) : 0;
    // un réglage discret (entier, choix, booléen) ne se lisse pas : il doit valoir exactement 0, 1, 2... pour que les comparaisons du programme fonctionnent
    const discret = ty.b === "bool" || ty.entier || !!m.choix;
    const liss = m.lissage ? cst(m.lissage, "le lissage", U.D_TEMPS) : discret ? 0 : 0.01;
    const pas = m.pas ? cst(m.pas, "le pas", ty.d) : null;
    const courbe = m.courbe || (ty.b === "num" && U.egal(ty.d, U.D_FREQ) && min !== null && min > 0 ? "log" : "lin");
    const idx = info.reglages.length;
    const id = g.add("param", [], "k", { idx, lissage: liss });
    info.reglages.push({ nom: m.nom, etiquette: m.etiquette || m.nom, unite: ty.b === "bool" ? "" : this.uniteAffichee(ty.d), dimension: ty.b === "bool" ? "booleen" : U.nom(ty.d), defaut, min, max, courbe, pas, lissage: liss, choix: m.choix || null, doc: m.doc || null, booleen: ty.b === "bool" });
    env.vars.set(m.nom, { val: { ty: ty.b === "bool" ? { b: "bool", d: ZERO, r: "k", n: 1 } : num(ty.d, "k", 1, ty.entier ? { entier: true } : undefined), ids: [id] }, used: true });
  }
  uniteAffichee(d) { return U.egal(d, U.D_FREQ) ? "Hz" : U.egal(d, U.D_TEMPS) ? "s" : U.egal(d, U.D_NIVEAU) ? "dB" : U.egal(d, U.D_PHASE) ? "tour" : U.egal(d, U.D_INTERVALLE) ? "dt" : ""; }

  entree(x, env, ctx, info) {
    this.verifierNomLibre(x.nom, x.debutNom, x.finNom, env);
    const ty = resoudreType(x.annotation, this.diags);
    if (!ty) throw new Abandon("type");
    const g = ctx.g;
    if (ty.b === "evt") { info.entrees.push({ nom: x.nom, genre: "evenement" }); env.vars.set(x.nom, { val: { ty }, used: true }); return; }
    if (ty.b !== "num" || ty.r !== "a" || !U.estZero(ty.d)) this.err("E305", "Une entrée est un signal `Audio` ou des événements `Evenement<Note>`.", x.annotation);
    const ids = Array.from({ length: ty.n }, (_, c) => g.add("entree", [], "a", { idx: info.entrees.filter(e => e.genre === "audio").reduce((s, e) => s + e.canaux, 0) + c }));
    info.entrees.push({ nom: x.nom, genre: "audio", canaux: ty.n });
    env.vars.set(x.nom, { val: { ty: num(ZERO, "a", ty.n), ids }, used: true });
  }

  voixBloc(x, env, ctx, info, soits) {
    const g = ctx.g;
    const e2 = new Env(env);
    const champ = (nom, d, extra) => ({ ty: extra ? { ...extra, d, r: "k", n: 1 } : num(d, "k"), ids: [g.add("note_champ", [], "k", { nom })] });
    e2.vars.set(x.param, { val: { ty: { b: "note" }, champs: {
      hauteur: champ("hauteur", U.D_FREQ), vitesse: champ("vitesse", ZERO), id: champ("id", ZERO),
      porte: champ("porte", ZERO, { b: "bool", porte: true }),
    } }, used: true });
    for (const i of x.instructions) this.instruction(i, e2, ctx, soits);
    if (!x.sortie) this.err("E203", "Le bloc `voix` n'a pas de `sortie`.", x);
    const v = this.ev(x.sortie.valeur, e2, ctx);
    if (v.ty.b !== "num" || !U.estZero(v.ty.d) || v.ty.n > 2) this.err("E301", "La sortie d'une voix est un signal sans unité.", x.sortie.valeur);
    info.voix = { sortie: v.ids, canaux: v.ty.n };
    ctx.module.voixCanaux = v.ty.n;
  }

  automation(x, env, ctx, info) {
    const g = ctx.g;
    const r = info.reglages.find(q => q.nom === x.cible);
    if (!r) { const s = proche(x.cible, info.reglages.map(q => q.nom)); this.err("E201", `Le réglage \`${x.cible}\` n'existe pas : une automation pilote un réglage déclaré avant elle.`, { debut: x.debutCible, fin: x.finCible }, s ? { suggestion: `vouliez-vous écrire ${s} ?` } : {}); }
    if (r.booleen) this.err("E305", "Une automation pilote un réglage numérique.", x);
    const dimR = r.dimension;
    const pts = []; let prec = -Infinity;
    for (const p of x.points) {
      const t = this.ev(p.temps, env, ctx), v = this.ev(p.valeur, env, ctx);
      if (t.ty.b !== "num" || !U.egal(t.ty.d, U.D_TEMPS) || !g.estConst(t.ids[0]) && !g.noeuds[t.ids[0]].srdep) this.err("E301", "Le temps d'un point est une durée connue (0 s, 2 s...).", p.temps);
      if (v.ty.b !== "num" || U.nom(v.ty.d) !== dimR) this.err("E301", `La valeur d'un point doit avoir l'unité du réglage \`${r.nom}\` (${dimR}).`, p.valeur);
      const tv = valeurNominale(g, t.ids[0]), vv = valeurNominale(g, v.ids[0]);
      if (tv <= prec) this.err("E309", "Les temps d'une automation doivent croître.", p.temps);
      prec = tv;
      if (r.min !== null && (vv < r.min - 1e-12 || vv > r.max + 1e-12)) this.err("E414", `La valeur ${vv} sort de l'intervalle du réglage \`${r.nom}\`.`, p.valeur);
      if (p.courbe && !["lin", "log", "exp"].includes(p.courbe)) this.err("E101", "La courbe doit être lin, log ou exp.", p.valeur);
      pts.push({ temps: tv, valeur: vv, courbe: p.courbe || "lin" });
    }
    if (pts.length < 2) this.err("E309", "Une automation a au moins deux points.", x);
    info.automations.push({ nom: x.nom, cible: x.cible, points: pts, boucle: x.boucle });
  }
}
