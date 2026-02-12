// js/ranking.js

const cleanName = (name) => name.replace(/^_+/, "").replace(/_/g, " ");

const RANK_COLORS = [
    "#e74c3c", "#3498db", "#2ecc71", "#f39c12", "#d3b5df",
    "#8e44ad", "#e67e22", "#34495e", "#c0392b", "#16a085",
    "#27ae60", "#2980b9", "#8b4513", "#d35400", "#7f8c8d"
];

const TOP_N = 5; // On affiche les rangs 1 à 5

export function updateRanking(allData, indicateur, currentYear, isAllYears) {
    const container = d3.select("#ranking-list");
    container.html(""); // Nettoyer

    // 1. Récupérer toutes les années
    const years = [...new Set(allData.map(d => d.ANNREF))].sort((a, b) => a - b);

    if (years.length === 0) {
        container.html("<p style='text-align:center;color:#888'>Aucune donnée disponible</p>");
        return;
    }

    // 2. Pour chaque année, agréger par pays, trier, garder SEULEMENT le top N
    const rankingsByYear = new Map();

    years.forEach(year => {
        const yearData = allData.filter(d => d.ANNREF === year && d[indicateur] != null);
        const byCountry = d3.rollup(
            yearData,
            v => d3.sum(v, d => Math.abs(d[indicateur])),
            d => d.COMEXVIANDE_DIM2_LIB
        );

        let ranked = Array.from(byCountry, ([country, value]) => ({ country, value }))
            .sort((a, b) => b.value - a.value);

        ranked.forEach((d, i) => d.rank = i + 1);

        // Ne garder que le top N pour cette année
        rankingsByYear.set(year, ranked.filter(d => d.rank <= TOP_N));
    });

    // 3. Collecter TOUS les pays qui apparaissent au moins une fois dans un top N
    const allTopCountries = new Set();
    rankingsByYear.forEach(ranked => {
        ranked.forEach(d => allTopCountries.add(d.country));
    });

    // Trier par total cumulé (juste pour l'ordre d'attribution des couleurs)
    const totalByCountry = d3.rollup(
        allData.filter(d => d[indicateur] != null),
        v => d3.sum(v, d => Math.abs(d[indicateur])),
        d => d.COMEXVIANDE_DIM2_LIB
    );

    const sortedCountries = [...allTopCountries]
        .sort((a, b) => (totalByCountry.get(b) || 0) - (totalByCountry.get(a) || 0));

    // Assigner une couleur à chaque pays
    const colorMap = new Map();
    sortedCountries.forEach((c, i) => colorMap.set(c, RANK_COLORS[i % RANK_COLORS.length]));

    // 4. Construire les séries — uniquement les années où le pays est dans le top N
    const series = sortedCountries.map(country => {
        return {
            country,
            color: colorMap.get(country),
            values: years
                .map(year => {
                    const yearRanking = rankingsByYear.get(year);
                    const entry = yearRanking ? yearRanking.find(d => d.country === country) : null;
                    return entry ? { year, rank: entry.rank, value: entry.value } : null;
                })
                .filter(d => d !== null)
        };
    }).filter(s => s.values.length > 0);

    // 5. Dimensions du graphique (moitié hauteur)
    const margin = { top: 15, right: 10, bottom: 30, left: 25 };
    const rect = container.node().getBoundingClientRect();
    const width = Math.max(rect.width - margin.left - margin.right - 5, 200);
    const maxH = rect.height * 0.5;
    const height = Math.max(maxH - margin.top - margin.bottom, 120);

    // 6. Créer le SVG
    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // 7. Échelles
    const x = d3.scaleLinear()
        .domain(d3.extent(years))
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([1, TOP_N])
        .range([0, height]);

    // 8. Axes
    svg.append("g")
        .attr("class", "rank-axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x)
            .tickFormat(d3.format("d"))
            .ticks(Math.min(years.length, 8))
        );

    svg.append("g")
        .attr("class", "rank-axis")
        .call(d3.axisLeft(y)
            .ticks(TOP_N)
            .tickFormat(d => `#${d}`)
        );

    // Grille horizontale légère
    svg.selectAll(".grid-line")
        .data(d3.range(1, TOP_N + 1))
        .enter()
        .append("line")
        .attr("class", "grid-line")
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", d => y(d))
        .attr("y2", d => y(d))
        .attr("stroke", "#eee")
        .attr("stroke-dasharray", "3,3");

    // 9. Ligne verticale pour l'année sélectionnée
    if (!isAllYears && currentYear >= years[0] && currentYear <= years[years.length - 1]) {
        svg.append("line")
            .attr("class", "year-marker")
            .attr("x1", x(currentYear))
            .attr("x2", x(currentYear))
            .attr("y1", 0)
            .attr("y2", height)
            .attr("stroke", "rgba(231, 76, 60, 0.4)")
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "6,3");

        svg.append("text")
            .attr("x", x(currentYear))
            .attr("y", -5)
            .attr("text-anchor", "middle")
            .attr("font-size", "0.7rem")
            .attr("fill", "#e74c3c")
            .attr("font-weight", "bold")
            .text(currentYear);
    }

    // 10. Dessiner les lignes (segments continus seulement entre années consécutives)
    const tooltip = container.append("div")
        .attr("class", "rank-tooltip")
        .style("opacity", 0);

    series.forEach(s => {
        // Découper en segments continus (années consécutives)
        const segments = [];
        let currentSegment = [s.values[0]];

        for (let i = 1; i < s.values.length; i++) {
            if (s.values[i].year - s.values[i - 1].year === 1) {
                currentSegment.push(s.values[i]);
            } else {
                segments.push(currentSegment);
                currentSegment = [s.values[i]];
            }
        }
        segments.push(currentSegment);

        const line = d3.line()
            .x(d => x(d.year))
            .y(d => y(d.rank))
            .curve(d3.curveMonotoneX);

        // Dessiner chaque segment
        segments.forEach(seg => {
            if (seg.length >= 2) {
                svg.append("path")
                    .datum(seg)
                    .attr("fill", "none")
                    .attr("stroke", s.color)
                    .attr("stroke-width", 2)
                    .attr("stroke-linecap", "round")
                    .attr("d", line)
                    .attr("opacity", 0.8);
            }
        });

        // Points
        svg.selectAll(null)
            .data(s.values)
            .enter()
            .append("circle")
            .attr("cx", d => x(d.year))
            .attr("cy", d => y(d.rank))
            .attr("r", 2.5)
            .attr("fill", s.color)
            .attr("stroke", "none")
            .style("cursor", "pointer")
            .on("mouseover", function (event, d) {
                d3.select(this).attr("r", 5).attr("stroke", s.color).attr("stroke-width", 2).attr("fill", "white");
                tooltip
                    .style("opacity", 1)
                    .html(`<strong>${cleanName(s.country)}</strong><br/>
                           ${d.year} — Rang #${d.rank}<br/>
                           ${d3.format(",.0f")(d.value)}`)
                    .style("left", (event.offsetX + 10) + "px")
                    .style("top", (event.offsetY - 30) + "px");
            })
            .on("mouseout", function () {
                d3.select(this).attr("r", 2.5).attr("stroke", "none").attr("fill", s.color);
                tooltip.style("opacity", 0);
            });
    });

    // 11. Légende dédiée en dessous du graphique (tous les pays, même ceux sortis du top)
    const legendY = height + margin.top + margin.bottom + 5;
    const legendCols = 2;
    const colWidth = (width + margin.left + margin.right) / legendCols;
    const legendItemH = 16;

    const legendG = container.select("svg")
        .attr("height", height + margin.top + margin.bottom + 10 + Math.ceil(series.length / legendCols) * legendItemH)
        .append("g")
        .attr("transform", `translate(${margin.left}, ${legendY})`);

    series.forEach((s, i) => {
        const col = i % legendCols;
        const row = Math.floor(i / legendCols);

        const g = legendG.append("g")
            .attr("transform", `translate(${col * colWidth}, ${row * legendItemH})`);

        g.append("line")
            .attr("x1", 0).attr("x2", 16)
            .attr("y1", 0).attr("y2", 0)
            .attr("stroke", s.color)
            .attr("stroke-width", 2)
            .attr("stroke-linecap", "round");

        g.append("circle")
            .attr("cx", 8).attr("cy", 0).attr("r", 2.5)
            .attr("fill", s.color);

        g.append("text")
            .attr("x", 22).attr("y", 0)
            .attr("dy", "0.35em")
            .attr("font-size", "0.6rem")
            .attr("fill", "#444")
            .text(cleanName(s.country));
    });
}