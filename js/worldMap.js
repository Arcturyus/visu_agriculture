// js/worldMap.js

// --- VARIABLES GLOBALES (Pour garder la mémoire entre deux mises à jour) ---
let svg, g, path, projection;
let countriesSelection; // Pour stocker les chemins des pays
let isMapLoaded = false; // Pour savoir si la carte est prête

// --- PAYS FOCUSED ---
let focusedCountryName = null; // Nom CSV du pays focus
let focusedOverlay = null;     // Groupe SVG pour l'overlay animé

// --- FONCTION PRINCIPALE ---
export function drawWorldMap(data, indicateur, containerId) {
    const container = d3.select(containerId);
    const width = window.innerWidth;
    const height = window.innerHeight;

    // ÉTAPE 1 : INITIALISATION (Seulement si la carte n'existe pas encore)
    if (!isMapLoaded) {
        console.log("--- Initialisation de la carte (Première fois) ---");
        
        // 1. Création du SVG
        container.selectAll("*").remove(); // On nettoie juste la première fois
        svg = container.append("svg")
            .attr("width", width)
            .attr("height", height)
            .style("background", "#aadaff"); // Océan

        g = svg.append("g");

        // 2. Projection
        projection = d3.geoNaturalEarth1()
            .scale(width / 6)
            .translate([width / 2, height / 2]);

        path = d3.geoPath().projection(projection);

        // 3. Gestion du Zoom
        const zoom = d3.zoom()
            .scaleExtent([1, 20])
            .on("zoom", (event) => {
                g.attr("transform", event.transform);
                g.selectAll("path.country").attr("stroke-width", 0.5 / event.transform.k);
                // Adapter l'épaisseur du focus overlay au zoom
                g.selectAll(".focus-solid").attr("stroke-width", 1.6 / event.transform.k);
                g.selectAll(".focus-border").attr("stroke-width", 0.8 / event.transform.k);
                g.selectAll(".focus-border-secondary").attr("stroke-width", 0.6 / event.transform.k);
                g.selectAll(".focus-glow").attr("stroke-width", 4 / event.transform.k);
            });
        svg.call(zoom);

        // 4. Chargement du GeoJSON (Une seule fois !)
        d3.json("data/world.geojson").then(geojson => {
            console.log("GeoJSON chargé.");

            // Dessin des pays (en gris au début)
            countriesSelection = g.selectAll("path")
                .data(geojson.features)
                .enter()
                .append("path")
                .attr("class", "country") // Classe pour le CSS
                .attr("d", path)
                .attr("fill", "#ececec") // Gris par défaut
                .attr("stroke", "#999")
                .attr("stroke-width", 0.5);

            // Ajout des événements Souris (Tooltip + Click focus)
            initTooltips();
            initClickFocus();

            // Groupe overlay pour le pays focused (par dessus les pays)
            focusedOverlay = g.append("g").attr("class", "focused-overlay");

            // Zoom Initial sur l'Europe
            const europeCenter = projection([10, 50]); 
            const initialScale = 3.5;
            const x = -europeCenter[0] * initialScale + width / 2;
            const y = -europeCenter[1] * initialScale + height / 2;
            
            svg.call(zoom.transform, d3.zoomIdentity.translate(x, y).scale(initialScale));

            // Marqueur que la carte est prête
            isMapLoaded = true;

            // MAINTENANT on applique les couleurs
            updateColors(data, indicateur);
        }).catch(err => console.error("Erreur GeoJSON:", err));

    } else {
        // ÉTAPE 2 : MISE À JOUR (Si la carte existe déjà)
        // On ne redessine pas tout, on change juste les couleurs !
        updateColors(data, indicateur);
    }
}

