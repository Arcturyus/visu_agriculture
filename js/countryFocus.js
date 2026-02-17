// js/countryFocus.js — Panneau "Pays sélectionné" : graphique temporel + stats multi-indicateurs

const INDICATEURS = [
    { key: "Exportations de viandes et préparations (téc)", label: "Exp. Tèc", icon: "fa-ship" },
    { key: "Exportations de viandes et préparations (€)",   label: "Exp. €",   icon: "fa-euro-sign" },
    { key: "Importation de viandes et préparations (téc)",  label: "Imp. Tèc", icon: "fa-box-open" },
    { key: "Importation de viandes et préparations (€)",    label: "Imp. €",   icon: "fa-hand-holding-usd" },
    { key: "Solde des échanges de viandes et préparations (téc)", label: "Solde Tèc", icon: "fa-balance-scale" },
    { key: "Solde des échanges de viandes et préparations (€)",   label: "Solde €",   icon: "fa-coins" }
];

function fmt(val) {
    if (val == null || isNaN(val)) return "–";
    const abs = Math.abs(val);
    const sign = val < 0 ? "−" : "";
    if (abs >= 1e9) return sign + (abs / 1e9).toFixed(1) + " Md";
    if (abs >= 1e6) return sign + (abs / 1e6).toFixed(1) + " M";
    if (abs >= 1e3) return sign + (abs / 1e3).toFixed(1) + " K";
    return Math.round(val).toLocaleString("fr-FR");
}

/* ───────── PUBLIC API ───────── */

export function clearCountryFocus() {
    d3.select("#info-country-focused").html(
        '<p class="helper-text" style="text-align:center; margin-top:10px;">Clique sur un pays de la carte</p>'
    );
}

export function updateCountryFocus(csvName, allData, currentIndicateur, selectedMeats,
                                    currentYear, isAllYears, excludeWorld, clearCallback) {
    const panel = d3.select("#info-country-focused");
    const name  = csvName.replace(/^_+/, "").replace(/_/g, " ");

    panel.html("");

    const card = panel.append("div").attr("class", "focus-card");

    /* ── Header ── */
    const hdr = card.append("div").attr("class", "focus-hdr");
    hdr.append("i").attr("class", "fas fa-map-marker-alt focus-pin");
    hdr.append("span").attr("class", "focus-name").text(name);
    const closeBtn = hdr.append("button").attr("class", "focus-close");
    closeBtn.append("i").attr("class", "fas fa-times");
    closeBtn.on("click", clearCallback);

    /* ── Body : chart | stats ── */
    const body     = card.append("div").attr("class", "focus-body");
    const chartBox = body.append("div").attr("class", "focus-chart");
    const statsBox = body.append("div").attr("class", "focus-stats");

    // Attendre que le flex-layout soit calculé avant de dessiner
    requestAnimationFrame(() => {
        drawChart(chartBox, csvName, allData, currentIndicateur, selectedMeats, currentYear, isAllYears);
        drawStats(statsBox, csvName, allData, currentIndicateur, currentYear, isAllYears, excludeWorld);
    });
}

/* ═══════════════════════  CHART  ═══════════════════════ */

