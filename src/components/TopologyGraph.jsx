import { useState } from 'react';
import { Cpu, Database, GitMerge, Zap, Network, Users, Trash2 } from 'lucide-react';

export default function TopologyGraph({ 
  services = [], 
  dependencies = [], 
  onNodeClick, 
  onNodeDelete 
}) {
  const [hoveredNodeId, setHoveredNodeId] = useState(null);

  // 1. Layer division
  const layers = {
    user: [],
    gateway: [],
    service: [],
    infra: []
  };

  services.forEach(s => {
    if (s.type === 'user') {
      layers.user.push(s);
    } else if (s.type === 'gateway') {
      layers.gateway.push(s);
    } else if (['database', 'cache', 'queue'].includes(s.type)) {
      layers.infra.push(s);
    } else {
      layers.service.push(s);
    }
  });

  // 2. Compute absolute coordinates inside a fixed viewBox="0 0 900 500"
  const width = 900;
  const height = 500;
  const coords = {};

  const layerYPositions = {
    user: 55,
    gateway: 175,
    service: 295,
    infra: 415
  };

  Object.entries(layers).forEach(([layerKey, layerNodes]) => {
    const yVal = layerYPositions[layerKey];
    const count = layerNodes.length;
    
    layerNodes.forEach((node, idx) => {
      let xVal = width / 2;
      if (count > 1) {
        const margin = 100;
        const step = (width - margin * 2) / (count - 1);
        xVal = margin + idx * step;
      }
      coords[node.id] = { x: xVal, y: yVal };
    });
  });

  // 3. Prepare link paths
  const links = [];
  dependencies.forEach((dep) => {
    const fromCoord = coords[dep.from];
    const toCoord = coords[dep.to];
    if (fromCoord && toCoord) {
      // Connect from bottom center of source card to top center of target card
      const startX = fromCoord.x;
      const startY = fromCoord.y + 32; // Half card height of 64px is 32
      const endX = toCoord.x;
      const endY = toCoord.y - 32;

      // Draw elegant smooth vertical-leaning curves
      const controlY1 = startY + (endY - startY) * 0.45;
      const controlY2 = startY + (endY - startY) * 0.55;
      const pathD = `M ${startX} ${startY} C ${startX} ${controlY1}, ${endX} ${controlY2}, ${endX} ${endY}`;

      links.push({
        id: dep.id,
        from: dep.from,
        to: dep.to,
        protocol: dep.protocol || 'http',
        startX,
        startY,
        endX,
        endY,
        pathD
      });
    }
  });

  // 4. Hover highlighting logic
  const activeHover = hoveredNodeId !== null;
  const isNodeDimmed = (nodeId) => {
    if (!activeHover) return false;
    if (nodeId === hoveredNodeId) return false;
    // Check if directly connected
    return !dependencies.some(
      d => (d.from === hoveredNodeId && d.to === nodeId) || 
           (d.from === nodeId && d.to === hoveredNodeId)
    );
  };

  const isLinkActive = (link) => {
    if (!activeHover) return true;
    return link.from === hoveredNodeId || link.to === hoveredNodeId;
  };

  // 5. Helper to retrieve styles & icons based on node category
  const getNodeVisuals = (type) => {
    switch (type) {
      case 'user':
        return {
          icon: Users,
          borderColor: 'border-slate-700/80',
          bgColor: 'bg-slate-900/95',
          textColor: 'text-slate-200',
          accentColor: 'text-slate-400',
          labelBg: 'bg-slate-800 text-slate-300'
        };
      case 'gateway':
        return {
          icon: Network,
          borderColor: 'border-blue-900/60',
          bgColor: 'bg-blue-950/40',
          textColor: 'text-white',
          accentColor: 'text-blue-400',
          labelBg: 'bg-blue-900/60 text-blue-200'
        };
      case 'database':
        return {
          icon: Database,
          borderColor: 'border-emerald-900/50',
          bgColor: 'bg-emerald-950/20',
          textColor: 'text-white',
          accentColor: 'text-emerald-400',
          labelBg: 'bg-emerald-900/60 text-emerald-200'
        };
      case 'cache':
        return {
          icon: Zap,
          borderColor: 'border-orange-900/50',
          bgColor: 'bg-orange-950/20',
          textColor: 'text-white',
          accentColor: 'text-orange-400',
          labelBg: 'bg-orange-900/60 text-orange-200'
        };
      case 'queue':
        return {
          icon: GitMerge,
          borderColor: 'border-purple-900/50',
          bgColor: 'bg-purple-950/20',
          textColor: 'text-white',
          accentColor: 'text-purple-400',
          labelBg: 'bg-purple-900/60 text-purple-200'
        };
      default: // 'service'
        return {
          icon: Cpu,
          borderColor: 'border-indigo-900/50',
          bgColor: 'bg-slate-900/95',
          textColor: 'text-white',
          accentColor: 'text-indigo-400',
          labelBg: 'bg-indigo-950/80 text-indigo-300'
        };
    }
  };

  return (
    <div className="relative w-full overflow-hidden bg-slate-950/80 border border-slate-900/80 rounded-2xl">
      {/* Topology Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-900 bg-slate-950/65">
        <div>
          <h4 className="text-xs font-bold font-display text-white uppercase tracking-wider">Dynamic Topology Dependency Map</h4>
          <p className="text-[10px] text-slate-400 mt-0.5">Hover components to isolate data pathways</p>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-1 bg-blue-500 rounded-full" /> HTTP
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-1 bg-emerald-500 rounded-full" /> TCP
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-1 bg-slate-600 rounded-full" /> Generic
          </span>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="relative p-4 overflow-x-auto">
        <svg 
          viewBox={`0 0 ${width} ${height}`} 
          className="w-full h-auto min-w-[760px] select-none"
          style={{ maxHeight: '460px' }}
        >
          {/* Defined marker arrows for directions */}
          <defs>
            <marker
              id="arrow-http"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#3b82f6" />
            </marker>
            <marker
              id="arrow-tcp"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#10b981" />
            </marker>
            <marker
              id="arrow-default"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#475569" />
            </marker>
          </defs>

          {/* 1. Draw connecting link paths */}
          <g>
            {links.map((link) => {
              const active = isLinkActive(link);
              const color = link.protocol === 'tcp' ? '#10b981' : link.protocol === 'http' ? '#3b82f6' : '#475569';
              const markerId = link.protocol === 'tcp' ? 'url(#arrow-tcp)' : link.protocol === 'http' ? 'url(#arrow-http)' : 'url(#arrow-default)';

              return (
                <g key={link.id} className="transition-all duration-300">
                  {/* Outer glow path */}
                  {active && (
                    <path
                      d={link.pathD}
                      fill="none"
                      stroke={color}
                      strokeWidth={3}
                      strokeOpacity={0.25}
                      className="blur-[2px]"
                    />
                  )}

                  {/* Core connection link */}
                  <path
                    d={link.pathD}
                    fill="none"
                    stroke={color}
                    strokeWidth={active ? 1.5 : 0.6}
                    strokeOpacity={active ? 0.8 : 0.15}
                    markerEnd={markerId}
                  />

                  {/* Dynamic travel particle */}
                  {active && (
                    <circle r="3" fill={link.protocol === 'tcp' ? '#34d399' : '#60a5fa'} className="animate-pulse">
                      <animateMotion dur="2.4s" repeatCount="indefinite" path={link.pathD} />
                    </circle>
                  )}
                </g>
              );
            })}
          </g>

          {/* 2. Draw nodes using React ForeignObject */}
          <g>
            {services.map((node) => {
              const coord = coords[node.id];
              if (!coord) return null;

              const visuals = getNodeVisuals(node.type);
              const IconComp = visuals.icon;
              const dimmed = isNodeDimmed(node.id);
              const hovered = hoveredNodeId === node.id;

              return (
                <foreignObject
                  key={node.id}
                  x={coord.x - 85}
                  y={coord.y - 32}
                  width={170}
                  height={64}
                  className="overflow-visible"
                >
                  <div
                    className={`w-full h-full p-2 rounded-xl border flex flex-col justify-between transition-all duration-300 cursor-pointer select-none ${
                      visuals.borderColor
                    } ${visuals.bgColor} ${
                      hovered 
                        ? 'ring-1.5 ring-indigo-500 scale-102 shadow-lg shadow-indigo-950/20 z-50 translate-y-[-2px]' 
                        : dimmed 
                          ? 'opacity-25' 
                          : 'shadow-md shadow-slate-950/40'
                    }`}
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    onClick={() => onNodeClick && onNodeClick(node)}
                  >
                    {/* Top Row: Name and delete action if configured */}
                    <div className="flex items-start justify-between min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <IconComp className={`w-3.5 h-3.5 ${visuals.accentColor} shrink-0`} />
                        <span className={`text-[10px] font-bold truncate ${visuals.textColor}`}>
                          {node.name}
                        </span>
                      </div>
                      {onNodeDelete && node.type !== 'user' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onNodeDelete(node.id);
                          }}
                          className="text-slate-500 hover:text-red-400 p-0.5 rounded hover:bg-slate-900 transition-colors shrink-0"
                          title="Delete from system"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>

                    {/* Bottom Row: Metadata and replicas count */}
                    <div className="flex items-center justify-between mt-1 text-[8px] font-mono">
                      <span className="text-slate-400 truncate max-w-[65%]">
                        {node.subType || (node.type === 'user' ? 'Direct Access' : 'Microservice')}
                      </span>
                      <span className={`px-1 rounded shrink-0 ${visuals.labelBg}`}>
                        {node.replicas || 1} {node.replicas > 1 ? 'Reps' : 'Rep'}
                      </span>
                    </div>
                  </div>
                </foreignObject>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Static layer markers for better spatial clarity */}
      <div className="hidden md:flex justify-between px-6 pb-3 pt-1 text-[8px] uppercase tracking-wider font-semibold text-slate-500 border-t border-slate-900/60 bg-slate-950/30">
        <span>Layer 1: Access Ingress</span>
        <span>Layer 2: Load Balancing</span>
        <span>Layer 3: Application Services</span>
        <span>Layer 4: Distributed State</span>
      </div>
    </div>
  );
}
