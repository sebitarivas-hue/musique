// SONORA Découvertes : cinq expériences sur le son pour la sixième et la cinquième. Pas de code, pas de calcul : un bouton « Écouter », un ou deux curseurs, un dessin du son qui bouge,
// trois phrases et une petite question. Le son est fabriqué par le navigateur (Web Audio) ; le volume est limité pour les oreilles. Écrit sans syntaxe récente (voir tests/compat_navigateurs).
(function () {
  "use strict";
  var COULEURS = ["#FF6B57", "#FFC53D", "#3FC79A", "#4C9BF5", "#A86CF0"];
  var ctx = null, sortie = null, actif = null;   // actif : { arreter() } de l'expérience qui joue
  function contexte() { if (!ctx) { var AC = window.AudioContext || window.webkitAudioContext; ctx = new AC(); sortie = ctx.createGain(); sortie.gain.value = 0.22; sortie.connect(ctx.destination); } if (ctx.state === "suspended") ctx.resume(); return ctx; }
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  var NOTES = ["do", "do♯", "ré", "ré♯", "mi", "fa", "fa♯", "sol", "sol♯", "la", "la♯", "si"];
  function nomNote(f) { var m = Math.round(69 + 12 * Math.log(f / 440) / Math.LN2); return NOTES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1); }

  // ---- un petit tracé : onde(t) dessinée sur un canevas, t de 0 à 1
  function tracer(cv, fonction, couleur) {
    var w = cv.clientWidth || 600, h = 150, r = window.devicePixelRatio || 1; cv.width = w * r; cv.height = h * r; var g = cv.getContext("2d"); g.scale(r, r);
    g.fillStyle = "#14130f"; g.fillRect(0, 0, w, h); g.strokeStyle = "rgba(255,255,255,.14)"; g.lineWidth = 1; g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke();
    g.strokeStyle = couleur; g.lineWidth = 3; g.lineJoin = "round"; g.beginPath();
    for (var i = 0; i <= w; i += 2) { var y = h / 2 - fonction(i / w) * (h / 2 - 12); if (i === 0) g.moveTo(i, y); else g.lineTo(i, y); }
    g.stroke();
  }

  // ---- les cinq expériences
  var EXPS = [
    { id: "hauteur", titre: "Aigu ou grave ?", resume: "Un son peut être aigu comme un oiseau ou grave comme un camion.",
      curseurs: [{ id: "f", nom: "Du grave à l'aigu", min: 0, max: 100, val: 50, texte: function (v) { var f = freq(v); return Math.round(f) + " Hz, " + nomNote(f); } }],
      phrases: ["Un son aigu vibre vite, un son grave vibre lentement.", "On compte les vibrations en une seconde : ce sont les hertz (Hz).", "Regarde : plus le son est aigu, plus il y a de vagues dans le dessin."],
      quiz: { q: "Je monte le curseur. Que se passe-t-il ?", choix: ["Le son devient plus grave", "Le son devient plus aigu", "Rien ne change"], bon: 1, pourquoi: "Plus de vibrations par seconde : le son est plus aigu." },
      demarrer: function (e) { var o = contexte().createOscillator(), g = ctx.createGain(); o.type = "sine"; o.frequency.value = freq(e.v.f); g.gain.value = 0; o.connect(g); g.connect(sortie); o.start(); g.gain.setTargetAtTime(1, ctx.currentTime, 0.02); return { maj: function () { o.frequency.setTargetAtTime(freq(e.v.f), ctx.currentTime, 0.03); }, arreter: function () { g.gain.setTargetAtTime(0, ctx.currentTime, 0.03); setTimeout(function () { try { o.stop(); } catch (x) {} }, 150); } }; },
      dessiner: function (e, cv) { var n = 2 + 10 * Math.pow(e.v.f / 100, 1.2); tracer(cv, function (t) { return Math.sin(t * n * Math.PI * 2); }, COULEURS[0]); } },
    { id: "volume", titre: "Fort ou doux ?", resume: "Le même son, plus fort ou plus doux.",
      curseurs: [{ id: "v", nom: "Du doux au fort", min: 0, max: 100, val: 40, texte: function (v) { return v + " %"; } }],
      phrases: ["Un son fort a une grande onde, un son doux a une petite onde.", "La hauteur ne change pas : seule la taille de l'onde change.", "Attention : les sons très forts abîment les oreilles. Ici, le volume est limité."],
      quiz: { q: "Le son devient plus fort. Que devient l'onde ?", choix: ["Elle est plus haute", "Elle est plus petite", "Elle est plus serrée"], bon: 0, pourquoi: "Plus l'onde est grande, plus le son est fort." },
      demarrer: function (e) { var o = contexte().createOscillator(), g = ctx.createGain(); o.type = "sine"; o.frequency.value = 330; g.gain.value = 0; o.connect(g); g.connect(sortie); o.start(); g.gain.setTargetAtTime(e.v.v / 100, ctx.currentTime, 0.02); return { maj: function () { g.gain.setTargetAtTime(e.v.v / 100, ctx.currentTime, 0.03); }, arreter: function () { g.gain.setTargetAtTime(0, ctx.currentTime, 0.03); setTimeout(function () { try { o.stop(); } catch (x) {} }, 150); } }; },
      dessiner: function (e, cv) { tracer(cv, function (t) { return (e.v.v / 100) * Math.sin(t * 6 * Math.PI * 2); }, COULEURS[1]); } },
    { id: "timbre", titre: "Quel instrument ?", resume: "Même note, mais pas la même couleur de son.",
      choixForme: [["sine", "Pur", "Comme un diapason"], ["triangle", "Doux", "Comme une flûte"], ["square", "Creux", "Comme une clarinette"], ["sawtooth", "Brillant", "Comme un violon"]],
      phrases: ["Ces quatre sons jouent la même note, mais ils ne se ressemblent pas.", "La forme de l'onde change : c'est ce qu'on appelle le timbre.", "C'est grâce au timbre qu'on reconnaît une flûte d'une guitare."],
      quiz: { q: "Deux instruments jouent la même note. Qu'est-ce qui les distingue ?", choix: ["Leur timbre", "Leur hauteur", "Rien"], bon: 0, pourquoi: "Le timbre : la forme de l'onde, la « couleur » du son." },
      demarrer: function (e) { var o = contexte().createOscillator(), g = ctx.createGain(); o.type = e.forme; o.frequency.value = 220; g.gain.value = 0; o.connect(g); g.connect(sortie); o.start(); g.gain.setTargetAtTime(0.7, ctx.currentTime, 0.02); return { maj: function () { o.type = e.forme; }, arreter: function () { g.gain.setTargetAtTime(0, ctx.currentTime, 0.03); setTimeout(function () { try { o.stop(); } catch (x) {} }, 150); } }; },
      dessiner: function (e, cv) { var f = e.forme; tracer(cv, function (t) { var p = (t * 3) % 1; return f === "sine" ? Math.sin(p * Math.PI * 2) : f === "triangle" ? (p < 0.5 ? 4 * p - 1 : 3 - 4 * p) : f === "square" ? (p < 0.5 ? 0.8 : -0.8) : 2 * p - 1; }, COULEURS[2]); } },
    { id: "battements", titre: "Deux sons presque pareils", resume: "Quand deux notes sont un tout petit peu différentes, le son se met à battre.",
      curseurs: [{ id: "d", nom: "L'écart entre les deux sons", min: 0, max: 100, val: 30, texte: function (v) { var d = Math.round(ecart(v) * 10) / 10, t = d % 1 ? String(d).replace(".", ",") : String(d); return t + (d > 1 ? " battements" : " battement") + " par seconde"; } }],
      phrases: ["Deux sons à peine différents s'additionnent : le volume monte et descend, comme un battement de cœur.", "Plus l'écart est grand, plus ça bat vite. Écart zéro : plus de battements.", "Les musiciens s'en servent pour accorder leurs instruments : ils règlent jusqu'à ce que ça ne batte plus."],
      quiz: { q: "Je mets l'écart à zéro. Que se passe-t-il ?", choix: ["Ça bat plus vite", "Les battements s'arrêtent", "Le son devient aigu"], bon: 1, pourquoi: "Les deux sons sont accordés : plus de battements." },
      demarrer: function (e) { var a = contexte().createOscillator(), b = ctx.createOscillator(), g = ctx.createGain(); a.frequency.value = 220; b.frequency.value = 220 + ecart(e.v.d); g.gain.value = 0; a.connect(g); b.connect(g); g.connect(sortie); a.start(); b.start(); g.gain.setTargetAtTime(0.5, ctx.currentTime, 0.02); return { maj: function () { b.frequency.setTargetAtTime(220 + ecart(e.v.d), ctx.currentTime, 0.03); }, arreter: function () { g.gain.setTargetAtTime(0, ctx.currentTime, 0.03); setTimeout(function () { try { a.stop(); b.stop(); } catch (x) {} }, 150); } }; },
      dessiner: function (e, cv) { var d = ecart(e.v.d) / 2; tracer(cv, function (t) { return Math.sin(t * 40 * Math.PI * 2 * 0.5) * Math.cos(t * d * 1.6 * Math.PI * 2 * 0.5); }, COULEURS[3]); } },
    { id: "echo", titre: "L'écho", resume: "Le son part, touche un mur, et revient.",
      curseurs: [{ id: "m", nom: "La distance du mur", min: 5, max: 100, val: 35, texte: function (v) { var d = v * 3.4; return Math.round(d) + " mètres : l'écho revient après " + (2 * d / 343).toFixed(2).replace(".", ",") + " s"; } }],
      bouton: "Taper dans les mains",
      phrases: ["Le son voyage dans l'air et rebondit sur un mur : il revient, plus faible.", "Plus le mur est loin, plus l'écho arrive tard.", "Dans l'air, le son avance d'environ 343 mètres par seconde."],
      quiz: { q: "Le mur est très loin. L'écho revient…", choix: ["Plus tôt", "Plus tard", "En même temps"], bon: 1, pourquoi: "Le son a plus de chemin à faire : l'écho arrive plus tard." },
      demarrer: function (e) { return { coup: function () { claquement(e.v.m * 3.4 * 2 / 343); }, maj: function () {}, arreter: function () {} }; },
      dessiner: function (e, cv) { var w = cv.clientWidth || 600, h = 150, r = window.devicePixelRatio || 1; cv.width = w * r; cv.height = h * r; var g = cv.getContext("2d"); g.scale(r, r); g.fillStyle = "#14130f"; g.fillRect(0, 0, w, h);
        var t = 2 * e.v.m * 3.4 / 343, x1 = 30 + (t / 1.1) * (w - 120); g.fillStyle = COULEURS[4]; g.fillRect(30, 40, 14, 70); g.globalAlpha = 0.5; g.fillRect(Math.min(w - 40, x1), 50, 14, 50); g.globalAlpha = 1; g.fillStyle = "#fff"; g.font = "600 13px sans-serif"; g.fillText("toi", 28, 30); g.fillText("l'écho", Math.min(w - 70, x1 - 4), 38); g.strokeStyle = "rgba(255,255,255,.3)"; g.setLineDash([6, 6]); g.beginPath(); g.moveTo(44, 75); g.lineTo(Math.min(w - 40, x1), 75); g.stroke(); g.setLineDash([]); } },
  ];
  function freq(v) { return 110 * Math.pow(8, v / 100); }          // de 110 Hz à 880 Hz : trois octaves
  function ecart(v) { return v * 0.12; }                             // de 0 à 12 battements par seconde
  function claquement(retard) {   // un claquement (du bruit très court), puis son écho plus faible
    var c = contexte(), n = Math.floor(c.sampleRate * 0.06), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0), s = 12345; for (var i = 0; i < n; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; d[i] = ((s / 0x3fffffff) - 1) * Math.exp(-i / (n / 6)); }
    [[0, 1], [retard, 0.45], [2 * retard, 0.2]].forEach(function (p) { var src = c.createBufferSource(), g = c.createGain(); src.buffer = b; g.gain.value = p[1]; src.connect(g); g.connect(sortie); src.start(c.currentTime + 0.02 + p[0]); });
  }

  // ---- l'écran d'une expérience
  var courante = null, etat = null;
  function arreter() { if (actif) { try { actif.arreter(); } catch (x) {} actif = null; } var b = $("ecouter"); if (b) { b.setAttribute("aria-pressed", "false"); b.textContent = etat && etat.def.bouton ? etat.def.bouton : "Écouter"; } $("etat").textContent = "prêt"; $("etat").className = "etat"; }
  function ouvrir(i) {
    arreter(); var def = EXPS[i]; etat = { def: def, v: {}, forme: "sine", i: i }; (def.curseurs || []).forEach(function (c) { etat.v[c.id] = c.val; });
    var h = '<h2 style="--c:' + COULEURS[i] + '">' + esc(def.titre) + '</h2><p class="resume">' + esc(def.resume) + '</p>';
    h += '<canvas id="dessin" class="dessin" role="img" aria-label="Le dessin du son"></canvas>';
    if (def.choixForme) h += '<div class="formes" role="group" aria-label="Choisis un son">' + def.choixForme.map(function (f, k) { return '<button type="button" class="forme" data-f="' + f[0] + '" aria-pressed="' + (k === 0) + '" style="--c:' + COULEURS[2] + '"><b>' + esc(f[1]) + '</b><span>' + esc(f[2]) + '</span></button>'; }).join("") + '</div>';
    (def.curseurs || []).forEach(function (c) { h += '<label class="curseur"><span>' + esc(c.nom) + '</span><input type="range" id="c-' + c.id + '" min="' + c.min + '" max="' + c.max + '" value="' + c.val + '"><output id="o-' + c.id + '"></output></label>'; });
    h += '<button type="button" id="ecouter" class="grand" aria-pressed="false" style="--c:' + COULEURS[i] + '">' + esc(def.bouton || "Écouter") + '</button>';
    h += '<ul class="phrases">' + def.phrases.map(function (p) { return "<li>" + esc(p) + "</li>"; }).join("") + "</ul>";
    h += '<div class="quiz"><p class="q">' + esc(def.quiz.q) + '</p><div class="rep">' + def.quiz.choix.map(function (c, k) { return '<button type="button" data-k="' + k + '">' + esc(c) + "</button>"; }).join("") + '</div><p class="retour-q" id="retour-q" role="status"></p></div>';
    h += '<p class="suite"><button type="button" id="suivante">Expérience suivante &rsaquo;</button></p>';
    var z = $("exp"); z.innerHTML = h; z.hidden = false; courante = i;
    Array.prototype.forEach.call(document.querySelectorAll("#choix button"), function (b, k) { b.setAttribute("aria-pressed", String(k === i)); });
    maj(); z.scrollIntoView({ block: "start", behavior: "smooth" });
    (def.curseurs || []).forEach(function (c) { $("c-" + c.id).oninput = function (e) { etat.v[c.id] = +e.target.value; maj(); if (actif && actif.maj) actif.maj(); }; });
    Array.prototype.forEach.call(z.querySelectorAll(".forme"), function (b) { b.onclick = function () { etat.forme = b.getAttribute("data-f"); Array.prototype.forEach.call(z.querySelectorAll(".forme"), function (x) { x.setAttribute("aria-pressed", String(x === b)); }); maj(); if (actif && actif.maj) actif.maj(); else basculer(); }; });
    $("ecouter").onclick = function () { if (def.id === "echo") { if (!actif) actif = def.demarrer(etat); actif.coup(); return; } basculer(); };
    Array.prototype.forEach.call(z.querySelectorAll(".rep button"), function (b) { b.onclick = function () { var ok = +b.getAttribute("data-k") === def.quiz.bon; Array.prototype.forEach.call(z.querySelectorAll(".rep button"), function (x) { x.className = ""; }); b.className = ok ? "juste" : "faux"; $("retour-q").textContent = ok ? "Bravo ! " + def.quiz.pourquoi : "Pas tout à fait. Essaie encore : écoute l'expérience, puis regarde le dessin."; }; });
    $("suivante").onclick = function () { ouvrir((i + 1) % EXPS.length); };
  }
  function basculer() { if (actif) { arreter(); return; } actif = etat.def.demarrer(etat); var b = $("ecouter"); b.setAttribute("aria-pressed", "true"); b.textContent = "Arrêter"; $("etat").textContent = "son"; $("etat").className = "etat marche"; }
  function maj() { var def = etat.def; (def.curseurs || []).forEach(function (c) { $("o-" + c.id).textContent = c.texte(etat.v[c.id]); }); def.dessiner(etat, $("dessin")); }

  function initialiser() {
    $("choix").innerHTML = EXPS.map(function (e, i) { return '<button type="button" style="--c:' + COULEURS[i] + '" aria-pressed="false"><i>' + (i + 1) + "</i><b>" + esc(e.titre) + "</b><span>" + esc(e.resume) + "</span></button>"; }).join("");
    Array.prototype.forEach.call(document.querySelectorAll("#choix button"), function (b, i) { b.onclick = function () { ouvrir(i); }; });
    window.addEventListener("resize", function () { if (etat && $("dessin")) etat.def.dessiner(etat, $("dessin")); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") arreter(); });
    window.DECOUVERTE_PRET = true;
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialiser); else initialiser();
  window.DECOUVERTE = { exps: EXPS, freq: freq, ecart: ecart, nomNote: nomNote };
})();
