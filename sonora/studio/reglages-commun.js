// Code partagé par le Studio et SONORA Science : affichage des valeurs de réglage avec leur unité, et correspondance entre la position d'un curseur et sa valeur.
export function formater(v, r) {
  if (r.booleen) return v ? "oui" : "non";
  if (r.choix) return r.choix[Math.round(v)] ?? String(v);
  if (r.unite === "Hz") return v >= 1000 ? (v / 1000).toFixed(v >= 10000 ? 1 : 2).replace(/\.?0+$/, "") + " kHz" : (v >= 100 ? v.toFixed(0) : v.toFixed(1).replace(/\.0$/, "")) + " Hz";
  if (r.unite === "s") return v < 1 ? (v * 1000).toFixed(v < 0.01 ? 1 : 0).replace(/\.0$/, "") + " ms" : v.toFixed(2).replace(/\.?0+$/, "") + " s";
  if (r.unite === "dB") return v.toFixed(1) + " dB";
  if (r.unite === "tour") return v.toFixed(2) + " tour";
  if (r.unite === "dt") return v.toFixed(1) + " dt";
  if (r.min === 0 && r.max === 1) return Math.round(v * 100) + " %";
  return Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(2).replace(/\.?0+$/, "");
}
export const vers = (t, r) => { // position du curseur (0 à 1) vers valeur
  const lo = r.min, hi = r.max;
  let v = r.courbe === "log" ? lo * Math.pow(hi / lo, t) : r.courbe === "exp" ? lo + (hi - lo) * t * t * t : lo + (hi - lo) * t;
  if (r.pas) v = lo + Math.round((v - lo) / r.pas) * r.pas;
  return Math.min(hi, Math.max(lo, v));
};
export const depuis = (v, r) => { const lo = r.min, hi = r.max; const t = r.courbe === "log" ? Math.log(v / lo) / Math.log(hi / lo) : r.courbe === "exp" ? Math.cbrt((v - lo) / (hi - lo)) : (v - lo) / (hi - lo); return Math.min(1, Math.max(0, t)); };
