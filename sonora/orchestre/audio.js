// SONORA Orchestre : lecture des échantillons de la banque du site, partagée par les espaces 01 (explorer) et 03 (timbres).
// Chaque lecture est rendue à l'avance (mixer) puis jouée : une seule lecture à la fois, `arreter` coupe tout.
import { nomNote } from "./donnees.js?v=d02336debb";
import { mixer, preparer } from "../harmonie/echantillons.js?v=d02336debb";

let ctx = null, sources = [], jeton = 0;
// Une seule lecture compte : la dernière demandée. Chaque demande prend un numéro (`debut`) ; arrêter, ou demander autre chose, rend périmées celles qui sont encore en préparation.
// Avant (rafale de clics sur les instruments, 24/11/2026) : huit rendus complets étaient calculés à la suite, chacun coupant le précédent, et l'écran se figeait sur un poste lent.
export function arreter() { jeton++; for (const s of sources) { try { s.stop(); } catch (e) {} } sources = []; }
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
  const c = contexte(); arreter(); const g = c.createGain(); g.gain.value = 0.8; g.connect(c.destination); const t0 = c.currentTime + 0.05; let dernier = null, fin0 = 0;
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
