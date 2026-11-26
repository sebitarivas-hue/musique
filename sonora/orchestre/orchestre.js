// SONORA Orchestre, espace 01 : explorer l'orchestre. Le plan des musiciens (SVG), les tessitures comparées, une fiche par instrument avec un clavier limité à sa tessiture et sa gamme jouée par la banque d'échantillons du site.
// Les sons sont des enregistrements (voir ../harmonie/echantillons.js) : un instrument sans enregistrement le dit au lieu de faire un faux son.
import { FAMILLES, ORDRE_FAMILLES, INSTRUMENTS, PIZZICATO, TREMOLO, COL_LEGNO, HARMONIQUES, STACCATO, MARCATO, ROULEMENTS, ROULEMENTS_RECONSTITUES, parId, nomNote, noire, jouables, gamme, secteur, centre, ANNEAUX } from "./donnees.js?v=2fb0a4bcbc";
import { ACCORDS, voicerAccord } from "./accord.js?v=2fb0a4bcbc";
import { EXEMPLES } from "./exemples.js?v=2fb0a4bcbc";
import { CADENCES, voicerCadence } from "./cadences.js?v=2fb0a4bcbc";
import { message, arreter, jouer, rendreMelodie, sommer, lire, debut, perimee, placer, equilibrer } from "./audio.js?v=2fb0a4bcbc";
import { monterTimbres } from "./timbres.js?v=2fb0a4bcbc";
import { monterFugue } from "./fugue.js?v=2fb0a4bcbc";
import { monterBritten } from "./britten.js?v=2fb0a4bcbc";
import { monterVariations } from "./variations.js?v=2fb0a4bcbc";
import { svgIcone, dessin } from "./icones.js?v=2fb0a4bcbc";
import { PHOTOS } from "./photos.js?v=2fb0a4bcbc";
import { FICHES } from "./fiches.js?v=2fb0a4bcbc";

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const ABR = { piccolo: "Picc.", corAnglais: "C. angl.", clarinetteBasse: "Cl. basse", caisseClaire: "Caisse cl.", grosseCaisse: "Gr. caisse", tamTam: "Tam-tam", cloches: "Cloches", tambourBasque: "T. de basque", blocsChinois: "Blocs", castagnettes: "Castagn." };
// Une photo d'instrument (Wikimedia Commons, voir la page de crédits) quand il y en a une, sinon le dessin tracé pour ce cours.
function visuel(id, t, titre) {
  const p = PHOTOS[id]; if (!p) return svgIcone(id, t, titre || "");
  const k = t / Math.max(p.w, p.h);
  return '<img class="photo" src="photos/' + p.f + '" width="' + Math.round(p.w * k) + '" height="' + Math.round(p.h * k) + '" alt="' + esc(titre || "") + '">';
}
function imageSvg(id) { const p = PHOTOS[id], k = 100 / Math.max(p.w, p.h), w = p.w * k, h = p.h * k; return '<image class="photo-svg" href="photos/' + p.f + '" x="' + (50 - w / 2).toFixed(1) + '" y="' + (50 - h / 2).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '"/>'; }
const etat = { melange: [], accord: "do", jeu: "arco", roul: false, choix: null, famille: null, vue: "plan", note: null };
// ---------------------------------------------------------------- le plan
// Les dessins d'une section, posés en grille polaire dans son secteur, debout, la tête vers l'extérieur (les musiciens font face au chef).
function iconesDuSecteur(i) {
  const a = ANNEAUX[i.rang], r0 = a[0] + 28, r1 = a[1] - 4, prof = r1 - r0, dth = i.g1 - i.g0 - 3, rmid = (r0 + r1) / 2, larg = rmid * dth * Math.PI / 180, k = i.visuels;
  let nl = 1, taille = 0; for (let l = 1; l <= 3; l++) { const c = Math.ceil(k / l), t = Math.min(larg / c, prof / l); if (t > taille + 1) { taille = t; nl = l; } }
  taille = Math.min(taille * 0.96, 50); const nc = Math.ceil(k / nl); let s = "";
  for (let n = 0; n < k; n++) {
    const lig = Math.floor(n / nc), col = n % nc, dans = Math.min(nc, k - lig * nc), ang = i.g0 + 1.5 + (col + 0.5 + (nc - dans) / 2) * dth / nc, rad = r0 + (lig + 0.5) * prof / nl, ar = ang * Math.PI / 180;
    s += '<g class="ico" transform="translate(' + (500 + rad * Math.sin(ar)).toFixed(1) + " " + (540 - rad * Math.cos(ar)).toFixed(1) + ") rotate(" + ang.toFixed(1) + ") scale(" + (taille / 100).toFixed(3) + ') translate(-50 -50)">' + (PHOTOS[i.id] ? imageSvg(i.id) : dessin(i.id)) + "</g>";
  }
  return s;
}
function dessinerPlan() {
  let s = '<svg viewBox="60 36 880 524" role="group" aria-label="Plan de l\'orchestre vu de dessus, le chef en bas">';
  s += '<text class="public" x="500" y="554">public</text>';
  for (const i of INSTRUMENTS) {
    const f = FAMILLES[i.fam], a = ANNEAUX[i.rang], mil = (i.g0 + i.g1) / 2 * Math.PI / 180, rl = a[0] + 12, larg = rl * (i.g1 - i.g0) * Math.PI / 180, long = i.nom.length * 6.6;
    const mots = larg >= long ? [i.nom] : (ABR[i.id] && larg < ABR[i.id].length * 6.6 + 40 && i.nom.split(" ").length < 2 ? [ABR[i.id]] : i.nom.split(" "));
    const tx = 500 + rl * Math.sin(mil), ty = 540 - rl * Math.cos(mil) - (mots.length - 1) * 5;
    const texte = mots.map((m, k) => '<tspan x="' + tx.toFixed(1) + '" dy="' + (k ? 12 : 0) + '">' + esc(m) + "</tspan>").join("");
    s += '<g class="sect" data-id="' + i.id + '" data-fam="' + i.fam + '" role="button" tabindex="0" aria-pressed="false" aria-label="' + esc(i.nom + ", " + f.court.toLowerCase()) + '" style="--c:' + f.couleur + ";--p:" + f.pale + '"><path d="' + secteur(i) + '"><title>' + esc(i.nom) + "</title></path>" + iconesDuSecteur(i) + '<text class="etiq" x="' + tx.toFixed(1) + '" y="' + ty.toFixed(1) + '">' + texte + "</text></g>";
  }
  s += '<g class="chef"><circle cx="500" cy="528" r="11"/><path d="M493 541 L507 541 L500 530 Z"/><text x="500" y="505">chef</text></g></svg>';
  $("plan").innerHTML = s;
}

