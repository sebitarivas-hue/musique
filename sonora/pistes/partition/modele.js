// Le modèle de la partition de SONORA Pistes : ce que la partition « est », indépendamment du dessin et du texte.
//   · des NOTES MIDI du clip (t, d en temps = noires) <-> une partition (mesures, valeurs, liaisons, nuances) : depuisNotes / versNotes ;
//   · le même modèle est produit par l'analyseur de texte façon LilyPond (lily.js) et lu par la gravure (gravure.js).
// Le temps s'écrit en UNITÉS : 1 noire = 24 unités (la ronde 96, la croche 12, la double croche 6, la triple croche 3, la croche de triolet 8).
// Sans DOM : testé dans Node (tests/partition.test.js).
import { ecrireMidi, midiDe, memeNote, nuanceDeVitesse, VITESSE_NUANCE } from "./hauteurs.js?v=e0583807f5";

export const U_NOIRE = 24, U_RONDE = 96;
export const VALEURS = { w: 96, h: 48, q: 24, "8": 12, "16": 6, "32": 3 };   // valeur écrite -> unités
const VALEUR_DE = { 1: "w", 2: "h", 4: "q", 8: "8", 16: "16", 32: "32" };
export const codeValeur = d => VALEUR_DE[d];                                   // le chiffre LilyPond (1, 2, 4, 8, 16, 32) -> w, h, q, 8, 16, 32
export const chiffreValeur = v => ({ w: 1, h: 2, q: 4, "8": 8, "16": 16, "32": 32 })[v];
// Les unités d'une valeur écrite avec ses points (0, 1 ou 2) : null si ce n'est pas un nombre entier d'unités (triple croche pointée).
export function unitesValeur(val, pts = 0) { const b = VALEURS[val]; if (!b) return null; const u = pts === 0 ? b : pts === 1 ? b * 1.5 : b * 1.75; return Number.isInteger(u) ? u : null; }
// Ce que vaut une note de triolet : la valeur écrite d'une durée sonore u dans un groupe num:den.
export function valeurDeUnites(u, tup = null) {
  const w = tup ? u * tup.num / tup.den : u;
  for (const v of Object.keys(VALEURS)) for (const pts of [0, 1, 2]) if (unitesValeur(v, pts) === w) return { val: v, pts };
  return null;
}
export const longueurMesure = ([n, d]) => n * U_RONDE / d;
// La pulsation sert à ranger les notes : la noire (24) ; la noire pointée en mesure composée (6/8, 9/8, 12/8 : 36).
export const pulsation = ([n, d]) => d === 8 && n % 3 === 0 && n > 3 ? 36 : U_RONDE / d;

// Cuts a duration in standard notes, from position p in the measure. Renvoie [{ val, pts, u }].
export function decomposer(u, p, chiffrage) {
  const B = pulsation(chiffrage), mes = longueurMesure(chiffrage), out = [], cand = [];
  for (const val of Object.keys(VALEURS)) for (const pts of [1, 0, 2]) { const t = unitesValeur(val, pts); if (t) cand.push({ val, pts, u: t }); }
  cand.sort((a, b) => b.u - a.u || a.pts - b.pts);
  while (u >= 3) {
    const reste = Math.min(u, mes - p);
    const c = cand.find(c => c.u <= reste && p % (c.u <= B ? Math.min(c.u, 12) : B) === 0) || cand.find(c => c.u <= reste);
    if (!c) break; out.push(c); u -= c.u; p += c.u; if (p >= mes) p = 0;
  }
  return out;
}

