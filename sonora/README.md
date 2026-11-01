# SONORA

Environnement de programmation et de recherche sonore du site Cours d'éducation musicale.
État au 31 octobre 2026 : phases 0 et 1 faites, phases 2 (compilateur), 3 (moteur audio) et 4 (Studio) faites sur la branche `sonora`, à valider. Numérotation des phases : voir PLAN.md. Pas de moteur temps réel ni d'interface avant les phases 3 et 4.

Contenu de ce dossier
- README.md : le rapport d'audit (phase 0) et l'état du projet.
- SPEC.md : la spécification du langage, du compilateur et du moteur (phase 1).
- exemples/ : sept programmes SONORA qui servent de cahier des charges. Tous sont vérifiés par le compilateur ; un seul (le sinus) se génère en noyau pour l'instant.
- TESTS_CONCEPTUELS.md : les tests que le compilateur et le moteur devront passer, écrits avant le code.
- PLAN.md : le plan général en onze phases et l'état de chacune.
- PHASE2.md : le compilateur : fichiers, tests, écarts, limites.
- PHASE3.md : le moteur audio : architecture, tests dans le navigateur, performances, limites.
- PHASE4.md : le Studio : fonctions, tests, limites. La page est dans `studio/`.
- PHASE5.md : SONORA Science, 14 expériences mesurées sur les signaux. La page est dans `science/`.
- PHASE6.md : SONORA Academy, 10 leçons à exercices corrigés sur le son. La page est dans `academy/`.
- PHASE7.md : bibliothèque de modules DSP : 14 modules livrés (écho, chorus, flanger, phaser, saturation, écrêtage, réverbération, panoramique, table d'onde, additive, niveau, rampe, ar, corde pincée).
- PHASE8.md : création avancée du Studio : export WAV, lien de partage, clavier MIDI, séquenceur euclidien.
- src/ et tests/ : le compilateur et le moteur (aucune dépendance) et leurs 359 tests : `npm test` (Node, 265 tests), `npm run test:navigateur` (moteur, 17 tests) et `npm run test:studio` (interface, 23 tests) et `npm run test:science` (Science, 20 tests) et `npm run test:academie` (Academy, 19 tests) et `npm run test:creation` (création avancée, 15 tests dans Chromium), les cinq derniers dans Chromium via Playwright.

## Rapport d'audit (phase 0)

### Architecture existante
- Le site est généré, pas écrit à la main. `outils/site.py` assemble `outils/site_gabarit.html` (environ 5 000 lignes : HTML, CSS, JavaScript) avec les données Python (`donnees.py`, `contenus.py`, `ludotheque.py`, `labo_faust.py`, `faust/studio/exemples.py`...), puis écrit deux sites : `public/` (enseignant) et `public-eleves/` (élèves). Le dépôt `musique` est une copie des deux dossiers servie par GitHub Pages.
- Une seule page, un seul fichier `index.html` d'environ 1,3 Mo, navigation par ancres (`#cours-6e`, `#faust-ateliers`...). Pas de bundler. Un service worker (`sw.js`, 892 octets) met en cache.
- Les tests sont des scripts Playwright (`outils/tests/*.js`) lancés par `lancer.py`.

### Le laboratoire actuel
- Il est exposé sous le nom Faust : sept pages (`NAV_FAUST` : Laboratoire, Matières, Ateliers, Comprendre, Programmer, Bibliothèque, Ressources).
- Ateliers : 19 programmes compilés à l'avance en WebAssembly (`outils/faust/labo/`), joués en direct, avec une interface faite pour des collégiens (gros boutons, curseurs, clavier, boîte à rythmes, onde et spectre).
- Studio « Programmer » : 34 exemples en langage Faust, compilés dans le navigateur de l'élève par libfaust (6,5 Mo de WebAssembly, chargé à la première compilation), avec une simple zone de texte (`<textarea>`) et des messages d'erreur traduits par expressions régulières.
- Matières : un moteur de synthèse en Faust (`matieres.dsp`).
- Banque d'échantillons (11 Mo de MP3) : une partie calculée par Faust à l'avance (guitare, voix, gestes expérimentaux, boîte à rythmes), une partie enregistrée (VSCO 2 CE et VCSL, CC0).

### Éléments réutilisables
- Le gabarit visuel (noir profond, blanc cassé, vert acide, titres Archivo Black, Plex Mono), à garder tel quel.
- L'interface des ateliers (curseurs, gros bouton, clavier, boîte à rythmes) : à brancher sur le moteur SONORA plutôt qu'à réécrire.
- Les 34 exemples du studio : leur texte pédagogique est réutilisable, leur code est à réécrire en SONORA (jamais par traduction automatique, pour éviter de reprendre la forme de Faust).
- Les vues d'oscilloscope et de spectre du laboratoire, la banque d'échantillons enregistrés, les tests Playwright.
- Les parcours : la grille qui relie chaque atelier à une séance de cours (`D.grille.faust`).

### Éléments à remplacer
- Le compilateur libfaust et le moteur faustwasm, à retirer de l'exécution.
- Les 19 ateliers compilés en WebAssembly (à reprogrammer en SONORA).
- Les 34 exemples du studio.
- `labo_faust.py`, `placer_faust.py`, `outils/faust/*.mjs` pour la partie atelier et studio.
- Les échantillons produits par Faust (voix, guitare, gestes) : ce sont des fichiers audio déjà rendus, ils peuvent rester tant qu'on ne les remplace pas ; leur statut de licence est à vérifier (voir plus bas).

### Dépendances et licences
- `@grame/faustwasm` 0.19.3 et libfaust : LGPL 2.1 ou plus. Livrés dans le site. La notice de licence a été conservée dans la page des crédits (le 31/10/2026, à la demande de retirer les mentions Faust : seule la notice exigée par la licence a été gardée, sans le nom du produit). Tant que ces composants sont livrés, elle doit rester. Elle pourra disparaître quand ils auront été retirés du dépôt public.
- Bibliothèques Faust (faustlibraries) : licences par fichier, avec une exception pour le code généré. À vérifier avant de dire que les MP3 rendus sont libres de toute obligation. Ce rapport ne remplace pas un avis juridique.
- VSCO 2 CE et VCSL : CC0.
- Aucune autre bibliothèque JavaScript : le site n'en charge aucune. C'est un atout : SONORA peut rester sans dépendance.
- Pour l'éditeur de code : CodeMirror 6 est sous licence MIT. Il demande une étape de bundling (esbuild), à faire au moment du build et à committer, car GitHub Pages ne compile rien. Poids attendu : 150 à 300 Ko. Décision à prendre en phase 3 ; une zone de texte avec coloration maison suffit jusque-là.

### Contraintes de GitHub Pages
- Site statique, HTTPS : AudioWorklet fonctionne.
- Pas d'en-têtes COOP et COEP : pas de `SharedArrayBuffer`. Les échanges entre le fil audio et l'interface passent par `MessagePort`, avec des tampons transférés.
- Pas de serveur : projets et partage par `localStorage`, IndexedDB, export de fichier, et lien contenant le programme compressé dans la partie `#`.
- Limite de taille du dépôt et du site : sans conséquence tant que les modules restent petits.
- Un seul `index.html` : SONORA vivra dans `sonora/` (modules ES chargés à la demande), et non dans une iframe.

### Risques techniques
1. Le thread audio ne tolère ni allocation ni compilation : le compilateur tourne dans un Worker, le moteur reçoit un noyau déjà compilé.
2. Safari : AudioWorklet y est plus fragile qu'ailleurs, et les iPhone ont des limites de mémoire. Test sur appareil réel obligatoire (il n'en a jamais été fait sur ce site).
3. Sans `SharedArrayBuffer`, les visualisations synchronisées passent par des messages : latence visuelle de l'ordre d'une image, à documenter.
4. Le volume de travail : un langage, un compilateur, un moteur, des modules, des visualisations, une pédagogie. Le risque principal est de s'éparpiller. D'où le plan par phases avec test à chaque étape.
5. Reprise du contenu pédagogique : 19 ateliers et 34 exemples à reprogrammer sans les copier de Faust.
6. Qualité sonore : un module écrit à la main (réverbération, granulaire) demande une écoute attentive. Je n'ai jamais écouté un son ; les mesures (spectre, niveau) ne suffisent pas à juger d'une réverbération. L'écoute est à votre charge.

### Architecture proposée
Voir SPEC.md, parties 12 à 14.

## Calendrier des phases
- Phase 0, audit : faite (ce rapport).
- Phase 1, spécification : livrée dans SPEC.md.
- Phase 2, compilateur : faite, à valider (PHASE2.md).
- Phase 3, moteur audio : faite, à valider (PHASE3.md).
- Phase 4, Studio : faite, à valider (PHASE4.md).
- Phase 5, Science : faite, à valider (PHASE5.md).
- Phase 6, Academy : faite, à valider (PHASE6.md).
- Phase 7, modules DSP : faite sauf grains et les séquenceurs (phase 8), à valider (PHASE7.md).
- Phase 8, création avancée : faite, à valider (PHASE8.md).
- Phases 5 et suivantes : non commencées (PLAN.md).