// ---------------------------------------------------------------- la galerie : une carte par instrument, rangée par famille (la vue des petits écrans)
function dessinerGalerie() {
  $("galerie").innerHTML = ORDRE_FAMILLES.map(f => '<section class="bloc-gal" style="--c:' + FAMILLES[f].couleur + ";--p:" + FAMILLES[f].pale + '"><h3>' + esc(FAMILLES[f].nom) + '</h3><div class="cartes-g">'
    + INSTRUMENTS.filter(i => i.fam === f).map(i => '<button type="button" class="carte-g" data-id="' + i.id + '" data-fam="' + f + '" aria-pressed="false"><span class="vg">' + visuel(i.id, 84, "") + "</span><span class=\"ng\">" + esc(i.nom) + "</span></button>").join("") + "</div></section>").join("");
}

// ---------------------------------------------------------------- les tessitures : toutes les étendues sur un même axe de hauteurs
function dessinerTessitures() {
  const X0 = 150, X1 = 985, M0 = 21, M1 = 108, H = 25, x = m => X0 + (m - M0) / (M1 - M0) * (X1 - X0);
  const lignes = []; for (const f of ORDRE_FAMILLES) for (const i of INSTRUMENTS) if (i.fam === f) lignes.push(i);
  const haut = 34 + lignes.length * H + 6;
  let s = '<svg viewBox="0 0 1000 ' + haut + '" role="group" aria-label="Tessitures des instruments sur un même axe de hauteurs"><g class="tess-axe">';
  for (let m = 24; m <= 108; m += 12) s += '<line x1="' + x(m).toFixed(1) + '" x2="' + x(m).toFixed(1) + '" y1="26" y2="' + (haut - 6) + '"/><text x="' + x(m).toFixed(1) + '" y="18">' + nomNote(m) + "</text>";
  s += "</g>";
  lignes.forEach((i, k) => {
    const y = 34 + k * H, f = FAMILLES[i.fam];
    s += '<g class="tess-ligne" data-id="' + i.id + '" data-fam="' + i.fam + '" role="button" tabindex="0" aria-pressed="false" style="--c:' + f.couleur + '" aria-label="' + esc(i.nom + (i.tess ? ", de " + nomNote(i.tess[0]) + " à " + nomNote(i.tess[1]) : ", sans hauteur précise")) + '"><rect x="0" y="' + y + '" width="1000" height="' + (H - 2) + '" fill="transparent"/><text x="6" y="' + (y + 16) + '">' + esc(i.nom) + "</text>";
    s += i.tess ? '<rect class="barre" x="' + x(i.tess[0]).toFixed(1) + '" y="' + (y + 3) + '" width="' + (x(i.tess[1] + 1) - x(i.tess[0])).toFixed(1) + '" height="' + (H - 8) + '"/>' : '<text class="tess-sans" x="' + X0 + '" y="' + (y + 16) + '">sans hauteur précise</text>';
    s += "</g>";
  });
  $("tessitures").innerHTML = s + "</svg>";
}

