// SONORA Orchestre, espace 02 « Écouter Britten » : la structure de l'œuvre (sans DOM, testée dans Node).
// The Young Person's Guide to the Orchestra, Op. 34, Benjamin Britten, 1945, sous-titrée Variations et fugue sur un thème de Purcell. Le thème est le Rondeau d'Abdelazer.
// On ne donne ici que la structure : l'ordre des sections et les instruments qui jouent, jamais la musique. L'œuvre et ses enregistrements sont protégés ; la partition n'est pas libre.
export const OEUVRE = { titre: "Le Guide de l'orchestre pour les jeunes", original: "The Young Person's Guide to the Orchestra", compositeur: "Benjamin Britten", opus: "Op. 34", annee: 1945, creation: 1946, soustitre: "Variations et fugue sur un thème de Purcell", theme: "le Rondeau de la suite Abdelazer, Z.570, de Henry Purcell" };
// Les recherches d'écoute (Spotify et YouTube) : l'œuvre entière, le thème de Purcell dans son original, et chaque section.
export const RECHERCHE_OEUVRE = "Britten The Young Person's Guide to the Orchestra";
export const RECHERCHE_PURCELL = "Purcell Abdelazer Rondeau";
export const rechercheSection = s => RECHERCHE_OEUVRE + (s.partie === "variations" ? " variation " + s.cle.slice(2) + " " + VARIATIONS.find(v => "v-" + v.lettre === s.cle).en : s.partie === "fugue" ? " fugue" : " theme");

// Le contexte : une commande pour l'éducation, des dates, un thème emprunté. Repères de cours courants.
export const CONTEXTE = [
  "L'œuvre est écrite à la demande du ministère britannique de l'Éducation pour expliquer l'orchestre aux enfants, en accompagnement d'un documentaire intitulé The Instruments of the Orchestra (1946).",
  "Benjamin Britten (1913 à 1976), compositeur anglais, admirait Henry Purcell (1659 à 1695), qu'il considérait comme l'un des premiers à avoir su créer un style musical anglais.",
  "Le thème est le refrain d'un rondeau tiré de la musique de scène qu'écrivit Purcell, l'année de sa mort, pour la tragédie Abdelazer (1695).",
];
// L'effectif de l'œuvre : le nombre de musiciens par pupitre ; ids : les instruments du plan.
export const EFFECTIF = [
  { nom: "Piccolo", n: "1", ids: ["piccolo"] }, { nom: "Flûtes", n: "2", ids: ["flutes"] }, { nom: "Hautbois", n: "2", ids: ["hautbois"] }, { nom: "Clarinettes", n: "2", ids: ["clarinettes"] }, { nom: "Bassons", n: "2", ids: ["bassons"] },
  { nom: "Cors", n: "4", ids: ["cors"] }, { nom: "Trompettes", n: "2", ids: ["trompettes"] }, { nom: "Trombones", n: "3", ids: ["trombones"] }, { nom: "Tuba", n: "1", ids: ["tuba"] },
  { nom: "Timbales", n: "1 timbalier", ids: ["timbales"] }, { nom: "Percussions", n: "3 percussionnistes", ids: ["grosseCaisse", "cymbales", "tambourBasque", "triangle", "caisseClaire", "blocsChinois", "xylophone", "castagnettes", "tamTam", "fouet"] }, { nom: "Harpe", n: "1", ids: ["harpe"] }, { nom: "Cordes", n: "violons, altos, violoncelles, contrebasses", ids: ["violons1", "altos", "violoncelles", "contrebasses"] },
];

