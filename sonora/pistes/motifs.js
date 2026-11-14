// La bibliothèque de motifs du mode blocs de SONORA Pistes : des mesures prêtes à poser dans une case, pour qu'un élève puisse commencer sans rien écrire.
// Tous les motifs sont des figures génériques écrites pour ce cours (des rythmes de base, des basses, des accords, de petites phrases sur la gamme pentatonique).
// Aucune mélodie connue n'est écrite de mémoire. Les motifs avec hauteur sont écrits en do ; la tonalité choisie les transpose (la batterie n'est pas transposée).
// Un motif dure une mesure : `temps` dit à combien de temps par mesure il est écrit (4 ou 3). Les notes sont en temps (1 = une noire), comme partout dans Pistes.
// Sans DOM : testé dans Node (tests/motifs.test.js).
import * as B from "./blocs.js?v=3ee469f0ef";
import * as P from "./projet.js?v=3ee469f0ef";

// Les notes de batterie (numéros généraux) : grosse caisse, caisse claire, baguette sur le cadre, charleston fermé et ouvert, claquement, tom, cloche à vache, cymbale
const K = 36, S = 38, RIM = 37, HF = 42, HO = 46, CLAP = 39, TOM = 41, CRASH = 49;

export const FAMILLES = [["rythme", "Rythmes"], ["basse", "Basses"], ["accords", "Accords"], ["melodie", "Mélodies"]];

// [t, d, n, v] : un tableau par motif, plus lisible à écrire à la main
const n = (...l) => l.map(([t, d, h, v = 0.8]) => ({ t, d, n: h, v }));
const croches = (note, v = 0.55, debut = 0, fin = 4) => { const l = []; for (let t = debut; t < fin; t += 0.5) l.push([t, 0.4, note, v]); return l; };

// Les accords écrits sur la tonique (do) : les notes d'un accord majeur ou mineur au-dessus de sa fondamentale
const ACC = { majeur: [0, 4, 7], mineur: [0, 3, 7] };
const accord = (fond, mode, style) => {
  const [a, b, c] = ACC[mode].map(x => 48 + fond + x);   // autour du do du milieu moins une octave : do3 à si3
  if (style === "plaque") return [[0, 4, a, 0.7], [0, 4, b, 0.7], [0, 4, c, 0.7]];
  if (style === "arpege") return [[0, 1, a], [1, 1, b], [2, 1, c], [3, 1, b]];
  return [[0, 1.5, a, 0.7], [0, 1.5, b, 0.7], [0, 1.5, c, 0.7], [2, 1, a, 0.6], [2, 1, b, 0.6], [2, 1, c, 0.6], [3, 1, b, 0.55], [3, 1, c, 0.55]];   // "rythme"
};

// Les degrés : on les écrit par leur écart à la tonique (en demi-tons), leur mode et leur nom de degré
const DEGRES = [["I", 0, "majeur"], ["IV", 5, "majeur"], ["V", 7, "majeur"], ["vi", 9, "mineur"]];