// ---------------------------------------------------------------- le mélange : des sections choisies sur le plan jouent ensemble un accord de do majeur
// Les préréglages : une famille, ou tout l'orchestre. Les percussions sans hauteur en font partie : elles jouent leur coup avec l'accord.
const PRESETS = { cordes: i => i.fam === "cordes", bois: i => i.fam === "bois", cuivres: i => i.fam === "cuivres", percussions: i => i.fam === "percussions", tout: () => true };
const aUnSon = i => !!(jouables(i) || i.coup);
// La version jouée d'un instrument : à l'archet, son enregistrement ; en pizzicato ou en trémolo, sa banque particulière (ou rien, s'il n'en a pas).
const JEUX = { pizz: PIZZICATO, trem: TREMOLO, col: COL_LEGNO, hrm: HARMONIQUES, stacc: STACCATO, marc: MARCATO };
// Une technique de jeu ne concerne que les cordes frottées : les bois, les cuivres, la harpe et les percussions jouent normalement avec elles.
// Une corde frottée sans la technique demandée est laissée de côté (et signalée), plutôt que de jouer à l'archet au milieu d'un pizzicato.
const CORDES_FROTTEES = ["violons1", "violons2", "altos", "violoncelles", "contrebasses"];
// Staccato et marcato sont des articulations pour tout l'orchestre : les cordes ont leurs échantillons dédiés,
// les autres instruments à hauteur précise jouent des notes courtes (staccato) ou accentuées et plus brèves (marcato).
function articulation(dureeBase) {
  if (etat.jeu === "stacc") return { duree: 0.22, vitesse: 0.8 };
  if (etat.jeu === "marc") return { duree: Math.min(dureeBase, 0.9), vitesse: 1.0 };
  return { duree: dureeBase, vitesse: 0.8 };
}
function versionJeu(i) {
  if (!i) return null;
  if (etat.jeu === "arco" || !CORDES_FROTTEES.includes(i.id)) return jouables(i) ? i : null;
  const t = (JEUX[etat.jeu] || {})[i.id];
  return t ? { ...i, banque: t.banque, echant: t.echant } : null;
}
const NOM_JEU = { arco: "", pizz: " en pizzicato", trem: " en trémolo", col: " col legno", hrm: " en harmoniques", stacc: " en staccato", marc: " en marcato" };
const MANQUE_JEU = { arco: " sans enregistrement", pizz: " sans pizzicato", trem: " sans trémolo", col: " sans col legno", hrm: " sans harmoniques", stacc: " sans staccato", marc: " sans marcato" };
function jouable(i) { const v = versionJeu(i); return !!(v && jouables(v)); }
function accordDeLaSelection() {   // les instruments choisis, du grave à l'aigu : chacun joue une note de l'accord choisi, jamais à l'unisson d'un autre
  return voicerAccord(INSTRUMENTS.filter(i => etat.melange.indexOf(i.id) >= 0 && jouable(i)).map(versionJeu), undefined, ACCORDS[etat.accord]);
}
function majMelange() {
  const n = etat.melange.length, sansHauteur = etat.melange.filter(id => !parId(id)?.tess), muets = etat.melange.filter(id => parId(id)?.tess && !jouable(parId(id)));
  const bouts = [];
  if (muets.length) bouts.push(muets.length + MANQUE_JEU[etat.jeu] + ", ignorée" + (muets.length > 1 ? "s" : ""));
  if (sansHauteur.length) bouts.push(sansHauteur.length + " sans hauteur précise (percussion) : elles jouent avec l'accord");
  $("m-etat").textContent = n ? n + (n > 1 ? " sections choisies" : " section choisie") + (bouts.length ? " (" + bouts.join(" ; ") + ")" : "") + "." : "Aucune section choisie.";
  document.querySelectorAll(".sect").forEach(g => g.classList.toggle("dans-melange", etat.melange.indexOf(g.dataset.id) >= 0));
  document.querySelectorAll(".sect").forEach(g => g.setAttribute("aria-pressed", String(etat.melange.indexOf(g.dataset.id) >= 0)));
}
// Un roulement reconstitué : des coups réels rapprochés (13 par seconde), aux nuances qui varient sans hasard, de t0 à t0 + duree.
const NUANCES_ROUL = [0.62, 0.55, 0.68, 0.58, 0.72, 0.6, 0.66, 0.57];
function roulement(t0, duree, note) { const ev = []; for (let k = 0, t = t0; t < t0 + duree; k++, t += 1 / 13) ev.push({ t, duree: 0.3, notes: [note], vitesse: NUANCES_ROUL[k % NUANCES_ROUL.length] }); return ev; }
// Les événements d'une percussion sans hauteur sur une durée : un roulement (enregistré ou reconstitué) si l'option est active, sinon des frappes.
function piste_percu(i, debuts, duree) {
  if (etat.roul && ROULEMENTS[i.id]) return { inst: { banque: ROULEMENTS[i.id], nom: i.nom }, ev: debuts.map(t => ({ t, duree, notes: [60], vitesse: 0.8 })) };
  if (etat.roul && ROULEMENTS_RECONSTITUES.includes(i.id)) return { inst: { banque: i.coup.banque, nom: i.nom }, ev: debuts.flatMap(t => roulement(t, duree, 60)) };
  return null;
}
async function jouerMelange() {
  // Les percussions sans hauteur jouent leur coup (do4) avec l'accord, au même instant : elles ne sont pas séparées de l'accord.
  const parts = accordDeLaSelection(), percs = INSTRUMENTS.filter(i => etat.melange.indexOf(i.id) >= 0 && i.coup);
  if (!parts.length && !percs.length) { message(etat.melange.length ? "un accord a besoin d'un instrument à hauteur précise" : "choisis d'abord des instruments sur le plan"); return; }
  const j = debut(); message("chargement…"); const duree = 4.6;
  const insts = [...parts.map(p => p.inst), ...percs];
  const brut = await Promise.all([
    // les timbales roulent sur leur note de l'accord si l'option est active
    ...parts.map(p => { const a = articulation(3.4); return rendreMelodie(p.inst, etat.roul && ROULEMENTS_RECONSTITUES.includes(p.inst.id) ? roulement(0, 3.4, p.m) : [{ t: 0, duree: a.duree, notes: [p.m], vitesse: a.vitesse }], duree, j); }),
    // sans roulement, chaque percussion sans hauteur frappe une fois, avec l'accord
    ...percs.map(i => { const r = piste_percu(i, [0], 3.4); return r ? rendreMelodie(r.inst, r.ev, duree, j) : rendreMelodie({ banque: i.coup.banque, nom: i.nom }, [{ t: 0, duree: 0.9, notes: [60], vitesse: 0.8 }], duree, j); }),
  ]);
  if (perimee(j)) return;
  const muets = insts.filter((_, k) => !brut[k]).map(i => i.nom.toLowerCase());
  const buf = sommer(equilibrer(brut, insts.map(i => i.id)).map((x, k) => placer(x, insts[k])), duree); lire([{ buf }], () => message("prêt"));
  if (muets.length) message("son non chargé pour " + muets.join(", ") + " : choisis-les à nouveau pour réessayer");
  const txt = parts.length ? "accord de " + ACCORDS[etat.accord].nom + NOM_JEU[etat.jeu] + " : " + parts.map(p => (p.inst.id === "violons2" ? "seconds violons" : p.inst.nom.toLowerCase()) + " " + nomNote(p.m)).join(", ") : "percussions seules";
  const sans = INSTRUMENTS.filter(i => i.tess && etat.melange.indexOf(i.id) >= 0 && !parts.some(p => p.inst.id === i.id)).map(i => i.nom.toLowerCase());
  message(txt + (percs.length ? ". Avec les percussions" + (etat.roul ? " (avec roulements)" : "") + " : " + percs.map(i => i.nom.toLowerCase()).join(", ") : "") + (sans.length ? ". Sans note dans l'accord, faute de hauteur libre sans unisson : " + sans.join(", ") : ""));
}
function setJeu(jeu) { etat.jeu = jeu; $("m-jeu").value = jeu; majMelange(); }
// Une cadence : la suite des accords jouée par les instruments choisis, voix conduites d'un accord à l'autre ; les percussions frappent leur coup à chaque accord.
async function jouerCadence() {
  const c = CADENCES.find(x => x.id === $("m-cadence").value); if (!c) return;
  const instruments = INSTRUMENTS.filter(i => etat.melange.indexOf(i.id) >= 0 && jouable(i)).map(versionJeu);
  const percs = INSTRUMENTS.filter(i => etat.melange.indexOf(i.id) >= 0 && i.coup);
  if (!instruments.length && !percs.length) { message("choisis d'abord des instruments sur le plan"); return; }
  const v = voicerCadence(instruments, c), T = 1.8, duree = v.length * T + 1.2, j = debut();
  message("chargement de la cadence…");
  const parIns = new Map();
  v.forEach((acc, k) => acc.parts.forEach(p => { if (!parIns.has(p.inst.id)) parIns.set(p.inst.id, { inst: p.inst, ev: [] }); const e = parIns.get(p.inst.id).ev; if (etat.roul && ROULEMENTS_RECONSTITUES.includes(p.inst.id)) e.push(...roulement(k * T, T * 0.95, p.m)); else { const a = articulation(T * 0.95); e.push({ t: k * T, duree: a.duree, notes: [p.m], vitesse: a.vitesse }); } }));
  const pistes = [...parIns.values()].map(x => rendreMelodie(x.inst, x.ev, duree, j));
  const insts = [...parIns.values()].map(x => x.inst);
  for (const i of percs) { const r = piste_percu(i, v.map((_, k) => k * T), T * 0.95); pistes.push(r ? rendreMelodie(r.inst, r.ev, duree, j) : rendreMelodie({ banque: i.coup.banque, nom: i.nom }, v.map((_, k) => ({ t: k * T, duree: 0.9, notes: [60], vitesse: 0.8 })), duree, j)); insts.push(i); }
  const lr = await Promise.all(pistes);
  if (perimee(j)) return;
  const buf = sommer(equilibrer(lr, insts.map(i => i.id)).map((x, k) => placer(x, insts[k])), duree); lire([{ buf }], () => message("prêt"));
  message(c.nom + " : " + v.map(x => x.accord.nom).join(", ") + ".");
  $("m-exemple").textContent = c.nom + ". " + c.explication;
}
function brancherMelange() {
  $("m-cadence-jouer").onclick = jouerCadence;
  $("m-cadence").innerHTML = CADENCES.map(c => '<option value="' + c.id + '">' + esc(c.nom) + "</option>").join("");
  document.querySelectorAll("[data-preset]").forEach(b => { b.onclick = () => { etat.melange = INSTRUMENTS.filter(PRESETS[b.dataset.preset]).filter(aUnSon).map(i => i.id); majMelange(); jouerMelange(); }; });
  $("m-vider").onclick = () => { etat.melange = []; majMelange(); arreter(); };
  $("m-jouer").onclick = jouerMelange;
  $("m-accord").onchange = e => { etat.accord = e.target.value; };
  $("m-jeu").onchange = e => setJeu(e.target.value);
  $("m-roul").onclick = () => { etat.roul = !etat.roul; $("m-roul").setAttribute("aria-pressed", String(etat.roul)); };
  $("exemples").insertAdjacentHTML("beforeend", EXEMPLES.map(x => '<button type="button" data-exemple="' + x.id + '">' + esc(x.titre) + "</button>").join(""));
  document.querySelectorAll("[data-exemple]").forEach(b => { b.onclick = () => {
    const ex = EXEMPLES.find(x => x.id === b.dataset.exemple); if (!ex) return;
    etat.melange = (ex.ids === "tout" ? INSTRUMENTS.filter(aUnSon) : ex.ids.map(parId)).filter(Boolean).map(i => i.id);
    etat.accord = ex.accord; $("m-accord").value = ex.accord; setJeu(ex.jeu || "arco");
    majMelange(); $("m-exemple").textContent = ex.titre + ". " + ex.ecoute + " " + ex.repere;
    jouerMelange();
  }; });
}

