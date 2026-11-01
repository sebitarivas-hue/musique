// Les commandes de SONORA Pistes : une seule table pour la barre de menus, les raccourcis clavier et la fenêtre d'aide, donc toujours d'accord entre elles.
// `touches` : une ou plusieurs combinaisons, écrites comme on les affiche (Ctrl+Z, Ctrl+Maj+Z, Espace, Suppr...).
export const MENUS = ["Fichier", "Édition", "Lecture", "Piste", "Effets", "Affichage", "Aide"];
export const COMMANDES = [
  { id: "importer", menu: "Fichier", libelle: "Importer des sons…", touches: ["Ctrl+I"] }, { id: "exporter", menu: "Fichier", libelle: "Exporter en WAV", touches: ["Ctrl+Maj+E"] }, { id: "nouveau", menu: "Fichier", libelle: "Nouveau projet", touches: [] },
  { id: "annuler", menu: "Édition", libelle: "Annuler", touches: ["Ctrl+Z"] }, { id: "refaire", menu: "Édition", libelle: "Rétablir", touches: ["Ctrl+Y", "Ctrl+Maj+Z"] },
  { id: "couper", menu: "Édition", libelle: "Couper le clip au curseur", touches: ["S"], clip: true }, { id: "dupliquer", menu: "Édition", libelle: "Dupliquer le clip", touches: ["D", "Ctrl+D"], clip: true },
  { id: "supprimer", menu: "Édition", libelle: "Supprimer le clip", touches: ["Suppr", "Retour"], clip: true }, { id: "deselectionner", menu: "Édition", libelle: "Désélectionner", touches: ["Échap"] },
  { id: "lire", menu: "Lecture", libelle: "Lire / Arrêter", touches: ["Espace"] }, { id: "debut", menu: "Lecture", libelle: "Revenir au début", touches: ["Début"] }, { id: "enregistrer", menu: "Lecture", libelle: "Enregistrer sur la piste choisie", touches: ["R"] }, { id: "metronome", menu: "Lecture", libelle: "Métronome : activer / couper", touches: ["K"] },
  { id: "piste-ajouter", menu: "Piste", libelle: "Ajouter une piste", touches: ["T"] }, { id: "piste-haut", menu: "Piste", libelle: "Piste précédente", touches: ["↑"] }, { id: "piste-bas", menu: "Piste", libelle: "Piste suivante", touches: ["↓"] },
  { id: "piste-muet", menu: "Piste", libelle: "Muet sur la piste choisie", touches: ["M"] }, { id: "piste-solo", menu: "Piste", libelle: "Solo sur la piste choisie", touches: ["O"] },
  { id: "normaliser", menu: "Effets", libelle: "Normaliser le clip", touches: ["N"], clip: true }, { id: "inverser", menu: "Effets", libelle: "Inverser le clip", touches: ["V"], clip: true },
  { id: "gain-plus", menu: "Effets", libelle: "Gain +3 dB", touches: ["]"], clip: true }, { id: "gain-moins", menu: "Effets", libelle: "Gain −3 dB", touches: ["["], clip: true },
  { id: "fondu-entree", menu: "Effets", libelle: "Fondu d'entrée", touches: ["F"], clip: true }, { id: "fondu-sortie", menu: "Effets", libelle: "Fondu de sortie", touches: ["Maj+F"], clip: true },
  { id: "vitesse-double", menu: "Effets", libelle: "Vitesse ×2 (une octave plus haut)", touches: [], clip: true }, { id: "vitesse-moitie", menu: "Effets", libelle: "Vitesse ÷2 (une octave plus bas)", touches: [], clip: true },
  { id: "zoom-plus", menu: "Affichage", libelle: "Zoom avant", touches: ["+", "="] }, { id: "zoom-moins", menu: "Affichage", libelle: "Zoom arrière", touches: ["-"] }, { id: "zoom-tout", menu: "Affichage", libelle: "Zoom par défaut", touches: ["0"] },
  { id: "aide-raccourcis", menu: "Aide", libelle: "Raccourcis clavier", touches: ["?"] },
];
const NOMS = { Espace: " ", Suppr: "Delete", Retour: "Backspace", "Début": "Home", "↑": "ArrowUp", "↓": "ArrowDown", "Échap": "Escape" };
export function correspond(touche, e) {
  let cle = touche; const p = []; for (let change = true; change;) { change = false; for (const m of ["Ctrl", "Maj", "Alt"]) if (cle.startsWith(m + "+") && cle.length > m.length + 1) { p.push(m); cle = cle.slice(m.length + 1); change = true; } } // « + » seul est une touche, pas un séparateur
  const ctrl = p.includes("Ctrl"), maj = p.includes("Maj"), alt = p.includes("Alt");
  if ((e.ctrlKey || e.metaKey) !== ctrl || !!e.altKey !== alt) return false;
  const k = NOMS[cle] || cle;
  if (k.length === 1 && /[a-z]/i.test(k)) return e.key.toLowerCase() === k.toLowerCase() && !!e.shiftKey === maj;
  if (k === "?" || k === "+" ) return e.key === k;          // la majuscule fait partie du caractère
  return e.key === k && (!maj || e.shiftKey);
}
export function commandePour(e) { return COMMANDES.find(c => c.touches.some(t => correspond(t, e))) || null; }
export const affichage = c => c.touches.length ? c.touches.join(" ou ") : "";
