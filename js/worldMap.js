// js/worldMap.js

export function drawWorldMap(data, indicateur, containerId) {
    const container = d3.select(containerId);
    
    // Récupération des dimensions de la fenêtre
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Nettoyage
    container.selectAll("*").remove();

    console.log("--- Initialisation de la carte ---");
    console.log(`Dimensions: ${width}x${height}`);

    // 1. Préparation des données (Agrégation)
    const dataByCountry = d3.rollup(
        data.filter(d => d[indicateur] != null),
        v => d3.sum(v, d => Math.abs(d[indicateur])),
        d => d.COMEXVIANDE_DIM2_LIB
    );

    // 2. Création du SVG
    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("background", "#aadaff"); // Couleur Océan

    // Groupe qui contiendra la carte (pour le zoom)
    const g = svg.append("g");

    // 3. Projection
    // On centre la projection initialement au milieu de l'écran
    const projection = d3.geoNaturalEarth1()
        .scale(width / 6) 
        .translate([width / 2, height / 2]);

    const path = d3.geoPath().projection(projection);

    // 4. Échelle de couleur
    const values = Array.from(dataByCountry.values()).filter(v => v > 0);
    const maxVal = d3.max(values) || 0;
    
    // Échelle logarithmique/puissance pour mieux voir les écarts
    const colorScale = d3.scaleSequential(d => d3.interpolateYlOrRd(Math.pow(d / maxVal, 0.4)));

    // 5. Chargement du GeoJSON
    d3.json("data/world.geojson").then(geojson => {
        console.log("GeoJSON chargé avec succès.", geojson.features.length, "pays trouvés.");

        // --- DESSIN DES PAYS ---
        const countries = g.selectAll("path")
            .data(geojson.features)
            .enter()
            .append("path")
            .attr("d", path)
            .attr("fill", d => {
                // Récupération du mapping
                const mapping = getCountryMapping();
                const countryNameGeo = d.properties.name;
                const csvName = mapping[countryNameGeo] || countryNameGeo;
                
                const val = dataByCountry.get(csvName) || 0;
                d.totalValue = val; // On stocke la valeur pour le tooltip

                // Si pas de valeur -> Gris clair, Sinon -> Couleur
                return val > 0 ? colorScale(val) : "#f0f0f0";
            })
            .attr("stroke", "#999")
            .attr("stroke-width", 0.5)
            .style("cursor", "pointer");

        // --- GESTION DU TOOLTIP ---
        const tooltip = d3.select("#map-tooltip");

        countries.on("mouseover", function(event, d) {
            d3.select(this)
                .attr("stroke", "#333")
                .attr("stroke-width", 1.5)
                .raise(); // Met le pays au dessus des autres

            tooltip.style("opacity", 1)
                   .html(`<strong>${d.properties.name}</strong><br>
                          ${d3.format(",.0f")(d.totalValue)}`);
        })
        .on("mousemove", function(event) {
            tooltip.style("left", (event.pageX + 15) + "px")
                   .style("top", (event.pageY - 15) + "px");
        })
        .on("mouseout", function() {
            d3.select(this)
                .attr("stroke", "#999")
                .attr("stroke-width", 0.5); // Remet l'épaisseur fine
            tooltip.style("opacity", 0);
        });

        // --- CONFIGURATION DU ZOOM ---
        const zoom = d3.zoom()
            .scaleExtent([1, 20]) // Zoom min x1, max x20
            .on("zoom", (event) => {
                g.attr("transform", event.transform);
                // Ajustement sémantique : les bordures restent fines même quand on zoome
                g.selectAll("path").attr("stroke-width", 0.5 / event.transform.k);
            });

        svg.call(zoom);

        // --- ZOOM AUTOMATIQUE SUR L'EUROPE ---
        // Coordonnées approximatives de l'Europe centrale (Long: 10, Lat: 50)
        // La projection convertit (Long, Lat) -> (Pixels X, Pixels Y)
        const europeCenter = projection([10, 50]); 
        
        // Paramètres du zoom initial
        const initialScale = 3.5; // Grossissement x3.5
        
        // Calcul pour centrer ce point précis à l'écran
        const x = -europeCenter[0] * initialScale + width / 2;
        const y = -europeCenter[1] * initialScale + height / 2;

        // Application de la transformation
        svg.call(zoom.transform, d3.zoomIdentity
            .translate(x, y)
            .scale(initialScale)
        );

    }).catch(err => {
        console.error("Erreur chargement GeoJSON:", err);
        container.append("div")
            .style("color", "red")
            .style("padding", "20px")
            .style("background", "white")
            .html("Impossible de charger la carte (data/world.geojson introuvable ?)");
    });
}

// --- FONCTION DE MAPPING (INTEGRÉE) ---
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