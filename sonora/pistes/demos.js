// Les démonstrations des mots de Pistes (demande de Sébastien, 04/11/2026) : au lieu de dire « place un son, puis... », Pistes fait l'exemple lui-même, avec de vrais sons,
// et le fait entendre. L'élève regarde, écoute, puis refait ou change. Son propre projet est mis de côté dans « Mes projets » : « Revenir à mon projet » le rouvre.
// Chaque démonstration reçoit une petite boîte à outils `a` (fournie par pistes.js) et renvoie une phrase qui dit ce qui vient d'être fait et ce qu'il faut écouter.
//   a.commencer(titre, tempo)            prépare un projet de démonstration
//   a.rythme(i, id, tempsDebut)          pose un rythme de la bibliothèque sur la piste i
//   a.note(i, id, note, tempsDebut, durée) pose une note de synthèse ; a.melodie(i, id, notes, tempsDebut, pasEnTemps) pose une suite de notes
//   a.regler(i, { volume, pan, muet, solo })   a.effet(i, nom, réglages)   a.enveloppe(i, points)
//   a.lire()  a.zoom(n)  a.metronome(oui)  a.motif(grille)  a.bibliotheque(recherche)  a.aimant(valeur)
// Les identifiants des sons viennent de bibliotheque.js (« ryt:pop:0 », « syn:cloches », « bat:909:clap »...).

