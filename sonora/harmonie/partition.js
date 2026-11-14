// Partition en accords (grand portée : clé de sol et clé de fa), dessinée en SVG. Sans DOM : testé dans Node.
// Une colonne par accord, avec son nom au-dessus ; les altérations sont écrites devant chaque note altérée (pas d'armure : choix simple et lisible).
import { nomNote } from "./theorie.js?v=3c9c8dbe0a";
const NATURELS = [0, 2, 4, 5, 7, 9, 11], pc = m => ((m % 12) + 12) % 12;
const ESPACE = 10, PAS = ESPACE / 2;
// Écrit une hauteur midi avec l'orthographe de l'accord (Fa♯ ou Sol♭ selon l'accord) : { lettre, alt, octave, n } où n est le numéro diatonique (do4 = 28).
export function ecrireMidi(midi, accord) {
  const note = accord && accord.notes && accord.notes.find(x => pc(x.midi) === pc(midi));
  let lettre, alt; if (note) { lettre = note.lettre; alt = note.alt; } else { const c = pc(midi), l = NATURELS.findIndex(x => x === c); if (l >= 0) { lettre = l; alt = 0; } else { lettre = NATURELS.findIndex(x => x === c - 1); alt = 1; } }
  const octave = (midi - alt - NATURELS[lettre]) / 12 - 1; return { lettre, alt, octave: Math.round(octave), n: 7 * Math.round(octave) + lettre, midi };
}
const FOND = { sol: 30, fa: 18 };   // numéro diatonique de la ligne du bas : mi4 en clé de sol, sol2 en clé de fa
export function portee(n, cle) { return n; }
const glyphe = alt => alt === 0 ? "" : alt === 1 ? "♯" : alt === -1 ? "♭" : alt === 2 ? "𝄪" : alt === -2 ? "♭♭" : "";
// colonnes : [{ nom, notes: [midi...], accord, duree: 1, 2 ou 4 temps }]. courant : indice de la colonne à mettre en valeur.
export function partitionSVG(colonnes, { courant = -1, largeurColonne = 84 } = {}) {
  const M = 64, colW = largeurColonne, W = M + colonnes.length * colW + 16, yS = 78, yF = yS + 4 * ESPACE + 74, H = yF + 4 * ESPACE + 56;
  const yLigne = (cle, k) => (cle === "sol" ? yS : yF) + k * ESPACE;              // k = 0 : ligne du haut
  const yNote = (n, cle) => (cle === "sol" ? yS + 4 * ESPACE : yF + 4 * ESPACE) - (n - FOND[cle]) * PAS;
  let s = `<svg class="partition" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Partition : ${colonnes.length} accords en clé de sol et en clé de fa">`;
  s += `<rect width="${W}" height="${H}" fill="#F0EFE8"/>`;
  colonnes.forEach((c, i) => { if (i === courant) s += `<rect class="courant" x="${M + i * colW}" y="14" width="${colW}" height="${H - 24}" fill="#D6FF00" opacity=".55"/>`; });
  for (const cle of ["sol", "fa"]) for (let k = 0; k < 5; k++) s += `<line class="ligne" x1="${M - 14}" x2="${W - 8}" y1="${yLigne(cle, k)}" y2="${yLigne(cle, k)}" stroke="#11110F" stroke-width="1.2"/>`;
  s += `<line x1="${M - 14}" x2="${M - 14}" y1="${yS}" y2="${yF + 4 * ESPACE}" stroke="#11110F" stroke-width="2"/>`;
  s += `<text class="cle" x="${M - 52}" y="${yS + 38}" font-family="Georgia, serif" font-size="58" font-style="italic" font-weight="700" fill="#11110F">G</text><text class="cle" x="${M - 52}" y="${yF + 30}" font-family="Georgia, serif" font-size="46" font-style="italic" font-weight="700" fill="#11110F">F</text>`;
  colonnes.forEach((c, i) => {
    const x0 = M + i * colW, xc = x0 + colW / 2 + 6, notes = c.notes.map(m => ecrireMidi(m, c.accord)).map(n => ({ ...n, cle: n.midi >= 60 ? "sol" : "fa" })).sort((a, b) => a.midi - b.midi);
    s += `<g class="col" data-i="${i}">`;
    if (c.nom) s += `<text class="nom" x="${x0 + colW / 2}" y="${yS - 30}" text-anchor="middle" font-family="Instrument Sans, Arial, sans-serif" font-size="15" font-weight="700" fill="#11110F">${c.nom.replace(/&/g, "&amp;")}</text>`;
    for (const cle of ["sol", "fa"]) {
      const L = notes.filter(n => n.cle === cle); if (!L.length) continue;
      const decale = new Set(); for (let k = 1; k < L.length; k++) if (L[k].n - L[k - 1].n === 1 && !decale.has(k - 1)) decale.add(k);   // secondes : la tête du dessus se place à droite
      const accRang = []; L.slice().reverse().forEach((n, k) => { if (n.alt) accRang.push(n); });
      L.forEach((n, k) => {
        const y = yNote(n.n, cle), x = xc + (decale.has(k) ? 11 : 0), basse = FOND[cle], haut = basse + 8;
        for (let l = basse - 2; n.n <= l; l -= 2) { const yl = yNote(l, cle); s += `<line class="supp" x1="${x - 11}" x2="${x + 11}" y1="${yl}" y2="${yl}" stroke="#11110F" stroke-width="1.2"/>`; }
        for (let l = haut + 2; n.n >= l; l += 2) { const yl = yNote(l, cle); s += `<line class="supp" x1="${x - 11}" x2="${x + 11}" y1="${yl}" y2="${yl}" stroke="#11110F" stroke-width="1.2"/>`; }
        s += `<ellipse class="tete" data-midi="${n.midi}" data-note="${nomNote(n.lettre, n.alt)}${n.octave}" cx="${x}" cy="${y}" rx="6.4" ry="4.6" transform="rotate(-18 ${x} ${y})" fill="${(c.duree || 4) >= 4 || (c.duree === 2) ? "none" : "#11110F"}" stroke="#11110F" stroke-width="${(c.duree || 4) >= 4 ? 2 : 1.6}"/>`;
        if (n.alt) { const dx = accRang.indexOf(n); s += `<text class="alt" x="${xc - 18 - (dx % 2) * 11 - (decale.has(k) ? 0 : 0)}" y="${y + 5}" text-anchor="middle" font-family="Georgia, serif" font-size="17" fill="#11110F">${glyphe(n.alt)}</text>`; }
      });
      if ((c.duree || 4) < 4) { const hauts = L[L.length - 1], bas = L[0], monte = cle === "fa" ? false : false; const x = xc + 6.2, y1 = yNote(L[0].n, cle), y2 = yNote(L[L.length - 1].n, cle); s += `<line class="hampe" x1="${x}" x2="${x}" y1="${y1}" y2="${y2 - 30}" stroke="#11110F" stroke-width="1.6"/>`; }
    }
    s += `<line class="mesure" x1="${x0 + colW}" x2="${x0 + colW}" y1="${yS}" y2="${yF + 4 * ESPACE}" stroke="#11110F" stroke-width="1.4"/></g>`;
  });
  return s + `</svg>`;
}
