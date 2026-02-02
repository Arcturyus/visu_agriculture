import { drawHeatmap } from './heatmap.js'; // Supposons que tu as bougé le code heatmap ici
import { drawWorldMap } from './worldMap.js';

let globalData = [];
let currentPage = "page-heatmap"; // Page par défaut


const indicateurs = [
    "Exportations de viandes et préparations (téc)",
    "Exportations de viandes et préparations (€)",
    "Importation de viandes et préparations (téc)",
    "Importation de viandes et préparations (€)",
    "Solde des échanges de viandes et préparations (téc)",
    "Solde des échanges de viandes et préparations (€)"
];


d3.csv("data/comexviande_pivot.csv", d => {
    // Cette fonction s'exécute pour CHAQUE ligne du CSV avant de continuer
    
    // Nettoyage des textes (enlever les espaces blancs au début/fin)
    // C'est crucial pour que "Janvier" dans le code corresponde à " Janvier" dans le CSV
    if (d.N053_LIB) d.N053_LIB = d.N053_LIB.trim();             // La colonne des mois
    if (d.N500_LIB) d.N500_LIB = d.N500_LIB.trim();             // La colonne des types de viande
    if (d.COMEXVIANDE_DIM2_LIB) d.COMEXVIANDE_DIM2_LIB = d.COMEXVIANDE_DIM2_LIB.trim(); // La colonne Pays

    // Conversion automatique des types (les nombres deviennent des nombres JS)
    return d3.autoType(d);

}).then(data => {
    // Une fois que TOUT le fichier est chargé et nettoyé :
    
    globalData = data; // On stocke les données dans la variable globale
    console.log("Données chargées avec succès :", globalData.length, "lignes.");
    console.log("Exemple de ligne :", globalData[0]);
    initInterface(); 
    updateApp(); 

}).catch(error => {
    // En cas d'erreur (fichier mal nommé, 404 sur GitHub Pages, etc.)
    console.error("Erreur lors du chargement du CSV :", error);
    
    // Petit message visuel pour toi
    d3.select("#chart-container")
      .append("div")
      .attr("class", "error-msg")
      .html(`<h3>⚠️ Erreur de chargement</h3>
             <p>Le fichier CSV n'a pas pu être chargé. Vérifiez le chemin : <code>data/comexviande_pivot.csv</code></p>
             <p>Détails : ${error.message}</p>`);
});


// --- 2. FONCTION POUR INITIALISER L'INTERFACE ---

function initInterface() {
    const select = d3.select("#selectedIndicateur");
    
    select.selectAll("option").remove();

    select.selectAll("option")
        .data(indicateurs) 
        .enter()
        .append("option")
        .text(d => d)
        .attr("value", d => d);

    d3.selectAll("input[type=radio]").on("change", () => {
        console.log("Filtre changé !");
        updateApp();
    });

    select.on("change", () => {
        console.log("Indicateur changé !");
        updateApp();
    });
}

// GESTION DES ONGLETS
d3.selectAll(".nav-btn").on("click", function() {
    // 1. Gestion visuelle des boutons
    d3.selectAll(".nav-btn").classed("active", false);
    d3.select(this).classed("active", true);

    // 2. Affichage de la bonne div
    const targetId = d3.select(this).attr("data-target");
    currentPage = targetId;

    d3.selectAll(".page-section").style("display", "none");
    d3.select("#" + targetId).style("display", "block");

    // 3. Redessiner le graphique concerné
    updateApp();
});

// LA FONCTION DE MISE A JOUR CENTRALISÉE
function updateApp() {
    const indicateur = d3.select("#selectedIndicateur").property("value");
    const modePays = d3.select('input[name="pays"]:checked').node().value;
    const modeViande = d3.select('input[name="viande"]:checked').node().value;
    const modeTemps = d3.select('input[name="temps"]:checked').node().value;

    let filteredData = globalData; 
    // Filtre Géographique (Monde)
    if (modePays === "exclure") {
        filteredData = filteredData.filter(d => d.COMEXVIANDE_DIM2_LIB !== "Monde");
    } else if (modePays === "uniquement") {
        filteredData = filteredData.filter(d => d.COMEXVIANDE_DIM2_LIB === "Monde");
    }

    // Filtre Type Viande (TOTAL VIANDES)
    if (modeViande === "exclure") {
        filteredData = filteredData.filter(d => d.N500_LIB !== "TOTAL VIANDES");
    } else if (modeViande === "uniquement") {
        filteredData = filteredData.filter(d => d.N500_LIB === "TOTAL VIANDES");
    }

    // Filtre Temporel (TOTAL Annuel)
    if (modeTemps === "exclure") {
        filteredData = filteredData.filter(d => d.N053_LIB !== "TOTAL Annuel");
    } else if (modeTemps === "uniquement") {
        filteredData = filteredData.filter(d => d.N053_LIB === "TOTAL Annuel");
    }

    // DESSINER SELON LA PAGE ACTIVE
    if (currentPage === "page-heatmap") {
        drawHeatmap(filteredData, indicateur, modeTemps); // Ta fonction d'avant
    } else if (currentPage === "page-map") {
        drawWorldMap(filteredData, indicateur, "#map-container");
    }
}