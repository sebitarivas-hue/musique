// Modèle d'un projet de pistes : sons importés ou enregistrés, pistes, clips placés sur une ligne de temps. Sans DOM : testé dans Node.
// Les temps sont en secondes. La grille suit le tempo : un temps = 60 / tempo secondes, une mesure = `temps` temps.
let compteur = 0;
const nouvelId = p => p + Date.now().toString(36) + (compteur++).toString(36);

export function nouveauProjet({ titre = "Sans titre", tempo = 100, temps = 4 } = {}) {
  return { format: "sonora-pistes", version: 1, id: nouvelId("j"), titre, tempo, temps, pistes: [nouvellePiste("Piste 1"), nouvellePiste("Piste 2")], sons: {} };
}
export function nouvellePiste(nom) { return { id: nouvelId("p"), nom, volume: 0.8, pan: 0, muet: false, solo: false, clips: [], effets: effetsParDefaut(), rack: [], enveloppe: [], envPan: [] }; }
// Effets d'une piste : filtre, écho, réverbération. Chacun a un interrupteur et des réglages ; ils s'appliquent à toute la piste, avant le volume.
export const effetsParDefaut = () => ({ filtre: { actif: false, type: "passe-bas", frequence: 1500 }, echo: { actif: false, temps: 0.35, retour: 0.4, melange: 0.35 }, reverb: { actif: false, duree: 2, aigus: 6000, melange: 0.3 } });
export function effetsDe(pi) { const d = effetsParDefaut(), e = pi.effets || {}; return { filtre: { ...d.filtre, ...(e.filtre || {}) }, echo: { ...d.echo, ...(e.echo || {}) }, reverb: { ...d.reverb, ...(e.reverb || {}) } }; }
// Le rack : les effets que la piste montre, dans l'ordre fixe filtre, écho, réverbération. Un effet du rack peut être éteint (interrupteur) ou retiré (croix) ;
// retirer garde ses réglages. Un ancien projet sans rack montre les effets qui étaient allumés.
export const EFFETS_ORDRE = ["filtre", "echo", "reverb"];
export function rackDe(pi) { const e = effetsDe(pi), r = Array.isArray(pi.rack) ? pi.rack : null; return EFFETS_ORDRE.filter(k => (r ? r.includes(k) : e[k].actif)); }
export function ajouterEffet(pi, k) { if (!EFFETS_ORDRE.includes(k)) return false; const e = pi.effets = effetsDe(pi); pi.rack = EFFETS_ORDRE.filter(x => x === k || rackDe(pi).includes(x)); e[k].actif = true; return true; }
export function retirerEffet(pi, k) { if (!EFFETS_ORDRE.includes(k)) return false; const e = pi.effets = effetsDe(pi); pi.rack = rackDe(pi).filter(x => x !== k); e[k].actif = false; return true; }
export function interrupteurEffet(pi, k, actif) { if (!EFFETS_ORDRE.includes(k)) return false; pi.rack = rackDe(pi); const e = pi.effets = effetsDe(pi); e[k].actif = !!actif; return true; } // l'effet reste dans le rack, éteint
export const LIMITES_EFFETS = { frequence: [60, 12000], temps: [0.05, 1.5], retour: [0, 0.85], melange: [0, 1], duree: [0.3, 8], aigus: [1500, 20000] };
// Explications données à côté de chaque effet.
export const EXPLICATIONS = {
  filtre: "Un filtre ne garde qu'une partie des fréquences. Le passe-bas enlève les aigus : le son devient sourd, comme entendu derrière une porte. Le passe-haut enlève les graves : le son devient fin, comme au téléphone. La fréquence de coupure dit où passe la limite.",
  echo: "Le son revient après un retard, de plus en plus faible, comme quand on crie face à une falaise : il fait l'aller-retour. Le temps règle l'écart entre deux répétitions, le retour la part qui revient à chaque fois (plus il est haut, plus les répétitions durent), le mélange la part de l'effet dans ce qu'on entend.",
  reverb: "Dans une salle, le son rebondit sur les murs, le sol et le plafond des milliers de fois ; ces réflexions se mêlent et s'éteignent peu à peu. La durée est le temps que met le son à s'éteindre presque complètement (une perte de 60 décibels) : moins d'une seconde dans une salle de classe, plusieurs secondes dans une grande église. Les aigus s'éteignent plus vite que les graves, absorbés par l'air et les murs : le réglage « aigus » dit à partir de quelle fréquence. Elle est calculée par zita_rev1, une réverbération des bibliothèques du langage Faust.",
};
// Distance d'une paroi qui donnerait un écho de ce temps (aller-retour à 343 m/s, l'air à 20 °C).
export const distanceEcho = t => 343 * t / 2;
export const dureeTemps = p => 60 / p.tempo, dureeMesure = p => p.temps * 60 / p.tempo;
// Aimante un temps sur la grille (en fraction de temps : 1 = le temps, 0.25 = la double croche). grille 0 : pas d'aimant.
export function aimanter(p, t, grille = 1) { if (!grille) return Math.max(0, t); const pas = dureeTemps(p) * grille; return Math.max(0, Math.round(t / pas) * pas); }

