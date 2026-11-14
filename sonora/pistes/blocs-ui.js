// L'écran du mode blocs de SONORA Pistes (le modèle est dans blocs.js, sans DOM et testé dans Node).
// Une grille : une ligne par instrument (une pastille de couleur que l'on touche pour changer d'instrument), une colonne par mesure, quatre mesures à la fois.
// Toucher une case vide pose un bloc et ouvre ses notes ; toucher un bloc l'ouvre. Le piano roll et la partition existants servent d'éditeur : rien n'est doublé.
import * as B from "./blocs.js?v=4d8a66197a";
import * as M from "./motifs.js?v=4d8a66197a";

// Les instruments qu'on propose en gros boutons quand on touche une pastille : les plus connus d'abord, les autres dans la liste.
const PRINCIPAUX = [["ech:clavier", "Piano"], ["ech:guitare", "Guitare"], ["ech:basse", "Basse"], ["ech:violon", "Violon"], ["ech:souffle", "Flûte"], ["ech:trompette", "Trompette"], ["batt:reel", "Batterie"], ["ech:voix", "Voix"]];
const COULEURS = { Claviers: "#4C9BF5", Cordes: "#FF6B57", Orchestre: "#FF6B57", Batteries: "#FF8A3D", Vents: "#3FC79A", Voix: "#F26BA3", "Percussions à hauteurs": "#FFC53D", "Percussions du monde": "#FF8A3D", "Synthés et basses": "#A86CF0", "Effets sonores": "#8E8D86" };

