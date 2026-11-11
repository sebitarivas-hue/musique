// SONORA Orchestre, espace 04 : comprendre les variations. On part d'un thème (celui de l'élève, sinon le sujet d'exemple) et on le transforme de huit façons ; chaque variation s'écoute avec l'instrument de son choix,
// après le thème, pour entendre à la fois ce qui change (la forme) et ce qui reste (l'identité). Le Rondeau de Purcell, thème de Britten, s'ajoutera quand une partition libre sera dans le dépôt.
import { FAMILLES, parId, nomNote } from "./donnees.js?v=bae1304164";
import { POOL, etiquette } from "./timbres_logique.js?v=bae1304164";
import { caler, PAS } from "./fugue_logique.js?v=bae1304164";
import { SUJET_EXEMPLE, melodie, TRANSFORMATIONS, FAMILLES_THEME, dureeTemps, evenements } from "./variations_logique.js?v=bae1304164";
import { liensEcoute } from "./ecoutes.js?v=bae1304164";
import { rendreMelodie, sommer, lire, arreter, message } from "./audio.js?v=bae1304164";

const $ = id => document.getElementById(id), CLE_FUGUE = "sonora.orchestre.fugue";
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const INSTRUMENTS = POOL.filter(i => i.id !== "timbales"), etat = { bpm: 96, themeInst: "violons1", source: "exemple", sujet: SUJET_EXEMPLE.slice(), inst: {} };

function sujetDeLEleve() { try { const s = JSON.parse(localStorage.getItem(CLE_FUGUE)); if (s && Array.isArray(s.sujet) && s.sujet.length === PAS && s.sujet.some(m => m !== null)) return s.sujet; } catch (e) {} return null; }
function mini(a, b) {   // deux lignes superposées : le thème en gris, la variation en couleur, sur un même axe de temps et de hauteurs
  const tous = a.concat(b); if (!tous.length) return "";
  const lo = Math.min.apply(null, tous.map(n => n.m)) - 1, hi = Math.max.apply(null, tous.map(n => n.m)) + 1, T = Math.max(dureeTemps(a), dureeTemps(b), 1), W = 320, H = 74, h = (H - 8) / (hi - lo + 1);
  const r = (n, cl) => '<rect class="' + cl + '" x="' + (4 + n.t / T * (W - 8)).toFixed(1) + '" y="' + (4 + (hi - n.m) * h).toFixed(1) + '" width="' + Math.max(1.5, n.d / T * (W - 8) - 1).toFixed(1) + '" height="' + Math.max(2, h - 1).toFixed(1) + '"/>';
  return '<svg class="mini" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Le thème en gris et la variation en couleur, superposés">' + a.map(n => r(n, "m-theme")).join("") + b.map(n => r(n, "m-var")).join("") + "</svg>";
}
async function tampon(instId, mel, bpm) {
  const inst = parId(instId), cal = caler(mel.map(n => n.m), inst), dt = 60 / bpm, duree = dureeTemps(mel) * dt + 1.2;
  const lr = await rendreMelodie(inst, evenements(mel, bpm, cal.decalage), duree); return lr ? { buf: sommer([lr], duree), duree } : null;
}
async function jouerSuite(parties) {   // parties : [{ inst, mel }] jouées l'une après l'autre
  arreter(); message("chargement…"); const rendus = []; for (const p of parties) { const t = await tampon(p.inst, p.mel, etat.bpm); if (!t) { message("les sons ne sont pas disponibles ici"); return; } rendus.push(t); }
  let delai = 0; const lectures = rendus.map(t => { const x = { buf: t.buf, delai }; delai += t.duree - 0.4; return x; });
  lire(lectures, () => message("prêt")); message("à l'écoute");
}
const optionsInst = sel => INSTRUMENTS.map(i => '<option value="' + i.id + '"' + (i.id === sel ? " selected" : "") + ">" + esc(etiquette(i)) + "</option>").join("");

