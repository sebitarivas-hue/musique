# Méthode du banc d'essai SONORA

Ce document dit ce que le banc mesure, comment, et surtout ce qu'il ne prouve pas. Il accompagne `README.md` (mode d'emploi) et `docs/SONORA_BENCHMARK_PROTOCOL.md` (procédure d'un essai sur appareil).

## 1. Principe : le temps réel se mesure en temps réel

Un moteur qui rend dix secondes de son en une seconde hors ligne peut ne pas tenir une lecture interactive : le rendu hors ligne ignore le fil audio du système, ses échéances et ses coupures. Le banc n'utilise donc aucun rendu hors ligne pour juger un scénario. Chaque scénario joue dans un `AudioContext` réel, pendant une durée donnée, avec les compteurs ci-dessous. Les rendus hors ligne du dépôt (sonde d'appareil, tests Node) restent utiles pour détecter une dérive grossière, jamais pour déclarer un appareil capable.

## 2. Ce qui est mesuré

| Mesure | Comment | Valide pour | Limite |
|---|---|---|---|
| Coupures de lecture | `AudioContext.playbackStats` (`underrunEvents`, `underrunDuration`) : nombre de fois où le périphérique a joué des échantillons que le moteur n'avait pas fournis | tous les chemins audio, dans les navigateurs qui l'ont | API expérimentale : présente dans Chromium 153, support ailleurs non établi. La première seconde est comptée à part (démarrage du contexte) |
| Blocs manqués | une sonde dans le fil audio compare `currentFrame` entre deux appels : un saut de plus d'un bloc signale des blocs non demandés | tous les chemins, tous les navigateurs avec AudioWorklet | ne voit que les retards du fil audio, pas ceux du périphérique |
| Charge du noyau | dans les noyaux écrits pour le banc : somme des `Date.now()` de début et de fin de chaque appel, par fenêtre d'une seconde, divisée par le nombre de blocs puis par le temps disponible par bloc (taille de bloc divisée par la fréquence) | scénarios en AudioWorklet (`worklet`) | `performance.now()` n'existe pas dans un AudioWorklet (vérifié dans Chromium 153) ; la résolution de `Date.now()` est de 1 ms mais la moyenne d'une fenêtre est correcte. Les percentiles p95 et p99 portent sur les fenêtres d'une seconde, pas sur les blocs. Les nœuds Web Audio natifs et les moteurs tiers n'ont pas de charge mesurée (n/d) |
| Dérive d'horloge | temps audio écoulé divisé par temps mural | tous | un rapport nettement inférieur à 1 signale un moteur qui n'a pas suivi |
| Gigue d'affichage | intervalles entre images (`requestAnimationFrame`) | tous (utile pour les visualisations et le séquenceur) | nulle si la page est cachée |
| Mémoire du tas JavaScript | `performance.memory` | navigateurs de la famille Chromium | valeur arrondie ; la mémoire système, WebAssembly et les fils audio ne sont pas vus |
| Temps de chargement | du début de la mesure à la fin de la construction du scénario | tous | inclut le téléchargement des modules (Faust, WebAssembly) |

Ce que le banc ne mesure pas : le pourcentage de processeur du système, la mémoire du système, le GPU, la durée de calcul de chaque bloc, la latence réelle (voir 4).

## 3. Verdicts

| Verdict | Règle | Seuils |
|---|---|---|
| STABLE | aucune coupure après la première seconde, aucun bloc manqué, charge p95 inférieure à 70 % du temps disponible quand elle est mesurée | 70 % : à valider sur appareil |
| LIMITE | aucune coupure, mais charge p95 entre 70 % et 100 % | |
| INCIDENT | des coupures ou blocs manqués alors que la charge p95 mesurée est inférieure à 50 % (la charge ne peut pas en être la cause) ; pour un scénario dont la charge n'est pas mesurable, de 1 à 5 coupures | 5 et 50 % : proposés après observation du bruit de fond du poste de développement |
| INSTABLE | des coupures ou blocs manqués avec une charge p95 de 50 % ou plus ; plus de 5 coupures quand la charge n'est pas mesurable ; ou charge p95 de 100 % ou plus | |
| ECHEC | le contexte ne reste pas en marche, ou exception | |
| NON_CONCLUANT | ni compteur du navigateur ni sonde : on ne peut rien dire | |
| NON_MESURE | le moteur n'existe pas dans SONORA (SoundFont, SFZ) : aucun chiffre n'est produit | |