// ---------------------------------------------------------------- des événements aux mesures
// Un événement : { u, hauteurs: [{l,a,o}] | null (silence), val?, pts?, tup?: { id, num, den }, lie?, dyn?, hp?: "<" | ">", hpFin?: true, slurDeb?, slurFin?, art?: [], texte?: [], src?: [a, b], invisible? }
// Un contrôle (à sa place dans la liste) : { ctl: "cle" | "armure" | "chiffrage" | "tempo" | "partiel" | "barre" | "volta", ... }
export function aplatir(evts, { deplier = false } = {}) {
  const out = [];
  for (const e of evts) {
    if (e.ctl === "volta") { const n = Math.max(1, e.n || 2); if (deplier) { for (let k = 0; k < n; k++) out.push(...aplatir(e.evts, { deplier })); } else { const dedans = aplatir(e.evts, { deplier }); if (dedans.length) { out.push({ ctl: "repdeb" }, ...dedans, { ctl: "repfin", n }); } } }
    else if (e.ctl === "unfold") { for (let k = 0; k < Math.max(1, e.n || 2); k++) out.push(...aplatir(e.evts, { deplier })); }
    else out.push(e);
  }
  return out;
}

// Une portée (liste d'événements et de contrôles) en mesures. meta : { chiffrage, quintes, mode, cle }.
// Renvoie { mesures: [{ debut, longueur, chiffrage, quintes, mode, cle, changeCle, changeArmure, changeChiffrage, items: [...], repDeb, repFin, barre, tempo }], total }.
// Un item : { u, t (unités depuis le début de la portée), silence, mesureComplete, val, pts, hauteurs, lie, tup, dyn, hp, slurDeb, slurFin, art, texte, src, invisible }.
export function mesurer(portee, meta) {
  const evts = aplatir(portee.evts || [], { deplier: false });
  let chiffrage = meta.chiffrage.slice(), quintes = meta.quintes, mode = meta.mode, cle = portee.cle || meta.cle || "treble";
  const mesures = []; let t = 0, pos = 0, cur = null, enAttente = {}, premier = true, partiel = null;
  const ouvrir = () => {
    const m = { debut: t, longueur: longueurMesure(chiffrage), chiffrage: chiffrage.slice(), quintes, mode, cle, items: [], changeCle: false, changeArmure: false, changeChiffrage: false };
    if (partiel !== null) { m.longueur = partiel; m.anacrouse = true; partiel = null; }
    if (premier) { premier = false; m.premiere = true; }
    mesures.push(m); cur = m; pos = 0;
    // les changements demandés en cours de mesure s'appliquent ici
    if (enAttente.chiffrage) { chiffrage = enAttente.chiffrage; m.chiffrage = chiffrage.slice(); m.longueur = longueurMesure(chiffrage); m.changeChiffrage = true; }
    if (enAttente.armure) { quintes = enAttente.armure.quintes; mode = enAttente.armure.mode; m.quintes = quintes; m.mode = mode; m.changeArmure = true; }
    if (enAttente.cle) { cle = enAttente.cle; m.cle = cle; m.changeCle = true; }
    enAttente = {};
  };
  const fermer = () => { cur = null; };
  const placer = it => { if (!cur) ouvrir(); it.t = t; cur.items.push(it); t += it.u; pos += it.u; if (pos >= cur.longueur - 1e-9) fermer(); };
  for (const e of evts) {
    if (e.ctl) {
      if (e.ctl === "partiel") { if (t === 0 && !cur) partiel = e.u; }
      else if (e.ctl === "chiffrage") { if (!cur || pos === 0) { chiffrage = e.valeur.slice(); if (cur) { cur.chiffrage = chiffrage.slice(); cur.longueur = longueurMesure(chiffrage); cur.changeChiffrage = !cur.premiere; } else if (mesures.length || t > 0) enAttente.chiffrage = chiffrage.slice(); } else enAttente.chiffrage = e.valeur.slice(); }
      else if (e.ctl === "armure") { if (!cur || pos === 0) { quintes = e.quintes; mode = e.mode; if (cur) { cur.quintes = quintes; cur.mode = mode; cur.changeArmure = !cur.premiere; } else if (mesures.length) enAttente.armure = { quintes, mode }; } else enAttente.armure = { quintes: e.quintes, mode: e.mode }; }
      else if (e.ctl === "cle") { if (!cur || pos === 0) { cle = e.valeur; if (cur) { cur.cle = cle; cur.changeCle = !cur.premiere; } else if (mesures.length) enAttente.cle = cle; } else { if (!cur) ouvrir(); cur.items.push({ u: 0, t, ctl: "cle", valeur: e.valeur }); cle = e.valeur; } }
      else if (e.ctl === "tempo") { if (!cur) ouvrir(); (cur.tempos = cur.tempos || []).push({ ...e, t, pos }); }
      else if (e.ctl === "repdeb") { if (!cur) ouvrir(); if (pos === 0) cur.repDeb = true; }
      else if (e.ctl === "repfin") { const m = cur || mesures[mesures.length - 1]; if (m && (!cur || pos === 0 || true)) { m.repFin = e.n || 2; } }
      else if (e.ctl === "barre") { const m = cur || mesures[mesures.length - 1]; if (m) m.barre = e.type; }
      continue;
    }
    let reste = e.u, premierMorceau = true;
    if (reste <= 0) continue;
    if (!cur) ouvrir();
    // un événement qui tient dans la mesure et dont la valeur écrite est connue : on la garde telle qu'écrite
    const hint = e.val && unitesValeur(e.val, e.pts || 0) !== null && Math.round(unitesValeur(e.val, e.pts || 0) * (e.tup ? e.tup.den / e.tup.num : 1)) === Math.round(e.u);
    const tupHint = e.tup && !hint ? valeurDeUnites(e.u, e.tup) : null;
    if ((hint || tupHint) && e.u <= cur.longueur - pos + 1e-9) {
      const v = hint ? { val: e.val, pts: e.pts || 0 } : tupHint;
      placer({ ...copieEv(e), u: e.u, val: v.val, pts: v.pts, silence: !e.hauteurs, mesureComplete: !e.hauteurs && e.u === cur.longueur && pos === 0 });
      continue;
    }
    while (reste >= 3) {
      if (!cur) ouvrir();
      const place = cur.longueur - pos, portion = Math.min(reste, place);
      if (!e.hauteurs && portion === cur.longueur && pos === 0) { placer({ ...copieEv(e), u: portion, silence: true, mesureComplete: true, val: undefined, pts: undefined, tup: undefined, lie: false }); reste -= portion; premierMorceau = false; continue; }
      const morceaux = decomposer(portion, pos, cur.chiffrage);
      if (!morceaux.length) { reste = 0; break; }
      let somme = 0;
      for (const c of morceaux) {
        const dernier = (reste - somme - c.u) < 3;
        const base = copieEv(e);
        if (!premierMorceau) { delete base.dyn; delete base.hp; delete base.slurDeb; delete base.art; delete base.texte; delete base.src; base.cont = true; }
        if (!dernier) { delete base.slurFin; }
        placer({ ...base, u: c.u, val: c.val, pts: c.pts, tup: undefined, silence: !e.hauteurs, lie: e.hauteurs ? (dernier ? !!e.lie : true) : false });
        somme += c.u; premierMorceau = false;
        if (!cur && (reste - somme) >= 3) ouvrir();
      }
      reste -= somme; if (somme < portion) break;
    }
  }
  // on garde une dernière mesure incomplète telle quelle (elle sera complétée par des silences invisibles à la gravure)
  return { mesures, total: t };
}
const copieEv = e => { const c = { ...e }; delete c.ctl; return c; };

