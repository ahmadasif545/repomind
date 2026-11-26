import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, FileCode2, Network, FileText, GitBranch, Sparkles, PanelLeftClose, Loader2 } from 'lucide-react';

function TreeNode({ node, depth, selectedPath, loadingPath, onOpenFile }) {
  const [open, setOpen] = useState(depth < 1);
  const isFolder = node.type === 'folder';
  const active = !isFolder && node.path && node.path === selectedPath;
  const loading = !isFolder && node.path && node.path === loadingPath;
  const hasNode = !isFolder && node.nodeId;

  function handleClick() {
    if (isFolder) setOpen(!open);
    else if (node.path) onOpenFile(node);
    else if (node.nodeId) onOpenFile(node);
  }

  return (
    <div>
      <button
        className={'tree-row' + (active ? ' tree-row-active' : '')}
        style={{ paddingLeft: 10 + depth * 14 }}
        onClick={handleClick}
        title={node.note || node.path || node.name}
      >
        {isFolder ? (open ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <span className="tree-spacer" />}
        {isFolder
          ? (open ? <FolderOpen size={15} className="tree-icon-folder" /> : <Folder size={15} className="tree-icon-folder" />)
          : <FileCode2 size={15} className={hasNode ? 'tree-icon-file tree-icon-mapped' : 'tree-icon-file'} />}
        <span className="tree-name">{node.name}</span>
        {loading && <Loader2 size={13} className="spin tree-loading" />}
      </button>
      {isFolder && open && node.children && node.children.map((child) => (
        <TreeNode key={child.name + (child.path || '')} node={child} depth={depth + 1} selectedPath={selectedPath} loadingPath={loadingPath} onOpenFile={onOpenFile} />
      ))}
    </div>
  );
}

export default function Sidebar({ tree, selectedPath, loadingPath, onOpenFile, view, onView, onCollapse }) {
  const navItems = [
    { id: 'map', label: 'Architecture map', icon: Network },
    { id: 'overview', label: 'Overview', icon: FileText },
    { id: 'history', label: 'Analysis history', icon: GitBranch }
  ];

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">
          <Sparkles size={18} />
        </div>
        <span className="brand-name">Repo Lens</span>
        <button className="icon-btn collapse-btn" onClick={onCollapse} aria-label="Collapse sidebar" title="Collapse sidebar">
          <PanelLeftClose size={16} />
        </button>
      </div>

      <nav className="side-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={'side-nav-item' + (view === item.id ? ' side-nav-item-active' : '')}
              onClick={() => onView(item.id)}
            >
              <Icon size={16} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="side-section-label">File explorer</div>
      <div className="tree">
        {tree.map((node) => (
          <TreeNode key={node.name + (node.path || '')} node={node} depth={0} selectedPath={selectedPath} loadingPath={loadingPath} onOpenFile={onOpenFile} />
        ))}
      </div>

      <div className="side-footer">
        <a className="built-by" href="https://dasyal.com" target="_blank" rel="noreferrer">
          Built by Ahmad Asif in Dasyal.com
        </a>
      </div>
    </aside>
  );
}
