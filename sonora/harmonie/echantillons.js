// De vrais instruments pour le jeu d'harmonie : la banque du site (VS Chamber Orchestra, Community Edition, domaine public CC0, voir outils/banque_vsco.py).
// Retour de Sébastien du 02/11/2026 : « la partie harmonie, les sons, c'est pas beau ». Un accord joué par des sinus additionnés ne ressemble à aucun instrument ;
// ici chaque note est un enregistrement réel, transposé au plus près de la hauteur demandée, bouclé s'il est tenu, relâché en douceur.
// La partie qui mélange (choisir, mixer, rendreSuiteEch) est synchrone et sans DOM : testée dans Node avec des tampons fabriqués. Le chargement (fetch et décodage) est séparé.

// Instruments de l'harmonie -> instrument de la banque. Les clés sont celles déjà gardées dans le navigateur (piano, orgue, cordes).
export const BANQUE = { piano: "clavier", orgue: "orgue", cordes: "cordes", harpe: "harpe", guitare: "guitare", clavecin: "clavecin", violoncelle: "violoncelle", flute: "souffle" };
// Niveau relatif et durée de relâchement (secondes) de chaque instrument de la banque : les mêmes valeurs que celles du site (outils/site_gabarit.html, tables NIVEAU et RELACHE).
export const NIVEAU = { souffle: 1, cordes: 1, clavier: 1, orgue: 0.9, guitare: 1.2, clavecin: 1.1, violoncelle: 1, harpe: 1 };
export const RELACHE = { souffle: 0.3, cordes: 0.5, clavier: 0.6, orgue: 0.25, guitare: 0.6, clavecin: 0.5, violoncelle: 0.5, harpe: 1.2 };

const hz = m => 440 * Math.pow(2, (m - 69) / 12);

// Le tampon dont la hauteur d'origine est la plus proche (en octaves) de la hauteur demandée. tampons : [{ f, canal, sr, off, a, b }]
export function choisir(tampons, h) {
  let meilleur = null, d = Infinity;
  for (const t of tampons) { const x = Math.abs(Math.log2(h / t.f)); if (x < d) { d = x; meilleur = t; } }
  return meilleur;
}

// Mélange des notes en deux voies. evenements : [{ t, duree, notes: [midi], vitesse }] (secondes). Un son tenu au-delà de ce que dure l'enregistrement est bouclé entre ses points a et b ;
// un son qui décroît seul (piano, harpe, guitare, clavecin) s'éteint à son rythme. La note est relâchée par une décroissance exponentielle de constante relâche / 4, comme sur le site.
// Un léger étalement stéréo place les graves à gauche et les aigus à droite (comme un instrument vu du public) : puissance constante, au plus ± 35 %.
export function mixer(evenements, tampons, { sr = 44100, duree, instrument = "clavier", etale = 0.35, gain = 0.5 } = {}) {
  const niveau = NIVEAU[instrument] ?? 1, rel = RELACHE[instrument] ?? 0.4, tau = rel / 4;
  const fin = duree ?? Math.max(...evenements.map(e => e.t + e.duree)) + rel * 1.5 + 0.2, n = Math.round(fin * sr), L = new Float32Array(n), R = new Float32Array(n), att = Math.max(1, Math.round(0.004 * sr));
  for (const e of evenements) for (const m of e.notes) {
    const h = hz(m), tp = choisir(tampons, h); if (!tp) continue;
    const taux = (h / tp.f) * (tp.sr / sr), d0 = Math.round(e.t * sr), dNote = Math.round(e.duree * sr), queue = Math.round(rel * 1.5 * sr), vit = (e.vitesse ?? 0.8) * niveau * gain;
    const x = tp.canal, debut = tp.off * tp.sr, bouclable = tp.a && tp.b && e.duree + 0.3 > tp.b, d1 = (tp.off + (tp.a || 0)) * tp.sr, d2 = (tp.off + (tp.b || 0)) * tp.sr;
    const p = Math.max(-1, Math.min(1, (m - 60) / 36)) * etale, ang = (p + 1) * Math.PI / 4, gl = Math.cos(ang), gr = Math.sin(ang);
    let pos = debut;
    for (let i = 0; i < dNote + queue; i++) {
      if (bouclable && pos >= d2) pos = d1 + (pos - d2);
      const j = Math.floor(pos); if (j + 1 >= x.length) break;
      const o = d0 + i; if (o >= n) break; if (o < 0) { pos += taux; continue; }
      const f = pos - j, s = x[j] + (x[j + 1] - x[j]) * f;
      const env = Math.min(1, i / att) * (i < dNote ? 1 : Math.exp(-(i - dNote) / sr / tau)), v = s * env * vit;
      L[o] += v * gl; R[o] += v * gr; pos += taux;
    }
  }
  return [L, R];
}

