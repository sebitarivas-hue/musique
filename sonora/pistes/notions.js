// Les mots de Pistes : chaque notion (volume, panoramique, effets, enveloppe...) s'explique en quelques lignes, avec de quoi aller plus loin.
// Demande de Sébastien, 04/11/2026 : « chaque notion doit pouvoir être reliée à un contenu pédagogique qui l'explique, et on doit pouvoir le fermer et revenir à la création ».
// Le panneau s'ouvre dans la page : rien ne quitte la création, la lecture continue, le projet reste là. Les liens « Aller plus loin » s'ouvrent dans un autre onglet.
// Les fiches et les expériences cités existent déjà dans le site (un test le vérifie). Texte écrit pour des élèves de la 6e à la 3e : phrases courtes, un exemple à essayer.

export const NOTIONS = {
  piste: { titre: "Une piste", court: "Une ligne sur laquelle on pose des sons.",
    corps: ["Une piste est comme une ligne de la partition d'un orchestre : un instrument, une voix, un rythme. On en superpose plusieurs pour entendre le tout ensemble.", "Chaque piste a son propre volume, son panoramique et ses effets : on règle chaque son sans toucher aux autres."],
    essaie: "Pose un rythme sur la piste 1 et une voix sur la piste 2, puis baisse le volume de la piste 1 pour entendre la voix au premier plan.", liens: [{ libelle: "Fiche : les plans sonores et la texture", fiche: "plans" }] },
  clip: { titre: "Un clip", court: "Un morceau de son posé sur une piste.",
    corps: ["Un clip est un son importé, enregistré ou fabriqué. Sur la piste, on peut le déplacer, le couper, le copier et changer son volume.", "Le dessin dans le clip est la forme de l'onde : plus elle est haute, plus le son est fort à cet endroit."],
    essaie: "Glisse un clip un peu plus loin sur la piste : il commence plus tard.", liens: [{ libelle: "Expérience : l'amplitude et le niveau", science: "amplitude-niveau" }] },
  volume: { titre: "Le volume", court: "La force du son.",
    corps: ["Le volume règle l'intensité d'une piste. En musique, on parle de nuances : piano (doux), forte (fort).", "À 100 %, le son est tel qu'il a été enregistré. Au-dessus, on l'amplifie : attention, si plusieurs pistes sont fortes en même temps, le son peut saturer et craquer."],
    essaie: "Mets une piste à 40 % et une autre à 100 % : la plus forte semble plus proche de toi.", liens: [{ libelle: "Fiche : l'intensité et les nuances", fiche: "nuances" }, { libelle: "Expérience : l'amplitude et le niveau", science: "amplitude-niveau" }] },
  panoramique: { titre: "Le panoramique", court: "Placer un son à gauche, au centre ou à droite.",
    corps: ["Le panoramique répartit un son entre l'oreille gauche et l'oreille droite. Au centre, les deux reçoivent autant. À gauche, c'est surtout la gauche qui entend.", "Ton cerveau devine d'où vient un son grâce à de petites différences entre tes deux oreilles : un son un peu plus fort, ou un peu plus tôt, d'un côté. Au casque, l'effet est très net."],
    essaie: "Mets une voix à gauche (G 80) et une percussion à droite (D 80), puis écoute avec un casque.", liens: [{ libelle: "Fiche : les plans sonores et la texture", fiche: "plans" }, { libelle: "Expérience : la localisation des sons", science: "localisation" }] },
  muet: { titre: "Muet (M)", court: "Couper une piste sans la supprimer.",
    corps: ["Le bouton M (muet) fait taire une piste. Rien n'est effacé : tu peux la remettre quand tu veux.", "C'est utile pour écouter ce qui se passe sans un instrument, ou pour comparer deux versions."],
    essaie: "Mets M sur la piste du rythme et écoute ce qui reste.", liens: [] },
  solo: { titre: "Solo (S)", court: "N'écouter qu'une piste.",
    corps: ["Le bouton S (solo) fait taire toutes les autres pistes pour n'écouter que celle-ci.", "C'est pratique pour vérifier un détail : un son mal placé, un bruit parasite, un rythme qui tombe à côté."],
    essaie: "Mets S sur ta voix pour l'écouter seule, puis enlève-le.", liens: [] },
  rec: { titre: "Enregistrer (Rec)", court: "Garder ta voix ou un instrument sur une piste.",
    corps: ["Rec arme une piste : l'enregistrement du micro se posera sur cette piste, à la position du curseur rouge. Ensuite, appuie sur Enregistrer : un clip s'ouvre tout de suite dans la piste, la forme de ta voix s'y dessine en direct, et le son est posé exactement là où tu as commencé.", "Mets un casque pour que ce que tu entends ne retourne pas dans le micro, sinon le son siffle (c'est le larsen)."],
    essaie: "Arme la piste 2, appuie sur Enregistrer, dis ton prénom en rythme, puis écoute.", liens: [{ libelle: "Fiche : les voix", fiche: "voix" }] },
  effets: { titre: "Les effets", court: "Des transformations du son d'une piste.",
    corps: ["Un effet change le son d'une piste sans changer l'enregistrement d'origine. Ici : le filtre, l'écho et la réverbération.", "Ils s'enchaînent dans cet ordre : filtre, écho, réverbération. Tu peux les activer, les régler, les retirer."],
    essaie: "Ajoute une réverbération à ta voix et écoute comme elle « change de salle ».", liens: [{ libelle: "Fiche : le son, du point de vue de la physique", fiche: "physique" }] },
  filtre: { titre: "Le filtre", court: "Laisser passer certaines notes, étouffer les autres.",
    corps: ["Un son est fait de plusieurs fréquences : des graves et des aigus. Un filtre passe-bas garde les graves et étouffe les aigus, comme quand tu entends de la musique à travers un mur. Un filtre passe-haut fait l'inverse.", "Le timbre change parce que les aigus (les harmoniques) diminuent ou disparaissent."],
    essaie: "Mets un filtre passe-bas sur un rythme et baisse la fréquence : le son devient sourd, comme sous l'eau.", liens: [{ libelle: "Expérience : la résonance et le filtre", science: "resonance-filtre" }, { libelle: "Fiche : les paramètres du son", fiche: "parametres" }] },
  echo: { titre: "L'écho", court: "Le son revient après un petit temps.",
    corps: ["Un écho répète le son après un délai. Dans la nature, il vient d'une paroi lointaine, une falaise par exemple : le son va jusqu'à elle et revient.", "Le son voyage à environ 340 mètres par seconde. Avec un délai d'un quart de seconde, la paroi serait à une quarantaine de mètres. La page te donne la distance qui correspond à ton réglage."],
    essaie: "Mets un écho de 0,25 s sur un clap, puis augmente le retour : les répétitions durent plus longtemps.", liens: [{ libelle: "Expérience : la propagation et la distance", science: "propagation-distance" }, { libelle: "Expérience : la réflexion et le filtre en peigne", science: "reflexion-peigne" }] },
  reverb: { titre: "La réverbération", court: "Le son qui traîne dans un lieu.",
    corps: ["Dans une église ou une salle de bain, un son rebondit sur les murs et se prolonge : c'est la réverbération. Dans une petite pièce meublée, elle est presque absente.", "La durée règle le temps pendant lequel le son traîne : moins d'une seconde pour une pièce, plusieurs secondes pour une grande église."],
    essaie: "Chante une note courte avec une longue réverbération, puis avec une courte : tu changes de lieu sans bouger.", liens: [{ libelle: "Fiche : le son, du point de vue de la physique", fiche: "physique" }] },
  enveloppe: { titre: "L'enveloppe de volume", court: "Dessiner comment le volume monte et descend.",
    corps: ["L'enveloppe est une ligne que tu dessines sur la piste avec des points : tu choisis où le volume monte, descend, s'éteint. Un fondu à l'entrée (le son arrive doucement) ou à la sortie (il disparaît doucement) en est un exemple.", "Ne la confonds pas avec l'enveloppe ADSR d'un instrument de synthèse : Attaque, Déclin, Soutien, Relâche, la forme d'une seule note."],
    essaie: "Pose trois points pour faire un fondu : volume bas au début, haut au milieu, bas à la fin.", liens: [{ libelle: "Expérience : l'enveloppe d'amplitude (ADSR)", science: "enveloppe-adsr" }, { libelle: "Fiche : le solfège de l'objet sonore", fiche: "objet_sonore" }] },
  tempo: { titre: "Le tempo", court: "La vitesse de la pulsation.",
    corps: ["Le tempo se compte en battements par minute. À 60, il y a un battement par seconde ; à 100, c'est un tempo modéré ; au-delà de 140, c'est rapide.", "Le tempo du projet sert au métronome, à l'aimant et aux rythmes de la bibliothèque et du séquenceur."],
    essaie: "Passe de 80 à 120 : le même rythme paraît plus énergique.", liens: [{ libelle: "Fiche : le tempo et la pulsation", fiche: "tempo" }] },
  metronome: { titre: "Le métronome", court: "Un clic régulier pour garder la pulsation.",
    corps: ["Le métronome marque chaque temps par un petit clic, au tempo du projet. Il aide à enregistrer en rythme et à placer les sons.", "Il ne s'entend pas dans l'export : il sert seulement à travailler."],
    essaie: "Active le métronome, enregistre une phrase, puis désactive-le pour la réécouter.", liens: [{ libelle: "Fiche : le tempo et la pulsation", fiche: "tempo" }] },
  aimant: { titre: "L'aimant", court: "Les clips se collent à la grille du temps.",
    corps: ["Quand l'aimant est réglé sur « temps », un clip que tu déplaces se colle au temps le plus proche : les sons tombent juste sur la pulsation.", "« Demi-temps » ou « double croche » collent à des divisions plus fines. « Aucun » laisse placer le son où tu veux, sans grille."],
    essaie: "Déplace un clip avec l'aimant sur « temps », puis sur « aucun » : tu sens la différence.", liens: [{ libelle: "Fiche : les figures de notes et de silences", fiche: "figures" }] },
  multi: { titre: "Plusieurs pistes à la fois", court: "Enregistrer plusieurs entrées en même temps.",
    corps: ["Avec une interface audio qui a plusieurs entrées (plusieurs micros), chaque piste armée peut recevoir sa propre entrée, en même temps.", "Avec le micro d'un téléphone ou d'un ordinateur, laisse la case décochée."],
    essaie: "À utiliser seulement si tu as plusieurs micros branchés.", liens: [] },
  entree: { titre: "L'entrée audio", court: "Le micro qui enregistre.",
    corps: ["L'entrée est le micro (ou la prise) utilisé pour enregistrer. L'entrée par défaut est celle de ton appareil.", "Les noms des autres entrées n'apparaissent qu'après avoir autorisé le micro dans le navigateur."],
    essaie: "Branche un casque-micro, autorise le micro, puis choisis-le dans la liste.", liens: [] },
  instrument: { titre: "Jouer un instrument", court: "Jouer en direct avec le clavier.",
    corps: ["Tu peux jouer une mélodie avec le clavier de l'ordinateur, un clavier à l'écran ou un clavier MIDI, et l'enregistrer sur une piste. Plus de soixante instruments : des instruments enregistrés (piano, violon, trompette...), des percussions du monde, des synthés et des effets.", "Quand tu enregistres les notes, un clip s'ouvre dans la piste, à partir du curseur : tu vois tes notes s'écrire en direct, et le clip est posé exactement là où tu as commencé.", "MIDI est un langage entre instruments : il dit quelle note, quand, et avec quelle force, sans transporter de son."],
    essaie: "Choisis un instrument, joue quatre notes, puis réécoute ta prise.", liens: [{ libelle: "Fiche : les familles d'instruments", fiche: "instruments" }] },
  sequenceur: { titre: "Le séquenceur à pas", court: "Fabriquer un rythme en allumant des cases.",
    corps: ["Chaque colonne est un petit instant, un pas. Chaque ligne est un instrument : grosse caisse, caisse claire, charleston. Une case allumée, c'est un coup. Le motif tourne en boucle.", "Beaucoup de rythmes de rap, de house ou de pop sont construits ainsi. Un seul clic allume un coup, un deuxième clic un coup doux, un troisième l'éteint."],
    essaie: "Allume la grosse caisse sur les cases 1, 5, 9 et 13, puis la caisse claire sur les cases 5 et 13.", liens: [{ libelle: "Fiche : le tempo et la pulsation", fiche: "tempo" }] },
  bibliotheque: { titre: "La bibliothèque de sons", court: "Des sons et des rythmes prêts à poser.",
    corps: ["La bibliothèque contient des coups de batterie, des rythmes de plusieurs genres et du monde, et des sons de synthèse. Tout est fabriqué dans ta page : rien n'est téléchargé.", "Tu écoutes d'abord, puis tu ajoutes sur la piste choisie, à la position du curseur rouge."],
    essaie: "Cherche « clave », écoute-la, puis ajoute-la sur une piste.", liens: [{ libelle: "Fiche : les familles d'instruments", fiche: "instruments" }] },
  export: { titre: "Exporter en WAV", court: "Un fichier audio de tout ton projet.",
    corps: ["L'export mélange toutes les pistes, avec leurs volumes, leurs panoramiques et leurs effets, dans un seul fichier audio WAV, sans perte de qualité.", "Tu peux l'écouter ailleurs ou le rendre. Ton projet reste aussi gardé dans ce navigateur, mais le fichier est la copie qui ne dépend pas de lui."],
    essaie: "Exporte ton projet et écoute le fichier dans une autre application.", liens: [] },
  moteurs: { titre: "Faust, Csound et Pure Data", court: "Trois langages pour fabriquer du son.",
    corps: ["Au lieu de poser des sons déjà faits, tu écris un petit programme qui fabrique le son. Faust vient de GRAME, à Lyon. Csound est un langage ancien, né dans les années 1980. Pure Data se programme en reliant des boîtes entre elles.", "Le programme devient un clip sur ta piste. C'est un bon moyen de comprendre comment les sons de synthèse sont construits."],
    essaie: "Choisis un exemple, lance-le, puis change un nombre et réécoute.", liens: [{ libelle: "Le laboratoire sonore (Faust)", url: "../../#faust" }] },
  zoom: { titre: "Le zoom", court: "Voir plus de détail ou plus de temps.",
    corps: ["Zoomer rapproche la règle : tu vois les clips plus en détail, utile pour couper ou placer un son avec précision. Dézoomer montre tout le projet d'un coup d'œil."],
    essaie: "Zoome pour placer un clap exactement sur un temps.", liens: [] },
};

