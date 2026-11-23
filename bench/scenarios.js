// Scénarios du banc d'essai SONORA. Chaque scénario dit ce qu'il mesure, comment, et ce qu'il ne prouve pas.
// Les 20 scénarios de la demande y sont (id s01 à s20). Ceux dont le moteur n'existe pas encore dans SONORA sont NON_MESURE avec la raison : ils ne reçoivent jamais de chiffre.
// Les scénarios s21 à s24 mesurent le moteur SONORA existant et la musique de la galaxie (Faust), qui sont les charges réelles du site.

const hz = m => 440 * Math.pow(2, (m - 69) / 12);
const urlSonora = async (chemin) => { for (const base of ["../sonora/src/", "../../sonora/src/"]) { try { return await import(new URL(base + chemin, import.meta.url)); } catch (_) {} } throw new Error("moteur SONORA introuvable (" + chemin + ")"); };

// ---- noyaux de calcul dans un AudioWorklet (code de worklets/kernels.js)
const noyau = kind => async (ctx, maitre, p, collecte) => {
  const nd = new AudioWorkletNode(ctx, "bench-noyau", { numberOfInputs: 0, outputChannelCount: [p.canaux], processorOptions: { kind, n: p.instances, volume: 1, quantum: p.bloc } });
  nd.port.onmessage = e => { if (e.data.type === "fenetre") collecte.fenetre({ ...e.data, source: "noyau" }); };
  nd.connect(maitre); return { arreter() { nd.port.postMessage("stop"); nd.disconnect(); } };
};

// ---- nœuds Web Audio natifs (la durée de calcul n'est pas accessible : seuls les compteurs de coupures et la sonde jugent)
const natifSinus = (nb = 1, forme = "sine") => async (ctx, maitre, p) => { const sources = []; const g = ctx.createGain(); g.gain.value = 1 / Math.sqrt(p.instances * nb); g.connect(maitre);
  for (let i = 0; i < p.instances * nb; i++) { const o = ctx.createOscillator(); o.type = forme; o.frequency.value = 55 * Math.pow(2, ((i * 7) % 60) / 12); o.connect(g); o.start(); sources.push(o); } return { arreter() { sources.forEach(o => { try { o.stop(); } catch (_) {} }); g.disconnect(); } }; };
const natifFiltre = async (ctx, maitre, p) => { const g = ctx.createGain(); g.gain.value = 1 / Math.sqrt(p.instances); g.connect(maitre); const s = [];
  for (let i = 0; i < p.instances; i++) { const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = 55 * Math.pow(2, ((i * 7) % 60) / 12); const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 1200 + 40 * i; f.Q.value = 3; o.connect(f).connect(g); o.start(); s.push(o); } return { arreter() { s.forEach(o => { try { o.stop(); } catch (_) {} }); g.disconnect(); } }; };
const natifEffets = async (ctx, maitre, p) => {   // oscillateurs, filtre, saturation, écho avec retour, compresseur : la chaîne d'effets d'un instrument de studio
  const entree = ctx.createGain(); entree.gain.value = 1 / Math.sqrt(p.instances); const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 2500; const sat = ctx.createWaveShaper(); const c = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; c[i] = Math.tanh(3 * x); } sat.curve = c;
  const d = ctx.createDelay(1); d.delayTime.value = 0.28; const fb = ctx.createGain(); fb.gain.value = 0.45; d.connect(fb).connect(d); const comp = ctx.createDynamicsCompressor(); entree.connect(f).connect(sat); sat.connect(comp); sat.connect(d); d.connect(comp); comp.connect(maitre);
  const s = []; for (let i = 0; i < p.instances; i++) { const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = 55 * Math.pow(2, ((i * 7) % 48) / 12); o.connect(entree); o.start(); s.push(o); } return { arreter() { s.forEach(o => { try { o.stop(); } catch (_) {} }); comp.disconnect(); } }; };
