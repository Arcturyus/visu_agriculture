import { drawWorldMap, clearFocus, getFocusedCountry } from './worldMap.js';
import { updateRanking } from './ranking.js';
import { updateCountryFocus, clearCountryFocus } from './countryFocus.js';

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
let isPlaying = false;
let playInterval = null;

d3.csv("data/comexviande_pivot.csv", d => {
    // 1. On récupère les valeurs brutes ou une chaîne vide si inexistant
    let n500 = d.N500_LIB ? String(d.N500_LIB).trim() : "";
    let n053 = d.N053_LIB ? String(d.N053_LIB).trim() : "";
    let pays = d.COMEXVIANDE_DIM2_LIB ? String(d.COMEXVIANDE_DIM2_LIB).trim() : "";
    
    // 2. Filtre de sécurité : on ignore les lignes de totaux mensuels
    if (n053 === "Total annuel") return null;

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
        // Si on change manuellement le slider, on arrête l'animation
        stopAnimation();
        
        isAllYears = false; 
        d3.select("#btn-all-years").classed("active", false);
        currentYear = +this.value;
        updateYearUI();
        updateApp();
    });

    // Bouton Toutes les années
    d3.select("#btn-all-years").on("click", function() {
        // Si on clique sur "Toutes les années", on arrête l'animation
        stopAnimation();
        
        isAllYears = !isAllYears;
        d3.select(this).classed("active", isAllYears);
        updateYearUI();
        updateApp();
    });
    
    // Bouton Play/Pause
    d3.select("#play_btn").on("click", function() {
        if (isPlaying) {
            stopAnimation();
        } else {
            startAnimation();
        }
    });

    // Écouteur sur le switch "Monde"
    d3.select("#exclude-world").on("change", updateApp);

    // Écouteur sur les chips viande (multi-sélection avec toggle)
    d3.selectAll('input[name="viande"]').on("change", function(event) {
        const value = this.value;
        const isAllChip = value === "all";

        if (isAllChip) {
            // Cliquer "Toutes" → tout décocher sauf "Toutes", toujours coché
            d3.selectAll('input[name="viande"]').property("checked", false);
            d3.select('.meat-chip-all input').property("checked", true);
        } else {
            // Décocher "Toutes" si on sélectionne une viande spécifique
            d3.select('.meat-chip-all input').property("checked", false);

            // Vérifier s'il reste au moins une viande cochée
            const anyChecked = d3.selectAll('input[name="viande"]:checked').nodes()
                .some(n => n.value !== "all");

            if (!anyChecked) {
                // Plus rien de coché → retour à "Toutes"
                d3.select('.meat-chip-all input').property("checked", true);
            }
        }

        updateApp();
    });

    // Écouteurs pour le panneau focus pays
    document.addEventListener('country-focus-changed', () => refreshCountryFocus());
    document.addEventListener('country-focus-cleared', () => clearCountryFocus());
}

function startAnimation() {
    // Récupère les années min et max
    const sliderNode = document.getElementById('year-slider');
    const minYear = +sliderNode.min;
    const maxYear = +sliderNode.max;
    
    // Si on est en mode "Toutes les années", on commence par la première année
    if (isAllYears) {
        currentYear = minYear;
        isAllYears = false;
        d3.select("#btn-all-years").classed("active", false);
    }
    
    // Si on est déjà à la fin, on recommence au début
    if (currentYear >= maxYear) {
        currentYear = minYear;
    }
    
    // Marque comme en cours de lecture
    isPlaying = true;
    d3.select("#play_btn").classed("playing", true);
    
    // Fonction de mise à jour d'une année
    const nextYear = () => {
        currentYear++;
        
        // Met à jour le slider
        d3.select("#year-slider").property("value", currentYear);
        
        updateYearUI();
        updateApp();
        
        // Si on atteint la dernière année, on arrête
        if (currentYear >= maxYear) {
            stopAnimation();
        }
    };
    
    // Premier changement immédiat
    nextYear();
    
    // Puis continue avec un intervalle
    playInterval = setInterval(nextYear, 400); // Vitesse : 400ms par année
}

