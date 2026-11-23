// Banc d'essai SONORA : mesure en TEMPS RÉEL dans le navigateur (jamais par rendu hors ligne), statistiques, diagnostic de l'appareil, export.
// Principes (voir benchmark-methodology.md) :
//  1. Un contexte audio réel joue la charge pendant `secondes`. Un rendu hors ligne rapide ne prouve pas qu'on joue sans coupure.
//  2. Les coupures sont comptées par AudioContext.playbackStats quand le navigateur l'a, et par une sonde indépendante dans le fil audio (blocs manqués) sinon.
//  3. La charge est la durée de calcul moyenne par bloc rapportée au temps disponible par bloc, sur des fenêtres d'une seconde (pas une durée par bloc : performance.now n'existe pas dans un worklet).
//  4. Rien n'est inventé : une mesure impossible est `null` et le verdict le dit.

export const SEUILS = { charge_stable: 0.7, charge_limite: 1.0, incident_max: 5 };   // à valider sur appareil : voir benchmark-methodology.md

export function stats(v) {
  const a = v.filter(Number.isFinite).slice().sort((x, y) => x - y);
  if (!a.length) return { n: 0, min: null, mediane: null, p95: null, p99: null, max: null, moyenne: null };
  const q = p => a[Math.min(a.length - 1, Math.max(0, Math.ceil(p * a.length) - 1))];
  return { n: a.length, min: a[0], mediane: q(0.5), p95: q(0.95), p99: a.length >= 100 ? q(0.99) : null, max: a[a.length - 1], moyenne: a.reduce((s, x) => s + x, 0) / a.length };
}

const attendre = ms => new Promise(r => setTimeout(r, ms));

// ------------------------------------------------------------------ diagnostic non intrusif de l'appareil
export async function diagnostic() {
  const n = navigator, AC = window.AudioContext || window.webkitAudioContext, d = { date: new Date().toISOString(), page: location.href };
  d.navigateur = { ua: n.userAgent, langue: n.language };
  try { if (n.userAgentData) { const h = await n.userAgentData.getHighEntropyValues(["platformVersion", "architecture", "bitness", "model", "fullVersionList"]); d.navigateur.uaData = { marques: n.userAgentData.brands, mobile: n.userAgentData.mobile, plateforme: n.userAgentData.platform, ...h }; } } catch (_) {}
  d.materiel = { coeurs: n.hardwareConcurrency ?? null, memoire_go_arrondie: n.deviceMemory ?? null, ecran: `${screen.width}x${screen.height}`, ratio_pixels: devicePixelRatio, tactile: n.maxTouchPoints || 0, en_ligne: n.onLine };
  try { const c = n.connection; if (c) d.reseau = { type: c.effectiveType, debit_mbps: c.downlink, rtt_ms: c.rtt, economie_donnees: c.saveData }; } catch (_) {}
  try { const cv = document.createElement("canvas"), gl = cv.getContext("webgl"); if (gl) { const e = gl.getExtension("WEBGL_debug_renderer_info"); d.graphique = { webgl: true, version: gl.getParameter(gl.VERSION), rendu: e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : "masqué" }; } else d.graphique = { webgl: false }; } catch (_) { d.graphique = { webgl: "erreur" }; }
  const wasmSimd = (() => { try { return WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11])); } catch (_) { return false; } })();
  d.fonctions = { webAudio: !!AC, audioWorklet: !!(AC && AC.prototype && "audioWorklet" in AC.prototype), offlineAudioContext: !!window.OfflineAudioContext, webAssembly: typeof WebAssembly === "object", wasmSimd,
    sharedArrayBuffer: typeof SharedArrayBuffer === "function", isoleEntreOrigines: !!window.crossOriginIsolated, playbackStats: !!(AC && AC.prototype && "playbackStats" in AC.prototype), renderQuantumSize: !!(window.BaseAudioContext && "renderQuantumSize" in BaseAudioContext.prototype),
    webMidi: typeof n.requestMIDIAccess === "function", getUserMedia: !!(n.mediaDevices && n.mediaDevices.getUserMedia), serviceWorker: "serviceWorker" in n, indexedDB: !!window.indexedDB, webgpu: "gpu" in n, performanceMemory: !!(performance && performance.memory), evaluationDeChaine: (() => { try { return new Function("return 1")() === 1; } catch (_) { return false; } })() };
  try { if (n.storage && n.storage.estimate) { const e = await n.storage.estimate(); d.stockage = { quota_mo: Math.round(e.quota / 1048576), utilise_mo: Math.round(e.usage / 1048576) }; } } catch (_) {}
  if (AC) {
    let ctx; try { ctx = new AC({ latencyHint: "interactive" }); d.audio = { frequence_hz: ctx.sampleRate, latence_base_ms: ctx.baseLatency != null ? +(ctx.baseLatency * 1000).toFixed(2) : null, latence_sortie_ms: ctx.outputLatency != null ? +(ctx.outputLatency * 1000).toFixed(2) : null, canaux_max_sortie: ctx.destination.maxChannelCount, bloc_de_calcul: ctx.renderQuantumSize ?? 128, etat_initial: ctx.state };
      for (const q of [32, 64, 128, 256, 512]) { try { const c = new AC({ renderSizeHint: q }); (d.audio.tailles_de_bloc_acceptees ||= {})[q] = c.renderQuantumSize; await c.close(); } catch (e) { (d.audio.tailles_de_bloc_acceptees ||= {})[q] = "refusée"; } }
      try { const dev = await n.mediaDevices.enumerateDevices(); d.audio.peripheriques = { entrees: dev.filter(x => x.kind === "audioinput").length, sorties: dev.filter(x => x.kind === "audiooutput").length, note: "les noms ne sont visibles qu'après autorisation du micro : non demandée ici" }; } catch (_) {}
      await ctx.close(); } catch (e) { d.audio = { erreur: String(e.message || e) }; }
  }
  d.limites = ["Le modèle du processeur, la carte son et les pilotes ne sont pas accessibles depuis une page web : à relever à la main (voir hardware-inventory.md).", "La latence de sortie annoncée par le navigateur est une estimation, pas une mesure."];
  return d;
}