// ---------------------------------------------------------------- la fiche d'un instrument
function clavier(inst) {
  const lo = inst.tess[0], hi = inst.tess[1], z = jouables(inst), W = 300, H = 64; let blancs = 0; for (let m = lo; m <= hi; m++) if (!noire(m)) blancs++;
  const w = Math.min(22, W / blancs), larg = blancs * w; let k = 0, b = "", n = "";
  for (let m = lo; m <= hi; m++) {
    const dedans = z && m >= z[0] && m <= z[1], cl = "touche " + (dedans ? "dans" : "dehors"), lib = nomNote(m);
    if (!noire(m)) { b += '<rect class="' + cl + ' blanche" data-m="' + m + '" x="' + (k * w).toFixed(1) + '" y="0" width="' + w.toFixed(1) + '" height="' + H + '" stroke="#11110F" stroke-width="1"><title>' + lib + "</title></rect>"; k++; }
    else n += '<rect class="' + cl + ' noire" data-m="' + m + '" x="' + (k * w - w * 0.3).toFixed(1) + '" y="0" width="' + (w * 0.6).toFixed(1) + '" height="' + (H * 0.6).toFixed(1) + '"><title>' + lib + "</title></rect>";
  }
  return '<svg class="clavier" id="clavier" viewBox="0 0 ' + larg.toFixed(1) + " " + H + '" role="group" tabindex="0" aria-label="Clavier de ' + esc(inst.nom.toLowerCase()) + ", de " + nomNote(lo) + " à " + nomNote(hi) + " : flèches pour choisir une note, Entrée pour l'écouter\">" + b + n + "</svg>";
}
// Les rubriques d'une fiche : repère historique, accord, particularité, registres, modes de jeu, rôle dans Pierre et le loup.
function registresDe(inst) { const z = jouables(inst); if (!z) return null; const e = z[1] - z[0]; return [Math.round(z[0] + e * 0.12), Math.round((z[0] + z[1]) / 2), Math.round(z[1] - e * 0.12)]; }
function sectionsFiche(inst, z) {
  const d = FICHES[inst.id] || {}; let h = "";
  if (d.histoire || d.accord || d.plus) h += '<div class="savoir">' + (d.histoire ? "<p>" + esc(d.histoire) + "</p>" : "") + (d.accord ? '<p><span class="etq">Accord</span> ' + esc(d.accord) + "</p>" : "") + (d.plus ? '<p><span class="etq">À noter</span> ' + esc(d.plus) + "</p>" : "") + "</div>";
  if (z) { const r = registresDe(inst); h += '<div class="rubrique"><span class="etq">Les registres</span><div class="rangee"><button type="button" data-reg="0">Grave ' + nomNote(r[0]) + '</button><button type="button" data-reg="1">Médium ' + nomNote(r[1]) + '</button><button type="button" data-reg="2">Aigu ' + nomNote(r[2]) + '</button><button type="button" data-reg="3">Les trois</button></div></div>'; }
  if (d.jeux && d.jeux.length) h += '<div class="rubrique"><span class="etq">Les modes de jeu</span><div class="rangee">' + d.jeux.map((j, k) => '<button type="button" data-jeu="' + k + '">' + esc(j.nom) + "</button>").join("") + "</div></div>";
  if (d.pierre) h += '<p class="pierre"><span class="etq">Pierre et le loup</span> ' + esc(d.pierre.replace(/^Dans Pierre et le loup, /, "").replace(/^./, c => c.toUpperCase())) + "</p>";
  const i = INSTRUMENTS.indexOf(inst), av = INSTRUMENTS[(i + INSTRUMENTS.length - 1) % INSTRUMENTS.length], ap = INSTRUMENTS[(i + 1) % INSTRUMENTS.length];
  return h + '<div class="nav-instr"><button type="button" data-aller="' + av.id + '">&#8249; ' + esc(av.nom) + '</button><button type="button" data-aller="' + ap.id + '">' + esc(ap.nom) + " &#8250;</button></div>";
}
function brancherSections(inst, z) {
  const d = FICHES[inst.id] || {}, el = $("fiche");
  el.querySelectorAll("[data-aller]").forEach(b => { b.onclick = () => choisir(b.dataset.aller, false); });
  if (!z) return;
  el.querySelectorAll("[data-reg]").forEach(b => { b.onclick = () => { const r = registresDe(inst), k = +b.dataset.reg; if (k === 3) jouer(inst, r, 1.0); else jouer(inst, [r[k]]); }; });
  el.querySelectorAll("[data-jeu]").forEach(b => { b.onclick = () => { const j = d.jeux[+b.dataset.jeu], pseudo = { banque: j.b, tess: inst.tess, echant: j.z, nom: inst.nom + ", " + j.nom.toLowerCase() }; if (/stacc|piz/.test(j.b)) jouer(pseudo, gamme(pseudo), 0.35); else jouer(pseudo, [registresDe(inst)[1]]); }; });
}