const MOTIFS_BRUTS = [
  // ---------------------------------------------------------------- rythmes de batterie, à quatre temps
  { id: "r-rock", famille: "rythme", temps: 4, nom: "Rock simple", aide: "Grosse caisse sur les temps 1 et 3, caisse claire sur les temps 2 et 4, charleston en croches. La base de milliers de morceaux.",
    notes: n([0, .5, K], [1, .5, S], [2, .5, K], [3, .5, S], ...croches(HF)) },
  { id: "r-pop", famille: "rythme", temps: 4, nom: "Pop qui avance", aide: "Comme le rock simple, avec une grosse caisse en plus sur le « et » du temps 2 : le rythme ne reste pas sur place.",
    notes: n([0, .5, K], [1, .5, S], [1.5, .5, K, 0.7], [2, .5, K], [3, .5, S], ...croches(HF)) },
  { id: "r-quatre", famille: "rythme", temps: 4, nom: "Quatre sur le sol", aide: "La grosse caisse à chaque temps, un claquement sur les temps 2 et 4, le charleston sur les contretemps : le pouls de la musique de danse électronique.",
    notes: n([0, .5, K], [1, .5, K], [2, .5, K], [3, .5, K], [1, .5, CLAP], [3, .5, CLAP], [.5, .4, HO, 0.5], [1.5, .4, HO, 0.5], [2.5, .4, HO, 0.5], [3.5, .4, HO, 0.5]) },
  { id: "r-lent", famille: "rythme", temps: 4, nom: "Hip-hop lent", aide: "Une grosse caisse qui ne tombe pas toujours sur le temps, la caisse claire bien marquée sur 2 et 4. À un tempo lent, il balance.",
    notes: n([0, .5, K], [.75, .5, K, 0.6], [1, .5, S], [2.5, .5, K], [3, .5, S], ...croches(HF, 0.5)) },
  { id: "r-reggae", famille: "rythme", temps: 4, nom: "Reggae « one drop »", aide: "Le temps 1 est laissé vide : grosse caisse et baguette seulement sur le temps 3, le charleston en croches. Le silence fait partie du rythme.",
    notes: n([2, .5, K], [2, .5, RIM], ...croches(HF, 0.5)) },
  { id: "r-tresillo", famille: "rythme", temps: 4, nom: "Tresillo : 3 + 3 + 2", aide: "Huit croches coupées en groupes de 3, 3 et 2 : un rythme de base de nombreuses musiques d'Afrique, des Caraïbes et d'Amérique latine.",
    notes: n([0, .5, K], [1.5, .5, K], [3, .5, K], [0, .5, CRASH, 0.5], [.5, .4, RIM, 0.5], [1, .4, RIM, 0.5], [2, .4, RIM, 0.5], [2.5, .4, RIM, 0.5], [3.5, .4, RIM, 0.5]) },
  // ---------------------------------------------------------------- rythme à trois temps
  { id: "r-valse", famille: "rythme", temps: 3, nom: "Valse", aide: "Un coup grave sur le temps 1, deux légers sur les temps 2 et 3 : « boum, tchi, tchi ».",
    notes: n([0, .5, K], [1, .5, HF, 0.6], [2, .5, HF, 0.6], [1, .5, RIM, 0.45], [2, .5, RIM, 0.45]) },
  // ---------------------------------------------------------------- basses, écrites sur do (do2 = 36)
  { id: "b-temps", famille: "basse", temps: 4, nom: "Une note par temps", aide: "La note fondamentale, quatre fois. La basse la plus simple, qui dit sur quoi reposent les accords.",
    notes: n([0, .9, 36], [1, .9, 36], [2, .9, 36], [3, .9, 36]) },
  { id: "b-quinte", famille: "basse", temps: 4, nom: "Fondamentale et quinte", aide: "La fondamentale deux temps, puis la quinte (cinq notes plus haut) deux temps. Deux notes qui s'accordent presque toujours.",
    notes: n([0, 1.9, 36], [2, 1.9, 43]) },
  { id: "b-octave", famille: "basse", temps: 4, nom: "Octaves qui rebondissent", aide: "La même note, une octave plus bas puis plus haut, en croches : une basse qui pulse.",
    notes: n([0, .45, 36], [.5, .45, 48, 0.7], [1, .45, 36], [1.5, .45, 48, 0.7], [2, .45, 36], [2.5, .45, 48, 0.7], [3, .45, 36], [3.5, .45, 48, 0.7]) },
  { id: "b-marche", famille: "basse", temps: 4, nom: "Marche sur l'accord", aide: "Les trois notes de l'accord (fondamentale, tierce, quinte), puis on redescend sur la tierce : la basse dessine l'accord.",
    notes: n([0, .9, 36], [1, .9, 40], [2, .9, 43], [3, .9, 40]) },
  { id: "b-synco", famille: "basse", temps: 4, nom: "Basse syncopée", aide: "Une note commence entre deux temps et se prolonge sur le suivant : la musique balance. Écoute en frappant les temps du pied.",
    notes: n([0, 1.4, 36], [1.5, .45, 36, 0.7], [2, .9, 43], [3, .45, 41, 0.7], [3.5, .45, 43, 0.75]) },
  { id: "b-valse", famille: "basse", temps: 3, nom: "Basse de valse", aide: "Une grave note tenue sur le temps 1 de chaque mesure : l'oreille sent « un, deux, trois ».",
    notes: n([0, 2.9, 36]) },
  // ---------------------------------------------------------------- mélodies, petites phrases sur la gamme pentatonique de do (do ré mi sol la)
  { id: "m-monte", famille: "melodie", temps: 4, nom: "Montée", aide: "Quatre notes qui montent d'une marche en marche : do, ré, mi, sol.",
    notes: n([0, .9, 60], [1, .9, 62], [2, .9, 64], [3, .9, 67]) },
  { id: "m-descend", famille: "melodie", temps: 4, nom: "Descente", aide: "Le contraire : la, sol, mi, ré. Une phrase qui retombe.",
    notes: n([0, .9, 69], [1, .9, 67], [2, .9, 64], [3, .9, 62]) },
  { id: "m-question", famille: "melodie", temps: 4, nom: "Question", aide: "Une phrase qui finit sur ré, une note qui n'est pas du repos : elle attend une réponse. Pose-la avant « Réponse ».",
    notes: n([0, .9, 60], [1, .9, 64], [2, .9, 67], [3, .9, 62]) },
  { id: "m-reponse", famille: "melodie", temps: 4, nom: "Réponse", aide: "La phrase qui répond à « Question » et finit sur do, la note de repos. Écoute-les l'une après l'autre.",
    notes: n([0, .9, 64], [1, .9, 62], [2, 1.9, 60]) },
  { id: "m-synco", famille: "melodie", temps: 4, nom: "Phrase syncopée", aide: "Des notes courtes qui tombent entre les temps, puis une note longue. Frappe-la du pied pour sentir les contretemps.",
    notes: n([0, .45, 67], [.5, .45, 69], [1, .9, 67], [2, 1.4, 64], [3.5, .45, 62]) },
  { id: "m-ostinato", famille: "melodie", temps: 4, nom: "Ostinato en croches", aide: "Quatre notes qui tournent en boucle, deux fois par mesure. Un ostinato se répète : c'est ce qui donne l'envie de bouger.",
    notes: n([0, .45, 60], [.5, .45, 64], [1, .45, 67], [1.5, .45, 64], [2, .45, 60], [2.5, .45, 64], [3, .45, 67], [3.5, .45, 64]) },
  { id: "m-repetee", famille: "melodie", temps: 4, nom: "Note répétée et saut", aide: "Trois fois la même note, puis un saut vers l'aigu : l'attente et la surprise.",
    notes: n([0, .45, 64], [.5, .45, 64], [1, .9, 64], [2, 1.9, 72]) },
  { id: "m-valse", famille: "melodie", temps: 3, nom: "Phrase de valse", aide: "Une note longue sur le temps 1, deux plus courtes derrière : le balancement à trois temps.",
    notes: n([0, 1.9, 64], [2, .9, 62]) },
];

