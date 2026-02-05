// js/ranking.js

export function updateRanking(data, indicateur) {
    const container = d3.select("#ranking-list");
    container.html(""); // Nettoyer

    // 1. Agréger par Pays (Comme pour la carte)
    const dataByCountry = d3.rollup(
        data.filter(d => d[indicateur] != null),
        v => d3.sum(v, d => Math.abs(d[indicateur])),
        d => d.COMEXVIANDE_DIM2_LIB
    );

    // 2. Convertir en tableau et Trier
    // On veut trier du plus grand au plus petit
    let rankedData = Array.from(dataByCountry, ([country, value]) => ({ country, value }))
        .sort((a, b) => b.value - a.value);

    // On coupe pour ne garder que le top 20
    const top20 = rankedData.slice(0, 20);

    // 3. Générer le HTML
    if (top20.length === 0) {
        container.html("<p style='text-align:center;color:#888'>Aucune donnée disponible</p>");
        return;
    }

    // Mapping simple pour nettoyer les noms (enlever les "__")
    // On pourrait importer celui de worldMap, mais un simple replace suffit ici pour l'affichage
    const cleanName = (name) => {
        return name.replace(/^__/, "").replace(/_/g, " ");
    };

    // Création de la liste
    const items = container.selectAll("div.ranking-item")
        .data(top20)
        .enter()
        .append("div")
        .attr("class", "ranking-item");

    items.append("span")
        .attr("class", "rank-index")
        .text((d, i) => i + 1 + ".");

    items.append("span")
        .attr("class", "rank-name")
        .text(d => cleanName(d.country));

    items.append("span")
        .attr("class", "rank-value")
        .text(d => d3.format(".2s")(d.value)); // Format court (1.2M, 500k)
}