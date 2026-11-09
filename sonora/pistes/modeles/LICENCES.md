# Modèles de séparation de stems : origine et licences

Les quatre fichiers `spleeter-*.onnx` (voix, batterie, basse, autres) sont les modèles **Spleeter 4 stems** de Deezer, convertis en ONNX par `outils/stems/construire_modeles.py` à partir des points de contrôle publiés par Deezer (`https://github.com/deezer/spleeter/releases/tag/v1.4.0`, fichier `4stems.tar.gz`).

- **Spleeter** (code et modèles) : licence MIT, © Deezer SA. Romain Hennequin, Anis Khlif, Felix Voituret, Manuel Moussallam, « Spleeter: a fast and efficient music source separation tool with pre-trained models », *Journal of Open Source Software*, 5(50), 2154, 2020. L'architecture est celle de Jansson et al., « Singing voice separation with deep U-Net convolutional networks », ISMIR 2017.
- **Conversion** : les poids sont ceux de Deezer, arrondis en entiers 8 bits par canal de sortie pour diviser la taille par quatre (écart mesuré avec les poids d'origine : environ −27 dB sur le son séparé). Aucun réentraînement.
- **onnxruntime-web 1.17.3** (`vendor/ort/`) : licence MIT, © Microsoft Corporation. Fichiers `ort.wasm.min.js` et `ort-wasm-simd.wasm` de la distribution npm, non modifiés.

Les modèles ont été entraînés par Deezer sur de la musique enregistrée (voix chantée, batterie, basse, autres instruments) : ils fonctionnent moins bien sur d'autres musiques. Ils ne sont pas parfaits, et le site le dit à l'élève avant de les utiliser.