// Les accords, un motif par degré et par façon de les jouer : le nom dépend de la tonalité choisie, il est calculé (voir nomDuMotif)
for (const [deg, fond, mode] of DEGRES) for (const [style, libStyle, aideStyle] of [["plaque", "plaqué", "Les trois notes ensemble pendant toute la mesure."], ["arpege", "arpégé", "Les notes de l'accord l'une après l'autre."], ["rythme", "rythmé", "L'accord frappé sur les temps 1 et 3, plus léger sur le 4."]])
  MOTIFS_BRUTS.push({ id: `a-${deg}-${style}`, famille: "accords", temps: 4, degre: deg, fond, mode, style: libStyle, nom: `${deg}, ${libStyle}`, aide: aideStyle, notes: n(...accord(fond, mode, style)) });
MOTIFS_BRUTS.push({ id: "a-valse", famille: "accords", temps: 3, degre: "I", fond: 0, mode: "majeur", style: "valse", nom: "I, valse", aide: "Une note grave sur le temps 1, l'accord sur les temps 2 et 3.",
  notes: n([0, .9, 36 + 12], [1, .9, 52, 0.6], [1, .9, 55, 0.6], [2, .9, 52, 0.6], [2, .9, 55, 0.6]) });

export const MOTIFS = MOTIFS_BRUTS.map(m => Object.freeze({ ...m, notes: Object.freeze(m.notes) }));
export const motifDe = id => MOTIFS.find(m => m.id === id) || null;