export function creerVueBlocs(d) {
  const { $, P, INS, etat, esc, message, changer, afficherPistes, ouvrirRouleau, fermerRouleau, remettreAJourMidi, rouleauOuvert, ecouterMotif, arreterMotif } = d;
  const v = { actif: false, groupe: 0, choix: null, presse: null, palette: null, motifs: false, modeles: false, onglet: null, tonique: 0 };
  try { const t = +localStorage.getItem("sonora:pistes:tonique"); if (M.TONALITES.some(x => x[1] === t)) v.tonique = t; } catch (_) { /* la tonalité n'est pas gardée : do */ }
  const racine = $("blocs");
  const catalogue = () => INS.catalogue(), nomInstrument = id => (catalogue().find(x => x.id === id) || { nom: id }).nom;
  const couleur = id => { const e = catalogue().find(x => x.id === id); return (e && COULEURS[e.groupe]) || "#4C9BF5"; };

  function apercuHtml(notes, temps) { return B.apercu(notes, temps).map(n => `<i style="left:${(n.x * 100).toFixed(1)}%;width:${(n.w * 100).toFixed(1)}%;top:${(n.y * 84 + 4).toFixed(1)}%"></i>`).join(""); }

  function dessiner() {
    if (!v.actif || !etat.projet) return;
    const p = etat.projet, ng = B.nombreDeGroupes(p); v.groupe = Math.max(0, Math.min(v.groupe, ng - 1));
    // les groupes de quatre mesures
    $("bl-groupes").innerHTML = Array.from({ length: ng }, (_, g) => `<button type="button" data-g="${g}" aria-pressed="${g === v.groupe}">${B.etiquetteGroupe(g).replace(" à ", "&ndash;")}</button>`).join("");
    // la rangée des règles : mesure et tempo
    $("bl-regles").innerHTML = `<span class="bl-chip" title="Nombre de temps par mesure">${p.temps} temps</span><button type="button" class="bl-chip" id="bl-tempo" title="Changer le tempo">${p.tempo} par minute</button>
      <label class="bl-chip bl-tonalite" title="La tonalité des motifs prêts : les accords et les mélodies sont transposés">Tonalité <select id="bl-tonalite" aria-label="Tonalité des motifs prêts">${M.TONALITES.map(([nom, t]) => `<option value="${t}"${t === v.tonique ? " selected" : ""}>${esc(nom)}</option>`).join("")}</select></label>
      <button type="button" class="bl-chip" id="bl-modeles" aria-expanded="${v.modeles}" title="Poser quatre mesures sur plusieurs lignes d'un coup">Morceau tout prêt</button>`;
    // la grille
    const g0 = v.groupe * B.MESURES_PAR_GROUPE;
    let html = `<div class="bl-ligne bl-nums" aria-hidden="true"><span class="bl-pastille-vide"></span>${[0, 1, 2, 3].map(k => `<span class="bl-num">${g0 + k + 1}</span>`).join("")}</div>`;
    for (const pi of p.pistes) {
      const inst = B.instrumentDePiste(p, pi), col = couleur(inst);
      html += `<div class="bl-ligne" data-piste="${pi.id}" role="row"><div class="bl-pastille-cadre"><button type="button" class="bl-pastille" data-piste="${pi.id}" style="--col:${col}" aria-label="Instrument de ${esc(pi.nom)} : ${esc(nomInstrument(inst))}. Changer." aria-expanded="${v.palette === pi.id}"><b>${esc(nomInstrument(inst))}</b><small>${esc(pi.nom)}</small></button><button type="button" class="bl-muet" data-muet="${pi.id}" aria-pressed="${pi.muet}" aria-label="Couper le son de ${esc(pi.nom)}" title="Couper le son de cette ligne">Muet</button></div>`;
      for (let k = 0; k < B.MESURES_PAR_GROUPE; k++) {
        const m = g0 + k, c = B.caseDe(p, pi, m), sel = v.choix && v.choix.piste === pi.id && v.choix.mesure === m;
        const classe = `bl-case bl-${c.type}${sel ? " bl-choisie" : ""}`, texte = B.dire(p, pi, m);
        let dedans = "";
        if (c.type === "bloc") dedans = `<span class="bl-apercu" aria-hidden="true" style="--col:${col}">${apercuHtml(c.son.midi.notes, c.son.midi.temps)}</span>`;
        else if (c.type === "long") dedans = `<span class="bl-long" aria-hidden="true">${c.audio ? "son" : "clip"}</span>`;
        else dedans = `<span class="bl-plus" aria-hidden="true">+</span>`;
        html += `<button type="button" role="gridcell" class="${classe}" data-piste="${pi.id}" data-mesure="${m}" style="--col:${col}" aria-label="${esc(texte)}" aria-pressed="${sel ? "true" : "false"}">${dedans}</button>`;
      }
      html += `</div>`;
    }
    $("bl-grille").innerHTML = html;
    // la palette d'instruments, sous la grille, pour la piste dont on a touché la pastille
    const pal = $("bl-palette");
    if (v.palette && p.pistes.some(x => x.id === v.palette)) {
      const cur = B.instrumentDePiste(p, v.palette);
      pal.hidden = false;
      pal.innerHTML = `<p class="bl-q">Quel instrument pour « ${esc(P.trouverPiste(p, v.palette).nom)} » ?</p><div class="bl-inst">${PRINCIPAUX.map(([id, nom]) => `<button type="button" data-inst="${id}" aria-pressed="${id === cur}" style="--col:${couleur(id)}">${esc(nom)}</button>`).join("")}</div>
        <label class="mini">Tous les instruments<select id="bl-tous" aria-label="Tous les instruments">${INS.GROUPES.map(gr => `<optgroup label="${esc(gr)}">${catalogue().filter(x => x.groupe === gr).map(x => `<option value="${esc(x.id)}"${x.id === cur ? " selected" : ""}>${esc(x.nom)}</option>`).join("")}</optgroup>`).join("")}</select></label>
        <button type="button" id="bl-fermer-palette">Fermer</button>`;
    } else { pal.hidden = true; pal.innerHTML = ""; }
    dessinerMotifs();
    dessinerActions();
  }

  // Le panneau des motifs prêts (pour la case choisie) et celui des morceaux de départ.
  function dessinerMotifs() {
    const z = $("bl-motifs"), p = etat.projet, c = v.choix, pi = c && P.trouverPiste(p, c.piste);
    if (v.modeles) {
      z.hidden = false;
      const dispo = M.MODELES.filter(m => m.temps === p.temps);
      z.innerHTML = `<p class="bl-q">Un morceau tout prêt, sur les mesures ${B.etiquetteGroupe(v.groupe).replace(" à ", " à ")} :</p>` + (dispo.length ? `<div class="bl-liste">${dispo.map(m => `<div class="bl-motif"><div><b>${esc(m.nom)}</b><small>${esc(m.aide)}</small></div><div class="bl-motif-b"><button type="button" data-modele="${m.id}" class="principal">Poser</button></div></div>`).join("")}</div>` : `<p class="bl-aide">Les morceaux tout prêts existent à quatre temps par mesure. Ce projet est à ${p.temps} temps.</p>`) + `<button type="button" id="bl-ferme-motifs">Fermer</button>`;
      return;
    }
    if (!v.motifs || !pi) { z.hidden = true; z.innerHTML = ""; return; }
    const inst = B.instrumentDePiste(p, pi), onglets = M.ongletsPour(inst); if (!onglets.includes(v.onglet)) v.onglet = onglets.includes(M.genreDe(inst)) ? M.genreDe(inst) : onglets[0];
    const liste = M.motifsPour(v.onglet, p.temps), col = couleur(inst);
    z.hidden = false;
    z.innerHTML = `<p class="bl-q">Un motif pour « ${esc(pi.nom)} », mesure ${c.mesure + 1} (${esc(nomInstrument(inst))}) :</p>
      <div class="bl-onglets" role="tablist" aria-label="Sortes de motifs">${M.FAMILLES.filter(([f]) => onglets.includes(f)).map(([f, nom]) => `<button type="button" role="tab" data-onglet="${f}" aria-selected="${f === v.onglet}" style="--col:${col}">${esc(nom)}</button>`).join("")}</div>
      ${liste.length ? `<div class="bl-liste">${liste.map(m => `<div class="bl-motif"><div><b>${esc(M.nomDuMotif(m, v.tonique))}</b><small>${esc(m.aide)}</small></div><div class="bl-motif-b"><button type="button" data-ecouter="${m.id}" aria-label="Écouter : ${esc(M.nomDuMotif(m, v.tonique))}">Écouter</button><button type="button" data-poser="${m.id}" class="principal" aria-label="Poser : ${esc(M.nomDuMotif(m, v.tonique))}">Poser</button></div></div>`).join("")}</div>` : `<p class="bl-aide">Pas encore de motif de cette sorte à ${p.temps} temps par mesure.</p>`}
      <div class="bl-motif-pied"><button type="button" id="bl-ecrire">Écrire mes notes</button><button type="button" id="bl-ferme-motifs">Fermer</button></div>`;
  }

  function dessinerActions() {
    const p = etat.projet, z = $("bl-actions"), c = v.choix, cas = c && P.trouverPiste(p, c.piste) ? B.caseDe(p, c.piste, c.mesure) : null;
    if (!cas) { z.innerHTML = `<p class="bl-aide">Touche une case pour poser un bloc de notes. Un bloc dure une mesure.</p>`; return; }
    const bloc = cas.type === "bloc", pi = P.trouverPiste(p, c.piste), peutColler = !!v.presse && cas.type !== "long", suivante = c.mesure + 1;
    const cibleLibre = B.caseDe(p, c.piste, suivante).type === "vide" || B.caseDe(p, c.piste, suivante).type === "bloc";
    z.innerHTML = `<p class="bl-quoi" role="status">${esc(pi.nom)}, mesure ${c.mesure + 1}</p>
      ${cas.type === "vide" ? `<button type="button" data-a="ecrire">Écrire mes notes</button>` : `<button type="button" data-a="editer">Modifier les notes</button>`}
      <button type="button" data-a="motifs"${cas.type === "long" ? " disabled" : ""} aria-expanded="${v.motifs}">Motifs prêts</button>
      <button type="button" data-a="copier"${bloc ? "" : " disabled"}>Copier</button>
      <button type="button" data-a="coller"${peutColler ? "" : " disabled"}>Coller</button>
      <button type="button" data-a="dupliquer"${bloc && cibleLibre ? "" : " disabled"} title="Copie ce bloc dans la mesure suivante">Dupliquer à droite</button>
      <button type="button" data-a="vider" class="bl-danger"${bloc ? "" : " disabled"}>Vider</button>`;
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
    trait.hidden = false; trait.style.left = `calc(var(--bl-pastille) + (100% - var(--bl-pastille)) * ${pos.x.toFixed(4)})`;
  }
  return { montrer, basculer: () => montrer(!v.actif), afficher: dessiner, suivre, get actif() { return v.actif; }, etat: v };
}
