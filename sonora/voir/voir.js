// SONORA Voir la musique : un morceau, six vues synchronisées (piano roll, orbite, réseau, spectre, scope, niveau).
import { MORCEAUX, nomNote, classe, NOMS_CLASSES } from "./morceaux.js?v=133e7b3e5d";

const $ = s => document.querySelector(s);
const AC = window.AudioContext || window.webkitAudioContext;
const etat = { i: 0, joue: false, tempo: 1, muet: {}, ctx: null, maitre: null, ana: null, debut: 0, prochain: 0, boucle: 0, niveaux: [], dernier: 0, flash: {} };
const NOIR = "#11140f", ACIDE = "#c8ff2e", GRIS = "#2c3326", TEXTE = "#e8ecd8", VOIX = ["#c8ff2e", "#ff7bb0", "#5fd0ff", "#ffc24a"];

function morceau() { return MORCEAUX[etat.i]; }
function dureeTemps() { return 60 / (morceau().bpm * etat.tempo); }
function horloge() { return etat.ctx ? etat.ctx.currentTime : performance.now() / 1000; }
function position() { return etat.joue ? Math.max(0, (horloge() - etat.debut) / dureeTemps()) : etat.pause || 0; }
function evenementsMelo(m) { return m.ev.filter(e => e.k === "note").sort((a, b) => a.t - b.t); }