// ---------------------------------------------------------------- du modèle aux notes MIDI
// Renvoie { notes: [{ t, d, n, v }] (en temps = noires), temps (longueur en noires, arrondie à la mesure) }.
export function versNotes(partition, { parMesure = 4 } = {}) {
  const notes = []; let fin = 0;
  const decalage = partition.meta.anacrouse ? (longueurMesure(partition.meta.chiffrage) - partition.meta.anacrouse) : 0;
  for (const portee of partition.portees) {
    const evts = aplatir(portee.evts, { deplier: true }); let t = decalage, niveau = 0.8, ouvertes = new Map(), hp = null;
    const lire = e => { if (e.ctl === "partiel") return; };
    // 1re passe : les vitesses. Un hairpin monte ou descend jusqu'à la nuance suivante (ou d'un cran s'il n'y en a pas).
    const evSon = evts.filter(e => !e.ctl && e.u > 0);
    const vit = new Map(); niveau = 0.8; hp = null;
    for (let i = 0; i < evSon.length; i++) {
      const e = evSon[i];
      if (e.dyn && VITESSE_NUANCE[e.dyn] !== undefined) { niveau = VITESSE_NUANCE[e.dyn]; if (hp) hp = null; }
      if (e.hpFin) hp = null;
      if (e.hp === "<" || e.hp === ">") {
        // cherche la fin : la prochaine nuance ou le prochain « \! »
        let j = i + 1, cible = null, n = 1; while (j < evSon.length) { const f = evSon[j]; if (f.dyn && VITESSE_NUANCE[f.dyn] !== undefined) { cible = VITESSE_NUANCE[f.dyn]; break; } if (f.hpFin) { cible = null; break; } if (f.hp === "<" || f.hp === ">") break; j++; n++; }
        if (cible === null) cible = e.hp === "<" ? Math.min(1, niveau + 0.2) : Math.max(0.1, niveau - 0.2);
        hp = { debut: niveau, cible, i0: i, n: Math.max(1, j - i) };
      }
      let v = niveau; if (hp) { const k = (i - hp.i0) / hp.n; v = hp.debut + (hp.cible - hp.debut) * Math.min(1, k); }
      if ((e.art || []).includes("accent") || (e.art || []).includes("marcato")) v = Math.min(1, v + 0.12);
      vit.set(e, v);
    }
    let dernierVit = 0.8;
    for (const e of evts) {
      if (e.ctl || e.u <= 0) continue;
      const u = e.u, v = vit.get(e) ?? dernierVit; dernierVit = v;
      if (e.hauteurs) {
        const staccato = (e.art || []).includes("staccato") || (e.art || []).includes("staccatissimo");
        const nouvelles = new Map();
        for (const p of e.hauteurs) {
          const n = midiDe(p); let note = null;
          if (ouvertes.has(n)) { note = ouvertes.get(n); note.d += u / U_NOIRE; }
          else { note = { t: t / U_NOIRE, d: u / U_NOIRE, n, v: Math.round(v * 100) / 100 }; notes.push(note); }
          nouvelles.set(n, { note, pourDuree: staccato });
          if (e.lie) { /* la note continue */ } else { if (staccato) note.d = Math.max(1 / 16, note.d - (u / U_NOIRE) * 0.5); }
        }
        ouvertes = e.lie ? new Map([...nouvelles].map(([n, o]) => [n, o.note])) : new Map();
      } else ouvertes = new Map();
      t += u;
    }
    fin = Math.max(fin, t);
  }
  notes.sort((a, b) => a.t - b.t || a.n - b.n);
  const finTemps = fin / U_NOIRE, temps = Math.max(parMesure, Math.ceil(finTemps / parMesure - 1e-9) * parMesure);
  return { notes, temps };
}

