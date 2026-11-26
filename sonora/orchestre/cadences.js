// SONORA Orchestre : les cadences, c'est-à-dire des enchaînements d'accords qui terminent une phrase (sans DOM, testé dans Node).
// Toutes sont en do majeur. Chaque accord est voicé avec la règle de accord.js (une note par instrument, pas d'unisson), et chaque instrument
// garde une voix proche de sa note précédente d'un accord à l'autre : l'enchaînement sonne comme une suite de voix, pas une suite de sauts.
import { voicerAccord, ACCORDS } from "./accord.js?v=a6a5a8c5db";

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
