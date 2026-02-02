# visu_agriculture

Projet de visualisation de données agricoles avec D3.js

## Structure du projet

```
├── index.html          # Page principale et conteneurs D3
├── css/
│   └── style.css       # Feuille de styles
├── data/
│   └── (données à ajouter)
├── js/
│   ├── main.js         # Point d'entrée (chargement des données)
│   ├── chart1.js       # Composant pour le premier graphique
│   └── utils.js        # Fonctions d'aide (formatage de dates, échelles)
├── assets/
│   └── (ressources à ajouter)
└── README.md           # Ce fichier
```

## Installation

1. Clonez ce repository
2. Ouvrez `index.html` dans votre navigateur web

## Utilisation

Le projet utilise D3.js version 7 (chargé via CDN). Les données et assets peuvent être ajoutés dans les dossiers correspondants.

### Ajouter des données

Placez vos fichiers de données (CSV, JSON, etc.) dans le dossier `data/` et modifiez `js/main.js` pour les charger.

### Ajouter des assets

Placez vos images, icônes ou autres ressources dans le dossier `assets/`.

## Développement

- `js/main.js` : Point d'entrée de l'application, gère le chargement des données
- `js/chart1.js` : Composant pour créer et gérer le premier graphique
- `js/utils.js` : Fonctions utilitaires réutilisables (formatage, échelles, tooltips)
- `css/style.css` : Styles de l'application et des graphiques