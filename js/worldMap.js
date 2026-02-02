// js/worldMap.js

export function drawWorldMap(data, indicateur, containerId) {
    const width = 1000;
    const height = 600;

    const container = d3.select(containerId);
    container.selectAll("*").remove(); // Nettoyage

    // 1. Agréger les données par PAYS pour l'indicateur choisi
    // On somme toutes les valeurs (tous types de viande, tous mois) pour chaque pays
    const dataByCountry = d3.rollup(
        data.filter(d => d[indicateur] != null),
        v => d3.sum(v, d => Math.abs(d[indicateur])), // On prend la somme absolue
        d => d.COMEXVIANDE_DIM2_LIB // Colonne Pays du CSV
    );

    // 2. Création de la SVG
    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height);

    // 3. Projection : Natural Earth (plus joli que Mercator)
    const projection = d3.geoNaturalEarth1()
        .scale(200)
        .translate([width / 2, height / 2])
        .center([2, 47]); // Centré approximativement sur la France

    const path = d3.geoPath().projection(projection);

    // 4. Échelle de couleur
    const maxVal = d3.max(Array.from(dataByCountry.values())) || 0;
    
    const colorScale = d3.scaleSequential()
        .interpolator(d3.interpolateYlOrRd) // Jaune -> Orange -> Rouge
        .domain([0, maxVal / 10]); 

    // 5. Chargement du GeoJSON Monde
    d3.json("data/world.geojson").then(geojson => {

        // --- DESSIN DES PAYS ---
        svg.append("g")
            .selectAll("path")
            .data(geojson.features)
            .enter()
            .append("path")
            .attr("d", path)
            .attr("fill", d => {
                // Dictionnaire de correspondance GeoJSON (anglais) -> CSV (français avec __)
                const countryMapping = {
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
                    "Yemen": "__Yemen"
                };

                let countryNameGeo = d.properties.name;
                let csvCountryName = countryMapping[countryNameGeo] || countryNameGeo;
                let value = dataByCountry.get(csvCountryName) || 0;

                d.totalValue = value; // On stocke pour le tooltip
                return value > 0 ? colorScale(value) : "#dedede";
            })
            .attr("stroke", "#fff")
            .attr("stroke-width", 0.5)
            .style("cursor", "pointer")
            
            // --- INTERACTION ---
            .on("mouseover", function(event, d) {
                d3.select(this)
                    .attr("stroke", "black")
                    .attr("stroke-width", 1.5);

                const tooltip = d3.select("#map-tooltip");
                tooltip.style("opacity", 1)
                       .html(`<strong>${d.properties.name}</strong><br>
                              Volume: ${Math.round(d.totalValue).toLocaleString()} unit.`);
            })
            .on("mousemove", function(event) {
                d3.select("#map-tooltip")
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 20) + "px");
            })
            .on("mouseout", function() {
                d3.select(this)
                    .attr("stroke", "#fff")
                    .attr("stroke-width", 0.5);
                d3.select("#map-tooltip").style("opacity", 0);
            });

        // Zoom (Optionnel mais "Beau")
        const zoom = d3.zoom()
            .scaleExtent([1, 8])
            .on("zoom", (event) => {
                svg.selectAll("path").attr("transform", event.transform);
            });

        svg.call(zoom);

    });
}