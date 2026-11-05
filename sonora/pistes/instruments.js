// Les instruments du clavier de Pistes (retour de Sébastien du 05/11/2026 : « la liste n'est pas riche, pas plaisante, et beaucoup ne marchent pas »).
// Avant : la liste de la Library (des programmes de démonstration aux noms techniques, certains sans voix, joués par le moteur temps réel du Studio).
// Maintenant : un seul mécanisme pour tout. Chaque instrument est un jeu de notes (des « tampons ») : des enregistrements réels de la banque du site, ou des notes rendues
// une fois par SONORA (synthèse) à plusieurs hauteurs. Le clavier les joue en direct par transposition (Sampleur) et le clip est mixé avec les mêmes tampons (mixer) :
// ce qu'on entend est ce qui est mis sur la piste. Plus de dépendance au moteur temps réel : si le son sort ailleurs sur la page, il sort ici.
import { compiler } from "../src/index.js?v=a44f89b8f6";
import { rendre } from "../src/rendu.js?v=a44f89b8f6";
import { SONS_SYNTHESE } from "../harmonie/sons_synthese.js?v=a44f89b8f6";
import { SONS_PERCUSSION } from "../harmonie/sons_percussion.js?v=a44f89b8f6";
import { ENTREES } from "../library/catalogue.js?v=a44f89b8f6";
import { preparer, choisir, NIVEAU, RELACHE } from "../harmonie/echantillons.js?v=a44f89b8f6";
import { INSTRUMENTS_ECH } from "./bibliotheque.js?v=a44f89b8f6";

const hz = m => 440 * Math.pow(2, (m - 69) / 12);
export const GROUPES = ["Claviers", "Cordes", "Vents", "Voix", "Percussions à hauteurs", "Percussions du monde", "Synthés et basses", "Effets sonores"];

// Instruments de la Library choisis pour leur sonorité (les autres programmes de la Library sont des démonstrations pédagogiques, sans voix).
// [identifiant, nom affiché, groupe, note de départ, tenue (le son se prolonge tant qu'on appuie), ponctuel (il sonne en entier, même si on relâche)]
const LIBRARY = [
  ["lames-metal", "Métallophone", "Percussions à hauteurs", 72, false, true], ["steelpan", "Pan de Trinité (steelpan)", "Percussions à hauteurs", 67, false, true],
  ["flute-soufflee", "Flûte soufflée (shakuhachi, ney)", "Vents", 69, true, false], ["diphonique", "Chant diphonique", "Voix", 48, true, false], ["voyelles", "Voix de voyelles", "Voix", 60, true, false],
  ["tambour-main", "Tambour frappé à la main", "Percussions du monde", 55, false, true], ["supersaw", "Supersaw (cinq dents de scie)", "Synthés et basses", 60, true, false],
  ["basse", "Basse soustractive", "Synthés et basses", 36, true, false], ["fm", "Synthé FM", "Synthés et basses", 60, true, false],
];
const SYNTHES = { basse808: [36, true, false], sub: [36, true, false], lead: [67, true, false], nappe: [60, true, false], pianoElec: [60, false, false], pluck: [60, false, false], orgueRock: [60, true, false], cloches: [72, false, true], stab: [60, false, false] };
const DUREES = { gong: 6.5, bol: 6.5, montee: 4.2, tonnerre: 4, trianglePerc: 4, cymbale: 3.5, vent: 3.5, impact: 3, sirene: 3 };

