// Le texte façon LilyPond de SONORA Pistes : lire un texte (analyseur) et écrire un texte à partir d'une partition (écriveur).
// On comprend le cœur de LilyPond, pas tout : notes (c d e ... ou do ré mi ...), silences, accords, durées, points, liaisons, nuances, soufflets, articulations, triolets, reprises,
// \relative, \clef, \key, \time, \tempo, \partial, variables, \new Staff et \new PianoStaff. Les autres commandes sont refusées avec un message qui dit quoi faire.
// Sans DOM : testé dans Node (tests/partition.test.js).
import { ecrireMidi, midiDe, quintesArmure, MODES, NUANCES } from "./hauteurs.js?v=6405336182";
import { codeValeur, chiffreValeur, unitesValeur, valeurDeUnites, mesurer, U_NOIRE, longueurMesure } from "./modele.js?v=6405336182";

export class ErreurLily extends Error {
  constructor(message, debut = 0, fin = debut + 1, texte = "") {
    super(message); this.debut = debut; this.fin = Math.max(fin, debut + 1);
    const avant = texte.slice(0, debut); this.ligne = avant.split("\n").length; this.colonne = debut - (avant.lastIndexOf("\n") + 1) + 1;
  }
}

const NOMS_NL = /^([a-g])(.*)$/;
// Une note écrite à la néerlandaise (LilyPond par défaut) : c, cis, ces, es, as, eses, aeses ...
function pitchNL(mot) {
  const m = NOMS_NL.exec(mot); if (!m) return null; const l = "cdefgab".indexOf(m[1]), suff = m[2], special = m[1] === "a" || m[1] === "e";
  let a;
  if (suff === "") a = 0; else if (suff === "is") a = 1; else if (suff === "isis") a = 2;
  else if (suff === "es" || suff === "eses") a = suff === "es" ? -1 : -2;
  else if (special && suff === "s") a = -1; else if (special && suff === "ses") a = -2; else return null;
  return { l, a };
}
const FR_NOMS = { do: 0, re: 1, "ré": 1, mi: 2, fa: 3, sol: 4, la: 5, si: 6 };
// Une note écrite en français (\language "français") : do, réb, fad, sib, soldd ...
function pitchFR(mot) {
  const m = /^(do|re|ré|mi|fa|sol|la|si)(dd|d|x|bb|b)?$/.exec(mot); if (!m) return null;
  return { l: FR_NOMS[m[1]], a: { undefined: 0, d: 1, x: 2, dd: 2, b: -1, bb: -2 }[m[2]] };
}
const pitchDeMot = mot => pitchNL(mot) || pitchFR(mot);

const CLES = { treble: "treble", G: "treble", violin: "treble", french: "treble", bass: "bass", F: "bass", alto: "alto", C: "alto", tenor: "tenor", soprano: "soprano", mezzosoprano: "mezzo-soprano", baritone: "baritone-c", varbaritone: "baritone-f", subbass: "subbass" };
const NUANCES_LY = new Set([...NUANCES, "sf", "sfz", "fp", "rfz", "ppp", "pppp", "ffff"]);
const ARTICULATIONS = { staccato: "staccato", accent: "accent", tenuto: "tenuto", marcato: "marcato", staccatissimo: "staccatissimo", portato: "portato", fermata: "fermata", trill: "trill", turn: "turn", mordent: "mordent", prall: "prall" };
const SYMBOLES_ART = { ".": "staccato", ">": "accent", "-": "tenuto", "^": "marcato", "!": "staccatissimo", "_": "portato", "+": "stopped" };
const IGNOREES = new Set(["break", "pageBreak", "noBreak", "noPageBreak", "stemUp", "stemDown", "stemNeutral", "slurUp", "slurDown", "slurNeutral", "tieUp", "tieDown", "tieNeutral", "autoBeamOn", "autoBeamOff", "voiceOne", "voiceTwo", "oneVoice", "dynamicUp", "dynamicDown", "dynamicNeutral", "bendAfter", "mark", "default", "numericTimeSignature", "defaultTimeSignature", "set", "override", "revert", "unset", "once", "omit", "shiftOff", "shiftOn", "easyHeadsOn", "easyHeadsOff", "cadenzaOn", "cadenzaOff", "textLengthOn", "textLengthOff", "improvisationOn", "improvisationOff"]);
const BLOCS_IGNORES = new Set(["paper", "layout", "midi", "bookpart", "book", "context", "with"]);
const MODES_LY = new Set([...MODES, "major", "minor"]);
const ERREURS_NON_GEREES = {
  grace: "Les notes d'agrément (\\grace) ne sont pas gérées : écris-les comme des notes courtes ordinaires.", acciaccatura: "Les notes d'agrément (\\acciaccatura) ne sont pas gérées : écris-les comme des notes courtes ordinaires.", appoggiatura: "Les notes d'agrément (\\appoggiatura) ne sont pas gérées : écris-les comme des notes courtes ordinaires.", afterGrace: "Les notes d'agrément (\\afterGrace) ne sont pas gérées.",
  alternative: "Les reprises avec alternatives (\\alternative) ne sont pas gérées : écris les deux fins l'une après l'autre.", transpose: "\\transpose n'est pas géré : écris directement les notes transposées.", chordmode: "Le mode accords (\\chordmode) n'est pas géré : écris les accords entre < et >.", lyricmode: "Les paroles (\\lyricmode) ne sont pas gérées dans cette partition.", addlyrics: "Les paroles (\\addlyrics) ne sont pas gérées dans cette partition.", drummode: "Le mode batterie (\\drummode) n'est pas géré : utilise le piano roll pour les clips de batterie.", breve: "La brève (\\breve) n'est pas gérée : écris deux rondes liées (c1~ c1).", longa: "La longue (\\longa) n'est pas gérée.",
};