export function ajouterSon(p, { nom, duree, sr, canaux, midi, source }) { const id = nouvelId("s"); p.sons[id] = { id, nom: String(nom).slice(0, 80), duree, sr, canaux }; if (midi) p.sons[id].midi = copieMidi(midi); if (source) p.sons[id].source = JSON.parse(JSON.stringify(source)); return id; }
// Un son « de source » est fabriqué par la page à partir d'une recette qui dépend du tempo : un rythme de la Bibliothèque ({ type: "boucle", el }) ou un motif du séquenceur à pas ({ type: "pas", grille, pas, swing, kit, mesures }).
// Un son étiré ({ type: "etire", origine, bpm }) est un enregistrement dont on a trouvé le tempo (bpm) et que l'on rend plus rapide ou plus lent, sans changer sa hauteur, pour qu'il suive celui du projet : l'enregistrement d'origine reste dans le projet.
// Comme les clips de notes, il suit le tempo : on le refait à la nouvelle vitesse, il reste sur les mêmes temps.
export const estSource = s => !!(s && s.source && (s.source.type === "boucle" || s.source.type === "pas" || s.source.type === "etire"));
export const suitLeTempo = s => estMidi(s) || estSource(s);
// Un son « MIDI » garde ses notes (écrites en temps, voir notes.js) et l'instrument qui les joue : son audio est fabriqué à partir d'elles, et refait quand elles ou le tempo changent.
// midi : { notes: [{ t, d, n, v }], instrument: identifiant de l'instrument de Pistes, temps: durée en temps du clip }.
export const copieMidi = m => ({ notes: (m.notes || []).map(x => ({ ...x })), instrument: m.instrument || "ech:clavier", temps: m.temps || 4, rendu: m.rendu, ...(m.partition ? { partition: JSON.parse(JSON.stringify(m.partition)) } : {}) });
export const estMidi = s => !!(s && s.midi && Array.isArray(s.midi.notes));
export function trouverPiste(p, id) { return p.pistes.find(x => x.id === id) || null; }
export function trouverClip(p, id) { for (const pi of p.pistes) { const c = pi.clips.find(x => x.id === id); if (c) return { piste: pi, clip: c }; } return null; }

