// Les morceaux de départ du mode blocs de SONORA Pistes : six petits morceaux de huit mesures, écrits comme un compositeur les écrirait.
// Ce ne sont pas des motifs recopiés : chaque morceau a son tempo, son swing, son harmonie (accords à neuvième, treizième, emprunts au mode mineur), ses voix qui se suivent d'un accord à l'autre,
// une basse qui prépare l'accord suivant, une batterie avec des notes fantômes et des relances, des mélodies écrites mesure par mesure sur les accords, et un relief (deux sections, des nuances).
// Toutes les notes sont écrites en do (do majeur, ou do mineur) ; la tonalité choisie les transpose, sauf la batterie. Tout est déterministe : le même morceau est toujours le même.
// Sans DOM : testé dans Node (tests/compositeur.test.js), y compris la cohérence harmonique (la basse joue la fondamentale, la mélodie reste dans l'accord sur les temps forts).

// ---------------------------------------------------------------- outils d'écriture
const r3 = x => Math.round(x * 1000) / 1000;
const borne = (x, a, b) => Math.max(a, Math.min(b, x));
const nt = (t, d, n, v) => ({ t: r3(t), d: r3(d), n, v: r3(borne(v, 0.05, 1)) });
// Un petit générateur pseudo-aléatoire déterministe : l'humanisation est la même à chaque fois.
function alea(graine) { let s = graine >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
// Le swing : les croches du contretemps (et les doubles croches impaires) sont retardées ; a8 en temps (0,1 = swing léger, 0,17 = presque ternaire).
const swing = (t, a8, a16 = a8 * 0.5) => { const f = t - Math.floor(t); if (Math.abs(f - 0.5) < 1e-6) return t + a8; if (Math.abs(f - 0.25) < 1e-6 || Math.abs(f - 0.75) < 1e-6) return t + a16; return t; };
// Humaniser : un léger écart de placement et de force, tiré au sort mais toujours le même ; les notes restent dans la mesure (4 temps).
function vivant(notes, graine, { placement = 0.012, force = 0.05, temps = 4 } = {}) {
  const a = alea(graine);
  return notes.map(x => { const t = borne(x.t + (a() - 0.5) * 2 * placement, 0, temps - 0.05), v = x.v + (a() - 0.5) * 2 * force; return nt(t, Math.min(x.d, temps - t - 0.005), x.n, v); });
}
// Un accord « roulé » : les notes partent de la plus grave, à quelques centièmes de temps l'une de l'autre ; la plus haute est un peu plus forte (la voix qui chante).
const roule = (voix, t, d, v, ecart = 0.028) => voix.map((n, i) => nt(t + i * ecart, d - i * ecart, n, v + (i === voix.length - 1 ? 0.05 : 0) - (i === 0 ? 0.03 : 0)));
const plaque = (voix, t, d, v) => voix.map((n, i) => nt(t, d, n, v + (i === voix.length - 1 ? 0.06 : 0)));
const octave = (notes, o) => notes.map(x => ({ ...x, n: x.n + 12 * o }));

// Les pièces de batterie (numéros généraux)
const K = 36, S = 38, RIM = 37, CLAP = 39, HF = 42, HO = 46, TB = 41, TM = 45, TH = 48, CRASH = 49, RIDE = 51, SHK = 70;

// `niveau` : le niveau général du morceau (il multiplie le volume de chaque ligne) : une ballade n'a pas à être aussi forte qu'une house, et le Son pro compresse moins ce qui est plus doux, donc garde ses nuances.
// Un segment d'harmonie : { t, len, nom, fond (la basse, en MIDI), voix (la main droite), pcs (les classes de hauteur admises sur les temps forts) }.
const seg = (nom, fond, voix, pcs, len = 4, t = 0) => ({ t, len, nom, fond, voix, pcs: pcs.map(x => ((x % 12) + 12) % 12) });
// L'accord qui sonne à l'instant t d'une mesure (une mesure peut porter deux accords).
const segDe = (mesure, t) => mesure.find(s => t >= s.t - 1e-9 && t < s.t + s.len - 1e-9) || mesure[mesure.length - 1];
const suivantDe = (harmonie, k) => harmonie[(k + 1) % harmonie.length][0];
// Une note d'approche chromatique vers la fondamentale suivante, par en dessous si la basse monte, par au-dessus si elle descend.
const approche = (fond, suivant) => suivant >= fond ? suivant - 1 : suivant + 1;
// Prend dans un motif de rythme [t, d, v, pousse?] les accords sous les notes ; « pousse » : l'accord de la mesure suivante est annoncé en avance (une anticipation).
function comping(harmonie, k, cellule, jouer) {
  const out = []; for (const [t, d, v, pousse] of cellule) { const s = pousse ? suivantDe(harmonie, k) : segDe(harmonie[k], t); out.push(...jouer(s, t, d, v)); } return out;
}
const mesures8 = f => Array.from({ length: 8 }, (_, k) => f(k));

// ================================================================ 1. LO-FI : Rhodes et vibraphone, 76 par minute, swing léger
function lofi() {
  const H = [
    [seg("Ré mineur 9", 38, [53, 57, 60, 64], [2, 5, 9, 0, 4])], [seg("Sol 13", 43, [53, 59, 64, 69], [7, 11, 2, 5, 9, 4])],
    [seg("Do majeur 9", 36, [52, 55, 59, 62], [0, 4, 7, 11, 2])], [seg("La 7 (b13)", 45, [55, 61, 65, 69], [9, 1, 4, 7, 5])],
    [seg("Fa majeur 9", 41, [57, 60, 64, 67], [5, 9, 0, 4, 7, 2])], [seg("Fa mineur 9 (emprunt)", 41, [56, 60, 63, 67], [5, 8, 0, 3, 7, 2])],
    [seg("Mi mineur 7", 40, [55, 59, 62, 66], [4, 7, 11, 2, 6])], [seg("La 7 (b13)", 45, [55, 61, 65, 69], [9, 1, 4, 7, 5])],
  ];
  const cellules = [
    [[0, 1.25, 0.62], [1.75, 0.5, 0.46], [2.5, 1.4, 0.58]], [[0, 1.0, 0.6], [1.5, 0.5, 0.45], [2, 0.5, 0.5], [3.5, 0.45, 0.55, true]],
    [[0, 1.5, 0.64], [2.5, 0.75, 0.5], [3.5, 0.45, 0.55, true]], [[0, 3.6, 0.52]],
  ];
  const ordre = [0, 1, 0, 3, 2, 1, 0, 3];
  const accords = mesures8(k => vivant(comping(H, k, cellules[ordre[k]], (s, t, d, v) => roule(s.voix, t, d, v * (0.9 + 0.1 * (k > 3)))), 100 + k));
  const basse = mesures8(k => {
    const s = H[k][0], r = s.fond, suiv = suivantDe(H, k).fond, ap = approche(r, suiv);
    const n = k % 2 === 0
      ? [nt(0, 1.4, r, 0.72), nt(1.5, 0.4, r, 0.5), nt(2.5, 0.8, r + 7, 0.6), nt(3.5, 0.4, ap, 0.58)]
      : [nt(0, 1.9, r, 0.74), nt(2, 0.4, r + 12, 0.5), nt(2.75, 0.5, r + 7, 0.55), nt(3.5, 0.4, ap, 0.58)];
    return vivant(n, 200 + k, { placement: 0.008, force: 0.04 });
  });
  const batterie = mesures8(k => {
    const B = k >= 4, n = [], a = 0.1, ghost = (t, v) => n.push(nt(swing(t, a), 0.2, S, v));
    n.push(nt(0, 0.3, K, 0.95)); n.push(nt(swing(1.75, a), 0.3, K, 0.62)); n.push(nt(2.5, 0.3, K, k % 2 ? 0.7 : 0.85));
    n.push(nt(1.02, 0.3, S, 0.82), nt(3.02, 0.3, S, 0.8)); if (k % 2) n.push(nt(1.02, 0.3, RIM, 0.35));
    ghost(2.75, 0.26); if (k === 3 || k === 7) { ghost(3.25, 0.3); ghost(3.75, 0.45); }
    const v8 = [0.55, 0.32, 0.45, 0.32, 0.5, 0.32, 0.45, 0.32];
    for (let i = 0; i < 8; i++) { const t = i / 2; if ((k === 3 || k === 7) && t >= 3.5) continue; n.push(nt(swing(t, a), 0.25, B ? RIDE : HF, v8[i] * (B ? 0.85 : 1))); }
    if (k === 3) n.push(nt(3.5, 0.4, HO, 0.5));
    if (k === 7) { n.push(nt(3.5, 0.3, TM, 0.6), nt(3.75, 0.3, TB, 0.7), nt(3.875, 0.3, TB, 0.55)); }
    return vivant(n, 300 + k, { placement: 0.014, force: 0.06 });
  });
  const mel = [
    [nt(0.5, 0.75, 76, 0.62), nt(1.5, 0.5, 74, 0.55), nt(2, 1.0, 72, 0.6), nt(3, 0.9, 69, 0.55)],
    [nt(0.5, 0.5, 71, 0.55), nt(1, 0.5, 69, 0.5), nt(1.5, 0.5, 67, 0.5), nt(2, 1.0, 65, 0.58), nt(3, 0.9, 64, 0.56)],
    [nt(0, 1.5, 64, 0.66), nt(2, 0.5, 67, 0.5), nt(2.5, 0.5, 71, 0.52), nt(3, 0.9, 74, 0.6)],
    [nt(0, 0.9, 73, 0.6), nt(1, 0.4, 72, 0.5), nt(1.5, 0.4, 69, 0.48), nt(2, 0.9, 65, 0.56), nt(3, 0.9, 64, 0.52)],
    [nt(0, 1.0, 69, 0.62), nt(1, 0.5, 72, 0.52), nt(1.5, 1.0, 76, 0.68), nt(2.5, 0.5, 74, 0.5), nt(3, 0.9, 72, 0.55)],
    [nt(0, 1.4, 68, 0.64), nt(1.5, 0.5, 67, 0.5), nt(2, 0.9, 65, 0.58), nt(3, 0.9, 63, 0.55)],
    [nt(0, 1.0, 62, 0.58), nt(1, 0.5, 64, 0.5), nt(1.5, 0.5, 67, 0.52), nt(2, 1.5, 71, 0.66)],
    [nt(0, 0.5, 73, 0.58), nt(0.5, 0.5, 76, 0.55), nt(1, 1.5, 77, 0.66), nt(3, 0.9, 76, 0.6)],
  ].map((m, k) => vivant(m.map(x => ({ ...x, t: swing(x.t, 0.07) })), 400 + k, { placement: 0.01, force: 0.04 }));
  return {
    id: "mod-lofi", niveau: 0.4, temps: 4, nom: "Lo-fi : Rhodes et vibraphone", tempo: 76, mesures: 8,
    aide: "Huit mesures à 76 par minute. Le Rhodes joue des accords à neuvième qui glissent d'un accord à l'autre en bougeant le moins possible ; la quatrième mesure prépare le retour et la sixième emprunte le fa mineur au mode mineur, pour une couleur douce-amère. La batterie a un swing léger, des notes fantômes et une relance à la fin de chaque moitié.",
    harmonie: H,
    lignes: [
      { nom: "Batterie", instrument: "batt:jazz", volume: 0.8, mesures: batterie },
      { nom: "Basse", instrument: "ech:basse-moderne", volume: 0.62, mesures: basse, role: "basse" },
      { nom: "Rhodes", instrument: "ech:rhodes", volume: 0.62, mesures: accords, role: "accords" },
      { nom: "Vibraphone", instrument: "ech:vibraphone", volume: 0.6, mesures: mel, role: "melodie" },
    ],
  };
}

// ================================================================ 2. HOUSE profonde : 122 par minute, do mineur
function house() {
  const cm = seg("Do mineur 9", 36, [51, 55, 58, 62], [0, 3, 7, 10, 2]), ab = seg("La bémol majeur 7", 32, [56, 60, 63, 67], [8, 0, 3, 7]),
    fm = seg("Fa mineur 9", 41, [53, 56, 60, 63, 67], [5, 8, 0, 3, 7]), g = seg("Sol 7 sus4 (b9)", 31, [55, 60, 62, 65], [7, 0, 2, 5, 8]);
  const H = [[cm], [ab], [fm], [g], [cm], [ab], [fm], [g]];
  const stab = [[[0.5, 0.3, 0.7], [1.75, 0.25, 0.55], [2.5, 0.3, 0.7], [3.5, 0.25, 0.6]], [[0.5, 0.3, 0.7], [1.5, 0.25, 0.55], [2.75, 0.3, 0.65]]];
  const accords = mesures8(k => vivant(comping(H, k, stab[k % 2], (s, t, d, v) => plaque(s.voix, t, d, v)), 500 + k, { placement: 0.006, force: 0.05 }));
  const nappe = mesures8(k => k < 4 ? [] : H[k][0].voix.map(n => nt(0, 3.9, n, 0.38 + 0.02 * (k - 4))));
  const basse = mesures8(k => {
    const r = H[k][0].fond, suiv = suivantDe(H, k).fond, n = k % 2
      ? [nt(0.5, 0.35, r, 0.85), nt(1.5, 0.35, r, 0.8), nt(2.25, 0.2, r, 0.6), nt(2.5, 0.35, r + 12, 0.8), nt(3.5, 0.3, k === 7 ? approche(r, suiv) : r, 0.8)]
      : [nt(0.5, 0.35, r, 0.85), nt(1.5, 0.35, r, 0.8), nt(2.5, 0.35, r, 0.85), nt(3.5, 0.35, r, 0.8)];
    return vivant(n, 600 + k, { placement: 0.004, force: 0.04 });
  });
  const batterie = mesures8(k => {
    const n = [], fin = k === 3 || k === 7;
    for (let b = 0; b < 4; b++) n.push(nt(b, 0.3, K, 0.95));
    for (const b of [1, 3]) n.push(nt(b, 0.3, CLAP, fin && b === 3 ? 0.5 : 0.85));
    for (let b = 0; b < 4; b++) n.push(nt(b + 0.5, 0.3, HO, 0.58));
    [0.25, 0.75, 1.25, 1.75, 2.25, 2.75, 3.25, 3.75].forEach((t, i) => n.push(nt(t, 0.12, k >= 4 ? SHK : HF, 0.22 + 0.1 * (i % 2 === 0))));
    if (k === 0 || k === 4) n.push(nt(0, 0.9, CRASH, 0.6));
    if (k >= 4) for (const t of [0.5, 1.5, 2.5, 3.5]) n.push(nt(t, 0.2, RIDE, 0.3));
    if (fin) [3, 3.25, 3.5, 3.625, 3.75, 3.875].forEach((t, i) => n.push(nt(t, 0.15, CLAP, 0.4 + 0.1 * i)));
    return vivant(n, 700 + k, { placement: 0.004, force: 0.05 });
  });
  const crochet = [[0, 67], [0.75, 70], [1.5, 72], [2.25, 70], [3, 67], [3.5, 63]], ab_ = [[0, 68], [0.75, 72], [1.5, 75], [2.25, 72], [3, 68], [3.5, 67]],
    fm_ = [[0, 65], [0.75, 68], [1.5, 72], [2.25, 75], [3, 72], [3.5, 68]], g_ = [[0, 67], [0.75, 72], [1.5, 74], [2.25, 72], [3, 67], [3.5, 65]];
  const motifs = [crochet, ab_, fm_, g_, crochet, ab_, fm_, null];
  const hook = mesures8(k => {
    if (k === 7) return [[0, 67], [0.5, 70], [1, 72], [1.5, 74], [2, 75], [2.5, 77], [3, 79]].map(([t, n]) => nt(t, 0.2, n, 0.55 + t * 0.06));
    return vivant(motifs[k].map(([t, n], i) => nt(t, 0.2, n + (k >= 4 ? 12 : 0), i % 2 ? 0.45 : 0.62)), 800 + k, { placement: 0.004, force: 0.04 });
  });
  return {
    id: "mod-house", niveau: 0.9, temps: 4, nom: "House profonde", tempo: 122, mesures: 8,
    aide: "Huit mesures à 122 par minute en do mineur. Grosse caisse à chaque temps, charleston ouvert sur les contretemps, accords de synthé frappés à contre-temps et une basse qui joue entre les coups de grosse caisse. À la mesure 5, une nappe et un cymbale s'ajoutent, le motif du Rhodes monte d'une octave ; une montée de claps annonce chaque retour.",
    harmonie: H,
    lignes: [
      { nom: "Batterie", instrument: "batt:club", volume: 0.82, mesures: batterie },
      { nom: "Basse", instrument: "syn:sub", volume: 0.5, mesures: basse, role: "basse" },
      { nom: "Accords", instrument: "ech:synthe", volume: 0.5, mesures: accords, role: "accords" },
      { nom: "Nappe", instrument: "syn:nappe", volume: 0.4, mesures: nappe, role: "accords" },
      { nom: "Motif", instrument: "ech:rhodes", volume: 0.55, mesures: hook, role: "melodie" },
    ],
  };
}

// ================================================================ 3. BOOM-BAP : 88 par minute, do mineur, descente andalouse
function boombap() {
  const cm7 = seg("Do mineur 7", 36, [48, 55, 58, 63], [0, 3, 7, 10, 2]), bb = seg("Si bémol majeur", 34, [46, 53, 58, 62], [10, 2, 5, 0]),
    ab = seg("La bémol majeur 7", 32, [44, 55, 60, 63], [8, 0, 3, 7, 2]), g7 = seg("Sol 7 (b9)", 31, [43, 53, 59, 62, 68], [7, 11, 2, 5, 8]),
    fm9 = seg("Fa mineur 9", 41, [41, 51, 56, 60, 67], [5, 8, 0, 3, 7, 2]), cm9 = seg("Do mineur 9", 36, [48, 55, 58, 62], [0, 3, 7, 10, 2]);
  const H = [[cm7], [bb], [ab], [g7], [fm9], [cm9], [ab], [g7]];
  const cell = [[[0, 1.6, 0.7], [2.5, 1.4, 0.6]], [[0, 1.25, 0.7], [1.75, 0.5, 0.5], [3, 0.9, 0.58]]];
  const piano = mesures8(k => vivant(comping(H, k, cell[k % 2], (s, t, d, v) => roule(s.voix, t, d, v + (k >= 4 ? 0.04 : 0), 0.035)), 900 + k, { placement: 0.015, force: 0.06 }));
  const basse = mesures8(k => {
    const r = H[k][0].fond, ap = approche(r, suivantDe(H, k).fond);
    const n = [nt(0, 1.9, r, 0.82), nt(2.25, 0.4, r, 0.5), nt(2.75, 0.4, r + 12, 0.55), nt(3.5, 0.4, k % 2 ? ap : r + 7, 0.6)];
    return vivant(n, 1000 + k, { placement: 0.01, force: 0.05 });
  });
  const batterie = mesures8(k => {
    const n = [], a = 0.12, fin = k === 3 || k === 7;
    n.push(nt(0, 0.3, K, 0.96)); n.push(nt(swing(1.75, a), 0.3, K, 0.72)); n.push(nt(k % 2 ? 2.75 : 2.5, 0.3, K, 0.82));
    n.push(nt(1.03, 0.3, S, 0.9), nt(3.03, 0.3, S, 0.88)); n.push(nt(swing(2.25, a), 0.2, S, 0.25)); if (k % 2) n.push(nt(swing(0.75, a), 0.2, S, 0.22));
    const v8 = [0.6, 0.32, 0.46, 0.34, 0.55, 0.32, 0.46, 0.34];
    for (let i = 0; i < 8; i++) { const t = i / 2; if (fin && t >= 3.5) continue; n.push(nt(swing(t, a), 0.25, HF, v8[i])); }
    if (k === 7) { n.push(nt(3.5, 0.2, S, 0.4), nt(3.75, 0.2, S, 0.55), nt(3.875, 0.2, S, 0.7)); } else if (k === 3) n.push(nt(3.5, 0.4, HO, 0.5));
    if (k === 4) n.push(nt(0, 0.8, CRASH, 0.55));
    return vivant(n, 1100 + k, { placement: 0.016, force: 0.07 });
  });
  const A = [
    [nt(0.5, 1.0, 67, 0.7), nt(1.5, 0.5, 70, 0.6), nt(2, 1.25, 72, 0.7), nt(3.5, 0.4, 70, 0.55)],
    [nt(0, 1.5, 74, 0.72), nt(1.5, 0.5, 72, 0.6), nt(2, 1.5, 70, 0.66)],
    [nt(0, 1.0, 68, 0.68), nt(1, 0.5, 72, 0.6), nt(1.5, 1.5, 75, 0.74), nt(3, 0.9, 74, 0.6)],
    [nt(0, 0.9, 71, 0.68), nt(1, 0.5, 68, 0.6), nt(1.5, 1.0, 67, 0.66), nt(2.5, 0.5, 65, 0.55), nt(3, 0.9, 62, 0.6)],
    [nt(0, 1.5, 68, 0.7), nt(1.5, 0.5, 72, 0.6), nt(2, 1.0, 75, 0.7), nt(3, 0.9, 77, 0.74)],
    [nt(0, 1.5, 75, 0.72), nt(1.5, 0.5, 74, 0.6), nt(2, 1.9, 72, 0.7)],
    [nt(0, 0.5, 72, 0.62), nt(0.5, 0.5, 75, 0.62), nt(1, 1.5, 79, 0.76), nt(3, 0.9, 75, 0.6)],
    [nt(0, 0.5, 74, 0.66), nt(0.5, 0.5, 71, 0.6), nt(1, 0.5, 68, 0.6), nt(1.5, 1.0, 67, 0.68)],
  ];
  const mel = A.map((m, k) => vivant(m.map(x => ({ ...x, t: swing(x.t, 0.08) })), 1200 + k, { placement: 0.012, force: 0.05 }));
  return {
    id: "mod-boombap", niveau: 0.55, temps: 4, nom: "Boom-bap : sax ténor et piano", tempo: 88, mesures: 8,
    aide: "Huit mesures à 88 par minute en do mineur, sur la descente do, si bémol, la bémol, sol (la basse descend d'un degré à chaque mesure et le sol 7 ramène au do). La caisse claire tombe un peu en retard et la grosse caisse esquive le temps : c'est ce qui donne le balancement. Le sax ténor chante une phrase qui répond à elle-même ; la seconde moitié passe par le fa mineur.",
    harmonie: H,
    lignes: [
      { nom: "Batterie", instrument: "batt:hiphop", volume: 0.8, mesures: batterie },
      { nom: "Basse", instrument: "ech:basse-moderne", volume: 0.62, mesures: basse, role: "basse" },
      { nom: "Piano", instrument: "ech:clavier", volume: 0.6, mesures: piano, role: "accords" },
      { nom: "Sax ténor", instrument: "ech:sax-tenor", volume: 0.68, mesures: mel, role: "melodie" },
    ],
  };
}

// ================================================================ 4. BOSSA NOVA : 136 par minute, do majeur, deux accords par mesure
function bossa() {
  const cmaj9 = (len = 4, t = 0) => seg("Do majeur 9", 36, [52, 55, 59, 62], [0, 4, 7, 11, 2], len, t),
    dm9 = (len = 2, t = 0) => seg("Ré mineur 9", 38, [53, 57, 60, 64], [2, 5, 9, 0, 4], len, t), g13 = (t = 2) => seg("Sol 13", 43, [53, 59, 64, 69], [7, 11, 2, 5, 9, 4], 2, t),
    em7 = () => seg("Mi mineur 7", 40, [55, 59, 62, 67], [4, 7, 11, 2], 2, 0), a7 = () => seg("La 7 altéré (#9, b13)", 45, [55, 61, 65, 69], [9, 1, 4, 7, 5, 0], 2, 2),
    g7b9 = () => seg("Sol 7 (b9)", 43, [53, 59, 62, 68], [7, 11, 2, 5, 8], 2, 2), c13 = () => seg("Do 13", 36, [52, 58, 62, 69], [0, 4, 7, 10, 2, 9], 4, 0),
    fmaj9 = () => seg("Fa majeur 9", 41, [57, 60, 64, 67], [5, 9, 0, 4, 7, 2], 2, 0), fm6 = () => seg("Fa mineur 6", 41, [56, 60, 62, 65], [5, 8, 0, 2, 7], 2, 2);
  const H = [[cmaj9()], [dm9(), g13()], [em7(), a7()], [dm9(), g7b9()], [cmaj9()], [c13()], [fmaj9(), fm6()], [dm9(), g13()]];
  const gA = [[0, 0.9, 0.6], [1.5, 0.9, 0.55], [3, 0.9, 0.55]], gB = [[1, 0.9, 0.55], [2.5, 0.9, 0.55], [3.5, 0.4, 0.5]];
  const accords = mesures8(k => vivant(comping(H, k, k % 2 ? gB : gA, (s, t, d, v) => roule(s.voix, t, d, v, 0.02)), 1300 + k, { placement: 0.01, force: 0.05 }));
  const basse = mesures8(k => {
    const n = [], mesure = H[k]; mesure.forEach((s, i) => {
      const suiv = i + 1 < mesure.length ? mesure[i + 1].fond : suivantDe(H, k).fond;
      if (s.len === 4) n.push(nt(s.t, 1.4, s.fond, 0.72), nt(s.t + 1.5, 1.4, s.fond + 7, 0.62), nt(s.t + 3.25, 0.6, approche(s.fond, suiv), 0.55));
      else n.push(nt(s.t, 0.95, s.fond, 0.72), nt(s.t + 1.5, 0.45, i + 1 === mesure.length ? approche(s.fond, suiv) : s.fond + 7, 0.58));
    });
    return vivant(n, 1400 + k, { placement: 0.01, force: 0.04 });
  });
  const batterie = mesures8(k => {
    const n = [], clave = k % 2 ? [1, 2] : [0, 1.5, 3];
    for (const t of clave) n.push(nt(t, 0.3, RIM, 0.62));
    [[0, 0.7], [1.5, 0.45], [2, 0.6], [3.5, 0.45]].forEach(([t, v]) => n.push(nt(t, 0.3, K, v)));
    for (let i = 0; i < 8; i++) n.push(nt(i / 2, 0.2, HF, i % 2 ? 0.24 : (i % 4 === 0 ? 0.52 : 0.38)));
    if (k === 7) { n.push(nt(3.5, 0.2, TM, 0.5), nt(3.75, 0.2, TB, 0.55)); } if (k === 4) n.push(nt(0, 0.8, RIDE, 0.45));
    return vivant(n, 1500 + k, { placement: 0.012, force: 0.06 });
  });
  const M = [
    [nt(0.5, 1.0, 76, 0.66), nt(1.5, 0.5, 79, 0.58), nt(2, 0.5, 76, 0.55), nt(2.5, 0.5, 74, 0.55), nt(3, 0.9, 72, 0.6)],
    [nt(0, 0.9, 74, 0.64), nt(1, 0.9, 77, 0.58), nt(2, 0.9, 76, 0.6), nt(3, 0.9, 74, 0.56)],
    [nt(0, 0.9, 71, 0.62), nt(1, 0.9, 74, 0.58), nt(2, 0.9, 73, 0.6), nt(3, 0.9, 72, 0.56)],
    [nt(0, 0.9, 69, 0.62), nt(1, 0.9, 72, 0.58), nt(2, 0.9, 71, 0.6), nt(3, 0.9, 67, 0.56)],
    [nt(0.5, 1.0, 76, 0.7), nt(1.5, 0.5, 79, 0.6), nt(2, 0.5, 81, 0.58), nt(2.5, 0.5, 79, 0.56), nt(3, 0.9, 76, 0.6)],
    [nt(0, 0.9, 79, 0.64), nt(1, 0.9, 82, 0.6), nt(2, 0.9, 81, 0.62), nt(3, 0.9, 79, 0.56)],
    [nt(0, 0.9, 81, 0.66), nt(1, 0.9, 79, 0.58), nt(2, 0.9, 80, 0.62), nt(3, 0.9, 77, 0.58)],
    [nt(0, 0.9, 74, 0.62), nt(1, 0.9, 77, 0.58), nt(2, 0.9, 76, 0.6), nt(3, 0.9, 79, 0.62)],
  ].map((m, k) => vivant(m, 1600 + k, { placement: 0.012, force: 0.04 }));
  return {
    id: "mod-bossa", niveau: 0.36, temps: 4, nom: "Bossa nova : guitare et flûte", tempo: 136, mesures: 8,
    aide: "Huit mesures à 136 par minute en do majeur, avec deux accords par mesure : ré mineur 9 et sol 13, mi mineur 7 et la 7, comme dans les standards brésiliens. La batterie joue la clave (3 puis 2) à la baguette, la contrebasse alterne fondamentale et quinte, la guitare place ses accords à contretemps. La flûte garde le même contour d'une mesure à l'autre.",
    harmonie: H,
    lignes: [
      { nom: "Percussions", instrument: "batt:perc", volume: 0.72, mesures: batterie },
      { nom: "Contrebasse", instrument: "ech:contrebasse", volume: 0.7, mesures: basse, role: "basse" },
      { nom: "Guitare", instrument: "ech:guitare", volume: 0.6, mesures: accords, role: "accords" },
      { nom: "Flûte", instrument: "ech:souffle", volume: 0.66, mesures: M, role: "melodie" },
    ],
  };
}

// ================================================================ 5. FUNK : 100 par minute, do dorien
function funk() {
  const cm9 = seg("Do mineur 9", 36, [51, 55, 58, 62], [0, 3, 7, 10, 2, 5]), f9 = seg("Fa 9", 41, [57, 60, 63, 67], [5, 9, 0, 3, 7, 2]),
    bb9 = seg("Si bémol 9", 34, [50, 53, 56, 60], [10, 2, 5, 8, 0]), g7s9 = seg("Sol 7 (#9)", 31, [53, 59, 62, 70], [7, 11, 2, 5, 10]);
  const H = [[cm9], [cm9], [f9], [g7s9], [cm9], [bb9], [f9], [g7s9]];
  const grilles = [[0, 3, 6, 8, 11, 14], [0, 2, 3, 6, 8, 10, 13]];
  const accords = mesures8(k => vivant(grilles[k % 2].map((i, j) => [i / 4, i % 4 === 0 ? 0.2 : 0.12, i % 4 === 0 ? 0.76 : (j % 2 ? 0.34 : 0.5)]).flatMap(([t, d, v]) => plaque(segDe(H[k], t).voix, t, d, v)), 1700 + k, { placement: 0.006, force: 0.05 }));
  const basse = mesures8(k => {
    const r = H[k][0].fond, ap = approche(r, suivantDe(H, k).fond);
    const n = [nt(0, 0.22, r, 0.95), nt(0.75, 0.15, r, 0.5), nt(1.5, 0.22, r + 12, 0.8), nt(2, 0.22, r, 0.85), nt(2.5, 0.15, r + 7, 0.7), nt(2.75, 0.15, r + 10, 0.7), nt(3.5, 0.3, k === 7 ? ap : r + 12, 0.65)];
    return vivant(n, 1800 + k, { placement: 0.006, force: 0.05 });
  });
  const batterie = mesures8(k => {
    const n = [], fin = k === 3 || k === 7, accent = [0.72, 0.3, 0.5, 0.3];
    for (let i = 0; i < 16; i++) { if (fin && i >= 14) continue; n.push(nt(i / 4, 0.12, k >= 4 && i === 14 ? HO : HF, accent[i % 4] * (i % 4 === 0 ? 1 : 0.9))); }
    [0, 1.5, 2.5, 3.25].forEach((t, i) => n.push(nt(t, 0.3, K, [0.96, 0.8, 0.82, 0.6][i])));
    n.push(nt(1, 0.3, S, 0.92), nt(3, 0.3, S, 0.9)); [1.75, 2.25, 3.75].forEach(t => n.push(nt(t, 0.15, S, 0.27)));
    if (fin) { n.push(nt(3.5, 0.2, TH, 0.6), nt(3.75, 0.2, TM, 0.65), nt(3.875, 0.2, TB, 0.75)); }
    if (k === 4) n.push(nt(0, 0.9, CRASH, 0.6));
    return vivant(n, 1900 + k, { placement: 0.006, force: 0.06 });
  });
  const riff = [
    [nt(0, 0.3, 70, 0.8), nt(0.75, 0.2, 67, 0.65), nt(1.5, 0.3, 70, 0.78), nt(2, 0.25, 72, 0.8), nt(2.75, 0.2, 70, 0.65), nt(3, 0.9, 67, 0.72)],
    [nt(0, 0.3, 63, 0.75), nt(0.75, 0.2, 67, 0.65), nt(1.5, 0.3, 70, 0.78), nt(2.5, 0.4, 67, 0.7)],
    [nt(0, 0.3, 69, 0.8), nt(0.75, 0.2, 72, 0.65), nt(1.5, 0.3, 75, 0.78), nt(2, 0.25, 72, 0.7), nt(2.75, 0.2, 69, 0.65), nt(3, 0.9, 67, 0.7)],
    [nt(0, 0.3, 71, 0.8), nt(0.5, 0.2, 70, 0.62), nt(1, 0.3, 68, 0.7), nt(1.5, 0.25, 65, 0.7), nt(2, 0.9, 62, 0.75)],
    [nt(0, 0.3, 75, 0.82), nt(0.75, 0.2, 72, 0.66), nt(1.5, 0.3, 75, 0.8), nt(2, 0.25, 77, 0.82), nt(2.75, 0.2, 75, 0.66), nt(3, 0.9, 72, 0.74)],
    [nt(0, 0.3, 74, 0.8), nt(0.75, 0.2, 70, 0.65), nt(1.5, 0.3, 74, 0.78), nt(2.5, 0.4, 72, 0.7)],
    [nt(0, 0.3, 69, 0.8), nt(0.75, 0.2, 72, 0.65), nt(1.5, 0.3, 75, 0.78), nt(2, 0.25, 77, 0.8), nt(2.75, 0.2, 75, 0.65), nt(3, 0.9, 72, 0.72)],
    [nt(0, 0.3, 74, 0.82), nt(0.5, 0.2, 71, 0.65), nt(1, 0.3, 70, 0.7), nt(1.5, 0.3, 67, 0.7), nt(2, 1.4, 65, 0.8)],
  ].map((m, k) => vivant(m, 2000 + k, { placement: 0.008, force: 0.05 }));
  return {
    id: "mod-funk", niveau: 0.75, temps: 4, nom: "Funk : pianet, basse et cuivre", tempo: 100, mesures: 8,
    aide: "Huit mesures à 100 par minute en do dorien. La grosse caisse et la basse se répondent sur les doubles croches, le charleston ne s'arrête jamais et la caisse claire a des notes fantômes qu'on sent plus qu'on ne les entend. Le pianet gratte l'accord sur des doubles croches choisies ; le riff du sax ténor tourne sur do mineur 9, fa 9 puis sol 7 dièse 9, et la seconde moitié le monte.",
    harmonie: H,
    lignes: [
      { nom: "Batterie", instrument: "batt:reel", volume: 0.8, mesures: batterie },
      { nom: "Basse", instrument: "ech:basse-moderne", volume: 0.66, mesures: basse, role: "basse" },
      { nom: "Pianet", instrument: "ech:pianet", volume: 0.5, mesures: accords, role: "accords" },
      { nom: "Cuivre", instrument: "ech:sax-tenor", volume: 0.66, mesures: riff, role: "melodie" },
    ],
  };
}

// ================================================================ 6. BALLADE : 68 par minute, do majeur, basse qui descend
function ballade() {
  const mk = (nom, fond, rh, pcs, len = 4, t = 0) => ({ ...seg(nom, fond, rh, pcs, len, t), rh });
  const H = [
    [mk("Do (add9)", 36, [55, 60, 64], [0, 4, 7, 2])], [mk("Sol sur si", 35, [55, 59, 62], [7, 11, 2])], [mk("La mineur 7", 33, [55, 60, 64], [9, 0, 4, 7])],
    [mk("Mi mineur 7 sur sol", 31, [59, 62, 64], [4, 7, 11, 2])], [mk("Fa majeur 7", 41, [57, 60, 64], [5, 9, 0, 4])], [mk("Do sur mi", 40, [55, 60, 64], [0, 4, 7])],
    [mk("Ré mineur 7", 38, [57, 60, 65], [2, 5, 9, 0])], [mk("Sol 7 sus4", 43, [60, 62, 65], [7, 0, 2, 5], 2, 0), mk("Sol 7", 43, [59, 62, 65], [7, 11, 2, 5], 2, 2)],
  ];
  const piano = mesures8(k => {
    const s = H[k][0], v = 0.52 + 0.03 * Math.sin(k / 7 * Math.PI) * 2, haut = k >= 4 ? 0.06 : 0;
    const main = t => segDe(H[k], t).rh;   // l'arpège suit l'accord qui sonne à cet instant (la dernière mesure change d'accord au troisième temps)
    const n = [nt(0, 3.9, s.fond, 0.6 + haut), nt(0, 3.9, s.fond + 12, 0.42 + haut)];
    [[0.5, 0, v], [1, 1, v + 0.04], [1.5, 2, v + 0.06], [2, 1, v], [2.5, 0, v - 0.04], [3, 1, v], [3.5, 2, v - 0.02]].forEach(([t, i, vv]) => n.push(nt(t, t === 3.5 ? 0.5 : 0.9, main(t)[i], vv)));
    return vivant(n, 2100 + k, { placement: 0.01, force: 0.04 });
  });
  const cordes = mesures8(k => k < 4 ? [] : H[k][0].rh.map(n => nt(0, 3.9, n - 12, 0.36 + 0.03 * (k - 4))));
  const mel = [
    [nt(0, 1.5, 67, 0.55), nt(1.5, 0.5, 69, 0.5), nt(2, 1.9, 72, 0.62)], [nt(0, 1.5, 71, 0.6), nt(1.5, 0.5, 69, 0.5), nt(2, 1.9, 67, 0.55)],
    [nt(0, 1.5, 69, 0.58), nt(1.5, 0.5, 72, 0.52), nt(2, 1.9, 76, 0.7)], [nt(0, 1.0, 74, 0.62), nt(1, 1.0, 71, 0.55), nt(2, 1.9, 67, 0.58)],
    [nt(0, 2.0, 69, 0.62), nt(2, 1.0, 72, 0.6), nt(3, 0.9, 77, 0.72)], [nt(0, 1.5, 76, 0.68), nt(1.5, 0.5, 74, 0.58), nt(2, 1.9, 72, 0.66)],
    [nt(0, 1.0, 77, 0.7), nt(1, 0.5, 76, 0.58), nt(1.5, 0.5, 74, 0.58), nt(2, 1.9, 72, 0.64)], [nt(0, 1.9, 74, 0.64), nt(2, 1.9, 71, 0.55)],
  ].map((m, k) => vivant(m, 2200 + k, { placement: 0.014, force: 0.04 }));
  const batterie = mesures8(k => {
    if (k < 4) return [];
    const n = [nt(0, 0.4, K, 0.58), nt(k === 5 ? 2.75 : 2.5, 0.4, K, 0.42), nt(1, 0.3, RIM, 0.45), nt(3, 0.3, RIM, 0.45)]; if (k === 6) n.push(nt(1.75, 0.3, K, 0.32));
    for (let i = 0; i < 4; i++) n.push(nt(i + 0.5, 0.2, HF, 0.22));
    if (k === 7) n.push(nt(3.5, 0.3, TM, 0.4), nt(3.75, 0.3, TB, 0.5));
    return vivant(n, 2300 + k, { placement: 0.012, force: 0.05 });
  });
  return {
    id: "mod-ballade", niveau: 0.45, temps: 4, nom: "Ballade : piano et violoncelle", tempo: 68, mesures: 8,
    aide: "Huit mesures à 68 par minute en do majeur. La basse descend par degrés conjoints (do, si, la, sol, puis fa, mi, ré, sol) pendant que le piano arpège : c'est la mélodie de la basse qui fait avancer l'harmonie. Le violoncelle chante des notes longues vers l'aigu. À la mesure 5, les cordes et une batterie très douce arrivent, et la phrase monte jusqu'au fa.",
    harmonie: H,
    lignes: [
      { nom: "Piano", instrument: "ech:clavier", volume: 0.66, mesures: piano, role: "accords" },
      { nom: "Violoncelle", instrument: "ech:violoncelle-solo", volume: 0.64, mesures: mel, role: "melodie" },
      { nom: "Cordes", instrument: "ech:cordes", volume: 0.5, mesures: cordes, role: "accords" },
      { nom: "Batterie", instrument: "batt:jazz", volume: 0.5, mesures: batterie },
    ],
  };
}

export const MORCEAUX = [lofi(), house(), boombap(), bossa(), funk(), ballade()].map(m => Object.freeze(m));
export const morceauDe = id => MORCEAUX.find(m => m.id === id) || null;
