// SONORA Orchestre : l'accord de do majeur joué par les instruments choisis sur le plan (sans DOM, testé dans Node).
// Demande de Sébastien (26/11/2026) : choisir exactement les instruments qu'on veut faire sonner, et entendre l'accord harmonisé, jamais trois notes à l'unisson.
// Règles : chaque instrument reçoit une note de do majeur (do, mi ou sol) dans sa propre zone jouable ; deux instruments ne jouent jamais la même hauteur (unisson interdit) ;
// le plus grave joue le do ; les notes suivent l'ordre grave à aigu do, sol, mi, pour que les trois notes se répartissent.
// Le placement est un appariement complet (Kuhn) : un instrument ne perd sa note que si aucun placement sans unisson n'existe pour tous.
import { jouables } from "./donnees.js?v=ad77b02a98";

const CLASSES = [0, 4, 7];                 // do, mi, sol (0 = do)
const PREFERE = [0, 7, 4];                 // le plus grave au do, puis sol, puis mi
const cible = z => z[0] + (z[1] - z[0]) * 0.4;   // le registre visé : au tiers bas de la zone, là où l'instrument sonne le plus naturellement

// instruments : objets du plan (donnees.js) avec une zone jouable. Renvoie [{ inst, m }] du grave à l'aigu, m = numéro MIDI (60 = do4).
export function voicerAccord(instruments) {
  const zones = instruments.map(inst => ({ inst, z: jouables(inst) })).filter(x => x.z);
  zones.sort((a, b) => (a.z[0] + a.z[1]) - (b.z[0] + b.z[1]) || a.inst.id.localeCompare(b.inst.id));   // ordre fixe : même sélection, même accord
  const n = zones.length;
  // candidats de chaque instrument, du meilleur au moins bon
  const candidats = zones.map(({ z }, k) => {
    const liste = [];
    for (let m = z[0]; m <= z[1]; m++) {
      const c = CLASSES.indexOf(m % 12);
      if (c < 0) continue;
      const pref = PREFERE[k % 3];
      liste.push({ m, cout: Math.abs(m - cible(z)) / 12 * 3 + (CLASSES[c] === pref ? 0 : 4) });
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
