// SONORA Orchestre : les cadences, c'est-à-dire des enchaînements d'accords qui terminent une phrase (sans DOM, testé dans Node).
// Les cadences en do majeur, puis les cadences en la mineur (mi majeur y joue la dominante, avec le sol dièse). Chaque accord est voicé avec la règle de accord.js (une note par instrument, pas d'unisson), et chaque instrument
// garde une voix proche de sa note précédente d'un accord à l'autre : l'enchaînement sonne comme une suite de voix, pas une suite de sauts.
import { voicerAccord, ACCORDS } from "./accord.js?v=19ef21d316";

export const CADENCES = [
  { id: "parfaite", nom: "Cadence parfaite (V–I)", accords: ["sol", "do"],
    explication: "La dominante (sol) conduit à la tonique (do) : c'est la fin la plus affirmée, celle qu'on entend à la fin d'un morceau." },
  { id: "plagale", nom: "Cadence plagale (IV–I)", accords: ["fa", "do"],
    explication: "La sous-dominante (fa) revient au do : une fin plus douce, celle du « amen » des chorals." },
  { id: "rompue", nom: "Cadence rompue (V–vi)", accords: ["sol", "la"],
    explication: "Le sol appelle le do, mais le la mineur arrive : l'oreille est surprise, la phrase continue." },
  { id: "demi", nom: "Demi-cadence (I–V)", accords: ["do", "sol"],
    explication: "La phrase s'arrête sur la dominante, en suspens : on attend la suite." },
  { id: "complete", nom: "Cadence complète (I–IV–V–I)", accords: ["do", "fa", "sol", "do"],
    explication: "La progression classique : on quitte le do, on passe par la sous-dominante et la dominante, puis on revient au do." },
  { id: "ii-v-i", nom: "ii–V–I (jazz)", accords: ["re", "sol7", "do"],
    explication: "Le ré mineur (ii) prépare le sol 7 (V), qui conduit au do : la progression la plus fréquente du jazz." },
  { id: "mineure-parfaite", nom: "Cadence parfaite en la mineur (V–i)", accords: ["mi", "la"],
    explication: "Le mi majeur porte un sol dièse, qui appelle le la : une fin plus sombre que celle du do majeur." },
  { id: "mineure-plagale", nom: "Cadence plagale en la mineur (iv–i)", accords: ["re", "la"],
    explication: "Le ré mineur revient au la mineur : une fin douce et grave." },
  { id: "mineure-rompue", nom: "Cadence rompue en la mineur (V–VI)", accords: ["mi", "fa"],
    explication: "Le mi majeur appelle le la, mais le fa majeur arrive : la phrase rebondit." },
  { id: "mineure-complete", nom: "Cadence complète en la mineur (i–iv–V–i)", accords: ["la", "re", "mi", "la"],
    explication: "La progression classique, transposée en mineur : la mineur, ré mineur, mi majeur, puis retour au la mineur." },
];

// Renvoie, pour chaque accord de la cadence, { accord, parts : [{ inst, m }] }. Les voix suivent d'un accord à l'autre.
export function voicerCadence(instruments, cadence, zoneDe = undefined) {
  const precedent = new Map();
  return cadence.accords.map(cle => {
    const accord = ACCORDS[cle];
    const parts = voicerAccord(instruments, zoneDe, accord, precedent);
    precedent.clear(); for (const p of parts) precedent.set(p.inst.id, p.m);
    return { accord, parts };
  });
}
