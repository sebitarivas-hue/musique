// Le vocabulaire d'une fugue, pour l'espace 05 (construire) et l'espace 02 (la fugue de Britten). Une seule source : les définitions des sections viennent de fugue_logique.js.
import { SECTIONS } from "./fugue_logique.js?v=b900c284ee";
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const section = id => SECTIONS.find(s => s.id === id).texte;
export const TERMES = [
  { mot: "Fugue", texte: "Une pièce pour plusieurs voix qui reprennent toutes la même phrase musicale, l'une après l'autre. Chaque voix reste indépendante : on entend plusieurs mélodies en même temps. C'est le contrepoint." },
  { mot: "Sujet", texte: "La phrase de départ, courte et facile à reconnaître. Elle revient tout au long de la fugue, dans toutes les voix." },
  { mot: "Réponse", texte: "Le sujet repris par la deuxième voix, une quinte plus haut (ou plus bas). Dans une fugue ancienne, on change parfois un intervalle pour rester dans le ton : c'est la réponse tonale. Ici, la réponse est exacte, le sujet est seulement transposé." },
  { mot: "Contre-sujet", texte: "La mélodie que garde la voix qui vient de jouer le sujet, pendant que la suivante entre avec la réponse. Elle s'accorde avec le sujet et revient ensuite avec lui." },
  { mot: "Exposition", texte: section("exposition") },
  { mot: "Divertissement", texte: section("divertissement") },
  { mot: "Strette", texte: section("strette") },
  { mot: "Pédale", texte: section("pedale") },
  { mot: "Conclusion", texte: section("conclusion") },
  { mot: "Deux thèmes superposés", texte: "Une fugue peut finir en faisant entendre ensemble deux thèmes : le sujet de la fugue et un second thème, qui revient par-dessus avec une autre orchestration. C'est le cas de la fin du Guide de l'orchestre de Britten." },
];
export function htmlGlossaire(ouvert) {
  return '<details class="glossaire"' + (ouvert ? " open" : "") + "><summary>Le vocabulaire de la fugue</summary><dl>" + TERMES.map(t => "<dt>" + esc(t.mot) + "</dt><dd>" + esc(t.texte) + "</dd>").join("") + "</dl></details>";
}