// --- FONCTION DE MISE À JOUR DES COULEURS (ANIMATION) ---
function updateColors(data, indicateur) {
    if (!countriesSelection) return; // Sécurité si le JSON n'est pas fini de charger

    console.log("Mise à jour des couleurs pour :", indicateur);

    // 1. Agrégation des données
    const dataByCountry = d3.rollup(
        data.filter(d => d[indicateur] != null),
        v => d3.sum(v, d => Math.abs(d[indicateur])),
        d => d.COMEXVIANDE_DIM2_LIB
    );

    // 2. Calcul de l'échelle de couleur
    const values = Array.from(dataByCountry.values()).filter(v => v > 0);
    const maxVal = d3.max(values) || 1; // Evite division par 0
    
    const colorScale = d3.scaleSequential(d => d3.interpolateYlOrRd(Math.pow(d / maxVal, 0.5))); // 0.5 pour éclaircir un peu

    // 3. Application des couleurs avec TRANSITION
    countriesSelection
        .transition() // <--- C'est ici que la magie opère
        .duration(750) // Durée de l'animation en ms (0.75s)
        .ease(d3.easeCubicOut) // Type de mouvement fluide
        .attr("fill", function(d) {
            // Mapping Nom GeoJSON -> Nom CSV
            const mapping = getCountryMapping();
            const countryNameGeo = d.properties.name;
            const csvName = mapping[countryNameGeo] || countryNameGeo;
            
            const val = dataByCountry.get(csvName) || 0;
            
            // On stocke la valeur DANS l'élément DOM pour le tooltip
            // (Comme ça le tooltip affiche la valeur de l'année en cours)
            this._currentValue = val; 
            
            return val > 0 ? colorScale(val) : "#ececec"; // Gris si 0
        });
}

// --- GESTION DU CLICK FOCUS ---
function initClickFocus() {
    countriesSelection.on("click", function(event, d) {
        const mapping = getCountryMapping();
        const countryNameGeo = d.properties.name;
        const csvName = mapping[countryNameGeo] || countryNameGeo;
        const val = this._currentValue || 0;

        // Toggle : si on re-clique sur le même pays, on défocus
        if (focusedCountryName === csvName) {
            clearFocus();
            return;
        }

        focusedCountryName = csvName;

        // Overlay animé
        drawFocusedBorder(d);

        // Mise à jour du panneau info
        updateInfoPanel(countryNameGeo, csvName, val);
    });
}

// Efface le focus
export function clearFocus() {
    focusedCountryName = null;
    if (focusedOverlay) focusedOverlay.selectAll("*").remove();
    d3.select("#info-country-focused").html("");
}

export function getFocusedCountry() {
    return focusedCountryName;
}

// Dessine la bordure animée autour du pays
function drawFocusedBorder(feature) {
    if (!focusedOverlay) return;
    focusedOverlay.selectAll("*").remove();

    // Glow léger
    focusedOverlay.append("path")
        .datum(feature)
        .attr("d", path)
        .attr("class", "focus-glow");

    // Bordure solide classique (focus principal visible)
    focusedOverlay.append("path")
        .datum(feature)
        .attr("d", path)
        .attr("class", "focus-solid");

    // Filet animé très lent par dessus
    focusedOverlay.append("path")
        .datum(feature)
        .attr("d", path)
        .attr("class", "focus-border");

    // Deuxième filet subtil
    focusedOverlay.append("path")
        .datum(feature)
        .attr("d", path)
        .attr("class", "focus-border-secondary");
}

// Met à jour le panneau info pays
function updateInfoPanel(geoName, csvName, value) {
    const cleanName = csvName.replace(/^_+/, "").replace(/_/g, " ");
    const panel = d3.select("#info-country-focused");

    panel.html(`
        <div class="focused-country-card">
            <div class="focused-country-header">
                <i class="fas fa-map-marker-alt focused-icon"></i>
                <span class="focused-country-name">${cleanName}</span>
            </div>
            <div class="focused-country-value">
                <span class="focused-label">Valeur actuelle</span>
                <span class="focused-number">${d3.format(",.0f")(value)}</span>
            </div>
            <button class="btn-clear-focus" onclick="document.dispatchEvent(new Event('clear-focus'))">
                <i class="fas fa-times"></i> Retirer le focus
            </button>
        </div>
    `);

    // Listener pour le bouton
    panel.select(".btn-clear-focus").on("click", () => clearFocus());
}

