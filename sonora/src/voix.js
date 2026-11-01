// Attribution des voix d'un instrument polyphonique. Partagé par le moteur temps réel et le rendu hors ligne,
// pour que les deux se comportent de la même façon (et que les tests Node valident la règle).
// Règles de vol quand toutes les voix sont prises : plus_ancienne (défaut), plus_basse, aucune.
export class Polyphonie {
  constructor(nbVoix, regle = "plus_ancienne") {
    this.regle = regle;
    this.voix = Array.from({ length: nbVoix }, () => ({ actif: false, id: -1, hauteur: 0, vitesse: 0, porte: 0, ordre: 0, calmes: 0 }));
    this.compteur = 0;
  }
  // renvoie l'indice de la voix attribuée, ou -1 si la note est ignorée (règle « aucune »)
  noteOn(id, hauteur, vitesse) {
    let v = this.voix.findIndex(x => x.actif && x.id === id);
    if (v < 0) v = this.voix.findIndex(x => !x.actif);
    if (v < 0) {
      if (this.regle === "aucune") return -1;
      const liberables = this.voix.map((x, i) => [x, i]);
      const relachees = liberables.filter(([x]) => !x.porte);
      const pool = relachees.length ? relachees : liberables;
      v = (this.regle === "plus_basse" ? pool.reduce((m, p) => p[0].hauteur < m[0].hauteur ? p : m) : pool.reduce((m, p) => p[0].ordre < m[0].ordre ? p : m))[1];
    }
    Object.assign(this.voix[v], { actif: true, id, hauteur, vitesse, porte: 1, ordre: ++this.compteur, calmes: 0 });
    this.voix[v].retrig = true;
    return v;
  }
  noteOff(id) { for (const x of this.voix) if (x.actif && x.id === id && x.porte) x.porte = 0; }
  toutCouper() { for (const x of this.voix) { x.actif = false; x.porte = 0; } }
  // Après chaque bloc : une voix relâchée qui reste silencieuse quelques blocs est libérée (la queue de l'enveloppe est finie).
  finBloc(i, niveau) {
    const x = this.voix[i];
    if (!x.actif || x.porte) { x.calmes = 0; return; }
    if (niveau < 1e-5) { if (++x.calmes >= 4) x.actif = false; } else x.calmes = 0;
  }
  get actives() { return this.voix.filter(x => x.actif).length; }
}
