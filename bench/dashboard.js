import { diagnostic, mesurer, rampe, versCsv, telecharger } from "./bench-core.js";
import { SCENARIOS, PROFILS } from "./scenarios.js";
const $ = id => document.getElementById(id), esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const ETAT = { diag: null, resultats: [], rampes: [], annule: false, comparaisons: [] };
const CHAMPS = ["Nom du poste ou de l'élève (facultatif)", "Modèle de l'ordinateur", "Processeur", "Mémoire vive (Go)", "Système et version", "Navigateur et version", "Sortie audio utilisée (haut-parleurs, casque, USB)", "Sur secteur ou sur batterie", "Mode d'alimentation Windows", "Autres programmes ouverts", "Date et lieu de l'essai"];
$("manuel").innerHTML = CHAMPS.map((c, i) => `<div><label for="m${i}">${esc(c)}</label><input id="m${i}" style="width:260px"></div>`).join("");
const manuel = () => Object.fromEntries(CHAMPS.map((c, i) => [c, $("m" + i).value]));
try { const s = JSON.parse(localStorage.getItem("bench:manuel") || "{}"); CHAMPS.forEach((c, i) => { if (s[c]) $("m" + i).value = s[c]; }); } catch (_) {}
$("manuel").addEventListener("input", () => { try { localStorage.setItem("bench:manuel", JSON.stringify(manuel())); } catch (_) {} });
$("sc").innerHTML = SCENARIOS.map(s => `<option value="${s.id}">${s.id} : ${esc(s.nom)}${s.mode === "non-mesure" ? " (non mesuré)" : ""}</option>`).join("");
const choisi = () => SCENARIOS.find(s => s.id === $("sc").value);
$("sc").onchange = () => { $("inst").value = choisi().defaut?.instances ?? 1; };
$("inst").value = choisi().defaut.instances;
const dire = t => { $("etat").textContent = t; };

async function releverDiag() { $("diagEtat").textContent = "en cours…"; ETAT.diag = await diagnostic(); const d = ETAT.diag, L = [];
  const ligne = (k, v, bon) => L.push(`<tr><td>${esc(k)}</td><td class="${bon === undefined ? "" : bon ? "STABLE" : "ECHEC"}">${esc(typeof v === "object" ? JSON.stringify(v) : v)}</td></tr>`);
  ligne("Navigateur", d.navigateur.ua); if (d.navigateur.uaData) ligne("Plateforme (uaData)", `${d.navigateur.uaData.plateforme} ${d.navigateur.uaData.platformVersion || ""} ${d.navigateur.uaData.architecture || ""}`);
  ligne("Cœurs, mémoire annoncée (arrondie, plafonnée à 8 Go)", `${d.materiel.coeurs}, ${d.materiel.memoire_go_arrondie ?? "inconnue"}`); ligne("Écran, ratio, tactile", `${d.materiel.ecran}, ${d.materiel.ratio_pixels}, ${d.materiel.tactile}`); ligne("Graphique", d.graphique.webgl ? d.graphique.rendu : "WebGL absent", !!d.graphique.webgl);
  for (const [k, v] of Object.entries(d.fonctions)) ligne(k, v ? "oui" : "non", k === "sharedArrayBuffer" || k === "isoleEntreOrigines" || k === "webgpu" ? undefined : !!v);
  if (d.audio) { ligne("Fréquence d'échantillonnage", d.audio.frequence_hz + " Hz"); ligne("Latence de base annoncée", d.audio.latence_base_ms + " ms"); ligne("Latence de sortie annoncée (estimation)", d.audio.latence_sortie_ms + " ms"); ligne("Canaux de sortie maximum", d.audio.canaux_max_sortie); ligne("Tailles de bloc acceptées", d.audio.tailles_de_bloc_acceptees); ligne("Périphériques", d.audio.peripheriques); }
  if (d.stockage) ligne("Stockage du navigateur", d.stockage); if (d.reseau) ligne("Réseau annoncé", d.reseau);
  $("diagTab").innerHTML = L.join(""); $("diagEtat").textContent = "terminé"; }
