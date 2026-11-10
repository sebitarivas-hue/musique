// Le son du jeu d'harmonie : les accords sont joués par des instruments écrits en SONORA, rendus hors ligne (timing exact, boucle sans couture).
// Sans DOM : testé dans Node (on vérifie les hauteurs entendues par analyse du spectre).
import { compiler } from "../src/index.js?v=50b7e5c7de";
import { rendre } from "../src/rendu.js?v=50b7e5c7de";
import { BANQUE, rendreSuiteEch } from "./echantillons.js?v=50b7e5c7de";
import { SONS_SYNTHESE } from "./sons_synthese.js?v=50b7e5c7de";
import { SONS_PERCUSSION } from "./sons_percussion.js?v=50b7e5c7de";

export const INSTRUMENTS = {
  piano: { nom: "Piano doux", code: `instrument PianoDoux {
    entree notes : Evenement<Note>
    polyphonie 10 voix vol(plus_ancienne)
    voix (n : Note) {
        soit f = n.hauteur
        soit forme = adsr(porte: n.porte, attaque: 6 ms, declin: 1.2 s, soutien: 20%, relache: 350 ms)
        soit corps = sinus(f) + 0.35 * sinus(2 * f) + 0.12 * sinus(3 * f)
        sortie = corps * forme * n.vitesse * 9%
    }
    sortie = voix.somme
}` },
  orgue: { nom: "Orgue", code: `instrument Orgue {
    entree notes : Evenement<Note>
    polyphonie 10 voix vol(plus_ancienne)
    voix (n : Note) {
        soit f = n.hauteur
        soit corps = sinus(f) + 0.5 * sinus(2 * f) + 0.25 * sinus(3 * f)
        soit forme = adsr(porte: n.porte, attaque: 15 ms, declin: 100 ms, soutien: 85%, relache: 200 ms)
        sortie = corps * forme * n.vitesse * 7%
    }
    sortie = voix.somme
}` },
  cordes: { nom: "Nappe de cordes", code: `instrument Cordes {
    entree notes : Evenement<Note>
    polyphonie 10 voix vol(plus_ancienne)
    voix (n : Note) {
        soit forme = adsr(porte: n.porte, attaque: 180 ms, declin: 300 ms, soutien: 80%, relache: 500 ms)
        soit a = dent(n.hauteur)
        soit b = dent(n.hauteur * 1.004)
        soit son = (a + b) * 0.5 -> passe_bas(coupure: 2200 Hz, q: 0.8)
        sortie = son * forme * n.vitesse * 8%
    }
    sortie = voix.somme
}` },
};
Object.assign(INSTRUMENTS, SONS_SYNTHESE, SONS_PERCUSSION);  // les percussions et effets servent la bibliothèque de Pistes ; ils ne sont pas dans NOMS_INSTR, donc pas dans les menus d'Harmonie
  // les sons de synthèse pour le rap, le pop, la house (sons_synthese.js)
// Les instruments proposés dans le jeu : ceux qui ont un son de secours écrit en SONORA, puis ceux qui n'existent qu'enregistrés (banque du site).
export const NOMS_INSTR = { piano: "Piano", orgue: "Orgue", cordes: "Cordes", harpe: "Harpe", guitare: "Guitare", clavecin: "Clavecin", violoncelle: "Violoncelle", flute: "Flûte", guitareElec: "Guitare électrique", guitareJazz: "Guitare jazz", guitareFolk: "Guitare acoustique", violonsOrch: "Violons, section d'orchestre", corsOrch: "Cors, section d'orchestre", clarinettesOrch: "Clarinettes, section d'orchestre", choeur: "Chœur de femmes", celesta: "Célesta", ...Object.fromEntries(Object.entries(SONS_SYNTHESE).map(([k, v]) => [k, v.nom])) };
export const TOUS = Object.keys(NOMS_INSTR);
// Les enregistrements décodés, par instrument de la banque. Tant qu'un instrument n'est pas chargé, le son de secours (SONORA) joue à sa place :
// le piano, l'orgue et les cordes ont le leur ; les autres jouent avec celui du piano.
const TAMPONS = {};
export const mettreTampons = (nomBanque, liste) => { TAMPONS[nomBanque] = liste; };
export const sonReel = cle => !!(BANQUE[cle] && TAMPONS[BANQUE[cle]]);
const modules = {};
export function moduleDe(nom) { if (!modules[nom]) { const r = compiler(INSTRUMENTS[nom].code); if (!r.ok || !r.module.code) throw new Error("instrument " + nom + " : " + r.diagnostics.map(d => d.message).join(" | ")); modules[nom] = r.module; } return modules[nom]; }
const hz = m => 440 * Math.pow(2, (m - 69) / 12);

