// L'écran du mode blocs de SONORA Pistes (le modèle est dans blocs.js, sans DOM et testé dans Node).
// Une grille : une ligne par instrument (une pastille de couleur que l'on touche pour changer d'instrument), une colonne par mesure, quatre mesures à la fois.
// Toucher une case vide pose un bloc et ouvre ses notes ; toucher un bloc l'ouvre. Le piano roll et la partition existants servent d'éditeur : rien n'est doublé.
import * as B from "./blocs.js?v=5a761f0ed5";
import * as M from "./motifs.js?v=5a761f0ed5";
import { PICTOS } from "./pictos.js?v=5a761f0ed5";

// Les instruments qu'on propose en gros boutons quand on touche une pastille : les plus connus d'abord, les autres dans la liste.
const PRINCIPAUX = [["ech:clavier", "Piano"], ["ech:guitare", "Guitare"], ["ech:basse", "Basse"], ["ech:violon", "Violon"], ["ech:souffle", "Flûte"], ["ech:trompette", "Trompette"], ["batt:reel", "Batterie"], ["ech:voix", "Voix"]];

// Les petits dessins de l'interface (haut-parleur, lecture, plus) ; les silhouettes d'instruments sont dans pictos.js.
const SVG = d => `<svg viewBox="0 0 32 32" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${d}</svg>`;
const HP_ON = SVG('<path d="M4 12h5l7-6v20l-7-6H4z"/><path d="M21 11c2.500 3 2.500 7 0 10M25 7.500c4.500 5 4.500 12 0 17"/>');
const HP_OFF = SVG('<path d="M4 12h5l7-6v20l-7-6H4z"/><path d="M21 12l7 8M28 12l-7 8"/>');
const PLAY = SVG('<path d="M9 5l17 11L9 27z" fill="currentColor"/>');
const PLUS = SVG('<path d="M16 6v20M6 16h20"/>');
// La sorte d'un instrument d'après son identifiant : elle donne le pictogramme et la couleur de sa ligne (une couleur par sorte, pour qu'on distingue les lignes d'un coup d'œil).
export function sorteDe(id) {
  const i = String(id || "");
  if (i.startsWith("batt:")) return "batterie";
  if (/^ech:(contrebasse|basse)|^syn:basse|^lib:basse|^ech:basses/.test(i)) return "basse";
  if (/^ech:guitare|^ech:harpe/.test(i)) return "guitare";
  if (/^ech:(violon|cordes|violons|altos|violoncelle|violoncelles)/.test(i)) return "violon";
  if (/^ech:(souffle|hautbois|anche|basson)|^lib:flute/.test(i)) return "flute";
  if (/^ech:(trompette|trombone|cor|tuba|trompettes)/.test(i)) return "trompette";
  if (/^ech:(voix)|^lib:(voyelles|diphonique)/.test(i)) return "voix";
  if (/^ech:(clavier|orgue|clavecin)|^syn:pianoElec|^syn:orgue/.test(i)) return "piano";
  if (/^syn:|^lib:/.test(i)) return "onde";
  return "note";
}
export const pictoDe = id => PICTOS[sorteDe(id)];
const COULEUR_SORTE = { piano: "#4C9BF5", guitare: "#FFC53D", basse: "#A86CF0", violon: "#FF6B57", flute: "#3FC79A", trompette: "#F26BA3", batterie: "#FF8A3D", voix: "#4FC3E0", onde: "#8E9BFF", note: "#B7B6AC" };
const FAM_COULEUR = { rythme: "#FF8A3D", basse: "#A86CF0", accords: "#4C9BF5", melodie: "#3FC79A" };

