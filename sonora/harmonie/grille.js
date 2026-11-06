// La grille d'accords du Composer : un modèle simple (fondamentale, type, durée en temps), des déplacements, la pulsation (clic, batterie) rendue en signal, les événements joués.
// Sans DOM : testé dans Node.
import * as H from "./theorie.js?v=8514c8ba45";
import { construire, racinePar, RACINES, TYPE, TYPES } from "./accords.js?v=8514c8ba45";
export const DUREES = [1, 2, 3, 4, 6, 8];
export const nouvelAccord = (racine, type, duree = 4) => ({ racine: typeof racine === "string" ? racine : racine.nom, type, duree });
export function normaliser(grille) { return (Array.isArray(grille) ? grille : []).filter(a => a && racinePar(a.racine) && TYPE[a.type]).map(a => ({ racine: a.racine, type: a.type, duree: DUREES.includes(a.duree) ? a.duree : 4 })).slice(0, 32); }
export const accordsDe = grille => grille.map(a => construire(racinePar(a.racine), a.type));
export function deplacer(grille, de, vers) { if (de < 0 || de >= grille.length) return grille; const g = [...grille], [x] = g.splice(de, 1); g.splice(Math.max(0, Math.min(g.length, vers)), 0, x); return g; }
export const dupliquer = (grille, i) => (i < 0 || i >= grille.length || grille.length >= 32) ? grille : [...grille.slice(0, i + 1), { ...grille[i] }, ...grille.slice(i + 1)];
export const retirer = (grille, i) => grille.filter((_, k) => k !== i);
export const totalTemps = grille => grille.reduce((s, a) => s + a.duree, 0);
export function debuts(grille) { let t = 0; return grille.map(a => { const d = t; t += a.duree; return d; }); }
// Ancienne grille par degrés (0 à 6) : on la convertit en accords d'une tonalité et d'un mode.
export function depuisDegres(degres, tonique, mode, sons = 3) {
  const g = H.gamme(tonique, mode, 3); if (g.length !== 7) return [];
  return degres.filter(d => Number.isInteger(d) && d >= 0 && d < 7).map(d => { const a = H.accordDegre(g, d, sons), nom = a.notes[0].nom; const sy = H.QUALITE[a.qualite] ? H.QUALITE[a.qualite].symbole : "", q = (TYPES.find(t => t.symbole === sy) || { id: "maj" }).id; return nouvelAccord(nom, q); }).filter(a => racinePar(a.racine));
}
// Chiffrage romain d'un accord par rapport à la gamme : degré de la fondamentale, casse selon la tierce ; « — » si la fondamentale n'est pas dans la gamme.
export function romain(accord, gamme) {
  const r = racinePar(accord.racine), i = gamme.findIndex(n => n.classe === r.classe); if (i < 0 || gamme.length !== 7) return "—";
  const R = ["I", "II", "III", "IV", "V", "VI", "VII"][i], t = TYPE[accord.type], mineur = t.iv.some(([n, d]) => n === 3 && d === 3);
  return (mineur ? R.toLowerCase() : R) + (t.symbole.replace(/^m(?!aj)/, "").replace(/^dim$/, "°")); }
export function evenements(voicings, grille, { tempo = 90, style = "plaque" } = {}) {
  const tps = 60 / tempo, ev = []; let t = 0;
  voicings.forEach((v, i) => { const d = grille[i].duree * tps, notes = [v.basse, ...v.voix];
    if (style === "arpege") { const suite = [v.basse, ...v.voix, ...v.voix.slice(0, -1).reverse()], pas = tps / 2, n = Math.max(1, Math.round(d / pas)); for (let k = 0; k < n; k++) ev.push({ t: t + k * pas, duree: pas * 0.95, notes: [suite[k % suite.length]], vitesse: k === 0 ? 0.85 : 0.65 }); }
    else if (style === "pop") { ev.push({ t, duree: tps * 0.9, notes: [v.basse], vitesse: 0.85 }); for (let k = 1; k < grille[i].duree; k++) ev.push({ t: t + k * tps, duree: tps * 0.85, notes: v.voix, vitesse: 0.6 }); }
    else ev.push({ t, duree: d * 0.96, notes, vitesse: 0.75 }); t += d; });
  return { evenements: ev, duree: t };
}
// Pulsation : signal mono (Float32Array). Styles : clic (chaque temps), accent (le premier temps de chaque groupe de quatre est plus aigu), rock (grosse caisse, caisse claire, charleston).
export function pulsation(style, tempo, secondes, sr = 44100, temps = 4) {
  const n = Math.round(secondes * sr), y = new Float32Array(n), tps = 60 / tempo; if (style === "aucune" || !style) return y;
  let graine = 7; const bruit = () => { graine = (graine * 1664525 + 1013904223) >>> 0; return graine / 2147483648 - 1; };
  const clic = (t, f, g) => { const a = Math.round(t * sr); for (let i = 0; i < 0.03 * sr && a + i < n; i++) y[a + i] += Math.sin(2 * Math.PI * f * i / sr) * Math.exp(-i / (0.006 * sr)) * g; };
  const grosse = (t, g) => { const a = Math.round(t * sr); for (let i = 0; i < 0.22 * sr && a + i < n; i++) { const fr = 45 + 90 * Math.exp(-i / (0.03 * sr)); y[a + i] += Math.sin(2 * Math.PI * fr * i / sr) * Math.exp(-i / (0.06 * sr)) * g; } };
  const claire = (t, g) => { const a = Math.round(t * sr); for (let i = 0; i < 0.16 * sr && a + i < n; i++) y[a + i] += (bruit() * 0.8 + Math.sin(2 * Math.PI * 190 * i / sr) * 0.5) * Math.exp(-i / (0.035 * sr)) * g; };
  const charley = (t, g) => { const a = Math.round(t * sr); let p = 0; for (let i = 0; i < 0.04 * sr && a + i < n; i++) { const b = bruit(); y[a + i] += (b - p) * Math.exp(-i / (0.008 * sr)) * g; p = b; } };
  for (let k = 0; k * tps < secondes; k++) { const t = k * tps, pos = k % temps;
    if (style === "clic") clic(t, 1200, 0.5); else if (style === "accent") clic(t, pos === 0 ? 1800 : 1100, pos === 0 ? 0.7 : 0.45);
    else if (style === "rock") { if (pos === 0 || pos === 2) grosse(t, 0.8); if (pos === 1 || pos === 3) claire(t, 0.5); charley(t, 0.18); charley(t + tps / 2, 0.12); } }
  return y;
}
export const STYLES_PULSATION = [["aucune", "Aucune"], ["clic", "Clic à chaque temps"], ["accent", "Clic, premier temps accentué"], ["rock", "Batterie : grosse caisse, caisse claire, charleston"]];
