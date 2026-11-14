// TIMBRE : les instruments du jeu, rangés en trois univers. Tout est de vrais enregistrements de la banque du site (domaine public, voir outils/banque_*.py) :
// on ne fait jamais deviner un son qui n'existe pas. Hauteurs en numéros MIDI (60 = do4). `echant` : la zone enregistrée dans la banque (catalogue.json).
// Le nom du jeu est ici et nulle part ailleurs : un seul endroit à changer.
import { INSTRUMENTS, FAMILLES } from "../orchestre/donnees.js?v=5a761f0ed5";
import { PHOTOS } from "../orchestre/photos.js?v=5a761f0ed5";

export const NOM_JEU = "TIMBRE";
export const DEVISE = "Écoute. Devine. Monte de niveau.";

const premiereP = t => { const m = /^[^.!?]*[.!?]/.exec(t || ""); return (m ? m[0] : t || "").trim(); };
const nomOrchestre = i => (i.id === "violons1" ? "Violons" : i.nom);

// Orchestre : tous les instruments du plan qui ont un enregistrement (les seconds violons ont le même son que les premiers).
const ORCHESTRE = INSTRUMENTS.filter(i => i.banque && i.id !== "violons2").map(i => ({
  id: i.id, nom: nomOrchestre(i), groupe: i.fam, banque: i.banque, echant: i.echant, photo: PHOTOS[i.id] ? PHOTOS[i.id].f : null,
  fait: `${premiereP(i.texte)} ${i.mode ? "On le joue avec : " + i.mode + "." : ""}`.trim() }));

const SCENE = [
  { id: "guitare-elec", nom: "Guitare électrique", groupe: "guitares", banque: "guitare-elec", echant: [37, 86], fait: "Des cordes d'acier captées par des micros : c'est l'amplificateur et les effets qui font le son du rock." },
  { id: "guitare-jazz", nom: "Guitare jazz", groupe: "guitares", banque: "guitare-jazz", echant: [37, 84], fait: "Une guitare à caisse creuse avec un micro : un son rond et chaud, typique du jazz." },
  { id: "guitare-folk", nom: "Guitare acoustique", groupe: "guitares", banque: "guitare-folk", echant: [37, 84], fait: "Des cordes d'acier sur une caisse creuse, sans amplificateur : la guitare des feux de camp et de la folk." },
  { id: "basse", nom: "Basse électrique", groupe: "graves", banque: "basse", echant: [24, 69], fait: "Elle joue les notes graves qui portent l'harmonie et le rythme, avec la batterie." },
  { id: "orgue", nom: "Orgue", groupe: "claviers", banque: "orgue", echant: [24, 96], fait: "Un clavier qui envoie de l'air dans des tuyaux : le son reste aussi fort tant qu'on tient la touche." },
  { id: "piano", nom: "Piano", groupe: "claviers", banque: "clavier", echant: [21, 108], fait: "Des marteaux frappent des cordes : on peut jouer fort ou doux, et le son s'éteint tout seul." },
  { id: "clavecin", nom: "Clavecin", groupe: "claviers", banque: "clavecin", echant: [30, 96], fait: "Les cordes sont pincées par des becs de plume : le son est sec et ne change pas, qu'on appuie fort ou doucement." },
];

const MONDE = [
  { id: "djembe", nom: "Djembé", groupe: "peaux", banque: "djembe", echant: [44, 60], fait: "Un tambour en forme de calice d'Afrique de l'Ouest, joué à mains nues : le centre sonne grave, le bord claque." },
  { id: "kalimba", nom: "Kalimba", groupe: "lames", banque: "kalimba", echant: [59, 80], fait: "Des lamelles de métal pincées au pouce sur une caisse de résonance : un instrument d'Afrique de l'Est et d'Afrique australe." },
  { id: "balafon", nom: "Balafon", groupe: "lames", banque: "balafon", echant: [61, 89], fait: "Un xylophone d'Afrique de l'Ouest : des lames de bois, avec une calebasse sous chacune qui fait résonner le son." },
  { id: "marimba", nom: "Marimba", groupe: "lames", banque: "marimba", echant: [41, 96], fait: "Des lames de bois au-dessus de tubes résonateurs : un son rond et chaud, très aimé en Amérique centrale." },
  { id: "vibraphone", nom: "Vibraphone", groupe: "lames", banque: "vibraphone", echant: [57, 88], fait: "Des lames de métal, et dans les tubes de petites hélices qui font onduler le son : un instrument du jazz." },
  { id: "glockenspiel", nom: "Glockenspiel", groupe: "lames", banque: "glockenspiel", echant: [55, 108], fait: "Des lames d'acier frappées avec des mailloches dures : un son cristallin, très aigu." },
];

const COULEURS = { orchestre: ["#6d3df0", "#9b6bff"], scene: ["#e0307a", "#ff7a59"], monde: ["#12a07a", "#47e6c1"] };
export const UNIVERS = [
  { id: "orchestre", nom: "Orchestre", sous: "Cordes, bois, cuivres, percussions", couleurs: COULEURS.orchestre, instruments: ORCHESTRE },
  { id: "scene", nom: "Scène", sous: "Guitares, basse et claviers", couleurs: COULEURS.scene, instruments: SCENE },
  { id: "monde", nom: "Monde", sous: "Peaux et lames du monde", couleurs: COULEURS.monde, instruments: MONDE },
];
export const TOUS = UNIVERS.flatMap(u => u.instruments.map(i => Object.assign({ univers: u.id }, i)));
export const parUnivers = id => UNIVERS.find(u => u.id === id);
export const nomGroupe = g => (FAMILLES[g] && FAMILLES[g].court) || g;
