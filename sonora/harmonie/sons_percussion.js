// Les percussions du monde et les effets sonores de la bibliothèque de Pistes, écrits en SONORA, entièrement synthétisés : aucun enregistrement, aucun son protégé.
// La hauteur de la note accorde les percussions (conga, bongo, bloc de bois) ou règle la hauteur des effets. Ils ne sont pas proposés comme instruments d'accords dans Harmonie (voir son.js).

export const SONS_PERCUSSION = {
  conga: { nom: "Conga", note: 55, famille: "perc", code: `/// Conga : une peau frappée, dont la hauteur retombe vite, plus un claquement de la main.
instrument Conga {
    entree notes : Evenement<Note>
    polyphonie 6 voix vol(plus_ancienne)
    voix (n : Note) {
        soit f = n.hauteur
        soit peau = sinus(rampe(f * 1.5, f, 40 ms)) * ar(1 ms, 260 ms)
        soit main = bruit_blanc(graine: 3) -> passe_bande(centre: 1800 Hz, q: 1.5)
        sortie = (peau + 0.5 * main * ar(1 ms, 25 ms)) * n.vitesse * 55%
    }
    sortie = voix.somme
}` },
  bongo: { nom: "Bongo", note: 72, famille: "perc", code: `/// Bongo : plus petit et plus aigu que la conga, il s'éteint plus vite.
instrument Bongo {
    entree notes : Evenement<Note>
    polyphonie 6 voix vol(plus_ancienne)
    voix (n : Note) {
        soit f = n.hauteur
        soit peau = sinus(rampe(f * 1.4, f, 25 ms)) * ar(1 ms, 130 ms)
        soit main = bruit_blanc(graine: 5) -> passe_bande(centre: 3000 Hz, q: 1.5)
        sortie = (peau + 0.4 * main * ar(1 ms, 18 ms)) * n.vitesse * 55%
    }
    sortie = voix.somme
}` },
  blocBois: { nom: "Bloc de bois", note: 76, famille: "perc", code: `/// Bloc de bois : un son sec, deux partiels, qui ne dure qu'un instant.
instrument BlocBois {
    entree notes : Evenement<Note>
    polyphonie 6 voix vol(plus_ancienne)
    voix (n : Note) {
        soit f = n.hauteur
        sortie = (sinus(f) + 0.5 * sinus(f * 2.4)) * ar(1 ms, 70 ms) * n.vitesse * 40%
    }
    sortie = voix.somme
}` },
  trianglePerc: { nom: "Triangle", note: 84, famille: "perc", code: `/// Triangle : des partiels métalliques qui ne se superposent pas en harmoniques, et qui sonnent longtemps.
instrument TrianglePerc {
    entree notes : Evenement<Note>
    polyphonie 6 voix vol(plus_ancienne)
    voix (n : Note) {
        soit f = n.hauteur
        sortie = (sinus(f) + 0.6 * sinus(f * 2.76) + 0.4 * sinus(f * 5.4) + 0.25 * sinus(f * 8.9)) * ar(1 ms, 2200 ms) * n.vitesse * 16%
    }
    sortie = voix.somme
}` },
  tambourin: { nom: "Tambourin", note: 60, famille: "perc", code: `/// Tambourin : un souffle de grelots, très aigu, sans hauteur précise.
instrument Tambourin {
    entree notes : Evenement<Note>
    polyphonie 6 voix vol(plus_ancienne)
    voix (n : Note) {
        soit grelots = bruit_blanc(graine: 8) -> passe_haut(coupure: 6 kHz)
        sortie = grelots * ar(2 ms, 160 ms) * n.vitesse * 30%
    }
    sortie = voix.somme
}` },
  cymbale: { nom: "Cymbale", note: 60, famille: "perc", code: `/// Cymbale : du bruit autour de 7 000 Hz, qui s'éteint lentement.
instrument Cymbale {
    entree notes : Evenement<Note>
    polyphonie 6 voix vol(plus_ancienne)
    voix (n : Note) {
        soit souffle = bruit_blanc(graine: 12) -> passe_bande(centre: 7 kHz, q: 0.8)
        sortie = souffle * ar(2 ms, 1800 ms) * n.vitesse * 35%
    }
    sortie = voix.somme
}` },
  gong: { nom: "Gong", note: 40, famille: "perc", code: `/// Gong : des partiels très graves et très longs.
instrument Gong {
    entree notes : Evenement<Note>
    polyphonie 6 voix vol(plus_ancienne)
    voix (n : Note) {
        sortie = cloche(n.hauteur * 2, 6 s) * n.vitesse * 40%
    }
    sortie = voix.somme
}` },
  bol: { nom: "Bol chantant", note: 60, famille: "perc", code: `/// Bol chantant : trois partiels qui ne sont pas des harmoniques, comme les bols tibétains.
instrument Bol {
    entree notes : Evenement<Note>
    polyphonie 6 voix vol(plus_ancienne)
    voix (n : Note) {
        soit f = n.hauteur
        sortie = (sinus(f) * ar(5 ms, 4 s) + 0.5 * sinus(f * 2.71) * ar(5 ms, 2500 ms) + 0.25 * sinus(f * 5.4) * ar(5 ms, 1200 ms)) * n.vitesse * 22%
    }
    sortie = voix.somme
}` },
  laser: { nom: "Laser", note: 72, famille: "fx", code: `/// Laser : une hauteur qui s'effondre très vite.
instrument Laser {
    entree notes : Evenement<Note>
    polyphonie 6 voix vol(plus_ancienne)
    voix (n : Note) {
        soit f = n.hauteur
        sortie = sinus(rampe(f * 8, f, 250 ms)) * ar(1 ms, 300 ms) * n.vitesse * 35%
    }
    sortie = voix.somme
}` },
  sirene: { nom: "Sirène", note: 72, famille: "fx", code: `/// Sirène : une hauteur qui monte et descend, deux fois par seconde.
instrument Sirene {
    entree notes : Evenement<Note>
    polyphonie 6 voix vol(plus_ancienne)
    voix (n : Note) {
        soit f = n.hauteur
        soit forme = adsr(porte: n.porte, attaque: 30 ms, declin: 100 ms, soutien: 90%, relache: 200 ms)
        sortie = triangle(f * (1 + 0.3 * lfo(0.8 Hz))) * forme * n.vitesse * 30%
    }
    sortie = voix.somme
}` },
  vent: { nom: "Vent", note: 60, famille: "fx", code: `/// Vent : un bruit rose dont le filtre se déplace lentement.
instrument Vent {
    entree notes : Evenement<Note>
    polyphonie 6 voix vol(plus_ancienne)
    voix (n : Note) {
        soit forme = adsr(porte: n.porte, attaque: 700 ms, declin: 400 ms, soutien: 80%, relache: 900 ms)
        soit souffle = bruit_rose(graine: 4) -> passe_bande(centre: 600 Hz * (1 + 0.8 * lfo(0.25 Hz)), q: 2)
        sortie = souffle * forme * n.vitesse * 90%
    }
    sortie = voix.somme
}` },
  montee: { nom: "Montée (riser)", note: 60, famille: "fx", code: `/// Montée : du bruit dont le filtre monte pendant trois secondes, pour annoncer un changement.
instrument Montee {
    entree notes : Evenement<Note>
    polyphonie 6 voix vol(plus_ancienne)
    voix (n : Note) {
        soit souffle = bruit_blanc(graine: 6) -> passe_bande(centre: rampe(200 Hz, 6 kHz, 3 s), q: 2)
        sortie = souffle * rampe(0.05, 1, 3 s) * ar(10 ms, 3200 ms) * n.vitesse * 45%
    }
    sortie = voix.somme
}` },
  impact: { nom: "Impact grave", note: 36, famille: "fx", code: `/// Impact : une grosse caisse très grave suivie d'un souffle sourd.
instrument Impact {
    entree notes : Evenement<Note>
    polyphonie 6 voix vol(plus_ancienne)
    voix (n : Note) {
        soit f = n.hauteur
        soit coup = sinus(rampe(f * 3, f, 120 ms)) * ar(1 ms, 900 ms)
        soit souffle = bruit_rose(graine: 2) -> passe_bas(coupure: 250 Hz)
        sortie = (coup + 0.4 * souffle * ar(1 ms, 600 ms)) * n.vitesse * 60%
    }
    sortie = voix.somme
}` },
  goutte: { nom: "Goutte d'eau", note: 84, famille: "fx", code: `/// Goutte d'eau : une petite hauteur qui monte très vite.
instrument Goutte {
    entree notes : Evenement<Note>
    polyphonie 6 voix vol(plus_ancienne)
    voix (n : Note) {
        soit f = n.hauteur
        sortie = sinus(rampe(f * 0.8, f * 1.6, 60 ms)) * ar(1 ms, 160 ms) * n.vitesse * 40%
    }
    sortie = voix.somme
}` },
  blip: { nom: "Blip 8 bits", note: 76, famille: "fx", code: `/// Blip : une onde carrée courte, comme les jeux vidéo des années 1980.
instrument Blip {
    entree notes : Evenement<Note>
    polyphonie 6 voix vol(plus_ancienne)
    voix (n : Note) {
        soit f = n.hauteur
        sortie = carre(f) * ar(1 ms, 90 ms) * n.vitesse * 16%
    }
    sortie = voix.somme
}` },
  tonnerre: { nom: "Tonnerre", note: 40, famille: "fx", code: `/// Tonnerre : un bruit rose sourd qui roule pendant trois secondes.
instrument Tonnerre {
    entree notes : Evenement<Note>
    polyphonie 6 voix vol(plus_ancienne)
    voix (n : Note) {
        soit roule = bruit_rose(graine: 9) -> passe_bas(coupure: 320 Hz)
        sortie = roule * ar(60 ms, 2800 ms) * n.vitesse * 90%
    }
    sortie = voix.somme
}` },
};