// evenements : [{ t, duree, notes: [midi], vitesse }] en secondes. boucle : la queue qui dépasse est repliée au début (boucle sans couture).
export function rendreSuite(evenements, { instrument = "piano", sr = 44100, duree, boucle = false } = {}) {
  if (sonReel(instrument)) return rendreSuiteEch(evenements, TAMPONS[BANQUE[instrument]], { instrument: BANQUE[instrument], sr, duree, boucle });
  if (!INSTRUMENTS[instrument]) instrument = "piano";
  const fin = duree ?? Math.max(...evenements.map(e => e.t + e.duree)) + 1.2, queue = boucle ? 1.5 : 0, notes = []; let id = 1;
  for (const e of evenements) for (const m of e.notes) { const a = Math.round(e.t * sr); notes.push({ a, on: id, hauteur: hz(m), vitesse: e.vitesse ?? 0.8 }, { a: Math.max(a + 1, Math.round((e.t + e.duree) * sr)), off: id }); id++; }
  notes.sort((x, y) => x.a - y.a || (x.off ? -1 : 1));
  const n = Math.round(fin * sr), o = rendre(moduleDe(instrument), { sr, n: n + Math.round(queue * sr), notes });
  if (!boucle) return o.canaux.map(c => c.subarray(0, n));
  return o.canaux.map(c => { const x = c.slice(0, n); for (let i = n; i < c.length; i++) x[i - n] += c[i]; return x; });
}

// Ce que l'on joue pour une progression : chaque accord dure une mesure (4 temps). Styles : plaqué, arpège, pop (basse et accords alternés), valse (3 temps).
export function evenementsProgression(voicings, { tempo = 90, style = "plaque" } = {}) {
  const tps = 60 / tempo, temps = style === "valse" ? 3 : 4, mes = temps * tps, ev = [];
  voicings.forEach((v, i) => {
    const t0 = i * mes;
    if (style === "arpege") { const suite = [v.basse, ...v.voix, v.voix[v.voix.length - 2] ?? v.voix[0], v.voix[1] ?? v.voix[0]]; for (let k = 0; k < 8; k++) ev.push({ t: t0 + k * tps / 2, duree: tps / 2 * 0.95, notes: [suite[k % suite.length]], vitesse: 0.75 }); }
    else if (style === "pop") { ev.push({ t: t0, duree: tps * 0.9, notes: [v.basse], vitesse: 0.85 }, { t: t0 + tps, duree: tps * 0.8, notes: v.voix, vitesse: 0.6 }, { t: t0 + 2 * tps, duree: tps * 0.9, notes: [v.basse + 7 > v.voix[0] ? v.basse : v.basse + 7], vitesse: 0.75 }, { t: t0 + 3 * tps, duree: tps * 0.8, notes: v.voix, vitesse: 0.6 }); }
    else if (style === "valse") { ev.push({ t: t0, duree: tps * 0.95, notes: [v.basse], vitesse: 0.85 }, { t: t0 + tps, duree: tps * 0.7, notes: v.voix, vitesse: 0.55 }, { t: t0 + 2 * tps, duree: tps * 0.7, notes: v.voix, vitesse: 0.55 }); }
    else ev.push({ t: t0, duree: mes * 0.96, notes: [v.basse, ...v.voix], vitesse: 0.75 });
  });
  return { evenements: ev, mesure: mes, duree: voicings.length * mes };
}
