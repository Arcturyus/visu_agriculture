// Composant pour le premier graphique D3

function initChart1(data) {
    console.log('Initialisation du graphique 1');
    
    // Configuration du graphique
    const margin = { top: 20, right: 20, bottom: 30, left: 50 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;
    
    // Sélectionner le conteneur
    const container = d3.select('#chart1-container');
    
    // Créer le SVG
    const svg = container.append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // TODO: Ajouter votre code de visualisation ici
    // Exemple: axes, échelles, éléments graphiques, etc.
    
    // Ajouter un message temporaire
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .style('font-size', '18px')
        .style('fill', '#666')
        .text('Graphique en attente de données');
}