export const ORDRE = ["piste", "clip", "volume", "panoramique", "muet", "solo", "rec", "effets", "filtre", "echo", "reverb", "enveloppe", "tempo", "metronome", "aimant", "multi", "entree", "instrument", "sequenceur", "bibliotheque", "export", "moteurs", "zoom"];

// Adresses des liens, relatives à sonora/pistes/index.html (publié sous sonora/pistes/ à la racine du site).
export const adresse = l => l.url || (l.fiche ? `../../#fiche-${l.fiche}` : l.science ? `../science/index.html#${l.science}` : "#");

// Le panneau : s'ouvre sur une notion, ou sur la liste de toutes. Il ne bloque rien (la lecture continue) et se ferme par « Fermer et revenir à la création », la croix ou Échap.
export function monterNotions({ esc, demos = {}, revenir = async () => false, retour = () => null, notions = NOTIONS, ordre = ORDRE, titreListe = "Les mots de Pistes", racine = "" }) {
  const zone = document.createElement("aside"); zone.id = "notion-panneau"; zone.className = "notion-panneau"; zone.setAttribute("aria-labelledby", "notion-titre"); zone.hidden = true;
  zone.innerHTML = `<div class="notion-in"><div class="notion-haut"><h2 id="notion-titre"></h2><button type="button" class="croix-b" id="notion-croix" aria-label="Fermer l'explication"><span class="croix" aria-hidden="true"></span></button></div><div id="notion-corps"></div>
    <p class="notion-pied"><button type="button" id="notion-retour" class="notion-fermer">Fermer et revenir à la création</button> <button type="button" id="notion-tous" class="notion-liste">Tous les mots</button></p></div>`;
  document.body.appendChild(zone);
  let opener = null; const $ = i => zone.querySelector("#" + i);
  const ouvrirZone = () => { zone.hidden = false; document.body.classList.add("notion-ouverte"); };
  function voir(id) {
    const n = notions[id]; if (!n) return; $("notion-titre").textContent = n.titre;
    $("notion-corps").innerHTML = `<p class="notion-court">${esc(n.court)}</p>${n.corps.map(t => `<p>${esc(t)}</p>`).join("")}<p class="notion-essaie"><span class="notion-etiq">${demos[id] ? "Exemple" : "À essayer"}</span> ${esc(n.essaie)}</p>` +
      (demos[id] ? `<p class="notion-faire"><button type="button" class="notion-demo" data-demo="${id}">Fais-le pour moi</button></p><div class="notion-resultat" id="notion-resultat" role="status" aria-live="polite"></div>` : "") +
      (n.liens.length ? `<p class="notion-plus">Aller plus loin (s'ouvre dans un autre onglet, ta création reste ici) :</p><ul class="notion-liens">${n.liens.map(l => `<li><a href="${esc(racine + adresse(l))}" target="_blank" rel="noopener">${esc(l.libelle)}</a></li>`).join("")}</ul>` : "");
    $("notion-tous").hidden = false; ouvrirZone(); zone.dataset.vue = id;
  }
  function liste() {
    $("notion-titre").textContent = titreListe;
    $("notion-corps").innerHTML = `<p class="notion-court">Touche un mot pour comprendre à quoi il sert.</p><ul class="notion-index">${ordre.map(id => `<li><button type="button" data-voir="${id}">${esc(notions[id].titre)}<span>${esc(notions[id].court)}</span></button></li>`).join("")}</ul>`;
    $("notion-tous").hidden = true; ouvrirZone(); zone.dataset.vue = "liste";
  }
  function fermer() { if (zone.hidden) return; zone.hidden = true; document.body.classList.remove("notion-ouverte"); zone.dataset.vue = ""; if (opener && document.contains(opener)) opener.focus(); opener = null; }
  const ouvrir = (id, depuis) => { opener = depuis || document.activeElement; voir(id); $("notion-retour").focus({ preventScroll: true }); };
  const ouvrirListe = depuis => { opener = depuis || document.activeElement; liste(); $("notion-retour").focus({ preventScroll: true }); };
  async function faire(id, b) {
    const r = $("notion-resultat"); b.disabled = true; b.textContent = "Je prépare l'exemple..."; r.textContent = "";
    let res; try { res = await demos[id](); } catch (err) { res = { message: "L'exemple n'a pas pu se lancer : " + err.message }; }
    b.disabled = false; b.textContent = "Refaire l'exemple"; if (zone.dataset.vue !== id) return;
    const ret = res && res.retour; r.innerHTML = `<p>${esc(res ? res.message : "")}</p>` + (ret ? `<p class="notion-garde">Ton projet « ${esc(ret)} » est gardé dans Mes projets. <button type="button" class="notion-revenir" id="notion-revenir">Revenir à mon projet</button></p>` : "");
  }
  zone.addEventListener("click", async e => { const d = e.target.closest("[data-demo]"); if (d) { faire(d.dataset.demo, d); return; } const rv = e.target.closest("#notion-revenir"); if (rv) { rv.disabled = true; const ok = await revenir(); const r = $("notion-resultat"); if (r) r.innerHTML = ok ? "<p>Ton projet est de retour.</p>" : "<p>Je n'ai pas retrouvé ton projet.</p>"; return; } });
  zone.addEventListener("click", e => { const b = e.target.closest("[data-voir]"); if (b) { voir(b.dataset.voir); $("notion-retour").focus({ preventScroll: true }); } });
  $("notion-croix").onclick = fermer; $("notion-retour").onclick = fermer; $("notion-tous").onclick = () => { liste(); $("notion-retour").focus({ preventScroll: true }); };
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !zone.hidden) { e.stopImmediatePropagation(); fermer(); } }, true);
  // Tout bouton « ? » ou lien portant data-notion ouvre la notion.
  document.addEventListener("click", e => { const b = e.target.closest("[data-notion]"); if (!b) return; e.preventDefault(); e.stopPropagation(); if (b.dataset.notion === "liste") ouvrirListe(b); else ouvrir(b.dataset.notion, b); }, true);
  return { ouvrir, ouvrirListe, fermer, estOuvert: () => !zone.hidden };
}