// ---------------------------------------------------------------- des notes MIDI au modèle
// notes : [{ t, d, n, v }] en temps (noires). options : { chiffrage: [4, 4], quintes: 0, mode: "major", cle: "treble" | "bass" | "alto" | "tenor" | "piano", temps }.
export function depuisNotes(notes, { chiffrage = [4, 4], quintes = 0, mode = "major", cle = "treble", temps = null, tempo = null } = {}) {
  const meta = { chiffrage: chiffrage.slice(), quintes, mode, cle: cle === "piano" ? "treble" : cle, piano: cle === "piano" };
  if (tempo) meta.tempo = tempo;
  const propres = (notes || []).filter(x => x && Number.isFinite(x.t) && Number.isFinite(x.d) && Number.isFinite(x.n));
  const groupes = cle === "piano" ? [{ cle: "treble", notes: propres.filter(x => x.n >= 60) }, { cle: "bass", notes: propres.filter(x => x.n < 60) }] : [{ cle: meta.cle, notes: propres }];
  const mes = longueurMesure(chiffrage); let fin = 0; for (const x of propres) fin = Math.max(fin, (x.t + x.d) * U_NOIRE);
  const totalU = Math.max(mes, temps ? temps * U_NOIRE : 0, Math.ceil((fin - 1e-6) / mes) * mes);
  const triolets = detecterTriolets(propres, totalU);
  const portees = groupes.map(g => ({ cle: g.cle, evts: evenements(g.notes, totalU, triolets, meta) }));
  if (cle === "piano") { /* les deux portées partagent l'armure et le chiffrage */ }
  return { meta, portees };
}

