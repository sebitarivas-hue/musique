// Catalogue de la Library : les exemples du Studio plus des instruments et effets prêts à l'emploi.
// Chaque entrée est un programme SONORA complet. Les tests le compilent, le rendent, et vérifient qu'il ne sature pas.
import { EXEMPLES } from "../studio/exemples.js";

const rythme = ["percussion", "rythme"];
export const NOUVEAUX = [
  { id: "grosse-caisse", niveau: "Programmation", titre: "Grosse caisse", mots: [...rythme, "kick", "grave"], texte: "Un sinus dont la hauteur chute vite : c'est tout le secret d'une grosse caisse électronique. Joue n'importe quelle touche.",
    code: `/// Grosse caisse : une sinusoïde dont la fréquence descend de quatre fois la hauteur finale à la hauteur finale.
instrument GrosseCaisse {
    entree notes : Evenement<Note>
    reglage hauteur : Hz = 50 Hz dans 30 Hz .. 90 Hz courbe log etiquette "Hauteur finale"
    reglage chute : s = 80 ms dans 20 ms .. 300 ms courbe log etiquette "Vitesse de la chute"
    reglage longueur : s = 350 ms dans 80 ms .. 1.2 s courbe log etiquette "Longueur"
    polyphonie 2 voix vol(plus_ancienne)
    voix (n : Note) {
        soit f = rampe(hauteur * 4, hauteur, chute)
        sortie = sinus(f) * ar(1 ms, longueur) * n.vitesse * 45%
    }
    sortie = voix.somme
}
` },
  { id: "caisse-claire", niveau: "Programmation", titre: "Caisse claire", mots: [...rythme, "snare", "bruit"], texte: "Un bruit filtré pour le timbre métallique, un sinus court pour la peau. Deux enveloppes de longueurs différentes.",
    code: `/// Caisse claire : bruit passe-haut (le timbre) plus un sinus grave et bref (la peau).
instrument CaisseClaire {
    entree notes : Evenement<Note>
    reglage timbre : Hz = 1200 Hz dans 400 Hz .. 5 kHz courbe log etiquette "Brillance du timbre"
    reglage peau : Hz = 190 Hz dans 120 Hz .. 300 Hz courbe log etiquette "Hauteur de la peau"
    polyphonie 2 voix vol(plus_ancienne)
    voix (n : Note) {
        soit souffle = bruit_blanc(graine: 5) -> passe_haut(coupure: timbre, q: 0.7)
        soit corps = sinus(peau) * ar(1 ms, 90 ms)
        sortie = (souffle * ar(1 ms, 160 ms) * 0.6 + corps * 0.5) * n.vitesse * 35%
    }
    sortie = voix.somme
}
` },
  { id: "charleston", niveau: "Programmation", titre: "Charleston", mots: [...rythme, "hat", "aigu"], texte: "Du bruit sans le grave, avec une bosse vers 9 kHz. Raccourcis la longueur pour un charleston fermé.",
    code: `/// Charleston : bruit passe-haut, bosse d'égaliseur vers 9 kHz, enveloppe très brève.
instrument Charleston {
    entree notes : Evenement<Note>
    reglage longueur : s = 70 ms dans 15 ms .. 600 ms courbe log etiquette "Longueur (fermé à ouvert)"
    polyphonie 2 voix vol(plus_ancienne)
    voix (n : Note) {
        soit souffle = bruit_blanc(graine: 9) -> passe_haut(coupure: 7 kHz, q: 0.7)
        soit brillant = souffle -> pic(centre: 9 kHz, q: 2, gain: 6 dB)
        sortie = brillant * ar(1 ms, longueur) * n.vitesse * 25%
    }
    sortie = voix.somme
}
` },
  { id: "metronome", niveau: "Découverte", titre: "Métronome", mots: ["rythme", "clic", "tempo"], texte: "Un train d'impulsions, deux par seconde, que l'on fait sonner dans un filtre étroit : un clic de bois.",
    code: `/// Métronome : des impulsions régulières dans un filtre passe-bande étroit (le filtre étroit les affaiblit : le facteur 40 compense).
instrument Metronome {
    reglage cadence : Hz = 2 Hz dans 0.5 Hz .. 6 Hz courbe log etiquette "Clics par seconde"
    reglage volume : Ratio = 50% dans 0 .. 1 lissage 20 ms
    soit clics = impulsions(cadence)
    sortie = (clics -> passe_bande(centre: 1100 Hz, q: 10)) * volume * 40
}
` },
  { id: "onde-dessinee", niveau: "Programmation", titre: "Une onde dessinée à la main", mots: ["table", "timbre", "synthèse"], texte: "Seize valeurs forment une période d'onde. Change-les pour inventer un timbre. Attention : sans filtre anti-repliement, les notes aiguës sonnent plus dures.",
    code: `/// Une période d'onde de seize valeurs, jouée en boucle.
table dessin = [0, 0.9, 0.6, 0.8, 0.2, -0.4, -0.9, -0.5, -0.2, -0.7, 0.1, 0.5, 0.3, -0.1, -0.3, 0]
instrument OndeDessinee {
    entree notes : Evenement<Note>
    polyphonie 6 voix vol(plus_ancienne)
    voix (n : Note) {
        soit forme = adsr(porte: n.porte, attaque: 10 ms, declin: 200 ms, soutien: 50%, relache: 250 ms)
        sortie = table_onde(dessin, n.hauteur) * forme * n.vitesse * 25%
    }
    sortie = voix.somme
}
` },
  { id: "nappe", niveau: "Programmation", titre: "Nappe", mots: ["pad", "tenu", "doux"], texte: "Deux dents de scie légèrement désaccordées, adoucies par un filtre, avec une attaque lente : le son enveloppant des synthétiseurs.",
    code: `/// Nappe : deux dents de scie désaccordées, filtrées, attaque et relâchement lents.
instrument Nappe {
    entree notes : Evenement<Note>
    reglage ouverture : Hz = 1800 Hz dans 200 Hz .. 8 kHz courbe log etiquette "Ouverture du filtre"
    reglage desaccord : Ratio = 0.4 dans 0 .. 1.5 etiquette "Désaccord (battements)"
    polyphonie 6 voix vol(plus_ancienne)
    voix (n : Note) {
        soit forme = adsr(porte: n.porte, attaque: 600 ms, declin: 400 ms, soutien: 80%, relache: 900 ms)
        soit a = dent(n.hauteur)
        soit b = dent(n.hauteur * (1 + desaccord / 100))
        soit son = (a + b) * 0.5 -> passe_bas(coupure: ouverture, q: 0.9)
        sortie = son * forme * n.vitesse * 22%
    }
    sortie = voix.somme
}
` },
  { id: "sirene", niveau: "Découverte", titre: "Sirène", mots: ["glissando", "rampe"], texte: "Une rampe de fréquence de 300 à 1 500 Hz en deux secondes. Appuie à nouveau sur Exécuter pour la relancer.",
    code: `/// Sirène : la fréquence monte en ligne droite, puis reste en haut.
instrument Sirene {
    reglage bas : Hz = 300 Hz dans 100 Hz .. 800 Hz courbe log etiquette "Fréquence de départ"
    reglage haut : Hz = 1500 Hz dans 400 Hz .. 4 kHz courbe log etiquette "Fréquence d'arrivée"
    reglage duree : s = 2 s dans 0.3 s .. 8 s courbe log etiquette "Durée de la montée"
    sortie = sinus(rampe(bas, haut, duree)) * 0.3
}
` },
  { id: "va-et-vient", niveau: "Découverte", titre: "Va-et-vient stéréo", mots: ["stéréo", "espace", "panoramique"], texte: "Le son se promène de la gauche à la droite. Mets un casque pour l'entendre.",
    code: `/// Panoramique automatique : un LFO lent règle la position entre la gauche et la droite.
instrument VaEtVient {
    reglage vitesse : Hz = 0.4 Hz dans 0.05 Hz .. 4 Hz courbe log etiquette "Vitesse du va-et-vient"
    reglage frequence : Hz = 330 Hz dans 55 Hz .. 1760 Hz courbe log
    sortie = panoramique(sinus(frequence) * 0.3, lfo(vitesse))
}
` },
  { id: "wah-automatique", niveau: "Recherche", titre: "Wah automatique", mots: ["filtre", "dynamique", "guitare"], texte: "Le filtre s'ouvre quand le son entrant est fort et se ferme quand il faiblit : le niveau du signal commande lui-même la coupure.",
    code: `/// Wah automatique : le niveau efficace de l'entrée pilote la coupure d'un filtre passe-bas.
effet WahAutomatique {
    entree source : Audio
    reglage sensibilite : Ratio = 6 dans 0 .. 20 etiquette "Sensibilité"
    reglage resonance : Ratio = 4 dans 0.7 .. 12 courbe log
    soit env = niveau(source, 40 ms)
    soit coupure = min(300 Hz + env * sensibilite * 3000 Hz, 12 kHz)
    sortie = source -> passe_bas(coupure: coupure, q: resonance)
}
` },
  { id: "filtre-un-pole", niveau: "Recherche", titre: "Un filtre écrit à la main", mots: ["filtre", "retard", "récursif"], texte: "Un filtre passe-bas du premier ordre : chaque échantillon est mélangé au précédent. z1 est le retard d'un échantillon.",
    code: `/// Filtre à un pôle : y = (1 - a) x + a y(précédent). Plus a est proche de 1, plus le son est sombre.
effet UnPole {
    entree source : Audio
    reglage memoire : Ratio = 0.9 dans 0 .. 0.995 etiquette "Mémoire du filtre"
    soit rec y = (1 - memoire) * source + memoire * z1(y)
    sortie = y
}
` },
  { id: "encoche", niveau: "Découverte", titre: "Encoche", mots: ["filtre", "creux", "bruit"], texte: "Un filtre coupe-bande creuse le spectre autour d'une fréquence. Essaie-le sur du bruit blanc : on entend le trou.",
    code: `/// Coupe-bande : retire une bande de fréquences autour du centre.
effet Encoche {
    entree source : Audio
    reglage centre : Hz = 1000 Hz dans 100 Hz .. 8 kHz courbe log etiquette "Fréquence retirée"
    reglage finesse : Ratio = 4 dans 0.5 .. 20 courbe log etiquette "Finesse de l'encoche"
    sortie = source -> coupe_bande(centre: centre, q: finesse)
}
` },
  { id: "egaliseur", niveau: "Programmation", titre: "Égaliseur à trois bandes", mots: ["filtre", "mixage", "égaliseur"], texte: "Trois filtres en cloche en série : graves, médiums, aigus. Chaque réglage monte ou baisse sa bande en décibels.",
    code: `/// Égaliseur : trois pics de 120 Hz, 1 kHz et 6 kHz, de -12 à +12 dB.
effet Egaliseur {
    entree source : Audio
    reglage graves : dB = 0 dB dans -12 dB .. 12 dB etiquette "Graves (120 Hz)"
    reglage mediums : dB = 0 dB dans -12 dB .. 12 dB etiquette "Médiums (1 kHz)"
    reglage aigus : dB = 0 dB dans -12 dB .. 12 dB etiquette "Aigus (6 kHz)"
    soit a = source -> pic(centre: 120 Hz, q: 0.8, gain: graves)
    soit b = a -> pic(centre: 1 kHz, q: 0.8, gain: mediums)
    sortie = b -> pic(centre: 6 kHz, q: 0.8, gain: aigus)
}
` },
  { id: "jet", niveau: "Découverte", titre: "Le jet d'un avion", mots: ["flanger", "modulation", "peigne"], texte: "Un flanger : un retard très court qui balaie lentement, et dont le peigne de creux traverse le spectre. Essaie-le sur du bruit.",
    code: `/// Flanger de la bibliothèque, sur une source quelconque.
effet Jet {
    entree source : Audio
    reglage vitesse : Hz = 0.25 Hz dans 0.05 Hz .. 3 Hz courbe log etiquette "Vitesse du balayage"
    reglage profondeur : Ratio = 80% dans 0 .. 100%
    reglage melange : Ratio = 50% dans 0 .. 100% etiquette "Part de l'effet"
    sortie = source -> flanger(vitesse: vitesse, profondeur: profondeur, melange: melange)
}
` },
];
const typeDe = code => /(^|\n)\s*effet\s/.test(code) ? "effet" : "instrument";
const motsDe = e => e.mots || [];
export const ENTREES = [
  ...EXEMPLES.map(e => ({ ...e, mots: e.mots || [], origine: "Studio" })),
  ...NOUVEAUX.map(e => ({ ...e, origine: "Library" })),
].map(e => ({ ...e, type: typeDe(e.code) }));
export { typeDe, motsDe };
