// Notes MIDI de SONORA Pistes : des notes écrites en TEMPS (et non en secondes), pour qu'elles suivent le tempo du projet.
// Une note : { t, d, n, v } : t = départ en temps depuis le début du clip, d = durée en temps, n = numéro MIDI (60 = do du milieu), v = vitesse de 0 à 1.
// Sans DOM : testé dans Node. Contient aussi la lecture et l'écriture de fichiers MIDI standard (.mid), pour échanger avec les autres logiciels de musique.

export const PPQ = 480;   // ticks par temps, dans les fichiers MIDI que Pistes écrit

export const nettoyerNotes = notes => (Array.isArray(notes) ? notes : [])
  .filter(x => x && Number.isFinite(x.t) && Number.isFinite(x.d) && Number.isFinite(x.n))
  .map(x => ({ t: Math.max(0, x.t), d: Math.max(1 / 64, x.d), n: Math.max(0, Math.min(127, Math.round(x.n))), v: Math.max(0.05, Math.min(1, Number.isFinite(x.v) ? x.v : 0.8)), ...(Number.isFinite(x.h) && x.h > 0 ? { h: x.h } : {}) }))
  .sort((a, b) => a.t - b.t || a.n - b.n);

// Les notes jouées en direct (dates en secondes sur la ligne de temps) en notes en temps depuis `depart` (secondes) au tempo `tempo`.
// `grille` : fraction de temps sur laquelle on cale le départ et la durée (1 = le temps, 0.5 = la croche, 0.25 = la double croche) ; 0 : on ne cale rien.
export function notesEnTemps(jouees, depart, tempo, grille = 0) {
  const sec = 60 / tempo, caler = x => (grille ? Math.round(x / grille) * grille : x);
  return nettoyerNotes(jouees.map(j => {
    const t0 = (j.t - depart) / sec, d0 = ((j.fin ?? j.t + 0.3) - j.t) / sec, t = caler(t0), d = grille ? Math.max(grille, caler(d0)) : d0;
    return { t, d, n: j.note, v: j.vitesse, h: j.hauteur };   // h : la fréquence exacte jouée (gammes non tempérées)
  }));
}
// Cale des notes déjà écrites sur la grille (départ et durée), sans changer leur ordre.
export const quantifier = (notes, grille) => nettoyerNotes(notes.map(x => ({ ...x, t: Math.round(x.t / grille) * grille, d: Math.max(grille, Math.round(x.d / grille) * grille) })));
// Durée d'un clip de notes en temps : jusqu'à la fin de la dernière note, arrondie à la mesure.
// On garde un quart de temps après la dernière note pour que sa fin ne soit pas coupée net.
export const dureeEnTemps = (notes, tempsParMesure = 4) => { const fin = Math.max(0, ...notes.map(x => x.t + x.d)) + 0.25; return Math.max(tempsParMesure, Math.ceil(fin / tempsParMesure - 1e-9) * tempsParMesure); };
// Les notes en événements pour le mixeur d'échantillons (echantillons.js) : dates en secondes, à ce tempo.
export const evenementsDeNotes = (notes, tempo) => { const s = 60 / tempo; return notes.map(x => ({ t: x.t * s, duree: x.d * s, notes: [x.n], vitesse: x.v, ...(x.h ? { hz: [x.h] } : {}) })); };
// Un clip de notes dont le tempo change : les dates en secondes changent, pas celles en temps.
export const echelleTempo = (ancien, nouveau) => ancien / nouveau;

