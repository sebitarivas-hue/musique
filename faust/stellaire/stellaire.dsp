// Musique stellaire : un drone qui respire, un chœur d'argent, des granulations aiguës, un vent solaire, un pulsar, une grande salle.
// La page n'envoie que trois choses : l'éclat du soleil (0 braise, 1 plein feu), la racine et le mode de la planète regardée.
import("stdfaust.lib");

eclat  = hslider("eclat", 0.3, 0, 1, 0.001) : si.smooth(ba.tau2pole(2.5));
racine = hslider("racine", 55, 27.5, 110, 0.01) : si.smooth(ba.tau2pole(5));
mode   = hslider("mode", 0, 0, 5, 1);
air    = hslider("air", 0.6, 0, 1, 0.01) : si.smooth(ba.tau2pole(.5));
marche = checkbox("marche") : si.smooth(ba.tau2pole(3));


// ---------- La personnalité de chaque planète : 14 colonnes (soleil, mercure, venus, terre, mars, jupiter, saturne, uranus, neptune, pluton, ceres, eris, makemake, haumea) ----------
planete = hslider("planete", 0, 0, 13, 1);
chg = (int(planete) != int(planete'));
T(a0,a1,a2,a3,a4,a5,a6,a7,a8,a9,a10,a11,a12,a13) = ba.selectn(14, planete, a0,a1,a2,a3,a4,a5,a6,a7,a8,a9,a10,a11,a12,a13) : si.smooth(ba.tau2pole(2.6));
bril = T(1, 1.5, 0.6, 1.05, 0.7, 0.55, 1.4, 1.7, 0.8, 0.5, 1.1, 1.2, 0.9, 1.1);
dens = T(1, 2.2, 0.5, 1.1, 0.6, 0.45, 1.5, 0.7, 0.9, 0.2, 2.4, 1.1, 1.3, 1.8);
reg = T(1, 1.5, 0.7, 1, 0.6, 0.5, 1.2, 2, 0.8, 2.5, 1.3, 1.5, 1.1, 1.2);
large = T(1, 0.6, 2.2, 1.2, 0.5, 2.8, 2, 0.8, 2.5, 0.4, 0.5, 1, 1.4, 1);
ventG = T(1, 0.3, 1.8, 0.9, 2.2, 1.6, 0.4, 0.2, 1.2, 0.1, 1, 0.5, 0.6, 0.7);
ventF = T(1, 1.5, 0.5, 1, 0.7, 0.4, 1.3, 1.8, 0.7, 0.4, 1, 1.1, 0.9, 1);
subG = T(1, 0.5, 1.3, 0.9, 1.5, 1.8, 1, 0.4, 1.5, 0.6, 0.7, 0.8, 0.8, 0.9);
pulsR = T(1, 2.2, 0.5, 1, 1.4, 0.35, 0.7, 0.45, 0.4, 0.15, 1.8, 0.6, 0.8, 1.2);

// ---------- Harmonie : six modes en rapports justes, sept degrés chacun ----------
echelle(0) = (1, 9/8, 5/4, 3/2, 15/8, 2, 9/4);      // lydien clair
echelle(1) = (1, 9/8, 6/5, 3/2, 8/5, 2, 9/4);       // éolien
echelle(2) = (1, 16/15, 6/5, 3/2, 8/5, 2, 32/15);   // phrygien sombre
echelle(3) = (1, 9/8, 4/3, 3/2, 27/16, 2, 9/4);     // pentatonique ouvert, sans tierce
echelle(4) = (1, 9/8, 5/4, 11/8, 3/2, 7/4, 2);      // acoustique
echelle(5) = (1, 8/7, 4/3, 3/2, 12/7, 2, 16/7);     // septième harmonique
choisir(i, m) = ba.selectn(7, i, echelle(m));
deg(m, i) = ba.selectn(6, m, choisir(i, 0), choisir(i, 1), choisir(i, 2), choisir(i, 3), choisir(i, 4), choisir(i, 5));

// l'accord de fond se déplace très lentement : quatre degrés tenus environ 38 s chacun, glissant de l'un à l'autre en sept secondes
mouv = os.lf_sawpos(1 / 152) * 4 : int;
degres = ba.selectn(4, mouv, 0, 3, 1, 4);
rac = racine * (deg(mode, degres) : si.smooth(ba.tau2pole(7)));

// ---------- 1. Le drone : trois couches ----------
sous = subG * (os.osc(rac * .5) * .55 + os.osc(rac) * .35) * (.8 + .2 * os.osc(.05));
dents(f, i) = os.sawtooth(f * (1 + large * ba.take(i + 1, (-.0042, -.0021, -.0008, 0, .0011, .0023, .0044))));
corps(f) = par(i, 7, dents(f, i)) :> /(7);
coupure = (180 + 1700 * eclat + 400 * (no.lfnoise(.09) * .5 + .5)) * bril;
couche(f) = corps(f) : fi.resonlp(min(coupure, 9000), .9, 1);
cor = (couche(rac) * .5 + couche(rac * 1.5) * .3 + couche(rac * 2) * .22) : fi.lowpass(2, 5000);
// l'orgue : douze partiels, chacun avec sa respiration (périodes de 17 à 61 s) ; le soleil en ouvre de plus en plus
ouvert(k) = max(0, min(1, 3 + 9 * eclat - k));
partiel(k) = os.osc(rac * (k + 1) * (1 + .0007 * no.lfnoise(.07 + k * .003))) * (1 / ((k + 1) ^ 1.05))
   * (.5 + .5 * os.osc(1 / (17 + 2.9 * k))) * ouvert(k);
orgue = par(k, 12, partiel(k)) :> *(.46);
drone = (sous + cor * .9 + orgue) * (.55 + .45 * eclat) * .26;

// ---------- 2. Le chœur d'argent : trois sinus qui battent, deux octaves plus haut ----------
voixArgent(i) = (os.osc(f) + os.osc(f * (1 + .0021 * large)) * .8 + os.osc(f * (1 - .0022 * large)) * .8) / 2.6 * (.5 + .5 * os.osc(.031 + .007 * i))
   with { f = rac * ba.take(i + 1, (1, 3/2, 2, 3, 4, 6)) * 4; };
argent = par(i, 6, voixArgent(i)) :> *(.1 * (.15 + .85 * eclat));

// ---------- 3. Le vent solaire : bruit rose en bande étroite qui glisse ----------
vent = no.pink_noise : fi.resonbp(min(12000, (300 + 2800 * (no.lfnoise(.13) * .5 + .5) * (.4 + eclat)) * ventF), 6, 1)
   * (.5 + .5 * no.lfnoise(.2)) * (.3 + 1.2 * eclat) * ventG;

// ---------- 4. La granulation ----------
// (a) des gouttes : un grain de sinus (enveloppe en cloche) sur un partiel aigu de l'accord, tiré au hasard, posé au hasard dans l'espace
// les sept degrés du mode, calculés une fois pour toutes les voix
degAll = par(j, 7, deg(mode, j));
NG = 7;
alea(n, j) = no.noises(4 * n, j) * .5 + .5;
grain(i) = os.osc(fg) * env * env * (.4 + .6 * tire(2)) <: (*(1 - p), *(p))
 with {
   taux = (.4 + 9 * eclat * eclat + 2 * eclat) * (.6 + .8 * (no.lfnoise(.05) * .5 + .5)) * dens;
   dec = abs(no.noises(4 * NG, 4 * i + 3)) < (taux / ma.SR);
   tire(j) = ba.sAndH(dec, alea(NG, 4 * i + j));
   fg = rac * ba.selectn(7, int(tire(0) * 6.99), degAll) * (2 ^ int(3 + 2 * tire(1) * .999)) * 2 * reg : min(15000);
   env = en.ar(.012 + .06 * tire(2), .15 + .9 * tire(1), dec);
   p = tire(3);
 };
gouttes = par(i, NG, grain(i)) :> (*(.2 * (.1 + .9 * eclat)), *(.2 * (.1 + .9 * eclat)));

// (b) la vraie granulation : des fragments de la matière du drone, rejoués plus tôt, plus vite ou plus lentement, sous une fenêtre de Hann
NH = 5;
frag(i) = de.fdelay(131072, pos) : *(fen * (.3 + .7 * tire(2))) <: (*(1 - tire(3)), *(tire(3)))
 with {
   taux2 = .8 + 6 * eclat;
   dec = abs(no.noises(4 * NH, 4 * i + 3)) < (taux2 / ma.SR);
   tire(j) = ba.sAndH(dec, alea(NH, 4 * i + j));
   dur = tire(0) * .35 + .12;
   phase = ba.countup(1048576, dec) / max(1, dur * ma.SR) : min(1);
   fen = (4 * phase * (1 - phase)) ^ 2 * (phase < 1);
   base = (.2 + 1.6 * tire(1)) * ma.SR;
   vit = tire(2) * 1.6 - .35;
   pos = max(2, min(130000, base + vit * phase * dur * ma.SR));
 };
poussiere = _ <: par(i, NH, frag(i)) :> (_, _);

// ---------- 5. Le pulsar : une note aiguë qui revient toutes les 2,6 s, perdue dans des échos ----------
note = rac * 8 * deg(mode, 4);
puls = os.osc(min(14000, note * reg)) * en.ar(.008, 1.6, os.lf_imptrain(pulsR / 2.6)) * (.12 * (.3 + .7 * eclat));
pulsStereo = puls <: (ef.echo(1, .38, .55), ef.echo(1, .57, .5));


// tables du banc modal : choisies sans lissage, une fois par frappe (un filtre très résonant ne supporte pas qu'on fasse glisser ses coefficients)
modGT = (0.3,0.4,0.35,0.35,0.55,0.35,0.3,0.4,0.33,0.5,0.5,0.5,0.4,0.38);
modRateT = (0.3, 1.4, 0.35, 0.7, 0.8, 0.25, 0.6, 0.35, 0.4, 0.08, 1.6, 0.3, 0.5, 0.9);
modDecT = (3, 0.9, 6, 3, 0.6, 9, 6, 4, 7, 8, 0.35, 3, 3, 2);
modRegT = (1, 2, 0.5, 1, 0.5, 0.25, 1.5, 2, 0.7, 3, 1.2, 1, 1, 1.3);
rat0T = (1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1);
rat1T = (2, 2.756, 1.5, 2, 1.59, 1.51, 1.07, 2.32, 1.003, 2, 1.8, 1.62, 1.3333, 1.19);
rat2T = (3, 5.404, 2.01, 3, 2.14, 2.03, 1.12, 4.25, 2, 4, 2.6, 2.62, 1.5, 1.41);
rat3T = (4, 8.933, 2.99, 4.01, 2.3, 2.52, 1.19, 6.63, 2.004, 8, 3.9, 4.24, 2, 1.68);
rat4T = (5, 13.34, 4.02, 5.99, 2.65, 3.05, 1.28, 9.38, 3, 16, 5.7, 6.85, 2.6667, 2);

// ---------- 6. L'instrument de la planète : cinq modes de résonance frappés au hasard ----------
// Deux bancs alternent : à chaque changement de planète, l'ancien banc finit de sonner, tel quel, pendant que le nouveau, accordé sur la nouvelle planète, monte en fondu et reçoit un premier coup.
// Leurs rapports, leur durée et leur registre changent avec la planète (métal pour Mercure, verre pour Uranus, peau pour Mars, gong pour Jupiter, anneaux serrés pour Saturne...).
n = chg : (+ ~ _);
chg2 = (n != n');
actif(k) = (int(n) % 2 == k);
portee(k) = ba.sAndH(actif(k), planete);
pick(t, k) = ba.selectn(14, portee(k), t);
banque(k) = (modes(1), modes(1.0016)) : (*(g), *(g))
 with {
   g = actif(k) : si.smooth(ba.tau2pole(.9)) : *(pick(modGT, k) * .5);
   frappe = (((abs(no.noises(8, 5 + k)) < (pick(modRateT, k) * (.6 + .8 * eclat) / ma.SR)) | chg2) * actif(k)) > 0;
   amp = ba.sAndH(frappe, no.noises(8, 6 + k) * .5 + .5) * .6 + .4;
   fb = ba.sAndH(chg2 * actif(k) + (n == 0), rac * 4 * pick(modRegT, k));      // accordé une seule fois, quand le banc devient actif
   dec = pick(modDecT, k);
   temps = ba.countup(1048576, frappe) / ma.SR;
   env(i) = exp(0 - temps / (dec / 6.9 / (1 + .5 * i))) * min(1, temps / .002);
   // chaque mode est une sinusoïde dont l'enveloppe retombe en exponentielle depuis le coup (les aigus plus vite) : jamais d'énergie cachée dans un filtre
   mode_(i, r, d, w) = os.osc(min(15000, fb * r * d)) * w * amp * env(i);
   modes(d) = (mode_(0, pick(rat0T, k), d, 1), mode_(1, pick(rat1T, k), d, .7), mode_(2, pick(rat2T, k), d, .5), mode_(3, pick(rat3T, k), d, .35), mode_(4, pick(rat4T, k), d, .25)) :> _;
 };
instrument = (banque(0), banque(1)) :> (_, _);

// la houle d'arrivée : quand on change de planète, un souffle monte puis se fond dans le nouveau timbre
houle = en.ar(1.4, 3.6, chg2);
arrivee = (no.pink_noise : fi.resonbp(260 + 6000 * houle * houle, 3, 1) * houle * .22), (no.noises(8, 3) : fi.resonbp(300 + 5200 * houle * houle, 3, 1) * houle * .22);

// ---------- Mélange et salle ----------
brut = drone + vent;
matiere = brut + argent;
dessus = (matiere * .8) : poussiere;
somme = ((matiere <: _, _), gouttes, dessus, pulsStereo, instrument, arrivee) :> (_, _);
salle = _, _ <: (*(1 - .5 * air), *(1 - .5 * air), (re.zita_rev1_stereo(60, 200, 6000, 7 + 4 * air, 8 + 4 * air, 48000) : (*(.9 * air), *(.9 * air)))) :> (_, _);
fin = (fi.dcblocker, fi.dcblocker) : (ma.tanh, ma.tanh);
process = somme : salle : fin : (*(1.2 * marche), *(1.2 * marche));
