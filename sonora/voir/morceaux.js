// Les morceaux de « Voir la musique » : des listes d'événements (temps en noires, durée, note MIDI, intensité, genre de son).
// Trois morceaux courts, synthétisés dans le navigateur : rien à télécharger, aucun droit à demander (Bach, 1722 ; Reich, 1967, motif seulement ; groove original).
const NOMS = ["do", "do♯", "ré", "ré♯", "mi", "fa", "fa♯", "sol", "sol♯", "la", "la♯", "si"];
export const nomNote = m => NOMS[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
export const classe = m => ((m % 12) + 12) % 12;
export const NOMS_CLASSES = NOMS;

// Bach, Prélude en do majeur (Clavier bien tempéré I, 1722), mesures 1 à 8, version simplifiée à une main : chaque mesure répète deux fois le même dessin de huit doubles croches.
const BACH = [[60, 64, 67, 72, 76], [60, 62, 69, 74, 77], [59, 62, 67, 74, 77], [60, 64, 67, 72, 76], [60, 64, 69, 76, 81], [60, 62, 66, 69, 74], [59, 62, 67, 74, 79], [59, 60, 64, 67, 72]];
function bach() {
  const ev = [];
  BACH.forEach((n, mesure) => {
    const dessin = n.length === 5 ? [n[0], n[1], n[2], n[3], n[4], n[2], n[3], n[4]] : n;
    for (let r = 0; r < 2; r++) dessin.forEach((m, i) => ev.push({ t: mesure * 4 + r * 2 + i * 0.25, d: 0.9, m, v: i === 0 ? 0.9 : 0.6, k: "note", voix: 0 }));
    // la note la plus grave est tenue : elle donne l'accord
    ev.push({ t: mesure * 4, d: 3.8, m: n[0] - 12, v: 0.55, k: "note", voix: 1 });
  });
  return ev;
}
// Reich, Piano Phase (1967) : un motif de douze notes ; la seconde voix joue un peu plus vite, elle décale peu à peu.
const REICH = [64, 66, 71, 73, 74, 66, 64, 73, 71, 66, 74, 73];
function reich() {
  const ev = [];
  for (let n = 0; n < 96; n++) ev.push({ t: n * 0.25, d: 0.2, m: REICH[n % 12], v: 0.75, k: "note", voix: 0 });
  for (let n = 0; n < 100; n++) ev.push({ t: n * 0.24, d: 0.2, m: REICH[n % 12] + 12, v: 0.55, k: "note", voix: 1 });
  return ev;
}
// Un groove original, deux mesures : grosse caisse, caisse claire sur les temps 2 et 4, charleston en croches, et une basse.
function groove() {
  const ev = [], BASSE = [36, 36, 0, 39, 0, 41, 0, 36];
  for (let mesure = 0; mesure < 2; mesure++) {
    const o = mesure * 4;
    [0, 1.5, 2.5].forEach(t => ev.push({ t: o + t, d: 0.2, m: 36, v: 0.95, k: "kick", voix: 0 }));
    [1, 3].forEach(t => ev.push({ t: o + t, d: 0.2, m: 38, v: 0.85, k: "snare", voix: 1 }));
    for (let i = 0; i < 8; i++) ev.push({ t: o + i * 0.5, d: 0.1, m: 42, v: i % 2 ? 0.35 : 0.55, k: "hat", voix: 2 });
    BASSE.forEach((m, i) => { if (m) ev.push({ t: o + i * 0.5, d: 0.45, m: m + 12, v: 0.8, k: "note", voix: 3 }); });
  }
  return ev;
}
export const MORCEAUX = [
  { id: "bach", titre: "Bach, Prélude en do majeur", court: "Bach", annee: "1722", bpm: 66, boucle: 32, mesure: 4, voix: ["main droite", "basse tenue"], ev: bach(), consigne: "Combien de notes différentes entends-tu dans une mesure ? Regarde le piano roll : le dessin se répète deux fois, puis change d'accord.", note: "Version simplifiée, à une main." },
  { id: "reich", titre: "Reich, Piano Phase (motif)", court: "Reich", annee: "1967", bpm: 120, boucle: 24, mesure: 3, voix: ["voix 1", "voix 2, un peu plus vite"], ev: reich(), consigne: "Quand les deux voix sont-elles ensemble ? Regarde l'orbite : les points des deux voix se décalent peu à peu.", note: "Seul le motif est repris ; la durée est abrégée." },
  { id: "groove", titre: "Un groove, deux mesures", court: "Groove", annee: "original", bpm: 92, boucle: 8, mesure: 4, voix: ["grosse caisse", "caisse claire", "charleston", "basse"], ev: groove(), consigne: "Où tombent la grosse caisse et la caisse claire dans l'orbite ? Que fait le charleston entre les deux ?", note: "Composé pour ce site." },
];
