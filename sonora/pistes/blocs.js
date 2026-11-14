// Le mode blocs de SONORA Pistes : composer par mesures, sans notation, pour un élève de 6e.
// Un BLOC est un clip de notes d'exactement une mesure, posé sur une mesure de la piste (la case d'une grille : une ligne par instrument, une colonne par mesure).
// Ce n'est pas un autre format : le projet reste le même (pistes, clips, sons MIDI). Le mode blocs n'est qu'une autre façon de le voir et de le remplir,
// et on peut à tout moment repasser à la vue en pistes ou ouvrir un bloc dans le piano roll et la partition.
// Une case est « vide », « bloc » (un clip d'une mesure, aligné) ou « long » (un clip qui passe par cette mesure sans être un bloc : un enregistrement,
// un fichier importé, un clip de plusieurs mesures ; on peut l'ouvrir mais pas le copier ni le vider d'ici).
// Sans DOM : testé dans Node (tests/blocs.test.js).
import * as P from "./projet.js?v=090ca757ad";

export const MESURES_PAR_GROUPE = 4;
const TOL = 0.002;   // secondes : l'écart toléré entre un clip et sa mesure (les calculs en secondes ne sont pas exacts)
export const INSTRUMENT_PAR_DEFAUT = "ech:clavier";

export const dureeBloc = p => P.dureeMesure(p);
const debutMesure = (p, m) => m * P.dureeMesure(p);

// Ce que la case (piste, mesure) contient : { type: "vide" } | { type: "bloc", clip, son } | { type: "long", clip, son, audio }
export function caseDe(p, piste, mesure) {
  const pi = typeof piste === "string" ? P.trouverPiste(p, piste) : piste; if (!pi) return { type: "vide" };
  const a = debutMesure(p, mesure), b = a + P.dureeMesure(p), dessus = pi.clips.filter(c => c.debut < b - TOL && c.debut + c.duree > a + TOL);
  if (!dessus.length) return { type: "vide" };
  const c = dessus[0], s = p.sons[c.son];
  const aligne = dessus.length === 1 && Math.abs(c.debut - a) < TOL && Math.abs(c.duree - P.dureeMesure(p)) < TOL && P.estMidi(s) && !(c.decalage > TOL) && !(c.boucle > 0);
  if (aligne) return { type: "bloc", clip: c, son: s };
  return { type: "long", clip: c, son: s, audio: !P.estMidi(s) };
}

// Le nombre de mesures occupées (la dernière mesure touchée par un clip), 0 pour un projet vide.
export const mesuresOccupees = p => { const fin = P.dureeTotale(p), dm = P.dureeMesure(p); return fin <= TOL ? 0 : Math.ceil((fin - TOL) / dm); };
// Les groupes de quatre mesures qu'on propose : tous ceux qui ont du contenu, plus un vide pour continuer, au moins `minimum`.
export const nombreDeGroupes = (p, minimum = 2) => Math.max(minimum, Math.floor(mesuresOccupees(p) / MESURES_PAR_GROUPE) + 1);
export const etiquetteGroupe = g => `${g * MESURES_PAR_GROUPE + 1} à ${(g + 1) * MESURES_PAR_GROUPE}`;

// L'instrument d'une piste : celui qu'on lui a choisi (la pastille), sinon celui de son premier bloc, sinon le piano.
export function instrumentDePiste(p, piste) {
  const pi = typeof piste === "string" ? P.trouverPiste(p, piste) : piste; if (!pi) return INSTRUMENT_PAR_DEFAUT;
  if (pi.instrument) return pi.instrument;
  for (const c of pi.clips) { const s = p.sons[c.son]; if (P.estMidi(s)) return s.midi.instrument || INSTRUMENT_PAR_DEFAUT; }
  return INSTRUMENT_PAR_DEFAUT;
}

const copieNotes = (notes, temps) => (notes || []).filter(n => n.t < temps - 1e-9).map(n => ({ ...n, d: Math.max(1 / 64, Math.min(n.d, temps - n.t)) }));

// Un bloc neuf dans une case vide. Renvoie { clip, son } (identifiants). Les notes, si on en donne, sont coupées à la mesure.
export function creerBloc(p, pisteId, mesure, { notes = [], instrument } = {}) {
  const pi = P.trouverPiste(p, pisteId); if (!pi) throw new Error("piste introuvable");
  if (!Number.isInteger(mesure) || mesure < 0) throw new Error("mesure invalide");
  if (caseDe(p, pi, mesure).type !== "vide") throw new Error("cette case n'est pas vide");
  const inst = instrument || instrumentDePiste(p, pi), temps = p.temps, duree = dureeBloc(p);
  const son = P.ajouterSon(p, { nom: `${pi.nom.slice(0, 30)}, mesure ${mesure + 1}`, duree, sr: 44100, canaux: 2, midi: { notes: copieNotes(notes, temps), instrument: inst, temps, rendu: -1 } });
  const clip = P.placerClip(p, pisteId, son, debutMesure(p, mesure), { duree });
  return { clip, son };
}