$("diag").onclick = releverDiag;

function afficher() {
  const r = ETAT.resultats; $("res").innerHTML = `<tr><th>Scénario</th><th>Bloc</th><th>Inst.</th><th>Verdict</th><th>Charge p50 / p95 / p99</th><th>Coupures</th><th>Blocs manqués</th><th>Raison</th></tr>` + r.map(x => { const c = x.statistiques?.charge, s = x.statistiques, p = x.parametres, f = v => v == null ? "n/d" : (v * 100).toFixed(0) + " %";
    return `<tr><td>${esc(x.id)} ${esc(x.scenario)}</td><td>${p?.bloc_reel ?? p?.quantum}</td><td>${p?.instances}</td><td class="${x.verdict}">${x.verdict}</td><td>${c ? `${f(c.mediane)} / ${f(c.p95)} / ${f(c.p99)}` : "n/d"}</td><td>${s?.coupures_playbackStats ? s.coupures_playbackStats.evenements : "n/d"}</td><td>${s ? (s.blocs_manques_noyau ?? "n/d") + (s.blocs_manques_sonde != null ? " / sonde " + s.blocs_manques_sonde : "") : "n/d"}</td><td>${esc(x.raison)}${x.erreurs?.length ? " [" + esc(x.erreurs[0].slice(0, 90)) + "]" : ""}</td></tr>`; }).join("");
  const cv = $("graph"), g = cv.getContext("2d"); g.clearRect(0, 0, cv.width, cv.height); const mesures = r.filter(x => x.statistiques?.charge?.p95 != null); g.fillStyle = "#a39f90"; g.font = "12px system-ui"; g.fillText("Charge p95 (part du temps disponible par bloc) ; trait rouge : 100 %", 8, 14);
  const bw = Math.max(14, Math.min(60, (cv.width - 40) / Math.max(1, mesures.length) - 6)); mesures.forEach((x, i) => { const v = x.statistiques.charge.p95, h = Math.min(1.4, v) / 1.4 * 250; g.fillStyle = x.verdict === "STABLE" ? "#b8f54a" : x.verdict === "LIMITE" ? "#e6c34a" : "#e5705f"; g.fillRect(24 + i * (bw + 6), 290 - h, bw, h); g.fillStyle = "#a39f90"; g.save(); g.translate(24 + i * (bw + 6) + bw / 2, 306); g.rotate(-0.6); g.fillText(x.id + "/" + x.parametres.instances, 0, 0); g.restore(); });
  g.strokeStyle = "#e5705f"; g.beginPath(); const y100 = 290 - 250 / 1.4; g.moveTo(20, y100); g.lineTo(cv.width - 10, y100); g.stroke();
  const colonnes = ETAT.comparaisons; const ids = [...new Set([...r, ...colonnes.flatMap(c => c.resultats)].map(x => x.id))]; $("cmp").innerHTML = `<tr><th>Scénario</th><th>Cet appareil</th>${colonnes.map(c => `<th>${esc(c.nom)}</th>`).join("")}</tr>` + ids.map(id => `<tr><td>${id}</td><td class="${(r.find(x => x.id === id) || {}).verdict}">${(r.find(x => x.id === id) || {}).verdict || ""}</td>${colonnes.map(c => { const x = c.resultats.find(y => y.id === id); return `<td class="${x?.verdict}">${x ? x.verdict : ""}</td>`; }).join("")}</tr>`).join("");
}
const lancerUn = async (def, o) => { dire(`${def.id} : ${def.nom}…`); const rec = await mesurer(def, o, p => dire(`${def.id} : ${p.s}/${p.sur} s${p.ps ? ", coupures " + p.ps.underrunEvents : ""}`)); ETAT.resultats.push(rec); afficher(); return rec; };
const optionsUI = () => ({ quantum: +$("blq").value, secondes: +$("sec").value, instances: +$("inst").value, canaux: +$("can").value, volume: +$("vol").value, silence: $("silence").checked });
$("go").onclick = async () => { $("go").disabled = true; $("stop").disabled = false; const r = await lancerUn(choisi(), optionsUI()); dire(`${r.verdict} : ${r.raison}`); $("go").disabled = false; $("stop").disabled = true; };
$("ramp").onclick = async () => { $("ramp").disabled = true; ETAT.annule = false; $("stop").disabled = false; const def = choisi(); const o = optionsUI();
  const res = await rampe(def, { quantum: o.quantum, secondes: Math.min(o.secondes, 8), canaux: o.canaux, volume: o.volume, silence: o.silence, annuler: () => ETAT.annule }, p => dire(`${def.id} : palier ${p.palier}, ${p.s}/${p.sur} s`));
  ETAT.rampes.push({ ...res, paliers: res.paliers.map(p => ({ ...p, enregistrement: undefined })) }); res.paliers.forEach(p => ETAT.resultats.push(p.enregistrement)); afficher(); dire(`${def.id} : polyphonie stable jusqu'à ${res.max_stable ?? "aucune"} instance(s) ; premier palier instable : ${res.premier_instable ?? "non atteint"}`); $("ramp").disabled = false; $("stop").disabled = true; };
