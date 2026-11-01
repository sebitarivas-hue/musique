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
  sature: `fonction sature(x : Audio, gain : dB) : Audio {
    rend tanh(x * lin(gain))
}`,
  ecrete: `fonction ecrete(x : Audio, gain : dB) : Audio {
    rend clamp(x * lin(gain), -1, 1)
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
};