// ---------------------------------------------------------------- l'analyseur
// Renvoie { partition, titre }. Lance une ErreurLily (message en français, position) si le texte n'est pas compris.
export function lire(texte, { quintes = 0, mode = "major", chiffrage = [4, 4], cle = "treble" } = {}) {
  const S = String(texte ?? ""); let i = 0;
  const variables = new Map(); let titre = "";
  const err = (msg, a = i, b = a + 1) => { throw new ErreurLily(msg, a, b, S); };
  const espaces = () => {
    for (;;) {
      while (i < S.length && /\s/.test(S[i])) i++;
      if (S[i] === "%") { if (S[i + 1] === "{") { const f = S.indexOf("%}", i + 2); if (f < 0) err("Commentaire %{ jamais fermé : il manque %}.", i, i + 2); i = f + 2; } else { while (i < S.length && S[i] !== "\n") i++; } continue; }
      break;
    }
  };
  const mot = () => { const m = /^[A-Za-zéèêàùç]+/.exec(S.slice(i)); if (!m) return ""; i += m[0].length; return m[0]; };
  const chaine = () => { if (S[i] !== '"') err("Un texte entre guillemets est attendu ici."); const f = S.indexOf('"', i + 1); if (f < 0) err("Guillemet fermant manquant.", i); const t = S.slice(i + 1, f); i = f + 1; return t; };
  const entier = () => { const m = /^\d+/.exec(S.slice(i)); if (!m) return null; i += m[0].length; return parseInt(m[0], 10); };
  const sauterBloc = () => { espaces(); if (S[i] !== "{" && S[i] !== "<") return; let prof = 0; const ouv = S[i] === "{" ? ["{", "}"] : ["<<", ">>"]; for (; i < S.length; i++) { if (S.startsWith(ouv[0], i)) { prof++; i += ouv[0].length - 1; } else if (S.startsWith(ouv[1], i)) { prof--; i += ouv[1].length - 1; if (prof === 0) { i++; return; } } else if (S[i] === '"') { const f = S.indexOf('"', i + 1); i = f < 0 ? S.length : f; } } };

  // contexte de lecture d'une portée : octave relative, dernière durée
  const nouveauCtx = () => ({ rel: null, val: "q", pts: 0, dernierEv: null });

  // une hauteur : mot + marques d'octave ; en relatif, par rapport à la précédente
  function hauteur(ctx, p0) {
    const debut = i; const m = mot(); const base = pitchDeMot(m);
    if (!base) { const prop = /^[a-z]/.test(m) ? "" : ""; err(`Note inconnue « ${m || S[i] || ""} ». Les notes s'écrivent c d e f g a b (ou do ré mi fa sol la si), avec is pour un dièse et es pour un bémol : cis, ees.${prop}`, debut, i || debut + 1); }
    let marques = 0; while (S[i] === "'" || S[i] === ",") { marques += S[i] === "'" ? 1 : -1; i++; }
    while (S[i] === "!" || S[i] === "?") i++;
    let o;
    if (ctx.rel === null) o = 3 + marques;
    else { const ref = ctx.rel; const o2 = Math.round((ref - base.l) / 7); o = o2 + marques; }
    ctx.rel = ctx.rel === null ? null : 7 * o + base.l;
    return { l: base.l, a: base.a, o };
  }

  // durée facultative : chiffre, points, multiplicateur
  function duree(ctx) {
    const a = i; const n = entier();
    if (n !== null) {
      const v = { 1: "w", 2: "h", 4: "q", 8: "8", 16: "16", 32: "32" }[n];
      if (!v) err(n === 64 || n === 128 ? `La durée ${n} (${n === 64 ? "soixante-quatrième" : "plus courte que la triple croche"}) n'est pas gérée : la plus courte est 32.` : `Durée « ${n} » inconnue : les durées sont 1 (ronde), 2 (blanche), 4 (noire), 8 (croche), 16 (double croche), 32 (triple croche).`, a, i);
      let pts = 0; while (S[i] === ".") { pts++; i++; }
      ctx.val = v; ctx.pts = pts;
    } else if (S[i] === ".") err("Un point doit suivre un chiffre de durée : c4. et non c.", i);
    let u = unitesValeur(ctx.val, ctx.pts); if (u === null) err("Cette valeur pointée n'est pas gérée (triple croche pointée).", a, i);
    let mult = [1, 1];
    while (S[i] === "*") { i++; const n1 = entier(); if (n1 === null) err("Après * il faut un nombre : r1*3.", i); let d1 = 1; if (S[i] === "/") { i++; d1 = entier() || 1; } mult = [mult[0] * n1, mult[1] * d1]; }
    u = u * mult[0] / mult[1]; if (!Number.isInteger(u)) err("Cette durée multipliée n'est pas gérée.", a, i);
    return { val: ctx.val, pts: ctx.pts, u, mult: mult[0] !== mult[1] };
  }

  // une note, un accord, un silence ; renvoie l'événement
  function evenement(ctx) {
    const debut = i;
    if (S[i] === "<") {
      i++; const hs = [];
      for (;;) { espaces(); if (S[i] === ">") { i++; break; } if (i >= S.length) err("L'accord commencé avec < n'est pas fermé : il manque >.", debut, debut + 1); if (!/[A-Za-zé]/.test(S[i])) err(`Dans un accord, on attend des notes ; « ${S[i]} » n'est pas une note.`, i); const ref0 = ctx.rel; const p = hauteur(ctx, null); hs.push(p); if (hs.length === 1) ctx.refAccord = ctx.rel; }
      if (!hs.length) err("Un accord ne peut pas être vide : <c e g>.", debut, i);
      if (ctx.rel !== null) ctx.rel = ctx.refAccord;
      const d = duree(ctx); return { u: d.u, val: d.mult ? undefined : d.val, pts: d.mult ? undefined : d.pts, hauteurs: hs, src: [debut, i] };
    }
    const m = /^[A-Za-zéèêàùç]+/.exec(S.slice(i))[0];
    if (m === "r" || m === "s" || m === "R") { i += 1; const d = duree(ctx); return { u: d.u, val: d.mult ? undefined : d.val, pts: d.mult ? undefined : d.pts, hauteurs: null, invisible: m === "s", src: [debut, i] }; }
    if (m.startsWith("r") && /^r\d/.test(S.slice(i, i + 3))) { i += 1; const d = duree(ctx); return { u: d.u, hauteurs: null, val: d.val, pts: d.pts, src: [debut, i] }; }
    const p = hauteur(ctx, null); const d = duree(ctx);
    return { u: d.u, val: d.mult ? undefined : d.val, pts: d.mult ? undefined : d.pts, hauteurs: [p], src: [debut, i] };
  }

  // la suite d'une séquence : tout ce qui est entre { et } (ou jusqu'à la fin avec fin = null)
  function sequence(ctx, cible, fin) {
    for (;;) {
      espaces();
      if (i >= S.length) { if (fin) err(`Il manque une accolade fermante : ${fin} n'est jamais refermée.`, S.length - 1); return; }
      const c = S[i];
      if (c === fin) { i++; return; }
      if (c === "}" || c === ">" && S[i + 1] === ">") err(`Cette ${c === "}" ? "accolade fermante }" : "fermeture >>"} ne ferme rien.`, i);
      if (c === "{") { i++; sequence(ctx, cible, "}"); continue; }
      if (c === "<" && S[i + 1] === "<") err("Plusieurs voix superposées (<< ... >> ou \\\\) dans une même portée ne sont pas gérées : écris chaque voix sur sa propre portée avec \\new Staff.", i, i + 2);
      if (c === "|") { i++; continue; }
      if (c === "[" || c === "]") { i++; continue; }
      if (c === "~") { const e = dernier(cible, i); e.lie = true; i++; continue; }
      if (c === "(" ) { const e = dernier(cible, i); e.slurDeb = (e.slurDeb || 0) + 1; i++; continue; }
      if (c === ")") { const e = dernier(cible, i); e.slurFin = (e.slurFin || 0) + 1; i++; continue; }
      if (c === "-" || c === "^" || c === "_") { articulation(cible); continue; }
      if (c === "\\") { commande(ctx, cible); continue; }
      if (c === "<" || /[A-Za-zéèêàùç]/.test(c)) { const mm = /^[A-Za-zéèêàùç]+/.exec(S.slice(i)); if (c !== "<" && S[i + mm[0].length] === "=" && false) { /* variable ailleurs */ } const e = evenement(ctx); cible.push(e); ctx.dernierEv = e; continue; }
      if (/\d/.test(c)) err("Un chiffre seul : une durée doit suivre une note (c4) ou un silence (r4).", i);
      err(`Caractère inattendu « ${c} ».`, i);
    }
  }
  const dernier = (cible, pos) => { for (let k = cible.length - 1; k >= 0; k--) if (!cible[k].ctl) return cible[k]; err("Ce signe se place après une note, pas au début.", pos); };

  function articulation(cible) {
    const dir = S[i]; const a = i; i++;
    if (S[i] === '"') { const t = chaine(); (dernier(cible, a).texte = dernier(cible, a).texte || []).push(t); return; }
    if (S[i] === "\\") {
      i++; const nom = mot();
      if (nom === "markup") { espaces(); let t = ""; if (S[i] === "{") { const f = S.indexOf("}", i); t = S.slice(i + 1, f < 0 ? S.length : f).replace(/\\\w+/g, "").replace(/"/g, "").trim(); i = f < 0 ? S.length : f + 1; } else if (S[i] === '"') t = chaine(); else t = mot(); const e = dernier(cible, a); (e.texte = e.texte || []).push(t); return; }
      const e = dernier(cible, a);
      if (ARTICULATIONS[nom]) { (e.art = e.art || []).push(ARTICULATIONS[nom]); return; }
      if (NUANCES_LY.has(nom)) { e.dyn = nom; return; }
      if (nom === "<" ) { e.hp = "<"; return; }
      err(`Commande « \\${nom} » inconnue après une note.`, a, i); return;
    }
    if (/\d/.test(S[i])) { i++; return; }                                    // un doigté : c4-1
    const sy = SYMBOLES_ART[S[i]]; if (!sy) err(`Signe « ${dir}${S[i] || ""} » inconnu. Articulations : -. (staccato), -> (accent), -- (tenuto), -^ (marcato).`, a, i + 1);
    i++; const e = dernier(cible, a); (e.art = e.art || []).push(sy);
  }

  function commande(ctx, cible) {
    const a = i; i++;
    const sym = S[i];
    if (sym === "<") { i++; dernier(cible, a).hp = "<"; return; }
    if (sym === ">") { i++; dernier(cible, a).hp = ">"; return; }
    if (sym === "!") { i++; dernier(cible, a).hpFin = true; return; }
    if (sym === "(" || sym === ")") { i++; return; }
    if (sym === "\\") err("Les voix superposées (\\\\) ne sont pas gérées : écris chaque voix sur sa propre portée avec \\new Staff.", a, i + 1);
    const nom = mot(); if (!nom) err("Commande vide : un nom doit suivre le \\.", a, i);
    if (NUANCES_LY.has(nom)) { dernier(cible, a).dyn = nom; return; }
    if (ARTICULATIONS[nom]) { (dernier(cible, a).art = dernier(cible, a).art || []).push(ARTICULATIONS[nom]); return; }
    if (IGNOREES.has(nom)) { if (nom === "set" || nom === "override" || nom === "revert" || nom === "unset" || nom === "once") { /* \set x = y : on saute jusqu'à la fin de la ligne */ while (i < S.length && S[i] !== "\n") i++; } return; }
    if (ERREURS_NON_GEREES[nom]) err(ERREURS_NON_GEREES[nom], a, i);
    switch (nom) {
      case "clef": { espaces(); let n = S[i] === '"' ? chaine() : mot(); n = n.replace(/_\d+|\^\d+/g, ""); const v = CLES[n]; if (!v) err(`Clé « ${n} » inconnue : treble (sol), bass (fa), alto, tenor ...`, a, i); cible.push({ ctl: "cle", valeur: v }); return; }
      case "key": { espaces(); const m = mot(); const p = pitchDeMot(m); if (!p) err(`Après \\key, une note est attendue (\\key d \\major), pas « ${m} ».`, a, i); espaces(); if (S[i] !== "\\") err("Après la tonique, \\major ou \\minor est attendu : \\key d \\major.", i); i++; const md = mot(); if (!MODES_LY.has(md)) err(`Mode « ${md} » inconnu : \\major, \\minor, \\dorian ...`, i - md.length - 1, i); const q = quintesArmure({ l: p.l, a: p.a }, md); if (q < -7 || q > 7) err("Cette tonalité aurait plus de sept altérations.", a, i); cible.push({ ctl: "armure", quintes: q, mode: md }); return; }
      case "time": { espaces(); const n = entier(); if (n === null) err("Après \\time, une fraction est attendue : \\time 3/4.", i); if (S[i] !== "/") err("Le chiffrage s'écrit avec une barre : \\time 3/4.", i); i++; const d = entier(); if (![1, 2, 4, 8, 16].includes(d)) err(`Dénominateur « ${d} » non géré : 2, 4, 8 ou 16.`, i - 1); if (S[i] === "+") err("Les mesures irrégulières (2+3/8) ne sont pas gérées.", i); cible.push({ ctl: "chiffrage", valeur: [n, d] }); return; }
      case "tempo": { espaces(); let texteT = ""; if (S[i] === '"') { texteT = chaine(); espaces(); } const m = /^(\d+)(\.*)\s*=\s*(\d+)/.exec(S.slice(i)); if (m) { i += m[0].length; const v = { 1: "w", 2: "h", 4: "q", 8: "8" }[+m[1]]; if (!v) err("Valeur de tempo non gérée.", i); cible.push({ ctl: "tempo", texte: texteT, val: v, pts: m[2].length, bpm: +m[3] }); } else if (texteT) cible.push({ ctl: "tempo", texte: texteT }); else err("Après \\tempo : \\tempo 4 = 100 ou \\tempo \"Allegro\".", i); return; }
      case "partial": { espaces(); const ctx2 = nouveauCtx(); const d = duree(ctx2); if (!entierProbe(d)) err("Après \\partial, une durée est attendue : \\partial 4.", i); cible.push({ ctl: "partiel", u: d.u }); return; }
      case "bar": { espaces(); const t = chaine(); cible.push({ ctl: "barre", type: t }); return; }
      case "relative": { espaces(); let ref = 7 * 4 + 0; if (/[A-Za-zé]/.test(S[i])) { const c2 = nouveauCtx(); const p = (() => { const m = mot(); const b = pitchDeMot(m); if (!b) err(`Après \\relative, une note de départ est attendue : \\relative c'.`, i - m.length, i); let mq = 0; while (S[i] === "'" || S[i] === ",") { mq += S[i] === "'" ? 1 : -1; i++; } return { l: b.l, o: 3 + mq }; })(); ref = 7 * p.o + p.l; }
        const c2 = { ...ctx, rel: ref }; musique(c2, cible); ctx.val = c2.val; ctx.pts = c2.pts; return; }
      case "absolute": { espaces(); const c2 = { ...ctx, rel: null }; musique(c2, cible); return; }
      case "repeat": { espaces(); const type = mot(); if (type !== "volta" && type !== "unfold") err("Après \\repeat : volta ou unfold (\\repeat volta 2 { ... }).", i - type.length, i); espaces(); const n = entier(); if (!n || n < 1) err("Le nombre de répétitions est attendu : \\repeat volta 2 { ... }.", i); espaces(); const sous = []; const c2 = { ...ctx }; if (S[i] !== "{") err("Après \\repeat volta 2, la musique à répéter doit être entre accolades { ... }.", i); musique(c2, sous); ctx.rel = c2.rel; ctx.val = c2.val; ctx.pts = c2.pts; cible.push({ ctl: type, n, evts: sous }); return; }
      case "tuplet": case "times": {
        espaces(); const n1 = entier(); if (n1 === null || S[i] !== "/") err(`Après \\${nom}, une fraction est attendue : \\tuplet 3/2 { ... }.`, i); i++; const n2 = entier(); if (n2 === null) err("Fraction incomplète.", i);
        const num = nom === "tuplet" ? n1 : n2, den = nom === "tuplet" ? n2 : n1;   // \tuplet 3/2 : 3 notes à la place de 2 ; \times 2/3 : les durées sont multipliées par 2/3
        espaces(); if (/\d/.test(S[i])) { entier(); while (S[i] === ".") i++; espaces(); }
        const sous = []; const c2 = { ...ctx }; if (S[i] !== "{") err("Les notes du groupe doivent être entre accolades { ... }.", i); musique(c2, sous); ctx.rel = c2.rel; ctx.val = c2.val; ctx.pts = c2.pts;
        const id = ++idTuplet; for (const e of sous) { if (e.ctl) { cible.push(e); continue; } if (e.tup) err("Les triolets imbriqués ne sont pas gérés.", a, i); const u = e.u * den / num; if (!Number.isInteger(u)) err("Ce groupe irrégulier donne une durée qui n'est pas gérée.", a, i); e.u = u; e.tup = { id, num, den }; cible.push(e); }
        return; }
      case "new": { err("\\new Staff et \\new PianoStaff se placent au début de la partition, pas à l'intérieur d'une portée.", a, i); break; }
      case "version": { espaces(); chaine(); return; }
      case "language": { espaces(); chaine(); return; }
      case "header": case "paper": case "layout": case "midi": { const bloc = nom; espaces(); const d0 = i; sauterBloc(); if (bloc === "header") { const t = /title\s*=\s*"([^"]*)"/.exec(S.slice(d0, i)); if (t) titre = t[1]; } return; }
      case "score": { espaces(); if (S[i] !== "{") err("Après \\score, un bloc { ... } est attendu.", i); const c2 = nouveauCtx(); i++; musiqueScore(); return; }
      default: {
        if (variables.has(nom)) { for (const e of variables.get(nom)) cible.push(copie(e)); return; }
        const connus = ["clef", "key", "time", "tempo", "relative", "repeat", "tuplet", "partial", "bar", ...NUANCES_LY];
        const proche = connus.find(c => c.startsWith(nom.slice(0, 2)) && Math.abs(c.length - nom.length) <= 2);
        err(`Commande « \\${nom} » inconnue ou non gérée${proche ? ` (peut-être \\${proche} ?)` : ""}.`, a, i);
      }
    }
  }
  const entierProbe = d => d && d.u > 0;
  let idTuplet = 0;
  const copie = e => e.ctl ? { ...e, ...(e.evts ? { evts: e.evts.map(copie) } : {}) } : { ...e, hauteurs: e.hauteurs ? e.hauteurs.map(h => ({ ...h })) : null, art: e.art ? [...e.art] : undefined, texte: e.texte ? [...e.texte] : undefined };

  // une expression musicale : { ... }, \relative ..., ou une variable
  function musique(ctx, cible) {
    espaces();
    if (S[i] === "{") { i++; sequence(ctx, cible, "}"); return; }
    if (S[i] === "\\") { const a = i; i++; const nom = mot(); if (nom === "relative") { i = a; const ctl = []; commande(ctx, ctl); cible.push(...ctl); return; } if (variables.has(nom)) { for (const e of variables.get(nom)) cible.push(copie(e)); return; } if (nom === "repeat" || nom === "tuplet" || nom === "times" || nom === "absolute") { i = a; commande(ctx, cible); return; } err(`Une expression musicale est attendue (entre accolades { ... }), pas « \\${nom} ».`, a, i); }
    err("Une expression musicale est attendue : { c d e f }.", i);
  }

  // ----- le sommet du document : une ou plusieurs portées
  let portees = null, piano = false;
  function porteeExpr() {
    espaces();
    if (S.startsWith("\\new", i)) {
      i += 4; espaces(); const n = mot();
      espaces(); if (S[i] === "=") { i++; espaces(); chaine(); espaces(); }
      if (S.startsWith("\\with", i)) { i += 5; sauterBloc(); espaces(); }
      if (["PianoStaff", "GrandStaff", "StaffGroup", "ChoirStaff"].includes(n)) { espaces(); if (!S.startsWith("<<", i)) err(`Après \\new ${n}, la liste des portées est attendue entre << et >>.`, i); i += 2; const liste = []; for (;;) { espaces(); if (S.startsWith(">>", i)) { i += 2; break; } if (i >= S.length) err("Il manque >> pour fermer le groupe de portées.", S.length - 1); liste.push(...porteeExpr()); } if (n === "PianoStaff" || n === "GrandStaff") piano = piano || liste.length === 2; return liste; }
      if (["Staff", "Voice", "RhythmicStaff", "TabStaff"].includes(n)) { const evts = []; musique(nouveauCtx(), evts); return [{ evts }]; }
      err(`Contexte « \\new ${n} » non géré : Staff, PianoStaff.`, i - n.length, i);
    }
    if (S.startsWith("<<", i)) { i += 2; const liste = []; for (;;) { espaces(); if (S.startsWith(">>", i)) { i += 2; break; } if (i >= S.length) err("Il manque >> pour fermer les portées.", S.length - 1); liste.push(...porteeExpr()); } return liste; }
    const evts = []; musique(nouveauCtx(), evts); return [{ evts }];
  }
  function musiqueScore() { // à l'intérieur de \score { ... }
    for (;;) { espaces(); if (S[i] === "}") { i++; return; } if (i >= S.length) err("Il manque } pour fermer \\score.", S.length - 1);
      if (S[i] === "\\") { const a = i; i++; const nom = mot(); if (nom === "layout" || nom === "midi" || nom === "header") { sauterBloc(); continue; } i = a; }
      if (portees) err("Un seul bloc de musique est géré par partition.", i);
      portees = porteeExpr(); }
  }
  for (;;) {
    espaces(); if (i >= S.length) break;
    if (S[i] === "\\") {
      const a = i; i++; const nom = mot();
      if (nom === "version" || nom === "language") { espaces(); chaine(); continue; }
      if (nom === "header") { espaces(); const d0 = i; sauterBloc(); const t = /title\s*=\s*"([^"]*)"/.exec(S.slice(d0, i)); if (t) titre = t[1]; continue; }
      if (BLOCS_IGNORES.has(nom)) { sauterBloc(); continue; }
      if (nom === "score") { espaces(); if (S[i] !== "{") err("Après \\score, un bloc { ... } est attendu.", i); i++; musiqueScore(); continue; }
      i = a;
      if (portees) err("Un seul bloc de musique est géré par partition (le texte contient déjà une musique).", i);
      portees = porteeExpr(); continue;
    }
    // une variable : nom = musique
    const m = /^([A-Za-z]+)\s*=\s*/.exec(S.slice(i));
    if (m && !pitchDeMot(m[1])) { i += m[0].length; const evts = []; musique(nouveauCtx(), evts); variables.set(m[1], evts); continue; }
    if (m && pitchDeMot(m[1])) err(`« ${m[1]} » est un nom de note : choisis un autre nom de variable (melodie, basse...).`, i, i + m[1].length);
    if (portees) err("Un seul bloc de musique est géré par partition.", i);
    portees = porteeExpr();
  }
  if (!portees) err("Le texte ne contient pas de musique : écris par exemple \\relative c' { c4 d e f }.", 0, Math.max(1, S.length));
  // les réglages du début : le premier chiffrage, la première armure et la première clé de chaque portée, avant toute note
  const meta = { chiffrage: chiffrage.slice(), quintes, mode, cle, anacrouse: 0 };
  const premiereSonore = ev => ev.findIndex(e => !e.ctl);
  portees.forEach((p, k) => {
    const lim = premiereSonore(p.evts) < 0 ? p.evts.length : premiereSonore(p.evts);
    for (let j = 0; j < lim; j++) { const e = p.evts[j]; if (k === 0) { if (e.ctl === "chiffrage") meta.chiffrage = e.valeur.slice(); else if (e.ctl === "armure") { meta.quintes = e.quintes; meta.mode = e.mode; } else if (e.ctl === "tempo" && e.bpm && !meta.tempo) meta.tempo = { val: e.val, pts: e.pts, bpm: e.bpm, texte: e.texte }; else if (e.ctl === "partiel") meta.anacrouse = e.u; } if (e.ctl === "cle" && !p.cle) p.cle = e.valeur; }
    if (!p.cle) p.cle = piano && k === 1 ? "bass" : meta.cle;
  });
  if (portees.length > 2) err("Plus de deux portées ne sont pas gérées dans Pistes (une portée, ou deux pour le piano).", 0, 1);
  meta.cle = portees[0].cle; meta.piano = piano;
  return { partition: { meta, portees: portees.map(p => ({ cle: p.cle, evts: p.evts })) }, titre };
}

// ---------------------------------------------------------------- l'écriveur
const NOM_NL = ["c", "d", "e", "f", "g", "a", "b"], NOM_FR = ["do", "re", "mi", "fa", "sol", "la", "si"];
function nomLy(p, langue) {
  if (langue === "francais") return NOM_FR[p.l] + ({ "-2": "bb", "-1": "b", 0: "", 1: "d", 2: "dd" })[p.a];
  const L = NOM_NL[p.l]; if (p.a === 0) return L;
  if (p.a > 0) return L + "is".repeat(p.a);
  const special = L === "a" || L === "e"; return p.a === -1 ? (special ? L + "s" : L + "es") : (special ? L + "ses" : L + "eses");
}
const marquesOctave = n => n > 0 ? "'".repeat(n) : ",".repeat(-n);
const NOM_CLE_LY = { treble: "treble", bass: "bass", alto: "alto", tenor: "tenor", soprano: "soprano", "mezzo-soprano": "mezzosoprano", "baritone-c": "baritone", "baritone-f": "varbaritone", subbass: "subbass", french: "french" };
const NOMS_MODES_LY = { major: "major", minor: "minor", ionian: "ionian", aeolian: "aeolian", dorian: "dorian", phrygian: "phrygian", lydian: "lydian", mixolydian: "mixolydian", locrian: "locrian" };
function tonique(q, mode, langue) { const decal = { major: 0, ionian: 0, minor: -3, aeolian: -3, dorian: -2, phrygian: -4, lydian: 1, mixolydian: -1, locrian: -5 }[mode] ?? 0; const tq = q - decal, a = Math.floor((tq + 1) / 7), pos = tq - 7 * a, l = [0, 2, 4, -1, 1, 3, 5].indexOf(pos); return nomLy({ l, a, o: 4 }, langue); }

// partition : { meta, portees } ; options : { langue: "neerlandais" | "francais", parLigne: nombre de mesures par ligne de texte }
export function ecrire(partition, { langue = "neerlandais", parLigne = 4, titre = "" } = {}) {
  const meta = partition.meta; const lignes = [];
  if (langue === "francais") lignes.push('\\language "français"');
  if (titre) lignes.push(`\\header { title = "${titre.replace(/"/g, "'")}" }`);
  const blocs = partition.portees.map((p, k) => ecrirePortee(p, meta, langue, parLigne, k === 0));
  if (partition.portees.length === 2) { lignes.push(meta.piano ? "\\new PianoStaff <<" : "<<"); for (const b of blocs) { lignes.push("  \\new Staff {", ...b.map(l => "  " + l), "  }"); } lignes.push(">>"); }
  else lignes.push(...blocs[0].slice(0, 0), ...blocs[0].map((l, k) => l));
  return lignes.join("\n") + "\n";
}
function ecrirePortee(portee, meta, langue, parLigne, premiere) {
  const { mesures } = mesurer(portee, meta); const sortie = []; let ref = 7 * 4, prec = { val: null, pts: 0 }; let ligne = [];
  const vide = !mesures.some(m => m.items.some(it => !it.silence));
  const entete = [];
  entete.push(`\\clef ${NOM_CLE_LY[portee.cle] || "treble"}`);
  entete.push(`\\key ${tonique(meta.quintes, meta.mode, langue)} \\${NOMS_MODES_LY[meta.mode] || "major"}`);
  entete.push(`\\time ${meta.chiffrage[0]}/${meta.chiffrage[1]}`);
  if (premiere && meta.tempo && meta.tempo.bpm) entete.push(`\\tempo ${chiffreValeur(meta.tempo.val)}${".".repeat(meta.tempo.pts || 0)} = ${meta.tempo.bpm}`);
  if (meta.anacrouse) { const d = valeurDeUnites(meta.anacrouse); if (d) entete.push(`\\partial ${chiffreValeur(d.val)}${".".repeat(d.pts)}`); }
  const corps = [];
  // un triolet : on regroupe les items successifs de même groupe
  const ecrireDuree = d => { const s = `${chiffreValeur(d.val)}${".".repeat(d.pts || 0)}`; if (prec.val === d.val && prec.pts === (d.pts || 0)) return ""; prec = { val: d.val, pts: d.pts || 0 }; return s; };
  const hauteurRel = (p, ctx) => { const o2 = Math.round((ctx.ref - p.l) / 7), n = p.o - o2; ctx.ref = 7 * p.o + p.l; return nomLy(p, langue) + marquesOctave(n); };
  const ctx = { ref };
  mesures.forEach((m, k) => {
    const out = [];
    if (k > 0 && m.changeCle) out.push(`\\clef ${NOM_CLE_LY[m.cle] || "treble"}`);
    if (k > 0 && m.changeArmure) out.push(`\\key ${tonique(m.quintes, m.mode, langue)} \\${NOMS_MODES_LY[m.mode] || "major"}`);
    if (k > 0 && m.changeChiffrage) out.push(`\\time ${m.chiffrage[0]}/${m.chiffrage[1]}`);
    let groupe = null;
    const fermerGroupe = () => { if (groupe) { out.push(`\\tuplet ${groupe.num}/${groupe.den} { ${groupe.txt.join(" ")} }`); groupe = null; } };
    for (const it of m.items) {
      if (it.ctl) continue;
      let t;
      if (it.silence) { if (it.mesureComplete && !it.tup) { const d = valeurDeUnites(it.u); if (d) { t = `R${chiffreValeur(d.val)}${".".repeat(d.pts)}`; prec = { val: d.val, pts: d.pts }; } } if (!t) t = `r${ecrireDuree({ val: it.val, pts: it.pts })}`; }
      else {
        let h; if (it.hauteurs.length === 1) h = hauteurRel(it.hauteurs[0], ctx); else { const ref0 = ctx.ref; const noms = []; const copie = { ref: ref0 }; let premier = null; for (const p of it.hauteurs) { noms.push(hauteurRel(p, copie)); if (premier === null) premier = copie.ref; } ctx.ref = premier; h = `<${noms.join(" ")}>`; }
        t = `${h}${ecrireDuree({ val: it.val, pts: it.pts })}`;
        if (it.lie) t += "~"; if (it.slurDeb) t += "("; if (it.slurFin) t += ")";
        for (const a of it.art || []) t += ({ staccato: "-.", accent: "->", tenuto: "--", marcato: "-^", staccatissimo: "-!", portato: "-_" })[a] || "";
        if (it.dyn) t += `\\${it.dyn}`; if (it.hp) t += it.hp === "<" ? "\\<" : "\\>"; if (it.hpFin) t += "\\!";
      }
      if (it.tup) { if (groupe && groupe.id !== it.tup.id) fermerGroupe(); if (!groupe) groupe = { id: it.tup.id, num: it.tup.num, den: it.tup.den, txt: [] }; groupe.txt.push(t); }
      else { fermerGroupe(); out.push(t); }
    }
    fermerGroupe();
    corps.push(out.join(" "));
  });
  for (let k = 0; k < corps.length; k += parLigne) sortie.push(corps.slice(k, k + parLigne).join(" | ") + (k + parLigne >= corps.length ? "" : " |"));
  const dec = []; dec.push(`\\relative c' {`, ...entete.map(e => "  " + e), ...sortie.map(l => "  " + l), "}");
  return dec;
}
