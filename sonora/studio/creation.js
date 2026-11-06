// Création avancée du Studio : export WAV, partage par lien, clavier MIDI, séquenceur. Branche les modules purs (wav, partage, midi, sequence) sur la page.
import { encoderWAV } from "./wav.js?v=fdd145480a";
import { Stockage as RangementPistes } from "../pistes/stockage.js?v=fdd145480a";
import { encoder, decoder, motif as MOTIF_LIEN } from "./partage.js?v=fdd145480a";
import { Clavier, brancher } from "./midi.js?v=fdd145480a";
import { euclide, arpege, motifDepuis, planDeNotes, Sequenceur } from "./sequence.js?v=fdd145480a";
import { rendre } from "../src/rendu.js?v=fdd145480a";
import { compiler } from "../src/index.js?v=fdd145480a";
import { creerProposition, slug } from "../library/classe.js?v=fdd145480a";

const GAMMES = { penta: [60, 62, 64, 67, 69, 72, 74, 76], mineur: [57, 59, 60, 62, 64, 65, 67, 69], accord: [48, 55, 59, 64, 67, 71, 76], chromatique: [60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71] };
const SR_EXPORT = 44100;

export function installerCreation({ etat, $, journal, esc, executer, titreCourant, ed }) {
  const lire = id => $(id).value;
  // ---------------------------------------------------------------- export WAV
  const telecharger = (nom, octets, type) => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([octets], { type })); a.download = nom; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); };
  const nomFichier = ext => (titreCourant() || "sonora").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "sonora";
  // Source de test d'un effet, calculée (le même signal que la source choisie dans le panneau, hors micro).
  function sourceDeTest(n, sr) {
    const x = new Float32Array(n), choix = $("source-test") ? $("source-test").value : "sinus";
    if (choix === "sinus") for (let i = 0; i < n; i++) x[i] = 0.4 * Math.sin(2 * Math.PI * 220 * i / sr);
    else if (choix === "bruit") { let s = 12345; for (let i = 0; i < n; i++) { s = (s * 1664525 + 1013904223) >>> 0; x[i] = (s / 4294967296 * 2 - 1) * 0.4; } }
    else if (choix === "clics") { x[0] = 0.9; for (let i = sr; i < n; i += sr) x[i] = 0.9; }
    return x;
  }
  function rendreExport({ duree, notes }) {
    const r = compiler(ed.valeur); if (!r.ok || !r.module || !r.module.code) throw new Error("Le programme ne se compile pas : corrige les erreurs avant d'exporter.");
    const m = r.module, n = Math.round(duree * SR_EXPORT), reglages = { ...etat.valeurs };
    const opts = { sr: SR_EXPORT, n, reglages };
    if (m.voix) opts.notes = notes || [{ a: 0, on: 1, hauteur: 220, vitesse: 0.8 }, { a: 0, on: 2, hauteur: 277.18, vitesse: 0.8 }, { a: 0, on: 3, hauteur: 329.63, vitesse: 0.8 }, { a: Math.round(Math.min(2, duree * 0.6) * SR_EXPORT), off: 1 }, { a: Math.round(Math.min(2, duree * 0.6) * SR_EXPORT), off: 2 }, { a: Math.round(Math.min(2, duree * 0.6) * SR_EXPORT), off: 3 }];
    if (m.entrees.some(e => e.genre === "audio")) opts.entrees = [sourceDeTest(n, SR_EXPORT)];
    return { sortie: rendre(m, opts), module: m };
  }
  function exporter(duree, notes, etiquette) {
    const zone = $("export-etat"); const bits = +lire("wav-bits");
    try {
      const t0 = performance.now(), { sortie, module } = rendreExport({ duree, notes }), w = encoderWAV(sortie.canaux, SR_EXPORT, bits);
      telecharger(`${nomFichier()}${etiquette ? "-" + etiquette : ""}.wav`, w.octets, "audio/wav");
      const ko = Math.round(w.octets.length / 1024), msg = `WAV exporté : ${duree.toFixed(1).replace(".", ",")} s, ${module.canaux} canal${module.canaux > 1 ? "ux" : ""}, ${bits === 32 ? "32 bits flottant" : bits + " bits"}, ${SR_EXPORT} Hz, ${ko} Ko, calculé en ${(performance.now() - t0).toFixed(0)} ms.`;
      const av = []; if (w.ecretes) av.push(`${w.ecretes} échantillon${w.ecretes > 1 ? "s" : ""} écrêté${w.ecretes > 1 ? "s" : ""} (le signal dépasse 0 dB : baisse le volume ou choisis 32 bits flottant)`); if (sortie.ecretages) av.push(`le limiteur de sortie est intervenu ${sortie.ecretages} fois`);
      zone.textContent = msg + (av.length ? " Attention : " + av.join(" ; ") + "." : ""); journal(av.length ? "av" : "ok", esc(zone.textContent));
      etat.dernierExport = { duree, bits, octets: w.octets.length, ecretes: w.ecretes };
    } catch (e) { zone.textContent = e.message; journal("err", esc(e.message)); }
  }
  $("b-wav").onclick = () => { const d = Math.max(1, Math.min(60, +lire("wav-duree") || 4)); exporter(d); };
  // Envoyer vers Pistes (étape 5 de l'audit de navigation) : le même calcul que l'export WAV, déposé dans le rangement local de Pistes
  // avec une liste d'arrivée (clé « pistes:arrivees ») ; Pistes le place sur une piste libre à l'ouverture. Rien ne quitte l'appareil.
  $("b-vers-pistes").onclick = async () => {
    const zone = $("export-etat"), duree = Math.max(1, Math.min(60, +lire("wav-duree") || 4));
    try {
      const { sortie } = rendreExport({ duree }), id = "arrivee-" + Date.now().toString(36), nom = titreCourant() || "Son du Studio";
      await RangementPistes.ecrireSon(id, { canaux: sortie.canaux.slice(0, 2), sr: SR_EXPORT });
      let L = []; try { L = JSON.parse(localStorage.getItem("pistes:arrivees") || "[]"); } catch (_) {}
      L.push({ id, nom, duree }); localStorage.setItem("pistes:arrivees", JSON.stringify(L));
      zone.textContent = `« ${nom} » (${duree} s) est envoyé vers Pistes.`; journal("ok", esc(zone.textContent)); etat.envoiPistes = { id, nom, duree };
      location.href = "../pistes/index.html";
    } catch (e) { zone.textContent = "L'envoi vers Pistes n'a pas pu se faire : " + e.message; journal("err", esc(zone.textContent)); }
  };

  // ---------------------------------------------------------------- partage
  async function lienPartage() { return location.origin + location.pathname + "#p=" + await encoder({ source: ed.valeur, titre: titreCourant() }); }
  $("b-partager").onclick = async () => {
    const zone = $("export-etat");
    try {
      const lien = await lienPartage(); $("lien").value = lien; etat.dernierLien = lien;
      let copie = false; try { await navigator.clipboard.writeText(lien); copie = true; } catch (_) {}
      zone.textContent = copie ? `Lien copié (${lien.length} caractères). Ouvre-le dans un autre navigateur pour retrouver ce programme.` : `Lien prêt (${lien.length} caractères) : sélectionne-le dans le champ ci-dessus pour le copier.`;
      if (lien.length > 8000) zone.textContent += " Il est long : certaines messageries le coupent, exporte alors le fichier du projet.";
    } catch (e) { zone.textContent = "Impossible de créer le lien : " + e.message; }
  };
  $("lien").onfocus = () => $("lien").select();

  // ---------------------------------------------------------------- proposer à la classe
  $("proposer").addEventListener("toggle", () => { if ($("proposer").open && !$("pr-titre").value) $("pr-titre").value = titreCourant() === "Sans titre" ? "" : titreCourant(); });
  $("b-proposer").onclick = () => {
    const z = $("pr-retour"), r = creerProposition({ titre: $("pr-titre").value, texte: $("pr-texte").value, pseudo: $("pr-pseudo").value, mots: $("pr-mots").value, code: ed.valeur });
    const liste = (cls, l) => l.length ? `<ul class="${cls}">${l.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : "";
    if (!r.ok) { z.innerHTML = `<p class="bilan non">Ce n'est pas encore prêt :</p>${liste("pr-err", r.erreurs)}`; return; }
    const octets = new TextEncoder().encode(JSON.stringify(r.proposition, null, 1) + "\n"); telecharger(`proposition-${slug(r.proposition.titre)}.json`, octets, "application/json");
    etat.dernierePropositionPrete = r.proposition;
    z.innerHTML = `<p class="bilan ok">Fichier prêt : proposition-${esc(slug(r.proposition.titre))}.json (${octets.length} octets). Remets-le à ton professeur.</p>${r.avertissements.length ? `<p class="petit">À relire avant de le donner :</p>${liste("pr-av", r.avertissements)}` : ""}`;
    journal("ok", "Proposition à la classe préparée : " + esc(r.proposition.titre));
  };

  // ---------------------------------------------------------------- MIDI
  const sortieMoteur = { noteOn: (n, h, v) => { if (etat.moteur && etat.marche) etat.moteur.noteOn(n, h, v); }, noteOff: n => { if (etat.moteur && etat.marche) etat.moteur.noteOff(n); } };
  etat.clavierMidi = new Clavier(sortieMoteur);
  $("b-midi").onclick = async () => {
    const z = $("midi-etat");
    if (!navigator.requestMIDIAccess) { z.textContent = "Ce navigateur ne propose pas le MIDI (Chrome et Edge le font, Firefox et Safari pas encore ou sous condition)."; return; }
    try {
      const acces = await navigator.requestMIDIAccess({ sysex: false }), noms = brancher(acces, etat.clavierMidi);
      z.textContent = noms.length ? `Branché : ${noms.join(", ")}. Appuie sur Exécuter puis joue.` : "Aucun clavier MIDI détecté. Branche-le puis rappuie sur le bouton.";
      etat.midiNoms = noms;
    } catch (e) { z.textContent = "Accès MIDI refusé : " + (e && e.message || e) + ". Autorise-le dans la barre d'adresse du navigateur."; }
  };

  // ---------------------------------------------------------------- séquenceur
  const val = id => +$(id).value, motifCourant = () => {
    const pas = val("seq-pas"), k = Math.min(val("seq-imp"), pas), rythme = euclide(k, pas, val("seq-rot")), hauteurs = arpege(GAMMES[lire("seq-gamme")], lire("seq-arp"), Math.max(1, k), 7);
    return motifDepuis(rythme, hauteurs, 0.8, 4);
  };
  function majSeq() {
    const pas = val("seq-pas"); $("seq-imp").max = pas; $("seq-rot").max = pas - 1; if (val("seq-imp") > pas) $("seq-imp").value = pas; if (val("seq-rot") > pas - 1) $("seq-rot").value = 0;
    $("seq-tempo-v").textContent = val("seq-tempo") + " bpm"; $("seq-imp-v").textContent = val("seq-imp"); $("seq-rot-v").textContent = val("seq-rot"); $("seq-swing-v").textContent = val("seq-swing") + " %"; $("seq-porte-v").textContent = val("seq-porte") + " %";
    const m = motifCourant(); $("seq-pas-vue").innerHTML = m.map((p, i) => `<span class="${p ? "pas-on" : "pas-off"}${i % 4 === 0 ? " temps" : ""}" data-i="${i}">${p ? "&#9679;" : "&middot;"}</span>`).join("");
    $("seq-pas-vue").setAttribute("aria-label", "Rythme : " + m.map(p => (p ? "x" : ".")).join(""));
    etat.sequence = { motif: m };
    if (etat.sequenceur) etat.sequenceur.regler({ motif: m, tempo: val("seq-tempo"), swing: val("seq-swing") / 100, porte: val("seq-porte") / 100 });
  }
  for (const id of ["seq-tempo", "seq-pas", "seq-imp", "seq-rot", "seq-gamme", "seq-arp", "seq-swing", "seq-porte"]) $(id).addEventListener("input", majSeq);
  majSeq();
  let minuteur = null, delais = new Set(), t0 = 0;
  function arreterSeq() {
    if (minuteur) clearInterval(minuteur); minuteur = null; for (const d of delais) clearTimeout(d); delais.clear();
    if (etat.sequenceur) { for (const f of etat.sequenceur.fins) if (etat.moteur) etat.moteur.noteOff(f.id); }
    etat.sequenceur = null; etat.seqEnCours = false; $("b-seq").textContent = "Jouer la séquence"; $("b-seq").classList.add("principal");
  }
  etat.arreterSequence = arreterSeq;
  async function jouerSeq() {
    if (etat.seqEnCours) { arreterSeq(); return; }
    if (!etat.marche) await executer(); if (!etat.marche) return;
    const seq = new Sequenceur(motifCourant(), { tempo: val("seq-tempo"), swing: val("seq-swing") / 100, porte: val("seq-porte") / 100 });
    etat.sequenceur = seq; etat.seqEnCours = true; etat.seqJournal = []; $("b-seq").textContent = "Arrêter la séquence"; $("b-seq").classList.remove("principal");
    t0 = performance.now() / 1000; let derniere = 0;
    const envoyer = e => { if (!etat.seqEnCours || !etat.moteur) return; etat.seqJournal.push({ t: e.t, reel: performance.now() / 1000 - t0, type: e.type, id: e.id }); if (e.type === "on") etat.moteur.noteOn(e.id, e.hauteur, e.vitesse); else etat.moteur.noteOff(e.id);
      if (e.type === "on") { const i = Math.round(e.t / (60 / val("seq-tempo") / 4)) % val("seq-pas"); const c = $("seq-pas-vue").querySelector(`[data-i="${i}"]`); if (c) { c.classList.add("joue"); setTimeout(() => c.classList.remove("joue"), 90); } } };
    const tick = () => { const maintenant = performance.now() / 1000 - t0, fin = maintenant + 0.12; for (const e of seq.evenements(derniere, fin)) { const d = setTimeout(() => { delais.delete(d); envoyer(e); }, Math.max(0, (e.t - maintenant) * 1000)); delais.add(d); } derniere = fin; };
    tick(); minuteur = setInterval(tick, 25);
  }
  $("b-seq").onclick = jouerSeq;
  $("b-seq-wav").onclick = () => { const tours = 4, m = motifCourant(), pl = planDeNotes(m, { tempo: val("seq-tempo"), sr: SR_EXPORT, tours, swing: val("seq-swing") / 100, porte: val("seq-porte") / 100 }); exporter(pl.echantillons / SR_EXPORT + 1.5, pl.notes, "sequence"); };

  // ---------------------------------------------------------------- lien reçu au chargement
  etat.afficherCreation = m => { $("midi-zone").hidden = !m.voix; $("seq-zone").hidden = !m.voix; if (!m.voix) arreterSeq(); };
  return {
    async depuisLien() {
      const t = MOTIF_LIEN.exec(location.hash); if (!t) return null;
      try { const o = await decoder(t[1]); history.replaceState(null, "", location.pathname + location.search); return o; }
      catch (e) { etat.erreurLien = e.message; return { erreur: e.message }; }
    },
  };
}
