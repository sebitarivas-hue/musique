// Catalogue de la Library : les exemples du Studio plus des instruments et effets prêts à l'emploi.
// Chaque entrée est un programme SONORA complet. Les tests le compilent, le rendent, et vérifient qu'il ne sature pas.
import { EXEMPLES } from "../studio/exemples.js?v=5981075a04";

const rythme = ["percussion", "rythme"];
export const NOUVEAUX = [
  { id: "lames-metal", niveau: "Programmation", titre: "Lames métalliques (métallophone)", mots: ["monde", "métallophone", "gamelan", "lames", "inharmonique", "percussion"], texte: "Une lame de métal libre aux deux bouts ne vibre pas en harmoniques : ses partiels sont aux rapports 1, 2,76, 5,40 et 8,93 de la fréquence, et les aigus s'éteignent plus vite. C'est la base du timbre des métallophones, comme les saron ou les gender du gamelan. C'est un modèle de synthèse, pas un enregistrement ; chaque gamelan a son propre accord, ici les notes suivent le clavier.",
    code: `/// Lame métallique libre : quatre partiels aux rapports 1 ; 2,756 ; 5,404 ; 8,933 (barre uniforme), qui s'éteignent d'autant plus vite qu'ils sont aigus.
instrument LamesMetal {
    entree notes : Evenement<Note>
    reglage duree : s = 2 s dans 0.3 s .. 6 s courbe log etiquette "Résonance"
    reglage durete : Ratio = 45% dans 0 .. 100% etiquette "Dureté de la mailloche"
    polyphonie 8 voix vol(plus_ancienne)
    voix (n : Note) {
        soit f = n.hauteur
        soit t = rampe(0 s, 60 s, 60 s)
        soit p1 = sinus(f) * exp(-6.907755 * t / duree)
        soit p2 = sinus(f * 2.756) * 0.55 * durete * exp(-6.907755 * t / (duree * 0.45))
        soit p3 = sinus(f * 5.404) * 0.35 * durete * exp(-6.907755 * t / (duree * 0.22))
        soit p4 = sinus(f * 8.933) * 0.25 * durete * exp(-6.907755 * t / (duree * 0.12))
        sortie = (p1 + p2 + p3 + p4) * ar(1 ms, 20 ms + duree) * n.vitesse * 22%
    }
    sortie = voix.somme
}
` },
  { id: "balafon", niveau: "Programmation", titre: "Lames de bois et bourdonnement (esprit du balafon)", mots: ["monde", "balafon", "marimba", "bois", "lames", "mirliton", "Afrique de l'Ouest"], texte: "Les lames d'un marimba sont creusées pour que leur deuxième partiel soit à quatre fois la fréquence et le troisième à dix fois. Le balafon d'Afrique de l'Ouest a des lames de bois sur des résonateurs de calebasse, dont l'ouverture est recouverte d'une fine membrane qui bourdonne : ici, un peu de bruit filtré imite ce bourdonnement. C'est une imitation de synthèse, pas un enregistrement ni une mesure d'un instrument précis.",
    code: `/// Lame de bois accordée (partiels 1 ; 4 ; 10) avec un bourdonnement qui imite la membrane des résonateurs.
instrument Balafon {
    entree notes : Evenement<Note>
    reglage resonance : s = 600 ms dans 150 ms .. 2 s courbe log etiquette "Résonance de la lame"
    reglage bourdon : Ratio = 25% dans 0 .. 100% etiquette "Bourdonnement"
    polyphonie 8 voix vol(plus_ancienne)
    voix (n : Note) {
        soit f = n.hauteur
        soit t = rampe(0 s, 30 s, 30 s)
        soit corps = sinus(f) * exp(-6.907755 * t / resonance) + 0.35 * sinus(f * 4) * exp(-6.907755 * t / (resonance * 0.3)) + 0.15 * sinus(f * 10) * exp(-6.907755 * t / (resonance * 0.12))
        soit buzz = bruit_blanc(graine: 17) -> passe_bande(centre: 3.2 kHz, q: 3)
        sortie = (corps + bourdon * 0.5 * buzz * exp(-6.907755 * t / (resonance * 0.8)) * sinus(f)) * ar(1 ms, 20 ms + resonance) * n.vitesse * 30%
    }
    sortie = voix.somme
}
` },
  { id: "steelpan", niveau: "Programmation", titre: "Pan de Trinité (esprit du steelpan)", mots: ["monde", "steelpan", "Trinité-et-Tobago", "percussion", "partiels", "Caraïbes"], texte: "Chaque note d'un pan de Trinité est une zone martelée du fût, accordée pour que la fondamentale, l'octave et la douzième (l'octave plus la quinte) sonnent ensemble : c'est ce qui rend la note à la fois claire et brillante. Ici ces trois partiels sont synthétisés, avec un petit bruit d'attaque pour la baguette. C'est un modèle, pas un enregistrement.",
    code: `/// Note de pan : fondamentale, octave et douzième (rapports 1 ; 2 ; 3) avec un bruit d'attaque et un léger battement.
instrument Steelpan {
    entree notes : Evenement<Note>
    reglage resonance : s = 1.2 s dans 0.3 s .. 3 s courbe log etiquette "Résonance"
    reglage brillance : Ratio = 55% dans 0 .. 100% etiquette "Brillance des partiels"
    polyphonie 8 voix vol(plus_ancienne)
    voix (n : Note) {
        soit f = n.hauteur
        soit t = rampe(0 s, 30 s, 30 s)
        soit p1 = sinus(f) * exp(-6.907755 * t / resonance)
        soit p2 = sinus(f * 2 + 0.7 Hz) * 0.6 * brillance * exp(-6.907755 * t / (resonance * 0.6))
        soit p3 = sinus(f * 3) * 0.4 * brillance * exp(-6.907755 * t / (resonance * 0.35))
        soit coup = bruit_blanc(graine: 23) -> passe_bande(centre: 2 kHz, q: 1.2)
        sortie = (p1 + p2 + p3 + 0.25 * coup * ar(1 ms, 25 ms)) * ar(1 ms, 30 ms + resonance) * n.vitesse * 28%
    }
    sortie = voix.somme
}
` },
  { id: "flute-soufflee", niveau: "Programmation", titre: "Flûte soufflée (esprit du shakuhachi et du ney)", mots: ["monde", "flûte", "souffle", "shakuhachi", "ney", "bambou", "bruit"], texte: "Dans une flûte à biseau, le son naît d'un souffle qui tourbillonne sur l'arête : on entend une note, et autour d'elle un souffle. Ici, quelques harmoniques doux pour la note, du bruit filtré autour de la note pour le souffle, un léger vibrato. Ce n'est pas le modèle d'un instrument précis : le shakuhachi japonais et le ney du Moyen-Orient et d'Asie centrale sont des flûtes soufflées par le bout, dont le souffle fait partie du jeu.",
    code: `/// Flûte soufflée : une note aux harmoniques doux, un souffle filtré autour d'elle et un léger vibrato.
instrument FluteSoufflee {
    entree notes : Evenement<Note>
    reglage souffle : Ratio = 30% dans 0 .. 100% etiquette "Part du souffle"
    reglage vibrato : Ratio = 0.8% dans 0 .. 2% etiquette "Vibrato"
    polyphonie 2 voix vol(plus_ancienne)
    voix (n : Note) {
        soit f = n.hauteur * (1 + vibrato * lfo(5 Hz))
        soit note = sinus(f) + 0.18 * sinus(2 * f) + 0.06 * sinus(3 * f)
        soit air = bruit_blanc(graine: 31) -> passe_bande(centre: min(n.hauteur * 2, 7 kHz), q: 2.5)
        soit forme = adsr(porte: n.porte, attaque: 90 ms, declin: 120 ms, soutien: 85%, relache: 220 ms)
        sortie = (note + souffle * 1.4 * air) * forme * n.vitesse * 40%
    }
    sortie = voix.somme
}
` },
  { id: "diphonique", niveau: "Programmation", titre: "Chant diphonique : un bourdon et un harmonique qui chante", mots: ["monde", "diphonique", "khöömii", "voix", "harmoniques", "formants", "Mongolie", "bourdon"], texte: "Dans le chant diphonique (khöömii mongol, chant des Touvas, des Sâmes...), une seule personne fait entendre deux sons : un bourdon grave et, par-dessus, un harmonique aigu isolé qui forme une mélodie. Le chanteur y parvient en resserrant la cavité de sa bouche autour d'un harmonique. Ici, un filtre très étroit isole l'harmonique choisi d'un son grave riche : le curseur le fait monter et descendre. C'est un modèle, pas une imitation fidèle de la voix.",
    code: `/// Chant diphonique : un bourdon grave et un filtre étroit qui isole un harmonique, qu'on peut balayer.
instrument Diphonique {
    entree notes : Evenement<Note>
    reglage harmonique : Ratio = 8 dans 4 .. 14 etiquette "Harmonique mis en avant"
    reglage finesse : Ratio = 25 dans 8 .. 40 etiquette "Finesse du filtre"
    polyphonie 1 voix vol(plus_ancienne)
    voix (n : Note) {
        soit source = dent(n.hauteur)
        soit sifflet = passe_bande(source, n.hauteur * harmonique, finesse)
        soit forme = adsr(porte: n.porte, attaque: 120 ms, declin: 200 ms, soutien: 90%, relache: 400 ms)
        sortie = (0.18 * source + 3 * sifflet) * forme * n.vitesse * 35%
    }
    sortie = voix.somme
}
` },
  { id: "tambour-main", niveau: "Programmation", titre: "Tambour frappé à la main (esprit du djembé)", mots: ["monde", "djembé", "tambour", "percussion", "Afrique de l'Ouest", "basse", "claque"], texte: "Un djembé se joue avec trois sons principaux : la basse (frappe au centre, grave), le ton (près du bord, médium) et la claque (sur le bord, aigu et sec). Le curseur passe de l'un à l'autre. Ici, un sinus dont la hauteur chute vite donne la peau, un bruit bref donne la claque. C'est une synthèse, pas un enregistrement.",
    code: `/// Tambour à main : un corps (sinus qui descend vite) et une claque (bruit bref), du grave (basse) au sec (claque).
instrument TambourMain {
    entree notes : Evenement<Note>
    reglage frappe : Ratio = 0 dans 0 .. 2 etiquette "Frappe (0 basse, 1 ton, 2 claque)"
    polyphonie 4 voix vol(plus_ancienne)
    voix (n : Note) {
        soit k = clamp(frappe, 0, 2)
        soit f = n.hauteur * mix(1, 1.9, clamp(k, 0, 1))
        soit corps = sinus(rampe(f * 2.2, f, 35 ms)) * ar(1 ms, mix(260 ms, 110 ms, clamp(k, 0, 1)))
        soit sec = bruit_blanc(graine: 41) -> passe_haut(coupure: mix(900 Hz, 2800 Hz, clamp(k - 1, 0, 1)), q: 0.7)
        sortie = (corps * mix(1, 0.7, clamp(k, 0, 1)) * mix(1, 0.25, clamp(k - 1, 0, 1)) + 0.7 * sec * ar(1 ms, mix(30 ms, 70 ms, clamp(k - 1, 0, 1))) * clamp(k, 0.15, 1)) * n.vitesse * 22%
    }
    sortie = voix.somme
}
` },
  { id: "supersaw", niveau: "Programmation", titre: "Unisson : cinq dents de scie désaccordées", mots: ["synthèse", "épais", "supersaw", "lead", "nappe", "battements"], texte: "Cinq dents de scie à peine désaccordées jouent la même note : leurs battements lents donnent le mouvement et l'épaisseur des synthétiseurs « supersaw ». L'écart règle l'étalement, le filtre adoucit les aigus.",
    code: `/// Unisson : cinq dents de scie désaccordées autour de la note, adoucies par un filtre passe-bas.
instrument Supersaw {
    entree notes : Evenement<Note>
    reglage ecart : Ratio = 0.8% dans 0 .. 3% etiquette "Écart entre les voix"
    reglage coupure : Hz = 3 kHz dans 400 Hz .. 8 kHz courbe log etiquette "Coupure du filtre"
    polyphonie 6 voix vol(plus_ancienne)
    voix (n : Note) {
        soit corps = unisson(n.hauteur, ecart) -> passe_bas(coupure: coupure, q: 0.7)
        soit forme = adsr(porte: n.porte, attaque: 40 ms, declin: 200 ms, soutien: 70%, relache: 350 ms)
        sortie = corps * forme * n.vitesse * 45%
    }
    sortie = voix.somme
}
` },
  { id: "voyelles", niveau: "Programmation", titre: "Voix : des voyelles par formants", mots: ["voix", "voyelle", "formants", "synthèse", "chant"], texte: "Une dent de scie, comme les cordes vocales, passe dans trois filtres dont les fréquences dessinent la voyelle : a, e, i, o, u. Le curseur glisse de l'une à l'autre. Les fréquences sont des ordres de grandeur d'une voix d'homme, qui varient selon les personnes.",
    code: `/// Voyelles : une source riche en harmoniques et trois formants qui glissent de a à e, i, o, u.
instrument Voyelles {
    entree notes : Evenement<Note>
    reglage voyelle : Ratio = 0 dans 0 .. 4 etiquette "Voyelle (0 a, 1 e, 2 i, 3 o, 4 u)"
    reglage vibrato : Ratio = 0.6% dans 0 .. 2% etiquette "Vibrato"
    polyphonie 4 voix vol(plus_ancienne)
    voix (n : Note) {
        soit k = clamp(voyelle, 0, 4)
        soit f1 = mix(mix(mix(mix(800 Hz, 350 Hz, clamp(k, 0, 1)), 270 Hz, clamp(k - 1, 0, 1)), 450 Hz, clamp(k - 2, 0, 1)), 325 Hz, clamp(k - 3, 0, 1))
        soit f2 = mix(mix(mix(mix(1150 Hz, 2000 Hz, clamp(k, 0, 1)), 2140 Hz, clamp(k - 1, 0, 1)), 800 Hz, clamp(k - 2, 0, 1)), 700 Hz, clamp(k - 3, 0, 1))
        soit f3 = mix(mix(mix(mix(2900 Hz, 2800 Hz, clamp(k, 0, 1)), 2950 Hz, clamp(k - 1, 0, 1)), 2830 Hz, clamp(k - 2, 0, 1)), 2700 Hz, clamp(k - 3, 0, 1))
        soit source = dent(n.hauteur * (1 + vibrato * lfo(5.5 Hz)))
        soit corps = formants(source, f1, f2, f3, 9)
        soit forme = adsr(porte: n.porte, attaque: 60 ms, declin: 150 ms, soutien: 85%, relache: 300 ms)
        sortie = corps * forme * n.vitesse * 90%
    }
    sortie = voix.somme
}
` },
  { id: "ecrasement", niveau: "Découverte", titre: "Écrasement : le bit crusher", mots: ["effet", "distorsion", "numérique", "bit crusher", "lofi"], texte: "L'effet réduit le nombre de niveaux que le signal peut prendre. Avec 8 niveaux un sinus devient un escalier, et le son se couvre de grain : c'est le son des vieilles machines numériques.",
    code: `/// Écrasement : le signal est ramené à un petit nombre de niveaux.
effet Ecrasement {
    entree x : Audio
    reglage niveaux : Ratio = 12 dans 2 .. 128 courbe log etiquette "Nombre de niveaux"
    sortie = ecrase(x, niveaux) * 0.8
}
` },
  { id: "cloche", niveau: "Programmation", titre: "Cloche : des partiels qui ne sont pas des harmoniques", mots: ["cloche", "inharmonique", "partiels", "Risset", "synthèse additive", "métal"], texte: "Une cloche n'a pas de partiels en multiples de la fréquence : ses onze partiels sont répartis autrement, et chacun s'éteint à sa vitesse, les aigus d'abord. C'est ce qui donne le son métallique. Modèle inspiré de celui de Jean-Claude Risset, avec des valeurs reprises de mémoire de la documentation de Csound : à comparer à la source.",
    code: `/// Cloche : onze partiels inharmoniques qui s'éteignent à des vitesses différentes (d'après la cloche de Risset).
instrument Cloche {
    entree notes : Evenement<Note>
    reglage duree : s = 3 s dans 0.5 s .. 8 s courbe log etiquette "Durée de la résonance"
    polyphonie 6 voix vol(plus_ancienne)
    voix (n : Note) {
        sortie = cloche(n.hauteur, duree) * n.vitesse * 40%
    }
    sortie = voix.somme
}
` },
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
  { id: "nuage-de-grains", niveau: "Programmation", titre: "Nuage de grains", mots: ["granulaire", "grains", "transposition", "synthèse"], transpose: 1.5, texte: "Le son entrant est découpé en petits grains, relus plus vite ou plus lentement, puis recollés par des fondus : la note change de hauteur sans changer de durée. Réduis la taille des grains pour entendre le grain devenir un timbre.",
    code: `/// Synthèse granulaire : deux grains qui se chevauchent de moitié, relus à une autre vitesse.
effet NuageDeGrains {
    entree source : Audio
    reglage taille : s = 80 ms dans 20 ms .. 190 ms courbe log etiquette "Taille des grains"
    reglage hauteur : Ratio = 1.5 dans 0.5 .. 2 etiquette "Transposition (1 = inchangé, 2 = octave au-dessus)"
    reglage melange : Ratio = 100% dans 0 .. 100% etiquette "Part de l'effet"
    sortie = source -> nuage(taille: taille, hauteur: hauteur, melange: melange)
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
