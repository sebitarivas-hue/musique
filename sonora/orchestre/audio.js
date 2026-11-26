// SONORA Orchestre : lecture des échantillons de la banque du site, partagée par les espaces 01 (explorer) et 03 (timbres).
// Chaque lecture est rendue à l'avance (mixer) puis jouée : une seule lecture à la fois, `arreter` coupe tout.
import { nomNote } from "./donnees.js?v=d76f27378a";
import { mixer, preparer } from "../harmonie/echantillons.js?v=d76f27378a";

let ctx = null, sources = [], jeton = 0, sortie = null, salle = null;   // salle : la réverbération, une seule par contexte   // sortie : le seul nœud de gain en service (un par lecture, retiré à l'arrêt)
// Une seule lecture compte : la dernière demandée. Chaque demande prend un numéro (`debut`) ; arrêter, ou demander autre chose, rend périmées celles qui sont encore en préparation.
// Avant (rafale de clics sur les instruments, 24/11/2026) : huit rendus complets étaient calculés à la suite, chacun coupant le précédent, et l'écran se figeait sur un poste lent.
// La réverbération : une réponse impulsionnelle de salle (bruit décroissant, 2,4 s, stéréo), générée une fois et partagée par toutes les lectures.
export function reverberation(c) {
  if (salle && salle.ctx === c) return salle.entree;
  const sr = c.sampleRate, n = Math.round(3.8 * sr), b = c.createBuffer(2, n, sr);
  // générateur pseudo-aléatoire de qualité (mulberry32) : pas de motifs audibles dans la queue
  let g = 0x2545f491;
  const hasard = () => { g = (g + 0x6d2b79f5) | 0; let t = Math.imul(g ^ (g >>> 15), 1 | g); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return (((t ^ (t >>> 14)) >>> 0) / 4294967296) * 2 - 1; };
  const pre = Math.round(0.024 * sr);   // avant-délai : le son direct reste net, la salle arrive après
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch); let y = 0;
    for (let i = pre; i < n; i++) {
      const t = (i - pre) / sr;
      // la queue s'assombrit : le filtre passe-bas se ferme avec le temps, comme l'air et les matériaux d'une salle
      const coupe = 0.6 * Math.exp(-t * 1.1) + 0.05;
      y += coupe * (hasard() - y);
      d[i] = y * Math.exp(-t * 1.25) * (1 - Math.exp(-t * 80));
    }
    // réflexions précoces, légèrement différentes à gauche et à droite
    [[0.023, 0.5], [0.037, 0.35], [0.052, 0.25], [0.071, 0.18]].forEach(([tp, a], k) => { const i = Math.round((tp + (ch ? 0.003 * (k + 1) : 0)) * sr); if (i < n) d[i] += a * (k % 2 ? -1 : 1) * 0.5; });
  }
  const conv = c.createConvolver(); conv.buffer = b;
  const retour = c.createGain(); retour.gain.value = 1.2; conv.connect(retour); retour.connect(c.destination);
  salle = { ctx: c, entree: conv }; return conv;
}
// Spatialisation : un instrument garde sa place sur le plan. Son centre (g0, g1 : angles depuis le chef) donne la position gauche-droite,
// et le rang (0 cordes devant, 4 percussions au fond) donne la profondeur : les rangs du fond sont un peu plus loin. Puissance constante.
export function placer(lr, inst) {
  if (!lr || !inst) return lr;
  const [L, R] = lr, n = L.length, a = ((inst.g0 + inst.g1) / 2) * Math.PI / 180;
  const pan = Math.max(-0.85, Math.min(0.85, Math.sin(a) * 0.85)), th = (pan + 1) * Math.PI / 4;
  const prof = [1, 0.94, 0.88, 0.82, 0.78][inst.rang] ?? 0.9, gl = Math.cos(th) * prof, gr = Math.sin(th) * prof;
  const OL = new Float32Array(n), OR = new Float32Array(n);
  for (let i = 0; i < n; i++) { const m = (L[i] + R[i]) / 2; OL[i] = m * gl; OR[i] = m * gr; }
  return [OL, OR];
}
// Équilibrage : chaque piste ramenée à un même niveau moyen (gain borné), pour qu'un instrument doux ne soit pas couvert par un instrument fort.
// Équilibre d'orchestre, en décibels, par instrument (approximation d'une balance symphonique typique, pas une mesure) :
// les cuivres dominent en forte, les cordes forment la base, les bois sont en retrait, la harpe et le célesta sont doux, les timbales et la grosse caisse sont accentués.
// Les échantillons de la banque sont déjà ramenés à un même niveau à la fabrication : cette table redonne la hiérarchie, sans jamais amplifier une piste.
export const NIVEAU_ORCHESTRE = {
  violons1: 0, violons2: -0.5, altos: -1, violoncelles: -1, contrebasses: -2,
  harpe: -4, piccolo: -2, flutes: -2, hautbois: -2, corAnglais: -2, clarinettes: -2, clarinetteBasse: -2, bassons: -2,
  cors: 2, trompettes: 3, trombones: 3, tuba: 3, timbales: 1,
  xylophone: -2, cloches: -2, celesta: -5, grosseCaisse: 0, caisseClaire: -1, cymbales: -1, tamTam: 0,
  triangle: -5, tambourBasque: -3, fouet: -3, castagnettes: -4, blocsChinois: -4,
};
// Applique le niveau relatif de chaque instrument. Aucune mesure, aucune amplification : une piste reste à son niveau, à un décibel près.
export function equilibrer(listes, ids = []) {
  return listes.map((lr, k) => {
    if (!lr) return lr;
    const g = Math.pow(10, (NIVEAU_ORCHESTRE[ids[k]] ?? 0) / 20);
    return g === 1 ? lr : [lr[0].map(v => v * g), lr[1].map(v => v * g)];
  });
}
export function arreter() { jeton++; for (const s of sources) { try { s.stop(); } catch (e) {} } sources = []; if (sortie) { try { sortie.disconnect(); } catch (e) {} sortie = null; } }
export const enCours = () => sources.length > 0;   // vrai tant qu'un son joue (une animation peut s'arrêter quand il se tait)
export const debut = () => { arreter(); return jeton; };
export const perimee = j => j !== jeton;
export function message(t) { const e = document.getElementById("etat"); if (e) e.textContent = t; }
export function contexte() { if (!ctx) { const AC = window.AudioContext || window.webkitAudioContext; ctx = new AC(); } if (ctx.state === "suspended") ctx.resume(); return ctx; }