// Quantification : chaque temps (noire) est « binaire » (grille de la double croche, ou de la triple croche si tout y tombe exactement) ou « triolet » (grille de la croche de triolet).
function detecterTriolets(notes, totalU) {
  const bornes = []; let exact = true;
  for (const x of notes) for (const r of [x.t * U_NOIRE, (x.t + x.d) * U_NOIRE]) { bornes.push(r); if (Math.abs(r - Math.round(r / 3) * 3) > 0.02 && Math.abs(r - Math.round(r / 8) * 8) > 0.02) exact = false; }
  const g = exact ? 3 : 6, trio = new Set();
  const nb = Math.ceil(totalU / U_NOIRE);
  for (let k = 0; k < nb; k++) {
    const a = k * U_NOIRE, b = a + U_NOIRE, dedans = bornes.filter(r => r > a + 1.5 && r < b - 1.5); if (!dedans.length) continue;
    const e2 = dedans.reduce((s, r) => s + Math.abs(r - (a + Math.round((r - a) / g) * g)), 0), e3 = dedans.reduce((s, r) => s + Math.abs(r - (a + Math.round((r - a) / 8) * 8)), 0);
    const seTrouve = dedans.some(r => { const q = Math.round((r - a) / 8) * 8; return q % 6 !== 0 && q !== 0 && q !== U_NOIRE; });
    if (e3 < e2 - 0.5 && seTrouve) trio.add(k);
  }
  trio.grille = g; return trio;
}
function quant(r, triolets) {
  const g = triolets.grille, k = Math.floor(r / U_NOIRE + 1e-9), a = k * U_NOIRE;
  if (triolets.has(k)) return a + Math.round((r - a) / 8) * 8;
  return Math.round(r / g) * g;
}