/* ---------- Le son : synthèse simple, rien à charger ---------- */
function audio() {
  if (etat.ctx || !AC) return;
  etat.ctx = new AC();
  etat.maitre = etat.ctx.createGain(); etat.maitre.gain.value = 0.7;
  etat.ana = etat.ctx.createAnalyser(); etat.ana.fftSize = 2048; etat.ana.smoothingTimeConstant = 0.7;
  etat.maitre.connect(etat.ana); etat.ana.connect(etat.ctx.destination);
  const n = etat.ctx.sampleRate * 0.5, b = etat.ctx.createBuffer(1, n, etat.ctx.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  etat.bruit = b;
}
function frequence(m) { return 440 * Math.pow(2, (m - 69) / 12); }
function jouerNote(e, t, dur) {
  const c = etat.ctx, g = c.createGain(), f = frequence(e.m);
  const tri = c.createOscillator(), sin = c.createOscillator();
  tri.type = "triangle"; sin.type = "sine"; tri.frequency.value = f; sin.frequency.value = f * 2;
  const g2 = c.createGain(); g2.gain.value = 0.25; sin.connect(g2); g2.connect(g); tri.connect(g);
  const pic = 0.28 * e.v, fin = t + Math.max(0.12, dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(pic, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, fin);
  g.connect(etat.maitre); tri.start(t); sin.start(t); tri.stop(fin + 0.05); sin.stop(fin + 0.05);
}
function bruit(t, dur, filtre, freq, vol) {
  const c = etat.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  s.buffer = etat.bruit; f.type = filtre; f.frequency.value = freq;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(etat.maitre); s.start(t); s.stop(t + dur + 0.02);
}
function jouerBatterie(e, t) {
  const c = etat.ctx;
  if (e.k === "kick") {
    const o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.setValueAtTime(0.9 * e.v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g); g.connect(etat.maitre); o.start(t); o.stop(t + 0.32);
  } else if (e.k === "snare") { bruit(t, 0.18, "highpass", 1500, 0.5 * e.v); bruit(t, 0.08, "bandpass", 200, 0.25); }
  else if (e.k === "hat") bruit(t, 0.05, "highpass", 7000, 0.22 * e.v);
}
function jouerEvenement(e, t) {
  if (etat.muet[e.voix]) return;
  const dt = dureeTemps();
  if (e.k === "note") jouerNote(e, t, e.d * dt * 1.2); else jouerBatterie(e, t);
}
function planifier() {
  if (!etat.joue || !etat.ctx) return;
  const m = morceau(), dt = dureeTemps(), horizon = etat.ctx.currentTime + 0.25;
  const liste = m.ev.slice().sort((a, b) => a.t - b.t);
  for (let garde = 0; garde < 4000; garde++) {
    const e = liste[etat.prochain];
    const abs = etat.debut + (etat.boucle * m.boucle + e.t) * dt;
    if (abs > horizon) break;
    if (abs >= etat.ctx.currentTime - 0.05) { jouerEvenement(e, Math.max(abs, etat.ctx.currentTime)); etat.flash[e.m + ":" + e.voix + ":" + etat.boucle] = abs; }
    etat.prochain++;
    if (etat.prochain >= liste.length) { etat.prochain = 0; etat.boucle++; }
  }
}
function lire() {
  audio();
  if (etat.ctx && etat.ctx.state === "suspended") etat.ctx.resume();
  const m = morceau(), dt = dureeTemps();
  etat.joue = true; etat.boucle = 0; etat.prochain = 0; etat.flash = {};
  const ou = (etat.pause || 0);
  etat.debut = horloge() - ou * dt + 0.08;
  // reprise : on saute les événements déjà passés
  const liste = m.ev.slice().sort((a, b) => a.t - b.t);
  while (etat.prochain < liste.length && liste[etat.prochain].t < ou) etat.prochain++;
  if (etat.prochain >= liste.length) { etat.prochain = 0; etat.debut = horloge() + 0.08; }
  $("#lire").textContent = "Pause"; $("#lire").setAttribute("aria-pressed", "true"); $("#etat").textContent = "lecture";
  if (etat.minuteur) clearInterval(etat.minuteur);
  etat.minuteur = setInterval(planifier, 25); planifier();
}
function pause(rembobiner) {
  const p = position(); etat.joue = false; if (etat.minuteur) clearInterval(etat.minuteur);
  etat.pause = rembobiner ? 0 : p % morceau().boucle;
  $("#lire").textContent = "Écouter"; $("#lire").setAttribute("aria-pressed", "false"); $("#etat").textContent = "prêt";
}

/* ---------- Dessin ---------- */
const toile = {};
function prepare(nom) { const c = document.querySelector('[data-p="' + nom + '"] canvas'); toile[nom] = { c, x: c.getContext("2d") }; return toile[nom]; }
function fond(x, w, h) { x.fillStyle = NOIR; x.fillRect(0, 0, w, h); }
function stat(nom, texte) { const e = $("#s-" + nom); if (e && e.textContent !== texte) e.textContent = texte; }
function bornes(m) { const L = evenementsMelo(m).map(e => e.m); return [Math.min.apply(null, L) - 1, Math.max.apply(null, L) + 1]; }
function boucleCourante() { return position() % morceau().boucle; }

function dessinRoll() {
  const { c, x } = toile.roll, w = c.width, h = c.height, m = morceau(), pos = boucleCourante(), [lo, hi] = bornes(m);
  fond(x, w, h);
  const fen = Math.min(m.boucle, m.mesure * 4), debut = Math.max(0, Math.min(m.boucle - fen, pos - fen * 0.25)), px = w / fen, py = (h - 8) / (hi - lo + 1);
  x.strokeStyle = GRIS; x.lineWidth = 1;
  for (let b = Math.ceil(debut); b < debut + fen; b++) { x.globalAlpha = b % m.mesure === 0 ? 1 : 0.35; x.beginPath(); x.moveTo((b - debut) * px, 0); x.lineTo((b - debut) * px, h); x.stroke(); }
  x.globalAlpha = 1;
  let actives = 0;
  evenementsMelo(m).forEach(e => {
    if (e.t + e.d < debut || e.t > debut + fen) return;
    const on = pos >= e.t && pos < e.t + Math.max(e.d, 0.2); if (on) actives++;
    x.fillStyle = VOIX[e.voix % 4]; x.globalAlpha = etat.muet[e.voix] ? 0.15 : on ? 1 : 0.65;
    x.fillRect((e.t - debut) * px, h - 4 - (e.m - lo + 1) * py, Math.max(3, e.d * px - 1), Math.max(3, py - 1));
  });
  x.globalAlpha = 1; x.strokeStyle = TEXTE; x.lineWidth = 2; x.beginPath(); x.moveTo((pos - debut) * px, 0); x.lineTo((pos - debut) * px, h); x.stroke();
  stat("roll", actives + " notes, mesure " + (Math.floor(pos / m.mesure) + 1));
}
function dessinOrbite() {
  const { c, x } = toile.orbite, w = c.width, h = c.height, m = morceau(), pos = boucleCourante(), cx = w / 2, cy = h / 2, R = h * 0.43;
  fond(x, w, h);
  const ang = t => -Math.PI / 2 + (t / m.boucle) * Math.PI * 2;
  x.strokeStyle = GRIS; x.lineWidth = 1;
  for (let r = 1; r <= 4; r++) { x.beginPath(); x.arc(cx, cy, R * r / 4, 0, 7); x.stroke(); }
  for (let b = 0; b < m.boucle; b += m.mesure) { x.globalAlpha = 0.9; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(ang(b)) * R, cy + Math.sin(ang(b)) * R); x.stroke(); }
  x.globalAlpha = 1;
  const [lo, hi] = bornes(m);
  m.ev.forEach(e => {
    let r;
    if (e.k === "note") r = R * (0.25 + 0.7 * (e.m - lo) / Math.max(1, hi - lo)); else r = R * (e.k === "kick" ? 0.3 : e.k === "snare" ? 0.55 : 0.85);
    const a = ang(e.t), d = (pos - e.t + m.boucle) % m.boucle, vif = d < 0.35;
    x.fillStyle = VOIX[e.voix % 4]; x.globalAlpha = etat.muet[e.voix] ? 0.12 : vif ? 1 : 0.55;
    x.beginPath(); x.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, vif ? 7 : 3.5, 0, 7); x.fill();
  });
  x.globalAlpha = 1; x.strokeStyle = TEXTE; x.lineWidth = 2; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(ang(pos)) * R, cy + Math.sin(ang(pos)) * R); x.stroke();
  stat("orbite", "temps " + (Math.floor(pos % m.mesure) + 1) + " sur " + m.mesure);
}
let transitions = null, transitionsDe = -1;
function calculerReseau() {
  const m = morceau(), tous = evenementsMelo(m), premiere = tous.length ? tous[0].voix : 0, voix0 = tous.filter(e => e.voix === premiere), mat = {};
  for (let i = 1; i < voix0.length; i++) { const a = classe(voix0[i - 1].m), b = classe(voix0[i].m), k = a + ">" + b; mat[k] = (mat[k] || 0) + 1; }
  transitions = { voix0, mat }; transitionsDe = etat.i;
}
function dessinReseau() {
  if (transitionsDe !== etat.i) calculerReseau();
  const { c, x } = toile.reseau, w = c.width, h = c.height, cx = w / 2, cy = h / 2, R = h * 0.38, pos = boucleCourante(), { voix0, mat } = transitions;
  fond(x, w, h);
  const pt = k => { const a = -Math.PI / 2 + k * Math.PI / 6; return [cx + Math.cos(a) * R, cy + Math.sin(a) * R]; };
  const utilisees = {}; voix0.forEach(e => { utilisees[classe(e.m)] = (utilisees[classe(e.m)] || 0) + 1; });
  const maxi = Math.max.apply(null, Object.keys(mat).map(k => mat[k]).concat([1]));
  x.lineWidth = 1.5;
  Object.keys(mat).forEach(k => { const [a, b] = k.split(">").map(Number); if (a === b) return; const p = pt(a), q = pt(b); x.strokeStyle = ACIDE; x.globalAlpha = 0.12 + 0.5 * mat[k] / maxi; x.beginPath(); x.moveTo(p[0], p[1]); x.lineTo(q[0], q[1]); x.stroke(); });
  x.globalAlpha = 1;
  let courant = -1; for (let i = 0; i < voix0.length; i++) if (voix0[i].t <= pos) courant = i;
  if (courant > 0) { const p = pt(classe(voix0[courant - 1].m)), q = pt(classe(voix0[courant].m)); x.strokeStyle = TEXTE; x.lineWidth = 3; x.beginPath(); x.moveTo(p[0], p[1]); x.lineTo(q[0], q[1]); x.stroke(); }
  x.font = "bold 13px monospace"; x.textAlign = "center"; x.textBaseline = "middle";
  for (let k = 0; k < 12; k++) {
    const p = pt(k), n = utilisees[k] || 0, actif = courant >= 0 && classe(voix0[courant].m) === k;
    x.fillStyle = actif ? ACIDE : n ? "#3a4630" : "#1b2016"; x.strokeStyle = n ? ACIDE : GRIS; x.lineWidth = 1.5;
    x.beginPath(); x.arc(p[0], p[1], 5 + Math.min(14, n * 0.6) + (actif ? 3 : 0), 0, 7); x.fill(); x.stroke();
    x.fillStyle = actif ? NOIR : TEXTE; if (n) x.fillText(NOMS_CLASSES[k], p[0], p[1] + 0.5);
  }
  stat("reseau", Object.keys(utilisees).length + " notes, " + Object.keys(mat).length + " liens");
}
const tamponF = new Uint8Array(1024), tamponT = new Uint8Array(2048);
function dessinSpectre() {
  const { c, x } = toile.spectre, w = c.width, h = c.height; fond(x, w, h);
  if (!etat.ana) { stat("spectre", "silence"); return; }
  etat.ana.getByteFrequencyData(tamponF);
  const barres = 48; let pic = 0, ipic = 0;
  for (let b = 0; b < barres; b++) {
    const a = Math.floor(Math.pow(b / barres, 2.2) * 400) + 1, z = Math.floor(Math.pow((b + 1) / barres, 2.2) * 400) + 2; let s = 0;
    for (let i = a; i < z; i++) s = Math.max(s, tamponF[i]);
    if (s > pic) { pic = s; ipic = a; }
    const hh = s / 255 * (h - 10); x.fillStyle = ACIDE; x.globalAlpha = 0.35 + 0.65 * s / 255; x.fillRect(b * w / barres + 1, h - hh, w / barres - 2, hh);
  }
  x.globalAlpha = 1; stat("spectre", pic > 20 ? Math.round(ipic * etat.ctx.sampleRate / 2048) + " Hz" : "silence");
}
function dessinScope() {
  const { c, x } = toile.scope, w = c.width, h = c.height; fond(x, w, h);
  x.strokeStyle = GRIS; x.beginPath(); x.moveTo(0, h / 2); x.lineTo(w, h / 2); x.stroke();
  if (!etat.ana) { stat("scope", "0.00"); return; }
  etat.ana.getByteTimeDomainData(tamponT);
  let s = 0, depart = 0; for (let i = 1; i < 1024; i++) if (tamponT[i - 1] < 128 && tamponT[i] >= 128) { depart = i; break; }
  x.strokeStyle = ACIDE; x.lineWidth = 2; x.beginPath();
  for (let i = 0; i < 1024; i++) { const v = (tamponT[depart + i] - 128) / 128; s += v * v; const px = i / 1024 * w, py = h / 2 - v * h * 0.45; if (i) x.lineTo(px, py); else x.moveTo(px, py); }
  x.stroke(); etat.rms = Math.sqrt(s / 1024); stat("scope", "RMS " + etat.rms.toFixed(2));
}
function dessinNiveau() {
  const { c, x } = toile.niveau, w = c.width, h = c.height; fond(x, w, h);
  const maintenant = performance.now();
  if (maintenant - etat.dernier > 50) { etat.dernier = maintenant; etat.niveaux.push(etat.joue ? (etat.rms || 0) : 0); if (etat.niveaux.length > 200) etat.niveaux.shift(); }
  x.fillStyle = ACIDE; const n = etat.niveaux.length, lw = w / 200;
  etat.niveaux.forEach((v, i) => { const hh = Math.min(1, v * 3) * (h - 10); x.globalAlpha = 0.5 + 0.5 * i / n; x.fillRect((200 - n + i) * lw, h - hh, lw - 0.5, hh); });
  x.globalAlpha = 1; const dernier = etat.niveaux[n - 1] || 0; stat("niveau", dernier > 0.0005 ? (20 * Math.log10(dernier)).toFixed(0) + " dB" : "silence");
}
function image() { dessinRoll(); dessinOrbite(); dessinReseau(); dessinSpectre(); dessinScope(); dessinNiveau(); requestAnimationFrame(image); }