function dessiner() {
  const th = melodie(etat.sujet), el = $("variations-corps");
  let h = '<div class="entete-oeuvre"><p><span class="etq">Ton thème</span> ' + (etat.source === "eleve" ? "Le sujet que tu as dessiné dans l'espace 05." : "Le sujet d'exemple écrit pour ce cours (do mi sol mi fa ré do). Dessine le tien dans l'espace 05 : il apparaîtra ici.") + '</p><p class="ecoute-section"><span class="etq">Écouter l\'original</span> Purcell, Rondeau d\'Abdelazer ' + liensEcoute("Purcell Abdelazer Rondeau", "Purcell, Rondeau d\'Abdelazer") + '</p><div class="actions-fiche"><button type="button" id="v-recharger">' + (etat.source === "eleve" ? "Utiliser le sujet d'exemple" : "Reprendre mon sujet de l'espace 05") + '</button></div></div>'
    + '<div class="reglages-fugue"><fieldset><legend>Tempo : <output id="v-bpm-val">' + etat.bpm + '</output> pulsations par minute</legend><input type="range" id="v-bpm" min="60" max="140" step="4" value="' + etat.bpm + '" aria-label="Tempo"></fieldset>'
    + '<label class="champ">Instrument du thème<select id="v-theme-inst">' + optionsInst(etat.themeInst) + '</select></label></div>'
    + '<div class="actions-fiche"><button type="button" class="principal" id="v-theme">Écouter le thème</button><button type="button" id="v-familles">Le thème dans chaque famille</button><button type="button" id="v-stop">Arrêter</button></div>'
    + '<div class="mel-theme">' + mini(th, []) + "</div>"
    + '<div class="grille-variations">';
  TRANSFORMATIONS.forEach(t => {
    const v = t.f(th), inst = etat.inst[t.id] || t.instrument, fam = FAMILLES[parId(inst).fam];
    h += '<article class="carte-var" style="--c:' + fam.couleur + ";--p:" + fam.pale + '"><h3>' + esc(t.nom) + "</h3><p>" + esc(t.texte) + "</p>" + mini(th, v) + '<label class="champ">Instrument<select data-inst="' + t.id + '">' + optionsInst(inst) + '</select></label><div class="rangee"><button type="button" class="principal" data-suite="' + t.id + '">Le thème puis la variation</button><button type="button" data-seule="' + t.id + '">La variation seule</button></div></article>';
  });
  el.innerHTML = h + "</div>";
  $("v-recharger").onclick = () => { if (etat.source === "eleve") { etat.source = "exemple"; etat.sujet = SUJET_EXEMPLE.slice(); } else { const s = sujetDeLEleve(); if (s) { etat.source = "eleve"; etat.sujet = s; } else message("aucun sujet dessiné pour l'instant"); } dessiner(); };
  $("v-bpm").oninput = e => { etat.bpm = +e.target.value; $("v-bpm-val").textContent = etat.bpm; };
  $("v-theme-inst").onchange = e => { etat.themeInst = e.target.value; };
  $("v-theme").onclick = () => jouerSuite([{ inst: etat.themeInst, mel: th }]);
  $("v-familles").onclick = () => jouerSuite(FAMILLES_THEME.map(f => ({ inst: f.instrument, mel: th })));
  $("v-stop").onclick = () => { arreter(); message("prêt"); };
  el.querySelectorAll("[data-inst]").forEach(s => { s.onchange = () => { etat.inst[s.dataset.inst] = s.value; dessiner(); }; });
  el.querySelectorAll("[data-suite], [data-seule]").forEach(b => { b.onclick = () => { const id = b.dataset.suite || b.dataset.seule, t = TRANSFORMATIONS.find(x => x.id === id), inst = etat.inst[id] || t.instrument, v = { inst, mel: t.f(th) }; jouerSuite(b.dataset.suite ? [{ inst: etat.themeInst, mel: th }, v] : [v]); }; });
}
export function monterVariations() { const s = sujetDeLEleve(); if (s) { etat.source = "eleve"; etat.sujet = s; } dessiner(); window.ORCHESTRE_VARIATIONS = etat; }
