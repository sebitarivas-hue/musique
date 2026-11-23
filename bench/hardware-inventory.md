# Inventaire matériel

Le navigateur ne donne ni le modèle du processeur, ni la carte son, ni les pilotes. Ce fichier sert à les relever à la main, appareil par appareil, avant tout essai. Ne rien supposer : une case non relevée reste UNKNOWN.

## Appareils

| Profil | Modèle | Processeur | Cœurs | Mémoire | Stockage | Système | Navigateur | Sortie audio | Relevé le | État |
|---|---|---|---|---|---|---|---|---|---|---|
| Ordival réel | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN (donnée transmise, non vérifiée : 8 Go) | UNKNOWN (donnée transmise, non vérifiée : 128 Go) | UNKNOWN (donnée transmise, non vérifiée : Windows 11 Éducation) | UNKNOWN | UNKNOWN | | à relever sur un appareil physique |
| Ordinateur scolaire peu puissant | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | | à relever |
| Ordinateur portable récent | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | | à relever |
| Poste de développement (conteneur) | conteneur Linux sans écran | Intel Xeon à 2,1 GHz | 4 | 16 Go | non relevé | Linux 6.18, x86_64 | HeadlessChrome 153 | factice (aucune carte son) | 20/11/2026 | relevé, ne représente aucun appareil scolaire |

## Fiche de collecte manuelle (Windows 11)

À remplir sans droits d'administrateur, avec les outils habituels de Windows :

1. Modèle et processeur : Paramètres, Système, Informations système (« Spécifications de l'appareil »), ou la fenêtre de la commande `winver` pour la version du système.
2. Processeur, nombre de cœurs, vitesse, mémoire installée et utilisée : Gestionnaire des tâches (Ctrl+Maj+Échap), onglet Performances.
3. Disque libre : même fenêtre, onglet Performances, Disque.
4. Navigateur et version : dans le navigateur, la page `edge://version` ou `chrome://version`, ou Paramètres, À propos. Noter aussi si le navigateur est géré par une organisation (les pages `edge://policy` ou `chrome://policy` listent les stratégies : relever celles qui touchent JavaScript, le JIT, les fichiers WebAssembly, les blobs).
5. Graphique : `edge://gpu` ou `chrome://gpu` (le banc relève aussi le rendu WebGL).
6. Sortie audio : Paramètres, Système, Son : haut-parleurs internes, casque, USB, Bluetooth (le Bluetooth ajoute une latence importante et variable : à noter).
7. Alimentation : sur secteur ou sur batterie, mode d'alimentation (économie d'énergie, équilibré, performances).
8. Programmes ouverts pendant l'essai et nombre d'onglets.
9. Réseau scolaire : filtrage connu des fichiers `.wasm`, `.onnx`, `.mp3`, des blobs, du WebSocket (à demander à l'administrateur).

Le tableau de bord du banc (`benchmark-dashboard.html`) propose les mêmes champs dans un formulaire ; leur contenu est enregistré dans le fichier exporté et reste dans le navigateur de l'utilisateur.
