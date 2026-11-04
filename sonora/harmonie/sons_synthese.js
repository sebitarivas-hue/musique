// Les sons de synthèse d'Harmonie, écrits en SONORA, pour jouer des accords de rap, de pop, de reggae, de house : une basse 808, une sous-basse, un lead, une nappe sombre,
// un piano électrique, un pincé, un orgue rock, des cloches, un « stab » de house. Ils s'ajoutent aux instruments enregistrés (echantillons.js) et aux trois sons de secours de son.js.
// Chaque programme est un instrument à voix de SONORA, compilé et rendu comme les autres (rendreSuite) : on peut l'ouvrir dans le Studio pour voir comment il est fait.

export const SONS_SYNTHESE = {
  basse808: { nom: "Basse 808", code: `/// Basse 808 : un sinus dont la hauteur retombe vite, un peu saturé, qui tient la note.
instrument Basse808 {
    entree notes : Evenement<Note>
    polyphonie 2 voix vol(plus_ancienne)
    voix (n : Note) {
        soit f = n.hauteur
        soit corps = sinus(rampe(f * 2, f, 45 ms)) -> sature(gain: 7 dB)
        soit forme = adsr(porte: n.porte, attaque: 3 ms, declin: 500 ms, soutien: 60%, relache: 140 ms)
        sortie = corps * forme * n.vitesse * 40%
    }
    sortie = voix.somme
}` },
  sub: { nom: "Sous-basse", code: `/// Sous-basse : un sinus pur, rond, pour soutenir les accords.
instrument SousBasse {
    entree notes : Evenement<Note>
    polyphonie 2 voix vol(plus_ancienne)
    voix (n : Note) {
        soit forme = adsr(porte: n.porte, attaque: 8 ms, declin: 200 ms, soutien: 85%, relache: 120 ms)
        sortie = (sinus(n.hauteur) + 0.18 * sinus(2 * n.hauteur)) * forme * n.vitesse * 38%
    }
    sortie = voix.somme
}` },
  lead: { nom: "Lead synthé", code: `/// Lead : deux dents de scie à peine désaccordées, un vibrato léger, un filtre qui s'ouvre.
instrument Lead {
    entree notes : Evenement<Note>
    polyphonie 4 voix vol(plus_ancienne)
    voix (n : Note) {
        soit f = n.hauteur * (1 + 0.003 * lfo(5.5 Hz))
        soit corps = unisson(f, 0.4%) -> passe_bas(coupure: 3200 Hz, q: 1.1)
        soit forme = adsr(porte: n.porte, attaque: 6 ms, declin: 180 ms, soutien: 65%, relache: 220 ms)
        sortie = corps * forme * n.vitesse * 22%
    }
    sortie = voix.somme
}` },
  nappe: { nom: "Nappe sombre", code: `/// Nappe sombre : cinq dents de scie désaccordées, un filtre fermé, une montée lente. Le fond des morceaux de rap sombres et de trap.
instrument NappeSombre {
    entree notes : Evenement<Note>
    polyphonie 8 voix vol(plus_ancienne)
    voix (n : Note) {
        soit corps = unisson(n.hauteur, 0.9%) -> passe_bas(coupure: 1100 Hz, q: 0.8)
        soit forme = adsr(porte: n.porte, attaque: 420 ms, declin: 400 ms, soutien: 80%, relache: 800 ms)
        sortie = corps * forme * n.vitesse * 16%
    }
    sortie = voix.somme
}` },
  pianoElec: { nom: "Piano électrique", code: `/// Piano électrique : un son rond avec un petit tintement au début, comme les pianos électriques des années 1970.
instrument PianoElectrique {
    entree notes : Evenement<Note>
    polyphonie 8 voix vol(plus_ancienne)
    voix (n : Note) {
        soit f = n.hauteur
        soit corps = sinus(f) + 0.45 * sinus(2 * f) * ar(1 ms, 400 ms) + 0.18 * sinus(3 * f) * ar(1 ms, 180 ms)
        soit tinte = 0.07 * sinus(14 * f) * ar(1 ms, 45 ms)
        soit forme = adsr(porte: n.porte, attaque: 3 ms, declin: 1.4 s, soutien: 22%, relache: 300 ms)
        sortie = (corps * forme + tinte) * n.vitesse * 13%
    }
    sortie = voix.somme
}` },
  pluck: { nom: "Cordes pincées", code: `/// Cordes pincées : le modèle de Karplus-Strong, une corde qu'on pince et qui s'éteint.
instrument Pince {
    entree notes : Evenement<Note>
    polyphonie 8 voix vol(plus_ancienne)
    voix (n : Note) {
        soit forme = adsr(porte: n.porte, attaque: 1 ms, declin: 900 ms, soutien: 10%, relache: 150 ms)
        sortie = corde_pincee(n.hauteur, 0.4) * forme * n.vitesse * 60%
    }
    sortie = voix.somme
}` },
  orgueRock: { nom: "Orgue rock", code: `/// Orgue rock : quatre harmoniques de tirettes, un trémolo qui tourne, un peu de saturation.
instrument OrgueRock {
    entree notes : Evenement<Note>
    polyphonie 8 voix vol(plus_ancienne)
    voix (n : Note) {
        soit f = n.hauteur
        soit corps = (sinus(f) + 0.8 * sinus(2 * f) + 0.55 * sinus(3 * f) + 0.35 * sinus(4 * f)) * (1 + 0.12 * lfo(6.2 Hz)) -> sature(gain: 4 dB)
        soit forme = adsr(porte: n.porte, attaque: 6 ms, declin: 60 ms, soutien: 90%, relache: 90 ms)
        sortie = corps * forme * n.vitesse * 9%
    }
    sortie = voix.somme
}` },
  cloches: { nom: "Cloches", code: `/// Cloches : les partiels d'une cloche, pour les arpèges légers du trap et de la pop.
instrument Cloches {
    entree notes : Evenement<Note>
    polyphonie 8 voix vol(plus_ancienne)
    voix (n : Note) {
        sortie = cloche(n.hauteur * 2, 2.2 s) * n.vitesse * 40%
    }
    sortie = voix.somme
}` },
  stab: { nom: "Stab house", code: `/// Stab : un accord bref et plein, la signature de la house.
instrument Stab {
    entree notes : Evenement<Note>
    polyphonie 8 voix vol(plus_ancienne)
    voix (n : Note) {
        soit corps = unisson(n.hauteur, 1%) -> passe_bas(coupure: 2600 Hz, q: 1.0)
        soit forme = adsr(porte: n.porte, attaque: 3 ms, declin: 140 ms, soutien: 8%, relache: 90 ms)
        sortie = corps * forme * n.vitesse * 17%
    }
    sortie = voix.somme
}` },
};
