// Les deux panneaux ajoutés à Pistes : la bibliothèque de sons et de rythmes, et le séquenceur à pas. Ils fabriquent de l'audio (bibliotheque.js) et le placent sur une piste.
// Rien ne quitte l'appareil. Le son se prépare dans la page ; le clip est ensuite un clip comme les autres (couper, déplacer, effets, export).
import * as B from "./bibliotheque.js?v=b900c284ee";

export function monterPanneaux({ $, esc, etat, P, ajouterAudio, changer, message }) {
  const els = B.elements(), SR = 44100; let ctx = null, source = null, famille = "batterie", S = null;
  const contexte = () => { if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === "suspended") ctx.resume(); return ctx; };
  const arreter = () => { if (source) { try { source.stop(); } catch (_) {} source = null; } if (S && S.vivant) S.vivant = null; if (S && S.boucle) finBoucle(); };
  const jouer = (canaux, sr, boucle = false) => { arreter(); const c = contexte(), buf = c.createBuffer(canaux.length, canaux[0].length, sr); canaux.forEach((x, i) => buf.copyToChannel(x, i)); const s = c.createBufferSource(); s.buffer = buf; s.loop = boucle; s.connect(c.destination); s.start(); source = s; s.onended = () => { if (source === s) source = null; }; return { debut: c.currentTime, duree: buf.duration }; };
  const placer = (r, msg) => { const pi = P.trouverPiste(etat.projet, etat.arme) || etat.projet.pistes[0], id = ajouterAudio(r.nom, r.canaux, r.sr, r.source), t0 = P.aimanter(etat.projet, etat.tete, +$("aimant").value), d = r.canaux[0].length / r.sr;
    P.placerClip(etat.projet, P.pisteLibre(etat.projet, pi.id, t0, d), id, t0); message(msg || `« ${r.nom} » ajouté sur ${pi.nom}, au curseur rouge.`); changer(); };
  const ouvrir = (id, bouton) => { for (const [x, b] of [["biblio", "b-biblio"], ["pas", "b-pas"]]) { const o = x === id && $(x).hidden; $(x).hidden = !o; $(b).setAttribute("aria-expanded", String(o)); } if (!$(id).hidden && id === "pas") dessinerGrille(); if (!$(id).hidden && id === "biblio") listerBiblio(); if ($(id).hidden) arreter(); };
  $("b-biblio").onclick = () => ouvrir("biblio"); $("b-pas").onclick = () => ouvrir("pas");
  $("biblio-fermer").onclick = () => { $("biblio").hidden = true; $("b-biblio").setAttribute("aria-expanded", "false"); arreter(); $("b-biblio").focus(); };
  $("pas-fermer").onclick = () => { $("pas").hidden = true; $("b-pas").setAttribute("aria-expanded", "false"); arreter(); $("b-pas").focus(); };

  // ---------------------------------------------------------------- la bibliothèque
  $("biblio-onglets").innerHTML = B.CATEGORIES.map(([k, n]) => `<button type="button" role="tab" data-fam="${k}" aria-selected="${k === famille}">${n}</button>`).join("");
  $("biblio-note").innerHTML = '<option value="">note de départ</option>' + B.NOTES.map(m => `<option value="${m}">${B.NOM_NOTE(m)}</option>`).join("");
  $("biblio-onglets").onclick = e => { const b = e.target.closest("[data-fam]"); if (!b) return; famille = b.dataset.fam; $("biblio-onglets").querySelectorAll("button").forEach(x => x.setAttribute("aria-selected", String(x === b))); listerBiblio(); };
  $("biblio-chercher").oninput = () => listerBiblio();
  function listerBiblio() {
    const q = $("biblio-chercher").value.trim().toLowerCase(), L = els.filter(e => e.famille === famille && (!q || e.nom.toLowerCase().includes(q)));
    $("biblio-reglages").hidden = !["sons", "instruments", "percussions", "effets"].includes(famille); $("biblio-info").textContent = famille === "rythmes" ? `Les rythmes durent deux mesures et suivent le tempo du projet (${etat.projet.tempo} par minute).` : famille === "batterie" ? "Un coup de batterie : place-le où tu veux, ou construis un motif dans le séquenceur à pas." : famille === "percussions" ? "Des percussions du monde, fabriquées par synthèse (aucun enregistrement). La note les accorde : monte ou descends pour changer de hauteur." : famille === "effets" ? "Des effets sonores fabriqués par synthèse : laser, vent, montée, impact... La note change leur hauteur." : famille === "instruments" ? "De vrais instruments enregistrés. Choisis la note et la durée : la note de départ est celle où l'instrument sonne le mieux." : "Choisis la note et la durée, puis écoute ou ajoute.";
    $("biblio-liste").innerHTML = L.map(e => `<li data-id="${esc(e.id)}"><span class="bl-n">${esc(e.nom)}</span><span class="petit bl-t">${e.type === "coup" ? "un coup" : e.type === "boucle" ? "rythme, 2 mesures" : e.type === "ech" ? esc(e.groupe) : "son"}</span><span class="lp-act"><button type="button" data-a="ecouter">Écouter</button><button type="button" data-a="ajouter">Ajouter</button>${e.type === "boucle" ? '<button type="button" data-a="modifier">Modifier</button>' : ""}</span></li>`).join("") || "<li>Rien ne correspond.</li>";
  }
  const fab = async e => { if (e.type === "ech") { $("msg-biblio").textContent = "Chargement de l'instrument..."; return B.fabriquerEch(e, { note: $("biblio-note").value === "" ? undefined : +$("biblio-note").value, duree: +$("biblio-duree").value, sr: SR, ctx: contexte() }); } const r = B.fabriquer(e, { tempo: etat.projet.tempo, note: $("biblio-note").value === "" ? undefined : +$("biblio-note").value, duree: +$("biblio-duree").value, sr: SR }); if (e.type === "boucle") r.source = { type: "boucle", el: e.id, rendu: etat.projet.tempo }; return r; };
  $("biblio-liste").onclick = async e => { const b = e.target.closest("button[data-a]"), li = e.target.closest("li[data-id]"); if (!b || !li) return; const el = els.find(x => x.id === li.dataset.id); if (!el) return;
    try { if (b.dataset.a === "ecouter") { const r = await fab(el); jouer(r.canaux, r.sr); $("msg-biblio").textContent = `Écoute : ${r.nom}.`; }
      else if (b.dataset.a === "ajouter") { const r = await fab(el); placer(r); } else if (b.dataset.a === "modifier") { chargerMotif(el); ouvrir("pas"); } } catch (err) { $("msg-biblio").textContent = "Cela n'a pas pu se fabriquer : " + err.message; } };

  // ---------------------------------------------------------------- le séquenceur à pas
  S = { pas: 16, kit: "909", swing: 0, mesures: 2, grille: B.grilleVide(16), nom: "Motif", boucle: false, vivant: null, debut: 0, duree: 0, minuteur: 0 };
  $("pas-longueur").innerHTML = B.PAS_LONGUEURS.map(n => `<option value="${n}"${n === 16 ? " selected" : ""}>${n} pas</option>`).join("");
  $("pas-jeu").innerHTML = Object.entries({ "909": "Boîte à rythmes sèche", "808": "Boîte à rythmes grave", acoustique: "Batterie douce" }).map(([k, n]) => `<option value="${k}">${n}</option>`).join("");
  function chargerMotif(el) { memoire(); const g = B.grilleDe(el); S.grille = g.grille; S.pas = g.pas; S.kit = g.kit; S.swing = g.swing; S.nom = el.nom; $("pas-longueur").value = String(S.pas); if (![...$("pas-longueur").options].some(o => +o.value === S.pas)) $("pas-longueur").insertAdjacentHTML("beforeend", `<option value="${S.pas}">${S.pas} pas</option>`), $("pas-longueur").value = String(S.pas); $("pas-jeu").value = S.kit; $("pas-swing").value = String(Math.round(S.swing * 100)); $("pas-sw").textContent = Math.round(S.swing * 100) + " %"; $("msg-pas").textContent = `Rythme chargé : ${el.nom}. Modifie-le, puis ajoute-le au projet.`; majBoucle(); }
  function dessinerGrille() {
    $("pas-grille").style.setProperty("--n", S.pas); $("pas-grille").innerHTML = Object.keys(S.grille).map(p => `<div class="pas-ligne"><span class="pas-nom">${esc(B.NOMS_PIECES[p])}</span>${Array.from({ length: S.pas }, (_, i) => `<button type="button" class="pas-case${i % 4 === 0 ? " t1" : ""}" data-p="${p}" data-i="${i}" data-e="${S.grille[p][i]}" aria-label="${esc(B.NOMS_PIECES[p])}, pas ${i + 1}" aria-pressed="${S.grille[p][i] !== "."}"></button>`).join("")}</div>`).join("");
  }
  // Annuler dans le séquenceur : chaque geste (une case, vider, changer la longueur, charger un rythme) met l'état d'avant de côté.
  const pile = [], etatPas = () => JSON.stringify({ g: S.grille, pas: S.pas, kit: S.kit, swing: S.swing, nom: S.nom }), majPas = () => { $("pas-annuler").disabled = !pile.length; };
  const memoire = () => { const t = etatPas(); if (pile[pile.length - 1] !== t) { pile.push(t); if (pile.length > 60) pile.shift(); } majPas(); };
  const retourPas = () => { if (!pile.length) return; const o = JSON.parse(pile.pop()); S.grille = o.g; S.pas = o.pas; S.kit = o.kit; S.swing = o.swing; S.nom = o.nom; $("pas-longueur").value = String(S.pas); if (![...$("pas-longueur").options].some(x => +x.value === S.pas)) $("pas-longueur").insertAdjacentHTML("beforeend", `<option value="${S.pas}">${S.pas} pas</option>`), $("pas-longueur").value = String(S.pas); $("pas-jeu").value = S.kit; dessinerGrille(); majPas(); majBoucle(); $("msg-pas").textContent = "Annulé."; };
  $("pas-annuler").onclick = retourPas; document.addEventListener("keydown", e => { if ($("pas").hidden || !(e.ctrlKey || e.metaKey) || e.shiftKey || e.key.toLowerCase() !== "z" || /^(INPUT|SELECT|TEXTAREA)$/.test((document.activeElement || {}).tagName || "")) return; e.preventDefault(); e.stopImmediatePropagation(); retourPas(); }, true);
  $("pas-grille").onclick = e => { const b = e.target.closest(".pas-case"); if (!b) return; memoire(); B.basculer(S.grille, b.dataset.p, +b.dataset.i); const v = S.grille[b.dataset.p][+b.dataset.i]; b.dataset.e = v; b.setAttribute("aria-pressed", String(v !== ".")); majBoucle(); if (v === "x" && !S.boucle) { const r = B.rendreGrille({ ...B.grilleVide(S.pas), [b.dataset.p]: "x".padEnd(S.pas, ".") }, { pas: S.pas, tempo: 240, kit: S.kit, mesures: 1, sr: SR }); if (r) jouer([r.canaux[0].slice(0, Math.round(SR * 0.5))], SR); } };
  $("pas-longueur").onchange = e => { memoire(); S.pas = +e.target.value; S.grille = B.redimensionner(S.grille, S.pas); dessinerGrille(); majBoucle(); };
  $("pas-jeu").onchange = e => { S.kit = e.target.value; majBoucle(); };
  $("pas-swing").oninput = e => { S.swing = +e.target.value / 100; $("pas-sw").textContent = e.target.value + " %"; majBoucle(); };
  $("pas-mesures").onchange = e => { S.mesures = +e.target.value; majBoucle(); };
  const fabGrille = () => { const r = B.rendreGrille(S.grille, { pas: S.pas, tempo: etat.projet.tempo, swing: S.swing, kit: S.kit, mesures: S.mesures, sr: SR, nom: `${S.nom === "Motif" ? "Motif" : S.nom}, ${S.pas} pas` }); if (r) r.source = { type: "pas", grille: JSON.parse(JSON.stringify(S.grille)), pas: S.pas, swing: S.swing, kit: S.kit, mesures: S.mesures, rendu: etat.projet.tempo }; return r; };
  $("pas-vider").onclick = () => { memoire(); S.grille = B.grilleVide(S.pas); S.nom = "Motif"; dessinerGrille(); majBoucle(); $("msg-pas").textContent = "Grille vidée. Touche « Annuler » pour la retrouver."; };
  // La boucle en temps réel. Toute modification (une case, le jeu de sons, le swing, la longueur, le nombre de mesures, le tempo du projet, annuler, vider, un rythme chargé) est entendue tout de suite, sans arrêter la lecture :
  // le motif est refait, puis il remplace l'ancien au même point de la boucle, avec un fondu de 12 millisecondes pour éviter tout claquement.
  const curseurs = () => document.querySelectorAll(".pas-case.curseur").forEach(x => x.classList.remove("curseur"));
  function finBoucle() { S.boucle = false; S.vivant = null; clearTimeout(S.minuteur); cancelAnimationFrame(S.raf); curseurs(); $("pas-ecouter").textContent = "Écouter en boucle"; }
  const fondre = (v, t0) => { if (!v) return; try { v.g.gain.setValueAtTime(1, t0); v.g.gain.linearRampToValueAtTime(0, t0 + 0.012); v.s.stop(t0 + 0.03); } catch (_) {} };
  function remplacer(r) {
    const c = contexte(), buf = c.createBuffer(r.canaux.length, r.canaux[0].length, r.sr); r.canaux.forEach((x, i) => buf.copyToChannel(x, i));
    const t0 = c.currentTime + 0.015, fraction = S.duree ? (((t0 - S.debut) % S.duree) + S.duree) % S.duree / S.duree : 0, off = (fraction * buf.duration) % buf.duration;
    const s = c.createBufferSource(), g = c.createGain(); s.buffer = buf; s.loop = true; s.connect(g); g.connect(c.destination);
    if (S.vivant) { g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(1, t0 + 0.012); } s.start(t0, off); fondre(S.vivant, t0);
    S.vivant = { s, g }; source = s; S.debut = t0 - off; S.duree = buf.duration;
  }
  function silence() { if (!S.vivant) return; fondre(S.vivant, contexte().currentTime + 0.005); S.vivant = null; source = null; }
  function majBoucle() {
    if (!S.boucle) return; clearTimeout(S.minuteur);
    S.minuteur = setTimeout(() => { if (!S.boucle) return; const r = fabGrille(); if (!r) { silence(); $("msg-pas").textContent = "La grille est vide : la boucle continue en silence, allume une case pour la réentendre."; return; } remplacer(r); }, 25);
  }
  $("tempo").addEventListener("input", () => majBoucle()); $("tempo").addEventListener("change", () => majBoucle());
  $("pas-ecouter").onclick = () => { if (S.boucle) { arreter(); finBoucle(); return; }
    const r = fabGrille(); if (!r) { $("msg-pas").textContent = "La grille est vide : allume quelques cases."; return; }
    arreter(); S.duree = 0; S.vivant = null; remplacer(r); S.boucle = true; $("pas-ecouter").textContent = "Arrêter";
    const suivre = () => { if (!S.boucle) return; const dur = 60 / etat.projet.tempo / 4, t = ((((ctx.currentTime - S.debut) % (S.pas * dur)) + S.pas * dur) % (S.pas * dur)), k = Math.floor(t / dur); curseurs(); document.querySelectorAll(`.pas-case[data-i="${k}"]`).forEach(x => x.classList.add("curseur")); S.raf = requestAnimationFrame(suivre); }; suivre(); };
  $("pas-ajouter").onclick = () => { const r = fabGrille(); if (!r) { $("msg-pas").textContent = "La grille est vide : allume quelques cases."; return; } placer(r, `« ${r.nom} » ajouté : ${S.mesures} mesure${S.mesures > 1 ? "s" : ""} au tempo du projet.`); $("msg-pas").textContent = `Motif ajouté au projet (${S.mesures} mesure${S.mesures > 1 ? "s" : ""}). Tu peux continuer à le modifier et en ajouter un autre.`; };
  // Pour les démonstrations des mots de Pistes (demos.js) : allume des cases du séquenceur et lance la boucle.
  const motif = async g => { memoire(); if ($("pas").hidden) $("b-pas").click(); S.pas = 16; S.kit = "909"; S.swing = 0; S.nom = "Motif"; S.grille = { ...B.grilleVide(16), ...g }; $("pas-longueur").value = "16"; $("pas-jeu").value = "909"; dessinerGrille(); if (!S.boucle) $("pas-ecouter").click(); else majBoucle(); };
  const bibliotheque = async (q, famille = "rythmes") => { if ($("biblio").hidden) $("b-biblio").click(); const t = $("biblio-onglets").querySelector(`[data-fam="${famille}"]`); if (t) t.click(); $("biblio-chercher").value = q; $("biblio-chercher").dispatchEvent(new Event("input")); };
  window.PISTES_PANNEAUX = { S, elements: els, motif, bibliotheque };
}
