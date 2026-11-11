// Analyse syntaxique : descente récursive pour les déclarations, précédence pour les expressions.
// Le premier défaut d'une déclaration est signalé, puis l'analyseur se resynchronise sur la déclaration ou le membre suivant.
import { lexer } from "./lexeur.js?v=6185710770";
import { noeud } from "./ast.js?v=6185710770";

class ErreurSyntaxe extends Error {}

const DECLS = new Set(["utilise", "const", "fonction", "instrument", "effet", "table"]);
const MEMBRES = new Set(["reglage", "entree", "polyphonie", "voix", "automation", "soit", "sortie"]);
const COMPARAISONS = new Set(["==", "!=", "<", "<=", ">", ">="]);

export function analyser(source, diags) {
  const jetons = lexer(source, diags);
  let p = 0;
  let docs = [];

  const cur = () => jetons[p];
  const suiv = (k = 1) => jetons[Math.min(p + k, jetons.length - 1)];
  const estOp = (v, j = cur()) => j.t === "op" && j.v === v;
  const estMot = (v, j = cur()) => j.t === "mot" && j.v === v;
  const avance = () => jetons[p++];
  const echec = (code, msg, j = cur(), extra) => { diags.erreur(code, msg, j.debut, Math.max(j.fin, j.debut + 1), extra); throw new ErreurSyntaxe(msg); };
  const decrit = j => j.t === "fin" ? "la fin du fichier" : j.t === "texte" ? "un texte" : `\`${j.t === "quantite" ? source.slice(j.debut, j.fin) : j.v}\``;
  const attendOp = v => { if (!estOp(v)) echec("E101", `On attendait \`${v}\` mais on a trouvé ${decrit(cur())}.`); return avance(); };
  const attendMot = v => { if (!estMot(v)) echec("E101", `On attendait le mot \`${v}\` mais on a trouvé ${decrit(cur())}.`); return avance(); };
  const attendNom = () => {
    const j = cur();
    if (j.t !== "ident" && j.t !== "mot") echec("E101", `On attendait un nom mais on a trouvé ${decrit(j)}.`);
    return avance();
  };
  const prendDocs = () => { const d = docs.join("\n"); docs = []; return d || undefined; };
  const ignoreDocs = () => { while (cur().t === "doc") docs.push(avance().v); };

  // ---- expressions ----
  function expr() { return connexion(); }

  function connexion() {
    let g = condition();
    while (estOp("->")) {
      avance();
      const c = appelPartiel();
      g = noeud("Flux", g.debut, c.fin, { source: g, cible: c });
    }
    return g;
  }

  function appelPartiel() {
    const j = attendNom();
    let args = null, fin = j.fin;
    if (estOp("(")) { args = argumentsAppel(); fin = jetons[p - 1].fin; }
    return noeud("AppelPartiel", j.debut, fin, { nom: j.v, arguments: args });
  }

  function condition() {
    if (estMot("si")) {
      const d = avance();
      const c = expr(); attendMot("alors");
      const a = expr(); attendMot("sinon");
      const b = expr();
      return noeud("Condition", d.debut, b.fin, { si: c, alors: a, sinon: b });
    }
    return binaire(0);
  }

  const NIVEAUX = [["ou"], ["et"], ["cmp"], ["+", "-"], ["*", "/", "%"]];
  function binaire(niv) {
    if (niv === NIVEAUX.length) return unaire();
    let g = binaire(niv + 1);
    const est = j => niv === 0 ? estMot("ou", j) : niv === 1 ? estMot("et", j) : niv === 2 ? (j.t === "op" && COMPARAISONS.has(j.v)) : (j.t === "op" && NIVEAUX[niv].includes(j.v));
    while (est(cur())) {
      const o = avance();
      const d = binaire(niv + 1);
      g = noeud("Binaire", g.debut, d.fin, { op: o.v, gauche: g, droite: d });
      if (niv === 2) { // les comparaisons ne s'enchaînent pas
        if (cur().t === "op" && COMPARAISONS.has(cur().v)) echec("E101", "Les comparaisons ne s'enchaînent pas : `a < b < c` n'est pas permis.", cur(), { suggestion: "écris a < b et b < c" });
        break;
      }
    }
    return g;
  }

  function unaire() {
    if (estOp("-") || estMot("non")) {
      const o = avance();
      const x = unaire();
      return noeud("Unaire", o.debut, x.fin, { op: o.v, operande: x });
    }
    return puissance();
  }
  function puissance() {
    const b = postfixe();
    if (estOp("^")) { avance(); const e = unaire(); return noeud("Binaire", b.debut, e.fin, { op: "^", gauche: b, droite: e }); }
    return b;
  }

  function argumentsAppel() {
    attendOp("(");
    const args = [];
    while (!estOp(")")) {
      const j = cur();
      let nom;
      if ((j.t === "ident" || j.t === "mot") && estOp(":", suiv())) { nom = avance().v; avance(); }
      const v = expr();
      args.push(noeud("Argument", j.debut, v.fin, { nom, valeur: v }));
      if (estOp(",")) avance(); else if (!estOp(")")) echec("E101", `On attendait \`,\` ou \`)\` mais on a trouvé ${decrit(cur())}.`);
    }
    avance();
    return args;
  }

  function postfixe() {
    let x = primaire();
    for (;;) {
      if (estOp("(")) { const args = argumentsAppel(); x = noeud("Appel", x.debut, jetons[p - 1].fin, { fonction: x, arguments: args }); }
      else if (estOp(".") && (suiv().t === "ident" || suiv().t === "mot")) { avance(); const m = avance(); x = noeud("Acces", x.debut, m.fin, { objet: x, membre: m.v }); }
      else if (estOp("[")) { avance(); const i = expr(); const f = attendOp("]"); x = noeud("Indice", x.debut, f.fin, { objet: x, position: i }); }
      else return x;
    }
  }

  function primaire() {
    const j = cur();
    switch (j.t) {
      case "nombre": avance(); return noeud("Nombre", j.debut, j.fin, { valeur: j.v, entier: !!j.entier });
      case "quantite": avance(); return noeud("Quantite", j.debut, j.fin, { valeur: j.v, unite: j.unite });
      case "note": avance(); return noeud("NoteLitterale", j.debut, j.fin, { nom: j.v });
      case "texte": avance(); return noeud("TexteLit", j.debut, j.fin, { valeur: j.v });
      case "ident": avance(); return noeud("Ident", j.debut, j.fin, { nom: j.v });
      case "mot":
        if (j.v === "vrai" || j.v === "faux") { avance(); return noeud("BooleenLit", j.debut, j.fin, { valeur: j.v === "vrai" }); }
        if (j.v === "voix") { avance(); return noeud("Ident", j.debut, j.fin, { nom: "voix" }); }
        break;
      case "op":
        if (j.v === "(") { avance(); const e = expr(); attendOp(")"); return e; }
        if (j.v === "[") {
          avance(); const el = [];
          while (!estOp("]")) { el.push(expr()); if (estOp(",")) avance(); else if (!estOp("]")) echec("E101", `On attendait \`,\` ou \`]\` mais on a trouvé ${decrit(cur())}.`); }
          const f = avance(); return noeud("Faisceau", j.debut, f.fin, { elements: el });
        }
        break;
    }
    echec("E101", `On attendait une valeur mais on a trouvé ${decrit(j)}.`);
  }

  // ---- types ----
  function type() {
    const j = attendNom();
    let fin = j.fin; const args = [];
    if (estOp("<")) { avance(); do { args.push(type()); if (estOp(",")) avance(); else break; } while (true); fin = attendOp(">").fin; }
    let canaux;
    if (estOp("[") && suiv().t === "nombre") { avance(); canaux = avance().v; fin = attendOp("]").fin; }
    return noeud("Type", j.debut, fin, { nom: j.v, arguments: args, canaux });
  }
  function params() {
    const ps = [];
    while (!estOp(")")) {
      const n = attendNom(); attendOp(":"); const t = type();
      let defaut; if (estOp("=")) { avance(); defaut = expr(); }
      ps.push(noeud("Param", n.debut, (defaut || t).fin, { nom: n.v, annotation: t, defaut }));
      if (estOp(",")) avance(); else if (!estOp(")")) echec("E101", `On attendait \`,\` ou \`)\` mais on a trouvé ${decrit(cur())}.`);
    }
    return ps;
  }

  // ---- membres et déclarations ----
  function instruction() {
    const d = attendMot("soit");
    const rec = estMot("rec") ? (avance(), true) : false;
    const n = attendNom();
    let annotation; if (estOp(":")) { avance(); annotation = type(); }
    attendOp("=");
    const v = expr();
    return noeud("Instruction", d.debut, v.fin, { nom: n.v, debutNom: n.debut, finNom: n.fin, rec, annotation, valeur: v });
  }
  function sortieDecl() {
    const d = attendMot("sortie"); attendOp("=");
    const v = expr();
    return noeud("Sortie", d.debut, v.fin, { valeur: v });
  }
  function reglage() {
    const d = attendMot("reglage"); const doc = prendDocs();
    const n = attendNom(); attendOp(":"); const t = type();
    const r = noeud("Reglage", d.debut, t.fin, { nom: n.v, debutNom: n.debut, finNom: n.fin, annotation: t, doc });
    if (estOp("=")) { avance(); r.defaut = expr(); r.fin = r.defaut.fin; }
    if (estMot("dans")) { avance(); const lo = expr(); attendOp(".."); const hi = expr(); r.intervalle = [lo, hi]; r.fin = hi.fin; }
    for (;;) {
      if (estMot("courbe")) { avance(); const c = attendNom(); if (!["lin", "log", "exp"].includes(c.v)) echec("E101", `La courbe doit être lin, log ou exp, pas ${decrit(c)}.`, c); r.courbe = c.v; r.fin = c.fin; }
      else if (estMot("lissage")) { avance(); r.lissage = expr(); r.fin = r.lissage.fin; }
      else if (estMot("etiquette")) { avance(); const t2 = cur(); if (t2.t !== "texte") echec("E101", "On attendait un texte entre guillemets après `etiquette`."); avance(); r.etiquette = t2.v; r.fin = t2.fin; }
      else if (estMot("pas")) { avance(); r.pas = expr(); r.fin = r.pas.fin; }
      else if (estMot("choix")) {
        avance(); attendOp("["); r.choix = [];
        while (!estOp("]")) { const t2 = cur(); if (t2.t !== "texte") echec("E101", "On attendait un texte entre guillemets."); avance(); r.choix.push(t2.v); if (estOp(",")) avance(); else break; }
        r.fin = attendOp("]").fin;
      } else break;
    }
    return r;
  }
  function entree() {
    const d = attendMot("entree"); const n = attendNom(); attendOp(":"); const t = type();
    return noeud("Entree", d.debut, t.fin, { nom: n.v, debutNom: n.debut, finNom: n.fin, annotation: t });
  }
  function polyphonie() {
    const d = attendMot("polyphonie"); const nb = cur();
    if (nb.t !== "nombre" || !nb.entier) echec("E101", "On attendait le nombre de voix, un entier.");
    avance(); attendMot("voix");
    let vol, fin = nb.fin;
    if (estMot("vol") || (cur().t === "ident" && cur().v === "vol")) {
      avance(); attendOp("("); const m = attendNom();
      if (!["plus_ancienne", "plus_basse", "aucune"].includes(m.v)) echec("E101", "La règle de vol doit être plus_ancienne, plus_basse ou aucune.", m);
      vol = m.v; fin = attendOp(")").fin;
    }
    return noeud("Polyphonie", d.debut, fin, { nbVoix: nb.v, vol });
  }
  function voixBloc() {
    const d = attendMot("voix"); attendOp("(");
    const n = attendNom(); attendOp(":"); const t = type(); attendOp(")"); attendOp("{");
    const ins = []; let sortie;
    while (!estOp("}")) {
      ignoreDocs();
      if (estMot("soit")) ins.push(instruction());
      else if (estMot("sortie")) sortie = sortieDecl();
      else echec("E101", `Dans un bloc voix, on attendait \`soit\` ou \`sortie\` mais on a trouvé ${decrit(cur())}.`);
    }
    const f = avance();
    return noeud("VoixBloc", d.debut, f.fin, { param: n.v, annotation: t, instructions: ins, sortie });
  }
  function automation() {
    const d = attendMot("automation"); const n = attendNom(); attendMot("sur"); const c = attendNom(); attendOp("{");
    const points = []; let boucle = false;
    while (!estOp("}")) {
      if (estMot("boucle")) { avance(); boucle = true; continue; }
      const t = expr(); attendOp(":"); const v = expr();
      let courbe; if (estMot("courbe")) { avance(); courbe = attendNom().v; }
      points.push(noeud("Point", t.debut, v.fin, { temps: t, valeur: v, courbe }));
    }
    const f = avance();
    return noeud("Automation", d.debut, f.fin, { nom: n.v, cible: c.v, debutCible: c.debut, finCible: c.fin, points, boucle });
  }

  function membre() {
    ignoreDocs();
    const j = cur();
    if (j.t === "mot") {
      switch (j.v) {
        case "reglage": return reglage();
        case "entree": return entree();
        case "polyphonie": return polyphonie();
        case "voix": return voixBloc();
        case "automation": return automation();
        case "soit": return instruction();
        case "sortie": return sortieDecl();
      }
    }
    echec("E101", `Dans un module, on attendait \`reglage\`, \`entree\`, \`soit\`, \`voix\` ou \`sortie\` mais on a trouvé ${decrit(j)}.`);
  }

  function module() {
    const g = avance(); const doc = prendDocs();
    const n = attendNom();
    let ps = []; if (estOp("(")) { avance(); ps = params(); attendOp(")"); }
    const ouv = attendOp("{");
    const membres = [];
    for (;;) {
      ignoreDocs();
      if (estOp("}")) break;
      if (cur().t === "fin") { diags.erreur("E102", "Accolade jamais fermée : il manque `}` à la fin du module.", ouv.debut, ouv.fin, { suggestion: "ajoute } après le dernier membre" }); break; }
      try { membres.push(membre()); }
      catch (e) {
        if (!(e instanceof ErreurSyntaxe)) throw e;
        resynchroniser(true);
      }
    }
    const f = estOp("}") ? avance() : cur();
    return noeud("Module", g.debut, f.fin, { genre: g.v, nom: n.v, debutNom: n.debut, finNom: n.fin, params: ps, membres, doc });
  }

  function fonction() {
    const d = avance(); const doc = prendDocs();
    const n = attendNom(); attendOp("("); const ps = params(); attendOp(")");
    let retour; if (estOp(":")) { avance(); retour = type(); }
    attendOp("{");
    const ins = [];
    while (estMot("soit")) ins.push(instruction());
    attendMot("rend"); const r = expr();
    const f = attendOp("}");
    return noeud("Fonction", d.debut, f.fin, { nom: n.v, debutNom: n.debut, finNom: n.fin, params: ps, retour, corps: ins, resultat: r, doc });
  }

  function declaration() {
    ignoreDocs();
    const j = cur();
    if (j.t !== "mot" || !DECLS.has(j.v)) echec("E103", `On attendait une déclaration (\`instrument\`, \`effet\`, \`fonction\`, \`const\`, \`table\`, \`utilise\`) mais on a trouvé ${decrit(j)}.`);
    switch (j.v) {
      case "utilise": { avance(); const t = cur(); if (t.t !== "texte") echec("E101", "On attendait le nom de la bibliothèque entre guillemets."); avance(); let alias; if (estMot("comme")) { avance(); alias = attendNom().v; } return noeud("Utilise", j.debut, jetons[p - 1].fin, { chemin: t.v, alias }); }
      case "const": { avance(); const n = attendNom(); let a; if (estOp(":")) { avance(); a = type(); } attendOp("="); const v = expr(); return noeud("Constante", j.debut, v.fin, { nom: n.v, debutNom: n.debut, finNom: n.fin, annotation: a, valeur: v }); }
      case "table": { avance(); const n = attendNom(); attendOp("="); attendOp("["); const vs = []; while (!estOp("]")) { vs.push(expr()); if (estOp(",")) avance(); else break; } const f = attendOp("]"); return noeud("Table", j.debut, f.fin, { nom: n.v, debutNom: n.debut, finNom: n.fin, valeurs: vs }); }
      case "fonction": return fonction();
      default: return module();
    }
  }

  // Après une erreur : on saute jusqu'au prochain repère sûr.
  function resynchroniser(dansModule) {
    let prof = 0;
    while (cur().t !== "fin") {
      const j = cur();
      if (j.t === "op" && (j.v === "{" || j.v === "(" || j.v === "[")) prof++;
      else if (j.t === "op" && (j.v === "}" || j.v === ")" || j.v === "]")) { if (prof === 0) { if (dansModule && j.v === "}") return; if (j.v !== "}") { avance(); continue; } } else prof--; }
      else if (prof === 0 && j.t === "mot" && (dansModule ? MEMBRES.has(j.v) : DECLS.has(j.v)) && !(j.v === "voix" && estOp("(", suiv()) === false && false)) return;
      avance();
    }
  }

  const declarations = [];
  while (cur().t !== "fin") {
    try { declarations.push(declaration()); }
    catch (e) {
      if (!(e instanceof ErreurSyntaxe)) throw e;
      if (cur().t !== "fin" && !(cur().t === "mot" && DECLS.has(cur().v))) avance();
      resynchroniser(false);
    }
  }
  return noeud("Programme", 0, source.length, { declarations });
}
