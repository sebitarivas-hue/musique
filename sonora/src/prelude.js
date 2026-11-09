// Modules composites de la bibliothèque, écrits en SONORA. Ils sont inlinés à la compilation comme n'importe quelle fonction :
// aucun code de génération spécifique, donc rendu hors ligne, moteur temps réel et tests voient exactement le même calcul.
// Le premier paramètre s'appelle `x` (le mot `entree` est réservé). Une fonction de même nom écrite par l'utilisateur a priorité.
export const COMPOSITES = {
  echo: `fonction echo(x : Audio, duree : s, retour : Ratio = 0.3, melange : Ratio = 0.3) : Audio {
    soit fb = clamp(retour, 0, 0.95)
    soit rec y = x + fb * retarde(y, duree, max: 2 s)
    soit ech = retarde(y, duree, max: 2 s)
    rend x + melange * ech
}`,
  chorus: `fonction chorus(x : Audio, vitesse : Hz, profondeur : Ratio, melange : Ratio = 0.5) : Audio {
    soit p = clamp(profondeur, 0, 1)
    soit d1 = 15 ms + p * 8 ms * lfo(vitesse)
    soit d2 = 20 ms + p * 8 ms * lfo(vitesse * 1.17)
    soit v = (retarde(x, d1, max: 50 ms) + retarde(x, d2, max: 50 ms)) * 0.5
    rend mix(x, v, melange)
}`,
  flanger: `fonction flanger(x : Audio, vitesse : Hz, profondeur : Ratio, melange : Ratio = 0.5) : Audio {
    soit p = clamp(profondeur, 0, 1)
    soit d = 3 ms + p * 2.5 ms * lfo(vitesse)
    soit rec y = x + 0.5 * retarde(y, d, max: 8 ms)
    rend mix(x, y * 0.7, melange)
}`,
  lib_toutpasse: `fonction lib_toutpasse(x : Audio, a : Ratio) : Audio {
    soit rec y = a * x + z1(x) - a * z1(y)
    rend y
}`,
  phaser: `fonction phaser(x : Audio, vitesse : Hz, profondeur : Ratio, melange : Ratio = 0.5) : Audio {
    soit p = clamp(profondeur, 0, 1)
    soit a = 0.2 + 0.65 * p * (0.5 + 0.5 * lfo(vitesse))
    soit s1 = lib_toutpasse(x, a)
    soit s2 = lib_toutpasse(s1, a)
    soit s3 = lib_toutpasse(s2, a)
    soit s4 = lib_toutpasse(s3, a)
    rend mix(x, s4, melange)
}`,
  panoramique: `fonction panoramique(x : Audio, position : Ratio) : Audio[2] {
    soit angle = (clamp(position, -1, 1) + 1) * 0.7853981633974483
    rend [x * cos(angle), x * sin(angle)]
}`,
  lib_peigne: `fonction lib_peigne(x : Audio, d : s, g : Ratio, a : Ratio) : Audio {
    soit rec w = (1 - a) * (x + g * retarde(w, d, max: d)) + a * z1(w)
    rend w
}`,
  lib_diffuseur: `fonction lib_diffuseur(x : Audio, d : s, g : Ratio) : Audio {
    soit rec w = x + g * retarde(w, d, max: d)
    rend retarde(w, d, max: d) - g * w
}`,
  nuage: `fonction nuage(x : Audio, taille : s, hauteur : Ratio = 1, melange : Ratio = 1) : Audio {
    soit h = clamp(hauteur, 0.25, 4)
    soit t = clamp(taille, 20 ms, 190 ms)
    soit a = (lfo(abs(1 - h) / t, "dent") + 1) * 0.5
    soit q1 = si h > 1 alors 1 - a sinon a
    soit q2 = si q1 >= 0.5 alors q1 - 0.5 sinon q1 + 0.5
    soit g = retarde(x, 1 ms + q1 * t, max: 200 ms) * (1 - abs(2 * q1 - 1)) + retarde(x, 1 ms + q2 * t, max: 200 ms) * (1 - abs(2 * q2 - 1))
    rend mix(x, g, melange)
}`,
  reverberation: `fonction reverberation(x : Audio, duree : s, amortissement : Ratio = 0.5, melange : Ratio = 0.3) : Audio {
    soit t = max(duree, 0.1 s) * 1.14
    soit a = 0.1 + 0.8 * clamp(amortissement, 0, 1)
    soit g1 = exp(-6.907755 * 29.7 ms / t)
    soit g2 = exp(-6.907755 * 37.1 ms / t)
    soit g3 = exp(-6.907755 * 41.1 ms / t)
    soit g4 = exp(-6.907755 * 43.7 ms / t)
    soit somme = lib_peigne(x, 29.7 ms, g1, a) + lib_peigne(x, 37.1 ms, g2, a) + lib_peigne(x, 41.1 ms, g3, a) + lib_peigne(x, 43.7 ms, g4, a)
    soit n = sqrt(1 - g2 * g2)
    soit diffus = lib_diffuseur(lib_diffuseur(somme * n * 0.5, 5 ms, 0.5), 1.7 ms, 0.5)
    rend mix(x, diffus, melange)
}`,
  corde_pincee: `fonction corde_pincee(freq : Hz, amortissement : Ratio = 0.5) : Audio {
    soit f = clamp(freq, 20 Hz, 4 kHz)
    soit periode = 1 / f
    soit salve = si rampe(0 s, 1 s, 1 s) < periode alors bruit_blanc(graine: 11) sinon 0
    soit impulsion = salve * sqrt(min(f, 440 Hz) / 440 Hz)
    soit tau = 8 s * exp(-3.2834 * clamp(amortissement, 0, 1))
    soit coef = exp(-6.907755 * periode / tau)
    soit rec y = impulsion + coef * 0.5 * (retarde(y, periode - 0.5 ech, max: 50 ms) + z1(retarde(y, periode - 0.5 ech, max: 50 ms)))
    rend y * 0.4
}`,
  unisson: `fonction unisson(freq : Hz, ecart : Ratio = 0.01) : Audio {
    soit e = clamp(ecart, 0, 0.05)
    rend (dent(freq * (1 - 2 * e)) + dent(freq * (1 - e)) + dent(freq) + dent(freq * (1 + e)) + dent(freq * (1 + 2 * e))) * 0.2
}`,
  formants: `fonction formants(x : Audio, f1 : Hz, f2 : Hz, f3 : Hz, q : Ratio = 8) : Audio {
    soit qq = clamp(q, 1, 30)
    rend (passe_bande(x, f1, qq) + 0.5 * passe_bande(x, f2, qq) + 0.25 * passe_bande(x, f3, qq)) * 0.5
}`,
  ecrase: `fonction ecrase(x : Audio, niveaux : Ratio = 16) : Audio {
    soit n = clamp(arrondi(niveaux), 2, 256)
    rend arrondi(x * n) / n
}`,
  cloche: `fonction cloche(freq : Hz, duree : s = 3 s) : Audio {
    soit f = clamp(freq, 40 Hz, 2 kHz)
    soit t = rampe(0 s, 60 s, 60 s)
    soit d = clamp(duree, 0.3 s, 20 s)
    soit p1 = sinus(f * 0.56) * 1.00 * exp(-6.907755 * t / (d * 1.000))
    soit p2 = sinus(f * 0.56 + 1 Hz) * 0.67 * exp(-6.907755 * t / (d * 0.900))
    soit p3 = sinus(f * 0.92) * 1.00 * exp(-6.907755 * t / (d * 0.650))
    soit p4 = sinus(f * 0.92 + 1.7 Hz) * 1.80 * exp(-6.907755 * t / (d * 0.550))
    soit p5 = sinus(f * 1.19) * 2.67 * exp(-6.907755 * t / (d * 0.325))
    soit p6 = sinus(f * 1.70) * 1.67 * exp(-6.907755 * t / (d * 0.350))
    soit p7 = sinus(f * 2.00) * 1.46 * exp(-6.907755 * t / (d * 0.250))
    soit p8 = sinus(f * 2.74) * 1.33 * exp(-6.907755 * t / (d * 0.200))
    soit p9 = sinus(f * 3.00) * 1.33 * exp(-6.907755 * t / (d * 0.150))
    soit p10 = sinus(f * 3.76) * 1.00 * exp(-6.907755 * t / (d * 0.100))
    soit p11 = sinus(f * 4.07) * 1.33 * exp(-6.907755 * t / (d * 0.075))
    rend (p1 + p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9 + p10 + p11) * 0.055
}`,
};