// Place un clip : il commence à `debut`, lit le son à partir de `decalage`, pendant `duree` (par défaut tout le son).
export function placerClip(p, pisteId, sonId, debut, { decalage = 0, duree, gain = 1, boucle } = {}) {
  const pi = trouverPiste(p, pisteId), s = p.sons[sonId]; if (!pi || !s) throw new Error("piste ou son introuvable");
  const d = boucle > 0 ? Math.max(0.01, duree ?? s.duree - decalage) : Math.max(0.01, Math.min(duree ?? s.duree - decalage, s.duree - decalage));   // un clip bouclé peut durer plus que son son
  const c = { id: nouvelId("c"), son: sonId, debut: Math.max(0, debut), decalage: Math.max(0, decalage), duree: d, gain, ...(boucle > 0 ? { boucle } : {}) };
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
  if (c.boucle) {   // un clip bouclé ne se coupe que sur le début d'une répétition : chaque morceau repart du début du motif
    const B = longueurMotif(p, c), k = Math.round(dedans / B); if (k < 1 || Math.abs(dedans - k * B) > 0.02) return null;
    const second = { id: nouvelId("c"), son: c.son, debut: c.debut + k * B, decalage: c.decalage, duree: c.duree - k * B, gain: c.gain, boucle: c.boucle };
    c.duree = k * B; normaliserBoucle(p, c); normaliserBoucle(p, second); r.piste.clips.push(second); r.piste.clips.sort((a, b) => a.debut - b.debut); return second.id;
  }
  const second = { id: nouvelId("c"), son: c.son, debut: t, decalage: c.decalage + dedans, duree: c.duree - dedans, gain: c.gain };
  c.duree = dedans; r.piste.clips.push(second); r.piste.clips.sort((a, b) => a.debut - b.debut); return second.id;
}
// Un clip qui suit le tempo (notes, rythme de la Bibliothèque) copié a son propre son : on peut le changer sans toucher l'original. Un son audio est partagé.
function sonPourCopie(p, c) { const s = p.sons[c.son]; return suitLeTempo(s) ? ajouterSon(p, { nom: s.nom, duree: s.duree, sr: s.sr, canaux: s.canaux, midi: s.midi ? copieMidi(s.midi) : undefined, source: s.source ? JSON.parse(JSON.stringify(s.source)) : undefined }) : c.son; }
export function dupliquerClip(p, clipId) {
  const r = trouverClip(p, clipId); if (!r) return null; const c = r.clip, son = sonPourCopie(p, c);
  const id = placerClip(p, r.piste.id, son, c.debut + c.duree, { decalage: c.decalage, duree: c.duree, gain: c.gain, boucle: c.boucle }); return id;
}
export function supprimerClip(p, clipId) { const r = trouverClip(p, clipId); if (!r) return false; r.piste.clips = r.piste.clips.filter(c => c.id !== clipId); return true; }
// Un clip bouclé répète un motif : `boucle` est la longueur du motif en secondes (jamais plus que le son restant). Le clip peut durer autant de répétitions qu'on veut.
export const longueurMotif = (p, c) => { const s = p.sons[c.son]; return Math.max(0.01, Math.min(c.boucle, s ? s.duree - c.decalage : c.boucle)); };
// Un clip qui ne dépasse plus son motif n'est plus bouclé : c'est un clip ordinaire.
function normaliserBoucle(p, c) { if (c.boucle && c.duree <= longueurMotif(p, c) + 1e-6) { c.duree = Math.min(c.duree, longueurMotif(p, c)); delete c.boucle; } }
// Raccourcit ou rallonge un clip par sa fin, sans dépasser le son (un clip bouclé n'a pas cette limite).
export function rognerClip(p, clipId, duree) {
  const r = trouverClip(p, clipId); if (!r) return false; const c = r.clip, s = p.sons[c.son];
  if (c.boucle) { c.duree = Math.max(0.01, duree); normaliserBoucle(p, c); return true; }
  c.duree = Math.max(0.01, Math.min(duree, s.duree - c.decalage)); return true;
}
// Répète le motif du clip jusqu'à la durée demandée. Un clip pas encore bouclé prend sa durée actuelle pour motif ; en dessous de cette durée, c'est un simple raccourcissement.
export function boucler(p, clipId, duree) {
  const r = trouverClip(p, clipId); if (!r) return false; const c = r.clip, s = p.sons[c.son]; if (!s) return false;
  if (!c.boucle) { if (duree <= c.duree + 1e-6) return rognerClip(p, clipId, duree); c.boucle = c.duree; }
  c.duree = Math.max(0.01, duree); normaliserBoucle(p, c); return true;
}
// Déplace le bord gauche d'un clip : son début avance (ou recule) en même temps que l'endroit du son où il commence, la fin reste en place. Pas pour un clip bouclé.
export function rognerDebut(p, clipId, debut) {
  const r = trouverClip(p, clipId); if (!r) return false; const c = r.clip; if (c.boucle) return false;
  const fin = c.debut + c.duree, d = Math.max(c.debut - c.decalage, Math.min(debut, fin - 0.01)) - c.debut;   // pas avant le début du son, ni après la fin du clip
  c.debut += d; c.decalage += d; c.duree -= d; r.piste.clips.sort((a, b) => a.debut - b.debut); return true;
}
// Presse-papiers : les clips choisis, avec leur place relative (piste et temps). Les sons audio sont partagés, ceux qui suivent le tempo sont copiés au collage.
export function copierClips(p, ids) {
  const L = []; p.pistes.forEach((pi, i) => pi.clips.forEach(c => { if (ids.includes(c.id)) L.push({ i, c: { ...c } }); }));
  if (!L.length) return null; const t0 = Math.min(...L.map(x => x.c.debut)), i0 = Math.min(...L.map(x => x.i));
  return { clips: L.map(x => ({ dp: x.i - i0, dt: x.c.debut - t0, son: x.c.son, decalage: x.c.decalage, duree: x.c.duree, gain: x.c.gain, ...(x.c.boucle ? { boucle: x.c.boucle } : {}) })), span: Math.max(...L.map(x => x.c.debut + x.c.duree)) - t0, t0, i0 };
}
// Colle le presse-papiers à l'instant `t`, la première ligne sur la piste `pisteId` (les suivantes en dessous ; des pistes sont ajoutées s'il en manque). Renvoie les nouveaux identifiants et les sons copiés.
export function collerClips(p, presse, pisteId, t) {
  const i0 = Math.max(0, p.pistes.findIndex(x => x.id === pisteId)), ids = [], sons = [];
  for (const x of presse.clips) {
    while (p.pistes.length <= i0 + x.dp) p.pistes.push(nouvellePiste(`Piste ${p.pistes.length + 1}`));
    const modele = { son: x.son }, avant = Object.keys(p.sons).length; if (!p.sons[x.son]) continue; const son = sonPourCopie(p, modele); if (Object.keys(p.sons).length > avant) sons.push({ de: x.son, vers: son });
    ids.push(placerClip(p, p.pistes[i0 + x.dp].id, son, t + x.dt, { decalage: x.decalage, duree: x.duree, gain: x.gain, boucle: x.boucle }));
  }
  return { ids, sons };
}