function stopAnimation() {
    if (playInterval) {
        clearInterval(playInterval);
        playInterval = null;
    }
    isPlaying = false;
    d3.select("#play_btn").classed("playing", false);
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

// Retourne le Set des viandes sélectionnées, ou null si "Toutes"
function getSelectedMeats() {
    const checked = d3.selectAll('input[name="viande"]:checked').nodes().map(n => n.value);
    if (checked.includes("all") || checked.length === 0) return null; // null = toutes viandes
    return new Set(checked);
}

function updateApp() {
    const indicateur = d3.select('input[name="indicateur"]:checked').node().value;
    const excludeWorld = d3.select("#exclude-world").property("checked");

    console.log(`Filtrage : Année=${isAllYears ? 'Toutes' : currentYear}, Indicateur=${indicateur}`);
    console.log("d.COMEXVIANDE_DIM2_LIBunique :", [...new Set(globalData.map(d => d.COMEXVIANDE_DIM2_LIB))].slice(0, 10));

    // Filtre viande (multi-sélection)
    // Si "Toutes" → on utilise la ligne TOTAL VIANDES du CSV
    // Si viandes spécifiques → on filtre par ces viandes (en excluant TOTAL VIANDES)
    const selectedMeats = getSelectedMeats(); // Set ou null
    const matchMeat = (d) => {
        if (selectedMeats === null) return d.N500_LIB === "TOTAL VIANDES";
        return selectedMeats.has(d.N500_LIB);
    };

    let filteredData = globalData.filter(d => {
        const matchYear = isAllYears ? true : (d.ANNREF === currentYear);
        let matchWorld = true;
        if (excludeWorld) {
            matchWorld = d.COMEXVIANDE_DIM2_LIB !== "Monde" && d.COMEXVIANDE_DIM2_LIB !== "_UE" && d.COMEXVIANDE_DIM2_LIB !== "_PAYS TIERS";
        }
        return matchYear && matchWorld && matchMeat(d);
    });

    // Conversion k€ → € pour les indicateurs en euros
    const isEuro = indicateur.includes("(€)");
    const multiplyEuro = (arr) => arr.map(d => {
        const copy = { ...d };
        Object.keys(copy).forEach(key => {
            if (key.includes("(€)")) {
                copy[key] = copy[key] * 1000;
            }
        });
        return copy;
    });
    if (isEuro) {
        filteredData = multiplyEuro(filteredData);
    }

    // Debug pour voir si des données sortent après filtre
    console.log("Nombre de lignes après filtre :", filteredData.length);

    // Données pour le ranking : toutes les années mais avec filtre monde
    let rankingData = globalData.filter(d => {
        let matchWorld = true;
        if (excludeWorld) {
            matchWorld = d.COMEXVIANDE_DIM2_LIB !== "Monde" && d.COMEXVIANDE_DIM2_LIB !== "_UE" && d.COMEXVIANDE_DIM2_LIB !== "_PAYS TIERS";
        }
        return matchWorld && matchMeat(d);
    });

    // scaleData : filtré par année + viande, TOUJOURS hors Monde/UE/Pays tiers
    let scaleData = globalData.filter(d => {
        const matchYear = isAllYears ? true : (d.ANNREF === currentYear);
        const isCountry = d.COMEXVIANDE_DIM2_LIB !== "Monde" && d.COMEXVIANDE_DIM2_LIB !== "_UE" && d.COMEXVIANDE_DIM2_LIB !== "_PAYS TIERS";
        return matchYear && isCountry && matchMeat(d);
    });

    // Appliquer la même conversion k€→€ au scaleData pour cohérence légende/couleurs
    if (isEuro) {
        scaleData = multiplyEuro(scaleData);
    }

    drawWorldMap(filteredData, indicateur, "#map-background", globalData, scaleData);
    updateRanking(rankingData, indicateur, currentYear, isAllYears);
    refreshCountryFocus();
}

function refreshCountryFocus() {
    const focused = getFocusedCountry();
    if (focused) {
        const indicateur = d3.select('input[name="indicateur"]:checked').node().value;
        const selectedMeats = getSelectedMeats(); // Set ou null
        const excludeWorld = d3.select("#exclude-world").property("checked");
        updateCountryFocus(focused, globalData, indicateur, selectedMeats,
                           currentYear, isAllYears, excludeWorld, () => clearFocus());
    }
}