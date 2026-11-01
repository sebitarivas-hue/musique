// Bibliothèque d'exemples du Studio. Chaque exemple compile et se génère (testé) : aucun ne dépend d'un module pas encore disponible.
// niveau : Découverte (on manipule), Programmation (on lit et on modifie le code), Recherche (on construit).
export const EXEMPLES = [
  { id: "son-pur", niveau: "Découverte", titre: "Un son pur", texte: "Une sinusoïde : un seul partiel. Change la fréquence (la hauteur) et le volume (l'intensité).",
    code: `/// Un son pur : une seule fréquence. Change la hauteur et le volume.
instrument SonPur {
    /// La hauteur du son, en hertz.
    reglage frequence : Hz = 440 Hz dans 20 Hz .. 20 kHz courbe log etiquette "Fréquence"
    /// Le volume.
    reglage volume : Ratio = 20% dans 0 .. 1 lissage 20 ms etiquette "Volume"

    soit onde = sinus(frequence)
    sortie = onde * volume
}
` },
  { id: "battements", niveau: "Découverte", titre: "Deux sons qui battent", texte: "Deux sinusoïdes presque identiques : on entend le volume monter et descendre. Le nombre de battements par seconde est l'écart des deux fréquences.",
    code: `/// Deux sinusoïdes proches : le volume pulse à la fréquence de l'écart.
instrument Battements {
    reglage ecart : Hz = 3 Hz dans 0.5 Hz .. 20 Hz courbe log etiquette "Écart des deux fréquences"
    soit a = sinus(440 Hz)
    soit b = sinus(440 Hz + ecart)
    sortie = (a + b) * 0.2
}
` },
  { id: "formes", niveau: "Découverte", titre: "Quatre formes d'onde", texte: "Sinus, triangle, carré, dent de scie : même hauteur, quatre timbres. Regarde l'oscilloscope et le spectre : plus l'onde a d'angles, plus elle a d'harmoniques.",
    code: `/// Quatre formes d'onde, une seule hauteur.
instrument Formes {
    reglage frequence : Hz = 220 Hz dans 55 Hz .. 1760 Hz courbe log etiquette "Fréquence"
    reglage forme : Entier = 0 dans 0 .. 3 pas 1 choix ["Sinus", "Triangle", "Carré", "Dent de scie"] etiquette "Forme d'onde"
    reglage volume : Ratio = 20% dans 0 .. 1 lissage 20 ms

    soit onde = si forme == 0 alors sinus(frequence) sinon si forme == 1 alors triangle(frequence) sinon si forme == 2 alors carre(frequence) sinon dent(frequence)
    sortie = onde * volume
}
` },
  { id: "tremolo", niveau: "Programmation", titre: "Trémolo : modulation d'amplitude", texte: "Un LFO (oscillateur lent) fait varier le volume. C'est une modulation d'amplitude : on multiplie deux signaux.",
    code: `/// Trémolo : le volume est multiplié par un oscillateur lent.
instrument Tremolo {
    reglage frequence : Hz = 330 Hz dans 55 Hz .. 1760 Hz courbe log
    reglage vitesse : Hz = 5 Hz dans 0.2 Hz .. 20 Hz courbe log etiquette "Vitesse du trémolo"
    reglage profondeur : Ratio = 70% dans 0 .. 1 etiquette "Profondeur"
    soit variation = 1 - profondeur * (0.5 + 0.5 * lfo(vitesse))
    sortie = sinus(frequence) * variation * 0.25
}
` },
  { id: "vibrato", niveau: "Programmation", titre: "Vibrato : modulation de fréquence lente", texte: "Le même LFO fait varier la hauteur, en demi-tons. Une modulation de fréquence lente : un vibrato.",
    code: `/// Vibrato : la fréquence oscille de quelques dixièmes de demi-ton.
instrument Vibrato {
    reglage frequence : Hz = 440 Hz dans 55 Hz .. 1760 Hz courbe log
    reglage vitesse : Hz = 5.5 Hz dans 0.5 Hz .. 12 Hz courbe log
    reglage amplitude : Ratio = 0.4 dans 0 .. 3 etiquette "Amplitude du vibrato (demi-tons)"
    soit decalage = amplitude * lfo(vitesse) / 12
    sortie = sinus(frequence * 2 ^ decalage) * 0.25
}
` },
  { id: "vent", niveau: "Programmation", titre: "Le vent : bruit filtré", texte: "Un bruit blanc contient toutes les fréquences à égalité. Un filtre passe-bande n'en garde qu'une bande : on entend un souffle plus ou moins aigu.",
    code: `/// Du vent : un bruit blanc dont on garde une bande de fréquences.
instrument Vent {
    reglage centre : Hz = 800 Hz dans 100 Hz .. 8 kHz courbe log etiquette "Fréquence du vent"
    reglage etroitesse : Ratio = 3 dans 0.5 .. 20 courbe log etiquette "Finesse"
    reglage volume : Ratio = 25% dans 0 .. 1 lissage 20 ms

    soit souffle = bruit_blanc(graine: 7)
    soit bande = souffle -> passe_bande(centre: centre, q: etroitesse)
    sortie = bande * volume
}
` },
  { id: "bruit-rose", niveau: "Programmation", titre: "Bruit rose et filtre passe-bas", texte: "Le bruit rose baisse de 3 dB par octave : il sonne plus naturel que le blanc. On le ferme avec un passe-bas.",
    code: `/// Bruit rose, adouci par un filtre passe-bas.
instrument BruitRose {
    reglage coupure : Hz = 2 kHz dans 100 Hz .. 12 kHz courbe log
    reglage resonance : Ratio = 2 dans 0.7 .. 12 courbe log
    soit bruit = bruit_rose() -> passe_bas(coupure: coupure, q: resonance)
    sortie = bruit * 0.9
}
` },
  { id: "wah", niveau: "Programmation", titre: "Wah : un filtre qui s'ouvre et se ferme", texte: "Une dent de scie, un filtre passe-bas, et un LFO qui fait osciller la coupure. Le geste de base de l'électro.",
    code: `/// Une dent de scie que l'on ouvre et que l'on ferme, comme un coup de pédale wah.
instrument Wah {
    reglage frequence : Hz = la2 dans 40 Hz .. 800 Hz courbe log
    reglage vitesse : Hz = 0.5 Hz dans 0.05 Hz .. 6 Hz courbe log etiquette "Vitesse du balayage"
    reglage resonance : Ratio = 6 dans 0.7 .. 18 courbe log
    reglage volume : Ratio = 25% dans 0 .. 1 lissage 20 ms

    // la coupure oscille entre une et quatre octaves au-dessus de 200 Hz
    soit coupure = 200 Hz * 2 ^ (2.5 + 1.5 * lfo(vitesse))
    soit son = dent(frequence) -> passe_bas(coupure: coupure, q: resonance)
    sortie = son * volume
}
` },
  { id: "stereo", niveau: "Découverte", titre: "Deux canaux", texte: "Un faisceau [a, b] envoie un signal à gauche et un autre à droite. Ici, une quinte : 220 Hz à gauche, 330 Hz à droite (rapport 2/3 au-dessus).",
    code: `/// Une quinte en stéréo : gauche et droite jouent deux hauteurs différentes.
instrument Quinte {
    reglage volume : Ratio = 20% dans 0 .. 1 lissage 20 ms
    sortie = [sinus(220 Hz), sinus(330 Hz)] * volume
}
` },
  { id: "echo", niveau: "Recherche", titre: "Écho avec rétroaction", texte: "Un signal récursif (soit rec) : la sortie est renvoyée dans une ligne à retard. La rétroaction doit toujours passer par un retard, sinon le compilateur refuse la boucle. Source de test : clics.",
    code: `/// Un écho : chaque répétition revient plus faible, grâce à un retard dans la boucle.
effet Echo {
    entree x : Audio
    reglage duree : s = 350 ms dans 20 ms .. 900 ms courbe log etiquette "Durée de l'écho"
    reglage retour : Ratio = 55% dans 0 .. 90% etiquette "Répétitions"
    soit rec y = x + retour * retarde(y, duree, max: 1 s)
    sortie = y * 0.7
}
` },
  { id: "note-enveloppe", niveau: "Programmation", titre: "Une note qui a une forme (ADSR)", texte: "Joue au clavier : la note monte (attaque), retombe (déclin), tient (soutien) puis s'éteint (relâche). Change les quatre réglages.",
    code: `/// Une note qui a une forme : elle monte, retombe, tient, puis s'éteint.
instrument NoteEnveloppee {
    entree notes : Evenement<Note>
    reglage attaque : s = 20 ms dans 1 ms .. 2 s courbe log
    reglage declin : s = 150 ms dans 1 ms .. 2 s courbe log
    reglage soutien : Ratio = 60% dans 0 .. 1
    reglage relache : s = 400 ms dans 1 ms .. 4 s courbe log

    polyphonie 4 voix vol(plus_ancienne)
    voix (n : Note) {
        soit forme = adsr(porte: n.porte, attaque: attaque, declin: declin, soutien: soutien, relache: relache)
        sortie = sinus(n.hauteur) * forme * n.vitesse * 30%
    }
    sortie = voix.somme
}
` },
  { id: "orgue", niveau: "Programmation", titre: "Orgue : synthèse additive", texte: "Un son est une somme d'harmoniques. Ici, trois harmoniques dont on règle la part : la couleur de l'orgue.",
    code: `/// Un petit orgue : trois harmoniques, une enveloppe.
instrument Orgue {
    entree notes : Evenement<Note>
    reglage couleur : Ratio = 40% dans 0 .. 100% etiquette "Couleur (harmoniques)"
    polyphonie 8 voix vol(plus_ancienne)
    voix (n : Note) {
        soit f = n.hauteur
        soit corps = sinus(f) + couleur * 0.5 * sinus(2 * f) + couleur * 0.25 * sinus(3 * f)
        soit forme = adsr(porte: n.porte, attaque: 15 ms, declin: 100 ms, soutien: 80%, relache: 250 ms)
        sortie = corps * forme * n.vitesse * 18%
    }
    sortie = voix.somme
}
` },
  { id: "basse", niveau: "Programmation", titre: "Basse : synthèse soustractive", texte: "On part d'un son riche (dent de scie) et on retire des harmoniques avec un filtre. L'enveloppe ouvre le filtre à chaque note.",
    code: `/// Basse soustractive : le filtre s'ouvre à chaque note, puis se referme.
instrument Basse {
    entree notes : Evenement<Note>
    reglage resonance : Ratio = 4 dans 0.7 .. 14 courbe log
    reglage ouverture : Hz = 2500 Hz dans 200 Hz .. 8 kHz courbe log etiquette "Ouverture du filtre"
    polyphonie 4 voix vol(plus_ancienne)
    voix (n : Note) {
        soit env = adsr(porte: n.porte, attaque: 5 ms, declin: 250 ms, soutien: 20%, relache: 200 ms)
        soit son = dent(n.hauteur / 2) -> passe_bas(coupure: 120 Hz + ouverture * env, q: resonance)
        sortie = son * env * n.vitesse * 25%
    }
    sortie = voix.somme
}
` },
  { id: "fm", niveau: "Recherche", titre: "Synthèse FM", texte: "Une onde fait varier la fréquence d'une autre. Le rapport règle le caractère (harmonique ou cloche), l'indice règle la brillance.",
    code: `/// Synthèse FM : une onde en fait varier la fréquence d'une autre. L'indice règle la richesse du timbre.
instrument SynthFM {
    entree notes : Evenement<Note>
    reglage rapport : Ratio = 2 dans 0.5 .. 8 pas 0.5 etiquette "Rapport modulante / porteuse"
    reglage indice : Ratio = 3 dans 0 .. 12 etiquette "Indice de modulation"
    reglage declin : s = 600 ms dans 50 ms .. 3 s courbe log

    polyphonie 6 voix vol(plus_ancienne)
    voix (n : Note) {
        soit f = n.hauteur
        soit forme = adsr(porte: n.porte, attaque: 5 ms, declin: declin, soutien: 0%, relache: 200 ms)
        // l'indice diminue avec l'enveloppe : le son est brillant au début, puis s'adoucit
        soit modulante = sinus(f * rapport) * indice * forme
        soit porteuse = sinus(f + f * rapport * modulante)
        sortie = porteuse * forme * n.vitesse * 25%
    }
    sortie = voix.somme
}
` },
  { id: "reverberation", niveau: "Programmation", titre: "Réverbération", texte: "Quatre peignes et deux diffuseurs écrits en SONORA : la durée demandée est la durée mesurée du déclin. Choisis la source Impulsions pour entendre la salle seule.",
    code: `/// Réverbération : la durée est le temps que met le son à perdre 60 dB.
effet Salle {
    entree source : Audio
    reglage duree : s = 2 s dans 0.3 s .. 8 s courbe log etiquette "Durée de la salle"
    reglage amortissement : Ratio = 50% dans 0 .. 100% etiquette "Absorption des aigus"
    reglage melange : Ratio = 35% dans 0 .. 100% etiquette "Part de salle"
    sortie = source -> reverberation(duree: duree, amortissement: amortissement, melange: melange)
}
` },
  { id: "chorus-phaser", niveau: "Programmation", titre: "Chorus et phaser", texte: "Un chorus puis un phaser. Le chorus mélange deux copies retardées de 15 à 28 ms ; le phaser retourne la phase par quatre filtres passe-tout. Essaie la source Bruit pour entendre les creux du phaser.",
    code: `/// Chorus puis phaser, deux balayages indépendants.
effet Mouvement {
    entree source : Audio
    reglage vitesse_chorus : Hz = 0.8 Hz dans 0.05 Hz .. 6 Hz courbe log etiquette "Vitesse du chorus"
    reglage vitesse_phaser : Hz = 0.3 Hz dans 0.05 Hz .. 4 Hz courbe log etiquette "Vitesse du phaser"
    reglage profondeur : Ratio = 70% dans 0 .. 100% etiquette "Profondeur"
    soit large = source -> chorus(vitesse: vitesse_chorus, profondeur: profondeur, melange: 50%)
    sortie = large -> phaser(vitesse: vitesse_phaser, profondeur: profondeur, melange: 50%)
}
` },
  { id: "saturation", niveau: "Découverte", titre: "Saturation et écrêtage", texte: "Même gain, deux distorsions : la saturation arrondit (harmoniques impairs, comme une lampe), l'écrêtage coupe net. Compare les spectres.",
    code: `/// Deux manières de pousser un son trop loin.
effet Distorsion {
    entree source : Audio
    reglage gain : dB = 18 dB dans 0 dB .. 40 dB etiquette "Gain avant distorsion"
    reglage type : Entier = 0 dans 0 .. 1 pas 1 choix ["Saturation douce", "Écrêtage dur"] etiquette "Type"
    reglage volume : Ratio = 40% dans 0 .. 1 lissage 20 ms
    soit doux = source -> sature(gain: gain)
    soit dur = source -> ecrete(gain: gain)
    sortie = (si type == 0 alors doux sinon dur) * volume
}
` },
  { id: "echo-bibliotheque", niveau: "Découverte", titre: "Écho de la bibliothèque", texte: "Le module echo remplace les huit lignes de l'exemple précédent : même calcul, une seule ligne.",
    code: `/// L'écho de la bibliothèque : chaque répétition revient plus faible.
effet EchoSimple {
    entree source : Audio
    reglage duree : s = 350 ms dans 20 ms .. 1.5 s courbe log etiquette "Durée"
    reglage retour : Ratio = 55% dans 0 .. 90% etiquette "Répétitions"
    sortie = source -> echo(duree: duree, retour: retour, melange: 50%)
}
` },
  { id: "corde", niveau: "Découverte", titre: "Une corde pincée", texte: "Karplus-Strong : une salve de bruit tourne dans une boucle de retard dont la longueur fixe la hauteur. Change l'amortissement pour entendre une corde sèche ou résonnante. Appuie sur Exécuter à nouveau pour la pincer.",
    code: `/// Une corde pincée au démarrage du programme.
instrument Corde {
    reglage hauteur : Hz = la2 dans 55 Hz .. 1760 Hz courbe log etiquette "Hauteur"
    reglage amortissement : Ratio = 30% dans 0 .. 100% etiquette "Amortissement"
    sortie = corde_pincee(hauteur, amortissement)
}
` },
  { id: "additive", niveau: "Programmation", titre: "Synthèse additive", texte: "Huit harmoniques dont les amplitudes décroissent en 1/k : on obtient une dent de scie, construite à la main. Modifie la table pour changer le timbre.",
    code: `/// Huit harmoniques, amplitudes en 1/k : une dent de scie approchée.
table amplitudes = [1, 0.5, 0.333, 0.25, 0.2, 0.167, 0.143, 0.125]
instrument Additif {
    reglage frequence : Hz = 220 Hz dans 55 Hz .. 1760 Hz courbe log
    reglage volume : Ratio = 20% dans 0 .. 1 lissage 20 ms
    sortie = additive(frequence, amplitudes) * volume
}
` },
];
