// SONORA Orchestre : les accords joués par les instruments choisis sur le plan (sans DOM, testé dans Node).
// Demande de Sébastien (26/11/2026) : choisir exactement les instruments qu'on veut faire sonner, et entendre l'accord harmonisé, jamais trois notes à l'unisson.
// Règles : chaque instrument reçoit une note de l'accord dans sa propre zone jouable ; deux instruments ne jouent jamais la même hauteur (unisson interdit) ;
// la basse joue la fondamentale quand elle le peut, et les autres notes se répartissent dans l'ordre indiqué par l'accord.
// Le placement est un appariement complet (Kuhn) : un instrument ne perd sa note que si aucun placement sans unisson n'existe pour tous.
import { jouables } from "./donnees.js?v=6a08b0b0dc";

// Les accords : classes de hauteur (0 = do), fondamentale en tête, puis l'ordre de répartition du grave à l'aigu.
export const ACCORDS = {
  do: { id: "do", nom: "do majeur", classes: [0, 4, 7], ordre: [0, 7, 4] },
  la: { id: "la", nom: "la mineur", classes: [9, 0, 4], ordre: [9, 4, 0] },
  sol7: { id: "sol7", nom: "sol 7 (dominante)", classes: [7, 11, 2, 5], ordre: [7, 2, 11, 5] },
};
const cible = z => z[0] + (z[1] - z[0]) * 0.4;   // le registre visé : au tiers bas de la zone, là où l'instrument sonne le plus naturellement
// Zone étendue : jusqu'à MARGE demi-tons au-delà des enregistrements (la tessiture réelle de l'instrument reste la limite). Sans cette marge, vingt instruments ne trouvent pas assez de hauteurs distinctes.
const MARGE = 4, PENALITE_HORS = 6;
export const zoneEtendue = inst => (!inst.banque || !inst.echant || !inst.tess) ? null : [Math.max(inst.tess[0], inst.echant[0] - MARGE), Math.min(inst.tess[1], inst.echant[1] + MARGE)];

// instruments : objets du plan (donnees.js) avec une zone jouable. Renvoie [{ inst, m }] du grave à l'aigu, m = numéro MIDI (60 = do4).
export function voicerAccord(instruments, zoneDe = zoneEtendue, accord = ACCORDS.do) {   // zoneDe : la zone où l'instrument peut jouer ; une note hors de la zone enregistrée coûte plus cher
  const zones = instruments.map(inst => ({ inst, z: zoneDe(inst) })).filter(x => x.z);
  zones.sort((a, b) => (a.z[0] + a.z[1]) - (b.z[0] + b.z[1]) || a.inst.id.localeCompare(b.inst.id));   // ordre fixe : même sélection, même accord
  const n = zones.length;
  // candidats de chaque instrument, du meilleur au moins bon
  const candidats = zones.map(({ inst, z }, k) => {
    const liste = [], enregistre = jouables(inst), pref = accord.ordre[k % accord.ordre.length];
    for (let m = z[0]; m <= z[1]; m++) {
      if (accord.classes.indexOf(m % 12) < 0) continue;
      const hors = !enregistre || m < enregistre[0] || m > enregistre[1];
      liste.push({ m, cout: Math.abs(m - cible(z)) / 12 * 3 + (m % 12 === pref ? 0 : 4) + (hors ? PENALITE_HORS : 0) });
    }
    return liste.sort((a, b) => a.cout - b.cout || a.m - b.m).map(x => x.m);
  });
  // appariement : les instruments les plus contraints d'abord
  const ordre = [...Array(n).keys()].sort((a, b) => candidats[a].length - candidats[b].length || a - b);
  const propriétaire = new Map();   // hauteur MIDI -> index de l'instrument qui la joue
  const affecte = new Array(n).fill(null);
  function essayer(i, vus) {
    for (const m of candidats[i]) {
      if (vus.has(m)) continue; vus.add(m);
      if (!propriétaire.has(m) || essayer(propriétaire.get(m), vus)) { propriétaire.set(m, i); affecte[i] = m; return true; }
    }
    return false;
  }
  for (const i of ordre) essayer(i, new Set());
  // une hauteur peut avoir été reprise par un autre instrument pendant l'appariement : on relit la table
  for (const [m, i] of propriétaire) affecte[i] = m;
  return zones.map(({ inst }, i) => affecte[i] === null ? null : { inst, m: affecte[i] }).filter(Boolean).sort((a, b) => a.m - b.m);
}