// Une piste où un clip de [debut, debut + duree] ne chevauche rien : la piste demandée si elle est libre, sinon la suivante libre, sinon une piste neuve.
export function pisteLibre(p, pisteId, debut, duree) {
  const libre = pi => pi.clips.every(c => c.debut + c.duree <= debut + 1e-6 || c.debut >= debut + duree - 1e-6);
  const i0 = Math.max(0, p.pistes.findIndex(x => x.id === pisteId)), ordre = [...p.pistes.slice(i0), ...p.pistes.slice(0, i0)];
  const t = ordre.find(libre); if (t) return t.id;
  const n = nouvellePiste(`Piste ${p.pistes.length + 1}`); p.pistes.push(n); return n.id;
}
// Les sons sans clip peuvent être retirés ; on ne retire jamais un son encore employé.
export function sonsInutiles(p) { const vus = new Set(p.pistes.flatMap(pi => pi.clips.map(c => c.son))); for (const id of [...vus]) { const s = p.sons[id]; if (s && s.source && s.source.origine) vus.add(s.source.origine); }   // l'original d'un son étiré sert encore
  return Object.keys(p.sons).filter(id => !vus.has(id)); }
export const dureeTotale = p => Math.max(0, ...p.pistes.flatMap(pi => pi.clips.map(c => c.debut + c.duree)));