function fiche() {
  const el = $("fiche"), inst = parId(etat.choix);
  if (!inst) {
    const rep = { cordes: "violons1", bois: "hautbois", cuivres: "trompettes", percussions: "timbales" };
    el.innerHTML = "<h3>Quel instrument ?</h3><p>Touche un instrument sur le plan, ou une barre dans les tessitures. Les quatre familles :</p>"
      + '<div class="cartes-familles">' + ORDRE_FAMILLES.map(f => '<button type="button" class="carte-fam" data-f="' + f + '" aria-pressed="' + (etat.famille === f) + '" style="--c:' + FAMILLES[f].couleur + ";--p:" + FAMILLES[f].pale + '"><span class="vignette">' + visuel(rep[f], 54, "") + "</span><span><span class=\"nf\">" + esc(FAMILLES[f].court) + "</span><span class=\"df\">" + esc(FAMILLES[f].son) + "</span><span class=\"cf\">" + INSTRUMENTS.filter(i => i.fam === f).length + " instruments</span></span></button>").join("") + "</div>";
    el.querySelectorAll(".carte-fam").forEach(b => { b.onclick = () => { etat.famille = etat.famille === b.dataset.f ? null : b.dataset.f; marquer(); fiche(); }; });
    return;
  }
  const f = FAMILLES[inst.fam], z = jouables(inst), effectif = inst.effectif + (/timbal/.test(inst.effectif) ? "" : inst.effectif === "1" ? " musicien" : " musiciens");
  let h = '<div class="fiche-tete" style="--c:' + f.couleur + ";--p:" + f.pale + '"><div class="grand-icone">' + visuel(inst.id, 148, inst.nom) + '</div><div><span class="fam" style="--c:' + f.couleur + '">' + esc(f.court.toUpperCase()) + "</span><h3>" + esc(inst.nom) + '</h3><p class="effectif">Dans un grand orchestre : ' + esc(effectif) + "</p></div></div><p>" + esc(inst.texte) + "</p><dl><dt>Le son naît par</dt><dd>" + esc(inst.mode) + "</dd><dt>Tessiture</dt><dd>" + (inst.tess ? nomNote(inst.tess[0]) + " à " + nomNote(inst.tess[1]) : "sans hauteur précise") + "</dd><dt>Sur le plan</dt><dd>" + ["au premier rang, devant le chef", "au deuxième rang", "au troisième rang", "tout au fond", "sur le bord extérieur, avec les petites percussions"][inst.rang] + "</dd></dl>";
  h += sectionsFiche(inst, z);
  if (inst.tess) h += '<div style="--c:' + f.couleur + '">' + clavier(inst) + '</div><p class="legende">' + (z ? "Les touches actives font entendre l'instrument ; les touches grisées sont dans sa tessiture, mais hors de la zone enregistrée." : "") + "</p>";
  const coup = inst.coup;   // une percussion sans hauteur, enregistrée : un coup, ou la suite des blocs
  h += '<div class="actions-fiche">' + (z ? '<button type="button" class="principal" id="gamme">Écouter une gamme</button><button type="button" id="stop">Arrêter</button>' : coup ? '<button type="button" class="principal" id="coup">Écouter un coup</button>' + (coup.notes ? '<button type="button" id="coups">Écouter les quatre blocs</button>' : "") + '<button type="button" id="stop">Arrêter</button>' : "") + "</div>";
  if (!z && !coup) h += '<p class="sans-son" style="--c:' + f.couleur + '">Pas d\'enregistrement de cet instrument dans la banque du site : on ne le fait pas entendre ici plutôt que d\'imiter son timbre.</p>';
  el.innerHTML = h; brancherSections(inst, z);
  if (coup) { const pseudo = { banque: coup.banque, nom: inst.nom, duree: coup.duree }; $("coup").onclick = () => jouer(pseudo, [60]); $("stop").onclick = () => { arreter(); message("prêt"); };
    if (coup.notes) $("coups").onclick = () => jouer(pseudo, coup.notes, 0.3); return; }
  if (!z) return;
  $("gamme").onclick = () => jouer(inst, gamme(inst), 0.5); $("stop").onclick = () => { arreter(); message("prêt"); };
  const cl = $("clavier"); etat.note = gamme(inst)[0];
  const surligner = () => { cl.querySelectorAll(".touche").forEach(t => { t.removeAttribute("stroke-dasharray"); if (t.classList.contains("noire")) t.removeAttribute("stroke"); else t.setAttribute("stroke-width", "1"); }); const t = cl.querySelector('[data-m="' + etat.note + '"]'); if (t) { t.setAttribute("stroke", "#D6FF00"); t.setAttribute("stroke-width", "4"); t.setAttribute("stroke-dasharray", "none"); t.parentNode.appendChild(t); } };
  surligner();
  cl.addEventListener("click", e => { const t = e.target.closest(".touche"); if (!t || t.classList.contains("dehors")) return; etat.note = +t.dataset.m; surligner(); jouer(inst, [etat.note]); });
  cl.addEventListener("keydown", e => {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (d) { e.preventDefault(); etat.note = Math.max(z[0], Math.min(z[1], etat.note + d)); surligner(); message(nomNote(etat.note)); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); jouer(inst, [etat.note]); }
  });
}

