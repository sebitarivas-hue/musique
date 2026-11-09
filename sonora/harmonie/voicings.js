// Dispositions (voicings) et conduite des voix : plaqué proche, position ouverte (drop 2, drop 3), coquille de jazz, sans fondamentale, et choral à quatre voix
// sans quintes ni octaves parallèles (écriture à la manière des chorals de Bach). Sans DOM : testé dans Node.
import { voicing as proche } from "./theorie.js?v=07dc12c227";
const pc = m => ((m % 12) + 12) % 12;

// Quintes et octaves parallèles entre deux accords successifs : chaque voix est un nombre midi, la même voix à la même place dans les deux accords.
// Une quinte (ou une octave) parallèle : le même couple de voix forme un intervalle de quinte juste (ou d'octave, unisson compris) aux deux accords, et au moins une des deux voix bouge.
export function paralleles(a, b) {
  const res = []; const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const ia = Math.abs(a[j] - a[i]) % 12, ib = Math.abs(b[j] - b[i]) % 12, bougent = a[i] !== b[i] || a[j] !== b[j];
    if (!bougent) continue; if (ia === 7 && ib === 7) res.push({ genre: "quinte", voix: [i, j] }); else if (ia === 0 && ib === 0 && (a[i] !== a[j] || b[i] !== b[j] || true)) { if (!(a[i] === b[i] && a[j] === b[j])) res.push({ genre: "octave", voix: [i, j] }); }
  }
  return res;
}
// Rapport de conduite sur toute une suite d'accords à quatre voix [basse, ténor, alto, soprano] (du grave à l'aigu).
export function analyserConduite(suite) {
  const quintes = [], octaves = [], croisements = [];
  suite.forEach((v, k) => { for (let i = 0; i + 1 < v.length; i++) if (v[i] > v[i + 1]) croisements.push({ accord: k, voix: [i, i + 1] }); if (k) for (const p of paralleles(suite[k - 1], v)) (p.genre === "quinte" ? quintes : octaves).push({ entre: [k - 1, k], voix: p.voix }); });
  return { quintes, octaves, croisements, ok: !quintes.length && !octaves.length && !croisements.length };
}

// Ambitus des quatre voix (midi) : basse mi2 à ré4, ténor do3 à sol4, alto sol3 à ré5, soprano do4 à sol5.
export const AMBITUS = { B: [40, 57], T: [48, 67], A: [55, 74], S: [60, 79] };
function essentiels(accord) {
  const notes = accord.notes, par = []; const vus = new Set();
  for (const n of notes) { const c = pc(n.midi); if (!vus.has(c)) { vus.add(c); par.push(c); } }
  if (par.length <= 4) return par;
  // accord de cinq sons ou plus : on garde la fondamentale, la tierce (ou la quarte), la septième et l'extension la plus haute ; la quinte s'omet.
  const classes = notes.map(n => pc(n.midi)), r = classes[0], garde = [r]; const bytes = notes.slice(1);
  const tierce = bytes.find(n => n.nombre === 3 || n.nombre === 4 || n.nombre === 2), sept = bytes.find(n => n.nombre === 7 || n.nombre === 6), haute = [...bytes].reverse().find(n => n.nombre >= 9 && n !== sept && n !== tierce);
  for (const n of [tierce, sept, haute]) if (n && !garde.includes(pc(n.midi))) garde.push(pc(n.midi));
  for (const n of bytes) if (garde.length < 4 && !garde.includes(pc(n.midi))) garde.push(pc(n.midi));
  return garde;
}
function candidats(accord, { inversions = true } = {}) {
  const ess = essentiels(accord), racine = pc(accord.notes[0].midi), tous = accord.notes.map(n => pc(n.midi)), out = [];
  const tierce = accord.notes.find(n => n.nombre === 3), classeTierce = tierce ? pc(tierce.midi) : null;
  const dans = (v, c) => { const r = []; for (let m = AMBITUS[v][0]; m <= AMBITUS[v][1]; m++) if (c.includes(pc(m))) r.push(m); return r; };
  const basses = dans("B", inversions ? [racine, ...(ess.filter(c => c === classeTierce))] : [racine]);
  for (const b of basses) for (const t of dans("T", ess.concat(tous.filter(c => ess.length < 3)))) { if (t <= b) continue; for (const a of dans("A", ess)) { if (a <= t || a - t > 12) continue; for (const s of dans("S", ess)) {
    if (s <= a || s - a > 12) continue; const present = new Set([pc(b), pc(t), pc(a), pc(s)]); if (!ess.every(c => present.has(c))) continue; out.push([b, t, a, s]); } } }
  return out;
}
const penaliteAccord = (v, accord) => {
  let p = 0; const racine = pc(accord.notes[0].midi), tierce = accord.notes.find(n => n.nombre === 3), cT = tierce ? pc(tierce.midi) : null;
  const doublures = {}; for (const m of v) doublures[pc(m)] = (doublures[pc(m)] || 0) + 1;
  if (cT !== null && doublures[cT] > 1) p += 6;               // on ne double pas la tierce
  if (pc(v[0]) !== racine) p += 3;                            // renversement : un peu moins stable
  const sensible = accord.notes.find(n => n.nombre === 7 && n.demitons === 11); if (sensible && doublures[pc(sensible.midi)] > 1) p += 8;
  p += Math.abs(v[3] - 67) * 0.08;                            // soprano proche de sol4
  return p;
};
function coutTransition(a, b) {
  let c = 0; const d = [0, 1, 2, 3].map(i => Math.abs(b[i] - a[i]));
  c += d[1] + d[2] + d[3] + d[0] * 0.5;
  for (const i of [1, 2]) { if (d[i] > 4) c += 3; if (d[i] > 7) c += 8; } if (d[3] > 7) c += 5;
  const communs = [1, 2, 3].filter(i => d[i] === 0).length; c -= communs * 1.5;
  const sens = Math.sign(b[3] - a[3]), sensB = Math.sign(b[0] - a[0]); if (sens !== 0 && sens === sensB && d[3] > 2 && d[0] > 2) c += 10;   // quintes ou octaves cachées entre voix extrêmes
  return c;
}
// Harmonise une suite d'accords à quatre voix par programmation dynamique : les transitions avec quinte ou octave parallèle sont exclues.
export function choral(accords, { inversions = true } = {}) {
  const cand = accords.map(a => candidats(a, { inversions })); if (cand.some(c => !c.length)) throw new Error("aucune disposition à quatre voix pour cet accord");
  let tab = cand[0].map(v => ({ v, c: penaliteAccord(v, accords[0]) + Math.abs(v[0] - 48) * 0.1, prec: -1 })); const histoire = [tab];
  for (let k = 1; k < accords.length; k++) {
    const nouveau = cand[k].map(v => { let meilleur = null, bi = -1, bc = Infinity, secours = null, si = -1, sc = Infinity;
      tab.forEach((p, i) => { const par = paralleles(p.v, v).length, c = p.c + coutTransition(p.v, v); if (!par) { if (c < bc) { bc = c; bi = i; } } else if (c + 1000 < sc) { sc = c + 1000; si = i; } });
      const i = bi >= 0 ? bi : si, base = bi >= 0 ? bc : sc; return { v, c: base + penaliteAccord(v, accords[k]), prec: i }; });
    tab = nouveau; histoire.push(tab);
  }
  let i = tab.reduce((m, x, j) => (x.c < tab[m].c ? j : m), 0); const suite = [];
  for (let k = accords.length - 1; k >= 0; k--) { const e = histoire[k][i]; suite.unshift(e.v); i = e.prec; }
  return suite.map((v, k) => ({ basse: v[0], voix: [v[1], v[2], v[3]], satb: { B: v[0], T: v[1], A: v[2], S: v[3] }, accord: accords[k] }));
}

