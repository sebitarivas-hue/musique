// Musique stellaire : un drone qui respire, un chœur d'argent, des granulations aiguës, un vent solaire, un pulsar, une grande salle.
// La page n'envoie que trois choses : l'éclat du soleil (0 braise, 1 plein feu), la racine et le mode de la planète regardée.
import("stdfaust.lib");

eclat  = hslider("eclat", 0.3, 0, 1, 0.001) : si.smooth(ba.tau2pole(2.5));
racine = hslider("racine", 55, 27.5, 110, 0.01) : si.smooth(ba.tau2pole(5));
mode   = hslider("mode", 0, 0, 5, 1);
air    = hslider("air", 0.6, 0, 1, 0.01) : si.smooth(ba.tau2pole(.5));
marche = checkbox("marche") : si.smooth(ba.tau2pole(3));

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
sous = (os.osc(rac * .5) * .55 + os.osc(rac) * .35) * (.8 + .2 * os.osc(.05));
dents(f, i) = os.sawtooth(f * (1 + ba.take(i + 1, (-.0042, -.0021, -.0008, 0, .0011, .0023, .0044))));
corps(f) = par(i, 7, dents(f, i)) :> /(7);
coupure = 180 + 1700 * eclat + 400 * (no.lfnoise(.09) * .5 + .5);
couche(f) = corps(f) : fi.resonlp(min(coupure, 9000), .9, 1);
cor = (couche(rac) * .5 + couche(rac * 1.5) * .3 + couche(rac * 2) * .22) : fi.lowpass(2, 5000);
// l'orgue : seize partiels, chacun avec sa respiration (périodes de 17 à 61 s) ; le soleil en ouvre de plus en plus
ouvert(k) = max(0, min(1, 3 + 11 * eclat - k));
partiel(k) = os.osc(rac * (k + 1) * (1 + .0007 * no.lfnoise(.07 + k * .003))) * (1 / ((k + 1) ^ 1.05))
   * (.5 + .5 * os.osc(1 / (17 + 2.9 * k))) * ouvert(k);
orgue = par(k, 16, partiel(k)) :> *(.38);
drone = (sous + cor * .9 + orgue) * (.55 + .45 * eclat) * .26;

// ---------- 2. Le chœur d'argent : trois sinus qui battent, deux octaves plus haut ----------
voixArgent(i) = (os.osc(f) + os.osc(f * 1.0021) * .8 + os.osc(f * .9978) * .8) / 2.6 * (.5 + .5 * os.osc(.031 + .007 * i))
   with { f = rac * ba.take(i + 1, (1, 3/2, 2, 3, 4, 6)) * 4; };
argent = par(i, 6, voixArgent(i)) :> *(.1 * (.15 + .85 * eclat));

// ---------- 3. Le vent solaire : bruit rose en bande étroite qui glisse ----------
vent = no.pink_noise : fi.resonbp(300 + 2800 * (no.lfnoise(.13) * .5 + .5) * (.4 + eclat), 6, 1)
   * (.5 + .5 * no.lfnoise(.2)) * (.3 + 1.2 * eclat);

// ---------- 4. La granulation ----------
// (a) des gouttes : un grain de sinus (enveloppe en cloche) sur un partiel aigu de l'accord, tiré au hasard, posé au hasard dans l'espace
NG = 10;
alea(n, j) = no.noises(4 * n, j) * .5 + .5;
grain(i) = os.osc(fg) * env * env * (.4 + .6 * tire(2)) <: (*(1 - p), *(p))
 with {
   taux = (.4 + 9 * eclat * eclat + 2 * eclat) * (.6 + .8 * (no.lfnoise(.05) * .5 + .5));
   dec = abs(no.noises(4 * NG, 4 * i + 3)) < (taux / ma.SR);
   tire(j) = ba.sAndH(dec, alea(NG, 4 * i + j));
   fg = rac * deg(mode, int(tire(0) * 6.99)) * (2 ^ int(3 + 2 * tire(1) * .999)) * 2;
   env = en.ar(.012 + .06 * tire(2), .15 + .9 * tire(1), dec);
   p = tire(3);
 };
gouttes = par(i, NG, grain(i)) :> (*(.2 * (.1 + .9 * eclat)), *(.2 * (.1 + .9 * eclat)));

// (b) la vraie granulation : des fragments de la matière du drone, rejoués plus tôt, plus vite ou plus lentement, sous une fenêtre de Hann
NH = 8;
frag(i) = de.fdelay(131072, pos) : *(fen * (.3 + .7 * tire(2))) <: (*(1 - tire(3)), *(tire(3)))
 with {
   taux2 = .8 + 6 * eclat;
   dec = abs(no.noises(4 * NH, 4 * i + 3)) < (taux2 / ma.SR);
   tire(j) = ba.sAndH(dec, alea(NH, 4 * i + j));
   dur = tire(0) * .35 + .12;
   phase = ba.countup(1048576, dec) / max(1, dur * ma.SR) : min(1);
   fen = (.5 - .5 * cos(2 * ma.PI * phase)) * (phase < 1);
   base = (.2 + 1.6 * tire(1)) * ma.SR;
   vit = 2 ^ (tire(2) * 1.8 - .6) - 1;
   pos = max(2, min(130000, base + vit * phase * dur * ma.SR));
 };
poussiere = _ <: par(i, NH, frag(i)) :> (_, _);

// ---------- 5. Le pulsar : une note aiguë qui revient toutes les 2,6 s, perdue dans des échos ----------
note = rac * 8 * deg(mode, 4);
puls = os.osc(note) * en.ar(.008, 1.6, os.lf_imptrain(1 / 2.6)) * (.12 * (.3 + .7 * eclat));
pulsStereo = puls <: (ef.echo(1, .38, .55), ef.echo(1, .57, .5));

// ---------- Mélange et salle ----------
brut = drone + vent;
matiere = brut + argent;
dessus = (matiere * .8) : poussiere;
somme = ((matiere <: _, _), gouttes, dessus, pulsStereo) :> (_, _);
salle = _, _ <: (*(1 - .5 * air), *(1 - .5 * air), (re.zita_rev1_stereo(60, 200, 6000, 7 + 4 * air, 8 + 4 * air, 48000) : (*(.9 * air), *(.9 * air)))) :> (_, _);
fin = (fi.dcblocker, fi.dcblocker) : (ma.tanh, ma.tanh);
process = somme : salle : fin : (*(1.2 * marche), *(1.2 * marche));