// ---------------------------------------------------------------- fichiers MIDI standard (SMF)
const octetsVLQ = x => { const o = [x & 0x7f]; while ((x >>= 7) > 0) o.unshift((x & 0x7f) | 0x80); return o; };
const u32 = x => [(x >>> 24) & 255, (x >>> 16) & 255, (x >>> 8) & 255, x & 255], u16 = x => [(x >> 8) & 255, x & 255];
const texte = s => [...new TextEncoder().encode(s)];
function piste(evenements) {   // evenements : [{ tick, octets }] triés ; renvoie l'octet-liste du morceau MTrk
  evenements.sort((a, b) => a.tick - b.tick || (a.ordre ?? 1) - (b.ordre ?? 1)); const o = []; let dernier = 0;
  for (const e of evenements) { o.push(...octetsVLQ(e.tick - dernier), ...e.octets); dernier = e.tick; }
  o.push(0, 0xff, 0x2f, 0); return [...texte("MTrk"), ...u32(o.length), ...o];
}
// pistes : [{ nom, notes: [{ t, d, n, v }] (en temps depuis le début du projet), canal }] ; tempo : battements par minute ; temps : chiffrage (4 pour 4/4).
export function versMidi({ tempo = 100, temps = 4, pistes = [] }) {
  const mpq = Math.round(60000000 / tempo), chef = [{ tick: 0, ordre: 0, octets: [0xff, 0x51, 3, (mpq >> 16) & 255, (mpq >> 8) & 255, mpq & 255] }, { tick: 0, ordre: 0, octets: [0xff, 0x58, 4, temps, 2, 24, 8] }];
  const morceaux = [piste(chef)];
  pistes.forEach((p, i) => {
    const canal = Math.min(15, p.canal ?? i), ev = [{ tick: 0, ordre: 0, octets: [0xff, 0x03, ...octetsVLQ(texte(p.nom || `Piste ${i + 1}`).length), ...texte(p.nom || `Piste ${i + 1}`)] }];
    for (const x of nettoyerNotes(p.notes)) {
      const on = Math.round(x.t * PPQ), off = Math.max(on + 1, Math.round((x.t + x.d) * PPQ)), v = Math.max(1, Math.min(127, Math.round(x.v * 127)));
      ev.push({ tick: on, ordre: 1, octets: [0x90 | canal, x.n, v] }, { tick: off, ordre: 0, octets: [0x80 | canal, x.n, 0] });
    }
    morceaux.push(piste(ev));
  });
  const entete = [...texte("MThd"), ...u32(6), ...u16(1), ...u16(morceaux.length), ...u16(PPQ)];
  return Uint8Array.from([...entete, ...morceaux.flat()]);
}
// Lit un fichier MIDI : { tempo, temps, pistes: [{ nom, notes: [{ t, d, n, v }] }] } avec t et d en temps. Les pistes sans note sont écartées. Format 0 et 1.
export function depuisMidi(octets) {
  const b = octets instanceof Uint8Array ? octets : new Uint8Array(octets); let i = 0;
  const lire32 = () => { const x = (b[i] * 2 ** 24) + (b[i + 1] << 16) + (b[i + 2] << 8) + b[i + 3]; i += 4; return x; }, lire16 = () => { const x = (b[i] << 8) | b[i + 1]; i += 2; return x; };
  const mot = () => String.fromCharCode(b[i], b[i + 1], b[i + 2], b[i + 3]);
  if (b.length < 14 || mot() !== "MThd") throw new Error("Ce fichier n'est pas un fichier MIDI.");
  i += 4; const lon = lire32(), format = lire16(), n = lire16(), division = lire16(); i = 8 + lon;
  if (division & 0x8000) throw new Error("Ce fichier MIDI est écrit en temps réel (SMPTE) : Pistes ne le lit pas.");
  let tempo = null, temps = 4; const pistes = [];
  for (let k = 0; k < n && i + 8 <= b.length; k++) {
    if (mot() !== "MTrk") throw new Error("Fichier MIDI abîmé : un morceau de piste manque."); i += 4; const lon2 = lire32(), fin = Math.min(b.length, i + lon2);
    let tick = 0, statut = 0, nom = ""; const ouvertes = new Map(), notes = [];
    const vlq = () => { let x = 0, c; do { c = b[i++]; x = (x << 7) | (c & 0x7f); } while (c & 0x80 && i < fin); return x; };
    while (i < fin) {
      tick += vlq(); let s = b[i]; if (s & 0x80) { i++; if (s < 0xf0) statut = s; } else s = statut;
      if (s === 0xff) { const type = b[i++], l = vlq(); const d = b.slice(i, i + l); i += l;
        if (type === 0x51 && tempo === null && l === 3) tempo = Math.round(60000000 / ((d[0] << 16) | (d[1] << 8) | d[2]) * 100) / 100; else if (type === 0x58 && l >= 2 && k === 0) temps = d[0]; else if (type === 0x03 && !nom) nom = new TextDecoder().decode(d); }
      else if (s === 0xf0 || s === 0xf7) { const l = vlq(); i += l; }
      else { const t = s & 0xf0, a = b[i++], c = t === 0xc0 || t === 0xd0 ? 0 : b[i++];
        if (t === 0x90 && c > 0) { const clef = (s & 15) + ":" + a; if (ouvertes.has(clef)) { const o = ouvertes.get(clef); notes.push({ t: o.tick / division, d: Math.max(1 / 64, (tick - o.tick) / division), n: a, v: o.v }); } ouvertes.set(clef, { tick, v: c / 127 }); }
        else if (t === 0x80 || (t === 0x90 && c === 0)) { const clef = (s & 15) + ":" + a, o = ouvertes.get(clef); if (o) { notes.push({ t: o.tick / division, d: Math.max(1 / 64, (tick - o.tick) / division), n: a, v: o.v }); ouvertes.delete(clef); } } }
    }
    for (const [clef, o] of ouvertes) notes.push({ t: o.tick / division, d: Math.max(1 / 64, (tick - o.tick) / division), n: +clef.split(":")[1], v: o.v });
    i = fin; if (notes.length) pistes.push({ nom: nom || `Piste ${pistes.length + 1}`, notes: nettoyerNotes(notes) });
  }
  return { format, tempo: tempo ?? 120, temps, pistes };
}