// ---------------------------------------------------------------- autres dispositions
export const DISPOSITIONS = [
  { id: "proche", nom: "Plaqué, voix proches", texte: "Chaque accord se place au plus près du précédent." },
  { id: "choral", nom: "Choral à quatre voix (Bach)", texte: "Soprano, alto, ténor, basse ; aucune quinte ni octave parallèle, voix qui bougent peu." },
  { id: "ouverte", nom: "Position ouverte (drop 2)", texte: "La deuxième voix en partant du haut descend d'une octave : un son plus large." },
  { id: "drop3", nom: "Drop 3", texte: "La troisième voix en partant du haut descend d'une octave : encore plus ouvert." },
  { id: "coquille", nom: "Coquille de jazz (tierce et septième)", texte: "Seules la tierce et la septième : le minimum pour entendre la couleur de l'accord." },
  { id: "sansfond", nom: "Sans fondamentale (jazz)", texte: "Tierce, quinte, septième, neuvième : la basse joue la fondamentale, la main droite l'accord sans elle." },
];
export function disposer(accords, mode = "proche") {
  if (mode === "choral") return choral(accords);
  const base = proche(accords);
  if (mode === "proche") return base;
  if (mode === "ouverte" || mode === "drop3") return base.map(v => { const x = [...v.voix].sort((a, b) => a - b), k = x.length - (mode === "ouverte" ? 2 : 3); if (k >= 0 && x.length >= 3) { x[k] -= 12; x.sort((a, b) => a - b); } return { ...v, voix: x }; });
  let prec = null;
  return accords.map(a => {
    const racine = a.notes[0], tierce = a.notes.find(n => n.nombre === 3 || n.nombre === 4 || n.nombre === 2), sept = a.notes.find(n => n.nombre === 7 || n.nombre === 6), quinte = a.notes.find(n => n.nombre === 5), neuf = a.notes.find(n => n.nombre === 9);
    const choix = mode === "coquille" ? [tierce, sept || quinte] : [tierce, quinte, sept, neuf];
    const classes = choix.filter(Boolean).map(n => pc(n.midi)); const alea = [];
    // deux dispositions (commençant par la première ou la dernière note), on garde la plus proche de l'accord précédent, autour de do4 à sol4
    for (let d = 0; d < classes.length; d++) { const v = []; let m = 60 + ((classes[d] - 60) % 12 + 12) % 12; for (let k = 0; k < classes.length; k++) { let x = 48 + ((classes[(d + k) % classes.length] - 48) % 12 + 12) % 12; while (x < 55 && k === 0) x += 12; while (v.length && x <= v[v.length - 1]) x += 12; v.push(x); } alea.push(v); }
    const cout = v => prec ? v.reduce((s, x, i) => s + Math.abs(x - (prec[i] ?? prec[prec.length - 1])), 0) : Math.abs(v[0] - 60), ch = alea.sort((x, y) => cout(x) - cout(y))[0]; prec = ch;
    const basse = 36 + pc(racine.midi) < 40 ? 48 + pc(racine.midi) : 36 + pc(racine.midi);
    return { basse, voix: ch, accord: a };
  });
}
