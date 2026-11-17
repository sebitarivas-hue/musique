// Transport de SONORA Pistes : l'horloge musicale. Sans DOM et sans contexte audio : testé dans Node.
//
// Une lecture est décrite par une horloge `h` : { debutCtx, debutTete, boucle }.
//   debutCtx   : l'instant de l'horloge audio (ctx.currentTime) où la lecture est à la position debutTete (secondes du projet).
//                Avec un précompte, debutCtx est dans le futur : avant lui, la tête attend en debutTete pendant que le précompte sonne.
//   boucle     : null, ou { debut, fin } en secondes du projet. La lecture va de debutTete à fin, puis revient à debut, sans fin.
//                Si debutTete est déjà après fin, la boucle ne joue pas : la lecture est droite.
// Tout ce qui dépend du temps (tête de lecture, métronome, clips, date d'une note jouée) se déduit de cette horloge et de l'horloge audio,
// jamais d'un minuteur : un minuteur peut être retardé par la page, l'horloge audio non.

export const boucleActive = h => !!(h && h.boucle && h.boucle.fin - h.boucle.debut > 0.05 && h.debutTete < h.boucle.fin);

// Position du projet (secondes) à l'instant ct de l'horloge audio.
export function teteDe(h, ct) {
  const dt = ct - h.debutCtx;
  if (dt <= 0) return h.debutTete;   // précompte : la tête ne bouge pas
  if (!boucleActive(h)) return h.debutTete + dt;
  const premier = h.boucle.fin - h.debutTete; if (dt < premier) return h.debutTete + dt;
  const L = h.boucle.fin - h.boucle.debut; return h.boucle.debut + ((dt - premier) % L);
}

// Les tours de la lecture, en instants de l'horloge audio. Le tour 0 va de debutTete à fin (ou sans fin sans boucle) ; les tours suivants jouent la boucle entière.
export function tour(h, n) {
  if (!boucleActive(h)) return n === 0 ? { ctx: h.debutCtx, depuis: h.debutTete, jusque: null, duree: Infinity } : null;
  const premier = h.boucle.fin - h.debutTete, L = h.boucle.fin - h.boucle.debut;
  return n === 0 ? { ctx: h.debutCtx, depuis: h.debutTete, jusque: h.boucle.fin, duree: premier } : { ctx: h.debutCtx + premier + (n - 1) * L, depuis: h.boucle.debut, jusque: h.boucle.fin, duree: L };
}

// Les clics du métronome tombant dans [c0, c1[ de l'horloge audio : [{ t, accent }]. Le temps k du projet est à k * dt secondes ; le premier temps de la mesure est accentué.
// On appelle cette fonction avec des fenêtres qui se suivent (c1 d'un appel = c0 du suivant) : aucun clic n'est perdu ni doublé, même après un retard de la page,
// et la boucle est suivie tour après tour.
export function clics(h, c0, c1, dt, temps) {
  const out = []; if (!(c1 > c0) || !(dt > 0)) return out;
  for (let n = 0; ; n++) {
    const T = tour(h, n); if (!T) break; const fin = T.ctx + T.duree; if (T.ctx >= c1) break; if (fin <= c0) continue;
    const a = Math.max(c0, T.ctx), b = Math.min(c1, fin);
    for (let k = Math.ceil((T.depuis + (a - T.ctx)) / dt - 1e-9); ; k++) { const t = T.ctx + (k * dt - T.depuis); if (t >= b - 1e-12) break; if (t >= a - 1e-12) out.push({ t, accent: k % temps === 0 }); }
    if (T.duree === Infinity) break;
  }
  return out;
}

// Le précompte : `mesures` mesures de clics avant debutCtx. [{ t, accent }]
export function precompte(debutCtx, dt, temps, mesures) {
  const n = Math.max(0, Math.round(temps * mesures)), out = []; for (let i = 0; i < n; i++) out.push({ t: debutCtx - (n - i) * dt, accent: i % temps === 0 }); return out;
}
export const dureePrecompte = (dt, temps, mesures) => Math.max(0, Math.round(temps * mesures)) * dt;

// Une date de l'horloge de la page (performance.now(), celle de event.timeStamp) en instant de l'horloge audio.
// `repere` : ctx.getOutputTimestamp() = { contextTime, performanceTime }.
export const ctxDePage = (perf, repere) => repere.contextTime + (perf - repere.performanceTime) / 1000;
// Le moment du projet que la personne visait en jouant une note : elle joue en suivant ce qu'elle entend, et le son sort `latence` secondes après l'instant de l'horloge audio.
export const dateJouee = (h, ctNote, latence = 0) => Math.max(0, teteDe(h, ctNote - latence));

// Enregistrement : la capture démarre avant la lecture (il faut ouvrir le micro). Ce qui précède l'instant `debutLecture` ne fait pas partie de la prise, pas plus que
// la latence de sortie (la personne a joué en retard de cette durée sur ce qu'elle entendait). Nombre d'échantillons à retirer au début de la capture.
export const echantillonsADecouper = ({ debutCapture, debutLecture, latence = 0, sr }) => Math.max(0, Math.round((Math.max(0, debutLecture - debutCapture) + Math.max(0, latence)) * sr));