// Le catalogue : { id, nom, groupe, note, tenue, ponctuel, source: "ech" | "syn" | "lib", cle }
export function catalogue() {
  const L = [];
  for (const [b, nom, groupe, note] of INSTRUMENTS_ECH) L.push({ id: `ech:${b}`, nom, groupe: groupe === "Percussions" ? "Percussions du monde" : groupe, note, tenue: !["clavier", "harpe", "guitare", "clavecin", "marimba", "vibraphone", "xylophone", "glockenspiel", "balafon", "kalimba", "cloche", "djembe", "timbale"].includes(b), ponctuel: ["djembe", "timbale", "cloche"].includes(b), source: "ech", cle: b });
  for (const [k, S] of Object.entries(SONS_SYNTHESE)) { const [note, tenue, ponctuel] = SYNTHES[k] || [60, false, false]; L.push({ id: `syn:${k}`, nom: S.nom, groupe: "Synthés et basses", note, tenue, ponctuel, source: "syn", cle: k }); }
  for (const [id, nom, groupe, note, tenue, ponctuel] of LIBRARY) L.push({ id: `lib:${id}`, nom, groupe, note, tenue, ponctuel, source: "lib", cle: id });
  for (const [k, S] of Object.entries(SONS_PERCUSSION)) L.push({ id: `syn:${k}`, nom: S.nom, groupe: S.famille === "perc" ? "Percussions du monde" : "Effets sonores", note: S.note, tenue: false, ponctuel: true, source: "syn", cle: k, duree: DUREES[k] || 2.5 });
  return L.sort((a, b) => GROUPES.indexOf(a.groupe) - GROUPES.indexOf(b.groupe));
}

// Rend un module SONORA à plusieurs hauteurs et en fait des tampons { f, canal, sr, off, a, b } : la même forme que les enregistrements de la banque.
// Instrument tenu : on rend une note longue et on garde, pour la boucle, un nombre entier de périodes (pas de clic au bouclage).
export function tamponsSynthese(module, { note = 60, tenue = false, duree = 2.5, sr = 44100, demiTons = 4 } = {}) {
  const bas = Math.max(24, note - 24), haut = Math.min(100, note + 24), notes = []; for (let m = bas; m <= haut; m += demiTons) notes.push(m);
  const seg = tenue ? 3.4 : Math.max(2.2, duree), tenueNote = tenue ? 2.4 : Math.min(0.6, seg), ev = []; notes.forEach((m, i) => { const a = Math.round(i * seg * sr); ev.push({ a, on: i + 1, hauteur: hz(m), vitesse: 0.85 }, { a: a + Math.round(tenueNote * sr), off: i + 1 }); });
  const sortie = rendre(module, { sr, n: Math.round(notes.length * seg * sr), notes: ev }), L = sortie.canaux[0], R = sortie.canaux[1] || L, tampons = []; let pic = 0;
  notes.forEach((m, i) => { const d = Math.round(i * seg * sr), n = Math.round(seg * sr), canal = new Float32Array(n); for (let j = 0; j < n; j++) { const v = 0.5 * (L[d + j] + R[d + j]); canal[j] = v; if (Math.abs(v) > pic) pic = Math.abs(v); }
    const f = hz(m), t = { f, canal, sr, off: 0 };
    if (tenue) { const p = sr / f, a = Math.round(0.9 * sr / p) * p, b = a + Math.max(1, Math.round(0.6 * sr / p)) * p; t.a = a / sr; t.b = b / sr; }
    tampons.push(t); });
  if (pic > 1e-6) { const k = 0.9 / pic; for (const t of tampons) for (let j = 0; j < t.canal.length; j++) t.canal[j] *= k; }   // même niveau pour tous
  return tampons;
}

