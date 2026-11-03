// Génération de code : un graphe optimisé devient une fonction JavaScript `creer(sr)` qui renvoie un noyau de calcul.
// Le noyau ne fait aucune allocation dans `traiter`. Les contrôles sont évalués tous les 32 échantillons puis interpolés.
// Un module polyphonique donne deux noyaux : celui d'une voix (instancié une fois par voix) et le noyau maître (qui reçoit la somme des voix).
import { tardive } from "./graphe.js?v=db143e25e1";

export const SOUS_BLOC = 32;
const nombre = v => { const s = String(v); return v < 0 || Object.is(v, -0) ? `(${s})` : s; };
const CHAMPS_NOTE = { hauteur: 0, vitesse: 1, porte: 2, id: 3 };
const FORMES_LFO = ["sinus", "triangle", "carre", "dent"];
const MODULES_FILTRE = new Set(["passe_bas", "passe_haut", "passe_bande", "coupe_bande", "pic"]);

function expression(n, R, accord) {
  const [a, b, c] = n.args.map(R);
  switch (n.op) {
    case "add": return `(${a} + ${b})`; case "sub": return `(${a} - ${b})`; case "mul": return `(${a} * ${b})`;
    case "div": return `dv(${a}, ${b})`; case "mod": return `md(${a}, ${b})`; case "pow": return `Math.pow(${a}, ${b})`;
    case "neg": return `(-${a})`; case "non": return `(${a} !== 0 ? 0 : 1)`;
    case "lt": return `(${a} < ${b} ? 1 : 0)`; case "le": return `(${a} <= ${b} ? 1 : 0)`; case "gt": return `(${a} > ${b} ? 1 : 0)`; case "ge": return `(${a} >= ${b} ? 1 : 0)`;
    case "eq": return `(${a} === ${b} ? 1 : 0)`; case "ne": return `(${a} !== ${b} ? 1 : 0)`;
    case "et": return `(${a} !== 0 && ${b} !== 0 ? 1 : 0)`; case "ou": return `(${a} !== 0 || ${b} !== 0 ? 1 : 0)`;
    case "sel": return `(${a} !== 0 ? ${b} : ${c})`;
    case "fn":
      switch (n.fn) {
        case "abs": return `Math.abs(${a})`; case "signe": return `Math.sign(${a})`; case "min": return `Math.min(${a}, ${b})`; case "max": return `Math.max(${a}, ${b})`;
        case "clamp": return `Math.min(Math.max(${a}, ${b}), ${c})`; case "mix": return `(${a} + (${b} - ${a}) * ${c})`;
        case "sin": case "cos": case "tan": case "tanh": case "exp": case "log": case "log2": case "sqrt": case "floor": return `Math.${n.fn}(${a})`;
        case "arrondi": return `Math.round(${a})`;
        case "lin": return `Math.pow(10, ${a} / 20)`; case "db": return `(20 * Math.log10(${a}))`;
        case "periode": case "frequence": return `dv(1, ${a})`;
        case "midi": return `(${nombre(accord)} * Math.pow(2, (${a} - 69) / 12))`; case "note_de": return `(69 + 12 * Math.log2(${a} / ${nombre(accord)}))`;
        case "transpose": return `(${a} * Math.pow(2, ${b} / 12))`;
      }
  }
  throw new Error("opération non générable : " + n.op + " " + (n.fn || ""));
}

// Vérifie, sur le graphe complet du module, que tout ce qu'il utilise est généré par cette version.
export function verifierGenerable(info, g, diags) {
  let ok = true; const vus = new Set();
  for (const n of g.noeuds) {
    if (n.op !== "prim") continue;
    if (!n.impl) {
      ok = false;
      if (!vus.has(n.nom)) { vus.add(n.nom); diags.erreur("E801", `Le module \`${n.nom}\` est vérifié mais pas encore disponible : il est prévu dans la bibliothèque de modules (phase ${n.phase} du plan général).`, n.debut, n.fin, { suggestion: "les modules disponibles sont : sinus, carre, triangle, dent, impulsions, bruit_blanc, bruit_rose, lfo, adsr, les cinq filtres, z1 et retarde" }); }
    } else if (n.nom === "lfo" && !FORMES_LFO.includes(n.consts.forme)) {
      ok = false; diags.erreur("E320", `La forme d'onde \`${n.consts.forme}\` n'existe pas pour lfo.`, n.debut, n.fin, { suggestion: `les formes sont : ${FORMES_LFO.join(", ")}` });
    } else if (n.nom === "additive" && n.consts.amplitudes.length > 64) {
      ok = false; diags.erreur("E702", "`additive` accepte 64 harmoniques au plus.", n.debut, n.fin);
    } else if (n.nom === "table_onde" && n.consts.t.length < 2) {
      ok = false; diags.erreur("E702", "Une table d'onde a au moins deux valeurs.", n.debut, n.fin);
    } else if (n.nom === "retarde") {
      // la durée maximale doit être connue : cela se voit sur le graphe optimisé, à la génération
    }
  }
  return ok;
}