// ------------------------------------------------------------------ mesure d'un scénario en temps réel
export async function mesurer(def, opts = {}, surProgres = () => {}) {
  const o = { quantum: 128, secondes: 10, instances: def.defaut?.instances ?? 8, canaux: 2, volume: 0.02, silence: false, ...opts };
  const rec = { id: def.id, scenario: def.nom, famille: def.famille, mode: def.mode, date: new Date().toISOString(), parametres: { quantum: o.quantum, secondes: o.secondes, instances: o.instances, canaux: o.canaux, volume: o.volume }, erreurs: [], verdict: "ECHEC", raison: "" };
  if (def.mode === "non-mesure") { rec.verdict = "NON_MESURE"; rec.raison = def.raison; return rec; }
  const AC = window.AudioContext, t0 = performance.now(); let ctx;
  try { ctx = new AC({ latencyHint: "interactive", ...(o.quantum !== 128 ? { renderSizeHint: o.quantum } : {}) }); } catch (e) { rec.erreurs.push("contexte : " + (e.message || e)); rec.raison = "taille de bloc " + o.quantum + " refusée ou contexte impossible"; return rec; }
  const etats = []; ctx.onstatechange = () => etats.push({ etat: ctx.state, t: +(performance.now() - t0).toFixed(0) });
  try { if (ctx.state !== "running") await ctx.resume(); } catch (_) {}
  rec.parametres.bloc_reel = ctx.renderQuantumSize ?? 128; rec.parametres.frequence_hz = ctx.sampleRate;
  const budgetMs = rec.parametres.bloc_reel / ctx.sampleRate * 1000; rec.budget_par_bloc_ms = +budgetMs.toFixed(4);
  const maitre = ctx.createGain(); maitre.gain.value = o.silence ? 0 : o.volume; maitre.connect(ctx.destination);
  const fenetres = [], collecte = { fenetre: m => fenetres.push({ ...m, t: performance.now() - t0 }), erreurs: rec.erreurs };
  let sonde = null, instance = null, ttPremier = null;
  try {
    await ctx.audioWorklet.addModule(new URL("worklets/kernels.js", import.meta.url));
    sonde = new AudioWorkletNode(ctx, "bench-noyau", { numberOfInputs: 0, outputChannelCount: [1], processorOptions: { kind: "sonde", n: 1, volume: 0, quantum: rec.parametres.bloc_reel } }); const sondeF = []; sonde.port.onmessage = e => { if (e.data.type === "fenetre") sondeF.push(e.data); }; const muet = ctx.createGain(); muet.gain.value = 0; sonde.connect(muet).connect(ctx.destination);
    instance = await def.construire(ctx, maitre, { ...o, bloc: rec.parametres.bloc_reel }, collecte);
    rec.chargement_ms = +(performance.now() - t0).toFixed(0);
    const echant = [], rafs = []; let derniereRaf = performance.now(), arret = false; const boucleRaf = () => { const t = performance.now(); rafs.push(t - derniereRaf); derniereRaf = t; if (!arret) requestAnimationFrame(boucleRaf); }; if (document.visibilityState === "visible") requestAnimationFrame(boucleRaf);
    const memoire0 = performance.memory ? performance.memory.usedJSHeapSize : null; const tDebut = performance.now(), tAudio0 = ctx.currentTime;
    for (let s = 1; s <= o.secondes; s++) {
      await attendre(1000);
      const ps = ctx.playbackStats ? (ctx.playbackStats.toJSON ? ctx.playbackStats.toJSON() : { underrunEvents: ctx.playbackStats.underrunEvents, underrunDuration: ctx.playbackStats.underrunDuration }) : null;
      echant.push({ s, audio_s: +(ctx.currentTime - tAudio0).toFixed(3), mur_s: +((performance.now() - tDebut) / 1000).toFixed(3), etat: ctx.state, stats: ps }); surProgres({ s, sur: o.secondes, ps, derniere: fenetres[fenetres.length - 1] });
    }
    arret = true; const memoire1 = performance.memory ? performance.memory.usedJSHeapSize : null;
    const fin = echant[echant.length - 1], ps = fin.stats, base = echant[0].stats;   // la première seconde est le démarrage du contexte : ses coupures sont comptées à part
    const charges = fenetres.filter(f => f.appels > 0 && f.occupe_ms !== undefined && f.source === "noyau").slice(1).map(f => f.occupe_ms / f.appels / budgetMs);
    const apresDemarrage = serie => serie.length > 1 ? Math.max(0, (serie[serie.length - 1].blocsManques || 0) - (serie[0].blocsManques || 0)) : 0;
    const noyauF = fenetres.filter(f => f.source === "noyau");
    const manquesNoyau = apresDemarrage(noyauF), manquesSonde = sondeF.length ? apresDemarrage(sondeF) : null, manquesDemarrage = noyauF.length ? noyauF[0].blocsManques || 0 : null;
    const coupuresRegime = ps && base ? ps.underrunEvents - base.underrunEvents : null, coupuresDemarrage = base ? base.underrunEvents : null;
    const derive = fin.audio_s / fin.mur_s;
    rec.mesures_brutes = { echantillons_par_seconde: echant, fenetres_noyau: fenetres.slice(0, 600), fenetres_sonde: sondeF.slice(0, 600), intervalles_raf_ms: rafs.slice(0, 2000).map(x => +x.toFixed(1)), changements_etat: etats };
    rec.statistiques = { charge: charges.length ? stats(charges) : null, charge_note: charges.length ? "fenêtres d'une seconde ; p95 et p99 sont sur ces fenêtres, pas sur les blocs" : "charge non mesurable pour ce scénario (nœuds natifs : durée de calcul inaccessible)",
      coupures_playbackStats: ps ? { evenements: coupuresRegime, evenements_au_demarrage: coupuresDemarrage, evenements_total: ps.underrunEvents, duree_totale_s: ps.underrunDuration, latence_moyenne_ms: ps.averageLatency != null ? +(ps.averageLatency * 1000).toFixed(2) : null, latence_max_ms: ps.maximumLatency != null ? +(ps.maximumLatency * 1000).toFixed(2) : null } : null,
      blocs_manques_noyau: manquesNoyau, blocs_manques_sonde: manquesSonde, blocs_manques_au_demarrage: manquesDemarrage, derive_horloge_audio_sur_murale: +derive.toFixed(4), gigue_image_ms: rafs.length > 5 ? stats(rafs.slice(1)) : null,
      memoire_tas_delta_mo: memoire0 != null && memoire1 != null ? +((memoire1 - memoire0) / 1048576).toFixed(2) : null, changements_etat: etats.length };
    const coupures = (coupuresRegime || 0) + manquesNoyau + (manquesSonde || 0), chargeP95 = charges.length ? rec.statistiques.charge.p95 : null;
    const suspendu = etats.some(e => e.etat !== "running") && ctx.state !== "running";
    if (suspendu) { rec.verdict = "ECHEC"; rec.raison = "le contexte audio n'est pas resté en marche (état : " + ctx.state + ")"; }
    else if (coupures > 0 && ((chargeP95 != null && chargeP95 < 0.5) || (chargeP95 == null && coupures <= SEUILS.incident_max))) { rec.verdict = "INCIDENT"; rec.raison = `${coupures} coupure(s) sans charge élevée : un accident du système est probable, répéter l'essai (voir la méthode)`; }
    else if (coupures > 0) { rec.verdict = "INSTABLE"; rec.raison = `${coupures} coupure(s) ou bloc(s) manqué(s) après la première seconde`; }
    else if (chargeP95 != null && chargeP95 >= SEUILS.charge_limite) { rec.verdict = "INSTABLE"; rec.raison = `charge p95 ${(chargeP95 * 100).toFixed(0)} % du temps disponible`; }
    else if (chargeP95 != null && chargeP95 >= SEUILS.charge_stable) { rec.verdict = "LIMITE"; rec.raison = `aucune coupure, mais charge p95 ${(chargeP95 * 100).toFixed(0)} % (seuil ${SEUILS.charge_stable * 100} %)`; }
    else if (!ps && manquesSonde == null) { rec.verdict = "NON_CONCLUANT"; rec.raison = "aucun compteur de coupure disponible"; }
    else { rec.verdict = "STABLE"; rec.raison = ps ? "aucune coupure comptée par le navigateur après la première seconde" : "aucun bloc manqué (compteur du navigateur absent : preuve plus faible)"; if (chargeP95 != null) rec.raison += `, charge p95 ${(chargeP95 * 100).toFixed(0)} %`; }
    if (!document.hasFocus() || document.visibilityState !== "visible") rec.erreurs.push("page non visible ou sans focus pendant la mesure : résultat possiblement dégradé par le navigateur");
  } catch (e) { rec.erreurs.push(String(e && e.stack || e).slice(0, 400)); rec.raison = rec.raison || "exception : " + (e.message || e); }
  finally { try { instance && instance.arreter && await instance.arreter(); } catch (_) {} try { sonde && sonde.port.postMessage("stop"); await ctx.close(); } catch (_) {} }
  return rec;
}