// Le contenu d'un bloc, pour le copier : { notes, temps } ou null si la case n'est pas un bloc.
export function copierBloc(p, pisteId, mesure) {
  const c = caseDe(p, pisteId, mesure); if (c.type !== "bloc") return null;
  return { notes: c.son.midi.notes.map(n => ({ ...n })), temps: c.son.midi.temps };
}

// Colle un contenu dans une case : une case vide reçoit un bloc neuf, un bloc reçoit les notes à la place des siennes (même instrument : celui de la piste).
// Renvoie { clip, son } ou null si la case est un clip « long » (on ne le remplace pas d'ici).
export function collerBloc(p, pisteId, mesure, presse) {
  if (!presse || !Array.isArray(presse.notes)) return null;
  const c = caseDe(p, pisteId, mesure);
  if (c.type === "long") return null;
  if (c.type === "vide") return creerBloc(p, pisteId, mesure, { notes: presse.notes });
  c.son.midi.notes = copieNotes(presse.notes, c.son.midi.temps); c.son.midi.rendu = -1; delete c.son.midi.partition;
  return { clip: c.clip.id, son: c.clip.son };
}

// Copie le bloc de la case `de` dans la case `vers` de la même piste (la case d'arrivée reçoit les notes).
export function dupliquerBloc(p, pisteId, de, vers) {
  const presse = copierBloc(p, pisteId, de); if (!presse) return null;
  return collerBloc(p, pisteId, vers, presse);
}

// Vide une case : le bloc disparaît (Annuler le rend). Les clips « longs » ne sont pas touchés d'ici. Renvoie vrai si quelque chose a été retiré.
export function viderBloc(p, pisteId, mesure) {
  const c = caseDe(p, pisteId, mesure); if (c.type !== "bloc") return false;
  return P.supprimerClip(p, c.clip.id);
}

// Change l'instrument d'une piste : la pastille, et tous ses clips de notes (leur audio est à refaire). Renvoie les identifiants des sons à refaire.
export function reglerInstrumentPiste(p, pisteId, instrument) {
  const pi = P.trouverPiste(p, pisteId); if (!pi || !instrument) return [];
  pi.instrument = instrument; const refaire = new Set();
  for (const c of pi.clips) { const s = p.sons[c.son]; if (P.estMidi(s) && s.midi.instrument !== instrument) { s.midi.instrument = instrument; s.midi.rendu = -1; refaire.add(c.son); } }
  return [...refaire];
}

// Une piste de plus, avec son instrument. Renvoie la piste.
export function ajouterPiste(p, instrument, nom) {
  const pi = P.nouvellePiste(nom || `Piste ${p.pistes.length + 1}`); pi.instrument = instrument || INSTRUMENT_PAR_DEFAUT; p.pistes.push(pi); return pi;
}

// L'aperçu d'un bloc dans sa case : de petites barres, la position en abscisse (0 à 1 de la mesure) et la hauteur en ordonnée (0 en haut, 1 en bas).
// Les hauteurs sont rapportées à l'étendue du bloc, au moins une octave, pour qu'un bloc de deux notes ne s'étale pas sur toute la case.
export function apercu(notes, temps) {
  if (!notes || !notes.length || !(temps > 0)) return [];
  const ns = notes.map(n => n.n), mi = Math.min(...ns), ma = Math.max(...ns), etendue = Math.max(11, ma - mi), centre = (mi + ma) / 2, bas = centre - etendue / 2;
  return notes.filter(n => n.t < temps).map(n => ({ x: Math.max(0, n.t / temps), w: Math.max(0.03, Math.min(n.d, temps - n.t) / temps), y: 1 - (n.n - bas) / etendue }));
}

// Pour le lecteur d'écran et l'infobulle : ce que dit une case.
export function dire(p, piste, mesure) {
  const pi = typeof piste === "string" ? P.trouverPiste(p, piste) : piste, c = caseDe(p, pi, mesure), qui = `${pi ? pi.nom : "Piste"}, mesure ${mesure + 1}`;
  if (c.type === "vide") return `${qui} : vide`;
  if (c.type === "bloc") { const n = c.son.midi.notes.length; return `${qui} : ${n === 0 ? "bloc vide" : n === 1 ? "1 note" : n + " notes"}`; }
  return `${qui} : ${c.audio ? "un son enregistré" : "un clip de plusieurs mesures"}`;
}

// La position de lecture dans la grille : { groupe, x } avec x de 0 à 1 dans le groupe, ou null hors des mesures.
export function positionDansGrille(p, tete) {
  const dm = P.dureeMesure(p), m = tete / dm; if (!(m >= 0)) return null;
  const groupe = Math.floor(m / MESURES_PAR_GROUPE); return { groupe, x: (m - groupe * MESURES_PAR_GROUPE) / MESURES_PAR_GROUPE };
}
