// SONORA Orchestre, espace 01 : explorer l'orchestre. Le plan des musiciens (SVG), les tessitures comparées, une fiche par instrument avec un clavier limité à sa tessiture et sa gamme jouée par la banque d'échantillons du site.
// Les sons sont des enregistrements (voir ../harmonie/echantillons.js) : un instrument sans enregistrement le dit au lieu de faire un faux son.
import { FAMILLES, ORDRE_FAMILLES, INSTRUMENTS, parId, nomNote, noire, jouables, gamme, secteur, centre, ANNEAUX } from "./donnees.js?v=49855e5e9a";
import { message, arreter, jouer } from "./audio.js?v=49855e5e9a";
import { monterTimbres } from "./timbres.js?v=49855e5e9a";
import { monterFugue } from "./fugue.js?v=49855e5e9a";
import { svgIcone, dessin } from "./icones.js?v=49855e5e9a";
import { PHOTOS } from "./photos.js?v=49855e5e9a";

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const ABR = { piccolo: "Picc.", corAnglais: "C. angl.", clarinetteBasse: "Cl. basse", caisseClaire: "Caisse cl.", grosseCaisse: "Gr. caisse", tamTam: "Tam-tam", cloches: "Cloches" };
// Une photo d'instrument (Wikimedia Commons, voir la page de crédits) quand il y en a une, sinon le dessin tracé pour ce cours.
function visuel(id, t, titre) {
  const p = PHOTOS[id]; if (!p) return svgIcone(id, t, titre || "");
  const k = t / Math.max(p.w, p.h);
  return '<img class="photo" src="photos/' + p.f + '" width="' + Math.round(p.w * k) + '" height="' + Math.round(p.h * k) + '" alt="' + esc(titre || "") + '">';
}
function imageSvg(id) { const p = PHOTOS[id], k = 100 / Math.max(p.w, p.h), w = p.w * k, h = p.h * k; return '<image class="photo-svg" href="photos/' + p.f + '" x="' + (50 - w / 2).toFixed(1) + '" y="' + (50 - h / 2).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '"/>'; }
const etat = { choix: null, famille: null, vue: "plan", note: null };
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
  let s = '<svg viewBox="60 96 880 464" role="group" aria-label="Plan de l\'orchestre vu de dessus, le chef en bas">';
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
  let h = '<div class="fiche-tete" style="--c:' + f.couleur + ";--p:" + f.pale + '"><div class="grand-icone">' + visuel(inst.id, 148, inst.nom) + '</div><div><span class="fam" style="--c:' + f.couleur + '">' + esc(f.court.toUpperCase()) + "</span><h3>" + esc(inst.nom) + '</h3><p class="effectif">Dans un grand orchestre : ' + esc(effectif) + "</p></div></div><p>" + esc(inst.texte) + "</p><dl><dt>Le son naît par</dt><dd>" + esc(inst.mode) + "</dd><dt>Tessiture</dt><dd>" + (inst.tess ? nomNote(inst.tess[0]) + " à " + nomNote(inst.tess[1]) : "sans hauteur précise") + "</dd><dt>Sur le plan</dt><dd>" + ["au premier rang, devant le chef", "au deuxième rang", "au troisième rang", "tout au fond"][inst.rang] + "</dd></dl>";
  if (inst.tess) h += '<div style="--c:' + f.couleur + '">' + clavier(inst) + '</div><p class="legende">' + (z ? "Les touches actives font entendre l'instrument ; les touches grisées sont dans sa tessiture, mais hors de la zone enregistrée." : "") + "</p>";
  h += '<div class="actions-fiche">' + (z ? '<button type="button" class="principal" id="gamme">Écouter une gamme</button><button type="button" id="stop">Arrêter</button>' : "") + "</div>";
  if (!z) h += '<p class="sans-son" style="--c:' + f.couleur + '">Pas d\'enregistrement de cet instrument dans la banque du site : on ne le fait pas entendre ici plutôt que d\'imiter son timbre.</p>';
  el.innerHTML = h;
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
  document.querySelectorAll(".sect, .tess-ligne").forEach(g => { g.setAttribute("aria-pressed", String(g.dataset.id === etat.choix)); g.classList.toggle("attenue", !!etat.famille && g.dataset.fam !== etat.famille); });
  document.querySelectorAll("#familles button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.f === etat.famille)));
}
function choisir(id, focus) {
  etat.choix = id; marquer(); fiche(); arreter();
  try { history.replaceState(null, "", id ? "#" + id : location.pathname + location.search); } catch (e) {}
  if (focus && window.matchMedia("(max-width: 900px)").matches) $("fiche").scrollIntoView({ block: "nearest" });
}
function vue(v) {
  etat.vue = v; $("plan").hidden = v !== "plan"; $("tessitures").hidden = v !== "tess";
  $("v-plan").setAttribute("aria-pressed", String(v === "plan")); $("v-tess").setAttribute("aria-pressed", String(v === "tess"));
}
const ESPACES = [["01", "Explorer l'orchestre", "explorer", "violons1", "Le plan, les quatre familles, 24 instruments dessinés, leurs tessitures."], ["02", "Écouter Britten", null, "tamTam", "L'écoute guidée de l'œuvre : en attente d'une écoute autorisée."], ["03", "Reconnaître les timbres", "timbres", "hautbois", "Comparer deux timbres, puis tester ses oreilles à l'aveugle."], ["04", "Comprendre les variations", null, "harpe", "Le thème de Purcell et ses transformations : en attente de la partition."], ["05", "Construire une fugue", "fugue", "violoncelles", "Dessiner un sujet, faire entrer les voix, écouter la superposition."]];
let timbresPret = false, fuguePret = false;
function espace(nom) {
  if (nom === "timbres" && !timbresPret) { timbresPret = true; monterTimbres(); }
  if (nom === "fugue" && !fuguePret) { fuguePret = true; monterFugue(); }
  arreter(); for (const s of ["explorer", "timbres", "fugue"]) $(s).hidden = nom !== s;
  document.querySelectorAll("#parcours li[data-e]").forEach(li => { const sur = li.dataset.e === nom; li.classList.toggle("actif", sur); const b = li.querySelector("button"); if (sur) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current"); });
  try { if (nom !== "explorer") history.replaceState(null, "", "#" + nom); else if (location.hash === "#timbres" || location.hash === "#fugue") history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
}
function parcours() {
  const corps = e => '<span class="pico" aria-hidden="true">' + visuel(e[3], 44, "") + '</span><span class="ptxt"><span class="num">' + e[0] + '</span><span class="pnom">' + esc(e[1]) + '</span><span class="pdesc">' + esc(e[4]) + "</span>";
  $("parcours").innerHTML = ESPACES.map(e => e[2] ? '<li data-e="' + e[2] + '"><button type="button">' + corps(e) + "</span></button></li>" : '<li class="bientot">' + corps(e) + '<small>à venir</small></span></li>').join("");
  $("parcours").addEventListener("click", e => { const li = e.target.closest("li[data-e]"); if (li) espace(li.dataset.e); });
}
// La page de crédits : chaque photo avec son auteur et sa licence, et le lien vers sa page sur Commons.
function credits() {
  const vus = {}, liste = []; for (const k of Object.keys(PHOTOS)) { const p = PHOTOS[k]; if (!vus[p.titre]) { vus[p.titre] = 1; liste.push(p); } }
  const el = $("credits-liste"); if (!el) return;
  el.innerHTML = liste.map(p => "<li>" + esc(p.titre.replace(/\.[A-Za-z]+$/, "")) + ", " + esc(p.auteur) + ", " + esc(p.licence) + ' (<a href="https://commons.wikimedia.org/wiki/File:' + encodeURIComponent(p.titre.replace(/ /g, "_")) + '">Wikimedia Commons</a>)</li>').join("");
  const t = $("credits"); if (t) t.hidden = !liste.length;
}
function demarrer() {
  parcours(); dessinerPlan(); dessinerTessitures(); credits();
  $("familles").innerHTML = ORDRE_FAMILLES.map(f => '<button type="button" data-f="' + f + '" aria-pressed="false" style="--c:' + FAMILLES[f].couleur + '">' + esc(FAMILLES[f].court) + "</button>").join("");
  $("familles").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; etat.famille = etat.famille === b.dataset.f ? null : b.dataset.f; marquer(); });
  $("explorer").addEventListener("click", e => { const g = e.target.closest(".sect, .tess-ligne"); if (g) choisir(g.dataset.id, true); });
  $("explorer").addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && e.target.matches && e.target.matches(".sect, .tess-ligne")) { e.preventDefault(); choisir(e.target.dataset.id, true); } });
  $("v-plan").onclick = () => vue("plan"); $("v-tess").onclick = () => vue("tess");
  const id = decodeURIComponent((location.hash || "").slice(1)); choisir(parId(id) ? id : null, false); espace(id === "timbres" || id === "fugue" ? id : "explorer");
  window.addEventListener("hashchange", () => { const h = decodeURIComponent((location.hash || "").slice(1)); if (h === "timbres" || h === "fugue") espace(h); else if (parId(h)) { espace("explorer"); if (h !== etat.choix) choisir(h, false); } });
  document.addEventListener("click", e => { const a = e.target.closest("[data-voir]"); if (a) { e.preventDefault(); espace("explorer"); choisir(a.dataset.voir, true); } });
  window.ORCHESTRE_PRET = true;
}
demarrer();