const natifConvolution = async (ctx, maitre, p) => {   // une réponse impulsionnelle synthétique de 2 s par convolueur : coût réaliste d'une salle par convolution
  const len = Math.floor(ctx.sampleRate * 2), ir = ctx.createBuffer(2, len, ctx.sampleRate); for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); let s = 1 + c; for (let i = 0; i < len; i++) { s = (s * 16807) % 2147483647; d[i] = (s / 2147483647 * 2 - 1) * Math.exp(-3 * i / len); } }
  const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); { const d = noise.getChannelData(0); let s = 3; for (let i = 0; i < d.length; i++) { s = (s * 16807) % 2147483647; d[i] = (s / 2147483647 * 2 - 1) * 0.3 * (i % 12000 < 600 ? 1 : 0); } }
  const nodes = []; for (let i = 0; i < p.instances; i++) { const src = ctx.createBufferSource(); src.buffer = noise; src.loop = true; const cv = ctx.createConvolver(); cv.buffer = ir; const g = ctx.createGain(); g.gain.value = 1 / Math.sqrt(p.instances); src.connect(cv).connect(g).connect(maitre); src.start(); nodes.push(src); } return { arreter() { nodes.forEach(n => { try { n.stop(); } catch (_) {} }); } }; };
const analyseFft = async (ctx, maitre, p) => {   // analyse FFT en continu, lue à 60 Hz par le fil principal : coût de l'analyse plus celui de la lecture
  const an = ctx.createAnalyser(); an.fftSize = 8192; const src = await noyau("filtre")(ctx, an, { ...p, instances: 8 }, { fenetre() {} }); an.connect(maitre); const ex = new Float32Array(an.frequencyBinCount), t = new Float32Array(an.fftSize); let vivant = true;
  const tour = () => { if (!vivant) return; for (let k = 0; k < p.instances; k++) { an.getFloatFrequencyData(ex); an.getFloatTimeDomainData(t); } requestAnimationFrame(tour); }; requestAnimationFrame(tour); return { arreter() { vivant = false; src.arreter(); } }; };
const sequenceur = async (ctx, maitre, p) => {   // p.instances pistes, une note de 16e à 140 battements par minute, planifiées 150 ms à l'avance depuis le fil principal
  const dur = 0.12, buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate); { const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.sin(2 * Math.PI * 220 * i / ctx.sampleRate) * Math.exp(-6 * i / d.length); }
  const g = ctx.createGain(); g.gain.value = 1 / Math.sqrt(p.instances * 2); g.connect(maitre); const pas = 60 / 140 / 4; let prochain = ctx.currentTime + 0.1, vivant = true, notes = 0, retards = []; const planifier = () => { if (!vivant) return; const maintenant = ctx.currentTime; if (prochain < maintenant) retards.push(maintenant - prochain);
    while (prochain < maintenant + 0.15) { for (let t = 0; t < p.instances; t++) if ((notes + t) % 3 !== 2) { const s = ctx.createBufferSource(); s.buffer = buf; s.playbackRate.value = Math.pow(2, ((t * 5) % 24) / 12); s.connect(g); s.start(prochain); } prochain += pas; notes++; } setTimeout(planifier, 25); }; planifier();
  return { arreter() { vivant = false; g.disconnect(); }, retards }; };
const automations = async (ctx, maitre, p) => {   // N filtres dont la coupure et le gain sont automatisés en continu (rampes et courbes)
  const s = [], g = ctx.createGain(); g.gain.value = 1 / Math.sqrt(p.instances); g.connect(maitre); let vivant = true; const courbe = new Float32Array(64); for (let i = 0; i < 64; i++) courbe[i] = 600 + 1800 * (0.5 + 0.5 * Math.sin(2 * Math.PI * i / 64));
  for (let i = 0; i < p.instances; i++) { const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = 55 * Math.pow(2, ((i * 7) % 48) / 12); const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.Q.value = 4; const v = ctx.createGain(); o.connect(f).connect(v).connect(g); o.start(); s.push({ o, f, v }); }
  const tour = () => { if (!vivant) return; const t = ctx.currentTime; s.forEach(({ f, v }, i) => { f.frequency.cancelScheduledValues(t); f.frequency.setValueCurveAtTime(courbe, t + 0.01, 0.8); v.gain.cancelScheduledValues(t); v.gain.setValueAtTime(0.6, t); v.gain.linearRampToValueAtTime(1, t + 0.4); }); setTimeout(tour, 700); }; tour();
  return { arreter() { vivant = false; s.forEach(x => { try { x.o.stop(); } catch (_) {} }); g.disconnect(); } }; };
