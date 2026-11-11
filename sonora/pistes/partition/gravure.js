// La gravure de la partition de SONORA Pistes : le modèle (modele.js) dessiné en SVG avec VexFlow (MIT, police musicale Bravura sous licence SIL OFL), dans pistes/vendor/vexflow.
// Navigateur seulement. Dessine : clé, armure, chiffrage, tempo, notes et accords, silences, points, altérations (selon l'armure), ligatures, triolets, liaisons de prolongation et d'expression,
// articulations, nuances, soufflets, reprises, barres de mesure, portée de piano avec accolade, retours à la ligne.
import { mesurer, longueurMesure, pulsation, U_NOIRE } from "./modele.js?v=6185710770";
import { midiDe, nomArmureVexflow, diatonique } from "./hauteurs.js?v=6185710770";

let CHARGE = null;
// VexFlow dessine les signes de la musique (clés, têtes de notes, altérations...) avec la police Bravura, qu'il embarque (base64) mais dont le chargement est asynchrone :
// on attend qu'elle soit prête avant de graver, sinon le navigateur dessine avec une police de secours (têtes de notes trop étroites, hampes décalées).
const policePrete = nom => document.fonts && document.fonts.check ? document.fonts.check(`16px ${nom}`) : true;
async function attendrePolices(noms) {
  if (!document.fonts) return;
  const fin = Date.now() + 6000;
  while (Date.now() < fin && !noms.every(policePrete)) { try { await Promise.all(noms.map(n => document.fonts.load(`16px ${n}`))); } catch (_) { /* on réessaie */ } if (!noms.every(policePrete)) await new Promise(ok => setTimeout(ok, 60)); }
  if (!noms.every(policePrete)) throw new Error("La police de la musique (Bravura) n'a pas pu être chargée.");
}
// Charge VexFlow (un script classique, qui crée la variable globale VexFlow) puis sa police. base : l'adresse du dossier pistes/ (new URL("../", import.meta.url)).
export function chargerVexflow(base) {
  if (CHARGE) return CHARGE;
  CHARGE = (async () => {
    if (!(globalThis.VexFlow && globalThis.VexFlow.Renderer)) await new Promise((ok, ko) => { const s = document.createElement("script"); s.src = new URL("vendor/vexflow/vexflow-bravura.js", base || import.meta.url).href; s.onload = ok; s.onerror = () => ko(new Error("La bibliothèque de gravure musicale (VexFlow) n'a pas pu être chargée.")); document.head.append(s); });
    await attendrePolices(["Bravura", "Academico"]); globalThis.VexFlow.setFonts("Bravura", "Academico");
    return globalThis.VexFlow;
  })().catch(e => { CHARGE = null; throw e; });
  return CHARGE;
}

const LETTRES = "cdefgab";
const cleVexflow = p => `${LETTRES[p.l]}${p.a === 0 ? "" : p.a > 0 ? "#".repeat(p.a) : "b".repeat(-p.a)}/${p.o}`;
const MILIEU = { treble: 34, bass: 22, alto: 28, tenor: 26, soprano: 32, "mezzo-soprano": 30, "baritone-c": 24, "baritone-f": 24, subbass: 20, french: 36 };   // numéro diatonique de la ligne du milieu de la portée
const CLE_SILENCE = { treble: "b/4", bass: "d/3", alto: "c/4", tenor: "a/3", soprano: "g/4", "mezzo-soprano": "e/4", "baritone-c": "e/3", "baritone-f": "f/3", subbass: "b/2", french: "d/4" };
const ARTICULATIONS = { staccato: "a.", accent: "a>", tenuto: "a-", marcato: "a^", staccatissimo: "av", fermata: "a@a" };
const ORNEMENTS = { trill: "tr", turn: "turn", mordent: "mordent", prall: "prall" };

