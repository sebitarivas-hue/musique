// SONORA Code : le laboratoire de programmation musicale. Faust, Csound et Pure Data, compilés et joués dans la page (aucun envoi, aucun serveur).
// Les moteurs et les exemples sont ceux de SONORA Pistes (../pistes/moteurs.js) ; ici, on les travaille un par un, avec de quoi apprendre.
import * as MO from "../pistes/moteurs.js?v=56d45a54ec";
import { assemblerCanaux } from "../pistes/projet.js?v=56d45a54ec";
import { Stockage as RangementPistes } from "../pistes/stockage.js?v=56d45a54ec";

const $ = id => document.getElementById(id), esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const LANGAGES = {
  faust: { nom: "Faust", couleur: "#FFB84C", court: "Un circuit de traitement du signal, écrit en une formule.",
    identite: "Faust est un langage créé à GRAME, à Lyon. On y décrit un son comme un circuit : des blocs reliés entre eux. Le programme est compilé dans ta page puis joué tout de suite. Il est utilisé dans la recherche et la création musicale.",
    etapes: ["Un programme Faust décrit un circuit : la ligne <code>process = …</code> est ce qui sort vers les haut-parleurs.", "<code>os.osc(440)</code> est un oscillateur sinus à 440 Hz, la note la. Remplace 440 par 660, écoute : une quinte plus haut.", "<code>hslider(\"freq\", 440, 100, 2000, 1)</code> crée un curseur : son nom, sa valeur de départ, son minimum, son maximum, son pas. Il apparaît sous le programme après « Écouter ».", "<code>:</code> branche en série, <code>,</code> en parallèle, <code>&lt;:</code> envoie un son vers deux sorties (gauche et droite). Un programme qui a une entrée transforme un son d'essai."],
    docs: [["Documentation de Faust", "https://faustdoc.grame.fr/"], ["L'éditeur en ligne de GRAME", "https://faustide.grame.fr"], ["Le site de Faust", "https://faust.grame.fr/"]],
    libelle: "Programme Faust" },
  csound: { nom: "Csound", couleur: "#6EC6FF", court: "Un orchestre d'instruments et une partition de notes.",
    identite: "Csound est l'un des plus anciens langages de musique par ordinateur : il date de 1986 et descend des programmes MUSIC de Max Mathews. On écrit un orchestre (les instruments) et une partition (les notes qu'ils jouent). Ici il tourne dans la page, avec le son en direct.",
    etapes: ["Un instrument s'écrit entre <code>instr 1</code> et <code>endin</code>. La partition liste les notes : <code>i1 0 1.5 440</code> veut dire instrument 1, début à 0 s, durée 1,5 s, et le paramètre p4 vaut 440.", "<code>oscili amplitude, fréquence</code> est un oscillateur. <code>p4</code> reprend le quatrième nombre de la ligne de partition : change 440 en 330.", "<code>linseg</code> dessine une enveloppe par segments : le son monte, tient, redescend. Sans elle, on entend un clic au début et à la fin.", "<code>outs a1, a1</code> envoie le signal à gauche et à droite. Ajoute des lignes <code>i1</code> dans la partition pour jouer plusieurs notes."],
    docs: [["Le manuel de référence de Csound", "https://csound.com/docs/manual/"], ["Le FLOSS Manual de Csound", "https://flossmanual.csound.com/"], ["Le site de Csound", "https://csound.com/"]],
    libelle: "Orchestre Csound" },
  js: { nom: "JavaScript", couleur: "#FF8FB8", court: "Le langage du web : l'API Web Audio fabrique du son dans n'importe quel navigateur.",
    identite: "JavaScript est le langage de toutes les pages web, et le navigateur sait fabriquer du son avec lui : c'est l'API Web Audio. On crée des nœuds (oscillateur, volume, filtre, écho), on les relie, et on les fait jouer. C'est la base de nombreux outils de musique en ligne, dont ce site.",
    etapes: ["Ton programme reçoit deux choses : <code>ctx</code> (le contexte audio) et <code>sortie</code> (la prise vers les haut-parleurs). Tout ce que tu relies à <code>sortie</code> s'entend.", "<code>ctx.createOscillator()</code> fabrique un oscillateur ; on règle sa <code>frequency.value</code>, on le relie avec <code>.connect(…)</code>, on le lance avec <code>.start()</code> et on l'arrête avec <code>.stop(temps)</code>.", "Le temps se compte en secondes sur l'horloge <code>ctx.currentTime</code>. Pour programmer une note dans une seconde : <code>.start(ctx.currentTime + 1)</code>.", "Un volume qui change se dessine avec <code>gain.setValueAtTime</code> et <code>linearRampToValueAtTime</code> : c'est l'enveloppe. La variable <code>duree</code> contient la durée choisie."],
    docs: [["Web Audio sur MDN", "https://developer.mozilla.org/fr/docs/Web/API/Web_Audio_API"], ["Le guide des concepts de Web Audio", "https://developer.mozilla.org/fr/docs/Web/API/Web_Audio_API/Basic_concepts_behind_Web_Audio_API"]],
    libelle: "Programme JavaScript (Web Audio)" },
  pd: { nom: "Pure Data", couleur: "#8BD450", court: "Des boîtes reliées par des fils, comme un synthétiseur modulaire.",
    identite: "Pure Data (Pd) est un langage graphique créé par Miller Puckette. On dessine des boîtes reliées par des fils, comme sur un synthétiseur modulaire. Ici, le patch s'écrit en texte, tel qu'il est enregistré dans un fichier .pd, et il est joué par WebPd.",
    etapes: ["Un patch est une suite de lignes. <code>#X obj x y nom arguments</code> crée une boîte ; <code>#X connect a sortie b entrée</code> tire un fil.", "Les boîtes sont numérotées à partir de 0 dans l'ordre des lignes. <code>osc~ 440</code> est un oscillateur : le tilde <code>~</code> annonce un signal audio.", "<code>*~ 0.3</code> baisse le volume, <code>dac~</code> est la sortie vers les haut-parleurs (gauche en 0, droite en 1).", "WebPd ne connaît qu'une partie des objets de Pure Data : s'il refuse un objet, le message le dit."],
    docs: [["Le site de Pure Data", "https://puredata.info/"], ["The Theory and Technique of Electronic Music (Puckette, en ligne)", "https://msp.ucsd.edu/techniques.htm"], ["WebPd, le moteur utilisé ici", "https://github.com/sebpiq/WebPd"]],
    libelle: "Patch Pure Data (le texte d'un fichier .pd)" },
};
const JS_EX = [
  { titre: "Un son pur", niv: "Découverte", texte: "Un oscillateur, un volume : la note la, avec une entrée et une sortie douces.", code: "// ctx : le contexte audio ; sortie : la prise vers les haut-parleurs ; duree : la durée choisie\nconst t = ctx.currentTime;\nconst osc = ctx.createOscillator();\nconst vol = ctx.createGain();\nosc.type = \"sine\";\nosc.frequency.value = 440;\nvol.gain.setValueAtTime(0, t);\nvol.gain.linearRampToValueAtTime(0.3, t + 0.05);\nvol.gain.linearRampToValueAtTime(0, t + duree);\nosc.connect(vol).connect(sortie);\nosc.start(t);\nosc.stop(t + duree);" },
  { titre: "Une gamme de do", niv: "Découverte", texte: "Une boucle qui programme huit notes, l'une après l'autre.", code: "const t0 = ctx.currentTime;\nconst demiTons = [0, 2, 4, 5, 7, 9, 11, 12];\nconst pas = Math.min(0.5, duree / 8);\ndemiTons.forEach((d, i) => {\n  const osc = ctx.createOscillator();\n  const vol = ctx.createGain();\n  osc.type = \"triangle\";\n  osc.frequency.value = 261.63 * Math.pow(2, d / 12);\n  const t = t0 + i * pas;\n  vol.gain.setValueAtTime(0.0001, t);\n  vol.gain.exponentialRampToValueAtTime(0.3, t + 0.02);\n  vol.gain.exponentialRampToValueAtTime(0.0001, t + pas * 0.95);\n  osc.connect(vol).connect(sortie);\n  osc.start(t);\n  osc.stop(t + pas);\n});" },
  { titre: "Un vibrato", niv: "Programmation", texte: "Un deuxième oscillateur, très lent, fait osciller la hauteur du premier.", code: "const t = ctx.currentTime;\nconst voix = ctx.createOscillator();\nconst lent = ctx.createOscillator();\nconst profondeur = ctx.createGain();\nconst vol = ctx.createGain();\nvoix.type = \"sawtooth\";\nvoix.frequency.value = 330;\nlent.frequency.value = 5;      // 5 oscillations par seconde\nprofondeur.gain.value = 8;    // de plus ou moins 8 Hz\nlent.connect(profondeur).connect(voix.frequency);\nvol.gain.value = 0.15;\nvoix.connect(vol).connect(sortie);\nvoix.start(t); lent.start(t);\nvoix.stop(t + duree); lent.stop(t + duree);" },
  { titre: "Du bruit filtré", niv: "Programmation", texte: "Du bruit blanc dont on ne garde qu'une bande : un souffle de vent qu'on fait monter.", code: "const t = ctx.currentTime;\nconst n = Math.floor(ctx.sampleRate * duree);\nconst tampon = ctx.createBuffer(1, n, ctx.sampleRate);\nconst x = tampon.getChannelData(0);\nfor (let i = 0; i < n; i++) x[i] = Math.random() * 2 - 1;   // bruit blanc\nconst source = ctx.createBufferSource();\nconst filtre = ctx.createBiquadFilter();\nconst vol = ctx.createGain();\nsource.buffer = tampon;\nfiltre.type = \"bandpass\";\nfiltre.Q.value = 6;\nfiltre.frequency.setValueAtTime(300, t);\nfiltre.frequency.exponentialRampToValueAtTime(3000, t + duree);\nvol.gain.value = 0.5;\nsource.connect(filtre).connect(vol).connect(sortie);\nsource.start(t);" },
  { titre: "Un écho", niv: "Recherche", texte: "Une note pincée, puis un délai qui se renvoie une partie de son signal.", code: "const t = ctx.currentTime;\nconst osc = ctx.createOscillator();\nconst vol = ctx.createGain();\nconst delai = ctx.createDelay(1);\nconst retour = ctx.createGain();\nosc.type = \"square\";\nosc.frequency.value = 392;\nvol.gain.setValueAtTime(0.25, t);\nvol.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);\ndelai.delayTime.value = 0.35;\nretour.gain.value = 0.55;       // la part du signal qui revient\nosc.connect(vol);\nvol.connect(sortie);            // le son direct\nvol.connect(delai);\ndelai.connect(retour).connect(delai);   // la boucle de l'écho\ndelai.connect(sortie);\nosc.start(t);\nosc.stop(t + 0.4);" },
];
const etat = { l: "faust", i: 0, occupe: false, ctx: null, source: null, csound: null, dernier: null, compile: null, valeurs: {}, raf: 0 };
const dire = (t, erreur) => { const m = $("message"); m.textContent = t; m.classList.toggle("erreur", !!erreur); const e = $("etat"); if (e) e.textContent = erreur ? "erreur" : t.split("\n")[0].slice(0, 40); };

function liste(l) { // les exemples d'un langage, du plus simple au plus avancé
  if (l === "js") return JS_EX.map((e, i) => ({ i, titre: e.titre, effet: false, niv: e.niv, texte: e.texte }));
  const rang = n => MO.NIVEAUX.indexOf(n);
  return MO.EXEMPLES[l].map((e, i) => ({ i, titre: e[0].replace(/ \(effet : il lui faut un clip\)/, ""), effet: /effet/.test(e[0]), but: MO.CATALOGUE[l][i][0], niv: MO.CATALOGUE[l][i][1], texte: MO.CATALOGUE[l][i][2] }))
    .sort((a, b) => rang(a.niv) - rang(b.niv) || a.i - b.i);
}
function dessinerLangages() {
  $("langages").innerHTML = ["faust", "csound", "pd", "js"].map(k => [k, LANGAGES[k]]).map(([k, L]) => `<button type="button" data-l="${k}" style="--c:${L.couleur}" aria-pressed="${k === etat.l}"><b>${L.nom}</b><span>${esc(L.court)}</span></button>`).join("");
}
function dessinerLangage() {
  const L = LANGAGES[etat.l]; dessinerLangages();
  $("presentation").innerHTML = `<h2>${L.nom}</h2><p>${L.identite}</p>`;
  $("etapes").innerHTML = `<h3>Pour commencer, en quatre idées</h3><ol>${L.etapes.map(x => `<li>${x}</li>`).join("")}</ol>`;
  $("lib-code").textContent = L.libelle; $("zone-score").hidden = etat.l !== "csound"; $("params").hidden = etat.l !== "faust";
  const site = ((window.BARRE_COURS && window.BARRE_COURS.retour) || "../../choix.html").split("#")[0];   // la page d'accueil du bon espace (enseignant ou élève)
  const dansLeSite = etat.l === "faust" ? `<h3>Dans le site du cours</h3><ul><li><a href="${esc(site)}#faust-ateliers">Les ateliers guidés</a></li><li><a href="${esc(site)}#faust-matieres">Les matières sonores</a></li><li><a href="${esc(site)}#faust">Le laboratoire Faust</a></li><li><a href="${esc(site)}#faust-studio">Le studio Faust</a></li></ul>` : "";
  $("plus").innerHTML = dansLeSite + `<h3>Pour aller plus loin</h3><ul>${L.docs.map(([t, u]) => `<li><a href="${u}" target="_blank" rel="noopener">${esc(t)}</a></li>`).join("")}</ul><p class="petit">Dans SONORA Pistes, le même programme se rend en clip sur une piste, pour le mixer avec d'autres sons.</p>`;
  const n = liste(etat.l).map((x, k) => `<button type="button" class="carte" data-i="${x.i}" style="--c:${L.couleur}" aria-pressed="${x.i === etat.i}"><em>${k + 1} · ${esc(x.niv)}${x.effet ? " · transforme un son" : ""}</em><b>${esc(x.titre)}</b><span>${esc(x.texte)}</span></button>`).join("");
  $("cartes").innerHTML = n; charger(etat.i);
}
function charger(i) {
  if (etat.l === "js") { const e = JS_EX[i]; if (!e) return; etat.i = i; $("code").value = e.code; $("score").value = ""; $("params").innerHTML = ""; arreter(); $("zone-entree").hidden = true;
    document.querySelectorAll(".carte").forEach(c => c.setAttribute("aria-pressed", String(+c.dataset.i === i))); dire(`Exemple « ${e.titre} » chargé. ${e.texte}`); return; }
  const ex = MO.EXEMPLES[etat.l][i]; if (!ex) return; etat.i = i; etat.compile = null; $("code").value = ex[1]; $("score").value = ex[2] || ""; $("params").innerHTML = ""; arreter();
  document.querySelectorAll(".carte").forEach(c => c.setAttribute("aria-pressed", String(+c.dataset.i === i)));
  const meta = MO.CATALOGUE[etat.l][i]; dire(`Exemple « ${ex[0].replace(/ \(effet : il lui faut un clip\)/, "")} » chargé. ${meta[2]}`); $("zone-entree").hidden = !/effet/.test(ex[0]);
}
const contexte = () => { if (!etat.ctx) etat.ctx = new (window.AudioContext || window.webkitAudioContext)(); return etat.ctx; };
function signalEssai(type, sr, secondes) {
  const n = Math.ceil(secondes * sr), x = new Float32Array(n); let g = 12345;
  const alea = () => { g = (g * 1103515245 + 12345) & 0x7fffffff; return g / 0x3fffffff - 1; };
  if (type === "bruit") for (let i = 0; i < n; i++) x[i] = 0.4 * alea();
  else if (type === "pulse") { const T = Math.round(sr * 0.25); for (let i = 0; i < n; i++) { const t = (i % T) / sr; x[i] = Math.exp(-t * 28) * 0.6 * alea(); } }
  else { const f = [220, 277.18, 329.63, 440], T = Math.round(sr * 0.4); for (let i = 0; i < n; i++) { const k = Math.floor(i / T) % 4, t = (i % T) / sr, ph = (i / sr * f[k]) % 1; x[i] = (2 * ph - 1) * 0.35 * Math.exp(-t * 3); } }
  return x;
}
function arreter() {
  cancelAnimationFrame(etat.raf); if (etat.sortieJs) { try { etat.sortieJs.disconnect(); } catch (_) {} etat.sortieJs = null; } if (etat.source) { try { etat.source.stop(); } catch (_) {} try { etat.source.disconnect(); } catch (_) {} etat.source = null; }
  if (etat.csound) { const c = etat.csound; etat.csound = null; try { c.noeud.disconnect(); } catch (_) {} c.arreter(); }
  finirCapture();
}
// Csound et JavaScript jouent en direct : on les enregistre en même temps, pour pouvoir les enregistrer en WAV ou les envoyer vers Pistes.
function finirCapture() {
  const c = etat.capture; if (!c) return; etat.capture = null; const canaux = assemblerCanaux(c.cap.fin()).slice(0, 2), n = canaux[0] ? canaux[0].length : 0;
  if (n && pic(canaux) > 1e-4) { etat.dernier = { canaux, sr: c.sr }; if (!etat.occupe) dire((etat.l === "csound" ? "Csound" : "JavaScript") + " : le son est enregistré, tu peux l'enregistrer en WAV ou l'envoyer vers Pistes."); }
}
function scope(analyseur, duree) {
  const cv = $("scope"), g = cv.getContext("2d"), d = new Float32Array(analyseur.fftSize), fin = performance.now() + duree * 1000 + 300;
  const tour = () => { analyseur.getFloatTimeDomainData(d); g.fillStyle = "#14130f"; g.fillRect(0, 0, cv.width, cv.height); g.strokeStyle = "#D6FF00"; g.lineWidth = 2; g.beginPath();
    for (let i = 0; i < d.length; i++) { const x = i / d.length * cv.width, y = cv.height / 2 - d[i] * cv.height * 0.45; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
    if (performance.now() < fin) etat.raf = requestAnimationFrame(tour); };
  tour();
}
function jouerCanaux(canaux, sr) {
  const ctx = contexte(), buf = ctx.createBuffer(Math.min(2, canaux.length), canaux[0].length, sr); canaux.slice(0, 2).forEach((c, k) => buf.copyToChannel(c, k));
  const s = ctx.createBufferSource(), an = ctx.createAnalyser(); an.fftSize = 2048; s.buffer = buf; s.connect(an); an.connect(ctx.destination); s.start(); etat.source = s; scope(an, buf.duration); s.onended = () => { if (etat.source === s) etat.source = null; };
}
const pic = canaux => canaux.reduce((m, x) => { for (let i = 0; i < x.length; i += 5) m = Math.max(m, Math.abs(x[i])); return m; }, 0);
async function faust(secondes) {
  // Le programme n'est recompilé que s'il a changé (ou si on vient de charger un exemple) : sinon les curseurs seraient remis à leur valeur de départ à chaque écoute, et ne serviraient à rien.
  let c = etat.compile;
  if (!c) {
    dire(MO.chargerFaust && !etat.faustCharge ? "Chargement du compilateur Faust (environ 6 Mo, une seule fois)…" : "Compilation…");
    c = await MO.compilerFaust($("code").value); etat.faustCharge = true; etat.compile = c;
    const z = $("params"); z.innerHTML = ""; etat.valeurs = {};
    for (const q of MO.parametresFaust(c.meta)) { etat.valeurs[q.adresse] = q.init; const id = "p" + Object.keys(etat.valeurs).length;
      z.insertAdjacentHTML("beforeend", `<label for="${id}">${esc(q.nom)} <output id="${id}-v">${q.init}</output></label><input id="${id}" type="range" min="${q.min}" max="${q.max}" step="${q.pas || "any"}" value="${q.init}" data-a="${esc(q.adresse)}">`); }
    z.hidden = !z.children.length;
  }
  const ctx = contexte(), sr = ctx.sampleRate; let entrees = [];
  if (c.meta.inputs) { const x = signalEssai($("entree").value, sr, secondes); entrees = [x, x]; }
  dire("Rendu…"); const r = await MO.rendreFaust(c.gen, c.meta, { sr, secondes, entrees, valeurs: etat.valeurs }), p = pic(r.canaux);
  if (!(p > 1e-4)) { dire("Le programme ne produit aucun son (silence). Vérifie les réglages, et qu'il y a bien un signal en sortie.", true); return; }
  etat.dernier = r; jouerCanaux(r.canaux, r.sr); dire(`Faust ${c.version} : ${c.meta.inputs} entrée${c.meta.inputs > 1 ? "s" : ""}, ${c.meta.outputs} sortie${c.meta.outputs > 1 ? "s" : ""}.${p > 1 ? " Attention : le signal dépasse 0 dB, baisse le volume." : ""}`);
}
async function pd(secondes) {
  dire("Compilation (WebPd)…"); const ctx = contexte(), sr = ctx.sampleRate, c = await MO.compilerPatchPd($("code").value, sr);
  const entree = c.entrees ? signalEssai($("entree").value, sr, secondes) : null;
  const r = MO.rendrePd(c.js, { sr, secondes, entree }), p = pic(r.canaux);
  if (!(p > 1e-4)) { dire("Le patch ne produit aucun son (silence). Vérifie qu'il y a un dac~ relié à un signal, et que les objets sont ceux que WebPd connaît.", true); return; }
  etat.dernier = r; jouerCanaux(r.canaux, r.sr); dire(`Pure Data (WebPd)${c.entrees ? " : ce patch transforme le son d'essai." : "."}${p > 1 ? " Attention : le signal dépasse 0 dB, baisse le volume." : ""}`);
}
async function csound(secondes) {
  const ctx = contexte(); dire("Chargement de Csound (environ 5 Mo, une seule fois)…");
  const moteur = await MO.lancerCsound(ctx, $("code").value, $("score").value), an = ctx.createAnalyser(); an.fftSize = 2048; moteur.noeud.connect(an); an.connect(ctx.destination); etat.csound = moteur;
  etat.capture = { cap: await MO.ouvrirCapteur(ctx, moteur.noeud), sr: ctx.sampleRate };
  scope(an, secondes); dire(`Csound joue : ${secondes} s… (tu l'entends en direct)`);
  setTimeout(() => { if (etat.csound === moteur) { etat.csound = null; try { moteur.noeud.disconnect(); } catch (_) {} moteur.arreter(); finirCapture(); dire("Terminé. Change le code ou la partition, puis écoute encore, ou envoie le son vers Pistes."); } }, secondes * 1000 + 250);
}
async function js(secondes) {
  const ctx = contexte(), sortie = ctx.createGain(), an = ctx.createAnalyser(); an.fftSize = 2048; sortie.connect(an); an.connect(ctx.destination);
  etat.sortieJs = sortie; let fn; try { fn = new Function("ctx", "sortie", "duree", $("code").value); } catch (e) { dire("Erreur d'écriture : " + e.message, true); return; }
  try { fn(ctx, sortie, secondes); } catch (e) { dire("Erreur dans le programme : " + (e && e.message || e), true); try { sortie.disconnect(); } catch (_) {} return; }
  etat.capture = { cap: await MO.ouvrirCapteur(ctx, sortie), sr: ctx.sampleRate };
  scope(an, secondes); dire(`JavaScript joue : ${secondes} s… (tu l'entends en direct)`);
  setTimeout(() => { if (etat.sortieJs === sortie) { finirCapture(); dire("Terminé. Change le code, puis écoute encore, ou envoie le son vers Pistes."); } }, secondes * 1000 + 250);
}
async function ecouter() {
  if (etat.occupe) return; etat.occupe = true; $("b-ecouter").disabled = true; arreter();
  try { const ctx = contexte(); if (ctx.state !== "running") { try { await Promise.race([ctx.resume(), new Promise(ok => setTimeout(ok, 1500))]); } catch (_) {} }
    const s = Math.max(1, Math.min(30, +$("duree").value || 3)); if (etat.l === "faust") await faust(s); else if (etat.l === "pd") await pd(s); else if (etat.l === "js") await js(s); else await csound(s); }
  catch (e) { dire(String(e && e.message || e).slice(0, 700), true); }
  finally { etat.occupe = false; $("b-ecouter").disabled = false; }
}
function wav(canaux, sr) { // 16 bits, stéréo
  const n = canaux[0].length, c = Math.min(2, canaux.length), o = new DataView(new ArrayBuffer(44 + n * c * 2)), t = (p, s) => [...s].forEach((ch, k) => o.setUint8(p + k, ch.charCodeAt(0)));
  t(0, "RIFF"); o.setUint32(4, 36 + n * c * 2, true); t(8, "WAVEfmt "); o.setUint32(16, 16, true); o.setUint16(20, 1, true); o.setUint16(22, c, true); o.setUint32(24, sr, true); o.setUint32(28, sr * c * 2, true); o.setUint16(32, c * 2, true); o.setUint16(34, 16, true); t(36, "data"); o.setUint32(40, n * c * 2, true);
  let p = 44; for (let i = 0; i < n; i++) for (let k = 0; k < c; k++) { const v = Math.max(-1, Math.min(1, canaux[k][i])); o.setInt16(p, v < 0 ? v * 0x8000 : v * 0x7fff, true); p += 2; }
  return new Blob([o], { type: "audio/wav" });
}
$("langages").onclick = e => { const b = e.target.closest("[data-l]"); if (!b) return; etat.l = b.dataset.l; etat.i = liste(etat.l)[0].i; arreter(); dessinerLangage(); try { history.replaceState(null, "", "#" + etat.l); } catch (_) {} };
$("cartes").onclick = e => { const b = e.target.closest(".carte"); if (b) charger(+b.dataset.i); };
$("b-ecouter").onclick = ecouter; $("b-stop").onclick = () => { arreter(); dire("Arrêté."); };
$("code").oninput = $("score").oninput = () => { etat.compile = null; };
$("params").addEventListener("input", e => { const a = e.target.dataset && e.target.dataset.a; if (!a) return; etat.valeurs[a] = +e.target.value; const o = $(e.target.id + "-v"); if (o) o.textContent = e.target.value; });
$("b-wav").onclick = () => { if (!etat.dernier) { dire("Écoute d'abord, puis enregistre.", true); return; } const u = URL.createObjectURL(wav(etat.dernier.canaux, etat.dernier.sr)), a = document.createElement("a"); a.href = u; a.download = `sonora-${etat.l}.wav`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 5000); };
// Envoyer vers Pistes : le même mécanisme que le Studio (clé « pistes:arrivees »), pour les quatre langages. Rien ne quitte l'appareil.
const nomDuSon = () => { const t = etat.l === "js" ? (JS_EX[etat.i] || {}).titre : ((MO.EXEMPLES[etat.l][etat.i] || [])[0] || "").replace(/ \(effet : il lui faut un clip\)/, ""); return ("Code : " + (t || "mon programme")).slice(0, 80); };
$("b-vers-pistes").onclick = async () => {
  if (!etat.dernier) { dire("Écoute d'abord, puis envoie.", true); return; }
  try { const d = etat.dernier, duree = +(d.canaux[0].length / d.sr).toFixed(2), id = "arrivee-" + Date.now().toString(36), nom = nomDuSon();
    await RangementPistes.ecrireSon(id, { canaux: d.canaux.slice(0, 2), sr: d.sr });
    let L = []; try { L = JSON.parse(localStorage.getItem("pistes:arrivees") || "[]"); } catch (_) {} L.push({ id, nom, duree }); localStorage.setItem("pistes:arrivees", JSON.stringify(L));
    dire(`« ${nom} » (${duree} s) est envoyé vers Pistes.`); window.CODE_ENVOI = { id, nom, duree }; if (!window.TEST_SANS_REDIRECTION) location.href = "../pistes/index.html";
  } catch (e) { dire("L'envoi vers Pistes n'a pas pu se faire : " + (e && e.message || e), true); }
};
$("code").addEventListener("keydown", e => { if (e.key === "Tab" && !e.shiftKey) { e.preventDefault(); const t = e.target, a = t.selectionStart; t.value = t.value.slice(0, a) + "  " + t.value.slice(t.selectionEnd); t.selectionStart = t.selectionEnd = a + 2; } else if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); ecouter(); } });
const h = (location.hash || "").slice(1); if (LANGAGES[h]) etat.l = h;
etat.i = liste(etat.l)[0].i; dessinerLangage(); window.CODE_ETAT = etat; window.CODE_PRET = true;
