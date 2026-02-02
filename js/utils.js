// Fonctions d'aide pour la visualisation

// Formatage de dates
function formatDate(date, format = 'DD/MM/YYYY') {
    const d = new Date(date);
    
    // Vérifier si la date est valide
    if (isNaN(d.getTime())) {
        console.error('Invalid date:', date);
        return '';
    }
    
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    
    if (format === 'DD/MM/YYYY') {
        return `${day}/${month}/${year}`;
    } else if (format === 'YYYY-MM-DD') {
        return `${year}-${month}-${day}`;
    }
    return date;
}

// Parser de dates
function parseDate(dateString) {
    return d3.timeParse('%Y-%m-%d')(dateString);
}

// Création d'échelles communes
function createLinearScale(domain, range) {
    return d3.scaleLinear()
        .domain(domain)
        .range(range);
}

function createTimeScale(domain, range) {
    return d3.scaleTime()
        .domain(domain)
        .range(range);
}

function createOrdinalScale(domain, range) {
    return d3.scaleOrdinal()
        .domain(domain)
        .range(range);
}

// Formatage des nombres
function formatNumber(num, decimals = 2) {
    const parsed = parseFloat(num);
    if (isNaN(parsed)) {
        console.error('Invalid number:', num);
        return '0.' + '0'.repeat(decimals);
    }
    return parsed.toFixed(decimals);
}

// Fonction pour créer un tooltip
function createTooltip() {
    return d3.select('body')
        .append('div')
        .attr('class', 'tooltip')
        .style('opacity', 0);
}

// Fonction pour afficher le tooltip
function showTooltip(tooltip, content, event) {
    tooltip.transition()
        .duration(200)
        .style('opacity', 0.9);
    tooltip.html(content)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 28) + 'px');
}

// Fonction pour cacher le tooltip
function hideTooltip(tooltip) {
    tooltip.transition()
        .duration(500)
        .style('opacity', 0);
}
