// Modèle d'un projet de pistes : sons importés ou enregistrés, pistes, clips placés sur une ligne de temps. Sans DOM : testé dans Node.
// Les temps sont en secondes. La grille suit le tempo : un temps = 60 / tempo secondes, une mesure = `temps` temps.
let compteur = 0;
const nouvelId = p => p + Date.now().toString(36) + (compteur++).toString(36);

export function nouveauProjet({ titre = "Sans titre", tempo = 100, temps = 4 } = {}) {
  return { format: "sonora-pistes", version: 1, titre, tempo, temps, pistes: [nouvellePiste("Piste 1"), nouvellePiste("Piste 2")], sons: {} };
}
export function nouvellePiste(nom) { return { id: nouvelId("p"), nom, volume: 0.8, pan: 0, muet: false, solo: false, clips: [], effets: effetsParDefaut() }; }
// Effets d'une piste : filtre, écho, réverbération. Chacun a un interrupteur et des réglages ; ils s'appliquent à toute la piste, avant le volume.
export const effetsParDefaut = () => ({ filtre: { actif: false, type: "passe-bas", frequence: 1500 }, echo: { actif: false, temps: 0.35, retour: 0.4, melange: 0.35 }, reverb: { actif: false, duree: 2, melange: 0.3 } });
export function effetsDe(pi) { const d = effetsParDefaut(), e = pi.effets || {}; return { filtre: { ...d.filtre, ...(e.filtre || {}) }, echo: { ...d.echo, ...(e.echo || {}) }, reverb: { ...d.reverb, ...(e.reverb || {}) } }; }
export const LIMITES_EFFETS = { frequence: [60, 12000], temps: [0.05, 1.5], retour: [0, 0.85], melange: [0, 1], duree: [0.3, 8] };
// Explications données à côté de chaque effet.
export const EXPLICATIONS = {
  filtre: "Un filtre ne garde qu'une partie des fréquences. Le passe-bas enlève les aigus : le son devient sourd, comme entendu derrière une porte. Le passe-haut enlève les graves : le son devient fin, comme au téléphone. La fréquence de coupure dit où passe la limite.",
  echo: "Le son revient après un retard, de plus en plus faible, comme quand on crie face à une falaise : il fait l'aller-retour. Le temps règle l'écart entre deux répétitions, le retour la part qui revient à chaque fois (plus il est haut, plus les répétitions durent), le mélange la part de l'effet dans ce qu'on entend.",
  reverb: "Dans une salle, le son rebondit sur les murs, le sol et le plafond des milliers de fois ; ces réflexions se mêlent et s'éteignent peu à peu. La durée est le temps que met le son à s'éteindre presque complètement (une perte de 60 décibels) : moins d'une seconde dans une salle de classe, plusieurs secondes dans une grande église.",
};
// Distance d'une paroi qui donnerait un écho de ce temps (aller-retour à 343 m/s, l'air à 20 °C).
export const distanceEcho = t => 343 * t / 2;
export const dureeTemps = p => 60 / p.tempo, dureeMesure = p => p.temps * 60 / p.tempo;
// Aimante un temps sur la grille (en fraction de temps : 1 = le temps, 0.25 = la double croche). grille 0 : pas d'aimant.
export function aimanter(p, t, grille = 1) { if (!grille) return Math.max(0, t); const pas = dureeTemps(p) * grille; return Math.max(0, Math.round(t / pas) * pas); }

export function ajouterSon(p, { nom, duree, sr, canaux }) { const id = nouvelId("s"); p.sons[id] = { id, nom: String(nom).slice(0, 80), duree, sr, canaux }; return id; }
export function trouverPiste(p, id) { return p.pistes.find(x => x.id === id) || null; }
export function trouverClip(p, id) { for (const pi of p.pistes) { const c = pi.clips.find(x => x.id === id); if (c) return { piste: pi, clip: c }; } return null; }

// Place un clip : il commence à `debut`, lit le son à partir de `decalage`, pendant `duree` (par défaut tout le son).
export function placerClip(p, pisteId, sonId, debut, { decalage = 0, duree, gain = 1 } = {}) {
  const pi = trouverPiste(p, pisteId), s = p.sons[sonId]; if (!pi || !s) throw new Error("piste ou son introuvable");
  const d = Math.max(0.01, Math.min(duree ?? s.duree - decalage, s.duree - decalage));
  const c = { id: nouvelId("c"), son: sonId, debut: Math.max(0, debut), decalage: Math.max(0, decalage), duree: d, gain };
  pi.clips.push(c); pi.clips.sort((a, b) => a.debut - b.debut); return c.id;
}
export function deplacerClip(p, clipId, debut, pisteId) {
  const t = trouverClip(p, clipId); if (!t) return false; t.clip.debut = Math.max(0, debut);
  if (pisteId && pisteId !== t.piste.id) { const dest = trouverPiste(p, pisteId); if (!dest) return false; t.piste.clips = t.piste.clips.filter(c => c !== t.clip); dest.clips.push(t.clip); dest.clips.sort((a, b) => a.debut - b.debut); }
  else t.piste.clips.sort((a, b) => a.debut - b.debut);
  return true;
}
// Coupe un clip en deux à l'instant `t` (temps du projet). Renvoie l'identifiant du second morceau, ou null si t tombe hors du clip.
export function couperClip(p, clipId, t) {
  const r = trouverClip(p, clipId); if (!r) return null; const c = r.clip, dedans = t - c.debut;
  if (dedans <= 0.005 || dedans >= c.duree - 0.005) return null;
  const second = { id: nouvelId("c"), son: c.son, debut: t, decalage: c.decalage + dedans, duree: c.duree - dedans, gain: c.gain };
  c.duree = dedans; r.piste.clips.push(second); r.piste.clips.sort((a, b) => a.debut - b.debut); return second.id;
}
export function dupliquerClip(p, clipId) { const r = trouverClip(p, clipId); if (!r) return null; const c = r.clip; return placerClip(p, r.piste.id, c.son, c.debut + c.duree, { decalage: c.decalage, duree: c.duree, gain: c.gain }); }
export function supprimerClip(p, clipId) { const r = trouverClip(p, clipId); if (!r) return false; r.piste.clips = r.piste.clips.filter(c => c.id !== clipId); return true; }
// Raccourcit ou rallonge un clip par sa fin, sans dépasser le son.
export function rognerClip(p, clipId, duree) { const r = trouverClip(p, clipId); if (!r) return false; const s = p.sons[r.clip.son]; r.clip.duree = Math.max(0.01, Math.min(duree, s.duree - r.clip.decalage)); return true; }

