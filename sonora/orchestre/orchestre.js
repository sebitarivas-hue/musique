// SONORA Orchestre, espace 01 : explorer l'orchestre. Le plan des musiciens (SVG), les tessitures comparées, une fiche par instrument avec un clavier limité à sa tessiture et sa gamme jouée par la banque d'échantillons du site.
// Les sons sont des enregistrements (voir ../harmonie/echantillons.js) : un instrument sans enregistrement le dit au lieu de faire un faux son.
import { FAMILLES, ORDRE_FAMILLES, INSTRUMENTS, parId, nomNote, noire, jouables, gamme, secteur, centre, ANNEAUX } from "./donnees.js?v=4898d7d9e1";
import { mixer, preparer } from "../harmonie/echantillons.js?v=4898d7d9e1";

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const ABR = { piccolo: "Picc.", corAnglais: "C. angl.", clarinetteBasse: "Cl. basse", caisseClaire: "Caisse cl.", grosseCaisse: "Gr. caisse", tamTam: "Tam-tam", cloches: "Cloches" };
const etat = { choix: null, famille: null, vue: "plan", note: null };
let ctx = null, source = null;

function message(t) { const e = $("etat"); if (e) e.textContent = t; }
function contexte() { if (!ctx) { const AC = window.AudioContext || window.webkitAudioContext; ctx = new AC(); } if (ctx.state === "suspended") ctx.resume(); return ctx; }
function arreter() { if (source) { try { source.stop(); } catch (e) {} source = null; } }

// Joue des notes (numéros MIDI) avec l'instrument de la banque : une note tenue ou une gamme.
async function jouer(inst, notes, pas) {
  if (!inst.banque || !notes.length) return;
  const c = contexte(); arreter(); message("chargement de " + inst.nom.toLowerCase() + "…");
  const tampons = await preparer(inst.banque, c);
  if (!tampons) { message("les sons ne sont pas disponibles ici"); return; }
  const ev = notes.map((m, i) => ({ t: i * (pas || 0), duree: pas ? pas * 0.9 : 1.8, notes: [m], vitesse: 0.8 }));
  const [L, R] = mixer(ev, tampons, { sr: c.sampleRate, instrument: inst.banque, duree: ev[ev.length - 1].t + (pas ? 0.8 : 2.4) });
  const buf = c.createBuffer(2, L.length, c.sampleRate); buf.copyToChannel(L, 0); buf.copyToChannel(R, 1);
  const g = c.createGain(); g.gain.value = 0.8; g.connect(c.destination);
  const s = c.createBufferSource(); s.buffer = buf; s.connect(g); s.start(); source = s; s.onended = () => { if (source === s) { source = null; message("prêt"); } };
  message(pas ? "gamme : " + nomNote(notes[0]) + " à " + nomNote(notes[notes.length - 1]) : nomNote(notes[0]));
}

// ---------------------------------------------------------------- le plan
function dessinerPlan() {
  let s = '<svg viewBox="0 0 1000 560" role="group" aria-label="Plan de l\'orchestre vu de dessus, le chef en bas">';
  s += '<text class="public" x="500" y="552">public</text>';
  for (const i of INSTRUMENTS) {
    const f = FAMILLES[i.fam], c = centre(i), cx = c[0], cy = c[1], a = ANNEAUX[i.rang], larg = (a[0] + a[1]) / 2 * (i.g1 - i.g0) * Math.PI / 180, long = i.nom.length * 8.2;
    const mots = larg >= long ? [i.nom] : (ABR[i.id] ? [ABR[i.id]] : i.nom.split(" "));
    const texte = mots.map((m, k) => '<tspan x="' + cx.toFixed(1) + '" dy="' + (k ? 15 : (-(mots.length - 1) * 7 + 4)) + '">' + esc(m) + "</tspan>").join("");
    s += '<g class="sect" data-id="' + i.id + '" data-fam="' + i.fam + '" role="button" tabindex="0" aria-pressed="false" aria-label="' + esc(i.nom + ", " + f.court.toLowerCase()) + '" style="--c:' + f.couleur + '"><path d="' + secteur(i) + '"><title>' + esc(i.nom) + '</title></path><text x="' + cx.toFixed(1) + '" y="' + cy.toFixed(1) + '">' + texte + "</text></g>";
  }
  s += '<g class="chef"><circle cx="500" cy="528" r="11"/><text x="500" y="505">chef</text></g></svg>';
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
    el.innerHTML = "<h3>Quel instrument ?</h3><p>Touche un instrument sur le plan, ou une barre dans les tessitures. Les quatre familles :</p><dl>" + ORDRE_FAMILLES.map(f => '<dt style="border-left:10px solid ' + FAMILLES[f].couleur + ';padding-left:6px">' + esc(FAMILLES[f].court) + "</dt><dd>" + esc(FAMILLES[f].son) + "</dd>").join("") + "</dl>";
    return;
  }
  const f = FAMILLES[inst.fam], z = jouables(inst);
  let h = '<span class="fam" style="--c:' + f.couleur + '">' + esc(f.court.toUpperCase()) + "</span><h3>" + esc(inst.nom) + "</h3><p>" + esc(inst.texte) + "</p><dl><dt>Le son naît par</dt><dd>" + esc(inst.mode) + "</dd><dt>Tessiture</dt><dd>" + (inst.tess ? nomNote(inst.tess[0]) + " à " + nomNote(inst.tess[1]) : "sans hauteur précise") + "</dd></dl>";
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
function parcours() {
  const etapes = [["01", "Explorer l'orchestre", true], ["02", "Écouter Britten", false], ["03", "Reconnaître les timbres", false], ["04", "Comprendre les variations", false], ["05", "Construire une fugue", false]];
  $("parcours").innerHTML = etapes.map(e => '<li class="' + (e[2] ? "actif" : "bientot") + '"' + (e[2] ? ' aria-current="step"' : "") + "><b>" + e[0] + "</b><span>" + esc(e[1]) + "</span>" + (e[2] ? "" : "<small>à venir</small>") + "</li>").join("");
}
function demarrer() {
  parcours(); dessinerPlan(); dessinerTessitures();
  $("familles").innerHTML = ORDRE_FAMILLES.map(f => '<button type="button" data-f="' + f + '" aria-pressed="false" style="--c:' + FAMILLES[f].couleur + '">' + esc(FAMILLES[f].court) + "</button>").join("");
  $("familles").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; etat.famille = etat.famille === b.dataset.f ? null : b.dataset.f; marquer(); });
  $("explorer").addEventListener("click", e => { const g = e.target.closest(".sect, .tess-ligne"); if (g) choisir(g.dataset.id, true); });
  $("explorer").addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && e.target.matches && e.target.matches(".sect, .tess-ligne")) { e.preventDefault(); choisir(e.target.dataset.id, true); } });
  $("v-plan").onclick = () => vue("plan"); $("v-tess").onclick = () => vue("tess");
  const id = decodeURIComponent((location.hash || "").slice(1)); choisir(parId(id) ? id : null, false);
  window.addEventListener("hashchange", () => { const h = decodeURIComponent((location.hash || "").slice(1)); if (parId(h) && h !== etat.choix) choisir(h, false); });
  window.ORCHESTRE_PRET = true;
}
demarrer();