// Le thème : exposé par tout l'orchestre, puis par chaque famille, puis de nouveau par tout l'orchestre. `famille` : la famille mise en avant ; `ids` : les instruments du plan.
export const THEME = [
  { id: "t-tutti", caractere: "imposant, majestueux", nom: "Tout l'orchestre", famille: null, ids: [] },
  { id: "t-bois", caractere: "léger", nom: "Les bois", famille: "bois", ids: ["flutes", "hautbois", "clarinettes", "bassons"] },
  { id: "t-cuivres", caractere: "puissant", nom: "Les cuivres", famille: "cuivres", ids: ["cors", "trompettes", "trombones", "tuba"] },
  { id: "t-cordes", caractere: "chantant", nom: "Les cordes", famille: "cordes", ids: ["violons1", "violons2", "altos", "violoncelles", "contrebasses", "harpe"] },
  { id: "t-percu", caractere: "autoritaire, martial", nom: "Les percussions", famille: "percussions", ids: ["timbales", "grosseCaisse", "cymbales", "caisseClaire", "xylophone"] },
  { id: "t-tutti2", caractere: "imposant, majestueux", nom: "Tout l'orchestre, de nouveau", famille: null, ids: [] },
];
// Les treize variations, de A à M : un instrument ou un groupe d'instruments chacune, dans l'ordre des familles.
export const VARIATIONS = [
  { lettre: "A", en: "Flutes and Piccolo", nom: "Flûtes et piccolo", ids: ["piccolo", "flutes"], famille: "bois" },
  { lettre: "B", en: "Oboes", nom: "Hautbois", ids: ["hautbois"], famille: "bois" },
  { lettre: "C", en: "Clarinets", nom: "Clarinettes", ids: ["clarinettes"], famille: "bois" },
  { lettre: "D", en: "Bassoons", nom: "Bassons", ids: ["bassons"], famille: "bois" },
  { lettre: "E", en: "Violins", nom: "Violons", ids: ["violons1", "violons2"], famille: "cordes" },
  { lettre: "F", en: "Violas", nom: "Altos", ids: ["altos"], famille: "cordes" },
  { lettre: "G", en: "Cellos", nom: "Violoncelles", ids: ["violoncelles"], famille: "cordes" },
  { lettre: "H", en: "Double basses", nom: "Contrebasses", ids: ["contrebasses"], famille: "cordes" },
  { lettre: "I", en: "Harp", nom: "Harpe", ids: ["harpe"], famille: "cordes" },
  { lettre: "J", en: "Horns", nom: "Cors", ids: ["cors"], famille: "cuivres" },
  { lettre: "K", en: "Trumpets", nom: "Trompettes", ids: ["trompettes"], famille: "cuivres" },
  { lettre: "L", en: "Trombones and Tuba", nom: "Trombones et tuba", ids: ["trombones", "tuba"], famille: "cuivres" },
  { lettre: "M", en: "Percussion", nom: "Percussions", ids: ["timbales", "grosseCaisse", "cymbales", "tambourBasque", "triangle", "caisseClaire", "blocsChinois", "xylophone", "castagnettes", "tamTam", "fouet"], famille: "percussions" },
];
// La fugue : les entrées dans l'ordre. Dans la conclusion, le thème de Purcell revient aux cuivres pendant que le reste continue le sujet de la fugue.
export const FUGUE = [
  { id: "f-piccolo", nom: "Piccolo", ids: ["piccolo"] }, { id: "f-flutes", nom: "Flûtes", ids: ["flutes"] }, { id: "f-hautbois", nom: "Hautbois", ids: ["hautbois"] }, { id: "f-clarinettes", nom: "Clarinettes", ids: ["clarinettes"] },
  { id: "f-bassons", nom: "Bassons", ids: ["bassons"] }, { id: "f-violons1", nom: "Premiers violons", ids: ["violons1"] }, { id: "f-violons2", nom: "Seconds violons", ids: ["violons2"] }, { id: "f-altos", nom: "Altos", ids: ["altos"] },
  { id: "f-celli", nom: "Violoncelles", ids: ["violoncelles"] }, { id: "f-basses", nom: "Contrebasses", ids: ["contrebasses"] }, { id: "f-harpe", nom: "Harpe", ids: ["harpe"] }, { id: "f-cors", nom: "Cors", ids: ["cors"] },
  { id: "f-trompettes", nom: "Trompettes", ids: ["trompettes"] }, { id: "f-trombones", nom: "Trombones et tuba", ids: ["trombones", "tuba"] }, { id: "f-percu", nom: "Percussions", ids: ["timbales"] },
];
// Le fil de l'œuvre : le thème, les variations, la fugue, en une seule suite numérotée.
export function parcoursOeuvre() {
  const s = [];
  THEME.forEach(t => s.push({ partie: "theme", cle: t.id, titre: "Thème : " + t.nom.toLowerCase(), ids: t.ids, famille: t.famille, caractere: t.caractere }));
  VARIATIONS.forEach(v => s.push({ partie: "variations", cle: "v-" + v.lettre, titre: "Variation " + v.lettre + " : " + v.nom.toLowerCase(), ids: v.ids, famille: v.famille }));
  s.push({ partie: "fugue", cle: "fugue", titre: "Fugue : les instruments entrent un à un, puis tout l'orchestre", ids: FUGUE.map(f => f.ids[0]), famille: null });
  return s;
}
// Les entrées de la fugue à remettre dans l'ordre : un mélange stable (graine), jamais l'ordre exact.
export function melangeFugue(rnd) {
  const l = FUGUE.slice(); for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const x = l[i]; l[i] = l[j]; l[j] = x; }
  return l.every((x, i) => x === FUGUE[i]) ? l.reverse() : l;
}

// Exercice 1, un texte à trous sur les idées de l'œuvre. Chaque trou a sa bonne réponse ; la banque de mots mêle les bonnes réponses et trois intrus.
export const TROUS = ["C'est une musique pour {orchestre}. La mélodie principale, appelée {thème}, est {répétée} mais jouée par des {familles} instrumentales {différentes} à chaque reprise. Il y a donc des {variations} de {timbre}, et chaque reprise crée une nouvelle ambiance, un nouveau {caractère}."][0];
export function trous() { const re = /\{([^}]+)\}/g, segments = [], reponses = []; let i = 0, m; while ((m = re.exec(TROUS))) { segments.push(TROUS.slice(i, m.index)); reponses.push(m[1]); i = m.index + m[0].length; } segments.push(TROUS.slice(i)); return { segments, reponses }; }
export const INTRUS = ["rythme", "soliste", "chœur"];
export const banqueDeMots = () => trous().reponses.concat(INTRUS).sort((a, b) => a.localeCompare(b, "fr"));
// Exercice 2, le tableau des six expositions du thème : la famille puis le caractère.
export const CARACTERES = ["imposant, majestueux", "léger", "puissant", "chantant", "autoritaire, martial"];
export const NOMS_EXPOSITION = ["Tutti", "Bois", "Cuivres", "Cordes", "Percussions"];
export const ATTENDU = THEME.map(t => ({ nom: t.famille ? t.nom.replace(/^Les /, "").replace(/^./, c => c.toUpperCase()) : "Tutti", caractere: t.caractere }));
export function verifierTableau(rep) { return ATTENDU.map((a, i) => ({ famille: !!rep[i] && rep[i].famille === a.nom, caractere: !!rep[i] && rep[i].caractere === a.caractere })); }