/* ---------- Commandes ---------- */
function afficherMorceau() {
  const m = morceau();
  $("#consigne").textContent = m.consigne; $("#note").textContent = m.titre + " (" + m.annee + "). " + m.note;
  document.querySelectorAll("#choix button").forEach((b, i) => b.setAttribute("aria-pressed", i === etat.i ? "true" : "false"));
  $("#voix").innerHTML = m.voix.map((v, i) => '<button type="button" data-v="' + i + '" aria-pressed="' + (etat.muet[i] ? "false" : "true") + '" style="border-color:' + VOIX[i % 4] + '">' + v + "</button>").join("");
  document.querySelectorAll("#voix button").forEach(b => b.addEventListener("click", () => { const v = +b.dataset.v; etat.muet[v] = !etat.muet[v]; b.setAttribute("aria-pressed", etat.muet[v] ? "false" : "true"); }));
}
function choisir(i) { const lecture = etat.joue; if (lecture) pause(true); etat.i = i; etat.pause = 0; etat.muet = {}; afficherMorceau(); if (lecture) lire(); }
function demarrer() {
  $("#choix").innerHTML = MORCEAUX.map((m, i) => '<button type="button" data-i="' + i + '" aria-pressed="false">' + m.court + "</button>").join("");
  document.querySelectorAll("#choix button").forEach(b => b.addEventListener("click", () => choisir(+b.dataset.i)));
  $("#lire").addEventListener("click", () => { if (etat.joue) pause(false); else lire(); });
  $("#tempo").addEventListener("input", e => { const p = position(); etat.tempo = +e.target.value / 100; $("#tempo-v").textContent = e.target.value + " %"; if (etat.joue) { etat.debut = horloge() - p * dureeTemps(); } });
  ["roll", "orbite", "reseau", "spectre", "scope", "niveau"].forEach(prepare);
  afficherMorceau(); requestAnimationFrame(image);
  window.VOIR = { etat: etat, morceaux: MORCEAUX, lire: lire, pause: pause, choisir: choisir, position: position };
  window.VOIR_PRET = true;
}
demarrer();