// Enveloppe de volume d'une piste (automation) : des points { t, v } (t en secondes, v le gain de 0 à 1,5 qui multiplie le volume de la piste), reliés par des segments droits.
// Sans point, le gain est 1 partout. Avant le premier point, c'est le gain du premier ; après le dernier, celui du dernier.
export const ENV_MAX = 1.5;
// Deux courbes par piste : le volume (un gain de 0 à 1,5 qui multiplie le volume de la piste) et le panoramique (de -1, tout à gauche, à 1, tout à droite).
export const COURBES = { volume: { cle: "enveloppe", min: 0, max: ENV_MAX, def: 1, nom: "Volume" }, pan: { cle: "envPan", min: -1, max: 1, def: 0, nom: "Panoramique" } };
export const courbeDe = (pi, k = "volume") => { const C = COURBES[k]; return (Array.isArray(pi[C.cle]) ? pi[C.cle] : []).filter(q => Number.isFinite(q.t) && Number.isFinite(q.v)).map(q => ({ t: Math.max(0, q.t), v: Math.min(C.max, Math.max(C.min, q.v)) })).sort((a, b) => a.t - b.t); };
export function valeurCourbe(pi, k, t) {
  const L = courbeDe(pi, k); if (!L.length) return k === "pan" ? pi.pan || 0 : COURBES[k].def; if (t <= L[0].t) return L[0].v; if (t >= L[L.length - 1].t) return L[L.length - 1].v;
  let i = 1; while (L[i].t < t) i++; const a = L[i - 1], b = L[i]; return b.t === a.t ? b.v : a.v + (b.v - a.v) * (t - a.t) / (b.t - a.t);
}
export function ajouterPoint(pi, k, t, v) { const C = COURBES[k]; pi[C.cle] = courbeDe(pi, k); const q = { t: Math.max(0, t), v: Math.min(C.max, Math.max(C.min, v)) }; pi[C.cle].push(q); pi[C.cle].sort((a, b) => a.t - b.t); return q; }
export function deplacerPoint(pi, k, q, t, v) { const C = COURBES[k]; q.t = Math.max(0, t); q.v = Math.min(C.max, Math.max(C.min, v)); pi[C.cle].sort((a, b) => a.t - b.t); return q; }
export function supprimerPoint(pi, k, q) { const C = COURBES[k]; pi[C.cle] = courbeDe(pi, k).filter(x => !(x.t === q.t && x.v === q.v)); return true; }
export function viderCourbe(pi, k) { pi[COURBES[k].cle] = []; }
// Les noms d'avant restent : ils parlent de la courbe de volume.
export const enveloppeDe = pi => courbeDe(pi, "volume");
export const gainEnveloppe = (pi, t) => valeurCourbe(pi, "volume", t);
export const ajouterPointEnv = (pi, t, v) => ajouterPoint(pi, "volume", t, v);
export const deplacerPointEnv = (pi, q, t, v) => deplacerPoint(pi, "volume", q, t, v);
export const supprimerPointEnv = (pi, q) => supprimerPoint(pi, "volume", q);
export const viderEnveloppe = pi => viderCourbe(pi, "volume");

// Enregistrement multipiste : le capteur envoie des morceaux ; chaque morceau est un tableau de canaux (Float32Array), ou, pour un ancien capteur, un seul Float32Array (mono).
// On rassemble le canal i de tous les morceaux, bout à bout. Renvoie [Float32Array, ...], un par canal vu, le nombre de canaux étant celui du premier morceau (une entrée ne change pas de nombre de canaux en cours de prise).
export function assemblerCanaux(morceaux) {
  const vue = m => (m instanceof Float32Array ? [m] : Array.isArray(m) ? m : []), premier = morceaux.map(vue).find(m => m.length); if (!premier) return [];
  const k = premier.length, n = Array.from({ length: k }, () => 0);
  for (const m of morceaux) { const c = vue(m); for (let i = 0; i < k; i++) n[i] += (c[i] || c[0] || []).length; }
  const sortie = n.map(t => new Float32Array(t)), o = Array.from({ length: k }, () => 0);
  for (const m of morceaux) { const c = vue(m); for (let i = 0; i < k; i++) { const x = c[i] || c[0]; if (!x) continue; sortie[i].set(x, o[i]); o[i] += x.length; } }
  return sortie;
}