$("stop").onclick = () => { ETAT.annule = true; };
$("auto").onclick = async () => { $("auto").disabled = true; ETAT.annule = false; $("stop").disabled = false; const ids = PROFILS[$("prof").value], blocs = $("blqA").value.split(",").map(x => +x.trim()).filter(Boolean);
  for (const q of blocs) for (const id of ids) { for (let k = 0; k < Math.max(1, +$("rep").value); k++) { if (ETAT.annule) break; const def = SCENARIOS.find(s => s.id === id); const r = await lancerUn(def, { quantum: q, secondes: +$("secA").value, canaux: 2, volume: +$("vol").value, silence: $("silence").checked }); r.repetition = k + 1; } }
  dire("Série terminée : " + ETAT.resultats.length + " mesure(s)."); $("auto").disabled = false; $("stop").disabled = true; };
const rapport = () => ({ format: "sonora-bench-1", genere: new Date().toISOString(), appareil: { diagnostic: ETAT.diag, saisie_manuelle: manuel() }, seuils: { charge_stable: 0.7, charge_limite: 1, incident_max: 5 }, resultats: ETAT.resultats, rampes: ETAT.rampes });
$("expJ").onclick = () => telecharger(`sonora-bench-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.json`, JSON.stringify(rapport(), null, 1));
$("expC").onclick = () => telecharger(`sonora-bench-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.csv`, versCsv(ETAT.resultats), "text/csv");
$("vider").onclick = () => { ETAT.resultats = []; ETAT.rampes = []; afficher(); };
$("imp").onchange = async e => { for (const f of e.target.files) { try { const j = JSON.parse(await f.text()); ETAT.comparaisons.push({ nom: (j.appareil?.saisie_manuelle?.["Modèle de l'ordinateur"] || j.appareil?.diagnostic?.navigateur?.ua?.slice(0, 40) || f.name), resultats: j.resultats || [] }); } catch (_) { dire("Fichier illisible : " + f.name); } } afficher(); };
// interface de pilotage pour les essais automatiques et les tests
window.BENCH = { ETAT, SCENARIOS, mesurer, rampe, diagnostic, releverDiag, rapport, lancerUn };
const q = new URLSearchParams(location.search); if (q.get("auto")) { $("prof").value = q.get("auto"); $("secA").value = q.get("seconds") || 8; $("blqA").value = q.get("quantum") || "128"; $("silence").checked = q.get("silence") === "1"; releverDiag().then(() => $("auto").click()); }
afficher();
