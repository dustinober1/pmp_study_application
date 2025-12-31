'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { useConceptGraph } from '@/lib/api/concept-hooks';
import type { ConceptDomain, RelationshipType } from '@/types';

interface ConceptGraphExplorerProps {
  domain?: ConceptDomain;
  minStrength?: number;
  onNodeClick?: (conceptId: number) => void;
  height?: number;
}

const DOMAIN_COLORS: Record<ConceptDomain, string> = {
  'People': '#3b82f6',
  'Process': '#10b981',
  'Business Environment': '#f59e0b',
};

const RELATIONSHIP_COLORS: Record<RelationshipType, string> = {
  'prerequisite': '#ef4444',
  'related': '#94a3b8',
  'part_of': '#8b5cf6',
  'enables': '#14b8a6',
  'contradicts': '#f97316',
};

export function ConceptGraphExplorer({
  domain,
  minStrength = 0.3,
  onNodeClick,
  height = 600,
}: ConceptGraphExplorerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<number | null>(null);
  const [hoveredNode, setHoveredNode] = useState<number | null>(null);

  const { data: graphData, error, isLoading } = useConceptGraph({
    domain,
    min_strength: minStrength,
  });

  useEffect(() => {
    if (!graphData || !svgRef.current) return;

    // Clear previous content
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = svgRef.current.clientWidth || 800;
    const containerHeight = height;

    // Create main group with zoom
    const g = svg.append('g');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Create force simulation
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const simulation = d3.forceSimulation<any>(graphData.nodes as any)
      .force('link', d3.forceLink<any, any>(graphData.links as any)
        .id((d) => d.id)
        .distance((d) => 100 + (1 - d.strength) * 100)
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, containerHeight / 2))
      .force('collision', d3.forceCollide().radius(30));
    /* eslint-enable @typescript-eslint/no-explicit-any */

    // Create arrow markers for directed links
    const defs = svg.append('defs');

    Object.entries(RELATIONSHIP_COLORS).forEach(([type, color]) => {
      defs.append('marker')
        .attr('id', `arrow-${type}`)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 20)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', color);
    });

    // Create links
    const link = g.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(graphData.links)
      .join('line')
      .attr('stroke', (d) => RELATIONSHIP_COLORS[d.type] || '#94a3b8')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', (d) => Math.max(1, d.strength * 3))
      .attr('marker-end', (d) => `url(#arrow-${d.type})`);

    // Create link labels for relationship type
    const linkLabel = g.append('g')
      .attr('class', 'link-labels')
      .selectAll('text')
      .data(graphData.links)
      .join('text')
      .attr('font-size', '10px')
      .attr('fill', '#64748b')
      .attr('text-anchor', 'middle')
      .text((d) => {
        const labels: Record<RelationshipType, string> = {
          'prerequisite': '→',
          'related': '~',
          'part_of': '+',
          'enables': '⚡',
          'contradicts': '×',
        };
        return labels[d.type] || '';
      });

    // Create nodes
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const node = g.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(graphData.nodes)
      .join('g')
      .attr('cursor', 'pointer')
      // @ts-expect-error D3 drag typings are incompatible with our selection generics
      .call(d3.drag<SVGGElement, any>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended)
      );
    /* eslint-enable @typescript-eslint/no-explicit-any */

    // Node circles
    node.append('circle')
      .attr('r', (d) => 15 + Math.sqrt(d.flashcard_count + d.question_count) * 2)
      .attr('fill', (d) => DOMAIN_COLORS[d.domain_focus as ConceptDomain] || '#64748b')
      .attr('stroke', (d) => {
        if (selectedNode === d.id) return '#f59e0b';
        if (hoveredNode === d.id) return '#fbbf24';
        return '#fff';
      })
      .attr('stroke-width', (d) => {
        if (selectedNode === d.id) return 3;
        if (hoveredNode === d.id) return 2;
        return 2;
      })
      .attr('opacity', (d) => {
        if (selectedNode === null) return 1;
        // Dim non-selected nodes
        if (selectedNode !== d.id) {
          const isConnected = graphData.links.some(
            (l) => (l.source === d.id && l.target === selectedNode) ||
                        (l.target === d.id && l.source === selectedNode)
          );
          return isConnected ? 1 : 0.3;
        }
        return 1;
      });

    // Node labels
    node.append('text')
      .attr('dy', -20)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('font-weight', '500')
      .attr('fill', '#1e293b')
      .text((d) => d.name.length > 15 ? d.name.substring(0, 12) + '...' : d.name);

    // Mastery indicator (small dot inside node)
    node.append('circle')
      .attr('r', 5)
      .attr('cx', 10)
      .attr('cy', -10)
      .attr('fill', (d) => {
        if (d.mastery_level === undefined) return 'transparent';
        if (d.mastery_level >= 0.8) return '#10b981';
        if (d.mastery_level >= 0.5) return '#f59e0b';
        return '#ef4444';
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 1);

    // Node click handler
    node.on('click', (event, d) => {
      event.stopPropagation();
      setSelectedNode(d.id);
      if (onNodeClick) {
        onNodeClick(d.id);
      }
    });

    // Hover effects
    node.on('mouseenter', (_event, d) => {
      setHoveredNode(d.id);
    }).on('mouseleave', () => {
      setHoveredNode(null);
    });

    // Tooltip
    const tooltip = d3.select('body')
      .append('div')
      .attr('class', 'concept-tooltip')
      .style('position', 'absolute')
      .style('padding', '8px 12px')
      .style('background', 'rgba(0, 0, 0, 0.8)')
      .style('color', '#fff')
      .style('border-radius', '6px')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('opacity', 0)
      .style('z-index', 1000);

    node.on('mouseover', (event, d) => {
      tooltip.transition().duration(200).style('opacity', 1);
      tooltip.html(`
        <div class="font-semibold">${d.name}</div>
        <div class="text-xs mt-1">${d.description || ''}</div>
        <div class="text-xs mt-2">
          <span class="text-gray-300">Category:</span> ${d.category || 'N/A'}
        </div>
        <div class="text-xs">
          <span class="text-gray-300">Flashcards:</span> ${d.flashcard_count} |
          <span class="text-gray-300">Questions:</span> ${d.question_count}
        </div>
        ${d.mastery_level !== undefined ? `
          <div class="text-xs">
            <span class="text-gray-300">Mastery:</span> ${Math.round(d.mastery_level * 100)}%
          </div>
        ` : ''}
      `);
    }).on('mousemove', (event) => {
      tooltip
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 10) + 'px');
    }).on('mouseout', () => {
      tooltip.transition().duration(200).style('opacity', 0);
    });

    // Update positions on simulation tick
    /* eslint-disable @typescript-eslint/no-explicit-any */
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      linkLabel
        .attr('x', (d: any) => (d.source.x + d.target.x) / 2)
        .attr('y', (d: any) => (d.source.y + d.target.y) / 2);

      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
    /* eslint-enable @typescript-eslint/no-explicit-any */

    // Cleanup tooltip on unmount
    return () => {
      tooltip.remove();
    };
  }, [graphData, selectedNode, hoveredNode, onNodeClick, height]);

  // Click on background to deselect
  const handleBackgroundClick = () => {
    setSelectedNode(null);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader title="Concept Knowledge Graph" subtitle="Loading..." />
        <CardBody>
          <div className="flex items-center justify-center" style={{ height }}>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
          </div>
        </CardBody>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader title="Concept Knowledge Graph" />
        <CardBody>
          <div className="text-red-600">Error loading concept graph</div>
        </CardBody>
      </Card>
    );
  }

  const relationshipTypes = graphData?.relationship_types || {};

  return (
    <Card>
      <CardHeader
        title="Concept Knowledge Graph"
        subtitle={
          domain
            ? `Showing concepts for ${domain} domain`
            : 'Showing all PMP concepts and their relationships'
        }
      />
      <CardBody className="p-0">
        {/* Relationship Legend */}
        <div className="flex flex-wrap gap-3 px-4 py-2 border-b border-gray-200 dark:border-gray-700 text-sm">
          <span className="font-medium text-gray-700 dark:text-gray-300">Relationships:</span>
          {Object.entries(relationshipTypes).map(([type]) => (
            <div key={type} className="flex items-center gap-1">
              <span
                className="w-3 h-0.5"
                style={{ backgroundColor: RELATIONSHIP_COLORS[type as RelationshipType] }}
              />
              <span className="text-gray-600 dark:text-gray-400">{type}</span>
            </div>
          ))}
        </div>

        {/* Domain Legend */}
        <div className="flex flex-wrap gap-3 px-4 py-2 border-b border-gray-200 dark:border-gray-700 text-sm">
          <span className="font-medium text-gray-700 dark:text-gray-300">Domains:</span>
          {Object.entries(DOMAIN_COLORS).map(([domainName, color]) => (
            <div key={domainName} className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-gray-600 dark:text-gray-400">{domainName}</span>
            </div>
          ))}
        </div>

        {/* SVG Container */}
        <div
          className="relative bg-gray-50 dark:bg-gray-900"
          style={{ height }}
          onClick={handleBackgroundClick}
        >
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            className="absolute inset-0"
          />
        </div>

        {/* Instructions */}
        <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500">
          <p>💡 Drag nodes to reposition • Scroll to zoom • Click a node to view details</p>
        </div>
      </CardBody>
    </Card>
  );
}