// racine : élément HTML où mettre le SVG. partition : le modèle. options : { largeur, echelle, onNote(info) }
export function graver(racine, partition, { largeur = 760, echelle = 1.15, onNote = null, titre = "" } = {}) {
  const VF = globalThis.VexFlow; if (!VF || !VF.Renderer) throw new Error("VexFlow n'est pas chargé : appelle chargerVexflow() d'abord.");
  const { Renderer, Stave, StaveNote, GhostNote, ClefNote, Voice, Formatter, Beam, Tuplet, StaveTie, Curve, Accidental, Dot, Articulation, Annotation, Ornament, StaveConnector, BarlineType, Fraction } = VF;
  racine.textContent = "";
  const meta = partition.meta, nP = partition.portees.length;
  const mes = partition.portees.map(p => mesurer(p, meta));
  const nMes = Math.max(1, ...mes.map(x => x.mesures.length));
  const TOP = 40 + (titre ? 34 : 0), L = (largeur / echelle) - 20, X0 = 10, H_PORTEE = 80, ECART_PORTEES = 118, ECART_LIGNES = nP === 2 ? 60 : 56;
  const nomArmure = q => nomArmureVexflow(q);

  // ---- 1. les objets VexFlow de chaque mesure de chaque portée
  const colonnes = [];
  for (let k = 0; k < nMes; k++) {
    const col = { k, portees: [], minW: 0 };
    for (let s = 0; s < nP; s++) {
      const m = mes[s].mesures[k] || { items: [], longueur: longueurMesure(meta.chiffrage), chiffrage: meta.chiffrage, quintes: meta.quintes, mode: meta.mode, cle: partition.portees[s].cle || meta.cle, vide: true, debut: 0 };
      col.portees.push(construireMesure(m, s, k));
    }
    colonnes.push(col);
  }
  function construireMesure(m, s, k) {
    const tick = [], parItem = new Map(), cle = m.cle || "treble", tupGroupes = new Map(), notes = [];
    const dur = it => it.val + (it.silence ? "r" : "");
    for (const it of m.items) {
      if (it.ctl === "cle") { tick.push(new ClefNote(it.valeur, "small")); continue; }
      if (!it.val) continue;
      let n;
      if (it.invisible) n = new GhostNote({ duration: it.val, dots: it.pts || 0 });
      else if (it.silence) { n = new StaveNote({ keys: [CLE_SILENCE[cle] || "b/4"], duration: it.mesureComplete ? "wr" : dur(it), dots: it.mesureComplete ? 0 : (it.pts || 0), clef: cle, align_center: !!it.mesureComplete }); }
      else {
        const hs = [...it.hauteurs].sort((a, b) => midiDe(a) - midiDe(b) || a.l - b.l);
        const moy = hs.reduce((a, p) => a + diatonique(p), 0) / hs.length;
        n = new StaveNote({ keys: hs.map(cleVexflow), duration: it.val, dots: it.pts || 0, clef: cle, stem_direction: moy >= (MILIEU[cle] ?? 34) ? -1 : 1 }); n.dirVoulue = moy >= (MILIEU[cle] ?? 34) ? -1 : 1;
        it.tri = hs;
        // les altérations seront posées par Accidental.applyAccidentals (selon l'armure et la mesure)
        for (const a of it.art || []) { try { if (ARTICULATIONS[a]) n.addModifier(new Articulation(ARTICULATIONS[a]).setPosition(a === "fermata" ? 3 : 3), 0); else if (ORNEMENTS[a]) n.addModifier(new Ornament(ORNEMENTS[a]), 0); } catch (_) { /* un signe que VexFlow ne connaît pas : on l'ignore */ } }
      }
      if (it.pts && !it.invisible && !(it.silence && it.mesureComplete)) for (let q = 0; q < it.pts; q++) Dot.buildAndAttach([n], { all: true });
      for (const t of it.texte || []) { try { const a = new Annotation(t).setFont("Atkinson Hyperlegible, sans-serif", 11, "normal", "italic"); a.setVerticalJustification(Annotation.VerticalJustify.TOP); n.addModifier(a, 0); } catch (_) { /* texte non dessiné */ } }
      tick.push(n); notes.push({ n, it }); parItem.set(it, n);
      if (it.tup) { if (!tupGroupes.has(it.tup.id)) tupGroupes.set(it.tup.id, { tup: it.tup, notes: [] }); tupGroupes.get(it.tup.id).notes.push(n); }
    }
    const [num, den] = m.chiffrage, voice = new Voice(`${num}/${den}`); voice.setStrict(false); voice.addTickables(tick.length ? tick : [new GhostNote({ duration: "w" })]);
    try { Accidental.applyAccidentals([voice], nomArmure(m.quintes)); } catch (_) { /* pas d'altérations posées */ }
    const groupes = pulsation(m.chiffrage) === 36 ? [new Fraction(3, 8)] : pulsation(m.chiffrage) === 48 ? [new Fraction(1, 2)] : [new Fraction(1, 4)];
    const tuplets = []; for (const g of tupGroupes.values()) { try { tuplets.push(new Tuplet(g.notes, { num_notes: g.tup.num, notes_occupied: g.tup.den })); } catch (_) { /* triolet non dessiné */ } }
    let beams = []; try { beams = Beam.generateBeams(tick.filter(x => x instanceof StaveNote), { groups: groupes, maintain_stem_directions: true }); } catch (_) { beams = []; }
    return { m, s, k, voice, notes, beams, tuplets, parItem, cle };
  }
  // largeur minimale de la zone des notes de chaque colonne (toutes portées ensemble : les notes de même temps s'alignent)
  for (const col of colonnes) {
    const voices = col.portees.map(p => p.voice); const f = new Formatter().joinVoices(voices); let w = 60;
    try { w = f.preCalculateMinTotalWidth(voices); } catch (_) { w = 80; }
    col.minW = Math.max(54, w + 22);
    col.complete = col.portees.every(p => p.m.items.every(it => !it.mesureComplete) || true);
  }

  // ---- 2. le découpage en lignes
  const modifs = (col, premiereDeLigne, premiereDuTout) => {   // largeur des signes d'en-tête (clé, armure, chiffrage) de la ligne
    let w = 0; const p = col.portees[0].m;
    if (premiereDeLigne) { w += 34 + (p.quintes ? 12 * Math.abs(p.quintes) + 8 : 0); if (premiereDuTout || p.changeChiffrage) w += 28; if (nP === 2) w += 14; }
    else { if (p.changeCle) w += 26; if (p.changeArmure) w += 12 * Math.abs(p.quintes) + 14; if (p.changeChiffrage) w += 28; }
    return w;
  };
  const lignes = []; let cur = []; let usedW = 0;
  for (let k = 0; k < nMes; k++) {
    const col = colonnes[k], extra = modifs(col, cur.length === 0, k === 0), w = col.minW + extra;
    if (cur.length && usedW + w > L - X0) { lignes.push(cur); cur = []; usedW = 0; }
    const ex = modifs(col, cur.length === 0, k === 0); cur.push({ col, extra: ex, w: col.minW + ex }); usedW += col.minW + ex;
  }
  if (cur.length) lignes.push(cur);

  // ---- 3. le dessin
  const hauteurLigne = (nP === 2 ? ECART_PORTEES + H_PORTEE : H_PORTEE) + ECART_LIGNES;
  const hauteur = (lignes.length * hauteurLigne + 70 + (titre ? 34 : 0)) * echelle, W = largeur;
  const renderer = new Renderer(racine, Renderer.Backends.SVG); renderer.resize(W, hauteur); const ctx = renderer.getContext(); ctx.scale(echelle, echelle);
  const svg = racine.querySelector("svg"); if (svg) { svg.classList.add("pt-svg"); svg.setAttribute("role", "img"); svg.setAttribute("aria-label", `Partition : ${nMes} mesure${nMes > 1 ? "s" : ""}`); }
  ctx.setFillStyle("#1b1b22"); ctx.setStrokeStyle("#1b1b22");
  if (titre) { ctx.save(); ctx.setFont("Georgia, serif", 22, "bold"); ctx.fillText(titre, Math.max(X0, (L + X0) / 2 - titre.length * 5.2), 28); ctx.restore(); }
  const items = [], mesuresGeom = [];   // mesuresGeom : où se trouve chaque mesure (pour retrouver la note et le temps sous la souris)
  const tempoUtilise = { fait: false };
  lignes.forEach((ligne, li) => {
    const y0 = TOP + li * hauteurLigne, naturel = ligne.reduce((s, x) => s + x.w, 0), dernier = li === lignes.length - 1;
    const dispo = L - X0, etire = dernier ? Math.min(dispo / naturel, 1.6) : dispo / naturel;   // la dernière ligne n'est pas étirée jusqu'au bord si elle est courte
    let x = X0; const stavesLigne = [];
    ligne.forEach(({ col, extra, w }, j) => {
      const largeurMes = Math.round(w * etire), premiereLigne = j === 0, derniereDeLigne = j === ligne.length - 1;
      const staves = col.portees.map((cp, s) => {
        const st = new Stave(x, y0 + s * ECART_PORTEES, largeurMes); const m = cp.m;
        if (premiereLigne) { st.addClef(m.cle); if (m.quintes) st.addKeySignature(nomArmure(m.quintes)); else if (m.changeArmure || col.k === 0) { /* do majeur : rien */ } if (col.k === 0 || m.changeChiffrage) st.addTimeSignature(`${m.chiffrage[0]}/${m.chiffrage[1]}`); }
        else { if (m.changeCle) st.addClef(m.cle, "small"); if (m.changeArmure) st.addKeySignature(nomArmure(m.quintes), nomArmure(0)); if (m.changeChiffrage) st.addTimeSignature(`${m.chiffrage[0]}/${m.chiffrage[1]}`); }
        if (m.repDeb) st.setBegBarType(BarlineType.REPEAT_BEGIN);
        if (m.repFin) st.setEndBarType(BarlineType.REPEAT_END);
        else if (m.barre === "|." || (col.k === nMes - 1 && s >= 0)) st.setEndBarType(BarlineType.END);
        else if (m.barre === "||") st.setEndBarType(BarlineType.DOUBLE);
        if (col.k === nMes - 1 && !m.repFin) st.setEndBarType(BarlineType.END);
        if (premiereLigne && col.k > 0 && s === 0) st.setMeasure(col.k + 1);
        if (!tempoUtilise.fait && s === 0 && col.k === 0 && meta.tempo && meta.tempo.bpm) { try { st.setTempo({ duration: meta.tempo.val === "q" ? "q" : meta.tempo.val, dots: meta.tempo.pts || 0, bpm: meta.tempo.bpm, name: meta.tempo.texte || undefined }, -18); tempoUtilise.fait = true; } catch (_) { /* tempo non dessiné */ } }
        st.setContext(ctx).draw(); return st;
      });
      // la mise en forme commune (alignement vertical entre les portées) puis le dessin des voix
      const voices = col.portees.map(p => p.voice), debutNotes = Math.max(...staves.map(s => s.getNoteStartX())), fin = Math.min(...staves.map(s => s.getNoteEndX()));
      try { new Formatter().joinVoices(voices).format(voices, Math.max(30, fin - debutNotes - 12), { align_rests: false }); } catch (_) { /* mise en forme impossible : on dessine quand même */ }
      col.portees.forEach((cp, s) => {
        const st = staves[s];
        for (const { n } of cp.notes) if (n.dirVoulue && !(n.getBeam && n.getBeam())) { try { n.setStemDirection(n.dirVoulue); } catch (_) { /* on garde la direction de VexFlow */ } }   // la mise en forme commune à deux portées peut renverser une hampe : on la remet
        cp.voice.draw(ctx, st);
        for (const b of cp.beams) b.setContext(ctx).draw(); for (const t of cp.tuplets) t.setContext(ctx).draw();
        cp.stave = st;
      });
      if (nP === 2) { const [a, b] = staves; if (premiereLigne) { new StaveConnector(a, b).setType("brace").setContext(ctx).draw(); new StaveConnector(a, b).setType("singleLeft").setContext(ctx).draw(); } if (derniereDeLigne) new StaveConnector(a, b).setType("singleRight").setContext(ctx).draw(); else new StaveConnector(a, b).setType("singleRight").setContext(ctx).draw(); }
      const m0 = mes[0].mesures[col.k]; mesuresGeom.push({ k: col.k, li, x0: debutNotes, x1: fin, debutU: m0 ? m0.debut : col.k * longueurMesure(meta.chiffrage), lenU: m0 ? m0.longueur : longueurMesure(meta.chiffrage), staves: staves.map((st, s2) => ({ yHaut: st.getYForLine(0), esp: st.getSpacingBetweenLines(), cle: col.portees[s2].m.cle || "treble" })) });
      stavesLigne.push({ col, staves, x, largeurMes });
      x += largeurMes;
    });
    // ---- les éléments qui relient les notes d'une même ligne (liaisons, nuances, soufflets) et les repères du curseur
    dessinerLiens(ligne, stavesLigne, li, y0, dernier);
  });

  // ---- le tracé des liaisons, nuances et soufflets (global : certains traversent les lignes)
  function dessinerLiens(ligne, stavesLigne, li, y0, dernier) { /* rempli plus bas, après la collecte globale */ }
  // collecte globale, dans l'ordre : pour chaque portée, la suite des items avec leur note VexFlow et la ligne où ils sont dessinés
  const parPortee = Array.from({ length: nP }, () => []);
  lignes.forEach((ligne, li) => ligne.forEach(({ col }) => col.portees.forEach((cp, s) => { for (const { n, it } of cp.notes) parPortee[s].push({ n, it, li, cp, mesure: col.k }); })));
  for (let s = 0; s < nP; s++) {
    const suite = parPortee[s];
    // liaisons de prolongation
    suite.forEach((e, idx) => {
      if (!e.it.lie || !e.it.hauteurs) return; const f = suite.slice(idx + 1).find(x => x.it.hauteurs);
      const comm = f ? e.it.tri.map((p, i) => [i, f.it.tri.findIndex(q => midiDe(q) === midiDe(p))]).filter(([, j]) => j >= 0) : [];
      const bouts = f && f.li === e.li ? { firstNote: e.n, lastNote: f.n } : null;
      try {
        if (f && comm.length) { if (f.li === e.li) new StaveTie({ firstNote: e.n, lastNote: f.n, firstIndexes: comm.map(c => c[0]), lastIndexes: comm.map(c => c[1]) }).setContext(ctx).draw();
          else { new StaveTie({ firstNote: e.n, lastNote: null, firstIndexes: comm.map(c => c[0]), lastIndexes: comm.map(c => c[0]) }).setContext(ctx).draw(); new StaveTie({ firstNote: null, lastNote: f.n, firstIndexes: comm.map(c => c[1]), lastIndexes: comm.map(c => c[1]) }).setContext(ctx).draw(); } }
        else if (!f) new StaveTie({ firstNote: e.n, lastNote: null, firstIndexes: e.it.tri.map((_, i) => i), lastIndexes: e.it.tri.map((_, i) => i) }).setContext(ctx).draw();
      } catch (_) { /* liaison non dessinée */ }
    });
    // liaisons d'expression : de la note qui ouvre « ( » à la note qui ferme « ) »
    const ouvertes = [];
    suite.forEach((e, idx) => {
      for (let q = 0; q < (e.it.slurDeb || 0); q++) ouvertes.push(e);
      for (let q = 0; q < (e.it.slurFin || 0); q++) { const d = ouvertes.pop(); if (!d) continue; try { if (d.li === e.li) new Curve(d.n, e.n, { openingDirection: "auto" }).setContext(ctx).draw(); else { new Curve(d.n, undefined, { openingDirection: "auto" }).setContext(ctx).draw(); new Curve(undefined, e.n, { openingDirection: "auto" }).setContext(ctx).draw(); } } catch (_) { /* liaison non dessinée */ } }
    });
    // nuances et soufflets : sous la portée
    let hp = null;
    const yBas = e => e.cp.stave.getBottomLineY() + 30;
    suite.forEach((e, idx) => {
      const x = e.n.getAbsoluteX ? e.n.getAbsoluteX() : 0;
      if (e.it.dyn) { ctx.save(); ctx.setFont("Georgia, serif", 17, "bold", "italic"); ctx.setFillStyle("#1b1b22"); ctx.fillText(e.it.dyn, x - 2, yBas(e)); ctx.restore(); if (hp) { tracerHairpin(hp, e, x - 4); hp = null; } }
      if (e.it.hpFin && hp) { tracerHairpin(hp, e, x + 4); hp = null; }
      if (e.it.hp) { if (hp) tracerHairpin(hp, e, x - 4); hp = { type: e.it.hp, e, x: x + (e.it.dyn ? 8 + 8 * e.it.dyn.length : 2) }; }
    });
    if (hp) { const l = suite[suite.length - 1]; tracerHairpin(hp, l, l.n.getAbsoluteX() + 16); }
  }
  function tracerHairpin(h, fin, x2) {
    const y = h.e.cp.stave.getBottomLineY() + 26, x1 = h.x;
    if (fin.li !== h.e.li) { x2 = h.e.cp.stave.getNoteEndX ? h.e.cp.stave.getNoteEndX() : x1 + 60; }
    if (x2 - x1 < 12) x2 = x1 + 28;
    ctx.save(); ctx.setStrokeStyle("#1b1b22"); ctx.setLineWidth(1.3); const o = 5;
    ctx.beginPath(); if (h.type === "<") { ctx.moveTo(x1, y); ctx.lineTo(x2, y - o); ctx.moveTo(x1, y); ctx.lineTo(x2, y + o); } else { ctx.moveTo(x1, y - o); ctx.lineTo(x2, y); ctx.moveTo(x1, y + o); ctx.lineTo(x2, y); } ctx.stroke(); ctx.restore();
  }

  // ---- les notes cliquables et le curseur : une entrée par événement
  parPortee.forEach((suite, s) => suite.forEach(e => {
    const el = e.n.getSVGElement ? e.n.getSVGElement() : null; const x = e.n.getAbsoluteX ? e.n.getAbsoluteX() : 0;
    const info = { portee: s, midis: e.it.hauteurs ? e.it.hauteurs.map(midiDe) : [], t: e.it.t, u: e.it.u, x, ligne: e.li, y0: TOP + e.li * hauteurLigne, y1: TOP + e.li * hauteurLigne + (nP === 2 ? ECART_PORTEES + 40 : 40) + 14, src: e.it.src || null, silence: !!e.it.silence, el, mesure: e.mesure };
    if (el) { el.classList.add(info.silence ? "pt-silence" : "pt-note"); if (info.src) { el.setAttribute("data-src", info.src.join(",")); } el.setAttribute("data-t", String(e.it.t)); el.setAttribute("data-midis", info.midis.join(",")); el.setAttribute("data-u", String(e.it.u)); }
    items.push(info);
  }));
  items.sort((a, b) => a.t - b.t || a.portee - b.portee);
  // les limites de chaque ligne (pour placer le curseur entre deux notes, ou jusqu'à la fin de la ligne)
  const geom = lignes.map((ligne, li) => ({ li, y0: TOP + li * hauteurLigne - 8, y1: TOP + li * hauteurLigne + (nP === 2 ? ECART_PORTEES + 52 : 52), xFin: X0 + Math.round(ligne.reduce((s, x) => s + x.w, 0) * (L - X0) / ligne.reduce((s, x) => s + x.w, 0)) }));
  if (onNote && svg) svg.addEventListener("click", ev => { const g = ev.target.closest && ev.target.closest(".pt-note"); if (!g) return; const src = (g.getAttribute("data-src") || "").split(",").map(Number); onNote({ src: src.length === 2 && src.every(Number.isFinite) ? src : null, ts: ev.timeStamp, t: +g.getAttribute("data-t") / U_NOIRE, u: +g.getAttribute("data-u") || 0, midis: (g.getAttribute("data-midis") || "").split(",").filter(Boolean).map(Number) }); });

  const res = { svg, items, geom, echelle, hauteur, lignes: lignes.length, mesures: nMes };
  // la position du curseur de lecture à t (en temps = noires) : { x, y0, y1 } en pixels de l'écran
  res.position = tTemps => {
    const t = tTemps * U_NOIRE; if (!items.length) return null;
    const prem = items.filter(i => i.portee === 0); let a = prem[0];
    for (const i of prem) { if (i.t <= t + 1e-9) a = i; else break; }
    const k = prem.indexOf(a), b = prem[k + 1]; let x = a.x;
    if (b && b.ligne === a.ligne && b.t > a.t) x = a.x + (b.x - a.x) * Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t))); else if (!b || b.ligne !== a.ligne) { const g = geom[a.ligne]; const fin = g ? g.xFin : a.x + 30; x = a.x + Math.min(Math.max(0, (t - a.t) / Math.max(1, a.u)), 1) * Math.max(10, fin - a.x - 12); }
    return { x: x * echelle, y0: geom[a.ligne].y0 * echelle, y1: geom[a.ligne].y1 * echelle, ligne: a.ligne };
  };
  // Ce qu'il y a sous un point (px, py) de l'écran, mesuré depuis le coin haut gauche du SVG : la mesure, la portée, la hauteur (numéro diatonique, do4 = 28) et le temps (unités).
  // grille : pas de calage du temps en unités (12 = la croche). Renvoie aussi où dessiner l'aperçu : { x, y } en pixels de l'écran. null si le point est loin de toute portée.
  const BAS_DIATONIQUE = { treble: 30, bass: 18, alto: 24, tenor: 22, soprano: 28, "mezzo-soprano": 26, "baritone-c": 20, "baritone-f": 16, subbass: 14, french: 32 };   // la note de la ligne du bas
  res.sonder = (px, py, { grille = 12 } = {}) => {
    const x = px / echelle, y = py / echelle; if (!mesuresGeom.length) return null;
    let meilleur = null, dist = 1e9;
    for (const g of mesuresGeom) for (let s2 = 0; s2 < g.staves.length; s2++) { const st = g.staves[s2], haut = st.yHaut - 4.5 * st.esp, bas = st.yHaut + 8.5 * st.esp, d = y < haut ? haut - y : y > bas ? y - bas : 0; if (d < dist - 1e-9) { dist = d; meilleur = { li: g.li, s: s2 }; } }
    if (!meilleur || dist > 46) return null;
    const ms = mesuresGeom.filter(g => g.li === meilleur.li); let g = ms[0];
    for (const m of ms) { if (x >= m.x0 - 18) g = m; }
    const st = g.staves[meilleur.s], bas = st.yHaut + 4 * st.esp, pas = st.esp / 2, step = Math.max(-8, Math.min(28, Math.round((bas - y) / pas)));
    const diat = (BAS_DIATONIQUE[st.cle] ?? 30) + step;
    // le temps : on interpole entre les notes déjà dessinées de la mesure
    const ancres = [{ x: g.x0, t: g.debutU }, ...items.filter(i => i.mesure === g.k && i.portee === 0).map(i => ({ x: i.x, t: i.t })), { x: g.x1 - 4, t: g.debutU + g.lenU }].sort((a, b) => a.x - b.x || a.t - b.t);
    const uniques = []; for (const a of ancres) if (!uniques.length || a.x > uniques[uniques.length - 1].x + 0.5) uniques.push(a);
    let t = g.debutU; const cl = Math.max(uniques[0].x, Math.min(uniques[uniques.length - 1].x, x));
    for (let k = 0; k < uniques.length - 1; k++) { const a = uniques[k], b = uniques[k + 1]; if (cl >= a.x && cl <= b.x) { t = a.t + (cl - a.x) / (b.x - a.x) * (b.t - a.t); break; } }
    let rel = Math.round((t - g.debutU) / grille) * grille; rel = Math.max(0, Math.min(g.lenU - grille, rel)); const tc = g.debutU + rel;
    // le x de l'aperçu : on refait le chemin inverse (temps -> x)
    let xa = g.x0 + 6; for (let k = 0; k < uniques.length - 1; k++) { const a = uniques[k], b = uniques[k + 1]; if (tc >= a.t && tc <= b.t && b.t > a.t) { xa = a.x + (tc - a.t) / (b.t - a.t) * (b.x - a.x); break; } }
    return { mesure: g.k, ligne: g.li, portee: meilleur.s, cle: st.cle, tU: tc, diat, x: xa * echelle, y: (bas - step * pas) * echelle, yPortee: (st.yHaut - 3 * st.esp) * echelle, yPorteeBas: (st.yHaut + 7 * st.esp) * echelle, esp: st.esp * echelle };
  };
  // les notes qui sonnent à t (en temps = noires) s'allument ; t = null éteint tout. On ne touche qu'aux notes qui changent d'état.
  let jouees = new Set();
  res.surlignerJouees = tTemps => {
    const u = tTemps === null || tTemps === undefined ? null : tTemps * 24 + 0.5, nouv = new Set();
    if (u !== null) for (const i of items) if (i.el && !i.silence && i.t <= u && i.t + i.u > u) nouv.add(i.el);
    for (const e of jouees) if (!nouv.has(e)) e.classList.remove("pt-joue");
    for (const e of nouv) if (!jouees.has(e)) e.classList.add("pt-joue");
    jouees = nouv;
  };
  res.surlignerNote = (t, n) => { svg.querySelectorAll(".pt-choisie").forEach(e => e.classList.remove("pt-choisie")); if (t === null) return; for (const i of items) if (i.el && i.midis.includes(n) && i.t <= t * 24 + 0.5 && i.t + i.u > t * 24 + 0.5) i.el.classList.add("pt-choisie"); };
  res.surligner = (src) => { svg.querySelectorAll(".pt-actif").forEach(e => e.classList.remove("pt-actif")); if (!src) return; for (const i of items) if (i.el && i.src && i.src[0] < src[1] && i.src[1] > src[0] && (src[1] - src[0] <= 1 ? i.src[0] <= src[0] && i.src[1] >= src[0] : true)) i.el.classList.add("pt-actif"); };
  return res;
}
