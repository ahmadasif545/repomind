import React from 'react';
import { Lightbulb, ArrowRight, ArrowLeft, Code2, Hash, Loader2, FileX } from 'lucide-react';
import { TYPE_META } from '../data';
import AiAsk from './AiAsk';

export default function DetailPanel({ nodes, edges, snippets, insights, selectedId, extra, loading, fileError, onSelect, repo, isSample }) {
  const mapNode = nodes.find((n) => n.id === selectedId);
  const node = mapNode || (extra && extra.id === selectedId ? extra : null);

  if (loading) {
    return (
      <aside className="detail">
        <div className="detail-head">
          <Loader2 size={16} className="spin" />
          <span>Reading file</span>
        </div>
        <p className="detail-intro">Fetching this file from GitHub and working out what it does...</p>
      </aside>
    );
  }

  if (fileError) {
    return (
      <aside className="detail">
        <div className="detail-head">
          <FileX size={16} />
          <span>Could not open file</span>
        </div>
        <p className="detail-intro">{fileError}</p>
      </aside>
    );
  }

  if (!node) {
    return (
      <aside className="detail">
        <div className="detail-head">
          <Lightbulb size={16} />
          <span>Repo insights</span>
        </div>
        <p className="detail-intro">Click any file in the explorer, or any node on the map, to get a plain English explanation. Meanwhile, here is what stands out about this project:</p>
        <div className="insight-list">
          {insights.map((item) => (
            <div key={item.title} className="insight">
              <h4>{item.title}</h4>
              <p>{item.text}</p>
            </div>
          ))}
        </div>
      </aside>
    );
  }

  const meta = TYPE_META[node.type] || TYPE_META.util;
  const inMap = !!mapNode;
  let uses = [];
  let usedBy = [];
  if (inMap) {
    uses = edges.filter((e) => e.from === node.id).map((e) => nodes.find((n) => n.id === e.to)).filter(Boolean);
    usedBy = edges.filter((e) => e.to === node.id).map((e) => nodes.find((n) => n.id === e.from)).filter(Boolean);
  }
  const extraDeps = !inMap && node.deps ? node.deps : [];
  const code = inMap ? snippets[node.id] : node.snippet;

  return (
    <aside className="detail">
      <div className="detail-head">
        <Code2 size={16} />
        <span>File explained</span>
      </div>

      <span className="badge" style={{ color: meta.color, borderColor: meta.color }}>{meta.label}</span>
      <h3 className="detail-title">{node.label}</h3>
      <div className="detail-path">{node.path}</div>

      <div className="detail-meta">
        <span><Hash size={13} /> {node.lines} lines</span>
        {inMap && <span>{uses.length} dependencies</span>}
        {inMap && <span>{usedBy.length} dependents</span>}
        {!inMap && <span>{extraDeps.length} project imports</span>}
      </div>

      <h4 className="detail-sub">In simple English</h4>
      <p className="detail-text">{node.summary}</p>

      <h4 className="detail-sub">What it does</h4>
      <ul className="detail-list">
        {node.details.map((d) => (
          <li key={d}>{d}</li>
        ))}
      </ul>

      {!node.binary && (
        <>
          <h4 className="detail-sub">{inMap ? 'Key snippet' : 'Preview'}</h4>
          <pre className="code-block"><code>{code || '// No preview available'}</code></pre>
        </>
      )}

      {!node.binary && <AiAsk node={{ ...node, snippet: code }} repo={repo} isSample={isSample} />}

      {usedBy.length > 0 && (
        <>
          <h4 className="detail-sub"><ArrowLeft size={13} /> Used by</h4>
          <div className="link-chips">
            {usedBy.map((n) => (
              <button key={n.id} className="link-chip" onClick={() => onSelect(n.id)}>{n.label}</button>
            ))}
          </div>
        </>
      )}
      {uses.length > 0 && (
        <>
          <h4 className="detail-sub"><ArrowRight size={13} /> Depends on</h4>
          <div className="link-chips">
            {uses.map((n) => (
              <button key={n.id} className="link-chip" onClick={() => onSelect(n.id)}>{n.label}</button>
            ))}
          </div>
        </>
      )}
      {extraDeps.length > 0 && (
        <>
          <h4 className="detail-sub"><ArrowRight size={13} /> Imports from this project</h4>
          <div className="link-chips">
            {extraDeps.slice(0, 8).map((p) => (
              <button key={p} className="link-chip" onClick={() => onSelect('path:' + p)}>{p.split('/').pop()}</button>
            ))}
          </div>
        </>
      )}
    </aside>
  );
}