// ---------------------------------------------------------------- la tonalité : transposer, nommer
export const TONALITES = [["do", 0], ["ré", 2], ["mi", 4], ["fa", 5], ["sol", 7], ["la", 9], ["si bémol", 10]];
const NOMS = ["do", "do dièse", "ré", "mi bémol", "mi", "fa", "fa dièse", "sol", "la bémol", "la", "si bémol", "si"];
export const nomDeNote = (tonique, ecart = 0) => NOMS[(((tonique + ecart) % 12) + 12) % 12];

// Le nom d'un motif tel qu'on l'affiche : un accord porte le nom de sa note (« Do majeur, plaqué (degré I) »).
export function nomDuMotif(m, tonique = 0) {
  if (m.famille !== "accords") return m.nom;
  const base = nomDeNote(tonique, m.fond), nom = base.charAt(0).toUpperCase() + base.slice(1);
  return `${nom} ${m.mode}, ${m.style} (degré ${m.degre})`;
}
// Les notes d'un motif, transposées (sauf la batterie), prêtes à entrer dans un bloc.
export function notesDuMotif(m, tonique = 0) {
  const t = m.famille === "rythme" ? 0 : tonique;
  return m.notes.map(x => ({ ...x, n: Math.max(0, Math.min(127, x.n + t)) }));
}

// ---------------------------------------------------------------- quels motifs pour quelle ligne
// Le genre d'une ligne selon son instrument : de lui dépend l'onglet proposé en premier, et les rythmes de batterie ne vont que sur une batterie.
const BASSES = /^(ech:(basse|contrebasse|basses)|syn:basse|lib:basse)/;
export function genreDe(instrument) {
  if (typeof instrument === "string" && instrument.startsWith("batt:")) return "rythme";
  if (BASSES.test(instrument || "")) return "basse";
  if (/^ech:(clavier|piano-droit|wurlitzer|pianet|cp80|orgue|clavecin|guitare|guitare-elec|guitare-jazz|guitare-folk|harpe|cordes)/.test(instrument || "")) return "accords";
  return "melodie";
}
// Les onglets d'une ligne : une batterie ne reçoit que des rythmes, un autre instrument jamais de rythme de batterie.
export const ongletsPour = instrument => genreDe(instrument) === "rythme" ? ["rythme"] : ["basse", "accords", "melodie"];
export const motifsPour = (famille, temps) => MOTIFS.filter(m => m.famille === famille && m.temps === temps);

// Pose un motif dans une case (vide : un bloc neuf ; un bloc : ses notes sont remplacées). Renvoie { clip, son } ou null si la case n'accepte pas (clip long).
export function poserMotif(p, pisteId, mesure, motifOuId, tonique = 0) {
  const m = typeof motifOuId === "string" ? motifDe(motifOuId) : motifOuId; if (!m) throw new Error("motif inconnu");
  if (m.temps !== p.temps) throw new Error(`ce motif est écrit à ${m.temps} temps par mesure, le projet est à ${p.temps}`);
  const pi = P.trouverPiste(p, pisteId); if (!pi) throw new Error("piste introuvable");
  const genre = genreDe(B.instrumentDePiste(p, pi));
  if ((m.famille === "rythme") !== (genre === "rythme")) throw new Error(m.famille === "rythme" ? "un rythme de batterie se pose sur une ligne de batterie" : "une ligne de batterie ne reçoit que des rythmes");
  return B.collerBloc(p, pisteId, mesure, { notes: notesDuMotif(m, tonique) });
}