// role : "complet" (module sans voix), "voix" (une voix) ou "maitre" (somme des voix puis traitements communs).
export function genererNoyau(info, g, racines, diags, role = "complet") {
  const N = g.noeuds;
  // ---- ordre de calcul : les entrées tardives des retards ne créent pas de dépendance ----
  const ordre = [], etat = new Map();
  const visite = id => {
    if (etat.has(id)) return; etat.set(id, 1);
    const n = N[id];
    n.args.forEach((a, i) => { if (!tardive(n, i)) visite(a); });
    ordre.push(id);
  };
  racines.forEach(visite);
  N.forEach(n => n.args.forEach((a, i) => { if (tardive(n, i)) visite(a); }));
  N.forEach(n => visite(n.id));

  // ---- les contrôles lus par du calcul audio sont interpolés ----
  const interp = new Set();
  const noterAudio = id => { if (N[id].r === "k") interp.add(id); };
  racines.forEach(noterAudio);
  for (const n of N) if (n.r === "a" || (n.op === "prim" && !MODULES_FILTRE.has(n.nom) && n.nom !== "adsr" && n.nom !== "lfo")) n.args.forEach(noterAudio);
  for (const n of N) if (n.op === "prim" && MODULES_FILTRE.has(n.nom)) noterAudio(n.args[0]);

  const R_ctrl = id => N[id].op === "const" ? nombre(N[id].val) : N[id].r === "c" ? `c${id}` : `k${id}`;
  const R_audio = id => N[id].op === "const" ? nombre(N[id].val) : N[id].r === "c" ? `c${id}` : N[id].r === "k" ? `ki${id}` : `a${id}`;
  const R_creer = id => N[id].op === "const" ? nombre(N[id].val) : `c${id}`;

  const creer = [], ctrl = [], audio = [], ecrit = [], reinit = [], appliquer = [];
  const canaux = racines.length;
  const dansCreer = (...l) => creer.push(...l);

  for (const id of ordre) {
    const n = N[id];
    if (n.op === "const") continue;
    if (n.r === "c") {
      if (n.op === "ech") dansCreer(`const c${id} = ${nombre(n.val)} / sr;`);
      else dansCreer(`const c${id} = ${expression(n, R_creer, info.accord)};`);
      continue;
    }
    if (n.op === "param") {
      const i = n.idx;
      dansCreer(`let sp${i} = ${nombre(info.reglages[i].defaut)}; const cf${i} = ${n.lissage > 0 ? `1 - Math.exp(-${SOUS_BLOC} / (sr * ${nombre(n.lissage)}))` : "1"};`);
      reinit.push(`sp${i} = cible[${i}];`); appliquer.push(`sp${i} = cible[${i}];`);
      ctrl.push(`sp${i} += (cible[${i}] - sp${i}) * cf${i}; const k${id} = sp${i};`);
      continue;
    }
    if (n.op === "note_champ") { ctrl.push(`const k${id} = note[${CHAMPS_NOTE[n.nom]}];`); continue; }
    if (n.op === "prim" && n.r === "k") {
      const a = n.args, P = R_ctrl;
      if (n.nom === "lfo") {
        dansCreer(`let lp${id} = 0;`); reinit.push(`lp${id} = 0;`);
        const f = { sinus: `Math.sin(6.283185307179586 * lp${id})`, triangle: `(4 * Math.abs(((lp${id} + 0.75) % 1) - 0.5) - 1)`, carre: `(lp${id} < 0.5 ? 1 : -1)`, dent: `(2 * lp${id} - 1)` }[n.consts.forme];
        ctrl.push(`const k${id} = ${f}; lp${id} += ${SOUS_BLOC} * ${P(a[0])} / sr; lp${id} -= Math.floor(lp${id});`);
        continue;
      }
      if (n.nom === "adsr") {
        dansCreer(`let st${id} = 0, lv${id} = 0, gt${id} = 0, rl${id} = 0;`); reinit.push(`st${id} = 0; lv${id} = 0; gt${id} = 0; rl${id} = 0;`);
        ctrl.push(`{ const g = ${P(a[0])} !== 0 ? 1 : 0;
        if (g && !gt${id}) st${id} = 1; else if (!g && gt${id}) { st${id} = 4; rl${id} = lv${id}; }
        gt${id} = g;
        const dt = ${SOUS_BLOC} / sr, att = Math.max(${P(a[1])}, 1e-4), dec = Math.max(${P(a[2])}, 1e-4), sus = ${P(a[3])}, rel = Math.max(${P(a[4])}, 1e-4);
        if (st${id} === 1) { lv${id} += dt / att; if (lv${id} >= 1) { lv${id} = 1; st${id} = 2; } }
        else if (st${id} === 2) { lv${id} -= (1 - sus) * dt / dec; if (lv${id} <= sus) { lv${id} = sus; st${id} = 3; } }
        else if (st${id} === 3) lv${id} = sus;
        else if (st${id} === 4) { lv${id} -= rl${id} * dt / rel; if (lv${id} <= 0) { lv${id} = 0; st${id} = 0; } } }
        const k${id} = lv${id};`);
        continue;
      }
      if (n.nom === "niveau") {
        // valeur efficace lissée : l'énergie est suivie à cadence audio (ligne ajoutée plus bas), lue ici à cadence contrôle
        dansCreer(`let en${id} = 0;`); reinit.push(`en${id} = 0;`);
        ctrl.push(`const ce${id} = 1 - Math.exp(-1 / (sr * Math.max(${P(a[1])}, 1e-4))); const k${id} = Math.sqrt(en${id});`);
        audio.push(`{ const x${id} = ${R_audio(a[0])}; en${id} += ce${id} * (x${id} * x${id} - en${id}); }`);
        continue;
      }
      if (n.nom === "rampe" || n.nom === "ar") {
        // se relance au début du programme, et à chaque note d'une voix (nouvelle note ou porte qui remonte)
        dansCreer(`let tp${id} = 0, id${id} = -1, gp${id} = 0;`); reinit.push(`tp${id} = 0; id${id} = -1; gp${id} = 0;`);
        const val = n.nom === "rampe"
          ? `${P(a[0])} + (${P(a[1])} - ${P(a[0])}) * Math.min(tp${id} / Math.max(${P(a[2])}, 1e-4), 1)`
          : `(tp${id} < Math.max(${P(a[0])}, 1e-4) ? tp${id} / Math.max(${P(a[0])}, 1e-4) : Math.max(0, 1 - (tp${id} - Math.max(${P(a[0])}, 1e-4)) / Math.max(${P(a[1])}, 1e-4)))`;
        ctrl.push(`{ const pg = note[2] > 0 ? 1 : 0; if (note[3] !== id${id} || (pg && !gp${id})) tp${id} = 0; id${id} = note[3]; gp${id} = pg; }
        const k${id} = ${val}; tp${id} += ${SOUS_BLOC} / sr;`);
        continue;
      }
      if (MODULES_FILTRE.has(n.nom)) throw new Error("filtre de cadence contrôle");
      throw new Error("module de cadence contrôle non géré : " + n.nom);
    }
    if (n.r === "k") { ctrl.push(`const k${id} = ${expression(n, R_ctrl, info.accord)};`); continue; }
    // ---- cadence audio ----
    const R = R_audio, a = n.args;
    if (n.op === "entree") { audio.push(`const a${id} = entrees && entrees[${n.idx}] ? entrees[${n.idx}][pos + j] : 0;`); continue; }
    if (n.op === "voix_somme") { audio.push(`const a${id} = somme && somme[${n.idx}] ? somme[${n.idx}][pos + j] : 0;`); continue; }
    if (n.op === "prim") {
      const nom = n.nom;
      if (nom === "sinus") {
        dansCreer(`let ph${id} = 0;`); reinit.push(`ph${id} = 0;`);
        audio.push(`const a${id} = Math.sin(6.283185307179586 * (ph${id} + ${R(a[1])})); ph${id} += ${R(a[0])} / sr; ph${id} -= Math.floor(ph${id});`);
        continue;
      }
      if (nom === "table_onde") {
        const t = n.consts.t; dansCreer(`const tb${id} = Float64Array.from([${t.map(nombre).join(", ")}]); let ph${id} = 0;`); reinit.push(`ph${id} = 0;`);
        audio.push(`const q${id} = ph${id} * ${t.length}, i${id} = Math.floor(q${id}), j${id} = i${id} + 1 === ${t.length} ? 0 : i${id} + 1, a${id} = tb${id}[i${id}] + (tb${id}[j${id}] - tb${id}[i${id}]) * (q${id} - i${id}); ph${id} += Math.abs(${R(a[0])}) / sr; ph${id} -= Math.floor(ph${id});`);
        continue;
      }
      if (nom === "additive") {
        const t = n.consts.amplitudes; dansCreer(`const tb${id} = Float64Array.from([${t.map(nombre).join(", ")}]); let ph${id} = 0;`); reinit.push(`ph${id} = 0;`);
        audio.push(`let a${id} = 0; { const fr${id} = Math.abs(${R(a[0])}); for (let h = 0; h < ${t.length}; h++) { if ((h + 1) * fr${id} >= sr * 0.5) break; a${id} += tb${id}[h] * Math.sin(6.283185307179586 * (h + 1) * ph${id}); } ph${id} += fr${id} / sr; ph${id} -= Math.floor(ph${id}); }`);
        continue;
      }
      if (nom === "carre" || nom === "dent" || nom === "triangle" || nom === "impulsions") {
        const ph0 = nom === "dent" ? 0.5 : 0;
        dansCreer(`let ph${id} = ${ph0};`); reinit.push(`ph${id} = ${ph0};`);
        const dt = `dt${id}`, avance = `ph${id} += ${dt}; ph${id} -= Math.floor(ph${id});`;
        if (nom === "carre") {
          audio.push(`const ${dt} = Math.min(Math.abs(${R(a[0])}) / sr, 0.5), w${id} = Math.min(Math.max(${R(a[1])}, 0.01), 0.99);
          let t${id} = ph${id} - w${id} + 1; t${id} -= Math.floor(t${id});
          const a${id} = (ph${id} < w${id} ? 1 : -1) + pb(ph${id}, ${dt}) - pb(t${id}, ${dt}); ${avance}`);
        } else if (nom === "dent") {
          audio.push(`const ${dt} = Math.min(Math.abs(${R(a[0])}) / sr, 0.5); const a${id} = (2 * ph${id} - 1) - pb(ph${id}, ${dt}); ${avance}`);
        } else if (nom === "triangle") {
          audio.push(`const ${dt} = Math.min(Math.abs(${R(a[0])}) / sr, 0.5); let u${id} = ph${id} + 0.75; u${id} -= Math.floor(u${id}); const a${id} = 4 * Math.abs(u${id} - 0.5) - 1; ${avance}`);
        } else {
          audio.push(`const ${dt} = Math.min(Math.abs(${R(a[0])}) / sr, 0.5); const o${id} = ph${id} + ${dt}; const a${id} = o${id} >= 1 ? 1 : 0; ${avance}`);
        }
        continue;
      }
      if (nom === "bruit_blanc") {
        dansCreer(`let rs${id} = ${n.consts.graine | 0 || 1};`); reinit.push(`rs${id} = ${n.consts.graine | 0 || 1};`);
        audio.push(`rs${id} ^= rs${id} << 13; rs${id} ^= rs${id} >>> 17; rs${id} ^= rs${id} << 5; const a${id} = (rs${id} >>> 0) / 2147483648 - 1;`);
        continue;
      }
      if (nom === "bruit_rose") {
        // méthode de Paul Kellet (filtre à six pôles sur un bruit blanc)
        dansCreer(`let rs${id} = ${n.consts.graine | 0 || 1}, p0_${id} = 0, p1_${id} = 0, p2_${id} = 0, p3_${id} = 0, p4_${id} = 0, p5_${id} = 0, p6_${id} = 0;`);
        reinit.push(`rs${id} = ${n.consts.graine | 0 || 1}; p0_${id} = p1_${id} = p2_${id} = p3_${id} = p4_${id} = p5_${id} = p6_${id} = 0;`);
        audio.push(`rs${id} ^= rs${id} << 13; rs${id} ^= rs${id} >>> 17; rs${id} ^= rs${id} << 5; const w${id} = (rs${id} >>> 0) / 2147483648 - 1;
        p0_${id} = 0.99886 * p0_${id} + w${id} * 0.0555179; p1_${id} = 0.99332 * p1_${id} + w${id} * 0.0750759; p2_${id} = 0.969 * p2_${id} + w${id} * 0.153852;
        p3_${id} = 0.8665 * p3_${id} + w${id} * 0.3104856; p4_${id} = 0.55 * p4_${id} + w${id} * 0.5329522; p5_${id} = -0.7616 * p5_${id} - w${id} * 0.016898;
        const a${id} = (p0_${id} + p1_${id} + p2_${id} + p3_${id} + p4_${id} + p5_${id} + p6_${id} + w${id} * 0.5362) * 0.11; p6_${id} = w${id} * 0.115926;`);
        continue;
      }
      if (MODULES_FILTRE.has(nom)) {
        // biquad de l'Audio EQ Cookbook ; les coefficients sont recalculés à chaque sous-bloc de contrôle
        dansCreer(`let b0_${id} = 1, b1_${id} = 0, b2_${id} = 0, c1_${id} = 0, c2_${id} = 0, s1_${id} = 0, s2_${id} = 0;`);
        reinit.push(`b0_${id} = 1; b1_${id} = b2_${id} = c1_${id} = c2_${id} = 0; s1_${id} = s2_${id} = 0;`);
        const f = R_ctrl(a[1]), q = R_ctrl(a[2]);
        const gain = nom === "pic" ? `Math.pow(10, ${R_ctrl(a[3])} / 40)` : "1";
        const coef = {
          passe_bas: ["(1 - cw) / 2", "1 - cw", "(1 - cw) / 2", "1 + al", "-2 * cw", "1 - al"],
          passe_haut: ["(1 + cw) / 2", "-(1 + cw)", "(1 + cw) / 2", "1 + al", "-2 * cw", "1 - al"],
          passe_bande: ["al", "0", "-al", "1 + al", "-2 * cw", "1 - al"],
          coupe_bande: ["1", "-2 * cw", "1", "1 + al", "-2 * cw", "1 - al"],
          pic: ["1 + al * A", "-2 * cw", "1 - al * A", "1 + al / A", "-2 * cw", "1 - al / A"],
        }[nom];
        ctrl.push(`{ const A = ${gain}, fc = Math.min(Math.max(${f}, 10), 0.49 * sr), w0 = 6.283185307179586 * fc / sr, cw = Math.cos(w0), al = Math.sin(w0) / (2 * Math.max(${q}, 0.1));
        const a0 = ${coef[3]}; b0_${id} = (${coef[0]}) / a0; b1_${id} = (${coef[1]}) / a0; b2_${id} = (${coef[2]}) / a0; c1_${id} = (${coef[4]}) / a0; c2_${id} = (${coef[5]}) / a0; }`);
        const x = R(a[0]);
        audio.push(`const x${id} = ${x}; let a${id} = b0_${id} * x${id} + s1_${id};
        if (a${id} - a${id} !== 0) { s1_${id} = 0; s2_${id} = 0; incidents++; a${id} = 0; }
        else { s1_${id} = b1_${id} * x${id} - c1_${id} * a${id} + s2_${id}; s2_${id} = b2_${id} * x${id} - c2_${id} * a${id}; if (s1_${id} < 1e-20 && s1_${id} > -1e-20) s1_${id} = 0; if (s2_${id} < 1e-20 && s2_${id} > -1e-20) s2_${id} = 0; }`);
        continue;
      }
      if (nom === "z1") {
        dansCreer(`let z${id} = 0;`); reinit.push(`z${id} = 0;`);
        audio.push(`const a${id} = z${id};`); ecrit.push(`z${id} = ${R(a[0])};`);
        continue;
      }
      if (nom === "retarde") {
        if (N[a[2]].r !== "c") { diags.erreur("E306", "Le paramètre `max` de `retarde` doit être connu à la compilation.", n.debut, n.fin); return null; }
        dansCreer(`const L${id} = Math.max(8, Math.ceil(${R_creer(a[2])} * sr) + 6); const buf${id} = new Float64Array(L${id}); let wi${id} = 0;`);
        reinit.push(`buf${id}.fill(0); wi${id} = 0;`);
        // Lecture à une durée non entière : interpolation cubique de Catmull-Rom (quatre échantillons) dès deux échantillons de retard, linéaire en dessous.
        // Elle perd bien moins d'aigus que l'interpolation linéaire (2,4 dB contre 0,7 dB à 10 kHz pour un demi-échantillon).
        audio.push(`let d${id} = ${R(a[1])} * sr; if (!(d${id} >= 1)) d${id} = 1; if (d${id} > L${id} - 4) d${id} = L${id} - 4;` +
          ` const i${id} = Math.floor(d${id}), f${id} = d${id} - i${id}; let p${id} = wi${id} - i${id}; if (p${id} < 0) p${id} += L${id};` +
          ` let q${id} = p${id} - 1; if (q${id} < 0) q${id} += L${id}; let a${id};` +
          ` if (i${id} >= 2 && f${id} !== 0) { let m${id} = p${id} + 1; if (m${id} >= L${id}) m${id} -= L${id}; let o${id} = q${id} - 1; if (o${id} < 0) o${id} += L${id};` +
          ` const y0 = buf${id}[m${id}], y1 = buf${id}[p${id}], y2 = buf${id}[q${id}], y3 = buf${id}[o${id}];` +
          ` a${id} = y1 + 0.5 * f${id} * (y2 - y0 + f${id} * (2 * y0 - 5 * y1 + 4 * y2 - y3 + f${id} * (3 * (y1 - y2) + y3 - y0))); }` +
          ` else a${id} = buf${id}[p${id}] + (buf${id}[q${id}] - buf${id}[p${id}]) * f${id};`);
        ecrit.push(`buf${id}[wi${id}] = ${R(a[0])}; if (++wi${id} === L${id}) wi${id} = 0;`);
        continue;
      }
      throw new Error("module non généré : " + nom);
    }
    if (n.op === "canal") throw new Error("canal sans module");
    audio.push(`const a${id} = ${expression(n, R, info.accord)};`);
  }

  const interpDecl = [...interp].map(id => `let kp${id} = 0;`).join("\n  ");
  const interpInit = [...interp].map(id => `kp${id} = k${id};`).join(" ");
  const interpCalc = [...interp].map(id => `const ki${id} = kp${id} + (k${id} - kp${id}) * f;`).join("\n        ");
  const sorties = racines.map((id, c) => `s${c}[pos + j] = san(${R_audio(id)});`).join("\n        ");
  const sdecl = racines.map((_, c) => `const s${c} = sorties[${c}];`).join(" ");
  const defauts = info.reglages.map(r => nombre(r.defaut)).join(", ");

  const code = `"use strict";
// Noyau SONORA : module ${info.nom} (${role}), genere par le compilateur SONORA. Ne pas modifier a la main.
return function creer(sr) {
  const cible = Float64Array.from([${defauts}]);
  const note = new Float64Array(4);
  let incidents = 0, ecretages = 0, premier = true;
  const dv = (a, b) => { if (b === 0) { incidents++; return 0; } return a / b; };
  const md = (a, b) => { if (b === 0) { incidents++; return 0; } return a % b; };
  const pb = (t, dt) => { if (t < dt) { t /= dt; return t + t - t * t - 1; } if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; } return 0; };
  const san = x => {
    if (x !== x || x === Infinity || x === -Infinity) { incidents++; return 0; }
    const ax = x < 0 ? -x : x;
    if (ax <= 0.95) return x;
    ecretages++;
    return (x < 0 ? -1 : 1) * (0.95 + 0.05 * Math.tanh((ax - 0.95) / 0.05));
  };
  ${creer.join("\n  ")}
  ${interpDecl}
  function traiter(sorties, n, entrees, somme) {
    ${sdecl}
    let pos = 0;
    while (pos < n) {
      const m = Math.min(${SOUS_BLOC}, n - pos);
      ${ctrl.join("\n      ")}
      if (premier) { ${interpInit} premier = false; }
      for (let j = 0; j < m; j++) {
        const f = (j + 1) / m;
        ${interpCalc}
        ${audio.join("\n        ")}
        ${sorties}
        ${ecrit.join("\n        ")}
      }
      ${[...interp].map(id => `kp${id} = k${id};`).join(" ")}
      pos += m;
    }
  }
  function reinitialiser() { cible.set([${defauts}]); note.fill(0); premier = true; incidents = 0; ecretages = 0; ${reinit.join(" ")} }
  return {
    canaux: ${canaux},
    traiter,
    reinitialiser,
    regler(i, v) { cible[i] = v; },
    // fait valoir tout de suite les réglages demandés, sans le glissement du lissage (au chargement d'un programme)
    appliquer() { ${appliquer.join(" ")} },
    noter(hauteur, vitesse, porte, id) { note[0] = hauteur; note[1] = vitesse; note[2] = porte; note[3] = id; },
    get incidents() { return incidents; },
    get ecretages() { return ecretages; },
  };
};
`;
  return { code, canaux };
}
