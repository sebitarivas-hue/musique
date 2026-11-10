// Lecture d'une partition numérique pour SONORA Pistes : MusicXML (.musicxml, .xml, .mxl compressé) ou MIDI.
// Sortie identique à depuisMidi (notes.js) : { format, tempo, temps, titre, pistes: [{ nom, instrument, notes: [{ t, d, n, v }] }], avertissements }.
// Les dates et durées sont en temps (1 = une noire). Une portée = une piste ; un instrument à deux portées (piano, harpe) donne deux pistes.
// Les reprises sont dépliées (barres de reprise et maisons 1, 2), les liaisons de prolongation fusionnées, les instruments transpositeurs
// rendus à la hauteur réelle (clarinette en si bémol, cor en fa...), les nuances traduites en vitesses. Sans DOM : testé dans Node.
import { depuisMidi, nettoyerNotes } from "./notes.js?v=336655a455";

// ---------------------------------------------------------------- un petit lecteur XML (le même dans le navigateur et dans Node)
const ENTITES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const decoder = s => s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) => e[0] === "#" ? String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : +e.slice(1)) : (ENTITES[e] ?? m));
export function lireXml(texte) {
  const racine = { tag: "#racine", attrs: {}, enfants: [], texte: "" }, pile = [racine]; let i = 0;
  const n = texte.length;
  while (i < n) {
    const lt = texte.indexOf("<", i);
    if (lt < 0) break;
    if (lt > i) { const t = texte.slice(i, lt); if (t.trim()) pile[pile.length - 1].texte += decoder(t); }
    if (texte.startsWith("<!--", lt)) { const f = texte.indexOf("-->", lt + 4); if (f < 0) throw new Error("XML abîmé : commentaire jamais fermé."); i = f + 3; continue; }
    if (texte.startsWith("<![CDATA[", lt)) { const f = texte.indexOf("]]>", lt); if (f < 0) throw new Error("XML abîmé."); pile[pile.length - 1].texte += texte.slice(lt + 9, f); i = f + 3; continue; }
    if (texte.startsWith("<?", lt)) { const f = texte.indexOf("?>", lt); if (f < 0) throw new Error("XML abîmé."); i = f + 2; continue; }
    if (texte.startsWith("<!", lt)) { let prof = 0, j = lt; for (; j < n; j++) { if (texte[j] === "<") prof++; else if (texte[j] === ">" && --prof === 0) break; } i = j + 1; continue; }
    // balise : on cherche le > qui n'est pas dans une valeur entre guillemets
    let j = lt + 1, guil = null;
    for (; j < n; j++) { const c = texte[j]; if (guil) { if (c === guil) guil = null; } else if (c === '"' || c === "'") guil = c; else if (c === ">") break; }
    if (j >= n) throw new Error("XML abîmé : balise jamais fermée.");
    const corps = texte.slice(lt + 1, j); i = j + 1;
    if (corps[0] === "/") { const nom = corps.slice(1).trim(); if (pile.length < 2 || pile[pile.length - 1].tag !== nom) throw new Error(`XML abîmé : </${nom}> inattendu.`); pile.pop(); continue; }
    const auto = corps.endsWith("/"), m = /^([^\s/>]+)([\s\S]*?)\/?$/.exec(corps), el = { tag: m[1], attrs: {}, enfants: [], texte: "" };
    for (const a of m[2].matchAll(/([^\s=]+)\s*=\s*("([^"]*)"|'([^']*)')/g)) el.attrs[a[1]] = decoder(a[3] ?? a[4]);
    pile[pile.length - 1].enfants.push(el); if (!auto) pile.push(el);
  }
  if (pile.length !== 1) throw new Error("XML abîmé : une balise n'est pas fermée.");
  return racine.enfants[0] || null;
}
const fils = (el, tag) => el ? el.enfants.find(x => x.tag === tag) || null : null;
const tous = (el, tag) => el ? el.enfants.filter(x => x.tag === tag) : [];
const txt = (el, tag) => { const f = tag ? fils(el, tag) : el; return f ? f.texte.trim() : ""; };
const num = (el, tag, def = null) => { const t = txt(el, tag); const x = parseFloat(t); return t !== "" && Number.isFinite(x) ? x : def; };

// ---------------------------------------------------------------- instruments : du nom d'une partie à un timbre de Pistes
// Le premier motif qui convient l'emporte ; l'ordre compte (« violoncelle » avant « violon »).
const TIMBRES = [
  [/contrebasse|double bass|kontrabass|contrabbasso/i, "contrebasse"], [/violoncell|cello|cellos/i, "violoncelle"], [/\balto\b|viola|altos/i, "cordes"], [/violon|violin|fiddle/i, "violon"],
  [/piccolo|fl[uû]te|flute|fl[oö]te|flauto/i, "souffle"], [/hautbois|oboe|cor anglais|english horn/i, "hautbois"], [/clarinet|clarinette|saxo|sax\b/i, "anche"], [/basson|bassoon|fagott/i, "basson"],
  [/\bcor\b|horn|waldhorn/i, "cor"], [/trompette|trumpet|cornet|bugle/i, "trompette"], [/trombone/i, "trombone"], [/tuba|euphonium/i, "tuba"],
  [/clavecin|harpsichord|cembalo/i, "clavecin"], [/orgue|organ/i, "orgue"], [/harpe|harp/i, "harpe"], [/guitare|guitar|chitarra|gitarre/i, "guitare"], [/piano|klavier|pianoforte|keyboard/i, "clavier"],
  [/timbale|timpani/i, "timbale"], [/marimba/i, "marimba"], [/vibraphone/i, "vibraphone"], [/xylophone/i, "xylophone"], [/glockenspiel|celesta/i, "glockenspiel"],
  [/voix|chant|vocal|soprano|mezzo|contralto|tenor|t[eé]nor|baryton|basse|bass\b|choir|ch[oœ]ur|\bsatb\b/i, "voix"],
];
// Les programmes MIDI généraux (0 à 127) rangés par familles, pour une partie dont le nom ne dit rien.
const PROGRAMMES = [[0, 7, "clavier"], [8, 15, "glockenspiel"], [16, 20, "orgue"], [21, 23, "anche"], [24, 31, "guitare"], [32, 39, "contrebasse"], [40, 40, "violon"], [41, 41, "cordes"], [42, 42, "violoncelle"],
  [43, 43, "contrebasse"], [44, 51, "cordes"], [52, 54, "voix"], [56, 56, "trompette"], [57, 57, "trombone"], [58, 58, "tuba"], [59, 59, "trompette"], [60, 60, "cor"], [61, 63, "cor"], [64, 67, "anche"],
  [68, 68, "hautbois"], [69, 69, "anche"], [70, 70, "basson"], [71, 71, "anche"], [72, 79, "souffle"]];
export function timbreDe(nom, programme = null) {
  for (const [re, id] of TIMBRES) if (re.test(nom || "")) return "ech:" + id;
  if (Number.isFinite(programme)) { const p = programme - 1; const e = PROGRAMMES.find(([a, b]) => p >= a && p <= b); if (e) return "ech:" + e[2]; }
  return "ech:clavier";
}

// ---------------------------------------------------------------- les mesures dans l'ordre où on les joue (reprises et maisons)
// Renvoie la liste des indices de mesures à jouer. Une barre de reprise arrière rejoue depuis la barre avant précédente (ou le début) ;
// une maison « 1 » est sautée au deuxième passage, et la reprise ne se fait pas deux fois.
export function ordreDeLecture(mesures) {
  const info = mesures.map(m => {
    const barres = tous(m, "barline"), r = { avant: false, arriere: false, fois: 2, maisons: null, finMaison: false };
    for (const b of barres) {
      const rep = fils(b, "repeat"); if (rep) { if (rep.attrs.direction === "forward") r.avant = true; else if (rep.attrs.direction === "backward") { r.arriere = true; r.fois = parseInt(rep.attrs.times || "2", 10) || 2; } }
      const fin = fils(b, "ending"); if (fin && fin.attrs.number) { const nums = fin.attrs.number.split(/[,\s]+/).map(Number).filter(Number.isFinite); if (fin.attrs.type === "start") r.maisons = nums; }
    }
    return r;
  });
  // une maison s'étend de la mesure où elle commence jusqu'à la suivante qui n'en porte pas de nouvelle ou qui finit par une reprise
  let courante = null; const maison = [];
  for (let i = 0; i < info.length; i++) {
    if (info[i].maisons) courante = info[i].maisons;
    else if (courante && i > 0) { const prec = info[i - 1]; if (prec.arriere || prec.finMaison) courante = null; }
    maison.push(courante);
    if (courante) { const bs = tous(mesures[i], "barline").map(b => fils(b, "ending")).filter(Boolean); if (bs.some(e => e.attrs.type === "stop" || e.attrs.type === "discontinue")) { info[i].finMaison = true; } }
  }
  const sortie = [], passages = new Map(); let i = 0, debut = 0, garde = 0;
  while (i < mesures.length && garde++ < mesures.length * 40) {
    const maisons = maison[i], passage = passages.get(debut) || 1;
    if (maisons && !maisons.includes(passage)) { i++; continue; }
    if (info[i].avant) debut = i;
    sortie.push(i);
    if (info[i].arriere) { const f = passages.get(debut) || 1; if (f < info[i].fois) { passages.set(debut, f + 1); i = debut; continue; } passages.delete(debut); debut = i + 1; }
    else if (maisons && info[i].finMaison && !maison[i + 1]) { passages.delete(debut); debut = i + 1; }   // dernière maison sans reprise : la section est finie
    i++;
  }
  return sortie;
}

// ---------------------------------------------------------------- MusicXML -> pistes
const PAS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const VITESSES = { pppp: 0.15, ppp: 0.22, pp: 0.32, p: 0.45, mp: 0.58, mf: 0.7, f: 0.82, ff: 0.92, fff: 0.98, ffff: 1, sf: 0.95, sfz: 0.95, fp: 0.8, rf: 0.9, rfz: 0.9 };

export function depuisMusicXml(texte, { deplier = true } = {}) {
  const racine = lireXml(texte); const avertissements = [], vus = new Set();
  const avert = m => { if (!vus.has(m)) { vus.add(m); avertissements.push(m); } };
  if (!racine) throw new Error("Ce fichier n'est pas du MusicXML.");
  if (racine.tag === "score-timewise") throw new Error("Ce MusicXML est de type « timewise », rare : réexporte-le en « partwise » depuis ton logiciel de notation.");
  if (racine.tag !== "score-partwise") throw new Error("Ce fichier n'est pas une partition MusicXML.");
  const titre = txt(fils(racine, "work"), "work-title") || txt(fils(racine, "movement-title"));
  const liste = new Map();
  for (const sp of tous(fils(racine, "part-list"), "score-part")) {
    const inst = fils(sp, "midi-instrument");
    liste.set(sp.attrs.id, { nom: txt(sp, "part-name") || txt(fils(sp, "score-instrument"), "instrument-name") || sp.attrs.id, programme: num(inst, "midi-program"), canal: num(inst, "midi-channel") });
  }
  let tempo = null, temps = null, nbTemps = null;
  const pistes = [];
  for (const partie of tous(racine, "part")) {
    const meta = liste.get(partie.attrs.id) || { nom: partie.attrs.id || "Partie", programme: null };
    const mesures = tous(partie, "measure"), ordre = deplier ? ordreDeLecture(mesures) : mesures.map((_, i) => i);
    if (deplier && ordre.length !== mesures.length) avert(`Reprises dépliées : ${mesures.length} mesures écrites, ${ordre.length} jouées.`);
    const portees = new Map();     // numéro de portée -> notes
    const ouvertes = new Map();    // liaisons de prolongation en cours : clé hauteur+portée+voix -> note
    let divisions = 1, transposition = 0, vitesse = 0.7, debutMesure = 0, nbPortees = 1;
    for (const idx of ordre) {
      const m = mesures[idx];
      let curseur = 0, fin = 0, derniere = null;   // en divisions, dans la mesure
      for (const el of m.enfants) {
        if (el.tag === "attributes") {
          const d = num(el, "divisions"); if (d) divisions = d;
          const st = num(el, "staves"); if (st) nbPortees = Math.max(nbPortees, st);
          const tm = fils(el, "time"); if (tm && nbTemps === null) { const b = num(tm, "beats"), t = num(tm, "beat-type"); if (b && t) { nbTemps = b * 4 / t; temps = Number.isInteger(nbTemps) ? nbTemps : Math.max(1, Math.round(nbTemps)); if (!Number.isInteger(nbTemps)) avert(`Mesure à ${b}/${t} : Pistes compte les temps en noires, arrondi à ${temps}.`); } }
          const tr = fils(el, "transpose"); if (tr) transposition = (num(tr, "chromatic", 0) + 12 * num(tr, "octave-change", 0));
        } else if (el.tag === "direction") {
          const s = fils(el, "sound"), tp = s && parseFloat(s.attrs.tempo); if (tempo === null && Number.isFinite(tp) && tp > 0) tempo = tp;
          if (tempo === null) { const met = fils(fils(el, "direction-type"), "metronome"); if (met) { const bpm = num(met, "per-minute"); const unite = txt(met, "beat-unit"); const f = { whole: 4, half: 2, quarter: 1, eighth: 0.5, "16th": 0.25 }[unite]; if (bpm && f) tempo = bpm * f * (fils(met, "beat-unit-dot") ? 1.5 : 1); } }
          const dyn = fils(fils(el, "direction-type"), "dynamics"); if (dyn) for (const d of dyn.enfants) if (VITESSES[d.tag] !== undefined) vitesse = VITESSES[d.tag];
          if (s && s.attrs.dynamics) { const x = parseFloat(s.attrs.dynamics); if (Number.isFinite(x)) vitesse = Math.min(1, Math.max(0.1, x / 90 * 0.7)); }
        } else if (el.tag === "backup") { curseur -= num(el, "duration", 0); }
        else if (el.tag === "forward") { curseur += num(el, "duration", 0); fin = Math.max(fin, curseur); }
        else if (el.tag === "note") {
          const duree = num(el, "duration", 0), accord = !!fils(el, "chord"), grace = !!fils(el, "grace"), silence = !!fils(el, "rest");
          if (accord && derniere !== null) curseur = derniere;   // l'accord reste à la date de la note précédente
          const debut = curseur;
          if (!grace) { derniere = debut; curseur = debut + duree; fin = Math.max(fin, curseur); }
          if (silence) continue;
          if (grace) { avert("Notes d'agrément (appoggiatures, acciaccatures) : ignorées à l'écoute, elles restent dans la partition."); continue; }
          const p = fils(el, "pitch"); if (!p) { if (fils(el, "unpitched")) avert("Percussion sans hauteur : ignorée (Pistes ne la lit pas depuis MusicXML)."); continue; }
          const pas = PAS[txt(p, "step")]; if (pas === undefined) continue;
          const n = 12 * (num(p, "octave", 4) + 1) + pas + (num(p, "alter", 0)) + transposition;
          const portee = parseInt(txt(el, "staff") || "1", 10) || 1, voix = txt(el, "voice") || "1";
          const t = (debutMesure + debut / divisions), d = duree / divisions;
          const liens = tous(el, "tie").map(x => x.attrs.type), cle = `${n}|${portee}|${voix}`;
          const ouverte = ouvertes.get(cle);
          if (ouverte && liens.includes("stop")) { ouverte.d += d; if (!liens.includes("start")) ouvertes.delete(cle); continue; }
          const note = { t, d, n, v: vitesse }; if (!portees.has(portee)) portees.set(portee, []); portees.get(portee).push(note);
          if (liens.includes("start")) ouvertes.set(cle, note);
        }
      }
      // longueur de la mesure : ce qui a été écrit (une anacrouse est plus courte), sinon la mesure théorique
      const attendue = nbTemps ? nbTemps * divisions : 0, reel = fin || attendue;
      debutMesure += reel / divisions;
    }
    for (const [num_, notes] of [...portees].sort((a, b) => a[0] - b[0])) {
      const net = nettoyerNotes(notes); if (!net.length) continue;
      const nom = nbPortees > 1 ? `${meta.nom} (portée ${num_})` : meta.nom;
      pistes.push({ nom, instrument: timbreDe(meta.nom, meta.programme), notes: net });
    }
  }
  if (!pistes.length) throw new Error("Cette partition ne contient aucune note.");
  return { format: "musicxml", titre, tempo: tempo === null ? 120 : Math.round(tempo * 100) / 100, temps: temps ?? 4, pistes, avertissements };
}

// ---------------------------------------------------------------- .mxl : un zip qui contient le MusicXML
async function inflater(octets) {
  const flux = new Blob([octets]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(flux).arrayBuffer());
}
export async function lireZip(octets) {
  const b = octets, dv = new DataView(b.buffer, b.byteOffset, b.byteLength); let fin = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { fin = i; break; }
  if (fin < 0) throw new Error("Ce fichier .mxl est abîmé (zip illisible).");
  const n = dv.getUint16(fin + 10, true); let p = dv.getUint32(fin + 16, true); const fichiers = new Map();
  for (let k = 0; k < n; k++) {
    if (dv.getUint32(p, true) !== 0x02014b50) throw new Error("Ce fichier .mxl est abîmé (zip illisible).");
    const methode = dv.getUint16(p + 10, true), taille = dv.getUint32(p + 20, true), lg = dv.getUint16(p + 28, true), ex = dv.getUint16(p + 30, true), co = dv.getUint16(p + 32, true), local = dv.getUint32(p + 42, true);
    const nom = new TextDecoder().decode(b.subarray(p + 46, p + 46 + lg)); p += 46 + lg + ex + co;
    const lgLocal = dv.getUint16(local + 26, true), exLocal = dv.getUint16(local + 28, true), deb = local + 30 + lgLocal + exLocal;
    fichiers.set(nom, { methode, brut: b.subarray(deb, deb + taille) });
  }
  const lire = async nom => { const f = fichiers.get(nom); if (!f) return null; return f.methode === 0 ? f.brut : f.methode === 8 ? inflater(f.brut) : (() => { throw new Error("Ce fichier .mxl utilise une compression inconnue."); })(); };
  return { noms: [...fichiers.keys()], lire };
}
export async function depuisMxl(octets, options) {
  const z = await lireZip(octets); let chemin = null;
  const c = await z.lire("META-INF/container.xml");
  if (c) { const r = lireXml(new TextDecoder().decode(c)); const rf = r && fils(fils(r, "rootfiles"), "rootfile"); if (rf) chemin = rf.attrs["full-path"]; }
  if (!chemin) chemin = z.noms.find(x => /\.(musicxml|xml)$/i.test(x) && !x.startsWith("META-INF/"));
  const donnees = chemin && await z.lire(chemin); if (!donnees) throw new Error("Ce fichier .mxl ne contient pas de partition.");
  return depuisMusicXml(new TextDecoder().decode(donnees), options);
}

// ---------------------------------------------------------------- l'entrée unique : on reconnaît le fichier à son contenu, pas à son nom
export async function lirePartition(octets, options) {
  const b = octets instanceof Uint8Array ? octets : new Uint8Array(octets);
  if (b.length < 8) throw new Error("Ce fichier est vide ou trop court.");
  if (b[0] === 0x4d && b[1] === 0x54 && b[2] === 0x68 && b[3] === 0x64) { const m = depuisMidi(b); return { ...m, titre: "", avertissements: [], pistes: m.pistes.map(x => ({ ...x, instrument: timbreDe(x.nom) })) }; }
  if (b[0] === 0x50 && b[1] === 0x4b) return depuisMxl(b, options);
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) throw new Error("C'est un PDF : Pistes ne lit pas encore les images de partition. Passe-le d'abord dans l'outil « partition_vers_pistes » (il rend un MusicXML), ou exporte un MusicXML ou un MIDI depuis ton logiciel de notation.");
  const debut = new TextDecoder().decode(b.subarray(0, 64)).replace(/^\uFEFF/, "").trimStart();
  if (debut[0] !== "<") throw new Error("Ce n'est pas un fichier MIDI, ni du MusicXML (.musicxml, .xml ou .mxl).");
  return depuisMusicXml(new TextDecoder().decode(b), options);
}