const CACHE = {};
// Charge un instrument : { tampons, relache, niveau, ponctuel }. Les enregistrements viennent de la banque du site (une fois), la synthèse est rendue une fois par SONORA.
export async function charger(entree, ctx) {
  if (CACHE[entree.id]) return CACHE[entree.id];
  const p = (async () => {
    if (entree.source === "ech") { const t = await preparer(entree.cle, ctx); if (!t || !t.length) throw new Error("la banque de sons n'est pas disponible"); return { tampons: t, relache: RELACHE[entree.cle] ?? 0.4, niveau: NIVEAU[entree.cle] ?? 1, instrument: entree.cle, ponctuel: entree.ponctuel }; }
    const code = entree.source === "lib" ? (ENTREES.find(e => e.id === entree.cle) || {}).code : entree.source === "syn" ? (SONS_SYNTHESE[entree.cle] || SONS_PERCUSSION[entree.cle] || {}).code : null;
    if (!code) throw new Error("instrument introuvable"); const r = compiler(code); if (!r.ok || !r.module || !r.module.voix) throw new Error("ce programme ne se compile pas");
    return { tampons: tamponsSynthese(r.module, { note: entree.note, tenue: entree.tenue, duree: entree.duree || 2.5, sr: 44100 }), relache: entree.ponctuel ? 0.15 : 0.4, niveau: 1, instrument: "clavier", ponctuel: entree.ponctuel };
  })();
  CACHE[entree.id] = p; p.catch(() => { delete CACHE[entree.id]; }); return p;
}

// Le clavier en direct : une voix par touche, la note enregistrée la plus proche, transposée (vitesse de lecture), relâchée en douceur (même constante que le mixage du clip).
export class Sampleur {
  constructor(ctx, sortie) { this.ctx = ctx; this.sortie = sortie || ctx.destination; this.inst = null; this.voix = new Map(); this.buffers = new WeakMap(); }
  utiliser(inst) { this.toutCouper(); this.inst = inst; }
  get pret() { return !!this.inst; }
  _buffer(tp) { let b = this.buffers.get(tp); if (!b) { b = this.ctx.createBuffer(1, tp.canal.length, tp.sr); b.copyToChannel(tp.canal, 0); this.buffers.set(tp, b); } return b; }
  noteOn(note, hauteur, vitesse = 0.8) {
    if (!this.inst) return false; if (this.voix.has(note)) this.noteOff(note, true);
    const I = this.inst, h = hauteur || hz(note), tp = choisir(I.tampons, h); if (!tp) return false;
    const ctx = this.ctx, t = ctx.currentTime, src = ctx.createBufferSource(), g = ctx.createGain(), pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    src.buffer = this._buffer(tp); src.playbackRate.value = h / tp.f; if (tp.a && tp.b) { src.loop = true; src.loopStart = tp.off + tp.a; src.loopEnd = tp.off + tp.b; }
    const niveau = vitesse * I.niveau * 0.5; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(niveau, t + 0.004);
    if (pan) { pan.pan.value = Math.max(-1, Math.min(1, (note - 60) / 36)) * 0.35; src.connect(g); g.connect(pan); pan.connect(this.sortie); } else { src.connect(g); g.connect(this.sortie); }
    src.start(t, tp.off); const v = { src, g, pan }; src.onended = () => { try { g.disconnect(); if (pan) pan.disconnect(); } catch (_) {} if (this.voix.get(note) === v) this.voix.delete(note); };
    this.voix.set(note, v); return true;
  }
  noteOff(note, vite = false) {
    const v = this.voix.get(note); if (!v) return; this.voix.delete(note); const I = this.inst || { relache: 0.4, ponctuel: false }, t = this.ctx.currentTime;
    if (I.ponctuel && !vite) return;   // une percussion sonne en entière, même si on relâche la touche
    const rel = vite ? 0.03 : I.relache; try { v.g.gain.cancelScheduledValues(t); v.g.gain.setValueAtTime(v.g.gain.value, t); v.g.gain.setTargetAtTime(0, t, rel / 4); v.src.stop(t + rel * 1.5 + 0.05); } catch (_) {}
  }
  toutCouper() { for (const n of [...this.voix.keys()]) this.noteOff(n, true); }
}

// Les notes jouées (EnregistreurNotes) en événements du mixeur. `depart` : la date, sur la ligne de temps du projet, où le clip commence (le curseur au début de la prise).
export function evenementsMixeur(notes, depart, inst) {
  return notes.map(n => ({ t: n.t - depart, duree: Math.max(inst.ponctuel ? 2 : 0.05, (n.fin ?? n.t + 0.3) - n.t), notes: [n.note], hz: [n.hauteur], vitesse: n.vitesse }));
}
