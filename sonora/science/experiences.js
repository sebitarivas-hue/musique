// Les expériences de SONORA Science. Chaque expérience est un programme SONORA (le même langage que le Studio) plus une analyse.
// Règle : tout résultat affiché est calculé à partir des échantillons que le programme produit, jamais recopié d'une formule.
// La « théorie » est la valeur attendue d'après la physique ; l'écart et le verdict viennent de la comparaison avec la mesure.
import * as A from "./analyse.js";

export const SR = 44100;
const arrondi = (v, d = 2) => (Math.abs(v) >= 100 ? v.toFixed(Math.max(0, d - 2)) : v.toFixed(d)).replace(/\.?0+$/, "") || "0";
// ligne de résultat : mesure, théorie, tolérance relative et absolue ; ok si l'écart est dans la tolérance
export function L(nom, mesure, theorie, { unite = "", tol = 0.02, tolAbs = 0, d = 2, info = false } = {}) {
  const l = { nom, mesure, theorie, unite, d, info };
  if (!info && theorie !== null && theorie !== undefined) { l.ecart = mesure - theorie; l.ok = Math.abs(mesure - theorie) <= Math.max(tolAbs, tol * Math.abs(theorie)); }
  return l;
}
export const fmt = (v, d = 2) => (v === null || v === undefined || Number.isNaN(v) ? "-" : arrondi(v, d));
const cana = c => c.canaux[0];
const dB = A.versDB;