// Cherche la polyphonie maximale stable : paliers d'instances, chacun avec un contexte neuf, jusqu'au premier palier qui n'est pas STABLE.
export async function rampe(def, opts = {}, surProgres = () => {}) {
  const paliers = opts.paliers || def.paliers || [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768], res = { id: def.id, scenario: def.nom, paliers: [], max_stable: null, premier_instable: null, parametres: { quantum: opts.quantum || 128, secondes_par_palier: opts.secondes || 6 } };
  for (const n of paliers) { let r = await mesurer(def, { ...opts, instances: n, secondes: opts.secondes || 6 }, p => surProgres({ ...p, palier: n })); if (r.verdict === "INCIDENT") { r = await mesurer(def, { ...opts, instances: n, secondes: opts.secondes || 6 }, p => surProgres({ ...p, palier: n })); } res.paliers.push({ instances: n, verdict: r.verdict, raison: r.raison, charge_p95: r.statistiques?.charge?.p95 ?? null, coupures: r.statistiques?.coupures_playbackStats?.evenements ?? null, enregistrement: r });
    if (r.verdict === "STABLE" || r.verdict === "LIMITE" || r.verdict === "NON_CONCLUANT" || r.verdict === "INCIDENT") res.max_stable = n; else { res.premier_instable = n; break; } if (opts.annuler && opts.annuler()) break; }
  return res;
}