const grapheModulaire = async (ctx, maitre, p) => {   // un graphe de p.instances modules (oscillateurs, filtres, retards, gains) dont les paramètres sont modulés par d'autres oscillateurs lents
  const nds = [], mod = [], sortieG = ctx.createGain(); sortieG.gain.value = 1 / Math.sqrt(p.instances); sortieG.connect(maitre); let graine = 99; const alea = () => (graine = (graine * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < p.instances; i++) { const t = i % 4; let n; if (t === 0) { n = ctx.createOscillator(); n.type = "sawtooth"; n.frequency.value = 55 * Math.pow(2, Math.floor(alea() * 36) / 12); n.start(); } else if (t === 1) { n = ctx.createBiquadFilter(); n.frequency.value = 800 + alea() * 2000; n.Q.value = 2; } else if (t === 2) { n = ctx.createDelay(1); n.delayTime.value = 0.05 + alea() * 0.2; } else n = ctx.createGain();
    nds.push(n); const lfo = ctx.createOscillator(), amp = ctx.createGain(); lfo.frequency.value = 0.1 + alea() * 4; amp.gain.value = t === 0 ? 20 : t === 1 ? 400 : t === 2 ? 0.01 : 0.2; lfo.connect(amp); const cible = t === 0 ? n.frequency : t === 1 ? n.frequency : t === 2 ? n.delayTime : n.gain; amp.connect(cible); lfo.start(); mod.push(lfo); }
  nds.forEach((n, i) => { const suivant = nds[(i + 1 + Math.floor(alea() * 3)) % nds.length]; if (n.numberOfOutputs) { try { n.connect(suivant.numberOfInputs ? suivant : sortieG); } catch (_) { n.connect(sortieG); } } if (i % 5 === 0) try { n.connect(sortieG); } catch (_) {} });
  return { arreter() { mod.forEach(o => { try { o.stop(); } catch (_) {} }); nds.forEach(n => { try { n.stop && n.stop(); n.disconnect(); } catch (_) {} }); } }; };
const visualisations = async (ctx, maitre, p) => {   // trois vues en direct (oscilloscope, spectre, spectrogramme) à chaque image, pendant qu'un son joue
  const hote = document.getElementById("bench-visu") || (() => { const d = document.createElement("div"); d.id = "bench-visu"; document.body.appendChild(d); return d; })(); hote.innerHTML = "";
  const an = ctx.createAnalyser(); an.fftSize = 2048; const src = await noyau("filtre")(ctx, an, { ...p, instances: 8 }, { fenetre() {} }); an.connect(maitre);
  const cv = [0, 1, 2].map(() => { const c = document.createElement("canvas"); c.width = 480; c.height = 120; c.style.cssText = "display:block;width:480px;max-width:100%;background:#0a0d08;margin:4px 0"; hote.appendChild(c); return c; }); const g = cv.map(c => c.getContext("2d")); const f = new Float32Array(an.frequencyBinCount), t = new Float32Array(an.fftSize); let vivant = true;
  const tour = () => { if (!vivant) return; for (let k = 0; k < p.instances; k++) { an.getFloatTimeDomainData(t); an.getFloatFrequencyData(f);
    g[0].clearRect(0, 0, 480, 120); g[0].strokeStyle = "#b8f54a"; g[0].beginPath(); for (let x = 0; x < 480; x++) { const y = 60 - t[x * 2] * 50; x ? g[0].lineTo(x, y) : g[0].moveTo(x, y); } g[0].stroke();
    g[1].clearRect(0, 0, 480, 120); g[1].fillStyle = "#b8f54a"; for (let x = 0; x < 480; x++) { const v = (f[x * 2] + 120) / 120; g[1].fillRect(x, 120 - v * 120, 1, v * 120); }
    g[2].drawImage(cv[2], 1, 0); for (let y = 0; y < 120; y++) { const v = Math.max(0, (f[y * 4] + 120) / 120); g[2].fillStyle = `rgb(${Math.floor(v * 255)},${Math.floor(v * 255)},${Math.floor(v * 80)})`; g[2].fillRect(0, 120 - y, 1, 1); } } requestAnimationFrame(tour); }; requestAnimationFrame(tour);
  return { arreter() { vivant = false; src.arreter(); hote.innerHTML = ""; } }; };
const multiInstruments = async (ctx, maitre, p) => {   // trois instruments à la fois : filtre soustractif, FM, corde pincée, chacun avec le tiers des instances
  const k = Math.max(1, Math.floor(p.instances / 3)), ins = []; for (const t of ["filtre", "fm", "pluck"]) ins.push(await noyau(t)(ctx, maitre, { ...p, instances: k }, { fenetre() {} })); return { arreter() { ins.forEach(i => i.arreter()); } }; };

// ---- le moteur SONORA existant (noyau compilé, AudioWorklet de sonora/src/processeur.js)
const ENV = "adsr(porte: n.porte, attaque: 10 ms, declin: 100 ms, soutien: 70%, relache: 200 ms)";
const sonora = (fabrique, notes) => async (ctx, maitre, p, collecte) => {
  const { Moteur } = await urlSonora("moteur.js"), { compiler } = await urlSonora("index.js"), src = fabrique(p.instances), res = compiler(src);
  if (!res.ok) throw new Error("programme SONORA refusé : " + res.diagnostics.map(d => d.code).join(","));
  const m = new Moteur(); await m.demarrer({ contexte: ctx }); m.noeud.disconnect(); m.noeud.connect(maitre); await m.charger(res.module, { attendre: true });
  if (notes) for (let i = 0; i < p.instances; i++) m.noteOn(i + 1, 110 * Math.pow(2, i / 12) % 1800 + 55, 0.8);
  return { arreter() { try { m.toutCouper(); m.arreter(); } catch (_) {} } };
};
const POLY = n => `instrument P {\n entree notes : Evenement<Note>\n polyphonie ${n} voix\n voix (n : Note) { sortie = (dent(n.hauteur) -> passe_bas(coupure: 2 kHz, q: 3)) * ${ENV} * 0.03 }\n sortie = voix.somme -> passe_bas(coupure: 6 kHz)\n}`;
const CORDE = n => `instrument C {\n entree notes : Evenement<Note>\n polyphonie ${n} voix\n voix (n : Note) { sortie = corde_pincee(n.hauteur) * ${ENV} * 0.05 }\n sortie = voix.somme\n}`;
const REVERB = n => `instrument R {\n sortie = (bruit_rose() * 0.05) -> reverberation(duree: 2 s, amortissement: 50%, melange: 40%)\n}`;

// ---- la musique de la galaxie (programmes Faust déjà publiés dans faust/stellaire/)
const galaxie = leger => async (ctx, maitre, p) => {
  const fw = await import(new URL("../faust/faustwasm.js", import.meta.url)), dos = new URL("../faust/stellaire/" + (leger ? "leger/" : ""), import.meta.url).href;
  const json = await (await fetch(dos + "dsp-meta.json")).text(), module = await WebAssembly.compile(await (await fetch(dos + "dsp-module.wasm")).arrayBuffer()), gen = new fw.FaustMonoDspGenerator(), fac = { module, json, soundfiles: {} };
  let node; try { node = await gen.createNode(ctx, "stellaire", fac); } catch (_) {} if (!node) node = await gen.createNode(ctx, "stellaire", fac, true, 1024);
  const ch = {}; node.getParams().forEach(x => { ch[x.split("/").pop()] = x; }); node.setParamValue(ch.marche, 1); node.setParamValue(ch.eclat, 0.7); node.setParamValue(ch.air, 0.65);
  node.connect(maitre); return { arreter() { try { node.disconnect(); node.destroy && node.destroy(); } catch (_) {} } };
};

const NM = (id, nom, famille, raison) => ({ id, nom, famille, mode: "non-mesure", raison });
export const SCENARIOS = [
  { id: "s01", nom: "Oscillateur sinusoïdal (nœuds natifs)", famille: "B", mode: "natif", defaut: { instances: 1 }, construire: natifSinus(1) },
  { id: "s01w", nom: "Oscillateur sinusoïdal (AudioWorklet)", famille: "B", mode: "worklet", defaut: { instances: 1 }, construire: noyau("sinus") },
  { id: "s02", nom: "Quatre oscillateurs par voix (nœuds natifs)", famille: "B", mode: "natif", defaut: { instances: 2 }, construire: natifSinus(4, "square") },
  { id: "s02w", nom: "Quatre oscillateurs par voix (AudioWorklet)", famille: "B", mode: "worklet", defaut: { instances: 2 }, construire: noyau("osc4") },
  { id: "s03", nom: "Oscillateurs et filtres (nœuds natifs)", famille: "B", mode: "natif", defaut: { instances: 8 }, construire: natifFiltre },
  { id: "s03w", nom: "Oscillateurs et filtres (AudioWorklet)", famille: "B", mode: "worklet", defaut: { instances: 8 }, construire: noyau("filtre") },
  { id: "s04", nom: "Synthèse FM, deux opérateurs", famille: "D", mode: "worklet", defaut: { instances: 8 }, construire: noyau("fm") },
  { id: "s05", nom: "Synthèse additive, seize partiels par voix", famille: "C", mode: "worklet", defaut: { instances: 4 }, construire: noyau("additive") },
  { id: "s06", nom: "Wavetable avec interpolation linéaire", famille: "E", mode: "worklet", defaut: { instances: 8 }, construire: noyau("wavetable") },
  { id: "s07", nom: "Synthèse granulaire, huit grains par instance", famille: "F", mode: "worklet", defaut: { instances: 2 }, construire: noyau("granular") },
  NM("s08", "Lecture SoundFont", "I", "aucun lecteur de SoundFont n'est intégré à SONORA ; candidats à instruire en phase R3 : SpessaSynth (JavaScript), js-synthesizer (FluidSynth en WebAssembly)"),
  NM("s09", "Lecture SFZ", "I", "aucun lecteur SFZ n'est intégré à SONORA ; sfizz n'a pas de port navigateur relevé"),
  { id: "s10", nom: "Effets en série (filtre, saturation, écho, compresseur)", famille: "J", mode: "natif", defaut: { instances: 8 }, construire: natifEffets },
  { id: "s11", nom: "Convolution (réponse de 2 s par convolueur)", famille: "J", mode: "natif", defaut: { instances: 1 }, construire: natifConvolution },
  { id: "s12", nom: "Réverbération algorithmique (module SONORA)", famille: "J", mode: "sonora", defaut: { instances: 1 }, construire: sonora(REVERB, false) },
  { id: "s13", nom: "Synthèse physique : corde pincée (noyau Karplus-Strong en worklet)", famille: "H", mode: "worklet", defaut: { instances: 8 }, construire: noyau("pluck") },
  { id: "s14", nom: "Traitement spectral (STFT 1024, recouvrement 4, noyau de référence non optimisé)", famille: "G", mode: "worklet", defaut: { instances: 1 }, construire: noyau("spectral") },
  { id: "s15", nom: "Analyse FFT 8192 lue 60 fois par seconde", famille: "L", mode: "principal", defaut: { instances: 1 }, construire: analyseFft },
  { id: "s16", nom: "Plusieurs instruments simultanés (filtre, FM, corde)", famille: "A", mode: "worklet", defaut: { instances: 6 }, construire: multiInstruments },
  { id: "s17", nom: "Séquenceur multipiste (planification depuis le fil principal)", famille: "N", mode: "principal", defaut: { instances: 8 }, construire: sequenceur },
  { id: "s18", nom: "Automations de paramètres (rampes et courbes)", famille: "N", mode: "natif", defaut: { instances: 8 }, construire: automations },
  { id: "s19", nom: "Graphe modulaire de nœuds natifs modulés", famille: "modulaire", mode: "natif", defaut: { instances: 24 }, construire: grapheModulaire },
  { id: "s20", nom: "Visualisations simultanées (oscilloscope, spectre, spectrogramme)", famille: "vis", mode: "principal", defaut: { instances: 1 }, construire: visualisations },
  { id: "s21", nom: "Noyau SONORA : polyphonie avec filtre par voix", famille: "A", mode: "sonora", defaut: { instances: 16 }, paliers: [1, 2, 4, 8, 16, 32], note: "le langage SONORA limite la polyphonie à 32 voix (E701)", construire: sonora(POLY, true) },
  { id: "s22", nom: "Noyau SONORA : cordes pincées polyphoniques", famille: "H", mode: "sonora", defaut: { instances: 8 }, paliers: [1, 2, 4, 8, 16, 32], note: "le langage SONORA limite la polyphonie à 32 voix (E701)", construire: sonora(CORDE, true) },
  { id: "s23", nom: "Musique de la galaxie, version complète (Faust)", famille: "A", mode: "faust", defaut: { instances: 1 }, paliers: [1], construire: galaxie(false) },
  { id: "s24", nom: "Musique de la galaxie, version légère (Faust)", famille: "A", mode: "faust", defaut: { instances: 1 }, paliers: [1], construire: galaxie(true) },
];
export const PROFILS = { ESSENTIEL: ["s01w", "s03w", "s04", "s07", "s10", "s15", "s21", "s24"], STUDIO: ["s01", "s01w", "s02w", "s03", "s03w", "s04", "s05", "s06", "s07", "s10", "s11", "s12", "s13", "s15", "s16", "s17", "s18", "s20", "s21", "s22", "s24"], EXPERT: SCENARIOS.filter(s => s.mode !== "non-mesure").map(s => s.id) };