function evenements(notes, totalU, triolets, meta) {
  const g = triolets.grille;
  // 1. les notes en unités, calées
  const ns = [];
  for (const x of notes) {
    let a = quant(x.t * U_NOIRE, triolets), b = quant((x.t + x.d) * U_NOIRE, triolets); if (b <= a) b = a + g; if (a >= totalU) continue; b = Math.min(b, totalU);
    ns.push({ a, b, n: x.n, v: Number.isFinite(x.v) ? x.v : 0.8 });
  }
  // 2. les bornes : début et fin de chaque note, plus les bornes des temps de triolet
  const bornes = new Set([0, totalU]); for (const x of ns) { bornes.add(x.a); bornes.add(x.b); }
  const nb = Math.ceil(totalU / U_NOIRE); for (let k = 0; k < nb; k++) if (triolets.has(k)) { bornes.add(k * U_NOIRE); bornes.add(Math.min(totalU, (k + 1) * U_NOIRE)); }
  const mes = longueurMesure(meta.chiffrage); for (let m = 0; m <= totalU; m += mes) bornes.add(m);
  const ordre = [...bornes].filter(b => b >= 0 && b <= totalU).sort((p, q) => p - q);
  // 3. une tranche entre deux bornes : les notes qui la couvrent
  const evts = []; let idTup = 0, nuancePrec = null, vitessePrec = null, dernierVit = null, premierSon = true, groupeTup = null;
  for (let i = 0; i < ordre.length - 1; i++) {
    const a = ordre[i], b = ordre[i + 1], u = b - a; if (u <= 0) continue;
    const actives = ns.filter(x => x.a <= a && x.b >= b).sort((p, q) => p.n - q.n);
    const k = Math.floor(a / U_NOIRE + 1e-9), tri = triolets.has(k) && Math.floor((b - 1e-9) / U_NOIRE) === k;
    let tup = null; if (tri) { if (!groupeTup || groupeTup.k !== k) groupeTup = { k, id: ++idTup }; tup = { id: groupeTup.id, num: 3, den: 2 }; }
    const e = { u };
    if (tup && valeurDeUnites(u, tup)) e.tup = tup;
    if (actives.length) {
      e.hauteurs = actives.map(x => ecrireMidi(x.n, meta.quintes));
      e.suites = actives.map(x => x);                          // pour calculer les liaisons ci-dessous
      const debutantes = actives.filter(x => x.a === a); const vs = (debutantes.length ? debutantes : actives).map(x => x.v);
      if (debutantes.length) { const v = vs.reduce((s, x) => s + x, 0) / vs.length, niv = nuanceDeVitesse(v); if (premierSon) { if (niv !== "mf") e.dyn = niv; nuancePrec = niv; vitessePrec = v; premierSon = false; } else if (niv !== nuancePrec && Math.abs(v - vitessePrec) >= 0.1) { e.dyn = niv; nuancePrec = niv; vitessePrec = v; } }
    }
    evts.push(e);
  }
  // 4. les liaisons : une note qui continue dans la tranche suivante
  for (let i = 0; i < evts.length - 1; i++) {
    const e = evts[i], f = evts[i + 1]; if (!e.suites || !f.suites) continue;
    e.lie = e.suites.some(x => f.suites.includes(x));
  }
  for (const e of evts) delete e.suites;
  // 5. les silences et notes qui se suivent à l'identique et sans raison de se couper (même durée de mesure) restent séparés : la gravure range selon la mesure
  return fusionnerSilences(evts, mes);
}
// Deux silences qui se suivent à l'intérieur d'une même mesure et d'un même temps de triolet : un seul silence (ex. une tranche coupée par une borne inutile).
function fusionnerSilences(evts, mes) {
  const out = []; let t = 0;
  for (const e of evts) {
    const p = out[out.length - 1];
    if (p && !p.hauteurs && !e.hauteurs && !p.tup && !e.tup && Math.floor(t / mes) === Math.floor((t - p.u) / mes)) p.u += e.u; else out.push(e);
    t += e.u;
  }
  return out;
}

// La longueur d'une partition en unités (la plus longue des portées).
export const longueurPartition = p => Math.max(0, ...p.portees.map(x => mesurer(x, p.meta).total));

// Devine la tonalité d'un clip (profils de Krumhansl et Kessler, pondérés par les durées). Renvoie { quintes, mode } ; do majeur s'il n'y a pas assez de notes.
const PROFIL_MAJEUR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88], PROFIL_MINEUR = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
const QUINTES_MAJEURES = [0, -5, 2, -3, 4, -1, 6, 1, -4, 3, -2, 5];   // do, ré♭, ré, mi♭, mi, fa, fa♯, sol, la♭, la, si♭, si
export function devinerTonalite(notes) {
  const h = new Array(12).fill(0); let n = 0; for (const x of notes || []) { h[((x.n % 12) + 12) % 12] += Math.max(0.1, x.d); n++; }
  if (n < 3) return { quintes: 0, mode: "major" };
  const cor = (p, t) => { let sx = 0, sy = 0, sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < 12; i++) { const a = h[(i + t) % 12], b = p[i]; sx += a; sy += b; sxy += a * b; sxx += a * a; syy += b * b; } const d = Math.sqrt((12 * sxx - sx * sx) * (12 * syy - sy * sy)); return d ? (12 * sxy - sx * sy) / d : -1; };
  let meilleur = { c: -2, quintes: 0, mode: "major" };
  for (let t = 0; t < 12; t++) { const cM = cor(PROFIL_MAJEUR, t), cm = cor(PROFIL_MINEUR, t); if (cM > meilleur.c) meilleur = { c: cM, quintes: QUINTES_MAJEURES[t], mode: "major" }; if (cm > meilleur.c) meilleur = { c: cm, quintes: QUINTES_MAJEURES[(t + 3) % 12], mode: "minor" }; }
  return { quintes: meilleur.quintes, mode: meilleur.mode };
}