// ------------------------------------------------------------------ export
export function versCsv(enregs) {
  const cols = ["id", "scenario", "famille", "mode", "date", "quantum", "bloc_reel", "instances", "canaux", "secondes", "verdict", "raison", "charge_mediane", "charge_p95", "charge_p99", "coupures", "blocs_manques", "derive_horloge", "gigue_image_p95_ms", "tas_delta_mo", "chargement_ms", "latence_moyenne_ms"];
  const L = [cols.join(",")], f = x => x == null ? "" : typeof x === "number" ? (Math.round(x * 10000) / 10000) : '"' + String(x).replace(/"/g, '""') + '"';
  for (const r of enregs) { const s = r.statistiques || {}, c = s.charge || {}, p = r.parametres || {};
    L.push([r.id, r.scenario, r.famille, r.mode, r.date, p.quantum, p.bloc_reel, p.instances, p.canaux, p.secondes, r.verdict, r.raison, c.mediane, c.p95, c.p99, s.coupures_playbackStats ? s.coupures_playbackStats.evenements : "", s.blocs_manques_noyau, s.derive_horloge_audio_sur_murale, s.gigue_image_ms ? s.gigue_image_ms.p95 : "", s.memoire_tas_delta_mo, r.chargement_ms, s.coupures_playbackStats ? s.coupures_playbackStats.latence_moyenne_ms : ""].map(f).join(",")); }
  return L.join("\n");
}
export function telecharger(nom, texte, type = "application/json") { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([texte], { type })); a.download = nom; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }
