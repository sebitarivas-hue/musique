// SONORA Orchestre, espace 01 « Explorer l'orchestre » : les données (sans DOM, testées dans Node).
// Hauteurs en numéros MIDI (60 = do4, la4 = 440 Hz, comme dans Découvertes). Les tessitures sont les hauteurs réellement entendues, en usage courant d'orchestre ; elles varient un peu selon les ouvrages.
// `banque` : l'instrument de la banque d'échantillons du site (outils/faust/banque) qui sert de son ; `echant` : la zone enregistrée dans cette banque (vérifiée contre catalogue.json par les tests).
// Les percussions sans hauteur et quelques instruments secondaires (piccolo, cor anglais, clarinette basse) n'ont pas d'enregistrement dans la banque : la fiche le dit, sans faux son.

export const FAMILLES = {
  cordes: { pale: "#FFE2C2", nom: "Les cordes", court: "Cordes", couleur: "#FF9F43", son: "Une corde vibre, frottée par un archet ou pincée." },
  bois: { pale: "#E9DAFB", nom: "Les bois", court: "Bois", couleur: "#A86CF0", son: "Un souffle fait vibrer l'air dans un tube, sur un biseau ou sur une anche." },
  cuivres: { pale: "#D6EEC2", nom: "Les cuivres", court: "Cuivres", couleur: "#7BC74D", son: "Les lèvres vibrent dans une embouchure, et le tube amplifie." },
  percussions: { pale: "#C6E0FC", nom: "Les percussions", court: "Percussions", couleur: "#4C9BF5", son: "On frappe, on secoue ou on frotte : une peau, un métal ou une lame de bois vibre." },
};

// Plan de l'orchestre vu de dessus, le chef en bas au centre. Place usuelle (elle change un peu selon les chefs et les salles).
// rang : 0 devant (cordes), 1 bois, 2 cuivres, 3 percussions ; de gauche à droite pour le public. g0 et g1 : angles en degrés depuis la verticale du chef (négatif à gauche).
export const INSTRUMENTS = [
  { id: "violons1", effectif: "14 à 18", visuels: 6, nom: "Premiers violons", fam: "cordes", rang: 0, g0: -82, g1: -46, banque: "violons-ens", echant: [55, 91], tess: [55, 103], mode: "cordes frottées",
    texte: "Le plus petit et le plus aigu des instruments à archet. Les premiers violons jouent souvent la mélodie, en tête de l'orchestre, à gauche du chef." },
  { id: "violons2", effectif: "12 à 16", visuels: 6, nom: "Seconds violons", fam: "cordes", rang: 0, g0: -46, g1: -12, banque: "violons-ens", echant: [55, 91], tess: [55, 103], mode: "cordes frottées",
    texte: "Le même instrument que le premier violon, mais une partie différente : plutôt l'harmonie, ou un dialogue avec les premiers." },
  { id: "altos", effectif: "10 à 12", visuels: 4, nom: "Altos", fam: "cordes", rang: 0, g0: -12, g1: 24, banque: "altos-ens", echant: [48, 84], tess: [48, 88], mode: "cordes frottées",
    texte: "Un peu plus grand que le violon, au son plus sombre et plus rond. L'alto remplit le milieu de l'harmonie." },
  { id: "violoncelles", effectif: "8 à 12", visuels: 4, nom: "Violoncelles", fam: "cordes", rang: 0, g0: 24, g1: 54, banque: "celli-ens", echant: [36, 72], tess: [36, 81], mode: "cordes frottées",
    texte: "On le joue assis, l'instrument posé au sol sur une pique. Sa voix chaude est proche de celle d'un chanteur grave." },
  { id: "contrebasses", effectif: "6 à 8", visuels: 3, nom: "Contrebasses", fam: "cordes", rang: 0, g0: 54, g1: 82, banque: "basses-ens", echant: [24, 60], tess: [28, 67], mode: "cordes frottées",
    texte: "Le plus grand et le plus grave des instruments à cordes : il porte la basse de tout l'orchestre. Le musicien joue debout ou sur un haut tabouret." },
  { id: "harpe", effectif: "1 ou 2", visuels: 1, nom: "Harpe", fam: "cordes", rang: 1, g0: -82, g1: -46, banque: "harpe", echant: [35, 93], tess: [24, 103], mode: "cordes pincées",
    texte: "Quarante-sept cordes pincées avec les doigts, et sept pédales qui changent la hauteur des notes. Elle se place à gauche, à part des autres cordes." },
  { id: "piccolo", effectif: "1", visuels: 1, nom: "Piccolo", fam: "bois", rang: 1, g0: -42, g1: -30, banque: null, tess: [74, 108], mode: "souffle sur un biseau",
    texte: "Une petite flûte qui sonne une octave plus haut que la flûte traversière. Très aigu, très perçant." },
  { id: "flutes", effectif: "2 ou 3", visuels: 2, nom: "Flûtes", fam: "bois", rang: 1, g0: -30, g1: -12, banque: "flutes-ens", echant: [60, 90], tess: [60, 96], mode: "souffle sur un biseau",
    texte: "Un tube de métal tenu en travers : le musicien souffle sur le bord d'un trou, comme sur le goulot d'une bouteille. Son clair, léger." },
  { id: "hautbois", effectif: "2 ou 3", visuels: 2, nom: "Hautbois", fam: "bois", rang: 1, g0: -12, g1: 4, banque: "hautbois-ens", echant: [58, 88], tess: [58, 91], mode: "anche double",
    texte: "Deux fines lamelles de roseau vibrent l'une contre l'autre. Le son est nasal et pénétrant : c'est le hautbois qui donne le la à tout l'orchestre pour l'accord." },
  { id: "corAnglais", effectif: "1", visuels: 1, nom: "Cor anglais", fam: "bois", rang: 1, g0: 4, g1: 14, banque: null, tess: [52, 84], mode: "anche double",
    texte: "Un grand hautbois plus grave, au pavillon en forme de poire. Ce n'est ni un cor ni anglais : son nom viendrait d'un vieux malentendu." },
  { id: "clarinettes", effectif: "2 ou 3", visuels: 2, nom: "Clarinettes", fam: "bois", rang: 1, g0: 14, g1: 30, banque: "clarinettes-ens", echant: [50, 86], tess: [50, 94], mode: "anche simple",
    texte: "Une seule lamelle de roseau vibre contre le bec. Le son est rond dans le grave, brillant dans l'aigu." },
  { id: "clarinetteBasse", effectif: "1", visuels: 1, nom: "Clarinette basse", fam: "bois", rang: 1, g0: 30, g1: 40, banque: null, tess: [37, 77], mode: "anche simple",
    texte: "La clarinette en plus grand : une octave plus grave que la clarinette ordinaire, avec un pavillon recourbé en métal." },
  { id: "bassons", effectif: "2 ou 3", visuels: 2, nom: "Bassons", fam: "bois", rang: 1, g0: 40, g1: 64, banque: "bassons-ens", echant: [34, 76], tess: [34, 75], mode: "anche double",
    texte: "Un tube de bois de plus de deux mètres, replié sur lui-même. Le basson est la basse des bois : son grave est rond, son aigu plaintif." },
  { id: "cors", effectif: "4", visuels: 4, nom: "Cors", fam: "cuivres", rang: 2, g0: -64, g1: -30, banque: "cors-ens", echant: [40, 76], tess: [35, 77], mode: "lèvres dans une embouchure",
    texte: "Un tube enroulé de plusieurs mètres qui finit en un large pavillon. Le son est rond et lointain ; il se mêle aussi bien aux bois qu'aux cuivres." },
  { id: "trompettes", effectif: "2 ou 3", visuels: 3, nom: "Trompettes", fam: "cuivres", rang: 2, g0: -30, g1: 6, banque: "trompettes-ens", echant: [52, 88], tess: [52, 82], mode: "lèvres dans une embouchure",
    texte: "Le plus aigu des cuivres, avec trois pistons. Un son brillant, qui perce l'orchestre : fanfares et appels." },
  { id: "trombones", effectif: "3", visuels: 3, nom: "Trombones", fam: "cuivres", rang: 2, g0: 6, g1: 38, banque: "trombones-ens", echant: [40, 76], tess: [40, 72], mode: "lèvres dans une embouchure",
    texte: "Pas de pistons : une coulisse qui s'allonge ou se raccourcit pour changer la note. Le seul cuivre qui peut glisser d'une note à l'autre sans palier." },
  { id: "tuba", effectif: "1", visuels: 1, nom: "Tuba", fam: "cuivres", rang: 2, g0: 38, g1: 62, banque: "tuba", echant: [34, 58], tess: [28, 65], mode: "lèvres dans une embouchure",
    texte: "Le plus grand et le plus grave des cuivres. Un seul tuba, en général, qui double la basse avec la puissance d'un moteur." },
  { id: "timbales", effectif: "1 timbalier, 2 à 5 timbales", visuels: 2, nom: "Timbales", fam: "percussions", rang: 3, g0: -80, g1: -56, banque: "timbale", echant: [42, 49], tess: [38, 53], mode: "peau tendue, hauteur réglable",
    texte: "De grands bols de cuivre recouverts d'une peau. Contrairement à la plupart des tambours, chaque timbale est accordée sur une note, que l'on change avec une pédale." },
  { id: "caisseClaire", effectif: "1", visuels: 1, nom: "Caisse claire", fam: "percussions", rang: 3, g0: -56, g1: -36, banque: null, tess: null, mode: "peau tendue, avec timbre",
    texte: "Un tambour plat dont la peau du dessous est frottée par des fils métalliques, les timbres : d'où ce son sec et crépitant. Sans hauteur précise." },
  { id: "grosseCaisse", effectif: "1", visuels: 1, nom: "Grosse caisse", fam: "percussions", rang: 3, g0: -36, g1: -16, banque: null, tess: null, mode: "peau tendue",
    texte: "Le plus grand tambour de l'orchestre : un coup, et c'est tout le sol qui gronde. Sans hauteur précise." },
  { id: "cymbales", effectif: "1 ou 2", visuels: 1, nom: "Cymbales", fam: "percussions", rang: 3, g0: -16, g1: 4, banque: null, tess: null, mode: "métal frappé",
    texte: "Deux disques de métal que l'on entrechoque, ou une cymbale suspendue que l'on frappe avec une baguette. Sans hauteur précise." },
  { id: "tamTam", effectif: "1", visuels: 1, nom: "Tam-tam", fam: "percussions", rang: 3, g0: 4, g1: 24, banque: null, tess: null, mode: "métal frappé",
    texte: "Un grand gong suspendu. Le son monte lentement et dure : on le garde pour les moments sombres ou solennels. Sans hauteur précise." },
  { id: "xylophone", effectif: "1", visuels: 1, nom: "Xylophone", fam: "percussions", rang: 3, g0: 24, g1: 48, banque: "xylophone", echant: [67, 108], tess: [65, 108], mode: "lames de bois frappées",
    texte: "Des lames de bois de longueurs différentes, frappées avec des baguettes dures. Le son est sec et brillant : il fait penser à des os qui s'entrechoquent." },
  { id: "cloches", effectif: "1", visuels: 1, nom: "Cloches tubulaires", fam: "percussions", rang: 3, g0: 48, g1: 80, banque: "cloche", echant: [60, 78], tess: [60, 77], mode: "tubes de métal frappés",
    texte: "Des tubes de métal suspendus, frappés d'un coup de maillet : ils imitent les cloches d'une église sans avoir besoin de leur poids." },
  { id: "triangle", effectif: "1", visuels: 1, nom: "Triangle", fam: "percussions", rang: 4, g0: -60, g1: -36, banque: null, tess: null, mode: "métal frappé",
    texte: "Une tige d'acier pliée en triangle, suspendue à un cordon et frappée avec une petite baguette de métal. Un son aigu et clair, qui tinte longtemps si on le laisse vibrer. Sans hauteur précise." },
  { id: "tambourBasque", effectif: "1", visuels: 1, nom: "Tambour de basque", fam: "percussions", rang: 4, g0: -36, g1: -12, banque: null, tess: null, mode: "peau tendue et cymbalettes",
    texte: "Un cadre de bois recouvert d'une peau, bordé de petites cymbalettes de métal : on le frappe avec la main ou on le secoue pour faire sonner les cymbalettes. Sans hauteur précise." },
  { id: "castagnettes", effectif: "1", visuels: 1, nom: "Castagnettes", fam: "percussions", rang: 4, g0: -12, g1: 12, banque: null, tess: null, mode: "bois entrechoqués",
    texte: "Deux petites coques de bois dur reliées par un cordon, que l'on fait claquer. Un claquement sec, qui évoque tout de suite l'Espagne. Sans hauteur précise." },
  { id: "blocsChinois", effectif: "1", visuels: 1, nom: "Blocs chinois", fam: "percussions", rang: 4, g0: 12, g1: 36, banque: null, tess: null, mode: "blocs de bois frappés",
    texte: "Des blocs de bois creux, de tailles différentes, alignés sur un support et frappés avec une baguette : un son sec et creux, d'autant plus grave que le bloc est grand. Sans hauteur précise." },
  { id: "fouet", effectif: "1", visuels: 1, nom: "Fouet", fam: "percussions", rang: 4, g0: 36, g1: 60, banque: null, tess: null, mode: "bois claqués",
    texte: "Deux planchettes de bois articulées que l'on referme d'un coup sec : le claquement imite le bruit d'un fouet. Sans hauteur précise." },
];

export const ORDRE_FAMILLES = ["cordes", "bois", "cuivres", "percussions"];
export const parId = id => INSTRUMENTS.find(i => i.id === id) || null;
export const deLaFamille = f => INSTRUMENTS.filter(i => i.fam === f);

const NOMS = ["do", "do♯", "ré", "ré♯", "mi", "fa", "fa♯", "sol", "sol♯", "la", "la♯", "si"];
export const nomNote = m => NOMS[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
export const noire = m => [1, 3, 6, 8, 10].indexOf(((m % 12) + 12) % 12) >= 0;

// Dans un grand orchestre symphonique : ordres de grandeur d'usage, ils varient selon l'œuvre et la salle. `visuels` : le nombre de dessins posés sur le plan pour la section.

// Les notes que l'on peut réellement faire entendre : la tessiture, limitée à la zone enregistrée de la banque (à 2 demi-tons près, le tampon est simplement transposé).
export function jouables(inst) {
  if (!inst.banque || !inst.tess) return null;
  return [Math.max(inst.tess[0], inst.echant[0] - 2), Math.min(inst.tess[1], inst.echant[1] + 2)];
}

// Une gamme de do majeur d'une octave, dans la zone jouable, au plus près du milieu de la zone. Si la zone est plus étroite qu'une octave : les demi-tons de la zone, au plus huit.
export function gamme(inst) {
  const z = jouables(inst); if (!z) return [];
  const pas = [0, 2, 4, 5, 7, 9, 11, 12], milieu = (z[0] + z[1]) / 2; let meilleur = null;
  for (let c = Math.ceil(z[0] / 12) * 12; c + 12 <= z[1]; c += 12) if (meilleur === null || Math.abs(c + 6 - milieu) < Math.abs(meilleur + 6 - milieu)) meilleur = c;
  if (meilleur !== null) return pas.map(p => meilleur + p);
  const n = []; for (let m = z[0]; m <= z[1] && n.length < 8; m++) n.push(m); return n;
}

// Où poser un secteur du plan : coordonnées polaires autour du chef. Renvoie le chemin SVG d'une portion d'anneau.
export const ANNEAUX = [[112, 214], [220, 292], [298, 366], [372, 432], [440, 500]];
export function secteur(inst, cx = 500, cy = 540, ecart = 1.2) {
  const [r0, r1] = ANNEAUX[inst.rang], a0 = (inst.g0 + ecart) * Math.PI / 180, a1 = (inst.g1 - ecart) * Math.PI / 180;
  const p = (r, a) => (cx + r * Math.sin(a)).toFixed(1) + " " + (cy - r * Math.cos(a)).toFixed(1);
  return "M" + p(r0, a0) + " L" + p(r1, a0) + " A" + r1 + " " + r1 + " 0 0 1 " + p(r1, a1) + " L" + p(r0, a1) + " A" + r0 + " " + r0 + " 0 0 0 " + p(r0, a0) + " Z";
}
export function centre(inst, cx = 500, cy = 540) {
  const [r0, r1] = ANNEAUX[inst.rang], r = (r0 + r1) / 2, a = (inst.g0 + inst.g1) / 2 * Math.PI / 180;
  return [cx + r * Math.sin(a), cy - r * Math.cos(a)];
}
