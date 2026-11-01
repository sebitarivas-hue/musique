// Réverbération de SONORA Pistes : zita_rev1 des bibliothèques Faust (réseau de retards à rétroaction, d'après la réverbération
// zita-rev1 de Fons Adriaensen, portée en Faust par Julius O. Smith III). Entrée et sortie stéréo ; la sortie est le seul son réverbéré.
declare name "SONORA Pistes, réverbération";
import("stdfaust.lib");
duree = hslider("duree", 2, 0.3, 8, 0.01);       // temps de déclin de 60 dB aux fréquences moyennes, en secondes
aigus = hslider("aigus", 6000, 1500, 20000, 1);  // au-dessus de cette fréquence, le son s'éteint plus vite (absorption de l'air et des murs)
process = re.zita_rev1_stereo(20, 200, aigus, duree, duree, 48000);