// Comme rendreSuite de son.js : `boucle` replie la queue qui dépasse au début de la boucle, sans couture.
export function rendreSuiteEch(evenements, tampons, { instrument = "clavier", sr = 44100, duree, boucle = false, etale = 0.35, gain = 0.5 } = {}) {
  const rel = RELACHE[instrument] ?? 0.4, fin = duree ?? Math.max(...evenements.map(e => e.t + e.duree)) + rel * 1.5 + 0.2, queue = boucle ? 2 : 0, n = Math.round(fin * sr);
  const c = mixer(evenements, tampons, { sr, duree: fin + queue, instrument, etale, gain });
  if (!boucle) return c.map(x => x.slice(0, n));
  return c.map(x => { const y = x.slice(0, n); for (let i = n; i < x.length; i++) y[i - n] += x[i]; return y; });
}

// ---------------------------------------------------------------- chargement : le catalogue et les MP3 de la banque du site, décodés une seule fois
const CACHE = { catalogue: null, instruments: {} };
export function racineBanque() { return new URL("../../faust/banque/", import.meta.url).href; }
export function catalogue(base = racineBanque()) {
  if (!CACHE.catalogue) CACHE.catalogue = fetch(base + "catalogue.json").then(r => (r.ok ? r.json() : [])).catch(() => []);
  return CACHE.catalogue;
}
// Charge tous les échantillons d'un instrument de la banque. Renvoie la liste de tampons (vide si la banque n'est pas servie : l'appelant garde alors la synthèse).
export function chargerInstrument(nomBanque, ctx, base = racineBanque()) {
  if (!CACHE.instruments[nomBanque]) CACHE.instruments[nomBanque] = catalogue(base).then(cat => Promise.all(cat.filter(e => e.i === nomBanque).map(e => fetch(`${base}${e.id}.mp3`).then(r => r.arrayBuffer())
    .then(b => new Promise((ok, ko) => { const p = ctx.decodeAudioData(b, ok, ko); if (p && p.catch) p.catch(ko); })).then(buf => {
      const canal = buf.getChannelData(0); let m = 0; for (let i = 0; i < canal.length; i++) m = Math.max(m, Math.abs(canal[i]));
      let o = 0; while (o < canal.length && Math.abs(canal[o]) < m * 0.003) o++; // le silence du début (retard du codeur MP3) est sauté
      return { id: e.id, f: e.f, canal, sr: buf.sampleRate, off: o / buf.sampleRate, a: e.a, b: e.b };
    }).catch(() => null)))).then(L => L.filter(Boolean).sort((x, y) => x.f - y.f));
  return CACHE.instruments[nomBanque];
}
export const tamponsPrets = nomBanque => CACHE.instruments[nomBanque] && CACHE.instruments[nomBanque].resolved;
// Mémorise le résultat une fois chargé, pour que les appels synchrones de la page sachent si l'instrument est prêt.
export async function preparer(nomBanque, ctx, base) { const L = await chargerInstrument(nomBanque, ctx, base); CACHE.instruments[nomBanque].resolved = L.length ? L : null; return CACHE.instruments[nomBanque].resolved; }