export function creerVueBlocs(d) {
  const { $, P, INS, etat, esc, message, changer, afficherPistes, ouvrirRouleau, fermerRouleau, remettreAJourMidi, rouleauOuvert, ecouterMotif, arreterMotif } = d;
  const v = { actif: false, groupe: 0, choix: null, presse: null, palette: null, motifs: false, modeles: false, onglet: null, tonique: 0 };
  try { const t = +localStorage.getItem("sonora:pistes:tonique"); if (M.TONALITES.some(x => x[1] === t)) v.tonique = t; } catch (_) { /* la tonalité n'est pas gardée : do */ }
  const racine = $("blocs");
  const catalogue = () => INS.catalogue(), nomInstrument = id => (catalogue().find(x => x.id === id) || { nom: id }).nom;
  const couleur = id => COULEUR_SORTE[sorteDe(id)];

  function apercuHtml(notes, temps) { return B.apercu(notes, temps).map(n => `<i style="left:${(n.x * 100).toFixed(1)}%;width:${(n.w * 100).toFixed(1)}%;top:${(n.y * 80 + 6).toFixed(1)}%"></i>`).join(""); }

  function dessiner() {
    if (!v.actif || !etat.projet) return;
    const p = etat.projet, ng = B.nombreDeGroupes(p); v.groupe = Math.max(0, Math.min(v.groupe, ng - 1));
    // la barre du haut : les groupes de quatre mesures, puis les réglages
    $("bl-groupes").innerHTML = Array.from({ length: ng }, (_, g) => `<button type="button" data-g="${g}" aria-pressed="${g === v.groupe}" aria-label="Mesures ${B.etiquetteGroupe(g)}">${B.etiquetteGroupe(g).replace(" à ", "&ndash;")}</button>`).join("");
    $("bl-regles").innerHTML = `<span class="bl-chip" title="Nombre de temps par mesure">${p.temps} temps</span>
      <button type="button" class="bl-chip" id="bl-tempo" title="Changer le tempo">${p.tempo} par minute</button>
      <label class="bl-chip bl-tonalite" title="La tonalité des motifs prêts : les accords et les mélodies sont transposés"><span>Tonalité</span><select id="bl-tonalite" aria-label="Tonalité des motifs prêts">${M.TONALITES.map(([nom, t]) => `<option value="${t}"${t === v.tonique ? " selected" : ""}>${esc(nom)}</option>`).join("")}</select></label>
      <button type="button" class="bl-chip bl-chip-fort" id="bl-modeles" aria-expanded="${v.modeles}" title="Poser quatre mesures sur plusieurs lignes d'un coup">Morceau tout prêt</button>`;
    // la grille : les numéros de mesure, puis une ligne par instrument
    const g0 = v.groupe * B.MESURES_PAR_GROUPE;
    let html = `<div class="bl-ligne bl-nums" aria-hidden="true"><span></span>${[0, 1, 2, 3].map(k => `<span class="bl-num">${g0 + k + 1}</span>`).join("")}</div>`;
    for (const pi of p.pistes) {
      const inst = B.instrumentDePiste(p, pi), col = couleur(inst);
      html += `<div class="bl-ligne" data-piste="${pi.id}" role="row">
        <div class="bl-pastille-cadre${pi.muet ? " bl-coupee" : ""}" style="--col:${col}">
          <button type="button" class="bl-pastille" data-piste="${pi.id}" aria-label="Instrument de ${esc(pi.nom)} : ${esc(nomInstrument(inst))}. Changer." aria-expanded="${v.palette === pi.id}"><span class="bl-ico">${pictoDe(inst)}</span><b>${esc(nomInstrument(inst))}</b><small>${esc(pi.nom)}</small></button>
          <button type="button" class="bl-muet" data-muet="${pi.id}" aria-pressed="${pi.muet}" aria-label="Muet : ${esc(pi.nom)}" title="${pi.muet ? "Remettre le son de cette ligne" : "Couper le son de cette ligne"}"><span class="bl-ico-s">${pi.muet ? HP_OFF : HP_ON}</span></button>
        </div>`;
      for (let k = 0; k < B.MESURES_PAR_GROUPE; k++) {
        const m = g0 + k, c = B.caseDe(p, pi, m), sel = v.choix && v.choix.piste === pi.id && v.choix.mesure === m;
        const classe = `bl-case bl-${c.type}${sel ? " bl-choisie" : ""}${pi.muet ? " bl-coupee" : ""}`, texte = B.dire(p, pi, m);
        let dedans = "";
        if (c.type === "bloc") dedans = `<span class="bl-apercu" aria-hidden="true">${apercuHtml(c.son.midi.notes, c.son.midi.temps)}</span>`;
        else if (c.type === "long") dedans = `<span class="bl-long" aria-hidden="true">${c.audio ? "son" : "clip"}</span>`;
        else dedans = `<span class="bl-plus" aria-hidden="true">${PLUS}</span>`;
        html += `<button type="button" role="gridcell" class="${classe}" data-piste="${pi.id}" data-mesure="${m}" style="--col:${col}" aria-label="${esc(texte)}" aria-pressed="${sel ? "true" : "false"}">${dedans}</button>`;
      }
      html += `</div>`;
    }
    $("bl-grille").innerHTML = html;
    // le choix de l'instrument d'une ligne : de grosses tuiles
    const pal = $("bl-palette");
    if (v.palette && p.pistes.some(x => x.id === v.palette)) {
      const cur = B.instrumentDePiste(p, v.palette);
      pal.hidden = false;
      pal.innerHTML = `<div class="bl-panneau-haut"><p class="bl-q">Quel instrument pour « ${esc(P.trouverPiste(p, v.palette).nom)} » ?</p><button type="button" id="bl-fermer-palette" class="bl-fermer" aria-label="Fermer le choix d'instrument">Fermer</button></div>
        <div class="bl-inst">${PRINCIPAUX.map(([id, nom]) => `<button type="button" data-inst="${id}" aria-pressed="${id === cur}" style="--col:${couleur(id)}"><span class="bl-ico-g">${pictoDe(id)}</span><b>${esc(nom)}</b></button>`).join("")}</div>
        <label class="bl-tous"><span>Tous les instruments</span><select id="bl-tous" aria-label="Tous les instruments">${INS.GROUPES.map(gr => `<optgroup label="${esc(gr)}">${catalogue().filter(x => x.groupe === gr).map(x => `<option value="${esc(x.id)}"${x.id === cur ? " selected" : ""}>${esc(x.nom)}</option>`).join("")}</optgroup>`).join("")}</select></label>`;
    } else { pal.hidden = true; pal.innerHTML = ""; }
    dessinerMotifs();
    dessinerActions();
  }

  // Les motifs prêts pour la case choisie, et les morceaux de départ : des cartes avec une bande de couleur, un bouton rond pour écouter, un bouton pour poser.
  function carte(m, nom, aide, couleurBande, boutons) {
    return `<div class="bl-motif" style="--fam:${couleurBande}"><div class="bl-motif-t"><b>${esc(nom)}</b><small>${esc(aide)}</small></div><div class="bl-motif-b">${boutons}</div></div>`;
  }
  function dessinerMotifs() {
    const z = $("bl-motifs"), p = etat.projet, c = v.choix, pi = c && P.trouverPiste(p, c.piste);
    if (v.modeles) {
      z.hidden = false;
      const dispo = M.MODELES.filter(m => m.temps === p.temps);
      z.innerHTML = `<div class="bl-panneau-haut"><p class="bl-q">Un morceau tout prêt sur les mesures ${B.etiquetteGroupe(v.groupe)}</p><button type="button" id="bl-ferme-motifs" class="bl-fermer">Fermer</button></div>`
        + (dispo.length ? `<div class="bl-liste">${dispo.map(m => carte(m, m.nom, m.aide, "#F26BA3", `<button type="button" data-modele="${m.id}" class="bl-poser">${PLUS}<span>Poser</span></button>`)).join("")}</div>` : `<p class="bl-aide">Les morceaux tout prêts existent à quatre temps par mesure. Ce projet est à ${p.temps} temps.</p>`);
      return;
    }
    if (!v.motifs || !pi) { z.hidden = true; z.innerHTML = ""; return; }
    const inst = B.instrumentDePiste(p, pi), onglets = M.ongletsPour(inst); if (!onglets.includes(v.onglet)) v.onglet = onglets.includes(M.genreDe(inst)) ? M.genreDe(inst) : onglets[0];
    const liste = M.motifsPour(v.onglet, p.temps);
    z.hidden = false;
    z.innerHTML = `<div class="bl-panneau-haut"><p class="bl-q">Un motif pour « ${esc(pi.nom)} », mesure ${c.mesure + 1}</p><button type="button" id="bl-ferme-motifs" class="bl-fermer">Fermer</button></div>
      <div class="bl-onglets" role="tablist" aria-label="Sortes de motifs">${M.FAMILLES.filter(([f]) => onglets.includes(f)).map(([f, nom]) => `<button type="button" role="tab" data-onglet="${f}" aria-selected="${f === v.onglet}">${esc(nom)}</button>`).join("")}</div>
      ${liste.length ? `<div class="bl-liste">${liste.map(m => { const nom = M.nomDuMotif(m, v.tonique); return carte(m, nom, m.aide, FAM_COULEUR[m.famille], `<button type="button" class="bl-ecouter" data-ecouter="${m.id}" aria-label="Écouter : ${esc(nom)}" title="Écouter">${PLAY}</button><button type="button" class="bl-poser" data-poser="${m.id}" aria-label="Poser : ${esc(nom)}">${PLUS}<span>Poser</span></button>`); }).join("")}</div>` : `<p class="bl-aide">Pas encore de motif de cette sorte à ${p.temps} temps par mesure.</p>`}
      <div class="bl-motif-pied"><button type="button" id="bl-ecrire" class="bl-lien">Ou écrire mes propres notes</button></div>`;
  }

  // Le pied de la grille : ce qu'on peut faire de la case choisie.
  function dessinerActions() {
    const p = etat.projet, z = $("bl-actions"), c = v.choix, cas = c && P.trouverPiste(p, c.piste) ? B.caseDe(p, c.piste, c.mesure) : null;
    if (!cas) { z.innerHTML = `<p class="bl-aide">Touche une case pour poser un bloc. Un bloc dure une mesure.</p>`; return; }
    const bloc = cas.type === "bloc", pi = P.trouverPiste(p, c.piste), peutColler = !!v.presse && cas.type !== "long", suivante = c.mesure + 1;
    const cibleLibre = B.caseDe(p, c.piste, suivante).type === "vide" || B.caseDe(p, c.piste, suivante).type === "bloc";
    z.innerHTML = `<p class="bl-quoi" role="status">${esc(pi.nom)}<span>mesure ${c.mesure + 1}</span></p>
      <div class="bl-boutons">
      ${cas.type === "vide" ? `<button type="button" data-a="ecrire" class="bl-fort">Écrire mes notes</button>` : `<button type="button" data-a="editer" class="bl-fort">Modifier les notes</button>`}
      <button type="button" data-a="motifs"${cas.type === "long" ? " disabled" : ""} aria-expanded="${v.motifs}">Motifs prêts</button>
      <button type="button" data-a="copier"${bloc ? "" : " disabled"}>Copier</button>
      <button type="button" data-a="coller"${peutColler ? "" : " disabled"}>Coller</button>
      <button type="button" data-a="dupliquer"${bloc && cibleLibre ? "" : " disabled"} title="Copie ce bloc dans la mesure suivante">Dupliquer à droite</button>
      <button type="button" data-a="vider" class="bl-danger"${bloc ? "" : " disabled"}>Vider</button></div>`;
  }

  // ---------------------------------------------------------------- les gestes
  function choisir(piste, mesure) { v.choix = { piste, mesure }; etat.arme = piste; }
  async function ecrireDans(piste, mesure) {
    const p = etat.projet; choisir(piste, mesure);
    if (B.caseDe(p, piste, mesure).type === "vide") { B.creerBloc(p, piste, mesure); changer(); await remettreAJourMidi(); }
    const nv = B.caseDe(p, piste, mesure); if (nv.type === "bloc") { etat.choisi = nv.clip.id; ouvrirRouleau(nv.clip.son); message("Bloc ouvert : clique dans la grille d'en bas pour poser une note ; tu l'entends en la posant."); }
    v.motifs = false; dessiner();
  }
  async function ouvrirCase(piste, mesure) {
    const p = etat.projet; choisir(piste, mesure); const c = B.caseDe(p, piste, mesure); arreterMotif();
    if (c.type === "vide") { v.motifs = true; v.modeles = false; v.palette = null; message("Choisis un motif prêt (touche « Écouter » puis « Poser »), ou écris tes notes toi-même."); }
    else { v.motifs = false; v.modeles = false; etat.choisi = c.clip.id; ouvrirRouleau(c.clip.son); message(c.type === "long" ? "Ce clip dure plusieurs mesures (ou vient d'un enregistrement) : tu peux modifier ses notes ici, mais il ne se copie pas comme un bloc." : "Bloc ouvert : modifie ses notes dans la grille d'en bas."); }
    dessiner();
  }
  // Pose un motif dans la case choisie ; la case suivante, si elle est vide, devient la case choisie : on peut enchaîner les motifs.
  async function poser(id) {
    const p = etat.projet, c = v.choix; arreterMotif();
    try { const r = M.poserMotif(p, c.piste, c.mesure, id, v.tonique); if (!r) { message("On ne remplace pas un clip de plusieurs mesures d'ici."); return; } }
    catch (err) { message(err.message); return; }
    changer(); await remettreAJourMidi(); const m = M.motifDe(id); message(`« ${M.nomDuMotif(m, v.tonique)} » posé, mesure ${c.mesure + 1}. Touche Lire pour l'entendre avec le reste.`);
    const suivante = c.mesure + 1; if (B.caseDe(etat.projet, c.piste, suivante).type === "vide") { choisir(c.piste, suivante); const g = Math.floor(suivante / B.MESURES_PAR_GROUPE); if (g !== v.groupe && g < B.nombreDeGroupes(etat.projet)) v.groupe = g; } else v.motifs = false;
    dessiner();
  }
  async function poserMorceau(id) {
    const p = etat.projet;
    try { M.poserModele(p, id, v.groupe, v.tonique); } catch (err) { message(err.message); return; }
    v.modeles = false; v.choix = null; changer(); await remettreAJourMidi(); message(`Morceau posé sur les mesures ${B.etiquetteGroupe(v.groupe)}. Touche Lire pour l'entendre, puis change un motif, un instrument ou la tonalité.`); dessiner();
  }
  racine.addEventListener("click", async e => {
    const g = e.target.closest("[data-g]"); if (g && racine.contains(g)) { v.groupe = +g.dataset.g; dessiner(); return; }
    if (e.target.closest("#bl-tempo")) { $("tempo").focus(); $("tempo").select(); return; }
    const mu = e.target.closest("[data-muet]"); if (mu) { const pi = P.trouverPiste(etat.projet, mu.dataset.muet); if (pi) { pi.muet = !pi.muet; changer(); } return; }
    const pa = e.target.closest(".bl-pastille"); if (pa) { v.motifs = false; v.modeles = false; v.palette = v.palette === pa.dataset.piste ? null : pa.dataset.piste; choisir(pa.dataset.piste, v.choix ? v.choix.mesure : v.groupe * B.MESURES_PAR_GROUPE); dessiner(); return; }
    const ins = e.target.closest("[data-inst]"); if (ins && v.palette) { await regler(v.palette, ins.dataset.inst); return; }
    if (e.target.closest("#bl-fermer-palette")) { v.palette = null; dessiner(); return; }
    const on = e.target.closest("[data-onglet]"); if (on) { v.onglet = on.dataset.onglet; arreterMotif(); dessiner(); return; }
    const ec = e.target.closest("[data-ecouter]"); if (ec && v.choix) { const m = M.motifDe(ec.dataset.ecouter), inst = B.instrumentDePiste(etat.projet, v.choix.piste); try { await ecouterMotif(M.notesDuMotif(m, v.tonique), m.temps, inst); } catch (err) { message(err && err.message || "Ce motif n'a pas pu être joué."); } return; }
    const po = e.target.closest("[data-poser]"); if (po && v.choix) { await poser(po.dataset.poser); return; }
    const mo = e.target.closest("[data-modele]"); if (mo) { await poserMorceau(mo.dataset.modele); return; }
    if (e.target.closest("#bl-modeles")) { v.modeles = !v.modeles; v.motifs = false; v.palette = null; arreterMotif(); dessiner(); return; }
    if (e.target.closest("#bl-ferme-motifs")) { v.motifs = false; v.modeles = false; arreterMotif(); dessiner(); return; }
    if (e.target.closest("#bl-ecrire") && v.choix) { await ecrireDans(v.choix.piste, v.choix.mesure); return; }
    const ca = e.target.closest(".bl-case"); if (ca) { await ouvrirCase(ca.dataset.piste, +ca.dataset.mesure); return; }
    const ac = e.target.closest("[data-a]"); if (ac && v.choix) await action(ac.dataset.a);
    if (e.target.closest("#bl-piste")) await ajouterInstrument();
  });
  racine.addEventListener("change", async e => {
    if (e.target.id === "bl-tous" && v.palette) await regler(v.palette, e.target.value);
    else if (e.target.id === "bl-tonalite") { v.tonique = +e.target.value; try { localStorage.setItem("sonora:pistes:tonique", String(v.tonique)); } catch (_) { /* pas gardé */ } arreterMotif(); dessiner(); }
  });

  async function regler(piste, instrument) {
    const refaire = B.reglerInstrumentPiste(etat.projet, piste, instrument); v.palette = null; changer();
    await remettreAJourMidi(); message(`${nomInstrument(instrument)} : ${refaire.length ? "les blocs de cette ligne le jouent maintenant." : "les prochains blocs de cette ligne le joueront."}`); dessiner();
  }
  async function ajouterInstrument() {
    const p = etat.projet, pi = B.ajouterPiste(p, "ech:clavier"); v.palette = pi.id; choisir(pi.id, v.groupe * B.MESURES_PAR_GROUPE); changer(); message("Une ligne de plus : choisis son instrument."); dessiner();
  }
  async function action(a) {
    const p = etat.projet, c = v.choix, cas = B.caseDe(p, c.piste, c.mesure);
    if (a === "ecrire") { await ecrireDans(c.piste, c.mesure); return; }
    if (a === "motifs") { v.motifs = !v.motifs; v.modeles = false; v.palette = null; arreterMotif(); dessiner(); return; }
    if (a === "editer") { if (cas.type !== "vide") { etat.choisi = cas.clip.id; ouvrirRouleau(cas.clip.son); } return; }
    if (a === "copier") { v.presse = B.copierBloc(p, c.piste, c.mesure); message(v.presse ? "Bloc copié : choisis une case et touche « Coller »." : "Rien à copier ici."); dessiner(); return; }
    if (a === "coller") { const r = B.collerBloc(p, c.piste, c.mesure, v.presse); if (!r) { message("On ne colle pas ici : cette case contient un clip de plusieurs mesures."); return; } changer(); await remettreAJourMidi(); message("Bloc collé."); const nv = B.caseDe(p, c.piste, c.mesure); if (nv.type === "bloc" && rouleauOuvert()) { etat.choisi = nv.clip.id; ouvrirRouleau(nv.clip.son); } dessiner(); return; }
    if (a === "dupliquer") { const r = B.dupliquerBloc(p, c.piste, c.mesure, c.mesure + 1); if (!r) return; changer(); await remettreAJourMidi(); choisir(c.piste, c.mesure + 1); const g = Math.floor((c.mesure + 1) / B.MESURES_PAR_GROUPE); if (g !== v.groupe) v.groupe = g; message("Bloc copié dans la mesure suivante."); dessiner(); return; }
    if (a === "vider") { if (B.viderBloc(p, c.piste, c.mesure)) { if (rouleauOuvert()) fermerRouleau(); etat.choisi = null; changer(); message("Bloc vidé. Annuler le remet."); } dessiner(); }
  }

  // ---------------------------------------------------------------- le mode lui-même
  function montrer(oui) {
    v.actif = !!oui; document.body.classList.toggle("mode-blocs", v.actif); racine.hidden = !v.actif;
    if (v.actif) { if (!v.choix) v.choix = null; dessiner(); } else { v.palette = null; }
    try { localStorage.setItem("sonora:pistes:blocs", v.actif ? "1" : "0"); } catch (_) { /* le choix n'est pas gardé : sans importance */ }
    if (!v.actif) afficherPistes();
  }
  // Le trait de lecture : à suivre quand la tête de lecture bouge.
  function suivre(tete) {
    if (!v.actif) return; const trait = $("bl-trait"); if (!trait) return;
    const pos = B.positionDansGrille(etat.projet, tete);
    if (!etat.lecture || !pos) { trait.hidden = true; return; }
    if (pos.groupe !== v.groupe && etat.lecture) { v.groupe = Math.min(pos.groupe, B.nombreDeGroupes(etat.projet) - 1); dessiner(); }
    trait.hidden = false; trait.style.left = `calc(var(--bl-pastille) + var(--bl-gap) + (100% - var(--bl-pastille) - var(--bl-gap)) * ${pos.x.toFixed(4)})`;
  }
  return { montrer, basculer: () => montrer(!v.actif), afficher: dessiner, suivre, get actif() { return v.actif; }, etat: v };
}
