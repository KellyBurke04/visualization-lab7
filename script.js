
const margin = {top:10, left:10, right:10, bottom:10};
let width = 800 - margin.left - margin.right;
let height = 500 - margin.top - margin.bottom;


let svg = d3.selectAll('.container')
	.append('svg')
	.attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height]) 

//sizing the circles
let sizeScale = d3.scaleLinear()
    .range([0,10])

let colors = d3.scaleOrdinal(d3.schemeCategory10)

let visType = "Force";

//dragging for nodes
const drag = force =>{
  
    function dragstarted(event) {
        if (!event.active) force.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
    }
        
    function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
    }
        
    function dragended(event) {
        if (!event.active) force.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
    }
        
    return d3.drag()
        .filter(event => visType === "Force")
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
}
//map
//load the data
Promise.all([ 
	d3.json('airports.json'),
	d3.json('world-110m.json')
]).then(data=>{ 
	let airports = data[0]; 
	let worldmap = data[1]; 

    let worldmap_topojson = topojson.feature(worldmap, worldmap.objects.countries);
    let projection = d3.geoMercator().fitExtent([[0,0], [width, height]], worldmap_topojson);
    let path = d3.geoPath()
            .projection(projection);

   
    let map = svg.append("path")
        .datum(worldmap_topojson)
        .attr("d", path)
        .style("opacity", 0);

    
    let map_outline = svg.append('path')
		.datum(topojson.mesh(worldmap, worldmap.objects.countries))
		.attr('d', path)
		.attr('class', 'subunit-boundary')
		.attr('stroke', 'white')
		.attr('fill', 'none')
		.style('opacity', 0)

    sizeScale.domain([0, d3.max(airports.nodes, d => d.passengers)])

    let force = d3.forceSimulation(airports.nodes)
        .force('charge', d3.forceManyBody().strength(-5))
        .force('link', d3.forceLink(airports.links).distance(40))
        .force('center', d3.forceCenter()
            .x(width/2)
            .y(height/2)
            .strength(1.5));

    let edges = svg.selectAll("line")
        .data(airports.links)
        .enter()
        .append("line")
        .style("stroke", "#ccc")
        .style("stroke-width", 1);
        
    let nodes = svg.selectAll("circle")
        .data(airports.nodes)
        .enter()
        .append("circle")
        .attr("r", d=>sizeScale(d.passengers))
        .style("fill", 'orange')
        .call(drag(force));

    nodes.append("title")
        .text(function(d) {
            return d.name;
        })

    force.on('tick', function() {
        edges
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y)
        nodes
            .attr('cx', d => d.x)
            .attr('cy', d => d.y)
        })

    function switchLayout() {
        if (visType === "Map") {
            force.stop()
            nodes.transition(1000).attr("cx",d=>d.x = projection([d.longitude, d.latitude])[0])
                .attr("cy", d=>d.y = projection([d.longitude, d.latitude])[1]);
            edges.transition(1000).attr("x1", function(d) { return d.source.x; })
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);
            map.transition(1000).style("opacity", 1);
            map_outline.transition(1000).style("opacity",1);
        } else { 
            force.alpha(1).restart()
            map.transition(2000).style("opacity", 0)
            map_outline.transition(1000).style("opacity", 0)
        }
      }

    d3.selectAll("input[name=maptype]").on("change", event=> {
	    visType = event.target.value;
	    switchLayout();
    });
})