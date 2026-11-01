// Mode graphique : le même programme vu comme un graphe de modules connectés. Dérivé de l'arbre syntaxique, donc toujours synchronisé avec le code.
// Lecture seule dans cette version : on édite le code, le graphe suit. Un clic sur un nœud place le curseur sur sa ligne.
const MAX = 60;

function resume(e) {
  if (!e) return "";
  switch (e.type) {
    case "Nombre": return String(e.valeur);
    case "Quantite": return e.valeur + " " + e.unite;
    case "NoteLitterale": return e.nom;
    case "Ident": return e.nom;
    default: return "";
  }
}

// Construit { noeuds: [{ id, etiquette, genre, debut, fin, ligne }], liens: [[de, vers, etiquette]] } pour le premier module du programme.
export function construireGraphe(ast, source) {
  const mod = (ast.declarations || []).find(d => d.type === "Module");
  if (!mod) return { noeuds: [], liens: [] };
  const noeuds = [], liens = [], noms = new Map();
  const ligneDe = off => source.slice(0, off).split("\n").length;
  const ajoute = (etiquette, genre, n) => { if (noeuds.length >= MAX) return noeuds.length - 1; noeuds.push({ id: noeuds.length, etiquette, genre, debut: n.debut, fin: n.fin, ligne: ligneDe(n.debut) }); return noeuds.length - 1; };
  const lie = (de, vers, e = "") => { if (de >= 0 && vers >= 0 && de !== vers && !liens.some(l => l[0] === de && l[1] === vers && l[2] === e)) liens.push([de, vers, e]); };

  // expression -> id du nœud qui produit sa valeur (ou -1 pour une simple constante)
  function ev(e) {
    switch (e.type) {
      case "Ident": return noms.has(e.nom) ? noms.get(e.nom) : -1;
      case "Nombre": case "Quantite": case "NoteLitterale": case "BooleenLit": case "TexteLit": return -1;
      case "Faisceau": { const id = ajoute("[ ]", "op", e); e.elements.forEach(x => lie(ev(x), id)); return id; }
      case "Unaire": { const id = ajoute(e.op, "op", e); lie(ev(e.operande), id); return id; }
      case "Binaire": { const id = ajoute(e.op, "op", e); lie(ev(e.gauche), id); lie(ev(e.droite), id); return id; }
      case "Condition": { const id = ajoute("si", "op", e); lie(ev(e.si), id, "si"); lie(ev(e.alors), id, "alors"); lie(ev(e.sinon), id, "sinon"); return id; }
      case "Acces": { const o = ev(e.objet); if (e.objet.type === "Ident" && e.objet.nom === "voix") { const id = ajoute("voix.somme", "voix", e); return id; } return o >= 0 ? o : ajoute(`${e.objet.nom || ""}.${e.membre}`, "note", e); }
      case "Indice": return ev(e.objet);
      case "Appel": return appel(e.fonction.nom || "?", e.arguments, e, null);
      case "Flux": { const s = ev(e.source); return appel(e.cible.nom, e.cible.arguments || [], e.cible, s); }
    }
    return -1;
  }
  function appel(nom, args, n, source) {
    const id = ajoute(nom, "module", n);
    if (source !== null && source >= 0) lie(source, id, "entrée");
    for (const a of args) { const v = ev(a.valeur); lie(v, id, a.nom || ""); }
    return id;
  }
  const poser = (nom, id) => { if (id >= 0) noms.set(nom, id); };
  const corps = (instructions) => { for (const i of instructions) { const id = ev(i.valeur); poser(i.nom, id >= 0 ? id : ajoute(`${i.nom} = ${resume(i.valeur) || "…"}`, "const", i)); if (id >= 0) noeuds[id].etiquette = noeuds[id].genre === "module" ? `${i.nom} : ${noeuds[id].etiquette}` : noeuds[id].etiquette; } };
  for (const m of mod.membres) {
    if (m.type === "Reglage") poser(m.nom, ajoute(m.etiquette || m.nom, "reglage", m));
    else if (m.type === "Entree") poser(m.nom, ajoute(m.nom, "entree", m));
    else if (m.type === "Instruction") corps([m]);
    else if (m.type === "VoixBloc") {
      const note = ajoute(m.param + " : note", "note", m); noms.set(m.param, note);
      corps(m.instructions); const s = m.sortie ? ev(m.sortie.valeur) : -1; const fin = ajoute("sortie de la voix", "sortie", m.sortie || m); lie(s, fin);
      noms.set("__voix", fin);
    } else if (m.type === "Sortie") { const s = ev(m.valeur); const fin = ajoute("sortie", "sortie", m); lie(s, fin); }
  }
  // les nœuds « note » alimentent tout nœud qui s'écrit n.hauteur : on relie les accès aux notes
  for (const n of noeuds) if (n.genre === "note" && n.etiquette.includes(".")) { const k = noeuds.find(x => x.genre === "note" && x.etiquette.endsWith(": note")); if (k) liens.push([k.id, n.id, ""]); }
  return { noeuds, liens };
}

