// Parcours de l'Academy : unités, leçons, exercices. Chaque exercice a un programme de départ (qui se compile mais ne réussit pas),
// des critères mesurés sur le son, un indice et une solution. Les tests vérifient que chaque départ échoue et chaque solution réussit.
export const UNITES = [
  { id: "son", titre: "Le son : hauteur et volume" },
  { id: "timbre", titre: "Le timbre : harmoniques et filtres" },
  { id: "mouvement", titre: "Le mouvement : battements, trémolo, enveloppe" },
  { id: "construire", titre: "Construire : effets et polyphonie" },
];

export const LECONS = [
  { id: "hauteur", unite: "son", titre: "La hauteur : un son pur", duree: "10 min",
    objectif: "Écrire un instrument qui joue une fréquence précise.",
    cours: [
      "Un son pur est une sinusoïde. Sa fréquence, en hertz, est le nombre de fois que l'onde se répète par seconde. Le la du diapason est à 440 Hz. Doubler la fréquence monte d'une octave : 880 Hz est le la de l'octave au-dessus.",
      "En SONORA, `sinus(440 Hz)` produit cette onde. `sortie` est ce que l'instrument envoie aux haut-parleurs. On multiplie par un nombre plus petit que 1 pour baisser le volume.",
    ],
    exemple: `instrument SonPur {
    soit onde = sinus(440 Hz)
    sortie = onde * 0.2
}
`,
    exercice: { consigne: "Fais jouer le la une octave plus haut, à 880 Hz, en gardant le volume de départ.",
      depart: `instrument SonPur {
    soit onde = sinus(440 Hz)
    sortie = onde * 0.2
}
`,
      criteres: [
        { type: "f0", cible: 880, tol: 0.01, texte: "La hauteur mesurée est 880 Hz" },
        { type: "rms", min: -20, max: -14, texte: "Le volume reste modéré (niveau efficace entre -20 et -14 dB)" },
      ],
      indice: "Change la fréquence dans sinus(...). Une octave plus haut, c'est le double.",
      solution: `instrument SonPur {
    soit onde = sinus(880 Hz)
    sortie = onde * 0.2
}
` } },

  { id: "volume", unite: "son", titre: "Le volume et les décibels", duree: "10 min",
    objectif: "Régler le niveau d'un son par son amplitude, et lire ce niveau en décibels.",
    cours: [
      "L'amplitude d'une sinusoïde est sa hauteur maximale. On la compare à 1, le maximum que la sortie peut porter sans écrêtage. Le niveau en décibels vaut 20 fois le logarithme décimal de l'amplitude : une amplitude de 1 fait 0 dB, de 0,5 fait environ -6 dB, de 0,1 fait -20 dB.",
      "Diviser l'amplitude par deux retire donc 6 dB. L'oreille entend à peu près un doublement de volume pour +10 dB, non pour un doublement de l'amplitude.",
    ],
    exemple: `instrument Volume {
    reglage volume : Ratio = 10% dans 0 .. 1 etiquette "Volume"
    sortie = sinus(440 Hz) * volume
}
`,
    exercice: { consigne: "Règle l'amplitude pour que la crête du signal soit à -6 dB, soit une amplitude de 0,5.",
      depart: `instrument Volume {
    sortie = sinus(440 Hz) * 0.05
}
`,
      criteres: [
        { type: "crete", min: -7, max: -5, texte: "La crête est à -6 dB, à un dB près" },
        { type: "f0", cible: 440, tol: 0.01, texte: "La hauteur reste 440 Hz" },
      ],
      indice: "Une amplitude de 0,5 donne -6 dB.",
      solution: `instrument Volume {
    sortie = sinus(440 Hz) * 0.5
}
` } },

  { id: "harmoniques", unite: "timbre", titre: "Les harmoniques", duree: "15 min",
    objectif: "Construire un timbre en additionnant des sinusoïdes.",
    cours: [
      "Un son musical n'est presque jamais une sinusoïde seule. Il contient une fondamentale, qui donne la hauteur, et des harmoniques, des sinusoïdes dont les fréquences sont des multiples entiers de la fondamentale. Leurs amplitudes relatives font le timbre.",
      "Une onde carrée contient seulement les harmoniques impairs (3, 5, 7...), dont l'amplitude décroît comme 1, 1/3, 1/5. En additionnant `sinus(f)`, `sinus(3 f) / 3` et `sinus(5 f) / 5`, on s'en approche. L'harmonique 3 est alors à 20 log(1/3), soit -9,5 dB de la fondamentale.",
    ],
    exemple: `instrument Carre3 {
    soit f = 220 Hz
    soit corps = sinus(f) + sinus(3 * f) / 3
    sortie = corps * 0.2
}
`,
    exercice: { consigne: "Ajoute l'harmonique 5, avec l'amplitude 1/5, au timbre de l'exemple. Les harmoniques pairs doivent rester absents.",
      depart: `instrument Carre {
    soit f = 220 Hz
    soit corps = sinus(f) + sinus(3 * f) / 3
    sortie = corps * 0.2
}
`,
      criteres: [
        { type: "f0", cible: 220, tol: 0.01, texte: "La fondamentale reste 220 Hz" },
        { type: "harm", n: 3, min: -11, max: -8, texte: "L'harmonique 3 est à environ -9,5 dB" },
        { type: "harm", n: 5, min: -16, max: -12, texte: "L'harmonique 5 est à environ -14 dB" },
        { type: "harm", n: 2, min: -200, max: -40, texte: "L'harmonique 2 est absent" },
      ],
      indice: "Ajoute + sinus(5 * f) / 5 dans la somme.",
      solution: `instrument Carre {
    soit f = 220 Hz
    soit corps = sinus(f) + sinus(3 * f) / 3 + sinus(5 * f) / 5
    sortie = corps * 0.2
}
` } },

  { id: "filtre", unite: "timbre", titre: "Filtrer : adoucir un son", duree: "15 min",
    objectif: "Retirer les aigus d'un son riche avec un filtre passe-bas.",
    cours: [
      "Une dent de scie contient tous les harmoniques, d'où son timbre brillant et agressif. Un filtre passe-bas laisse passer les fréquences sous sa coupure et affaiblit celles qui sont au-dessus : le son devient plus sombre.",
      "La brillance se mesure par le centroïde spectral, la fréquence moyenne du spectre pondérée par l'énergie. Plus on baisse la coupure, plus le centroïde baisse. La flèche `->` envoie un signal dans un module : `dent(220 Hz) -> passe_bas(coupure: 600 Hz, q: 0.7)`.",
    ],
    exemple: `instrument Sombre {
    soit son = dent(220 Hz) -> passe_bas(coupure: 2 kHz, q: 0.7)
    sortie = son * 0.2
}
`,
    exercice: { consigne: "Assombris la dent de scie à 220 Hz avec un filtre passe-bas, jusqu'à ce que le centroïde soit sous 600 Hz, sans changer la hauteur.",
      depart: `instrument Brillant {
    soit son = dent(220 Hz)
    sortie = son * 0.2
}
`,
      criteres: [
        { type: "source", motif: "passe_bas", texte: "Le programme utilise un filtre passe-bas" },
        { type: "centroide", min: 150, max: 600, texte: "Le centroïde est sous 600 Hz" },
        { type: "f0", cible: 220, tol: 0.02, texte: "La hauteur reste 220 Hz" },
      ],
      indice: "Écris dent(220 Hz) -> passe_bas(coupure: 400 Hz, q: 0.7).",
      solution: `instrument Sombre {
    soit son = dent(220 Hz) -> passe_bas(coupure: 400 Hz, q: 0.7)
    sortie = son * 0.2
}
` } },

  { id: "bande", unite: "timbre", titre: "Le bruit et la bande de fréquences", duree: "10 min",
    objectif: "Sculpter un bruit pour qu'il sonne autour d'une fréquence choisie.",
    cours: [
      "Un bruit blanc contient toutes les fréquences à parts égales. Un filtre passe-bande ne garde qu'une bande autour de son centre. Plus `q` est grand, plus la bande est étroite et plus on entend une hauteur.",
    ],
    exemple: `instrument Souffle {
    soit b = bruit_blanc(graine: 3) -> passe_bande(centre: 500 Hz, q: 6)
    sortie = b * 0.5
}
`,
    exercice: { consigne: "Centre le souffle sur 1 000 Hz : le pic du spectre doit tomber dans les 5 % autour de cette fréquence.",
      depart: `instrument Souffle {
    soit b = bruit_blanc(graine: 3) -> passe_bande(centre: 500 Hz, q: 6)
    sortie = b * 0.5
}
`,
      criteres: [
        { type: "pic", cible: 1000, tol: 0.05, texte: "Le pic du spectre est à 1 000 Hz, à 5 % près" },
        { type: "crete", min: -40, max: -0.5, texte: "Le signal ne sature pas" },
      ],
      indice: "Change centre: dans passe_bande.",
      solution: `instrument Souffle {
    soit b = bruit_blanc(graine: 3) -> passe_bande(centre: 1000 Hz, q: 6)
    sortie = b * 0.5
}
` } },

  { id: "battements", unite: "mouvement", titre: "Les battements", duree: "10 min",
    objectif: "Produire un volume qui pulse à une vitesse choisie.",
    cours: [
      "Deux sinusoïdes de fréquences proches s'additionnent tantôt en phase, tantôt en opposition. Le volume monte et descend, et le nombre de montées par seconde est l'écart des deux fréquences. C'est ce qu'on écoute quand on accorde deux cordes à l'unisson.",
    ],
    exemple: `instrument Battements {
    soit a = sinus(440 Hz)
    soit b = sinus(445 Hz)
    sortie = (a + b) * 0.2
}
`,
    exercice: { consigne: "Fais battre le son 3 fois par seconde.",
      depart: `instrument Battements {
    soit a = sinus(440 Hz)
    soit b = sinus(440 Hz)
    sortie = (a + b) * 0.2
}
`,
      criteres: [
        { type: "battement", cible: 3, tol: 0.4, texte: "Le volume pulse 3 fois par seconde" },
        { type: "crete", min: -20, max: -1, texte: "Le signal ne sature pas" },
      ],
      indice: "Le battement vaut l'écart entre les deux fréquences : 440 Hz et 443 Hz.",
      solution: `instrument Battements {
    soit a = sinus(440 Hz)
    soit b = sinus(443 Hz)
    sortie = (a + b) * 0.2
}
` } },

  { id: "tremolo", unite: "mouvement", titre: "Le trémolo : un oscillateur lent", duree: "15 min",
    objectif: "Moduler le volume avec un LFO.",
    cours: [
      "Un LFO est un oscillateur trop lent pour s'entendre comme une hauteur. En le multipliant au volume, on crée un trémolo. `lfo(vitesse)` oscille entre -1 et 1 ; `0.5 + 0.5 * lfo(vitesse)` oscille entre 0 et 1.",
    ],
    exemple: `instrument Tremolo {
    soit variation = 0.5 + 0.5 * lfo(4 Hz)
    sortie = sinus(330 Hz) * variation * 0.25
}
`,
    exercice: { consigne: "Fais un trémolo à 6 Hz sur un son de 330 Hz.",
      depart: `instrument Tremolo {
    soit variation = 1
    sortie = sinus(330 Hz) * variation * 0.25
}
`,
      criteres: [
        { type: "battement", cible: 6, tol: 0.5, force: 0.3, texte: "Le volume pulse 6 fois par seconde, nettement" },
        { type: "f0", cible: 330, tol: 0.02, texte: "La hauteur reste 330 Hz" },
      ],
      indice: "Remplace 1 par 0.5 + 0.5 * lfo(6 Hz).",
      solution: `instrument Tremolo {
    soit variation = 0.5 + 0.5 * lfo(6 Hz)
    sortie = sinus(330 Hz) * variation * 0.25
}
` } },

  { id: "enveloppe", unite: "mouvement", titre: "L'enveloppe d'une note", duree: "15 min",
    objectif: "Donner une forme dans le temps à une note avec adsr.",
    cours: [
      "Une note de piano démarre d'un coup et s'éteint doucement, une note de violon peut monter lentement. Cette forme est l'enveloppe. ADSR veut dire attaque (montée), déclin (descente jusqu'au soutien), soutien (niveau tenu tant que la touche est enfoncée) et relâchement (extinction après la touche).",
      "La durée d'attaque change beaucoup la perception : sous 10 ms le son claque, vers 300 ms il se lève comme un coup d'archet.",
    ],
    exemple: `instrument Note {
    entree notes : Evenement<Note>
    polyphonie 4 voix vol(plus_ancienne)
    voix (n : Note) {
        soit forme = adsr(porte: n.porte, attaque: 20 ms, declin: 150 ms, soutien: 60%, relache: 300 ms)
        sortie = sinus(n.hauteur) * forme * n.vitesse * 30%
    }
    sortie = voix.somme
}
`,
    exercice: { consigne: "Rends l'attaque lente : le son doit mettre entre 150 et 450 ms à monter de 10 % à 90 % de son maximum.",
      depart: `instrument Note {
    entree notes : Evenement<Note>
    polyphonie 4 voix vol(plus_ancienne)
    voix (n : Note) {
        soit forme = adsr(porte: n.porte, attaque: 5 ms, declin: 150 ms, soutien: 60%, relache: 300 ms)
        sortie = sinus(n.hauteur) * forme * n.vitesse * 30%
    }
    sortie = voix.somme
}
`,
      criteres: [
        { type: "voix", texte: "L'instrument est polyphonique" },
        { type: "attaque", min: 150, max: 450, texte: "La montée dure entre 150 et 450 ms" },
      ],
      indice: "Augmente attaque: dans adsr, par exemple 300 ms.",
      solution: `instrument Note {
    entree notes : Evenement<Note>
    polyphonie 4 voix vol(plus_ancienne)
    voix (n : Note) {
        soit forme = adsr(porte: n.porte, attaque: 300 ms, declin: 150 ms, soutien: 60%, relache: 300 ms)
        sortie = sinus(n.hauteur) * forme * n.vitesse * 30%
    }
    sortie = voix.somme
}
` } },

  { id: "echo", unite: "construire", titre: "Un écho avec un retard", duree: "20 min",
    objectif: "Écrire un effet dont la sortie revient dans son entrée.",
    cours: [
      "Un écho est un son retardé, ajouté au son d'origine. Si on renvoie la sortie dans l'entrée, chaque répétition est plus faible que la précédente d'un facteur `retour`. Ce retour doit rester sous 1, sinon le son grossit sans fin.",
      "`soit rec y = ...` déclare une valeur récursive, qui peut se citer elle-même. `retarde(y, 300 ms, max: 1 s)` donne y tel qu'il était 300 ms plus tôt.",
    ],
    exemple: `effet Echo {
    entree x : Audio
    soit rec y = x + 0.5 * retarde(y, 300 ms, max: 1 s)
    sortie = y * 0.7
}
`,
    exercice: { consigne: "Écris un effet d'écho qui utilise retarde dans une valeur récursive, avec un retour de 60 %. Il doit rester stable (la crête reste sous 0 dB).",
      depart: `effet Echo {
    entree x : Audio
    sortie = x * 0.7
}
`,
      criteres: [
        { type: "source", motif: "soit\\s+rec\\s", texte: "Le programme déclare une valeur récursive (soit rec)" },
        { type: "source", motif: "retarde\\(", texte: "Le programme utilise retarde" },
        { type: "crete", min: -60, max: -0.5, texte: "Le signal reste sous 0 dB : l'écho est stable" },
      ],
      indice: "Écris soit rec y = x + 0.6 * retarde(y, 300 ms, max: 1 s) puis sortie = y * 0.7.",
      solution: `effet Echo {
    entree x : Audio
    soit rec y = x + 0.6 * retarde(y, 300 ms, max: 1 s)
    sortie = y * 0.7
}
` } },

  { id: "polyphonie", unite: "construire", titre: "La polyphonie", duree: "15 min",
    objectif: "Jouer plusieurs notes à la fois sans saturer.",
    cours: [
      "Un instrument polyphonique alloue une voix à chaque note. Le bloc `voix` décrit une voix ; `voix.somme` additionne toutes les voix. Plus il y a de voix, plus la somme est forte : trois notes à pleine amplitude dépassent 1 et saturent. On règle donc le gain de chaque voix en fonction du nombre de voix.",
    ],
    exemple: `instrument Orgue {
    entree notes : Evenement<Note>
    polyphonie 6 voix vol(plus_ancienne)
    voix (n : Note) {
        sortie = sinus(n.hauteur) * n.vitesse * 20%
    }
    sortie = voix.somme
}
`,
    exercice: { consigne: "Cet instrument sature quand on joue un accord de trois notes et n'a que deux voix. Donne-lui au moins quatre voix et baisse le gain pour que la crête reste sous -1 dB.",
      depart: `instrument Orgue {
    entree notes : Evenement<Note>
    polyphonie 2 voix vol(plus_ancienne)
    voix (n : Note) {
        sortie = sinus(n.hauteur) * n.vitesse * 100%
    }
    sortie = voix.somme
}
`,
      criteres: [
        { type: "voix", texte: "L'instrument est polyphonique" },
        { type: "source", motif: "polyphonie\\s+([4-9]|[1-9][0-9])\\s+voix", texte: "Au moins quatre voix" },
        { type: "crete", min: -40, max: -1, texte: "L'accord de trois notes ne sature pas (crête sous -1 dB)" },
        { type: "rms", min: -35, max: -10, texte: "Le son reste audible (niveau efficace entre -35 et -10 dB)" },
      ],
      indice: "Écris polyphonie 4 voix et remplace 100% par 25%.",
      solution: `instrument Orgue {
    entree notes : Evenement<Note>
    polyphonie 4 voix vol(plus_ancienne)
    voix (n : Note) {
        sortie = sinus(n.hauteur) * n.vitesse * 25%
    }
    sortie = voix.somme
}
` } },
];
export const parId = id => LECONS.find(l => l.id === id);
