import { drawWorldMap } from './worldMap.js';
import { updateRanking } from './ranking.js';

let globalData = [];


const indicateurs = [
    "Exportations de viandes et préparations (téc)",
    "Exportations de viandes et préparations (€)",
    "Importation de viandes et préparations (téc)",
    "Importation de viandes et préparations (€)",
    "Solde des échanges de viandes et préparations (téc)",
    "Solde des échanges de viandes et préparations (€)"
];




// Chargement des données
d3.csv("data/comexviande_pivot.csv", d => {
    if (d.N053_LIB) d.N053_LIB = d.N053_LIB.trim();
    if (d.N500_LIB) d.N500_LIB = d.N500_LIB.trim();
    if (d.COMEXVIANDE_DIM2_LIB) d.COMEXVIANDE_DIM2_LIB = d.COMEXVIANDE_DIM2_LIB.trim();
    return d3.autoType(d);
}).then(data => {
    globalData = data;
    console.log("Données chargées.");
    initListeners();
    updateApp();
}).catch(err => console.error(err));

function initListeners() {
    // Écouteur sur les "cartes" radio d'indicateurs
    d3.selectAll('input[name="indicateur"]').on("change", () => {
        // Ajout d'une classe visuelle sur le parent (la carte)
        d3.selectAll('.indicator-card').classed('active', false);
        d3.select(event.target.closest('.indicator-card')).classed('active', true);
        
        updateApp();
    });

    // Écouteur sur le switch "Monde"
    d3.select("#exclude-world").on("change", updateApp);
}

function updateApp() {
    // 1. Récupérer les choix
    const indicateur = d3.select('input[name="indicateur"]:checked').node().value;
    const excludeWorld = d3.select("#exclude-world").property("checked");

    // 2. Filtrer les données
    let filteredData = globalData;

    if (excludeWorld) {
        // On enlève la ligne "Monde" (souvent nommée "Monde" ou "__Monde")
        filteredData = filteredData.filter(d => 
            d.COMEXVIANDE_DIM2_LIB !== "Monde" && 
            d.COMEXVIANDE_DIM2_LIB !== "__Monde"
        );
    } else {
        // Si on décoche, on montre TOUT (y compris Monde si présent)
        // Mais souvent pour la carte, afficher "Monde" n'a pas de sens géographique
        // Cependant, pour le Ranking, c'est utile de voir que le Monde écrase tout.
    }

    // 3. Mettre à jour la Carte
    // Note: la carte gère elle-même l'échelle, donc filtrer "Monde" est crucial pour voir les couleurs des pays
    drawWorldMap(filteredData, indicateur, "#map-background");

    // 4. Mettre à jour le Classement
    updateRanking(filteredData, indicateur);
}