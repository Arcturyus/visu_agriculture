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


let currentYear = null;
let isAllYears = true;

d3.csv("data/comexviande_pivot.csv", d => {
    // 1. On récupère les valeurs brutes ou une chaîne vide si inexistant
    let n500 = d.N500_LIB ? String(d.N500_LIB).trim() : "";
    let n053 = d.N053_LIB ? String(d.N053_LIB).trim() : "";
    let pays = d.COMEXVIANDE_DIM2_LIB ? String(d.COMEXVIANDE_DIM2_LIB).trim() : "";
    
    // 2. Filtre de sécurité : on ignore les lignes de totaux
    if (n500 === "TOTAL VIANDES" || n053 === "Total annuel") return null;

    // 3. Conversion MANUELLE (plus sûr que autoType ici)
    // On crée un nouvel objet propre
    const cleanRow = {
        ANNREF: +d.ANNREF, // Convertit l'année en nombre
        N500_LIB: n500,
        N053_LIB: n053,
        COMEXVIANDE_DIM2_LIB: pays
    };

    // 4. Conversion automatique de TOUS les indicateurs (les colonnes de chiffres)
    // On boucle sur les clés du CSV pour convertir les colonnes de données en nombres
    Object.keys(d).forEach(key => {
        if (key.includes("Exportations") || key.includes("Importation") || key.includes("Solde")) {
            // On remplace les virgules par des points (si besoin) et on convertit en nombre
            let val = d[key] ? d[key].replace(',', '.') : "0";
            cleanRow[key] = +val || 0; 
        }
    });

    return cleanRow;
}).then(data => {
    globalData = data;
    
    // Log de vérification
    console.log("Données chargées :", data.length, "lignes.");
    if(data.length > 0) console.log("Exemple de ligne :", data[0]);

    // Setup du slider
    const anneesUniques = [...new Set(data.map(d => d.ANNREF))].sort((a, b) => a - b);
    
    if (anneesUniques.length > 0) {
        const minYear = anneesUniques[0];
        const maxYear = anneesUniques[anneesUniques.length - 1];
        
        currentYear = maxYear; 
        isAllYears = true; // On force l'état initial à "Toutes les années"

        const slider = d3.select("#year-slider");
        slider.attr("min", minYear).attr("max", maxYear).property("value", maxYear);
        
        // On s'assure que le bouton est visuellement actif
        d3.select("#btn-all-years").classed("active", true);
        
        updateYearUI();
        initListeners();
        updateApp();
    }
}).catch(err => {
    console.error("Erreur lors du chargement du CSV :", err);
});
function initListeners() {
    // Écouteur sur les "cartes" radio d'indicateurs
    d3.selectAll('input[name="indicateur"]').on("change", () => {
        // Ajout d'une classe visuelle sur le parent (la carte)
        d3.selectAll('.indicator-card').classed('active', false);
        d3.select(event.target.closest('.indicator-card')).classed('active', true);
        
        updateApp();
    });

    // pour l'année...
    d3.select("#year-slider").on("input", function() {
        isAllYears = false; 
        d3.select("#btn-all-years").classed("active", false);
        currentYear = +this.value;
        updateYearUI();
        updateApp();
    });

    // Bouton Toutes les années
    d3.select("#btn-all-years").on("click", function() {
        isAllYears = !isAllYears;
        d3.select(this).classed("active", isAllYears);
        updateYearUI();
        updateApp();
    });

    // Écouteur sur le switch "Monde"
    d3.select("#exclude-world").on("change", updateApp);
}

function updateYearUI() {
    const display = d3.select("#year-display");
    const sliderNode = document.getElementById('year-slider');
    
    if (isAllYears) {
        display.text("Toutes les années");
        // La position du tooltip reste celle du slider (pas de changement de left)
    } else {
        const val = currentYear;
        const min = +sliderNode.min;
        const max = +sliderNode.max;
        const percent = (val - min) / (max - min);
        
        // Positionne le tooltip au dessus du curseur
        display.style("left", `calc(${percent * 100}% + (${8 - percent * 16}px))`);
        display.text(val);
    }
}

function updateApp() {
    const indicateur = d3.select('input[name="indicateur"]:checked').node().value;
    const excludeWorld = d3.select("#exclude-world").property("checked");

    console.log(`Filtrage : Année=${isAllYears ? 'Toutes' : currentYear}, Indicateur=${indicateur}`);

    let filteredData = globalData.filter(d => {
        // 1. Filtre Année : on utilise ANNREF
        const matchYear = isAllYears ? true : (d.ANNREF === currentYear);
        
        // 2. Filtre Monde
        let matchWorld = true;
        if (excludeWorld) {
            matchWorld = d.COMEXVIANDE_DIM2_LIB !== "Monde" && d.COMEXVIANDE_DIM2_LIB !== "__Monde";
        }

        return matchYear && matchWorld;
    });

    // Debug pour voir si des données sortent après filtre
    console.log("Nombre de lignes après filtre :", filteredData.length);

    // On envoie à la carte et au ranking
    // Rappel : drawWorldMap fait déjà la somme (d3.sum) des valeurs trouvées
    // Donc si on a 12 mois pour 1 pays, il va bien les additionner.
    drawWorldMap(filteredData, indicateur, "#map-background");
    updateRanking(filteredData, indicateur);
}