// Procédure adaptative « 2 vers le bas, 1 vers le haut » (Levitt) pour mesurer un seuil de discrimination.
// La différence diminue après deux réponses justes de suite et augmente après une erreur : elle converge vers le seuil à 70,7 % de réussite.
export class Escalier {
  constructor({ depart = 40, facteur = 1.5, min = 0.5, max = 400, inversionsFin = 8, essaisMax = 60, inversionsMoyenne = 6 } = {}) {
    Object.assign(this, { delta: depart, facteur, min, max, inversionsFin, essaisMax, inversionsMoyenne });
    this.essais = []; this.inversions = []; this.serie = 0; this.sens = 0;
  }
  get fini() { return this.inversions.length >= this.inversionsFin || this.essais.length >= this.essaisMax; }
  // enregistre une réponse (juste : booléen) pour la différence courante et prépare la suivante
  repondre(juste) {
    const d = this.delta; this.essais.push({ delta: d, juste });
    let sens = this.sens;
    if (juste) { this.serie++; if (this.serie >= 2) { this.serie = 0; sens = -1; this.delta = Math.max(this.min, d / this.facteur); } }
    else { this.serie = 0; sens = 1; this.delta = Math.min(this.max, d * this.facteur); }
    if (sens !== 0 && this.sens !== 0 && sens !== this.sens) this.inversions.push(d);
    if (sens !== 0) this.sens = sens;
    return this.delta;
  }
  // moyenne géométrique des dernières inversions (la fin de l'escalier, où la mesure est stable) ; null s'il y en a trop peu
  get seuil() {
    const l = this.inversions.slice(-this.inversionsMoyenne); if (l.length < 4) return null;
    return Math.exp(l.reduce((s, v) => s + Math.log(v), 0) / l.length);
  }
}