function drawChart(container, csvName, allData, indicateur, selectedMeats, currentYear, isAllYears) {
    const match = d => selectedMeats === null || selectedMeats.has(d.N500_LIB);
    const rows  = allData.filter(d => d.COMEXVIANDE_DIM2_LIB === csvName && match(d));
    const byYr  = d3.rollup(rows, v => d3.sum(v, d => d[indicateur] || 0), d => d.ANNREF);
    const years = [...byYr.keys()].sort((a, b) => a - b);
    const pts   = years.map(yr => ({ year: yr, value: byYr.get(yr) || 0 }));

    if (!pts.length) {
        container.append("p").attr("class", "helper-text")
            .style("text-align", "center").style("margin-top", "20px")
            .text("Aucune donnée");
        return;
    }

    const box = container.node().getBoundingClientRect();
    const m   = { top: 18, right: 10, bottom: 22, left: 42 };
    const w   = Math.max(box.width  - m.left - m.right,  60);
    const h   = Math.max(box.height - m.top  - m.bottom, 50);

    const svg = container.append("svg")
        .attr("width",  w + m.left + m.right)
        .attr("height", h + m.top  + m.bottom)
      .append("g").attr("transform", `translate(${m.left},${m.top})`);

    /* Scales */
    const x   = d3.scaleLinear().domain(d3.extent(years)).range([0, w]);
    const ext = d3.extent(pts, d => d.value);
    const lo  = Math.min(0, ext[0]), hi = Math.max(0, ext[1]) || 1;
    const y   = d3.scaleLinear().domain([lo, hi]).nice().range([h, 0]);

    /* Gradient */
    const gid  = "fcg" + Math.random().toString(36).slice(2, 8);
    const defs = svg.append("defs");
    const grad = defs.append("linearGradient").attr("id", gid)
        .attr("x1","0%").attr("y1","0%").attr("x2","0%").attr("y2","100%");
    grad.append("stop").attr("offset","0%") .attr("stop-color","#e74c3c").attr("stop-opacity", 0.25);
    grad.append("stop").attr("offset","100%").attr("stop-color","#e74c3c").attr("stop-opacity", 0.02);

    /* Area */
    svg.append("path").datum(pts)
        .attr("fill", `url(#${gid})`)
        .attr("d", d3.area()
            .x(d => x(d.year)).y0(y(0)).y1(d => y(d.value))
            .curve(d3.curveMonotoneX));

    /* Line */
    svg.append("path").datum(pts)
        .attr("fill","none").attr("stroke","#e74c3c").attr("stroke-width", 2)
        .attr("d", d3.line().x(d => x(d.year)).y(d => y(d.value)).curve(d3.curveMonotoneX));

    /* Zero baseline (pour le solde) */
    if (lo < 0) {
        svg.append("line")
            .attr("x1",0).attr("x2",w).attr("y1",y(0)).attr("y2",y(0))
            .attr("stroke","#bbb").attr("stroke-width",0.5).attr("stroke-dasharray","3,3");
    }

    /* Marqueur année sélectionnée */
    if (!isAllYears) {
        const xp = x(currentYear);
        if (xp >= 0 && xp <= w) {
            svg.append("line")
                .attr("x1",xp).attr("x2",xp).attr("y1",0).attr("y2",h)
                .attr("stroke","#e74c3c").attr("stroke-width",1.5)
                .attr("stroke-dasharray","4,3").attr("opacity",0.4);
            const pt = pts.find(p => p.year === currentYear);
            if (pt) {
                svg.append("circle")
                    .attr("cx",xp).attr("cy",y(pt.value)).attr("r",4)
                    .attr("fill","#e74c3c").attr("stroke","#fff").attr("stroke-width",2);
                svg.append("text")
                    .attr("x",xp).attr("y", y(pt.value) - 9)
                    .attr("text-anchor","middle").attr("font-size","0.58rem")
                    .attr("font-weight","700").attr("fill","#e74c3c")
                    .text(fmt(pt.value));
            }
        }
    }

    /* Axes */
    svg.append("g").attr("class","focus-axis")
        .attr("transform",`translate(0,${h})`)
        .call(d3.axisBottom(x).tickFormat(d3.format("d")).ticks(Math.min(years.length, 6)));

    svg.append("g").attr("class","focus-axis")
        .call(d3.axisLeft(y).ticks(4).tickFormat(d => fmt(d)));

    /* ── Hover interactif ── */
    const hoverLine = svg.append("line")
        .attr("y1",0).attr("y2",h).attr("stroke","#888").attr("stroke-width",0.5)
        .style("display","none").attr("pointer-events","none");

    const hoverDot = svg.append("circle")
        .attr("r",3.5).attr("fill","#e74c3c").attr("stroke","#fff").attr("stroke-width",1.5)
        .style("display","none").attr("pointer-events","none");

    const hoverText = svg.append("text")
        .attr("font-size","0.55rem").attr("font-weight","600").attr("fill","#333")
        .style("display","none").attr("pointer-events","none");

    const bisect = d3.bisector(d => d.year).left;

    svg.append("rect")
        .attr("width",w).attr("height",h).attr("fill","none").attr("pointer-events","all")
        .on("mousemove", function(event) {
            const [mx] = d3.pointer(event);
            const yr   = x.invert(mx);
            const i    = bisect(pts, yr, 1);
            const d0   = pts[i - 1], d1 = pts[i];
            const d    = (!d1 || Math.abs(yr - d0.year) < Math.abs(yr - d1.year)) ? d0 : (d1 || d0);

            hoverLine.attr("x1",x(d.year)).attr("x2",x(d.year)).style("display",null);
            hoverDot .attr("cx",x(d.year)).attr("cy",y(d.value)).style("display",null);

            const anchor = x(d.year) > w * 0.75 ? "end" : x(d.year) < w * 0.25 ? "start" : "middle";
            hoverText
                .attr("x", x(d.year)).attr("y", y(d.value) - 9)
                .attr("text-anchor", anchor)
                .text(`${d.year} : ${fmt(d.value)}`)
                .style("display", null);
        })
        .on("mouseout", () => {
            hoverLine.style("display","none");
            hoverDot .style("display","none");
            hoverText.style("display","none");
        });
}

/* ═══════════════════  STATS GRID (toutes viandes)  ═══════════════════ */

function drawStats(container, csvName, allData, currentIndicateur, currentYear, isAllYears, excludeWorld) {
    const keep = d => {
        if (excludeWorld && ["Monde","_UE","_PAYS TIERS"].includes(d.COMEXVIANDE_DIM2_LIB)) return false;
        if (!isAllYears && d.ANNREF !== currentYear) return false;
        return true;
    };
    const data = allData.filter(keep);

    container.append("div").attr("class","stats-lbl").text("Toutes viandes");

    const grid = container.append("div").attr("class","stats-grid");

    INDICATEURS.forEach(ind => {
        const byC  = d3.rollup(
            data.filter(d => d[ind.key] != null),
            v => d3.sum(v, d => d[ind.key]),
            d => d.COMEXVIANDE_DIM2_LIB
        );
        const arr  = Array.from(byC, ([c, v]) => ({ c, v })).sort((a, b) => b.v - a.v);
        const idx  = arr.findIndex(d => d.c === csvName);
        const rank = idx >= 0 ? idx + 1 : "–";
        const val  = idx >= 0 ? arr[idx].v : 0;
        const on   = ind.key === currentIndicateur;

        const cell = grid.append("div").attr("class", "stat-cell" + (on ? " stat-on" : ""));
        cell.append("div").attr("class", "stat-top")
            .html(`<i class="fas ${ind.icon} stat-ico"></i>${ind.label}`);
        const bot = cell.append("div").attr("class", "stat-bot");
        bot.append("span").attr("class", "stat-rank").text(`#${rank}`);
        bot.append("span").attr("class", "stat-val").text(fmt(val));
    });
}