// --- GESTION DES TOOLTIPS ---
function initTooltips() {
    const tooltip = d3.select("#map-tooltip");

    countriesSelection
        .on("mouseover", function(event, d) {
            // Récupérer la valeur stockée lors de l'updateColors
            const val = this._currentValue || 0;
            
            tooltip.style("opacity", 1)
                   .html(`
                       <div style='font-weight:bold; margin-bottom:5px;'>${d.properties.name}</div>
                       <div style='color:#e74c3c;'>${d3.format(",.0f")(val)}</div>
                   `);
        })
        .on("mousemove", function(event) {
            tooltip.style("left", (event.pageX + 15) + "px")
                   .style("top", (event.pageY - 15) + "px");
        })
        .on("mouseout", function() {
            tooltip.style("opacity", 0);
        });
}

// --- MAPPING PAYS (INCHANGÉ) ---
function getCountryMapping() {
    return {
        "Algeria": "__Algerie",
        "Germany": "__Allemagne",
        "Saudi Arabia": "__Arabie saoudite",
        "Argentina": "__Argentine",
        "Australia": "__Australie",
        "Austria": "__Autriche",
        "Belgium": "__Belgique",
        "Benin": "__Benin",
        "Brazil": "__Bresil",
        "Bulgaria": "__Bulgarie",
        "Canada": "__Canada",
        "Chile": "__Chili",
        "Cyprus": "__Chypre",
        "Congo": "__Congo",
        "South Korea": "__Coree Du Sud",
        "Korea": "__Coree Du Sud",
        "Croatia": "__Croatie",
        "Denmark": "__Danemark",
        "Egypt": "__Egypte",
        "United Arab Emirates": "__Emirats Arabes Unis",
        "Spain": "__Espagne (y compris Canaries)",
        "Estonia": "__Estonie",
        "England": "__Royaume-uni",
        "Finland": "__Finlande",
        "Gabon": "__Gabon",
        "Ghana": "__Ghana",
        "Greece": "__Grèce",
        "Hong Kong": "__Hong-kong",
        "Hungary": "__Hongrie",
        "Ireland": "__Irlande",
        "Italy": "__Italie",
        "Japan": "__Japon",
        "Kuwait": "__Koweit",
        "Latvia": "__Lettonie",
        "Lithuania": "__Lituanie",
        "Luxembourg": "__Luxembourg",
        "Malta": "__Malte",
        "Morocco": "__Maroc",
        "New Zealand": "__Nouvelle-zelande",
        "Oman": "__Oman",
        "Netherlands": "__Pays-Bas",
        "Philippines": "__Philippines",
        "Poland": "__Pologne",
        "Portugal": "__Portugal",
        "Qatar": "__Qatar",
        "Democratic Republic of the Congo": "__Republique Democratique Du Congo",
        "Dem. Rep. Congo": "__Republique Democratique Du Congo",
        "China": "__Republique Populaire De Chine",
        "Romania": "__Roumanie",
        "United Kingdom": "__Royaume-uni",
        "Russia": "__Russie",
        "Czech Republic": "__République tchèque",
        "Czechia": "__République tchèque",
        "Singapore": "__Singapour",
        "Slovakia": "__Slovaquie",
        "Slovenia": "__Slovénie",
        "Switzerland": "__Suisse",
        "Sweden": "__Suède",
        "Thailand": "__Thailande",
        "Togo": "__Togo",
        "Ukraine": "__Ukraine",
        "Uruguay": "__Uruguay",
        "Vietnam": "__Vietnam",
        "Yemen": "__Yemen",
        "United States of America": "__Etats-Unis",
        "United States": "__Etats-Unis",
        "USA": "__Etats-Unis",
        "France": "France"
    };
}