// Une piste où un clip de [debut, debut + duree] ne chevauche rien : la piste demandée si elle est libre, sinon la suivante libre, sinon une piste neuve.
export function pisteLibre(p, pisteId, debut, duree) {
  const libre = pi => pi.clips.every(c => c.debut + c.duree <= debut + 1e-6 || c.debut >= debut + duree - 1e-6);
  const i0 = Math.max(0, p.pistes.findIndex(x => x.id === pisteId)), ordre = [...p.pistes.slice(i0), ...p.pistes.slice(0, i0)];
  const t = ordre.find(libre); if (t) return t.id;
  const n = nouvellePiste(`Piste ${p.pistes.length + 1}`); p.pistes.push(n); return n.id;
}
// Les sons sans clip peuvent être retirés ; on ne retire jamais un son encore employé.
export function sonsInutiles(p) { const vus = new Set(p.pistes.flatMap(pi => pi.clips.map(c => c.son))); return Object.keys(p.sons).filter(id => !vus.has(id)); }
export const dureeTotale = p => Math.max(0, ...p.pistes.flatMap(pi => pi.clips.map(c => c.debut + c.duree)));

// Ce qui sonne : une piste muette se tait ; si au moins une piste est en solo, seules les pistes en solo sonnent.
export function pistesAudibles(p) { const solo = p.pistes.some(x => x.solo); return p.pistes.filter(x => !x.muet && (!solo || x.solo)); }
// Plan de lecture à partir de l'instant `depuis` : pour chaque clip audible, quand il démarre (relatif à `depuis`), où il commence dans le son, combien de temps.
export function planLecture(p, depuis = 0) {
  const out = [];
  for (const pi of pistesAudibles(p)) for (const c of pi.clips) {
    const fin = c.debut + c.duree; if (fin <= depuis) continue;
    const saute = Math.max(0, depuis - c.debut);
    out.push({ piste: pi.id, clip: c.id, son: c.son, quand: Math.max(0, c.debut - depuis), decalage: c.decalage + saute, duree: c.duree - saute, gain: c.gain * pi.volume, gainClip: c.gain, pan: pi.pan });
  }
  return out.sort((a, b) => a.quand - b.quand);
}
// Gains gauche et droite d'un panoramique à puissance constante (le même que le module panoramique du langage).
export function gainsPan(pan) { const a = (Math.max(-1, Math.min(1, pan)) + 1) * Math.PI / 4; return [Math.cos(a), Math.sin(a)]; }

// Mixage hors ligne, sans Web Audio : sert aux tests et à vérifier l'export. sons : { id: { canaux: [Float32Array], sr } }.
// Fondu de 5 ms à chaque bord de clip : pas de clic quand on coupe au milieu d'une onde.
export function mixer(p, sons, sr = 44100, { fondu = 0.005 } = {}) {
  const n = Math.ceil(dureeTotale(p) * sr), g = new Float32Array(n), d = new Float32Array(n), f = Math.max(1, Math.round(fondu * sr));
  for (const e of planLecture(p, 0)) {
    const s = sons[e.son]; if (!s) continue; const [gl, gr] = gainsPan(e.pan), k = s.sr / sr, d0 = Math.round(e.quand * sr), m = Math.round(e.duree * sr);
    const L = s.canaux[0], R = s.canaux[1] || s.canaux[0];
    for (let i = 0; i < m && d0 + i < n; i++) {
      const pos = (e.decalage * sr + i) * k, j = Math.floor(pos), fr = pos - j; if (j + 1 >= L.length) break;
      const env = Math.min(1, i / f, (m - 1 - i) / f) * e.gain;
      g[d0 + i] += (L[j] + (L[j + 1] - L[j]) * fr) * env * gl; d[d0 + i] += (R[j] + (R[j + 1] - R[j]) * fr) * env * gr;
    }
  }
  return [g, d];
}

// Sérialisation (sans l'audio, qui est rangé à part) et contrôle d'un projet relu.
export function verifierProjet(o) {
  if (!o || o.format !== "sonora-pistes" || o.version !== 1 || !Array.isArray(o.pistes) || typeof o.sons !== "object") throw new Error("Ce n'est pas un projet de pistes SONORA.");
  for (const pi of o.pistes) for (const c of pi.clips || []) if (!o.sons[c.son]) throw new Error("Un clip renvoie à un son absent du projet.");
  return o;
}