// Un tampon audio stéréo pour des notes (numéros MIDI) jouées par l'instrument. pas : durée entre notes (une gamme), sinon une note tenue.
export async function rendre(inst, notes, pas, j) {
  if (!inst.banque || !notes.length) return null;
  const c = contexte(), tampons = await preparer(inst.banque, c); if (!tampons) return null;
  if (j !== undefined && perimee(j)) return null;   // une demande plus récente a pris la place : on ne calcule rien
  const tenue = inst.duree || 1.8, ev = notes.map((m, i) => ({ t: i * (pas || 0), duree: pas ? pas * 0.9 : tenue, notes: [m], vitesse: 0.8 }));   // inst.duree : un coup de tam-tam sonne plus longtemps qu'une note
  const lr = mixer(ev, tampons, { sr: c.sampleRate, instrument: inst.banque, duree: ev[ev.length - 1].t + (pas ? 0.8 + (inst.duree || 0) * 0.5 : tenue + 0.6) });
  const buf = c.createBuffer(2, lr[0].length, c.sampleRate); buf.copyToChannel(lr[0], 0); buf.copyToChannel(lr[1], 1); return buf;
}
// Les voix d'une fugue : chaque voix est rendue avec son instrument (evenements en secondes), puis les voix sont additionnées dans un seul tampon, sans écrêtage.
export async function rendreMelodie(inst, evenements, duree, j) {
  if (!inst.banque || !evenements.length) return null; const c = contexte(), tampons = await preparer(inst.banque, c); if (!tampons) return null;
  if (j !== undefined && perimee(j)) return null;
  return mixer(evenements, tampons, { sr: c.sampleRate, instrument: inst.banque, duree });
}
export function sommer(listes, duree) {
  const c = contexte(), n = Math.round(duree * c.sampleRate), L = new Float32Array(n), R = new Float32Array(n);
  for (const lr of listes) if (lr) for (let i = 0; i < Math.min(n, lr[0].length); i++) { L[i] += lr[0][i]; R[i] += lr[1][i]; }
  let pic = 0; for (let i = 0; i < n; i++) pic = Math.max(pic, Math.abs(L[i]), Math.abs(R[i])); if (pic > 0.9) { const k = 0.9 / pic; for (let i = 0; i < n; i++) { L[i] *= k; R[i] *= k; } }
  const buf = c.createBuffer(2, n, c.sampleRate); buf.copyToChannel(L, 0); buf.copyToChannel(R, 1); return buf;
}
export const heure = () => (ctx ? ctx.currentTime : 0);
// Joue une liste de parties : [{ buf, delai }] (secondes). Appelle fin() à la fin de la dernière.
export function lire(parties, fin) {
  const c = contexte(); arreter(); const g = c.createGain(); g.gain.value = 0.8; g.connect(c.destination); g.connect(reverberation(c)); sortie = g; /* son direct + envoi vers la salle */ const t0 = c.currentTime + 0.05; let dernier = null, fin0 = 0;
  for (const p of parties) { const s = c.createBufferSource(); s.buffer = p.buf; s.connect(g); s.start(t0 + (p.delai || 0)); sources.push(s); if ((p.delai || 0) + p.buf.duration >= fin0) { fin0 = (p.delai || 0) + p.buf.duration; dernier = s; } }
  if (dernier) dernier.onended = () => { if (sources.indexOf(dernier) >= 0) { sources = []; if (fin) fin(); } };
  return t0;
}
// Une note tenue ou une gamme, d'un seul instrument (espace 01).
export async function jouer(inst, notes, pas) {
  if (!inst.banque || !notes.length) return; const j = debut(); message("chargement de " + inst.nom.toLowerCase() + "…");
  const buf = await rendre(inst, notes, pas, j); if (perimee(j)) return; if (!buf) { message("les sons ne sont pas disponibles ici"); return; }
  lire([{ buf }], () => message("prêt")); message(pas ? "gamme : " + nomNote(notes[0]) + " à " + nomNote(notes[notes.length - 1]) : nomNote(notes[0]));
}
