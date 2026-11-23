# Banc d'essai SONORA

Mesure, dans le navigateur et en temps réel, ce que SONORA peut jouer sans coupure sur un appareil donné, en priorité sur un Ordival. Statique, sans dépendance, compatible GitHub Pages.

Statut au 20/11/2026 : l'outil est validé sur un poste de développement (Chromium sans écran, sortie audio factice). Aucun résultat n'existe sur un Ordival ni sur aucun appareil scolaire : tout résultat Ordival est NON VALIDÉ tant que le banc n'a pas tourné sur un appareil physique.

## Lancer

Publié avec le site à l'adresse `bench/benchmark-dashboard.html` (à côté de `sonora/`). En local, servir le dépôt avec la disposition du site (`/bench/`, `/sonora/`, `/faust/`) : `node benchmarks/sonora/tests/executer.mjs` le fait pour les essais automatiques.

- Mode interactif : choisir un scénario, le nombre d'instances, la taille de bloc, les canaux, la durée ; lancer ; lire les compteurs seconde par seconde. Bouton « Chercher la polyphonie stable » : paliers 1, 2, 4... jusqu'au premier palier instable.
- Mode automatique : profil ESSENTIEL, STUDIO ou EXPERT, durée par essai, tailles de bloc, répétitions ; ou par l'adresse : `benchmark-dashboard.html?auto=ESSENTIEL&seconds=8&quantum=128,64&silence=1`.
- Export JSON (mesures brutes, statistiques, erreurs, verdict, diagnostic de l'appareil, champs saisis à la main) et CSV. Import d'autres fichiers JSON pour comparer des appareils.
- Garder la page visible et au premier plan : une page cachée est ralentie par le navigateur.

## Contenu

| Fichier ou dossier | Rôle |
|---|---|
| `benchmark-dashboard.html`, `dashboard.js` | interface, tableaux, graphique, export, comparaison |
| `bench-core.js` | mesure en temps réel, statistiques, diagnostic, rampe de polyphonie, export |
| `scenarios.js` | les 20 scénarios de la demande (s01 à s20) et 4 scénarios du site réel (s21 à s24) |
| `worklets/kernels.js` | noyaux de calcul en AudioWorklet et sonde de blocs manqués |
| `latency-tests/` | les trois latences (interne, annoncée, réelle par corrélation MLS) |
| `stability-tests/` | essais de 15, 30 et 45 minutes avec journal des événements de page |
| `memory-tests/` | cycles de création et destruction, pente du tas |
| `synthesis-tests/` | catalogue des scénarios généré depuis `scenarios.js` |
| `benchmark-methodology.md` | ce qui est mesuré, comment, et ce qui ne l'est pas |
| `hardware-inventory.md`, `browser-inventory.md` | fiches de collecte et capacités relevées |
| `benchmark-results.json`, `.csv` | résultats du poste de développement (non représentatifs d'un appareil scolaire) |
| `tests/` | tests Node et Chromium de l'outil, `executer.mjs` pour une série complète |

## Tester l'outil

`node --test benchmarks/sonora/tests/loopback.test.mjs benchmarks/sonora/tests/banc.test.mjs` (une soixantaine de secondes de son réel). Le test contient un contrôle positif de surcharge : un banc qui ne détecte pas une surcharge volontaire ne vaut rien.

## Rappels

- Un rendu hors ligne rapide n'est pas une preuve de temps réel.
- Les scénarios `natif` (nœuds Web Audio) n'ont pas de charge mesurée : ils sont jugés sur les coupures. Les scénarios `worklet` ont une charge par fenêtre d'une seconde.
- Les scénarios s08 (SoundFont) et s09 (SFZ) sont NON_MESURE : aucun lecteur n'est intégré à SONORA.
- Rien dans ce dossier n'envoie de données : tout reste dans le navigateur.
