import React, { useRef, useState, useEffect } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Expand, Shrink, Layers } from 'lucide-react';
import { TYPE_META } from '../data';

const NODE_W = 190;
const NODE_H = 64;

export default function ArchitectureMap({ nodes, edges, setNodes, selectedId, onSelect, showAll, onToggleAll, canShowAll, extraCount, fullscreen, onToggleFullscreen, linking }) {
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (!fullscreen) return undefined;
    function onKey(e) {
      if (e.key === 'Escape') onToggleFullscreen();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreen]);
  const dragRef = useRef(null);
  const movedRef = useRef(false);
  const [filter, setFilter] = useState('all');

  function getNode(id) {
    return nodes.find((n) => n.id === id);
  }

  function onPointerDown(event, node) {
    event.stopPropagation();
    movedRef.current = false;
    dragRef.current = {
      id: node.id,
      startX: event.clientX,
      startY: event.clientY,
      originX: node.x,
      originY: node.y
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event) {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = (event.clientX - drag.startX) / zoom;
    const dy = (event.clientY - drag.startY) / zoom;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) movedRef.current = true;
    setNodes((prev) =>
      prev.map((n) => (n.id === drag.id ? { ...n, x: drag.originX + dx, y: drag.originY + dy } : n))
    );
  }

  function onPointerUp(node) {
    if (!movedRef.current) onSelect(node.id);
    dragRef.current = null;
  }

  function isConnected(edge) {
    return selectedId && (edge.from === selectedId || edge.to === selectedId);
  }

  const types = Object.keys(TYPE_META).filter((t) => nodes.some((n) => n.type === t));
  const stageW = Math.max(1300, ...nodes.map((n) => n.x + NODE_W + 80));
  const stageH = Math.max(560, ...nodes.map((n) => n.y + NODE_H + 80));

  return (
    <div className={'map-wrap' + (fullscreen ? ' map-wrap-full' : '')}>
      <div className="map-toolbar">
        <div className="chips">
          <button className={'chip' + (filter === 'all' ? ' chip-active' : '')} onClick={() => setFilter('all')}>
            All
          </button>
          {types.map((t) => (
            <button
              key={t}
              className={'chip' + (filter === t ? ' chip-active' : '')}
              onClick={() => setFilter(t)}
            >
              <span className="chip-dot" style={{ background: TYPE_META[t].color }} />
              {TYPE_META[t].label}
            </button>
          ))}
        </div>
        <div className="zoom-controls">
          {canShowAll && (
            <button className={'chip all-toggle' + (showAll ? ' chip-active' : '')} onClick={onToggleAll} title="Show every file in the repository, not just the most important ones">
              <Layers size={13} />
              {showAll ? 'Showing all files' : 'Show all files (' + extraCount + ' more)'}
            </button>
          )}
          <button className="icon-btn" onClick={() => setZoom((z) => Math.max(0.3, +(z - 0.1).toFixed(2)))} aria-label="Zoom out">
            <ZoomOut size={16} />
          </button>
          <span className="zoom-value">{Math.round(zoom * 100)}%</span>
          <button className="icon-btn" onClick={() => setZoom((z) => Math.min(1.6, +(z + 0.1).toFixed(2)))} aria-label="Zoom in">
            <ZoomIn size={16} />
          </button>
          <button className="icon-btn" onClick={() => setZoom(1)} aria-label="Reset zoom" title="Reset zoom">
            <Maximize2 size={16} />
          </button>
          <button className="icon-btn" onClick={onToggleFullscreen} aria-label={fullscreen ? 'Exit full screen' : 'Full screen'} title={fullscreen ? 'Exit full screen (Esc)' : 'Full screen'}>
            {fullscreen ? <Shrink size={16} /> : <Expand size={16} />}
          </button>
        </div>
      </div>

      <div className="map-canvas" onPointerMove={onPointerMove}>
        <div className="map-stage" style={{ width: stageW, height: stageH, transform: 'scale(' + zoom + ')' }}>
          <svg className="map-edges" width={stageW} height={stageH}>
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#3B82F6" />
              </marker>
              <marker id="arrow-dim" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#2A3A5E" />
              </marker>
            </defs>
            {edges.map((edge) => {
              const a = getNode(edge.from);
              const b = getNode(edge.to);
              if (!a || !b) return null;
              const x1 = a.x + NODE_W;
              const y1 = a.y + NODE_H / 2;
              const x2 = b.x;
              const y2 = b.y + NODE_H / 2;
              const mid = (x1 + x2) / 2;
              const active = isConnected(edge);
              return (
                <path
                  key={edge.from + edge.to}
                  d={'M ' + x1 + ' ' + y1 + ' C ' + mid + ' ' + y1 + ', ' + mid + ' ' + y2 + ', ' + x2 + ' ' + y2}
                  className={active ? 'edge edge-active' : 'edge'}
                  markerEnd={active ? 'url(#arrow)' : 'url(#arrow-dim)'}
                />
              );
            })}
          </svg>

          {nodes.map((node) => {
            const meta = TYPE_META[node.type] || TYPE_META.util;
            const dimmed = filter !== 'all' && filter !== node.type;
            return (
              <div
                key={node.id}
                className={'map-node' + (selectedId === node.id ? ' map-node-selected' : '') + (dimmed ? ' map-node-dim' : '')}
                title={node.path}
                style={{ left: node.x, top: node.y, width: NODE_W, height: NODE_H, borderLeftColor: meta.color }}
                onPointerDown={(e) => onPointerDown(e, node)}
                onPointerUp={() => onPointerUp(node)}
              >
                <span className="node-type" style={{ color: meta.color }}>{meta.label}</span>
                <span className="node-label">{node.label}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="map-hint">
        {nodes.length} files shown, {edges.length} links. Drag nodes to rearrange. Click one to see it explained.
        {linking ? ' Reading imports to draw links between the extra files...' : ''}
        {fullscreen ? ' Press Esc to leave full screen.' : ''}
      </div>
    </div>
  );
}