// ---------------------------------------------------------------- sélection, familles, vues
function marquer() {
  document.querySelectorAll(".sect, .tess-ligne, .carte-g").forEach(g => { g.setAttribute("aria-pressed", String(g.classList.contains("sect") ? etat.melange.indexOf(g.dataset.id) >= 0 : g.dataset.id === etat.choix)); g.classList.toggle("attenue", !!etat.famille && g.dataset.fam !== etat.famille); });
  document.querySelectorAll("#familles button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.f === etat.famille)));
}
function choisir(id, focus) {
  etat.choix = id; marquer(); fiche(); arreter();
  try { history.replaceState(null, "", id ? "#" + id : location.pathname + location.search); } catch (e) {}
  if (focus && window.matchMedia("(max-width: 900px)").matches) $("fiche").scrollIntoView({ block: "nearest" });
}
function vue(v) {
  etat.vue = v; $("melange").hidden = v !== "plan"; $("plan").hidden = v !== "plan"; $("galerie").hidden = v !== "gal"; $("tessitures").hidden = v !== "tess";
  $("v-plan").setAttribute("aria-pressed", String(v === "plan")); $("v-gal").setAttribute("aria-pressed", String(v === "gal")); $("v-tess").setAttribute("aria-pressed", String(v === "tess"));
}
const ESPACES = [["01", "Explorer l'orchestre", "explorer", "violons1", "Le plan, les quatre familles, 29 instruments, leurs tessitures."], ["02", "Écouter Britten", "britten", "tamTam", "Un guide d'écoute : le thème, treize variations, la fugue. Sans enregistrement : l'œuvre est protégée."], ["03", "Reconnaître les timbres", "timbres", "hautbois", "Comparer deux timbres, puis tester ses oreilles à l'aveugle."], ["04", "Comprendre les variations", "variations", "harpe", "Transformer un thème de huit façons et l'écouter avec d'autres instruments."], ["05", "Construire une fugue", "fugue", "violoncelles", "Dessiner un sujet, faire entrer les voix, écouter la superposition."]];
let timbresPret = false, fuguePret = false, brittenPret = false, variationsPret = false;
function espace(nom, clic) {
  if (nom === "timbres" && !timbresPret) { timbresPret = true; monterTimbres(visuel); }
  if (nom === "fugue" && !fuguePret) { fuguePret = true; monterFugue(); }
  if (nom === "britten" && !brittenPret) { brittenPret = true; monterBritten(visuel); }
  if (nom === "variations") { if (!variationsPret) variationsPret = true; monterVariations(); }
  arreter(); for (const s of ["explorer", "timbres", "fugue", "britten", "variations"]) $(s).hidden = nom !== s;
  document.querySelectorAll("#parcours li[data-e]").forEach(li => { const sur = li.dataset.e === nom; li.classList.toggle("actif", sur); const b = li.querySelector("button"); if (sur) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current"); });
  const e5 = ESPACES.find(x => x[2] === nom), d = $("parcours-desc"); if (d && e5) d.textContent = e5[0] + " " + e5[1] + " : " + e5[4];
  const actif = document.querySelector("#parcours li.actif"); if (actif && actif.scrollIntoView) { try { actif.scrollIntoView({ inline: "center", block: "nearest" }); } catch (x) {} }
  if (clic && window.matchMedia("(max-width: 700px)").matches) { const s = $(nom); if (s && s.scrollIntoView) s.scrollIntoView({ block: "start" }); window.scrollBy(0, -80); }
  try { if (nom !== "explorer") history.replaceState(null, "", "#" + nom); else if (["#timbres", "#fugue", "#britten", "#variations"].indexOf(location.hash) >= 0) history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
}
function parcours() {
  const corps = e => '<span class="pico" aria-hidden="true">' + visuel(e[3], 44, "") + '</span><span class="ptxt"><span class="num">' + e[0] + '</span><span class="pnom">' + esc(e[1]) + '</span><span class="pdesc">' + esc(e[4]) + "</span>";
  $("parcours").innerHTML = ESPACES.map(e => e[2] ? '<li data-e="' + e[2] + '"><button type="button">' + corps(e) + "</span></button></li>" : '<li class="bientot">' + corps(e) + '<small>à venir</small></span></li>').join("");
  $("parcours").addEventListener("click", e => { const li = e.target.closest("li[data-e]"); if (li) espace(li.dataset.e, true); });
}
function demarrer() {
  parcours(); dessinerPlan(); dessinerGalerie(); dessinerTessitures();
  $("familles").innerHTML = ORDRE_FAMILLES.map(f => '<button type="button" data-f="' + f + '" aria-pressed="false" style="--c:' + FAMILLES[f].couleur + '">' + esc(FAMILLES[f].court) + "</button>").join("");
  $("familles").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; etat.famille = etat.famille === b.dataset.f ? null : b.dataset.f; marquer(); });
  $("explorer").addEventListener("click", e => { const g = e.target.closest(".sect, .tess-ligne, .carte-g"); if (!g) return; if (g.classList.contains("sect")) { const k = etat.melange.indexOf(g.dataset.id); if (k >= 0) etat.melange.splice(k, 1); else etat.melange.push(g.dataset.id); majMelange(); } choisir(g.dataset.id, false); });
  $("explorer").addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && e.target.matches && e.target.matches(".sect, .tess-ligne")) { e.preventDefault(); e.target.dispatchEvent(new MouseEvent("click", { bubbles: true })); } });
  brancherMelange(); majMelange();
  $("v-plan").onclick = () => vue("plan"); $("v-gal").onclick = () => vue("gal"); $("v-tess").onclick = () => vue("tess");
  const id = decodeURIComponent((location.hash || "").slice(1)); choisir(parId(id) ? id : null, false); espace(["timbres", "fugue", "britten", "variations"].indexOf(id) >= 0 ? id : "explorer");
  window.addEventListener("hashchange", () => { const h = decodeURIComponent((location.hash || "").slice(1)); if (h === "") espace("explorer"); else if (["timbres", "fugue", "britten", "variations"].indexOf(h) >= 0) espace(h); else if (parId(h)) { espace("explorer"); if (h !== etat.choix) choisir(h, false); } });
  document.addEventListener("click", e => { const a = e.target.closest("[data-voir]"); if (a) { e.preventDefault(); espace("explorer"); choisir(a.dataset.voir, true); } });
  window.ORCHESTRE_PRET = true;
}
demarrer();
