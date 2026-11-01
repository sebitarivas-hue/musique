# GARDE-FOU, DEPOT PUBLIC, COURS DE COLLEGE

Ce depot est PUBLIC. Tout ce qui y est pousse est lisible par n'importe qui,
immediatement, et il sert un cours d'education musicale de la 6e a la 3e.

## Les deux choses a ne jamais faire

1. **Aucune donnee d'eleve, jamais.** Ce sont des mineurs. Pas de liste de
   classe, pas de notes, pas de trombinoscope, pas de photo, pas de prenom
   d'eleve, pas d'export Pronote, EcoleDirecte ou SIECLE. Si une donnee d'eleve
   doit exister quelque part, c'est dans l'espace de l'etablissement, pas ici et
   pas non plus dans le depot prive `education-musicale`.
2. **Aucun contenu du hub prive `stopera`** : sante, finances, famille,
   administratif, candidatures. Ni `memory/`, ni `.roots/`, ni `Career/`, ni
   aucun fichier bureautique ou archive.

En cas de doute sur un fichier, il ne vient pas ici.

## Ce depot est genere, on ne l'ecrit pas a la main

La source est le depot prive `education-musicale`. Le site se construit la-bas
(`python3 outils/generer.py && python3 outils/site.py`), puis le contenu de
`public/` est copie ici. Une correction faite directement ici est perdue a la
generation suivante : elle se fait dans la source.

## Le controle automatique

`.github/workflows/garde-fou.yml` verifie chaque push et echoue si un fichier
interdit apparait. Un echec est l'alarme voulue, pas un bug.

Il detecte **par forme et jamais par valeur** : aucun identifiant personnel n'est
ecrit en clair dans le workflow. C'est une correction deliberee du garde-fou de
`proyectos`, qui epelle le numero de securite sociale, le numero CAF et le mobile
prive dans un depot public, et publie donc ce qu'il protege.

Deux exclusions sont volontaires et testees, ne pas les retirer sans refaire le
test : le dossier `faust`, dont les `dsp-meta.json` generes portent les adresses
de copyright de la bibliotheque Faust, et la forme laxiste du motif de mobile,
qui attrape les coordonnees de trace SVG d'`index.html`.

## Le reste de l'ecosysteme

Cinq depots, et deux seulement sont publics.

| Depot | Visibilite | Role |
|---|---|---|
| `musique` | **public** | ce depot : le site du cours, genere |
| `proyectos` | **public** | le site `stopera.art`, genere |
| `education-musicale` | prive | la source du cours |
| `stopera` | prive | le pilotage et le personnel |
| `mails` | prive | l'archive des courriels |