// ---------------------------------------------------------------- des morceaux de départ : quatre mesures sur plusieurs lignes
// Chaque ligne : { nom, instrument, volume (le niveau de la ligne dans le mixage : une basse de synthèse écrase tout si on la laisse à fond), motifs: [quatre identifiants, un par mesure] }.
export const MODELES = [
  { id: "mod-pop", nom: "Pop en quatre accords", temps: 4, aide: "La suite I, vi, IV, V, souvent utilisée dans la chanson, avec une basse, une batterie et une petite phrase qui pose une question et y répond.",
    lignes: [
      { nom: "Batterie", instrument: "batt:reel", volume: 0.85, motifs: ["r-pop", "r-pop", "r-pop", "r-pop"] },
      { nom: "Basse", instrument: "ech:basse-moderne", volume: 0.7, motifs: ["b-quinte", "b-quinte", "b-quinte", "b-quinte"] },
      { nom: "Accords", instrument: "ech:clavier", volume: 0.6, motifs: ["a-I-plaque", "a-vi-plaque", "a-IV-plaque", "a-V-plaque"] },
      { nom: "Mélodie", instrument: "ech:sax-alto", volume: 0.8, motifs: ["m-question", "m-reponse", "m-question", "m-reponse"] },
    ] },
  { id: "mod-danse", nom: "Musique de danse", temps: 4, aide: "Quatre sur le sol, une basse qui rebondit, un ostinato qui tourne et des accords arpégés.",
    lignes: [
      { nom: "Batterie", instrument: "batt:909", volume: 0.85, motifs: ["r-quatre", "r-quatre", "r-quatre", "r-quatre"] },
      { nom: "Basse", instrument: "syn:basse808", volume: 0.4, motifs: ["b-octave", "b-octave", "b-octave", "b-octave"] },
      { nom: "Accords", instrument: "ech:synthe", volume: 0.55, motifs: ["a-vi-arpege", "a-IV-arpege", "a-I-arpege", "a-V-arpege"] },
      { nom: "Mélodie", instrument: "ech:wurlitzer", volume: 0.75, motifs: ["m-ostinato", "m-ostinato", "m-ostinato", "m-synco"] },
    ] },
  { id: "mod-lent", nom: "Groove lent", temps: 4, aide: "Un hip-hop lent, une basse syncopée, des accords tenus : le silence et le balancement font le travail.",
    lignes: [
      { nom: "Batterie", instrument: "batt:808", volume: 0.85, motifs: ["r-lent", "r-lent", "r-lent", "r-lent"] },
      { nom: "Basse", instrument: "ech:basse-moderne", volume: 0.6, motifs: ["b-synco", "b-synco", "b-synco", "b-synco"] },
      { nom: "Accords", instrument: "ech:wurlitzer", volume: 0.6, motifs: ["a-I-plaque", "a-I-plaque", "a-IV-plaque", "a-V-plaque"] },
    ] },
];
export const modeleDe = id => MODELES.find(m => m.id === id) || null;

// Pose un morceau de départ sur le groupe de quatre mesures `groupe` : une ligne par instrument du modèle (on réutilise d'abord les lignes vides du projet).
// Tout ou rien : si une case visée n'est pas vide, rien n'est posé et on le dit. Renvoie les identifiants des sons à refaire.
export function poserModele(p, modeleOuId, groupe, tonique = 0) {
  const mod = typeof modeleOuId === "string" ? modeleDe(modeleOuId) : modeleOuId; if (!mod) throw new Error("modèle inconnu");
  if (mod.temps !== p.temps) throw new Error(`ce morceau est écrit à ${mod.temps} temps par mesure, le projet est à ${p.temps}`);
  const m0 = groupe * B.MESURES_PAR_GROUPE;
  // les lignes : une ligne vide et sans instrument choisi est réutilisée, sinon on en ajoute une ; une ligne existante au même instrument est réutilisée en premier
  const libres = p.pistes.filter(pi => !pi.clips.length && !pi.instrument), prises = new Set(), choix = [];
  for (const l of mod.lignes) {
    const meme = p.pistes.find(pi => !prises.has(pi.id) && pi.instrument === l.instrument);
    const pi = meme || libres.shift() || null; choix.push(pi); if (pi) prises.add(pi.id);
  }
  // on vérifie les cases avant de rien toucher
  mod.lignes.forEach((l, i) => { const pi = choix[i]; if (!pi) return; for (let k = 0; k < B.MESURES_PAR_GROUPE; k++) if (B.caseDe(p, pi, m0 + k).type !== "vide") throw new Error(`Ce groupe de mesures n'est pas vide sur la ligne « ${pi.nom} » : choisis un groupe vide.`); });
  const refaire = new Set();
  mod.lignes.forEach((l, i) => {
    let pi = choix[i]; if (!pi) pi = B.ajouterPiste(p, l.instrument, l.nom);
    else { pi.instrument = l.instrument; pi.nom = pi.nom.startsWith("Piste ") ? l.nom : pi.nom; }
    if (l.volume != null) pi.volume = l.volume;
    l.motifs.forEach((id, k) => { const r = poserMotif(p, pi.id, m0 + k, id, tonique); if (r) refaire.add(r.son); });
  });
  return [...refaire];
}
