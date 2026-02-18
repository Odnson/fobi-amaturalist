import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const TaxonomyD3Tree = ({ checklist }) => {
    const svgRef = useRef();

    useEffect(() => {
        if (!checklist) return;
        d3.select(svgRef.current).selectAll("*").remove();
        const data = {
            name: "Taxonomy",
            children: [
                {
                    name: checklist?.kingdom || '-',
                    description: "Kingdom",
                    children: [
                        {
                            name: checklist?.phylum || '-',
                            description: "Phylum",
                            children: [
                                {
                                    name: checklist?.class || '-',
                                    description: "Class",
                                    children: [
                                        {
                                            name: checklist?.order || '-',
                                            description: "Order",
                                            children: [
                                                {
                                                    name: checklist?.family || '-',
                                                    description: "Family",
                                                    children: [
                                                        {
                                                            name: checklist?.genus || '-',
                                                            description: "Genus",
                                                            children: [
                                                                {
                                                                    name: checklist?.species || '-',
                                                                    description: "Species",
                                                                    isItalic: true
                                                                }
                                                            ]
                                                        }
                                                    ]
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        };
        const margin = { top: 20, right: 120, bottom: 20, left: 120 };
        const width = 1280 - margin.right - margin.left;
        const height = 800 - margin.top - margin.bottom;
        const tree = d3.tree().size([height, width]);
        const svg = d3.select(svgRef.current)
            .attr("width", width + margin.right + margin.left)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);
        const root = d3.hierarchy(data);
        const nodes = tree(root);
        const diagonal = d3.linkHorizontal()
            .x(d => d.y)
            .y(d => d.x);
        svg.selectAll(".link")
            .data(nodes.links())
            .enter()
            .append("path")
            .attr("class", "link")
            .attr("d", diagonal);
        const node = svg.selectAll(".node")
            .data(nodes.descendants())
            .enter()
            .append("g")
            .attr("class", "node")
            .attr("transform", d => `translate(${d.y},${d.x})`);
        node.append("circle")
            .attr("r", 6)
            .style("fill", "#fff")
            .style("stroke", "steelblue")
            .style("stroke-width", "1.5px");
        node.append("text")
            .attr("x", d => d.children ? -10 : 10)
            .attr("dy", ".35em")
            .attr("text-anchor", d => d.children ? "end" : "start")
            .style("font-style", d => d.data.isItalic ? "italic" : "normal")
            .text(d => d.data.name);
        node.append("title")
            .text(d => d.data.description);

    }, [checklist]);

    return (
        <div className="taxonomy-tree bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Detail Taksonomi</h2>
            <div className="overflow-auto">
                <svg ref={svgRef}></svg>
            </div>
        </div>
    );
};

export default TaxonomyD3Tree; 