// Ce qui sonne : une piste muette se tait ; si au moins une piste est en solo, seules les pistes en solo sonnent.
export function pistesAudibles(p) { const solo = p.pistes.some(x => x.solo); return p.pistes.filter(x => !x.muet && (!solo || x.solo)); }
// Plan de lecture à partir de l'instant `depuis` : pour chaque clip audible, quand il démarre (relatif à `depuis`), où il commence dans le son, combien de temps.
export function planLecture(p, depuis = 0) {
  const out = [];
  for (const pi of pistesAudibles(p)) for (const c of pi.clips) {
    const fin = c.debut + c.duree; if (fin <= depuis) continue;
    const B = c.boucle ? longueurMotif(p, c) : c.duree;   // un clip bouclé est joué en répétitions du motif, la dernière coupée à la fin du clip
    for (let k = 0, d0 = c.debut; d0 < fin - 1e-9; k++, d0 = c.debut + k * B) {
      const f = Math.min(fin, d0 + B); if (f <= depuis) continue; const saute = Math.max(0, depuis - d0);
      out.push({ piste: pi.id, clip: c.id, son: c.son, quand: Math.max(0, d0 - depuis), decalage: c.decalage + saute, duree: f - d0 - saute, gain: c.gain * pi.volume, gainClip: c.gain, pan: pi.pan });
    }
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
    const s = sons[e.son]; if (!s) continue; const pe = enveloppeDe(trouverPiste(p, e.piste) || {}).length ? trouverPiste(p, e.piste) : null; const pp = courbeDe(trouverPiste(p, e.piste) || {}, "pan").length ? trouverPiste(p, e.piste) : null; let [gl, gr] = gainsPan(e.pan); const k = s.sr / sr, d0 = Math.round(e.quand * sr), m = Math.round(e.duree * sr);
    const L = s.canaux[0], R = s.canaux[1] || s.canaux[0];
    for (let i = 0; i < m && d0 + i < n; i++) {
      const pos = (e.decalage * sr + i) * k, j = Math.floor(pos), fr = pos - j; if (j + 1 >= L.length) break;
      const env = Math.min(1, i / f, (m - 1 - i) / f) * e.gain * (pe ? gainEnveloppe(pe, e.quand + i / sr) : 1); if (pp && (i & 63) === 0) [gl, gr] = gainsPan(valeurCourbe(pp, "pan", e.quand + i / sr));
      g[d0 + i] += (L[j] + (L[j + 1] - L[j]) * fr) * env * gl; d[d0 + i] += (R[j] + (R[j + 1] - R[j]) * fr) * env * gr;
    }
  }
  return [g, d];
}

// Sérialisation (sans l'audio, qui est rangé à part) et contrôle d'un projet relu.
export function verifierProjet(o) {
  if (!o || o.format !== "sonora-pistes" || o.version !== 1 || !Array.isArray(o.pistes) || typeof o.sons !== "object") throw new Error("Ce n'est pas un projet de pistes SONORA.");
  for (const pi of o.pistes) for (const c of pi.clips || []) if (!o.sons[c.son]) throw new Error("Un clip renvoie à un son absent du projet.");
  if (!o.id) o.id = nouvelId("j");  // les projets d'avant les « Mes projets » n'avaient pas d'identifiant
  if (!o.titre) o.titre = "Sans titre";
  return o;
}

// ---------------------------------------------------------------- plusieurs projets (« Mes projets »)
// Les identifiants des sons d'un projet : c'est ce qui permet de savoir quels sons rangés ne servent plus à personne quand on supprime un projet.
export const idsSons = p => Object.keys(p.sons || {});
// Une copie indépendante d'un projet, avec un nouvel identifiant et un nouveau titre. Les sons (leur audio est rangé à part) restent partagés avec l'original.
export function copierProjet(p, titre) { const c = JSON.parse(JSON.stringify(p)); c.id = nouvelId("j"); c.titre = String(titre || p.titre + " (copie)").slice(0, 80); return c; }
// Le résumé qu'on affiche dans la liste : titre, nombre de pistes et de clips, durée du dernier clip.
export function resume(p) { let clips = 0, fin = 0; for (const pi of p.pistes || []) for (const c of pi.clips || []) { clips++; fin = Math.max(fin, c.debut + c.duree); } return { id: p.id, titre: p.titre || "Sans titre", pistes: (p.pistes || []).length, clips, duree: fin, tempo: p.tempo }; }
export const renommerProjet = (p, titre) => { p.titre = String(titre || "").trim().slice(0, 80) || "Sans titre"; return p.titre; };