Répétitions : un essai ne suffit pas. Faire au moins trois essais ; un INCIDENT isolé sur trois se note sans condamner, deux INCIDENT sur trois valent INSTABLE. Dans la polyphonie maximale (rampe), un palier en INCIDENT est rejoué une fois avant d'être jugé.

Warm-up : la première seconde de chaque essai est exclue des coupures du régime établi (démarrage du contexte, premiers blocs), et rapportée séparément (`evenements_au_demarrage`).

## 4. Trois latences, jamais confondues

| Latence | Ce que c'est | Où se mesure |
|---|---|---|
| 1. Latence interne du moteur | un bloc de calcul (taille de bloc sur fréquence) plus le temps de prise en compte d'une commande par le fil audio (aller-retour d'un message) | `latency-tests/`, section 1 |
| 2. Latence estimée par l'AudioContext | `baseLatency`, `outputLatency`, `getOutputTimestamp`, et latences moyenne et maximale de `playbackStats` : des annonces du navigateur, parfois nulles ou fausses selon le pilote | `latency-tests/`, section 2 |
| 3. Latence réelle entrée-sortie | haut-parleur vers micro : une séquence à longueur maximale (MLS, période 16383) est émise et enregistrée, la corrélation donne le retard ; mesure écartée si le rapport pic sur bruit est inférieur à 8 | `latency-tests/`, section 3 (exige un vrai matériel) |

## 5. Tailles de bloc

`new AudioContext({ renderSizeHint: n })` permet de demander 32, 64, 128, 256 ou 512 échantillons dans Chromium 153 ; la valeur réellement adoptée est lue dans `renderQuantumSize` et c'est elle qui figure dans les résultats (`bloc_reel`). Ce n'est pas démontré ailleurs : le diagnostic liste les tailles acceptées par le navigateur essayé. La taille du bloc de rendu, la latence du périphérique et les tampons propres à un moteur (par exemple le repli ScriptProcessor de faustwasm, à 1024) sont trois choses distinctes.

## 6. Validation de l'outil lui-même

Un banc qui ne dit jamais « instable » ne prouve rien. Les tests (`tests/banc.test.mjs`) contiennent un contrôle positif : une surcharge volontaire (12 000 instances de filtre) doit sortir INSTABLE avec une charge p95 au-dessus de 100 %, des coupures et une dérive d'horloge. La charge doit croître avec le nombre d'instances. La corrélation de latence est testée avec un retard connu (`tests/loopback.test.mjs`) ; ce test a trouvé et fait corriger un polynôme de séquence qui n'était pas à longueur maximale.
Bruit de fond constaté au poste de développement : environ une série d'essais légers sur six donne un petit nombre de coupures isolées sans lien avec la charge (conteneur partagé, sortie audio factice). C'est la raison d'être du verdict INCIDENT et des répétitions.

## 7. Conditions à noter à chaque essai

Matériel et système (`hardware-inventory.md`), navigateur et version, onglets et programmes ouverts, secteur ou batterie et mode d'alimentation, sortie audio utilisée, page au premier plan, date. Les résultats de machines différentes ne se comparent que si ces conditions sont renseignées : le fichier exporté contient le diagnostic automatique et les champs saisis à la main.

## 8. Limites connues

- Le niveau sonore des essais est très faible par défaut (0,02) ; l'option « sans haut-parleur » garde le même calcul mais ne passe pas par la même chaîne matérielle sur tous les pilotes.
- Les noyaux du banc sont des charges représentatives de chaque famille, écrites en JavaScript comparable, pas les moteurs tiers : ils disent ce que coûte une famille de synthèse dans ce navigateur, pas la qualité d'un moteur donné. Les moteurs réels (noyau SONORA, musique de la galaxie en Faust) ont leurs propres scénarios (s21 à s24).
- Aucun scénario ne juge la qualité sonore.
- Les moteurs candidats de la phase R1 (SoundFont, étirement temporel, WebChucK, etc.) ne sont pas encore intégrés au banc : leurs scénarios s08 et s09 restent NON_MESURE.
