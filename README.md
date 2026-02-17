# Échanges de Viandes avec la France

Carte interactive D3.js visualisant les imports/exports de viandes de la France de 1999 à 2025.

## Lancement

Voir sur `https://arcturyus.github.io/visu_agriculture/`

ou

Servir le dossier localement (attention il faut les données CSV et le world.geojson) :

```bash
npx serve .
# ou
python -m http.server
```

Puis ouvrir `http://localhost:3000` (ou `:8000`).


## Fonctionnalités

- **Carte** 
- **Classement**
- **Focus pays** — clic sur un pays → graphique temporel + stats détaillées
- **Filtres** — indicateur (export/import/solde, en téc ou €), type de viande (15 catégories), année ou toutes années
- **Animation temporelle** — lecture automatique année par année

## Structure

```
index.html           # Page unique (layout + filtres)
css/style.css        # Styles (glass panels, responsive)
js/
  main.js                # Chargement CSV, filtres, orchestration
  worldMap.js            # Carte D3 + légende
  ranking.js             # Chart classement
  countryFocus.js        # Panneau détail pays (line chart + stats)
data/
  comexviande_pivot.csv  # Données pivot (source Agreste)
  world.geojson          # Géométries pays pour faire la carte
```

