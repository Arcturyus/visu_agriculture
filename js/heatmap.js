/**
 * PROJET DATAVIZ - Analyse du commerce de la viande
 * Fichier principal : Gestion des filtres et rendu de la Heatmap
 */

// 1. Configuration des dimensions
const margin = { top: 60, right: 50, bottom: 100, left: 250 };
const width = 1000 - margin.left - margin.right;
const height = 650 - margin.top - margin.bottom;

// Listes de référence pour l'ordre et les libellés
const ordresMois = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin", 
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

/**
 * Fonction de dessin D3
 */
export function drawHeatmap(data, indicateur, modeTemps) {
    const container = d3.select("#chart-container");
    container.selectAll("*").remove();

    if (data.length === 0) {
        container.append("p").text("Aucune donnée disponible pour ces filtres.");
        return;
    }

    // --- PRÉPARATION DES DONNÉES POUR LA HEATMAP ---
    
    // 1. Identifier le Top 8 des viandes par volume absolu pour cet indicateur
    const meatAggregated = d3.rollup(
        data.filter(d => d[indicateur] != null),
        v => d3.sum(v, d => Math.abs(d[indicateur])),
        d => d.N500_LIB
    );

    const top8Meats = Array.from(meatAggregated.keys())
        .sort((a, b) => meatAggregated.get(b) - meatAggregated.get(a))
        .slice(0, 8);

    // 2. Calculer la moyenne par viande et par mois
    const heatmapDataMap = d3.rollup(
        data.filter(d => top8Meats.includes(d.N500_LIB) && d[indicateur] != null),
        v => d3.mean(v, d => d[indicateur]),
        d => d.N500_LIB,
        d => d.N053_LIB
    );

    const flatData = [];
    heatmapDataMap.forEach((moisMap, type) => {
        moisMap.forEach((value, mois) => {
            flatData.push({ type, mois, value });
        });
    });

    // --- CONSTRUCTION DU DOMAINE X (SYNCHRONISÉ) ---
    let xDomain = [];
    if (modeTemps === "uniquement") {
        xDomain = ["TOTAL Annuel"];
    } else if (modeTemps === "inclure") {
        xDomain = [...ordresMois, "TOTAL Annuel"];
    } else {
        xDomain = ordresMois;
    }

    // Filtrer flatData pour ne garder que ce qui est dans le domaine (évite les décalages)
    const finalData = flatData.filter(d => xDomain.includes(d.mois));

    // --- SCALES (ÉCHELLES) ---
    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
        .range([0, width])
        .domain(xDomain)
        .padding(0.05);

    const y = d3.scaleBand()
        .range([height, 0])
        .domain(top8Meats)
        .padding(0.05);

    // Choix de la couleur
    const maxVal = d3.max(finalData, d => d.value) || 0;
    const minVal = d3.min(finalData, d => d.value) || 0;

    let colorScale;
    if (indicateur.toLowerCase().includes("solde")) {
        // Échelle divergente pour les soldes (Rouge = Déficit, Bleu = Excédent)
        const limit = Math.max(Math.abs(minVal), Math.abs(maxVal));
        colorScale = d3.scaleSequential()
            .interpolator(d3.interpolateRdBu)
            .domain([-limit, limit]);
    } else {
        // Échelle séquentielle pour Export/Import (Jaune à Bleu)
        colorScale = d3.scaleSequential()
            .interpolator(d3.interpolateYlGnBu)
            .domain([minVal, maxVal]);
    }

    // --- AXES ---
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "translate(-10,0)rotate(-30)")
        .style("text-anchor", "end")
        .style("font-size", "12px");

    svg.append("g")
        .call(d3.axisLeft(y))
        .style("font-size", "12px");

    // --- DESSIN DES CELLULES ---
    svg.selectAll(".cell")
        .data(finalData)
        .enter()
        .append("rect")
        .attr("class", "cell")
        .attr("x", d => x(d.mois))
        .attr("y", d => y(d.type))
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .style("fill", d => colorScale(d.value))
        .style("stroke", d => d.mois === "TOTAL Annuel" ? "#333" : "#fff")
        .style("stroke-width", d => d.mois === "TOTAL Annuel" ? "2px" : "1px")
        .style("opacity", 0)
        .transition()
        .duration(600)
        .style("opacity", 1);

    // --- AFFICHAGE DES VALEURS ---
    svg.selectAll(".cell-text")
        .data(finalData)
        .enter()
        .append("text")
        .attr("class", "cell-text")
        .attr("x", d => x(d.mois) + x.bandwidth() / 2)
        .attr("y", d => y(d.type) + y.bandwidth() / 2)
        .attr("dy", ".35em")
        .attr("text-anchor", "middle")
        .style("font-size", "10px")
        .style("font-weight", "bold")
        .style("pointer-events", "none")
        .style("fill", d => {
            // Contraste auto : blanc sur foncé, noir sur clair
            if (indicateur.toLowerCase().includes("solde")) {
                 return Math.abs(d.value) > (maxVal * 0.6) ? "white" : "black";
            }
            return (d.value - minVal) / (maxVal - minVal) > 0.6 ? "white" : "black";
        })
        .text(d => Math.round(d.value).toLocaleString('fr-FR'));

    // --- TITRE DU GRAPHIQUE ---
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -margin.top / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text(`${indicateur} (Moyenne par type et période)`);
}