export const EXPERIENCES = [
  // ------------------------------------------------------------------------------------------------ ACOUSTIQUE
  { id: "frequence-periode", domaine: "Acoustique", titre: "Fréquence, période et longueur d'onde",
    question: "Un son plus aigu vibre-t-il plus vite ? Et quelle est la longueur d'une onde sonore dans l'air ?",
    explication: ["Un son pur est une vibration régulière. La fréquence, en hertz (Hz), est le nombre de vibrations par seconde ; la période est la durée d'une vibration : T = 1 / f.",
      "L'onde avance dans l'air à la vitesse du son c (environ 343 m/s à 20 °C, et elle augmente avec la température). Pendant une période, elle parcourt une longueur d'onde : λ = c × T = c / f."],
    programme: `/// Un son pur : sa fréquence fixe sa période, sa période fixe la longueur d'onde.
instrument FrequencePeriode {
    reglage frequence : Hz = 440 Hz dans 20 Hz .. 2 kHz courbe log etiquette "Fréquence"
    reglage temperature : Reel = 20 dans -10 .. 40 pas 1 etiquette "Température de l'air (°C)"
    sortie = sinus(frequence) * 0.3
}
`, duree: 1,
    mesurer(c) {
      const f = A.fondamentale(cana(c), c.sr, { fmin: 15, fmax: 2600, debut: 4096, duree: Math.max(0.3, 10 / c.valeurs.frequence) }), cel = A.vitesseSon(c.valeurs.temperature);
      return { lignes: [
        L("Fréquence mesurée", f.f0, c.valeurs.frequence, { unite: "Hz", tol: 0.003 }),
        L("Période mesurée", f.periode * 1000, 1000 / c.valeurs.frequence, { unite: "ms", tol: 0.003, d: 3 }),
        L("Vitesse du son à cette température (formule c = 331,3 + 0,606 × t)", cel, null, { unite: "m/s", info: true, d: 1 }),
        L("Longueur d'onde = vitesse × période mesurée", cel * f.periode, cel / c.valeurs.frequence, { unite: "m", tol: 0.003, d: 3 }),
      ], vues: ["oscillo", "spectre"] };
    },
    interpreter(r, v) { const f = r.lignes[0].mesure, T = r.lignes[1].mesure, lam = r.lignes[3].mesure; return `À ${fmt(f, 1)} Hz, une vibration dure ${fmt(T, 2)} ms et l'onde s'étend sur ${lam >= 1 ? fmt(lam, 2) + " m" : fmt(lam * 100, 1) + " cm"} dans l'air à ${v.temperature} °C. ${f > 1000 ? "Un son aigu a une onde courte : quelques centimètres seulement." : f < 100 ? "Un son grave a une onde longue : plusieurs mètres, comparable à la taille d'une pièce." : "Double la fréquence : la période et la longueur d'onde sont divisées par deux."}`; },
    approfondissement: "Fais varier la température : la fréquence ne change pas, mais la longueur d'onde si. Pourquoi un instrument à vent monte-t-il quand l'air se réchauffe ? (Indice : la hauteur dépend de la longueur d'onde dans le tuyau.)" },

  { id: "amplitude-niveau", domaine: "Acoustique", titre: "Amplitude et niveau en décibels",
    question: "De combien baisse l'amplitude quand on enlève 6 dB ? Et que mesure vraiment un décibel ?",
    explication: ["L'amplitude est la hauteur de la vibration ; l'oreille la perçoit comme l'intensité. On la compare à une référence en décibels : niveau = 20 × log10(amplitude / référence).",
      "Enlever 6 dB divise l'amplitude par 2 (à peu près), enlever 20 dB la divise par 10. La valeur efficace (RMS) d'une sinusoïde vaut l'amplitude divisée par racine de 2."],
    programme: `/// Un son pur dont on règle le niveau en décibels.
instrument Niveau {
    reglage niveau : dB = -12 dB dans -60 dB .. -1 dB etiquette "Niveau"
    sortie = sinus(440 Hz) * lin(niveau)
}
`, duree: 1,
    mesurer(c) {
      const x = cana(c), cr = A.crete(x, 8192), r = A.rms(x, 8192), ampTh = Math.pow(10, c.valeurs.niveau / 20);
      return { lignes: [
        L("Amplitude de crête mesurée", cr, ampTh, { tol: 0.01, d: 4 }),
        L("Valeur efficace mesurée (RMS)", r, ampTh / Math.SQRT2, { tol: 0.01, d: 4 }),
        L("Niveau de crête mesuré, en dB par rapport au maximum", dB(cr), c.valeurs.niveau, { unite: "dB", tolAbs: 0.1, d: 1 }),
        L("Rapport crête / efficace, en dB (une sinusoïde : 3,01 dB)", dB(cr / r), 3.01, { unite: "dB", tolAbs: 0.1, d: 2 }),
      ], vues: ["oscillo", "spectre"] };
    },
    interpreter(r, v) { const cr = r.lignes[0].mesure; return `Avec ${v.niveau} dB, l'amplitude vaut ${fmt(cr, 4)} (soit ${fmt(cr * 100, 2)} % du maximum). Chaque fois que tu enlèves 6 dB, l'amplitude est à peu près divisée par 2 ; enlever 20 dB la divise par 10 : le décibel est un rapport, pas une quantité.`; },
    approfondissement: "Mets le niveau à -6, -12, -18 dB : note l'amplitude à chaque fois. Quelle est la suite ? Pourquoi la perception de l'intensité ne suit-elle pas exactement l'amplitude (voir l'expérience sur le masquage) ?" },

  { id: "phase-interference", domaine: "Acoustique", titre: "Phase et interférences",
    question: "Que se passe-t-il quand on additionne deux sons purs de même fréquence mais décalés dans le temps ?",
    explication: ["La phase dit où en est la vibration de son cycle. Deux sons de même fréquence s'additionnent : si leurs crêtes coïncident, l'amplitude double (interférence constructive) ; si la crête de l'un tombe sur le creux de l'autre, ils s'annulent (interférence destructive).",
      "Pour un décalage de phase φ (en tours), l'amplitude de la somme est 2 × A × |cos(π × φ)|. C'est le principe de la réduction active du bruit."],
    programme: `/// Deux sons purs de même fréquence, le second décalé en phase.
instrument Interference {
    reglage dephasage : Phase = 0 tour dans 0 tour .. 0.5 tour etiquette "Décalage de phase (tours)"
    soit a = sinus(440 Hz)
    soit b = sinus(440 Hz, dephasage)
    sortie = (a + b) * 0.25
}
`, duree: 1,
    mesurer(c) {
      const x = cana(c), n = 16384, p = A.pics(A.spectre(x, 8192, n), c.sr, n)[0], th = 0.5 * Math.abs(Math.cos(Math.PI * c.valeurs.dephasage));
      return { lignes: [
        L("Amplitude de la somme", p ? p.a : 0, th, { tol: 0.02, tolAbs: 0.004, d: 4 }),
        L("Valeur efficace de la somme", A.rms(x, 8192), th / Math.SQRT2, { tol: 0.02, tolAbs: 0.003, d: 4 }),
        L("Rapport à un seul son (amplitude 0,25), en dB (plancher à -60 dB : en dessous, c'est le bruit de calcul)", Math.max(-60, dB((p ? p.a : 1e-9) / 0.25)), Math.max(-60, dB(Math.max(th, 1e-9) / 0.25)), { unite: "dB", tolAbs: 0.3, d: 1 }),
      ], vues: ["oscillo", "spectre"] };
    },
    interpreter(r, v) { const a = r.lignes[0].mesure, ph = v.dephasage; return `Avec un décalage de ${fmt(ph, 3)} tour, l'amplitude de la somme est ${fmt(a, 3)}, soit ${fmt(a / 0.25, 2)} fois celle d'un seul son. ${ph < 0.05 ? "Les crêtes coïncident : interférence constructive, l'amplitude double." : ph > 0.45 ? "Les crêtes tombent sur les creux : interférence destructive, les deux sons s'annulent presque." : "Entre les deux : l'amplitude varie en 2 × |cos(π × φ)|."}`; },
    approfondissement: "Dans une salle, deux haut-parleurs de même fréquence créent des endroits où le son est fort et d'autres où il est presque nul. Pourquoi ? (Indice : le décalage de phase dépend de la différence de chemin.)" },

  { id: "battements", domaine: "Acoustique", titre: "Les battements",
    question: "Pourquoi deux sons presque identiques font-ils une sonorité qui pulse ?",
    explication: ["Deux sons purs de fréquences proches se mettent tantôt en phase, tantôt en opposition : le volume monte et descend. Le nombre de battements par seconde est exactement l'écart des deux fréquences : f2 - f1.",
      "Les accordeurs d'instruments écoutent ces battements : quand ils ralentissent jusqu'à disparaître, les deux cordes sont à l'unisson."],
    programme: `/// Deux sinusoïdes proches : le volume pulse à la fréquence de l'écart.
instrument Battements {
    reglage ecart : Hz = 3 Hz dans 0.5 Hz .. 12 Hz courbe log etiquette "Écart des deux fréquences"
    soit a = sinus(440 Hz)
    soit b = sinus(440 Hz + ecart)
    sortie = (a + b) * 0.2
}
`, duree: 8,
    mesurer(c) {
      const { env, fe } = A.enveloppe(cana(c), c.sr, 5), b = A.frequenceEnveloppe(env, fe, { fmin: 0.3, fmax: 30 }), mx = Math.max(...env), mn = Math.min(...Array.from(env).slice(10));
      return { lignes: [
        L("Fréquence des battements mesurée (sur l'enveloppe)", b ? b.f : 0, c.valeurs.ecart, { unite: "Hz", tol: 0.04, tolAbs: 0.15 }),
        L("Creux de l'enveloppe par rapport à la crête (0 = annulation complète)", mn / mx, 0, { tolAbs: 0.08, d: 3 }),
        L("Amplitude maximale (deux sons de 0,2 en phase)", A.crete(cana(c)), 0.4, { tol: 0.03, d: 3 }),
      ], vues: ["oscillo", "enveloppe", "spectre"], serie: { env, fe } };
    },
    interpreter(r, v) { const b = r.lignes[0].mesure; return `Écart réglé : ${fmt(v.ecart, 2)} Hz. L'enveloppe du signal produit oscille ${fmt(b, 2)} fois par seconde : c'est bien l'écart des fréquences, un battement toutes les ${fmt(1000 / b, 0)} ms. ${v.ecart > 8 ? "Au-delà de 8 à 10 battements par seconde, l'oreille n'entend plus un volume qui pulse mais une sonorité rugueuse." : "À cette vitesse, on entend nettement le volume pulser."}`; },
    approfondissement: "Écoute des battements de plus en plus rapides. À partir de quel écart cesses-tu de les compter ? C'est la porte de la rugosité, qui explique pourquoi certains intervalles sonnent « durs » (voir l'expérience sur les intervalles)." },

  { id: "harmoniques-spectre", domaine: "Acoustique", titre: "Formes d'onde, harmoniques et spectre",
    question: "Pourquoi une onde en dents de scie sonne-t-elle plus brillante qu'un sinus ?",
    explication: ["Tout son périodique est la somme de sinusoïdes dont les fréquences sont des multiples de la fondamentale : les harmoniques. Le spectre montre leur amplitude.",
      "Théorie : la dent de scie contient tous les harmoniques, d'amplitude 1/k. Le carré ne contient que les impairs, 1/k. Le triangle les impairs en 1/k², donc très faibles. Le sinus n'a qu'un seul partiel."],
    programme: `/// Quatre formes d'onde : on regarde leur spectre.
instrument Formes {
    reglage frequence : Hz = 220 Hz dans 110 Hz .. 880 Hz courbe log etiquette "Fréquence"
    reglage forme : Entier = 3 dans 0 .. 3 pas 1 choix ["Sinus", "Triangle", "Carré", "Dent de scie"] etiquette "Forme d'onde"
    soit onde = si forme == 0 alors sinus(frequence) sinon si forme == 1 alors triangle(frequence) sinon si forme == 2 alors carre(frequence) sinon dent(frequence)
    sortie = onde * 0.3
}
`, duree: 2,
    mesurer(c) {
      const f0 = A.fondamentale(cana(c), c.sr, { fmin: 80, fmax: 1000, debut: 4096, duree: 0.2 }).f0, h = A.harmoniques(cana(c), c.sr, f0, 7, { debut: 16384, n: 32768 }), forme = Math.round(c.valeurs.forme);
      const theorie = k => forme === 0 ? (k === 1 ? 1 : 0) : forme === 1 ? (k % 2 ? 1 / (k * k) : 0) : forme === 2 ? (k % 2 ? 1 / k : 0) : 1 / k;
      const lignes = [L("Fréquence fondamentale mesurée", f0, c.valeurs.frequence, { unite: "Hz", tol: 0.005 })];
      for (let k = 2; k <= 7; k++) {
        const rel = dB(h[k - 1] / h[0]), t = theorie(k);
        if (t === 0) { const l = L(`Harmonique ${k} (devrait être absent)`, rel, null, { unite: "dB", info: true, d: 1 }); l.ok = rel < -35; l.attendu = "< -35 dB"; lignes.push(l); }
        else lignes.push(L(`Harmonique ${k}, niveau relatif à la fondamentale`, rel, dB(t), { unite: "dB", tolAbs: 1.5, d: 1 }));
      }
      const n = 16384, mag = A.spectre(cana(c), 16384, n);
      lignes.push(L("Centroïde spectral (« centre de gravité » du spectre : plus il est haut, plus le son est brillant)", A.centroide(mag, c.sr, n), null, { unite: "Hz", info: true, d: 0 }));
      return { lignes, vues: ["oscillo", "spectre"] };
    },
    interpreter(r, v) { const f = ["sinus", "triangle", "carré", "dent de scie"][Math.round(v.forme)], cen = r.lignes[r.lignes.length - 1].mesure; return `Forme ${f} à ${fmt(v.frequence, 0)} Hz : le centroïde spectral est à ${fmt(cen, 0)} Hz, soit ${fmt(cen / v.frequence, 1)} fois la fondamentale. ${Math.round(v.forme) === 3 ? "Tous les harmoniques sont présents : c'est le son le plus brillant, la base de beaucoup de synthés soustractifs." : Math.round(v.forme) === 0 ? "Un seul partiel : le son est pur, sans couleur." : Math.round(v.forme) === 1 ? "Les harmoniques impairs sont très faibles : un son doux, proche du sinus." : "Seuls les harmoniques impairs existent : un son creux, qui rappelle la clarinette."}`; },
    approfondissement: "Passe du carré au sinus en baissant peu à peu le volume des harmoniques : c'est la synthèse additive. Combien d'harmoniques faut-il pour que l'oreille reconnaisse un carré ? (Le Studio contient l'exemple « Orgue : synthèse additive ».)" },

  { id: "resonance-filtre", domaine: "Acoustique", titre: "Résonance et filtre passe-bande",
    question: "Comment un résonateur choisit-il ce qu'il laisse passer, et qu'est-ce que le facteur de qualité Q ?",
    explication: ["Un résonateur répond fortement près de sa fréquence propre et peu ailleurs. Son facteur de qualité Q = f0 / largeur de bande (à -3 dB) dit à quel point il est sélectif : plus Q est grand, plus la bande est étroite.",
      "On le mesure en envoyant un bruit blanc (toutes les fréquences à égalité) et en regardant ce qui ressort : le spectre du résultat est la courbe de résonance."],
    programme: `/// Un bruit blanc traversant un filtre passe-bande : la courbe de résonance apparaît dans le spectre.
instrument Resonance {
    reglage centre : Hz = 1 kHz dans 300 Hz .. 4 kHz courbe log etiquette "Fréquence propre"
    reglage q : Ratio = 5 dans 1 .. 15 courbe log etiquette "Facteur de qualité Q"
    soit b = bruit_blanc(graine: 5) -> passe_bande(centre: centre, q: q)
    sortie = b * 0.5
}
`, duree: 8,
    mesurer(c) {
      const sp = A.welch(cana(c), c.sr, 16384, 4096), aj = A.ajusterResonance(sp, c.valeurs.centre * 0.3, Math.min(c.sr * 0.3, c.valeurs.centre * 3), c.valeurs.centre), bw = c.valeurs.centre / c.valeurs.q, attendue = A.largeurBandePassante(c.valeurs.centre, c.valeurs.q, c.sr);
      return { lignes: [
        L("Fréquence propre mesurée (ajustement de la courbe de résonance au spectre)", aj.f0, c.valeurs.centre, { unite: "Hz", tol: 0.03, d: 0 }),
        L("Facteur de qualité mesuré", aj.q, c.valeurs.q, { tol: 0.12, d: 1 }),
        L("Largeur de bande à -3 dB mesurée (sur la courbe ajustée) ; attendue : celle du filtre réglé, calculée sur sa réponse exacte", aj.largeur, attendue.largeur, { unite: "Hz", tol: 0.1, tolAbs: 3 * sp.bin, d: 0 }),
        L("Pour mémoire : f0 / Q (valeur du filtre analogique ; le filtre numérique s'en écarte quand la bande est large)", bw, null, { unite: "Hz", info: true, d: 0 }),
      ], vues: ["welch"], serie: { sp, modele: aj } };
    },
    interpreter(r, v) { const q = r.lignes[1].mesure, w = r.lignes[2].mesure; return `Avec Q = ${fmt(v.q, 1)}, le filtre laisse passer une bande de ${fmt(w, 0)} Hz autour de ${fmt(v.centre, 0)} Hz (Q mesuré : ${fmt(q, 1)}). ${v.q > 8 ? "Une bande très étroite : le bruit se rapproche d'une note, comme le souffle dans un tuyau." : "Une bande large : on entend un souffle coloré, mais pas encore une hauteur nette."}`; },
    approfondissement: "Un tuyau d'orgue, une caisse de guitare ou la cavité d'une bouteille sont des résonateurs. Souffle sur le goulot d'une bouteille vide, puis remplis-la un peu : comment la fréquence propre change-t-elle ?" },

  { id: "propagation-distance", domaine: "Acoustique", titre: "Propagation : retard et atténuation avec la distance",
    question: "Combien de temps met un son pour arriver, et de combien s'affaiblit-il en s'éloignant ?",
    explication: ["Le son voyage à la vitesse c (environ 343 m/s à 20 °C) : à d mètres de la source, il arrive avec un retard t = d / c. C'est le délai entre l'éclair et le tonnerre.",
      "En champ libre, l'énergie se répartit sur une sphère de plus en plus grande : l'amplitude varie en 1 / d, soit une perte de 6 dB à chaque doublement de la distance."],
    programme: `/// À gauche, la source ; à droite, ce qu'on entend à une certaine distance : plus tard, et plus faible.
instrument Distance {
    reglage distance : Reel = 10 dans 1 .. 100 courbe log etiquette "Distance à la source (m)"
    reglage temperature : Reel = 20 dans -10 .. 40 pas 1 etiquette "Température de l'air (°C)"
    soit c = 331.3 + 0.606 * temperature
    soit source = (bruit_blanc(graine: 11) -> passe_bas(coupure: 2 kHz)) * 0.8
    soit recu = retarde(source, distance / c * 1 s, max: 350 ms) * (1 / distance)
    sortie = [source, recu]
}
`, duree: 6,
    mesurer(c) {
      const g = c.canaux[0], d = c.canaux[1], cel = A.vitesseSon(c.valeurs.temperature), dist = c.valeurs.distance, t = A.retard(g, d, c.sr, 0.4);
      const a = Math.round(0.5 * c.sr);
      return { lignes: [
        L("Retard mesuré entre la source et le son reçu", t * 1000, dist / cel * 1000, { unite: "ms", tol: 0.01, tolAbs: 0.1, d: 2 }),
        L("Distance retrouvée = vitesse × retard mesuré", cel * t, dist, { unite: "m", tol: 0.015, tolAbs: 0.05, d: 2 }),
        L("Atténuation mesurée (niveau efficace source / reçu)", dB(A.rms(g, a) / A.rms(d, a)), 20 * Math.log10(dist), { unite: "dB", tolAbs: 0.4, d: 1 }),
      ], vues: ["oscillo", "spectre"] };
    },
    interpreter(r, v) { const t = r.lignes[0].mesure, att = r.lignes[2].mesure; return `À ${fmt(v.distance, 1)} m, le son arrive ${fmt(t, 1)} ms après la source et ${fmt(att, 1)} dB plus faible. ${v.distance >= 34 ? "Au-delà de 34 m, le retard dépasse 100 ms : on perçoit un écho distinct, comme contre une paroi lointaine." : "Le retard est trop court pour être entendu comme un écho."} Doubler la distance ajoute 6 dB d'atténuation : essaie 5 m puis 10 m, 20 m, 40 m.`; },
    approfondissement: "Tape dans tes mains face à un mur à 17 m : l'écho revient après 100 ms (34 m aller-retour à 343 m/s). Pourquoi la loi en 1/d n'est-elle valable qu'en champ libre, pas dans une salle ? (Indice : réverbération.)" },

  { id: "reflexion-peigne", domaine: "Acoustique", titre: "Réflexion et filtre en peigne",
    question: "Que devient un son quand il se mélange à sa propre réflexion, un peu plus tard ?",
    explication: ["Un son direct plus sa réflexion retardée de τ secondes s'additionnent : à certaines fréquences ils s'ajoutent, à d'autres ils s'annulent. Le spectre prend la forme d'un peigne, avec des creux espacés de 1 / τ.",
      "Plus la réflexion est forte (coefficient g), plus les creux sont profonds : le contraste entre crêtes et creux vaut 20 × log10((1 + g) / (1 - g)). Le son réfléchi a parcouru c × τ mètres de plus."],
    programme: `/// Un bruit blanc plus sa réflexion retardée : le spectre devient un peigne.
instrument Peigne {
    reglage retard : s = 4 ms dans 2 ms .. 15 ms courbe log etiquette "Retard de la réflexion"
    reglage reflexion : Ratio = 70% dans 30% .. 90% etiquette "Force de la réflexion"
    soit direct = bruit_blanc(graine: 9)
    soit reflechi = retarde(direct, retard, max: 20 ms) * reflexion
    sortie = (direct + reflechi) * 0.25
}
`, duree: 8,
    mesurer(c) {
      const sp = A.welch(cana(c), c.sr, 8192, 4096), p = A.periodiciteSpectre(sp, 300, 9000), tau = c.valeurs.retard, g = c.valeurs.reflexion, pf = A.profondeurPeigne(sp, 300, 9000, 1 / p.pas), gm = pf.g;
      return { lignes: [
        L("Écart mesuré entre deux creux du spectre", p.pas, 1 / tau, { unite: "Hz", tol: 0.03, d: 0 }),
        L("Retard retrouvé = 1 / écart des creux", 1000 / p.pas, tau * 1000, { unite: "ms", tol: 0.03, d: 2 }),
        L("Part du peigne dans le spectre, mesurée (r = g / (1 + g²), grandeur directement lue)", pf.r, g / (1 + g * g), { tol: 0.06, tolAbs: 0.01, d: 3 }),
        L("Force de la réflexion déduite (imprécise quand elle approche 100 %)", gm, g, { tolAbs: 0.1, d: 2 }),
        L("Contraste crêtes / creux calculé avec cette force (très sensible aux petites erreurs quand la réflexion approche 100 %)", 20 * Math.log10((1 + gm) / (1 - gm)), null, { unite: "dB", info: true, d: 1 }),
        L("Chemin supplémentaire du son réfléchi (vitesse du son à 20 °C × retard)", A.vitesseSon(20) * tau, null, { unite: "m", info: true, d: 2 }),
      ], vues: ["welch"], serie: { sp } };
    },
    interpreter(r, v) { const p = r.lignes[0].mesure; return `La réflexion arrive ${fmt(v.retard * 1000, 1)} ms après le son direct (${fmt(A.vitesseSon(20) * v.retard, 2)} m de chemin en plus). Le spectre mesuré a un creux tous les ${fmt(p, 0)} Hz : 1 / ${fmt(v.retard * 1000, 1)} ms. À ${fmt(v.reflexion * 100, 0)} % de réflexion (mesuré : ${fmt(r.lignes[3].mesure * 100, 0)} %), le contraste est de ${fmt(r.lignes[4].mesure, 1)} dB. C'est ce « son de pièce » creux que l'on entend près d'un mur dur.`; },
    approfondissement: "Parle près d'un mur lisse, puis face à un rideau épais : entends-tu la coloration ? Les studios d'enregistrement traitent leurs murs pour éviter ces peignes. Dans le Studio, l'exemple « Écho avec rétroaction » répète la réflexion au lieu de la mélanger une seule fois." },

  // ------------------------------------------------------------------------------------------------ PSYCHOACOUSTIQUE
  { id: "intervalles-consonance", domaine: "Psychoacoustique", titre: "Intervalles, battements et consonance",
    question: "Pourquoi la quinte sonne-t-elle plus douce que la seconde mineure ?",
    explication: ["Un son de la vie réelle a des harmoniques. Quand deux notes sonnent ensemble, leurs harmoniques proches se heurtent : l'oreille les entend battre vite, c'est la rugosité (ou dissonance sensorielle).",
      "Le modèle de Plomp et Levelt, simplifié par Sethares, calcule cette rugosité à partir des fréquences et amplitudes de toutes les paires de partiels. Ici on le calcule sur les partiels réellement mesurés dans le son produit."],
    programme: `/// Deux notes à dents de scie, à l'intervalle choisi.
instrument Intervalle {
    reglage base : Hz = 220 Hz dans 110 Hz .. 440 Hz courbe log etiquette "Note de base"
    reglage intervalle : Entier = 6 dans 0 .. 8 pas 1 choix ["Unisson", "Seconde mineure (16/15)", "Seconde majeure (9/8)", "Tierce majeure (5/4)", "Quarte (4/3)", "Triton (45/32)", "Quinte (3/2)", "Sixte majeure (5/3)", "Octave (2/1)"] etiquette "Intervalle"
    soit rapport = si intervalle == 0 alors 1 sinon si intervalle == 1 alors 16 / 15 sinon si intervalle == 2 alors 9 / 8 sinon si intervalle == 3 alors 5 / 4 sinon si intervalle == 4 alors 4 / 3 sinon si intervalle == 5 alors 45 / 32 sinon si intervalle == 6 alors 3 / 2 sinon si intervalle == 7 alors 5 / 3 sinon 2
    sortie = (dent(base) + dent(base * rapport)) * 0.15
}
`, duree: 1.5,
    mesurer(c) {
      const NOMS = ["Unisson", "Seconde mineure", "Seconde majeure", "Tierce majeure", "Quarte", "Triton", "Quinte", "Sixte majeure", "Octave"];
      // les amplitudes sont ramenées à une même énergie : on compare des intervalles, pas des volumes (deux notes identiques s'additionnent en un son deux fois plus fort)
      const partiels = x => { const n = 32768, sp = A.spectre(x, 8192, n), l = A.pics(sp, c.sr, n, { seuilDB: -45, max: 40 }), e = Math.sqrt(l.reduce((s, p) => s + p.a * p.a, 0) / 2) || 1; return l.map(p => ({ f: p.f, a: p.a / e })); };
      const mesure = (idx, signal) => A.rugosite(partiels(signal(idx)));
      const propre = partiels(cana(c)), r = A.rugosite(propre), i0 = Math.round(c.valeurs.intervalle);
      const toutes = c.refaire ? NOMS.map((_, i) => i === i0 ? r : mesure(i, c.refaire)) : null;
      let petit = Infinity; for (let i = 0; i < propre.length; i++) for (let j = i + 1; j < propre.length; j++) { const d = Math.abs(propre[i].f - propre[j].f); if (d > 0.5 && propre[i].a > 0.03 && propre[j].a > 0.03) petit = Math.min(petit, d); }
      const lignes = [L("Partiels distincts mesurés dans le son", propre.length, null, { info: true, d: 0 }), L("Rugosité calculée sur ces partiels (échelle relative)", r, null, { info: true, d: 3 }),
        L("Plus petit écart entre deux partiels voisins (battement le plus lent)", petit === Infinity ? 0 : petit, null, { unite: "Hz", info: true, d: 1 })];
      if (toutes) { const rang = toutes.filter(v => v < r - 1e-9).length + 1; lignes.push(L("Rang de douceur parmi les 9 intervalles (1 = le plus doux)", rang, null, { info: true, d: 0 })); }
      return { lignes, vues: ["spectre"], serie: toutes ? { noms: NOMS, valeurs: toutes, courant: i0 } : null };
    },
    interpreter(r, v) { const s = r.serie; const rang = r.lignes.find(l => l.nom.startsWith("Rang")); const nom = s ? s.noms[s.courant] : "cet intervalle"; return `${nom} : rugosité ${fmt(r.lignes[1].mesure, 3)}${rang ? `, rang ${rang.mesure} sur 9 du plus doux au plus rugueux` : ""}. ${r.lignes[2].mesure > 0 && r.lignes[2].mesure < 20 ? `Deux partiels voisins ne sont écartés que de ${fmt(r.lignes[2].mesure, 1)} Hz : ils battent assez lentement pour être entendus comme de la rugosité.` : "Les partiels sont suffisamment espacés, ou coïncident, ce qui adoucit l'intervalle."} Les rapports simples (octave, quinte) font coïncider beaucoup de partiels : peu de battements.`; },
    approfondissement: "Cette échelle dépend du timbre : avec un son pur (un seul partiel), presque tous les intervalles deviennent doux sauf les plus serrés. Essaie l'exemple « Quatre formes d'onde » du Studio pour changer le timbre. La culture influence aussi ce qu'on trouve consonant : la rugosité n'explique pas tout." },

  { id: "localisation", domaine: "Psychoacoustique", titre: "Localisation : différence de temps et de niveau",
    question: "Comment les deux oreilles savent-elles d'où vient un son ?",
    explication: ["Un son venant de la gauche arrive un peu plus tôt (différence interaurale de temps, ITD) et un peu plus fort (différence de niveau, ILD) à l'oreille gauche. L'ITD maximale est d'environ 0,6 ms : la distance entre les oreilles, 21 cm, divisée par la vitesse du son.",
      "Écoute au casque, les yeux fermés, un bruit d'abord centré, puis décalé. Le cerveau combine temps et niveau pour placer le son."],
    programme: `/// Un bruit stéréo : on règle la différence de temps et de niveau entre les deux oreilles.
instrument Localisation {
    reglage itd : s = 0 ms dans -0.7 ms .. 0.7 ms etiquette "Différence de temps (droite en retard si positive)"
    reglage ild : dB = 0 dB dans -12 dB .. 12 dB etiquette "Différence de niveau (droite plus forte si positive)"
    soit bruit = bruit_blanc(graine: 4) -> passe_bas(coupure: 4 kHz)
    soit gauche = retarde(bruit, max(-itd, 0 s), max: 1 ms) * lin(-ild / 2)
    soit droite = retarde(bruit, max(itd, 0 s), max: 1 ms) * lin(ild / 2)
    sortie = [gauche, droite] * 0.3
}
`, duree: 5,
    mesurer(c) {
      const g = c.canaux[0], d = c.canaux[1], t = A.retard(g, d, c.sr, 0.002), ild = dB(A.rms(d, 4096) / A.rms(g, 4096));
      return { lignes: [
        L("Différence de temps mesurée entre les deux canaux", t * 1000, c.valeurs.itd * 1000, { unite: "ms", tolAbs: 0.03, d: 3 }),
        L("Différence de niveau mesurée entre les deux canaux", ild, c.valeurs.ild, { unite: "dB", tolAbs: 0.3, d: 2 }),
        L("Retard maximal théorique entre les oreilles (21 cm à 343 m/s)", 0.21 / A.vitesseSon(20) * 1000, null, { unite: "ms", info: true, d: 2 }),
      ], vues: ["oscillo", "spectre"] };
    },
    interpreter(r, v) { const t = r.lignes[0].mesure, ild = r.lignes[1].mesure; const droite = t < -0.02 || ild > 0.3 ? "droite" : "gauche"; const conflit = (t > 0.02 && ild > 0.3) || (t < -0.02 && ild < -0.3);
      const dt = Math.abs(t) > 0.02, dn = Math.abs(ild) > 0.3;
      if (!dt && !dn) return "Aucune différence entre les deux oreilles : le son est perçu au centre de la tête.";
      const cotéT = t > 0 ? "gauche" : "droite", cotéN = ild > 0 ? "droite" : "gauche";
      return `${dt ? `Le canal droit est en ${t > 0 ? "retard" : "avance"} de ${fmt(Math.abs(t), 2)} ms : le son arrive d'abord à l'oreille ${cotéT}. ` : ""}${dn ? `Le canal droit est ${ild > 0 ? "plus fort" : "plus faible"} de ${fmt(Math.abs(ild), 1)} dB : l'oreille ${cotéN} reçoit plus d'énergie. ` : ""}${dt && dn ? (conflit ? "Les deux indices vont dans le même sens : le son paraît nettement décalé." : "Les deux indices se contredisent : le cerveau les compense, le son reste plus près du centre. C'est le principe du « trading » temps-niveau.") : "Un seul indice suffit à déplacer le son."}`; },
    approfondissement: "L'ITD fonctionne surtout pour les sons graves (en dessous de 1,5 kHz environ), l'ILD pour les sons aigus (la tête fait de l'ombre). Teste avec un bruit plus aigu en changeant la coupure du filtre dans le Studio. Et la hauteur (devant, derrière, au-dessus) ? Elle dépend de la forme de l'oreille externe, que ces deux indices ne décrivent pas." },

  { id: "shepard-risset", domaine: "Psychoacoustique", titre: "Une illusion : le glissando de Shepard-Risset",
    question: "Un son peut-il monter sans jamais arriver plus haut ?",
    explication: ["Six sinusoïdes espacées d'une octave montent en même temps. Chacune apparaît doucement dans le grave, monte, puis disparaît doucement dans l'aigu : quand la plus haute s'efface, une nouvelle naît en bas.",
      "L'oreille suit la montée de chaque partiel mais le centre de gravité du spectre ne bouge pas : la hauteur semble monter sans fin. La mesure le confirme : les partiels montent, le centroïde reste stable."],
    programme: `/// Glissando de Shepard-Risset : six partiels à l'octave qui montent (ou descendent) sans fin.
instrument ShepardRisset {
    reglage vitesse : Hz = 0.08 Hz dans 0.02 Hz .. 0.3 Hz courbe log etiquette "Vitesse (cycles par seconde)"
    reglage sens : Entier = 0 dans 0 .. 1 pas 1 choix ["Montant", "Descendant"] etiquette "Sens"
    soit x = (lfo(vitesse, "dent") + 1) / 2
    soit y = si sens == 0 alors x sinon 1 - x
    soit p0 = y - floor(y)
    soit p1 = y + 1 / 6 - floor(y + 1 / 6)
    soit p2 = y + 2 / 6 - floor(y + 2 / 6)
    soit p3 = y + 3 / 6 - floor(y + 3 / 6)
    soit p4 = y + 4 / 6 - floor(y + 4 / 6)
    soit p5 = y + 5 / 6 - floor(y + 5 / 6)
    soit son0 = sinus(55 Hz * 2 ^ (p0 * 6)) * (0.5 - 0.5 * cos(6.2832 * p0))
    soit son1 = sinus(55 Hz * 2 ^ (p1 * 6)) * (0.5 - 0.5 * cos(6.2832 * p1))
    soit son2 = sinus(55 Hz * 2 ^ (p2 * 6)) * (0.5 - 0.5 * cos(6.2832 * p2))
    soit son3 = sinus(55 Hz * 2 ^ (p3 * 6)) * (0.5 - 0.5 * cos(6.2832 * p3))
    soit son4 = sinus(55 Hz * 2 ^ (p4 * 6)) * (0.5 - 0.5 * cos(6.2832 * p4))
    soit son5 = sinus(55 Hz * 2 ^ (p5 * 6)) * (0.5 - 0.5 * cos(6.2832 * p5))
    sortie = (son0 + son1 + son2 + son3 + son4 + son5) * 0.12
}
`, duree: 16,
    mesurer(c) {
      const sp = A.spectrogramme(cana(c), c.sr, 4096, 2048, 260), pas = sp.pas / c.sr, bin = c.sr / sp.n;
      const dom = [], cen = []; for (const t of sp.trames) { let k = 3; for (let i = 4; i < t.length; i++) if (t[i] > t[k]) k = i; dom.push(Math.log2(k * bin)); let s = 0, m = 0; for (let i = 3; i < t.length; i++) { const a = Math.pow(10, t[i] / 20); s += i * bin * a; m += a; } cen.push(s / m); }
      const suivi = A.penteSuivie(sp), taux = suivi.pente, moy = cen.reduce((a, b) => a + b, 0) / cen.length, cv = Math.sqrt(cen.reduce((a, b) => a + (b - moy) ** 2, 0) / cen.length) / moy, sauts = suivi.segments;
      const sens = c.valeurs.sens === 0 ? 1 : -1;
      return { lignes: [
        L("Vitesse de montée des partiels suivis (octaves par seconde, signée)", taux, sens * 6 * c.valeurs.vitesse, { tol: 0.06, tolAbs: 0.01, d: 3 }),
        L("Variation du centroïde spectral (écart type / moyenne ; critère : moins de 0,35)", cv, null, { info: true, d: 3 }),
        L("Partiels suivis sans interruption pendant la mesure", sauts, null, { info: true, d: 0 }),
      ].map((l, i) => i === 1 ? Object.assign(l, { ok: cv < 0.35, attendu: "< 0,35" }) : l), vues: ["spectrogramme"], serie: { sp, cen, dom, pas } };
    },
    interpreter(r, v) { const t = r.lignes[0].mesure, cv = r.lignes[1].mesure; return `Le partiel dominant ${t > 0 ? "monte" : "descend"} de ${fmt(Math.abs(t), 2)} octave par seconde, et pourtant le centroïde du spectre ne varie que de ${fmt(cv * 100, 0)} % : la hauteur d'ensemble n'avance pas. C'est une illusion : la hauteur perçue suit les partiels qui montent, mais le son global revient sans cesse à son point de départ. Roger Shepard l'a décrite en 1964, Jean-Claude Risset en a fait une version continue.`; },
    approfondissement: "Écoute le sens montant, puis descendant : la direction change-t-elle sans interruption ? Pourquoi l'oreille ne remarque-t-elle pas la disparition d'un partiel dans l'aigu et la naissance d'un autre dans le grave ? (Indice : leur amplitude est presque nulle à ces moments.) Cette idée est utilisée dans des musiques de film pour créer une tension sans fin." },

  // ------------------------------------------------------------------------------------------------ AUDITEUR (réponses de la personne qui écoute)
  { id: "masquage", domaine: "Psychoacoustique", titre: "Masquage : un son en cache un autre", type: "auditeur",
    question: "De combien faut-il augmenter un son faible pour l'entendre quand un bruit couvre la même zone de fréquences ?",
    explication: ["Un son fort rend inaudible un son plus faible de fréquence voisine : c'est le masquage. Il explique pourquoi on ne distingue pas une conversation à côté d'une machine.",
      "Tu vas régler deux fois le niveau d'un son pur (1 kHz) jusqu'à l'entendre à peine : d'abord avec un bruit autour de 1 kHz, puis sans bruit. La différence des deux niveaux est l'effet de masque. Elle ne dépend pas du volume de ton appareil, contrairement aux niveaux eux-mêmes."],
    programme: `/// Un son pur à 1 kHz, avec ou sans bruit masquant autour de la même fréquence.
instrument Masquage {
    reglage niveau : dB = -30 dB dans -90 dB .. -10 dB etiquette "Niveau du son pur"
    reglage masque : Booleen = vrai etiquette "Bruit masquant"
    soit son = sinus(1 kHz) * lin(niveau)
    soit bruit = bruit_blanc(graine: 21) -> passe_bande(centre: 1 kHz, q: 3)
    sortie = son + bruit * (si masque alors 0.1 sinon 0)
}
`, duree: 3,
    approfondissement: "Que se passe-t-il si le son pur est à 2 kHz et le bruit autour de 1 kHz ? Le masquage dépend de la distance en fréquence : change la fréquence du son pur dans le programme (Studio) et refais la mesure. Les codeurs audio comme le MP3 exploitent ce phénomène pour supprimer ce que l'on n'entendrait pas de toute façon." },

  { id: "seuil-hauteur", domaine: "Psychoacoustique", titre: "Le plus petit écart de hauteur que tu entends", type: "auditeur",
    question: "Quel est le plus petit écart de fréquence que tu perçois entre deux sons purs ?",
    explication: ["Deux sons de fréquences très voisines paraissent identiques. Le seuil de discrimination est l'écart qu'on distingue une fois sur deux, à peu près. Il se mesure en cents (un demi-ton vaut 100 cents).",
      "Tu entendras deux sons à la suite : dis lequel est le plus aigu. L'écart diminue après deux bonnes réponses, augmente après une erreur : il converge vers ton seuil (procédure adaptative de Levitt). Au bout de quelques minutes, ton seuil est calculé à partir de tes réponses."],
    programme: `/// Un son pur à 1 kHz, dont la fréquence est décalée de quelques cents.
instrument SeuilHauteur {
    reglage ecart : Reel = 20 dans -100 .. 100 etiquette "Écart (cents)"
    sortie = sinus(1 kHz * 2 ^ (ecart / 1200)) * 0.25
}
`, duree: 0.5,
    approfondissement: "Refais la mesure à un autre moment, puis après avoir écouté de la musique : ton seuil change-t-il ? Il est souvent plus fin pour les musiciens entraînés. Essaie avec une autre fréquence de référence en modifiant le programme dans le Studio." },

  // ------------------------------------------------------------------------------------------------ ANALYSE
  { id: "analyseur", domaine: "Analyse", titre: "L'analyseur : mesurer n'importe quel programme", type: "analyseur",
    question: "Que mesure-t-on dans un son, et comment le lire sur un oscilloscope, un spectre, un spectrogramme et une enveloppe ?",
    explication: ["Cet analyseur rend n'importe quel programme du Studio (ou celui que tu y as écrit) sur quelques secondes, puis le mesure : fréquence fondamentale, harmoniques, centroïde spectral, enveloppe, niveau efficace, crête, plage dynamique.",
      "L'oscilloscope montre le signal dans le temps, le spectre ce qu'il contient en fréquence, le spectrogramme comment ce contenu évolue, l'enveloppe comment le niveau varie. Chaque vue répond à une question différente."],
    approfondissement: "Compare deux exemples : un son pur et une dent de scie (spectre, centroïde) ; une note de l'orgue et de la basse (enveloppe, attaque). Quelle mesure distingue le mieux deux timbres de même hauteur ?" },
];

export const parId = id => EXPERIENCES.find(e => e.id === id);
