# Inventaire des navigateurs

Capacités relevées par le diagnostic du banc (`benchmark-dashboard.html`, bouton « Relever les capacités du navigateur », ou `node outils/capacites_navigateur.js`). Un navigateur non essayé reste « non testé ».

| Capacité | Chromium 153 (conteneur, 20/11/2026) | Edge Windows | Chrome Windows | Firefox | Safari |
|---|---|---|---|---|---|
| AudioWorklet | oui | non testé | non testé | non testé | non testé |
| WebAssembly, SIMD | oui, oui | non testé | non testé | non testé | non testé |
| SharedArrayBuffer, isolation entre origines | non, non (GitHub Pages n'envoie pas les en-têtes) | non testé | non testé | non testé | non testé |
| `AudioContext.playbackStats` | oui | non testé | non testé | non testé | non testé |
| `renderSizeHint` (32 à 512 acceptés) | oui | non testé | non testé | non testé | non testé |
| Web MIDI | oui | non testé | non testé | non testé | non testé |
| Évaluation de chaîne (`new Function`) | oui | non testé | non testé | non testé | non testé |
| `performance.memory` | oui | non testé | non testé | non testé | non testé |

Notes :
- La famille Chromium (Chrome, Edge) est celle de l'Ordival présumé ; l'Ordival peut aussi imposer des stratégies qui retirent des capacités : `hardware-inventory.md`, point 4.
- Le support de `playbackStats` hors Chromium n'est pas établi (une recherche web du 20/11 indique pour Chrome sur Android la version 156 et pas de support de Firefox sur Android à la version 159, données desktop non obtenues).
- Résultat brut du conteneur : `docs/mesures/2026-11-20_capacites_chromium153.json`.