export const DEMOS = {
  piste: { async faire(a) {
    await a.commencer("Démo : une piste", 100); a.piste(0, "Rythme"); a.piste(1, "Mélodie");
    a.rythme(0, "ryt:pop:0", 0); a.melodie(1, "syn:pianoElec", [60, 64, 67, 72, 67, 64, 60, 64], 0, 1); a.regler(0, { volume: 0.3 }); await a.lire();
    return "J'ai posé un rythme sur la piste 1 et une mélodie sur la piste 2, puis j'ai baissé le volume de la piste 1 : la mélodie passe au premier plan."; } },
  clip: { async faire(a) {
    await a.commencer("Démo : un clip", 100); a.piste(0, "Cloche"); a.note(0, "syn:cloches", 72, 0, 1.2); a.note(0, "syn:cloches", 72, 2, 1.2); await a.lire();
    return "Voici deux clips du même son, sur la même piste. Le second est posé deux temps plus loin : il commence plus tard. Sur l'écran, c'est un rectangle que tu peux déplacer."; } },
  volume: { async faire(a) {
    await a.commencer("Démo : le volume", 100); a.piste(0, "Fort, 100 %"); a.piste(1, "Doux, 40 %");
    a.melodie(0, "syn:cloches", [72, 76], 0, 1); a.melodie(1, "syn:cloches", [72, 76], 2, 1); a.regler(0, { volume: 1 }); a.regler(1, { volume: 0.4 }); await a.lire();
    return "Écoute les mêmes deux notes de cloche : d'abord à 100 %, puis à 40 %. La deuxième paraît plus loin, plus douce."; } },
  panoramique: { async faire(a) {
    await a.commencer("Démo : le panoramique", 120); a.piste(0, "Percussion, à gauche"); a.piste(1, "Mélodie, à droite");
    a.rythme(0, "ryt:monde:bembe", 0); a.melodie(1, "syn:pluck", [60, 64, 67, 64, 60, 64, 67, 72], 0, 1); a.regler(0, { pan: -0.8 }); a.regler(1, { pan: 0.8 }); await a.lire();
    return "J'ai mis la percussion à gauche (G 80) et la mélodie à droite (D 80). Avec un casque, tu entends chaque son de son côté. Ouvre les réglages d'une piste et ramène le panoramique au centre pour comparer.";
  } },
  muet: { async faire(a) {
    await a.commencer("Démo : muet", 100); a.piste(0, "Rythme (muet)"); a.piste(1, "Mélodie");
    a.rythme(0, "ryt:boombap:0", 0); a.melodie(1, "syn:pianoElec", [60, 63, 67, 70, 67, 63, 60, 63], 0, 1); a.regler(0, { muet: true }); await a.lire();
    return "J'ai mis M sur la piste du rythme : elle se tait, mais elle n'est pas effacée. Enlève le M pour la faire revenir."; } },
  solo: { async faire(a) {
    await a.commencer("Démo : solo", 100); a.piste(0, "Rythme"); a.piste(1, "Mélodie, en solo");
    a.rythme(0, "ryt:boombap:0", 0); a.melodie(1, "syn:pianoElec", [60, 63, 67, 70, 67, 63, 60, 63], 0, 1); a.regler(1, { solo: true }); await a.lire();
    return "J'ai mis S sur la mélodie : toutes les autres pistes se taisent. Enlève le S pour réentendre le rythme."; } },
  effets: { async faire(a) { return DEMOS.filtre.faire(a); } },
  filtre: { async faire(a) {
    await a.commencer("Démo : le filtre", 108); a.piste(0, "Rythme filtré"); a.rythme(0, "ryt:pop:0", 0); a.effet(0, "filtre", { type: "passe-bas", frequence: 500 }); a.ouvrirEffets(0); await a.lire();
    return "J'ai ajouté un filtre passe-bas à 500 Hz sur le rythme : les aigus sont étouffés, comme à travers un mur. Éteins l'interrupteur du filtre, ou monte la fréquence, pour entendre la différence."; } },
  echo: { async faire(a) {
    await a.commencer("Démo : l'écho", 100); a.piste(0, "Clap avec écho"); a.note(0, "bat:909:clap", 0, 0, 0.4); a.note(0, "bat:909:clap", 0, 3, 0.4); a.effet(0, "echo", { temps: 0.25, retour: 0.55, melange: 0.7 }); a.ouvrirEffets(0); await a.lire();
    return "J'ai posé deux claps et ajouté un écho de 0,25 seconde. Écoute les répétitions de plus en plus faibles : c'est comme si le son revenait d'une paroi à environ 43 mètres."; } },
  reverb: { async faire(a) {
    await a.commencer("Démo : la réverbération", 90); a.piste(0, "Cloche dans une église"); a.note(0, "syn:cloches", 72, 0, 0.8); a.note(0, "syn:cloches", 67, 4, 0.8); a.effet(0, "reverb", { duree: 4, melange: 0.5 }); a.ouvrirEffets(0); await a.lire();
    return "J'ai posé deux notes de cloche, puis ajouté une réverbération de 4 secondes : le son traîne comme dans une grande église. Réduis la durée à 0,5 s pour changer de lieu : on passe à une petite pièce."; } },
  enveloppe: { async faire(a) {
    await a.commencer("Démo : l'enveloppe de volume", 100); a.piste(0, "Nappe avec fondu"); a.note(0, "syn:nappe", 55, 0, 7); a.enveloppe(0, [[0, 0], [2.4, 1], [4.2, 1], [6.6, 0]]); a.montrerEnveloppe(0); await a.lire();
    return "J'ai posé une note longue et dessiné une enveloppe de quatre points : le volume monte doucement (fondu à l'entrée), reste haut, puis redescend (fondu à la sortie). Tu peux glisser un point pour changer la forme."; } },
  tempo: { async faire(a) {
    await a.commencer("Démo : le tempo", 120); a.piste(0, "Rythme"); a.rythme(0, "ryt:pop:0", 0); await a.lire();
    return "Le rythme joue à 120 battements par minute. Change le tempo en haut (par exemple 80 puis 160), puis relance : le même rythme change de caractère."; } },
  metronome: { async faire(a) {
    await a.commencer("Démo : le métronome", 100); a.piste(0, "Mélodie"); a.melodie(0, "syn:pianoElec", [60, 62, 64, 65], 0, 1); a.metronome(true); await a.lire();
    return "J'ai allumé le métronome : tu entends un petit clic à chaque temps, au tempo du projet, en plus de la mélodie. Décoche « Métronome » pour l'éteindre."; } },
  sequenceur: { async faire(a) {
    await a.commencer("Démo : le séquenceur à pas", 100); await a.motif({ kick: "x...x...x...x...", snare: "....x.......x...", hatc: "..x...x...x...x." });
    return "J'ai allumé des cases : la grosse caisse sur les temps 1, 5, 9 et 13, la caisse claire sur 5 et 13, le charleston entre les deux. Écoute la boucle, puis allume ou éteins une case pour changer le rythme."; } },
  bibliotheque: { async faire(a) {
    await a.commencer("Démo : la bibliothèque", 100); await a.bibliotheque("clave");
    return "J'ai ouvert la bibliothèque et cherché « clave ». Touche Écouter sur une ligne, puis Ajouter pour la poser sur la piste choisie."; } },
  zoom: { async faire(a) {
    await a.commencer("Démo : le zoom", 100); a.piste(0, "Cloche"); a.melodie(0, "syn:cloches", [72, 76, 79, 76], 0, 1); a.zoom(3);
    return "J'ai zoomé trois fois : tu vois les clips en grand, pour les placer au millimètre. Les boutons moins et plus, en haut à droite, dézooment et zooment."; } },
};

// Les notions qui ont une démonstration (les autres, comme l'export ou l'entrée audio, s'expliquent avec un exemple à essayer).
export const AVEC_DEMO = Object.keys(DEMOS);
