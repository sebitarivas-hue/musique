// Bandeau d'accueil commun aux fiches de SONORA (Science, Academy, Library) : le titre, une phrase, un gros bouton Écouter et la forme du son en direct.
// Même esprit que le mode Découvrir du Studio : on entend d'abord, on lit et on règle ensuite.
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
// Titre en deux lignes comme sur la maquette : la première moitié en clair, la seconde en vert acide.
const titreSignal = t => { const m = String(t).split(" "), k = Math.max(1, Math.ceil(m.length / 2)); return m.length < 2 ? `<span>${esc(t)}</span>` : `<span>${esc(m.slice(0, k).join(" "))}</span> <span class="acide">${esc(m.slice(k).join(" "))}</span>`; };
export function heros({ etiquette, titre, texte, bouton = "b-ecouter", aide = "", onde = "heros-onde", libelle = "Écouter" }) {
  return `<section class="scene heros" aria-label="${esc(titre)}">
    ${etiquette ? `<p class="scene-etiq">${esc(etiquette)}</p>` : ""}<h1>${titreSignal(titre)}</h1>${texte ? `<p class="heros-texte">${esc(texte)}</p>` : ""}
    <button type="button" id="${bouton}" class="scene-jouer jouer-pseudo" aria-pressed="false">${esc(libelle)}</button>
    ${aide ? `<p class="scene-aide">${esc(aide)}</p>` : ""}<canvas id="${onde}" class="scene-onde" role="img" aria-label="La forme du son, en direct"></canvas></section>`;
}
// Met le bouton dans son état (le symbole est dessiné par la feuille de style : le texte du bouton reste « Écouter » ou « Arrêter »).
export function etatBouton(b, marche) { if (!b) return; b.setAttribute("aria-pressed", String(!!marche)); b.textContent = marche ? "Arrêter" : (b.dataset.libelle || "Écouter"); }