// Dessine le graphe en SVG, de gauche à droite : les entrées et réglages à gauche, la sortie à droite.
export function dessinerGraphe(conteneur, g, onClick) {
  if (!g.noeuds.length) { conteneur.innerHTML = `<p class="vide">Pas de module à dessiner : écris un instrument ou un effet.</p>`; return; }
  const niveau = new Array(g.noeuds.length).fill(0);
  for (let t = 0; t < g.noeuds.length; t++) for (const [a, b] of g.liens) niveau[b] = Math.max(niveau[b], niveau[a] + 1);
  const cols = Math.max(...niveau) + 1, parCol = Array.from({ length: cols }, () => []);
  g.noeuds.forEach((n, i) => parCol[niveau[i]].push(i));
  const LARG = 150, HAUT = 34, EC_X = 56, EC_Y = 16;
  const pos = new Map();
  parCol.forEach((col, ci) => col.forEach((id, ri) => pos.set(id, { x: 12 + ci * (LARG + EC_X), y: 12 + ri * (HAUT + EC_Y) })));
  const W = 24 + cols * (LARG + EC_X) - EC_X, H = 24 + Math.max(...parCol.map(c => c.length)) * (HAUT + EC_Y) - EC_Y;
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const coupe = (s, n) => s.length > n ? s.slice(0, n - 1) + "…" : s;
  let svg = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Graphe du programme : ${g.noeuds.length} nœuds, ${g.liens.length} connexions">`;
  for (const [a, b, e] of g.liens) {
    const p = pos.get(a), q = pos.get(b), x1 = p.x + LARG, y1 = p.y + HAUT / 2, x2 = q.x, y2 = q.y + HAUT / 2, mx = (x1 + x2) / 2;
    svg += `<path class="lien" d="M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}"/>`;
    if (e) svg += `<text class="etq" x="${x2 - 4}" y="${y2 - 4}" text-anchor="end">${esc(coupe(e, 10))}</text>`;
  }
  for (const n of g.noeuds) {
    const p = pos.get(n.id);
    svg += `<g class="noeud ${n.genre}" tabindex="0" role="button" data-ligne="${n.ligne}" aria-label="${esc(n.etiquette)}, ligne ${n.ligne}"><rect x="${p.x}" y="${p.y}" width="${LARG}" height="${HAUT}" rx="${n.genre === "module" ? 4 : 17}"/><text x="${p.x + LARG / 2}" y="${p.y + HAUT / 2 + 4}" text-anchor="middle">${esc(coupe(n.etiquette, 21))}</text></g>`;
  }
  conteneur.innerHTML = svg + "</svg>";
  conteneur.querySelectorAll(".noeud").forEach(el => { const go = () => onClick && onClick(+el.dataset.ligne); el.onclick = go; el.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } }; });
}