// Change le tempo du projet. Les clips de notes suivent le tempo : leur place et leur durée en secondes changent, pas leur place en temps (le clip qui commence au temps 5 y reste).
// Les clips audio (enregistrés, importés) gardent leur durée mais restent calés sur la grille : ils démarrent au même temps (`audio: false` les laisse à la même seconde).
// Renvoie { facteur, sons } : les sons MIDI dont l'audio est à refaire à ce tempo (le rendu dépend des instruments : il se fait dans la page).
export function changerTempo(p, tempo, { audio = true } = {}) {
  const nouveau = Math.max(20, Math.min(300, +tempo || p.tempo)), f = p.tempo / nouveau, sons = new Set();
  for (const pi of p.pistes) for (const c of pi.clips) {
    const s = p.sons[c.son];
    if (suitLeTempo(s)) { c.debut *= f; c.duree *= f; c.decalage *= f; if (c.boucle) c.boucle *= f; sons.add(c.son); } else if (audio) c.debut *= f;
  }
  for (const id of sons) p.sons[id].duree *= f;   // l'audio d'un son qui suit le tempo est refait plus tard, mais sa durée suit déjà : un clip qui le lisait en entier le lit toujours en entier
  p.tempo = nouveau; return { facteur: f, sons: [...sons] };
}
// Après un nouveau rendu d'un son MIDI : l'audio change, sa durée aussi ; les clips qui le lisent en entier suivent (ceux qu'on a rognés gardent leur fin).
export function majSonMidi(p, sonId, { canaux, sr, duree }) {
  const s = p.sons[sonId]; if (!suitLeTempo(s)) return false; const avant = s.duree; s.canaux = Array.isArray(canaux) ? canaux.length : canaux; s.sr = sr; s.duree = duree;
  for (const pi of p.pistes) for (const c of pi.clips) if (c.son === sonId) { if (Math.abs(c.decalage + c.duree - avant) < 0.02) c.duree = Math.max(0.01, duree - c.decalage); else c.duree = Math.min(c.duree, Math.max(0.01, duree - c.decalage)); }
  return true;
}

// Les notes de toutes les pistes, en temps depuis le début du projet, pour l'export MIDI : [{ nom, notes }]. Seuls les clips de notes comptent (un clip audio n'a pas de notes).
// Un clip rogné ou décalé ne donne que les notes qu'on entend encore.
export function notesDesPistes(p) {
  const sec = 60 / p.tempo, out = [];
  for (const pi of p.pistes) {
    const notes = [];
    for (const c of pi.clips) {
      const s = p.sons[c.son]; if (!estMidi(s)) continue; const t0 = c.debut / sec, dec = c.decalage / sec, fin = dec + c.duree / sec;
      for (const x of s.midi.notes) { if (x.t + x.d <= dec + 1e-9 || x.t >= fin - 1e-9) continue; const t = Math.max(x.t, dec), e = Math.min(x.t + x.d, fin); notes.push({ ...x, t: t0 + (t - dec), d: e - t }); }
    }
    if (notes.length) out.push({ nom: pi.nom, notes });
  }
  return out;
}

// Caler un enregistrement sur le tempo du projet. `analyse` : { bpm, decalage } trouvés par tempo.js (decalage : seconde, dans le son d'origine, du premier temps).
// Le clip est remplacé par un clip du même son étiré (type « etire ») pour jouer au tempo du projet, et déplacé pour que son premier temps tombe sur un temps de la grille.
// Renvoie { son, ratio, decale } : le nouveau son à fabriquer (l'audio étiré est rendu par la page) ; si le tempo est déjà le bon, pas d'étirement, seulement le décalage.
export function calerClip(p, clipId, { bpm, decalage }) {
  const r = trouverClip(p, clipId); if (!r) return null; const c = r.clip, s = p.sons[c.son], sec = 60 / p.tempo; if (!s || suitLeTempo(s)) return null;
  const ratio = Math.abs(bpm - p.tempo) < 0.5 ? 1 : bpm / p.tempo, premier = c.debut + (decalage - c.decalage) * ratio;   // le premier temps, sur la ligne de temps du projet, une fois étiré
  let debut = c.debut + (Math.round(premier / sec) * sec - premier); const decale = debut - c.debut;
  if (ratio === 1) { c.debut = Math.max(0, debut + (debut < 0 ? sec : 0)); return { son: c.son, ratio: 1, decale }; }
  const id = ajouterSon(p, { nom: `${s.nom} (à ${p.tempo})`.slice(0, 80), duree: s.duree * ratio, sr: s.sr, canaux: s.canaux, source: { type: "etire", origine: c.son, bpm, decalage, rendu: -1 } });
  c.son = id; c.duree *= ratio; c.decalage *= ratio; if (debut < 0) debut += sec * Math.ceil(-debut / sec); c.debut = Math.max(0, debut);
  pisteDe(p, clipId).clips.sort((a, b) => a.debut - b.debut); return { son: id, ratio, decale };
}
const pisteDe = (p, clipId) => (trouverClip(p, clipId) || {}).piste;
